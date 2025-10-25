/**
 * 缓存性能监控器
 *
 * 提供实时缓存性能监控、告警和报告功能
 */

import { EventEmitter } from 'events'
import { intelligentCacheStrategyManager, DataType } from './intelligent-cache-strategy'
import { multiLevelCache, CacheLevel } from './multi-level-cache'
import { createHash } from 'crypto'

// 性能阈值配置
export interface PerformanceThresholds {
  hitRate: {
    warning: number
    critical: number
  }
  responseTime: {
    warning: number    // 毫秒
    critical: number   // 毫秒
  }
  memoryUsage: {
    warning: number    // 百分比
    critical: number   // 百分比
  }
  evictionRate: {
    warning: number    // 每分钟
    critical: number   // 每分钟
  }
  errorRate: {
    warning: number    // 百分比
    critical: number   // 百分比
  }
}

// 监控指标
export interface CacheMetrics {
  timestamp: number
  level: CacheLevel
  dataType?: DataType
  hits: number
  misses: number
  hitRate: number
  avgResponseTime: number
  memoryUsage: number
  cacheSize: number
  evictions: number
  errors: number
  throughput: number          // 每秒请求数
  concurrentConnections: number
}

// 告警级别
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

// 告警信息
export interface CacheAlert {
  id: string
  level: AlertLevel
  type: string
  message: string
  timestamp: number
  metrics: Partial<CacheMetrics>
  recommendations: string[]
  acknowledged: boolean
  resolved: boolean
}

// 性能报告
export interface PerformanceReport {
  generatedAt: number
  period: {
    start: number
    end: number
    duration: number
  }
  summary: {
    totalRequests: number
    overallHitRate: number
    avgResponseTime: number
    totalErrors: number
    availability: number
  }
  levelMetrics: Map<CacheLevel, CacheMetrics[]>
  dataTypeMetrics: Map<DataType, CacheMetrics[]>
  topErrors: Array<{
    error: string
    count: number
    percentage: number
  }>
  recommendations: string[]
  alerts: CacheAlert[]
}

// 趋势分析数据
export interface TrendData {
  period: string              // 时间周期 (1h, 6h, 24h, 7d)
  metrics: {
    hitRate: number[]
    responseTime: number[]
    memoryUsage: number[]
    throughput: number[]
    errorRate: number[]
  }
  timestamps: number[]
}

/**
 * 缓存性能监控器
 */
export class CachePerformanceMonitor extends EventEmitter {
  private metrics: Map<string, CacheMetrics[]> = new Map()
  private alerts: Map<string, CacheAlert> = new Map()
  private thresholds: PerformanceThresholds
  private monitoringInterval: NodeJS.Timeout | null = null
  private reportInterval: NodeJS.Timeout | null = null
  private isMonitoring: boolean = false
  private metricsHistorySize = 1440 // 保存24小时的分钟级数据

  constructor(private config: {
    thresholds?: Partial<PerformanceThresholds>
    monitoringInterval?: number    // 监控间隔 (毫秒)
    reportInterval?: number        // 报告生成间隔 (毫秒)
    enableAlerts?: boolean
    enableTrends?: boolean
  } = {}) {
    super()

    this.thresholds = {
      hitRate: { warning: 0.7, critical: 0.5 },
      responseTime: { warning: 100, critical: 500 },
      memoryUsage: { warning: 80, critical: 90 },
      evictionRate: { warning: 10, critical: 50 },
      errorRate: { warning: 5, critical: 10 },
      ...config.thresholds
    }

    this.setupEventHandlers()
  }

  /**
   * 启动监控
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return

    try {
      // 等待缓存系统初始化
      await intelligentCacheStrategyManager.initialize()

      // 启动指标收集
      this.startMetricsCollection()

      // 启动告警检查
      if (this.config.enableAlerts !== false) {
        this.startAlertChecking()
      }

      // 启动趋势分析
      if (this.config.enableTrends !== false) {
        this.startTrendAnalysis()
      }

      this.isMonitoring = true
      this.emit('monitoring:started')
      console.log('Cache performance monitoring started')

    } catch (error) {
      console.error('Failed to start cache monitoring:', error)
      throw error
    }
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    if (this.reportInterval) {
      clearInterval(this.reportInterval)
    }

    this.isMonitoring = false
    this.emit('monitoring:stopped')
    console.log('Cache performance monitoring stopped')
  }

  /**
   * 获取实时指标
   */
  getRealTimeMetrics(): Map<string, CacheMetrics> {
    const realTimeMetrics = new Map<string, CacheMetrics>()

    for (const [key, metricsArray] of this.metrics) {
      if (metricsArray.length > 0) {
        realTimeMetrics.set(key, metricsArray[metricsArray.length - 1])
      }
    }

    return realTimeMetrics
  }

  /**
   * 获取历史指标
   */
  getHistoricalMetrics(key: string, periodMinutes: number = 60): CacheMetrics[] {
    const metrics = this.metrics.get(key) || []
    const now = Date.now()
    const periodMs = periodMinutes * 60 * 1000

    return metrics.filter(metric => now - metric.timestamp <= periodMs)
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): CacheAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved && !alert.acknowledged)
      .sort((a, b) => {
        const priority = { [AlertLevel.CRITICAL]: 3, [AlertLevel.WARNING]: 2, [AlertLevel.INFO]: 1 }
        return priority[b.level] - priority[a.level]
      })
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    const alert = this.alerts.get(alertId)
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true
      this.emit('alert:acknowledged', alert)
      return true
    }
    return false
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.get(alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      this.emit('alert:resolved', alert)
      return true
    }
    return false
  }

  /**
   * 生成性能报告
   */
  async generatePerformanceReport(periodMinutes: number = 60): Promise<PerformanceReport> {
    const now = Date.now()
    const start = now - (periodMinutes * 60 * 1000)

    // 收集所有相关指标
    const allMetrics: CacheMetrics[] = []
    for (const metricsArray of this.metrics.values()) {
      allMetrics.push(...metricsArray.filter(m => m.timestamp >= start && m.timestamp <= now))
    }

    // 按级别分组
    const levelMetrics = new Map<CacheLevel, CacheMetrics[]>()
    for (const level of Object.values(CacheLevel)) {
      levelMetrics.set(level as CacheLevel,
        allMetrics.filter(m => m.level === level as CacheLevel)
      )
    }

    // 按数据类型分组
    const dataTypeMetrics = new Map<DataType, CacheMetrics[]>()
    for (const dataType of Object.values(DataType)) {
      dataTypeMetrics.set(dataType as DataType,
        allMetrics.filter(m => m.dataType === dataType as DataType)
      )
    }

    // 计算汇总数据
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.hits + m.misses, 0)
    const totalHits = allMetrics.reduce((sum, m) => sum + m.hits, 0)
    const totalResponseTime = allMetrics.reduce((sum, m) => sum + m.avgResponseTime * (m.hits + m.misses), 0)
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0)

    // 生成推荐建议
    const recommendations = this.generateRecommendations(allMetrics)

    // 获取相关告警
    const periodAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.timestamp >= start && alert.timestamp <= now)

    return {
      generatedAt: now,
      period: {
        start,
        end: now,
        duration: periodMinutes * 60 * 1000
      },
      summary: {
        totalRequests,
        overallHitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
        avgResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
        totalErrors,
        availability: totalRequests > 0 ? (totalRequests - totalErrors) / totalRequests : 1
      },
      levelMetrics,
      dataTypeMetrics,
      topErrors: this.getTopErrors(allMetrics),
      recommendations,
      alerts: periodAlerts
    }
  }

  /**
   * 获取趋势数据
   */
  getTrendData(period: '1h' | '6h' | '24h' | '7d' = '1h'): TrendData {
    const periodMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[period]

    const now = Date.now()
    const start = now - periodMs

    const allMetrics: CacheMetrics[] = []
    for (const metricsArray of this.metrics.values()) {
      allMetrics.push(...metricsArray.filter(m => m.timestamp >= start && m.timestamp <= now))
    }

    // 按时间分组并聚合
    const timeGroups = new Map<number, CacheMetrics[]>()
    const interval = period === '7d' ? 60 * 60 * 1000 : 5 * 60 * 1000 // 1小时或5分钟间隔

    for (const metric of allMetrics) {
      const timeKey = Math.floor(metric.timestamp / interval) * interval
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, [])
      }
      timeGroups.get(timeKey)!.push(metric)
    }

    const timestamps = Array.from(timeGroups.keys()).sort()
    const aggregatedMetrics = timestamps.map(time => {
      const group = timeGroups.get(time)!
      return this.aggregateMetrics(group)
    })

    return {
      period,
      metrics: {
        hitRate: aggregatedMetrics.map(m => m.hitRate),
        responseTime: aggregatedMetrics.map(m => m.avgResponseTime),
        memoryUsage: aggregatedMetrics.map(m => m.memoryUsage),
        throughput: aggregatedMetrics.map(m => m.throughput),
        errorRate: aggregatedMetrics.map(m => (m.errors / (m.hits + m.misses)) * 100)
      },
      timestamps
    }
  }

  /**
   * 更新阈值配置
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
    this.emit('thresholds:updated', this.thresholds)
  }

  /**
   * 获取系统健康状态
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical'
    score: number
    issues: string[]
    recommendations: string[]
  } {
    const realTimeMetrics = this.getRealTimeMetrics()
    const activeAlerts = this.getActiveAlerts()

    let healthScore = 100
    const issues: string[] = []
    const recommendations: string[] = []

    // 检查命中率
    const overallHitRate = this.calculateOverallHitRate(realTimeMetrics)
    if (overallHitRate < this.thresholds.hitRate.critical) {
      healthScore -= 30
      issues.push(`缓存命中率过低: ${(overallHitRate * 100).toFixed(1)}%`)
      recommendations.push('检查缓存策略配置，考虑增加缓存时间或优化缓存键')
    } else if (overallHitRate < this.thresholds.hitRate.warning) {
      healthScore -= 15
      issues.push(`缓存命中率较低: ${(overallHitRate * 100).toFixed(1)}%`)
      recommendations.push('监控缓存访问模式，调整预热策略')
    }

    // 检查响应时间
    const avgResponseTime = this.calculateAvgResponseTime(realTimeMetrics)
    if (avgResponseTime > this.thresholds.responseTime.critical) {
      healthScore -= 25
      issues.push(`平均响应时间过长: ${avgResponseTime.toFixed(1)}ms`)
      recommendations.push('检查缓存层级配置，优化内存缓存使用')
    } else if (avgResponseTime > this.thresholds.responseTime.warning) {
      healthScore -= 10
      issues.push(`平均响应时间较长: ${avgResponseTime.toFixed(1)}ms`)
      recommendations.push('考虑增加缓存预热或优化查询')
    }

    // 检查活跃告警
    const criticalAlerts = activeAlerts.filter(a => a.level === AlertLevel.CRITICAL)
    const warningAlerts = activeAlerts.filter(a => a.level === AlertLevel.WARNING)

    healthScore -= criticalAlerts.length * 15
    healthScore -= warningAlerts.length * 5

    if (criticalAlerts.length > 0) {
      issues.push(`${criticalAlerts.length} 个严重告警`)
    }
    if (warningAlerts.length > 0) {
      issues.push(`${warningAlerts.length} 个警告告警`)
    }

    const status = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical'

    return {
      status,
      score: Math.max(0, healthScore),
      issues,
      recommendations
    }
  }

  // === 私有方法 ===

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    intelligentCacheStrategyManager.on('cache:hit', (data) => {
      this.recordMetrics(data.key, data.dataType, true, data.responseTime)
    })

    intelligentCacheStrategyManager.on('cache:miss', (data) => {
      this.recordMetrics(data.key, data.dataType, false, data.responseTime)
    })

    intelligentCacheStrategyManager.on('cache:error', (data) => {
      this.recordError(data.key, data.dataType, data.error)
    })
  }

  /**
   * 启动指标收集
   */
  private startMetricsCollection(): void {
    const interval = this.config.monitoringInterval || 60000 // 默认1分钟

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics()
      } catch (error) {
        console.error('Metrics collection error:', error)
      }
    }, interval)

    // 启动报告生成
    const reportInterval = this.config.reportInterval || 15 * 60 * 1000 // 默认15分钟
    this.reportInterval = setInterval(async () => {
      try {
        const report = await this.generatePerformanceReport()
        this.emit('report:generated', report)
      } catch (error) {
        console.error('Report generation error:', error)
      }
    }, reportInterval)
  }

  /**
   * 启动告警检查
   */
  private startAlertChecking(): void {
    setInterval(() => {
      this.checkAlerts()
    }, 30000) // 每30秒检查一次
  }

  /**
   * 启动趋势分析
   */
  private startTrendAnalysis(): void {
    setInterval(() => {
      this.analyzeTrends()
    }, 5 * 60 * 1000) // 每5分钟分析一次
  }

  /**
   * 收集指标
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now()

    // 获取多级缓存统计
    const cacheStats = await multiLevelCache.getStats()

    for (const levelStats of cacheStats) {
      const key = `${levelStats.level}:overall`
      const metrics: CacheMetrics = {
        timestamp,
        level: levelStats.level,
        hits: levelStats.hits,
        misses: levelStats.misses,
        hitRate: levelStats.hitRate,
        avgResponseTime: levelStats.avgResponseTime,
        memoryUsage: this.calculateMemoryUsage(levelStats),
        cacheSize: levelStats.size,
        evictions: levelStats.evictions,
        errors: levelStats.errors,
        throughput: this.calculateThroughput(levelStats),
        concurrentConnections: 0 // 需要从实际连接池获取
      }

      this.storeMetrics(key, metrics)
    }

    // 获取智能策略管理器指标
    const strategyMetrics = intelligentCacheStrategyManager.getPerformanceMetrics()
    const key = 'strategy:overall'
    const metrics: CacheMetrics = {
      timestamp,
      level: CacheLevel.MEMORY, // 策略指标归类到内存级别
      hits: 0,
      misses: 0,
      hitRate: strategyMetrics.overallHitRate,
      avgResponseTime: strategyMetrics.avgResponseTime,
      memoryUsage: strategyMetrics.memoryUsage,
      cacheSize: strategyMetrics.cacheSize,
      evictions: 0,
      errors: 0,
      throughput: strategyMetrics.totalRequests / 60, // 假设每分钟的请求
      concurrentConnections: 0
    }

    this.storeMetrics(key, metrics)
  }

  /**
   * 存储指标
   */
  private storeMetrics(key: string, metrics: CacheMetrics): void {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, [])
    }

    const metricsArray = this.metrics.get(key)!
    metricsArray.push(metrics)

    // 保持历史数据大小
    if (metricsArray.length > this.metricsHistorySize) {
      metricsArray.splice(0, metricsArray.length - this.metricsHistorySize)
    }
  }

  /**
   * 记录指标
   */
  private recordMetrics(key: string, dataType: DataType, isHit: boolean, responseTime: number): void {
    const timestamp = Date.now()
    const metricsKey = `${dataType}:${key}`

    // 这里应该更新实时指标，简化处理
    // 实际实现中需要维护更复杂的实时计数器
  }

  /**
   * 记录错误
   */
  private recordError(key: string, dataType: DataType, error: any): void {
    const timestamp = Date.now()
    const metricsKey = `${dataType}:${key}:errors`

    // 记录错误指标
    const alertId = this.generateAlertId('error', key)
    const alert: CacheAlert = {
      id: alertId,
      level: AlertLevel.WARNING,
      type: 'cache_error',
      message: `缓存错误: ${error.message || error}`,
      timestamp,
      metrics: { errors: 1 },
      recommendations: ['检查缓存配置', '验证数据格式'],
      acknowledged: false,
      resolved: false
    }

    this.alerts.set(alertId, alert)
    this.emit('alert:triggered', alert)
  }

  /**
   * 检查告警
   */
  private checkAlerts(): void {
    const realTimeMetrics = this.getRealTimeMetrics()

    for (const [key, metrics] of realTimeMetrics) {
      this.checkHitRateAlert(key, metrics)
      this.checkResponseTimeAlert(key, metrics)
      this.checkMemoryUsageAlert(key, metrics)
      this.checkErrorRateAlert(key, metrics)
      this.checkEvictionRateAlert(key, metrics)
    }

    // 清理过期的告警
    this.cleanupExpiredAlerts()
  }

  /**
   * 检查命中率告警
   */
  private checkHitRateAlert(key: string, metrics: CacheMetrics): void {
    if (metrics.hitRate < this.thresholds.hitRate.critical) {
      this.triggerAlert({
        level: AlertLevel.CRITICAL,
        type: 'low_hit_rate',
        message: `${key} 缓存命中率过低: ${(metrics.hitRate * 100).toFixed(1)}%`,
        metrics: { hitRate: metrics.hitRate },
        recommendations: [
          '检查缓存键的生成逻辑',
          '验证数据更新频率',
          '考虑增加缓存时间'
        ]
      })
    } else if (metrics.hitRate < this.thresholds.hitRate.warning) {
      this.triggerAlert({
        level: AlertLevel.WARNING,
        type: 'low_hit_rate',
        message: `${key} 缓存命中率较低: ${(metrics.hitRate * 100).toFixed(1)}%`,
        metrics: { hitRate: metrics.hitRate },
        recommendations: [
          '监控访问模式',
          '优化预热策略'
        ]
      })
    }
  }

  /**
   * 检查响应时间告警
   */
  private checkResponseTimeAlert(key: string, metrics: CacheMetrics): void {
    if (metrics.avgResponseTime > this.thresholds.responseTime.critical) {
      this.triggerAlert({
        level: AlertLevel.CRITICAL,
        type: 'high_response_time',
        message: `${key} 响应时间过长: ${metrics.avgResponseTime.toFixed(1)}ms`,
        metrics: { avgResponseTime: metrics.avgResponseTime },
        recommendations: [
          '检查缓存层级配置',
          '优化内存使用',
          '考虑使用更快的存储'
        ]
      })
    } else if (metrics.avgResponseTime > this.thresholds.responseTime.warning) {
      this.triggerAlert({
        level: AlertLevel.WARNING,
        type: 'high_response_time',
        message: `${key} 响应时间较长: ${metrics.avgResponseTime.toFixed(1)}ms`,
        metrics: { avgResponseTime: metrics.avgResponseTime },
        recommendations: [
          '监控性能趋势',
          '检查并发负载'
        ]
      })
    }
  }

  /**
   * 检查内存使用告警
   */
  private checkMemoryUsageAlert(key: string, metrics: CacheMetrics): void {
    if (metrics.memoryUsage > this.thresholds.memoryUsage.critical) {
      this.triggerAlert({
        level: AlertLevel.CRITICAL,
        type: 'high_memory_usage',
        message: `${key} 内存使用率过高: ${metrics.memoryUsage.toFixed(1)}%`,
        metrics: { memoryUsage: metrics.memoryUsage },
        recommendations: [
          '清理过期缓存',
          '调整缓存大小',
          '启用数据压缩'
        ]
      })
    } else if (metrics.memoryUsage > this.thresholds.memoryUsage.warning) {
      this.triggerAlert({
        level: AlertLevel.WARNING,
        type: 'high_memory_usage',
        message: `${key} 内存使用率较高: ${metrics.memoryUsage.toFixed(1)}%`,
        metrics: { memoryUsage: metrics.memoryUsage },
        recommendations: [
          '监控内存趋势',
          '准备扩容计划'
        ]
      })
    }
  }

  /**
   * 检查错误率告警
   */
  private checkErrorRateAlert(key: string, metrics: CacheMetrics): void {
    const totalRequests = metrics.hits + metrics.misses
    const errorRate = totalRequests > 0 ? (metrics.errors / totalRequests) * 100 : 0

    if (errorRate > this.thresholds.errorRate.critical) {
      this.triggerAlert({
        level: AlertLevel.CRITICAL,
        type: 'high_error_rate',
        message: `${key} 错误率过高: ${errorRate.toFixed(1)}%`,
        metrics: { errors: metrics.errors },
        recommendations: [
          '检查缓存配置',
          '验证网络连接',
          '检查数据格式'
        ]
      })
    } else if (errorRate > this.thresholds.errorRate.warning) {
      this.triggerAlert({
        level: AlertLevel.WARNING,
        type: 'high_error_rate',
        message: `${key} 错误率较高: ${errorRate.toFixed(1)}%`,
        metrics: { errors: metrics.errors },
        recommendations: [
          '监控错误趋势',
          '检查日志详情'
        ]
      })
    }
  }

  /**
   * 检查驱逐率告警
   */
  private checkEvictionRateAlert(key: string, metrics: CacheMetrics): void {
    // 这里应该基于时间窗口计算驱逐率，简化处理
    if (metrics.evictions > this.thresholds.evictionRate.critical) {
      this.triggerAlert({
        level: AlertLevel.WARNING,
        type: 'high_eviction_rate',
        message: `${key} 缓存驱逐过多: ${metrics.evictions} 次`,
        metrics: { evictions: metrics.evictions },
        recommendations: [
          '增加缓存大小',
          '调整TTL配置',
          '优化数据结构'
        ]
      })
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(alertData: {
    level: AlertLevel
    type: string
    message: string
    metrics: Partial<CacheMetrics>
    recommendations: string[]
  }): void {
    const alertId = this.generateAlertId(alertData.type, alertData.metrics.level?.toString() || 'unknown')

    // 检查是否已存在相同的未解决告警
    const existingAlert = this.alerts.get(alertId)
    if (existingAlert && !existingAlert.resolved) {
      return // 避免重复告警
    }

    const alert: CacheAlert = {
      id: alertId,
      ...alertData,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    }

    this.alerts.set(alertId, alert)
    this.emit('alert:triggered', alert)
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(): void {
    const trendData = this.getTrendData('1h')

    // 分析命中率趋势
    const hitRateTrend = this.analyzeTrendDirection(trendData.metrics.hitRate)
    if (hitRateTrend === 'declining') {
      this.triggerAlert({
        level: AlertLevel.WARNING,
        type: 'trend_hit_rate_declining',
        message: '缓存命中率呈下降趋势',
        metrics: {},
        recommendations: ['检查缓存策略', '分析访问模式变化']
      })
    }

    // 分析响应时间趋势
    const responseTimeTrend = this.analyzeTrendDirection(trendData.metrics.responseTime)
    if (responseTimeTrend === 'increasing') {
      this.triggerAlert({
        level: AlertLevel.WARNING,
        type: 'trend_response_time_increasing',
        message: '响应时间呈上升趋势',
        metrics: {},
        recommendations: ['检查系统负载', '优化缓存配置']
      })
    }

    // 分析内存使用趋势
    const memoryTrend = this.analyzeTrendDirection(trendData.metrics.memoryUsage)
    if (memoryTrend === 'increasing') {
      this.triggerAlert({
        level: AlertLevel.INFO,
        type: 'trend_memory_increasing',
        message: '内存使用呈上升趋势',
        metrics: {},
        recommendations: ['监控内存增长', '准备清理策略']
      })
    }
  }

  /**
   * 分析趋势方向
   */
  private analyzeTrendDirection(data: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 3) return 'stable'

    const recent = data.slice(-3)
    const slope = (recent[2] - recent[0]) / 2

    if (slope > 0.1) return 'increasing'
    if (slope < -0.1) return 'decreasing'
    return 'stable'
  }

  /**
   * 清理过期告警
   */
  private cleanupExpiredAlerts(): void {
    const now = Date.now()
    const expirationTime = 24 * 60 * 60 * 1000 // 24小时

    for (const [id, alert] of this.alerts) {
      if (now - alert.timestamp > expirationTime && alert.resolved) {
        this.alerts.delete(id)
      }
    }
  }

  /**
   * 生成推荐建议
   */
  private generateRecommendations(metrics: CacheMetrics[]): string[] {
    const recommendations: string[] = []

    const avgHitRate = metrics.reduce((sum, m) => sum + m.hitRate, 0) / metrics.length
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length
    const totalErrors = metrics.reduce((sum, m) => sum + m.errors, 0)

    if (avgHitRate < 0.7) {
      recommendations.push('考虑增加缓存时间或优化缓存键生成策略')
    }

    if (avgResponseTime > 100) {
      recommendations.push('优化缓存层级配置，增加内存缓存比例')
    }

    if (totalErrors > 0) {
      recommendations.push('检查缓存配置和连接状态')
    }

    return recommendations
  }

  /**
   * 获取常见错误
   */
  private getTopErrors(metrics: CacheMetrics[]): Array<{error: string, count: number, percentage: number}> {
    // 这里应该从实际错误日志中统计，简化处理
    return []
  }

  /**
   * 聚合指标
   */
  private aggregateMetrics(metrics: CacheMetrics[]): CacheMetrics {
    if (metrics.length === 0) {
      throw new Error('Cannot aggregate empty metrics array')
    }

    const totalRequests = metrics.reduce((sum, m) => sum + m.hits + m.misses, 0)
    const totalHits = metrics.reduce((sum, m) => sum + m.hits, 0)
    const totalResponseTime = metrics.reduce((sum, m) => sum + m.avgResponseTime * (m.hits + m.misses), 0)

    return {
      timestamp: Math.floor(metrics.reduce((sum, m) => sum + m.timestamp, 0) / metrics.length),
      level: metrics[0].level,
      dataType: metrics[0].dataType,
      hits: totalHits,
      misses: totalRequests - totalHits,
      hitRate: totalHits / totalRequests,
      avgResponseTime: totalResponseTime / totalRequests,
      memoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length,
      cacheSize: metrics.reduce((sum, m) => sum + m.cacheSize, 0) / metrics.length,
      evictions: metrics.reduce((sum, m) => sum + m.evictions, 0),
      errors: metrics.reduce((sum, m) => sum + m.errors, 0),
      throughput: totalRequests / 300, // 假设5分钟间隔
      concurrentConnections: metrics.reduce((sum, m) => sum + m.concurrentConnections, 0) / metrics.length
    }
  }

  /**
   * 计算内存使用
   */
  private calculateMemoryUsage(stats: any): number {
    // 这里应该根据实际的内存使用情况计算
    return (stats.size / stats.maxSize) * 100
  }

  /**
   * 计算吞吐量
   */
  private calculateThroughput(stats: any): number {
    // 这里应该基于时间窗口计算吞吐量
    return (stats.hits + stats.misses) / 60 // 每秒请求数
  }

  /**
   * 计算整体命中率
   */
  private calculateOverallHitRate(metrics: Map<string, CacheMetrics>): number {
    let totalHits = 0
    let totalRequests = 0

    for (const metric of metrics.values()) {
      totalHits += metric.hits
      totalRequests += metric.hits + metric.misses
    }

    return totalRequests > 0 ? totalHits / totalRequests : 0
  }

  /**
   * 计算平均响应时间
   */
  private calculateAvgResponseTime(metrics: Map<string, CacheMetrics>): number {
    let totalResponseTime = 0
    let totalRequests = 0

    for (const metric of metrics.values()) {
      const requests = metric.hits + metric.misses
      totalResponseTime += metric.avgResponseTime * requests
      totalRequests += requests
    }

    return totalRequests > 0 ? totalResponseTime / totalRequests : 0
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(type: string, key: string): string {
    return createHash('md5').update(`${type}:${key}:${Date.now()}`).digest('hex').substring(0, 16)
  }
}

// 导出单例实例
export const cachePerformanceMonitor = new CachePerformanceMonitor({
  monitoringInterval: 60000,  // 1分钟
  reportInterval: 15 * 60 * 1000, // 15分钟
  enableAlerts: true,
  enableTrends: true
})

export default cachePerformanceMonitor