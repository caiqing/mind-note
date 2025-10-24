/**
 * 测试数据工厂
 */

import type {
  AnalyticsData,
  UserInsights,
} from '../services/analytics-service';
import type {
  SearchRequest,
  SearchResult,
  SearchFilters,
  SearchOptions,
} from '../services/search-service';
import type {
  AIAnalysisRequest,
  AIAnalysisResult,
} from '../ai-analysis-service';

// 创建模拟分析数据
export function createMockAnalyticsData(
  overrides: Partial<AnalyticsData> = {},
): AnalyticsData {
  const defaultData: AnalyticsData = {
    overview: {
      totalNotes: 150,
      publishedNotes: 120,
      draftNotes: 30,
      totalViews: 2500,
      averageViews: 16.7,
      totalWords: 45000,
      aiProcessedNotes: 85,
      aiProcessingRate: 0.57,
    },
    timeSeries: [
      {
        date: '2025-10-20',
        notes: 5,
        views: 120,
        words: 1500,
        aiProcessed: 3,
      },
      {
        date: '2025-10-21',
        notes: 8,
        views: 200,
        words: 2400,
        aiProcessed: 6,
      },
      {
        date: '2025-10-22',
        notes: 3,
        views: 80,
        words: 900,
        aiProcessed: 2,
      },
    ],
    categoryDistribution: [
      {
        id: 1,
        name: '技术',
        color: '#3B82F6',
        count: 60,
        percentage: 40,
        views: 1200,
        aiProcessed: 35,
      },
      {
        id: 2,
        name: '学习',
        color: '#10B981',
        count: 45,
        percentage: 30,
        views: 800,
        aiProcessed: 25,
      },
      {
        id: 3,
        name: '工作',
        color: '#F59E0B',
        count: 30,
        percentage: 20,
        views: 300,
        aiProcessed: 15,
      },
      {
        id: 4,
        name: '生活',
        color: '#EF4444',
        count: 15,
        percentage: 10,
        views: 200,
        aiProcessed: 10,
      },
    ],
    tagAnalysis: [
      {
        name: 'React',
        count: 25,
        views: 600,
        averageViews: 24,
        totalWords: 8000,
        averageWords: 320,
        relatedTags: ['JavaScript', '前端', '组件'],
        trend: 'up',
      },
      {
        name: 'TypeScript',
        count: 20,
        views: 500,
        averageViews: 25,
        totalWords: 7000,
        averageWords: 350,
        relatedTags: ['JavaScript', '类型', '前端'],
        trend: 'stable',
      },
      {
        name: 'Node.js',
        count: 15,
        views: 400,
        averageViews: 26.7,
        totalWords: 6000,
        averageWords: 400,
        relatedTags: ['后端', 'JavaScript', 'API'],
        trend: 'down',
      },
    ],
    userActivity: {
      dailyActivity: [
        {
          date: '2025-10-20',
          notesCreated: 3,
          notesEdited: 5,
          notesViewed: 15,
          searches: 8,
          timeSpent: 45,
        },
        {
          date: '2025-10-21',
          notesCreated: 5,
          notesEdited: 7,
          notesViewed: 20,
          searches: 12,
          timeSpent: 60,
        },
        {
          date: '2025-10-22',
          notesCreated: 2,
          notesEdited: 4,
          notesViewed: 12,
          searches: 6,
          timeSpent: 30,
        },
      ],
      hourlyActivity: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        activity: Math.floor(Math.random() * 50) + 5,
      })),
      topActivities: [
        { type: 'note_creation', count: 45, description: '创建笔记' },
        { type: 'note_editing', count: 78, description: '编辑笔记' },
        { type: 'search', count: 23, description: '搜索' },
        { type: 'viewing', count: 156, description: '查看笔记' },
      ],
      sessionStats: {
        averageSessionDuration: 25,
        totalSessions: 45,
        bounceRate: 0.15,
      },
    },
    aiInsights: {
      sentimentAnalysis: {
        positive: 0.65,
        negative: 0.15,
        neutral: 0.2,
      },
      contentPatterns: [
        { name: '技术文档', count: 45, description: '技术相关的文档和教程' },
        { name: '学习笔记', count: 32, description: '学习过程中的记录' },
        { name: '项目规划', count: 28, description: '项目相关的规划文档' },
      ],
      writingHabits: {
        bestWritingTime: '上午 9-11点',
        averageWordsPerNote: 300,
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
    },
    trends: [
      {
        metric: 'note_creation',
        current: 15,
        previous: 12,
        change: 3,
        changePercent: 25,
        trend: 'up',
      },
      {
        metric: 'ai_processing',
        current: 8,
        previous: 6,
        change: 2,
        changePercent: 33.3,
        trend: 'up',
      },
      {
        metric: 'user_engagement',
        current: 85,
        previous: 80,
        change: 5,
        changePercent: 6.25,
        trend: 'up',
      },
    ],
  };

  return { ...defaultData, ...overrides };
}

// 创建模拟用户洞察
export function createMockUserInsights(
  overrides: Partial<UserInsights> = {},
): UserInsights {
  const defaultInsights: UserInsights = {
    productivityScore: 75,
    engagementScore: 82,
    consistencyScore: 68,
    growthScore: 79,
    overallScore: 76,
    recommendations: [
      '建议增加笔记创建频率，保持持续学习和记录的习惯',
      '建议定期回顾和编辑已有笔记，增加内容的深度和质量',
      '建议制定固定的学习和笔记时间，培养良好的记录习惯',
    ],
  };

  return { ...defaultInsights, ...overrides };
}

// 创建模拟搜索请求
export function createMockSearchRequest(
  overrides: Partial<SearchRequest> = {},
): SearchRequest {
  const defaultRequest: SearchRequest = {
    query: 'React Hooks',
    searchType: 'keyword',
    options: {
      limit: 10,
      sortBy: 'relevance',
      sortOrder: 'desc',
    },
  };

  return { ...defaultRequest, ...overrides };
}

// 创建模拟搜索结果
export function createMockSearchResult(
  overrides: Partial<SearchResult> = {},
): SearchResult {
  const defaultResult: SearchResult = {
    id: 'test-note-1',
    title: 'React Hooks学习笔记',
    snippet:
      'React Hooks是React 16.8引入的新特性，它让你在不编写class的情况下使用state和其他React特性...',
    score: 0.95,
    status: 'PUBLISHED',
    isPublic: false,
    viewCount: 150,
    createdAt: '2025-10-20T10:00:00Z',
    updatedAt: '2025-10-20T15:30:00Z',
    aiProcessed: true,
    aiSummary: 'React Hooks的使用方法和最佳实践',
    aiKeywords: ['React', 'Hooks', '状态管理'],
    aiCategory: '技术',
    aiSentiment: 'positive',
    aiAnalysisDate: '2025-10-20T16:00:00Z',
    wordCount: 850,
    readingTime: 4,
    authorId: 'user-1',
    categoryId: 1,
    metadata: {
      category: { id: 1, name: '技术', color: '#3B82F6' },
      tags: [
        { id: 1, name: 'React', color: '#61DAFB' },
        { id: 2, name: '前端', color: '#A78BFA' },
      ],
      createdAt: '2025-10-20T10:00:00Z',
      updatedAt: '2025-10-20T15:30:00Z',
      wordCount: 850,
      viewCount: 150,
      isPublic: false,
      aiProcessed: true,
      sentiment: 'positive',
    },
  };

  return { ...defaultResult, ...overrides };
}

// 创建模拟AI分析请求
export function createMockAIAnalysisRequest(
  overrides: Partial<AIAnalysisRequest> = {},
): AIAnalysisRequest {
  const defaultRequest: AIAnalysisRequest = {
    noteId: 'test-note-1',
    title: 'React Hooks学习笔记',
    content:
      'React Hooks是React 16.8引入的新特性，它让你在不编写class的情况下使用state和其他React特性。Hooks让函数组件拥有了状态管理、生命周期等能力。',
    operations: ['categorize', 'tag', 'summarize'],
    options: {
      language: 'zh',
      quality: 'balanced',
      provider: 'mock-ai-service',
    },
  };

  return { ...defaultRequest, ...overrides };
}

// 创建模拟AI分析结果
export function createMockAIAnalysisResult(
  overrides: Partial<AIAnalysisResult> = {},
): AIAnalysisResult {
  const defaultResult: AIAnalysisResult = {
    success: true,
    results: {
      category: '技术',
      tags: ['React', 'Hooks', '前端开发'],
      summary:
        'React Hooks是React 16.8引入的新特性，允许在函数组件中使用状态和其他React特性。',
      keywords: ['React', 'Hooks', '状态管理', '函数组件'],
      sentiment: 'positive',
      confidence: 0.85,
    },
    processingTime: 1500,
    tokensUsed: 256,
  };

  return { ...defaultResult, ...overrides };
}

// 创建模拟搜索过滤器
export function createMockSearchFilters(
  overrides: Partial<SearchFilters> = {},
): SearchFilters {
  const defaultFilters: SearchFilters = {
    categories: ['技术', '学习'],
    status: ['PUBLISHED'],
    sentiment: ['positive'],
    isPublic: false,
    aiProcessed: true,
  };

  return { ...defaultFilters, ...overrides };
}

// 创建模拟搜索选项
export function createMockSearchOptions(
  overrides: Partial<SearchOptions> = {},
): SearchOptions {
  const defaultOptions: SearchOptions = {
    limit: 20,
    offset: 0,
    sortBy: 'relevance',
    sortOrder: 'desc',
  };

  return { ...defaultOptions, ...overrides };
}
