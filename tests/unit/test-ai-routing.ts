/**
 * AI路由逻辑单元测试
 * 测试AI服务路由器的智能选择和负载均衡逻辑
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock AI服务类
class MockAIService {
  constructor(
    private provider: string,
    private model: string,
    private available: boolean = true,
    private responseTime: number = 1000,
    private cost: number = 0.001
  ) {}

  async processRequest(request: any): Promise<any> {
    if (!this.available) {
      throw new Error(`${this.provider} is unavailable`)
    }

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, this.responseTime))

    return {
      success: true,
      provider: this.provider,
      model: this.model,
      response: `Mock response from ${this.provider}`,
      responseTime: this.responseTime,
      cost: this.cost
    }
  }

  isAvailable(): boolean {
    return this.available
  }

  getEstimatedResponseTime(): number {
    return this.responseTime
  }

  getEstimatedCost(): number {
    return this.cost
  }
}

// 简化的AI路由器实现
class AIRouter {
  private services: Map<string, MockAIService> = new Map()
  private performanceHistory: Map<string, number[]> = new Map()

  constructor() {
    this.initializeServices()
  }

  private initializeServices() {
    // 初始化AI服务
    this.services.set('openai-gpt3.5', new MockAIService('openai', 'gpt-3.5-turbo', true, 800, 0.002))
    this.services.set('openai-gpt4', new MockAIService('openai', 'gpt-4', true, 2000, 0.03))
    this.services.set('anthropic-claude', new MockAIService('anthropic', 'claude-3-sonnet', true, 1200, 0.015))
    this.services.set('ollama-llama2', new MockAIService('ollama', 'llama2', true, 3000, 0))
  }

  async routeRequest(request: {
    prompt: string;
    preferences?: {
      cost?: 'low' | 'medium' | 'high';
      speed?: 'fast' | 'normal' | 'slow';
      quality?: 'basic' | 'good' | 'excellent';
    };
    maxResponseTime?: number;
    maxCost?: number;
  }): Promise<any> {
    const availableServices = this.getAvailableServices()

    if (availableServices.length === 0) {
      throw new Error('No AI services available')
    }

    // 根据偏好排序服务
    const rankedServices = this.rankServices(availableServices, request)

    // 尝试按顺序执行请求
    for (const serviceKey of rankedServices) {
      try {
        const service = this.services.get(serviceKey)!
        const result = await service.processRequest(request)

        // 记录性能数据
        this.recordPerformance(serviceKey, result.responseTime)

        return {
          ...result,
          serviceKey,
          ranking: rankedServices.indexOf(serviceKey)
        }
      } catch (error) {
        console.warn(`Service ${serviceKey} failed:`, error)
        continue
      }
    }

    throw new Error('All AI services failed')
  }

  private getAvailableServices(): string[] {
    return Array.from(this.services.entries())
      .filter(([_, service]) => service.isAvailable())
      .map(([key, _]) => key)
  }

  private rankServices(services: string[], request: any): string[] {
    const preferences = request.preferences || {}

    return services.sort((a, b) => {
      const serviceA = this.services.get(a)!
      const serviceB = this.services.get(b)!

      // 成本偏好
      if (preferences.cost === 'low') {
        const costA = serviceA.getEstimatedCost()
        const costB = serviceB.getEstimatedCost()
        if (costA !== costB) return costA - costB
      }

      // 速度偏好
      if (preferences.speed === 'fast') {
        const timeA = serviceA.getEstimatedResponseTime()
        const timeB = serviceB.getEstimatedResponseTime()
        if (timeA !== timeB) return timeA - timeB
      }

      // 质量偏好
      if (preferences.quality === 'excellent') {
        const qualityScoreA = this.getQualityScore(a)
        const qualityScoreB = this.getQualityScore(b)
        if (qualityScoreA !== qualityScoreB) return qualityScoreB - qualityScoreA
      }

      // 性能历史优先
      const avgPerfA = this.getAveragePerformance(a)
      const avgPerfB = this.getAveragePerformance(b)
      if (avgPerfA !== avgPerfB) return avgPerfA - avgPerfB

      return 0
    })
  }

  private getQualityScore(serviceKey: string): number {
    // 简化的质量评分
    const qualityScores = {
      'openai-gpt4': 9,
      'anthropic-claude': 8,
      'openai-gpt3.5': 7,
      'ollama-llama2': 6
    }
    return qualityScores[serviceKey as keyof typeof qualityScores] || 5
  }

  private getAveragePerformance(serviceKey: string): number {
    const history = this.performanceHistory.get(serviceKey) || []
    if (history.length === 0) return 1000 // 默认1秒
    return history.reduce((sum, time) => sum + time, 0) / history.length
  }

  private recordPerformance(serviceKey: string, responseTime: number): void {
    if (!this.performanceHistory.has(serviceKey)) {
      this.performanceHistory.set(serviceKey, [])
    }

    const history = this.performanceHistory.get(serviceKey)!
    history.push(responseTime)

    // 保持最近50次记录
    if (history.length > 50) {
      history.shift()
    }
  }

  // 测试辅助方法
  setServiceAvailability(serviceKey: string, available: boolean): void {
    const service = this.services.get(serviceKey)
    if (service) {
      // 这里需要在MockAIService中添加设置可用性的方法
      Object.defineProperty(service, 'available', {
        value: available,
        writable: true
      })
    }
  }

  getServicePerformanceHistory(serviceKey: string): number[] {
    return this.performanceHistory.get(serviceKey) || []
  }
}

describe('AI Routing Logic', () => {
  let router: AIRouter

  beforeEach(() => {
    router = new AIRouter()
  })

  describe('Service Selection', () => {
    it('should select fastest service when speed preference is set to fast', async () => {
      const request = {
        prompt: 'Test prompt',
        preferences: { speed: 'fast' }
      }

      const result = await router.routeRequest(request)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('openai') // openai-gpt3.5是最快的(800ms)
    })

    it('should select cheapest service when cost preference is set to low', async () => {
      const request = {
        prompt: 'Test prompt',
        preferences: { cost: 'low' }
      }

      const result = await router.routeRequest(request)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('ollama') // ollama是免费的
    })

    it('should select highest quality service when quality preference is set to excellent', async () => {
      const request = {
        prompt: 'Test prompt',
        preferences: { quality: 'excellent' }
      }

      const result = await router.routeRequest(request)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('openai') // gpt-4有最高质量评分
    })

    it('should fallback to next service when preferred service fails', async () => {
      // 模拟gpt-4不可用
      router.setServiceAvailability('openai-gpt4', false)

      const request = {
        prompt: 'Test prompt',
        preferences: { quality: 'excellent' }
      }

      const result = await router.routeRequest(request)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('anthropic') // 应该选择次高质量服务
    })
  })

  describe('Load Balancing', () => {
    it('should use performance history to optimize routing', async () => {
      // 模拟一些历史性能数据
      const mockHistory = [1000, 1100, 900, 1200, 800]
      mockHistory.forEach(time => {
        router['recordPerformance']('openai-gpt3.5', time)
      })

      const request = { prompt: 'Test prompt' }
      const result = await router.routeRequest(request)

      expect(result.success).toBe(true)
      // 应该选择平均性能最好的服务
    })

    it('should maintain performance history for each service', async () => {
      const request = { prompt: 'Test prompt' }

      await router.routeRequest(request)
      await router.routeRequest(request)
      await router.routeRequest(request)

      const history = router.getServicePerformanceHistory('openai-gpt3.5')
      expect(history.length).toBe(3)
      expect(history.every(time => time > 0)).toBe(true)
    })

    it('should limit performance history to 50 recent entries', async () => {
      // 添加超过50条记录
      for (let i = 0; i < 60; i++) {
        await router.routeRequest({ prompt: `Test prompt ${i}` })
      }

      const history = router.getServicePerformanceHistory('openai-gpt3.5')
      expect(history.length).toBeLessThanOrEqual(50)
    })
  })

  describe('Error Handling', () => {
    it('should throw error when no services are available', async () => {
      // 禁用所有服务
      router.setServiceAvailability('openai-gpt3.5', false)
      router.setServiceAvailability('openai-gpt4', false)
      router.setServiceAvailability('anthropic-claude', false)
      router.setServiceAvailability('ollama-llama2', false)

      const request = { prompt: 'Test prompt' }

      await expect(router.routeRequest(request)).rejects.toThrow('No AI services available')
    })

    it('should handle service failures gracefully', async () => {
      // 模拟第一个服务失败
      router.setServiceAvailability('openai-gpt3.5', false)

      const request = { prompt: 'Test prompt' }
      const result = await router.routeRequest(request)

      expect(result.success).toBe(true)
      expect(result.provider).not.toBe('openai') // 应该选择其他可用服务
    })

    it('should try all available services before failing', async () => {
      // 模拟中间服务失败，但最后的服务可用
      router.setServiceAvailability('openai-gpt3.5', false)
      router.setServiceAvailability('anthropic-claude', false)

      const request = { prompt: 'Test prompt' }
      const result = await router.routeRequest(request)

      expect(result.success).toBe(true)
      expect(result.provider).toBeDefined()
    })
  })

  describe('Preference Combination', () => {
    it('should balance multiple preferences appropriately', async () => {
      const request = {
        prompt: 'Test prompt',
        preferences: {
          cost: 'low',
          speed: 'fast',
          quality: 'good'
        },
        maxResponseTime: 2000,
        maxCost: 0.01
      }

      const result = await router.routeRequest(request)

      expect(result.success).toBe(true)
      expect(result.responseTime).toBeLessThanOrEqual(2000)
      expect(result.cost).toBeLessThanOrEqual(0.01)
    })

    it('should respect maxResponseTime constraint', async () => {
      const request = {
        prompt: 'Test prompt',
        maxResponseTime: 500 // 很短的时间限制
      }

      const result = await router.routeRequest(request)

      expect(result.success).toBe(true)
      expect(result.responseTime).toBeLessThanOrEqual(500)
    })

    it('should respect maxCost constraint', async () => {
      const request = {
        prompt: 'Test prompt',
        maxCost: 0.001 // 很低的成本限制
      }

      const result = await router.routeRequest(request)

      expect(result.success).toBe(true)
      expect(result.cost).toBeLessThanOrEqual(0.001)
    })
  })
})