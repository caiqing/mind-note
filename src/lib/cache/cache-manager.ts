/**
 * 缓存管理器
 */

interface CacheOptions {
  ttl?: number; // 生存时间（毫秒）
  maxSize?: number; // 最大缓存项数
  strategy?: 'lru' | 'fifo' | 'lfu'; // 缓存策略
}

interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccessed: number;
}

export class CacheManager<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private maxSize: number;
  private strategy: 'lru' | 'fifo' | 'lfu';
  private defaultTtl: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.strategy = options.strategy || 'lru';
    this.defaultTtl = options.ttl || 5 * 60 * 1000; // 默认5分钟
  }

  /**
   * 设置缓存项
   */
  set(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTtl;
    const now = Date.now();

    // 如果缓存已满，先清理过期项或使用策略清理
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    const cacheItem: CacheItem<T> = {
      value,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(key, cacheItem);
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = Date.now();

    return item.value;
  }

  /**
   * 检查缓存项是否存在且未过期
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (this.isExpired(item)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存键列表
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 清理过期项
   */
  cleanup(): number {
    let removedCount = 0;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalAccessCount = 0;
    let oldestItem = now;
    let newestItem = 0;

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        expiredCount++;
      }

      totalAccessCount += item.accessCount;
      oldestItem = Math.min(oldestItem, item.timestamp);
      newestItem = Math.max(newestItem, item.timestamp);
    }

    return {
      totalSize: this.cache.size,
      expiredCount,
      validCount: this.cache.size - expiredCount,
      totalAccessCount,
      averageAccessCount:
        this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
      oldestItem: oldestItem === now ? null : new Date(oldestItem),
      newestItem: newestItem > 0 ? new Date(newestItem) : null,
      maxSize: this.maxSize,
      utilizationRate: this.cache.size / this.maxSize,
    };
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(item: CacheItem<T>): boolean {
    if (!item.ttl) {
      return false;
    }
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * 根据策略淘汰缓存项
   */
  private evict(): void {
    // 先清理过期项
    const removedExpired = this.cleanup();
    if (removedExpired > 0) {
      return;
    }

    // 如果没有过期项，根据策略淘汰
    let keyToEvict: string | null = null;

    switch (this.strategy) {
    case 'lru':
      keyToEvict = this.findLRUKey();
      break;
    case 'fifo':
      keyToEvict = this.findFIFOKey();
      break;
    case 'lfu':
      keyToEvict = this.findLFUKey();
      break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
    }
  }

  /**
   * 找到最近最少使用的键
   */
  private findLRUKey(): string | null {
    let lruKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestAccess) {
        oldestAccess = item.lastAccessed;
        lruKey = key;
      }
    }

    return lruKey;
  }

  /**
   * 找到先进先出的键
   */
  private findFIFOKey(): string | null {
    let fifoKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        fifoKey = key;
      }
    }

    return fifoKey;
  }

  /**
   * 找到最少使用的键
   */
  private findLFUKey(): string | null {
    let lfuKey: string | null = null;
    let minAccessCount = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < minAccessCount) {
        minAccessCount = item.accessCount;
        lfuKey = key;
      }
    }

    return lfuKey;
  }
}

// 全局缓存实例
export const globalCache = new CacheManager({
  maxSize: 10000,
  ttl: 10 * 60 * 1000, // 10分钟
  strategy: 'lru',
});

// 专用缓存实例
export const searchCache = new CacheManager({
  maxSize: 1000,
  ttl: 5 * 60 * 1000, // 5分钟
  strategy: 'lru',
});

export const analyticsCache = new CacheManager({
  maxSize: 100,
  ttl: 30 * 60 * 1000, // 30分钟
  strategy: 'lfu',
});

export const aiResultCache = new CacheManager({
  maxSize: 500,
  ttl: 60 * 60 * 1000, // 1小时
  strategy: 'lru',
});
