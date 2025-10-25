/**
 * OpenAI服务配置
 * 管理OpenAI API密钥、模型配置和使用策略
 */

import { OpenAIConfig, OpenAIModel } from './openai-provider'

export interface OpenAIServiceConfig {
  defaultModel: string
  fallbackModels: string[]
  organizationId?: string
  costBudget?: {
    daily: number
    monthly: number
  }
  usageLimits?: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
  caching?: {
    enabled: boolean
    ttl: number
    maxSize: number
  }
}

export class OpenAIConfigManager {
  private config: OpenAIServiceConfig
  private static instance: OpenAIConfigManager

  constructor(config: OpenAIServiceConfig) {
    this.config = config
    this.validateConfig()
  }

  static getInstance(config?: OpenAIServiceConfig): OpenAIConfigManager {
    if (!OpenAIConfigManager.instance) {
      OpenAIConfigManager.instance = new OpenAIConfigManager(
        config || this.getDefaultConfig()
      )
    }
    return OpenAIConfigManager.instance
  }

  private static getDefaultConfig(): OpenAIServiceConfig {
    return {
      defaultModel: 'gpt-3.5-turbo',
      fallbackModels: ['gpt-4', 'gpt-3.5-turbo-instruct'],
      usageLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 90000
      },
      costBudget: {
        daily: 10,
        monthly: 300
      },
      caching: {
        enabled: true,
        ttl: 3600,
        maxSize: 1000
      }
    }
  }

  private validateConfig(): void {
    if (!this.config.defaultModel) {
      throw new Error('Default model is required')
    }

    if (!this.config.fallbackModels.includes(this.config.defaultModel)) {
      throw new Error('Default model should be included in fallback models')
    }
  }

  createProviderConfig(model?: string): OpenAIConfig {
    const selectedModel = model || this.config.defaultModel

    return {
      provider: 'openai',
      model: selectedModel,
      apiKey: process.env.OPENAI_API_KEY!,
      organizationId: this.config.organizationId || process.env.OPENAI_ORG_ID,
      baseUrl: process.env.OPENAI_BASE_URL,
      enabled: true,
      priority: this.getModelPriority(selectedModel),
      costPerToken: this.getCostPerToken(selectedModel),
      avgResponseTime: this.getAvgResponseTime(selectedModel),
      qualityScore: this.getQualityScore(selectedModel)
    }
  }

  getModelPriority(model: string): number {
    const priorityMap: Record<string, number> = {
      'gpt-4': 1,
      'gpt-4-turbo': 2,
      'gpt-3.5-turbo': 3,
      'gpt-3.5-turbo-instruct': 3,
      'gpt-3.5-turbo-16k': 3,
      'text-davinci-003': 4,
      'text-curie-001': 5
    }

    return priorityMap[model] || 5
  }

  getCostPerToken(model: string): number {
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

    return costMap[model] || 0.00001
  }

  getAvgResponseTime(model: string): number {
    const timeMap: Record<string, number> = {
      'gpt-4': 2000,
      'gpt-4-turbo': 800,
      'gpt-3.5-turbo': 600,
      'gpt-3.5-turbo-instruct': 800,
      'gpt-3.5-turbo-16k': 700,
      'text-davinci-003': 1500,
      'text-curie-001': 1000
    }

    return timeMap[model] || 1000
  }

  getQualityScore(model: string): number {
    const qualityMap: Record<string, number> = {
      'gpt-4': 9,
      'gpt-4-turbo': 8,
      'gpt-3.5-turbo': 7,
      'gpt-3.5-turbo-instruct': 7,
      'gpt-3.5-turbo-16k': 7,
      'text-davinci-003': 6,
      'text-curie-001': 5
    }

    return qualityMap[model] || 5
  }

  selectModelForTask(taskType: string, constraints?: {
    maxCost?: number
    maxTokens?: number
    requiredCapabilities?: string[]
  }): string {
    const availableModels = [
      this.config.defaultModel,
      ...this.config.fallbackModels
    ]

    for (const model of availableModels) {
      // 检查成本约束
      if (constraints?.maxCost) {
        const cost = this.getCostPerToken(model)
        const estimatedTokens = constraints.maxTokens || 1000
        const estimatedCost = cost * estimatedTokens
        if (estimatedCost > constraints.maxCost) {
          continue
        }
      }

      // 检查token约束
      if (constraints?.maxTokens) {
        const maxTokens = this.getMaxTokens(model)
        if (maxTokens < constraints.maxTokens) {
          continue
        }
      }

      // 检查能力要求
      if (constraints?.requiredCapabilities) {
        const modelCapabilities = this.getModelCapabilities(model)
        const hasAllCapabilities = constraints.requiredCapabilities.every(cap =>
          modelCapabilities.includes(cap)
        )
        if (!hasAllCapabilities) {
          continue
        }
      }

      return model
    }

    return this.config.defaultModel
  }

  getMaxTokens(model: string): number {
    const tokenMap: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 4096,
      'gpt-4-turbo-preview': 4096,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      'gpt-3.5-turbo-instruct': 4096,
      'text-davinci-003': 4097,
      'text-curie-001': 2048
    }

    return tokenMap[model] || 4096
  }

  getModelCapabilities(model: string): string[] {
    const capabilitiesMap: Record<string, string[]> = {
      'gpt-4': ['text-generation', 'code-generation', 'analysis', 'reasoning', 'instruction-following'],
      'gpt-4-turbo': ['text-generation', 'code-generation', 'analysis', 'instruction-following'],
      'gpt-3.5-turbo': ['text-generation', 'code-generation', 'translation', 'classification'],
      'gpt-3.5-turbo-instruct': ['instruction-following', 'structured-output', 'json-mode'],
      'text-davinci-003': ['text-completion', 'analysis', 'classification'],
      'text-curie-001': ['text-completion', 'classification', 'editing']
    }

    return capabilitiesMap[model] || ['text-generation']
  }

  updateConfig(updates: Partial<OpenAIServiceConfig>): void {
    this.config = { ...this.config, ...updates }
    this.validateConfig()
  }

  getConfig(): OpenAIServiceConfig {
    return { ...this.config }
  }

  isWithinBudget(currentCost: number, period: 'daily' | 'monthly'): boolean {
    if (!this.config.costBudget) return true

    const budget = this.config.costBudget[period]
    return currentCost <= budget
  }

  isWithinUsageLimits(currentUsage: { requests: number; tokens: number }): boolean {
    if (!this.config.usageLimits) return true

    return (
      currentUsage.requests <= this.config.usageLimits.requestsPerMinute &&
      currentUsage.tokens <= this.config.usageLimits.tokensPerMinute
    )
  }

  // 模型推荐
  getRecommendedModel(prompt: string, preferences?: {
    costPreference?: 'low' | 'medium' | 'high'
    speedPreference?: 'fast' | 'normal' | 'slow'
    qualityPreference?: 'basic' | 'good' | 'excellent'
  }): string {
    const promptLength = prompt.length
    const hasCodeBlocks = /```/.test(prompt)
    const hasStructuredData = /\{|\}|\[|\]/.test(prompt)

    let bestModel = this.config.defaultModel

    if (preferences?.qualityPreference === 'excellent' && hasCodeBlocks) {
      bestModel = 'gpt-4'
    } else if (preferences?.speedPreference === 'fast') {
      bestModel = 'gpt-3.5-turbo'
    } else if (preferences?.costPreference === 'low') {
      bestModel = 'gpt-3.5-turbo'
    }

    // 根据prompt长度调整
    if (promptLength > 10000) {
      bestModel = 'gpt-4-turbo' // 长文本使用32k模型
    } else if (promptLength < 100 && preferences?.qualityPreference !== 'excellent') {
      bestModel = 'gpt-3.5-turbo' // 短文本使用基础模型
    }

    return bestModel
  }

  // 成本估算
  estimateCost(prompt: string, model?: string, maxTokens?: number): {
    inputTokens: number
    outputTokens: number
    totalCost: number
  } {
    const selectedModel = model || this.config.defaultModel
    const maxOutputTokens = maxTokens || 1000

    // 简单的token估算（实际应该使用tiktoken）
    const estimatedInputTokens = Math.ceil(prompt.length / 4)
    const costPerToken = this.getCostPerToken(selectedModel)

    return {
      inputTokens: estimatedInputTokens,
      outputTokens: maxOutputTokens,
      totalCost: (estimatedInputTokens + maxOutputTokens) * costPerToken
    }
  }

  // 配置导出
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2)
  }

  // 配置导入
  static importConfig(configJson: string): OpenAIServiceConfig {
    try {
      return JSON.parse(configJson)
    } catch (error) {
      throw new Error('Invalid OpenAI configuration JSON')
    }
  }

  // 环境变量配置
  static loadFromEnvironment(): OpenAIServiceConfig {
    return {
      defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-3.5-turbo',
      fallbackModels: (process.env.OPENAI_FALLBACK_MODELS || 'gpt-4,gpt-3.5-turbo').split(','),
      organizationId: process.env.OPENAI_ORG_ID,
      costBudget: {
        daily: parseFloat(process.env.OPENAI_DAILY_BUDGET || '10'),
        monthly: parseFloat(process.env.OPENAI_MONTHLY_BUDGET || '300')
      },
      usageLimits: {
        requestsPerMinute: parseInt(process.env.OPENAI_REQUESTS_PER_MINUTE || '60'),
        tokensPerMinute: parseInt(process.env.OPENAI_TOKENS_PER_MINUTE || '90000')
      },
      caching: {
        enabled: process.env.OPENAI_CACHE_ENABLED === 'true',
        ttl: parseInt(process.env.OPENAI_CACHE_TTL || '3600'),
        maxSize: parseInt(process.env.OPENAI_CACHE_MAX_SIZE || '1000')
      }
    }
  }
}