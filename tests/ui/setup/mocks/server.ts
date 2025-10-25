/**
 * Mock Service Worker服务器
 *
 * 为UI测试提供模拟API响应
 */

import { setupServer } from 'msw/node'
import { rest } from 'msw'

// 创建Mock Service Worker服务器
export const server = setupServer(
  // 用户认证API
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          user: {
            id: 'test-user-id',
            name: '测试用户',
            email: 'test@example.com',
            avatar: '/test-avatar.jpg'
          },
          token: 'test-jwt-token'
        }
      })
    )
  }),

  rest.post('/api/auth/register', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          user: {
            id: 'new-user-id',
            name: '新用户',
            email: 'new@example.com'
          }
        }
      })
    )
  }),

  rest.post('/api/auth/logout', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true
      })
    )
  }),

  // 笔记管理API
  rest.get('/api/notes', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          notes: [
            {
              id: 'note-1',
              title: '测试笔记1',
              content: '这是第一个测试笔记的内容',
              tags: ['测试', '笔记'],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            },
            {
              id: 'note-2',
              title: '测试笔记2',
              content: '这是第二个测试笔记的内容',
              tags: ['测试', '自动化'],
              createdAt: '2024-01-02T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1
          }
        }
      })
    )
  }),

  rest.post('/api/notes', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: 'new-note-id',
          title: req.body.title || '新笔记',
          content: req.body.content || '',
          tags: req.body.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    )
  }),

  rest.put('/api/notes/:id', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id: req.params.id,
          title: req.body.title || '更新的笔记',
          content: req.body.content || '',
          tags: req.body.tags || [],
          updatedAt: new Date().toISOString()
        }
      })
    )
  }),

  rest.delete('/api/notes/:id', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id: req.params.id,
          deleted: true
        }
      })
    )
  }),

  // AI分析API
  rest.post('/api/ai/analyze', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          summary: '这是AI生成的摘要，包含主要内容的概括。',
          keywords: ['关键词1', '关键词2', '关键词3', '关键词4'],
          sentiment: {
            polarity: 0.5,
            confidence: 0.8,
            label: 'positive'
          },
          concepts: ['概念1', '概念2', '概念3'],
          categories: ['分类1', '分类2'],
          suggestedTags: ['建议标签1', '建议标签2', '建议标签3'],
          quality: {
            score: 4.2,
            factors: {
              coherence: 0.9,
              completeness: 0.8,
              accuracy: 0.85
            }
          }
        }
      })
    )
  }),

  rest.post('/api/ai/summary', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          summary: '这是AI生成的摘要，简明扼要地概括了原文的主要内容。',
          score: 4.2,
          confidence: 0.85
        }
      })
    )
  }),

  rest.post('/api/ai/keywords', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          keywords: [
            { word: '关键词1', score: 0.9 },
            { word: '关键词2', score: 0.8 },
            { word: '关键词3', score: 0.7 },
            { word: '关键词4', score: 0.6 }
          ]
        }
      })
    )
  }),

  rest.post('/api/ai/sentiment', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          sentiment: {
            polarity: 0.5,
            confidence: 0.8,
            label: 'positive'
          }
        }
      })
    )
  }),

  // 搜索API
  rest.get('/api/search', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          results: [
            {
              id: 'result-1',
              title: '搜索结果1',
              content: '这是第一个搜索结果的内容',
              type: 'note',
              score: 0.95
            },
            {
              id: 'result-2',
              title: '搜索结果2',
              content: '这是第二个搜索结果的内容',
              type: 'note',
              score: 0.85
            }
          ],
          query: req.url.searchParams.get('q') || '',
          total: 2
        }
      })
    )
  }),

  // 标签管理API
  rest.get('/api/tags', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          tags: [
            { id: 'tag-1', name: '测试', color: '#FF5733', count: 5 },
            { id: 'tag-2', name: '笔记', color: '#33FF57', count: 3 },
            { id: 'tag-3', name: 'AI', color: '#3357FF', count: 8 }
          ]
        }
      })
    )
  }),

  rest.post('/api/tags', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: 'new-tag-id',
          name: req.body.name,
          color: req.body.color || '#000000'
        }
      })
    )
  }),

  // 分析API
  rest.get('/api/analytics/dashboard', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          overview: {
            totalNotes: 42,
            totalTags: 15,
            aiAnalysisCount: 38,
            avgReadingTime: 5.2
          },
          trends: [
            { date: '2024-01-01', notes: 10, tags: 5, analysis: 8 },
            { date: '2024-01-02', notes: 12, tags: 6, analysis: 10 },
            { date: '2024-01-03', notes: 15, tags: 7, analysis: 12 }
          ],
          topTags: [
            { name: '测试', count: 25 },
            { name: 'AI', count: 20 },
            { name: '笔记', count: 15 }
          ]
        }
      })
    )
  }),

  // 通知API
  rest.get('/api/notifications', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          notifications: [
            {
              id: 'notif-1',
              title: '测试通知',
              message: '这是一个测试通知消息',
              type: 'info',
              read: false,
              createdAt: '2024-01-01T00:00:00Z'
            },
            {
              id: 'notif-2',
              title: '系统通知',
              message: '系统升级完成',
              type: 'success',
              read: true,
              createdAt: '2024-01-02T00:00:00Z'
            }
          ],
          unreadCount: 1
        }
      })
    )
  }),

  rest.post('/api/notifications/:id/read', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id: req.params.id,
          read: true
        }
      })
    )
  }),

  // 错误处理
  rest.get('/api/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: {
          message: '模拟服务器错误',
          code: 'INTERNAL_ERROR'
        }
      })
    )
  }),

  // 网络延迟模拟
  rest.get('/api/slow', (req, res, ctx) => {
    return res(
      ctx.delay(2000), // 2秒延迟
      ctx.status(200),
      ctx.json({
        success: true,
        data: { message: '延迟响应' }
      })
    )
  })
)

// 导出Mock数据生成器
export const mockDataGenerators = {
  generateUser: (overrides = {}) => ({
    id: 'test-user-id',
    name: '测试用户',
    email: 'test@example.com',
    avatar: '/test-avatar.jpg',
    ...overrides
  }),

  generateNote: (overrides = {}) => ({
    id: 'test-note-id',
    title: '测试笔记标题',
    content: '这是测试笔记的内容，用于验证组件功能。',
    tags: ['测试', '自动化'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }),

  generateAIAnalysis: (overrides = {}) => ({
    summary: '这是AI生成的摘要',
    keywords: ['关键词1', '关键词2', '关键词3'],
    sentiment: {
      polarity: 0.5,
      confidence: 0.8,
      label: 'positive'
    },
    score: 4.2,
    ...overrides
  }),

  generateSearchResults: (count = 5) => Array.from({ length: count }, (_, index) => ({
    id: `result-${index + 1}`,
    title: `搜索结果${index + 1}`,
    content: `这是第${index + 1}个搜索结果的内容`,
    type: 'note',
    score: 1 - (index * 0.1)
  }))
}