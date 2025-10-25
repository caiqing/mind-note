/**
 * E2E测试环境设置
 *
 * 配置测试环境、数据库连接和全局测试工具
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { E2E_CONFIG, CLEANUP_CONFIG } from '../config/e2e.config'

// 测试数据库客户端
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: E2E_CONFIG.DATABASE_URL
    }
  }
})

// 测试Redis客户端
export const testRedis = new Redis(E2E_CONFIG.REDIS_URL)

// 测试数据存储
export const testData = {
  users: [],
  notes: [],
  tags: [],
  notifications: [],
  sessions: []
}

// 测试工具类
export class TestUtils {
  /**
   * 生成测试用户数据
   */
  static generateTestUser(override?: Partial<any>) {
    return {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'TestPassword123!',
      ...override
    }
  }

  /**
   * 生成测试笔记数据
   */
  static generateTestNote(userId: string, override?: Partial<any>) {
    return {
      title: `测试笔记 - ${Date.now()}`,
      content: '这是一个测试笔记的内容，用于验证系统功能正常工作。',
      userId,
      tags: ['test', 'automated'],
      status: 'published',
      ...override
    }
  }

  /**
   * 生成测试标签数据
   */
  static generateTestTag(userId: string, override?: Partial<any>) {
    return {
      name: `测试标签-${Date.now()}`,
      color: '#FF5733',
      userId,
      ...override
    }
  }

  /**
   * 生成测试通知数据
   */
  static generateTestNotification(userId: string, override?: Partial<any>) {
    return {
      title: '测试通知',
      message: '这是一个测试通知消息',
      type: 'info',
      userId,
      ...override
    }
  }

  /**
   * 等待指定时间
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 重试操作
   */
  static async retry<T>(
    fn: () => Promise<T>,
    attempts: number = E2E_CONFIG.RETRY.ATTEMPTS,
    delay: number = E2E_CONFIG.RETRY.DELAY
  ): Promise<T> {
    let lastError: Error

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        if (i < attempts - 1) {
          await this.wait(delay)
        }
      }
    }

    throw lastError!
  }

  /**
   * 清理数据库表
   */
  static async cleanupDatabase(tables?: string[]): Promise<void> {
    const tablesToClean = tables || [
      'notifications',
      'note_tags',
      'tags',
      'notes',
      'sessions',
      'users'
    ]

    // 按依赖关系顺序删除
    for (const table of tablesToClean) {
      try {
        await testPrisma.$executeRawUnsafe(`DELETE FROM ${table}`)
      } catch (error) {
        console.warn(`清理表 ${table} 失败:`, error)
      }
    }
  }

  /**
   * 清理Redis数据
   */
  static async cleanupRedis(): Promise<void> {
    try {
      await testRedis.flushdb()
    } catch (error) {
      console.warn('清理Redis失败:', error)
    }
  }

  /**
   * 创建测试用户
   */
  static async createTestUser(userData?: Partial<any>) {
    const user = this.generateTestUser(userData)

    const createdUser = await testPrisma.user.create({
      data: {
        ...user,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    testData.users.push(createdUser)
    return createdUser
  }

  /**
   * 创建测试笔记
   */
  static async createTestNote(userId: string, noteData?: Partial<any>) {
    const note = this.generateTestNote(userId, noteData)

    const createdNote = await testPrisma.note.create({
      data: {
        ...note,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    testData.notes.push(createdNote)
    return createdNote
  }

  /**
   * 创建测试标签
   */
  static async createTestTag(userId: string, tagData?: Partial<any>) {
    const tag = this.generateTestTag(userId, tagData)

    const createdTag = await testPrisma.tag.create({
      data: {
        ...tag,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    testData.tags.push(createdTag)
    return createdTag
  }

  /**
   * 创建测试通知
   */
  static async createTestNotification(userId: string, notificationData?: Partial<any>) {
    const notification = this.generateTestNotification(userId, notificationData)

    const createdNotification = await testPrisma.notification.create({
      data: {
        ...notification,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    testData.notifications.push(createdNotification)
    return createdNotification
  }

  /**
   * 模拟AI分析响应
   */
  static mockAIAnalysis(content: string) {
    return {
      summary: `这是对"${content.substring(0, 20)}..."的自动摘要`,
      keywords: ['关键词1', '关键词2', '关键词3'],
      sentiment: {
        polarity: 0.5,
        confidence: 0.8,
        label: 'positive'
      },
      concepts: ['概念1', '概念2'],
      categories: ['分类1', '分类2'],
      suggestedTags: ['建议标签1', '建议标签2'],
      quality: {
        score: 4.2,
        factors: {
          coherence: 0.9,
          completeness: 0.8,
          accuracy: 0.85
        }
      }
    }
  }

  /**
   * 验证API响应格式
   */
  static validateApiResponse(response: any, expectedFields: string[]): boolean {
    for (const field of expectedFields) {
      if (!(field in response)) {
        console.error(`缺少字段: ${field}`)
        return false
      }
    }
    return true
  }

  /**
   * 生成随机字符串
   */
  static randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * 生成随机邮箱
   */
  static randomEmail(): string {
    return `test-${this.randomString(8)}@example.com`
  }
}

// 全局测试设置
beforeAll(async () => {
  console.log('🚀 开始E2E测试环境初始化...')

  try {
    // 测试数据库连接
    await testPrisma.$connect()
    console.log('✅ 数据库连接成功')

    // 测试Redis连接
    await testRedis.connect()
    console.log('✅ Redis连接成功')

    // 清理测试环境
    if (CLEANUP_CONFIG.beforeAll.users || CLEANUP_CONFIG.beforeAll.notes) {
      await TestUtils.cleanupDatabase()
      console.log('✅ 数据库清理完成')
    }

    if (CLEANUP_CONFIG.beforeAll.users || CLEANUP_CONFIG.beforeAll.notes) {
      await TestUtils.cleanupRedis()
      console.log('✅ Redis清理完成')
    }

    console.log('🎉 E2E测试环境初始化完成')
  } catch (error) {
    console.error('❌ E2E测试环境初始化失败:', error)
    throw error
  }
})

afterAll(async () => {
  console.log('🧹 开始清理E2E测试环境...')

  try {
    // 清理测试数据
    if (CLEANUP_CONFIG.afterAll.users || CLEANUP_CONFIG.afterAll.notes) {
      await TestUtils.cleanupDatabase()
      console.log('✅ 数据库清理完成')
    }

    // 断开数据库连接
    await testPrisma.$disconnect()
    console.log('✅ 数据库连接已断开')

    // 断开Redis连接
    await testRedis.disconnect()
    console.log('✅ Redis连接已断开')

    console.log('🎉 E2E测试环境清理完成')
  } catch (error) {
    console.error('❌ E2E测试环境清理失败:', error)
  }
})

// 每个测试前的设置
beforeEach(async () => {
  // 可以在这里添加每个测试前的通用设置
})

// 每个测试后的清理
afterEach(async () => {
  // 可以在这里添加每个测试后的通用清理
})

// 导出测试工具
export { beforeAll, afterAll, beforeEach, afterEach }