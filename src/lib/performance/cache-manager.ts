/**
 * 缓存管理器
 *
 * 提供智能缓存、数据预加载和懒加载功能
 */

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
  metadata?: Record<string, any>;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
}

class CacheManager {
  private cache: Map<string, CacheItem> = new Map();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      defaultTTL: 5 * 60 * 1000, // 5分钟
      cleanupInterval: 60 * 1000, // 1分钟
      ...config,
    };

    this.startCleanup();
  }

  /**
   * 设置缓存项
   */
  set<T>(
    key: string,
    data: T,
    ttl?: number,
    metadata?: Record<string, any>,
  ): void {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      key,
      metadata,
    };

    this.cache.set(key, item);
  }

  /**
   * 获取缓存项
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * 获取缓存项（如果不存在则使用fetcher获取）
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl, metadata);
    return data;
  }

  /**
   * 检查缓存项是否存在且未过期
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    return item !== undefined && !this.isExpired(item);
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
    items: Array<{
      key: string;
      size: number;
      age: number;
      ttl: number;
    }>;
  } {
    const now = Date.now();
    let totalSize = 0;
    const hits = 0;
    const misses = 0;

    const items = Array.from(this.cache.values()).map(item => {
      const size = this.estimateSize(item);
      totalSize += size;
      const age = now - item.timestamp;

      return {
        key: item.key,
        size,
        age,
        ttl: item.ttl,
      };
    });

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: hits + misses > 0 ? hits / (hits + misses) : 0,
      memoryUsage: totalSize,
      items,
    };
  }

  /**
   * 预加载缓存项
   */
  async preload<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<void> {
    if (!this.has(key)) {
      try {
        const data = await fetcher();
        this.set(key, data, ttl);
      } catch (error) {
        console.warn(`Failed to preload cache key ${key}:`, error);
      }
    }
  }

  /**
   * 批量预加载
   */
  async batchPreload<T>(
    items: Array<{
      key: string;
      fetcher: () => Promise<T>;
      ttl?: number;
    }>,
  ): Promise<void> {
    const promises = items.map(item =>
      this.preload(item.key, item.fetcher, item.ttl),
    );

    await Promise.allSettled(promises);
  }

  /**
   * 懒加载工厂函数
   */
  createLazyLoader<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): () => Promise<T> {
    return async () => {
      return this.getOrFetch(key, fetcher, ttl);
    };
  }

  /**
   * 内存缓存装饰器
   */
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttl?: number,
  ): T {
    const memoized = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const key = keyGenerator
        ? keyGenerator(...args)
        : `${fn.name}_${JSON.stringify(args)}`;

      return this.getOrFetch(key, () => fn(...args), ttl);
    };

    return memoized as T;
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * 删除最旧的缓存项
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 估算缓存项大小（字节）
   */
  private estimateSize(item: CacheItem): number {
    try {
      return JSON.stringify(item).length * 2; // 粗略估算
    } catch {
      return 1024; // 默认1KB
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 清理过期缓存项
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));

    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} expired cache items`);
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// 创建全局缓存实例
const globalCacheManager = globalThis as unknown as {
  cacheManager: CacheManager | undefined;
};

export const cacheManager =
  globalCacheManager.cacheManager ?? new CacheManager();

if (typeof window !== 'undefined') {
  globalCacheManager.cacheManager = cacheManager;
}

// 预定义的缓存配置
export const CacheConfigs = {
  // API响应缓存
  API_RESPONSE: {
    maxSize: 50,
    defaultTTL: 2 * 60 * 1000, // 2分钟
    cleanupInterval: 30 * 1000, // 30秒
  },

  // 用户数据缓存
  USER_DATA: {
    maxSize: 20,
    defaultTTL: 10 * 60 * 1000, // 10分钟
    cleanupInterval: 60 * 1000, // 1分钟
  },

  // 静态资源缓存
  STATIC_ASSETS: {
    maxSize: 100,
    defaultTTL: 60 * 60 * 1000, // 1小时
    cleanupInterval: 10 * 60 * 1000, // 10分钟
  },

  // 搜索结果缓存
  SEARCH_RESULTS: {
    maxSize: 30,
    defaultTTL: 5 * 60 * 1000, // 5分钟
    cleanupInterval: 60 * 1000, // 1分钟
  },
};

// 创建专用的缓存实例
export const apiCache = new CacheManager(CacheConfigs.API_RESPONSE);
export const userCache = new CacheManager(CacheConfigs.USER_DATA);
export const assetCache = new CacheManager(CacheConfigs.STATIC_ASSETS);
export const searchCache = new CacheManager(CacheConfigs.SEARCH_RESULTS);

export default cacheManager;
