/**
 * Search Performance Optimization Module
 *
 * Provides performance monitoring and optimization utilities for search functionality
 */

import { PrismaClient } from '@prisma/client'
import logger from '@/lib/utils/logger'
import { performanceMonitor } from './cache'

export interface SearchPerformanceMetrics {
  queryTime: number
  indexSearchTime: number
  vectorSearchTime: number
  embeddingTime: number
  cacheTime: number
  totalTime: number
  resultCount: number
  cacheHit: boolean
  searchType: 'fulltext' | 'vector' | 'hybrid'
}

export interface PerformanceThresholds {
  maxQueryTime: number
  maxIndexSearchTime: number
  maxVectorSearchTime: number
  maxEmbeddingTime: number
  minCacheHitRate: number
  minResultRelevance: number
}

export interface PerformanceAlert {
  type: 'slow_query' | 'low_cache_hit' | 'high_error_rate' | 'index_coverage' | 'embedding_coverage'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  value: number
  threshold: number
  recommendations: string[]
  timestamp: Date
}

export class SearchPerformanceOptimizer {
  private thresholds: PerformanceThresholds
  private alertHistory: PerformanceAlert[] = []
  private metrics: SearchPerformanceMetrics[] = []

  constructor() {
    this.thresholds = {
      maxQueryTime: 1000, // 1 second
      maxIndexSearchTime: 500, // 500ms
      maxVectorSearchTime: 800, // 800ms
      maxEmbeddingTime: 2000, // 2 seconds
      minCacheHitRate: 0.6, // 60%
      minResultRelevance: 0.5 // 50%
    }
  }

  /**
   * Record search performance metrics
   */
  recordMetrics(metrics: SearchPerformanceMetrics): void {
    this.metrics.push(metrics)

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metrics)

    // Record in global performance monitor
    performanceMonitor.recordMetric('search_query_time', metrics.queryTime)
    performanceMonitor.recordMetric('search_index_time', metrics.indexSearchTime)
    performanceMonitor.recordMetric('search_vector_time', metrics.vectorSearchTime)
    performanceMonitor.recordMetric('search_embedding_time', metrics.embeddingTime)
    performanceMonitor.recordMetric('search_cache_time', metrics.cacheTime)
    performanceMonitor.recordMetric('search_total_time', metrics.totalTime)
    performanceMonitor.recordMetric('search_result_count', metrics.resultCount)
    performanceMonitor.recordMetric('search_cache_hit', metrics.cacheHit ? 1 : 0)
  }

  /**
   * Check metrics against thresholds and generate alerts
   */
  private checkPerformanceThresholds(metrics: SearchPerformanceMetrics): void {
    const alerts: PerformanceAlert[] = []

    // Check total query time
    if (metrics.totalTime > this.thresholds.maxQueryTime) {
      alerts.push({
        type: 'slow_query',
        severity: this.getSeverityLevel(metrics.totalTime, this.thresholds.maxQueryTime),
        message: `搜索查询响应时间过慢: ${metrics.totalTime}ms`,
        value: metrics.totalTime,
        threshold: this.thresholds.maxQueryTime,
        recommendations: this.getSlowQueryRecommendations(metrics),
        timestamp: new Date()
      })
    }

    // Check index search time
    if (metrics.indexSearchTime > this.thresholds.maxIndexSearchTime) {
      alerts.push({
        type: 'slow_query',
        severity: 'medium',
        message: `索引搜索时间过慢: ${metrics.indexSearchTime}ms`,
        value: metrics.indexSearchTime,
        threshold: this.thresholds.maxIndexSearchTime,
        recommendations: [
          '检查数据库索引是否优化',
          '考虑增加搜索索引覆盖',
          '优化搜索查询语句'
        ],
        timestamp: new Date()
      })
    }

    // Check vector search time
    if (metrics.vectorSearchTime > this.thresholds.maxVectorSearchTime) {
      alerts.push({
        type: 'slow_query',
        severity: 'medium',
        message: `向量搜索时间过慢: ${metrics.vectorSearchTime}ms`,
        value: metrics.vectorSearchTime,
        threshold: this.thresholds.maxVectorSearchTime,
        recommendations: [
          '检查向量索引是否建立',
          '考虑使用近似最近邻算法',
          '优化向量维度和距离计算'
        ],
        timestamp: new Date()
      })
    }

    // Check embedding generation time
    if (metrics.embeddingTime > this.thresholds.maxEmbeddingTime) {
      alerts.push({
        type: 'slow_query',
        severity: 'high',
        message: `嵌入向量生成时间过慢: ${metrics.embeddingTime}ms`,
        value: metrics.embeddingTime,
        threshold: this.thresholds.maxEmbeddingTime,
        recommendations: [
          '考虑缓存嵌入向量结果',
          '使用批量处理优化',
          '检查AI服务响应时间'
        ],
        timestamp: new Date()
      })
    }

    // Add alerts to history
    alerts.forEach(alert => this.addAlert(alert))
  }

  /**
   * Get severity level based on value vs threshold
   */
  private getSeverityLevel(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold
    if (ratio >= 3) return 'critical'
    if (ratio >= 2) return 'high'
    if (ratio >= 1.5) return 'medium'
    return 'low'
  }

  /**
   * Get recommendations for slow queries
   */
  private getSlowQueryRecommendations(metrics: SearchPerformanceMetrics): string[] {
    const recommendations = []

    if (metrics.queryTime > 200) {
      recommendations.push('优化查询条件和搜索词')
      recommendations.push('考虑使用更精确的搜索语法')
    }

    if (metrics.indexSearchTime > 300) {
      recommendations.push('检查PostgreSQL全文搜索配置')
      recommendations.push('优化searchVector字段索引')
    }

    if (metrics.vectorSearchTime > 500) {
      recommendations.push('检查pgvector扩展配置')
      recommendations.push('考虑使用HNSW索引提升性能')
    }

    if (metrics.embeddingTime > 1000) {
      recommendations.push('缓存常用查询的嵌入向量')
      recommendations.push('使用本地嵌入模型减少网络延迟')
    }

    if (!metrics.cacheHit) {
      recommendations.push('增加缓存覆盖范围')
      recommendations.push('调整缓存TTL设置')
    }

    return recommendations
  }

  /**
   * Add alert to history
   */
  private addAlert(alert: PerformanceAlert): void {
    this.alertHistory.push(alert)

    // Keep only last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100)
    }

    // Log critical alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      logger.warn('Search performance alert', alert)
    }

    // Trigger immediate optimization suggestions for critical issues
    if (alert.severity === 'critical') {
      this.triggerImmediateOptimization(alert)
    }
  }

  /**
   * Trigger immediate optimization for critical performance issues
   */
  private triggerImmediateOptimization(alert: PerformanceAlert): void {
    logger.info('Triggering immediate search optimization', { alert: alert.type })

    switch (alert.type) {
      case 'slow_query':
        this.optimizeSlowQueries()
        break
      case 'low_cache_hit':
        this.optimizeCacheStrategy()
        break
      case 'index_coverage':
        this.rebuildSearchIndexes()
        break
      case 'embedding_coverage':
        this.generateEmbeddings()
        break
    }
  }

  /**
   * Optimize slow queries
   */
  private async optimizeSlowQueries(): Promise<void> {
    try {
      logger.info('Optimizing slow search queries')

      // This would implement specific optimizations like:
      // - Analyze slow query patterns
      // - Suggest index improvements
      // - Optimize search parameters

    } catch (error) {
      logger.error('Failed to optimize slow queries:', error)
    }
  }

  /**
   * Optimize cache strategy
   */
  private async optimizeCacheStrategy(): Promise<void> {
    try {
      logger.info('Optimizing search cache strategy')

      // This would implement cache optimizations like:
      // - Adjust TTL based on query patterns
      // - Pre-warm cache with common queries
      // - Optimize cache key structure

    } catch (error) {
      logger.error('Failed to optimize cache strategy:', error)
    }
  }

  /**
   * Rebuild search indexes
   */
  private async rebuildSearchIndexes(): Promise<void> {
    try {
      logger.info('Rebuilding search indexes')

      // This would trigger index rebuilding process
      // - Update searchVector for all notes
      // - Rebuild pgvector indexes
      // - Optimize index configurations

    } catch (error) {
      logger.error('Failed to rebuild search indexes:', error)
    }
  }

  /**
   * Generate embeddings for notes
   */
  private async generateEmbeddings(): Promise<void> {
    try {
      logger.info('Generating embeddings for notes')

      // This would implement batch embedding generation
      // - Identify notes without embeddings
      // - Generate embeddings in batches
      // - Update database with new embeddings

    } catch (error) {
      logger.error('Failed to generate embeddings:', error)
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalQueries: number
    averageQueryTime: number
    cacheHitRate: number
    errorRate: number
    alerts: PerformanceAlert[]
    recommendations: string[]
  } {
    const recentMetrics = this.metrics.slice(-100) // Last 100 queries

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        alerts: this.getRecentAlerts(),
        recommendations: ['需要收集更多性能数据']
      }
    }

    const totalQueries = recentMetrics.length
    const averageQueryTime = recentMetrics.reduce((sum, m) => sum + m.totalTime, 0) / totalQueries
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length
    const cacheHitRate = cacheHits / totalQueries
    const errors = recentMetrics.filter(m => m.totalTime > this.thresholds.maxQueryTime * 3).length
    const errorRate = errors / totalQueries

    const recentAlerts = this.getRecentAlerts()
    const recommendations = this.generateRecommendations(recentMetrics, recentAlerts)

    return {
      totalQueries,
      averageQueryTime,
      cacheHitRate,
      errorRate,
      alerts: recentAlerts,
      recommendations
    }
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(hours: number = 24): PerformanceAlert[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.alertHistory.filter(alert => alert.timestamp > cutoffTime)
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    metrics: SearchPerformanceMetrics[],
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations = new Set<string>()

    // Analyze metrics for patterns
    const avgQueryTime = metrics.reduce((sum, m) => sum + m.totalTime, 0) / metrics.length
    const cacheHitRate = metrics.filter(m => m.cacheHit).length / metrics.length

    if (avgQueryTime > this.thresholds.maxQueryTime * 0.7) {
      recommendations.add('考虑优化搜索查询以提高整体响应速度')
      recommendations.add('分析常见搜索模式并预生成结果')
    }

    if (cacheHitRate < this.thresholds.minCacheHitRate) {
      recommendations.add('增加缓存覆盖范围以减少重复查询时间')
      recommendations.add('调整缓存策略以提升命中率')
    }

    // Analyze search type performance
    const fullTextQueries = metrics.filter(m => m.searchType === 'fulltext')
    const vectorQueries = metrics.filter(m => m.searchType === 'vector')
    const hybridQueries = metrics.filter(m => m.searchType === 'hybrid')

    if (fullTextQueries.length > 0) {
      const avgFullTextTime = fullTextQueries.reduce((sum, m) => sum + m.indexSearchTime, 0) / fullTextQueries.length
      if (avgFullTextTime > this.thresholds.maxIndexSearchTime) {
        recommendations.add('优化全文搜索索引配置')
      }
    }

    if (vectorQueries.length > 0) {
      const avgVectorTime = vectorQueries.reduce((sum, m) => sum + m.vectorSearchTime, 0) / vectorQueries.length
      if (avgVectorTime > this.thresholds.maxVectorSearchTime) {
        recommendations.add('检查向量搜索索引和算法优化')
      }
    }

    if (hybridQueries.length > 0) {
      const avgHybridTime = hybridQueries.reduce((sum, m) => sum + m.totalTime, 0) / hybridQueries.length
      if (avgHybridTime > this.thresholds.maxQueryTime * 1.2) {
        recommendations.add('考虑优化混合搜索策略或减少查询复杂度')
      }
    }

    // Add recommendations from alerts
    alerts.forEach(alert => {
      alert.recommendations.forEach(rec => recommendations.add(rec))
    })

    return Array.from(recommendations)
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
    logger.info('Updated search performance thresholds', this.thresholds)
  }

  /**
   * Clear metrics and alert history
   */
  clearHistory(): void {
    this.metrics = []
    this.alertHistory = []
    logger.info('Cleared search performance history')
  }

  /**
   * Export performance data for analysis
   */
  exportData(): {
    metrics: SearchPerformanceMetrics[]
    alerts: PerformanceAlert[]
    thresholds: PerformanceThresholds
    exportTime: Date
  } {
    return {
      metrics: [...this.metrics],
      alerts: [...this.alertHistory],
      thresholds: { ...this.thresholds },
      exportTime: new Date()
    }
  }
}

// Create singleton instance
export const searchPerformanceOptimizer = new SearchPerformanceOptimizer()

/**
 * Performance monitoring middleware for search operations
 */
export function withSearchPerformanceMonitoring<T extends any[], R>(
  searchFunction: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()

    try {
      const result = await searchFunction(...args)

      const endTime = performance.now()
      const endMemory = process.memoryUsage()
      const duration = endTime - startTime

      // Record performance metrics
      performanceMonitor.recordMetric(`${operationName}_duration`, duration)
      performanceMonitor.recordMetric(`${operationName}_memory_delta`,
        endMemory.heapUsed - startMemory.heapUsed)

      logger.debug(`Search operation completed`, {
        operation: operationName,
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta: `${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`
      })

      return result

    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime

      performanceMonitor.recordMetric(`${operationName}_error_duration`, duration)

      logger.error(`Search operation failed`, {
        operation: operationName,
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  }
}

export default {
  searchPerformanceOptimizer,
  withSearchPerformanceMonitoring
}