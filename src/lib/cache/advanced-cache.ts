/**
 * Advanced Cache Management System
 *
 * Provides multi-level caching with intelligent invalidation and CDN integration
 */

import logger from '@/lib/utils/logger'
import { performanceMonitor } from '@/lib/monitoring/performance-monitor'

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
  size: number
  tags?: string[]
  metadata?: Record<string, any>
}

export interface CacheOptions {
  ttl?: number
  maxSize?: number
  tags?: string[]
  metadata?: Record<string, any>
  priority?: number
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitCount: number
  missCount: number
  hitRate: number
  evictionCount: number
  topEntries: Array<{
    key: string
    hitCount: number
    accessCount: number
    size: number
  }>
}

export interface CDNConfig {
  enabled: boolean
  provider: 'cloudflare' | 'aws' | 'cloudfront' | 'vercel'
  edgeTTL?: number
  browserTTL?: number
  revalidateAfter?: number
  bypassPatterns?: string[]
  customHeaders?: Record<string, string>
}

class AdvancedCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number
  private totalSize: number
  private stats: {
    hits: number
    misses: number
    evictions: number
  }
  private cdnConfig: CDNConfig
  private writeThrough: boolean
  private writeBack: boolean
  private backgroundSync: boolean

  constructor(options: {
    maxSize?: number
    cdnConfig?: CDNConfig
    writeThrough?: boolean
    writeBack?: boolean
    backgroundSync?: boolean
  } = {}) {
    this.maxSize = options.maxSize || 100 * 1024 * 1024 // 100MB default
    this.totalSize = 0
    this.stats = { hits: 0, misses: 0, evictions: 0 }
    this.cdnConfig = options.cdnConfig || { enabled: false, provider: 'cloudflare' }
    this.writeThrough = options.writeThrough || false
    this.writeBack = options.writeBack || false
    this.backgroundSync = options.backgroundSync || false

    if (this.backgroundSync) {
      this.startBackgroundSync()
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now()

    try {
      const entry = this.cache.get(key)

      if (!entry) {
        this.stats.misses++
        performanceMonitor.recordMetric('cache_miss', 1, 'count', { key })
        return null
      }

      // Check if entry has expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        this.totalSize -= entry.size
        this.stats.misses++
        performanceMonitor.recordMetric('cache_miss', 1, 'count', { key })
        return null
      }

      // Update access statistics
      entry.accessCount++
      entry.lastAccessed = Date.now()

      this.stats.hits++
      performanceMonitor.recordMetric('cache_hit', 1, 'count', { key })

      const duration = performance.now() - startTime
      performanceMonitor.recordMetric('cache_get_duration', duration, 'ms', { key })

      logger.debug('Cache hit', { key, accessCount: entry.accessCount })
      return entry.data as T

    } catch (error) {
      logger.error('Cache get error:', error)
      this.stats.misses++
      return null
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const startTime = performance.now()

    try {
      const ttl = options.ttl || 5 * 60 * 1000 // 5 minutes default
      const size = this.calculateSize(data)

      // Check if we need to make space
      if (this.totalSize + size > this.maxSize) {
        this.evictLRU(size)
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 1,
        lastAccessed: Date.now(),
        size,
        tags: options.tags,
        metadata: options.metadata,
        priority: options.priority || 0
      }

      this.cache.set(key, entry)
      this.totalSize += size

      const duration = performance.now() - startTime
      performanceMonitor.recordMetric('cache_set_duration', duration, 'ms', { key })

      logger.debug('Cache set', { key, size, ttl })

      // Write-through caching
      if (this.writeThrough) {
        await this.writeToPersistentStore(key, entry)
      } else if (this.writeBack) {
        this.scheduleWriteBack(key, entry)
      }

      // CDN cache headers if enabled
      if (this.cdnConfig.enabled) {
        this.setCDNCacheHeaders(key, ttl)
      }

    } catch (error) {
      logger.error('Cache set error:', error)
    }
  }

  /**
   * Delete entry from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key)
      if (entry) {
        this.cache.delete(key)
        this.totalSize -= entry.size
        logger.debug('Cache delete', { key })
        return true
      }
      return false

    } catch (error) {
      logger.error('Cache delete error:', error)
      return false
    }
  }

  /**
   * Clear cache
   */
  async clear(tags?: string[]): Promise<void> {
    try {
      if (tags && tags.length > 0) {
        // Clear entries with matching tags
        for (const [key, entry] of this.cache.entries()) {
          if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
            this.cache.delete(key)
            this.totalSize -= entry.size
          }
        }
      } else {
        // Clear all entries
        this.cache.clear()
        this.totalSize = 0
      }

      logger.info('Cache cleared', { tags })

    } catch (error) {
      logger.error('Cache clear error:', error)
    }
  }

  /**
   * Get multiple values with batch operation
   */
  async getBatch<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>()

    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key)
        if (value !== null) {
          results.set(key, value)
        }
      })
    )

    return results
  }

  /**
   * Set multiple values with batch operation
   */
  async setBatch<T>(
    entries: Array<{ key: string; data: T; options?: CacheOptions }>
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, data, options }) => this.set(key, data, options))
    )
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0

    // Get top entries by access count
    const topEntries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        hitCount: entry.accessCount,
        accessCount: entry.accessCount,
        size: entry.size
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)

    return {
      totalEntries: this.cache.size,
      totalSize: this.totalSize,
      hitCount: this.stats.hits,
      missCount: this.stats.misses,
      hitRate,
      evictionCount: this.stats.evictions,
      topEntries
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        // Priority-based eviction (higher priority items are less likely to be evicted)
        const aPriority = a[1].priority || 0
        const bPriority = b[1].priority || 0
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        return a[1].lastAccessed - b[1].lastAccessed
      })

    let freedSpace = 0

    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break

      this.cache.delete(key)
      this.totalSize -= entry.size
      freedSpace += entry.size
      this.stats.evictions++

      logger.debug('Cache eviction', { key, size: entry.size })
    }
  }

  /**
   * Calculate size of data
   */
  private calculateSize(data: any): number {
    try {
      if (data === null || data === undefined) return 0
      if (typeof data === 'string') return data.length * 2
      if (typeof data === 'number') return 8
      if (typeof data === 'boolean') return 4
      if (typeof data === 'object') {
        return JSON.stringify(data).length * 2
      }
      return 100 // Default estimate
    } catch (error) {
      return 100
    }
  }

  /**
   * Write to persistent storage
   */
  private async writeToPersistentStore(key: string, entry: CacheEntry): Promise<void> {
    // Implement persistent storage logic here
    // Could use Redis, filesystem, or database
    logger.debug('Write-through to persistent store', { key })
  }

  /**
   * Schedule write-back operation
   */
  private scheduleWriteBack(key: string, entry: CacheEntry): void {
    setTimeout(() => {
      this.writeToPersistentStore(key, entry).catch(error => {
      logger.error('Write-back failed:', error)
    })
    }, Math.random() * 1000) // Random delay up to 1 second
  }

  /**
   * Start background sync for write-back entries
   */
  private startBackgroundSync(): void {
    setInterval(() => {
      // Sync dirty entries to persistent storage
      logger.debug('Background sync triggered')
    }, 60000) // Every minute
  }

  /**
   * Set CDN cache headers
   */
  private setCDNCacheHeaders(key: string, ttl: number): void {
    if (!this.cdnConfig.enabled) return

    const headers = {
      'Cache-Control': `public, max-age=${Math.floor(ttl / 1000)}`,
      ...this.cdnConfig.customHeaders
    }

    // In a real implementation, this would set actual HTTP headers
    logger.debug('CDN cache headers set', { key, headers })
  }

  /**
   * Preload cache entries
   */
  async preload<T>(loader: () => Promise<Map<string, T>>, options?: CacheOptions): Promise<void> {
    try {
      const startTime = performance.now()
      const entries = await loader()

      await this.setBatch(
        Array.from(entries.entries()).map(([key, data]) => ({
          key,
          data,
          options
        }))
      )

      const duration = performance.now() - startTime
      performanceMonitor.recordMetric('cache_preload_duration', duration, 'ms')

      logger.info('Cache preload completed', {
        entriesCount: entries.size,
        duration
      })

    } catch (error) {
      logger.error('Cache preload failed:', error)
    }
  }

  /**
   * Warm up cache with common data
   */
  async warmUp(): Promise<void> {
    const commonQueries = [
      'popular_notes',
      'recent_categories',
      'user_preferences',
      'search_suggestions'
    ]

    for (const query of commonQueries) {
      try {
        const loader = async () => {
          // In a real implementation, this would fetch actual data
          return new Map([[query, { data: `mock_${query}` }]])
        }

        await this.preload(loader)

      } catch (error) {
        logger.error(`Failed to warm up cache for ${query}:`, error)
      }
    }
  }

  /**
   * Export cache data for backup/migration
   */
  exportData(): Array<{
    key: string
    entry: Omit<CacheEntry, 'data'> & { data: string }
  }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry: {
        ...entry,
        data: JSON.stringify(entry.data)
      }
    }))
  }

  /**
   * Import cache data from backup/migration
   */
  async importData(data: Array<{
    key: string
    entry: Omit<CacheEntry, 'data'> & { data: string }
  }>): Promise<void> {
    try {
      for (const { key, entry } of data) {
        try {
          const parsedData = JSON.parse(entry.data)
          await this.set(key, parsedData, {
            ttl: entry.ttl,
            tags: entry.tags,
            metadata: entry.metadata,
            priority: entry.priority
          })
        } catch (error) {
          logger.error(`Failed to import cache entry ${key}:`, error)
        }
      }

      logger.info('Cache data import completed', { entriesCount: data.length })

    } catch (error) {
      logger.error('Cache import failed:', error)
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const currentTime = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (currentTime - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        this.totalSize -= entry.size
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cache cleanup completed', { cleanedCount })
    }

    return cleanedCount
  }
}

// Create singleton instances for different cache types
export const searchCache = new AdvancedCache({
  maxSize: 50 * 1024 * 1024, // 50MB
  cdnConfig: {
    enabled: true,
    provider: 'vercel',
    edgeTTL: 300, // 5 minutes
    browserTTL: 600, // 10 minutes
    revalidateAfter: 3600 // 1 hour
  },
  writeThrough: true
})

export const apiCache = new AdvancedCache({
  maxSize: 20 * 1024 * 1024, // 20MB
  ttl: 10 * 60 * 1000 // 10 minutes
})

export const imageCache = new AdvancedCache({
  maxSize: 100 * 1024 * 1024, // 100MB
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  cdnConfig: {
    enabled: true,
    provider: 'cloudflare',
    edgeTTL: 86400, // 24 hours
    browserTTL: 86400
  }
})

export default AdvancedCache