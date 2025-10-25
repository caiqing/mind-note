/**
 * AI服务API客户端
 * 为前端提供统一的AI服务调用接口
 */

import { AIServiceRequest, AIServiceResponse, BatchAIServiceRequest } from './ai-service'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: any
}

export interface ConversationHistory {
  conversationId: string
  userId: string
  messages: ChatMessage[]
  context?: {
    topic?: string
    preferences?: any
    constraints?: any
  }
}

export class AIClient {
  private static instance: AIClient
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  private constructor(config?: { baseUrl?: string }) {
    this.baseUrl = config?.baseUrl || '/api/ai'
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    }
  }

  static getInstance(config?: { baseUrl?: string }): AIClient {
    if (!AIClient.instance) {
      AIClient.instance = new AIClient(config)
    }
    return AIClient.instance
  }

  /**
   * 生成文本
   */
  async generateText(request: Partial<AIServiceRequest>): Promise<AIServiceResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        ...request,
        userId: request.userId || 'anonymous'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to generate text')
    }

    return response.json()
  }

  /**
   * 并发生成文本
   */
  async generateTextConcurrent(
    request: Partial<AIServiceRequest>,
    maxConcurrency: number = 2
  ): Promise<AIServiceResponse> {
    const response = await fetch(`${this.baseUrl}/concurrent`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        ...request,
        userId: request.userId || 'anonymous',
        maxConcurrency
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to generate text concurrently')
    }

    return response.json()
  }

  /**
   * 批量生成文本
   */
  async generateTextBatch(batchRequest: BatchAIServiceRequest): Promise<{
    batchId: string
    totalCount: number
    successCount: number
    failureCount: number
    totalTime: number
    averageResponseTime: number
    responses: AIServiceResponse[]
  }> {
    const response = await fetch(`${this.baseUrl}/batch`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(batchRequest)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to generate text batch')
    }

    return response.json()
  }

  /**
   * 流式生成文本
   */
  async *generateTextStream(request: Partial<AIServiceRequest>): AsyncGenerator<any> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        ...request,
        userId: request.userId || 'anonymous',
        stream: true
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to start stream')
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()

            if (data === '[DONE]') {
              return
            }

            try {
              const chunk = JSON.parse(data)
              yield chunk
            } catch (parseError) {
              console.warn('Failed to parse stream chunk:', data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 继续对话
   */
  async continueChat(
    conversationId: string,
    message: string,
    userId?: string,
    options?: {
      preferences?: any
      constraints?: any
    }
  ): Promise<AIServiceResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        conversationId,
        message,
        userId: userId || 'anonymous',
        preferences: options?.preferences,
        constraints: options?.constraints
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to continue chat')
    }

    return response.json()
  }

  /**
   * 获取对话历史
   */
  async getChatHistory(
    conversationId: string,
    userId?: string
  ): Promise<ConversationHistory> {
    const params = new URLSearchParams({
      conversationId,
      userId: userId || 'anonymous'
    })

    const response = await fetch(`${this.baseUrl}/chat?${params}`, {
      method: 'GET',
      headers: this.defaultHeaders
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get chat history')
    }

    return response.json()
  }

  /**
   * 清除对话历史
   */
  async clearChat(
    conversationId: string,
    userId?: string
  ): Promise<{ success: boolean }> {
    const params = new URLSearchParams({
      conversationId,
      userId: userId || 'anonymous'
    })

    const response = await fetch(`${this.baseUrl}/chat?${params}`, {
      method: 'DELETE',
      headers: this.defaultHeaders
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to clear chat')
    }

    return response.json()
  }

  /**
   * 获取API统计信息
   */
  async getStats(options?: {
    includeRouting?: boolean
    includeConversations?: boolean
  }): Promise<{
    success: boolean
    timestamp: Date
    stats: any
  }> {
    const params = new URLSearchParams({
      includeRouting: options?.includeRouting ? 'true' : 'false',
      includeConversations: options?.includeConversations ? 'true' : 'false'
    })

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      method: 'GET',
      headers: this.defaultHeaders
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get stats')
    }

    return response.json()
  }

  /**
   * 便捷方法：快速生成文本
   */
  async quickGenerate(prompt: string, options?: {
    temperature?: number
    maxTokens?: number
    quality?: 'basic' | 'good' | 'excellent'
    speed?: 'fast' | 'medium' | 'slow'
    cost?: 'low' | 'medium' | 'high'
  }): Promise<string> {
    const preferences: any = {}

    if (options?.quality) {
      preferences.quality = options.quality
    }
    if (options?.speed) {
      preferences.speed = options.speed
    }
    if (options?.cost) {
      preferences.cost = options.cost
    }

    const response = await this.generateText({
      prompt,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      preferences
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate text')
    }

    return response.content
  }

  /**
   * 便捷方法：快速对话
   */
  async quickChat(
    conversationId: string,
    message: string,
    options?: {
      userId?: string
      quality?: 'basic' | 'good' | 'excellent'
      speed?: 'fast' | 'medium' | 'slow'
    }
  ): Promise<string> {
    const preferences: any = {}

    if (options?.quality) {
      preferences.quality = options.quality
    }
    if (options?.speed) {
      preferences.speed = options.speed
    }

    const response = await this.continueChat(
      conversationId,
      message,
      options?.userId,
      { preferences }
    )

    if (!response.success) {
      throw new Error(response.error || 'Failed to continue chat')
    }

    return response.content
  }

  /**
   * 便捷方法：分析文本
   */
  async analyzeText(
    text: string,
    analysisType: 'summary' | 'sentiment' | 'keywords' | 'topics',
    options?: {
      language?: string
      maxLength?: number
    }
  ): Promise<string> {
    const prompts = {
      summary: `请为以下文本生成简洁的摘要：\n\n${text}`,
      sentiment: `请分析以下文本的情感倾向（积极/消极/中性）并说明理由：\n\n${text}`,
      keywords: `请从以下文本中提取关键词：\n\n${text}`,
      topics: `请识别以下文本的主要话题：\n\n${text}`
    }

    const prompt = prompts[analysisType] || prompts.summary

    if (options?.maxLength) {
      prompt += `\n\n请确保回复不超过${options.maxLength}字。`
    }

    if (options?.language) {
      prompt += `\n\n请用${options.language}回复。`
    }

    return this.quickGenerate(prompt, {
      quality: 'good',
      maxTokens: options?.maxLength ? Math.min(options.maxLength * 2, 1000) : 500
    })
  }

  /**
   * 便捷方法：翻译文本
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    const prompt = sourceLanguage
      ? `请将以下${sourceLanguage}文本翻译为${targetLanguage}：\n\n${text}`
      : `请将以下文本翻译为${targetLanguage}：\n\n${text}`

    return this.quickGenerate(prompt, {
      quality: 'good',
      maxTokens: Math.min(text.length * 2, 2000)
    })
  }

  /**
   * 便捷方法：重写文本
   */
  async rewriteText(
    text: string,
    style: 'formal' | 'casual' | 'professional' | 'creative' | 'simple',
    options?: {
      length?: 'shorter' | 'same' | 'longer'
      targetAudience?: string
    }
  ): Promise<string> {
    const stylePrompts = {
      formal: '请将以下文本改写为正式的语调：',
      casual: '请将以下文本改写为轻松随意的语调：',
      professional: '请将以下文本改写为专业的商务语调：',
      creative: '请将以下文本改写为更有创意的表达方式：',
      simple: '请将以下文本改写为简单易懂的表达：'
    }

    let prompt = stylePrompts[style] || stylePrompts.formal
    prompt += `\n\n${text}`

    if (options?.length) {
      const lengthPrompts = {
        shorter: '请让文本更简短。',
        same: '请保持文本长度大致相同。',
        longer: '请让文本更详细一些。'
      }
      prompt += `\n\n${lengthPrompts[options.length]}`
    }

    if (options?.targetAudience) {
      prompt += `\n\n目标受众：${options.targetAudience}`
    }

    return this.quickGenerate(prompt, {
      quality: 'good',
      maxTokens: Math.min(text.length * 2, 1500)
    })
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    timestamp: Date
    responseTime?: number
    error?: string
  }> {
    const startTime = Date.now()

    try {
      await this.getStats()
      return {
        status: 'healthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  /**
   * 设置认证头
   */
  setAuthHeader(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  /**
   * 清除认证头
   */
  clearAuthHeader(): void {
    delete this.defaultHeaders['Authorization']
  }

  /**
   * 设置自定义头
   */
  setCustomHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value
  }

  /**
   * 移除自定义头
   */
  removeCustomHeader(key: string): void {
    delete this.defaultHeaders[key]
  }
}

export default AIClient