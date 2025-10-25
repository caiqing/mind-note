/**
 * Search Cache Service
 *
 * Provides caching mechanisms for search results and performance optimization
 */

import logger from '@/lib/utils/logger'

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

export interface CacheStats {
  totalEntries: number
  hitRate: number
  missRate: number
  evictionCount: number
  memoryUsage: number
}

export interface SearchCacheOptions {
  maxSize?: number
  defaultTTL?: number
  enableMetrics?: boolean
}

class SearchCache {
  private cache = new Map<string, CacheEntry>()
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  }
  private options: Required<SearchCacheOptions>

  constructor(options: SearchCacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5 minutes
      enableMetrics: options.enableMetrics || true
    }
  }

  /**
   * Generate cache key for search queries
   */
  private generateKey(query: string, filters: Record<string, any> = {}, options: Record<string, any> = {}): string {
    const keyData = {
      query: query.toLowerCase().trim(),
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      options: Object.keys(options).length > 0 ? options : undefined
    }
    return btoa(JSON.stringify(keyData))
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl?: number): void {
    try {
      // Check cache size limit
      if (this.cache.size >= this.options.maxSize) {
        this.evictOldest()
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.options.defaultTTL,
        hits: 0
      }

      this.cache.set(key, entry)

    } catch (error) {
      logger.error('Failed to set cache entry:', error)
    }
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key)

      if (!entry) {
        if (this.options.enableMetrics) {
          this.stats.misses++
        }
        return null
      }

      // Check if entry has expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        if (this.options.enableMetrics) {
          this.stats.misses++
        }
        return null
      }

      // Update hit count
      entry.hits++
      if (this.options.enableMetrics) {
        this.stats.hits++
      }

      return entry.data as T

    } catch (error) {
      logger.error('Failed to get cache entry:', error)
      return null
    }
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    }
  }

  /**
   * Evict oldest entries
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const currentTime = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (currentTime - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0
    const missRate = totalRequests > 0 ? this.stats.misses / totalRequests : 0

    // Estimate memory usage (rough calculation)
    let memoryUsage = 0
    for (const [key, entry] of this.cache.entries()) {
      memoryUsage += key.length * 2 // UTF-16 characters
      memoryUsage += JSON.stringify(entry.data).length * 2
      memoryUsage += 64 // Approximate overhead
    }

    return {
      totalEntries: this.cache.size,
      hitRate,
      missRate,
      evictionCount: this.stats.evictions,
      memoryUsage
    }
  }

  /**
   * Cache search results
   */
  cacheSearchResults(
    query: string,
    results: any[],
    filters: Record<string, any> = {},
    options: Record<string, any> = {},
    ttl?: number
  ): void {
    const key = this.generateKey(query, filters, options)
    this.set(key, results, ttl)
  }

  /**
   * Get cached search results
   */
  getCachedSearchResults(
    query: string,
    filters: Record<string, any> = {},
    options: Record<string, any> = {}
  ): any[] | null {
    const key = this.generateKey(query, filters, options)
    return this.get<any[]>(key)
  }

  /**
   * Cache suggestions
   */
  cacheSuggestions(query: string, suggestions: string[], ttl?: number): void {
    const key = `suggestions:${query.toLowerCase().trim()}`
    this.set(key, suggestions, ttl || 2 * 60 * 1000) // 2 minutes default
  }

  /**
   * Get cached suggestions
   */
  getCachedSuggestions(query: string): string[] | null {
    const key = `suggestions:${query.toLowerCase().trim()}`
    return this.get<string[]>(key)
  }

  /**
   * Cache embeddings
   */
  cacheEmbedding(text: string, embedding: number[], ttl?: number): void {
    const key = `embedding:${btoa(text.toLowerCase().trim())}`
    this.set(key, embedding, ttl || 24 * 60 * 60 * 1000) // 24 hours default
  }

  /**
   * Get cached embedding
   */
  getCachedEmbedding(text: string): number[] | null {
    const key = `embedding:${btoa(text.toLowerCase().trim())}`
    return this.get<number[]>(key)
  }
}

// Create singleton instances
const searchCache = new SearchCache({
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  enableMetrics: true
})

const suggestionCache = new SearchCache({
  maxSize: 200,
  defaultTTL: 2 * 60 * 1000, // 2 minutes
  enableMetrics: true
})

const embeddingCache = new SearchCache({
  maxSize: 1000,
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  enableMetrics: true
})

/**
 * Cache search results with automatic key generation
 */
export function cacheSearchResults(
  query: string,
  results: any[],
  filters: Record<string, any> = {},
  options: Record<string, any> = {},
  ttl?: number
): void {
  searchCache.cacheSearchResults(query, results, filters, options, ttl)
}

/**
 * Get cached search results
 */
export function getCachedSearchResults(
  query: string,
  filters: Record<string, any> = {},
  options: Record<string, any> = {}
): any[] | null {
  return searchCache.getCachedSearchResults(query, filters, options)
}

/**
 * Cache search suggestions
 */
export function cacheSuggestions(query: string, suggestions: string[], ttl?: number): void {
  suggestionCache.cacheSuggestions(query, suggestions, ttl)
}

/**
 * Get cached search suggestions
 */
export function getCachedSuggestions(query: string): string[] | null {
  return suggestionCache.getCachedSuggestions(query)
}

/**
 * Cache text embeddings
 */
export function cacheEmbedding(text: string, embedding: number[], ttl?: number): void {
  embeddingCache.cacheEmbedding(text, embedding, ttl)
}

/**
 * Get cached text embedding
 */
export function getCachedEmbedding(text: string): number[] | null {
  return embeddingCache.getCachedEmbedding(text)
}

/**
 * Get comprehensive cache statistics
 */
export function getCacheStats(): {
  search: CacheStats
  suggestions: CacheStats
  embeddings: CacheStats
} {
  return {
    search: searchCache.getStats(),
    suggestions: suggestionCache.getStats(),
    embeddings: embeddingCache.getStats()
  }
}

/**
 * Clean up expired entries across all caches
 */
export function cleanupCaches(): {
  search: number
  suggestions: number
  embeddings: number
} {
  return {
    search: searchCache.cleanup(),
    suggestions: suggestionCache.cleanup(),
    embeddings: embeddingCache.cleanup()
  }
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  searchCache.clear()
  suggestionCache.clear()
  embeddingCache.clear()
}

/**
 * Performance monitoring for search operations
 */
export class SearchPerformanceMonitor {
  private metrics = new Map<string, number[]>()

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    const values = this.metrics.get(name)!
    values.push(value)

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift()
    }
  }

  getMetricStats(name: string): {
    count: number
    average: number
    min: number
    max: number
    p50: number
    p95: number
  } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null

    const sorted = [...values].sort((a, b) => a - b)
    const count = sorted.length
    const sum = sorted.reduce((a, b) => a + b, 0)

    return {
      count,
      average: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)]
    }
  }

  getAllMetrics(): Record<string, ReturnType<typeof this.getMetricStats>> {
    const result: Record<string, ReturnType<typeof this.getMetricStats>> = {}
    for (const name of this.metrics.keys()) {
      result[name] = this.getMetricStats(name)
    }
    return result
  }
}

// Create singleton performance monitor
const performanceMonitor = new SearchPerformanceMonitor()

export { performanceMonitor }

export default {
  cacheSearchResults,
  getCachedSearchResults,
  cacheSuggestions,
  getCachedSuggestions,
  cacheEmbedding,
  getCachedEmbedding,
  getCacheStats,
  cleanupCaches,
  clearAllCaches,
  performanceMonitor
}