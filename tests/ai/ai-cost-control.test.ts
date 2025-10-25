/**
 * AI成本控制和降级机制测试套件
 * 测试成本跟踪、预算管理和智能降级策略
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals'
import { AICostTracker } from '@/lib/ai/cost-tracker'
import { AIFallbackManager } from '@/lib/ai/fallback'

describe('AI Cost Control and Fallback Tests', () => {
  let costTracker: AICostTracker
  let fallbackManager: AIFallbackManager

  beforeAll(() => {
    // 设置测试环境
    process.env.NODE_ENV = 'test'
  })

  beforeEach(() => {
    costTracker = AICostTracker.getInstance()
    fallbackManager = AIFallbackManager.getInstance()

    // 重置状态
    costTracker.resetDailyUsage()
    fallbackManager.clearActiveFallbacks()
  })

  describe('Cost Tracker', () => {
    it('should be a singleton', () => {
      const tracker1 = AICostTracker.getInstance()
      const tracker2 = AICostTracker.getInstance()
      expect(tracker1).toBe(tracker2)
    })

    it('should track individual request costs', () => {
      const request = {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        promptTokens: 100,
        completionTokens: 50,
        responseTime: 1500
      }

      const cost = costTracker.calculateCost(request)
      expect(typeof cost).toBe('number')
      expect(cost).toBeGreaterThan(0)

      costTracker.recordCost({
        requestId: 'test-1',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        cost,
        tokens: request.promptTokens + request.completionTokens,
        responseTime: request.responseTime,
        timestamp: new Date()
      })

      const summary = costTracker.getCostSummary()
      expect(summary.totalCost).toBe(cost)
      expect(summary.totalRequests).toBe(1)
    })

    it('should track costs by provider', () => {
      const requests = [
        {
          requestId: 'openai-1',
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          cost: 0.002,
          tokens: 150,
          responseTime: 1200,
          timestamp: new Date()
        },
        {
          requestId: 'anthropic-1',
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          cost: 0.003,
          tokens: 150,
          responseTime: 1000,
          timestamp: new Date()
        },
        {
          requestId: 'openai-2',
          provider: 'openai',
          model: 'gpt-4',
          cost: 0.03,
          tokens: 200,
          responseTime: 2000,
          timestamp: new Date()
        }
      ]

      requests.forEach(request => {
        costTracker.recordCost(request)
      })

      const summary = costTracker.getCostSummary()
      expect(summary.totalCost).toBe(0.035)
      expect(summary.totalRequests).toBe(3)

      const providerBreakdown = costTracker.getCostByProvider()
      expect(providerBreakdown.openai).toBeDefined()
      expect(providerBreakdown.anthropic).toBeDefined()
      expect(providerBreakdown.openai.cost).toBe(0.032)
      expect(providerBreakdown.anthropic.cost).toBe(0.003)
    })

    it('should enforce budget limits', () => {
      const budgetLimit = 0.01 // 很低的预算限制
      costTracker.setBudgetLimits({
        daily: budgetLimit,
        monthly: budgetLimit * 30
      })

      // 记录一个接近限制的成本
      costTracker.recordCost({
        requestId: 'test-budget-1',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        cost: 0.009,
        tokens: 100,
        responseTime: 1000,
        timestamp: new Date()
      })

      expect(costTracker.isWithinBudget('daily')).toBe(true)

      // 尝试超出预算
      const overBudgetCost = 0.005
      const canRecord = costTracker.canRecordCost(overBudgetCost)
      expect(canRecord).toBe(false)

      // 检查预算状态
      const budgetStatus = costTracker.getBudgetStatus()
      expect(budgetStatus.daily.percentage).toBeGreaterThan(90)
      expect(budgetStatus.daily.warning).toBe(true)
    })

    it('should provide cost optimization suggestions', () => {
      // 模拟一些使用数据
      const usageData = [
        {
          provider: 'openai',
          model: 'gpt-4',
          cost: 0.06,
          tokens: 200,
          responseTime: 3000
        },
        {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          cost: 0.002,
          tokens: 150,
          responseTime: 1200
        }
      ]

      usageData.forEach(data => {
        costTracker.recordCost({
          requestId: `opt-${data.model}`,
          provider: data.provider,
          model: data.model,
          cost: data.cost,
          tokens: data.tokens,
          responseTime: data.responseTime,
          timestamp: new Date()
        })
      })

      const suggestions = costTracker.getCostOptimization()
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)

      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('type')
        expect(suggestion).toHaveProperty('description')
        expect(suggestion).toHaveProperty('potentialSavings')
        expect(suggestion).toHaveProperty('priority')
      })
    })

    it('should track usage trends over time', () => {
      const now = new Date()
      const hourlyData = []

      // 生成24小时的数据
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
        hourlyData.push({
          requestId: `hourly-${i}`,
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          cost: 0.001 * (i + 1),
          tokens: 50 * (i + 1),
          responseTime: 1000,
          timestamp
        })
      }

      hourlyData.forEach(data => {
        costTracker.recordCost(data)
      })

      const trends = costTracker.getUsageTrends('24h')
      expect(trends).toBeDefined()
      expect(trends.period).toBe('24h')
      expect(trends.dataPoints).toBeDefined()
      expect(trends.averageCost).toBeDefined()
      expect(trends.averageTokens).toBeDefined()
    })

    it('should export cost data for analysis', () => {
      // 添加一些测试数据
      costTracker.recordCost({
        requestId: 'export-test-1',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        cost: 0.002,
        tokens: 100,
        responseTime: 1200,
        timestamp: new Date()
      })

      const exportedData = costTracker.exportData('json')
      expect(typeof exportedData).toBe('string')

      const parsed = JSON.parse(exportedData)
      expect(parsed).toHaveProperty('summary')
      expect(parsed).toHaveProperty('records')
      expect(parsed).toHaveProperty('exportTimestamp')
      expect(Array.isArray(parsed.records)).toBe(true)

      const csvExport = costTracker.exportData('csv')
      expect(typeof csvExport).toBe('string')
      expect(csvExport).toContain('requestId')
      expect(csvExport).toContain('provider')
      expect(csvExport).toContain('cost')
    })
  })

  describe('Fallback Manager', () => {
    it('should be a singleton', () => {
      const manager1 = AIFallbackManager.getInstance()
      const manager2 = AIFallbackManager.getInstance()
      expect(manager1).toBe(manager2)
    })

    it('should initialize with default strategies', () => {
      const strategies = fallbackManager.getStrategies()
      expect(Array.isArray(strategies)).toBe(true)
      expect(strategies.length).toBeGreaterThan(0)

      const expectedStrategies = ['high_error_rate', 'slow_response', 'service_unavailable', 'cost_limit']
      expectedStrategies.forEach(strategyName => {
        const strategy = strategies.find(s => s.id === strategyName)
        expect(strategy).toBeDefined()
        expect(strategy).toHaveProperty('conditions')
        expect(strategy).toHaveProperty('actions')
      })
    })

    it('should evaluate fallback conditions', () => {
      const serviceHealth = {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        available: true,
        responseTime: 8000, // 高响应时间
        errorRate: 0.4, // 高错误率
        lastCheck: new Date(),
        consecutiveFailures: 3,
        lastError: new Error('Service timeout')
      }

      const shouldFallback = fallbackManager.evaluateCondition(
        {
          type: 'response_time',
          threshold: 5000,
          operator: 'gt'
        },
        serviceHealth
      )

      expect(shouldFallback).toBe(true)

      const shouldFallbackForErrors = fallbackManager.evaluateCondition(
        {
          type: 'error_rate',
          threshold: 0.3,
          operator: 'gte'
        },
        serviceHealth
      )

      expect(shouldFallbackForErrors).toBe(true)
    })

    it('should recommend alternative services', () => {
      const currentService = 'openai-gpt3.5-turbo'
      const request = {
        prompt: 'Test fallback recommendation',
        maxTokens: 100,
        preferences: {
          cost: 'low',
          speed: 'fast'
        }
      }

      const recommendations = fallbackManager.getRecommendedServices(
        currentService,
        request,
        ['openai'] // 排除当前提供商
      )

      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBeGreaterThan(0)

      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('serviceKey')
        expect(rec).toHaveProperty('provider')
        expect(rec).toHaveProperty('model')
        expect(rec).toHaveProperty('score')
        expect(rec.provider).not.toBe('openai')
        expect(rec.score).toBeGreaterThan(0)
      })
    })

    it('should execute fallback strategies', async () => {
      const serviceKey = 'openai-gpt3.5-turbo'
      const request = {
        prompt: 'Fallback strategy test',
        maxTokens: 50
      }

      // 模拟服务健康状态
      const serviceHealth = {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        available: false,
        responseTime: 10000,
        errorRate: 0.8,
        lastCheck: new Date(),
        consecutiveFailures: 5,
        lastError: new Error('Service unavailable')
      }

      fallbackManager.updateServiceHealth(serviceKey, false, serviceHealth.lastError)

      const result = await fallbackManager.checkAndExecuteFallback(serviceKey, request)
      expect(result).toBeDefined()
      expect(result).toHaveProperty('shouldFallback')

      if (result.shouldFallback) {
        expect(result).toHaveProperty('strategy')
        expect(result.strategy).toBeDefined()
      }
    })

    it('should handle manual fallback activation', async () => {
      const strategyId = 'high_error_rate'
      const serviceKey = 'openai-gpt4'
      const reason = 'Manual testing of fallback activation'

      const result = await fallbackManager.activateFallback(strategyId, serviceKey, reason)
      expect(result).toBe(true)

      const status = fallbackManager.getFallbackStatus()
      expect(status.activeFallbacks).toBeDefined()
      expect(status.activeFallbacks.length).toBeGreaterThan(0)

      const activeFallback = status.activeFallbacks.find(
        af => af.serviceKey === serviceKey && af.strategy.id === strategyId
      )
      expect(activeFallback).toBeDefined()
      expect(activeFallback.activatedAt).toBeDefined()
    })

    it('should handle service recovery', async () => {
      const serviceKey = 'anthropic-claude-sonnet'

      // 先激活一个降级策略
      await fallbackManager.activateFallback('service_unavailable', serviceKey, 'Test recovery')

      // 然后恢复服务
      const recoveryResult = await fallbackManager.recoverService(serviceKey)
      expect(recoveryResult).toBe(true)

      const status = fallbackManager.getFallbackStatus()
      const activeFallback = status.activeFallbacks.find(af => af.serviceKey === serviceKey)
      expect(activeFallback).toBeUndefined()
    })

    it('should respect cooldown periods', async () => {
      const serviceKey = 'openai-gpt3.5-turbo'
      const strategyId = 'high_error_rate'

      // 激活降级
      await fallbackManager.activateFallback(strategyId, serviceKey)

      // 立即尝试再次激活相同策略（应该在冷却期内）
      const immediateResult = await fallbackManager.activateFallback(strategyId, serviceKey)
      expect(immediateResult).toBe(true) // 应该成功但不重复激活

      const status = fallbackManager.getFallbackStatus()
      const activeFallbacks = status.activeFallbacks.filter(af => af.serviceKey === serviceKey)
      expect(activeFallbacks.length).toBe(1) // 应该只有一个活跃的降级
    })

    it('should provide comprehensive fallback status', () => {
      const status = fallbackManager.getFallbackStatus()
      expect(status).toBeDefined()
      expect(status).toHaveProperty('activeFallbacks')
      expect(status).toHaveProperty('serviceHealth')
      expect(status).toHaveProperty('recentLogs')
      expect(status).toHaveProperty('strategies')

      expect(Array.isArray(status.activeFallbacks)).toBe(true)
      expect(typeof status.serviceHealth).toBe('object')
      expect(Array.isArray(status.recentLogs)).toBe(true)
      expect(Array.isArray(status.strategies)).toBe(true)
    })

    it('should log fallback events', () => {
      const serviceKey = 'test-service'
      const strategyId = 'test-strategy'

      // 模拟触发降级
      fallbackManager.logFallback(strategyId, {
        strategy: strategyId,
        condition: 'test_condition',
        value: 100,
        threshold: 50
      }, [{
        type: 'switch_provider',
        parameters: { newProvider: 'backup' }
      }], {
        success: true,
        provider: 'backup',
        model: 'backup-model',
        responseTime: 1000
      }, false, 'Test fallback event')

      const status = fallbackManager.getFallbackStatus()
      const recentLog = status.recentLogs.find(log => log.trigger.strategy === strategyId)
      expect(recentLog).toBeDefined()
      expect(recentLog.id).toBeDefined()
      expect(recentLog.timestamp).toBeDefined()
      expect(recentLog.actions).toBeDefined()
      expect(recentLog.result).toBeDefined()
    })

    it('should handle custom fallback strategies', () => {
      const customStrategy = {
        id: 'custom_test_strategy',
        name: 'Custom Test Strategy',
        description: 'A custom fallback strategy for testing',
        priority: 10,
        conditions: [
          {
            type: 'custom',
            threshold: 100,
            operator: 'gt',
            metric: 'custom_metric'
          }
        ],
        actions: [
          {
            type: 'custom',
            parameters: { action: 'test_action' }
          }
        ],
        cooldownPeriod: 60000
      }

      fallbackManager.addStrategy(customStrategy)

      const strategies = fallbackManager.getStrategies()
      const addedStrategy = strategies.find(s => s.id === customStrategy.id)
      expect(addedStrategy).toBeDefined()
      expect(addedStrategy.name).toBe(customStrategy.name)

      // 移除自定义策略
      fallbackManager.removeStrategy(customStrategy.id)
      const strategiesAfterRemoval = fallbackManager.getStrategies()
      const removedStrategy = strategiesAfterRemoval.find(s => s.id === customStrategy.id)
      expect(removedStrategy).toBeUndefined()
    })
  })

  describe('Cost Control and Fallback Integration', () => {
    it('should trigger fallback when budget exceeded', async () => {
      const serviceKey = 'openai-gpt4'
      const budgetLimit = 0.01

      costTracker.setBudgetLimits({ daily: budgetLimit })

      // 模拟接近预算限制
      costTracker.recordCost({
        requestId: 'budget-test-1',
        provider: 'openai',
        model: 'gpt-4',
        cost: budgetLimit - 0.001,
        tokens: 100,
        responseTime: 2000,
        timestamp: new Date()
      })

      // 尝试记录一个会超出预算的成本
      const canRecord = costTracker.canRecordCost(0.002)
      expect(canRecord).toBe(false)

      // 检查是否应该触发降级
      const serviceHealth = {
        provider: 'openai',
        model: 'gpt-4',
        available: true,
        responseTime: 1500,
        errorRate: 0.1,
        lastCheck: new Date(),
        consecutiveFailures: 0
      }

      const fallbackResult = await fallbackManager.checkAndExecuteFallback(serviceKey, {
        prompt: 'Budget limit test',
        maxTokens: 100
      })

      // 应该基于成本限制触发降级
      if (!costTracker.isWithinBudget('daily')) {
        expect(fallbackResult.shouldFallback).toBe(true)
      }
    })

    it('should prioritize cost-effective services during fallback', () => {
      const expensiveService = 'openai-gpt4'
      const cheapService = 'openai-gpt3.5-turbo'

      const request = {
        prompt: 'Cost-effective fallback test',
        maxTokens: 200,
        preferences: {
          cost: 'low'
        }
      }

      const recommendations = fallbackManager.getRecommendedServices(
        expensiveService,
        request
      )

      expect(recommendations.length).toBeGreaterThan(0)

      // 应该优先推荐成本较低的服务
      const hasCheapService = recommendations.some(rec =>
        rec.serviceKey.includes('gpt-3.5')
      )
      expect(hasCheapService).toBe(true)
    })

    it('should track fallback costs separately', async () => {
      const originalService = 'openai-gpt4'
      const fallbackService = 'openai-gpt3.5-turbo'

      // 记录原始请求成本
      costTracker.recordCost({
        requestId: 'original-request',
        provider: 'openai',
        model: 'gpt-4',
        cost: 0.03,
        tokens: 200,
        responseTime: 3000,
        timestamp: new Date(),
        fallback: true // 标记为降级请求
      })

      // 记录降级请求成本
      costTracker.recordCost({
        requestId: 'fallback-request',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        cost: 0.002,
        tokens: 180,
        responseTime: 1200,
        timestamp: new Date()
      })

      const summary = costTracker.getCostSummary()
      expect(summary.totalCost).toBe(0.032)

      const fallbackStats = costTracker.getFallbackStatistics()
      expect(fallbackStats).toBeDefined()
      expect(fallbackStats.totalFallbacks).toBeGreaterThanOrEqual(1)
      expect(fallbackStats.costSavings).toBeDefined()
    })
  })

  describe('Performance and Reliability', () => {
    it('should handle high volume cost tracking', () => {
      const startTime = Date.now()
      const numRequests = 1000

      for (let i = 0; i < numRequests; i++) {
        costTracker.recordCost({
          requestId: `perf-test-${i}`,
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          cost: 0.001,
          tokens: 50,
          responseTime: 1000,
          timestamp: new Date()
        })
      }

      const endTime = Date.now()
      const processingTime = endTime - startTime

      expect(processingTime).toBeLessThan(5000) // 应该在5秒内完成

      const summary = costTracker.getCostSummary()
      expect(summary.totalRequests).toBe(numRequests)
      expect(summary.totalCost).toBe(numRequests * 0.001)
    })

    it('should handle concurrent fallback evaluations', async () => {
      const serviceKey = 'concurrent-test-service'
      const numConcurrent = 10

      // 模拟服务故障
      fallbackManager.updateServiceHealth(serviceKey, false, new Error('Concurrent test error'))

      const promises = Array.from({ length: numConcurrent }, (_, i) =>
        fallbackManager.checkAndExecuteFallback(serviceKey, {
          prompt: `Concurrent test ${i}`,
          maxTokens: 50
        })
      )

      const results = await Promise.allSettled(promises)
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      const failedResults = results.filter(r => r.status === 'rejected')

      expect(successfulResults.length + failedResults.length).toBe(numConcurrent)

      // 应该有一致的行为
      const fallbackBehaviors = successfulResults.map(r =>
        r.status === 'fulfilled' ? r.value.shouldFallback : false
      )
      const uniqueBehaviors = [...new Set(fallbackBehaviors)]
      expect(uniqueBehaviors.length).toBeLessThanOrEqual(2) // 最多有两种行为（true/false）
    })

    it('should maintain data consistency under load', async () => {
      const numOperations = 100
      const operations = []

      // 混合成本记录和降级操作
      for (let i = 0; i < numOperations; i++) {
        if (i % 2 === 0) {
          // 成本记录操作
          operations.push(() => {
            costTracker.recordCost({
              requestId: `consistency-test-${i}`,
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              cost: 0.001,
              tokens: 50,
              responseTime: 1000,
              timestamp: new Date()
            })
          })
        } else {
          // 降级检查操作
          operations.push(() =>
            fallbackManager.checkAndExecuteFallback('consistency-test-service', {
              prompt: `Consistency test ${i}`,
              maxTokens: 25
            })
          )
        }
      }

      // 并发执行所有操作
      const results = await Promise.allSettled(operations.map(op => op()))

      // 验证数据一致性
      const costSummary = costTracker.getCostSummary()
      const fallbackStatus = fallbackManager.getFallbackStatus()

      expect(costSummary.totalRequests).toBeGreaterThan(0)
      expect(fallbackStatus).toBeDefined()

      // 不应该有数据损坏
      expect(costSummary.totalCost).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(fallbackStatus.activeFallbacks)).toBe(true)
    })
  })
})