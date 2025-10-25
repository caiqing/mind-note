/**
 * OpenAI API集成
 * 提供OpenAI GPT模型的完整集成支持
 */

import { AIServiceConfig, AIRequest, AIResponse } from '../../routing/ai-service-router'

export interface OpenAIModel {
  id: string
  name: string
  maxTokens: number
  costPerToken: number
  capabilities: string[]
}

export interface OpenAIConfig extends AIServiceConfig {
  apiKey: string
  organizationId?: string
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export class OpenAIProvider {
  private config: OpenAIConfig
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(config: OpenAIConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    }

    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1'
    this.defaultHeaders = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...(config.organizationId && {
        'OpenAI-Organization': config.organizationId
      })
    }
  }

  async getModels(): Promise<OpenAIModel[]> {
    const response = await this.makeRequest('GET', '/models')

    return response.data
      .filter((model: any) => model.id.startsWith('gpt'))
      .map((model: any) => ({
        id: model.id,
        name: model.id.replace(/[:/]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        maxTokens: model.max_context_length || 4096,
        costPerToken: this.getCostPerToken(model.id),
        capabilities: this.getModelCapabilities(model.id)
      }))
      .sort((a, b) => a.costPerToken - b.costPerToken)
  }

  async generateText(request: AIRequest): Promise<AIResponse> {
    const requestBody = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(request)
        },
        {
          role: 'user',
          content: request.prompt
        },
        ...(request.context && request.context.length > 0 ? [
          {
            role: 'assistant',
            content: request.context.join('\n\n')
          }
        ] : [])
      ],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 2000,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: false
    }

    try {
      const response = await this.makeRequest('POST', '/chat/completions', requestBody)
      return this.formatResponse(response, request)
    } catch (error) {
      throw this.handleError(error, request)
    }
  }

  async generateEmbedding(texts: string[]): Promise<number[][]> {
    const requestBody = {
      model: 'text-embedding-ada-002',
      input: texts,
      encoding_format: 'float'
    }

    try {
      const response = await this.makeRequest('POST', '/embeddings', requestBody)

      return response.data.map((item: any) => item.embedding)
    } catch (error) {
      throw this.handleError(error, { prompt: texts.join(' ') } as AIRequest)
    }
  }

  async moderateContent(content: string): Promise<{
    flagged: boolean
    categories: Record<string, boolean>
    categoryScores: Record<string, number>
  }> {
    const requestBody = {
      input: content,
      model: 'text-moderation-latest'
    }

    try {
      const response = await this.makeRequest('POST', '/moderations', requestBody)
      const result = response.data.results[0]

      return {
        flagged: result.flagged,
        categories: result.categories,
        categoryScores: result.category_scores
      }
    } catch (error) {
      throw this.handleError(error, { prompt: content } as AIRequest)
    }
  }

  async countTokens(text: string, model?: string): Promise<{
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }> {
    const requestBody = {
      model: model || this.config.model,
      prompt: text
    }

    try {
      const response = await this.makeRequest('POST', '/chat/completions', requestBody)
      return response.data.usage
    } catch (error) {
      throw this.handleError(error, { prompt: text } as AIRequest)
    }
  }

  private async makeRequest(method: string, endpoint: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const options: RequestInit = {
      method,
      headers: this.defaultHeaders,
      signal: AbortSignal.timeout(this.config.timeout!)
    }

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
    }

    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        const response = await fetch(url, options)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || errorData.error}`)
        }

        return await response.json()
      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          throw error
        }

        // 等待重试延迟
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay!))
      }
    }

    throw new Error('Request failed after all retry attempts')
  }

  private formatResponse(response: any, request: AIRequest): AIResponse {
    const choice = response.choices?.[0]
    if (!choice) {
      throw new Error('No response choices available')
    }

    const content = choice.message?.content || ''
    const usage = response.usage || {}

    return {
      requestId: request.requestId,
      provider: 'openai',
      model: this.config.model,
      content,
      tokens: {
        input: usage.prompt_tokens || 0,
        output: usage.completion_tokens || 0,
        total: usage.total_tokens || 0
      },
      responseTime: 0, // 由调用者计算
      cost: (usage.total_tokens || 0) * this.config.costPerToken,
      success: true,
      metadata: {
        finishReason: choice.finish_reason,
        logprobs: choice.logprobs ? this.extractTopLogprobs(choice.logprobs) : undefined
      }
    }
  }

  private extractTopLogprobs(logprobs: any[]): Record<string, number> {
    const topLogprobs: Record<string, number> = {}

    if (logprobs && logprobs.length > 0) {
      const topLogprob = logprobs[0]
      if (topLogprob) {
        topLogprobs.top_token = topLogprob.token
        topLogprobs.top_probability = topLogprob.logprob
      }
    }

    return topLogprobs
  }

  private handleError(error: any, request: AIRequest): Error {
    if (error.name === 'AbortError') {
      return new Error(`OpenAI request timeout after ${this.config.timeout}ms`)
    }

    if (error.status === 401) {
      return new Error('OpenAI API key is invalid or expired')
    }

    if (error.status === 429) {
      return new Error('OpenAI rate limit exceeded. Please try again later.')
    }

    if (error.status === 404) {
      return new Error(`OpenAI model '${this.config.model}' not found`)
    }

    if (error.status === 400) {
      return new Error(`OpenAI API bad request: ${error.message}`)
    }

    return new Error(`OpenAI API error: ${error.message}`)
  }

  private getSystemPrompt(request: AIRequest): string {
    const basePrompt = 'You are a helpful AI assistant for MindNote, an intelligent note-taking application. Your responses should be clear, concise, and helpful.'

    // 根据上下文调整系统提示
    if (request.context && request.context.length > 0) {
      return `${basePrompt}\n\nContext:\n${request.context.join('\n\n')}`
    }

    return basePrompt
  }

  private getCostPerToken(modelId: string): number {
    const costMap: Record<string, number> = {
      'gpt-4': 0.00003,
      'gpt-4-32k': 0.00006,
      'gpt-4-turbo': 0.00001,
      'gpt-4-turbo-preview': 0.00001,
      'gpt-3.5-turbo': 0.000002,
      'gpt-3.5-turbo-16k': 0.000002,
      'gpt-3.5-turbo-instruct': 0.000002,
      'text-davinci-003': 0.00002,
      'text-curie-001': 0.000002
    }

    return costMap[modelId] || 0.00001
  }

  private getModelCapabilities(modelId: string): string[] {
    const capabilitiesMap: Record<string, string[]> = {
      'gpt-4': ['text-generation', 'code-generation', 'analysis', 'reasoning'],
      'gpt-4-turbo': ['text-generation', 'code-generation', 'analysis'],
      'gpt-3.5-turbo': ['text-generation', 'code-generation', 'translation'],
      'gpt-3.5-turbo-instruct': ['instruction-following', 'structured-output'],
      'text-davinci-003': ['text-completion', 'analysis'],
      'text-curie-001': ['text-completion', 'classification']
    }

    return capabilitiesMap[modelId] || ['text-generation']
  }

  // 配置验证
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.config.apiKey) {
      errors.push('OpenAI API key is required')
    }

    if (!this.config.model) {
      errors.push('OpenAI model is required')
    }

    if (this.config.timeout && this.config.timeout < 1000) {
      errors.push('Timeout should be at least 1000ms')
    }

    if (this.config.retryAttempts && (this.config.retryAttempts < 0 || this.config.retryAttempts > 10)) {
      errors.push('Retry attempts should be between 0 and 10')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // 配置更新
  updateConfig(updates: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...updates }

    if (updates.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${updates.apiKey}`
    }

    if (updates.baseUrl) {
      this.baseUrl = updates.baseUrl
    }
  }

  // 获取配置信息
  getConfig(): OpenAIConfig {
    return { ...this.config }
  }

  // 健康检查
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const models = await this.getModels()
      const hasGptModels = models.some(model => model.id.startsWith('gpt'))

      return {
        healthy: true,
        details: {
          availableModels: models.length,
          gptModelsAvailable: hasGptModels,
          apiEndpoint: this.baseUrl,
          configuredModel: this.config.model
        }
      }
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          apiEndpoint: this.baseUrl
        }
      }
    }
  }
}