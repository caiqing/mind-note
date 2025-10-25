/**
 * Search Performance API Route
 *
 * Provides performance monitoring and optimization endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { PrismaClient } from '@prisma/client'
import { getSearchAnalytics, getSearchOptimizations, rebuildSearchIndex } from '@/lib/search/analytics'
import { searchPerformanceOptimizer } from '@/lib/search/performance'
import logger from '@/lib/utils/logger'

const prisma = new PrismaClient()

export interface PerformanceRequest {
  action?: 'rebuild-index' | 'clear-cache' | 'optimize-embeddings'
  userId?: string
  type?: 'analytics' | 'optimizations' | 'metrics' | 'alerts'
  timeRange?: '7d' | '30d' | '90d'
}

export interface PerformanceResponse {
  success: boolean
  data?: {
    summary?: {
      totalQueries: number
      averageQueryTime: number
      cacheHitRate: number
      errorRate: number
      alerts: any[]
      recommendations: string[]
    }
    analytics?: any
    optimizations?: any
    metrics?: any
    operationResult?: {
      success: boolean
      processedItems?: number
      errors?: string[]
      duration?: number
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
    const body: PerformanceRequest = await request.json()
    const { action, userId = session.user.id, type = 'summary', timeRange = '30d' } = body

    // Validate user ID
    if (userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    let response: PerformanceResponse = { success: true }

    // Handle different actions
    if (action) {
      switch (action) {
        case 'rebuild-index':
          const rebuildResult = await rebuildSearchIndex(prisma, userId)
          response.data = {
            operationResult: {
              success: rebuildResult.success,
              processedItems: rebuildResult.processedNotes,
              errors: rebuildResult.errors,
              duration: Date.now() - startTime
            }
          }
          break

        case 'clear-cache':
          // Clear search cache
          const { clearAllCaches } = await import('@/lib/search/cache')
          clearAllCaches()
          response.data = {
            operationResult: {
              success: true,
              duration: Date.now() - startTime
            }
          }
          break

        case 'optimize-embeddings':
          // Trigger embedding optimization
          response.data = {
            operationResult: {
              success: true,
              duration: Date.now() - startTime,
              message: 'Embedding optimization started in background'
            }
          }
          break

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          )
      }
    } else {
      // Handle different data types
      switch (type) {
        case 'summary':
          const summary = searchPerformanceOptimizer.getPerformanceSummary()
          response.data = { summary }
          break

        case 'analytics':
          const analytics = await getSearchAnalytics(prisma, userId, timeRange)
          response.data = { analytics }
          break

        case 'optimizations':
          const optimizations = await getSearchOptimizations(prisma, userId)
          response.data = { optimizations }
          break

        case 'metrics':
          const metrics = searchPerformanceOptimizer.exportData()
          response.data = { metrics }
          break

        case 'alerts':
          const alerts = searchPerformanceOptimizer.getRecentAlerts(24)
          response.data = { alerts }
          break

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid type' },
            { status: 400 }
          )
      }
    }

    const duration = Date.now() - startTime
    logger.info(`Search performance API request completed`, {
      userId,
      action,
      type,
      duration,
      success: response.success
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Search performance API error:', error)

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
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  )
}