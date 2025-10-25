/**
 * 增强版AI服务路由器
 * 智能路由AI请求到最适合的提供商，支持高级负载均衡、降级和性能优化
 */

import { Logger } from '@/lib/ai/services/logger'
import { AIConfigManager } from '@/lib/ai/config/ai-config-manager'
import { AIServiceFactory } from '@/lib/ai/factory/ai-service-factory'

export interface RoutingRequest {
  prompt: string
  context?: string[]
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
  userId?: string
  sessionId?: string
  requestId?: string
  preferences?: UserPreferences
  constraints?: UserConstraints
  metadata?: Record<string, any>
}

export interface UserPreferences {
  cost?: 'low' | 'medium' | 'high'
  speed?: 'fast' | 'normal' | 'slow'
  quality?: 'basic' | 'good' | 'excellent'
  provider?: string
  model?: string
}

export interface UserConstraints {
  maxResponseTime?: number
  maxCost?: number
  minQuality?: number
  allowedProviders?: string[]
  blockedProviders?: string[]
  maxTokensPerRequest?: number
  allowedCapabilities?: string[]
}

export interface EnhancedRoutingResponse {
  requestId: string
  provider: string
  model: string
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    estimatedCost: number
  }
  responseTime: number
  timestamp: Date
  success: boolean
  error?: string
  metadata: {
    routingDecision: RoutingDecision
    fallbackUsed: boolean
    fallbackChain?: string[]
    performanceScore: number
    costEfficiency: number
    qualityScore: number
    cacheHit?: boolean
  }
}

export interface RoutingDecision {
  selectedProvider: string
  selectedModel: string
  score: number
  reasoning: string[]
  alternatives: Array<{
    provider: string
    model: string
    score: number
    reason: string
  }>
}

export interface ServiceMetrics {
  provider: string
  model: string
  availability: number // 0-1
  averageResponseTime: number
  errorRate: number
  costPerToken: number
  qualityScore: number
  throughput: number
  lastUsed: Date
  requestCount: number
  successRate: number
}

export interface RoutingStrategy {
  name: string
  description: string
  priority: number
  weights: {
    cost: number
    speed: number
    quality: number
    availability: number
  }
  rules: RoutingRule[]
}

export interface RoutingRule {
  condition: string
  action: string
  parameters?: Record<string, any>
}

export class EnhancedAIRouter {
  private static instance: EnhancedAIRouter
  private logger = Logger.getInstance()
  private configManager: AIConfigManager
  private serviceFactory: AIServiceFactory
  private serviceMetrics: Map<string, ServiceMetrics> = new Map()
  private performanceHistory: Map<string, number[]> = new Map()
  private requestCache: Map<string, EnhancedRoutingResponse> = new Map()
  private routingStrategies: Map<string, RoutingStrategy> = new Map()
  private currentStrategy: string = 'balanced'

  private constructor() {
    this.configManager = AIConfigManager.getInstance()
    this.serviceFactory = AIServiceFactory.getInstance()
    this.initializeRoutingStrategies()
    this.initializeServiceMetrics()
    this.startPerformanceMonitoring()
  }

  static getInstance(): EnhancedAIRouter {
    if (!EnhancedAIRouter.instance) {
      EnhancedAIRouter.instance = new EnhancedAIRouter()
    }
    return EnhancedAIRouter.instance
  }

  /**
   * 初始化路由策略
   */
  private initializeRoutingStrategies(): void {
    const strategies: RoutingStrategy[] = [
      {
        name: 'cost-optimized',
        description: '优先考虑成本效益',
        priority: 1,
        weights: {
          cost: 0.5,
          speed: 0.2,
          quality: 0.2,
          availability: 0.1
        },
        rules: [
          {
            condition: 'preferences.cost == "low"',
            action: 'prefer_cheapest_available'
          },
          {
            condition: 'constraints.maxCost < 0.01',
            action: 'filter_by_cost'
          }
        ]
      },
      {
        name: 'speed-optimized',
        description: '优先考虑响应速度',
        priority: 2,
        weights: {
          cost: 0.1,
          speed: 0.6,
          quality: 0.2,
          availability: 0.1
        },
        rules: [
          {
            condition: 'preferences.speed == "fast"',
            action: 'prefer_fastest_available'
          },
          {
            condition: 'constraints.maxResponseTime < 2000',
            action: 'filter_by_response_time'
          }
        ]
      },
      {
        name: 'quality-optimized',
        description: '优先考虑响应质量',
        priority: 3,
        weights: {
          cost: 0.1,
          speed: 0.2,
          quality: 0.6,
          availability: 0.1
        },
        rules: [
          {
            condition: 'preferences.quality == "excellent"',
            action: 'prefer_highest_quality'
          },
          {
            condition: 'constraints.minQuality > 0.8',
            action: 'filter_by_quality'
          }
        ]
      },
      {
        name: 'balanced',
        description: '平衡考虑所有因素',
        priority: 4,
        weights: {
          cost: 0.25,
          speed: 0.25,
          quality: 0.25,
          availability: 0.25
        },
        rules: []
      },
      {
        name: 'availability-first',
        description: '优先考虑服务可用性',
        priority: 0,
        weights: {
          cost: 0.05,
          speed: 0.15,
          quality: 0.2,
          availability: 0.6
        },
        rules: [
          {
            condition: 'service.availability < 0.5',
            action: 'switch_provider'
          }
        ]
      }
    ]

    strategies.forEach(strategy => {
      this.routingStrategies.set(strategy.name, strategy)
    })
  }

  /**
   * 初始化服务指标
   */
  private initializeServiceMetrics(): void {
    const providers = this.configManager.getAllProviderConfigs()

    for (const providerConfig of providers) {
      if (!providerConfig.enabled) continue

      const models = providerConfig.models.filter(model => model.enabled)

      for (const model of models) {
        const serviceKey = `${providerConfig.id}-${model.id}`
        this.serviceMetrics.set(serviceKey, {
          provider: providerConfig.id,
          model: model.id,
          availability: 1.0,
          averageResponseTime: this.estimateResponseTime(model.speed),
          errorRate: 0.0,
          costPerToken: (model.inputCost + model.outputCost) / 2,
          qualityScore: this.getQualityScore(model.quality),
          throughput: 0,
          lastUsed: new Date(),
          requestCount: 0,
          successRate: 1.0
        })
      }
    }
  }

  /**
   * 估算响应时间
   */
  private estimateResponseTime(speed: 'fast' | 'medium' | 'slow'): number {
    const baseTimes = {
      fast: 800,
      medium: 2000,
      slow: 5000
    }
    return baseTimes[speed] || 2000
  }

  /**
   * 获取质量评分
   */
  private getQualityScore(quality: 'basic' | 'good' | 'excellent'): number {
    const scores = {
      basic: 0.6,
      good: 0.8,
      excellent: 1.0
    }
    return scores[quality] || 0.7
  }

  /**
   * 启动性能监控
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics()
      this.cleanupCache()
    }, 60000) // 每分钟更新一次
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(): void {
    const stats = this.serviceFactory.getServiceStats()

    // 根据工厂统计更新服务指标
    for (const [providerId, providerStats] of Object.entries(stats)) {
      // 找到该提供商的所有服务实例
      for (const [serviceKey, metrics] of this.serviceMetrics.entries()) {
        if (metrics.provider === providerId) {
          // 更新可用性
          const healthyInstances = providerStats.healthyInstances || 1
          const totalInstances = providerStats.instanceCount || 1
          metrics.availability = healthyInstances / totalInstances

          // 更新吞吐量
          metrics.throughput = providerStats.totalRequests || 0

          // 更新错误率
          const totalErrors = providerStats.totalErrors || 0
          const totalRequests = providerStats.totalRequests || 1
          metrics.errorRate = totalErrors / totalRequests
        }
      }
    }
  }

  /**
   * 清理缓存
   */
  private cleanupCache(): void {
    const now = Date.now()
    const cacheTTL = this.configManager.getGlobalConfig().cacheTTL

    for (const [key, response] of this.requestCache.entries()) {
      if (now - response.timestamp.getTime() > cacheTTL) {
        this.requestCache.delete(key)
      }
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: RoutingRequest): string {
    const keyData = {
      prompt: request.prompt,
      model: request.preferences?.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      strategy: this.currentStrategy
    }
    return Buffer.from(JSON.stringify(keyData)).toString('base64')
  }

  /**
   * 检查缓存
   */
  private checkCache(request: RoutingRequest): EnhancedRoutingResponse | null {
    if (!this.configManager.getGlobalConfig().cachingEnabled) {
      return null
    }

    const cacheKey = this.generateCacheKey(request)
    const cached = this.requestCache.get(cacheKey)

    if (cached && cached.success) {
      this.logger.debug('Cache hit for request', { requestId: request.requestId })
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cacheHit: true
        }
      }
    }

    return null
  }

  /**
   * 存储到缓存
   */
  private storeCache(request: RoutingRequest, response: EnhancedRoutingResponse): void {
    if (!this.configManager.getGlobalConfig().cachingEnabled || !response.success) {
      return
    }

    const cacheKey = this.generateCacheKey(request)
    this.requestCache.set(cacheKey, response)
  }

  /**
   * 计算服务评分
   */
  private calculateServiceScore(
    serviceKey: string,
    metrics: ServiceMetrics,
    request: RoutingRequest,
    strategy: RoutingStrategy
  ): number {
    let score = 0

    // 可用性评分
    score += metrics.availability * strategy.weights.availability

    // 速度评分（响应时间越短越好）
    const speedScore = Math.max(0, 1 - (metrics.averageResponseTime / 10000)) // 10秒为基准
    score += speedScore * strategy.weights.speed

    // 成本评分（成本越低越好）
    const costScore = Math.max(0, 1 - (metrics.costPerToken / 0.1)) // $0.1/1K token为基准
    score += costScore * strategy.weights.cost

    // 质量评分
    score += metrics.qualityScore * strategy.weights.quality

    // 应用用户偏好调整
    if (request.preferences) {
      if (request.preferences.cost === 'low') {
        score += costScore * 0.2
      }
      if (request.preferences.speed === 'fast') {
        score += speedScore * 0.2
      }
      if (request.preferences.quality === 'excellent') {
        score += metrics.qualityScore * 0.2
      }
    }

    return score
  }

  /**
   * 筛选服务
   */
  private filterServices(
    request: RoutingRequest
  ): Map<string, ServiceMetrics> {
    const filtered = new Map<string, ServiceMetrics>()

    for (const [serviceKey, metrics] of this.serviceMetrics.entries()) {
      let include = true

      // 检查约束条件
      if (request.constraints) {
        // 最大响应时间
        if (request.constraints.maxResponseTime &&
            metrics.averageResponseTime > request.constraints.maxResponseTime) {
          include = false
        }

        // 最大成本
        if (request.constraints.maxCost) {
          const estimatedCost = metrics.costPerToken * (request.maxTokens || 1000)
          if (estimatedCost > request.maxCost) {
            include = false
          }
        }

        // 允许的提供商
        if (request.constraints.allowedProviders &&
            !request.constraints.allowedProviders.includes(metrics.provider)) {
          include = false
        }

        // 阻止的提供商
        if (request.constraints.blockedProviders &&
            request.constraints.blockedProviders.includes(metrics.provider)) {
          include = false
        }

        // 最小质量要求
        if (request.constraints.minQuality &&
            metrics.qualityScore < request.constraints.minQuality) {
          include = false
        }
      }

      // 检查可用性
      if (metrics.availability < 0.3) {
        include = false
      }

      if (include) {
        filtered.set(serviceKey, metrics)
      }
    }

    return filtered
  }

  /**
   * 选择最优服务
   */
  private selectOptimalService(
    request: RoutingRequest,
    availableServices: Map<string, ServiceMetrics>
  ): RoutingDecision {
    const strategy = this.routingStrategies.get(this.currentStrategy)!

    // 应用路由规则
    let candidates = Array.from(availableServices.entries())

    for (const rule of strategy.rules) {
      candidates = this.applyRoutingRule(candidates, rule, request)
    }

    // 计算评分
    const scoredServices = candidates.map(([serviceKey, metrics]) => ({
      serviceKey,
      metrics,
      score: this.calculateServiceScore(serviceKey, metrics, request, strategy)
    }))

    // 按评分排序
    scoredServices.sort((a, b) => b.score - a.score)

    if (scoredServices.length === 0) {
      throw new Error('No suitable service available for the request')
    }

    const selected = scoredServices[0]
    const alternatives = scoredServices.slice(1, 3).map(s => ({
      provider: s.metrics.provider,
      model: s.metrics.model,
      score: s.score,
      reason: this.generateReasonDescription(s.metrics, s.score)
    }))

    return {
      selectedProvider: selected.metrics.provider,
      selectedModel: selected.metrics.model,
      score: selected.score,
      reasoning: [
        `Selected based on ${strategy.name} strategy`,
        `Score: ${selected.score.toFixed(3)}`,
        `Availability: ${(selected.metrics.availability * 100).toFixed(1)}%`,
        `Response Time: ${selected.metrics.averageResponseTime}ms`,
        `Cost: $${selected.metrics.costPerToken.toFixed(4)}/1K tokens`
      ],
      alternatives
    }
  }

  /**
   * 应用路由规则
   */
  private applyRoutingRule(
    candidates: Array<[string, ServiceMetrics]>,
    rule: RoutingRule,
    request: RoutingRequest
  ): Array<[string, ServiceMetrics]> {
    switch (rule.action) {
      case 'prefer_cheapest_available':
        return candidates.sort((a, b) => a[1].costPerToken - b[1].costPerToken)

      case 'prefer_fastest_available':
        return candidates.sort((a, b) => a[1].averageResponseTime - b[1].averageResponseTime)

      case 'prefer_highest_quality':
        return candidates.sort((a, b) => b[1].qualityScore - a[1].qualityScore)

      case 'filter_by_cost':
        if (request.constraints?.maxCost) {
          return candidates.filter(([, metrics]) => {
            const estimatedCost = metrics.costPerToken * (request.maxTokens || 1000)
            return estimatedCost <= request.constraints.maxCost
          })
        }
        return candidates

      case 'filter_by_response_time':
        if (request.constraints?.maxResponseTime) {
          return candidates.filter(([, metrics]) =>
            metrics.averageResponseTime <= request.constraints.maxResponseTime
          )
        }
        return candidates

      case 'filter_by_quality':
        if (request.constraints?.minQuality) {
          return candidates.filter(([, metrics]) =>
            metrics.qualityScore >= request.constraints.minQuality
          )
        }
        return candidates

      case 'switch_provider':
        // 这里可以实现更复杂的提供商切换逻辑
        return candidates.filter(([, metrics]) => metrics.availability > 0.8)

      default:
        return candidates
    }
  }

  /**
   * 生成推理描述
   */
  private generateReasonDescription(metrics: ServiceMetrics, score: number): string {
    const reasons = []

    if (metrics.availability >= 0.9) {
      reasons.push('High availability')
    }
    if (metrics.averageResponseTime < 2000) {
      reasons.push('Fast response')
    }
    if (metrics.costPerToken < 0.005) {
      reasons.push('Low cost')
    }
    if (metrics.qualityScore >= 0.9) {
      reasons.push('High quality')
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Balanced choice'
  }

  /**
   * 并发路由请求（多个提供商同时处理，选择最佳结果）
   */
  async routeConcurrentRequest(
    request: RoutingRequest,
    maxConcurrency: number = 2
  ): Promise<EnhancedRoutingResponse> {
    const startTime = Date.now()

    // 生成请求ID
    if (!request.requestId) {
      request.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    this.logger.info('Routing concurrent AI request', {
      requestId: request.requestId,
      maxConcurrency,
      preferences: request.preferences
    })

    try {
      // 获取可用的服务
      const availableServices = this.filterServices(request)

      if (availableServices.size === 0) {
        throw new Error('No services available matching the request criteria')
      }

      // 选择前N个最佳服务进行并发请求
      const strategy = this.routingStrategies.get(this.currentStrategy)!
      const scoredServices = Array.from(availableServices.entries())
        .map(([serviceKey, metrics]) => ({
          serviceKey,
          metrics,
          score: this.calculateServiceScore(serviceKey, metrics, request, strategy)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxConcurrency)

      if (scoredServices.length === 0) {
        throw new Error('No suitable services for concurrent processing')
      }

      // 并发执行请求
      const promises = scoredServices.map(async (service) => {
        try {
          const providerService = await this.serviceFactory.getService(service.metrics.provider)
          const response = await Promise.race([
            providerService.generateText({
              prompt: request.prompt,
              model: service.metrics.model,
              temperature: request.temperature,
              maxTokens: request.maxTokens,
              topP: request.topP,
              frequencyPenalty: request.frequencyPenalty,
              presencePenalty: request.presencePenalty,
              stop: request.stop
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timeout')),
              request.constraints?.maxResponseTime || 30000)
            )
          ]) as any

          return {
            service,
            response,
            success: true
          }
        } catch (error) {
          return {
            service,
            error: error as Error,
            success: false
          }
        }
      })

      // 等待第一个成功的结果
      const results = await Promise.allSettled(promises)
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<any> =>
          result.status === 'fulfilled' && result.value.success
        )
        .map(result => result.value)

      if (successfulResults.length === 0) {
        throw new Error('All concurrent requests failed')
      }

      // 选择最佳结果（基于响应时间和质量）
      const bestResult = successfulResults.reduce((best, current) => {
        const currentScore = this.calculateConcurrentResultScore(current, request)
        const bestScore = this.calculateConcurrentResultScore(best, request)
        return currentScore > bestScore ? current : best
      })

      const decision: RoutingDecision = {
        selectedProvider: bestResult.service.metrics.provider,
        selectedModel: bestResult.service.metrics.model,
        score: bestResult.service.score,
        reasoning: [
          `Selected from ${maxConcurrency} concurrent requests`,
          `Concurrent strategy: ${this.currentStrategy}`,
          `Response time: ${Date.now() - startTime}ms`,
          `Score: ${bestResult.service.score.toFixed(3)}`
        ],
        alternatives: scoredServices
          .filter(s => s !== bestResult.service)
          .slice(0, 2)
          .map(s => ({
            provider: s.metrics.provider,
            model: s.metrics.model,
            score: s.score,
            reason: this.generateReasonDescription(s.metrics, s.score)
          }))
      }

      const enhancedResponse: EnhancedRoutingResponse = {
        requestId: request.requestId!,
        provider: bestResult.service.metrics.provider,
        model: bestResult.service.metrics.model,
        content: bestResult.response.content,
        usage: bestResult.response.usage,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        success: true,
        metadata: {
          routingDecision: decision,
          fallbackUsed: false,
          performanceScore: bestResult.service.score,
          costEfficiency: this.calculateCostEfficiency(bestResult.response, decision),
          qualityScore: this.calculateQualityScore(bestResult.response, decision),
          cacheHit: false,
          concurrentResults: {
            totalRequests: maxConcurrency,
            successfulRequests: successfulResults.length,
            selectedProvider: bestResult.service.metrics.provider
          }
        }
      }

      // 更新所有参与的服务指标
      scoredServices.forEach(service => {
        const result = successfulResults.find(r => r.service === service)
        this.updateServiceMetrics(service.metrics.provider, {
          ...enhancedResponse,
          success: !!result,
          provider: service.metrics.provider,
          model: service.metrics.model,
          content: result?.response.content || '',
          usage: result?.response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 }
        } as EnhancedRoutingResponse)
      })

      // 存储到缓存
      this.storeCache(request, enhancedResponse)

      this.logger.info('Concurrent request routed successfully', {
        requestId: request.requestId,
        provider: bestResult.service.metrics.provider,
        concurrentRequests: maxConcurrency,
        successfulRequests: successfulResults.length,
        responseTime: enhancedResponse.responseTime
      })

      return enhancedResponse

    } catch (error) {
      this.logger.error('Concurrent request routing failed', {
        requestId: request.requestId,
        error: error.message,
        maxConcurrency
      })

      // 降级到普通路由
      return this.routeRequest(request)
    }
  }

  /**
   * 计算并发结果评分
   */
  private calculateConcurrentResultScore(
    result: any,
    request: RoutingRequest
  ): number {
    let score = result.service.score * 0.7 // 服务评分占70%

    // 响应时间评分占30%
    const responseTimeScore = Math.max(0, 1 - (result.response.responseTime || 0) / 10000)
    score += responseTimeScore * 0.3

    return score
  }

  /**
   * 路由请求（主要入口点）
   */
  async routeRequest(request: RoutingRequest): Promise<EnhancedRoutingResponse> {
    const startTime = Date.now()

    // 检查缓存
    const cachedResponse = this.checkCache(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // 生成请求ID
    if (!request.requestId) {
      request.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    this.logger.info('Routing AI request', {
      requestId: request.requestId,
      strategy: this.currentStrategy,
      preferences: request.preferences,
      constraints: request.constraints
    })

    try {
      // 筛选可用服务
      const availableServices = this.filterServices(request)

      if (availableServices.size === 0) {
        throw new Error('No services available matching the request criteria')
      }

      // 选择最优服务
      const decision = this.selectOptimalService(request, availableServices)

      // 执行请求
      const service = await this.serviceFactory.getService(decision.selectedProvider)
      const response = await service.generateText({
        prompt: request.prompt,
        model: decision.selectedModel,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        topP: request.topP,
        frequencyPenalty: request.frequencyPenalty,
        presencePenalty: request.presencePenalty,
        stop: request.stop
      })

      const enhancedResponse: EnhancedRoutingResponse = {
        requestId: request.requestId!,
        provider: decision.selectedProvider,
        model: decision.selectedModel,
        content: response.content,
        usage: response.usage,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        success: true,
        metadata: {
          routingDecision: decision,
          fallbackUsed: false,
          performanceScore: decision.score,
          costEfficiency: this.calculateCostEfficiency(response, decision),
          qualityScore: this.calculateQualityScore(response, decision),
          cacheHit: false
        }
      }

      // 更新服务指标
      this.updateServiceMetrics(decision.selectedProvider, enhancedResponse)

      // 存储到缓存
      this.storeCache(request, enhancedResponse)

      this.logger.info('Request routed successfully', {
        requestId: request.requestId,
        provider: decision.selectedProvider,
        model: decision.selectedModel,
        responseTime: enhancedResponse.responseTime,
        cost: enhancedResponse.usage.estimatedCost
      })

      return enhancedResponse

    } catch (error) {
      const responseTime = Date.now() - startTime

      // 尝试降级处理
      if (this.configManager.getGlobalConfig().fallbackEnabled) {
        try {
          return await this.executeFallbackRequest(request, error as Error)
        } catch (fallbackError) {
          this.logger.error('Fallback request also failed', {
            requestId: request.requestId,
            originalError: error.message,
            fallbackError: fallbackError.message
          })
          throw fallbackError
        }
      }

      this.logger.error('Request routing failed', {
        requestId: request.requestId,
        error: error.message,
        responseTime
      })

      throw error
    }
  }

  /**
   * 执行降级请求
   */
  private async executeFallbackRequest(
    request: RoutingRequest,
    originalError: Error
  ): Promise<EnhancedRoutingResponse> {
    const startTime = Date.now()

    this.logger.info('Executing fallback request', {
      requestId: request.requestId,
      originalError: originalError.message
    })

    // 尝试使用其他可用的服务
    const availableProviders = this.configManager.getAllProviderConfigs()
      .filter(p => p.enabled)
      .filter(p => !request.constraints?.blockedProviders?.includes(p.id))
      .filter(p => p.id !== 'openai') // 避免重复使用失败的提供商

    if (availableProviders.length === 0) {
      throw new Error('No fallback providers available')
    }

    for (const provider of availableProviders) {
      try {
        const service = await this.serviceFactory.getService(provider.id)
        const response = await service.generateText({
          prompt: request.prompt,
          model: request.preferences?.model,
          temperature: request.temperature,
          maxTokens: request.maxTokens
        })

        const enhancedResponse: EnhancedRoutingResponse = {
          requestId: request.requestId!,
          provider: provider.id,
          model: response.model,
          content: response.content,
          usage: response.usage,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          success: true,
          metadata: {
            routingDecision: {
              selectedProvider: provider.id,
              selectedModel: response.model,
              score: 0.5,
              reasoning: ['Fallback provider used'],
              alternatives: []
            },
            fallbackUsed: true,
            fallbackChain: [originalError.message],
            performanceScore: 0.5,
            costEfficiency: 0.5,
            qualityScore: 0.5,
            cacheHit: false
          }
        }

        this.logger.info('Fallback request successful', {
          requestId: request.requestId,
          fallbackProvider: provider.id,
          responseTime: enhancedResponse.responseTime
        })

        return enhancedResponse

      } catch (fallbackError) {
        this.logger.warn(`Fallback provider ${provider.id} also failed`, {
          requestId: request.requestId,
          error: fallbackError.message
        })
        continue
      }
    }

    throw new Error('All fallback providers failed')
  }

  /**
   * 更新服务指标
   */
  private updateServiceMetrics(providerId: string, response: EnhancedRoutingResponse): void {
    const serviceKey = `${providerId}-${response.model}`
    const metrics = this.serviceMetrics.get(serviceKey)

    if (metrics) {
      // 更新请求计数
      metrics.requestCount++
      metrics.lastUsed = new Date()

      // 更新响应时间（使用指数移动平均）
      const alpha = 0.3
      metrics.averageResponseTime =
        alpha * response.responseTime +
        (1 - alpha) * metrics.averageResponseTime

      // 更新成功率
      const successRate = response.success ? 1 : 0
      metrics.successRate =
        alpha * successRate +
        (1 - alpha) * metrics.successRate

      // 更新性能历史
      const history = this.performanceHistory.get(serviceKey) || []
      history.push(response.responseTime)
      if (history.length > 100) {
        history.shift()
      }
      this.performanceHistory.set(serviceKey, history)
    }
  }

  /**
   * 计算成本效益
   */
  private calculateCostEfficiency(response: any, decision: RoutingDecision): number {
    const cost = response.usage?.estimatedCost || 0
    const value = decision.score / 10 // 简化的价值评估

    return value > 0 ? value / cost : 0
  }

  /**
   * 计算质量评分
   */
  private calculateQualityScore(response: any, decision: RoutingDecision): number {
    const metrics = this.serviceMetrics.get(`${decision.selectedProvider}-${decision.selectedModel}`)
    return metrics?.qualityScore || 0.8
  }

  /**
   * 预热服务（提前初始化连接）
   */
  async warmupServices(providerIds?: string[]): Promise<void> {
    const providers = providerIds ||
      this.configManager.getAllProviderConfigs()
        .filter(p => p.enabled)
        .map(p => p.id)

    this.logger.info('Warming up AI services', { providers })

    const warmupPromises = providers.map(async (providerId) => {
      try {
        const service = await this.serviceFactory.getService(providerId)

        // 发送一个简单的健康检查请求
        const healthCheck = await service.healthCheck()

        this.logger.info(`Service ${providerId} warmed up successfully`, {
          status: healthCheck.status,
          responseTime: healthCheck.responseTime
        })

        // 更新服务可用性
        for (const [serviceKey, metrics] of this.serviceMetrics.entries()) {
          if (metrics.provider === providerId) {
            metrics.availability = healthCheck.status === 'healthy' ? 1.0 : 0.5
            if (healthCheck.responseTime) {
              metrics.averageResponseTime = healthCheck.responseTime
            }
          }
        }

      } catch (error) {
        this.logger.warn(`Failed to warm up service ${providerId}`, { error: error.message })

        // 标记服务为不可用
        for (const [serviceKey, metrics] of this.serviceMetrics.entries()) {
          if (metrics.provider === providerId) {
            metrics.availability = 0.1
          }
        }
      }
    })

    await Promise.allSettled(warmupPromises)
    this.logger.info('Service warmup completed')
  }

  /**
   * 智能负载均衡分发
   */
  async distributeLoad(
    requests: RoutingRequest[],
    distributionStrategy: 'round-robin' | 'weighted' | 'least-connections' = 'weighted'
  ): Promise<EnhancedRoutingResponse[]> {
    this.logger.info('Distributing load across services', {
      requestCount: requests.length,
      strategy: distributionStrategy
    })

    const availableServices = Array.from(this.serviceMetrics.values())
      .filter(metrics => metrics.availability > 0.5)

    if (availableServices.length === 0) {
      throw new Error('No available services for load distribution')
    }

    const results: EnhancedRoutingResponse[] = []

    switch (distributionStrategy) {
      case 'round-robin':
        results.push(...await this.roundRobinDistribution(requests, availableServices))
        break
      case 'weighted':
        results.push(...await this.weightedDistribution(requests, availableServices))
        break
      case 'least-connections':
        results.push(...await this.leastConnectionsDistribution(requests, availableServices))
        break
    }

    this.logger.info('Load distribution completed', {
      totalRequests: requests.length,
      successfulRequests: results.filter(r => r.success).length
    })

    return results
  }

  /**
   * 轮询分发
   */
  private async roundRobinDistribution(
    requests: RoutingRequest[],
    services: ServiceMetrics[]
  ): Promise<EnhancedRoutingResponse[]> {
    const results: EnhancedRoutingResponse[] = []
    let serviceIndex = 0

    for (const request of requests) {
      const service = services[serviceIndex % services.length]

      try {
        const response = await this.routeRequestWithProvider(request, service.provider)
        results.push(response)
      } catch (error) {
        // 创建失败响应
        results.push(this.createFailureResponse(request, error as Error, service.provider))
      }

      serviceIndex++
    }

    return results
  }

  /**
   * 权重分发
   */
  private async weightedDistribution(
    requests: RoutingRequest[],
    services: ServiceMetrics[]
  ): Promise<EnhancedRoutingResponse[]> {
    const results: EnhancedRoutingResponse[] = []

    // 计算权重（基于可用性和性能）
    const weights = services.map(service => ({
      service,
      weight: service.availability * service.qualityScore * (1 / (1 + service.errorRate))
    }))

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)

    for (const request of requests) {
      // 随机选择服务（基于权重）
      let random = Math.random() * totalWeight
      let selectedService = weights[0].service

      for (const { service, weight } of weights) {
        random -= weight
        if (random <= 0) {
          selectedService = service
          break
        }
      }

      try {
        const response = await this.routeRequestWithProvider(request, selectedService.provider)
        results.push(response)
      } catch (error) {
        results.push(this.createFailureResponse(request, error as Error, selectedService.provider))
      }
    }

    return results
  }

  /**
   * 最少连接分发
   */
  private async leastConnectionsDistribution(
    requests: RoutingRequest[],
    services: ServiceMetrics[]
  ): Promise<EnhancedRoutingResponse[]> {
    const results: EnhancedRoutingResponse[] = []

    for (const request of requests) {
      // 选择当前连接数最少的服务
      const sortedServices = [...services].sort((a, b) => a.throughput - b.throughput)
      const selectedService = sortedServices[0]

      try {
        const response = await this.routeRequestWithProvider(request, selectedService.provider)
        results.push(response)
      } catch (error) {
        results.push(this.createFailureResponse(request, error as Error, selectedService.provider))
      }
    }

    return results
  }

  /**
   * 使用指定提供商路由请求
   */
  private async routeRequestWithProvider(
    request: RoutingRequest,
    providerId: string
  ): Promise<EnhancedRoutingResponse> {
    const startTime = Date.now()

    if (!request.requestId) {
      request.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    const service = await this.serviceFactory.getService(providerId)
    const response = await service.generateText({
      prompt: request.prompt,
      model: request.preferences?.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      topP: request.topP,
      frequencyPenalty: request.frequencyPenalty,
      presencePenalty: request.presencePenalty,
      stop: request.stop
    })

    const enhancedResponse: EnhancedRoutingResponse = {
      requestId: request.requestId!,
      provider: providerId,
      model: response.model,
      content: response.content,
      usage: response.usage,
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
      success: true,
      metadata: {
        routingDecision: {
          selectedProvider: providerId,
          selectedModel: response.model,
          score: 0.8,
          reasoning: ['Load distribution'],
          alternatives: []
        },
        fallbackUsed: false,
        performanceScore: 0.8,
        costEfficiency: 0.8,
        qualityScore: 0.8,
        cacheHit: false
      }
    }

    this.updateServiceMetrics(providerId, enhancedResponse)
    return enhancedResponse
  }

  /**
   * 创建失败响应
   */
  private createFailureResponse(
    request: RoutingRequest,
    error: Error,
    providerId: string
  ): EnhancedRoutingResponse {
    return {
      requestId: request.requestId || `failed_${Date.now()}`,
      provider: providerId,
      model: 'unknown',
      content: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
      responseTime: 0,
      timestamp: new Date(),
      success: false,
      error: error.message,
      metadata: {
        routingDecision: {
          selectedProvider: providerId,
          selectedModel: 'unknown',
          score: 0,
          reasoning: ['Load distribution failed'],
          alternatives: []
        },
        fallbackUsed: false,
        performanceScore: 0,
        costEfficiency: 0,
        qualityScore: 0,
        cacheHit: false
      }
    }
  }

  /**
   * 获取路由统计信息
   */
  getRoutingStats(): any {
    const strategy = this.routingStrategies.get(this.currentStrategy)

    return {
      currentStrategy: this.currentStrategy,
      strategyDescription: strategy?.description,
      totalRequests: Array.from(this.performanceHistory.values())
        .reduce((sum, history) => sum + history.length, 0),
      cacheStats: {
        totalEntries: this.requestCache.size,
        hitRate: this.calculateCacheHitRate()
      },
      serviceMetrics: Object.fromEntries(this.serviceMetrics),
      availableProviders: this.configManager.getAllProviderConfigs()
        .filter(p => p.enabled)
        .map(p => p.id)
    }
  }

  /**
   * 计算缓存命中率
   */
  private calculateCacheHitRate(): number {
    const totalRequests = Array.from(this.performanceHistory.values())
      .reduce((sum, history) => sum + history.length, 0)

    if (totalRequests === 0) return 0

    const cacheHits = Array.from(this.requestCache.values())
      .filter(response => response.metadata?.cacheHit).length

    return cacheHits / totalRequests
  }

  /**
   * 设置路由策略
   */
  setRoutingStrategy(strategyName: string): void {
    if (!this.routingStrategies.has(strategyName)) {
      throw new Error(`Unknown routing strategy: ${strategyName}`)
    }

    this.currentStrategy = strategyName
    this.logger.info('Routing strategy changed', { newStrategy: strategyName })
  }

  /**
   * 获取可用的路由策略
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.routingStrategies.keys())
  }

  /**
   * 添加自定义路由策略
   */
  addRoutingStrategy(strategy: RoutingStrategy): void {
    this.routingStrategies.set(strategy.name, strategy)
    this.logger.info('Custom routing strategy added', { strategy: strategy.name })
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.requestCache.clear()
    this.serviceMetrics.clear()
    this.performanceHistory.clear()
    this.routingStrategies.clear()
  }
}

export default EnhancedAIRouter