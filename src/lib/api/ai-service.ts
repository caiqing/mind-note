/**
 * AI服务集成API
 * 提供统一的AI服务接口，支持文本生成、对话、分析等功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAIRouter, RoutingRequest, UserPreferences, UserConstraints } from '@/lib/ai/routing/enhanced-ai-router'
import { Logger } from '@/lib/ai/services/logger'

// API响应类型定义
export interface AIServiceRequest {
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
  preferences?: UserPreferences
  constraints?: UserConstraints
  stream?: boolean
  metadata?: Record<string, any>
}

export interface AIServiceResponse {
  success: boolean
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
  metadata: {
    routingDecision: any
    fallbackUsed: boolean
    performanceScore: number
    costEfficiency: number
    qualityScore: number
    cacheHit?: boolean
    concurrentResults?: any
  }
  error?: string
}

export interface AIServiceStreamChunk {
  requestId: string
  type: 'start' | 'chunk' | 'end' | 'error'
  content?: string
  metadata?: any
  error?: string
  done?: boolean
}

export interface BatchAIServiceRequest {
  requests: AIServiceRequest[]
  strategy?: 'sequential' | 'parallel' | 'concurrent'
  maxConcurrency?: number
}

export interface ConversationContext {
  conversationId: string
  userId: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    metadata?: any
  }>
  context?: {
    topic?: string
    preferences?: UserPreferences
    constraints?: UserConstraints
  }
}

export class AIServiceAPI {
  private static instance: AIServiceAPI
  private logger = Logger.getInstance()
  private router: EnhancedAIRouter
  private conversationStore: Map<string, ConversationContext> = new Map()

  private constructor() {
    this.router = EnhancedAIRouter.getInstance()
    this.initializeAPI()
  }

  static getInstance(): AIServiceAPI {
    if (!AIServiceAPI.instance) {
      AIServiceAPI.instance = new AIServiceAPI()
    }
    return AIServiceAPI.instance
  }

  /**
   * 初始化API服务
   */
  private initializeAPI(): void {
    this.logger.info('AI Service API initialized')
  }

  /**
   * 文本生成API
   */
  async generateText(request: AIServiceRequest): Promise<AIServiceResponse> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      this.logger.info('Text generation request received', {
        requestId,
        promptLength: request.prompt.length,
        userId: request.userId,
        preferences: request.preferences
      })

      // 验证请求参数
      this.validateRequest(request)

      // 转换为路由请求
      const routingRequest: RoutingRequest = {
        ...request,
        requestId
      }

      let response
      if (request.stream) {
        // 流式响应处理
        throw new Error('Streaming requests should use generateTextStream method')
      } else {
        // 普通响应
        response = await this.router.routeRequest(routingRequest)
      }

      const apiResponse: AIServiceResponse = {
        success: true,
        requestId: response.requestId,
        provider: response.provider,
        model: response.model,
        content: response.content,
        usage: response.usage,
        responseTime: response.responseTime,
        timestamp: response.timestamp,
        metadata: response.metadata
      }

      this.logger.info('Text generation completed successfully', {
        requestId,
        provider: response.provider,
        responseTime: response.responseTime,
        tokensUsed: response.usage.totalTokens
      })

      return apiResponse

    } catch (error) {
      const responseTime = Date.now() - startTime

      this.logger.error('Text generation failed', {
        requestId,
        error: error.message,
        responseTime
      })

      return {
        success: false,
        requestId,
        provider: 'unknown',
        model: 'unknown',
        content: '',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        responseTime,
        timestamp: new Date(),
        metadata: {
          routingDecision: null,
          fallbackUsed: false,
          performanceScore: 0,
          costEfficiency: 0,
          qualityScore: 0
        },
        error: error.message
      }
    }
  }

  /**
   * 并发文本生成API
   */
  async generateTextConcurrent(request: AIServiceRequest, maxConcurrency: number = 2): Promise<AIServiceResponse> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      this.logger.info('Concurrent text generation request received', {
        requestId,
        maxConcurrency,
        promptLength: request.prompt.length
      })

      this.validateRequest(request)

      const routingRequest: RoutingRequest = {
        ...request,
        requestId
      }

      const response = await this.router.routeConcurrentRequest(routingRequest, maxConcurrency)

      const apiResponse: AIServiceResponse = {
        success: true,
        requestId: response.requestId,
        provider: response.provider,
        model: response.model,
        content: response.content,
        usage: response.usage,
        responseTime: response.responseTime,
        timestamp: response.timestamp,
        metadata: {
          ...response.metadata,
          concurrentProcessing: true
        }
      }

      this.logger.info('Concurrent text generation completed', {
        requestId,
        provider: response.provider,
        responseTime: response.responseTime,
        concurrentResults: response.metadata.concurrentResults
      })

      return apiResponse

    } catch (error) {
      const responseTime = Date.now() - startTime

      this.logger.error('Concurrent text generation failed', {
        requestId,
        error: error.message,
        responseTime
      })

      return {
        success: false,
        requestId,
        provider: 'unknown',
        model: 'unknown',
        content: '',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        responseTime,
        timestamp: new Date(),
        metadata: {
          routingDecision: null,
          fallbackUsed: false,
          performanceScore: 0,
          costEfficiency: 0,
          qualityScore: 0,
          concurrentProcessing: true
        },
        error: error.message
      }
    }
  }

  /**
   * 流式文本生成API
   */
  async *generateTextStream(request: AIServiceRequest): AsyncGenerator<AIServiceStreamChunk> {
    const requestId = this.generateRequestId()

    try {
      this.logger.info('Stream text generation request received', {
        requestId,
        promptLength: request.prompt.length
      })

      this.validateRequest(request)

      // 发送开始标记
      yield {
        requestId,
        type: 'start',
        metadata: {
          provider: 'pending',
          model: 'pending',
          timestamp: new Date()
        }
      }

      // 这里需要实现流式处理逻辑
      // 由于当前路由器不支持流式，我们模拟流式响应
      const response = await this.generateText({ ...request, stream: false })

      // 模拟分块发送内容
      const chunks = this.splitIntoChunks(response.content, 50)

      for (let i = 0; i < chunks.length; i++) {
        yield {
          requestId,
          type: 'chunk',
          content: chunks[i],
          metadata: {
            chunkIndex: i,
            totalChunks: chunks.length,
            provider: response.provider,
            model: response.model
          }
        }

        // 模拟流式延迟
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // 发送结束标记
      yield {
        requestId,
        type: 'end',
        content: response.content,
        metadata: {
          provider: response.provider,
          model: response.model,
          usage: response.usage,
          responseTime: response.responseTime,
          timestamp: new Date(),
          done: true
        },
        done: true
      }

      this.logger.info('Stream text generation completed', {
        requestId,
        totalChunks: chunks.length
      })

    } catch (error) {
      this.logger.error('Stream text generation failed', {
        requestId,
        error: error.message
      })

      yield {
        requestId,
        type: 'error',
        error: error.message,
        metadata: {
          timestamp: new Date(),
          done: true
        },
        done: true
      }
    }
  }

  /**
   * 批量文本生成API
   */
  async generateTextBatch(batchRequest: BatchAIServiceRequest): Promise<AIServiceResponse[]> {
    const startTime = Date.now()
    const batchId = this.generateRequestId()

    try {
      this.logger.info('Batch text generation request received', {
        batchId,
        requestCount: batchRequest.requests.length,
        strategy: batchRequest.strategy || 'parallel'
      })

      if (batchRequest.requests.length === 0) {
        throw new Error('Batch request cannot be empty')
      }

      let responses: AIServiceResponse[]

      switch (batchRequest.strategy) {
        case 'sequential':
          responses = await this.processSequential(batchRequest.requests)
          break
        case 'parallel':
          responses = await this.processParallel(batchRequest.requests)
          break
        case 'concurrent':
          responses = await this.processConcurrent(
            batchRequest.requests,
            batchRequest.maxConcurrency || 3
          )
          break
        default:
          responses = await this.processParallel(batchRequest.requests)
      }

      const totalTime = Date.now() - startTime
      const successCount = responses.filter(r => r.success).length

      this.logger.info('Batch text generation completed', {
        batchId,
        totalRequests: batchRequest.requests.length,
        successCount,
        totalTime,
        successRate: (successCount / batchRequest.requests.length * 100).toFixed(1) + '%'
      })

      return responses

    } catch (error) {
      this.logger.error('Batch text generation failed', {
        batchId,
        error: error.message
      })

      // 返回全部失败的响应
      return batchRequest.requests.map((_, index) => ({
        success: false,
        requestId: `${batchId}_${index}`,
        provider: 'unknown',
        model: 'unknown',
        content: '',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        responseTime: 0,
        timestamp: new Date(),
        metadata: {
          routingDecision: null,
          fallbackUsed: false,
          performanceScore: 0,
          costEfficiency: 0,
          qualityScore: 0
        },
        error: error.message
      }))
    }
  }

  /**
   * 对话API
   */
  async continueConversation(
    conversationId: string,
    userMessage: string,
    userId: string,
    options?: {
      preferences?: UserPreferences
      constraints?: UserConstraints
    }
  ): Promise<AIServiceResponse> {
    const requestId = this.generateRequestId()

    try {
      this.logger.info('Conversation request received', {
        requestId,
        conversationId,
        userId,
        messageLength: userMessage.length
      })

      // 获取或创建对话上下文
      let conversation = this.conversationStore.get(conversationId)

      if (!conversation) {
        conversation = {
          conversationId,
          userId,
          messages: [],
          context: {
            topic: 'general',
            preferences: options?.preferences,
            constraints: options?.constraints
          }
        }
        this.conversationStore.set(conversationId, conversation)
      }

      // 添加用户消息
      conversation.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      })

      // 构建上下文提示
      const contextMessages = conversation.messages.slice(-10) // 保留最近10条消息
      const contextPrompt = this.buildContextPrompt(contextMessages)

      // 生成AI响应
      const response = await this.generateText({
        prompt: contextPrompt,
        userId,
        preferences: options?.preferences || conversation.context?.preferences,
        constraints: options?.constraints || conversation.context?.constraints
      })

      // 添加AI响应到对话历史
      conversation.messages.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      })

      // 更新对话上下文
      this.conversationStore.set(conversationId, conversation)

      this.logger.info('Conversation response generated', {
        requestId,
        conversationId,
        messageCount: conversation.messages.length
      })

      return response

    } catch (error) {
      this.logger.error('Conversation request failed', {
        requestId,
        conversationId,
        error: error.message
      })

      return {
        success: false,
        requestId,
        provider: 'unknown',
        model: 'unknown',
        content: '',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        responseTime: 0,
        timestamp: new Date(),
        metadata: {
          routingDecision: null,
          fallbackUsed: false,
          performanceScore: 0,
          costEfficiency: 0,
          qualityScore: 0
        },
        error: error.message
      }
    }
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(conversationId: string, userId: string): ConversationContext | null {
    const conversation = this.conversationStore.get(conversationId)

    if (!conversation || conversation.userId !== userId) {
      return null
    }

    return conversation
  }

  /**
   * 清除对话历史
   */
  clearConversation(conversationId: string, userId: string): boolean {
    const conversation = this.conversationStore.get(conversationId)

    if (!conversation || conversation.userId !== userId) {
      return false
    }

    this.conversationStore.delete(conversationId)
    this.logger.info('Conversation cleared', { conversationId, userId })

    return true
  }

  /**
   * 获取API统计信息
   */
  getAPIStats(): any {
    const routingStats = this.router.getRoutingStats()
    const conversationCount = this.conversationStore.size
    const totalMessages = Array.from(this.conversationStore.values())
      .reduce((total, conv) => total + conv.messages.length, 0)

    return {
      routing: routingStats,
      conversations: {
        totalConversations: conversationCount,
        totalMessages,
        averageMessagesPerConversation: conversationCount > 0 ? totalMessages / conversationCount : 0
      },
      api: {
        supportedMethods: [
          'generateText',
          'generateTextConcurrent',
          'generateTextStream',
          'generateTextBatch',
          'continueConversation'
        ]
      }
    }
  }

  /**
   * 验证请求参数
   */
  private validateRequest(request: AIServiceRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty')
    }

    if (request.prompt.length > 100000) {
      throw new Error('Prompt too long (max 100,000 characters)')
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2')
    }

    if (request.maxTokens !== undefined && (request.maxTokens < 1 || request.maxTokens > 32000)) {
      throw new Error('Max tokens must be between 1 and 32000')
    }

    if (request.topP !== undefined && (request.topP < 0 || request.topP > 1)) {
      throw new Error('Top P must be between 0 and 1')
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 将文本分割为块
   */
  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * 构建上下文提示
   */
  private buildContextPrompt(messages: Array<{role: string, content: string, timestamp: Date}>): string {
    let prompt = '以下是对话历史，请基于上下文回复最新的用户消息：\n\n'

    for (const message of messages) {
      const roleLabel = message.role === 'user' ? '用户' : '助手'
      prompt += `${roleLabel}: ${message.content}\n`
    }

    prompt += '\n助手: '

    return prompt
  }

  /**
   * 顺序处理批量请求
   */
  private async processSequential(requests: AIServiceRequest[]): Promise<AIServiceResponse[]> {
    const responses: AIServiceResponse[] = []

    for (const request of requests) {
      const response = await this.generateText(request)
      responses.push(response)
    }

    return responses
  }

  /**
   * 并行处理批量请求
   */
  private async processParallel(requests: AIServiceRequest[]): Promise<AIServiceResponse[]> {
    const promises = requests.map(request => this.generateText(request))
    return Promise.all(promises)
  }

  /**
   * 并发处理批量请求
   */
  private async processConcurrent(
    requests: AIServiceRequest[],
    maxConcurrency: number
  ): Promise<AIServiceResponse[]> {
    const responses: AIServiceResponse[] = []

    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency)
      const batchPromises = batch.map(request =>
        this.generateTextConcurrent(request, Math.min(maxConcurrency, batch.length))
      )
      const batchResponses = await Promise.all(batchPromises)
      responses.push(...batchResponses)
    }

    return responses
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.conversationStore.clear()
    this.router.destroy()
    this.logger.info('AI Service API destroyed')
  }
}

export default AIServiceAPI