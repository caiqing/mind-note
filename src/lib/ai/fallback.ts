/**
 * AI服务降级机制
 * 提供智能的服务降级、错误恢复和备用方案管理
 */

import { AIRequest, AIResponse } from '@/../../ai-services/routing/ai-service-router'

export interface FallbackStrategy {
  id: string
  name: string
  description: string
  priority: number
  conditions: FallbackCondition[]
  actions: FallbackAction[]
  recoveryActions?: FallbackAction[]
  cooldownPeriod: number // 冷却期（毫秒）
}

export interface FallbackCondition {
  type: 'error_rate' | 'response_time' | 'cost_limit' | 'availability' | 'custom'
  threshold: number
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  timeWindow?: number // 时间窗口（毫秒）
  metric?: string
}

export interface FallbackAction {
  type: 'switch_provider' | 'switch_model' | 'reduce_quality' | 'increase_timeout' | 'enable_cache' | 'retry_later' | 'custom'
  parameters?: Record<string, any>
}

export interface ServiceHealth {
  provider: string
  model: string
  available: boolean
  responseTime: number
  errorRate: number
  lastCheck: Date
  consecutiveFailures: number
  lastError?: Error
}

export interface FallbackLog {
  id: string
  timestamp: Date
  trigger: {
    strategy: string
    condition: string
    value: number
    threshold: number
  }
  actions: FallbackAction[]
  result: {
    success: boolean
    provider: string
    model: string
    responseTime: number
  }
  resolved: boolean
  resolvedAt?: Date
}

export class AIFallbackManager {
  private static instance: AIFallbackManager
  private strategies: Map<string, FallbackStrategy> = new Map()
  private serviceHealth: Map<string, ServiceHealth> = new Map()
  private fallbackLogs: FallbackLog[] = []
  private activeFallbacks: Map<string, { strategyId: string; activatedAt: Date }> = new Map()
  private maxLogEntries = 1000
  private healthCheckInterval?: NodeJS.Timeout

  private constructor() {
    this.initializeDefaultStrategies()
    this.startHealthMonitoring()
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
  }

  static getInstance(): AIFallbackManager {
    if (!AIFallbackManager.instance) {
      AIFallbackManager.instance = new AIFallbackManager()
    }
    return AIFallbackManager.instance
  }

  /**
   * 检查并执行降级策略
   */
  async checkAndExecuteFallback(
    serviceKey: string,
    request: AIRequest,
    error?: Error
  ): Promise<{
    shouldFallback: boolean
    fallbackResponse?: AIResponse
    strategy?: FallbackStrategy
  }> {
    const health = this.serviceHealth.get(serviceKey)
    if (!health) {
      return { shouldFallback: false }
    }

    // 更新健康状态
    if (error) {
      this.updateServiceHealth(serviceKey, false, error)
    }

    // 检查是否有活跃的降级策略
    const activeFallback = this.activeFallbacks.get(serviceKey)
    if (activeFallback) {
      const strategy = this.strategies.get(activeFallback.strategyId)
      if (strategy && this.isFallbackActive(serviceKey, strategy)) {
        return {
          shouldFallback: true,
          strategy
        }
      }
    }

    // 检查是否需要触发新的降级策略
    const triggeredStrategy = this.evaluateStrategies(serviceKey, health)
    if (triggeredStrategy) {
      const success = await this.executeFallbackStrategy(serviceKey, triggeredStrategy, request)

      if (success) {
        return {
          shouldFallback: true,
          strategy: triggeredStrategy
        }
      }
    }

    return { shouldFallback: false }
  }

  /**
   * 获取推荐的备用服务
   */
  getRecommendedServices(
    originalService: string,
    request: AIRequest,
    excludeProviders?: string[]
  ): Array<{ serviceKey: string; provider: string; model: string; score: number }> {
    const recommendations = []
    const exclude = excludeProviders || []

    for (const [serviceKey, health] of this.serviceHealth.entries()) {
      if (serviceKey === originalService) continue
      if (!health.available) continue
      if (exclude.includes(health.provider)) continue

      const score = this.calculateServiceScore(serviceKey, health, request)
      recommendations.push({
        serviceKey,
        provider: health.provider,
        model: health.model,
        score
      })
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // 返回前3个推荐
  }

  /**
   * 手动激活降级策略
   */
  async activateFallback(
    strategyId: string,
    serviceKey: string,
    reason?: string
  ): Promise<boolean> {
    const strategy = this.strategies.get(strategyId)
    if (!strategy) {
      throw new Error(`Fallback strategy ${strategyId} not found`)
    }

    this.activeFallbacks.set(serviceKey, {
      strategyId,
      activatedAt: new Date()
    })

    this.logFallback(strategyId, {
      strategy: strategyId,
      condition: 'manual_activation',
      value: 0,
      threshold: 0
    }, [], {
      success: true,
      provider: 'manual',
      model: 'manual',
      responseTime: 0
    }, false, reason)

    return true
  }

  /**
   * 手动恢复服务
   */
  async recoverService(serviceKey: string): Promise<boolean> {
    const activeFallback = this.activeFallbacks.get(serviceKey)
    if (!activeFallback) {
      return false // 没有活跃的降级策略
    }

    const strategy = this.strategies.get(activeFallback.strategyId)
    if (strategy?.recoveryActions) {
      // 执行恢复动作
      for (const action of strategy.recoveryActions) {
        await this.executeAction(action, serviceKey)
      }
    }

    this.activeFallbacks.delete(serviceKey)

    // 重置健康状态
    const health = this.serviceHealth.get(serviceKey)
    if (health) {
      health.consecutiveFailures = 0
      health.lastError = undefined
    }

    return true
  }

  /**
   * 获取降级状态
   */
  getFallbackStatus(): {
    activeFallbacks: Array<{ serviceKey: string; strategy: FallbackStrategy; activatedAt: Date }>
    serviceHealth: Record<string, ServiceHealth>
    recentLogs: FallbackLog[]
    strategies: FallbackStrategy[]
  } {
    const activeFallbacks = []

    for (const [serviceKey, fallback] of this.activeFallbacks.entries()) {
      const strategy = this.strategies.get(fallback.strategyId)
      if (strategy) {
        activeFallbacks.push({
          serviceKey,
          strategy,
          activatedAt: fallback.activatedAt
        })
      }
    }

    const serviceHealth: Record<string, ServiceHealth> = {}
    for (const [key, health] of this.serviceHealth.entries()) {
      serviceHealth[key] = health
    }

    return {
      activeFallbacks,
      serviceHealth,
      recentLogs: this.fallbackLogs.slice(-10).reverse(),
      strategies: Array.from(this.strategies.values())
    }
  }

  /**
   * 添加自定义降级策略
   */
  addStrategy(strategy: FallbackStrategy): void {
    this.strategies.set(strategy.id, strategy)
  }

  /**
   * 移除降级策略
   */
  removeStrategy(strategyId: string): void {
    this.strategies.delete(strategyId)
    // 清理相关的活跃降级
    for (const [serviceKey, fallback] of this.activeFallbacks.entries()) {
      if (fallback.strategyId === strategyId) {
        this.activeFallbacks.delete(serviceKey)
      }
    }
  }

  /**
   * 更新服务健康状态
   */
  updateServiceHealth(
    serviceKey: string,
    available: boolean,
    error?: Error,
    responseTime?: number
  ): void {
    let health = this.serviceHealth.get(serviceKey)

    if (!health) {
      health = {
        provider: serviceKey.split('-')[0],
        model: serviceKey.split('-').slice(1).join('-'),
        available: false,
        responseTime: 0,
        errorRate: 0,
        lastCheck: new Date(),
        consecutiveFailures: 0
      }
      this.serviceHealth.set(serviceKey, health)
    }

    health.lastCheck = new Date()

    if (available) {
      health.available = true
      health.consecutiveFailures = 0
      health.lastError = undefined
      if (responseTime) {
        health.responseTime = responseTime
      }
    } else {
      health.available = false
      health.consecutiveFailures++
      if (error) {
        health.lastError = error
      }
    }

    // 更新错误率（简化计算）
    health.errorRate = Math.min(1, health.consecutiveFailures / 10)
  }

  // 私有方法

  private initializeDefaultStrategies(): void {
    // 高错误率降级策略
    this.strategies.set('high_error_rate', {
      id: 'high_error_rate',
      name: '高错误率降级',
      description: '当服务错误率超过阈值时切换到备用服务',
      priority: 1,
      conditions: [
        {
          type: 'error_rate',
          threshold: 0.3,
          operator: 'gte',
          timeWindow: 300000 // 5分钟
        }
      ],
      actions: [
        {
          type: 'switch_provider',
          parameters: { excludeProvider: 'current' }
        }
      ],
      cooldownPeriod: 600000 // 10分钟
    })

    // 响应时间过长降级策略
    this.strategies.set('slow_response', {
      id: 'slow_response',
      name: '响应时间过长降级',
      description: '当服务响应时间超过阈值时切换到更快的模型',
      priority: 2,
      conditions: [
        {
          type: 'response_time',
          threshold: 5000,
          operator: 'gt',
          timeWindow: 180000 // 3分钟
        }
      ],
      actions: [
        {
          type: 'switch_model',
          parameters: { preferFast: true }
        }
      ],
      recoveryActions: [
        {
          type: 'switch_model',
          parameters: { restoreOriginal: true }
        }
      ],
      cooldownPeriod: 300000 // 5分钟
    })

    // 服务不可用降级策略
    this.strategies.set('service_unavailable', {
      id: 'service_unavailable',
      name: '服务不可用降级',
      description: '当服务完全不可用时切换到其他提供商',
      priority: 0,
      conditions: [
        {
          type: 'availability',
          threshold: 0,
          operator: 'eq'
        }
      ],
      actions: [
        {
          type: 'switch_provider',
          parameters: {}
        }
      ],
      cooldownPeriod: 900000 // 15分钟
    })

    // 成本限制降级策略
    this.strategies.set('cost_limit', {
      id: 'cost_limit',
      name: '成本控制降级',
      description: '当成本超过预算时切换到更经济的模型',
      priority: 3,
      conditions: [
        {
          type: 'cost_limit',
          threshold: 0.8,
          operator: 'gte',
          timeWindow: 3600000 // 1小时
        }
      ],
      actions: [
        {
          type: 'switch_model',
          parameters: { preferCheap: true }
        },
        {
          type: 'enable_cache',
          parameters: { ttl: 3600 }
        }
      ],
      cooldownPeriod: 1800000 // 30分钟
    })
  }

  private evaluateStrategies(
    serviceKey: string,
    health: ServiceHealth
  ): FallbackStrategy | null {
    for (const strategy of Array.from(this.strategies.values()).sort((a, b) => a.priority - b.priority)) {
      if (this.shouldTriggerStrategy(serviceKey, strategy, health)) {
        return strategy
      }
    }
    return null
  }

  private shouldTriggerStrategy(
    serviceKey: string,
    strategy: FallbackStrategy,
    health: ServiceHealth
  ): boolean {
    // 检查冷却期
    const activeFallback = this.activeFallbacks.get(serviceKey)
    if (activeFallback && activeFallback.strategyId === strategy.id) {
      const timeSinceActivation = Date.now() - activeFallback.activatedAt.getTime()
      if (timeSinceActivation < strategy.cooldownPeriod) {
        return false
      }
    }

    // 检查所有条件
    return strategy.conditions.every(condition =>
      this.evaluateCondition(condition, health)
    )
  }

  private evaluateCondition(
    condition: FallbackCondition,
    health: ServiceHealth
  ): boolean {
    let value = 0

    switch (condition.type) {
      case 'error_rate':
        value = health.errorRate
        break
      case 'response_time':
        value = health.responseTime
        break
      case 'availability':
        value = health.available ? 1 : 0
        break
      default:
        return false
    }

    switch (condition.operator) {
      case 'gt': return value > condition.threshold
      case 'gte': return value >= condition.threshold
      case 'lt': return value < condition.threshold
      case 'lte': return value <= condition.threshold
      case 'eq': return value === condition.threshold
      default: return false
    }
  }

  private async executeFallbackStrategy(
    serviceKey: string,
    strategy: FallbackStrategy,
    request: AIRequest
  ): Promise<boolean> {
    try {
      // 激活降级策略
      this.activeFallbacks.set(serviceKey, {
        strategyId: strategy.id,
        activatedAt: new Date()
      })

      // 执行降级动作
      for (const action of strategy.actions) {
        await this.executeAction(action, serviceKey)
      }

      // 记录日志
      this.logFallback(strategy.id, {
        strategy: strategy.id,
        condition: 'automatic',
        value: 0,
        threshold: 0
      }, strategy.actions, {
        success: true,
        provider: 'fallback',
        model: 'fallback',
        responseTime: 0
      }, false)

      return true
    } catch (error) {
      console.error(`Failed to execute fallback strategy ${strategy.id}:`, error)
      return false
    }
  }

  private async executeAction(
    action: FallbackAction,
    serviceKey: string
  ): Promise<void> {
    switch (action.type) {
      case 'switch_provider':
        // 这里应该实现提供商切换逻辑
        console.log(`Switching provider for ${serviceKey}`, action.parameters)
        break
      case 'switch_model':
        // 这里应该实现模型切换逻辑
        console.log(`Switching model for ${serviceKey}`, action.parameters)
        break
      case 'reduce_quality':
        // 这里应该实现质量降低逻辑
        console.log(`Reducing quality for ${serviceKey}`, action.parameters)
        break
      case 'enable_cache':
        // 这里应该实现缓存启用逻辑
        console.log(`Enabling cache for ${serviceKey}`, action.parameters)
        break
      default:
        console.log(`Executing custom action ${action.type} for ${serviceKey}`, action.parameters)
    }
  }

  private calculateServiceScore(
    serviceKey: string,
    health: ServiceHealth,
    request: AIRequest
  ): number {
    let score = 0

    // 可用性评分
    if (health.available) {
      score += 100
    } else {
      score -= 100
    }

    // 响应时间评分（响应时间越短评分越高）
    if (health.responseTime > 0) {
      score += Math.max(0, 100 - health.responseTime / 50)
    }

    // 错误率评分（错误率越低评分越高）
    score += Math.max(0, 100 * (1 - health.errorRate))

    // 连续失败次数评分
    score -= health.consecutiveFailures * 10

    return Math.max(0, score)
  }

  private isFallbackActive(serviceKey: string, strategy: FallbackStrategy): boolean {
    const activeFallback = this.activeFallbacks.get(serviceKey)
    if (!activeFallback || activeFallback.strategyId !== strategy.id) {
      return false
    }

    const timeSinceActivation = Date.now() - activeFallback.activatedAt.getTime()
    return timeSinceActivation < strategy.cooldownPeriod
  }

  private startHealthMonitoring(): void {
    // 清理旧的定时器
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // 每30秒检查一次服务健康状态
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 30000)
  }

  private async performHealthCheck(): Promise<void> {
    // 这里应该实现实际的健康检查逻辑
    // 现在只是更新时间戳
    for (const [serviceKey, health] of this.serviceHealth.entries()) {
      health.lastCheck = new Date()
    }
  }

  private logFallback(
    strategyId: string,
    trigger: FallbackLog['trigger'],
    actions: FallbackAction[],
    result: FallbackLog['result'],
    resolved: boolean,
    reason?: string
  ): void {
    const log: FallbackLog = {
      id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      trigger,
      actions,
      result,
      resolved,
      resolvedAt: resolved ? new Date() : undefined
    }

    this.fallbackLogs.push(log)

    // 限制日志条目数量
    if (this.fallbackLogs.length > this.maxLogEntries) {
      this.fallbackLogs = this.fallbackLogs.slice(-this.maxLogEntries)
    }

    console.log(`Fallback triggered: ${strategyId}`, { trigger, actions, result, reason })
  }
}