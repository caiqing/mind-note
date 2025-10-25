/**
 * E2E测试配置文件
 *
 * 配置端到端测试的基础设置、环境变量和全局配置
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // E2E测试配置
    testTimeout: 30000, // 30秒超时
    hookTimeout: 10000,

    // 测试环境配置
    environment: 'jsdom',
    setupFiles: ['./tests/e2e/setup/setup.ts'],

    // 全局配置
    globals: true,

    // 报告配置
    reporter: ['verbose', 'html', 'json'],
    outputFile: {
      html: './tests/e2e/reports/index.html',
      json: './tests/e2e/reports/e2e-results.json'
    },

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/dist/**',
        '**/coverage/**'
      ],
      reportsDirectory: './tests/e2e/coverage'
    },

    // 测试文件匹配模式
    include: [
      'tests/e2e/**/*.test.{ts,tsx}',
      'tests/e2e/**/*.spec.{ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      '**/*.d.ts'
    ]
  },

  // 路径解析配置
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
      '@tests': resolve(__dirname, '../..')
    }
  },

  // 环境变量配置
  define: {
    'process.env.NODE_ENV': '"test"'
  }
})

// E2E测试环境变量
export const E2E_CONFIG = {
  // 基础URL配置
  BASE_URL: process.env.E2E_BASE_URL || 'http://localhost:3000',

  // 数据库配置
  DATABASE_URL: process.env.E2E_DATABASE_URL || 'postgresql://mindnote:test@localhost:5432/mindnote_test',

  // Redis配置
  REDIS_URL: process.env.E2E_REDIS_URL || 'redis://localhost:6379/1',

  // AI服务配置
  OPENAI_API_KEY: process.env.E2E_OPENAI_API_KEY || 'test-key',
  ANTHROPIC_API_KEY: process.env.E2E_ANTHROPIC_API_KEY || 'test-key',

  // 测试用户配置
  TEST_USER: {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  },

  // 超时配置
  TIMEOUTS: {
    NAVIGATION: 5000,
    ELEMENT_LOAD: 10000,
    API_RESPONSE: 15000,
    AI_PROCESSING: 30000
  },

  // 重试配置
  RETRY: {
    ATTEMPTS: 3,
    DELAY: 1000
  }
}

// 测试场景配置
export const TEST_SCENARIOS = {
  // 用户注册登录流程
  AUTH_FLOW: {
    enabled: true,
    userData: {
      email: 'e2e-test@example.com',
      password: 'E2ETestPassword123!',
      name: 'E2E Test User'
    }
  },

  // 笔记管理流程
  NOTE_MANAGEMENT: {
    enabled: true,
    testNotes: [
      {
        title: 'E2E测试笔记1',
        content: '这是一个端到端测试笔记的内容，包含AI分析功能测试。',
        tags: ['test', 'e2e', 'automated']
      },
      {
        title: 'E2E测试笔记2',
        content: '另一个测试笔记，用于测试笔记列表和搜索功能。',
        tags: ['test', 'search', 'content']
      }
    ]
  },

  // AI功能测试
  AI_FEATURES: {
    enabled: process.env.E2E_TEST_AI === 'true',
    testContent: '这是一段用于测试AI分析功能的文本内容。包含了情感分析、关键词提取、自动摘要等功能测试。',
    expectedFeatures: ['summary', 'keywords', 'sentiment', 'tags']
  },

  // 搜索功能测试
  SEARCH_FEATURES: {
    enabled: true,
    searchQueries: [
      'test',
      'AI',
      '分析',
      '笔记'
    ],
    expectedResults: {
      minResults: 1,
      maxResults: 50
    }
  },

  // 标签管理测试
  TAG_MANAGEMENT: {
    enabled: true,
    testTags: [
      'test-tag-1',
      'test-tag-2',
      '自动化测试',
      'E2E测试'
    ]
  },

  // 通知功能测试
  NOTIFICATIONS: {
    enabled: true,
    testNotification: {
      title: 'E2E测试通知',
      message: '这是一个端到端测试通知',
      type: 'info'
    }
  }
}

// 浏览器配置
export const BROWSER_CONFIG = {
  headless: process.env.E2E_HEADLESS !== 'false',
  viewport: {
    width: 1920,
    height: 1080
  },
  userAgent: 'MindNote-E2E-Tests/1.0.0',
  ignoreHTTPSErrors: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
}

// 数据库清理配置
export const CLEANUP_CONFIG = {
  // 测试前清理
  beforeAll: {
    users: true,
    notes: true,
    tags: true,
    notifications: true,
    analytics: true
  },

  // 测试后清理
  afterAll: {
    users: true,
    notes: true,
    tags: true,
    notifications: false, // 保留通知用于验证
    analytics: true
  },

  // 保留模式（仅清理测试数据）
  preserveMode: process.env.E2E_PRESERVE_DATA === 'true'
}

// 报告配置
export const REPORT_CONFIG = {
  // 截图配置
  screenshots: {
    enabled: true,
    onFailure: true,
    onSuccess: false,
    directory: './tests/e2e/reports/screenshots'
  },

  // 视频录制
  video: {
    enabled: process.env.E2E_RECORD_VIDEO === 'true',
    directory: './tests/e2e/reports/videos'
  },

  // 网络日志
  networkLogs: {
    enabled: process.env.E2E_DEBUG === 'true',
    directory: './tests/e2e/reports/network'
  },

  // 控制台日志
  consoleLogs: {
    enabled: true,
    directory: './tests/e2e/reports/console'
  }
}