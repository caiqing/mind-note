/**
 * Search Analytics Service
 *
 * Provides search performance analysis and optimization
 */

import { PrismaClient } from '@prisma/client'
import logger from '@/lib/utils/logger'

export interface SearchAnalytics {
  userId: string
  totalSearches: number
  averageResponseTime: number
  mostSearchedTerms: Array<{
    term: string
    count: number
    successRate: number
  }>
  searchTypeDistribution: {
    fulltext: number
    vector: number
    hybrid: number
  }
  failedSearches: number
  commonErrors: Array<{
    error: string
    count: number
  }>
  dailySearchCounts: Array<{
    date: string
    count: number
  }>
  performanceMetrics: {
    p50ResponseTime: number
    p95ResponseTime: number
    cacheHitRate: number
    averageResultCount: number
  }
}

export interface SearchOptimization {
  userId: string
  suggestions: Array<{
    type: 'performance' | 'relevance' | 'coverage'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    action?: string
  }>
  indexStats: {
    totalNotes: number
    indexedNotes: number
    coveragePercentage: number
    lastIndexUpdate: Date | null
  }
  embeddingStats: {
    notesWithEmbeddings: number
    embeddingCoverage: number
    averageEmbeddingTime: number
    lastEmbeddingUpdate: Date | null
  }
}

/**
 * Record search event for analytics
 */
export async function recordSearchEvent(
  prisma: PrismaClient,
  data: {
    userId: string
    query: string
    searchType: 'fulltext' | 'vector' | 'hybrid'
    responseTime: number
    resultCount: number
    success: boolean
    error?: string
    filters?: Record<string, any>
  }
): Promise<void> {
  try {
    // In a real implementation, this would store search events in a dedicated table
    // For now, we'll just log the event
    logger.info('Search event recorded', {
      userId: data.userId,
      query: data.query,
      searchType: data.searchType,
      responseTime: data.responseTime,
      resultCount: data.resultCount,
      success: data.success,
      error: data.error
    })

    // TODO: Store in database when search_analytics table is created
    // await prisma.searchAnalytics.create({ data: { ... } })

  } catch (error) {
    logger.error('Failed to record search event:', error)
  }
}

/**
 * Get search analytics for a user
 */
export async function getSearchAnalytics(
  prisma: PrismaClient,
  userId: string,
  timeRange: '7d' | '30d' | '90d' = '30d'
): Promise<SearchAnalytics> {
  try {
    // In a real implementation, this would query the search_analytics table
    // For now, return mock data

    const mockAnalytics: SearchAnalytics = {
      userId,
      totalSearches: 156,
      averageResponseTime: 245,
      mostSearchedTerms: [
        { term: '人工智能', count: 23, successRate: 0.91 },
        { term: 'React', count: 18, successRate: 0.89 },
        { term: '项目管理', count: 15, successRate: 0.93 },
        { term: '设计模式', count: 12, successRate: 0.85 },
        { term: '技术文档', count: 10, successRate: 0.90 }
      ],
      searchTypeDistribution: {
        fulltext: 45,
        vector: 32,
        hybrid: 79
      },
      failedSearches: 8,
      commonErrors: [
        { error: 'Rate limit exceeded', count: 3 },
        { error: 'Query too long', count: 2 },
        { error: 'Invalid search type', count: 2 },
        { error: 'Authentication required', count: 1 }
      ],
      dailySearchCounts: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 10) + 1
      })).reverse(),
      performanceMetrics: {
        p50ResponseTime: 180,
        p95ResponseTime: 450,
        cacheHitRate: 0.68,
        averageResultCount: 12.3
      }
    }

    return mockAnalytics

  } catch (error) {
    logger.error('Failed to get search analytics:', error)
    throw new Error('Failed to retrieve search analytics')
  }
}

/**
 * Get search optimization suggestions
 */
export async function getSearchOptimizations(
  prisma: PrismaClient,
  userId: string
): Promise<SearchOptimization> {
  try {
    // Get user's notes statistics
    const [totalNotes, indexedNotes, notesWithEmbeddings] = await Promise.all([
      prisma.note.count({ where: { userId } }),
      prisma.note.count({
        where: {
          userId,
          searchVector: { not: null }
        }
      }),
      prisma.note.count({
        where: {
          userId,
          embedding: { not: null }
        }
      })
    ])

    const coveragePercentage = totalNotes > 0 ? (indexedNotes / totalNotes) * 100 : 0
    const embeddingCoverage = totalNotes > 0 ? (notesWithEmbeddings / totalNotes) * 100 : 0

    // Generate optimization suggestions
    const suggestions = []

    if (coveragePercentage < 90) {
      suggestions.push({
        type: 'coverage' as const,
        priority: 'high' as const,
        title: '提高搜索索引覆盖率',
        description: `只有 ${coveragePercentage.toFixed(1)}% 的笔记被索引，影响搜索效果`,
        action: '重新生成搜索索引'
      })
    }

    if (embeddingCoverage < 80) {
      suggestions.push({
        type: 'coverage' as const,
        priority: 'medium' as const,
        title: '增加语义搜索覆盖',
        description: `只有 ${embeddingCoverage.toFixed(1)}% 的笔记有向量嵌入`,
        action: '批量生成嵌入向量'
      })
    }

    // Mock performance suggestions
    suggestions.push({
      type: 'performance' as const,
      priority: 'low' as const,
      title: '启用搜索缓存',
      description: '启用搜索结果缓存可以显著提升重复查询的响应速度',
      action: '配置Redis缓存'
    })

    suggestions.push({
      type: 'relevance' as const,
      priority: 'medium' as const,
      title: '优化搜索相关性',
      description: '分析搜索模式，调整相关性算法以提高结果质量',
      action: '调整搜索权重配置'
    })

    const optimization: SearchOptimization = {
      userId,
      suggestions,
      indexStats: {
        totalNotes,
        indexedNotes,
        coveragePercentage,
        lastIndexUpdate: new Date() // Mock timestamp
      },
      embeddingStats: {
        notesWithEmbeddings,
        embeddingCoverage,
        averageEmbeddingTime: 120, // Mock time in ms
        lastEmbeddingUpdate: new Date() // Mock timestamp
      }
    }

    return optimization

  } catch (error) {
    logger.error('Failed to get search optimizations:', error)
    throw new Error('Failed to retrieve search optimizations')
  }
}

/**
 * Rebuild search index for a user
 */
export async function rebuildSearchIndex(
  prisma: PrismaClient,
  userId: string
): Promise<{ success: boolean; processedNotes: number; errors: string[] }> {
  const startTime = Date.now()
  let processedNotes = 0
  const errors: string[] = []

  try {
    logger.info(`Starting search index rebuild for user ${userId}`)

    // Get all notes for the user
    const notes = await prisma.note.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        content: true
      }
    })

    logger.info(`Found ${notes.length} notes to index`)

    // Process each note
    for (const note of notes) {
      try {
        // Generate search vector (this would use the full-text search service)
        const searchVector = generateSearchVector(note.title, note.content)

        // Update the note with search vector
        await prisma.note.update({
          where: { id: note.id },
          data: { searchVector }
        })

        processedNotes++

        // Add delay to avoid overwhelming the system
        if (processedNotes % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        const errorMsg = `Failed to index note ${note.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        logger.error(errorMsg)
      }
    }

    const duration = Date.now() - startTime
    logger.info(`Search index rebuild completed for user ${userId}`, {
      processedNotes,
      errors: errors.length,
      duration
    })

    return {
      success: errors.length === 0,
      processedNotes,
      errors
    }

  } catch (error) {
    logger.error('Search index rebuild failed:', error)
    throw new Error(`Search index rebuild failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate search vector for full-text search
 */
function generateSearchVector(title: string, content: string): string {
  // This is a simplified implementation
  // In production, this would use proper text processing and tokenization

  const text = `${title} ${content}`
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') // Keep letters, numbers, spaces, and Chinese characters
    .replace(/\s+/g, ' ')
    .trim()

  const words = text.split(' ').filter(word => word.length >= 2)
  const uniqueWords = [...new Set(words)]

  return uniqueWords.join(' ')
}

/**
 * Get search performance metrics
 */
export async function getSearchPerformanceMetrics(
  prisma: PrismaClient,
  userId: string,
  timeRange: '1h' | '24h' | '7d' = '24h'
): Promise<{
  responseTime: {
    current: number
    average: number
    trend: 'improving' | 'degrading' | 'stable'
  }
  throughput: {
    current: number
    average: number
    peak: number
  }
  errorRate: {
    current: number
    average: number
  }
  cachePerformance?: {
    hitRate: number
    missRate: number
    evictionRate: number
  }
}> {
  try {
    // Mock performance metrics
    const mockMetrics = {
      responseTime: {
        current: 180,
        average: 220,
        trend: 'improving' as const
      },
      throughput: {
        current: 45,
        average: 38,
        peak: 67
      },
      errorRate: {
        current: 0.02,
        average: 0.03
      },
      cachePerformance: {
        hitRate: 0.68,
        missRate: 0.32,
        evictionRate: 0.05
      }
    }

    return mockMetrics

  } catch (error) {
    logger.error('Failed to get search performance metrics:', error)
    throw new Error('Failed to retrieve performance metrics')
  }
}

export default {
  recordSearchEvent,
  getSearchAnalytics,
  getSearchOptimizations,
  rebuildSearchIndex,
  getSearchPerformanceMetrics
}