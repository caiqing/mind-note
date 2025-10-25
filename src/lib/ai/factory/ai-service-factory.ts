/**
 * AI服务工厂
 * 统一创建和管理所有AI服务实例
 */

import { Logger } from '@/lib/ai/services/logger'
import { AIConfigManager } from '@/lib/ai/config/ai-config-manager'
import { BaseAIProvider, AIRequest, AIResponse } from '@/lib/ai/providers/base-provider'
import { OpenAIEnhancedProvider } from '@/lib/ai/providers/openai-provider-enhanced'

// 懒加载提供商类
const PROVIDER_CLASSES = {
  openai: () => import('@/lib/ai/providers/openai-provider-enhanced').then(m => m.default),
  anthropic: () => import('@/lib/ai/providers/claude-provider').then(m => m.default),
  // 可以添加更多提供商
}

export interface AIServiceFactoryConfig {
  enableLazyLoading?: boolean
  enableServicePooling?: boolean
  maxPoolSize?: number
  enableHealthChecks?: boolean
  healthCheckInterval?: number
}

export interface ServiceInstance {
  provider: BaseAIProvider
  lastUsed: number
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  requestCount: number
  errorCount: number
}

export class AIServiceFactory {
  private static instance: AIServiceFactory
  private logger = Logger.getInstance()
  private configManager: AIConfigManager
  private serviceInstances: Map<string, ServiceInstance[]> = new Map()
  private config: AIServiceFactoryConfig
  private healthCheckInterval?: NodeJS.Timeout

  private constructor(config: AIServiceFactoryConfig = {}) {
    this.configManager = AIConfigManager.getInstance()
    this.config = {
      enableLazyLoading: true,
      enableServicePooling: true,
      maxPoolSize: 3,
      enableHealthChecks: true,
      healthCheckInterval: 60000, // 1分钟
      ...config
    }

    this.initializeServices()
    this.startHealthChecks()
  }

  static getInstance(config?: AIServiceFactoryConfig): AIServiceFactory {
    if (!AIServiceFactory.instance) {
      AIServiceFactory.instance = new AIServiceFactory(config)
    }
    return AIServiceFactory.instance
  }

  /**
   * 初始化服务
   */
  private initializeServices(): void {
    const providers = this.configManager.getAllProviderConfigs()

    for (const providerConfig of providers) {
      if (providerConfig.enabled) {
        this.initializeProvider(providerConfig.id)
      }
    }

    this.logger.info('AI Service Factory initialized', {
      enabledProviders: providers.filter(p => p.enabled).map(p => p.id),
      config: this.config
    })
  }

  /**
   * 初始化单个提供商
   */
  private async initializeProvider(providerId: string): Promise<void> {
    try {
      if (this.config.enableLazyLoading) {
        // 懒加载：不立即创建实例，等首次使用时再创建
        this.serviceInstances.set(providerId, [])
        return
      }

      await this.createServiceInstance(providerId)
    } catch (error) {
      this.logger.error(`Failed to initialize provider ${providerId}`, { error })
    }
  }

  /**
   * 创建服务实例
   */
  private async createServiceInstance(providerId: string): Promise<BaseAIProvider> {
    const providerConfig = this.configManager.getProviderConfig(providerId)
    if (!providerConfig) {
      throw new Error(`Provider ${providerId} not configured`)
    }

    let ProviderClass: any

    if (providerId === 'openai') {
      // OpenAI使用增强版提供商
      ProviderClass = OpenAIEnhancedProvider
    } else {
      // 其他提供商懒加载
      if (!PROVIDER_CLASSES[providerId as keyof typeof PROVIDER_CLASSES]) {
        throw new Error(`Provider ${providerId} not supported`)
      }

      ProviderClass = await PROVIDER_CLASSES[providerId as keyof typeof PROVIDER_CLASSES]()
    }

    const provider = new ProviderClass({
      apiKey: providerConfig.apiKey,
      organizationId: providerConfig.organizationId,
      baseURL: providerConfig.baseURL,
      timeout: providerConfig.timeout,
      maxRetries: providerConfig.maxRetries,
      retryDelay: providerConfig.retryDelay
    })

    this.logger.info(`Created service instance for provider ${providerId}`)
    return provider
  }

  /**
   * 获取服务实例
   */
  async getService(providerId?: string): Promise<BaseAIProvider> {
    if (!providerId) {
      // 使用默认提供商
      providerId = this.configManager.getGlobalConfig().defaultProvider
    }

    const providerConfig = this.configManager.getProviderConfig(providerId)
    if (!providerConfig || !providerConfig.enabled) {
      throw new Error(`Provider ${providerId} is not available or disabled`)
    }

    let instances = this.serviceInstances.get(providerId)

    if (!instances) {
      instances = []
      this.serviceInstances.set(providerId, instances)
    }

    // 尝试获取健康的实例
    let instance = instances.find(inst => inst.healthStatus === 'healthy')

    if (!instance) {
      // 创建新实例
      try {
        const provider = await this.createServiceInstance(providerId)
        instance = {
          provider,
          lastUsed: Date.now(),
          healthStatus: 'unknown',
          requestCount: 0,
          errorCount: 0
        }

        instances.push(instance)

        // 检查池大小限制
        if (instances.length > (this.config.maxPoolSize || 3)) {
          const oldestInstance = instances.reduce((oldest, current) =>
            current.lastUsed < oldest.lastUsed ? current : oldest
          )
          instances = instances.filter(inst => inst !== oldestInstance)
        }

        this.serviceInstances.set(providerId, instances)

      } catch (error) {
        this.logger.error(`Failed to create service instance for ${providerId}`, { error })
        throw error
      }
    }

    instance.lastUsed = Date.now()
    instance.requestCount++

    return instance.provider
  }

  /**
   * 执行AI请求
   */
  async executeRequest(request: AIRequest, providerId?: string): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      const provider = await this.getService(providerId)
      const response = await provider.generateText(request)

      // 更新实例状态
      this.updateInstanceStats(providerId, response, Date.now() - startTime)

      return response

    } catch (error) {
      // 更新错误统计
      this.updateInstanceStats(providerId, null, Date.now() - startTime, error as Error)

      // 如果启用了降级，尝试其他提供商
      if (this.configManager.getGlobalConfig().fallbackEnabled && !providerId) {
        return this.executeRequestWithFallback(request, providerId)
      }

      throw error
    }
  }

  /**
   * 带降级的请求执行
   */
  private async executeRequestWithFallback(request: AIRequest, failedProviderId?: string): Promise<AIResponse> {
    const globalConfig = this.configManager.getGlobalConfig()
    const availableProviders = this.configManager.getAllProviderConfigs()
      .filter(p => p.enabled && p.id !== failedProviderId)

    for (const providerConfig of availableProviders) {
      try {
        const provider = await this.getService(providerConfig.id)
        const response = await provider.generateText(request)

        this.logger.info('Request succeeded with fallback provider', {
          originalProvider: failedProviderId,
          fallbackProvider: providerConfig.id
        })

        return response

      } catch (error) {
        this.logger.warn(`Fallback provider ${providerConfig.id} also failed`, { error })
        continue
      }
    }

    throw new Error('All providers failed')
  }

  /**
   * 执行流式请求
   */
  async *executeStreamRequest(request: AIRequest, providerId?: string): AsyncGenerator<AIResponse> {
    const provider = await this.getService(providerId)

    try {
      const stream = provider.generateTextStream(request)

      for await (const chunk of stream) {
        yield chunk
      }

    } catch (error) {
      this.logger.error('Stream request failed', { providerId, error })
      throw error
    }
  }

  /**
   * 执行嵌入请求
   */
  async executeEmbeddingRequest(texts: string | string[], providerId?: string): Promise<any[]> {
    const provider = await this.getService(providerId)

    try {
      return await provider.generateEmbedding(texts)
    } catch (error) {
      this.logger.error('Embedding request failed', { providerId, error })
      throw error
    }
  }

  /**
   * 更新实例统计信息
   */
  private updateInstanceStats(
    providerId: string,
    response: AIResponse | null,
    responseTime: number,
    error?: Error
  ): void {
    const instances = this.serviceInstances.get(providerId)
    if (!instances) return

    // 查找最近使用的实例
    const instance = instances.reduce((latest, current) =>
      current.lastUsed > latest.lastUsed ? current : latest
    )

    if (error) {
      instance.errorCount++
      instance.healthStatus = 'unhealthy'
    } else if (response) {
      instance.healthStatus = 'healthy'
    }

    // 可以添加更多统计逻辑
    this.logger.debug('Instance stats updated', {
      providerId,
      requestCount: instance.requestCount,
      errorCount: instance.errorCount,
      healthStatus: instance.healthStatus,
      responseTime
    })
  }

  /**
   * 开始健康检查
   */
  private startHealthChecks(): void {
    if (!this.config.enableHealthChecks) return

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks()
    }, this.config.healthCheckInterval!)
  }

  /**
   * 执行健康检查
   */
  private async performHealthChecks(): Promise<void> {
    for (const [providerId, instances] of this.serviceInstances.entries()) {
      for (const instance of instances) {
        try {
          const healthStatus = await instance.provider.healthCheck()
          instance.healthStatus = healthStatus.status || 'unknown'

          if (healthStatus.status === 'unhealthy') {
            this.logger.warn(`Service instance unhealthy`, {
              providerId,
              healthStatus
            })
          }

        } catch (error) {
          instance.healthStatus = 'unhealthy'
          this.logger.error(`Health check failed for instance`, {
            providerId,
            error
          })
        }
      }
    }
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats(): any {
    const stats: any = {}

    for (const [providerId, instances] of this.serviceInstances.entries()) {
      stats[providerId] = {
        instanceCount: instances.length,
        healthyInstances: instances.filter(i => i.healthStatus === 'healthy').length,
        unhealthyInstances: instances.filter(i => i.healthStatus === 'unhealthy').length,
        totalRequests: instances.reduce((sum, i) => sum + i.requestCount, 0),
        totalErrors: instances.reduce((sum, i) => sum + i.errorCount, 0),
        lastUsed: Math.max(...instances.map(i => i.lastUsed))
      }
    }

    return stats
  }

  /**
   * 获取可用提供商列表
   */
  getAvailableProviders(): string[] {
    return this.configManager.getAllProviderConfigs()
      .filter(p => p.enabled)
      .map(p => p.id)
  }

  /**
   * 检查提供商可用性
   */
  isProviderAvailable(providerId: string): boolean {
    const config = this.configManager.getProviderConfig(providerId)
    return !!config && config.enabled
  }

  /**
   * 启用提供商
   */
  enableProvider(providerId: string): void {
    this.configManager.setProviderEnabled(providerId, true)
    this.initializeProvider(providerId)
  }

  /**
   * 禁用提供商
   */
  disableProvider(providerId: string): void {
    this.configManager.setProviderEnabled(providerId, false)

    // 清理相关实例
    const instances = this.serviceInstances.get(providerId)
    if (instances) {
      instances.forEach(instance => {
        try {
          if (instance.provider.destroy) {
            instance.provider.destroy()
          }
        } catch (error) {
          this.logger.error(`Failed to destroy provider instance`, {
            providerId,
            error
          })
        }
      })
      this.serviceInstances.delete(providerId)
    }
  }

  /**
   * 重置提供商实例
   */
  async resetProvider(providerId: string): Promise<void> {
    const instances = this.serviceInstances.get(providerId)
    if (instances) {
      // 清理现有实例
      instances.forEach(instance => {
        try {
          if (instance.provider.destroy) {
            instance.provider.destroy()
          }
        } catch (error) {
          this.logger.error(`Failed to destroy provider instance during reset`, {
            providerId,
            error
          })
        }
      })
    }

    // 重新初始化
    this.serviceInstances.delete(providerId)
    await this.initializeProvider(providerId)

    this.logger.info(`Provider ${providerId} reset completed`)
  }

  /**
   * 清理不活跃的实例
   */
  cleanupInactiveInstances(maxInactiveTime: number = 300000): void { // 5分钟
    const now = Date.now()

    for (const [providerId, instances] of this.serviceInstances.entries()) {
      const activeInstances = instances.filter(instance => {
        const inactiveTime = now - instance.lastUsed
        if (inactiveTime > maxInactiveTime && instance.healthStatus !== 'healthy') {
          try {
            if (instance.provider.destroy) {
              instance.provider.destroy()
            }
          } catch (error) {
            this.logger.error(`Failed to destroy inactive instance`, {
              providerId,
              error
            })
          }
          return false
        }
        return true
      })

      this.serviceInstances.set(providerId, activeInstances)
    }
  }

  /**
   * 获取工厂配置
   */
  getFactoryConfig(): AIServiceFactoryConfig {
    return { ...this.config }
  }

  /**
   * 更新工厂配置
   */
  updateFactoryConfig(updates: Partial<AIServiceFactoryConfig>): void {
    this.config = { ...this.config, ...updates }
    this.logger.info('Factory configuration updated', { updates })
  }

  /**
   * 销毁工厂
   */
  destroy(): void {
    // 停止健康检查
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // 清理所有实例
    for (const [providerId, instances] of this.serviceInstances.entries()) {
      instances.forEach(instance => {
        try {
          if (instance.provider.destroy) {
            instance.provider.destroy()
          }
        } catch (error) {
          this.logger.error(`Failed to destroy provider instance during factory shutdown`, {
            providerId,
            error
          })
        }
      })
    }

    this.serviceInstances.clear()
    this.logger.info('AI Service Factory destroyed')
  }
}

export default AIServiceFactory