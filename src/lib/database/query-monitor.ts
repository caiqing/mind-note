/**
 * 数据库查询性能监控器
 *
 * 提供实时查询性能监控、慢查询检测、查询优化建议
 * 和性能报告生成功能
 */

import { EventEmitter } from 'events'
import { hashContent } from '@/lib/security/enhanced-hash'
import { connectionPoolManager, ConnectionType } from './connection-pool-manager'

// 查询性能级别
export enum QueryPerformanceLevel {
  EXCELLENT = 'excellent',    // < 10ms
  GOOD = 'good',              // 10-50ms
  ACCEPTABLE = 'acceptable',  // 50-200ms
  SLOW = 'slow',              // 200-1000ms
  VERY_SLOW = 'very_slow',    // > 1000ms
}

// 查询类型
export enum QueryType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CREATE = 'CREATE',
  ALTER = 'ALTER',
  DROP = 'DROP',
  INDEX = 'INDEX',
  TRANSACTION = 'TRANSACTION',
  PROCEDURE = 'PROCEDURE',
  FUNCTION = 'FUNCTION',
}

// 查询记录
export interface QueryRecord {
  id: string
  query: string
  params: any[]
  type: QueryType
  executionTime: number
  affectedRows: number
  poolName: string
  connectionType: ConnectionType
  timestamp: number
  userId?: string
  sessionId?: string
  requestId?: string
  tags: string[]
  success: boolean
  error?: string
  performanceLevel: QueryPerformanceLevel
  cacheHit?: boolean
  indexUsage?: string[]
  tablesAccessed: string[]
  estimatedCost?: number
}

// 查询统计信息
export interface QueryStats {
  queryPattern: string           // 查询模式（去除参数的模板）
  type: QueryType
  totalExecutions: number
  averageExecutionTime: number
  minExecutionTime: number
  maxExecutionTime: number
  totalRowsAffected: number
  averageRowsAffected: number
  successRate: number
  errorCount: number
  lastExecuted: number
  frequency: number               // 每分钟执行次数
  performanceLevel: QueryPerformanceLevel
  optimizationSuggestions: string[]
}

// 慢查询记录
export interface SlowQueryRecord extends QueryRecord {
  analysis: {
    reason: string                // 慢查询原因
    suggestions: string[]         // 优化建议
    missingIndexes: string[]      // 缺失的索引
    tableScanDetected: boolean    // 是否检测到全表扫描
    nPlusOneDetected: boolean     // 是否检测到N+1查询
    cartesianProduct: boolean     // 是否检测到笛卡尔积
    subqueryIssue: boolean        // 是否检测到子查询问题
  }
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
    totalQueries: number
    averageExecutionTime: number
    slowQueries: number
    errorRate: number
    cacheHitRate: number
  }
  queryTypeStats: Map<QueryType, {
    count: number
    avgTime: number
    slowCount: number
  }>
  topSlowQueries: SlowQueryRecord[]
  optimizationRecommendations: string[]
  indexRecommendations: Array<{
    table: string
    columns: string[]
    estimatedImprovement: string
  }>
}

// 性能阈值配置
export interface PerformanceThresholds {
  excellent: number     // 优秀性能阈值 (ms)
  good: number          // 良好性能阈值 (ms)
  acceptable: number    // 可接受性能阈值 (ms)
  slow: number          // 慢查询阈值 (ms)
  verySlow: number      // 非常慢查询阈值 (ms)
  maxQueryTime: number  // 最大查询时间 (ms)
  errorRateThreshold: number  // 错误率阈值 (百分比)
}

/**
 * 查询性能监控器
 */
export class QueryMonitor extends EventEmitter {
  private queryRecords: Map<string, QueryRecord[]> = new Map()
  private queryStats: Map<string, QueryStats> = new Map()
  private slowQueries: SlowQueryRecord[] = []
  private thresholds: PerformanceThresholds
  private monitoringEnabled: boolean = true
  private cleanupInterval: NodeJS.Timeout | null = null
  private reportInterval: NodeJS.Timeout | null = null
  private maxRecords: number = 10000
  private maxRetentionTime: number = 24 * 60 * 60 * 1000 // 24小时

  constructor(config: {
    thresholds?: Partial<PerformanceThresholds>
    monitoringEnabled?: boolean
    maxRecords?: number
    maxRetentionTime?: number
  } = {}) {
    super()

    this.thresholds = {
      excellent: 10,
      good: 50,
      acceptable: 200,
      slow: 1000,
      verySlow: 5000,
      maxQueryTime: 30000,  // 30秒
      errorRateThreshold: 5,  // 5%
      ...config.thresholds
    }

    this.monitoringEnabled = config.monitoringEnabled !== false
    this.maxRecords = config.maxRecords || 10000
    this.maxRetentionTime = config.maxRetentionTime || 24 * 60 * 60 * 1000

    this.startCleanup()
    this.startReportGeneration()
  }

  /**
   * 记录查询执行
   */
  recordQuery(query: string, params: any[] = [], metadata: {
    executionTime: number
    affectedRows?: number
    poolName?: string
    connectionType?: ConnectionType
    userId?: string
    sessionId?: string
    requestId?: string
    tags?: string[]
    success?: boolean
    error?: string
    cacheHit?: boolean
    indexUsage?: string[]
    tablesAccessed?: string[]
    estimatedCost?: number
  } = {}): void {
    if (!this.monitoringEnabled) return

    const record: QueryRecord = {
      id: this.generateQueryId(query, params),
      query: this.sanitizeQuery(query),
      params: this.sanitizeParams(params),
      type: this.detectQueryType(query),
      executionTime: metadata.executionTime || 0,
      affectedRows: metadata.affectedRows || 0,
      poolName: metadata.poolName || 'unknown',
      connectionType: metadata.connectionType || ConnectionType.READ,
      timestamp: Date.now(),
      userId: metadata.userId,
      sessionId: metadata.sessionId,
      requestId: metadata.requestId,
      tags: metadata.tags || [],
      success: metadata.success !== false,
      error: metadata.error,
      performanceLevel: this.evaluatePerformance(metadata.executionTime || 0),
      cacheHit: metadata.cacheHit,
      indexUsage: metadata.indexUsage || [],
      tablesAccessed: metadata.tablesAccessed || [],
      estimatedCost: metadata.estimatedCost
    }

    // 存储查询记录
    this.storeQueryRecord(record)

    // 更新统计信息
    this.updateQueryStats(record)

    // 检查是否为慢查询
    if (record.performanceLevel === QueryPerformanceLevel.SLOW ||
        record.performanceLevel === QueryPerformanceLevel.VERY_SLOW) {
      this.handleSlowQuery(record)
    }

    // 发出事件
    this.emit('query:recorded', record)

    // 性能告警
    this.checkPerformanceAlerts(record)
  }

  /**
   * 存储查询记录
   */
  private storeQueryRecord(record: QueryRecord): void {
    const pattern = this.extractQueryPattern(record.query)

    if (!this.queryRecords.has(pattern)) {
      this.queryRecords.set(pattern, [])
    }

    const records = this.queryRecords.get(pattern)!
    records.push(record)

    // 限制记录数量
    if (records.length > 100) {
      records.splice(0, records.length - 100)
    }

    // 清理过期记录
    this.cleanupExpiredRecords(pattern)
  }

  /**
   * 更新查询统计信息
   */
  private updateQueryStats(record: QueryRecord): void {
    const pattern = this.extractQueryPattern(record.query)
    let stats = this.queryStats.get(pattern)

    if (!stats) {
      stats = this.initializeQueryStats(record)
      this.queryStats.set(pattern, stats)
    }

    // 更新计数统计
    stats.totalExecutions++
    stats.lastExecuted = record.timestamp

    if (!record.success) {
      stats.errorCount++
    }

    // 更新时间统计
    stats.averageExecutionTime = this.updateAverage(
      stats.averageExecutionTime,
      stats.totalExecutions,
      record.executionTime
    )

    stats.minExecutionTime = Math.min(stats.minExecutionTime, record.executionTime)
    stats.maxExecutionTime = Math.max(stats.maxExecutionTime, record.executionTime)

    // 更新行数统计
    stats.totalRowsAffected += record.affectedRows
    stats.averageRowsAffected = stats.totalRowsAffected / stats.totalExecutions

    // 更新成功率
    stats.successRate = ((stats.totalExecutions - stats.errorCount) / stats.totalExecutions) * 100

    // 更新性能级别
    stats.performanceLevel = record.performanceLevel

    // 计算执行频率
    stats.frequency = this.calculateFrequency(pattern)

    // 生成优化建议
    stats.optimizationSuggestions = this.generateOptimizationSuggestions(stats)
  }

  /**
   * 处理慢查询
   */
  private handleSlowQuery(record: QueryRecord): void {
    const slowQuery: SlowQueryRecord = {
      ...record,
      analysis: this.analyzeSlowQuery(record)
    }

    this.slowQueries.push(slowQuery)

    // 限制慢查询记录数量
    if (this.slowQueries.length > 1000) {
      this.slowQueries.splice(0, this.slowQueries.length - 1000)
    }

    this.emit('query:slow_detected', slowQuery)
  }

  /**
   * 分析慢查询
   */
  private analyzeSlowQuery(record: QueryRecord): SlowQueryRecord['analysis'] {
    const analysis: SlowQueryRecord['analysis'] = {
      reason: '',
      suggestions: [],
      missingIndexes: [],
      tableScanDetected: false,
      nPlusOneDetected: false,
      cartesianProduct: false,
      subqueryIssue: false
    }

    // 检测全表扫描
    if (this.detectTableScan(record.query)) {
      analysis.tableScanDetected = true
      analysis.reason = '检测到全表扫描'
      analysis.suggestions.push('添加适当的索引以避免全表扫描')
      analysis.missingIndexes.push(...this.extractTableColumnsForIndexing(record.query))
    }

    // 检测N+1查询
    if (this.detectNPlusOneQuery(record.query)) {
      analysis.nPlusOneDetected = true
      if (!analysis.reason) analysis.reason = '检测到N+1查询模式'
      analysis.suggestions.push('使用JOIN或批量查询替代N+1查询')
    }

    // 检测笛卡尔积
    if (this.detectCartesianProduct(record.query)) {
      analysis.cartesianProduct = true
      if (!analysis.reason) analysis.reason = '检测到笛卡尔积'
      analysis.suggestions.push('添加适当的JOIN条件以避免笛卡尔积')
    }

    // 检测子查询问题
    if (this.detectSubqueryIssue(record.query)) {
      analysis.subqueryIssue = true
      if (!analysis.reason) analysis.reason = '子查询性能问题'
      analysis.suggestions.push('考虑将子查询重写为JOIN')
    }

    // 基于执行时间的一般建议
    if (record.executionTime > this.thresholds.verySlow) {
      if (!analysis.reason) analysis.reason = '查询执行时间过长'
      analysis.suggestions.push('检查查询是否可以优化或分解')
    }

    // 检查缺失索引
    if (analysis.missingIndexes.length === 0 && record.indexUsage.length === 0) {
      analysis.missingIndexes.push(...this.extractTableColumnsForIndexing(record.query))
      analysis.suggestions.push('考虑为查询中使用的列创建索引')
    }

    return analysis
  }

  /**
   * 检测全表扫描
   */
  private detectTableScan(query: string): boolean {
    // 简化的全表扫描检测逻辑
    const scanPatterns = [
      /SELECT\s+\*\s+FROM/i,
      /WHERE\s+\w+\s*=\s*\w+\s*AND\s+\w+\s*!=/i,
      /ORDER BY\s+\w+\s+(?!LIMIT)/i,
    ]

    return scanPatterns.some(pattern => pattern.test(query))
  }

  /**
   * 检测N+1查询
   */
  private detectNPlusOneQuery(query: string): boolean {
    // 简化的N+1查询检测逻辑
    const patterns = [
      /SELECT.*FROM.*WHERE.*IN\s*\(SELECT/i,
      /SELECT.*FROM.*WHERE.*EXISTS\s*\(SELECT/i,
    ]

    return patterns.some(pattern => pattern.test(query))
  }

  /**
   * 检测笛卡尔积
   */
  private detectCartesianProduct(query: string): boolean {
    // 检查多个FROM表但没有WHERE条件
    const fromMatches = query.match(/FROM\s+\w+/gi)
    const whereMatch = query.match(/WHERE\s+/i)

    return fromMatches && fromMatches.length > 1 && !whereMatch
  }

  /**
   * 检测子查询问题
   */
  private detectSubqueryIssue(query: string): boolean {
    // 检查相关子查询
    const correlatedPatterns = [
      /WHERE.*=\s*\(SELECT.*WHERE.*\w+\s*=\s*\w+/i,
      /HAVING.*>\s*\(SELECT/i,
    ]

    return correlatedPatterns.some(pattern => pattern.test(query))
  }

  /**
   * 提取需要创建索引的表和列
   */
  private extractTableColumnsForIndexing(query: string): string[] {
    const indexes: string[] = []

    // 提取WHERE条件中的列
    const whereMatches = query.match(/WHERE\s+([\s\S]*?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/i)
    if (whereMatches) {
      const columnMatches = whereMatches[1].match(/\b(\w+)\s*(?:=|>|<|>=|<=|!=|LIKE|IN)/gi)
      if (columnMatches) {
        columnMatches.forEach(match => {
          const column = match.replace(/\s*(?:=|>|<|>=|<=|!=|LIKE|IN)\s*$/i, '')
          if (column && !['AND', 'OR', 'NOT'].includes(column.toUpperCase())) {
            indexes.push(column)
          }
        })
      }
    }

    // 提取JOIN条件中的列
    const joinMatches = query.match(/JOIN\s+\w+\s+ON\s+([^)]+)/gi)
    if (joinMatches) {
      joinMatches.forEach(join => {
        const columnMatches = join.match(/\b(\w+)\s*=\s*\w+/gi)
        if (columnMatches) {
          columnMatches.forEach(match => {
            const column = match.replace(/\s*=\s*\w+$/i, '')
            if (column) {
              indexes.push(column)
            }
          })
        }
      })
    }

    return [...new Set(indexes)]
  }

  /**
   * 检查性能告警
   */
  private checkPerformanceAlerts(record: QueryRecord): void {
    // 慢查询告警
    if (record.performanceLevel === QueryPerformanceLevel.VERY_SLOW) {
      this.emit('alert:very_slow_query', {
        query: record.query,
        executionTime: record.executionTime,
        suggestions: this.generateOptimizationSuggestions(this.queryStats.get(this.extractQueryPattern(record.query))!)
      })
    }

    // 错误率告警
    const stats = this.queryStats.get(this.extractQueryPattern(record.query))
    if (stats && stats.errorCount > 5) {
      this.emit('alert:high_error_rate', {
        queryPattern: stats.queryPattern,
        errorCount: stats.errorCount,
        errorRate: stats.errorRate
      })
    }

    // 频率告警
    if (stats && stats.frequency > 10) { // 每分钟超过10次
      this.emit('alert:high_frequency_query', {
        queryPattern: stats.queryPattern,
        frequency: stats.frequency,
        avgTime: stats.averageExecutionTime
      })
    }
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(stats: QueryStats): string[] {
    const suggestions: string[] = []

    if (stats.averageExecutionTime > this.thresholds.slow) {
      suggestions.push('查询执行时间过长，建议优化查询或添加索引')
    }

    if (stats.successRate < 95) {
      suggestions.push('查询失败率较高，建议检查查询逻辑或数据完整性')
    }

    if (stats.frequency > 60) { // 每分钟超过60次
      suggestions.push('查询频率很高，建议添加缓存或优化查询逻辑')
    }

    if (stats.averageRowsAffected > 1000) {
      suggestions.push('影响行数较多，建议添加LIMIT或分页处理')
    }

    if (stats.type === QueryType.SELECT && stats.averageRowsAffected > 10000) {
      suggestions.push('SELECT查询返回大量数据，建议优化查询条件或使用分页')
    }

    return suggestions
  }

  /**
   * 获取查询统计信息
   */
  getQueryStats(pattern?: string): QueryStats[] {
    if (pattern) {
      const stats = this.queryStats.get(pattern)
      return stats ? [stats] : []
    }
    return Array.from(this.queryStats.values())
  }

  /**
   * 获取慢查询记录
   */
  getSlowQueries(limit?: number): SlowQueryRecord[] {
    const queries = [...this.slowQueries].sort((a, b) => b.executionTime - a.executionTime)
    return limit ? queries.slice(0, limit) : queries
  }

  /**
   * 获取查询记录
   */
  getQueryRecords(pattern: string, limit?: number): QueryRecord[] {
    const records = this.queryRecords.get(pattern) || []
    const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp)
    return limit ? sorted.slice(0, limit) : sorted
  }

  /**
   * 生成性能报告
   */
  async generatePerformanceReport(periodMinutes: number = 60): Promise<PerformanceReport> {
    const now = Date.now()
    const start = now - (periodMinutes * 60 * 1000)

    // 收集期间内的所有查询
    const allQueries: QueryRecord[] = []
    for (const records of this.queryRecords.values()) {
      allQueries.push(...records.filter(q => q.timestamp >= start && q.timestamp <= now))
    }

    // 按查询类型统计
    const queryTypeStats = new Map<QueryType, {
      count: number
      avgTime: number
      slowCount: number
    }>()

    for (const query of allQueries) {
      if (!queryTypeStats.has(query.type)) {
        queryTypeStats.set(query.type, { count: 0, avgTime: 0, slowCount: 0 })
      }

      const stats = queryTypeStats.get(query.type)!
      stats.count++
      stats.avgTime = (stats.avgTime * (stats.count - 1) + query.executionTime) / stats.count

      if (query.performanceLevel === QueryPerformanceLevel.SLOW ||
          query.performanceLevel === QueryPerformanceLevel.VERY_SLOW) {
        stats.slowCount++
      }
    }

    // 获取慢查询
    const slowQueriesInPeriod = this.slowQueries.filter(
      q => q.timestamp >= start && q.timestamp <= now
    ).sort((a, b) => b.executionTime - a.executionTime).slice(0, 10)

    // 生成优化建议
    const optimizationRecommendations = this.generateOverallRecommendations(allQueries)

    // 生成索引建议
    const indexRecommendations = this.generateIndexRecommendations(slowQueriesInPeriod)

    // 计算汇总数据
    const totalQueries = allQueries.length
    const averageExecutionTime = totalQueries > 0 ?
      allQueries.reduce((sum, q) => sum + q.executionTime, 0) / totalQueries : 0
    const slowQueriesCount = allQueries.filter(q =>
      q.performanceLevel === QueryPerformanceLevel.SLOW ||
      q.performanceLevel === QueryPerformanceLevel.VERY_SLOW
    ).length
    const errorCount = allQueries.filter(q => !q.success).length
    const errorRate = totalQueries > 0 ? (errorCount / totalQueries) * 100 : 0
    const cacheHitCount = allQueries.filter(q => q.cacheHit).length
    const cacheHitRate = totalQueries > 0 ? (cacheHitCount / totalQueries) * 100 : 0

    return {
      generatedAt: now,
      period: {
        start,
        end: now,
        duration: periodMinutes * 60 * 1000
      },
      summary: {
        totalQueries,
        averageExecutionTime,
        slowQueries: slowQueriesCount,
        errorRate,
        cacheHitRate
      },
      queryTypeStats,
      topSlowQueries: slowQueriesInPeriod,
      optimizationRecommendations,
      indexRecommendations
    }
  }

  /**
   * 生成整体优化建议
   */
  private generateOverallRecommendations(queries: QueryRecord[]): string[] {
    const recommendations: string[] = []

    // 基于查询类型的建议
    const typeCounts = new Map<QueryType, number>()
    queries.forEach(q => typeCounts.set(q.type, (typeCounts.get(q.type) || 0) + 1))

    // 检查是否有大量慢查询
    const slowCount = queries.filter(q =>
      q.performanceLevel === QueryPerformanceLevel.SLOW ||
      q.performanceLevel === QueryPerformanceLevel.VERY_SLOW
    ).length

    if (slowCount > queries.length * 0.1) { // 超过10%的查询是慢查询
      recommendations.push('系统中存在较多慢查询，建议进行全面优化')
    }

    // 检查SELECT查询优化
    const selectCount = typeCounts.get(QueryType.SELECT) || 0
    if (selectCount > queries.length * 0.8) { // 80%以上是SELECT查询
      recommendations.push('系统以查询为主，建议重点关注查询性能和索引优化')
    }

    // 检查事务性能
    const slowTransactions = queries.filter(q =>
      q.type === QueryType.TRANSACTION && q.executionTime > 1000
    ).length

    if (slowTransactions > 0) {
      recommendations.push('检测到慢事务，建议优化事务逻辑或减少事务范围')
    }

    return recommendations
  }

  /**
   * 生成索引建议
   */
  private generateIndexRecommendations(slowQueries: SlowQueryRecord[]): Array<{
    table: string
    columns: string[]
    estimatedImprovement: string
  }> {
    const recommendations: Array<{
      table: string
      columns: string[]
      estimatedImprovement: string
    }> = []

    const tableColumnCounts = new Map<string, Set<string>>()

    // 统计慢查询中频繁使用的表和列
    slowQueries.forEach(query => {
      const tables = query.tablesAccessed
      const columns = this.extractTableColumnsForIndexing(query.query)

      tables.forEach(table => {
        if (!tableColumnCounts.has(table)) {
          tableColumnCounts.set(table, new Set())
        }

        columns.forEach(column => {
          tableColumnCounts.get(table)!.add(column)
        })
      })
    })

    // 生成索引建议
    for (const [table, columns] of tableColumnCounts) {
      if (columns.size > 0) {
        const estimatedImprovement = this.estimateIndexImprovement(table, Array.from(columns), slowQueries)
        recommendations.push({
          table,
          columns: Array.from(columns),
          estimatedImprovement
        })
      }
    }

    return recommendations
  }

  /**
   * 估算索引改进效果
   */
  private estimateIndexImprovement(table: string, columns: string[], slowQueries: SlowQueryRecord[]): string {
    const relatedQueries = slowQueries.filter(q => q.tablesAccessed.includes(table))
    const avgImprovement = relatedQueries.length > 0 ?
      Math.min(95, relatedQueries.length * 15) : 50

    return `预计可提升查询性能 ${avgImprovement}%`
  }

  /**
   * 启用/禁用监控
   */
  setMonitoringEnabled(enabled: boolean): void {
    this.monitoringEnabled = enabled
    this.emit('monitoring:toggled', enabled)
  }

  /**
   * 更新性能阈值
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
    this.emit('thresholds:updated', this.thresholds)
  }

  /**
   * 清理过期数据
   */
  private cleanupExpiredRecords(pattern: string): void {
    const records = this.queryRecords.get(pattern)
    if (!records) return

    const cutoff = Date.now() - this.maxRetentionTime
    const validRecords = records.filter(record => record.timestamp > cutoff)

    if (validRecords.length !== records.length) {
      this.queryRecords.set(pattern, validRecords)
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - this.maxRetentionTime

      // 清理查询记录
      for (const [pattern, records] of this.queryRecords) {
        const validRecords = records.filter(record => record.timestamp > cutoff)
        if (validRecords.length !== records.length) {
          this.queryRecords.set(pattern, validRecords)
        }
      }

      // 清理慢查询记录
      this.slowQueries = this.slowQueries.filter(record => record.timestamp > cutoff)

      // 清理查询统计（保留最近的1000个）
      if (this.queryStats.size > 1000) {
        const sorted = Array.from(this.queryStats.entries())
          .sort(([, a], [, b]) => b.lastExecuted - a.lastExecuted)
          .slice(1000)

        this.queryStats = new Map(sorted)
      }

    }, 60 * 60 * 1000) // 每小时清理一次
  }

  /**
   * 启动报告生成定时器
   */
  private startReportGeneration(): void {
    this.reportInterval = setInterval(async () => {
      try {
        const report = await this.generatePerformanceReport()
        this.emit('report:generated', report)
      } catch (error) {
        console.error('Error generating performance report:', error)
      }
    }, 15 * 60 * 1000) // 每15分钟生成一次报告
  }

  /**
   * 生成查询ID (使用增强哈希算法)
   */
  private generateQueryId(query: string, params: any[]): string {
    const content = query + JSON.stringify(params)
    // 使用增强哈希算法替代不安全的MD5
    const hashResult = hashContent(content, {
      algorithm: 'sha256',
      includeTimestamp: false,
      includeMetadata: false
    })
    return hashResult.hash.substring(0, 16)
  }

  /**
   * 清理查询语句
   */
  private sanitizeQuery(query: string): string {
    // 移除敏感信息和格式化查询
    return query
      .replace(/\bpassword\s*=\s*['"][^'"]*['"]/gi, "password=***")
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * 清理参数
   */
  private sanitizeParams(params: any[]): any[] {
    // 移除敏感参数
    return params.map(param => {
      if (typeof param === 'string' && param.toLowerCase().includes('password')) {
        return '***'
      }
      return param
    })
  }

  /**
   * 检测查询类型
   */
  private detectQueryType(query: string): QueryType {
    const upperQuery = query.toUpperCase().trim()

    if (upperQuery.startsWith('SELECT')) return QueryType.SELECT
    if (upperQuery.startsWith('INSERT')) return QueryType.INSERT
    if (upperQuery.startsWith('UPDATE')) return QueryType.UPDATE
    if (upperQuery.startsWith('DELETE')) return QueryType.DELETE
    if (upperQuery.startsWith('CREATE')) return QueryType.CREATE
    if (upperQuery.startsWith('ALTER')) return QueryType.ALTER
    if (upperQuery.startsWith('DROP')) return QueryType.DROP
    if (upperQuery.startsWith('CREATE INDEX') || upperQuery.includes('INDEX')) return QueryType.INDEX
    if (upperQuery.startsWith('BEGIN') || upperQuery.startsWith('COMMIT') || upperQuery.startsWith('ROLLBACK')) {
      return QueryType.TRANSACTION
    }
    if (upperQuery.includes('CALL ') || upperQuery.includes('EXEC ')) return QueryType.PROCEDURE
    if (upperQuery.includes('FUNCTION') || upperQuery.includes('RETURNS')) return QueryType.FUNCTION

    return QueryType.SELECT // 默认为SELECT
  }

  /**
   * 评估查询性能
   */
  private evaluatePerformance(executionTime: number): QueryPerformanceLevel {
    if (executionTime < this.thresholds.excellent) return QueryPerformanceLevel.EXCELLENT
    if (executionTime < this.thresholds.good) return QueryPerformanceLevel.GOOD
    if (executionTime < this.thresholds.acceptable) return QueryPerformanceLevel.ACCEPTABLE
    if (executionTime < this.thresholds.slow) return QueryPerformanceLevel.SLOW
    return QueryPerformanceLevel.VERY_SLOW
  }

  /**
   * 提取查询模式
   */
  private extractQueryPattern(query: string): string {
    // 移除参数和数值，生成查询模板
    return query
      .replace(/\b\d+\b/g, '?')            // 数字替换为?
      .replace(/['"][^'"]*['"]/g, '?')     // 字符串替换为?
      .replace(/\s+/g, ' ')               // 标准化空格
      .trim()
  }

  /**
   * 初始化查询统计
   */
  private initializeQueryStats(record: QueryRecord): QueryStats {
    return {
      queryPattern: this.extractQueryPattern(record.query),
      type: record.type,
      totalExecutions: 1,
      averageExecutionTime: record.executionTime,
      minExecutionTime: record.executionTime,
      maxExecutionTime: record.executionTime,
      totalRowsAffected: record.affectedRows,
      averageRowsAffected: record.affectedRows,
      successRate: record.success ? 100 : 0,
      errorCount: record.success ? 0 : 1,
      lastExecuted: record.timestamp,
      frequency: 0,
      performanceLevel: record.performanceLevel,
      optimizationSuggestions: []
    }
  }

  /**
   * 计算执行频率
   */
  private calculateFrequency(pattern: string): number {
    const records = this.queryRecords.get(pattern)
    if (!records || records.length === 0) return 0

    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentRecords = records.filter(record => record.timestamp > oneMinuteAgo)

    return recentRecords.length
  }

  /**
   * 更新平均值
   */
  private updateAverage(currentAverage: number, count: number, newValue: number): number {
    if (count === 1) return newValue
    return (currentAverage * (count - 1) + newValue) / count
  }

  /**
   * 关闭监控器
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    if (this.reportInterval) {
      clearInterval(this.reportInterval)
    }

    this.queryRecords.clear()
    this.queryStats.clear()
    this.slowQueries = []

    this.removeAllListeners()
    console.log('📊 Query monitor shutdown completed')
  }
}

// 导出单例实例
export const queryMonitor = new QueryMonitor({
  thresholds: {
    excellent: 10,
    good: 50,
    acceptable: 200,
    slow: 1000,
    verySlow: 5000,
    maxQueryTime: 30000,
    errorRateThreshold: 5
  },
  monitoringEnabled: true,
  maxRecords: 10000,
  maxRetentionTime: 24 * 60 * 60 * 1000
})

export default queryMonitor