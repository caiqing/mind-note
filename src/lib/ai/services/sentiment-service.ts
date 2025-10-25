// AI情感分析服务
// 实现多种模型的智能情感分析功能

import { BaseAIService } from './base-service'
import { Logger } from './logger'
import { AIProvider } from '@/lib/ai/types'
import { aiConfig } from '@/lib/ai/config'
import { openaiProvider } from '@/lib/ai/providers/openai-provider'
import { claudeProvider } from '@/lib/ai/providers/claude-provider'

export interface SentimentOptions {
  language?: 'zh' | 'en' | 'auto'
  granularity?: 'document' | 'sentence' | 'aspect'
  includeEmotions?: boolean
  detailedAnalysis?: boolean
  customThresholds?: {
    positive: number
    negative: number
    neutral: number
  }
}

export interface SentimentResult {
  polarity: 'positive' | 'negative' | 'neutral'
  score: number // -1 到 1
  confidence: number // 0 到 1
  magnitude: number // 0 到 1
  emotions?: EmotionResult[]
  aspects?: AspectResult[]
  sentences?: SentenceSentiment[]
  provider: string
  metadata: {
    originalLength: number
    processingTime: number
    estimatedCost: number
    options: SentimentOptions
  }
}

export interface EmotionResult {
  emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'trust' | 'anticipation'
  score: number // 0 到 1
  confidence: number // 0 到 1
  keywords?: string[]
}

export interface AspectResult {
  aspect: string // 方面名称
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number // -1 到 1
  confidence: number // 0 到 1
  snippets: string[] // 相关文本片段
}

export interface SentenceSentiment {
  sentence: string
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number // -1 到 1
  confidence: number // 0 到 1
  startIndex: number
  endIndex: number
}

export class SentimentService extends BaseAIService {
  private logger = Logger.getInstance()

  constructor() {
    super('SentimentService')
  }

  /**
   * 分析文本情感
   */
  async analyzeSentiment(
    noteId: string,
    noteContent: string,
    options: SentimentOptions = {}
  ): Promise<SentimentResult> {
    const startTime = Date.now()
    this.logger.info('开始情感分析', { noteId, contentLength: noteContent.length })

    try {
      // 预处理内容
      const processedContent = this.preprocessContent(noteContent)
      if (!processedContent || processedContent.length < 10) {
        throw new Error('内容过短，无法进行情感分析')
      }

      // 检查预算
      const estimatedCost = this.estimateSentimentCost(processedContent, options)
      if (!(await this.checkBudget(estimatedCost))) {
        throw new Error('预算不足，无法进行情感分析')
      }

      // 选择最佳模型
      const provider = this.selectBestProvider(options)

      // 生成情感分析
      const result = await this.analyzeSentimentWithProvider(
        provider,
        processedContent,
        options
      )

      const sentimentResult: SentimentResult = {
        ...result,
        provider: provider.name,
        metadata: {
          originalLength: processedContent.length,
          processingTime: Date.now() - startTime,
          estimatedCost,
          options
        }
      }

      // 记录成功
      this.logger.info('情感分析完成', {
        noteId,
        provider: provider.name,
        sentiment: sentimentResult.polarity,
        score: sentimentResult.score,
        confidence: sentimentResult.confidence,
        processingTime: sentimentResult.metadata.processingTime
      })

      // 记录花费
      this.recordSpending(estimatedCost)

      return sentimentResult

    } catch (error) {
      this.logger.error('情感分析失败', {
        noteId,
        error: error.message,
        processingTime: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * 批量情感分析
   */
  async analyzeBatchSentiment(
    notes: Array<{
      id: string
      content: string
      options?: SentimentOptions
    }>
  ): Promise<Array<{
    noteId: string
    result?: SentimentResult
    error?: string
  }>> {
    this.logger.info('开始批量情感分析', { count: notes.length })

    const results = []
    const concurrencyLimit = 3 // 并发限制

    for (let i = 0; i < notes.length; i += concurrencyLimit) {
      const batch = notes.slice(i, i + concurrencyLimit)

      const batchPromises = batch.map(async (note) => {
        try {
          const result = await this.analyzeSentiment(
            note.id,
            note.content,
            note.options
          )
          return { noteId: note.id, result }
        } catch (error) {
          this.logger.warn('单个笔记情感分析失败', {
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

    const successCount = results.filter(r => r.result).length
    this.logger.info('批量情感分析完成', {
      total: notes.length,
      success: successCount,
      failed: notes.length - successCount
    })

    return results
  }

  /**
   * 使用指定提供商进行情感分析
   */
  private async analyzeSentimentWithProvider(
    provider: AIProvider,
    content: string,
    options: SentimentOptions
  ): Promise<Omit<SentimentResult, 'provider' | 'metadata'>> {
    const prompt = this.buildSentimentPrompt(content, options)

    switch (provider.name) {
      case 'openai':
        return await this.analyzeWithOpenAI(prompt, options, content)
      case 'anthropic':
        return await this.analyzeWithClaude(prompt, options, content)
      default:
        throw new Error(`不支持的提供商: ${provider.name}`)
    }
  }

  /**
   * 构建情感分析提示词
   */
  private buildSentimentPrompt(
    content: string,
    options: SentimentOptions
  ): string {
    const {
      language = 'zh',
      granularity = 'document',
      includeEmotions = false,
      detailedAnalysis = false,
      customThresholds
    } = options

    let prompt = ''

    // 基础指令
    const languageMap = {
      zh: '中文',
      en: 'English',
      auto: '中文（如果原文是中文）'
    }

    prompt += `请对以下文本进行情感分析，使用${languageMap[language]}进行分析和回答。\n\n`
    prompt += `文本内容：${content}\n\n`

    // 分析粒度要求
    switch (granularity) {
      case 'document':
        prompt += `分析要求：对整个文档进行整体情感分析。\n`
        break
      case 'sentence':
        prompt += `分析要求：对每个句子进行分别的情感分析。\n`
        break
      case 'aspect':
        prompt += `分析要求：进行基于方面的情感分析，识别文本中的不同方面及其情感倾向。\n`
        break
    }

    // 自定义阈值
    if (customThresholds) {
      prompt += `情感阈值设定：\n`
      prompt += `- 正面情感阈值：${customThresholds.positive}\n`
      prompt += `- 负面情感阈值：${customThresholds.negative}\n`
      prompt += `- 中性情感阈值：${customThresholds.neutral}\n\n`
    }

    // 情感分析要求
    prompt += `请提供以下分析结果：\n`
    prompt += `1. 情感极性 (positive/negative/neutral)\n`
    prompt += `2. 情感分数 (-1到1之间，-1最负面，1最正面，0中性)\n`
    prompt += `3. 置信度 (0到1之间)\n`
    prompt += `4. 情感强度/幅度 (0到1之间，表示情感的强烈程度)\n`

    // 附加分析
    if (includeEmotions) {
      prompt += `5. 具体情感类型分析 (joy, sadness, anger, fear, surprise, disgust等)\n`
    }

    if (detailedAnalysis) {
      prompt += `6. 详细的分析说明和理由\n`
    }

    // 输出格式要求
    prompt += `\n请严格按照以下JSON格式输出：
{
  "polarity": "positive|negative|neutral",
  "score": -1.0到1.0的数值,
  "confidence": 0.0到1.0的数值,
  "magnitude": 0.0到1.0的数值,
  ${includeEmotions ? '"emotions": [{"emotion": "joy", "score": 0.8, "confidence": 0.9, "keywords": ["开心", "快乐"]}],' : ''}
  ${granularity === 'aspect' ? '"aspects": [{"aspect": "方面名称", "sentiment": "positive", "score": 0.7, "confidence": 0.8, "snippets": ["相关文本片段"]}],' : ''}
  ${granularity === 'sentence' ? '"sentences": [{"sentence": "句子内容", "sentiment": "positive", "score": 0.8, "confidence": 0.9, "startIndex": 0, "endIndex": 10}],' : ''}
  ${detailedAnalysis ? '"reasoning": "详细分析说明",' : ''}
  "suggestions": ["改进建议1", "改进建议2"]
}`

    return prompt
  }

  /**
   * 使用OpenAI进行情感分析
   */
  private async analyzeWithOpenAI(
    prompt: string,
    options: SentimentOptions,
    originalContent: string
  ): Promise<Omit<SentimentResult, 'provider' | 'metadata'>> {
    try {
      const response = await openaiProvider.generateText({
        prompt,
        model: 'gpt-3.5-turbo',
        maxTokens: 800,
        temperature: 0.2
      })

      // 解析JSON响应
      const result = this.parseSentimentResponse(response.text)

      // 如果需要句子级分析，额外处理
      if (options.granularity === 'sentence' && !result.sentences) {
        result.sentences = await this.analyzeSentenceSentiment(originalContent)
      }

      return result

    } catch (error) {
      this.logger.error('OpenAI情感分析失败', { error: error.message })
      throw new Error(`OpenAI情感分析失败: ${error.message}`)
    }
  }

  /**
   * 使用Claude进行情感分析
   */
  private async analyzeWithClaude(
    prompt: string,
    options: SentimentOptions,
    originalContent: string
  ): Promise<Omit<SentimentResult, 'provider' | 'metadata'>> {
    try {
      const response = await claudeProvider.generateText({
        prompt,
        model: 'claude-3-haiku-20240307',
        maxTokens: 800,
        temperature: 0.2
      })

      const result = this.parseSentimentResponse(response.text)

      // 如果需要句子级分析，额外处理
      if (options.granularity === 'sentence' && !result.sentences) {
        result.sentences = await this.analyzeSentenceSentiment(originalContent)
      }

      return result

    } catch (error) {
      this.logger.error('Claude情感分析失败', { error: error.message })
      throw new Error(`Claude情感分析失败: ${error.message}`)
    }
  }

  /**
   * 解析情感分析响应
   */
  private parseSentimentResponse(response: string): Omit<SentimentResult, 'provider' | 'metadata'> {
    try {
      // 尝试解析JSON
      const cleanResponse = response.trim()
      if (cleanResponse.startsWith('{')) {
        const parsed = JSON.parse(cleanResponse)
        return {
          polarity: parsed.polarity || 'neutral',
          score: parsed.score || 0,
          confidence: parsed.confidence || 0.5,
          magnitude: parsed.magnitude || 0,
          emotions: parsed.emotions || [],
          aspects: parsed.aspects || [],
          sentences: parsed.sentences || []
        }
      }
    } catch (error) {
      this.logger.warn('JSON解析失败，尝试文本提取', { response: response.substring(0, 100) })
    }

    // 备用方案：简单规则分析
    return this.fallbackSentimentAnalysis(response)
  }

  /**
   * 备用情感分析（基于规则）
   */
  private fallbackSentimentAnalysis(text: string): Omit<SentimentResult, 'provider' | 'metadata'> {
    const positiveWords = ['好', '棒', '优秀', '喜欢', '开心', '满意', 'good', 'great', 'excellent', 'happy', 'love']
    const negativeWords = ['差', '糟糕', '讨厌', '不满', '难过', '失望', 'bad', 'terrible', 'hate', 'sad', 'disappointed']

    const lowerText = text.toLowerCase()
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length

    let polarity: 'positive' | 'negative' | 'neutral'
    let score: number

    if (positiveCount > negativeCount) {
      polarity = 'positive'
      score = Math.min(0.8, positiveCount / (positiveCount + negativeCount))
    } else if (negativeCount > positiveCount) {
      polarity = 'negative'
      score = Math.max(-0.8, -negativeCount / (positiveCount + negativeCount))
    } else {
      polarity = 'neutral'
      score = 0
    }

    return {
      polarity,
      score,
      confidence: 0.6,
      magnitude: Math.abs(score),
      emotions: [],
      aspects: [],
      sentences: []
    }
  }

  /**
   * 句子级情感分析
   */
  private async analyzeSentenceSentiment(content: string): Promise<SentenceSentiment[]> {
    const sentences = content.split(/[.!?。！？]/).filter(s => s.trim().length > 0)
    const results: SentenceSentiment[] = []

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim()
      if (sentence.length < 5) continue

      const startIndex = content.indexOf(sentence)
      const endIndex = startIndex + sentence.length

      // 简单的句子情感分析
      const sentiment = this.fallbackSentimentAnalysis(sentence)

      results.push({
        sentence,
        sentiment: sentiment.polarity,
        score: sentiment.score,
        confidence: sentiment.confidence,
        startIndex,
        endIndex
      })
    }

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

    // 保留文本内容，只清理空白
    return processed
  }

  /**
   * 选择最佳提供商
   */
  private selectBestProvider(options: SentimentOptions): AIProvider {
    // 情感分析优先使用OpenAI（情感分析表现更好）
    return aiConfig.providers.openai
  }

  /**
   * 估算情感分析成本
   */
  private estimateSentimentCost(content: string, options: SentimentOptions): number {
    // 简单的成本估算（基于内容长度和分析复杂度）
    let baseCost = content.length * 0.000001

    // 根据分析复杂度调整成本
    if (options.includeEmotions) baseCost *= 1.5
    if (options.granularity === 'sentence') baseCost *= 2.0
    if (options.granularity === 'aspect') baseCost *= 2.5
    if (options.detailedAnalysis) baseCost *= 1.3

    return baseCost
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 导出单例实例
export const sentimentService = new SentimentService()