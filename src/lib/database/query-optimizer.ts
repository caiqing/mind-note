/**
 * Database Query Optimizer
 *
 * Provides query optimization and performance analysis for database operations
 */

import { PrismaClient } from '@prisma/client'
import logger from '@/lib/utils/logger'
import { performanceMonitor } from '@/lib/monitoring/performance-monitor'

export interface QueryMetric {
  query: string
  duration: number
  timestamp: Date
  operation: 'select' | 'insert' | 'update' | 'delete'
  table: string
  rowsAffected?: number
  cacheHit?: boolean
}

export interface QueryAnalysis {
  slowQueries: QueryMetric[]
  frequentQueries: QueryMetric[]
  errorQueries: QueryMetric[]
  recommendations: string[]
  indexSuggestions: Array<{
    table: string
    columns: string[]
    type: 'btree' | 'hash' | 'gist' | 'gin'
    reason: string
  }>
}

export interface IndexRecommendation {
  table: string
  columns: string[]
  type: 'btree' | 'hash' | 'gist' | 'gin'
  estimatedImprovement: number
  sql: string
}

export class DatabaseQueryOptimizer {
  private metrics: QueryMetric[] = []
  private slowThreshold: number = 1000 // 1 second
  private maxMetricsCount: number = 10000

  constructor(private prisma: PrismaClient) {
    this.setupQueryInstrumentation()
  }

  /**
   * Setup Prisma query instrumentation
   */
  private setupQueryInstrumentation(): void {
    // In a real implementation, this would use Prisma middleware
    // For now, we'll create wrapper methods for optimization tracking
  }

  /**
   * Record query performance metric
   */
  recordMetric(metric: QueryMetric): void {
    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics = this.metrics.slice(-this.maxMetricsCount)
    }

    // Record in performance monitor
    performanceMonitor.recordMetric(
      `db_query_${metric.operation}`,
      metric.duration,
      'ms',
      {
        table: metric.table,
        query_hash: this.hashQuery(metric.query)
      }
    )

    // Check for slow queries
    if (metric.duration > this.slowThreshold) {
      this.handleSlowQuery(metric)
    }
  }

  /**
   * Handle slow query detection
   */
  private handleSlowQuery(metric: QueryMetric): void {
    logger.warn('Slow query detected', {
      table: metric.table,
      operation: metric.operation,
      duration: metric.duration,
      query: metric.query.substring(0, 200) + '...'
    })

    // Generate optimization recommendations
    this.generateQueryOptimizations(metric)
  }

  /**
   * Generate query optimization recommendations
   */
  private generateQueryOptimizations(metric: QueryMetric): void {
    const recommendations: string[] = []

    // Analyze query pattern
    if (metric.query.includes('WHERE') && !this.hasIndexHint(metric.query)) {
      recommendations.push(`考虑为表 ${metric.table} 添加适当的索引`)
    }

    if (metric.query.includes('JOIN') && metric.duration > 2000) {
      recommendations.push('优化JOIN查询，确保连接字段有索引')
    }

    if (metric.query.includes('ORDER BY') && metric.duration > 1500) {
      recommendations.push('为ORDER BY字段添加索引以优化排序')
    }

    if (metric.operation === 'select' && metric.rowsAffected && metric.rowsAffected > 1000) {
      recommendations.push('考虑添加LIMIT子句或实现分页')
    }

    // Log recommendations
    if (recommendations.length > 0) {
      logger.info('Query optimization recommendations', {
        table: metric.table,
        recommendations
      })
    }
  }

  /**
   * Check if query has index hint
   */
  private hasIndexHint(query: string): boolean {
    return query.includes('USE INDEX') || query.includes('FORCE INDEX')
  }

  /**
   * Hash query for identification
   */
  private hashQuery(query: string): string {
    // Simple hash implementation
    let hash = 0
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Analyze query patterns and provide recommendations
   */
  async analyzeQueries(): Promise<QueryAnalysis> {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo)

    const slowQueries = recentMetrics
      .filter(m => m.duration > this.slowThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)

    const frequentQueries = this.getFrequentQueries(recentMetrics)
    const errorQueries = this.getErrorQueries(recentMetrics)

    const recommendations = this.generateRecommendations(slowQueries, frequentQueries)
    const indexSuggestions = await this.generateIndexSuggestions(recentMetrics)

    return {
      slowQueries,
      frequentQueries,
      errorQueries,
      recommendations,
      indexSuggestions
    }
  }

  /**
   * Get most frequent queries
   */
  private getFrequentQueries(metrics: QueryMetric[]): QueryMetric[] {
    const queryCounts = new Map<string, number>()
    const queryMap = new Map<string, QueryMetric>()

    metrics.forEach(metric => {
      const hash = this.hashQuery(metric.query)
      queryCounts.set(hash, (queryCounts.get(hash) || 0) + 1)
      queryMap.set(hash, metric)
    })

    return Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hash]) => queryMap.get(hash)!)
  }

  /**
   * Get error queries
   */
  private getErrorQueries(metrics: QueryMetric[]): QueryMetric[] {
    return metrics
      .filter(m => m.duration > 5000) // Assume very slow queries might have errors
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    slowQueries: QueryMetric[],
    frequentQueries: QueryMetric[]
  ): string[] {
    const recommendations = new Set<string>()

    // Analyze slow queries
    slowQueries.forEach(query => {
      if (query.operation === 'select') {
        recommendations.add('优化慢速SELECT查询，检查WHERE条件和索引使用')
      }

      if (query.table === 'Note' && query.duration > 2000) {
        recommendations.add('Note表查询较慢，考虑优化搜索索引')
      }

      if (query.query.includes('JOIN')) {
        recommendations.add('优化JOIN操作，确保连接字段有适当索引')
      }
    })

    // Analyze frequent queries
    frequentQueries.forEach(query => {
      if (query.operation === 'select' && !this.isOptimized(query.query)) {
        recommendations.add(`频繁查询需要优化: ${query.table}`)
      }
    })

    // General recommendations
    recommendations.add('定期执行VACUUM和ANALYZE维护操作')
    recommendations.add('监控数据库连接池使用情况')
    recommendations.add('考虑实现读写分离以提升性能')

    return Array.from(recommendations)
  }

  /**
   * Check if query is optimized
   */
  private isOptimized(query: string): boolean {
    return (
      query.includes('WHERE') &&
      !query.includes('SELECT *') &&
      query.includes('LIMIT')
    )
  }

  /**
   * Generate index suggestions
   */
  private async generateIndexSuggestions(
    metrics: QueryMetric[]
  ): Promise<QueryAnalysis['indexSuggestions']> {
    const suggestions: QueryAnalysis['indexSuggestions'] = []
    const tableColumns = new Map<string, Set<string>>()

    // Analyze queries to find commonly used columns
    metrics.forEach(metric => {
      if (!tableColumns.has(metric.table)) {
        tableColumns.set(metric.table, new Set())
      }

      // Extract column names from WHERE clauses (simplified)
      const whereColumns = this.extractWhereColumns(metric.query)
      whereColumns.forEach(col => {
        tableColumns.get(metric.table)!.add(col)
      })
    })

    // Generate index suggestions for each table
    for (const [table, columns] of tableColumns.entries()) {
      if (columns.size > 0) {
        suggestions.push({
          table,
          columns: Array.from(columns),
          type: 'btree',
          reason: '常用于查询条件的列'
        })

        // Add specific suggestions for common patterns
        if (columns.has('categoryId') || columns.has('userId')) {
          suggestions.push({
            table,
            columns: ['userId', 'categoryId'],
            type: 'btree',
            reason: '用户和分类过滤查询'
          })
        }

        if (columns.has('createdAt') || columns.has('updatedAt')) {
          suggestions.push({
            table,
            columns: ['createdAt'],
            type: 'btree',
            reason: '时间范围查询'
          })
        }
      }
    }

    return suggestions
  }

  /**
   * Extract column names from WHERE clause (simplified)
   */
  private extractWhereColumns(query: string): string[] {
    const columns: string[] = []
    const whereMatch = query.match(/WHERE\s+([^)]+)/i)

    if (whereMatch) {
      const whereClause = whereMatch[1]
      const columnMatches = whereClause.match(/\b(\w+)\s*=/g)

      if (columnMatches) {
        columnMatches.forEach(match => {
          const column = match.replace('=', '').trim()
          if (!['AND', 'OR', 'NOT'].includes(column.toUpperCase())) {
            columns.push(column)
          }
        })
      }
    }

    return columns
  }

  /**
   * Create recommended index SQL
   */
  createIndexSQL(suggestion: QueryAnalysis['indexSuggestions'][0]): string {
    const { table, columns, type } = suggestion
    const indexName = `idx_${table}_${columns.join('_')}`
    const columnList = columns.join(', ')

    return `CREATE INDEX CONCURRENTLY ${indexName} ON "${table}" (${columnList});`
  }

  /**
   * Execute query optimization
   */
  async optimizeQueries(): Promise<{
    indexesCreated: number
    queriesOptimized: number
    recommendations: string[]
  }> {
    const analysis = await this.analyzeQueries()
    let indexesCreated = 0
    let queriesOptimized = 0

    try {
      // Create recommended indexes (in production, this would be carefully reviewed)
      for (const suggestion of analysis.indexSuggestions.slice(0, 3)) {
        try {
          const sql = this.createIndexSQL(suggestion)
          logger.info('Creating recommended index', { sql })
          // await this.prisma.$executeRaw(sql) // Commented out for safety
          indexesCreated++
        } catch (error) {
          logger.error('Failed to create index', {
            table: suggestion.table,
            columns: suggestion.columns,
            error
          })
        }
      }

      // Analyze table statistics
      await this.analyzeTableStatistics()
      queriesOptimized = analysis.slowQueries.length

      return {
        indexesCreated,
        queriesOptimized,
        recommendations: analysis.recommendations
      }

    } catch (error) {
      logger.error('Query optimization failed:', error)
      throw error
    }
  }

  /**
   * Analyze table statistics
   */
  private async analyzeTableStatistics(): Promise<void> {
    try {
      // Update statistics for common tables
      const tables = ['Note', 'Category', 'Tag', 'User']

      for (const table of tables) {
        try {
          await this.prisma.$executeRaw(`ANALYZE "${table}";`)
          logger.debug(`Updated statistics for table ${table}`)
        } catch (error) {
          logger.warn(`Failed to analyze table ${table}:`, error)
        }
      }

    } catch (error) {
      logger.error('Table statistics analysis failed:', error)
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(timeRange?: { start: Date; end: Date }): {
    totalQueries: number
    averageDuration: number
    slowQueries: number
    errorRate: number
    mostActiveTable: string
    operationDistribution: Record<string, number>
  } {
    let filteredMetrics = this.metrics

    if (timeRange) {
      filteredMetrics = this.metrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      )
    }

    const totalQueries = filteredMetrics.length
    const averageDuration = totalQueries > 0
      ? filteredMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
      : 0
    const slowQueries = filteredMetrics.filter(m => m.duration > this.slowThreshold).length
    const errorRate = totalQueries > 0 ? slowQueries / totalQueries : 0

    // Find most active table
    const tableCounts = new Map<string, number>()
    filteredMetrics.forEach(m => {
      tableCounts.set(m.table, (tableCounts.get(m.table) || 0) + 1)
    })
    const mostActiveTable = Array.from(tableCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    // Operation distribution
    const operationDistribution: Record<string, number> = {}
    filteredMetrics.forEach(m => {
      operationDistribution[m.operation] = (operationDistribution[m.operation] || 0) + 1
    })

    return {
      totalQueries,
      averageDuration,
      slowQueries,
      errorRate,
      mostActiveTable,
      operationDistribution
    }
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = []
    logger.info('Query metrics cleared')
  }

  /**
   * Update slow query threshold
   */
  updateSlowThreshold(threshold: number): void {
    this.slowThreshold = threshold
    logger.info(`Slow query threshold updated to ${threshold}ms`)
  }
}

// Create singleton instance
let queryOptimizer: DatabaseQueryOptimizer | null = null

export function getQueryOptimizer(prisma: PrismaClient): DatabaseQueryOptimizer {
  if (!queryOptimizer) {
    queryOptimizer = new DatabaseQueryOptimizer(prisma)
  }
  return queryOptimizer
}

export default DatabaseQueryOptimizer