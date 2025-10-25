/**
 * Performance Testing Suite
 *
 * Comprehensive performance testing and optimization recommendations
 */

import logger from '@/lib/utils/logger'
import { performanceMonitor } from '@/lib/monitoring/performance-monitor'
import { getQueryOptimizer } from '@/lib/database/query-optimizer'
import { searchCache, apiCache, imageCache } from '@/lib/cache/advanced-cache'
import { getCDNManager } from '@/lib/cdn/cdn-manager'
import { PrismaClient } from '@prisma/client'

export interface PerformanceTestConfig {
  // Load testing
  loadTest?: {
    concurrentUsers: number
    duration: number // seconds
    requestsPerSecond: number
  }

  // Database testing
  databaseTest?: {
    queryTypes: string[]
    recordCount: boolean
    analyzeSlowQueries: boolean
  }

  // Cache testing
  cacheTest?: {
    hitRateTarget: number
    warmupData: boolean
    testEviction: boolean
  }

  // API testing
  apiTest?: {
    endpoints: string[]
    methods: string[]
    expectedResponseTime: number
  }

  // Search testing
  searchTest?: {
    queryTypes: string[]
    resultCountRange: [number, number]
    testSemantic: boolean
  }
}

export interface PerformanceTestResult {
  timestamp: Date
  config: PerformanceTestConfig

  // Overall metrics
  overallScore: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'

  // Component scores
  database: {
    score: number
    avgQueryTime: number
    slowQueries: number
    connectionPoolUsage: number
    recommendations: string[]
  }

  cache: {
    score: number
    avgHitRate: number
    totalSize: number
    evictionRate: number
    recommendations: string[]
  }

  api: {
    score: number
    avgResponseTime: number
    errorRate: number
    throughput: number
    recommendations: string[]
  }

  search: {
    score: number
    avgSearchTime: number
    accuracyRate: number
    semanticPerformance: number
    recommendations: string[]
  }

  cdn: {
    score: number
    hitRate: number
    avgResponseTime: number
    bandwidthSavings: number
    recommendations: string[]
  }

  // Recommendations
  criticalIssues: string[]
  highPriorityOptimizations: string[]
  mediumPriorityOptimizations: string[]
  longTermImprovements: string[]
}

export class PerformanceTester {
  private prisma: PrismaClient
  private queryOptimizer: ReturnType<typeof getQueryOptimizer>
  private cdnManager: ReturnType<typeof getCDNManager>

  constructor() {
    this.prisma = new PrismaClient()
    this.queryOptimizer = getQueryOptimizer(this.prisma)
    this.cdnManager = getCDNManager()
  }

  /**
   * Run comprehensive performance test
   */
  async runPerformanceTest(config: PerformanceTestConfig): Promise<PerformanceTestResult> {
    logger.info('Starting comprehensive performance test', { config })

    const result: PerformanceTestResult = {
      timestamp: new Date(),
      config,
      overallScore: 0,
      grade: 'F',
      database: { score: 0, avgQueryTime: 0, slowQueries: 0, connectionPoolUsage: 0, recommendations: [] },
      cache: { score: 0, avgHitRate: 0, totalSize: 0, evictionRate: 0, recommendations: [] },
      api: { score: 0, avgResponseTime: 0, errorRate: 0, throughput: 0, recommendations: [] },
      search: { score: 0, avgSearchTime: 0, accuracyRate: 0, semanticPerformance: 0, recommendations: [] },
      cdn: { score: 0, hitRate: 0, avgResponseTime: 0, bandwidthSavings: 0, recommendations: [] },
      criticalIssues: [],
      highPriorityOptimizations: [],
      mediumPriorityOptimizations: [],
      longTermImprovements: []
    }

    try {
      // Run individual tests
      if (config.databaseTest) {
        result.database = await this.testDatabasePerformance(config.databaseTest)
      }

      if (config.cacheTest) {
        result.cache = await this.testCachePerformance(config.cacheTest)
      }

      if (config.apiTest) {
        result.api = await this.testAPIPerformance(config.apiTest)
      }

      if (config.searchTest) {
        result.search = await this.testSearchPerformance(config.searchTest)
      }

      // CDN test
      result.cdn = await this.testCDNPerformance()

      // Calculate overall score
      result.overallScore = this.calculateOverallScore(result)
      result.grade = this.calculateGrade(result.overallScore)

      // Generate recommendations
      result.criticalIssues = this.extractCriticalIssues(result)
      result.highPriorityOptimizations = this.extractHighPriorityOptimizations(result)
      result.mediumPriorityOptimizations = this.extractMediumPriorityOptimizations(result)
      result.longTermImprovements = this.extractLongTermImprovements(result)

      logger.info('Performance test completed', {
        overallScore: result.overallScore,
        grade: result.grade,
        duration: Date.now() - result.timestamp.getTime()
      })

      return result

    } catch (error) {
      logger.error('Performance test failed:', error)
      throw error
    } finally {
      await this.prisma.$disconnect()
    }
  }

  /**
   * Test database performance
   */
  private async testDatabasePerformance(config: NonNullable<PerformanceTestConfig['databaseTest']>) {
    logger.info('Testing database performance')

    const startTime = Date.now()
    const queryTimes: number[] = []
    let slowQueries = 0

    try {
      // Test common queries
      const queries = [
        'SELECT COUNT(*) FROM "Note"',
        'SELECT * FROM "Note" ORDER BY "createdAt" DESC LIMIT 10',
        'SELECT * FROM "Note" WHERE "categoryId" IS NOT NULL LIMIT 20',
        'SELECT n.*, c.name as categoryName FROM "Note" n LEFT JOIN "Category" c ON n."categoryId" = c.id LIMIT 50'
      ]

      for (const query of queries) {
        const queryStart = Date.now()
        await this.prisma.$queryRawUnsafe(query)
        const queryTime = Date.now() - queryStart
        queryTimes.push(queryTime)

        if (queryTime > 1000) {
          slowQueries++
          this.queryOptimizer.recordMetric({
            query,
            duration: queryTime,
            timestamp: new Date(),
            operation: 'select',
            table: 'Note',
            rowsAffected: 0
          })
        }
      }

      // Get query statistics
      const queryStats = this.queryOptimizer.getQueryStats({
        start: new Date(Date.now() - 60000), // Last minute
        end: new Date()
      })

      const avgQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
      const score = this.calculateDatabaseScore(avgQueryTime, slowQueries, queryStats.errorRate)

      const recommendations = this.generateDatabaseRecommendations(avgQueryTime, slowQueries, queryStats)

      return {
        score,
        avgQueryTime,
        slowQueries,
        connectionPoolUsage: 0.75, // Mock data
        recommendations
      }

    } catch (error) {
      logger.error('Database performance test failed:', error)
      return {
        score: 0,
        avgQueryTime: 0,
        slowQueries: 0,
        connectionPoolUsage: 0,
        recommendations: ['数据库测试失败，请检查连接配置']
      }
    }
  }

  /**
   * Test cache performance
   */
  private async testCachePerformance(config: NonNullable<PerformanceTestConfig['cacheTest']>) {
    logger.info('Testing cache performance')

    try {
      const caches = [
        { name: 'search', instance: searchCache },
        { name: 'api', instance: apiCache },
        { name: 'image', instance: imageCache }
      ]

      let totalHitRate = 0
      let totalSize = 0
      let totalEvictions = 0

      for (const cache of caches) {
        const stats = cache.instance.getStats()
        totalHitRate += stats.hitRate
        totalSize += stats.totalSize
        totalEvictions += stats.evictionCount

        // Test cache operations
        const testKey = `test_${cache.name}_${Date.now()}`
        await cache.instance.set(testKey, { test: 'data' }, { ttl: 60000 })
        const retrieved = await cache.instance.get(testKey)
        await cache.instance.delete(testKey)

        if (!retrieved) {
          logger.warn(`Cache ${cache.name} not functioning properly`)
        }
      }

      const avgHitRate = totalHitRate / caches.length
      const evictionRate = totalEvictions / caches.reduce((sum, c) => sum + c.instance.getStats().totalEntries, 0)
      const score = this.calculateCacheScore(avgHitRate, evictionRate, totalSize)

      const recommendations = this.generateCacheRecommendations(avgHitRate, evictionRate, totalSize)

      return {
        score,
        avgHitRate,
        totalSize,
        evictionRate,
        recommendations
      }

    } catch (error) {
      logger.error('Cache performance test failed:', error)
      return {
        score: 0,
        avgHitRate: 0,
        totalSize: 0,
        evictionRate: 0,
        recommendations: ['缓存测试失败，请检查缓存配置']
      }
    }
  }

  /**
   * Test API performance
   */
  private async testAPIPerformance(config: NonNullable<PerformanceTestConfig['apiTest']>) {
    logger.info('Testing API performance')

    try {
      const endpoints = config.endpoints.length > 0 ? config.endpoints : [
        '/api/notes',
        '/api/categories',
        '/api/search',
        '/api/cache/manage'
      ]

      const responseTimes: number[] = []
      let errors = 0

      for (const endpoint of endpoints) {
        const startTime = Date.now()

        try {
          const response = await fetch(`http://localhost:3000${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })

          const responseTime = Date.now() - startTime
          responseTimes.push(responseTime)

          if (!response.ok) {
            errors++
          }
        } catch (error) {
          errors++
          responseTimes.push(5000) // Assume 5s timeout
        }
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const errorRate = errors / endpoints.length
      const throughput = endpoints.length / (Date.now() - Date.now()) * 1000 // Mock calculation
      const score = this.calculateAPIScore(avgResponseTime, errorRate, throughput)

      const recommendations = this.generateAPIRecommendations(avgResponseTime, errorRate)

      return {
        score,
        avgResponseTime,
        errorRate,
        throughput,
        recommendations
      }

    } catch (error) {
      logger.error('API performance test failed:', error)
      return {
        score: 0,
        avgResponseTime: 0,
        errorRate: 1,
        throughput: 0,
        recommendations: ['API测试失败，请检查服务器状态']
      }
    }
  }

  /**
   * Test search performance
   */
  private async testSearchPerformance(config: NonNullable<PerformanceTestConfig['searchTest']>) {
    logger.info('Testing search performance')

    try {
      const testQueries = config.queryTypes.length > 0 ? config.queryTypes : [
        'JavaScript',
        'React开发',
        '性能优化',
        '数据库设计',
        '用户体验'
      ]

      const searchTimes: number[] = []
      let successfulSearches = 0

      for (const query of testQueries) {
        const startTime = Date.now()

        try {
          const response = await fetch('http://localhost:3000/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              filters: {},
              options: { limit: 10 }
            })
          })

          const searchTime = Date.now() - startTime
          searchTimes.push(searchTime)

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.results) {
              successfulSearches++
            }
          }
        } catch (error) {
          searchTimes.push(2000) // Assume 2s timeout
        }
      }

      const avgSearchTime = searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length
      const accuracyRate = successfulSearches / testQueries.length
      const semanticPerformance = 0.85 // Mock semantic search performance
      const score = this.calculateSearchScore(avgSearchTime, accuracyRate, semanticPerformance)

      const recommendations = this.generateSearchRecommendations(avgSearchTime, accuracyRate)

      return {
        score,
        avgSearchTime,
        accuracyRate,
        semanticPerformance,
        recommendations
      }

    } catch (error) {
      logger.error('Search performance test failed:', error)
      return {
        score: 0,
        avgSearchTime: 0,
        accuracyRate: 0,
        semanticPerformance: 0,
        recommendations: ['搜索测试失败，请检查搜索服务']
      }
    }
  }

  /**
   * Test CDN performance
   */
  private async testCDNPerformance() {
    logger.info('Testing CDN performance')

    try {
      const stats = await this.cdnManager.getStats()
      const connectivityTest = await this.cdnManager.testConnectivity()

      if (!stats) {
        return {
          score: 50,
          hitRate: 0,
          avgResponseTime: 0,
          bandwidthSavings: 0,
          recommendations: ['CDN统计数据不可用，请检查CDN配置']
        }
      }

      const score = this.calculateCDNScore(stats.hitRate, stats.avgResponseTime, stats.errorRate)
      const bandwidthSavings = stats.hitRate * 0.6 // Assume 60% bandwidth savings with hit rate

      const recommendations = this.generateCDNRecommendations(stats)

      return {
        score,
        hitRate: stats.hitRate,
        avgResponseTime: stats.avgResponseTime,
        bandwidthSavings,
        recommendations
      }

    } catch (error) {
      logger.error('CDN performance test failed:', error)
      return {
        score: 0,
        hitRate: 0,
        avgResponseTime: 0,
        bandwidthSavings: 0,
        recommendations: ['CDN测试失败，请检查CDN服务配置']
      }
    }
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(result: PerformanceTestResult): number {
    const weights = {
      database: 0.25,
      cache: 0.20,
      api: 0.25,
      search: 0.20,
      cdn: 0.10
    }

    return Math.round(
      result.database.score * weights.database +
      result.cache.score * weights.cache +
      result.api.score * weights.api +
      result.search.score * weights.search +
      result.cdn.score * weights.cdn
    )
  }

  /**
   * Calculate performance grade
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  // Scoring methods
  private calculateDatabaseScore(avgTime: number, slowQueries: number, errorRate: number): number {
    let score = 100
    if (avgTime > 500) score -= Math.min(30, (avgTime - 500) / 50)
    if (slowQueries > 0) score -= Math.min(40, slowQueries * 10)
    if (errorRate > 0) score -= Math.min(30, errorRate * 100)
    return Math.max(0, Math.round(score))
  }

  private calculateCacheScore(hitRate: number, evictionRate: number, size: number): number {
    let score = hitRate * 100
    if (evictionRate > 0.1) score -= evictionRate * 50
    if (size > 500 * 1024 * 1024) score -= 20 // Penalty for >500MB
    return Math.max(0, Math.round(score))
  }

  private calculateAPIScore(avgTime: number, errorRate: number, throughput: number): number {
    let score = 100
    if (avgTime > 500) score -= Math.min(40, (avgTime - 500) / 100)
    if (errorRate > 0) score -= Math.min(60, errorRate * 100)
    if (throughput < 10) score -= 20
    return Math.max(0, Math.round(score))
  }

  private calculateSearchScore(avgTime: number, accuracyRate: number, semanticPerformance: number): number {
    let score = 100
    if (avgTime > 1000) score -= Math.min(30, (avgTime - 1000) / 100)
    score -= (1 - accuracyRate) * 40
    score -= (1 - semanticPerformance) * 30
    return Math.max(0, Math.round(score))
  }

  private calculateCDNScore(hitRate: number, avgTime: number, errorRate: number): number {
    let score = hitRate * 100
    if (avgTime > 500) score -= Math.min(20, (avgTime - 500) / 50)
    if (errorRate > 0) score -= Math.min(30, errorRate * 100)
    return Math.max(0, Math.round(score))
  }

  // Recommendation generation methods
  private generateDatabaseRecommendations(avgTime: number, slowQueries: number, stats: any): string[] {
    const recommendations: string[] = []
    if (avgTime > 1000) recommendations.push('数据库查询时间过长，建议优化索引')
    if (slowQueries > 0) recommendations.push(`发现${slowQueries}个慢查询，需要优化`)
    if (stats.errorRate > 0.01) recommendations.push('数据库错误率较高，检查连接配置')
    return recommendations
  }

  private generateCacheRecommendations(hitRate: number, evictionRate: number, size: number): string[] {
    const recommendations: string[] = []
    if (hitRate < 0.8) recommendations.push('缓存命中率较低，建议增加TTL或优化缓存策略')
    if (evictionRate > 0.1) recommendations.push('缓存驱逐率过高，建议增加缓存容量')
    if (size > 500 * 1024 * 1024) recommendations.push('缓存使用量较大，建议清理过期数据')
    return recommendations
  }

  private generateAPIRecommendations(avgTime: number, errorRate: number): string[] {
    const recommendations: string[] = []
    if (avgTime > 1000) recommendations.push('API响应时间过长，建议优化后端逻辑')
    if (errorRate > 0.05) recommendations.push('API错误率较高，检查服务器状态')
    return recommendations
  }

  private generateSearchRecommendations(avgTime: number, accuracyRate: number): string[] {
    const recommendations: string[] = []
    if (avgTime > 2000) recommendations.push('搜索响应时间过长，建议优化搜索索引')
    if (accuracyRate < 0.8) recommendations.push('搜索准确率较低，建议改进搜索算法')
    return recommendations
  }

  private generateCDNRecommendations(stats: any): string[] {
    const recommendations: string[] = []
    if (stats.hitRate < 0.8) recommendations.push('CDN命中率较低，建议优化缓存规则')
    if (stats.avgResponseTime > 1000) recommendations.push('CDN响应时间较长，检查边缘节点配置')
    return recommendations
  }

  // Issue extraction methods
  private extractCriticalIssues(result: PerformanceTestResult): string[] {
    const issues: string[] = []
    if (result.database.score < 50) issues.push('数据库性能严重不足')
    if (result.cache.score < 50) issues.push('缓存系统性能不佳')
    if (result.api.score < 50) issues.push('API响应时间过长')
    if (result.search.score < 50) issues.push('搜索功能性能低下')
    return issues
  }

  private extractHighPriorityOptimizations(result: PerformanceTestResult): string[] {
    const optimizations: string[] = []
    optimizations.push(...result.database.recommendations.slice(0, 2))
    optimizations.push(...result.cache.recommendations.slice(0, 2))
    return optimizations
  }

  private extractMediumPriorityOptimizations(result: PerformanceTestResult): string[] {
    const optimizations: string[] = []
    optimizations.push(...result.api.recommendations.slice(0, 2))
    optimizations.push(...result.search.recommendations.slice(0, 2))
    return optimizations
  }

  private extractLongTermImprovements(result: PerformanceTestResult): string[] {
    const improvements: string[] = []
    improvements.push(...result.cdn.recommendations)
    improvements.push('考虑实施微服务架构')
    improvements.push('探索使用边缘计算优化')
    return improvements
  }
}

// Default test configuration
export const DEFAULT_PERFORMANCE_TEST_CONFIG: PerformanceTestConfig = {
  databaseTest: {
    queryTypes: ['select', 'insert', 'update'],
    recordCount: true,
    analyzeSlowQueries: true
  },
  cacheTest: {
    hitRateTarget: 0.8,
    warmupData: true,
    testEviction: true
  },
  apiTest: {
    endpoints: [],
    methods: ['GET'],
    expectedResponseTime: 500
  },
  searchTest: {
    queryTypes: ['text', 'semantic'],
    resultCountRange: [5, 50],
    testSemantic: true
  }
}

export default PerformanceTester