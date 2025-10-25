/**
 * AI服务路由器
 * 智能路由AI请求到最适合的提供商，支持降级和负载均衡
 */

export interface UserPreferences {
  cost?: 'low' | 'medium' | 'high'
  speed?: 'fast' | 'normal' | 'slow'
  quality?: 'basic' | 'good' | 'excellent'
}

export interface UserConstraints {
  maxResponseTime?: number
  maxCost?: number
  providers?: string[]
}

export interface AIRequest {
  prompt: string
  context?: string[]
  temperature?: number
  maxTokens?: number
  userId: string
  requestId: string
  preferences?: UserPreferences
  constraints?: UserConstraints
}

export interface AIResponse {
  requestId: string
  provider: string
  model: string
  content: string
  tokens: {
    input: number
    output: number
    total: number
  }
  responseTime: number
  cost: number
  success: boolean
  error?: string
  metadata: {
    fallbackUsed: boolean
    fallbackChain?: string[]
    qualityScore?: number
    confidence?: number
  }
}

export interface AIServiceConfig {
  provider: string
  model: string
  apiKey?: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  enabled: boolean
  priority: number
  costPerToken: number
  avgResponseTime: number
  qualityScore: number
}

export interface ServiceHealth {
  provider: string
  model: string
  available: boolean
  responseTime: number
  errorRate: number
  lastCheck: Date
}

/**
 * 安全的API密钥管理器
 */
class APIKeyManager {
  private static validateKey(key: string | undefined, provider: string): string {
    if (!key) {
      throw new Error(`${provider} API key not configured. Please check your environment variables.`)
    }

    // 基本格式验证
    switch (provider) {
      case 'openai':
        if (!key.startsWith('sk-') || key.length < 20) {
          throw new Error('Invalid OpenAI API key format detected.')
        }
        break
      case 'anthropic':
        if (!key.startsWith('sk-ant-') || key.length < 20) {
          throw new Error('Invalid Anthropic API key format detected.')
        }
        break
      default:
        if (key.length < 10) {
          throw new Error(`Invalid ${provider} API key format detected.`)
        }
    }

    return key
  }

  static getOpenAIKey(): string {
    return this.validateKey(process.env.OPENAI_API_KEY, 'OpenAI')
  }

  static getAnthropicKey(): string {
    return this.validateKey(process.env.ANTHROPIC_API_KEY, 'Anthropic')
  }
}

export class AIServiceRouter {
  private services: Map<string, AIServiceConfig> = new Map()
  private healthStatus: Map<string, ServiceHealth> = new Map()
  private performanceHistory: Map<string, number[]> = new Map()
  private costTracker: Map<string, number> = new Map()
  private healthCheckInterval?: NodeJS.Timeout

  constructor() {
    this.initializeServices()
    this.startHealthMonitoring()
  }

  /**
   * 安全获取API密钥
   */
  private getSecureAPIKey(provider: string): string {
    switch (provider) {
      case 'openai':
        return APIKeyManager.getOpenAIKey()
      case 'anthropic':
        return APIKeyManager.getAnthropicKey()
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
  }

  private initializeServices() {
    // OpenAI 配置
    this.services.set('openai-gpt3.5-turbo', {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      enabled: true,
      priority: 2,
      costPerToken: 0.000002,
      avgResponseTime: 800,
      qualityScore: 7
    })

    this.services.set('openai-gpt-4', {
      provider: 'openai',
      model: 'gpt-4',
      enabled: true,
      priority: 1,
      costPerToken: 0.00003,
      avgResponseTime: 2000,
      qualityScore: 9
    })

    // Anthropic 配置
    this.services.set('anthropic-claude-3-sonnet', {
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      enabled: true,
      priority: 2,
      costPerToken: 0.000015,
      avgResponseTime: 1200,
      qualityScore: 8
    })

    // 本地 Ollama 配置
    this.services.set('ollama-llama2', {
      provider: 'ollama',
      model: 'llama2',
      enabled: true,
      priority: 3,
      costPerToken: 0,
      avgResponseTime: 3000,
      qualityScore: 6
    })
  }

  async routeRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now()
    const requestId = request.requestId

    try {
      // 获取可用的服务
      const availableServices = this.getAvailableServices(request)

      if (availableServices.length === 0) {
        throw new Error('No AI services available')
      }

      // 智能排序服务
      const rankedServices = this.rankServices(availableServices, request)

      // 按顺序尝试执行请求
      for (const serviceKey of rankedServices) {
        try {
          const result = await this.executeServiceRequest(serviceKey, request)

          // 记录性能数据
          this.recordPerformance(serviceKey, Date.now() - startTime)
          this.trackCost(serviceKey, result.cost)

          return {
            ...result,
            requestId,
            metadata: {
              fallbackUsed: rankedServices.indexOf(serviceKey) > 0,
              fallbackChain: rankedServices.slice(0, rankedServices.indexOf(serviceKey) + 1),
              qualityScore: this.calculateQualityScore(result.content, serviceKey)
            }
          }
        } catch (error) {
          console.warn(`Service ${serviceKey} failed:`, error)
          this.updateServiceHealth(serviceKey, false, error as Error)
          continue
        }
      }

      throw new Error('All AI services failed')

    } catch (error) {
      return {
        requestId,
        provider: 'none',
        model: 'none',
        content: '',
        tokens: { input: 0, output: 0, total: 0 },
        responseTime: Date.now() - startTime,
        cost: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          fallbackUsed: false,
          fallbackChain: []
        }
      }
    }
  }

  private getAvailableServices(request: AIRequest): string[] {
    const constraints = request.constraints || {}
    const providerList = constraints.providers || Array.from(this.services.keys())

    return providerList
      .filter(serviceKey => {
        const service = this.services.get(serviceKey)
        const health = this.healthStatus.get(serviceKey)

        return service?.enabled &&
               health?.available &&
               this.meetsConstraints(serviceKey, request)
      })
  }

  private meetsConstraints(serviceKey: string, request: AIRequest): boolean {
    const service = this.services.get(serviceKey)
    const constraints = request.constraints || {}

    if (constraints.maxResponseTime && service?.avgResponseTime > constraints.maxResponseTime) {
      return false
    }

    if (constraints.maxCost && service?.costPerToken > constraints.maxCost) {
      return false
    }

    return true
  }

  private rankServices(services: string[], request: AIRequest): string[] {
    const preferences: UserPreferences = request.preferences || {}

    return services.sort((a, b) => {
      const serviceA = this.services.get(a)
      const serviceB = this.services.get(b)

      if (!serviceA || !serviceB) {
        throw new Error(`Service not found: ${!serviceA ? a : b}`)
      }

      // 优先级排序
      if (serviceA.priority !== serviceB.priority) {
        return serviceA.priority - serviceB.priority
      }

      // 根据偏好排序
      return this.calculateServiceScore(serviceA, preferences) -
             this.calculateServiceScore(serviceB, preferences)
    })
  }

  private calculateServiceScore(service: AIServiceConfig, preferences: UserPreferences): number {
    let score = 0

    // 成本偏好评分
    if (preferences.cost === 'low') {
      score += (1 - service.costPerToken) * 100
    } else if (preferences.cost === 'high') {
      score += service.costPerToken * 100
    }

    // 速度偏好评分
    if (preferences.speed === 'fast') {
      score += (1 / service.avgResponseTime) * 1000
    }

    // 质量偏好评分
    if (preferences.quality === 'excellent') {
      score += service.qualityScore * 20
    }

    // 性能历史评分
    const avgPerf = this.getAveragePerformance(service.provider + '-' + service.model)
    if (avgPerf > 0) {
      score += (1 / avgPerf) * 1000
    }

    return score
  }

  private async executeServiceRequest(serviceKey: string, request: AIRequest): Promise<Omit<AIResponse, 'requestId' | 'metadata'>> {
    const service = this.services.get(serviceKey)

    if (!service) {
      throw new Error(`Service ${serviceKey} not found`)
    }

    const startTime = Date.now()

    // 根据提供商执行请求
    switch (service.provider) {
      case 'openai':
        return await this.executeOpenAIRequest(service, request)
      case 'anthropic':
        return await this.executeAnthropicRequest(service, request)
      case 'ollama':
        return await this.executeOllamaRequest(service, request)
      default:
        throw new Error(`Unsupported provider: ${service.provider}`)
    }
  }

  private async executeOpenAIRequest(service: AIServiceConfig, request: AIRequest): Promise<Omit<AIResponse, 'requestId' | 'metadata'>> {
    const apiKey = this.getSecureAPIKey('openai')
    const startTime = Date.now()

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: service.model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant for MindNote.' },
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''

    return {
      provider: 'openai',
      model: service.model,
      content,
      tokens: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      },
      responseTime: Date.now() - startTime,
      cost: (data.usage?.total_tokens || 0) * service.costPerToken,
      success: true
    }
  }

  private async executeAnthropicRequest(service: AIServiceConfig, request: AIRequest): Promise<Omit<AIResponse, 'requestId' | 'metadata'>> {
    const apiKey = this.getSecureAPIKey('anthropic')
    const startTime = Date.now()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: service.model,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        messages: [
          { role: 'user', content: request.prompt }
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.content[0]?.text || ''

    return {
      provider: 'anthropic',
      model: service.model,
      content,
      tokens: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        total: data.usage?.input_tokens + data.usage?.output_tokens || 0
      },
      responseTime: Date.now() - startTime,
      cost: (data.usage?.total_tokens || 0) * service.costPerToken,
      success: true
    }
  }

  private async executeOllamaRequest(service: AIServiceConfig, request: AIRequest): Promise<Omit<AIResponse, 'requestId' | 'metadata'>> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const startTime = Date.now()

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: service.model,
        prompt: request.prompt,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 2000,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.response || ''

    return {
      provider: 'ollama',
      model: service.model,
      content,
      tokens: {
        input: 0, // Ollama doesn't provide token counts
        output: 0,
        total: 0
      },
      responseTime: Date.now() - startTime,
      cost: 0, // 本地模型免费
      success: true
    }
  }

  private calculateQualityScore(content: string, serviceKey: string): number {
    // 简化的质量评分算法
    const service = this.services.get(serviceKey)

    if (!service) {
      throw new Error(`Service ${serviceKey} not found for quality scoring`)
    }

    let score = service.qualityScore

    // 基于内容长度调整评分
    const length = content.length
    if (length < 50) score -= 2
    else if (length > 1000) score -= 1
    else score += 1

    // 基于内容结构调整评分
    if (content.includes('\n')) score += 1 // 有结构化内容
    if (content.includes('.')) score += 1 // 有完整句子

    return Math.max(1, Math.min(10, score))
  }

  private recordPerformance(serviceKey: string, responseTime: number): void {
    if (!this.performanceHistory.has(serviceKey)) {
      this.performanceHistory.set(serviceKey, [])
    }

    const history = this.performanceHistory.get(serviceKey)!
    history.push(responseTime)

    // 保持最近50次记录
    if (history.length > 50) {
      history.shift()
    }
  }

  private getAveragePerformance(serviceKey: string): number {
    const history = this.performanceHistory.get(serviceKey) || []
    if (history.length === 0) return 0

    return history.reduce((sum, time) => sum + time, 0) / history.length
  }

  private trackCost(serviceKey: string, cost: number): void {
    const currentCost = this.costTracker.get(serviceKey) || 0
    this.costTracker.set(serviceKey, currentCost + cost)
  }

  private updateServiceHealth(serviceKey: string, available: boolean, error?: Error): void {
    this.healthStatus.set(serviceKey, {
      provider: serviceKey.split('-')[0],
      model: serviceKey.split('-')[1],
      available,
      responseTime: this.getAveragePerformance(serviceKey),
      errorRate: error ? 0.1 : 0.01,
      lastCheck: new Date()
    })
  }

  private startHealthMonitoring(): void {
    // 清理旧的定时器
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // 每30秒检查一次服务健康状态
    this.healthCheckInterval = setInterval(() => {
      this.checkAllServicesHealth()
    }, 30000)

    // 初始健康检查
    this.checkAllServicesHealth()
  }

  private async checkAllServicesHealth(): Promise<void> {
    for (const [serviceKey, service] of this.services.entries()) {
      if (!service.enabled) continue

      try {
        const health = await this.checkServiceHealth(serviceKey)
        this.updateServiceHealth(serviceKey, health.available)
      } catch (error) {
        this.updateServiceHealth(serviceKey, false, error as Error)
      }
    }
  }

  private async checkServiceHealth(serviceKey: string): Promise<{ available: boolean }> {
    const service = this.services.get(serviceKey)!

    try {
      switch (service.provider) {
        case 'openai':
          return await this.checkOpenAIHealth()
        case 'anthropic':
          return await this.checkAnthropicHealth()
        case 'ollama':
          return await this.checkOllamaHealth()
        default:
          return { available: false }
      }
    } catch (error) {
      return { available: false }
    }
  }

  private async checkOpenAIHealth(): Promise<{ available: boolean }> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return { available: false }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    return { available: response.ok }
  }

  private async checkAnthropicHealth(): Promise<{ available: boolean }> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return { available: false }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })

    return { available: response.ok }
  }

  private async checkOllamaHealth(): Promise<{ available: boolean }> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

    try {
      const response = await fetch(`${baseUrl}/api/tags`)
      return { available: response.ok }
    } catch (error) {
      return { available: false }
    }
  }

  // 公共方法
  getServiceHealth(): Map<string, ServiceHealth> {
    return new Map(this.healthStatus)
  }

  getCostStatistics(): { [serviceKey: string]: number } {
    const stats: { [serviceKey: string]: number } = {}
    for (const [key, cost] of this.costTracker.entries()) {
      stats[key] = cost
    }
    return stats
  }

  resetCostStatistics(): void {
    this.costTracker.clear()
  }

  getServicePerformanceHistory(serviceKey: string): number[] {
    return this.performanceHistory.get(serviceKey) || []
  }
}