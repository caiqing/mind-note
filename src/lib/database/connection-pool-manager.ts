// 数据库连接池管理器
// 实现单例模式，确保数据库连接的安全管理

import { PrismaClient } from '@prisma/client'
import { Logger } from '@/lib/ai/services'

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager
  private prisma: PrismaClient | null = null
  private logger = Logger.getInstance()
  private isConnected = false
  private connectionAttempts = 0
  private readonly maxConnectionAttempts = 3

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager()
    }
    return DatabaseConnectionManager.instance
  }

  /**
   * 获取Prisma客户端实例
   */
  async getClient(): Promise<PrismaClient> {
    if (!this.prisma || !this.isConnected) {
      await this.connect()
    }
    return this.prisma!
  }

  /**
   * 建立数据库连接
   */
  private async connect(): Promise<void> {
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      throw new Error('数据库连接失败，已达到最大重试次数')
    }

    try {
      this.logger.info('正在建立数据库连接...', {
        attempt: this.connectionAttempts + 1
      })

      this.prisma = new PrismaClient({
        log: ['error', 'warn'],
        errorFormat: 'pretty'
      })

      // 测试连接
      await this.prisma.$connect()

      this.isConnected = true
      this.connectionAttempts = 0

      this.logger.info('数据库连接成功')

      // 设置优雅关闭处理
      this.setupGracefulShutdown()

    } catch (error) {
      this.connectionAttempts++
      this.logger.error('数据库连接失败', {
        error: error.message,
        attempt: this.connectionAttempts
      })

      if (this.prisma) {
        try {
          await this.prisma.$disconnect()
        } catch (disconnectError) {
          this.logger.error('断开连接失败', { error: disconnectError.message })
        }
        this.prisma = null
      }

      // 指数退避重试
      const delay = Math.pow(2, this.connectionAttempts) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))

      throw error
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    if (this.prisma && this.isConnected) {
      try {
        await this.prisma.$disconnect()
        this.isConnected = false
        this.logger.info('数据库连接已断开')
      } catch (error) {
        this.logger.error('断开数据库连接失败', { error: error.message })
        throw error
      }
    }
  }

  /**
   * 检查连接状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.prisma) {
        return false
      }

      // 执行简单查询测试连接
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      this.logger.warn('数据库健康检查失败', { error: error.message })
      this.isConnected = false
      return false
    }
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats() {
    return {
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      maxConnectionAttempts: this.maxConnectionAttempts
    }
  }

  /**
   * 设置优雅关闭处理
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`收到${signal}信号，正在优雅关闭数据库连接...`)

      try {
        await this.disconnect()
        process.exit(0)
      } catch (error) {
        this.logger.error('优雅关闭失败', { error: error.message })
        process.exit(1)
      }
    }

    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')) // nodemon restart
  }

  /**
   * 执行数据库操作（带自动重连）
   */
  async executeOperation<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
    retries: number = 2
  ): Promise<T> {
    const client = await this.getClient()

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation(client)
      } catch (error: any) {
        this.logger.warn(`数据库操作失败 (尝试 ${attempt + 1}/${retries + 1})`, {
          error: error.message,
          code: error.code
        })

        // 如果是连接相关错误，尝试重连
        if (this.isConnectionError(error) && attempt < retries) {
          this.isConnected = false
          await this.connect()
          continue
        }

        throw error
      }
    }

    throw new Error('数据库操作失败，已达到最大重试次数')
  }

  /**
   * 判断是否为连接相关错误
   */
  private isConnectionError(error: any): boolean {
    const connectionErrorCodes = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'P1001', // Prisma连接错误
      'P1002'  // Prisma连接超时
    ]

    return connectionErrorCodes.includes(error.code) ||
           error.message?.includes('connection') ||
           error.message?.includes('timeout')
  }
}

// 导出单例实例
export const dbManager = DatabaseConnectionManager.getInstance()

// 导出便捷方法
export const getPrismaClient = () => dbManager.getClient()
export const executeDBOperation = <T>(operation: (prisma: PrismaClient) => Promise<T>) =>
  dbManager.executeOperation(operation)