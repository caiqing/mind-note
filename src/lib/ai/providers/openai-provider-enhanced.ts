// Enhanced OpenAI AI服务提供商实现
// 增强版OpenAI API集成，包含高级功能和优化

import OpenAI from 'openai'
import { BaseAIProvider, AIRequest, AIResponse, AIError } from './base-provider'
import { Logger } from '@/lib/ai/services/logger'

export interface OpenAIEnhancedConfig {
  apiKey: string
  organizationId?: string
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

export interface OpenAIEnhancedResponse extends AIResponse {
  openaiModel: string
  finishReason?: string
  logprobs?: any
  serviceTier?: string
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost: number
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  contextLength: number
  inputCost: number // per 1K tokens
  outputCost: number // per 1K tokens
  capabilities: string[]
  speed: 'fast' | 'medium' | 'slow'
  quality: 'basic' | 'good' | 'excellent'
}

export class OpenAIEnhancedProvider extends BaseAIProvider {
  private client: OpenAI
  private logger = Logger.getInstance()
  private config: OpenAIEnhancedConfig
  private rateLimiter: {
    requests: number[]
    tokens: number[]
  }
  private requestCache: Map<string, { response: any; timestamp: number }> = new Map()
  private supportedModels: Map<string, ModelInfo> = new Map()

  constructor(config: OpenAIEnhancedConfig) {
    super({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
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
        requestsPerMinute: 3500,
        tokensPerMinute: 90000
      },
      costOptimization: {
        preferCheapestModel: false,
        maxCostPerRequest: 1.0
      },
      ...config
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      organization: this.config.organizationId,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries
    })

    this.rateLimiter = {
      requests: [],
      tokens: []
    }

    this.initializeModels()
    this.logger.info('Enhanced OpenAI Provider initialized', {
      organization: this.config.organizationId,
      baseURL: this.config.baseURL,
      caching: this.config.enableCaching,
      rateLimiting: !!this.config.rateLimiting
    })
  }

  /**
   * 初始化支持的模型信息
   */
  private initializeModels(): void {
    const models: ModelInfo[] = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        contextLength: 8192,
        inputCost: 0.03,
        outputCost: 0.06,
        capabilities: ['chat', 'analysis', 'reasoning'],
        speed: 'slow',
        quality: 'excellent'
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        contextLength: 128000,
        inputCost: 0.01,
        outputCost: 0.03,
        capabilities: ['chat', 'analysis', 'reasoning', 'vision'],
        speed: 'medium',
        quality: 'excellent'
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        contextLength: 16385,
        inputCost: 0.001,
        outputCost: 0.002,
        capabilities: ['chat', 'analysis'],
        speed: 'fast',
        quality: 'good'
      },
      {
        id: 'gpt-3.5-turbo-16k',
        name: 'GPT-3.5 Turbo 16K',
        provider: 'openai',
        contextLength: 16385,
        inputCost: 0.003,
        outputCost: 0.004,
        capabilities: ['chat', 'analysis'],
        speed: 'fast',
        quality: 'good'
      },
      {
        id: 'text-embedding-ada-002',
        name: 'Text Embedding Ada',
        provider: 'openai',
        contextLength: 8192,
        inputCost: 0.0001,
        outputCost: 0,
        capabilities: ['embedding'],
        speed: 'fast',
        quality: 'basic'
      },
      {
        id: 'text-davinci-003',
        name: 'Text Davinci',
        provider: 'openai',
        contextLength: 4097,
        inputCost: 0.02,
        outputCost: 0.02,
        capabilities: ['completion'],
        speed: 'medium',
        quality: 'good'
      }
    ]

    models.forEach(model => {
      this.supportedModels.set(model.id, model)
    })
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
      return this.transformOpenAIResponse(cached.response)
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
      return request.model || 'gpt-3.5-turbo'
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

    return suitableModels[0]?.id || 'gpt-3.5-turbo'
  }

  /**
   * 估算token数量
   */
  private estimateTokens(text: string): number {
    // 简单的token估算：约4个字符 = 1个token
    return Math.ceil(text.length / 4)
  }

  /**
   * 转换OpenAI响应为标准格式
   */
  private transformOpenAIResponse(response: any): OpenAIEnhancedResponse {
    const choice = response.choices[0]
    const usage = response.usage

    return {
      content: choice.message?.content || choice.text || '',
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0
      },
      model: response.model,
      provider: 'openai',
      openaiModel: response.model,
      finishReason: choice.finish_reason,
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
  async generateText(request: AIRequest): Promise<OpenAIEnhancedResponse> {
    const startTime = Date.now()
    const selectedModel = this.selectOptimalModel(request)

    // 检查缓存
    const cachedResponse = this.checkCache({ ...request, model: selectedModel })
    if (cachedResponse) {
      return {
        ...cachedResponse as OpenAIEnhancedResponse,
        responseTime: Date.now() - startTime,
        cached: true
      }
    }

    // 检查速率限制
    const estimatedTokens = this.estimateTokens(request.prompt) + (request.maxTokens || 1000)
    this.checkRateLimit(estimatedTokens)

    this.logger.info('开始Enhanced OpenAI文本生成', {
      model: selectedModel,
      promptLength: request.prompt.length,
      estimatedTokens,
      temperature: request.temperature
    })

    try {
      const response = await this.withRetry(async () => {
        return await this.client.chat.completions.create({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: request.prompt
            }
          ],
          max_tokens: request.maxTokens || 1000,
          temperature: request.temperature ?? 0.7,
          top_p: request.topP,
          frequency_penalty: request.frequencyPenalty,
          presence_penalty: request.presencePenalty,
          stop: request.stop,
          stream: false,
          logprobs: request.includeLogprobs ? 1 : undefined
        })
      })

      const choice = response.choices[0]
      if (!choice?.message?.content) {
        throw new AIError('OpenAI返回空响应', 'empty_response')
      }

      const result: OpenAIEnhancedResponse = {
        content: choice.message.content,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          estimatedCost: this.calculateCost({
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
            estimatedCost: 0
          }, selectedModel)
        },
        model: response.model,
        provider: 'openai',
        openaiModel: response.model,
        finishReason: choice.finish_reason,
        logprobs: choice.logprobs,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        success: true
      }

      // 存储到缓存
      this.storeCache({ ...request, model: selectedModel }, response)

      this.logger.info('Enhanced OpenAI文本生成成功', {
        model: result.model,
        tokens: result.usage.totalTokens,
        cost: result.usage.estimatedCost,
        responseTime: result.responseTime,
        finishReason: result.finishReason
      })

      return result

    } catch (error: any) {
      const responseTime = Date.now() - startTime
      this.logger.error('Enhanced OpenAI文本生成失败', {
        error: error.message,
        code: error.code,
        statusCode: error.status,
        responseTime
      })

      if (error instanceof OpenAI.APIError) {
        throw new AIError(
          error.message,
          error.code,
          error.status,
          error.response
        )
      }

      throw new AIError(
        `OpenAI API调用失败: ${error.message}`,
        'api_error',
        error.status
      )
    }
  }

  /**
   * 流式生成文本（增强版）
   */
  async *generateTextStream(request: AIRequest): AsyncGenerator<OpenAIEnhancedResponse> {
    const selectedModel = this.selectOptimalModel(request)
    const startTime = Date.now()

    this.logger.info('开始Enhanced OpenAI流式文本生成', {
      model: selectedModel,
      promptLength: request.prompt.length
    })

    try {
      const stream = await this.client.chat.completions.create({
        model: selectedModel,
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        stream: true
      })

      let fullContent = ''
      let totalTokens = 0

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          fullContent += content
          totalTokens = this.estimateTokens(fullContent)

          yield {
            content,
            usage: {
              promptTokens: 0, // 流式响应中可能没有确切的prompt token数
              completionTokens: totalTokens,
              totalTokens,
              estimatedCost: 0 // 流式响应中难以准确计算成本
            },
            model: selectedModel,
            provider: 'openai',
            openaiModel: selectedModel,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
            success: true,
            streaming: true
          }
        }
      }

      this.logger.info('Enhanced OpenAI流式文本生成完成', {
        model: selectedModel,
        totalTokens,
        responseTime: Date.now() - startTime
      })

    } catch (error: any) {
      this.logger.error('Enhanced OpenAI流式文本生成失败', {
        error: error.message,
        code: error.code
      })
      throw new AIError(
        `OpenAI流式API调用失败: ${error.message}`,
        'stream_error',
        error.status
      )
    }
  }

  /**
   * 生成嵌入（增强版）
   */
  async generateEmbedding(texts: string | string[], model?: string): Promise<any[]> {
    const startTime = Date.now()
    const inputTexts = Array.isArray(texts) ? texts : [texts]
    const selectedModel = model || 'text-embedding-ada-002'

    // 检查速率限制
    const totalTokens = inputTexts.reduce((sum, text) => sum + this.estimateTokens(text), 0)
    this.checkRateLimit(totalTokens)

    this.logger.info('开始Enhanced OpenAI嵌入生成', {
      model: selectedModel,
      textCount: inputTexts.length,
      totalTokens
    })

    try {
      const response = await this.client.embeddings.create({
        model: selectedModel,
        input: inputTexts
      })

      const embeddings = response.data.map(item => ({
        values: item.embedding,
        text: inputTexts[item.index],
        model: selectedModel,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: 0,
          totalTokens: response.usage?.total_tokens || 0,
          estimatedCost: this.calculateCost({
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: 0,
            totalTokens: response.usage?.total_tokens || 0,
            estimatedCost: 0
          }, selectedModel)
        }
      }))

      const processingTime = Date.now() - startTime
      this.logger.info('Enhanced OpenAI嵌入生成成功', {
        model: response.model,
        embeddingCount: embeddings.length,
        dimensions: embeddings[0]?.values?.length,
        processingTime
      })

      return embeddings

    } catch (error: any) {
      const processingTime = Date.now() - startTime
      this.logger.error('Enhanced OpenAI嵌入生成失败', {
        error: error.message,
        processingTime
      })

      if (error instanceof OpenAI.APIError) {
        throw new AIError(
          `OpenAI嵌入生成失败: ${error.message}`,
          error.code,
          error.status
        )
      }

      throw new AIError(
        `OpenAI嵌入生成失败: ${error.message}`,
        'embedding_error'
      )
    }
  }

  /**
   * 内容审核
   */
  async moderateContent(texts: string | string[]): Promise<any[]> {
    const inputTexts = Array.isArray(texts) ? texts : [texts]
    const startTime = Date.now()

    this.logger.info('开始OpenAI内容审核', {
      textCount: inputTexts.length
    })

    try {
      const response = await this.client.moderations.create({
        input: inputTexts
      })

      const results = response.results.map((result, index) => ({
        flagged: result.flagged,
        categories: result.categories,
        scores: result.category_scores,
        text: inputTexts[index]
      }))

      const processingTime = Date.now() - startTime
      this.logger.info('OpenAI内容审核完成', {
        textCount: results.length,
        flaggedCount: results.filter(r => r.flagged).length,
        processingTime
      })

      return results

    } catch (error: any) {
      this.logger.error('OpenAI内容审核失败', {
        error: error.message
      })

      if (error instanceof OpenAI.APIError) {
        throw new AIError(
          `OpenAI内容审核失败: ${error.message}`,
          error.code,
          error.status
        )
      }

      throw new AIError(
        `OpenAI内容审核失败: ${error.message}`,
        'moderation_error'
      )
    }
  }

  /**
   * Token计数
   */
  countTokens(text: string, model?: string): number {
    // 使用tiktoken进行精确计数，这里使用简化估算
    return this.estimateTokens(text)
  }

  /**
   * 健康检查（增强版）
   */
  async healthCheck(): Promise<any> {
    const startTime = Date.now()

    try {
      const response = await this.client.models.list()
      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        provider: 'openai',
        responseTime,
        availableModels: response.data.length,
        timestamp: new Date(),
        details: {
          organization: this.config.organizationId,
          baseURL: this.config.baseURL,
          cachingEnabled: this.config.enableCaching,
          rateLimiting: !!this.config.rateLimiting
        }
      }
    } catch (error: any) {
      return {
        status: 'unhealthy',
        provider: 'openai',
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
  getSupportedModels(): ModelInfo[] {
    return Array.from(this.supportedModels.values())
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelId: string): ModelInfo | undefined {
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
  getConfig(): OpenAIEnhancedConfig {
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

export default OpenAIEnhancedProvider