/**
 * 数据分析服务
 *
 * 提供用户行为分析、数据统计和洞察功能
 */

export interface AnalyticsData {
  overview: OverviewStats;
  timeSeries: TimeSeriesData[];
  categoryDistribution: CategoryData[];
  tagAnalysis: TagAnalysisData[];
  userActivity: UserActivityData;
  aiInsights: AIInsightsData;
  trends: TrendData[];
}

export interface OverviewStats {
  totalNotes: number;
  publishedNotes: number;
  draftNotes: number;
  archivedNotes: number;
  totalViews: number;
  averageViews: number;
  totalWords: number;
  averageWords: number;
  aiProcessedNotes: number;
  aiProcessingRate: number;
  notesCreatedToday: number;
  notesCreatedThisWeek: number;
  notesCreatedThisMonth: number;
  mostActiveDay: string;
  mostActiveHour: number;
  topCategory: string;
  growthRate: number;
}

export interface TimeSeriesData {
  date: string;
  notes: number;
  views: number;
  words: number;
  aiProcessed: number;
}

export interface CategoryData {
  id: number;
  name: string;
  color: string;
  count: number;
  percentage: number;
  views: number;
  averageViews: number;
  totalWords: number;
  averageWords: number;
  aiProcessed: number;
  aiProcessingRate: number;
  growth: number;
}

export interface TagAnalysisData {
  name: string;
  count: number;
  views: number;
  averageViews: number;
  totalWords: number;
  averageWords: number;
  relatedTags: string[];
  trend: 'up' | 'down' | 'stable';
  growth: number;
}

export interface UserActivityData {
  dailyActivity: Array<{
    date: string;
    notesCreated: number;
    notesEdited: number;
    notesViewed: number;
    searches: number;
    timeSpent: number;
  }>;
  hourlyActivity: number[];
  topActivities: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  sessionStats: {
    averageSessionDuration: number;
    totalSessions: number;
    bounceRate: number;
    returningUserRate: number;
  };
}

export interface AIInsightsData {
  sentimentAnalysis: {
    positive: number;
    negative: number;
    neutral: number;
    trend: Array<{
      date: string;
      positive: number;
      negative: number;
      neutral: number;
    }>;
  };
  contentPatterns: Array<{
    pattern: string;
    count: number;
    description: string;
    recommendation: string;
  }>;
  writingHabits: {
    averageWordsPerNote: number;
    averageWritingTime: number;
    mostProductiveHours: number[];
    preferredCategories: string[];
    improvementSuggestions: string[];
  };
  topicClusters: Array<{
    cluster: string;
    notes: number;
    relatedTopics: string[];
    strength: number;
  }>;
}

export interface TrendData {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  prediction?: number;
}

class AnalyticsService {
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();

  /**
   * 获取完整的分析数据
   */
  async getAnalyticsData(
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d',
  ): Promise<AnalyticsData> {
    const cacheKey = `analytics_${timeRange}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const data = await this.generateAnalyticsData(timeRange);

    this.setCache(cacheKey, data, 5 * 60 * 1000); // 5分钟缓存

    return data;
  }

  /**
   * 生成分析数据
   */
  private async generateAnalyticsData(
    timeRange: string,
  ): Promise<AnalyticsData> {
    // 模拟数据生成
    const overview = await this.generateOverviewStats(timeRange);
    const timeSeries = await this.generateTimeSeriesData(timeRange);
    const categoryDistribution = await this.generateCategoryData(timeRange);
    const tagAnalysis = await this.generateTagAnalysisData(timeRange);
    const userActivity = await this.generateUserActivityData(timeRange);
    const aiInsights = await this.generateAIInsightsData(timeRange);
    const trends = await this.generateTrendData(timeRange);

    return {
      overview,
      timeSeries,
      categoryDistribution,
      tagAnalysis,
      userActivity,
      aiInsights,
      trends,
    };
  }

  /**
   * 生成概览统计
   */
  private async generateOverviewStats(
    timeRange: string,
  ): Promise<OverviewStats> {
    const days = this.getTimeRangeDays(timeRange);

    return {
      totalNotes: 125 + Math.floor(Math.random() * 50),
      publishedNotes: 85 + Math.floor(Math.random() * 20),
      draftNotes: 30 + Math.floor(Math.random() * 10),
      archivedNotes: 10 + Math.floor(Math.random() * 5),
      totalViews: 3420 + Math.floor(Math.random() * 1000),
      averageViews: 27 + Math.floor(Math.random() * 10),
      totalWords: 45670 + Math.floor(Math.random() * 10000),
      averageWords: 365 + Math.floor(Math.random() * 100),
      aiProcessedNotes: 95 + Math.floor(Math.random() * 20),
      aiProcessingRate: 0.76 + Math.random() * 0.15,
      notesCreatedToday: Math.floor(Math.random() * 5),
      notesCreatedThisWeek: 12 + Math.floor(Math.random() * 8),
      notesCreatedThisMonth: 28 + Math.floor(Math.random() * 15),
      mostActiveDay: ['周一', '周二', '周三', '周四', '周五'][
        Math.floor(Math.random() * 5)
      ],
      mostActiveHour: 9 + Math.floor(Math.random() * 8),
      topCategory: ['工作', '学习', '生活', '技术'][
        Math.floor(Math.random() * 4)
      ],
      growthRate: (Math.random() - 0.3) * 0.4, // -30% 到 +10%
    };
  }

  /**
   * 生成时间序列数据
   */
  private async generateTimeSeriesData(
    timeRange: string,
  ): Promise<TimeSeriesData[]> {
    const days = this.getTimeRangeDays(timeRange);
    const data: TimeSeriesData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      data.push({
        date: date.toISOString().split('T')[0],
        notes: Math.floor(Math.random() * 5) + 1,
        views: Math.floor(Math.random() * 100) + 20,
        words: Math.floor(Math.random() * 1000) + 200,
        aiProcessed: Math.floor(Math.random() * 4),
      });
    }

    return data;
  }

  /**
   * 生成分类数据
   */
  private async generateCategoryData(
    timeRange: string,
  ): Promise<CategoryData[]> {
    const categories = [
      { id: 1, name: '工作', color: '#3B82F6' },
      { id: 2, name: '学习', color: '#10B981' },
      { id: 3, name: '生活', color: '#F59E0B' },
      { id: 4, name: '技术', color: '#8B5CF6' },
      { id: 5, name: '创意', color: '#EC4899' },
    ];

    const totalNotes = 125 + Math.floor(Math.random() * 50);
    let remainingPercentage = 100;

    return categories.map((category, index) => {
      const isLast = index === categories.length - 1;
      const percentage = isLast
        ? remainingPercentage
        : Math.floor(Math.random() * remainingPercentage * 0.6) + 10;
      remainingPercentage -= percentage;

      const count = Math.floor((totalNotes * percentage) / 100);

      return {
        ...category,
        count,
        percentage,
        views: count * (20 + Math.floor(Math.random() * 30)),
        averageViews: 20 + Math.floor(Math.random() * 30),
        totalWords: count * (300 + Math.floor(Math.random() * 200)),
        averageWords: 300 + Math.floor(Math.random() * 200),
        aiProcessed: Math.floor(count * (0.7 + Math.random() * 0.25)),
        aiProcessingRate: 0.7 + Math.random() * 0.25,
        growth: (Math.random() - 0.4) * 0.3,
      };
    });
  }

  /**
   * 生成标签分析数据
   */
  private async generateTagAnalysisData(
    timeRange: string,
  ): Promise<TagAnalysisData[]> {
    const tags = [
      'React',
      '前端',
      '学习',
      '项目',
      '开发',
      '技术',
      '设计',
      '产品',
      '用户',
      '数据',
      'API',
      '数据库',
      '算法',
      '架构',
      '工具',
      '方法',
    ];

    return tags.slice(0, 12).map(tag => ({
      name: tag,
      count: Math.floor(Math.random() * 20) + 5,
      views: Math.floor(Math.random() * 500) + 100,
      averageViews: Math.floor(Math.random() * 50) + 20,
      totalWords: Math.floor(Math.random() * 5000) + 1000,
      averageWords: Math.floor(Math.random() * 200) + 200,
      relatedTags: tags.filter(t => t !== tag).slice(0, 3),
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as
        | 'up'
        | 'down'
        | 'stable',
      growth: (Math.random() - 0.3) * 0.5,
    }));
  }

  /**
   * 生成用户活动数据
   */
  private async generateUserActivityData(
    timeRange: string,
  ): Promise<UserActivityData> {
    const days = this.getTimeRangeDays(timeRange);

    const dailyActivity = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);

      return {
        date: date.toISOString().split('T')[0],
        notesCreated: Math.floor(Math.random() * 5),
        notesEdited: Math.floor(Math.random() * 8) + 2,
        notesViewed: Math.floor(Math.random() * 15) + 5,
        searches: Math.floor(Math.random() * 10) + 1,
        timeSpent: Math.floor(Math.random() * 120) + 30, // 分钟
      };
    }).reverse();

    const hourlyActivity = Array.from(
      { length: 24 },
      () => Math.floor(Math.random() * 50) + 10,
    );

    const topActivities = [
      { type: '查看笔记', count: 450, percentage: 45 },
      { type: '编辑笔记', count: 280, percentage: 28 },
      { type: '搜索', count: 150, percentage: 15 },
      { type: '创建笔记', count: 120, percentage: 12 },
    ];

    return {
      dailyActivity,
      hourlyActivity,
      topActivities,
      sessionStats: {
        averageSessionDuration: Math.floor(Math.random() * 30) + 10, // 分钟
        totalSessions: Math.floor(Math.random() * 100) + 50,
        bounceRate: Math.random() * 0.3 + 0.1, // 10% - 40%
        returningUserRate: Math.random() * 0.3 + 0.6, // 60% - 90%
      },
    };
  }

  /**
   * 生成AI洞察数据
   */
  private async generateAIInsightsData(
    timeRange: string,
  ): Promise<AIInsightsData> {
    return {
      sentimentAnalysis: {
        positive: 0.45 + Math.random() * 0.2,
        negative: 0.1 + Math.random() * 0.1,
        neutral: 0.35 + Math.random() * 0.15,
        trend: Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return {
            date: date.toISOString().split('T')[0],
            positive: 0.4 + Math.random() * 0.2,
            negative: 0.1 + Math.random() * 0.1,
            neutral: 0.4 + Math.random() * 0.2,
          };
        }).reverse(),
      },
      contentPatterns: [
        {
          pattern: '技术学习笔记',
          count: 35,
          description: '您倾向于记录学习过程中的技术要点和心得',
          recommendation: '建议创建专门的学习笔记模板，提高记录效率',
        },
        {
          pattern: '项目规划文档',
          count: 28,
          description: '经常记录项目相关的规划和进展',
          recommendation: '可以使用项目管理功能更好地跟踪项目状态',
        },
        {
          pattern: '灵感收集',
          count: 22,
          description: '习惯性地记录创意和想法',
          recommendation: '建议为创意想法建立标签系统，便于后续整理',
        },
      ],
      writingHabits: {
        averageWordsPerNote: Math.floor(Math.random() * 300) + 200,
        averageWritingTime: Math.floor(Math.random() * 20) + 10, // 分钟
        mostProductiveHours: [9, 10, 14, 15, 20, 21],
        preferredCategories: ['学习', '技术'],
        improvementSuggestions: [
          '尝试定期回顾和整理笔记，提高信息密度',
          '考虑使用更多的AI分析功能来优化内容结构',
          '建议在笔记之间建立更多关联，形成知识网络',
        ],
      },
      topicClusters: [
        {
          cluster: '前端开发',
          notes: 18,
          relatedTopics: ['React', 'JavaScript', 'CSS', '用户体验'],
          strength: 0.85,
        },
        {
          cluster: '产品设计',
          notes: 12,
          relatedTopics: ['用户研究', '原型设计', '需求分析', '用户体验'],
          strength: 0.72,
        },
        {
          cluster: '个人成长',
          notes: 15,
          relatedTopics: ['学习方法', '时间管理', '目标设定', '反思总结'],
          strength: 0.68,
        },
      ],
    };
  }

  /**
   * 生成趋势数据
   */
  private async generateTrendData(timeRange: string): Promise<TrendData[]> {
    return [
      {
        metric: '笔记创建量',
        current: 28,
        previous: 32,
        change: -4,
        changePercent: -12.5,
        trend: 'down',
        prediction: 30,
      },
      {
        metric: '总浏览量',
        current: 3420,
        previous: 2980,
        change: 440,
        changePercent: 14.8,
        trend: 'up',
        prediction: 3800,
      },
      {
        metric: 'AI处理率',
        current: 0.76,
        previous: 0.68,
        change: 0.08,
        changePercent: 11.8,
        trend: 'up',
        prediction: 0.82,
      },
      {
        metric: '平均字数',
        current: 365,
        previous: 342,
        change: 23,
        changePercent: 6.7,
        trend: 'up',
        prediction: 380,
      },
    ];
  }

  /**
   * 获取时间范围天数
   */
  private getTimeRangeDays(timeRange: string): number {
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
   * 检查缓存是否有效
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry !== undefined && Date.now() < expiry;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * 获取用户行为洞察
   */
  async getUserInsights(
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d',
  ): Promise<{
    productivityScore: number;
    engagementScore: number;
    consistencyScore: number;
    growthScore: number;
    overallScore: number;
    recommendations: string[];
  }> {
    const data = await this.getAnalyticsData(timeRange);

    const productivityScore = this.calculateProductivityScore(data);
    const engagementScore = this.calculateEngagementScore(data);
    const consistencyScore = this.calculateConsistencyScore(data);
    const growthScore = this.calculateGrowthScore(data);

    const overallScore =
      (productivityScore + engagementScore + consistencyScore + growthScore) /
      4;

    const recommendations = this.generateRecommendations(data, {
      productivityScore,
      engagementScore,
      consistencyScore,
      growthScore,
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
   * 计算生产力得分
   */
  private calculateProductivityScore(data: AnalyticsData): number {
    const { notesCreatedThisWeek, averageWords } = data.overview;
    const noteFrequency = notesCreatedThisWeek / 7;
    const wordFrequency = averageWords / 365;

    return Math.min(100, noteFrequency * 20 + wordFrequency * 30);
  }

  /**
   * 计算参与度得分
   */
  private calculateEngagementScore(data: AnalyticsData): number {
    const { averageViews, aiProcessingRate } = data.overview;
    const viewScore = Math.min(50, averageViews / 2);
    const aiScore = aiProcessingRate * 50;

    return viewScore + aiScore;
  }

  /**
   * 计算一致性得分
   */
  private calculateConsistencyScore(data: AnalyticsData): number {
    const dailyActivity = data.userActivity.dailyActivity;
    const activeDays = dailyActivity.filter(
      day => day.notesCreated > 0 || day.notesEdited > 0,
    ).length;
    const consistencyRate = activeDays / dailyActivity.length;

    return consistencyRate * 100;
  }

  /**
   * 计算成长得分
   */
  private calculateGrowthScore(data: AnalyticsData): number {
    const growthTrends = data.trends.filter(trend => trend.trend === 'up');
    const positiveTrends = growthTrends.length / data.trends.length;

    return Math.max(0, (data.overview.growthRate + 0.3) * 100 * positiveTrends);
  }

  /**
   * 生成个性化建议
   */
  private generateRecommendations(data: AnalyticsData, scores: any): string[] {
    const recommendations: string[] = [];

    if (scores.productivityScore < 60) {
      recommendations.push('建议增加笔记创建频率，尝试每日记录重要信息');
    }

    if (scores.engagementScore < 60) {
      recommendations.push('定期回顾和更新笔记，提高内容质量和关联性');
    }

    if (scores.consistencyScore < 60) {
      recommendations.push('建立规律的笔记习惯，选择固定时间进行记录和整理');
    }

    if (scores.growthScore < 60) {
      recommendations.push('探索新的主题领域，尝试多样化的内容创作');
    }

    if (data.overview.aiProcessingRate < 0.7) {
      recommendations.push('充分利用AI分析功能，提高笔记的结构化程度');
    }

    return recommendations;
  }
}

// 导出单例实例
export const analyticsService = new AnalyticsService();

// 导出类型
export type {
  AnalyticsData,
  OverviewStats,
  TimeSeriesData,
  CategoryData,
  TagAnalysisData,
  UserActivityData,
  AIInsightsData,
  TrendData,
};
