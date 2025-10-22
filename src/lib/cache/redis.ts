import Redis from 'ioredis'
import logger from '@/lib/utils/logger'

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
}

// Create Redis client
export const redis = new Redis(redisConfig)

// Redis connection event handlers
redis.on('connect', () => {
  logger.info('Redis connected successfully')
})

redis.on('error', (error) => {
  logger.error('Redis connection error:', error)
})

redis.on('close', () => {
  logger.warn('Redis connection closed')
})

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...')
})

// Redis cache service class
export class CacheService {
  private redis: Redis

  constructor() {
    this.redis = redis
  }

  // Get value from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  // Set value in cache with TTL
  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value)
      if (ttl > 0) {
        await this.redis.setex(key, ttl, serializedValue)
      } else {
        await this.redis.set(key, serializedValue)
      }
      return true
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error)
      return false
    }
  }

  // Delete key from cache
  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key)
      return result > 0
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error)
      return false
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch (error) {
      logger.error('Cache health check failed:', error)
      return false
    }
  }
}

// Singleton instance
export const cacheService = new CacheService()

export default cacheService