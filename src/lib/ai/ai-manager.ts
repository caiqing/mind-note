/**
 * AI Service Manager
 *
 * 统一管理多个AI服务提供商，支持fallback机制
 */

import OpenAI from 'openai'
import { z } from 'zod'

// AI服务提供商类型
export type AIProvider = 'openai' | 'anthropic' | 'zhipu' | 'deepseek' | 'ollama'

// AI服务配置
export interface AIServiceConfig {
  provider: AIProvider
  apiKey?: string
  baseURL?: string
  model: string
  maxTokens?: number
  temperature?: number
  timeout?: number
  maxRetries?: number
}

// AI分析结果接口
export interface AIAnalysisResult {
  categories: Array<{
    categoryId: string
    categoryName: string
    confidence: number
    reason: string
  }>
  tags: Array<{
    tagId?: string
    tagName: string
    confidence: number
    color?: string
  }>
  summary?: {
    text: string
    keyPoints: string[]
    estimatedReadingTime: number
  }
  metadata: {
    provider: AIProvider
    model: string
    processingTime: number
    tokensUsed: {
      input: number
      output: number
    }
    cost?: number
  }
}

// AI服务提供商配置
const PROVIDER_CONFIGS: Record<AIProvider, Partial<AIServiceConfig>> = {
  openai: {
    model: 'gpt-4o-mini',
    maxTokens: 1000,
    temperature: 0.3,
    timeout: 30000,
    maxRetries: 3
  },
  anthropic: {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1000,
    temperature: 0.3,
    timeout: 30000,
    maxRetries: 3
  },
  zhipu: {
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    maxTokens: 1000,
    temperature: 0.3,
    timeout: 30000,
    maxRetries: 3
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    maxTokens: 1000,
    temperature: 0.3,
    timeout: 30000,
    maxRetries: 3
  },
  ollama: {
    baseURL: 'http://localhost:11434',
    model: 'llama3:8b',
    maxTokens: 2000,
    temperature: 0.3,
    timeout: 60000,
    maxRetries: 2
  }
}

export class AIManager {
  private providers: Map<AIProvider, any> = new Map()
  private config: {
    primaryProvider: AIProvider
    fallbackProviders: AIProvider[]
    costTracking: boolean
  }

  constructor() {
    this.config = {
      primaryProvider: this.getProviderFromEnv() || 'ollama',
      fallbackProviders: this.getFallbackProviders(),
      costTracking: true
    }

    this.initializeProviders()
  }

  private getProviderFromEnv(): AIProvider | null {
    const priority = process.env.AI_PROVIDERS_PRIORITY?.split(',') || []
    const primary = process.env.AI_PRIMARY_PROVIDER

    if (primary && priority.includes(primary)) {
      return primary as AIProvider
    }

    return priority[0] as AIProvider || null
  }

  private getFallbackProviders(): AIProvider[] {
    const priority = process.env.AI_PROVIDERS_PRIORITY?.split(',') || []
    const fallback = process.env.AI_FALLBACK_PROVIDER

    const providers: AIProvider[] = []

    if (fallback && priority.includes(fallback)) {
      providers.push(fallback as AIProvider)
    }

    // 添加其他可用的提供商作为fallback
    priority.forEach(provider => {
      if (provider !== this.config.primaryProvider &&
          provider !== fallback &&
          this.isProviderAvailable(provider as AIProvider)) {
        providers.push(provider as AIProvider)
      }
    })

    return providers
  }

  private isProviderAvailable(provider: AIProvider): boolean {
    switch (provider) {
      case 'openai':
        return !!process.env.OPENAI_API_KEY
      case 'anthropic':
        return !!process.env.ANTHROPIC_API_KEY
      case 'zhipu':
        return !!process.env.ZHIPU_API_KEY
      case 'deepseek':
        return !!process.env.DEEPSEEK_API_KEY
      case 'ollama':
        return true // Ollama不需要API密钥，假设本地运行
      default:
        return false
    }
  }

  private initializeProviders(): void {
    // 初始化OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: PROVIDER_CONFIGS.openai.baseURL,
        maxRetries: PROVIDER_CONFIGS.openai.maxRetries,
        timeout: PROVIDER_CONFIGS.openai.timeout
      }))
    }

    // 其他提供商可以在这里初始化
    // 由于它们使用不同的API，需要分别处理
  }

  /**
   * 分析内容并提供AI建议
   */
  async analyzeContent(
    content: string,
    options: {
      includeCategories?: boolean
      includeTags?: boolean
      includeSummary?: boolean
      existingCategories?: Array<{ id: string; name: string }>
      existingTags?: Array<{ id: string; name: string; color?: string }>
      forceProvider?: AIProvider
    } = {}
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now()
    const {
      includeCategories = true,
      includeTags = true,
      includeSummary = false,
      existingCategories = [],
      existingTags = [],
      forceProvider
    } = options

    const providersToTry = forceProvider
      ? [forceProvider]
      : [this.config.primaryProvider, ...this.config.fallbackProviders]

    let lastError: Error | null = null

    for (const providerName of providersToTry) {
      if (!this.isProviderAvailable(providerName)) {
        continue
      }

      try {
        const result = await this.callProvider(
          providerName,
          content,
          {
            includeCategories,
            includeTags,
            includeSummary,
            existingCategories,
            existingTags
          }
        )

        return {
          ...result,
          metadata: {
            provider: providerName,
            model: PROVIDER_CONFIGS[providerName].model!,
            processingTime: Date.now() - startTime,
            tokensUsed: result.tokensUsed || { input: 0, output: 0 },
            cost: this.calculateCost(providerName, result.tokensUsed || { input: 0, output: 0 })
          }
        }
      } catch (error) {
        console.warn(`Provider ${providerName} failed:`, error)
        lastError = error instanceof Error ? error : new Error('Unknown error')
        continue
      }
    }

    // 所有提供商都失败了，返回fallback结果
    console.error('All AI providers failed, using fallback:', lastError)
    return this.generateFallbackResult(content, Date.now() - startTime)
  }

  private async callProvider(
    provider: AIProvider,
    content: string,
    options: {
      includeCategories: boolean
      includeTags: boolean
      includeSummary: boolean
      existingCategories: Array<{ id: string; name: string }>
      existingTags: Array<{ id: string; name: string; color?: string }>
    }
  ): Promise<Omit<AIAnalysisResult, 'metadata'>> {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(content, options)
      case 'ollama':
        return this.callOllama(content, options)
      case 'zhipu':
        return this.callZhipu(content, options)
      case 'deepseek':
        return this.callDeepSeek(content, options)
      case 'anthropic':
        return this.callAnthropic(content, options)
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  private async callOpenAI(
    content: string,
    options: {
      includeCategories: boolean
      includeTags: boolean
      includeSummary: boolean
      existingCategories: Array<{ id: string; name: string }>
      existingTags: Array<{ id: string; name: string; color?: string }>
    }
  ): Promise<Omit<AIAnalysisResult, 'metadata'>> {
    const openai = this.providers.get('openai')
    if (!openai) {
      throw new Error('OpenAI provider not initialized')
    }

    const systemPrompt = this.buildSystemPrompt(options)

    const response = await openai.chat.completions.create({
      model: PROVIDER_CONFIGS.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请分析以下笔记内容：\n\n${content.substring(0, 4000)}` }
      ],
      temperature: PROVIDER_CONFIGS.openai.temperature,
      max_tokens: PROVIDER_CONFIGS.openai.maxTokens,
      response_format: { type: 'json_object' }
    })

    const tokensUsed = {
      input: response.usage?.prompt_tokens || 0,
      output: response.usage?.completion_tokens || 0
    }

    const analysisResult = JSON.parse(response.choices[0].message.content || '{}')

    return this.parseAnalysisResult(analysisResult, options, tokensUsed)
  }

  private async callOllama(
    content: string,
    options: {
      includeCategories: boolean
      includeTags: boolean
      includeSummary: boolean
      existingCategories: Array<{ id: string; name: string }>
      existingTags: Array<{ id: string; name: string; color?: string }>
    }
  ): Promise<Omit<AIAnalysisResult, 'metadata'>> {
    const systemPrompt = this.buildSystemPrompt(options)

    const response = await fetch(`${PROVIDER_CONFIGS.ollama.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: PROVIDER_CONFIGS.ollama.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请分析以下笔记内容：\n\n${content.substring(0, 4000)}` }
        ],
        stream: false,
        options: {
          temperature: PROVIDER_CONFIGS.ollama.temperature,
          num_predict: PROVIDER_CONFIGS.ollama.maxTokens
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    const contentText = data.message?.content || '{}'

    // 尝试解析JSON，如果失败则使用文本解析
    let analysisResult
    try {
      analysisResult = JSON.parse(contentText)
    } catch {
      analysisResult = this.parseTextResponse(contentText)
    }

    return this.parseAnalysisResult(analysisResult, options, { input: 0, output: 0 })
  }

  private async callZhipu(
    content: string,
    options: {
      includeCategories: boolean
      includeTags: boolean
      includeSummary: boolean
      existingCategories: Array<{ id: string; name: string }>
      existingTags: Array<{ id: string; name: string; color?: string }>
    }
  ): Promise<Omit<AIAnalysisResult, 'metadata'>> {
    const systemPrompt = this.buildSystemPrompt(options)

    const response = await fetch(`${PROVIDER_CONFIGS.zhipu.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`
      },
      body: JSON.stringify({
        model: PROVIDER_CONFIGS.zhipu.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请分析以下笔记内容：\n\n${content.substring(0, 4000)}` }
        ],
        temperature: PROVIDER_CONFIGS.zhipu.temperature,
        max_tokens: PROVIDER_CONFIGS.zhipu.maxTokens
      })
    })

    if (!response.ok) {
      throw new Error(`Zhipu API error: ${response.statusText}`)
    }

    const data = await response.json()
    const contentText = data.choices?.[0]?.message?.content || '{}'

    let analysisResult
    try {
      analysisResult = JSON.parse(contentText)
    } catch {
      analysisResult = this.parseTextResponse(contentText)
    }

    const tokensUsed = {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0
    }

    return this.parseAnalysisResult(analysisResult, options, tokensUsed)
  }

  private async callDeepSeek(
    content: string,
    options: {
      includeCategories: boolean
      includeTags: boolean
      includeSummary: boolean
      existingCategories: Array<{ id: string; name: string }>
      existingTags: Array<{ id: string; name: string; color?: string }>
    }
  ): Promise<Omit<AIAnalysisResult, 'metadata'>> {
    // DeepSeek API调用实现，类似Zhipu
    // 这里简化实现，实际需要根据DeepSeek API文档调整
    return this.callZhipu(content, options) // 临时使用相同的逻辑
  }

  private async callAnthropic(
    content: string,
    options: {
      includeCategories: boolean
      includeTags: boolean
      includeSummary: boolean
      existingCategories: Array<{ id: string; name: string }>
      existingTags: Array<{ id: string; name: string; color?: string }>
    }
  ): Promise<Omit<AIAnalysisResult, 'metadata'>> {
    // Anthropic Claude API调用实现
    // 这里需要根据Anthropic API文档实现
    throw new Error('Anthropic provider not implemented yet')
  }

  private buildSystemPrompt(options: {
    includeCategories: boolean
    includeTags: boolean
    includeSummary: boolean
    existingCategories: Array<{ id: string; name: string }>
    existingTags: Array<{ id: string; name: string; color?: string }>
  }): string {
    let prompt = '你是一个智能笔记助手，帮助用户分析和整理笔记内容。请以JSON格式返回分析结果。\n\n'

    if (options.includeCategories) {
      prompt += `对于分类建议：
- 现有分类：${options.existingCategories.map(c => c.name).join(', ') || '无'}
- 请基于内容推荐最合适的分类
- 返回格式：categories: [{categoryId: "ID或'new'", categoryName: "名称", confidence: 0.8, reason: "理由"}]\n\n`
    }

    if (options.includeTags) {
      prompt += `对于标签建议：
- 现有标签：${options.existingTags.map(t => t.name).join(', ') || '无'}
- 请生成5-10个相关标签
- 返回格式：tags: [{tagName: "标签名", confidence: 0.7}]\n\n`
    }

    if (options.includeSummary) {
      prompt += `对于内容摘要：
- 生成简洁摘要（100字以内）
- 提取3-5个关键要点
- 返回格式：summary: {text: "摘要", keyPoints: ["要点1", "要点2"], estimatedReadingTime: 2}\n\n`
    }

    prompt += '请确保返回的是有效的JSON格式。'
    return prompt
  }

  private parseAnalysisResult(
    result: any,
    options: {
      includeCategories: boolean
      includeTags: boolean
      includeSummary: boolean
    },
    tokensUsed: { input: number; output: number }
  ): Omit<AIAnalysisResult, 'metadata'>> {
    const analysisResult: Omit<AIAnalysisResult, 'metadata'> = {
      categories: [],
      tags: [],
      summary: undefined,
      tokensUsed
    }

    // 处理分类
    if (options.includeCategories && result.categories) {
      analysisResult.categories = result.categories.map((cat: any) => ({
        categoryId: cat.categoryId || 'new',
        categoryName: cat.categoryName,
        confidence: Math.min(Math.max(cat.confidence || 0, 0), 1),
        reason: cat.reason || ''
      }))
    }

    // 处理标签
    if (options.includeTags && result.tags) {
      analysisResult.tags = result.tags.map((tag: any) => ({
        tagId: tag.tagId || undefined,
        tagName: tag.tagName,
        confidence: Math.min(Math.max(tag.confidence || 0, 0), 1),
        color: tag.color || this.generateTagColor()
      }))
    }

    // 处理摘要
    if (options.includeSummary && result.summary) {
      analysisResult.summary = {
        text: result.summary.text || '',
        keyPoints: result.summary.keyPoints || [],
        estimatedReadingTime: result.summary.estimatedReadingTime || 1
      }
    }

    return analysisResult
  }

  private parseTextResponse(text: string): any {
    // 简单的文本解析逻辑，用于处理非JSON响应
    const lines = text.split('\n').filter(line => line.trim())
    const result: any = {}

    lines.forEach(line => {
      if (line.toLowerCase().includes('分类') || line.toLowerCase().includes('category')) {
        result.categories = this.extractCategoriesFromText(line)
      } else if (line.toLowerCase().includes('标签') || line.toLowerCase().includes('tag')) {
        result.tags = this.extractTagsFromText(line)
      } else if (line.toLowerCase().includes('摘要') || line.toLowerCase().includes('summary')) {
        result.summary = this.extractSummaryFromText(line)
      }
    })

    return result
  }

  private extractCategoriesFromText(text: string): any[] {
    // 简化的分类提取逻辑
    return [{
      categoryId: 'new',
      categoryName: '未分类',
      confidence: 0.5,
      reason: '从文本中提取'
    }]
  }

  private extractTagsFromText(text: string): any[] {
    // 简化的标签提取逻辑
    const words = text.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 5)

    return words.map(word => ({
      tagName: word,
      confidence: 0.6,
      color: this.generateTagColor()
    }))
  }

  private extractSummaryFromText(text: string): any {
    return {
      text: text.substring(0, 100),
      keyPoints: [text.substring(0, 50)],
      estimatedReadingTime: 1
    }
  }

  private generateTagColor(): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  private calculateCost(provider: AIProvider, tokensUsed: { input: number; output: number }): number {
    // 简化的成本计算（实际价格可能不同）
    const costs: Record<AIProvider, { input: number; output: number }> = {
      openai: { input: 0.000005, output: 0.000015 }, // GPT-4o-mini
      anthropic: { input: 0.000003, output: 0.000015 }, // Claude 3.5 Sonnet
      zhipu: { input: 0.000001, output: 0.000002 }, // GLM-4
      deepseek: { input: 0.0000001, output: 0.0000002 }, // DeepSeek
      ollama: { input: 0, output: 0 } // 本地运行无成本
    }

    const providerCosts = costs[provider] || { input: 0, output: 0 }
    return (tokensUsed.input * providerCosts.input) + (tokensUsed.output * providerCosts.output)
  }

  private generateFallbackResult(content: string, processingTime: number): AIAnalysisResult {
    // 基于内容的fallback分析
    const words = content.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)

    const wordCount: { [key: string]: number } = {}
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })

    const topWords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    return {
      categories: [{
        categoryId: 'new',
        categoryName: '未分类',
        confidence: 0.3,
        reason: 'AI服务不可用，使用默认分类'
      }],
      tags: topWords.map(([word, count]) => ({
        tagName: word,
        confidence: Math.min(count / words.length * 2, 0.5),
        color: this.generateTagColor()
      })),
      summary: {
        text: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        keyPoints: [content.substring(0, 50) + (content.length > 50 ? '...' : '')],
        estimatedReadingTime: Math.ceil(content.length / 500)
      },
      metadata: {
        provider: 'fallback',
        model: 'local-analysis',
        processingTime,
        tokensUsed: { input: 0, output: 0 },
        cost: 0
      }
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ provider: AIProvider; healthy: boolean; error?: string }[]> {
    const results: { provider: AIProvider; healthy: boolean; error?: string }[] = []

    for (const provider of [this.config.primaryProvider, ...this.config.fallbackProviders]) {
      try {
        const healthy = await this.checkProviderHealth(provider)
        results.push({ provider, healthy })
      } catch (error) {
        results.push({
          provider,
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  private async checkProviderHealth(provider: AIProvider): Promise<boolean> {
    switch (provider) {
      case 'openai':
        return this.checkOpenAIHealth()
      case 'ollama':
        return this.checkOllamaHealth()
      default:
        return true // 假设其他提供商健康
    }
  }

  private async checkOpenAIHealth(): Promise<boolean> {
    try {
      const openai = this.providers.get('openai')
      if (!openai) return false

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      })

      return !!response.choices[0]?.message?.content
    } catch {
      return false
    }
  }

  private async checkOllamaHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${PROVIDER_CONFIGS.ollama.baseURL}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 获取当前配置信息
   */
  getConfig() {
    return {
      primaryProvider: this.config.primaryProvider,
      fallbackProviders: this.config.fallbackProviders,
      availableProviders: Array.from(this.providers.keys())
    }
  }
}

// 导出单例实例
export const aiManager = new AIManager()
export default aiManager