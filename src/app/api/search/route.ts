/**
 * Search API Route
 *
 * Integrates full-text search and vector search for comprehensive note search
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { searchNotes } from '@/lib/search/full-text'
import { findSimilarNotes, generateEmbedding } from '@/lib/search/vector'
import { recordSearchEvent } from '@/lib/search/analytics'
import {
  getCachedSearchResults,
  cacheSearchResults,
  getCachedEmbedding,
  cacheEmbedding,
  performanceMonitor
} from '@/lib/search/cache'
import { searchPerformanceOptimizer, withSearchPerformanceMonitoring } from '@/lib/search/performance'
import { PrismaClient } from '@prisma/client'
import logger from '@/lib/utils/logger'

const prisma = new PrismaClient()

export interface SearchRequest {
  query: string
  userId: string
  searchType?: 'fulltext' | 'vector' | 'hybrid'
  filters?: {
    categoryId?: string
    tagIds?: string[]
    isFavorite?: boolean
    isArchived?: boolean
    dateRange?: {
      start: string
      end: string
    }
  }
  options?: {
    limit?: number
    offset?: number
    threshold?: number
    sortBy?: 'relevance' | 'created' | 'updated' | 'title'
    sortOrder?: 'asc' | 'desc'
    includeContent?: boolean
  }
}

export interface SearchResult {
  id: string
  title: string
  content: string
  contentSnippet: string
  category?: {
    id: string
    name: string
    color: string
  }
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  score: number
  similarity?: number
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  isArchived: boolean
  searchType: 'fulltext' | 'vector' | 'hybrid'
}

export interface SearchResponse {
  success: boolean
  data?: {
    results: SearchResult[]
    totalResults: number
    searchTime: number
    searchType: string
    stats: {
      fulltextResults?: number
      vectorResults?: number
      queryTerms: string[]
      searchVector?: string
      embeddingTime?: number
    }
  }
  error?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify authentication
    const session = await authOptions.adapter?.getSession?.(request)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: SearchRequest = await request.json()
    const {
      query,
      userId,
      searchType = 'hybrid',
      filters = {},
      options = {}
    } = body

    // Check cache first
    const cacheKey = `${query}-${JSON.stringify(filters)}-${JSON.stringify(options)}-${searchType}`
    const cachedResults = getCachedSearchResults(query, filters, { ...options, searchType })

    if (cachedResults) {
      const searchTime = Date.now() - startTime
      performanceMonitor.recordMetric('cache_hit_time', searchTime)

      // Log cache hit
      logger.info(`Cache hit for search query: ${query}`, {
        userId,
        searchType,
        resultsCount: cachedResults.length,
        searchTime
      })

      return NextResponse.json({
        success: true,
        data: {
          results: cachedResults,
          totalResults: cachedResults.length,
          searchTime,
          searchType,
          stats: {
            totalResults: cachedResults.length,
            searchTime,
            searchType,
            cacheHit: true
          }
        }
      })
    }

    // Validate required fields
    if (!query?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      )
    }

    if (!userId || userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    // Validate query length
    if (query.trim().length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Query too long. Maximum 1000 characters allowed.' },
        { status: 400 }
      )
    }

    // Validate search type
    const validSearchTypes = ['fulltext', 'vector', 'hybrid']
    if (!validSearchTypes.includes(searchType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid search type. Must be fulltext, vector, or hybrid.' },
        { status: 400 }
      )
    }

    // Validate options
    if (options.limit !== undefined && (typeof options.limit !== 'number' || options.limit < 1 || options.limit > 100)) {
      return NextResponse.json(
        { success: false, error: 'limit must be a number between 1 and 100' },
        { status: 400 }
      )
    }

    if (options.offset !== undefined && (typeof options.offset !== 'number' || options.offset < 0)) {
      return NextResponse.json(
        { success: false, error: 'offset must be a non-negative number' },
        { status: 400 }
      )
    }

    if (options.threshold !== undefined && (typeof options.threshold !== 'number' || options.threshold < 0 || options.threshold > 1)) {
      return NextResponse.json(
        { success: false, error: 'threshold must be a number between 0 and 1' },
        { status: 400 }
      )
    }

    // Validate date range
    if (filters.dateRange) {
      const { start, end } = filters.dateRange
      const startDate = new Date(start)
      const endDate = new Date(end)

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid date range format' },
          { status: 400 }
        )
      }

      if (startDate >= endDate) {
        return NextResponse.json(
          { success: false, error: 'Start date must be before end date' },
          { status: 400 }
        )
      }
    }

    let results: SearchResult[] = []
    let totalResults = 0
    const stats: any = {
      queryTerms: query.trim().toLowerCase().split(/\s+/).filter(term => term.length >= 2)
    }

    // Perform search based on type
    if (searchType === 'fulltext' || searchType === 'hybrid') {
      try {
        const fulltextResults = await searchNotes(prisma, {
          query,
          userId,
          limit: options.limit || 20,
          offset: options.offset || 0,
          categoryId: filters.categoryId,
          tagIds: filters.tagIds,
          isFavorite: filters.isFavorite,
          isArchived: filters.isArchived,
          sortBy: options.sortBy || 'relevance',
          sortOrder: options.sortOrder || 'desc',
          includeContent: options.includeContent ?? true
        })

        if (searchType === 'fulltext') {
          // Use only full-text results
          results = fulltextResults.results.map(result => ({
            ...result,
            searchType: 'fulltext' as const
          }))
          totalResults = fulltextResults.stats.totalResults
          stats.fulltextResults = results.length
          stats.searchVector = fulltextResults.stats.matchedFields.join(', ')
        } else {
          // Hybrid search - store full-text results for merging
          stats.fulltextResults = fulltextResults.results.length
          const fullTextMap = new Map(
            fulltextResults.results.map(result => [result.id, { ...result, searchType: 'fulltext' as const }])
          )

          // Perform vector search for hybrid
          const embeddingStart = Date.now()
          const queryEmbedding = await generateEmbedding(query)
          stats.embeddingTime = Date.now() - embeddingStart

          const vectorResults = await findSimilarNotes(prisma, {
            queryEmbedding,
            userId,
            limit: options.limit || 20,
            threshold: options.threshold || 0.3,
            categoryId: filters.categoryId,
            tagIds: filters.tagIds,
            isFavorite: filters.isFavorite,
            isArchived: filters.isArchived,
            includeContent: options.includeContent ?? true
          })

          stats.vectorResults = vectorResults.length

          // Merge and deduplicate results
          const mergedResults = new Map<string, SearchResult>()

          // Add full-text results
          fullTextMap.forEach((result, id) => {
            mergedResults.set(id, result)
          })

          // Add or merge vector results
          vectorResults.forEach(vectorResult => {
            const existing = mergedResults.get(vectorResult.id)
            if (existing) {
              // Merge scores for hybrid search
              const mergedScore = (existing.score + vectorResult.similarity) / 2
              mergedResults.set(vectorResult.id, {
                ...existing,
                similarity: vectorResult.similarity,
                score: mergedScore,
                searchType: 'hybrid' as const
              })
            } else {
              mergedResults.set(vectorResult.id, {
                ...vectorResult,
                score: vectorResult.similarity,
                similarity: vectorResult.similarity,
                searchType: 'hybrid' as const
              })
            }
          })

          results = Array.from(mergedResults.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, options.limit || 20)

          totalResults = Math.max(
            fulltextResults.stats.totalResults,
            vectorResults.length
          )
        }

      } catch (searchError) {
        logger.error('Full-text search error:', searchError)
        if (searchType === 'fulltext') {
          throw searchError
        }
        // For hybrid search, continue with vector search if full-text fails
      }
    }

    if (searchType === 'vector' && results.length === 0) {
      try {
        const embeddingStart = Date.now()
        const queryEmbedding = await generateEmbedding(query)
        stats.embeddingTime = Date.now() - embeddingStart

        const vectorResults = await findSimilarNotes(prisma, {
          queryEmbedding,
          userId,
          limit: options.limit || 20,
          threshold: options.threshold || 0.3,
          categoryId: filters.categoryId,
          tagIds: filters.tagIds,
          isFavorite: filters.isFavorite,
          isArchived: filters.isArchived,
          includeContent: options.includeContent ?? true
        })

        results = vectorResults.map(result => ({
          ...result,
          score: result.similarity,
          similarity: result.similarity,
          searchType: 'vector' as const
        }))

        totalResults = vectorResults.length
        stats.vectorResults = results.length

      } catch (vectorError) {
        logger.error('Vector search error:', vectorError)
        throw vectorError
      }
    }

    // Apply date range filter if specified
    if (filters.dateRange && results.length > 0) {
      const { start, end } = filters.dateRange
      const startDate = new Date(start)
      const endDate = new Date(end)

      results = results.filter(result => {
        const resultDate = new Date(result.updatedAt)
        return resultDate >= startDate && resultDate <= endDate
      })
    }

    const searchTime = Date.now() - startTime

    // Cache the results for future requests
    if (results.length > 0) {
      const cacheTTL = searchType === 'vector' ? 30 * 60 * 1000 : 10 * 60 * 1000 // 30min for vector, 10min for others
      cacheSearchResults(query, results, filters, { ...options, searchType }, cacheTTL)
    }

    // Record performance metrics
    performanceMonitor.recordMetric('search_time', searchTime)
    performanceMonitor.recordMetric('results_count', results.length)

    // Record search event for analytics
    try {
      await recordSearchEvent(prisma, {
        userId,
        query,
        searchType,
        responseTime: searchTime,
        resultCount: results.length,
        success: true
      })
    } catch (analyticsError) {
      logger.warn('Failed to record search analytics:', analyticsError)
    }

    // Log search request for monitoring
    logger.info(`Search completed for user ${userId}`, {
      query,
      searchType,
      resultsCount: results.length,
      totalResults,
      searchTime,
      stats,
      cacheMiss: true
    })

    const response: SearchResponse = {
      success: true,
      data: {
        results,
        totalResults,
        searchTime,
        searchType,
        stats: {
          ...stats,
          cacheHit: false
        }
      }
    }

    // Record performance metrics
    const performanceMetrics = {
      queryTime: searchTime,
      indexSearchTime: stats.fulltextResults ? Date.now() - startTime : 0,
      vectorSearchTime: stats.embeddingTime || 0,
      embeddingTime: stats.embeddingTime || 0,
      cacheTime: cachedResults ? 10 : 50, // Mock cache time
      totalTime: searchTime,
      resultCount: results.length,
      cacheHit: cachedResults ? true : false,
      searchType: searchType as 'fulltext' | 'vector' | 'hybrid'
    }

    searchPerformanceOptimizer.recordMetrics(performanceMetrics)

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Search API error:', error)

    // Record error metrics
    const errorMetrics = {
      queryTime: Date.now() - startTime,
      indexSearchTime: 0,
      vectorSearchTime: 0,
      embeddingTime: 0,
      cacheTime: 0,
      totalTime: Date.now() - startTime,
      resultCount: 0,
      cacheHit: false,
      searchType: searchType as 'fulltext' | 'vector' | 'hybrid'
    }

    searchPerformanceOptimizer.recordMetrics(errorMetrics)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      if (error.message.includes('API key')) {
        return NextResponse.json(
          { success: false, error: 'AI service configuration error.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}