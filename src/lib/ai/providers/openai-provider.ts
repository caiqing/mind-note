// OpenAI AI服务提供商实现
// 生产级OpenAI API集成

import OpenAI from 'openai'
import { Logger } from '@/lib/ai/services/logger'

export interface OpenAIResponse {
  text: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  finishReason?: string
}

export interface OpenAIConfig {
  apiKey: string
  organizationId?: string
  baseURL?: string
  timeout?: number
  maxRetries?: number
}

export interface GenerateTextParams {
  prompt: string
  model?: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
}

export class OpenAIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'OpenAIError'
  }
}

export class OpenAIProvider {
  private client: OpenAI
  private logger = Logger.getInstance()
  name = 'openai'
  private config: OpenAIConfig

  constructor(config: OpenAIConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      organization: this.config.organizationId,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries
    })

    this.logger.info('OpenAI Provider initialized', {
      organization: this.config.organizationId,
      baseURL: this.config.baseURL
    })
  }

  /**
   * 生成文本内容
   */
  async generateText(params: GenerateTextParams): Promise<OpenAIResponse> {
    const startTime = Date.now()
    this.logger.info('开始OpenAI文本生成', {
      model: params.model,
      promptLength: params.prompt.length
    })

    try {
      const response = await this.client.chat.completions.create({
        model: params.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: params.prompt
          }
        ],
        max_tokens: params.maxTokens || 1000,
        temperature: params.temperature ?? 0.7,
        top_p: params.topP,
        frequency_penalty: params.frequencyPenalty,
        presence_penalty: params.presencePenalty,
        stop: params.stop,
        stream: false
      })

      const choice = response.choices[0]
      if (!choice?.message?.content) {
        throw new OpenAIError('OpenAI返回空响应', 'empty_response', response.status)
      }

      const result: OpenAIResponse = {
        text: choice.message.content,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        model: response.model,
        finishReason: choice.finish_reason || undefined
      }

      const processingTime = Date.now() - startTime
      this.logger.info('OpenAI文本生成成功', {
        model: result.model,
        tokens: result.usage.totalTokens,
        processingTime,
        finishReason: result.finishReason
      })

      return result

    } catch (error: any) {
      const processingTime = Date.now() - startTime
      this.logger.error('OpenAI文本生成失败', {
        error: error.message,
        code: error.code,
        statusCode: error.status,
        processingTime
      })

      // 转换为自定义错误类型
      if (error instanceof OpenAI.APIError) {
        throw new OpenAIError(
          error.message,
          error.code,
          error.status,
          error.response
        )
      }

      throw new OpenAIError(
        `OpenAI API调用失败: ${error.message}`,
        'api_error',
        error.status
      )
    }
  }

  /**
   * 流式生成文本
   */
  async *generateTextStream(params: GenerateTextParams): AsyncGenerator<string> {
    this.logger.info('开始OpenAI流式文本生成', {
      model: params.model,
      promptLength: params.prompt.length
    })

    try {
      const stream = await this.client.chat.completions.create({
        model: params.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: params.prompt }],
        max_tokens: params.maxTokens || 1000,
        temperature: params.temperature ?? 0.7,
        stream: true
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }

      this.logger.info('OpenAI流式文本生成完成')
    } catch (error: any) {
      this.logger.error('OpenAI流式文本生成失败', {
        error: error.message,
        code: error.code
      })
      throw new OpenAIError(
        `OpenAI流式API调用失败: ${error.message}`,
        'stream_error',
        error.status
      )
    }
  }

  /**
   * 生成文本嵌入
   */
  async generateEmbedding(text: string, model?: string): Promise<number[]> {
    const startTime = Date.now()
    this.logger.info('开始OpenAI嵌入生成', {
      model,
      textLength: text.length
    })

    try {
      const response = await this.client.embeddings.create({
        model: model || 'text-embedding-ada-002',
        input: text
      })

      const embedding = response.data[0]?.embedding
      if (!embedding) {
        throw new OpenAIError('OpenAI返回空嵌入', 'empty_embedding')
      }

      const processingTime = Date.now() - startTime
      this.logger.info('OpenAI嵌入生成成功', {
        model: response.model,
        dimensions: embedding.length,
        processingTime
      })

      return embedding

    } catch (error: any) {
      const processingTime = Date.now() - startTime
      this.logger.error('OpenAI嵌入生成失败', {
        error: error.message,
        processingTime
      })

      if (error instanceof OpenAI.APIError) {
        throw new OpenAIError(
          `OpenAI嵌入生成失败: ${error.message}`,
          error.code,
          error.status
        )
      }

      throw new OpenAIError(
        `OpenAI嵌入生成失败: ${error.message}`,
        'embedding_error'
      )
    }
  }

  /**
   * 检查API可用性
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.models.list()
      return response.data.length > 0
    } catch (error) {
      this.logger.error('OpenAI健康检查失败', { error: error.message })
      return false
    }
  }

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list()
      return response.data.map(model => model.id)
    } catch (error: any) {
      this.logger.error('获取OpenAI模型列表失败', { error: error.message })
      throw new OpenAIError(
        `获取模型列表失败: ${error.message}`,
        'models_error'
      )
    }
  }
}

// 单例实例
let openaiProviderInstance: OpenAIProvider | null = null

export function getOpenAIProvider(): OpenAIProvider {
  if (!openaiProviderInstance) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY环境变量未设置')
    }

    openaiProviderInstance = new OpenAIProvider({
      apiKey,
      organizationId: process.env.OPENAI_ORGANIZATION_ID,
      baseURL: process.env.OPENAI_BASE_URL
    })
  }

  return openaiProviderInstance
}

export { getOpenAIProvider as openaiProvider }