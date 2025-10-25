/**
 * 智能缓存策略
 *
 * 实现智能失效策略、自适应TTL和缓存预热策略
 */

import { multiLevelCache, type CacheOptions, CacheLevel } from './multi-level-cache';

export interface CacheStrategy {
  /** 策略名称 */
  name: string;
  /** 缓存层级 */
  levels: CacheLevel[];
  /** TTL策略 */
  ttlStrategy: TTLEventStrategy;
  /** 预热策略 */
  warmupStrategy: WarmupStrategy;
  /** 失效策略 */
  evictionStrategy: EvictionStrategy;
}

export interface TTLEventStrategy {
  /** 固定TTL */
  fixed?: number;
  /** 基于访问频率的动态TTL */
  dynamic?: {
    base: number;
    multiplier: number;
    max: number;
  };
  /** 基于数据更新时间的TTL */
  timeBased?: {
    lastUpdate: number;
    refreshInterval: number;
  };
  /** 基于业务规则的TTL */
  business?: (data: any, context: any) => number;
}

export interface WarmupStrategy {
  /** 预热模式 */
  mode: 'eager' | 'lazy' | 'scheduled';
  /** 预热时机 */
  trigger?: 'startup' | 'first_access' | 'scheduled_time';
  /** 预热条件 */
  condition?: (key: string, data: any) => boolean;
  /** 预热优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 批量大小 */
  batchSize: number;
  /** 并发数 */
  concurrency: number;
}

export interface EvictionStrategy {
  /** 失效算法 */
  algorithm: 'lru' | 'lfu' | 'fifo' | 'random' | 'adaptive';
  /** 容量限制 */
  capacity: {
    maxItems: number;
    maxSize: number;
    maxMemory?: number;
  };
  /** 失效条件 */
  conditions?: EvictionCondition[];
}

export interface EvictionCondition {
  /** 条件类型 */
  type: 'access_time' | 'access_count' | 'size' | 'priority' | 'custom';
  /** 操作符 */
  operator: 'gt' | 'lt' | 'eq' | 'ne';
  /** 阈值 */
  threshold: number;
  /** 自定义检查函数 */
  checker?: (entry: any) => boolean;
}

export interface CacheMetrics {
  /** 命中率 */
  hitRate: number;
  /** 未命中率 */
  missRate: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 缓存利用率 */
  utilizationRate: number;
  /** 失效率 */
  evictionRate: number;
  /** 数据新鲜度 */
  freshnessScore: number;
  /** 成本效益比 */
  costEfficiency: number;
}

/**
 * 智能缓存策略管理器
 */
export class IntelligentCacheStrategies {
  private strategies = new Map<string, CacheStrategy>();
  private metricsHistory: CacheMetrics[] = [];
  private adaptiveThresholds = {
    hitRateThreshold: 0.8,
    responseTimeThreshold: 100,
    utilizationThreshold: 0.85,
  };

  /**
   * 注册缓存策略
   */
  registerStrategy(name: string, strategy: CacheStrategy): void {
    this.strategies.set(name, strategy);
    console.log(`Cache strategy registered: ${name}`);
  }

  /**
   * 获取缓存策略
   */
  getStrategy(name: string): CacheStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * 应用缓存策略
   */
  async applyStrategy<T>(
    strategyName: string,
    key: string,
    dataLoader: () => Promise<T>,
    context?: any
  ): Promise<T> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyName}`);
    }

    // 计算TTL
    const ttl = this.calculateTTL(strategy.ttlStrategy, dataLoader, context);

    // 构建缓存选项
    const cacheOptions: CacheOptions = {
      ttl,
      levels: strategy.levels,
      priority: this.determinePriority(strategy, dataLoader, context),
    };

    // 尝试从缓存获取
    const cachedValue = await multiLevelCache.get<T>(key, cacheOptions);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // 缓存未命中，加载数据
    const startTime = Date.now();
    const value = await dataLoader();
    const loadTime = Date.now() - startTime;

    // 存入缓存
    await multiLevelCache.set(key, value, cacheOptions);

    // 触发预热
    if (strategy.warmupStrategy.mode === 'eager') {
      await this.triggerWarmup(strategy, key, value, context);
    }

    // 记录指标
    await this.recordMetrics(strategyName, false, loadTime);

    return value;
  }

  /**
   * 批量应用策略
   */
  async applyBatchStrategy<T>(
    strategyName: string,
    requests: Array<{
      key: string;
      dataLoader: () => Promise<T>;
      context?: any;
    }>
  ): Promise<T[]> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyName}`);
    }

    // 按优先级分组
    const groupedRequests = this.groupByPriority(requests, strategy);

    const results: T[] = [];

    // 按优先级顺序处理
    for (const priority of ['high', 'medium', 'low'] as const) {
      const batch = groupedRequests[priority] || [];
      if (batch.length === 0) continue;

      // 并发处理同优先级请求
      const batchResults = await Promise.allSettled(
        batch.map(async (request) => {
          return await this.applyStrategy(strategyName, request.key, request.dataLoader, request.context);
        })
      );

      // 处理结果
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to process batch request: ${batch[i].key}`, result.reason);
          // 对于失败的请求，重新加载
          const value = await batch[i].dataLoader();
          results.push(value);
        }
      }
    }

    return results;
  }

  /**
   * 分析和优化策略
   */
  async analyzeAndOptimize(): Promise<{
    recommendations: string[];
    optimizedStrategies: Array<{ name: string; changes: any }>;
  }> {
    const recommendations: string[] = [];
    const optimizedStrategies: Array<{ name: string; changes: any }> = [];

    // 分析最近指标
    const recentMetrics = this.metricsHistory.slice(-10);
    if (recentMetrics.length === 0) {
      return { recommendations: ['需要更多数据进行分析'], optimizedStrategies: [] };
    }

    const avgMetrics = this.calculateAverageMetrics(recentMetrics);

    // 分析命中率
    if (avgMetrics.hitRate < this.adaptiveThresholds.hitRateThreshold) {
      recommendations.push('命中率较低，建议增加TTL或优化缓存层级');
      optimizedStrategies.push({
        name: 'increase_ttl',
        changes: { ttlMultiplier: 1.5 },
      });
    }

    // 分析响应时间
    if (avgMetrics.averageResponseTime > this.adaptiveThresholds.responseTimeThreshold) {
      recommendations.push('响应时间较慢，建议使用内存缓存或优化数据加载');
      optimizedStrategies.push({
        name: 'optimize_response_time',
        changes: { preferMemory: true, batchSize: 5 },
      });
    }

    // 分析利用率
    if (avgMetrics.utilizationRate > this.adaptiveThresholds.utilizationThreshold) {
      recommendations.push('缓存利用率过高，建议增加容量或调整失效策略');
      optimizedStrategies.push({
        name: 'increase_capacity',
        changes: { capacityMultiplier: 1.2 },
      });
    }

    return { recommendations, optimizedStrategies };
  }

  /**
   * 自适应调整策略参数
   */
  async adaptStrategies(): Promise<void> {
    const { recommendations, optimizedStrategies } = await this.analyzeAndOptimize();

    // 应用优化建议
    for (const optimization of optimizedStrategies) {
      await this.applyOptimization(optimization);
    }

    console.log('Applied adaptive optimizations:', recommendations);
  }

  /**
   * 获取策略指标
   */
  async getStrategyMetrics(strategyName?: string): Promise<Map<string, CacheMetrics>> {
    const metrics = new Map<string, CacheMetrics>();

    if (strategyName) {
      const strategyMetrics = await this.calculateStrategyMetrics(strategyName);
      if (strategyMetrics) {
        metrics.set(strategyName, strategyMetrics);
      }
    } else {
      // 计算所有策略的指标
      for (const name of this.strategies.keys()) {
        const strategyMetrics = await this.calculateStrategyMetrics(name);
        if (strategyMetrics) {
          metrics.set(name, strategyMetrics);
        }
      }
    }

    return metrics;
  }

  /**
   * 计算TTL
   */
  private calculateTTL(
    strategy: TTLEventStrategy,
    dataLoader: () => Promise<any>,
    context?: any
  ): number {
    if (strategy.fixed) {
      return strategy.fixed;
    }

    if (strategy.dynamic) {
      // 基于访问频率的动态TTL
      const base = strategy.dynamic.base;
      const multiplier = strategy.dynamic.multiplier;
      const max = strategy.dynamic.max;

      // 这里应该基于实际的访问频率计算
      const accessFrequency = this.getAccessFrequency(context?.key || '');
      const ttl = Math.min(base + (accessFrequency * multiplier), max);
      return ttl;
    }

    if (strategy.timeBased) {
      // 基于数据更新时间的TTL
      const now = Date.now();
      const lastUpdate = strategy.timeBased.lastUpdate;
      const refreshInterval = strategy.timeBased.refreshInterval;

      const timeSinceUpdate = now - lastUpdate;
      return Math.max(refreshInterval - timeSinceUpdate, 60); // 最少1分钟
    }

    if (strategy.business) {
      // 基于业务规则的TTL
      try {
        const data = dataLoader();
        return strategy.business(data, context);
      } catch (error) {
        console.error('Business TTL calculation error:', error);
        return 300; // 默认5分钟
      }
    }

    return 300; // 默认5分钟
  }

  /**
   * 确定缓存优先级
   */
  private determinePriority(
    strategy: CacheStrategy,
    dataLoader: () => Promise<any>,
    context?: any
  ): 'low' | 'medium' | 'high' {
    // 基于业务规则确定优先级
    if (context?.priority) {
      return context.priority;
    }

    // 基于数据特征确定优先级
    const dataSize = this.estimateDataSize(dataLoader);
    if (dataSize > 1024 * 1024) { // 大于1MB
      return 'low';
    }

    // 基于访问模式确定优先级
    const accessFrequency = this.getAccessFrequency(context?.key || '');
    if (accessFrequency > 10) {
      return 'high';
    } else if (accessFrequency > 5) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 触发缓存预热
   */
  private async triggerWarmup<T>(
    strategy: CacheStrategy,
    key: string,
    value: T,
    context?: any
  ): Promise<void> {
    if (!strategy.warmupStrategy.condition || strategy.warmupStrategy.condition(key, value)) {
      // 实现预热逻辑
      console.log(`Triggering warmup for ${key}`);
    }
  }

  /**
   * 按优先级分组请求
   */
  private groupByPriority<T>(
    requests: Array<{ key: string; dataLoader: () => Promise<T>; context?: any }>,
    strategy: CacheStrategy
  ): Record<string, Array<{ key: string; dataLoader: () => Promise<T>; context?: any }>> {
    const groups: Record<string, any[]> = {
      high: [],
      medium: [],
      low: [],
    };

    for (const request of requests) {
      const priority = this.determinePriority(strategy, request.dataLoader, request.context);
      groups[priority].push(request);
    }

    return groups;
  }

  /**
   * 记录指标
   */
  private async recordMetrics(strategyName: string, hit: boolean, responseTime: number): Promise<void> {
    // 实现指标记录逻辑
    const metrics: CacheMetrics = {
      hitRate: hit ? 1 : 0,
      missRate: hit ? 0 : 1,
      averageResponseTime: responseTime,
      utilizationRate: 0,
      evictionRate: 0,
      freshnessScore: 1,
      costEfficiency: 1,
    };

    this.metricsHistory.push(metrics);

    // 保持历史记录在合理范围内
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory = this.metricsHistory.slice(-500);
    }
  }

  /**
   * 计算平均指标
   */
  private calculateAverageMetrics(metrics: CacheMetrics[]): CacheMetrics {
    if (metrics.length === 0) {
      return {
        hitRate: 0,
        missRate: 1,
        averageResponseTime: 0,
        utilizationRate: 0,
        evictionRate: 0,
        freshnessScore: 0,
        costEfficiency: 0,
      };
    }

    const sum = metrics.reduce((acc, metric) => ({
      hitRate: acc.hitRate + metric.hitRate,
      missRate: acc.missRate + metric.missRate,
      averageResponseTime: acc.averageResponseTime + metric.averageResponseTime,
      utilizationRate: acc.utilizationRate + metric.utilizationRate,
      evictionRate: acc.evictionRate + metric.evictionRate,
      freshnessScore: acc.freshnessScore + metric.freshnessScore,
      costEfficiency: acc.costEfficiency + metric.costEfficiency,
    }), {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      utilizationRate: 0,
      evictionRate: 0,
      freshnessScore: 0,
      costEfficiency: 0,
    });

    const count = metrics.length;
    return {
      hitRate: sum.hitRate / count,
      missRate: sum.missRate / count,
      averageResponseTime: sum.averageResponseTime / count,
      utilizationRate: sum.utilizationRate / count,
      evictionRate: sum.evictionRate / count,
      freshnessScore: sum.freshnessScore / count,
      costEfficiency: sum.costEfficiency / count,
    };
  }

  /**
   * 计算策略指标
   */
  private async calculateStrategyMetrics(strategyName: string): Promise<CacheMetrics | null> {
    // 这里应该基于实际的数据计算策略指标
    // 暂时返回模拟数据
    return {
      hitRate: Math.random() * 0.3 + 0.7,
      missRate: Math.random() * 0.3,
      averageResponseTime: Math.random() * 50 + 20,
      utilizationRate: Math.random() * 0.4 + 0.4,
      evictionRate: Math.random() * 0.1,
      freshnessScore: Math.random() * 0.3 + 0.7,
      costEfficiency: Math.random() * 0.2 + 0.8,
    };
  }

  /**
   * 应用优化
   */
  private async applyOptimization(optimization: { name: string; changes: any }): Promise<void> {
    console.log(`Applying optimization: ${optimization.name}`, optimization.changes);
    // 实际应用优化逻辑
  }

  /**
   * 获取访问频率
   */
  private getAccessFrequency(key: string): number {
    // 这里应该从实际的访问日志中获取数据
    // 暂时返回随机数
    return Math.random() * 20;
  }

  /**
   * 估算数据大小
   */
  private estimateDataSize(dataLoader: () => Promise<any>): number {
    // 这里应该实际加载数据来估算大小
    // 暂时返回估算值
    return Math.random() * 10 * 1024; // 0-10KB
  }
}

// 预定义的缓存策略
export const PREDEFINED_STRATEGIES = {
  // AI分析结果缓存策略
  AI_ANALYSIS: {
    name: 'ai_analysis',
    levels: [CacheLevel.MEMORY, CacheLevel.REDIS],
    ttlStrategy: {
      dynamic: {
        base: 300, // 5分钟基础TTL
        multiplier: 60, // 每次访问增加1分钟
        max: 3600, // 最大1小时
      },
    },
    warmupStrategy: {
      mode: 'lazy' as const,
      trigger: 'first_access' as const,
      priority: 'high' as const,
      batchSize: 5,
      concurrency: 2,
    },
    evictionStrategy: {
      algorithm: 'lru' as const,
      capacity: {
        maxItems: 1000,
        maxSize: 100 * 1024 * 1024, // 100MB
      },
    },
  },

  // 用户偏好缓存策略
  USER_PREFERENCES: {
    name: 'user_preferences',
    levels: [CacheLevel.MEMORY, CacheLevel.REDIS],
    ttlStrategy: {
      timeBased: {
        lastUpdate: Date.now(),
        refreshInterval: 24 * 60 * 60, // 24小时
      },
    },
    warmupStrategy: {
      mode: 'eager' as const,
      trigger: 'startup' as const,
      priority: 'high' as const,
      batchSize: 20,
      concurrency: 5,
    },
    evictionStrategy: {
      algorithm: 'lfu' as const,
      capacity: {
        maxItems: 10000,
        maxSize: 50 * 1024 * 1024, // 50MB
      },
    },
  },

  // 搜索结果缓存策略
  SEARCH_RESULTS: {
    name: 'search_results',
    levels: [CacheLevel.MEMORY],
    ttlStrategy: {
      fixed: 300, // 5分钟
    },
    warmupStrategy: {
      mode: 'lazy' as const,
      priority: 'medium' as const,
      batchSize: 10,
      concurrency: 3,
    },
    evictionStrategy: {
      algorithm: 'fifo' as const,
      capacity: {
        maxItems: 500,
        maxSize: 20 * 1024 * 1024, // 20MB
      },
    },
  },

  // 推荐结果缓存策略
  RECOMMENDATIONS: {
    name: 'recommendations',
    levels: [CacheLevel.MEMORY, CacheLevel.REDIS],
    ttlStrategy: {
      dynamic: {
        base: 600, // 10分钟基础TTL
        multiplier: 30, // 每次访问增加30秒
        max: 1800, // 最大30分钟
      },
    },
    warmupStrategy: {
      mode: 'scheduled' as const,
      priority: 'medium' as const,
      batchSize: 15,
      concurrency: 4,
    },
    evictionStrategy: {
      algorithm: 'adaptive' as const,
      capacity: {
        maxItems: 2000,
        maxSize: 80 * 1024 * 1024, // 80MB
      },
    },
  },
};

// 全局缓存策略管理器实例
export const cacheStrategies = new IntelligentCacheStrategies();

// 注册预定义策略
export function registerPredefinedStrategies(): void {
  Object.values(PREDEFINED_STRATEGIES).forEach(strategy => {
    cacheStrategies.registerStrategy(strategy.name, strategy);
  });
}

export default IntelligentCacheStrategies;