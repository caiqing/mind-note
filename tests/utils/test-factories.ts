/**
 * 测试数据工厂
 *
 * 提供用于测试的Mock数据生成工具
 */

import type { Note, Category, Tag } from '@/lib/types';

// 生成测试用的分类数据
export const createMockCategory = (
  overrides: Partial<Category> = {},
): Category => ({
  id: Math.floor(Math.random() * 1000),
  name: '测试分类',
  color: '#3B82F6',
  icon: 'folder',
  description: '测试分类描述',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// 生成测试用的标签数据
export const createMockTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: Math.floor(Math.random() * 1000),
  name: '测试标签',
  color: '#10B981',
  description: '测试标签描述',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// 生成测试用的笔记数据
export const createMockNote = (overrides: Partial<Note> = {}): Note => ({
  id: Math.floor(Math.random() * 10000).toString(),
  title: '测试笔记标题',
  content: '这是一个测试笔记的内容，包含一些示例文本。',
  snippet: '这是一个测试笔记的摘要...',
  categoryId: 1,
  category: createMockCategory(),
  tags: [createMockTag()],
  status: 'DRAFT' as const,
  isPublic: false,
  viewCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  aiProcessed: false,
  aiSummary: '',
  aiKeywords: [],
  aiCategory: '',
  aiSentiment: 'neutral' as const,
  aiAnalysisDate: '',
  wordCount: 50,
  readingTime: 1,
  authorId: 'test-user-id',
  ...overrides,
});

// 生成多个测试笔记
export const createMockNotes = (
  count: number,
  overrides: Partial<Note> = {},
): Note[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockNote({
      ...overrides,
      id: (index + 1).toString(),
      title: `${overrides.title || '测试笔记'} ${index + 1}`,
      content: `${overrides.content || '测试内容'} ${index + 1}`,
    }),
  );
};

// 生成测试用的搜索结果
export const createMockSearchResult = (overrides: any = {}) => ({
  id: 'test-note-1',
  title: '测试搜索结果',
  content: '这是一个测试搜索结果的内容',
  snippet: '这是测试搜索结果的摘要...',
  score: 0.85,
  relevanceScore: 0.85,
  matchType: 'exact' as const,
  highlights: {
    title: ['<mark>测试</mark>搜索结果'],
    content: ['这是一个<mark>测试</mark>搜索结果的内容'],
  },
  metadata: {
    categoryId: 1,
    category: '测试分类',
    tags: ['测试', '搜索'],
    status: 'PUBLISHED',
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    viewCount: 10,
    aiProcessed: true,
    sentiment: 'positive',
    wordCount: 100,
  },
  ...overrides,
});

// 生成测试用的AI分析结果
export const createMockAIAnalysisResult = (overrides: any = {}) => ({
  success: true,
  results: {
    category: {
      name: '技术',
      confidence: 0.85,
      alternatives: [
        { name: '学习', confidence: 0.65 },
        { name: '工作', confidence: 0.45 },
      ],
    },
    tags: [
      { name: 'React', confidence: 0.9, type: 'technical' },
      { name: '前端', confidence: 0.8, type: 'content' },
    ],
    summary: '这是一个关于React前端开发的技术笔记。',
    keywords: [
      { word: 'React', relevance: 0.95, category: '技术' },
      { word: '前端', relevance: 0.85, category: '领域' },
    ],
    sentiment: {
      polarity: 'positive',
      confidence: 0.75,
      emotions: [
        { name: '专注', intensity: 0.8 },
        { name: '思考', intensity: 0.6 },
      ],
    },
  },
  metadata: {
    processingTime: 1250,
    provider: 'test-ai-service',
    model: 'test-model-v1.0',
    timestamp: new Date().toISOString(),
    confidence: 0.82,
  },
  ...overrides,
});

// 生成测试用的分析数据
export const createMockAnalyticsData = (overrides: any = {}) => ({
  overview: {
    totalNotes: 125,
    publishedNotes: 85,
    draftNotes: 30,
    archivedNotes: 10,
    totalViews: 3420,
    averageViews: 27,
    totalWords: 45670,
    averageWords: 365,
    aiProcessedNotes: 95,
    aiProcessingRate: 0.76,
    notesCreatedToday: 3,
    notesCreatedThisWeek: 12,
    notesCreatedThisMonth: 28,
    mostActiveDay: '周三',
    mostActiveHour: 14,
    topCategory: '技术',
    growthRate: 0.08,
  },
  timeSeries: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    notes: Math.floor(Math.random() * 5) + 1,
    views: Math.floor(Math.random() * 100) + 20,
    words: Math.floor(Math.random() * 1000) + 200,
    aiProcessed: Math.floor(Math.random() * 4),
  })),
  categoryDistribution: [
    {
      id: 1,
      name: '工作',
      color: '#3B82F6',
      count: 35,
      percentage: 28,
      views: 1200,
      averageViews: 34,
      totalWords: 15000,
      averageWords: 428,
      aiProcessed: 28,
      aiProcessingRate: 0.8,
      growth: 0.12,
    },
    {
      id: 2,
      name: '学习',
      color: '#10B981',
      count: 40,
      percentage: 32,
      views: 980,
      averageViews: 24,
      totalWords: 18000,
      averageWords: 450,
      aiProcessed: 32,
      aiProcessingRate: 0.8,
      growth: 0.08,
    },
    {
      id: 3,
      name: '技术',
      color: '#8B5CF6',
      count: 25,
      percentage: 20,
      views: 850,
      averageViews: 34,
      totalWords: 12000,
      averageWords: 480,
      aiProcessed: 20,
      aiProcessingRate: 0.8,
      growth: -0.05,
    },
  ],
  tagAnalysis: Array.from({ length: 10 }, (_, i) => ({
    name: `标签${i + 1}`,
    count: Math.floor(Math.random() * 20) + 5,
    views: Math.floor(Math.random() * 500) + 100,
    averageViews: Math.floor(Math.random() * 50) + 20,
    totalWords: Math.floor(Math.random() * 5000) + 1000,
    averageWords: Math.floor(Math.random() * 200) + 200,
    relatedTags: [`相关标签${i + 2}`, `相关标签${i + 3}`],
    trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as
      | 'up'
      | 'down'
      | 'stable',
    growth: (Math.random() - 0.3) * 0.5,
  })),
  userActivity: {
    dailyActivity: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      notesCreated: Math.floor(Math.random() * 5),
      notesEdited: Math.floor(Math.random() * 8) + 2,
      notesViewed: Math.floor(Math.random() * 15) + 5,
      searches: Math.floor(Math.random() * 10) + 1,
      timeSpent: Math.floor(Math.random() * 120) + 30,
    })),
    hourlyActivity: Array.from(
      { length: 24 },
      () => Math.floor(Math.random() * 50) + 10,
    ),
    topActivities: [
      { type: '查看笔记', count: 450, percentage: 45 },
      { type: '编辑笔记', count: 280, percentage: 28 },
      { type: '搜索', count: 150, percentage: 15 },
      { type: '创建笔记', count: 120, percentage: 12 },
    ],
    sessionStats: {
      averageSessionDuration: 25,
      totalSessions: 150,
      bounceRate: 0.25,
      returningUserRate: 0.75,
    },
  },
  aiInsights: {
    sentimentAnalysis: {
      positive: 0.45,
      negative: 0.15,
      neutral: 0.4,
      trend: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        positive: 0.4 + Math.random() * 0.2,
        negative: 0.1 + Math.random() * 0.1,
        neutral: 0.4 + Math.random() * 0.2,
      })),
    },
    contentPatterns: [
      {
        pattern: '技术学习笔记',
        count: 35,
        description: '您倾向于记录学习过程中的技术要点',
        recommendation: '建议创建专门的学习笔记模板',
      },
      {
        pattern: '项目规划文档',
        count: 28,
        description: '经常记录项目相关的规划',
        recommendation: '可以使用项目管理功能',
      },
    ],
    writingHabits: {
      averageWordsPerNote: 365,
      averageWritingTime: 15,
      mostProductiveHours: [9, 10, 14, 15, 20, 21],
      preferredCategories: ['学习', '技术'],
      improvementSuggestions: [
        '定期回顾和整理笔记',
        '使用更多AI分析功能',
        '建立笔记间的关联',
      ],
    },
    topicClusters: [
      {
        cluster: '前端开发',
        notes: 18,
        relatedTopics: ['React', 'JavaScript', 'CSS'],
        strength: 0.85,
      },
      {
        cluster: '产品设计',
        notes: 12,
        relatedTopics: ['用户研究', '原型设计'],
        strength: 0.72,
      },
    ],
  },
  trends: [
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
  ],
  ...overrides,
});

// Mock API响应工厂
export const createMockApiResponse = <T>(
  data: T,
  overrides: Partial<{
    success: boolean;
    message: string;
    error: string;
    timestamp: string;
  }> = {},
) => ({
  success: true,
  message: '操作成功',
  timestamp: new Date().toISOString(),
  data,
  ...overrides,
});

// Mock错误响应工厂
export const createMockErrorResponse = (
  message: string,
  code: string = 'ERROR',
) => ({
  success: false,
  error: message,
  code,
  timestamp: new Date().toISOString(),
});

// Mock分页响应工厂
export const createMockPaginatedResponse = <T>(
  data: T[],
  page: number = 1,
  limit: number = 10,
  total?: number,
) => ({
  success: true,
  data,
  pagination: {
    page,
    limit,
    total: total || data.length,
    totalPages: Math.ceil((total || data.length) / limit),
    hasNext: page * limit < (total || data.length),
    hasPrev: page > 1,
  },
  timestamp: new Date().toISOString(),
});

// 常用的测试用户数据
export const MOCK_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: '测试用户',
  avatar: 'https://example.com/avatar.jpg',
  role: 'user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 常用的测试环境配置
export const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api',
  DEFAULT_TIMEOUT: 5000,
  MOCK_DELAY: 100, // 模拟API延迟
  DEFAULT_PAGE_SIZE: 10,
};

// 测试用的常量
export const TEST_CONSTANTS = {
  VALID_NOTE_TITLE: '这是一个有效的笔记标题',
  VALID_NOTE_CONTENT: '这是一个有效的笔记内容，包含足够的文字来进行测试。',
  LONG_NOTE_CONTENT: '这是一个很长的笔记内容，'.repeat(100),
  INVALID_EMAIL: 'invalid-email',
  VALID_EMAIL: 'test@example.com',
  VALID_PASSWORD: 'password123',
  SHORT_PASSWORD: '123',
  SEARCH_QUERY: '测试搜索',
  EMPTY_STRING: '',
  ZERO: 0,
  ONE: 1,
};
