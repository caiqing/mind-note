/**
 * AI用户反馈收集系统
 *
 * 收集、分析和学习用户对AI建议的反馈，持续改进算法精度
 */

import { v4 as uuidv4 } from 'uuid';

export interface FeedbackItem {
  /** 反馈ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 反馈类型 */
  feedbackType: 'summary' | 'tag' | 'recommendation' | 'search' | 'analysis';
  /** 反馈值 */
  value: 'positive' | 'negative' | 'helpful' | 'not-helpful' | 'neutral';
  /** 评分 (1-5) */
  rating?: number;
  /** 反馈内容 */
  content?: string;
  /** 关联的实体ID */
  entityId: string;
  /** 反馈上下文 */
  context: {
    /** 原始AI建议内容 */
    originalSuggestion: string;
    /** 用户修改后的内容 */
    userModifiedContent?: string;
    /** 会话ID */
    sessionId: string;
    /** 页面路径 */
    pagePath: string;
    /** 设备信息 */
    deviceInfo: {
      userAgent: string;
      viewport: { width: number; height: number };
      isMobile: boolean;
    };
    /** 时间戳 */
    timestamp: string;
    /** 反应时间（毫秒） */
    responseTime: number;
  };
  /** 反馈元数据 */
  metadata: {
    /** AI模型版本 */
    modelVersion: string;
    /** 算法参数 */
    algorithmParams?: Record<string, any>;
    /** 置信度 */
    confidence?: number;
    /** 相关标签 */
    relevantTags?: string[];
    /** 用户历史反馈数量 */
    userFeedbackCount: number;
  };
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

export interface FeedbackAnalytics {
  /** 总反馈数量 */
  totalFeedbacks: number;
  /** 正面反馈率 */
  positiveFeedbackRate: number;
  /** 平均评分 */
  averageRating: number;
  /** 按类型统计 */
  feedbackByType: Record<string, {
    count: number;
    positiveRate: number;
    averageRating: number;
  }>;
  /** 按时间统计 */
  feedbackByTime: Record<string, number>;
  /** 用户参与度 */
  userEngagement: {
    uniqueUsers: number;
    averageFeedbacksPerUser: number;
    retentionRate: number;
  };
  /** 改进建议 */
  improvementSuggestions: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    affectedCount: number;
  }>;
}

export interface FeedbackPattern {
  /** 模式ID */
  id: string;
  /** 模式类型 */
  patternType: 'negative_pattern' | 'positive_pattern' | 'improvement_area';
  /** 模式描述 */
  description: string;
  /** 出现频率 */
  frequency: number;
  /** 影响范围 */
  impact: {
    affectedUsers: number;
    affectedEntities: number;
    overallImpact: number;
  };
  /** 建议措施 */
  recommendedActions: string[];
  /** 创建时间 */
  createdAt: string;
}

class FeedbackCollector {
  private feedbacks: Map<string, FeedbackItem> = new Map();
  private analytics: FeedbackAnalytics | null = null;
  private patterns: FeedbackPattern[] = [];
  private isInitialized = false;

  /**
   * 初始化反馈收集器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 加载历史反馈数据
      await this.loadHistoricalFeedbacks();

      // 计算分析数据
      await this.calculateAnalytics();

      // 识别反馈模式
      await this.identifyPatterns();

      this.isInitialized = true;
      console.log('Feedback collector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize feedback collector:', error);
      throw error;
    }
  }

  /**
   * 收集用户反馈
   */
  async collectFeedback(feedbackData: Omit<FeedbackItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeedbackItem> {
    const feedback: FeedbackItem = {
      ...feedbackData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 存储反馈
    this.feedbacks.set(feedback.id, feedback);

    // 实时更新分析数据
    await this.updateAnalytics(feedback);

    // 检查是否需要触发重新训练
    await this.checkRetrainingTrigger(feedback);

    console.log(`Feedback collected: ${feedback.id} for ${feedback.feedbackType}`);
    return feedback;
  }

  /**
   * 批量收集反馈
   */
  async collectBatchFeedbacks(feedbacksData: Omit<FeedbackItem, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<FeedbackItem[]> {
    const feedbacks: FeedbackItem[] = [];

    for (const feedbackData of feedbacksData) {
      const feedback = await this.collectFeedback(feedbackData);
      feedbacks.push(feedback);
    }

    return feedbacks;
  }

  /**
   * 获取反馈分析数据
   */
  async getAnalytics(timeRange?: { start: string; end: string }): Promise<FeedbackAnalytics> {
    if (!this.analytics) {
      await this.calculateAnalytics();
    }

    if (timeRange) {
      return this.filterAnalyticsByTimeRange(this.analytics!, timeRange);
    }

    return this.analytics!;
  }

  /**
   * 获取用户反馈历史
   */
  async getUserFeedbackHistory(userId: string, limit = 50): Promise<FeedbackItem[]> {
    const userFeedbacks = Array.from(this.feedbacks.values())
      .filter(feedback => feedback.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return userFeedbacks;
  }

  /**
   * 获取实体的反馈统计
   */
  async getEntityFeedbackStats(entityId: string): Promise<{
    totalFeedbacks: number;
    positiveRate: number;
    averageRating: number;
    recentFeedbacks: FeedbackItem[];
  }> {
    const entityFeedbacks = Array.from(this.feedbacks.values())
      .filter(feedback => feedback.entityId === entityId);

    const positiveFeedbacks = entityFeedbacks.filter(f =>
      f.value === 'positive' || f.value === 'helpful'
    );

    const ratings = entityFeedbacks
      .filter(f => f.rating !== undefined)
      .map(f => f.rating!);

    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;

    const recentFeedbacks = entityFeedbacks
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalFeedbacks: entityFeedbacks.length,
      positiveRate: entityFeedbacks.length > 0 ? positiveFeedbacks.length / entityFeedbacks.length : 0,
      averageRating,
      recentFeedbacks,
    };
  }

  /**
   * 获取改进建议
   */
  async getImprovementSuggestions(): Promise<FeedbackPattern[]> {
    return this.patterns.filter(pattern =>
      pattern.patternType === 'negative_pattern' || pattern.patternType === 'improvement_area'
    );
  }

  /**
   * 导出反馈数据
   */
  async exportFeedbackData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const feedbacks = Array.from(this.feedbacks.values());

    if (format === 'csv') {
      return this.convertToCSV(feedbacks);
    }

    return JSON.stringify({
      feedbacks,
      analytics: await this.getAnalytics(),
      patterns: this.patterns,
      exportTime: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(retentionDays = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let cleanedCount = 0;
    for (const [id, feedback] of this.feedbacks.entries()) {
      if (new Date(feedback.createdAt) < cutoffDate) {
        this.feedbacks.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      await this.calculateAnalytics();
      console.log(`Cleaned up ${cleanedCount} expired feedback records`);
    }
  }

  /**
   * 加载历史反馈数据
   */
  private async loadHistoricalFeedbacks(): Promise<void> {
    try {
      // 这里可以从数据库或文件系统加载历史数据
      // 暂时使用模拟数据
      const mockFeedbacks = this.generateMockFeedbacks(100);

      for (const feedback of mockFeedbacks) {
        this.feedbacks.set(feedback.id, feedback);
      }

      console.log(`Loaded ${mockFeedbacks.length} historical feedbacks`);
    } catch (error) {
      console.error('Failed to load historical feedbacks:', error);
    }
  }

  /**
   * 计算分析数据
   */
  private async calculateAnalytics(): Promise<void> {
    const feedbacks = Array.from(this.feedbacks.values());

    if (feedbacks.length === 0) {
      this.analytics = {
        totalFeedbacks: 0,
        positiveFeedbackRate: 0,
        averageRating: 0,
        feedbackByType: {},
        feedbackByTime: {},
        userEngagement: {
          uniqueUsers: 0,
          averageFeedbacksPerUser: 0,
          retentionRate: 0,
        },
        improvementSuggestions: [],
      };
      return;
    }

    const totalFeedbacks = feedbacks.length;
    const positiveFeedbacks = feedbacks.filter(f =>
      f.value === 'positive' || f.value === 'helpful'
    );

    const ratings = feedbacks.filter(f => f.rating !== undefined).map(f => f.rating!);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;

    // 按类型统计
    const feedbackByType: Record<string, any> = {};
    for (const feedback of feedbacks) {
      if (!feedbackByType[feedback.feedbackType]) {
        feedbackByType[feedback.feedbackType] = {
          count: 0,
          positiveCount: 0,
          ratings: [],
        };
      }

      feedbackByType[feedback.feedbackType].count++;
      if (feedback.value === 'positive' || feedback.value === 'helpful') {
        feedbackByType[feedback.feedbackType].positiveCount++;
      }
      if (feedback.rating !== undefined) {
        feedbackByType[feedback.feedbackType].ratings.push(feedback.rating);
      }
    }

    // 计算每个类型的统计
    for (const type in feedbackByType) {
      const typeData = feedbackByType[type];
      const typeRatings = typeData.ratings;

      feedbackByType[type] = {
        count: typeData.count,
        positiveRate: typeData.count > 0 ? typeData.positiveCount / typeData.count : 0,
        averageRating: typeRatings.length > 0
          ? typeRatings.reduce((sum, rating) => sum + rating, 0) / typeRatings.length
          : 0,
      };
    }

    // 按时间统计
    const feedbackByTime: Record<string, number> = {};
    for (const feedback of feedbacks) {
      const date = new Date(feedback.createdAt).toISOString().split('T')[0];
      feedbackByTime[date] = (feedbackByTime[date] || 0) + 1;
    }

    // 用户参与度统计
    const uniqueUsers = new Set(feedbacks.map(f => f.userId)).size;
    const averageFeedbacksPerUser = uniqueUsers > 0 ? totalFeedbacks / uniqueUsers : 0;

    // 计算留存率（简化版：7天内再次反馈的用户比例）
    const userFeedbackDates = new Map<string, string[]>();
    for (const feedback of feedbacks) {
      if (!userFeedbackDates.has(feedback.userId)) {
        userFeedbackDates.set(feedback.userId, []);
      }
      userFeedbackDates.get(feedback.userId)!.push(feedback.createdAt);
    }

    let retainedUsers = 0;
    for (const [userId, dates] of userFeedbackDates.entries()) {
      dates.sort();
      for (let i = 1; i < dates.length; i++) {
        const daysDiff = (new Date(dates[i]).getTime() - new Date(dates[i-1]).getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 7) {
          retainedUsers++;
          break;
        }
      }
    }

    const retentionRate = uniqueUsers > 0 ? retainedUsers / uniqueUsers : 0;

    this.analytics = {
      totalFeedbacks,
      positiveFeedbackRate: totalFeedbacks > 0 ? positiveFeedbacks.length / totalFeedbacks : 0,
      averageRating,
      feedbackByType,
      feedbackByTime,
      userEngagement: {
        uniqueUsers,
        averageFeedbacksPerUser,
        retentionRate,
      },
      improvementSuggestions: await this.generateImprovementSuggestions(feedbacks),
    };
  }

  /**
   * 识别反馈模式
   */
  private async identifyPatterns(): Promise<void> {
    const feedbacks = Array.from(this.feedbacks.values());
    const patterns: FeedbackPattern[] = [];

    // 识别负面模式
    const negativePatterns = this.identifyNegativePatterns(feedbacks);
    patterns.push(...negativePatterns);

    // 识别正面模式
    const positivePatterns = this.identifyPositivePatterns(feedbacks);
    patterns.push(...positivePatterns);

    // 识别改进区域
    const improvementAreas = this.identifyImprovementAreas(feedbacks);
    patterns.push(...improvementAreas);

    this.patterns = patterns;
  }

  /**
   * 识别负面模式
   */
  private identifyNegativePatterns(feedbacks: FeedbackItem[]): FeedbackPattern[] {
    const patterns: FeedbackPattern[] = [];

    // 按类型分组分析负面反馈
    const negativeByType = new Map<string, FeedbackItem[]>();

    for (const feedback of feedbacks) {
      if (feedback.value === 'negative' || feedback.value === 'not-helpful') {
        if (!negativeByType.has(feedback.feedbackType)) {
          negativeByType.set(feedback.feedbackType, []);
        }
        negativeByType.get(feedback.feedbackType)!.push(feedback);
      }
    }

    for (const [type, negativeFeedbacks] of negativeByType.entries()) {
      if (negativeFeedbacks.length >= 5) { // 至少5个负面反馈才形成模式
        const pattern: FeedbackPattern = {
          id: uuidv4(),
          patternType: 'negative_pattern',
          description: `${type}功能收到较多负面反馈，需要重点关注和改进`,
          frequency: negativeFeedbacks.length,
          impact: {
            affectedUsers: new Set(negativeFeedbacks.map(f => f.userId)).size,
            affectedEntities: new Set(negativeFeedbacks.map(f => f.entityId)).size,
            overallImpact: negativeFeedbacks.length / feedbacks.length,
          },
          recommendedActions: [
            `分析${type}算法的输出质量`,
            `增加用户反馈收集渠道`,
            `考虑调整${type}模型参数`,
          ],
          createdAt: new Date().toISOString(),
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * 识别正面模式
   */
  private identifyPositivePatterns(feedbacks: FeedbackItem[]): FeedbackPattern[] {
    const patterns: FeedbackPattern[] = [];

    // 分析高评分反馈
    const highRatingFeedbacks = feedbacks.filter(f => f.rating && f.rating >= 4);

    if (highRatingFeedbacks.length >= 10) {
      const pattern: FeedbackPattern = {
        id: uuidv4(),
        patternType: 'positive_pattern',
        description: '用户对AI建议整体满意度较高，可继续保持当前策略',
        frequency: highRatingFeedbacks.length,
        impact: {
          affectedUsers: new Set(highRatingFeedbacks.map(f => f.userId)).size,
          affectedEntities: new Set(highRatingFeedbacks.map(f => f.entityId)).size,
          overallImpact: highRatingFeedbacks.length / feedbacks.length,
        },
        recommendedActions: [
          '继续优化当前表现良好的算法',
          '将成功经验应用到其他功能',
          '定期监控性能指标',
        ],
        createdAt: new Date().toISOString(),
      };
      patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * 识别改进区域
   */
  private identifyImprovementAreas(feedbacks: FeedbackItem[]): FeedbackPattern[] {
    const patterns: FeedbackPattern[] = [];

    // 分析评分较低的功能
    const ratingsByType = new Map<string, number[]>();

    for (const feedback of feedbacks) {
      if (feedback.rating !== undefined) {
        if (!ratingsByType.has(feedback.feedbackType)) {
          ratingsByType.set(feedback.feedbackType, []);
        }
        ratingsByType.get(feedback.feedbackType)!.push(feedback.rating);
      }
    }

    for (const [type, ratings] of ratingsByType.entries()) {
      const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

      if (averageRating < 3.0 && ratings.length >= 5) {
        const pattern: FeedbackPattern = {
          id: uuidv4(),
          patternType: 'improvement_area',
          description: `${type}功能平均评分较低(${averageRating.toFixed(1)})，需要重点改进`,
          frequency: ratings.length,
          impact: {
            affectedUsers: new Set(
              feedbacks.filter(f => f.feedbackType === type && f.rating !== undefined).map(f => f.userId)
            ).size,
            affectedEntities: new Set(
              feedbacks.filter(f => f.feedbackType === type && f.rating !== undefined).map(f => f.entityId)
            ).size,
            overallImpact: ratings.length / feedbacks.length,
          },
          recommendedActions: [
            `深入分析${type}功能的问题根源`,
            `收集更多用户定性反馈`,
            `考虑使用不同的AI模型或算法`,
          ],
          createdAt: new Date().toISOString(),
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * 生成改进建议
   */
  private async generateImprovementSuggestions(feedbacks: FeedbackItem[]): Promise<any[]> {
    const suggestions: any[] = [];

    // 分析低评分反馈
    const lowRatingFeedbacks = feedbacks.filter(f => f.rating && f.rating <= 2);
    if (lowRatingFeedbacks.length > 0) {
      suggestions.push({
        type: 'quality_improvement',
        priority: 'high',
        description: '存在较多低评分反馈，需要提升AI建议质量',
        affectedCount: lowRatingFeedbacks.length,
      });
    }

    // 分析响应时间
    const slowResponses = feedbacks.filter(f => f.context.responseTime > 5000);
    if (slowResponses.length > 0) {
      suggestions.push({
        type: 'performance_optimization',
        priority: 'medium',
        description: '部分AI响应时间较长，需要优化性能',
        affectedCount: slowResponses.length,
      });
    }

    return suggestions;
  }

  /**
   * 更新分析数据
   */
  private async updateAnalytics(newFeedback: FeedbackItem): Promise<void> {
    if (!this.analytics) return;

    // 简单的增量更新逻辑
    this.analytics.totalFeedbacks++;

    if (newFeedback.value === 'positive' || newFeedback.value === 'helpful') {
      const currentPositiveCount = Math.round(this.analytics.positiveFeedbackRate * (this.analytics.totalFeedbacks - 1));
      this.analytics.positiveFeedbackRate = currentPositiveCount / this.analytics.totalFeedbacks;
    }

    if (newFeedback.rating !== undefined) {
      const currentRatingSum = this.analytics.averageRating * (this.analytics.totalFeedbacks - 1);
      this.analytics.averageRating = (currentRatingSum + newFeedback.rating) / this.analytics.totalFeedbacks;
    }
  }

  /**
   * 检查是否需要触发重新训练
   */
  private async checkRetrainingTrigger(feedback: FeedbackItem): Promise<void> {
    // 简单的触发条件：负面反馈达到一定数量
    const recentNegativeFeedbacks = Array.from(this.feedbacks.values())
      .filter(f =>
        (f.value === 'negative' || f.value === 'not-helpful') &&
        new Date(f.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 // 24小时内
      );

    if (recentNegativeFeedbacks.length >= 10) {
      console.log('Triggering AI model retraining due to negative feedback threshold');
      // 这里可以触发模型重新训练的逻辑
      await this.triggerRetraining();
    }
  }

  /**
   * 触发重新训练
   */
  private async triggerRetraining(): Promise<void> {
    // 这里可以实现重新训练的逻辑
    console.log('AI model retraining triggered');
  }

  /**
   * 按时间范围过滤分析数据
   */
  private filterAnalyticsByTimeRange(analytics: FeedbackAnalytics, timeRange: { start: string; end: string }): FeedbackAnalytics {
    // 实现时间范围过滤逻辑
    return analytics;
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(feedbacks: FeedbackItem[]): string {
    const headers = [
      'id', 'userId', 'feedbackType', 'value', 'rating', 'entityId',
      'createdAt', 'modelVersion', 'confidence'
    ];

    const rows = feedbacks.map(feedback => [
      feedback.id,
      feedback.userId,
      feedback.feedbackType,
      feedback.value,
      feedback.rating || '',
      feedback.entityId,
      feedback.createdAt,
      feedback.metadata.modelVersion,
      feedback.metadata.confidence || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * 生成模拟反馈数据
   */
  private generateMockFeedbacks(count: number): FeedbackItem[] {
    const mockFeedbacks: FeedbackItem[] = [];
    const types: FeedbackItem['feedbackType'][] = ['summary', 'tag', 'recommendation', 'search', 'analysis'];
    const values: FeedbackItem['value'][] = ['positive', 'negative', 'helpful', 'not-helpful', 'neutral'];

    for (let i = 0; i < count; i++) {
      const mockFeedback: FeedbackItem = {
        id: uuidv4(),
        userId: `user_${Math.floor(Math.random() * 100)}`,
        feedbackType: types[Math.floor(Math.random() * types.length)],
        value: values[Math.floor(Math.random() * values.length)],
        rating: Math.floor(Math.random() * 5) + 1,
        entityId: `entity_${Math.floor(Math.random() * 1000)}`,
        context: {
          originalSuggestion: `Mock suggestion ${i}`,
          sessionId: uuidv4(),
          pagePath: '/notes/detail',
          deviceInfo: {
            userAgent: 'Mozilla/5.0...',
            viewport: { width: 1920, height: 1080 },
            isMobile: false,
          },
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          responseTime: Math.floor(Math.random() * 10000),
        },
        metadata: {
          modelVersion: '1.0.0',
          confidence: Math.random(),
          userFeedbackCount: Math.floor(Math.random() * 10),
        },
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFeedbacks.push(mockFeedback);
    }

    return mockFeedbacks;
  }
}

// 单例模式
export const feedbackCollector = new FeedbackCollector();

export default FeedbackCollector;