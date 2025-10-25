// AI服务性能监控系统
// 收集和分析AI服务的性能指标

import { Logger } from '@/lib/ai/services'

export interface PerformanceMetrics {
  // 请求指标
  requestCount: number
  successCount: number
  errorCount: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number

  // AI服务指标
  totalTokensUsed: number
  totalCost: number
  cacheHitRate: number
  modelUsage: Record<string, number>

  // 系统指标
  memoryUsage: number
  cpuUsage: number
  activeConnections: number

  // 时间窗口
  windowStart: Date
  windowEnd: Date
}

export interface RequestMetrics {
  requestId: string
  method: string
  endpoint: string
  userId?: string
  noteId?: string
  provider: string
  model: string
  tokensUsed: number
  cost: number
  responseTime: number
  status: 'success' | 'error'
  error?: string
  timestamp: Date
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private logger = Logger.getInstance()
  private requestMetrics: RequestMetrics[] = []
  private systemMetrics = {
    startTime: Date.now(),
    lastGC: 0,
    memorySnapshot: {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0
    }
  }
  private alertThresholds = {
    errorRate: 0.05, // 5%
    averageResponseTime: 5000, // 5秒
    p99ResponseTime: 10000, // 10秒
    memoryUsage: 0.8, // 80%
    cacheHitRate: 0.3 // 30%
  }
  private maxMetricsSize = 10000 // 保留最近10000个请求的指标
  private metricsWindow = 3600000 // 1小时窗口（毫秒）

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * 记录请求指标
   */
  recordRequest(metrics: Omit<RequestMetrics, 'timestamp'>): void {
    const requestMetric: RequestMetrics = {
      ...metrics,
      timestamp: new Date()
    }

    this.requestMetrics.push(requestMetric)

    // 清理旧指标
    this.cleanupOldMetrics()

    // 记录到日志
    this.logger.debug('Request recorded', {
      requestId: metrics.requestId,
      endpoint: metrics.endpoint,
      responseTime: metrics.responseTime,
      status: metrics.status
    })
  }

  /**
   * 获取性能指标
   */
  getMetrics(windowMs?: number): PerformanceMetrics {
    const window = windowMs || this.metricsWindow
    const now = new Date()
    const windowStart = new Date(now.getTime() - window)

    // 过滤窗口内的指标
    const recentMetrics = this.requestMetrics.filter(
      m => m.timestamp >= windowStart && m.timestamp <= now
    )

    if (recentMetrics.length === 0) {
      return this.getEmptyMetrics(windowStart, now)
    }

    // 计算请求指标
    const requestMetrics = this.calculateRequestMetrics(recentMetrics)

    // 计算AI服务指标
    const aiMetrics = this.calculateAIMetrics(recentMetrics)

    // 获取系统指标
    const systemMetrics = this.getSystemMetrics()

    return {
      ...requestMetrics,
      ...aiMetrics,
      ...systemMetrics,
      windowStart,
      windowEnd: now
    }
  }

  /**
   * 获取提供商使用统计
   */
  getProviderUsageStats(): Record<string, {
    requestCount: number
    successRate: number
    averageResponseTime: number
    totalCost: number
    totalTokens: number
  }> {
    const now = new Date()
    const windowStart = new Date(now.getTime() - this.metricsWindow)

    const recentMetrics = this.requestMetrics.filter(
      m => m.timestamp >= windowStart && m.timestamp <= now
    )

    const providerStats: Record<string, any> = {}

    // 按提供商分组
    const groupedByProvider = recentMetrics.reduce((acc, metric) => {
      if (!acc[metric.provider]) {
        acc[metric.provider] = []
      }
      acc[metric.provider].push(metric)
      return acc
    }, {} as Record<string, RequestMetrics[]>)

    // 计算每个提供商的统计
    for (const [provider, metrics] of Object.entries(groupedByProvider)) {
      const successCount = metrics.filter(m => m.status === 'success').length
      const totalResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0)
      const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0)
      const totalTokens = metrics.reduce((sum, m) => sum + m.tokensUsed, 0)

      providerStats[provider] = {
        requestCount: metrics.length,
        successRate: metrics.length > 0 ? successCount / metrics.length : 0,
        averageResponseTime: metrics.length > 0 ? totalResponseTime / metrics.length : 0,
        totalCost,
        totalTokens
      }
    }

    return providerStats
  }

  /**
   * 获取模型使用统计
   */
  getModelUsageStats(): Record<string, number> {
    const now = new Date()
    const windowStart = new Date(now.getTime() - this.metricsWindow)

    const recentMetrics = this.requestMetrics.filter(
      m => m.timestamp >= windowStart && m.timestamp <= now
    )

    const modelUsage: Record<string, number> = {}

    recentMetrics.forEach(metric => {
      const key = `${metric.provider}:${metric.model}`
      modelUsage[key] = (modelUsage[key] || 0) + 1
    })

    return modelUsage
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    totalErrors: number
    errorRate: number
    commonErrors: Array<{
      error: string
      count: number
      percentage: number
    }>
  } {
    const now = new Date()
    const windowStart = new Date(now.getTime() - this.metricsWindow)

    const recentMetrics = this.requestMetrics.filter(
      m => m.timestamp >= windowStart && m.timestamp <= now
    )

    const errorMetrics = recentMetrics.filter(m => m.status === 'error')
    const totalErrors = errorMetrics.length
    const totalRequests = recentMetrics.length
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0

    // 统计常见错误
    const errorCounts: Record<string, number> = {}
    errorMetrics.forEach(metric => {
      const error = metric.error || 'Unknown error'
      errorCounts[error] = (errorCounts[error] || 0) + 1
    })

    const commonErrors = Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({
        error,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }))

    return {
      totalErrors,
      errorRate,
      commonErrors
    }
  }

  /**
   * 获取用户活动统计
   */
  getUserActivityStats(): {
    totalUsers: number
    activeUsers: number
    topUsers: Array<{
      userId: string
      requestCount: number
      totalCost: number
    }>
  } {
    const now = new Date()
    const windowStart = new Date(now.getTime() - this.metricsWindow)

    const recentMetrics = this.requestMetrics.filter(
      m => m.timestamp >= windowStart && m.timestamp <= now
    )

    // 统计用户活动
    const userStats: Record<string, { requestCount: number; totalCost: number }> = {}

    recentMetrics.forEach(metric => {
      if (metric.userId) {
        if (!userStats[metric.userId]) {
          userStats[metric.userId] = { requestCount: 0, totalCost: 0 }
        }
        userStats[metric.userId].requestCount++
        userStats[metric.userId].totalCost += metric.cost
      }
    })

    const totalUsers = Object.keys(userStats).length
    const activeUsers = Object.values(userStats).filter(u => u.requestCount >= 5).length

    const topUsers = Object.entries(userStats)
      .sort((a, b) => b[1].requestCount - a[1].requestCount)
      .slice(0, 10)
      .map(([userId, stats]) => ({
        userId,
        requestCount: stats.requestCount,
        totalCost: stats.totalCost
      }))

    return {
      totalUsers,
      activeUsers,
      topUsers
    }
  }

  /**
   * 计算请求指标
   */
  private calculateRequestMetrics(metrics: RequestMetrics[]) {
    const requestCount = metrics.length
    const successCount = metrics.filter(m => m.status === 'success').length
    const errorCount = metrics.filter(m => m.status === 'error').length

    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b)
    const averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length

    const p95Index = Math.floor(responseTimes.length * 0.95)
    const p99Index = Math.floor(responseTimes.length * 0.99)

    return {
      requestCount,
      successCount,
      errorCount,
      averageResponseTime,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0
    }
  }

  /**
   * 计算AI服务指标
   */
  private calculateAIMetrics(metrics: RequestMetrics[]) {
    const totalTokensUsed = metrics.reduce((sum, m) => sum + m.tokensUsed, 0)
    const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0)

    // 模型使用统计
    const modelUsage: Record<string, number> = {}
    metrics.forEach(metric => {
      modelUsage[metric.model] = (modelUsage[metric.model] || 0) + 1
    })

    return {
      totalTokensUsed,
      totalCost,
      modelUsage
    }
  }

  /**
   * 获取系统指标
   */
  private getSystemMetrics() {
    const memoryUsage = process.memoryUsage()
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024

    return {
      memoryUsage: memoryUsageMB,
      cpuUsage: 0, // 需要额外的CPU监控实现
      activeConnections: 0 // 需要连接池监控实现
    }
  }

  /**
   * 获取空指标
   */
  private getEmptyMetrics(windowStart: Date, windowEnd: Date): PerformanceMetrics {
    return {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      cacheHitRate: 0,
      modelUsage: {},
      memoryUsage: 0,
      cpuUsage: 0,
      activeConnections: 0,
      windowStart,
      windowEnd
    }
  }

  /**
   * 清理旧指标
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.metricsWindow * 2) // 保留2倍窗口时间的数据

    const originalSize = this.requestMetrics.length
    this.requestMetrics = this.requestMetrics.filter(m => m.timestamp > cutoffTime)

    // 如果仍然超过最大大小，删除最旧的指标
    if (this.requestMetrics.length > this.maxMetricsSize) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxMetricsSize)
    }

    const cleaned = originalSize - this.requestMetrics.length
    if (cleaned > 0) {
      this.logger.debug('Cleaned up old metrics', { cleaned, remaining: this.requestMetrics.length })
    }
  }

  /**
   * 导出指标数据
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const metrics = this.getMetrics()

    if (format === 'csv') {
      return this.convertToCSV(metrics)
    }

    return JSON.stringify(metrics, null, 2)
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(metrics: PerformanceMetrics): string {
    const headers = [
      'windowStart',
      'windowEnd',
      'requestCount',
      'successCount',
      'errorCount',
      'averageResponseTime',
      'p95ResponseTime',
      'p99ResponseTime',
      'totalTokensUsed',
      'totalCost',
      'memoryUsage'
    ]

    const row = [
      metrics.windowStart.toISOString(),
      metrics.windowEnd.toISOString(),
      metrics.requestCount,
      metrics.successCount,
      metrics.errorCount,
      metrics.averageResponseTime,
      metrics.p95ResponseTime,
      metrics.p99ResponseTime,
      metrics.totalTokensUsed,
      metrics.totalCost,
      metrics.memoryUsage
    ]

    return [headers.join(','), row.join(',')].join('\n')
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance()

// 导出便捷函数
export const recordRequest = (metrics: Omit<RequestMetrics, 'timestamp'>) =>
  performanceMonitor.recordRequest(metrics)

export const getPerformanceMetrics = (windowMs?: number) =>
  performanceMonitor.getMetrics(windowMs)

export const getProviderUsageStats = () =>
  performanceMonitor.getProviderUsageStats()