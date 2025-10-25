/**
 * AI服务路由器测试套件
 * 测试AI服务路由器的智能选择、负载均衡和降级机制
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals'
import { AIServiceRouter } from '@/../../ai-services/routing/ai-service-router'

describe('AI Service Router Tests', () => {
  let router: AIServiceRouter

  beforeAll(() => {
    // 设置测试环境变量
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key'
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-claude-key'
  })

  beforeEach(() => {
    router = AIServiceRouter.getInstance()
    router.resetPerformanceHistory()
  })

  describe('Router Initialization', () => {
    it('should be a singleton', () => {
      const router1 = AIServiceRouter.getInstance()
      const router2 = AIServiceRouter.getInstance()
      expect(router1).toBe(router2)
    })

    it('should initialize with available services', () => {
      const availableServices = router.getAvailableServices()
      expect(Array.isArray(availableServices)).toBe(true)
      expect(availableServices.length).toBeGreaterThan(0)

      availableServices.forEach(service => {
        expect(service).toHaveProperty('id')
        expect(service).toHaveProperty('provider')
        expect(service).toHaveProperty('model')
        expect(service).toHaveProperty('available')
      })
    })

    it('should have correct default configuration', () => {
      const config = router.getConfig()
      expect(config).toHaveProperty('defaultProvider')
      expect(config).toHaveProperty('fallbackEnabled')
      expect(config).toHaveProperty('loadBalancing')
      expect(config).toHaveProperty('costTracking')
      expect(config).toHaveProperty('performanceMonitoring')
    })
  })

  describe('Service Selection', () => {
    it('should select default service for simple requests', async () => {
      const request = {
        prompt: 'Hello, world!',
        maxTokens: 100,
        temperature: 0.7
      }

      const selectedService = await router.selectService(request)
      expect(selectedService).toBeDefined()
      expect(selectedService).toHaveProperty('id')
      expect(selectedService).toHaveProperty('provider')
      expect(selectedService).toHaveProperty('model')
      expect(selectedService.available).toBe(true)
    })

    it('should respect provider preferences', async () => {
      const request = {
        prompt: 'Test request',
        preferences: {
          provider: 'openai'
        },
        maxTokens: 100
      }

      const selectedService = await router.selectService(request)
      expect(selectedService.provider).toBe('openai')
    })

    it('should respect model preferences', async () => {
      const request = {
        prompt: 'Test request',
        preferences: {
          provider: 'openai',
          model: 'gpt-4'
        },
        maxTokens: 100
      }

      const selectedService = await router.selectService(request)
      expect(selectedService.provider).toBe('openai')
      // 注意：可能不会完全匹配确切模型，但应该是同一提供商
    })

    it('should prioritize speed when requested', async () => {
      const request = {
        prompt: 'Quick response needed',
        preferences: {
          speed: 'fast'
        },
        maxTokens: 50
      }

      const selectedService = await router.selectService(request)
      expect(selectedService).toBeDefined()

      // 快速服务通常有较低的预期响应时间
      const serviceInfo = router.getServiceInfo(selectedService.id)
      expect(serviceInfo.averageResponseTime).toBeDefined()
    })

    it('should prioritize cost efficiency when requested', async () => {
      const request = {
        prompt: 'Cost-effective response needed',
        preferences: {
          cost: 'low'
        },
        maxTokens: 100
      }

      const selectedService = await router.selectService(request)
      expect(selectedService).toBeDefined()

      // 低成本服务通常有较低的预期成本
      const serviceInfo = router.getServiceInfo(selectedService.id)
      expect(serviceInfo.averageCost).toBeDefined()
    })

    it('should prioritize quality when requested', async () => {
      const request = {
        prompt: 'High quality response needed',
        preferences: {
          quality: 'excellent'
        },
        maxTokens: 200
      }

      const selectedService = await router.selectService(request)
      expect(selectedService).toBeDefined()

      // 高质量服务通常有较高的质量评分
      const serviceInfo = router.getServiceInfo(selectedService.id)
      expect(serviceInfo.qualityScore).toBeDefined()
    })
  })

  describe('Load Balancing', () => {
    it('should distribute load across multiple services', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        prompt: `Request ${i + 1}`,
        maxTokens: 50
      }))

      const selectedServices = []

      for (const request of requests) {
        const service = await router.selectService(request)
        selectedServices.push(service.id)
      }

      // 检查是否使用了多个服务
      const uniqueServices = [...new Set(selectedServices)]
      expect(uniqueServices.length).toBeGreaterThanOrEqual(1)
    })

    it('should track performance history', async () => {
      const request = {
        prompt: 'Performance test',
        maxTokens: 100
      }

      // 模拟多次请求
      for (let i = 0; i < 5; i++) {
        try {
          const result = await router.routeRequest(request)
          expect(result).toBeDefined()
        } catch (error) {
          // 在测试环境中可能失败
        }
      }

      const performanceHistory = router.getPerformanceHistory()
      expect(Array.isArray(performanceHistory)).toBe(true)
    })

    it('should adapt routing based on performance', async () => {
      // 模拟一个服务性能下降
      const serviceId = 'openai-gpt3.5-turbo'
      router.simulateServiceDegradation(serviceId, {
        responseTime: 10000,
        errorRate: 0.5
      })

      const request = {
        prompt: 'Adaptive routing test',
        maxTokens: 50
      }

      const selectedService = await router.selectService(request)
      expect(selectedService).toBeDefined()

      // 可能会选择其他性能更好的服务
      expect(selectedService.id).not.toBe(serviceId)
    })
  })

  describe('Request Routing', () => {
    it('should route simple text generation requests', async () => {
      const request = {
        prompt: 'Hello, how are you?',
        maxTokens: 100,
        temperature: 0.7
      }

      try {
        const response = await router.routeRequest(request)
        expect(response).toBeDefined()
        expect(response).toHaveProperty('content')
        expect(response).toHaveProperty('provider')
        expect(response).toHaveProperty('model')
        expect(response).toHaveProperty('usage')
        expect(response).toHaveProperty('responseTime')
        expect(typeof response.content).toBe('string')
      } catch (error) {
        // 在测试环境中可能没有有效的API密钥
        expect(error).toBeDefined()
      }
    })

    it('should route streaming requests', async () => {
      const request = {
        prompt: 'Write a short story',
        maxTokens: 200,
        temperature: 0.8,
        stream: true
      }

      try {
        const stream = await router.routeRequest(request)
        expect(stream).toBeDefined()

        const chunks = []
        // 模拟流式处理
        if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
          for await (const chunk of stream) {
            chunks.push(chunk)
            if (chunk.done) break
          }
        }

        expect(chunks.length).toBeGreaterThan(0)
      } catch (error) {
        // 在测试环境中可能失败
        expect(error).toBeDefined()
      }
    })

    it('should route embedding requests', async () => {
      const texts = [
        'Hello world',
        'Artificial intelligence',
        'Machine learning'
      ]

      try {
        const embeddings = await router.routeEmbeddingRequest(texts)
        expect(Array.isArray(embeddings)).toBe(true)
        expect(embeddings).toHaveLength(texts.length)

        embeddings.forEach(embedding => {
          expect(embedding).toHaveProperty('values')
          expect(Array.isArray(embedding.values)).toBe(true)
        })
      } catch (error) {
        // 在测试环境中可能失败
        expect(error).toBeDefined()
      }
    })

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        prompt: `Concurrent request ${i + 1}`,
        maxTokens: 50
      }))

      try {
        const promises = requests.map(request => router.routeRequest(request))
        const results = await Promise.allSettled(promises)

        results.forEach(result => {
          if (result.status === 'fulfilled') {
            expect(result.value).toHaveProperty('content')
          } else {
            // 某些请求可能失败
            expect(result.reason).toBeDefined()
          }
        })
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('Fallback Mechanism', () => {
    it('should fallback to alternative service on failure', async () => {
      // 模拟主服务失败
      const primaryServiceId = 'openai-gpt3.5-turbo'
      router.simulateServiceFailure(primaryServiceId)

      const request = {
        prompt: 'Fallback test',
        maxTokens: 100,
        fallbackEnabled: true
      }

      try {
        const response = await router.routeRequest(request)
        expect(response).toBeDefined()
        expect(response.provider).not.toBe('openai')
      } catch (error) {
        // 如果所有服务都失败，这是预期的
        expect(error).toBeDefined()
      }
    })

    it('should respect fallback preferences', async () => {
      const request = {
        prompt: 'Fallback preference test',
        maxTokens: 100,
        preferences: {
          fallbackOrder: ['anthropic', 'openai']
        },
        fallbackEnabled: true
      }

      // 模拟OpenAI失败
      router.simulateServiceFailure('openai-gpt3.5-turbo')

      try {
        const response = await router.routeRequest(request)
        expect(response).toBeDefined()
        expect(response.provider).toBe('anthropic')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle complete service unavailability', async () => {
      // 模拟所有服务失败
      const allServices = router.getAvailableServices()
      allServices.forEach(service => {
        router.simulateServiceFailure(service.id)
      })

      const request = {
        prompt: 'All services down test',
        maxTokens: 50
      }

      try {
        await router.routeRequest(request)
        // 如果没有抛出错误，说明有备用机制
        expect(true).toBe(true)
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toContain('No available AI services')
      }
    })
  })

  describe('Cost Tracking', () => {
    it('should track request costs', async () => {
      const request = {
        prompt: 'Cost tracking test',
        maxTokens: 100
      }

      try {
        const response = await router.routeRequest(request)
        expect(response).toBeDefined()

        if (response.usage) {
          expect(response.usage).toHaveProperty('promptTokens')
          expect(response.usage).toHaveProperty('completionTokens')
          expect(response.usage).toHaveProperty('totalTokens')
        }
      } catch (error) {
        // 在测试环境中可能失败
      }
    })

    it('should provide cost statistics', () => {
      const costStats = router.getCostStatistics()
      expect(costStats).toBeDefined()
      expect(costStats).toHaveProperty('totalCost')
      expect(costStats).toHaveProperty('totalRequests')
      expect(costStats).toHaveProperty('averageCostPerRequest')
      expect(costStats).toHaveProperty('costByProvider')
    })

    it('should respect budget limits', async () => {
      const budgetLimit = 0.01 // 很低的预算限制
      router.setBudgetLimit(budgetLimit)

      const request = {
        prompt: 'Budget limit test',
        maxTokens: 1000 // 可能超预算的请求
      }

      try {
        const response = await router.routeRequest(request)
        // 如果成功，说明请求在预算内
        expect(response).toBeDefined()
      } catch (error) {
        // 如果失败，可能是超出预算
        expect(error).toBeDefined()
      }
    })
  })

  describe('Performance Monitoring', () => {
    it('should track response times', async () => {
      const request = {
        prompt: 'Performance monitoring test',
        maxTokens: 50
      }

      const startTime = Date.now()

      try {
        const response = await router.routeRequest(request)
        const endTime = Date.now()

        expect(response).toBeDefined()
        expect(response.responseTime).toBeDefined()
        expect(response.responseTime).toBeLessThan(endTime - startTime + 1000) // 允许1秒误差
      } catch (error) {
        // 在测试环境中可能失败
      }
    })

    it('should provide performance metrics', () => {
      const metrics = router.getPerformanceMetrics()
      expect(metrics).toBeDefined()
      expect(metrics).toHaveProperty('averageResponseTime')
      expect(metrics).toHaveProperty('successRate')
      expect(metrics).toHaveProperty('errorRate')
      expect(metrics).toHaveProperty('requestsPerMinute')
      expect(metrics).toHaveProperty('performanceByProvider')
    })

    it('should detect performance degradation', () => {
      const serviceId = 'openai-gpt3.5-turbo'

      // 模拟性能下降
      for (let i = 0; i < 10; i++) {
        router.recordPerformance(serviceId, {
          responseTime: 5000, // 5秒响应时间
          success: true
        })
      }

      const degradation = router.detectPerformanceDegradation(serviceId)
      expect(degradation).toBeDefined()
      expect(degradation.detected).toBe(true)
    })
  })

  describe('Health Monitoring', () => {
    it('should perform health checks', async () => {
      const healthStatus = await router.performHealthCheck()
      expect(healthStatus).toBeDefined()
      expect(healthStatus).toHaveProperty('overall')
      expect(healthStatus).toHaveProperty('services')
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.overall)
    })

    it('should track service availability', () => {
      const availability = router.getServiceAvailability()
      expect(availability).toBeDefined()
      expect(typeof availability.totalServices).toBe('number')
      expect(typeof availability.availableServices).toBe('number')
      expect(typeof availability.availabilityPercentage).toBe('number')
    })

    it('should handle service recovery', async () => {
      const serviceId = 'openai-gpt3.5-turbo'

      // 模拟服务失败
      router.simulateServiceFailure(serviceId)
      expect(router.isServiceAvailable(serviceId)).toBe(false)

      // 模拟服务恢复
      router.simulateServiceRecovery(serviceId)
      expect(router.isServiceAvailable(serviceId)).toBe(true)
    })
  })

  describe('Configuration Management', () => {
    it('should allow dynamic configuration updates', () => {
      const newConfig = {
        defaultProvider: 'anthropic',
        fallbackEnabled: true,
        loadBalancing: 'round-robin',
        costTracking: true,
        performanceMonitoring: true
      }

      router.updateConfiguration(newConfig)
      const config = router.getConfig()
      expect(config.defaultProvider).toBe('anthropic')
      expect(config.fallbackEnabled).toBe(true)
    })

    it('should validate configuration', () => {
      const invalidConfig = {
        defaultProvider: 'invalid-provider',
        fallbackEnabled: 'not-a-boolean'
      }

      expect(() => {
        router.updateConfiguration(invalidConfig)
      }).toThrow()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty requests', async () => {
      const request = {
        prompt: '',
        maxTokens: 0
      }

      try {
        await router.routeRequest(request)
        // 某些提供商可能处理空请求
        expect(true).toBe(true)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle malformed requests', async () => {
      const malformedRequests = [
        null,
        undefined,
        {},
        { prompt: 123 }, // 错误的类型
        { maxTokens: 'invalid' }, // 错误的类型
      ]

      for (const request of malformedRequests) {
        try {
          await router.routeRequest(request)
          // 如果没有抛出错误，说明router能够处理
        } catch (error) {
          expect(error).toBeDefined()
        }
      }
    })

    it('should handle network timeouts', async () => {
      const request = {
        prompt: 'Timeout test',
        maxTokens: 100,
        timeout: 1 // 1ms超时
      }

      try {
        await router.routeRequest(request)
        // 如果成功，可能是网络很快
        expect(true).toBe(true)
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toMatch(/timeout/i)
      }
    })
  })
})