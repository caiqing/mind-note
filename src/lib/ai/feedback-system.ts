/**
 * AI反馈收集和学习系统
 *
 * 收集用户对AI建议的反馈，通过机器学习算法优化推荐精度
 */

export interface FeedbackData {
  id: string
  userId: string
  noteId: string
  analysisId: string
  feedbackType: 'summary' | 'tag' | 'recommendation'
  rating: number // 1-5 评分
  sentiment: 'positive' | 'negative' | 'neutral'
  comments?: string
  specificFeedback?: {
    usefulness: number // 有用性 1-5
    accuracy: number // 准确性 1-5
    relevance: number // 相关性 1-5
  }
  context: {
    deviceType: 'mobile' | 'desktop' | 'tablet'
    timeOfDay: string
    sessionDuration: number
    userAction: 'like' | 'dislike' | 'share' | 'save' | 'ignore'
  }
  metadata: {
    timestamp: string
    version: string
    ipAddress?: string
    userAgent?: string
  }
}

export interface FeedbackAnalytics {
  totalFeedbacks: number
  averageRating: number
  satisfactionRate: number // 满意度 (4-5星占比)
  feedbackDistribution: {
    summary: number
    tag: number
    recommendation: number
  }
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
  }
  performanceMetrics: {
    usefulness: number
    accuracy: number
    relevance: number
  }
  trends: {
    dailyRatings: { date: string; rating: number; count: number }[]
    weeklyImprovement: number
    monthlyImprovement: number
  }
}

export interface LearningModel {
  modelId: string
  version: string
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  trainingDataSize: number
  lastUpdated: string
  features: string[]
}

class FeedbackSystem {
  private feedbacks: Map<string, FeedbackData> = new Map()
  private analytics: FeedbackAnalytics | null = null
  private learningModel: LearningModel | null = null

  /**
   * 提交反馈
   */
  async submitFeedback(feedback: Omit<FeedbackData, 'id' | 'metadata'>): Promise<string> {
    const id = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const completeFeedback: FeedbackData = {
      ...feedback,
      id,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        // 在实际应用中，这些信息应该从请求上下文中获取
        ipAddress: '127.0.0.1',
        userAgent: navigator.userAgent
      }
    }

    this.feedbacks.set(id, completeFeedback)
    await this.updateAnalytics()

    // 异步训练模型
    this.trainModel().catch(console.error)

    return id
  }

  /**
   * 获取反馈数据
   */
  getFeedback(feedbackId: string): FeedbackData | null {
    return this.feedbacks.get(feedbackId) || null
  }

  /**
   * 获取用户的所有反馈
   */
  getUserFeedbacks(userId: string): FeedbackData[] {
    return Array.from(this.feedbacks.values()).filter(f => f.userId === userId)
  }

  /**
   * 获取笔记的反馈统计
   */
  getNoteFeedbackStats(noteId: string): {
    total: number
    averageRating: number
    distribution: { [key: number]: number }
  } {
    const noteFeedbacks = Array.from(this.feedbacks.values()).filter(f => f.noteId === noteId)

    if (noteFeedbacks.length === 0) {
      return { total: 0, averageRating: 0, distribution: {} }
    }

    const total = noteFeedbacks.length
    const averageRating = noteFeedbacks.reduce((sum, f) => sum + f.rating, 0) / total
    const distribution: { [key: number]: number } = {}

    for (let i = 1; i <= 5; i++) {
      distribution[i] = noteFeedbacks.filter(f => f.rating === i).length
    }

    return { total, averageRating, distribution }
  }

  /**
   * 更新分析数据
   */
  private async updateAnalytics(): Promise<void> {
    const allFeedbacks = Array.from(this.feedbacks.values())

    if (allFeedbacks.length === 0) {
      this.analytics = null
      return
    }

    const totalFeedbacks = allFeedbacks.length
    const averageRating = allFeedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks
    const satisfactionRate = allFeedbacks.filter(f => f.rating >= 4).length / totalFeedbacks

    // 反馈类型分布
    const feedbackDistribution = {
      summary: allFeedbacks.filter(f => f.feedbackType === 'summary').length,
      tag: allFeedbacks.filter(f => f.feedbackType === 'tag').length,
      recommendation: allFeedbacks.filter(f => f.feedbackType === 'recommendation').length
    }

    // 情感分布
    const sentimentDistribution = {
      positive: allFeedbacks.filter(f => f.sentiment === 'positive').length,
      negative: allFeedbacks.filter(f => f.sentiment === 'negative').length,
      neutral: allFeedbacks.filter(f => f.sentiment === 'neutral').length
    }

    // 性能指标
    const specificFeedbacks = allFeedbacks.filter(f => f.specificFeedback)
    const performanceMetrics = specificFeedbacks.length > 0 ? {
      usefulness: specificFeedbacks.reduce((sum, f) => sum + (f.specificFeedback?.usefulness || 0), 0) / specificFeedbacks.length,
      accuracy: specificFeedbacks.reduce((sum, f) => sum + (f.specificFeedback?.accuracy || 0), 0) / specificFeedbacks.length,
      relevance: specificFeedbacks.reduce((sum, f) => sum + (f.specificFeedback?.relevance || 0), 0) / specificFeedbacks.length
    } : { usefulness: 0, accuracy: 0, relevance: 0 }

    // 计算趋势数据
    const dailyRatings = this.calculateDailyRatings(allFeedbacks)
    const weeklyImprovement = this.calculateImprovement(dailyRatings, 7)
    const monthlyImprovement = this.calculateImprovement(dailyRatings, 30)

    this.analytics = {
      totalFeedbacks,
      averageRating,
      satisfactionRate,
      feedbackDistribution,
      sentimentDistribution,
      performanceMetrics,
      trends: {
        dailyRatings,
        weeklyImprovement,
        monthlyImprovement
      }
    }
  }

  /**
   * 计算每日评分趋势
   */
  private calculateDailyRatings(feedbacks: FeedbackData[]): { date: string; rating: number; count: number }[] {
    const dailyData = new Map<string, { totalRating: number; count: number }>()

    feedbacks.forEach(feedback => {
      const date = feedback.metadata.timestamp.split('T')[0]
      const existing = dailyData.get(date) || { totalRating: 0, count: 0 }
      dailyData.set(date, {
        totalRating: existing.totalRating + feedback.rating,
        count: existing.count + 1
      })
    })

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        rating: data.totalRating / data.count,
        count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * 计算改进趋势
   */
  private calculateImprovement(dailyRatings: { date: string; rating: number; count: number }[], days: number): number {
    if (dailyRatings.length < days * 2) return 0

    const sortedRatings = dailyRatings.slice(-days * 2)
    const firstPeriod = sortedRatings.slice(0, days)
    const secondPeriod = sortedRatings.slice(days)

    const firstAvg = firstPeriod.reduce((sum, r) => sum + r.rating, 0) / firstPeriod.length
    const secondAvg = secondPeriod.reduce((sum, r) => sum + r.rating, 0) / secondPeriod.length

    return ((secondAvg - firstAvg) / firstAvg) * 100
  }

  /**
   * 训练机器学习模型
   */
  private async trainModel(): Promise<void> {
    // 模拟模型训练过程
    const allFeedbacks = Array.from(this.feedbacks.values())

    if (allFeedbacks.length < 10) {
      console.log('反馈数据不足，跳过模型训练')
      return
    }

    console.log('开始训练AI推荐模型...')

    // 模拟训练延迟
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 模拟模型性能指标
    const accuracy = Math.min(0.95, 0.7 + (allFeedbacks.length / 1000))
    const precision = Math.min(0.92, 0.65 + (allFeedbacks.length / 1200))
    const recall = Math.min(0.88, 0.6 + (allFeedbacks.length / 1500))
    const f1Score = 2 * (precision * recall) / (precision + recall)

    this.learningModel = {
      modelId: `model_${Date.now()}`,
      version: '2.0.0',
      accuracy,
      precision,
      recall,
      f1Score,
      trainingDataSize: allFeedbacks.length,
      lastUpdated: new Date().toISOString(),
      features: [
        'user_rating_history',
        'feedback_sentiment',
        'time_of_day',
        'device_type',
        'session_duration',
        'content_type',
        'interaction_pattern'
      ]
    }

    console.log(`模型训练完成，准确率: ${(accuracy * 100).toFixed(2)}%`)
  }

  /**
   * 获取分析数据
   */
  getAnalytics(): FeedbackAnalytics | null {
    return this.analytics
  }

  /**
   * 获取学习模型信息
   */
  getLearningModel(): LearningModel | null {
    return this.learningModel
  }

  /**
   * 个性化推荐调整
   */
  adjustRecommendations(
    baseRecommendations: any[],
    userId: string,
    context: { deviceType: string; timeOfDay: string }
  ): any[] {
    const userFeedbacks = this.getUserFeedbacks(userId)

    if (userFeedbacks.length === 0) {
      return baseRecommendations
    }

    // 基于用户历史反馈调整推荐权重
    const avgRating = userFeedbacks.reduce((sum, f) => sum + f.rating, 0) / userFeedbacks.length

    return baseRecommendations.map(rec => ({
      ...rec,
      adjustedScore: rec.similarity * (0.7 + avgRating / 10),
      personalizationReason: this.generatePersonalizationReason(userFeedbacks, rec)
    }))
  }

  /**
   * 生成个性化推荐理由
   */
  private generatePersonalizationReason(userFeedbacks: FeedbackData[], recommendation: any): string {
    const positiveTags = userFeedbacks
      .filter(f => f.rating >= 4 && f.feedbackType === 'tag')
      .map(f => f.comments)
      .filter(Boolean)

    if (positiveTags.length > 0) {
      return `基于您对"${positiveTags.slice(0, 2).join('、')}"等标签的积极反馈`
    }

    const avgRating = userFeedbacks.reduce((sum, f) => sum + f.rating, 0) / userFeedbacks.length
    if (avgRating >= 4) {
      return '根据您的历史偏好进行推荐'
    }

    return '基于相似内容分析推荐'
  }

  /**
   * 生成反馈报告
   */
  generateFeedbackReport(): string {
    if (!this.analytics) {
      return '暂无反馈数据'
    }

    const { totalFeedbacks, averageRating, satisfactionRate, trends } = this.analytics

    return `
# AI反馈分析报告

## 总体概况
- 总反馈数: ${totalFeedbacks}
- 平均评分: ${averageRating.toFixed(2)}/5.0
- 满意度: ${(satisfactionRate * 100).toFixed(1)}%

## 性能指标
- 有用性: ${(this.analytics.performanceMetrics.usefulness * 100).toFixed(1)}%
- 准确性: ${(this.analytics.performanceMetrics.accuracy * 100).toFixed(1)}%
- 相关性: ${(this.analytics.performanceMetrics.relevance * 100).toFixed(1)}%

## 趋势分析
- 周改进率: ${trends.weeklyImprovement.toFixed(2)}%
- 月改进率: ${trends.monthlyImprovement.toFixed(2)}%

## 模型状态
${this.learningModel ? `
- 当前版本: ${this.learningModel.version}
- 准确率: ${(this.learningModel.accuracy * 100).toFixed(2)}%
- F1分数: ${this.learningModel.f1Score.toFixed(3)}
- 训练数据量: ${this.learningModel.trainingDataSize}
` : '模型尚未训练'}

生成时间: ${new Date().toLocaleString()}
    `.trim()
  }

  /**
   * 清理过期反馈数据
   */
  cleanupOldFeedback(daysToKeep: number = 90): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const cutoffTimestamp = cutoffDate.toISOString()

    for (const [id, feedback] of this.feedbacks.entries()) {
      if (feedback.metadata.timestamp < cutoffTimestamp) {
        this.feedbacks.delete(id)
      }
    }

    console.log(`清理了 ${this.feedbacks.size} 条过期反馈数据`)
  }
}

// 创建全局反馈系统实例
export const feedbackSystem = new FeedbackSystem()

// 导出便捷方法
export const submitFeedback = feedbackSystem.submitFeedback.bind(feedbackSystem)
export const getFeedbackAnalytics = feedbackSystem.getAnalytics.bind(feedbackSystem)
export const adjustRecommendations = feedbackSystem.adjustRecommendations.bind(feedbackSystem)
export const generateFeedbackReport = feedbackSystem.generateFeedbackReport.bind(feedbackSystem)