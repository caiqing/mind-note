/**
 * 智能缓存策略管理器
 *
 * 为MindNote项目提供智能缓存策略，包括自适应TTL、智能预热、
 * 基于访问模式的缓存优化、失效预测等高级功能
 */

import { EventEmitter } from 'events'
import { multiLevelCache, CacheLevel, CacheOptions } from './multi-level-cache'
import { createHash } from 'crypto'

// 数据类型枚举
export enum DataType {
  USER_PROFILE = 'user_profile',           // 用户画像
  NOTE_CONTENT = 'note_content',           // 笔记内容
  AI_ANALYSIS = 'ai_analysis',             // AI分析结果
  RECOMMENDATION = 'recommendation',       // 推荐结果
  SEARCH_RESULT = 'search_result',         // 搜索结果
  TAG_DATA = 'tag_data',                   // 标签数据
  SESSION_DATA = 'session_data',           // 会话数据
  CONFIG_DATA = 'config_data',             // 配置数据
}

// 访问模式类型
export enum AccessPattern {
  READ_HEAVY = 'read_heavy',               // 读密集
  WRITE_HEAVY = 'write_heavy',             // 写密集
  READ_WRITE_BALANCED = 'read_write_balanced', // 读写平衡
  BURST_ACCESS = 'burst_access',           // 突发访问
  SEQUENTIAL_ACCESS = 'sequential_access', // 顺序访问
  RANDOM_ACCESS = 'random_access',         // 随机访问
  TIME_BASED = 'time_based',               // 时间相关
  USER_SPECIFIC = 'user_specific',         // 用户特定
}

// 缓存策略配置
export interface CacheStrategy {
  dataType: DataType
  accessPattern: AccessPattern
  baseTTL: number                          // 基础TTL (秒)
  maxTTL: number                           // 最大TTL (秒)
  minTTL: number                           // 最小TTL (秒)
  levels: CacheLevel[]                     // 缓存层级
  priority: 'low' | 'medium' | 'high' | 'critical'
  compressionEnabled: boolean              // 是否启用压缩
  encryptionEnabled: boolean               // 是否启用加密
  prefetchThreshold: number                // 预取阈值
  invalidationStrategy: InvalidationStrategy
  warmupStrategy: WarmupStrategy
}

// 失效策略
export interface InvalidationStrategy {
  type: 'time_based' | 'event_based' | 'hybrid' | 'predictive'
  triggers: string[]                       // 触发条件
  cascade: boolean                         // 级联失效
  dependencies: string[]                   // 依赖项
}

// 预热策略
export interface WarmupStrategy {
  type: 'proactive' | 'reactive' | 'scheduled' | 'demand_based'
  priority: number                         // 预热优先级
  batchSize: number                        // 批处理大小
  timing: 'startup' | 'low_traffic' | 'scheduled'
  schedule?: string                        // 定时计划 (cron表达式)
}

// 访问统计
export interface AccessStats {
  key: string
  dataType: DataType
  accessCount: number
  lastAccess: number
  accessFrequency: number                  // 访问频率 (次/分钟)
  accessPattern: AccessPattern
  hitRate: number
  missRate: number
  avgResponseTime: number
  size: number
  createdAt: number
  lastModified: number
}

// 缓存性能指标
export interface CachePerformanceMetrics {
  overallHitRate: number
  overallMissRate: number
  avgResponseTime: number
  totalRequests: number
  cacheSize: number
  memoryUsage: number
  evictionRate: number
  invalidationRate: number
  warmupSuccessRate: number
  compressionRatio: number
  efficiency: number                       // 缓存效率分数 (0-100)
}

/**
 * 智能缓存策略管理器
 */
export class IntelligentCacheStrategyManager extends EventEmitter {
  private strategies: Map<DataType, CacheStrategy>
  private accessStats: Map<string, AccessStats>
  private performanceMetrics: CachePerformanceMetrics
  private isInitialized: boolean = false
  private analysisInterval: NodeJS.Timeout | null = null
  private warmupQueue: Array<{key: string, priority: number, dataType: DataType}> = []
  private accessPatternBuffer: Map<string, Array<{timestamp: number, action: string}>> = new Map()

  constructor() {
    super()
    this.strategies = new Map()
    this.accessStats = new Map()
    this.performanceMetrics = this.initializeMetrics()

    this.initializeDefaultStrategies()
    this.setupEventHandlers()
  }

  /**
   * 初始化缓存策略管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 等待多级缓存系统初始化
      await multiLevelCache.initialize()

      // 启动访问模式分析
      this.startAccessPatternAnalysis()

      // 启动性能监控
      this.startPerformanceMonitoring()

      // 启动智能预热
      this.startIntelligentWarmup()

      this.isInitialized = true
      this.emit('strategy:initialized')
      console.log('Intelligent cache strategy manager initialized')

    } catch (error) {
      console.error('Failed to initialize cache strategy manager:', error)
      throw error
    }
  }

  /**
   * 获取缓存值 (智能路由)
   */
  async get<T>(key: string, dataType: DataType): Promise<T | null> {
    const startTime = Date.now()

    // 记录访问
    this.recordAccess(key, dataType, 'get')

    // 获取策略
    const strategy = this.strategies.get(dataType)
    if (!strategy) {
      console.warn(`No cache strategy found for data type: ${dataType}`)
      return null
    }

    try {
      // 使用策略获取缓存
      const value = await multiLevelCache.get<T>(key, {
        levels: strategy.levels,
        ttl: this.calculateAdaptiveTTL(key, strategy),
        priority: strategy.priority,
        tags: [dataType, strategy.accessPattern],
        compress: strategy.compressionEnabled
      })

      const responseTime = Date.now() - startTime

      if (value !== null) {
        // 缓存命中
        this.updateAccessStats(key, dataType, true, responseTime)

        // 检查是否需要预取相关数据
        await this.checkPrefetch(key, dataType, strategy)

        this.emit('cache:hit', { key, dataType, responseTime })
      } else {
        // 缓存未命中
        this.updateAccessStats(key, dataType, false, responseTime)

        // 检查是否需要预热相关数据
        await this.checkWarmup(key, dataType, strategy)

        this.emit('cache:miss', { key, dataType, responseTime })
      }

      return value

    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      this.emit('cache:error', { key, dataType, error })
      return null
    }
  }

  /**
   * 设置缓存值 (智能存储)
   */
  async set<T>(key: string, value: T, dataType: DataType, customOptions?: Partial<CacheOptions>): Promise<void> {
    // 记录访问
    this.recordAccess(key, dataType, 'set')

    // 获取策略
    const strategy = this.strategies.get(dataType)
    if (!strategy) {
      console.warn(`No cache strategy found for data type: ${dataType}`)
      return
    }

    try {
      // 计算自适应TTL
      const adaptiveTTL = this.calculateAdaptiveTTL(key, strategy)

      // 应用压缩
      let processedValue = value
      if (strategy.compressionEnabled && this.shouldCompress(value)) {
        processedValue = await this.compressData(value)
      }

      // 应用加密
      if (strategy.encryptionEnabled) {
        processedValue = await this.encryptData(processedValue)
      }

      await multiLevelCache.set(key, processedValue, {
        levels: strategy.levels,
        ttl: adaptiveTTL,
        priority: strategy.priority,
        tags: [dataType, strategy.accessPattern, 'strategy:optimized'],
        version: this.generateVersion(key),
        compress: strategy.compressionEnabled,
        ...customOptions
      })

      // 更新统计信息
      this.updateAccessStats(key, dataType, true, 0, processedValue)

      // 检查失效规则
      this.checkInvalidationRules(key, dataType, strategy)

      this.emit('cache:set', { key, dataType, ttl: adaptiveTTL })

    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
      this.emit('cache:error', { key, dataType, error })
    }
  }

  /**
   * 智能删除缓存
   */
  async delete(key: string, dataType?: DataType): Promise<boolean> {
    try {
      const levels = dataType ?
        this.strategies.get(dataType)?.levels :
        [CacheLevel.MEMORY, CacheLevel.REDIS, CacheLevel.CDN]

      const result = await multiLevelCache.delete(key, levels)

      if (result) {
        // 清理访问统计
        this.accessStats.delete(key)

        // 级联删除相关缓存
        if (dataType) {
          await this.cascadeInvalidation(key, dataType)
        }

        this.emit('cache:deleted', { key, dataType })
      }

      return result

    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
      return false
    }
  }

  /**
   * 批量预热缓存
   */
  async batchWarmup(dataType: DataType, keys: string[], dataLoader: (key: string) => Promise<any>): Promise<void> {
    const strategy = this.strategies.get(dataType)
    if (!strategy) return

    console.log(`Starting batch warmup for ${dataType}: ${keys.length} keys`)

    try {
      // 按优先级排序
      const sortedKeys = this.prioritizeWarmupKeys(keys, dataType)

      // 分批处理
      const batchSize = strategy.warmupStrategy.batchSize
      for (let i = 0; i < sortedKeys.length; i += batchSize) {
        const batch = sortedKeys.slice(i, i + batchSize)

        await Promise.all(
          batch.map(async (key) => {
            try {
              const value = await dataLoader(key)
              if (value !== null) {
                await this.set(key, value, dataType)
                this.emit('warmup:success', { key, dataType })
              }
            } catch (error) {
              console.error(`Warmup failed for key ${key}:`, error)
              this.emit('warmup:error', { key, dataType, error })
            }
          })
        )

        // 避免过载
        await this.delay(100)
      }

      console.log(`Batch warmup completed for ${dataType}`)

    } catch (error) {
      console.error(`Batch warmup error for ${dataType}:`, error)
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): CachePerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  /**
   * 获取访问统计
   */
  getAccessStats(key?: string): AccessStats[] {
    if (key) {
      const stats = this.accessStats.get(key)
      return stats ? [stats] : []
    }
    return Array.from(this.accessStats.values())
  }

  /**
   * 优化缓存策略
   */
  async optimizeStrategies(): Promise<void> {
    console.log('Starting cache strategy optimization...')

    for (const [dataType, stats] of this.analyzeAccessPatterns()) {
      const currentStrategy = this.strategies.get(dataType)
      if (!currentStrategy) continue

      // 基于访问模式优化策略
      const optimizedStrategy = this.optimizeStrategy(dataType, stats, currentStrategy)
      this.strategies.set(dataType, optimizedStrategy)
    }

    console.log('Cache strategy optimization completed')
    this.emit('strategy:optimized')
  }

  /**
   * 预测缓存失效
   */
  async predictInvalidation(key: string, dataType: DataType): Promise<number> {
    const stats = this.accessStats.get(key)
    if (!stats) return 0

    const strategy = this.strategies.get(dataType)
    if (!strategy) return 0

    // 基于历史数据预测失效概率
    const timeSinceLastAccess = Date.now() - stats.lastAccess
    const accessFrequency = stats.accessFrequency

    // 简单的预测模型 (可以根据需要使用更复杂的ML模型)
    let invalidationProbability = 0

    if (strategy.invalidationStrategy.type === 'time_based') {
      invalidationProbability = Math.min(1, timeSinceLastAccess / (strategy.baseTTL * 1000))
    } else if (strategy.invalidationStrategy.type === 'predictive') {
      // 基于访问频率和时间间隔预测
      const expectedNextAccess = stats.lastAccess + (60000 / Math.max(accessFrequency, 1))
      invalidationProbability = Math.max(0, Math.min(1,
        (Date.now() - expectedNextAccess) / (strategy.baseTTL * 1000)
      ))
    }

    return invalidationProbability
  }

  /**
   * 关闭策略管理器
   */
  async shutdown(): Promise<void> {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
    }

    // 保存最后的统计信息
    await this.saveStats()

    this.removeAllListeners()
    this.isInitialized = false
    console.log('Intelligent cache strategy manager shutdown')
  }

  // === 私有方法 ===

  /**
   * 初始化默认策略
   */
  private initializeDefaultStrategies(): void {
    // 用户画像策略
    this.strategies.set(DataType.USER_PROFILE, {
      dataType: DataType.USER_PROFILE,
      accessPattern: AccessPattern.USER_SPECIFIC,
      baseTTL: 1800,        // 30分钟
      maxTTL: 7200,         // 2小时
      minTTL: 300,          // 5分钟
      levels: [CacheLevel.MEMORY, CacheLevel.REDIS],
      priority: 'high',
      compressionEnabled: true,
      encryptionEnabled: true,
      prefetchThreshold: 0.8,
      invalidationStrategy: {
        type: 'event_based',
        triggers: ['user_profile_updated', 'user_preferences_changed'],
        cascade: true,
        dependencies: ['user_session', 'user_recommendations']
      },
      warmupStrategy: {
        type: 'proactive',
        priority: 8,
        batchSize: 50,
        timing: 'startup'
      }
    })

    // AI分析结果策略
    this.strategies.set(DataType.AI_ANALYSIS, {
      dataType: DataType.AI_ANALYSIS,
      accessPattern: AccessPattern.READ_HEAVY,
      baseTTL: 3600,        // 1小时
      maxTTL: 14400,        // 4小时
      minTTL: 600,          // 10分钟
      levels: [CacheLevel.MEMORY, CacheLevel.REDIS, CacheLevel.CDN],
      priority: 'medium',
      compressionEnabled: true,
      encryptionEnabled: false,
      prefetchThreshold: 0.7,
      invalidationStrategy: {
        type: 'hybrid',
        triggers: ['note_content_updated', 'ai_model_retrained'],
        cascade: false,
        dependencies: ['note_content']
      },
      warmupStrategy: {
        type: 'reactive',
        priority: 6,
        batchSize: 20,
        timing: 'low_traffic'
      }
    })

    // 推荐结果策略
    this.strategies.set(DataType.RECOMMENDATION, {
      dataType: DataType.RECOMMENDATION,
      accessPattern: AccessPattern.USER_SPECIFIC,
      baseTTL: 900,         // 15分钟
      maxTTL: 3600,         // 1小时
      minTTL: 300,          // 5分钟
      levels: [CacheLevel.MEMORY, CacheLevel.REDIS],
      priority: 'high',
      compressionEnabled: true,
      encryptionEnabled: false,
      prefetchThreshold: 0.9,
      invalidationStrategy: {
        type: 'event_based',
        triggers: ['user_interaction', 'feedback_submitted', 'user_preferences_changed'],
        cascade: true,
        dependencies: ['user_profile', 'ai_analysis']
      },
      warmupStrategy: {
        type: 'demand_based',
        priority: 9,
        batchSize: 30,
        timing: 'startup'
      }
    })

    // 搜索结果策略
    this.strategies.set(DataType.SEARCH_RESULT, {
      dataType: DataType.SEARCH_RESULT,
      accessPattern: AccessPattern.BURST_ACCESS,
      baseTTL: 300,         // 5分钟
      maxTTL: 1800,         // 30分钟
      minTTL: 60,           // 1分钟
      levels: [CacheLevel.MEMORY, CacheLevel.REDIS],
      priority: 'low',
      compressionEnabled: true,
      encryptionEnabled: false,
      prefetchThreshold: 0.5,
      invalidationStrategy: {
        type: 'time_based',
        triggers: ['content_indexed', 'search_index_updated'],
        cascade: false,
        dependencies: ['note_content', 'tag_data']
      },
      warmupStrategy: {
        type: 'reactive',
        priority: 3,
        batchSize: 100,
        timing: 'low_traffic'
      }
    })
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.on('cache:hit', ({ key, dataType, responseTime }) => {
      this.updatePerformanceMetrics(true, responseTime)
    })

    this.on('cache:miss', ({ key, dataType, responseTime }) => {
      this.updatePerformanceMetrics(false, responseTime)
    })
  }

  /**
   * 计算自适应TTL
   */
  private calculateAdaptiveTTL(key: string, strategy: CacheStrategy): number {
    const stats = this.accessStats.get(key)
    if (!stats) return strategy.baseTTL

    let adaptiveTTL = strategy.baseTTL

    // 基于访问频率调整
    if (stats.accessFrequency > 10) { // 高频访问
      adaptiveTTL = Math.min(strategy.maxTTL, adaptiveTTL * 1.5)
    } else if (stats.accessFrequency < 1) { // 低频访问
      adaptiveTTL = Math.max(strategy.minTTL, adaptiveTTL * 0.7)
    }

    // 基于命中率调整
    if (stats.hitRate > 0.8) { // 高命中率
      adaptiveTTL = Math.min(strategy.maxTTL, adaptiveTTL * 1.2)
    } else if (stats.hitRate < 0.3) { // 低命中率
      adaptiveTTL = Math.max(strategy.minTTL, adaptiveTTL * 0.8)
    }

    // 基于数据大小调整
    if (stats.size > 1024 * 1024) { // 大于1MB
      adaptiveTTL = Math.max(strategy.minTTL, adaptiveTTL * 0.6)
    }

    return Math.round(adaptiveTTL)
  }

  /**
   * 记录访问
   */
  private recordAccess(key: string, dataType: DataType, action: string): void {
    const timestamp = Date.now()

    if (!this.accessPatternBuffer.has(key)) {
      this.accessPatternBuffer.set(key, [])
    }

    const buffer = this.accessPatternBuffer.get(key)!
    buffer.push({ timestamp, action })

    // 保持缓冲区大小
    if (buffer.length > 100) {
      buffer.splice(0, buffer.length - 100)
    }
  }

  /**
   * 更新访问统计
   */
  private updateAccessStats(
    key: string,
    dataType: DataType,
    isHit: boolean,
    responseTime: number,
    value?: any
  ): void {
    let stats = this.accessStats.get(key)

    if (!stats) {
      stats = {
        key,
        dataType,
        accessCount: 0,
        lastAccess: Date.now(),
        accessFrequency: 0,
        accessPattern: this.detectAccessPattern(key),
        hitRate: 0,
        missRate: 1,
        avgResponseTime: 0,
        size: value ? this.calculateSize(value) : 0,
        createdAt: Date.now(),
        lastModified: Date.now()
      }
      this.accessStats.set(key, stats)
    }

    stats.accessCount++
    stats.lastAccess = Date.now()
    stats.lastModified = Date.now()

    // 更新访问频率 (每分钟访问次数)
    const timeWindow = 60 * 1000 // 1分钟
    const recentAccesses = this.accessPatternBuffer.get(key)?.filter(
      entry => Date.now() - entry.timestamp < timeWindow
    ) || []
    stats.accessFrequency = recentAccesses.length / (timeWindow / 60000)

    // 更新命中率
    if (isHit) {
      stats.hitRate = (stats.hitRate * (stats.accessCount - 1) + 1) / stats.accessCount
    } else {
      stats.missRate = (stats.missRate * (stats.accessCount - 1) + 1) / stats.accessCount
    }

    // 更新平均响应时间
    stats.avgResponseTime = (stats.avgResponseTime * (stats.accessCount - 1) + responseTime) / stats.accessCount

    // 更新数据大小
    if (value) {
      stats.size = this.calculateSize(value)
    }
  }

  /**
   * 检测访问模式
   */
  private detectAccessPattern(key: string): AccessPattern {
    const buffer = this.accessPatternBuffer.get(key) || []
    if (buffer.length < 10) return AccessPattern.RANDOM_ACCESS

    const timestamps = buffer.map(entry => entry.timestamp).sort()
    const intervals = []

    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1])
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length
    const standardDeviation = Math.sqrt(variance)

    // 基于间隔变化检测模式
    if (standardDeviation < avgInterval * 0.2) {
      return AccessPattern.SEQUENTIAL_ACCESS
    } else if (avgInterval < 1000) { // 小于1秒
      return AccessPattern.BURST_ACCESS
    } else if (avgInterval > 300000) { // 大于5分钟
      return AccessPattern.TIME_BASED
    } else {
      return AccessPattern.RANDOM_ACCESS
    }
  }

  /**
   * 检查是否需要预取
   */
  private async checkPrefetch(key: string, dataType: DataType, strategy: CacheStrategy): Promise<void> {
    const stats = this.accessStats.get(key)
    if (!stats || stats.accessFrequency < strategy.prefetchThreshold) return

    // 实现智能预取逻辑
    // 这里可以根据相关性和访问历史预测需要预取的数据
    console.log(`Prefetch triggered for key: ${key}, type: ${dataType}`)
  }

  /**
   * 检查是否需要预热
   */
  private async checkWarmup(key: string, dataType: DataType, strategy: CacheStrategy): Promise<void> {
    if (strategy.warmupStrategy.type !== 'reactive') return

    // 将键添加到预热队列
    this.warmupQueue.push({
      key,
      priority: strategy.warmupStrategy.priority,
      dataType
    })

    // 保持队列大小
    if (this.warmupQueue.length > 1000) {
      this.warmupQueue.sort((a, b) => b.priority - a.priority)
      this.warmupQueue.splice(1000)
    }
  }

  /**
   * 检查失效规则
   */
  private checkInvalidationRules(key: string, dataType: DataType, strategy: CacheStrategy): void {
    // 实现失效规则检查逻辑
    // 可以基于时间、事件或依赖关系触发失效
  }

  /**
   * 级联失效
   */
  private async cascadeInvalidation(key: string, dataType: DataType): Promise<void> {
    const strategy = this.strategies.get(dataType)
    if (!strategy || !strategy.invalidationStrategy.cascade) return

    for (const dependency of strategy.invalidationStrategy.dependencies) {
      // 实现依赖项失效逻辑
      console.log(`Cascade invalidation for dependency: ${dependency}`)
    }
  }

  /**
   * 启动访问模式分析
   */
  private startAccessPatternAnalysis(): void {
    this.analysisInterval = setInterval(async () => {
      try {
        await this.analyzeAndOptimizePatterns()
      } catch (error) {
        console.error('Access pattern analysis error:', error)
      }
    }, 5 * 60 * 1000) // 每5分钟分析一次
  }

  /**
   * 启动性能监控
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateOverallMetrics()
    }, 60 * 1000) // 每分钟更新一次
  }

  /**
   * 启动智能预热
   */
  private startIntelligentWarmup(): void {
    setInterval(async () => {
      if (this.warmupQueue.length > 0) {
        await this.processWarmupQueue()
      }
    }, 30 * 1000) // 每30秒处理一次预热队列
  }

  /**
   * 分析和优化模式
   */
  private async analyzeAndOptimizePatterns(): Promise<void> {
    // 分析访问模式并优化策略
    for (const [dataType, stats] of this.analyzeAccessPatterns()) {
      const currentStrategy = this.strategies.get(dataType)
      if (currentStrategy) {
        const optimizedStrategy = this.optimizeStrategy(dataType, stats, currentStrategy)
        if (this.hasStrategyChanged(currentStrategy, optimizedStrategy)) {
          this.strategies.set(dataType, optimizedStrategy)
          this.emit('strategy:updated', { dataType, strategy: optimizedStrategy })
        }
      }
    }
  }

  /**
   * 分析访问模式
   */
  private analyzeAccessPatterns(): Map<DataType, AccessStats[]> {
    const patterns = new Map<DataType, AccessStats[]>()

    for (const stats of this.accessStats.values()) {
      if (!patterns.has(stats.dataType)) {
        patterns.set(stats.dataType, [])
      }
      patterns.get(stats.dataType)!.push(stats)
    }

    return patterns
  }

  /**
   * 优化策略
   */
  private optimizeStrategy(dataType: DataType, stats: AccessStats[], currentStrategy: CacheStrategy): CacheStrategy {
    const optimized = { ...currentStrategy }

    // 基于统计数据优化TTL
    const avgAccessFrequency = stats.reduce((sum, s) => sum + s.accessFrequency, 0) / stats.length
    const avgHitRate = stats.reduce((sum, s) => sum + s.hitRate, 0) / stats.length

    if (avgAccessFrequency > 5 && avgHitRate > 0.8) {
      // 高频高命中率，增加TTL
      optimized.baseTTL = Math.min(currentStrategy.maxTTL, currentStrategy.baseTTL * 1.2)
    } else if (avgAccessFrequency < 1 && avgHitRate < 0.3) {
      // 低频低命中率，减少TTL
      optimized.baseTTL = Math.max(currentStrategy.minTTL, currentStrategy.baseTTL * 0.8)
    }

    return optimized
  }

  /**
   * 检查策略是否变化
   */
  private hasStrategyChanged(old: CacheStrategy, new: CacheStrategy): boolean {
    return old.baseTTL !== new.baseTTL ||
           old.priority !== new.priority ||
           old.compressionEnabled !== new.compressionEnabled
  }

  /**
   * 处理预热队列
   */
  private async processWarmupQueue(): Promise<void> {
    if (this.warmupQueue.length === 0) return

    // 按优先级排序
    this.warmupQueue.sort((a, b) => b.priority - a.priority)

    // 处理高优先级项目
    const batch = this.warmupQueue.splice(0, 10)

    for (const item of batch) {
      // 这里应该有实际的数据加载逻辑
      console.log(`Processing warmup for key: ${item.key}, type: ${item.dataType}`)
    }
  }

  /**
   * 更新整体指标
   */
  private updateOverallMetrics(): void {
    const allStats = Array.from(this.accessStats.values())

    if (allStats.length === 0) return

    const totalRequests = allStats.reduce((sum, s) => sum + s.accessCount, 0)
    const totalHits = allStats.reduce((sum, s) => sum + s.hitRate * s.accessCount, 0)
    const totalResponseTime = allStats.reduce((sum, s) => sum + s.avgResponseTime * s.accessCount, 0)

    this.performanceMetrics.overallHitRate = totalHits / totalRequests
    this.performanceMetrics.overallMissRate = 1 - this.performanceMetrics.overallHitRate
    this.performanceMetrics.avgResponseTime = totalResponseTime / totalRequests
    this.performanceMetrics.totalRequests = totalRequests

    // 计算效率分数
    this.performanceMetrics.efficiency = this.calculateEfficiencyScore()
  }

  /**
   * 计算效率分数
   */
  private calculateEfficiencyScore(): number {
    const hitRate = this.performanceMetrics.overallHitRate
    const avgResponseTime = this.performanceMetrics.avgResponseTime
    const memoryUsage = this.performanceMetrics.memoryUsage

    // 简单的效率计算公式 (可以根据需要调整)
    const responseTimeScore = Math.max(0, 1 - avgResponseTime / 1000) // 响应时间越短分数越高
    const memoryScore = Math.max(0, 1 - memoryUsage / (1024 * 1024 * 1024)) // 内存使用越少分数越高

    return Math.round((hitRate * 0.5 + responseTimeScore * 0.3 + memoryScore * 0.2) * 100)
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(isHit: boolean, responseTime: number): void {
    if (isHit) {
      this.performanceMetrics.overallHitRate =
        (this.performanceMetrics.overallHitRate * this.performanceMetrics.totalRequests + 1) /
        (this.performanceMetrics.totalRequests + 1)
    } else {
      this.performanceMetrics.overallMissRate =
        (this.performanceMetrics.overallMissRate * this.performanceMetrics.totalRequests + 1) /
        (this.performanceMetrics.totalRequests + 1)
    }

    this.performanceMetrics.totalRequests++
    this.performanceMetrics.avgResponseTime =
      (this.performanceMetrics.avgResponseTime * (this.performanceMetrics.totalRequests - 1) + responseTime) /
      this.performanceMetrics.totalRequests
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): CachePerformanceMetrics {
    return {
      overallHitRate: 0,
      overallMissRate: 1,
      avgResponseTime: 0,
      totalRequests: 0,
      cacheSize: 0,
      memoryUsage: 0,
      evictionRate: 0,
      invalidationRate: 0,
      warmupSuccessRate: 0,
      compressionRatio: 0,
      efficiency: 0
    }
  }

  /**
   * 按优先级排序预热键
   */
  private prioritizeWarmupKeys(keys: string[], dataType: DataType): string[] {
    return keys.sort((a, b) => {
      const statsA = this.accessStats.get(a)
      const statsB = this.accessStats.get(b)

      if (!statsA && !statsB) return 0
      if (!statsA) return 1
      if (!statsB) return -1

      // 按访问频率和命中率排序
      const scoreA = statsA.accessFrequency * statsA.hitRate
      const scoreB = statsB.accessFrequency * statsB.hitRate

      return scoreB - scoreA
    })
  }

  /**
   * 生成版本号
   */
  private generateVersion(key: string): string {
    return createHash('md5').update(`${key}:${Date.now()}`).digest('hex').substring(0, 8)
  }

  /**
   * 计算数据大小
   */
  private calculateSize(value: any): number {
    return JSON.stringify(value).length * 2 // 简化计算
  }

  /**
   * 判断是否应该压缩
   */
  private shouldCompress(value: any): boolean {
    return this.calculateSize(value) > 1024 // 大于1KB的数据进行压缩
  }

  /**
   * 压缩数据
   */
  private async compressData(data: any): Promise<any> {
    // 这里应该实现实际的压缩逻辑
    return data
  }

  /**
   * 加密数据
   */
  private async encryptData(data: any): Promise<any> {
    // 这里应该实现实际的加密逻辑
    return data
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 保存统计信息
   */
  private async saveStats(): Promise<void> {
    // 这里应该实现统计信息的持久化保存
    console.log('Saving cache statistics...')
  }
}

// 导出单例实例
export const intelligentCacheStrategyManager = new IntelligentCacheStrategyManager()

export default intelligentCacheStrategyManager