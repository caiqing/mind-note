// AI摘要生成服务
// 实现多种模型的智能摘要生成功能

import { BaseAIService } from './base-service'
import { Logger } from './logger'
import { AIProvider, AnalysisOptions, SummaryResult } from '@/lib/ai/types'
import { aiConfig } from '@/lib/ai/config'
import { openaiProvider } from '@/lib/ai/providers/openai-provider'
import { claudeProvider } from '@/lib/ai/providers/claude-provider'

export interface SummaryOptions {
  maxLength?: number
  language?: 'zh' | 'en' | 'auto'
  style?: 'concise' | 'detailed' | 'bullet' | 'paragraph'
  includeKeyPoints?: boolean
  targetAudience?: 'general' | 'technical' | 'executive'
  customPrompt?: string
}

export interface SummaryQuality {
  clarity: number        // 清晰度 0-1
  completeness: number   // 完整性 0-1
  conciseness: number    // 简洁性 0-1
  relevance: number      // 相关性 0-1
  overall: number        // 总体质量 0-1
}

export class SummaryService extends BaseAIService {
  private logger = Logger.getInstance()

  constructor() {
    super('SummaryService')
  }

  /**
   * 生成笔记摘要
   */
  async generateSummary(
    noteId: string,
    noteTitle: string,
    noteContent: string,
    options: SummaryOptions = {}
  ): Promise<SummaryResult> {
    const startTime = Date.now()
    this.logger.info('开始生成摘要', { noteId, title: noteTitle })

    try {
      // 预处理内容
      const processedContent = this.preprocessContent(noteContent)
      if (!processedContent || processedContent.length < 50) {
        throw new Error('内容过短，无法生成有意义的摘要')
      }

      // 检查预算
      const estimatedCost = this.estimateSummaryCost(processedContent, options)
      if (!(await this.checkBudget(estimatedCost))) {
        throw new Error('预算不足，无法生成摘要')
      }

      // 选择最佳模型
      const provider = this.selectBestProvider(options)

      // 生成摘要
      const summary = await this.generateSummaryWithProvider(
        provider,
        noteTitle,
        processedContent,
        options
      )

      // 评估摘要质量
      const quality = await this.evaluateSummaryQuality(
        processedContent,
        summary.text,
        options
      )

      const result: SummaryResult = {
        text: summary.text,
        keyPoints: summary.keyPoints || [],
        quality,
        provider: provider.name,
        metadata: {
          originalLength: processedContent.length,
          summaryLength: summary.text.length,
          compressionRatio: summary.text.length / processedContent.length,
          processingTime: Date.now() - startTime,
          estimatedCost,
          options
        }
      }

      // 记录成功
      this.logger.info('摘要生成成功', {
        noteId,
        provider: provider.name,
        quality: quality.overall,
        compressionRatio: result.metadata.compressionRatio,
        processingTime: result.metadata.processingTime
      })

      // 记录花费
      this.recordSpending(estimatedCost)

      return result

    } catch (error) {
      this.logger.error('摘要生成失败', {
        noteId,
        error: error.message,
        processingTime: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * 批量生成摘要
   */
  async generateBatchSummaries(
    notes: Array<{
      id: string
      title: string
      content: string
      options?: SummaryOptions
    }>
  ): Promise<Array<{
    noteId: string
    summary?: SummaryResult
    error?: string
  }>> {
    this.logger.info('开始批量生成摘要', { count: notes.length })

    const results = []
    const concurrencyLimit = 3 // 并发限制

    for (let i = 0; i < notes.length; i += concurrencyLimit) {
      const batch = notes.slice(i, i + concurrencyLimit)

      const batchPromises = batch.map(async (note) => {
        try {
          const summary = await this.generateSummary(
            note.id,
            note.title,
            note.content,
            note.options
          )
          return { noteId: note.id, summary }
        } catch (error) {
          this.logger.warn('单个笔记摘要生成失败', {
            noteId: note.id,
            error: error.message
          })
          return { noteId: note.id, error: error.message }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // 避免API限制，批次间稍作延迟
      if (i + concurrencyLimit < notes.length) {
        await this.delay(1000)
      }
    }

    const successCount = results.filter(r => r.summary).length
    this.logger.info('批量摘要生成完成', {
      total: notes.length,
      success: successCount,
      failed: notes.length - successCount
    })

    return results
  }

  /**
   * 生成多版本摘要对比
   */
  async generateComparativeSummaries(
    noteTitle: string,
    noteContent: string,
    providers: string[] = ['openai', 'anthropic'],
    options: SummaryOptions = {}
  ): Promise<Array<{
    provider: string
    summary: SummaryResult
  }>> {
    this.logger.info('开始生成对比摘要', { providers, title: noteTitle })

    const results = []

    for (const providerName of providers) {
      try {
        const provider = this.getProviderByName(providerName)
        if (!provider) {
          this.logger.warn('未找到指定的提供商', { provider: providerName })
          continue
        }

        const summary = await this.generateSummaryWithProvider(
          provider,
          noteTitle,
          noteContent,
          options
        )

        const quality = await this.evaluateSummaryQuality(
          noteContent,
          summary.text,
          options
        )

        const result: SummaryResult = {
          text: summary.text,
          keyPoints: summary.keyPoints || [],
          quality,
          provider: provider.name,
          metadata: {
            originalLength: noteContent.length,
            summaryLength: summary.text.length,
            compressionRatio: summary.text.length / noteContent.length,
            estimatedCost: this.estimateSummaryCost(noteContent, options),
            options
          }
        }

        results.push({ provider: providerName, summary: result })

      } catch (error) {
        this.logger.error('提供商摘要生成失败', {
          provider: providerName,
          error: error.message
        })
      }
    }

    // 按质量排序
    results.sort((a, b) => b.summary.quality.overall - a.summary.quality.overall)

    return results
  }

  /**
   * 预处理内容
   */
  private preprocessContent(content: string): string {
    // 移除多余的空白字符
    let processed = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()

    // 移除Markdown格式标记
    processed = processed
      .replace(/#{1,6}\s+/g, '') // 标题标记
      .replace(/\*\*(.*?)\*\*/g, '$1') // 粗体
      .replace(/\*(.*?)\*/g, '$1') // 斜体
      .replace(/`(.*?)`/g, '$1') // 行内代码
      .replace(/```[\s\S]*?```/g, '') // 代码块
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // 图片

    // 移除特殊字符，但保留中文和基本标点
    processed = processed.replace(/[^\w\s\u4e00-\u9fff.,!?;:]/g, ' ')

    // 再次清理空白
    processed = processed.replace(/\s+/g, ' ').trim()

    return processed
  }

  /**
   * 使用指定提供商生成摘要
   */
  private async generateSummaryWithProvider(
    provider: AIProvider,
    title: string,
    content: string,
    options: SummaryOptions
  ): Promise<{ text: string; keyPoints?: string[] }> {
    const prompt = this.buildSummaryPrompt(title, content, options)

    switch (provider.name) {
      case 'openai':
        return await this.generateWithOpenAI(prompt, options)
      case 'anthropic':
        return await this.generateWithClaude(prompt, options)
      default:
        throw new Error(`不支持的提供商: ${provider.name}`)
    }
  }

  /**
   * 构建摘要提示词
   */
  private buildSummaryPrompt(
    title: string,
    content: string,
    options: SummaryOptions
  ): string {
    const {
      maxLength = 200,
      language = 'zh',
      style = 'paragraph',
      includeKeyPoints = false,
      targetAudience = 'general',
      customPrompt
    } = options

    let prompt = ''

    // 基础指令
    const languageMap = {
      zh: '中文',
      en: 'English',
      auto: '中文（如果原文是中文）'
    }

    prompt += `请为以下内容生成一个简洁、准确的摘要，使用${languageMap[language]}。\n\n`
    prompt += `标题：${title}\n\n`
    prompt += `内容：${content}\n\n`

    // 风格要求
    switch (style) {
      case 'concise':
        prompt += `要求：生成一个极其简洁的摘要，不超过${maxLength}字，突出核心信息。\n`
        break
      case 'detailed':
        prompt += `要求：生成一个相对详细的摘要，不超过${maxLength}字，包含主要观点和重要细节。\n`
        break
      case 'bullet':
        prompt += `要求：以要点形式生成摘要，每个要点不超过30字，总共不超过${maxLength}字。\n`
        break
      case 'paragraph':
        prompt += `要求：以段落形式生成摘要，行文流畅，不超过${maxLength}字。\n`
        break
    }

    // 目标受众
    const audienceMap = {
      general: '普通大众',
      technical: '技术人员',
      executive: '管理层'
    }
    prompt += `目标受众：${audienceMap[targetAudience]}\n`

    // 关键点要求
    if (includeKeyPoints) {
      prompt += `请额外提供3-5个关键要点，每个要点不超过20字。\n`
    }

    // 自定义提示
    if (customPrompt) {
      prompt += `\n特殊要求：${customPrompt}\n`
    }

    // 输出格式要求
    if (style === 'bullet') {
      prompt += `\n请严格按照以下JSON格式输出：
{
  "summary": "要点1\n要点2\n要点3",
  ${includeKeyPoints ? '"keyPoints": ["关键点1", "关键点2", "关键点3"]' : ''}
}`
    } else {
      prompt += `\n请严格按照以下JSON格式输出：
{
  "summary": "摘要内容",
  ${includeKeyPoints ? '"keyPoints": ["关键点1", "关键点2", "关键点3"]' : ''}
}`
    }

    return prompt
  }

  /**
   * 使用OpenAI生成摘要
   */
  private async generateWithOpenAI(
    prompt: string,
    options: SummaryOptions
  ): Promise<{ text: string; keyPoints?: string[] }> {
    try {
      const response = await openaiProvider.generateText({
        prompt,
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.3
      })

      // 解析JSON响应
      const result = this.parseSummaryResponse(response.text)
      return result

    } catch (error) {
      this.logger.error('OpenAI摘要生成失败', { error: error.message })
      throw new Error(`OpenAI摘要生成失败: ${error.message}`)
    }
  }

  /**
   * 使用Claude生成摘要
   */
  private async generateWithClaude(
    prompt: string,
    options: SummaryOptions
  ): Promise<{ text: string; keyPoints?: string[] }> {
    try {
      const response = await claudeProvider.generateText({
        prompt,
        model: 'claude-3-haiku-20240307',
        maxTokens: 500,
        temperature: 0.3
      })

      const result = this.parseSummaryResponse(response.text)
      return result

    } catch (error) {
      this.logger.error('Claude摘要生成失败', { error: error.message })
      throw new Error(`Claude摘要生成失败: ${error.message}`)
    }
  }

  /**
   * 解析摘要响应
   */
  private parseSummaryResponse(response: string): { text: string; keyPoints?: string[] } {
    try {
      // 尝试解析JSON
      const cleanResponse = response.trim()
      if (cleanResponse.startsWith('{')) {
        const parsed = JSON.parse(cleanResponse)
        return {
          text: parsed.summary || parsed.text || '',
          keyPoints: parsed.keyPoints || []
        }
      }
    } catch (error) {
      this.logger.warn('JSON解析失败，尝试文本提取', { response: response.substring(0, 100) })
    }

    // 备用方案：直接返回文本
    return {
      text: response.trim(),
      keyPoints: []
    }
  }

  /**
   * 评估摘要质量
   */
  private async evaluateSummaryQuality(
    originalContent: string,
    summary: string,
    options: SummaryOptions
  ): Promise<SummaryQuality> {
    // 基础质量指标计算
    const clarity = this.calculateClarity(summary)
    const completeness = this.calculateCompleteness(originalContent, summary)
    const conciseness = this.calculateConciseness(originalContent, summary, options.maxLength)
    const relevance = this.calculateRelevance(originalContent, summary)
    const overall = (clarity + completeness + conciseness + relevance) / 4

    return {
      clarity,
      completeness,
      conciseness,
      relevance,
      overall
    }
  }

  /**
   * 计算清晰度
   */
  private calculateClarity(text: string): number {
    // 简单的清晰度评分：句子长度、段落结构等
    const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 0)
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length

    // 理想句子长度在20-80字符之间
    const idealScore = 1 - Math.abs(avgSentenceLength - 50) / 50
    return Math.max(0, Math.min(1, idealScore))
  }

  /**
   * 计算完整性
   */
  private calculateCompleteness(original: string, summary: string): number {
    // 基于关键词覆盖度计算完整性
    const originalWords = new Set(original.toLowerCase().split(/\s+/))
    const summaryWords = new Set(summary.toLowerCase().split(/\s+/))

    const intersection = new Set([...originalWords].filter(x => summaryWords.has(x)))
    const coverage = intersection.size / originalWords.size

    return Math.min(1, coverage * 2) // 放大覆盖度影响
  }

  /**
   * 计算简洁性
   */
  private calculateConciseness(original: string, summary: string, maxLength?: number): number {
    const ratio = summary.length / original.length

    if (maxLength) {
      // 如果指定了最大长度，检查是否在合理范围内
      const idealRatio = maxLength / original.length
      const deviation = Math.abs(ratio - idealRatio) / idealRatio
      return Math.max(0, 1 - deviation)
    }

    // 理想压缩比在0.1-0.3之间
    if (ratio < 0.1) return 0.7 // 太短可能丢失重要信息
    if (ratio > 0.5) return 0.5 // 太长不够简洁
    if (ratio >= 0.1 && ratio <= 0.3) return 1.0

    return Math.max(0, 1 - Math.abs(ratio - 0.2) / 0.2)
  }

  /**
   * 计算相关性
   */
  private calculateRelevance(original: string, summary: string): number {
    // 简单的相关性评分：基于共同词汇
    const originalWords = original.toLowerCase().split(/\s+/)
    const summaryWords = summary.toLowerCase().split(/\s+/)

    const originalWordFreq = new Map<string, number>()
    originalWords.forEach(word => {
      if (word.length > 2) { // 忽略短词
        originalWordFreq.set(word, (originalWordFreq.get(word) || 0) + 1)
      }
    })

    let relevanceScore = 0
    let totalWeight = 0

    summaryWords.forEach(word => {
      if (originalWordFreq.has(word)) {
        relevanceScore += originalWordFreq.get(word)!
      }
      totalWeight++
    })

    return totalWeight > 0 ? Math.min(1, relevanceScore / totalWeight) : 0
  }

  /**
   * 选择最佳提供商
   */
  private selectBestProvider(options: SummaryOptions): AIProvider {
    // 根据内容长度和语言选择最佳提供商
    const contentLength = options.maxLength || 200

    if (contentLength > 500) {
      // 长内容优先使用Claude（上下文能力更强）
      return aiConfig.providers.anthropic
    }

    // 默认使用OpenAI
    return aiConfig.providers.openai
  }

  /**
   * 根据名称获取提供商
   */
  private getProviderByName(name: string): AIProvider | null {
    const providers = aiConfig.providers
    switch (name) {
      case 'openai':
        return providers.openai
      case 'anthropic':
        return providers.anthropic
      default:
        return null
    }
  }

  /**
   * 估算摘要生成成本
   */
  private estimateSummaryCost(content: string, options: SummaryOptions): number {
    // 简单的成本估算（基于内容长度）
    const baseCost = content.length * 0.000001 // 每1000字符0.001美元
    const providerMultiplier = 1.0 // 不同提供商的倍数

    return baseCost * providerMultiplier
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 导出单例实例
export const summaryService = new SummaryService()