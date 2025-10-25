/**
 * AI服务集成测试
 * 验证AI服务连接、响应和错误处理机制
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('AI Services Integration', () => {
  beforeAll(async () => {
    // 设置测试环境
    process.env.NODE_ENV = 'test'
    process.env.AI_TEST_MODE = 'true'
  })

  describe('AI Service Endpoints', () => {
    it('should connect to AI service and return valid response', async () => {
      const response = await fetch('http://localhost:3000/api/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'This is a test prompt',
          provider: 'openai',
          model: 'gpt-3.5-turbo'
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('provider')
      expect(data).toHaveProperty('response')
      expect(data).toHaveProperty('responseTime')
      expect(data.responseTime).toBeLessThan(5000) // 5秒内响应
    })

    it('should handle AI service unavailability gracefully', async () => {
      // 模拟AI服务不可用的情况
      const response = await fetch('http://localhost:3000/api/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test prompt for unavailable service',
          provider: 'unavailable-provider',
          model: 'test-model'
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('fallbackUsed')
    })

    it('should validate AI service configuration', async () => {
      const response = await fetch('http://localhost:3000/api/ai/configure/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          apiKey: process.env.OPENAI_API_KEY || 'test-key'
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('valid')
      expect(data).toHaveProperty('provider')
      expect(data).toHaveProperty('model')
    })
  })

  describe('AI Service Fallback Mechanism', () => {
    it('should fallback to local model when cloud service fails', async () => {
      const response = await fetch('http://localhost:3000/api/ai/fallback-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test fallback mechanism',
          preferredProvider: 'openai',
          forceCloudFailure: true // 模拟云服务失败
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.provider).toBe('ollama') // 应该降级到本地模型
      expect(data).toHaveProperty('fallbackTriggered')
      expect(data.fallbackTriggered).toBe(true)
    })

    it('should provide appropriate error message when all services fail', async () => {
      const response = await fetch('http://localhost:3000/api/ai/fallback-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test all services failure',
          forceAllFailure: true // 模拟所有服务失败
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('All AI services unavailable')
    })
  })

  describe('AI Service Performance', () => {
    it('should meet response time targets (< 3 seconds)', async () => {
      const startTime = Date.now()

      const response = await fetch('http://localhost:3000/api/ai/performance-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Performance test prompt with reasonable length',
          provider: 'openai',
          model: 'gpt-3.5-turbo'
        })
      })

      const responseTime = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(3000) // 3秒内响应

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.responseTime).toBeLessThan(3000)
    })

    it('should handle concurrent requests properly', async () => {
      const concurrentRequests = 5
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        fetch('http://localhost:3000/api/ai/concurrent-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: `Concurrent test prompt ${i}`,
            requestId: `test-${i}`
          })
        })
      )

      const responses = await Promise.all(promises)

      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
      })

      const data = await Promise.all(
        responses.map(response => response.json())
      )

      // 验证每个请求都有唯一的响应
      const requestIds = data.map(d => d.requestId)
      const uniqueIds = new Set(requestIds)
      expect(uniqueIds.size).toBe(concurrentRequests)
    })
  })

  afterAll(async () => {
    // 清理测试环境
    console.log('AI Services integration tests completed')
  })
})