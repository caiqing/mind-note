// AI分析核心服务

import { BaseAIService } from './base-service'
import { AnalysisOptions, AnalysisResult, AnalysisStatus, AnalysisType } from '@/lib/ai/types'
import { aiProviders, getDefaultProvider, getProviderByModel } from '@/lib/ai/config/providers'
import { AIServiceError, AIErrorType, ErrorHandler } from './error-handler'
import { logger } from './logger'
import { executeDBOperation } from '@/lib/database/connection-pool-manager'

export interface AnalysisContext {
  userId: string
  noteId: string
  noteTitle: string
  noteContent: string
  options: AnalysisOptions
  requestId: string
}

export interface AnalysisProgress {
  analysisId: string
  status: AnalysisStatus
  progress: number
  estimatedTime?: number
  startedAt?: Date
  completedAt?: Date
  result?: AnalysisResult
  error?: string
}

export class AIAnalysisService extends BaseAIService {
  private activeAnalyses: Map<string, AnalysisProgress> = new Map()

  constructor() {
    super('ai-analysis-service', 'multi-model')
  }

  /**
   * 分析笔记内容
   */
  async analyzeNote(
    userId: string,
    noteId: string,
    noteTitle: string,
    noteContent: string,
    options: AnalysisOptions
  ): Promise<AnalysisResult> {
    const requestId = this.generateRequestId()
    const startTime = Date.now()

    try {
      logger.logAnalysisStart(userId, noteId, this.providerId, requestId, options)

      // 验证输入
      this.validateInput(noteContent, options)

      // 检查预算
      const estimatedCost = this.estimateAnalysisCost(options)
      const budgetCheck = await this.checkUserBudget(userId, estimatedCost)
      if (!budgetCheck) {
        throw new AIServiceError(
          'Insufficient budget for analysis',
          AIErrorType.QUOTA_EXCEEDED_ERROR
        )
      }

      // 获取或创建分析记录
      const analysis = await this.getOrCreateAnalysis(noteId, userId, options)

      // 更新分析状态
      await this.updateAnalysisStatus(analysis.id, AnalysisStatus.PROCESSING)
      this.trackAnalysisProgress(analysis.id, requestId)

      // 执行分析
      const result = await this.performAnalysis(
        {
          userId,
          noteId,
          noteTitle,
          noteContent,
          options,
          requestId
        },
        analysis.id
      )

      // 保存结果
      await this.saveAnalysisResult(analysis.id, result)

      // 记录成功日志
      this.logAnalysisSuccess(userId, noteId, this.providerId, requestId, result)

      // 清理进度跟踪
      this.activeAnalyses.delete(requestId)

      return result

    } catch (error) {
      const responseTime = Date.now() - startTime

      // 记录失败日志
      logger.logAnalysisError(userId, noteId, this.providerId, requestId, error as Error)

      // 清理进度跟踪
      this.activeAnalyses.delete(requestId)

      // 重新抛出格式化的错误
      throw ErrorHandler.fromError(error, this.providerId)

    } finally {
      logger.info('AI分析完成', {
        userId,
        noteId,
        requestId,
        responseTime: Date.now() - startTime
      })
    }
  }

  /**
   * 批量分析笔记
   */
  async analyzeBatch(
    userId: string,
    noteIds: string[],
    options: AnalysisOptions
  ): Promise<{
    batchId: string
    results: Array<{ noteId: string; success: boolean; result?: AnalysisResult; error?: string }>
  }> {
    const batchId = this.generateRequestId()
    const results: Array<{ noteId: string; success: boolean; result?: AnalysisResult; error?: string }> = []

    logger.info('开始批量AI分析', {
      userId,
      batchId,
      noteCount: noteIds.length,
      analysisType: options.type
    })

    // 并行处理（限制并发数）
    const batchSize = aiConfig.settings.batchSize
    for (let i = 0; i < noteIds.length; i += batchSize) {
      const batch = noteIds.slice(i, i + batchSize)

      const batchPromises = batch.map(async (noteId) => {
        try {
          // 获取笔记内容
          const note = await this.getNoteContent(noteId)
          if (!note) {
            return { noteId, success: false, error: 'Note not found' }
          }

          const result = await this.analyzeNote(
            userId,
            noteId,
            note.title,
            note.content,
            options
          )

          return { noteId, success: true, result }

        } catch (error) {
          logger.error('批量分析中的笔记失败', {
            noteId,
            error: (error as Error).message
          })

          return {
            noteId,
            success: false,
            error: (error as Error).message
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // 添加延迟以避免速率限制
      if (i + batchSize < noteIds.length) {
        await this.sleep(1000)
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    logger.info('批量AI分析完成', {
      batchId,
      totalNotes: noteIds.length,
      successCount,
      errorCount,
      successRate: (successCount / noteIds.length) * 100
    })

    return { batchId, results }
  }

  /**
   * 获取分析状态
   */
  async getAnalysisStatus(analysisId: string): Promise<AnalysisProgress | null> {
    try {
      const analysis = await executeDBOperation(prisma => prisma.aIAnalysis.findUnique({
        where: { id: analysisId },
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        }
      })

      if (!analysis) {
        return null
      }

      return {
        analysisId: analysis.id,
        status: analysis.status as AnalysisStatus,
        progress: this.calculateProgress(analysis.status),
        startedAt: analysis.createdAt,
        completedAt: analysis.updatedAt,
        result: this.formatAnalysisResult(analysis),
        error: analysis.error
      }
    } catch (error) {
      logger.error('获取分析状态失败', {
        analysisId,
        error: (error as Error).message
      })
      throw new AIServiceError(
        'Failed to get analysis status',
        AIErrorType.UNKNOWN_ERROR,
        undefined,
        error
      )
    }
  }

  /**
   * 获取用户分析历史
   */
  async getUserAnalysisHistory(
    userId: string,
    options: {
      page?: number
      limit?: number
      type?: AnalysisType
      dateFrom?: Date
      dateTo?: Date
    } = {}
  ): Promise<{
    items: Array<{
      analysisId: string
      noteId: string
      noteTitle: string
      analysisType: string
      status: string
      model: string
      cost: number
      processingTime: number
      createdAt: string
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
    summary: {
      totalAnalyses: number
      totalCost: number
      avgProcessingTime: number
      successRate: number
    }
  }> {
    try {
      const page = options.page || 1
      const limit = options.limit || 20
      const skip = (page - 1) * limit

      const whereClause: any = {
        userId,
        ...(options.type && { analysisLogs: { some: { requestType: options.type } } }),
        ...(options.dateFrom && { createdAt: { gte: options.dateFrom } }),
        ...(options.dateTo && { createdAt: { lte: options.dateTo } })
      }

      const [items, total] = await Promise.all([
        executeDBOperation(prisma => prisma.aIAnalysis.findMany({
          where: whereClause,
          include: {
            note: {
              select: {
                id: true,
                title: true
              }
            },
            analysisLogs: {
              where: { success: true },
              select: {
                requestType: true,
                processingTime: true
              },
              take: 1,
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),

        executeDBOperation(prisma => prisma.aIAnalysis.count({ where: whereClause })
      ])

      const totalPages = Math.ceil(total / limit)

      // 计算汇总统计
      const [summaryData] = await Promise.all([
        executeDBOperation(prisma => prisma.aIAnalysis.count({ where: whereClause }),
        executeDBOperation(prisma => prisma.aIAnalysis.aggregate({
          where: { ...whereClause, analysisLogs: { some: { success: true } } },
          _sum: { cost: true, processingTime: true }
        }),
        executeDBOperation(prisma => prisma.aIAnalysis.count({
          where: { ...whereClause, status: AnalysisStatus.COMPLETED }
        })
      ])

      const formattedItems = items.map(analysis => ({
        analysisId: analysis.id,
        noteId: analysis.noteId,
        noteTitle: analysis.note?.title || 'Untitled',
        analysisType: analysis.analysisLogs[0]?.requestType || 'unknown',
        status: analysis.status,
        model: analysis.modelVersion,
        cost: Number(analysis.tokenCount * 0.00001), // 简化的成本计算
        processingTime: analysis.processingTime || 0,
        createdAt: analysis.createdAt.toISOString()
      }))

      return {
        items: formattedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        summary: {
          totalAnalyses: summaryData[0],
          totalCost: Number(summaryData[1]._sum.cost || 0),
          avgProcessingTime: Number(summaryData[1]._avg.processingTime || 0),
          successRate: (summaryData[2] / summaryData[0]) * 100
        }
      }

    } catch (error) {
      logger.error('获取分析历史失败', {
        userId,
        error: (error as Error).message
      })
      throw new AIServiceError(
        'Failed to get analysis history',
        AIErrorType.UNKNOWN_ERROR,
        undefined,
        error
      )
    }
  }

  /**
   * 重新分析
   */
  async reanalyze(
    userId: string,
    analysisId: string,
    options: AnalysisOptions
  ): Promise<AnalysisResult> {
    try {
      // 获取现有分析
      const existingAnalysis = await executeDBOperation(prisma => prisma.aIAnalysis.findUnique({
        where: { id: analysisId },
        include: {
          note: true
        }
      })

      if (!existingAnalysis) {
        throw new AIServiceError(
          'Analysis not found',
          AIErrorType.INVALID_REQUEST
        )
      }

      // 删除现有分析记录
      await executeDBOperation(prisma => prisma.aIAnalysis.delete({
        where: { id: analysisId }
      })

      logger.info('重新分析', {
        analysisId,
        userId,
        noteId: existingAnalysis.noteId
      })

      // 创建新的分析
      return await this.analyzeNote(
        userId,
        existingAnalysis.noteId,
        existingAnalysis.note?.title || 'Untitled',
        existingAnalysis.note?.content || '',
        { ...options, force: true }
      )

    } catch (error) {
      logger.error('重新分析失败', {
        analysisId,
        userId,
        error: (error as Error).message
      })
      throw ErrorHandler.fromError(error, this.providerId)
    }
  }

  // 私有方法

  private async performAnalysis(
    context: AnalysisContext,
    analysisId: string
  ): Promise<AnalysisResult> {
    const { noteContent, options } = context
    const { type, model, priority } = options

    try {
      // 根据分析类型选择提供商
      const provider = model
        ? getProviderByModel(model)
        : getDefaultProvider()

      if (!provider) {
        throw new AIServiceError(
          'No AI provider available',
          AIErrorType.MODEL_UNAVAILABLE
        )
      }

      // 根据分析类型执行不同的分析逻辑
      let result: AnalysisResult

      switch (type) {
        case 'summary':
          result = await this.analyzeSummary(noteContent, provider)
          break
        case 'sentiment':
          result = await this.analyzeSentiment(noteContent, provider)
          break
        case 'classification':
          result = await this.analyzeClassification(noteContent, provider)
          break
        case 'tags':
          result = await this.analyzeTags(noteContent, provider)
          break
        case 'key_concepts':
          result = await this.analyzeKeyConcepts(noteContent, provider)
          break
        case 'full_analysis':
          result = await this.analyzeFull(noteContent, provider)
          break
        default:
          throw new AIServiceError(
            `Unsupported analysis type: ${type}`,
            AIErrorType.INVALID_REQUEST
          )
      }

      // 设置元数据
      result.model = provider.defaultModel
      result.processingTime = Date.now() - Date.now() // 将在实际实现中计算

      return result

    } catch (error) {
      logger.error('分析执行失败', {
        analysisId,
        context,
        error: (error as Error).message
      })

      // 更新分析状态为失败
      await executeDBOperation(prisma => prisma.aIAnalysis.update({
        where: { id: analysisId },
        data: {
          status: AnalysisStatus.FAILED,
          error: (error as Error).message,
          updatedAt: new Date()
        }
      })

      throw ErrorHandler.fromError(error, this.providerId)
    }
  }

  private async analyzeSummary(content: string, provider: any): Promise<AnalysisResult> {
    // 这里应该调用实际的AI服务API
    // 暂时返回模拟数据
    const summary = this.generateSummary(content)

    return {
      summary: summary.text,
      sentiment: { type: summary.sentiment, confidence: summary.confidence },
      categories: summary.categories,
      tags: summary.tags,
      keyConcepts: summary.keyConcepts,
      model: provider.defaultModel,
      processingTime: 2000,
      tokenCount: 150,
      cost: 0.0075
    }
  }

  private async analyzeSentiment(content: string, provider: any): Promise<AnalysisResult> {
    const sentiment = this.analyzeSentimentManually(content)

    return {
      sentiment: { type: sentiment.type, confidence: sentiment.confidence, score: sentiment.score },
      model: provider.defaultModel,
      processingTime: 1000,
      tokenCount: 50,
      cost: 0.0025
    }
  }

  private async analyzeClassification(content: string, provider: any): Promise<AnalysisResult> {
    const categories = this.classifyContent(content)

    return {
      categories,
      model: provider.defaultModel,
      processingTime: 1500,
      tokenCount: 100,
      cost: 0.005
    }
  }

  private async analyzeTags(content: string, provider: any): Promise<AnalysisResult> {
    const tags = this.extractTags(content)

    return {
      tags,
      model: provider.defaultModel,
      processingTime: 1200,
      tokenCount: 80,
      cost: 0.004
    }
  }

  private async analyzeKeyConcepts(content: string, provider: any): Promise<AnalysisResult> {
    const concepts = this.extractKeyConcepts(content)

    return {
      keyConcepts: concepts,
      model: provider.defaultModel,
      processingTime: 1800,
      tokenCount: 120,
      cost: 0.006
    }
  }

  private async analyzeFull(content: string, provider: any): Promise<AnalysisResult> {
    // 组合所有分析结果
    const [summary, sentiment, categories, tags, concepts] = await Promise.all([
      this.analyzeSummary(content, provider),
      this.analyzeSentiment(content, provider),
      this.analyzeClassification(content, provider),
      this.analyzeTags(content, provider),
      this.analyzeKeyConcepts(content, provider)
    ])

    return {
      summary: summary.summary,
      sentiment: summary.sentiment,
      categories: summary.categories,
      tags: summary.tags,
      keyConcepts: summary.keyConcepts,
      model: provider.defaultModel,
      processingTime: Math.max(
        summary.processingTime,
        sentiment.processingTime,
        categories.processingTime,
        tags.processingTime,
        concepts.processingTime
      ),
      tokenCount: summary.tokenCount + sentiment.tokenCount + categories.tokenCount + tags.tokenCount + concepts.tokenCount,
      cost: summary.cost + sentiment.cost + categories.cost + tags.cost + concepts.cost
    }
  }

  // 模拟分析方法（在实际实现中应该调用真实的AI服务）
  private generateSummary(content: string) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
    const summaryText = sentences.slice(0, 3).join('. ') + '.'

    return {
      text: summaryText,
      sentiment: this.analyzeSentimentManually(content),
      confidence: 0.85,
      categories: this.classifyContent(content),
      tags: this.extractTags(content),
      keyConcepts: this.extractKeyConcepts(content)
    }
  }

  private analyzeSentimentManually(content: string) {
    const positiveWords = ['好', '棒', '优秀', '喜欢', '满意', '开心', '快乐', '兴奋', '感激']
    const negativeWords = ['坏', '差', '糟糕', '讨厌', '失望', '难过', '愤怒', '担心']

    let positiveScore = 0
    let negativeScore = 0

    positiveWords.forEach(word => {
      if (content.includes(word)) positiveScore++
    })

    negativeWords.forEach(word => {
      if (content.includes(word)) negativeScore++
    })

    if (positiveScore > negativeScore) {
      return { type: 'positive', confidence: Math.min(0.9, 0.5 + (positiveScore / (positiveScore + negativeScore)) * 0.4), score: positiveScore - negativeScore }
    } else if (negativeScore > positiveScore) {
      return { type: 'negative', confidence: Math.min(0.9, 0.5 + (negativeScore / (positiveScore + negativeScore)) * 0.4), score: positiveScore - negativeScore }
    } else {
      return { type: 'neutral', confidence: 0.7, score: 0 }
    }
  }

  private classifyContent(content: string) {
    const techKeywords = ['技术', '代码', '编程', '开发', '算法', '数据', '系统', '软件']
    const workKeywords = ['工作', '项目', '任务', '会议', '报告', '计划', '目标', '进度']
    const personalKeywords = ['个人', '生活', '家庭', '朋友', '健康', '心情', '日记', '感想']

    const categories = []

    if (techKeywords.some(keyword => content.includes(keyword))) {
      categories.push({ id: 'tech', name: '技术', confidence: 0.9 })
    }

    if (workKeywords.some(keyword => content.includes(keyword))) {
      categories.push({ id: 'work', name: '工作', confidence: 0.8 })
    }

    if (personalKeywords.some(keyword => content.includes(keyword))) {
      categories.push({ id: 'personal', name: '个人', confidence: 0.7 })
    }

    return categories
  }

  private extractTags(content: string) {
    // 简单的标签提取逻辑
    const words = content.toLowerCase().split(/\s+/)
    const commonWords = new Set(['的', '了', '是', '在', '有', '和', '与', '或', '但', '这', '那', '什么', '如何', '为什么'])

    const filteredWords = words.filter(word =>
      word.length > 2 && !commonWords.has(word) && !/\d+/.test(word)
    )

    // 统计词频
    const wordFreq: Record<string, number> = {}
    filteredWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    })

    // 返回出现频率最高的标签
    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word, freq]) => ({
        id: word,
        name: word,
        confidence: Math.min(0.9, 0.5 + (freq / 10) * 0.4),
        suggested: true
      }))
  }

  private extractKeyConcepts(content: string): string[] {
    // 简单的关键概念提取
    const concepts = []
    const sentences = content.split(/[.!?]+/)

    sentences.forEach(sentence => {
      const words = sentence.toLowerCase().split(/\s+/)
      const nouns = words.filter(word =>
        word.length > 4 && !word.endsWith('的') && !word.endsWith('了')
      )
      concepts.push(...nouns.slice(0, 3))
    })

    return [...new Set(concepts)].slice(0, 10)
  }

  private async getOrCreateAnalysis(
    noteId: string,
    userId: string,
    options: AnalysisOptions
  ) {
    // 检查是否已有分析记录
    const existing = await executeDBOperation(prisma => prisma.aIAnalysis.findUnique({
      where: { noteId }
    })

    if (existing && !options.force) {
      return existing
    }

    // 获取AI提供商ID
    const provider = getDefaultProvider()
    if (!provider) {
      throw new AIServiceError(
        'No AI provider available',
        AIErrorType.MODEL_UNAVAILABLE
      )
    }

    // 创建新的分析记录
    return await executeDBOperation(prisma => prisma.aIAnalysis.create({
      data: {
        noteId,
        userId,
        aiProviderId: provider.id,
        modelVersion: provider.defaultModel,
        status: AnalysisStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  private async updateAnalysisStatus(analysisId: string, status: AnalysisStatus): Promise<void> {
    await executeDBOperation(prisma => prisma.aIAnalysis.update({
      where: { id: analysisId },
      data: {
        status,
        updatedAt: new Date()
      }
    })
  }

  private async saveAnalysisResult(analysisId: string, result: AnalysisResult): Promise<void> {
    await executeDBOperation(prisma => prisma.aIAnalysis.update({
      where: { id: analysisId },
      data: {
        summary: result.summary,
        sentiment: result.sentiment?.type,
        keyConcepts: result.keyConcepts || [],
        categories: JSON.stringify(result.categories || []),
        tags: JSON.stringify(result.tags || []),
        confidence: result.confidence || 0,
        processingTime: result.processingTime,
        tokenCount: result.tokenCount,
        cost: result.cost,
        status: AnalysisStatus.COMPLETED,
        error: null,
        updatedAt: new Date()
      }
    })
  }

  private trackAnalysisProgress(analysisId: string, requestId: string): void {
    const progress: AnalysisProgress = {
      analysisId,
      status: AnalysisStatus.PROCESSING,
      progress: 0,
      startedAt: new Date()
    }

    this.activeAnalyses.set(requestId, progress)
  }

  private calculateProgress(status: AnalysisStatus): number {
    switch (status) {
      case AnalysisStatus.PENDING:
        return 0
      case AnalysisStatus.PROCESSING:
        return 50
      case AnalysisStatus.COMPLETED:
        return 100
      case AnalysisStatus.FAILED:
        return 0
      default:
        return 0
    }
  }

  private formatAnalysisResult(analysis: any): AnalysisResult {
    return {
      summary: analysis.summary,
      sentiment: analysis.sentiment ? {
        type: analysis.sentiment,
        confidence: Number(analysis.confidence)
      } : undefined,
      categories: analysis.categories ? JSON.parse(analysis.categories) : [],
      tags: analysis.tags ? JSON.parse(analysis.tags) : [],
      keyConcepts: analysis.keyConcepts || [],
      model: analysis.modelVersion,
      processingTime: analysis.processingTime || 0,
      tokenCount: analysis.tokenCount || 0,
      cost: Number(analysis.cost || 0)
    }
  }

  private async getNoteContent(noteId: string): Promise<{ id: string; title: string; content: string } | null> {
    try {
      const note = await executeDBOperation(prisma => prisma.note.findUnique({
        where: { id: noteId },
        select: {
          id: true,
          title: true,
          content: true
        }
      })

      return note
    } catch (error) {
      logger.error('获取笔记内容失败', {
        noteId,
        error: (error as Error).message
      })
      return null
    }
  }

  private estimateAnalysisCost(options: AnalysisOptions): number {
    // 简化的成本估算
    const baseCost = 0.01
    const multiplier = options.type === 'full_analysis' ? 3 : 1

    return baseCost * multiplier
  }

  private generateRequestId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 导出单例实例
export const aiAnalysisService = new AIAnalysisService()