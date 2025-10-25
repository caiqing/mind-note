/**
 * 智能推荐学习机制
 *
 * 基于用户反馈和机器学习算法，持续优化推荐精准度和个性化程度
 */

export interface UserProfile {
  userId: string
  interests: string[]
  expertise: Record<string, number> // 领域 expertise level 0-1
  readingHabits: {
    preferredLength: 'short' | 'medium' | 'long'
    preferredComplexity: 'beginner' | 'intermediate' | 'advanced'
    preferredTopics: string[]
    readingSpeed: number // words per minute
  }
  interactionPatterns: {
    likesCount: number
    sharesCount: number
    savesCount: number
    commentsCount: number
    avgRating: number
  }
  temporalPatterns: {
    mostActiveHour: number // 0-23
    mostActiveDay: number // 0-6
    sessionDuration: number // average in minutes
    lastActivity: string
  }
  contentPreferences: {
    tagWeights: Record<string, number>
    categoryWeights: Record<string, number>
    authorWeights: Record<string, number>
  }
  learningSignals: {
    clickthroughRate: number
    bounceRate: number
    engagementScore: number
    feedbackQuality: number
  }
}

export interface ContentVector {
  id: string
  features: {
    topics: number[] // TF-IDF vectors
    tags: string[]
    category: string
    complexity: number
    length: number
    readabilityScore: number
    sentiment: number // -1 to 1
  }
  metadata: {
    createdAt: string
    viewCount: number
    likeCount: number
    shareCount: number
    averageRating: number
    qualityScore: number
  }
}

export interface RecommendationSignal {
  userId: string
  contentId: string
  signalType: 'view' | 'like' | 'share' | 'save' | 'rating' | 'comment' | 'skip' | 'bounce'
  timestamp: string
  context: {
    source: 'search' | 'recommendation' | 'browse' | 'external'
    position: number // position in recommendation list
    sessionId: string
    deviceType: string
  }
  value?: number // rating value, dwell time, etc.
}

export interface LearningMetrics {
  precision: number
  recall: number
  f1Score: number
  mrr: number // Mean Reciprocal Rank
  coverage: number
  diversity: number
  novelty: number
  satisfaction: number
}

export interface RecommendationResult {
  contentId: string
  score: number
  explanation: string
  factors: {
    contentSimilarity: number
    userProfileMatch: number
    popularityBoost: number
    recencyBoost: number
    diversityPenalty: number
  }
  confidence: number
  strategy: 'collaborative' | 'content-based' | 'hybrid' | 'contextual'
}

class RecommendationLearningEngine {
  private userProfiles: Map<string, UserProfile> = new Map()
  private contentVectors: Map<string, ContentVector> = new Map()
  private signals: RecommendationSignal[] = []
  private models: {
    collaborativeFiltering: any
    contentBased: any
    contextualBandit: any
    deepLearning: any
  } = {
    collaborativeFiltering: null,
    contentBased: null,
    contextualBandit: null,
    deepLearning: null
  }

  private metrics: LearningMetrics = {
    precision: 0,
    recall: 0,
    f1Score: 0,
    mrr: 0,
    coverage: 0,
    diversity: 0,
    novelty: 0,
    satisfaction: 0
  }

  /**
   * 更新用户信号
   */
  updateSignal(signal: RecommendationSignal): void {
    this.signals.push(signal)
    this.updateUserProfile(signal)

    // 定期重训练模型
    if (this.signals.length % 100 === 0) {
      this.trainModels()
    }
  }

  /**
   * 更新用户画像
   */
  private updateUserProfile(signal: RecommendationSignal): void {
    const userId = signal.userId
    let profile = this.userProfiles.get(userId)

    if (!profile) {
      profile = this.createInitialProfile(userId)
      this.userProfiles.set(userId, profile)
    }

    // 更新交互模式
    switch (signal.signalType) {
      case 'like':
        profile.interactionPatterns.likesCount++
        profile.contentPreferences.tagWeights = this.updateTagWeights(
          profile.contentPreferences.tagWeights,
          signal.contentId,
          0.1
        )
        break
      case 'share':
        profile.interactionPatterns.sharesCount++
        break
      case 'save':
        profile.interactionPatterns.savesCount++
        break
      case 'rating':
        if (signal.value) {
          profile.interactionPatterns.avgRating =
            (profile.interactionPatterns.avgRating * profile.interactionPatterns.likesCount + signal.value) /
            (profile.interactionPatterns.likesCount + 1)
        }
        break
    }

    // 更新时间模式
    const date = new Date(signal.timestamp)
    profile.temporalPatterns.lastActivity = signal.timestamp
    profile.temporalPatterns.mostActiveHour = date.getHours()
    profile.temporalPatterns.mostActiveDay = date.getDay()

    // 更新学习信号
    this.updateLearningSignals(profile, signal)
  }

  /**
   * 创建初始用户画像
   */
  private createInitialProfile(userId: string): UserProfile {
    return {
      userId,
      interests: [],
      expertise: {},
      readingHabits: {
        preferredLength: 'medium',
        preferredComplexity: 'intermediate',
        preferredTopics: [],
        readingSpeed: 200 // average reading speed
      },
      interactionPatterns: {
        likesCount: 0,
        sharesCount: 0,
        savesCount: 0,
        commentsCount: 0,
        avgRating: 0
      },
      temporalPatterns: {
        mostActiveHour: 12,
        mostActiveDay: 1,
        sessionDuration: 15,
        lastActivity: new Date().toISOString()
      },
      contentPreferences: {
        tagWeights: {},
        categoryWeights: {},
        authorWeights: {}
      },
      learningSignals: {
        clickthroughRate: 0,
        bounceRate: 0,
        engagementScore: 0,
        feedbackQuality: 0
      }
    }
  }

  /**
   * 更新标签权重
   */
  private updateTagWeights(currentWeights: Record<string, number>, contentId: string, delta: number): Record<string, number> {
    const content = this.contentVectors.get(contentId)
    if (!content) return currentWeights

    const newWeights = { ...currentWeights }
    content.features.tags.forEach(tag => {
      newWeights[tag] = (newWeights[tag] || 0) + delta
    })

    // 归一化权重
    const totalWeight = Object.values(newWeights).reduce((sum, weight) => sum + Math.abs(weight), 0)
    if (totalWeight > 0) {
      Object.keys(newWeights).forEach(tag => {
        newWeights[tag] = newWeights[tag] / totalWeight
      })
    }

    return newWeights
  }

  /**
   * 更新学习信号
   */
  private updateLearningSignals(profile: UserProfile, signal: RecommendationSignal): void {
    // 更新点击率
    if (signal.signalType === 'view') {
      profile.learningSignals.clickthroughRate =
        (profile.learningSignals.clickthroughRate * 0.9) + (signal.position === 0 ? 0.1 : 0)
    }

    // 更新跳出率
    if (signal.signalType === 'bounce') {
      profile.learningSignals.bounceRate =
        (profile.learningSignals.bounceRate * 0.9) + 0.1
    }

    // 更新参与度评分
    const engagementValue = this.calculateEngagementValue(signal)
    profile.learningSignals.engagementScore =
      (profile.learningSignals.engagementScore * 0.95) + (engagementValue * 0.05)
  }

  /**
   * 计算参与度值
   */
  private calculateEngagementValue(signal: RecommendationSignal): number {
    const engagementMap = {
      'view': 0.1,
      'like': 0.5,
      'share': 0.7,
      'save': 0.8,
      'rating': 0.6,
      'comment': 0.9,
      'skip': -0.2,
      'bounce': -0.5
    }

    return engagementMap[signal.signalType] || 0
  }

  /**
   * 训练推荐模型
   */
  async trainModels(): Promise<void> {
    console.log('开始训练推荐模型...')

    // 准备训练数据
    const trainingData = this.prepareTrainingData()

    // 训练协同过滤模型
    this.models.collaborativeFiltering = await this.trainCollaborativeFiltering(trainingData)

    // 训练基于内容的模型
    this.models.contentBased = await this.trainContentBased(trainingData)

    // 训练上下文bandit模型
    this.models.contextualBandit = await this.trainContextualBandit(trainingData)

    // 训练深度学习模型
    if (trainingData.length > 1000) {
      this.models.deepLearning = await this.trainDeepLearning(trainingData)
    }

    console.log('推荐模型训练完成')
  }

  /**
   * 准备训练数据
   */
  private prepareTrainingData(): any[] {
    // 将信号转换为训练数据格式
    return this.signals.map(signal => ({
      userId: signal.userId,
      contentId: signal.contentId,
      rating: this.signalToRating(signal),
      context: signal.context,
      timestamp: signal.timestamp
    }))
  }

  /**
   * 信号转评分
   */
  private signalToRating(signal: RecommendationSignal): number {
    const ratingMap = {
      'like': 5,
      'share': 5,
      'save': 4,
      'rating': signal.value || 3,
      'comment': 4,
      'view': 3,
      'skip': 1,
      'bounce': 1
    }

    return ratingMap[signal.signalType] || 3
  }

  /**
   * 训练协同过滤模型
   */
  private async trainCollaborativeFiltering(trainingData: any[]): Promise<any> {
    // 简化的协同过滤实现
    // 在实际应用中，这里会使用更复杂的算法如矩阵分解
    const userItemMatrix = this.buildUserItemMatrix(trainingData)

    return {
      type: 'collaborative-filtering',
      matrix: userItemMatrix,
      trainedAt: new Date().toISOString()
    }
  }

  /**
   * 训练基于内容的模型
   */
  private async trainContentBased(trainingData: any[]): Promise<any> {
    // 简化的基于内容的推荐实现
    const contentSimilarityMatrix = this.buildContentSimilarityMatrix()

    return {
      type: 'content-based',
      similarityMatrix: contentSimilarityMatrix,
      trainedAt: new Date().toISOString()
    }
  }

  /**
   * 训练上下文bandit模型
   */
  private async trainContextualBandit(trainingData: any[]): Promise<any> {
    // 简化的多臂bandit实现
    const contextFeatures = this.extractContextFeatures(trainingData)

    return {
      type: 'contextual-bandit',
      features: contextFeatures,
      arms: ['collaborative', 'content-based', 'popularity', 'recency'],
      trainedAt: new Date().toISOString()
    }
  }

  /**
   * 训练深度学习模型
   */
  private async trainDeepLearning(trainingData: any[]): Promise<any> {
    // 模拟深度学习模型训练
    // 在实际应用中，这里会使用TensorFlow.js或类似的库

    return {
      type: 'deep-learning',
      architecture: 'neural-collaborative-filtering',
      layers: [128, 64, 32],
      trainedAt: new Date().toISOString(),
      accuracy: 0.85 + Math.random() * 0.1
    }
  }

  /**
   * 构建用户-物品矩阵
   */
  private buildUserItemMatrix(trainingData: any[]): any {
    const matrix = new Map()

    trainingData.forEach(data => {
      if (!matrix.has(data.userId)) {
        matrix.set(data.userId, {})
      }
      matrix.get(data.userId)[data.contentId] = data.rating
    })

    return matrix
  }

  /**
   * 构建内容相似度矩阵
   */
  private buildContentSimilarityMatrix(): any {
    const similarityMatrix = new Map()

    // 简化的内容相似度计算
    this.contentVectors.forEach((content1, id1) => {
      similarityMatrix.set(id1, new Map())

      this.contentVectors.forEach((content2, id2) => {
        if (id1 !== id2) {
          const similarity = this.calculateContentSimilarity(content1, content2)
          similarityMatrix.get(id1).set(id2, similarity)
        }
      })
    })

    return similarityMatrix
  }

  /**
   * 计算内容相似度
   */
  private calculateContentSimilarity(content1: ContentVector, content2: ContentVector): number {
    // 基于标签的Jaccard相似度
    const tags1 = new Set(content1.features.tags)
    const tags2 = new Set(content2.features.tags)
    const intersection = new Set([...tags1].filter(tag => tags2.has(tag)))
    const union = new Set([...tags1, ...tags2])

    const tagSimilarity = intersection.size / union.size

    // 基于类别的相似度
    const categorySimilarity = content1.features.category === content2.features.category ? 1 : 0

    // 基于复杂度的相似度
    const complexitySimilarity = 1 - Math.abs(content1.features.complexity - content2.features.complexity)

    // 综合相似度
    return (tagSimilarity * 0.6) + (categorySimilarity * 0.2) + (complexitySimilarity * 0.2)
  }

  /**
   * 提取上下文特征
   */
  private extractContextFeatures(trainingData: any[]): string[] {
    const features = new Set<string>()

    trainingData.forEach(data => {
      features.add(`device_${data.context.deviceType}`)
      features.add(`source_${data.context.source}`)
      features.add(`position_${Math.min(data.context.position, 5)}`)
    })

    return Array.from(features)
  }

  /**
   * 生成推荐
   */
  generateRecommendations(
    userId: string,
    candidateContentIds: string[],
    count: number = 10
  ): RecommendationResult[] {
    const profile = this.userProfiles.get(userId)
    if (!profile) {
      return this.generateColdStartRecommendations(candidateContentIds, count)
    }

    const recommendations: RecommendationResult[] = []

    for (const contentId of candidateContentIds) {
      const result = this.scoreContent(userId, contentId, profile)
      if (result.score > 0) {
        recommendations.push(result)
      }
    }

    // 排序并返回前N个
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
  }

  /**
   * 评分内容
   */
  private scoreContent(userId: string, contentId: string, profile: UserProfile): RecommendationResult {
    const content = this.contentVectors.get(contentId)
    if (!content) {
      return this.createEmptyResult(contentId)
    }

    // 协同过滤评分
    const collaborativeScore = this.calculateCollaborativeScore(userId, contentId)

    // 基于内容评分
    const contentScore = this.calculateContentScore(profile, content)

    // 上下文bandit评分
    const contextualScore = this.calculateContextualScore(userId, contentId)

    // 深度学习评分
    const deepLearningScore = this.calculateDeepLearningScore(userId, contentId)

    // 综合评分
    const finalScore = this.combineScores([
      { score: collaborativeScore, weight: 0.3 },
      { score: contentScore, weight: 0.4 },
      { score: contextualScore, weight: 0.2 },
      { score: deepLearningScore, weight: 0.1 }
    ])

    // 生成解释
    const explanation = this.generateExplanation(profile, content, {
      collaborative: collaborativeScore,
      content: contentScore,
      contextual: contextualScore,
      deepLearning: deepLearningScore
    })

    return {
      contentId,
      score: finalScore,
      explanation,
      factors: {
        contentSimilarity: contentScore,
        userProfileMatch: collaborativeScore,
        popularityBoost: content.metadata.viewCount / 1000,
        recencyBoost: this.calculateRecencyBoost(content),
        diversityPenalty: 0
      },
      confidence: this.calculateConfidence(finalScore),
      strategy: this.determineStrategy(collaborativeScore, contentScore, contextualScore, deepLearningScore)
    }
  }

  /**
   * 计算协同过滤评分
   */
  private calculateCollaborativeScore(userId: string, contentId: string): number {
    // 简化实现：基于用户相似度
    const userSignals = this.signals.filter(s => s.userId === userId)
    const contentSignals = this.signals.filter(s => s.contentId === contentId)

    if (userSignals.length === 0 || contentSignals.length === 0) {
      return 0
    }

    // 找到相似用户
    const similarUsers = this.findSimilarUsers(userId, 10)
    let score = 0
    let count = 0

    similarUsers.forEach(similarUserId => {
      const similarUserSignal = this.signals.find(s =>
        s.userId === similarUserId && s.contentId === contentId
      )
      if (similarUserSignal) {
        score += this.signalToRating(similarUserSignal)
        count++
      }
    })

    return count > 0 ? score / count : 0
  }

  /**
   * 计算基于内容的评分
   */
  private calculateContentScore(profile: UserProfile, content: ContentVector): number {
    let score = 0

    // 基于标签权重的评分
    content.features.tags.forEach(tag => {
      score += (profile.contentPreferences.tagWeights[tag] || 0)
    })

    // 基于类别偏好的评分
    score += (profile.contentPreferences.categoryWeights[content.features.category] || 0)

    // 基于复杂度匹配的评分
    const complexityMatch = this.calculateComplexityMatch(profile, content.features.complexity)
    score += complexityMatch * 0.2

    return Math.min(score, 1)
  }

  /**
   * 计算上下文bandit评分
   */
  private calculateContextualScore(userId: string, contentId: string): number {
    // 简化实现：基于时间和设备模式
    const profile = this.userProfiles.get(userId)
    if (!profile) return 0

    const currentHour = new Date().getHours()
    const hourMatch = currentHour === profile.temporalPatterns.mostActiveHour ? 0.8 : 0.2

    return hourMatch
  }

  /**
   * 计算深度学习评分
   */
  private calculateDeepLearningScore(userId: string, contentId: string): number {
    if (!this.models.deepLearning) return 0

    // 简化实现：返回模型准确度
    return this.models.deepLearning.accuracy || 0
  }

  /**
   * 组合多个评分
   */
  private combineScores(scores: { score: number; weight: number }[]): number {
    return scores.reduce((sum, { score, weight }) => sum + score * weight, 0)
  }

  /**
   * 生成推荐解释
   */
  private generateExplanation(
    profile: UserProfile,
    content: ContentVector,
    scores: { collaborative: number; content: number; contextual: number; deepLearning: number }
  ): string {
    const explanations = []

    if (scores.content > 0.7) {
      explanations.push('基于您的兴趣偏好')
    }

    if (scores.collaborative > 0.7) {
      explanations.push('相似用户也喜欢')
    }

    if (scores.contextual > 0.5) {
      explanations.push('符合您的使用习惯')
    }

    if (content.metadata.averageRating > 4.5) {
      explanations.push('高质量内容')
    }

    return explanations.length > 0
      ? explanations.join('，') + '推荐'
      : '系统推荐'
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(score: number): number {
    // 基于评分计算置信度
    return Math.min(score + 0.1, 1)
  }

  /**
   * 确定推荐策略
   */
  private determineStrategy(
    collaborative: number,
    content: number,
    contextual: number,
    deepLearning: number
  ): 'collaborative' | 'content-based' | 'hybrid' | 'contextual' {
    const scores = { collaborative, content, contextual, deepLearning }
    const maxScore = Math.max(...Object.values(scores))

    if (maxScore === collaborative) return 'collaborative'
    if (maxScore === content) return 'content-based'
    if (maxScore === contextual) return 'contextual'
    return 'hybrid'
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(contentId: string): RecommendationResult {
    return {
      contentId,
      score: 0,
      explanation: '内容信息不足',
      factors: {
        contentSimilarity: 0,
        userProfileMatch: 0,
        popularityBoost: 0,
        recencyBoost: 0,
        diversityPenalty: 0
      },
      confidence: 0,
      strategy: 'content-based'
    }
  }

  /**
   * 生成冷启动推荐
   */
  private generateColdStartRecommendations(candidateContentIds: string[], count: number): RecommendationResult[] {
    return candidateContentIds
      .slice(0, count)
      .map(contentId => ({
        contentId,
        score: 0.5,
        explanation: '热门内容推荐',
        factors: {
          contentSimilarity: 0,
          userProfileMatch: 0,
          popularityBoost: 0.5,
          recencyBoost: 0.3,
          diversityPenalty: 0
        },
        confidence: 0.3,
        strategy: 'hybrid'
      }))
  }

  /**
   * 查找相似用户
   */
  private findSimilarUsers(userId: string, limit: number): string[] {
    const targetSignals = this.signals.filter(s => s.userId === userId)
    const userScores = new Map<string, number>()

    // 计算与其他用户的相似度
    this.signals.forEach(signal => {
      if (signal.userId !== userId) {
        const similarity = this.calculateUserSimilarity(targetSignals, signal.userId)
        userScores.set(signal.userId, similarity)
      }
    })

    // 返回最相似的用户
    return Array.from(userScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId]) => userId)
  }

  /**
   * 计算用户相似度
   */
  private calculateUserSimilarity(targetSignals: RecommendationSignal[], userId: string): number {
    const userSignals = this.signals.filter(s => s.userId === userId)

    // 简化的相似度计算：基于共同内容
    const targetContentIds = new Set(targetSignals.map(s => s.contentId))
    const userContentIds = new Set(userSignals.map(s => s.contentId))

    const intersection = new Set([...targetContentIds].filter(id => userContentIds.has(id)))
    const union = new Set([...targetContentIds, ...userContentIds])

    return intersection.size / union.size
  }

  /**
   * 计算复杂度匹配
   */
  private calculateComplexityMatch(profile: UserProfile, contentComplexity: number): number {
    const complexityMap = {
      'beginner': 0.3,
      'intermediate': 0.6,
      'advanced': 0.9
    }

    const userComplexity = complexityMap[profile.readingHabits.preferredComplexity]
    return 1 - Math.abs(userComplexity - contentComplexity)
  }

  /**
   * 计算时效性提升
   */
  private calculateRecencyBoost(content: ContentVector): number {
    const daysSinceCreation = (Date.now() - new Date(content.metadata.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return Math.max(0, 1 - daysSinceCreation / 30) // 30天内的新内容有提升
  }

  /**
   * 添加内容向量
   */
  addContentVector(contentVector: ContentVector): void {
    this.contentVectors.set(contentVector.id, contentVector)
  }

  /**
   * 获取推荐指标
   */
  getMetrics(): LearningMetrics {
    this.updateMetrics()
    return this.metrics
  }

  /**
   * 更新指标
   */
  private updateMetrics(): void {
    // 简化的指标计算
    // 在实际应用中，这里会计算更精确的指标

    const totalSignals = this.signals.length
    if (totalSignals === 0) return

    const positiveSignals = this.signals.filter(s =>
      ['like', 'share', 'save'].includes(s.signalType)
    ).length

    this.metrics.precision = positiveSignals / totalSignals
    this.metrics.satisfaction = positiveSignals / totalSignals
    this.metrics.coverage = this.userProfiles.size / 100 // 假设100个目标用户
  }

  /**
   * 获取用户画像
   */
  getUserProfile(userId: string): UserProfile | null {
    return this.userProfiles.get(userId) || null
  }

  /**
   * 清理过期数据
   */
  cleanup(olderThanDays: number = 90): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    // 清理过期信号
    this.signals = this.signals.filter(signal =>
      new Date(signal.timestamp) > cutoffDate
    )

    // 清理不活跃用户画像
    for (const [userId, profile] of this.userProfiles.entries()) {
      if (new Date(profile.temporalPatterns.lastActivity) < cutoffDate) {
        this.userProfiles.delete(userId)
      }
    }

    console.log(`清理了 ${this.signals.length} 条信号和 ${this.userProfiles.size} 个用户画像`)
  }
}

// 创建全局推荐学习引擎实例
export const recommendationLearningEngine = new RecommendationLearningEngine()

// 导出便捷方法
export const updateRecommendationSignal = recommendationLearningEngine.updateSignal.bind(recommendationLearningEngine)
export const generateRecommendations = recommendationLearningEngine.generateRecommendations.bind(recommendationLearningEngine)
export const addContentVector = recommendationLearningEngine.addContentVector.bind(recommendationLearningEngine)