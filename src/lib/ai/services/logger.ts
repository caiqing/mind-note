// AI服务日志记录

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  userId?: string
  noteId?: string
  providerId?: string
  requestId?: string
}

export class AIServiceLogger {
  private static instance: AIServiceLogger
  private logs: LogEntry[] = []
  private maxLogs: number = 1000

  private constructor() {}

  static getInstance(): AIServiceLogger {
    if (!AIServiceLogger.instance) {
      AIServiceLogger.instance = new AIServiceLogger()
    }
    return AIServiceLogger.instance
  }

  /**
   * 记录日志
   */
  log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: context?.userId,
      noteId: context?.noteId,
      providerId: context?.providerId,
      requestId: context?.requestId
    }

    this.logs.push(logEntry)

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // 控制台输出
    this.outputToConsole(logEntry)
  }

  /**
   * 记录调试信息
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * 记录信息
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * 记录警告
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * 记录错误
   */
  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context)
  }

  /**
   * 记录分析请求开始
   */
  logAnalysisStart(
    userId: string,
    noteId: string,
    providerId: string,
    requestId: string,
    options: Record<string, any>
  ): void {
    this.info('AI分析请求开始', {
      userId,
      noteId,
      providerId,
      requestId,
      analysisType: options.type,
      contentLength: options.contentLength
    })
  }

  /**
   * 记录分析请求成功
   */
  logAnalysisSuccess(
    userId: string,
    noteId: string,
    providerId: string,
    requestId: string,
    result: Record<string, any>
  ): void {
    this.info('AI分析请求成功', {
      userId,
      noteId,
      providerId,
      requestId,
      processingTime: result.processingTime,
      tokenCount: result.tokenCount,
      cost: result.cost,
      model: result.model
    })
  }

  /**
   * 记录分析请求失败
   */
  logAnalysisError(
    userId: string,
    noteId: string,
    providerId: string,
    requestId: string,
    error: Error
  ): void {
    this.error('AI分析请求失败', {
      userId,
      noteId,
      providerId,
      requestId,
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack
    })
  }

  /**
   * 记录性能指标
   */
  logMetrics(metrics: {
    providerId: string
    responseTime: number
    tokenCount: number
    cost: number
    success: boolean
  }): void {
    const level = metrics.success ? LogLevel.INFO : LogLevel.WARN
    const message = metrics.success ? 'AI服务性能指标' : 'AI服务性能异常'

    this.log(level, message, {
      providerId: metrics.providerId,
      responseTime: metrics.responseTime,
      tokenCount: metrics.tokenCount,
      cost: metrics.cost,
      success: metrics.success
    })
  }

  /**
   * 获取日志
   */
  getLogs(filter?: {
    level?: LogLevel
    userId?: string
    noteId?: string
    providerId?: string
    startTime?: Date
    endTime?: Date
    limit?: number
  }): LogEntry[] {
    let filteredLogs = [...this.logs]

    // 按级别过滤
    if (filter?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level)
    }

    // 按用户过滤
    if (filter?.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filter.userId)
    }

    // 按笔记过滤
    if (filter?.noteId) {
      filteredLogs = filteredLogs.filter(log => log.noteId === filter.noteId)
    }

    // 按提供商过滤
    if (filter?.providerId) {
      filteredLogs = filteredLogs.filter(log => log.providerId === filter.providerId)
    }

    // 按时间范围过滤
    if (filter?.startTime) {
      const startTime = filter.startTime.toISOString()
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startTime)
    }

    if (filter?.endTime) {
      const endTime = filter.endTime.toISOString()
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endTime)
    }

    // 限制数量
    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(-filter.limit)
    }

    return filteredLogs
  }

  /**
   * 获取统计信息
   */
  getStats(filter?: {
    userId?: string
    providerId?: string
    startTime?: Date
    endTime?: Date
  }): {
    total: number
    byLevel: Record<LogLevel, number>
    byProvider: Record<string, number>
    avgResponseTime?: number
    successRate?: number
  } {
    const logs = this.getLogs(filter)

    const byLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0
    }

    const byProvider: Record<string, number> = {}

    let totalResponseTime = 0
    let responseTimeCount = 0
    let successCount = 0
    let totalMetrics = 0

    logs.forEach(log => {
      // 按级别统计
      byLevel[log.level]++

      // 按提供商统计
      if (log.providerId) {
        byProvider[log.providerId] = (byProvider[log.providerId] || 0) + 1
      }

      // 性能指标统计
      if (log.context?.responseTime) {
        totalResponseTime += log.context.responseTime
        responseTimeCount++
      }

      if (log.context?.success !== undefined) {
        totalMetrics++
        if (log.context.success) {
          successCount++
        }
      }
    })

    return {
      total: logs.length,
      byLevel,
      byProvider,
      avgResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : undefined,
      successRate: totalMetrics > 0 ? (successCount / totalMetrics) * 100 : undefined
    }
  }

  /**
   * 清除日志
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString()
    const context = [
      logEntry.providerId && `[${logEntry.providerId}]`,
      logEntry.userId && `[User:${logEntry.userId}]`,
      logEntry.noteId && `[Note:${logEntry.noteId}]`,
      logEntry.requestId && `[Req:${logEntry.requestId}]`
    ].filter(Boolean).join(' ')

    const message = context ? `${context} ${logEntry.message}` : logEntry.message

    switch (logEntry.level) {
      case LogLevel.DEBUG:
        console.debug(`🐛 [${timestamp}] DEBUG: ${message}`, logEntry.context)
        break
      case LogLevel.INFO:
        console.info(`ℹ️ [${timestamp}] INFO: ${message}`, logEntry.context)
        break
      case LogLevel.WARN:
        console.warn(`⚠️ [${timestamp}] WARN: ${message}`, logEntry.context)
        break
      case LogLevel.ERROR:
        console.error(`❌ [${timestamp}] ERROR: ${message}`, logEntry.context)
        break
    }
  }
}

// 导出单例实例
export const logger = AIServiceLogger.getInstance()