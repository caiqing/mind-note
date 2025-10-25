/**
 * 数据库连接池管理器
 *
 * 提供智能的数据库连接池管理，包括连接复用、负载均衡、
 * 故障转移、性能监控和自动优化功能
 */

import { EventEmitter } from 'events'
import { Pool, PoolConfig, PoolClient } from 'pg'
import Redis from 'ioredis'
import { createHash } from 'crypto'

// 连接池状态
export enum PoolStatus {
  INITIALIZING = 'initializing',
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  MAINTENANCE = 'maintenance',
  SHUTTING_DOWN = 'shutting_down'
}

// 连接优先级
export enum ConnectionPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

// 连接类型
export enum ConnectionType {
  READ = 'read',
  WRITE = 'write',
  ANALYTICS = 'analytics',
  BACKUP = 'backup'
}

// 连接配置
export interface DatabaseConnectionConfig {
  name: string
  type: ConnectionType
  host: string
  port: number
  database: string
  username: string
  password: string
  maxConnections?: number
  minConnections?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
  acquireTimeoutMillis?: number
  priority?: ConnectionPriority
  weight?: number                    // 负载均衡权重
  ssl?: boolean
  readOnly?: boolean
  isPrimary?: boolean
  tags?: string[]
}

// 连接统计信息
export interface ConnectionStats {
  poolName: string
  type: ConnectionType
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingClients: number
  totalAcquires: number
  totalReleases: number
  totalErrors: number
  averageAcquireTime: number
  averageUsageTime: number
  connectionUtilization: number
  errorRate: number
  lastError?: string
  lastErrorTime?: number
  uptime: number
  status: PoolStatus
}

// 连接池健康检查结果
export interface HealthCheckResult {
  poolName: string
  isHealthy: boolean
  responseTime: number
  error?: string
  checkedAt: number
  metrics: {
    connectionCount: number
    activeConnections: number
    idleConnections: number
    averageResponseTime: number
  }
}

// 负载均衡策略
export enum LoadBalanceStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  RANDOM = 'random',
  PRIORITY_BASED = 'priority_based'
}

// 故障转移配置
export interface FailoverConfig {
  enabled: boolean
  healthCheckInterval: number     // 健康检查间隔 (毫秒)
  maxRetries: number
  retryDelay: number              // 重试延迟 (毫秒)
  circuitBreakerThreshold: number // 熔断器阈值
  circuitBreakerTimeout: number   // 熔断器超时 (毫秒)
  failoverTimeout: number         // 故障转移超时 (毫秒)
}

/**
 * 智能数据库连接池管理器
 */
export class ConnectionPoolManager extends EventEmitter {
  private pools: Map<string, Pool> = new Map()
  private configs: Map<string, DatabaseConnectionConfig> = new Map()
  private stats: Map<string, ConnectionStats> = new Map()
  private healthCheckResults: Map<string, HealthCheckResult> = new Map()
  private status: PoolStatus = PoolStatus.INITIALIZING
  private loadBalanceStrategy: LoadBalanceStrategy = LoadBalanceStrategy.LEAST_CONNECTIONS
  private failoverConfig: FailoverConfig
  private healthCheckInterval: NodeJS.Timeout | null = null
  private metricsInterval: NodeJS.Timeout | null = null
  private circuitBreakers: Map<string, { isOpen: boolean, openedAt: number }> = new Map()
  private connectionRoundRobin: Map<string, number> = new Map()
  private redis: Redis | null = null

  constructor(config: {
    pools: DatabaseConnectionConfig[]
    loadBalanceStrategy?: LoadBalanceStrategy
    failoverConfig?: Partial<FailoverConfig>
    redis?: {
      host: string
      port: number
      password?: string
      db?: number
    }
  } = { pools: [] }) {
    super()

    this.failoverConfig = {
      enabled: true,
      healthCheckInterval: 30000,    // 30秒
      maxRetries: 3,
      retryDelay: 1000,              // 1秒
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,   // 1分钟
      failoverTimeout: 5000,          // 5秒
      ...config.failoverConfig
    }

    this.loadBalanceStrategy = config.loadBalanceStrategy || LoadBalanceStrategy.LEAST_CONNECTIONS

    this.initializePools(config.pools)
    this.setupRedis(config.redis)
    this.setupEventHandlers()
  }

  /**
   * 初始化所有连接池
   */
  private async initializePools(configs: DatabaseConnectionConfig[]): Promise<void> {
    console.log('🔌 Initializing database connection pools...')

    for (const config of configs) {
      try {
        await this.createPool(config)
        console.log(`✅ Pool '${config.name}' initialized successfully`)
      } catch (error) {
        console.error(`❌ Failed to initialize pool '${config.name}':`, error)
        this.emit('pool:initialization_error', { poolName: config.name, error })
      }
    }

    // 启动健康检查
    this.startHealthCheck()

    // 启动指标收集
    this.startMetricsCollection()

    this.status = PoolStatus.HEALTHY
    this.emit('pools:initialized')
    console.log('🎊 All connection pools initialized successfully')
  }

  /**
   * 创建单个连接池
   */
  private async createPool(config: DatabaseConnectionConfig): Promise<void> {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      max: config.maxConnections || 20,
      min: config.minConnections || 5,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
      acquireTimeoutMillis: config.acquireTimeoutMillis || 60000,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      application_name: `mindnote-${config.name}`,
      ...this.getPoolSpecificConfig(config.type)
    }

    const pool = new Pool(poolConfig)

    // 设置连接池事件监听
    pool.on('connect', (client) => {
      this.emit('connection:established', { poolName: config.name, client })
      this.updateStats(config.name, { totalConnections: 1 })
    })

    pool.on('acquire', (client) => {
      this.emit('connection:acquired', { poolName: config.name, client })
      this.updateStats(config.name, {
        activeConnections: 1,
        totalAcquires: 1,
        averageAcquireTime: Date.now()
      })
    })

    pool.on('release', (client) => {
      this.emit('connection:released', { poolName: config.name, client })
      this.updateStats(config.name, {
        activeConnections: -1,
        totalReleases: 1
      })
    })

    pool.on('remove', (client) => {
      this.emit('connection:removed', { poolName: config.name, client })
      this.updateStats(config.name, { totalConnections: -1 })
    })

    pool.on('error', (error, client) => {
      console.error(`Pool '${config.name}' error:`, error)
      this.emit('connection:error', { poolName: config.name, error, client })
      this.updateStats(config.name, {
        totalErrors: 1,
        lastError: error.message,
        lastErrorTime: Date.now()
      })

      // 触发熔断器检查
      this.checkCircuitBreaker(config.name)
    })

    // 验证连接
    await this.validatePool(pool, config)

    this.pools.set(config.name, pool)
    this.configs.set(config.name, config)
    this.stats.set(config.name, this.initializeStats(config))
    this.connectionRoundRobin.set(config.name, 0)
  }

  /**
   * 获取连接池特定配置
   */
  private getPoolSpecificConfig(type: ConnectionType): Partial<PoolConfig> {
    switch (type) {
      case ConnectionType.READ:
        return {
          max: 30,          // 读操作可以更多连接
          idleTimeoutMillis: 60000,
          allowExitOnIdle: true
        }
      case ConnectionType.WRITE:
        return {
          max: 10,          // 写操作限制连接数
          idleTimeoutMillis: 10000,
          allowExitOnIdle: false
        }
      case ConnectionType.ANALYTICS:
        return {
          max: 15,          // 分析操作中等连接数
          idleTimeoutMillis: 120000,
          statement_timeout: 300000 // 5分钟查询超时
        }
      case ConnectionType.BACKUP:
        return {
          max: 5,           // 备份操作最少连接
          idleTimeoutMillis: 300000,
          statement_timeout: 1800000 // 30分钟超时
        }
      default:
        return {}
    }
  }

  /**
   * 设置Redis连接（用于分布式状态管理）
   */
  private setupRedis(redisConfig?: { host: string, port: number, password?: string, db?: number }): void {
    if (!redisConfig) return

    try {
      this.redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      })

      this.redis.on('connect', () => {
        console.log('📦 Redis connected for distributed pool management')
      })

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error)
        this.emit('redis:error', error)
      })
    } catch (error) {
      console.warn('Failed to initialize Redis for distributed management:', error)
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.on('connection:error', async ({ poolName }) => {
      await this.performHealthCheck(poolName)
    })
  }

  /**
   * 获取数据库连接
   */
  async getConnection(
    type: ConnectionType = ConnectionType.READ,
    priority: ConnectionPriority = ConnectionPriority.NORMAL,
    preferredPool?: string
  ): Promise<PoolClient> {
    const startTime = Date.now()

    try {
      const poolName = await this.selectPool(type, priority, preferredPool)

      // 检查熔断器状态
      if (this.isCircuitBreakerOpen(poolName)) {
        throw new Error(`Circuit breaker is open for pool: ${poolName}`)
      }

      const pool = this.pools.get(poolName)
      if (!pool) {
        throw new Error(`Pool not found: ${poolName}`)
      }

      const client = await pool.connect()

      // 记录获取时间
      const acquireTime = Date.now() - startTime
      this.updateStats(poolName, { averageAcquireTime: acquireTime })

      // 添加连接元数据
      ;(client as any).__poolName = poolName
      ;(client as any).__acquiredAt = Date.now()

      this.emit('connection:acquired_success', { poolName, acquireTime })
      return client

    } catch (error) {
      const acquireTime = Date.now() - startTime
      this.emit('connection:acquire_failed', { type, priority, error, acquireTime })

      // 尝试故障转移
      if (this.failoverConfig.enabled) {
        return await this.performFailover(type, priority, error as Error)
      }

      throw error
    }
  }

  /**
   * 选择最佳连接池
   */
  private async selectPool(
    type: ConnectionType,
    priority: ConnectionPriority,
    preferredPool?: string
  ): Promise<string> {
    const availablePools = this.getAvailablePools(type, priority)

    if (availablePools.length === 0) {
      throw new Error(`No available pools for type: ${type}`)
    }

    // 如果指定了首选池且可用，优先使用
    if (preferredPool && availablePools.includes(preferredPool)) {
      return preferredPool
    }

    // 根据负载均衡策略选择池
    switch (this.loadBalanceStrategy) {
      case LoadBalanceStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(availablePools)
      case LoadBalanceStrategy.LEAST_CONNECTIONS:
        return await this.selectLeastConnections(availablePools)
      case LoadBalanceStrategy.WEIGHTED_ROUND_ROBIN:
        return this.selectWeightedRoundRobin(availablePools)
      case LoadBalanceStrategy.RANDOM:
        return this.selectRandom(availablePools)
      case LoadBalanceStrategy.PRIORITY_BASED:
        return this.selectPriorityBased(availablePools, priority)
      default:
        return availablePools[0]
    }
  }

  /**
   * 获取可用的连接池列表
   */
  private getAvailablePools(type: ConnectionType, priority: ConnectionPriority): string[] {
    const available: string[] = []

    for (const [poolName, config] of this.configs) {
      if (config.type !== type) continue
      if (this.isCircuitBreakerOpen(poolName)) continue

      const stats = this.stats.get(poolName)
      if (!stats) continue

      // 检查连接池状态
      if (stats.status === PoolStatus.HEALTHY || stats.status === PoolStatus.DEGRADED) {
        // 检查是否还有可用连接
        if (stats.totalConnections < (config.maxConnections || 20)) {
          available.push(poolName)
        }
      }
    }

    return available
  }

  /**
   * 轮询选择池
   */
  private selectRoundRobin(pools: string[]): string {
    if (pools.length === 0) return pools[0]

    const key = pools[0] // 使用第一个池作为轮询键
    const current = this.connectionRoundRobin.get(key) || 0
    const next = (current + 1) % pools.length
    this.connectionRoundRobin.set(key, next)

    return pools[next]
  }

  /**
   * 选择连接数最少的池
   */
  private async selectLeastConnections(pools: string[]): Promise<string> {
    let minConnections = Infinity
    let selectedPool = pools[0]

    for (const poolName of pools) {
      const stats = this.stats.get(poolName)
      if (stats && stats.activeConnections < minConnections) {
        minConnections = stats.activeConnections
        selectedPool = poolName
      }
    }

    return selectedPool
  }

  /**
   * 加权轮询选择池
   */
  private selectWeightedRoundRobin(pools: string[]): string {
    const weightedPools: { pool: string, weight: number }[] = []

    for (const poolName of pools) {
      const config = this.configs.get(poolName)
      const weight = config?.weight || 1
      weightedPools.push({ pool: poolName, weight })
    }

    const totalWeight = weightedPools.reduce((sum, p) => sum + p.weight, 0)
    let random = Math.random() * totalWeight

    for (const { pool, weight } of weightedPools) {
      random -= weight
      if (random <= 0) {
        return pool
      }
    }

    return weightedPools[0].pool
  }

  /**
   * 随机选择池
   */
  private selectRandom(pools: string[]): string {
    return pools[Math.floor(Math.random() * pools.length)]
  }

  /**
   * 基于优先级选择池
   */
  private selectPriorityBased(pools: string[], priority: ConnectionPriority): string {
    const filteredPools = pools.filter(poolName => {
      const config = this.configs.get(poolName)
      return config && (!config.priority || config.priority >= priority)
    })

    if (filteredPools.length === 0) {
      return pools[0] // 如果没有满足优先级的池，使用第一个可用池
    }

    return filteredPools[0]
  }

  /**
   * 执行故障转移
   */
  private async performFailover(
    type: ConnectionType,
    priority: ConnectionPriority,
    originalError: Error
  ): Promise<PoolClient> {
    console.warn(`Performing failover due to: ${originalError.message}`)

    for (let attempt = 1; attempt <= this.failoverConfig.maxRetries; attempt++) {
      try {
        await new Promise(resolve =>
          setTimeout(resolve, this.failoverConfig.retryDelay * attempt)
        )

        const poolName = await this.selectPool(type, priority)
        const pool = this.pools.get(poolName)

        if (pool && !this.isCircuitBreakerOpen(poolName)) {
          const client = await pool.connect()
          this.emit('failover:success', {
            attempt,
            originalError: originalError.message,
            fallbackPool: poolName
          })
          return client
        }

      } catch (error) {
        console.warn(`Failover attempt ${attempt} failed:`, error)
        this.emit('failover:attempt_failed', { attempt, error })
      }
    }

    throw new Error(`Failover failed after ${this.failoverConfig.maxRetries} attempts. Original error: ${originalError.message}`)
  }

  /**
   * 释放连接
   */
  async releaseConnection(client: PoolClient): Promise<void> {
    try {
      const poolName = (client as any).__poolName
      const acquiredAt = (client as any).__acquiredAt
      const usageTime = acquiredAt ? Date.now() - acquiredAt : 0

      await client.release()

      if (poolName) {
        this.updateStats(poolName, { averageUsageTime: usageTime })
        this.emit('connection:released_success', { poolName, usageTime })
      }

    } catch (error) {
      console.error('Error releasing connection:', error)
      this.emit('connection:release_failed', { error })
      throw error
    }
  }

  /**
   * 执行查询
   */
  async executeQuery<T = any>(
    query: string,
    params: any[] = [],
    options: {
      type?: ConnectionType
      priority?: ConnectionPriority
      poolName?: string
      timeout?: number
    } = {}
  ): Promise<T[]> {
    const startTime = Date.now()
    const client = await this.getConnection(
      options.type || ConnectionType.READ,
      options.priority || ConnectionPriority.NORMAL,
      options.poolName
    )

    try {
      if (options.timeout) {
        client.query('SET statement_timeout = $1', [options.timeout])
      }

      const result = await client.query(query, params)
      const queryTime = Date.now() - startTime

      this.emit('query:executed', {
        query,
        params: params.length,
        queryTime,
        rowCount: result.rowCount
      })

      return result.rows

    } catch (error) {
      const queryTime = Date.now() - startTime
      this.emit('query:failed', { query, error, queryTime })
      throw error
    } finally {
      await this.releaseConnection(client)
    }
  }

  /**
   * 执行事务
   */
  async executeTransaction<T = any>(
    queries: Array<{ query: string, params?: any[] }>,
    options: {
      type?: ConnectionType
      priority?: ConnectionPriority
      poolName?: string
      isolationLevel?: string
    } = {}
  ): Promise<T[]> {
    const client = await this.getConnection(
      options.type || ConnectionType.WRITE,
      options.priority || ConnectionPriority.HIGH,
      options.poolName
    )

    try {
      await client.query('BEGIN')

      if (options.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`)
      }

      const results: T[] = []

      for (const { query, params = [] } of queries) {
        const result = await client.query(query, params)
        results.push(result.rows)
      }

      await client.query('COMMIT')

      this.emit('transaction:completed', {
        queryCount: queries.length,
        results: results.length
      })

      return results

    } catch (error) {
      await client.query('ROLLBACK')
      this.emit('transaction:failed', { queries, error })
      throw error
    } finally {
      await this.releaseConnection(client)
    }
  }

  /**
   * 验证连接池
   */
  private async validatePool(pool: Pool, config: DatabaseConnectionConfig): Promise<void> {
    try {
      const client = await pool.connect()
      await client.query('SELECT 1')
      await client.release()
      console.log(`✅ Pool '${config.name}' validation successful`)
    } catch (error) {
      console.error(`❌ Pool '${config.name}' validation failed:`, error)
      throw error
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    if (!this.failoverConfig.enabled) return

    this.healthCheckInterval = setInterval(async () => {
      for (const poolName of this.pools.keys()) {
        await this.performHealthCheck(poolName)
      }
    }, this.failoverConfig.healthCheckInterval)

    console.log('🏥 Health check system started')
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(poolName: string): Promise<void> {
    const startTime = Date.now()
    const pool = this.pools.get(poolName)
    const config = this.configs.get(poolName)

    if (!pool || !config) return

    try {
      const client = await pool.connect()
      await client.query('SELECT 1 as health_check')
      await client.release()

      const responseTime = Date.now() - startTime
      const result: HealthCheckResult = {
        poolName,
        isHealthy: true,
        responseTime,
        checkedAt: Date.now(),
        metrics: {
          connectionCount: pool.totalCount,
          activeConnections: pool.waitingCount,
          idleConnections: pool.idleCount,
          averageResponseTime: responseTime
        }
      }

      this.healthCheckResults.set(poolName, result)
      this.updateStats(poolName, { status: PoolStatus.HEALTHY })

      // 重置熔断器
      this.resetCircuitBreaker(poolName)

      this.emit('health:check_passed', result)

    } catch (error) {
      const responseTime = Date.now() - startTime
      const result: HealthCheckResult = {
        poolName,
        isHealthy: false,
        responseTime,
        error: (error as Error).message,
        checkedAt: Date.now(),
        metrics: {
          connectionCount: 0,
          activeConnections: 0,
          idleConnections: 0,
          averageResponseTime: responseTime
        }
      }

      this.healthCheckResults.set(poolName, result)
      this.updateStats(poolName, {
        status: PoolStatus.UNHEALTHY,
        lastError: (error as Error).message,
        lastErrorTime: Date.now()
      })

      this.emit('health:check_failed', result)
    }
  }

  /**
   * 检查熔断器状态
   */
  private checkCircuitBreaker(poolName: string): void {
    const stats = this.stats.get(poolName)
    const config = this.failoverConfig

    if (!stats || !config.enabled) return

    // 如果错误率超过阈值，打开熔断器
    const errorRate = stats.totalAcquires > 0 ? stats.totalErrors / stats.totalAcquires : 0

    if (errorRate > 0.5 && stats.totalErrors > config.circuitBreakerThreshold) {
      this.openCircuitBreaker(poolName)
    }
  }

  /**
   * 打开熔断器
   */
  private openCircuitBreaker(poolName: string): void {
    this.circuitBreakers.set(poolName, {
      isOpen: true,
      openedAt: Date.now()
    })

    console.warn(`🔥 Circuit breaker opened for pool: ${poolName}`)
    this.emit('circuit_breaker:opened', { poolName })

    // 设置熔断器自动关闭定时器
    setTimeout(() => {
      this.closeCircuitBreaker(poolName)
    }, this.failoverConfig.circuitBreakerTimeout)
  }

  /**
   * 关闭熔断器
   */
  private closeCircuitBreaker(poolName: string): void {
    const breaker = this.circuitBreakers.get(poolName)
    if (breaker && breaker.isOpen) {
      this.circuitBreakers.set(poolName, {
        isOpen: false,
        openedAt: breaker.openedAt
      })

      console.log(`✅ Circuit breaker closed for pool: ${poolName}`)
      this.emit('circuit_breaker:closed', { poolName })
    }
  }

  /**
   * 检查熔断器是否打开
   */
  private isCircuitBreakerOpen(poolName: string): boolean {
    const breaker = this.circuitBreakers.get(poolName)
    return breaker?.isOpen || false
  }

  /**
   * 重置熔断器
   */
  private resetCircuitBreaker(poolName: string): void {
    this.circuitBreakers.delete(poolName)
  }

  /**
   * 启动指标收集
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      await this.collectMetrics()
    }, 10000) // 每10秒收集一次指标

    console.log('📊 Metrics collection started')
  }

  /**
   * 收集指标
   */
  private async collectMetrics(): Promise<void> {
    for (const [poolName, pool] of this.pools) {
      const stats = this.stats.get(poolName)
      const config = this.configs.get(poolName)

      if (!stats || !config) continue

      // 计算连接利用率
      const connectionUtilization = config.maxConnections ?
        (stats.activeConnections / config.maxConnections) * 100 : 0

      // 计算错误率
      const errorRate = stats.totalAcquires > 0 ?
        (stats.totalErrors / stats.totalAcquires) * 100 : 0

      // 计算运行时间
      const uptime = Date.now() - (stats.uptime || Date.now())

      this.updateStats(poolName, {
        connectionUtilization,
        errorRate,
        uptime
      })

      // 同步到Redis
      if (this.redis) {
        await this.syncStatsToRedis(poolName, stats)
      }
    }
  }

  /**
   * 同步统计信息到Redis
   */
  private async syncStatsToRedis(poolName: string, stats: ConnectionStats): Promise<void> {
    if (!this.redis) return

    try {
      const key = `pool_stats:${poolName}`
      await this.redis.hset(key, {
        ...stats,
        lastUpdated: Date.now().toString()
      })
      await this.redis.expire(key, 300) // 5分钟过期
    } catch (error) {
      console.warn(`Failed to sync stats to Redis for pool ${poolName}:`, error)
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(poolName: string, updates: Partial<ConnectionStats>): void {
    let stats = this.stats.get(poolName)

    if (!stats) {
      stats = this.initializeStats(this.configs.get(poolName)!)
      this.stats.set(poolName, stats)
    }

    // 更新计数器
    if (updates.totalConnections !== undefined) {
      stats.totalConnections += updates.totalConnections
    }
    if (updates.activeConnections !== undefined) {
      stats.activeConnections += updates.activeConnections
    }
    if (updates.totalAcquires !== undefined) {
      stats.totalAcquires += updates.totalAcquires
    }
    if (updates.totalReleases !== undefined) {
      stats.totalReleases += updates.totalReleases
    }
    if (updates.totalErrors !== undefined) {
      stats.totalErrors += updates.totalErrors
    }

    // 更新平均值
    if (updates.averageAcquireTime !== undefined) {
      stats.averageAcquireTime = this.updateAverage(
        stats.averageAcquireTime,
        stats.totalAcquires,
        updates.averageAcquireTime
      )
    }

    if (updates.averageUsageTime !== undefined) {
      stats.averageUsageTime = this.updateAverage(
        stats.averageUsageTime,
        stats.totalReleases,
        updates.averageUsageTime
      )
    }

    // 更新其他字段
    if (updates.connectionUtilization !== undefined) {
      stats.connectionUtilization = updates.connectionUtilization
    }
    if (updates.errorRate !== undefined) {
      stats.errorRate = updates.errorRate
    }
    if (updates.lastError !== undefined) {
      stats.lastError = updates.lastError
    }
    if (updates.lastErrorTime !== undefined) {
      stats.lastErrorTime = updates.lastErrorTime
    }
    if (updates.uptime !== undefined) {
      stats.uptime = updates.uptime
    }
    if (updates.status !== undefined) {
      stats.status = updates.status
    }

    // 计算空闲连接数
    stats.idleConnections = stats.totalConnections - stats.activeConnections
  }

  /**
   * 更新平均值
   */
  private updateAverage(currentAverage: number, count: number, newValue: number): number {
    if (count === 0) return newValue
    return (currentAverage * (count - 1) + newValue) / count
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(config: DatabaseConnectionConfig): ConnectionStats {
    return {
      poolName: config.name,
      type: config.type,
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalAcquires: 0,
      totalReleases: 0,
      totalErrors: 0,
      averageAcquireTime: 0,
      averageUsageTime: 0,
      connectionUtilization: 0,
      errorRate: 0,
      uptime: Date.now(),
      status: PoolStatus.INITIALIZING
    }
  }

  /**
   * 获取所有连接池统计信息
   */
  getStats(): ConnectionStats[] {
    return Array.from(this.stats.values())
  }

  /**
   * 获取特定连接池统计信息
   */
  getPoolStats(poolName: string): ConnectionStats | null {
    return this.stats.get(poolName) || null
  }

  /**
   * 获取健康检查结果
   */
  getHealthCheckResults(): HealthCheckResult[] {
    return Array.from(this.healthCheckResults.values())
  }

  /**
   * 获取连接池状态
   */
  getStatus(): PoolStatus {
    return this.status
  }

  /**
   * 更新负载均衡策略
   */
  setLoadBalanceStrategy(strategy: LoadBalanceStrategy): void {
    this.loadBalanceStrategy = strategy
    this.emit('load_balance_strategy:updated', strategy)
  }

  /**
   * 更新故障转移配置
   */
  updateFailoverConfig(config: Partial<FailoverConfig>): void {
    this.failoverConfig = { ...this.failoverConfig, ...config }

    // 重启健康检查
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    this.startHealthCheck()

    this.emit('failover_config:updated', this.failoverConfig)
  }

  /**
   * 添加新的连接池
   */
  async addPool(config: DatabaseConnectionConfig): Promise<void> {
    if (this.pools.has(config.name)) {
      throw new Error(`Pool '${config.name}' already exists`)
    }

    await this.createPool(config)
    this.emit('pool:added', { poolName: config.name })
  }

  /**
   * 移除连接池
   */
  async removePool(poolName: string): Promise<void> {
    const pool = this.pools.get(poolName)
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`)
    }

    await pool.end()
    this.pools.delete(poolName)
    this.configs.delete(poolName)
    this.stats.delete(poolName)
    this.healthCheckResults.delete(poolName)
    this.circuitBreakers.delete(poolName)
    this.connectionRoundRobin.delete(poolName)

    this.emit('pool:removed', { poolName })
  }

  /**
   * 关闭所有连接池
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down connection pool manager...')

    this.status = PoolStatus.SHUTTING_DOWN

    // 停止定时器
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }

    // 关闭所有连接池
    const shutdownPromises = Array.from(this.pools.entries()).map(
      async ([poolName, pool]) => {
        try {
          await pool.end()
          console.log(`✅ Pool '${poolName}' shutdown successfully`)
        } catch (error) {
          console.error(`❌ Error shutting down pool '${poolName}':`, error)
        }
      }
    )

    await Promise.all(shutdownPromises)

    // 关闭Redis连接
    if (this.redis) {
      await this.redis.quit()
    }

    // 清理数据
    this.pools.clear()
    this.configs.clear()
    this.stats.clear()
    this.healthCheckResults.clear()
    this.circuitBreakers.clear()
    this.connectionRoundRobin.clear()

    this.removeAllListeners()
    this.status = PoolStatus.SHUTTING_DOWN

    console.log('🎊 Connection pool manager shutdown completed')
    this.emit('manager:shutdown')
  }
}

// 导出单例实例
export const connectionPoolManager = new ConnectionPoolManager({
  pools: [
    // 这里应该从环境变量或配置文件中读取
    // 示例配置，实际使用时需要替换为真实配置
  ],
  loadBalanceStrategy: LoadBalanceStrategy.LEAST_CONNECTIONS,
  failoverConfig: {
    enabled: true,
    healthCheckInterval: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
    failoverTimeout: 5000
  }
})

export default ConnectionPoolManager