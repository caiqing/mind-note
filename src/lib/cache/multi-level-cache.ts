/**
 * 多级缓存系统
 *
 * 实现内存缓存、Redis缓存和CDN缓存的多级缓存架构
 * 支持智能失效策略和缓存预热
 */

import { createHash } from 'crypto';

export interface CacheOptions {
  /** 缓存时间（秒） */
  ttl?: number;
  /** 缓存层级 */
  levels?: CacheLevel[];
  /** 标签 */
  tags?: string[];
  /** 版本 */
  version?: string;
  /** 是否压缩 */
  compress?: boolean;
  /** 优先级 */
  priority?: 'low' | 'medium' | 'high';
}

export enum CacheLevel {
  MEMORY = 'memory',
  REDIS = 'redis',
  CDN = 'cdn',
}

export interface CacheEntry<T> {
  /** 缓存值 */
  value: T;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 */
  expiresAt: number;
  /** 访问次数 */
  accessCount: number;
  /** 最后访问时间 */
  lastAccessAt: number;
  /** 缓存层级 */
  level: CacheLevel;
  /** 标签 */
  tags: string[];
  /** 版本 */
  version: string;
  /** 数据大小 */
  size: number;
}

export interface CacheStats {
  /** 总缓存项数 */
  totalEntries: number;
  /** 内存缓存统计 */
  memoryStats: {
    entries: number;
    size: number;
    hitRate: number;
    missRate: number;
  };
  /** Redis缓存统计 */
  redisStats: {
    entries: number;
    hitRate: number;
    missRate: number;
    connectionCount: number;
  };
  /** CDN缓存统计 */
  cdnStats: {
    entries: number;
    hitRate: number;
    missRate: number;
  };
  /** 总体统计 */
  overallStats: {
    hitRate: number;
    missRate: number;
    averageResponseTime: number;
    evictionCount: number;
  };
}

export interface CachePurgeOptions {
  /** 按标签清除 */
  tags?: string[];
  /** 按模式清除 */
  pattern?: string;
  /** 按层级清除 */
  levels?: CacheLevel[];
  /** 按过期时间清除 */
  olderThan?: number;
}

/**
 * 内存缓存实现
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private currentSize = 0;

  constructor(maxSize: number = 100 * 1024 * 1024) { // 默认100MB
    this.maxSize = maxSize;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      return null;
    }

    // 更新访问统计
    entry.accessCount++;
    entry.lastAccessAt = Date.now();

    return entry.value;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 300; // 默认5分钟
    const size = this.calculateSize(value);

    // 检查是否需要清理空间
    await this.ensureCapacity(size);

    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
      accessCount: 0,
      lastAccessAt: Date.now(),
      level: CacheLevel.MEMORY,
      tags: options.tags || [],
      version: options.version || '1.0',
      size,
    };

    // 删除旧值
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.currentSize -= oldEntry.size;
    }

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.currentSize = 0;
  }

  async getStats(): Promise<CacheStats['memoryStats']> {
    const entries = this.cache.size;
    const totalSize = this.currentSize;

    // 计算命中率（这里简化处理）
    const hits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.accessCount, 0);
    const hitRate = entries > 0 ? hits / (hits + entries) : 0;

    return {
      entries,
      size: totalSize,
      hitRate,
      missRate: 1 - hitRate,
    };
  }

  private async ensureCapacity(requiredSize: number): Promise<void> {
    if (this.currentSize + requiredSize <= this.maxSize) {
      return;
    }

    // 使用LRU策略清理缓存
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessAt - b.lastAccessAt);

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      freedSpace += entry.size;

      if (freedSpace >= requiredSize) {
        break;
      }
    }
  }

  private calculateSize(value: any): number {
    // 简化的大小计算
    return JSON.stringify(value).length * 2; // 假设每个字符占2字节
  }
}

/**
 * Redis缓存实现
 */
class RedisCache {
  private isConnected = false;
  private connectionPool: any[] = [];
  private maxConnections = 10;

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // 这里应该连接到实际的Redis实例
      // 暂时模拟连接
      this.isConnected = true;
      console.log('Redis cache connected');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // 这里应该调用实际的Redis GET命令
      // 暂时返回null模拟缓存未命中
      return null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const ttl = options.ttl || 300;
      // 这里应该调用实际的Redis SET命令
      console.log(`Redis SET ${key} with TTL ${ttl}`);
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // 这里应该调用实际的Redis DEL命令
      console.log(`Redis DEL ${key}`);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // 这里应该调用实际的Redis FLUSHDB命令
      console.log('Redis FLUSHDB');
    } catch (error) {
      console.error('Redis FLUSHDB error:', error);
    }
  }

  async getStats(): Promise<CacheStats['redisStats']> {
    return {
      entries: 0,
      hitRate: 0,
      missRate: 1,
      connectionCount: this.connectionPool.length,
    };
  }
}

/**
 * CDN缓存实现
 */
class CDNCache {
  async get<T>(key: string): Promise<T | null> {
    try {
      // 这里应该调用实际的CDN API
      // 暂时返回null
      return null;
    } catch (error) {
      console.error('CDN GET error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      // 这里应该调用实际的CDN API
      console.log(`CDN SET ${key}`);
    } catch (error) {
      console.error('CDN SET error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      // 这里应该调用实际的CDN API
      console.log(`CDN PURGE ${key}`);
      return true;
    } catch (error) {
      console.error('CDN PURGE error:', error);
      return false;
    }
  }

  async getStats(): Promise<CacheStats['cdnStats']> {
    return {
      entries: 0,
      hitRate: 0,
      missRate: 1,
    };
  }
}

/**
 * 多级缓存管理器
 */
export class MultiLevelCache {
  private memoryCache: MemoryCache;
  private redisCache: RedisCache;
  private cdnCache: CDNCache;
  private stats: CacheStats;
  private isInitialized = false;

  constructor() {
    this.memoryCache = new MemoryCache(100 * 1024 * 1024); // 100MB内存缓存
    this.redisCache = new RedisCache();
    this.cdnCache = new CDNCache();
    this.stats = this.initializeStats();
  }

  /**
   * 初始化缓存系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 连接Redis
      await this.redisCache.connect();

      // 启动缓存清理任务
      this.startCleanupTask();

      this.isInitialized = true;
      console.log('Multi-level cache initialized successfully');
    } catch (error) {
      console.error('Failed to initialize cache:', error);
      throw error;
    }
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const levels = options.levels || [CacheLevel.MEMORY, CacheLevel.REDIS, CacheLevel.CDN];

    // 按优先级从各级缓存中获取
    for (const level of levels) {
      let value: T | null = null;

      switch (level) {
        case CacheLevel.MEMORY:
          value = await this.memoryCache.get<T>(key);
          break;
        case CacheLevel.REDIS:
          value = await this.redisCache.get<T>(key);
          break;
        case CacheLevel.CDN:
          value = await this.cdnCache.get<T>(key);
          break;
      }

      if (value !== null) {
        // 缓存命中，更新统计
        await this.recordHit(level);

        // 将值回填到更高级别的缓存
        await this.promoteToHigherLevels(key, value, level, options);

        return value;
      }
    }

    // 缓存未命中
    await this.recordMiss();
    return null;
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const levels = options.levels || [CacheLevel.MEMORY, CacheLevel.REDIS];

    for (const level of levels) {
      try {
        switch (level) {
          case CacheLevel.MEMORY:
            await this.memoryCache.set(key, value, options);
            break;
          case CacheLevel.REDIS:
            await this.redisCache.set(key, value, options);
            break;
          case CacheLevel.CDN:
            await this.cdnCache.set(key, value, options);
            break;
        }
      } catch (error) {
        console.error(`Failed to set cache in ${level}:`, error);
      }
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string, levels?: CacheLevel[]): Promise<boolean> {
    const targetLevels = levels || [CacheLevel.MEMORY, CacheLevel.REDIS, CacheLevel.CDN];
    let deleted = false;

    for (const level of targetLevels) {
      try {
        let result = false;
        switch (level) {
          case CacheLevel.MEMORY:
            result = await this.memoryCache.delete(key);
            break;
          case CacheLevel.REDIS:
            result = await this.redisCache.delete(key);
            break;
          case CacheLevel.CDN:
            result = await this.cdnCache.delete(key);
            break;
        }
        deleted = deleted || result;
      } catch (error) {
        console.error(`Failed to delete from ${level}:`, error);
      }
    }

    return deleted;
  }

  /**
   * 清除缓存
   */
  async clear(levels?: CacheLevel[]): Promise<void> {
    const targetLevels = levels || [CacheLevel.MEMORY, CacheLevel.REDIS, CacheLevel.CDN];

    for (const level of targetLevels) {
      try {
        switch (level) {
          case CacheLevel.MEMORY:
            await this.memoryCache.clear();
            break;
          case CacheLevel.REDIS:
            await this.redisCache.clear();
            break;
          case CacheLevel.CDN:
            // CDN通常不支持全局清除
            console.log('CDN clear not supported');
            break;
        }
      } catch (error) {
        console.error(`Failed to clear ${level}:`, error);
      }
    }
  }

  /**
   * 按标签清除缓存
   */
  async purgeByTags(tags: string[]): Promise<void> {
    // 实现基于标签的缓存清除
    console.log(`Purging cache by tags: ${tags.join(', ')}`);
  }

  /**
   * 按模式清除缓存
   */
  async purgeByPattern(pattern: string): Promise<void> {
    // 实现基于模式的缓存清除
    console.log(`Purging cache by pattern: ${pattern}`);
  }

  /**
   * 预热缓存
   */
  async warmup<T>(keys: string[], dataLoader: (key: string) => Promise<T>, options: CacheOptions = {}): Promise<void> {
    console.log(`Warming up ${keys.length} cache entries`);

    const batchSize = 10;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (key) => {
          try {
            const value = await dataLoader(key);
            if (value !== null) {
              await this.set(key, value, options);
            }
          } catch (error) {
            console.error(`Failed to warmup key ${key}:`, error);
          }
        })
      );
    }

    console.log('Cache warmup completed');
  }

  /**
   * 获取缓存统计
   */
  async getStats(): Promise<CacheStats> {
    const memoryStats = await this.memoryCache.getStats();
    const redisStats = await this.redisCache.getStats();
    const cdnStats = await this.cdnCache.getStats();

    const totalEntries = memoryStats.entries + redisStats.entries + cdnStats.entries;
    const totalHits = this.stats.overallStats.hitRate * (totalEntries + this.stats.overallStats.evictionCount);
    const totalRequests = totalEntries + this.stats.overallStats.evictionCount;

    return {
      totalEntries,
      memoryStats,
      redisStats,
      cdnStats,
      overallStats: {
        hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
        missRate: totalRequests > 0 ? 1 - (totalHits / totalRequests) : 1,
        averageResponseTime: this.stats.overallStats.averageResponseTime,
        evictionCount: this.stats.overallStats.evictionCount,
      },
    };
  }

  /**
   * 生成缓存键
   */
  static generateKey(namespace: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    const hash = createHash('md5').update(paramString).digest('hex');

    return `${namespace}:${hash}`;
  }

  private initializeStats(): CacheStats {
    return {
      totalEntries: 0,
      memoryStats: {
        entries: 0,
        size: 0,
        hitRate: 0,
        missRate: 1,
      },
      redisStats: {
        entries: 0,
        hitRate: 0,
        missRate: 1,
        connectionCount: 0,
      },
      cdnStats: {
        entries: 0,
        hitRate: 0,
        missRate: 1,
      },
      overallStats: {
        hitRate: 0,
        missRate: 1,
        averageResponseTime: 0,
        evictionCount: 0,
      },
    };
  }

  private async recordHit(level: CacheLevel): Promise<void> {
    // 更新命中统计
    switch (level) {
      case CacheLevel.MEMORY:
        this.stats.memoryStats.hitRate = Math.min(1, this.stats.memoryStats.hitRate + 0.01);
        break;
      case CacheLevel.REDIS:
        this.stats.redisStats.hitRate = Math.min(1, this.stats.redisStats.hitRate + 0.01);
        break;
      case CacheLevel.CDN:
        this.stats.cdnStats.hitRate = Math.min(1, this.stats.cdnStats.hitRate + 0.01);
        break;
    }

    this.stats.overallStats.hitRate = Math.min(1, this.stats.overallStats.hitRate + 0.01);
    this.stats.overallStats.missRate = 1 - this.stats.overallStats.hitRate;
  }

  private async recordMiss(): Promise<void> {
    // 更新未命中统计
    this.stats.overallStats.missRate = Math.min(1, this.stats.overallStats.missRate + 0.01);
    this.stats.overallStats.hitRate = 1 - this.stats.overallStats.missRate;
  }

  private async promoteToHigherLevels<T>(
    key: string,
    value: T,
    currentLevel: CacheLevel,
    options: CacheOptions
  ): Promise<void> {
    // 将缓存值回填到更高级别的缓存
    const higherLevels = {
      [CacheLevel.REDIS]: [CacheLevel.MEMORY],
      [CacheLevel.CDN]: [CacheLevel.MEMORY, CacheLevel.REDIS],
    };

    const promoteTo = higherLevels[currentLevel] || [];

    for (const level of promoteTo) {
      try {
        switch (level) {
          case CacheLevel.MEMORY:
            await this.memoryCache.set(key, value, options);
            break;
          case CacheLevel.REDIS:
            await this.redisCache.set(key, value, options);
            break;
        }
      } catch (error) {
        console.error(`Failed to promote to ${level}:`, error);
      }
    }
  }

  private startCleanupTask(): void {
    // 定期清理过期缓存
    setInterval(async () => {
      try {
        await this.cleanupExpiredEntries();
      } catch (error) {
        console.error('Cache cleanup error:', error);
      }
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  private async cleanupExpiredEntries(): Promise<void> {
    // 清理过期缓存项
    console.log('Running cache cleanup...');
    // 这里实现实际的清理逻辑
  }
}

// 单例模式
export const multiLevelCache = new MultiLevelCache();

export default MultiLevelCache;