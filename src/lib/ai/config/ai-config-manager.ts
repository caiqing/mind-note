/**
 * AI配置管理器
 * 统一管理所有AI服务的配置、密钥和设置
 */

import { Logger } from '@/lib/ai/services/logger'

export interface AIProviderConfig {
  id: string
  name: string
  enabled: boolean
  apiKey: string
  organizationId?: string
  baseURL?: string
  timeout: number
  maxRetries: number
  retryDelay: number
  models: AIModelConfig[]
  rateLimit: RateLimitConfig
  costConfig: CostConfig
}

export interface AIModelConfig {
  id: string
  name: string
  provider: string
  enabled: boolean
  contextLength: number
  inputCost: number
  outputCost: number
  capabilities: string[]
  quality: 'basic' | 'good' | 'excellent'
  speed: 'fast' | 'medium' | 'slow'
  deprecated?: boolean
}

export interface RateLimitConfig {
  requestsPerMinute: number
  tokensPerMinute: number
  concurrentRequests: number
  dailyRequestLimit?: number
  monthlyTokenLimit?: number
}

export interface CostConfig {
  enableTracking: boolean
  budgetDaily?: number
  budgetMonthly?: number
  alertThreshold: number
  costOptimization: {
    preferCheapestModel: boolean
    maxCostPerRequest: number
    enableCostCapping: boolean
  }
}

export interface AIGlobalConfig {
  defaultProvider: string
  fallbackEnabled: boolean
  cachingEnabled: boolean
  cacheTTL: number
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    enableRequestLogging: boolean
    enablePerformanceLogging: boolean
  }
  monitoring: {
    enableMetrics: boolean
    enableHealthChecks: boolean
    healthCheckInterval: number
  }
  security: {
    enableInputValidation: boolean
    enableContentFiltering: boolean
    maxPromptLength: number
    allowedOrigins: string[]
  }
}

export class AIConfigManager {
  private static instance: AIConfigManager
  private logger = Logger.getInstance()
  private providers: Map<string, AIProviderConfig> = new Map()
  private globalConfig: AIGlobalConfig
  private configWatchers: Map<string, (config: any) => void> = new Map()

  private constructor() {
    this.globalConfig = this.getDefaultGlobalConfig()
    this.initializeDefaultProviders()
    this.loadEnvironmentConfig()
  }

  static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager()
    }
    return AIConfigManager.instance
  }

  /**
   * 获取默认全局配置
   */
  private getDefaultGlobalConfig(): AIGlobalConfig {
    return {
      defaultProvider: 'openai',
      fallbackEnabled: true,
      cachingEnabled: true,
      cacheTTL: 300000, // 5分钟
      logging: {
        level: 'info',
        enableRequestLogging: true,
        enablePerformanceLogging: true
      },
      monitoring: {
        enableMetrics: true,
        enableHealthChecks: true,
        healthCheckInterval: 60000 // 1分钟
      },
      security: {
        enableInputValidation: true,
        enableContentFiltering: true,
        maxPromptLength: 100000,
        allowedOrigins: ['localhost:3000', 'mindnote.com']
      }
    }
  }

  /**
   * 初始化默认提供商配置
   */
  private initializeDefaultProviders(): void {
    // OpenAI配置
    this.providers.set('openai', {
      id: 'openai',
      name: 'OpenAI',
      enabled: true,
      apiKey: '',
      organizationId: '',
      baseURL: '',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'openai',
          enabled: true,
          contextLength: 8192,
          inputCost: 0.03,
          outputCost: 0.06,
          capabilities: ['chat', 'analysis', 'reasoning'],
          quality: 'excellent',
          speed: 'slow'
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          provider: 'openai',
          enabled: true,
          contextLength: 128000,
          inputCost: 0.01,
          outputCost: 0.03,
          capabilities: ['chat', 'analysis', 'reasoning', 'vision'],
          quality: 'excellent',
          speed: 'medium'
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          enabled: true,
          contextLength: 16385,
          inputCost: 0.001,
          outputCost: 0.002,
          capabilities: ['chat', 'analysis'],
          quality: 'good',
          speed: 'fast'
        },
        {
          id: 'text-embedding-ada-002',
          name: 'Text Embedding Ada',
          provider: 'openai',
          enabled: true,
          contextLength: 8192,
          inputCost: 0.0001,
          outputCost: 0,
          capabilities: ['embedding'],
          quality: 'basic',
          speed: 'fast'
        }
      ],
      rateLimit: {
        requestsPerMinute: 3500,
        tokensPerMinute: 90000,
        concurrentRequests: 10
      },
      costConfig: {
        enableTracking: true,
        budgetDaily: 10,
        budgetMonthly: 300,
        alertThreshold: 0.8,
        costOptimization: {
          preferCheapestModel: false,
          maxCostPerRequest: 1.0,
          enableCostCapping: true
        }
      }
    })

    // Anthropic配置
    this.providers.set('anthropic', {
      id: 'anthropic',
      name: 'Anthropic Claude',
      enabled: true,
      apiKey: '',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      models: [
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          provider: 'anthropic',
          enabled: true,
          contextLength: 200000,
          inputCost: 0.015,
          outputCost: 0.075,
          capabilities: ['chat', 'analysis', 'reasoning'],
          quality: 'excellent',
          speed: 'slow'
        },
        {
          id: 'claude-3-sonnet-20240229',
          name: 'Claude 3 Sonnet',
          provider: 'anthropic',
          enabled: true,
          contextLength: 200000,
          inputCost: 0.003,
          outputCost: 0.015,
          capabilities: ['chat', 'analysis', 'reasoning'],
          quality: 'excellent',
          speed: 'medium'
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          provider: 'anthropic',
          enabled: true,
          contextLength: 200000,
          inputCost: 0.00025,
          outputCost: 0.00125,
          capabilities: ['chat', 'analysis'],
          quality: 'good',
          speed: 'fast'
        }
      ],
      rateLimit: {
        requestsPerMinute: 1000,
        tokensPerMinute: 40000,
        concurrentRequests: 5
      },
      costConfig: {
        enableTracking: true,
        budgetDaily: 15,
        budgetMonthly: 450,
        alertThreshold: 0.8,
        costOptimization: {
          preferCheapestModel: false,
          maxCostPerRequest: 2.0,
          enableCostCapping: true
        }
      }
    })
  }

  /**
   * 从环境变量加载配置
   */
  private loadEnvironmentConfig(): void {
    // 加载OpenAI配置
    if (process.env.OPENAI_API_KEY) {
      this.updateProviderConfig('openai', {
        apiKey: process.env.OPENAI_API_KEY,
        organizationId: process.env.OPENAI_ORGANIZATION_ID,
        baseURL: process.env.OPENAI_BASE_URL,
        enabled: process.env.OPENAI_ENABLED !== 'false'
      })
    }

    // 加载Anthropic配置
    if (process.env.ANTHROPIC_API_KEY) {
      this.updateProviderConfig('anthropic', {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.ANTHROPIC_BASE_URL,
        enabled: process.env.ANTHROPIC_ENABLED !== 'false'
      })
    }

    // 加载全局配置
    if (process.env.AI_DEFAULT_PROVIDER) {
      this.globalConfig.defaultProvider = process.env.AI_DEFAULT_PROVIDER
    }

    if (process.env.AI_FALLBACK_ENABLED) {
      this.globalConfig.fallbackEnabled = process.env.AI_FALLBACK_ENABLED === 'true'
    }

    if (process.env.AI_CACHE_TTL) {
      this.globalConfig.cacheTTL = parseInt(process.env.AI_CACHE_TTL)
    }

    if (process.env.AI_LOG_LEVEL) {
      this.globalConfig.logging.level = process.env.AI_LOG_LEVEL as any
    }
  }

  /**
   * 获取提供商配置
   */
  getProviderConfig(providerId: string): AIProviderConfig | undefined {
    return this.providers.get(providerId)
  }

  /**
   * 获取所有提供商配置
   */
  getAllProviderConfigs(): AIProviderConfig[] {
    return Array.from(this.providers.values())
  }

  /**
   * 更新提供商配置
   */
  updateProviderConfig(providerId: string, updates: Partial<AIProviderConfig>): void {
    const existing = this.providers.get(providerId)
    if (!existing) {
      throw new Error(`Provider ${providerId} not found`)
    }

    const updated = { ...existing, ...updates }
    this.providers.set(providerId, updated)

    this.logger.info(`Provider configuration updated`, {
      provider: providerId,
      updates: Object.keys(updates)
    })

    // 通知配置观察者
    this.notifyConfigWatchers(providerId, updated)
  }

  /**
   * 启用/禁用提供商
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    this.updateProviderConfig(providerId, { enabled })
  }

  /**
   * 获取全局配置
   */
  getGlobalConfig(): AIGlobalConfig {
    return { ...this.globalConfig }
  }

  /**
   * 更新全局配置
   */
  updateGlobalConfig(updates: Partial<AIGlobalConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...updates }

    this.logger.info('Global configuration updated', {
      updates: Object.keys(updates)
    })

    // 通知配置观察者
    this.notifyConfigWatchers('global', this.globalConfig)
  }

  /**
   * 获取模型配置
   */
  getModelConfig(providerId: string, modelId: string): AIModelConfig | undefined {
    const provider = this.providers.get(providerId)
    return provider?.models.find(model => model.id === modelId)
  }

  /**
   * 获取所有可用模型
   */
  getAvailableModels(): AIModelConfig[] {
    const models: AIModelConfig[] = []

    for (const provider of this.providers.values()) {
      if (provider.enabled) {
        models.push(...provider.models.filter(model => model.enabled))
      }
    }

    return models
  }

  /**
   * 根据能力筛选模型
   */
  getModelsByCapability(capability: string): AIModelConfig[] {
    return this.getAvailableModels().filter(model =>
      model.capabilities.includes(capability)
    )
  }

  /**
   * 根据质量筛选模型
   */
  getModelsByQuality(quality: 'basic' | 'good' | 'excellent'): AIModelConfig[] {
    return this.getAvailableModels().filter(model => model.quality === quality)
  }

  /**
   * 根据速度筛选模型
   */
  getModelsBySpeed(speed: 'fast' | 'medium' | 'slow'): AIModelConfig[] {
    return this.getAvailableModels().filter(model => model.speed === speed)
  }

  /**
   * 根据成本筛选模型
   */
  getModelsByCost(maxCost: number): AIModelConfig[] {
    return this.getAvailableModels().filter(model => {
      const avgCost = (model.inputCost + model.outputCost) / 2
      return avgCost <= maxCost
    })
  }

  /**
   * 获取推荐的模型
   */
  getRecommendedModel(criteria: {
    capability?: string
    quality?: 'basic' | 'good' | 'excellent'
    speed?: 'fast' | 'medium' | 'slow'
    maxCost?: number
    maxTokens?: number
  }): AIModelConfig | null {
    let candidates = this.getAvailableModels()

    // 应用筛选条件
    if (criteria.capability) {
      candidates = candidates.filter(model =>
        model.capabilities.includes(criteria.capability!)
      )
    }

    if (criteria.quality) {
      candidates = candidates.filter(model => model.quality === criteria.quality)
    }

    if (criteria.speed) {
      candidates = candidates.filter(model => model.speed === criteria.speed)
    }

    if (criteria.maxCost) {
      candidates = candidates.filter(model => {
        const avgCost = (model.inputCost + model.outputCost) / 2
        return avgCost <= criteria.maxCost!
      })
    }

    if (criteria.maxTokens) {
      candidates = candidates.filter(model =>
        model.contextLength >= criteria.maxTokens!
      )
    }

    if (candidates.length === 0) {
      return null
    }

    // 优先选择质量高的模型
    candidates.sort((a, b) => {
      const qualityOrder = { excellent: 3, good: 2, basic: 1 }
      const qualityDiff = qualityOrder[b.quality] - qualityOrder[a.quality]

      if (qualityDiff !== 0) {
        return qualityDiff
      }

      // 然后选择速度快的
      const speedOrder = { fast: 3, medium: 2, slow: 1 }
      return speedOrder[b.speed] - speedOrder[a.speed]
    })

    return candidates[0]
  }

  /**
   * 验证配置
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证全局配置
    if (!this.providers.has(this.globalConfig.defaultProvider)) {
      errors.push(`Default provider '${this.globalConfig.defaultProvider}' is not configured`)
    }

    if (this.globalConfig.cacheTTL <= 0) {
      errors.push('Cache TTL must be positive')
    }

    if (this.globalConfig.security.maxPromptLength <= 0) {
      errors.push('Max prompt length must be positive')
    }

    // 验证提供商配置
    for (const [providerId, provider] of this.providers) {
      if (provider.enabled && !provider.apiKey) {
        errors.push(`Provider '${providerId}' is enabled but missing API key`)
      }

      if (provider.timeout <= 0) {
        errors.push(`Provider '${providerId}' timeout must be positive`)
      }

      if (provider.maxRetries < 0) {
        errors.push(`Provider '${providerId}' max retries must be non-negative`)
      }

      // 验证模型配置
      for (const model of provider.models) {
        if (model.contextLength <= 0) {
          errors.push(`Model '${model.id}' context length must be positive`)
        }

        if (model.inputCost < 0 || model.outputCost < 0) {
          errors.push(`Model '${model.id}' costs must be non-negative`)
        }

        if (model.capabilities.length === 0) {
          errors.push(`Model '${model.id}' must have at least one capability`)
        }
      }

      // 验证速率限制
      if (provider.rateLimit.requestsPerMinute <= 0) {
        errors.push(`Provider '${providerId}' requests per minute must be positive`)
      }

      if (provider.rateLimit.tokensPerMinute <= 0) {
        errors.push(`Provider '${providerId}' tokens per minute must be positive`)
      }

      if (provider.rateLimit.concurrentRequests <= 0) {
        errors.push(`Provider '${providerId}' concurrent requests must be positive`)
      }

      // 验证成本配置
      if (provider.costConfig.budgetDaily && provider.costConfig.budgetDaily <= 0) {
        errors.push(`Provider '${providerId}' daily budget must be positive`)
      }

      if (provider.costConfig.budgetMonthly && provider.costConfig.budgetMonthly <= 0) {
        errors.push(`Provider '${providerId}' monthly budget must be positive`)
      }

      if (provider.costConfig.alertThreshold <= 0 || provider.costConfig.alertThreshold > 1) {
        errors.push(`Provider '${providerId}' alert threshold must be between 0 and 1`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 导出配置
   */
  exportConfig(): string {
    const config = {
      global: this.globalConfig,
      providers: Array.from(this.providers.entries()).map(([id, provider]) => ({
        id,
        ...provider
      }))
    }

    return JSON.stringify(config, null, 2)
  }

  /**
   * 导入配置
   */
  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson)

      if (config.global) {
        this.globalConfig = { ...this.globalConfig, ...config.global }
      }

      if (config.providers) {
        for (const providerConfig of config.providers) {
          const { id, ...providerData } = providerConfig
          this.providers.set(id, {
            ...this.getDefaultProviderConfig(id),
            ...providerData
          })
        }
      }

      this.logger.info('Configuration imported successfully')

    } catch (error) {
      this.logger.error('Failed to import configuration', { error })
      throw new Error('Invalid configuration format')
    }
  }

  /**
   * 获取默认提供商配置
   */
  private getDefaultProviderConfig(providerId: string): Partial<AIProviderConfig> {
    const defaults = {
      openai: {
        name: 'OpenAI',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        rateLimit: {
          requestsPerMinute: 3500,
          tokensPerMinute: 90000,
          concurrentRequests: 10
        },
        costConfig: {
          enableTracking: true,
          alertThreshold: 0.8,
          costOptimization: {
            preferCheapestModel: false,
            maxCostPerRequest: 1.0,
            enableCostCapping: true
          }
        }
      },
      anthropic: {
        name: 'Anthropic Claude',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        rateLimit: {
          requestsPerMinute: 1000,
          tokensPerMinute: 40000,
          concurrentRequests: 5
        },
        costConfig: {
          enableTracking: true,
          alertThreshold: 0.8,
          costOptimization: {
            preferCheapestModel: false,
            maxCostPerRequest: 2.0,
            enableCostCapping: true
          }
        }
      }
    }

    return defaults[providerId as keyof typeof defaults] || {}
  }

  /**
   * 添加配置观察者
   */
  addConfigWatcher(id: string, callback: (config: any) => void): void {
    this.configWatchers.set(id, callback)
  }

  /**
   * 移除配置观察者
   */
  removeConfigWatcher(id: string): void {
    this.configWatchers.delete(id)
  }

  /**
   * 通知配置观察者
   */
  private notifyConfigWatchers(configType: string, config: any): void {
    for (const [id, callback] of this.configWatchers) {
      try {
        callback(config)
      } catch (error) {
        this.logger.error(`Config watcher ${id} failed`, { error })
      }
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults(): void {
    this.globalConfig = this.getDefaultGlobalConfig()
    this.initializeDefaultProviders()
    this.loadEnvironmentConfig()

    this.logger.info('Configuration reset to defaults')
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.providers.clear()
    this.configWatchers.clear()
  }
}

export default AIConfigManager