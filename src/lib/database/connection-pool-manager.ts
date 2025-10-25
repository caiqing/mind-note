// 数据库连接池管理器
// 实现单例模式，确保数据库连接的安全管理
// 生产级连接池配置优化

import { PrismaClient } from '@prisma/client'
import { Logger } from '@/lib/ai/services'

export interface DatabaseConfig {
  connectionLimit?: number
  poolTimeout?: number
  connectTimeout?: number
  idleTimeout?: number
  maxLifetime?: number
  binaryTargets?: string[]
  logLevel?: ('info' | 'warn' | 'error' | 'query')[]
  enableQueryLogging?: boolean
  enableSlowQueryLogging?: boolean
  slowQueryThreshold?: number
}

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager
  private prisma: PrismaClient | null = null
  private logger = Logger.getInstance()
  private isConnected = false
  private connectionAttempts = 0
  private readonly maxConnectionAttempts = 5
  private config: DatabaseConfig
  private connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0,
    lastHealthCheck: new Date(),
    averageQueryTime: 0,
    slowQueries: 0
  }

  private constructor() {
    this.config = this.loadConfig()
  }

  /**
   * 加载数据库配置
   */
  private loadConfig(): DatabaseConfig {
    return {
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20'),
      poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '10000'),
      connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '60000'),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'),
      maxLifetime: parseInt(process.env.DB_MAX_LIFETIME || '1800000'),
      binaryTargets: process.env.DB_BINARY_TARGETS?.split(',') || ['native', 'linux-musl'],
      logLevel: (process.env.DB_LOG_LEVEL?.split(',') as any) || ['error', 'warn'],
      enableQueryLogging: process.env.DB_ENABLE_QUERY_LOGGING === 'true',
      enableSlowQueryLogging: process.env.DB_ENABLE_SLOW_QUERY_LOGGING !== 'false',
      slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000')
    }
  }

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
      this.connectionMetrics.failedConnections++
      throw new Error('数据库连接失败，已达到最大重试次数')
    }

    try {
      this.logger.info('正在建立数据库连接...', {
        attempt: this.connectionAttempts + 1,
        config: {
          connectionLimit: this.config.connectionLimit,
          poolTimeout: this.config.poolTimeout,
          connectTimeout: this.config.connectTimeout
        }
      })

      // 构建日志配置
      const logConfig: any = []
      if (this.config.logLevel) {
        logConfig.push(...this.config.logLevel)
      }
      if (this.config.enableSlowQueryLogging) {
        logConfig.push('slow_query')
      }

      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        },
        log: logConfig.length > 0 ? logConfig : ['error', 'warn'],
        errorFormat: 'pretty',
        // 连接池配置
        __internal: {
          engine: {
            connectionLimit: this.config.connectionLimit,
            poolTimeout: this.config.poolTimeout,
            connectTimeout: this.config.connectTimeout,
            binaryTargets: this.config.binaryTargets
          }
        }
      })

      // 设置查询中间件
      if (this.config.enableQueryLogging || this.config.enableSlowQueryLogging) {
        this.setupQueryMiddleware()
      }

      // 测试连接
      await this.prisma.$connect()

      // 运行连接初始化脚本
      await this.runConnectionInitScripts()

      this.isConnected = true
      this.connectionAttempts = 0
      this.connectionMetrics.totalConnections++
      this.connectionMetrics.lastHealthCheck = new Date()

      this.logger.info('数据库连接成功', {
        connectionId: this.getConnectionId(),
        poolConfig: {
          connectionLimit: this.config.connectionLimit,
          timeout: this.config.poolTimeout
        }
      })

      // 设置优雅关闭处理
      this.setupGracefulShutdown()

    } catch (error) {
      this.connectionAttempts++
      this.connectionMetrics.failedConnections++
      this.logger.error('数据库连接失败', {
        error: error.message,
        attempt: this.connectionAttempts,
        config: {
          databaseUrl: process.env.DATABASE_URL?.substring(0, 20) + '...'
        }
      })

      if (this.prisma) {
        try {
          await this.prisma.$disconnect()
        } catch (disconnectError) {
          this.logger.error('断开连接失败', { error: disconnectError.message })
        }
        this.prisma = null
      }

      // 指数退避重试，添加最大延迟限制
      const baseDelay = Math.pow(2, this.connectionAttempts) * 1000
      const maxDelay = 30000 // 最大30秒
      const delay = Math.min(baseDelay, maxDelay)

      this.logger.info(`等待 ${delay}ms 后重试连接...`)
      await new Promise(resolve => setTimeout(resolve, delay))

      throw error
    }
  }

  /**
   * 设置查询中间件
   */
  private setupQueryMiddleware(): void {
    if (!this.prisma) return

    this.prisma.$use(async (params, next) => {
      const startTime = Date.now()

      try {
        const result = await next(params)
        const queryTime = Date.now() - startTime

        // 更新平均查询时间
        this.updateAverageQueryTime(queryTime)

        // 检查慢查询
        if (this.config.enableSlowQueryLogging && queryTime > this.config.slowQueryThreshold!) {
          this.connectionMetrics.slowQueries++
          this.logger.warn('检测到慢查询', {
            model: params.model,
            action: params.action,
            queryTime,
            threshold: this.config.slowQueryThreshold
          })
        }

        if (this.config.enableQueryLogging) {
          this.logger.debug('查询执行', {
            model: params.model,
            action: params.action,
            queryTime,
            args: params.args
          })
        }

        return result
      } catch (error) {
        const queryTime = Date.now() - startTime
        this.logger.error('查询执行失败', {
          model: params.model,
          action: params.action,
          queryTime,
          error: error.message
        })
        throw error
      }
    })
  }

  /**
   * 运行连接初始化脚本
   */
  private async runConnectionInitScripts(): Promise<void> {
    if (!this.prisma) return

    try {
      // 设置数据库会话参数
      await this.prisma.$executeRaw`
        SET session timezone TO 'UTC';
        SET statement_timeout TO ${this.config.poolTimeout};
      `

      // 检查并优化表统计信息（可选，仅在生产环境）
      if (process.env.NODE_ENV === 'production') {
        await this.prisma.$executeRaw`
          ANALYZE notes;
          ANALYZE ai_analysis;
          ANALYZE embedding_vectors;
        `
      }

      this.logger.debug('数据库初始化脚本执行完成')
    } catch (error) {
      this.logger.warn('数据库初始化脚本执行失败', { error: error.message })
      // 不抛出错误，连接仍然有效
    }
  }

  /**
   * 更新平均查询时间
   */
  private updateAverageQueryTime(queryTime: number): void {
    const alpha = 0.1 // 指数移动平均的平滑因子
    this.connectionMetrics.averageQueryTime =
      alpha * queryTime + (1 - alpha) * this.connectionMetrics.averageQueryTime
  }

  /**
   * 生成连接ID
   */
  private getConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
      maxConnectionAttempts: this.maxConnectionAttempts,
      metrics: { ...this.connectionMetrics },
      config: { ...this.config }
    }
  }

  /**
   * 获取详细的性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.connectionMetrics,
      successRate: this.connectionMetrics.totalConnections > 0
        ? (this.connectionMetrics.totalConnections - this.connectionMetrics.failedConnections) / this.connectionMetrics.totalConnections
        : 0,
      slowQueryRate: this.connectionMetrics.totalConnections > 0
        ? this.connectionMetrics.slowQueries / this.connectionMetrics.totalConnections
        : 0,
      uptime: this.isConnected ? Date.now() - this.connectionMetrics.lastHealthCheck.getTime() : 0
    }
  }

  /**
   * 重置连接指标
   */
  resetMetrics(): void {
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      lastHealthCheck: new Date(),
      averageQueryTime: 0,
      slowQueries: 0
    }
    this.logger.info('数据库连接指标已重置')
  }

  /**
   * 获取数据库状态
   */
  async getDatabaseStatus(): Promise<{
    connected: boolean
    size?: string
    version?: string
    activeConnections?: number
    maxConnections?: number
  }> {
    try {
      if (!this.prisma || !this.isConnected) {
        return { connected: false }
      }

      // 获取数据库基本信息
      const [versionResult, sizeResult, connectionsResult] = await Promise.allSettled([
        this.prisma.$queryRaw<{ version: string }[]>`SELECT version() as version`,
        this.prisma.$queryRaw<{ size: string }[]>`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `,
        this.prisma.$queryRaw<{
          active: number;
          max: number
        }[]>`
          SELECT
            count(*) as active,
            (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max
          FROM pg_stat_activity
          WHERE state = 'active'
        `
      ])

      return {
        connected: true,
        version: versionResult.status === 'fulfilled' ? versionResult.value[0]?.version : undefined,
        size: sizeResult.status === 'fulfilled' ? sizeResult.value[0]?.size : undefined,
        activeConnections: connectionsResult.status === 'fulfilled' ? connectionsResult.value[0]?.active : undefined,
        maxConnections: connectionsResult.status === 'fulfilled' ? connectionsResult.value[0]?.max : undefined
      }
    } catch (error) {
      this.logger.error('获取数据库状态失败', { error: error.message })
      return { connected: false }
    }
  }

  /**
   * 执行数据库操作包装器
   */
  async executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string = 'database_operation'
  ): Promise<T> {
    const startTime = Date.now()

    try {
      // 确保连接可用
      if (!this.isConnected) {
        await this.getClient()
      }

      this.connectionMetrics.activeConnections++
      const result = await operation()
      this.connectionMetrics.activeConnections--

      const executionTime = Date.now() - startTime
      this.logger.debug('数据库操作完成', {
        operation: operationName,
        executionTime
      })

      return result
    } catch (error) {
      this.connectionMetrics.activeConnections--
      this.logger.error('数据库操作失败', {
        operation: operationName,
        executionTime: Date.now() - startTime,
        error: error.message
      })

      // 检查是否是连接错误
      if (this.isConnectionError(error)) {
        this.isConnected = false
        this.logger.warn('检测到连接错误，标记连接为不可用')
      }

      throw error
    }
  }

  /**
   * 检查是否是连接错误
   */
  private isConnectionError(error: any): boolean {
    const connectionErrorMessages = [
      'connection',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'database is locked',
      'too many connections'
    ]

    const errorMessage = error?.message?.toLowerCase() || ''
    return connectionErrorMessages.some(msg => errorMessage.includes(msg))
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