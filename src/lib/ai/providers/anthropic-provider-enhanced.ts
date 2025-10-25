// Enhanced Anthropic Claude AI服务提供商实现
// 完整的Claude API集成，包含高级功能和优化

import { BaseAIProvider, AIRequest, AIResponse, AIError } from './base-provider'
import { Logger } from '@/lib/ai/services/logger'

export interface AnthropicConfig {
  apiKey: string
  baseURL?: string
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  enableCaching?: boolean
  cacheTTL?: number
  rateLimiting?: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
  costOptimization?: {
    preferCheapestModel: boolean
    maxCostPerRequest: number
  }
}

export interface AnthropicResponse extends AIResponse {
  anthropicModel: string
  stopReason?: string
  stopSequence?: string
  logprobs?: any
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost: number
}

export interface ClaudeModelInfo {
  id: string
  name: string
  provider: string
  contextLength: number
  inputCost: number // per 1K tokens
  outputCost: number // per 1K tokens
  capabilities: string[]
  speed: 'fast' | 'medium' | 'slow'
  quality: 'basic' | 'good' | 'excellent'
  vision?: boolean
  tools?: boolean
}

export class AnthropicEnhancedProvider extends BaseAIProvider {
  private apiKey: string
  private baseURL: string
  private logger = Logger.getInstance()
  private config: AnthropicConfig
  private rateLimiter: {
    requests: number[]
    tokens: number[]
  }
  private requestCache: Map<string, { response: any; timestamp: number }> = new Map()
  private supportedModels: Map<string, ClaudeModelInfo> = new Map()

  constructor(config: AnthropicConfig) {
    super({
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: config.timeout || 30000
    })

    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      enableCaching: true,
      cacheTTL: 300000, // 5分钟
      rateLimiting: {
        requestsPerMinute: 1000,
        tokensPerMinute: 40000
      },
      costOptimization: {
        preferCheapestModel: false,
        maxCostPerRequest: 2.0
      },
      ...config
    }

    this.apiKey = config.apiKey
    this.baseURL = config.baseURL || 'https://api.anthropic.com'

    this.rateLimiter = {
      requests: [],
      tokens: []
    }

    this.initializeModels()
    this.logger.info('Enhanced Anthropic Provider initialized', {
      baseURL: this.baseURL,
      caching: this.config.enableCaching,
      rateLimiting: !!this.config.rateLimiting
    })
  }

  /**
   * 初始化支持的模型信息
   */
  private initializeModels(): void {
    const models: ClaudeModelInfo[] = [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        contextLength: 200000,
        inputCost: 0.015,
        outputCost: 0.075,
        capabilities: ['chat', 'analysis', 'reasoning', 'vision', 'tools'],
        speed: 'slow',
        quality: 'excellent',
        vision: true,
        tools: true
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        contextLength: 200000,
        inputCost: 0.003,
        outputCost: 0.015,
        capabilities: ['chat', 'analysis', 'reasoning', 'vision', 'tools'],
        speed: 'medium',
        quality: 'excellent',
        vision: true,
        tools: true
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        contextLength: 200000,
        inputCost: 0.00025,
        outputCost: 0.00125,
        capabilities: ['chat', 'analysis'],
        speed: 'fast',
        quality: 'good'
      },
      {
        id: 'claude-2.1',
        name: 'Claude 2.1',
        provider: 'anthropic',
        contextLength: 100000,
        inputCost: 0.008,
        outputCost: 0.024,
        capabilities: ['chat', 'analysis', 'reasoning'],
        speed: 'medium',
        quality: 'good'
      },
      {
        id: 'claude-2.0',
        name: 'Claude 2.0',
        provider: 'anthropic',
        contextLength: 100000,
        inputCost: 0.008,
        outputCost: 0.024,
        capabilities: ['chat', 'analysis'],
        speed: 'medium',
        quality: 'good'
      },
      {
        id: 'claude-instant-1.2',
        name: 'Claude Instant',
        provider: 'anthropic',
        contextLength: 100000,
        inputCost: 0.0008,
        outputCost: 0.0024,
        capabilities: ['chat'],
        speed: 'fast',
        quality: 'basic'
      }
    ]

    models.forEach(model => {
      this.supportedModels.set(model.id, model)
    })
  }

  /**
   * 执行Anthropic API请求
   */
  private async makeRequest(endpoint: string, payload: any): Promise<any> {
    const url = `${this.baseURL}${endpoint}`
    const startTime = Date.now()

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout!)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new AIError(
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.error?.type || 'http_error',
          response.status,
          errorData
        )
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime

      this.logger.debug('Anthropic API request successful', {
        endpoint,
        responseTime,
        model: payload.model
      })

      return data

    } catch (error: any) {
      const responseTime = Date.now() - startTime
      this.logger.error('Anthropic API request failed', {
        endpoint,
        error: error.message,
        responseTime
      })

      if (error.name === 'AbortError') {
        throw new AIError('Request timeout', 'timeout', 408)
      }

      throw error
    }
  }

  /**
   * 检查速率限制
   */
  private checkRateLimit(tokens: number): void {
    if (!this.config.rateLimiting) return

    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // 清理过期的请求记录
    this.rateLimiter.requests = this.rateLimiter.requests.filter(time => time > oneMinuteAgo)
    this.rateLimiter.tokens = this.rateLimiter.tokens.filter(time => time > oneMinuteAgo)

    // 检查请求限制
    if (this.rateLimiter.requests.length >= this.config.rateLimiting.requestsPerMinute) {
      throw new AIError('Rate limit exceeded: Too many requests per minute', 'rate_limit_exceeded', 429)
    }

    // 检查令牌限制
    if (this.rateLimiter.tokens.reduce((sum, count) => sum + count, 0) + tokens > this.config.rateLimiting.tokensPerMinute) {
      throw new AIError('Rate limit exceeded: Too many tokens per minute', 'token_limit_exceeded', 429)
    }

    // 记录当前请求
    this.rateLimiter.requests.push(now)
    this.rateLimiter.tokens.push(tokens)
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: AIRequest): string {
    const keyData = {
      prompt: request.prompt,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      topP: request.topP,
      stream: false
    }
    return Buffer.from(JSON.stringify(keyData)).toString('base64')
  }

  /**
   * 检查缓存
   */
  private checkCache(request: AIRequest): AIResponse | null {
    if (!this.config.enableCaching) return null

    const cacheKey = this.generateCacheKey(request)
    const cached = this.requestCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL!) {
      this.logger.debug('Cache hit for request', { cacheKey })
      return this.transformAnthropicResponse(cached.response)
    }

    return null
  }

  /**
   * 存储到缓存
   */
  private storeCache(request: AIRequest, response: any): void {
    if (!this.config.enableCaching) return

    const cacheKey = this.generateCacheKey(request)
    this.requestCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    })

    // 清理过期缓存
    this.cleanupCache()
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > this.config.cacheTTL!) {
        this.requestCache.delete(key)
      }
    }
  }

  /**
   * 计算请求成本
   */
  private calculateCost(usage: TokenUsage, modelId: string): number {
    const model = this.supportedModels.get(modelId)
    if (!model) return 0

    const inputCost = (usage.promptTokens / 1000) * model.inputCost
    const outputCost = (usage.completionTokens / 1000) * model.outputCost
    return inputCost + outputCost
  }

  /**
   * 选择最优模型
   */
  private selectOptimalModel(request: AIRequest): string {
    if (!this.config.costOptimization?.preferCheapestModel) {
      return request.model || 'claude-3-sonnet-20240229'
    }

    const availableModels = Array.from(this.supportedModels.values())
      .filter(model => model.capabilities.includes('chat'))
      .sort((a, b) => {
        const costA = (a.inputCost + a.outputCost) / 2
        const costB = (b.inputCost + b.outputCost) / 2
        return costA - costB
      })

    // 检查上下文长度是否足够
    const promptTokens = this.estimateTokens(request.prompt)
    const suitableModels = availableModels.filter(model =>
      model.contextLength >= promptTokens + (request.maxTokens || 1000)
    )

    return suitableModels[0]?.id || 'claude-3-sonnet-20240229'
  }

  /**
   * 估算token数量
   */
  private estimateTokens(text: string): number {
    // Claude的token估算略有不同，约4个字符 = 1个token
    return Math.ceil(text.length / 4)
  }

  /**
   * 转换Anthropic响应为标准格式
   */
  private transformAnthropicResponse(response: any): AnthropicResponse {
    const content = response.content?.[0]?.text || ''
    const usage = response.usage

    return {
      content,
      usage: {
        promptTokens: usage?.input_tokens || 0,
        completionTokens: usage?.output_tokens || 0,
        totalTokens: usage?.input_tokens + usage?.output_tokens || 0,
        estimatedCost: 0 // 将在调用方法中设置
      },
      model: response.model,
      provider: 'anthropic',
      anthropicModel: response.model,
      stopReason: response.stop_reason,
      stopSequence: response.stop_sequence,
      responseTime: 0, // 将在调用方法中设置
      timestamp: new Date(),
      success: true
    }
  }

  /**
   * 重试机制包装器
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries!,
    delay: number = this.config.retryDelay!
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error

        // 不重试的错误类型
        if (error.status === 400 || error.status === 401 || error.status === 403) {
          throw error
        }

        if (attempt === maxRetries) {
          break
        }

        const waitTime = delay * Math.pow(2, attempt) + Math.random() * 1000
        this.logger.warn(`Request failed, retrying in ${waitTime}ms`, {
          attempt: attempt + 1,
          error: error.message,
          status: error.status
        })

        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    throw lastError!
  }

  /**
   * 生成文本内容（增强版）
   */
  async generateText(request: AIRequest): Promise<AnthropicResponse> {
    const startTime = Date.now()
    const selectedModel = this.selectOptimalModel(request)

    // 检查缓存
    const cachedResponse = this.checkCache({ ...request, model: selectedModel })
    if (cachedResponse) {
      return {
        ...cachedResponse as AnthropicResponse,
        responseTime: Date.now() - startTime,
        cached: true
      }
    }

    // 检查速率限制
    const estimatedTokens = this.estimateTokens(request.prompt) + (request.maxTokens || 1000)
    this.checkRateLimit(estimatedTokens)

    this.logger.info('开始Enhanced Anthropic文本生成', {
      model: selectedModel,
      promptLength: request.prompt.length,
      estimatedTokens,
      temperature: request.temperature
    })

    try {
      const response = await this.withRetry(async () => {
        return await this.makeRequest('/v1/messages', {
          model: selectedModel,
          max_tokens: request.maxTokens || 1000,
          temperature: request.temperature ?? 0.7,
          top_p: request.topP,
          stop_sequences: request.stop,
          messages: [
            {
              role: 'user',
              content: request.prompt
            }
          ],
          stream: false
        })
      })

      const result: AnthropicResponse = this.transformAnthropicResponse(response)
      result.usage.estimatedCost = this.calculateCost(result.usage, selectedModel)
      result.responseTime = Date.now() - startTime

      // 存储到缓存
      this.storeCache({ ...request, model: selectedModel }, response)

      this.logger.info('Enhanced Anthropic文本生成成功', {
        model: result.model,
        tokens: result.usage.totalTokens,
        cost: result.usage.estimatedCost,
        responseTime: result.responseTime,
        stopReason: result.stopReason
      })

      return result

    } catch (error: any) {
      const responseTime = Date.now() - startTime
      this.logger.error('Enhanced Anthropic文本生成失败', {
        error: error.message,
        code: error.code,
        statusCode: error.status,
        responseTime
      })

      throw new AIError(
        `Anthropic API调用失败: ${error.message}`,
        error.code || 'api_error',
        error.status
      )
    }
  }

  /**
   * 流式生成文本（增强版）
   */
  async *generateTextStream(request: AIRequest): AsyncGenerator<AnthropicResponse> {
    const selectedModel = this.selectOptimalModel(request)
    const startTime = Date.now()

    this.logger.info('开始Enhanced Anthropic流式文本生成', {
      model: selectedModel,
      promptLength: request.prompt.length
    })

    try {
      const response = await this.makeRequest('/v1/messages', {
        model: selectedModel,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        stream: true,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ]
      })

      // 注意：这里需要处理实际的流式响应
      // 由于fetch API的流式处理比较复杂，这里提供一个简化版本
      // 在实际实现中，需要处理Server-Sent Events

      const content = response.content?.[0]?.text || ''
      const chunks = content.split(' ').filter(chunk => chunk.length > 0)

      for (const chunk of chunks) {
        yield {
          content: chunk + ' ',
          usage: {
            promptTokens: 0,
            completionTokens: this.estimateTokens(chunk),
            totalTokens: this.estimateTokens(chunk),
            estimatedCost: 0
          },
          model: selectedModel,
          provider: 'anthropic',
          anthropicModel: selectedModel,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          success: true,
          streaming: true
        }

        // 模拟流式延迟
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      this.logger.info('Enhanced Anthropic流式文本生成完成', {
        model: selectedModel,
        totalChunks: chunks.length,
        responseTime: Date.now() - startTime
      })

    } catch (error: any) {
      this.logger.error('Enhanced Anthropic流式文本生成失败', {
        error: error.message,
        code: error.code
      })
      throw new AIError(
        `Anthropic流式API调用失败: ${error.message}`,
        error.code || 'stream_error',
        error.status
      )
    }
  }

  /**
   * 生成嵌入（Anthropic目前不直接支持嵌入，这里提供接口兼容性）
   */
  async generateEmbedding(texts: string | string[], model?: string): Promise<any[]> {
    throw new AIError(
      'Anthropic does not provide embedding API. Please use OpenAI or other providers for embeddings.',
      'not_supported',
      501
    )
  }

  /**
   * 内容审核
   */
  async moderateContent(texts: string | string[]): Promise<any[]> {
    // Anthropic不提供专门的内容审核API
    // 可以通过特殊的prompt来实现基本的内容检查
    const inputTexts = Array.isArray(texts) ? texts : [texts]
    const results: any[] = []

    for (const text of inputTexts) {
      try {
        const moderationPrompt = `Please analyze the following text for any harmful, inappropriate, or policy-violating content. Respond with only "FLAGGED" if the content should be flagged, or "SAFE" if it appears appropriate.\n\nText to analyze: "${text}"`

        const response = await this.generateText({
          prompt: moderationPrompt,
          model: 'claude-3-haiku-20240307',
          maxTokens: 10,
          temperature: 0.1
        })

        const isFlagged = response.content.trim().toUpperCase() === 'FLAGGED'

        results.push({
          flagged: isFlagged,
          text: text,
          confidence: isFlagged ? 0.8 : 0.2,
          categories: isFlagged ? {
            harassment: true,
            hate: true,
            violence: true,
            self_harm: true,
            sexual: true,
            shocking: true
          } : {}
        })

      } catch (error) {
        this.logger.error('Content moderation check failed', { text: text.substring(0, 50), error })
        results.push({
          flagged: false,
          text: text,
          error: error.message
        })
      }
    }

    return results
  }

  /**
   * Token计数
   */
  countTokens(text: string, model?: string): number {
    return this.estimateTokens(text)
  }

  /**
   * 健康检查（增强版）
   */
  async healthCheck(): Promise<any> {
    const startTime = Date.now()

    try {
      // 发送一个简单的测试请求
      const response = await this.makeRequest('/v1/messages', {
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Health check'
          }
        ]
      })

      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        provider: 'anthropic',
        responseTime,
        model: response.model,
        timestamp: new Date(),
        details: {
          baseURL: this.baseURL,
          cachingEnabled: this.config.enableCaching,
          rateLimiting: !!this.config.rateLimiting
        }
      }
    } catch (error: any) {
      return {
        status: 'unhealthy',
        provider: 'anthropic',
        error: error.message,
        code: error.code,
        statusCode: error.status,
        timestamp: new Date()
      }
    }
  }

  /**
   * 获取支持的模型列表
   */
  getSupportedModels(): ClaudeModelInfo[] {
    return Array.from(this.supportedModels.values())
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelId: string): ClaudeModelInfo | undefined {
    return this.supportedModels.get(modelId)
  }

  /**
   * 获取速率限制信息
   */
  getRateLimits(): any {
    if (!this.config.rateLimiting) return null

    const now = Date.now()
    const oneMinuteAgo = now - 60000

    const recentRequests = this.rateLimiter.requests.filter(time => time > oneMinuteAgo)
    const recentTokens = this.rateLimiter.tokens.filter(time => time > oneMinuteAgo)

    return {
      limits: this.config.rateLimiting,
      current: {
        requestsPerMinute: recentRequests.length,
        tokensPerMinute: recentTokens.reduce((sum, count) => sum + count, 0)
      },
      remaining: {
        requests: Math.max(0, this.config.rateLimiting.requestsPerMinute - recentRequests.length),
        tokens: Math.max(0, this.config.rateLimiting.tokensPerMinute - recentTokens.reduce((sum, count) => sum + count, 0))
      }
    }
  }

  /**
   * 获取配置信息
   */
  getConfig(): AnthropicConfig {
    return { ...this.config }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.requestCache.clear()
    this.supportedModels.clear()
    this.rateLimiter.requests = []
    this.rateLimiter.tokens = []
  }
}

export default AnthropicEnhancedProvider