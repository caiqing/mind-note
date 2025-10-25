/**
 * Cache Management API Route
 *
 * Provides comprehensive cache management endpoints for monitoring and optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { searchCache, apiCache, imageCache } from '@/lib/cache/advanced-cache'
import logger from '@/lib/utils/logger'

export interface CacheManagementRequest {
  action?: 'stats' | 'clear' | 'warmup' | 'export' | 'import' | 'cleanup'
  cacheType?: 'search' | 'api' | 'image' | 'all'
  data?: any
}

export interface CacheStatsResponse {
  success: boolean
  data?: {
    search?: any
    api?: any
    image?: any
    combined?: {
      totalSize: number
      totalEntries: number
      avgHitRate: number
      totalEvictions: number
    }
  }
  error?: string
}

export interface CacheOperationResponse {
  success: boolean
  data?: {
    operation: string
    result: any
    duration: number
    affectedCaches: string[]
  }
  error?: string
}

// Cache instance mapping
const cacheInstances = {
  search: searchCache,
  api: apiCache,
  image: imageCache
}

/**
 * GET - Retrieve cache statistics
 */
export async function GET(request: NextRequest) {
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

    // Get cache type from query parameters
    const { searchParams } = new URL(request.url)
    const cacheType = searchParams.get('type') as 'search' | 'api' | 'image' | 'all' || 'all'

    let response: CacheStatsResponse = { success: true }

    if (cacheType === 'all') {
      // Get stats from all cache instances
      const searchStats = searchCache.getStats()
      const apiStats = apiCache.getStats()
      const imageStats = imageCache.getStats()

      // Calculate combined statistics
      const combined = {
        totalSize: searchStats.totalSize + apiStats.totalSize + imageStats.totalSize,
        totalEntries: searchStats.totalEntries + apiStats.totalEntries + imageStats.totalEntries,
        avgHitRate: (searchStats.hitRate + apiStats.hitRate + imageStats.hitRate) / 3,
        totalEvictions: searchStats.evictionCount + apiStats.evictionCount + imageStats.evictionCount
      }

      response.data = {
        search: searchStats,
        api: apiStats,
        image: imageStats,
        combined
      }

    } else {
      // Get stats from specific cache instance
      const cache = cacheInstances[cacheType]
      if (!cache) {
        return NextResponse.json(
          { success: false, error: 'Invalid cache type' },
          { status: 400 }
        )
      }

      response.data = {
        [cacheType]: cache.getStats()
      }
    }

    const duration = Date.now() - startTime
    logger.info('Cache stats retrieved', {
      userId: session.user.id,
      cacheType,
      duration,
      success: response.success
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Cache management GET error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST - Perform cache operations
 */
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
    const body: CacheManagementRequest = await request.json()
    const { action = 'stats', cacheType = 'all', data } = body

    let response: CacheOperationResponse = { success: true }
    const affectedCaches: string[] = []

    switch (action) {
      case 'stats':
        // Return statistics (same as GET)
        return await GET(request)

      case 'clear':
        // Clear cache entries
        await handleCacheClear(cacheType, data?.tags)
        affectedCaches.push(cacheType)
        response.data = {
          operation: 'clear',
          result: { cleared: true, tags: data?.tags || 'all' },
          duration: Date.now() - startTime,
          affectedCaches
        }
        break

      case 'warmup':
        // Warm up cache with common data
        await handleCacheWarmup(cacheType)
        affectedCaches.push(cacheType)
        response.data = {
          operation: 'warmup',
          result: { warmed: true },
          duration: Date.now() - startTime,
          affectedCaches
        }
        break

      case 'cleanup':
        // Clean up expired entries
        const cleanedCounts = await handleCacheCleanup(cacheType)
        affectedCaches.push(cacheType)
        response.data = {
          operation: 'cleanup',
          result: { cleanedCounts },
          duration: Date.now() - startTime,
          affectedCaches
        }
        break

      case 'export':
        // Export cache data
        const exportData = await handleCacheExport(cacheType)
        response.data = {
          operation: 'export',
          result: exportData,
          duration: Date.now() - startTime,
          affectedCaches
        }
        break

      case 'import':
        // Import cache data
        if (!data?.entries) {
          return NextResponse.json(
            { success: false, error: 'Import data is required' },
            { status: 400 }
          )
        }
        await handleCacheImport(cacheType, data.entries)
        affectedCaches.push(cacheType)
        response.data = {
          operation: 'import',
          result: { imported: data.entries.length },
          duration: Date.now() - startTime,
          affectedCaches
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    logger.info('Cache operation completed', {
      userId: session.user.id,
      action,
      cacheType,
      duration: response.data?.duration,
      success: response.success
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Cache management POST error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle cache clearing operation
 */
async function handleCacheClear(cacheType: string, tags?: string[]): Promise<void> {
  if (cacheType === 'all') {
    await Promise.all([
      searchCache.clear(tags),
      apiCache.clear(tags),
      imageCache.clear(tags)
    ])
  } else {
    const cache = cacheInstances[cacheType as keyof typeof cacheInstances]
    if (cache) {
      await cache.clear(tags)
    }
  }
}

/**
 * Handle cache warmup operation
 */
async function handleCacheWarmup(cacheType: string): Promise<void> {
  if (cacheType === 'all' || cacheType === 'search') {
    await searchCache.warmUp()
  }

  // For other cache types, implement specific warmup logic as needed
  logger.info(`Cache warmup completed for ${cacheType}`)
}

/**
 * Handle cache cleanup operation
 */
async function handleCacheCleanup(cacheType: string): Promise<Record<string, number>> {
  const cleanedCounts: Record<string, number> = {}

  if (cacheType === 'all') {
    cleanedCounts.search = searchCache.cleanup()
    cleanedCounts.api = apiCache.cleanup()
    cleanedCounts.image = imageCache.cleanup()
  } else {
    const cache = cacheInstances[cacheType as keyof typeof cacheInstances]
    if (cache) {
      cleanedCounts[cacheType] = cache.cleanup()
    }
  }

  return cleanedCounts
}

/**
 * Handle cache export operation
 */
async function handleCacheExport(cacheType: string): Promise<Record<string, any>> {
  const exportData: Record<string, any> = {}

  if (cacheType === 'all') {
    exportData.search = searchCache.exportData()
    exportData.api = apiCache.exportData()
    exportData.image = imageCache.exportData()
  } else {
    const cache = cacheInstances[cacheType as keyof typeof cacheInstances]
    if (cache) {
      exportData[cacheType] = cache.exportData()
    }
  }

  return exportData
}

/**
 * Handle cache import operation
 */
async function handleCacheImport(cacheType: string, entries: any[]): Promise<void> {
  if (cacheType === 'all') {
    // Distribute entries based on cache type in the data
    const searchEntries = entries.filter(e => e.cacheType === 'search')
    const apiEntries = entries.filter(e => e.cacheType === 'api')
    const imageEntries = entries.filter(e => e.cacheType === 'image')

    await Promise.all([
      searchEntries.length > 0 ? searchCache.importData(searchEntries) : Promise.resolve(),
      apiEntries.length > 0 ? apiCache.importData(apiEntries) : Promise.resolve(),
      imageEntries.length > 0 ? imageCache.importData(imageEntries) : Promise.resolve()
    ])
  } else {
    const cache = cacheInstances[cacheType as keyof typeof cacheInstances]
    if (cache) {
      await cache.importData(entries)
    }
  }
}