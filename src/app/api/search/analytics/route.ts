/**
 * Search Analytics API Route
 *
 * Provides search performance analytics and optimization suggestions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { getSearchAnalytics, getSearchOptimizations, rebuildSearchIndex } from '@/lib/search/analytics'
import logger from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await authOptions.adapter?.getSession?.(request)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = session.user.id
    const timeRange = searchParams.get('timeRange') as '7d' | '30d' | '90d' || '30d'
    const type = searchParams.get('type') || 'analytics'

    if (type === 'analytics') {
      const analytics = await getSearchAnalytics(userId, timeRange)

      // Log analytics request for monitoring
      logger.info(`Search analytics retrieved for user ${userId}`, {
        timeRange,
        totalSearches: analytics.totalSearches,
        averageResponseTime: analytics.averageResponseTime
      })

      return NextResponse.json({
        success: true,
        data: analytics
      })

    } else if (type === 'optimizations') {
      const optimizations = await getSearchOptimizations(userId)

      // Log optimizations request for monitoring
      logger.info(`Search optimizations retrieved for user ${userId}`, {
        suggestionsCount: optimizations.suggestions.length,
        indexCoverage: optimizations.indexStats.coveragePercentage,
        embeddingCoverage: optimizations.embeddingStats.embeddingCoverage
      })

      return NextResponse.json({
        success: true,
        data: optimizations
      })

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be analytics or optimizations' },
        { status: 400 }
      )
    }

  } catch (error) {
    logger.error('Search analytics API error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await authOptions.adapter?.getSession?.(request)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body
    const userId = session.user.id

    if (action === 'rebuild-index') {
      // Rebuild search index
      const result = await rebuildSearchIndex(userId)

      // Log index rebuild for monitoring
      logger.info(`Search index rebuild completed for user ${userId}`, {
        success: result.success,
        processedNotes: result.processedNotes,
        errorsCount: result.errors.length
      })

      return NextResponse.json({
        success: true,
        data: result
      })

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

  } catch (error) {
    logger.error('Search analytics POST API error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}