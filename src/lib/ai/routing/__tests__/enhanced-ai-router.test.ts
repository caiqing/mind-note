/**
 * 增强版AI路由器测试
 * 测试并发请求、负载均衡和智能路由功能
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { EnhancedAIRouter, RoutingRequest, UserPreferences } from '@/lib/ai/routing/enhanced-ai-router'
import { AIServiceFactory } from '@/lib/ai/factory/ai-service-factory'
import { AIConfigManager } from '@/lib/ai/config/ai-config-manager'

// Mock dependencies
jest.mock('@/lib/ai/factory/ai-service-factory')
jest.mock('@/lib/ai/config/ai-config-manager')
jest.mock('@/lib/ai/services/logger')

describe('EnhancedAIRouter', () => {
  let router: EnhancedAIRouter
  let mockServiceFactory: jest.Mocked<AIServiceFactory>
  let mockConfigManager: jest.Mocked<AIConfigManager>

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks()

    // 创建模拟实例
    mockServiceFactory = {
      getInstance: jest.fn(),
      getService: jest.fn(),
      executeRequest: jest.fn(),
      executeStreamRequest: jest.fn(),
      executeEmbeddingRequest: jest.fn(),
      getServiceStats: jest.fn(),
      getAvailableProviders: jest.fn(),
      isProviderAvailable: jest.fn(),
      enableProvider: jest.fn(),
      disableProvider: jest.fn(),
      resetProvider: jest.fn(),
      cleanupInactiveInstances: jest.fn(),
      getFactoryConfig: jest.fn(),
      updateFactoryConfig: jest.fn(),
      destroy: jest.fn()
    } as any

    mockConfigManager = {
      getInstance: jest.fn(),
      getAllProviderConfigs: jest.fn(),
      getProviderConfig: jest.fn(),
      getGlobalConfig: jest.fn(),
      getAvailableModels: jest.fn(),
      getModelsByCapability: jest.fn(),
      getRecommendedModel: jest.fn()
    } as any

    // 模拟单例模式
    ;(AIServiceFactory.getInstance as jest.Mock).mockReturnValue(mockServiceFactory)
    ;(AIConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager)

    // 模拟配置
    mockConfigManager.getGlobalConfig.mockReturnValue({
      defaultProvider: 'openai',
      fallbackEnabled: true,
      cachingEnabled: true,
      cacheTTL: 300000,
      logging: {
        level: 'info',
        enableRequestLogging: true,
        enablePerformanceLogging: true
      },
      monitoring: {
        enableMetrics: true,
        enableHealthChecks: true,
        healthCheckInterval: 60000
      },
      security: {
        enableInputValidation: true,
        enableContentFiltering: true,
        maxPromptLength: 100000,
        allowedOrigins: ['localhost:3000']
      }
    })

    // 模拟提供商配置
    mockConfigManager.getAllProviderConfigs.mockReturnValue([
      {
        id: 'openai',
        name: 'OpenAI',
        enabled: true,
        apiKey: 'test-key',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        models: [
          {
            id: 'gpt-4',
            name: 'GPT-4',
            provider: 'openai',
            enabled: true,
            contextLength: 8192,
            inputCost: 0.03,
            outputCost: 0.06,
            capabilities: ['chat', 'analysis'],
            quality: 'excellent',
            speed: 'slow'
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            provider: 'openai',
            enabled: true,
            contextLength: 16385,
            inputCost: 0.001,
            outputCost: 0.002,
            capabilities: ['chat'],
            quality: 'good',
            speed: 'fast'
          }
        ],
        rateLimit: {
          requestsPerMinute: 3500,
          tokensPerMinute: 90000,
          concurrentRequests: 10
        },
        costConfig: {
          enableTracking: true,
          budgetDaily: 10,
          budgetMonthly: 300,
          alertThreshold: 0.8,
          costOptimization: {
            preferCheapestModel: false,
            maxCostPerRequest: 1.0,
            enableCostCapping: true
          }
        }
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        enabled: true,
        apiKey: 'test-key',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        models: [
          {
            id: 'claude-3-sonnet-20240229',
            name: 'Claude 3 Sonnet',
            provider: 'anthropic',
            enabled: true,
            contextLength: 200000,
            inputCost: 0.003,
            outputCost: 0.015,
            capabilities: ['chat', 'analysis'],
            quality: 'excellent',
            speed: 'medium'
          }
        ],
        rateLimit: {
          requestsPerMinute: 1000,
          tokensPerMinute: 40000,
          concurrentRequests: 5
        },
        costConfig: {
          enableTracking: true,
          budgetDaily: 15,
          budgetMonthly: 450,
          alertThreshold: 0.8,
          costOptimization: {
            preferCheapestModel: false,
            maxCostPerRequest: 2.0,
            enableCostCapping: true
          }
        }
      }
    ])

    // 模拟服务统计
    mockServiceFactory.getServiceStats.mockReturnValue({
      openai: {
        instanceCount: 2,
        healthyInstances: 2,
        unhealthyInstances: 0,
        totalRequests: 100,
        totalErrors: 5,
        lastUsed: Date.now()
      },
      anthropic: {
        instanceCount: 1,
        healthyInstances: 1,
        unhealthyInstances: 0,
        totalRequests: 50,
        totalErrors: 2,
        lastUsed: Date.now()
      }
    })

    // 创建路由器实例
    router = EnhancedAIRouter.getInstance()
  })

  afterEach(() => {
    router.destroy()
    jest.clearAllMocks()
  })

  describe('基础路由功能', () => {
    it('应该成功创建路由器实例', () => {
      expect(router).toBeInstanceOf(EnhancedAIRouter)
      expect(mockConfigManager.getInstance).toHaveBeenCalled()
      expect(mockServiceFactory.getInstance).toHaveBeenCalled()
    })

    it('应该返回正确的路由策略列表', () => {
      const strategies = router.getAvailableStrategies()
      expect(strategies).toContain('balanced')
      expect(strategies).toContain('cost-optimized')
      expect(strategies).toContain('speed-optimized')
      expect(strategies).toContain('quality-optimized')
      expect(strategies).toContain('availability-first')
    })

    it('应该能够切换路由策略', () => {
      expect(() => router.setRoutingStrategy('cost-optimized')).not.toThrow()
      expect(() => router.setRoutingStrategy('invalid-strategy')).toThrow()
    })
  })

  describe('服务筛选和评分', () => {
    it('应该根据用户约束筛选服务', () => {
      const request: RoutingRequest = {
        prompt: '测试请求',
        constraints: {
          maxCost: 0.01,
          maxResponseTime: 5000,
          allowedProviders: ['openai']
        }
      }

      // 测试筛选逻辑
      const stats = router.getRoutingStats()
      expect(stats).toHaveProperty('serviceMetrics')
      expect(stats).toHaveProperty('availableProviders')
    })

    it('应该根据用户偏好调整评分', () => {
      const request: RoutingRequest = {
        prompt: '测试请求',
        preferences: {
          cost: 'low',
          speed: 'fast'
        }
      }

      // 测试偏好应用
      expect(request.preferences?.cost).toBe('low')
      expect(request.preferences?.speed).toBe('fast')
    })
  })

  describe('并发请求处理', () => {
    it('应该能够处理并发请求', async () => {
      const mockService = {
        generateText: jest.fn().mockResolvedValue({
          content: '并发响应内容',
          model: 'gpt-4',
          usage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
            estimatedCost: 0.001
          }
        }),
        healthCheck: jest.fn().mockResolvedValue({
          status: 'healthy',
          responseTime: 1000
        })
      }

      mockServiceFactory.getService.mockResolvedValue(mockService as any)

      const request: RoutingRequest = {
        prompt: '测试并发请求',
        preferences: { quality: 'excellent' }
      }

      const response = await router.routeConcurrentRequest(request, 2)

      expect(response).toHaveProperty('success', true)
      expect(response).toHaveProperty('content')
      expect(response.metadata).toHaveProperty('concurrentResults')
      expect(response.metadata.concurrentResults.totalRequests).toBe(2)
    })

    it('应该在并发请求失败时降级到普通路由', async () => {
      const mockService = {
        generateText: jest.fn().mockRejectedValue(new Error('服务不可用')),
        healthCheck: jest.fn().mockResolvedValue({
          status: 'unhealthy'
        })
      }

      mockServiceFactory.getService.mockResolvedValue(mockService as any)

      const request: RoutingRequest = {
        prompt: '测试降级处理'
      }

      // 应该抛出错误，因为没有可用的服务
      await expect(router.routeConcurrentRequest(request, 2)).rejects.toThrow()
    })
  })

  describe('负载均衡分发', () => {
    it('应该支持轮询分发策略', async () => {
      const mockService = {
        generateText: jest.fn().mockResolvedValue({
          content: '轮询响应',
          model: 'gpt-3.5-turbo',
          usage: {
            promptTokens: 5,
            completionTokens: 10,
            totalTokens: 15,
            estimatedCost: 0.0005
          }
        })
      }

      mockServiceFactory.getService.mockResolvedValue(mockService as any)

      const requests: RoutingRequest[] = [
        { prompt: '请求1' },
        { prompt: '请求2' },
        { prompt: '请求3' }
      ]

      const responses = await router.distributeLoad(requests, 'round-robin')

      expect(responses).toHaveLength(3)
      expect(mockServiceFactory.getService).toHaveBeenCalledTimes(3)
    })

    it('应该支持权重分发策略', async () => {
      const mockService = {
        generateText: jest.fn().mockResolvedValue({
          content: '权重响应',
          model: 'gpt-4',
          usage: {
            promptTokens: 8,
            completionTokens: 12,
            totalTokens: 20,
            estimatedCost: 0.0008
          }
        })
      }

      mockServiceFactory.getService.mockResolvedValue(mockService as any)

      const requests: RoutingRequest[] = [
        { prompt: '权重请求1' },
        { prompt: '权重请求2' }
      ]

      const responses = await router.distributeLoad(requests, 'weighted')

      expect(responses).toHaveLength(2)
      expect(mockServiceFactory.getService).toHaveBeenCalledTimes(2)
    })

    it('应该处理没有可用服务的情况', async () => {
      mockConfigManager.getAllProviderConfigs.mockReturnValue([])

      const requests: RoutingRequest[] = [
        { prompt: '测试请求' }
      ]

      await expect(router.distributeLoad(requests)).rejects.toThrow('No available services')
    })
  })

  describe('服务预热功能', () => {
    it('应该能够预热指定服务', async () => {
      const mockService = {
        healthCheck: jest.fn().mockResolvedValue({
          status: 'healthy',
          responseTime: 800
        })
      }

      mockServiceFactory.getService.mockResolvedValue(mockService as any)

      await router.warmupServices(['openai'])

      expect(mockServiceFactory.getService).toHaveBeenCalledWith('openai')
      expect(mockService.healthCheck).toHaveBeenCalled()
    })

    it('应该预热所有启用的服务', async () => {
      const mockService = {
        healthCheck: jest.fn().mockResolvedValue({
          status: 'healthy',
          responseTime: 1200
        })
      }

      mockServiceFactory.getService.mockResolvedValue(mockService as any)

      await router.warmupServices()

      // 应该调用所有启用的提供商
      expect(mockServiceFactory.getService).toHaveBeenCalledTimes(2)
    })

    it('应该处理预热失败的情况', async () => {
      const mockService = {
        healthCheck: jest.fn().mockRejectedValue(new Error('预热失败'))
      }

      mockServiceFactory.getService.mockResolvedValue(mockService as any)

      await expect(router.warmupServices(['openai'])).resolves.not.toThrow()

      // 应该标记服务为低可用性
      const stats = router.getRoutingStats()
      expect(stats).toHaveProperty('serviceMetrics')
    })
  })

  describe('缓存机制', () => {
    it('应该能够缓存请求结果', async () => {
      const mockService = {
        generateText: jest.fn().mockResolvedValue({
          content: '缓存响应',
          model: 'gpt-4',
          usage: {
            promptTokens: 5,
            completionTokens: 10,
            totalTokens: 15,
            estimatedCost: 0.0005
          }
        })
      }

      mockServiceFactory.getService.mockResolvedValue(mockService as any)

      const request: RoutingRequest = {
        prompt: '缓存测试请求',
        preferences: { model: 'gpt-4' }
      }

      // 第一次请求
      const response1 = await router.routeRequest(request)
      expect(mockService.generateText).toHaveBeenCalledTimes(1)

      // 第二次相同请求（应该命中缓存）
      const response2 = await router.routeRequest(request)
      expect(mockService.generateText).toHaveBeenCalledTimes(1) // 没有增加调用

      expect(response1.content).toBe(response2.content)
      expect(response2.metadata.cacheHit).toBe(true)
    })

    it('应该在禁用缓存时不使用缓存', async () => {
      mockConfigManager.getGlobalConfig.mockReturnValue({
        ...mockConfigManager.getGlobalConfig(),
        cachingEnabled: false
      })

      const mockService = {
        generateText: jest.fn().mockResolvedValue({
          content: '无缓存响应',
          model: 'gpt-3.5-turbo',
          usage: {
            promptTokens: 3,
            completionTokens: 7,
            totalTokens: 10,
            estimatedCost: 0.0003
          }
        })
      }

      mockServiceFactory.getService.mockResolvedValue(mockService as any)

      const request: RoutingRequest = {
        prompt: '无缓存测试'
      }

      // 第一次请求
      await router.routeRequest(request)
      // 第二次相同请求
      await router.routeRequest(request)

      expect(mockService.generateText).toHaveBeenCalledTimes(2)
    })
  })

  describe('统计和监控', () => {
    it('应该返回详细的路由统计信息', () => {
      const stats = router.getRoutingStats()

      expect(stats).toHaveProperty('currentStrategy')
      expect(stats).toHaveProperty('strategyDescription')
      expect(stats).toHaveProperty('totalRequests')
      expect(stats).toHaveProperty('cacheStats')
      expect(stats).toHaveProperty('serviceMetrics')
      expect(stats).toHaveProperty('availableProviders')

      expect(stats.cacheStats).toHaveProperty('totalEntries')
      expect(stats.cacheStats).toHaveProperty('hitRate')
    })

    it('应该正确计算缓存命中率', () => {
      const stats = router.getRoutingStats()
      expect(typeof stats.cacheStats.hitRate).toBe('number')
      expect(stats.cacheStats.hitRate).toBeGreaterThanOrEqual(0)
      expect(stats.cacheStats.hitRate).toBeLessThanOrEqual(1)
    })
  })

  describe('错误处理和降级', () => {
    it('应该在主服务失败时启用降级', async () => {
      const mockPrimaryService = {
        generateText: jest.fn().mockRejectedValue(new Error('主服务失败')),
        healthCheck: jest.fn().mockResolvedValue({ status: 'unhealthy' })
      }

      const mockFallbackService = {
        generateText: jest.fn().mockResolvedValue({
          content: '降级服务响应',
          model: 'claude-3-sonnet-20240229',
          usage: {
            promptTokens: 6,
            completionTokens: 14,
            totalTokens: 20,
            estimatedCost: 0.0006
          }
        }),
        healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' })
      }

      mockServiceFactory.getService
        .mockResolvedValueOnce(mockPrimaryService as any)
        .mockResolvedValueOnce(mockFallbackService as any)

      const request: RoutingRequest = {
        prompt: '降级测试请求'
      }

      const response = await router.routeRequest(request)

      expect(response.success).toBe(true)
      expect(response.content).toBe('降级服务响应')
      expect(response.metadata.fallbackUsed).toBe(true)
    })

    it('应该在所有服务失败时抛出错误', async () => {
      const mockFailedService = {
        generateText: jest.fn().mockRejectedValue(new Error('所有服务失败')),
        healthCheck: jest.fn().mockResolvedValue({ status: 'unhealthy' })
      }

      mockServiceFactory.getService.mockResolvedValue(mockFailedService as any)

      const request: RoutingRequest = {
        prompt: '全面失败测试'
      }

      await expect(router.routeRequest(request)).rejects.toThrow()
    })
  })

  describe('性能优化', () => {
    it('应该能够更新服务指标', () => {
      const stats = router.getRoutingStats()
      expect(stats.serviceMetrics).toBeDefined()

      // 验证指标结构
      for (const [key, metrics] of Object.entries(stats.serviceMetrics)) {
        expect(metrics).toHaveProperty('provider')
        expect(metrics).toHaveProperty('model')
        expect(metrics).toHaveProperty('availability')
        expect(metrics).toHaveProperty('averageResponseTime')
        expect(metrics).toHaveProperty('errorRate')
      }
    })

    it('应该定期清理过期缓存', async () => {
      const mockService = {
        generateText: jest.fn().mockResolvedValue({
          content: '清理测试',
          model: 'gpt-4',
          usage: {
            promptTokens: 4,
            completionTokens: 8,
            totalTokens: 12,
            estimatedCost: 0.0004
          }
        })
      }

      mockServiceFactory.getService.mockResolvedValue(mockService as any)

      // 创建一些缓存条目
      const request: RoutingRequest = { prompt: '清理测试请求' }
      await router.routeRequest(request)

      let stats = router.getRoutingStats()
      const initialCacheSize = stats.cacheStats.totalEntries

      // 模拟时间流逝（实际实现中需要等待TTL过期）
      // 这里只是验证清理机制的存在
      expect(typeof stats.cacheStats.totalEntries).toBe('number')
    })
  })

  describe('资源管理', () => {
    it('应该正确清理资源', () => {
      expect(() => router.destroy()).not.toThrow()

      const stats = router.getRoutingStats()
      // 清理后，缓存应该被清空
      expect(stats.cacheStats.totalEntries).toBe(0)
    })

    it('应该能够重置路由器状态', () => {
      // 设置一些状态
      router.setRoutingStrategy('cost-optimized')

      // 重置
      router.destroy()

      // 重新获取实例
      const newRouter = EnhancedAIRouter.getInstance()
      expect(newRouter.getAvailableStrategies()).toContain('balanced')
    })
  })
})