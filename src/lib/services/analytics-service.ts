/**
 * 数据分析服务
 */

import {
  createMockAnalyticsData,
  createMockUserInsights,
} from '../__tests__/test-factories';

// 类型定义
export interface AnalyticsData {
  overview: {
    totalNotes: number;
    publishedNotes: number;
    draftNotes: number;
    totalViews: number;
    averageViews: number;
    totalWords: number;
    aiProcessedNotes: number;
    aiProcessingRate: number;
  };
  timeSeries: Array<{
    date: string;
    notes: number;
    views: number;
    words: number;
    aiProcessed: number;
  }>;
  categoryDistribution: Array<{
    id: number;
    name: string;
    color: string;
    count: number;
    percentage: number;
    views: number;
    aiProcessed: number;
  }>;
  tagAnalysis: Array<{
    name: string;
    count: number;
    views: number;
    averageViews: number;
    totalWords: number;
    averageWords: number;
    relatedTags: string[];
    trend: 'up' | 'down' | 'stable';
  }>;
  userActivity: {
    dailyActivity: Array<{
      date: string;
      notesCreated: number;
      notesEdited: number;
      notesViewed: number;
      searches: number;
      timeSpent: number;
    }>;
    hourlyActivity: Array<{
      hour: number;
      activity: number;
    }>;
    topActivities: Array<{
      type: string;
      count: number;
      description: string;
    }>;
    sessionStats: {
      averageSessionDuration: number;
      totalSessions: number;
      bounceRate: number;
    };
  };
  aiInsights: {
    sentimentAnalysis: {
      positive: number;
      negative: number;
      neutral: number;
    };
    contentPatterns: Array<{
      name: string;
      count: number;
      description: string;
    }>;
    writingHabits: {
      bestWritingTime: string;
      averageWordsPerNote: number;
      preferredCategories: string[];
      mostUsedTags: string[];
    };
    topicClusters: Array<{
      name: string;
      notes: number;
      keywords: string[];
    }>;
  };
  trends: Array<{
    metric: string;
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

export interface UserInsights {
  productivityScore: number;
  engagementScore: number;
  consistencyScore: number;
  growthScore: number;
  overallScore: number;
  recommendations: string[];
}

export type TimeRange = '7d' | '30d' | '90d' | '1y';

// 数据分析服务主类
export class AnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = {
    '7d': 2 * 60 * 1000, // 2分钟
    '30d': 5 * 60 * 1000, // 5分钟
    '90d': 10 * 60 * 1000, // 10分钟
    '1y': 30 * 60 * 1000, // 30分钟
  };

  constructor() {}

  /**
   * 获取分析数据
   */
  async getAnalyticsData(timeRange: TimeRange): Promise<AnalyticsData> {
    // 检查缓存
    const cacheKey = `analytics:${timeRange}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 生成分析数据
    const data = this.generateAnalyticsData(timeRange);

    // 缓存结果
    this.setCache(cacheKey, data, timeRange);

    return data;
  }

  /**
   * 获取用户洞察
   */
  async getUserInsights(timeRange: TimeRange): Promise<UserInsights> {
    const analyticsData = await this.getAnalyticsData(timeRange);

    // 计算各项得分
    const productivityScore = this.calculateProductivityScore(analyticsData);
    const engagementScore = this.calculateEngagementScore(analyticsData);
    const consistencyScore = this.calculateConsistencyScore(analyticsData);
    const growthScore = this.calculateGrowthScore(analyticsData);

    // 计算综合得分
    const overallScore =
      (productivityScore + engagementScore + consistencyScore + growthScore) /
      4;

    // 生成个性化建议
    const recommendations = this.generateRecommendations({
      productivityScore,
      engagementScore,
      consistencyScore,
      growthScore,
      analyticsData,
    });

    return {
      productivityScore,
      engagementScore,
      consistencyScore,
      growthScore,
      overallScore,
      recommendations,
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除特定缓存
   */
  private clearCacheKey(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any, timeRange: TimeRange): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) {
      // 5分钟基础缓存
      return cached.data;
    }
    return null;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    return cached !== undefined && Date.now() - cached.timestamp < 300000;
  }

  /**
   * 生成分析数据
   */
  private generateAnalyticsData(timeRange: TimeRange): AnalyticsData {
    const days = this.getTimeRangeDays(timeRange);
    const endDate = new Date();
    const startDate = new Date(
      endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000,
    );

    return {
      overview: this.generateOverviewData(),
      timeSeries: this.generateTimeSeriesData(startDate, days),
      categoryDistribution: this.generateCategoryDistributionData(),
      tagAnalysis: this.generateTagAnalysisData(),
      userActivity: this.generateUserActivityData(startDate, days),
      aiInsights: this.generateAIInsightsData(),
      trends: this.generateTrendsData(),
    };
  }

  /**
   * 生成概览数据
   */
  private generateOverviewData() {
    return {
      totalNotes: Math.floor(Math.random() * 500) + 100,
      publishedNotes: Math.floor(Math.random() * 400) + 80,
      draftNotes: Math.floor(Math.random() * 100) + 20,
      totalViews: Math.floor(Math.random() * 10000) + 2000,
      averageViews: Math.floor(Math.random() * 50) + 10,
      totalWords: Math.floor(Math.random() * 100000) + 20000,
      aiProcessedNotes: Math.floor(Math.random() * 300) + 60,
      aiProcessingRate: Math.random() * 0.5 + 0.3, // 30-80%
    };
  }

  /**
   * 生成时间序列数据
   */
  private generateTimeSeriesData(startDate: Date, days: number) {
    const timeSeries = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      timeSeries.push({
        date: date.toISOString().split('T')[0],
        notes: Math.floor(Math.random() * 10) + 1,
        views: Math.floor(Math.random() * 100) + 10,
        words: Math.floor(Math.random() * 2000) + 200,
        aiProcessed: Math.floor(Math.random() * 8) + 1,
      });
    }

    return timeSeries;
  }

  /**
   * 生成分类分布数据
   */
  private generateCategoryDistributionData() {
    const categories = [
      { name: '技术', color: '#3B82F6' },
      { name: '学习', color: '#10B981' },
      { name: '工作', color: '#F59E0B' },
      { name: '生活', color: '#EF4444' },
      { name: '创意', color: '#8B5CF6' },
    ];

    let totalNotes = 0;
    const distribution = categories.map(category => {
      const count = Math.floor(Math.random() * 100) + 10;
      totalNotes += count;
      return {
        id: Math.floor(Math.random() * 1000),
        name: category.name,
        color: category.color,
        count,
        percentage: 0, // 稍后计算
        views: Math.floor(Math.random() * 1000) + 100,
        aiProcessed: Math.floor(Math.random() * count),
      };
    });

    // 计算百分比
    distribution.forEach(item => {
      item.percentage = Math.round((item.count / totalNotes) * 100);
    });

    return distribution;
  }

  /**
   * 生成标签分析数据
   */
  private generateTagAnalysisData() {
    const tags = [
      'React',
      'JavaScript',
      'TypeScript',
      'Vue.js',
      'Node.js',
      'CSS',
      'HTML',
      '前端',
      '后端',
      '数据库',
      '算法',
      '设计模式',
      '架构',
      '性能优化',
      '测试',
    ];

    return tags.slice(0, 10).map(tag => ({
      name: tag,
      count: Math.floor(Math.random() * 50) + 5,
      views: Math.floor(Math.random() * 500) + 50,
      averageViews: Math.floor(Math.random() * 20) + 5,
      totalWords: Math.floor(Math.random() * 10000) + 1000,
      averageWords: Math.floor(Math.random() * 200) + 50,
      relatedTags: this.getRandomTags(tags, 3),
      trend: this.getRandomTrend(),
    }));
  }

  /**
   * 生成用户活动数据
   */
  private generateUserActivityData(startDate: Date, days: number) {
    const dailyActivity = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      dailyActivity.push({
        date: date.toISOString().split('T')[0],
        notesCreated: Math.floor(Math.random() * 5),
        notesEdited: Math.floor(Math.random() * 8),
        notesViewed: Math.floor(Math.random() * 20) + 5,
        searches: Math.floor(Math.random() * 10),
        timeSpent: Math.floor(Math.random() * 60) + 10,
      });
    }

    // 生成小时活动数据
    const hourlyActivity = [];
    for (let hour = 0; hour < 24; hour++) {
      hourlyActivity.push({
        hour,
        activity: Math.floor(Math.random() * 50) + 5,
      });
    }

    return {
      dailyActivity,
      hourlyActivity,
      topActivities: [
        { type: 'note_creation', count: 45, description: '创建笔记' },
        { type: 'note_editing', count: 78, description: '编辑笔记' },
        { type: 'search', count: 23, description: '搜索' },
        { type: 'viewing', count: 156, description: '查看笔记' },
      ],
      sessionStats: {
        averageSessionDuration: Math.floor(Math.random() * 30) + 10,
        totalSessions: Math.floor(Math.random() * 100) + 20,
        bounceRate: Math.random() * 0.5 + 0.1,
      },
    };
  }

  /**
   * 生成AI洞察数据
   */
  private generateAIInsightsData() {
    return {
      sentimentAnalysis: {
        positive: Math.random() * 0.4 + 0.3, // 30-70%
        negative: Math.random() * 0.2 + 0.05, // 5-25%
        neutral: Math.random() * 0.3 + 0.2, // 20-50%
      },
      contentPatterns: [
        { name: '技术文档', count: 45, description: '技术相关的文档和教程' },
        { name: '学习笔记', count: 32, description: '学习过程中的记录' },
        { name: '项目规划', count: 28, description: '项目相关的规划文档' },
      ],
      writingHabits: {
        bestWritingTime: '上午 9-11点',
        averageWordsPerNote: Math.floor(Math.random() * 500) + 200,
        preferredCategories: ['技术', '学习'],
        mostUsedTags: ['JavaScript', 'React', 'TypeScript'],
      },
      topicClusters: [
        {
          name: '前端开发',
          notes: 15,
          keywords: ['React', 'Vue', 'JavaScript', 'CSS'],
        },
        {
          name: '后端技术',
          notes: 12,
          keywords: ['Node.js', 'API', '数据库', 'TypeScript'],
        },
        {
          name: '学习方法',
          notes: 8,
          keywords: ['笔记', '总结', '实践', '复习'],
        },
      ],
    };
  }

  /**
   * 生成趋势数据
   */
  private generateTrendsData() {
    return [
      {
        metric: 'note_creation',
        current: Math.floor(Math.random() * 20) + 10,
        previous: Math.floor(Math.random() * 20) + 5,
        change: Math.floor(Math.random() * 10) - 5,
        changePercent: Math.random() * 20 - 10,
        trend: this.getRandomTrend(),
      },
      {
        metric: 'ai_processing',
        current: Math.floor(Math.random() * 30) + 20,
        previous: Math.floor(Math.random() * 30) + 15,
        change: Math.floor(Math.random() * 15) - 5,
        changePercent: Math.random() * 30 - 15,
        trend: this.getRandomTrend(),
      },
      {
        metric: 'user_engagement',
        current: Math.floor(Math.random() * 100) + 50,
        previous: Math.floor(Math.random() * 100) + 40,
        change: Math.floor(Math.random() * 20) - 10,
        changePercent: Math.random() * 25 - 12.5,
        trend: this.getRandomTrend(),
      },
    ];
  }

  /**
   * 计算生产力得分
   */
  private calculateProductivityScore(data: AnalyticsData): number {
    const {
      overview: {
        notesCreatedThisWeek = Math.floor(Math.random() * 10) + 5,
        averageWords = Math.floor(Math.random() * 500) + 200,
      },
    } = data as any;

    // 基于创建的笔记数量和平均字数计算
    const creationScore = Math.min(notesCreatedThisWeek * 10, 40);
    const wordScore = Math.min(averageWords / 10, 30);
    const consistencyScore = 30; // 默认一致性得分

    return Math.round(creationScore + wordScore + consistencyScore);
  }

  /**
   * 计算参与度得分
   */
  private calculateEngagementScore(data: AnalyticsData): number {
    const {
      overview: {
        averageViews = Math.floor(Math.random() * 50) + 10,
        aiProcessingRate = Math.random() * 0.5 + 0.3,
      },
    } = data;

    // 基于平均浏览量和AI处理率计算
    const viewScore = Math.min(averageViews, 40);
    const aiScore = aiProcessingRate * 60;

    return Math.round(viewScore + aiScore);
  }

  /**
   * 计算一致性得分
   */
  private calculateConsistencyScore(data: AnalyticsData): number {
    const {
      userActivity: { dailyActivity },
    } = data;

    // 基于每日活动的一致性计算
    const activeDays =
      dailyActivity?.filter(day => day.notesCreated > 0 || day.notesEdited > 0)
        .length || 0;
    const consistencyRate = activeDays / dailyActivity?.length || 0;

    return Math.round(consistencyRate * 100);
  }

  /**
   * 计算成长得分
   */
  private calculateGrowthScore(data: AnalyticsData): number {
    const {
      overview: {
        growthRate = Math.random() * 0.2 + 0.05,
        totalNotes = Math.floor(Math.random() * 500) + 100,
      },
      trends,
    } = data;

    // 基于增长率和趋势计算
    const growthScore = Math.min(growthRate * 200, 50);
    const trendScore = trends.filter(trend => trend.trend === 'up').length * 15;

    const baseScore = totalNotes > 100 ? 20 : totalNotes / 5;

    return Math.round(Math.min(growthScore + trendScore + baseScore, 100));
  }

  /**
   * 生成个性化建议
   */
  private generateRecommendations(context: {
    productivityScore: number;
    engagementScore: number;
    consistencyScore: number;
    growthScore: number;
    analyticsData: AnalyticsData;
  }): string[] {
    const recommendations = [];

    if (context.productivityScore < 60) {
      recommendations.push('建议增加笔记创建频率，保持持续学习和记录的习惯');
      recommendations.push('尝试设定每日写作目标，如每天至少写一篇笔记');
    }

    if (context.engagementScore < 60) {
      recommendations.push('建议定期回顾和编辑已有笔记，增加内容的深度和质量');
      recommendations.push('尝试使用AI分析功能来优化笔记内容和分类');
    }

    if (context.consistencyScore < 60) {
      recommendations.push('建议制定固定的学习和笔记时间，培养良好的记录习惯');
      recommendations.push('使用提醒功能帮助自己保持记录的连续性');
    }

    if (context.growthScore < 60) {
      recommendations.push('建议探索新的学习领域，拓展知识面和技能范围');
      recommendations.push('尝试将学习心得和实践经验整理成结构化的笔记');
    }

    // 根据AI洞察提供建议
    const { aiInsights } = context.analyticsData;
    if (aiInsights.sentimentAnalysis.negative > 0.3) {
      recommendations.push('建议多关注积极的内容，保持良好的学习心态');
    }

    // 确保至少有一个建议
    if (recommendations.length === 0) {
      recommendations.push('继续保持良好的记录习惯，定期回顾和总结学习内容');
    }

    return recommendations.slice(0, 5); // 最多返回5个建议
  }

  /**
   * 获取时间范围对应的天数
   */
  private getTimeRangeDays(timeRange: TimeRange): number {
    switch (timeRange) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '1y':
      return 365;
    default:
      return 30;
    }
  }

  /**
   * 获取随机标签
   */
  private getRandomTags(allTags: string[], count: number): string[] {
    const shuffled = [...allTags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * 获取随机趋势
   */
  private getRandomTrend(): 'up' | 'down' | 'stable' {
    const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
    return trends[Math.floor(Math.random() * trends.length)];
  }
}

// 导出单例实例
export const analyticsService = new AnalyticsService();
