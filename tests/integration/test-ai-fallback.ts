/**
 * AI服务降级机制测试
 * 专门测试AI服务不可用时的降级策略
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('AI Service Fallback Mechanism', () => {
  beforeAll(async () => {
    // 设置测试环境
    process.env.NODE_ENV = 'test'
    process.env.AI_FALLBACK_TEST = 'true'
  })

  describe('Cloud Service Fallback', () => {
    it('should fallback from OpenAI to Anthropic when OpenAI fails', async () => {
      const response = await fetch('http://localhost:3000/api/ai/fallback/chain-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test cloud service fallback',
          providers: ['openai', 'anthropic'],
          simulateFailure: 'openai'
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.provider).toBe('anthropic')
      expect(data.fallbackChain).toEqual(['openai', 'anthropic'])
      expect(data.fallbackTriggered).toBe(true)
    })

    it('should fallback from cloud to local models when all cloud services fail', async () => {
      const response = await fetch('http://localhost:3000/api/ai/fallback/chain-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test cloud to local fallback',
          providers: ['openai', 'anthropic'],
          simulateFailure: ['openai', 'anthropic']
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.provider).toBe('ollama')
      expect(data.fallbackChain).toEqual(['openai', 'anthropic', 'ollama'])
      expect(data.fallbackTriggered).toBe(true)
    })

    it('should maintain response quality during fallback', async () => {
      const originalPrompt = 'Explain the concept of artificial intelligence in simple terms'

      const normalResponse = await fetch('http://localhost:3000/api/ai/fallback/quality-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: originalPrompt,
          provider: 'openai',
          noFallback: true
        })
      })

      const fallbackResponse = await fetch('http://localhost:3000/api/ai/fallback/quality-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: originalPrompt,
          providers: ['openai', 'anthropic', 'ollama'],
          simulateFailure: ['openai']
        })
      })

      expect(normalResponse.status).toBe(200)
      expect(fallbackResponse.status).toBe(200)

      const normalData = await normalResponse.json()
      const fallbackData = await fallbackResponse.json()

      expect(normalData.success).toBe(true)
      expect(fallbackData.success).toBe(true)

      // 验证响应内容质量（长度、相关性等）
      expect(normalData.response.length).toBeGreaterThan(50)
      expect(fallbackData.response.length).toBeGreaterThan(50)

      // 简单的相关性检查（应该包含关键词）
      expect(normalData.response.toLowerCase()).toContain('artificial')
      expect(fallbackData.response.toLowerCase()).toContain('artificial')
    })
  })

  describe('Cost-Aware Fallback', () => {
    it('should prefer local models for cost-sensitive operations', async () => {
      const response = await fetch('http://localhost:3000/api/ai/fallback/cost-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Simple classification task',
          costPreference: 'low',
          maxCost: 0.001
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.provider).toBe('ollama') // 应该选择免费的本地模型
      expect(data.estimatedCost).toBeLessThanOrEqual(0.001)
    })

    it('should track cost during fallback chain', async () => {
      const response = await fetch('http://localhost:3000/api/ai/fallback/cost-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Complex analysis task requiring high quality',
          providers: ['openai', 'anthropic', 'ollama'],
          simulateFailure: ['openai'],
          trackCost: true
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data).toHaveProperty('costBreakdown')
      expect(data.costBreakdown).toHaveProperty('anthropic')
      expect(data.costBreakdown).toHaveProperty('totalCost')
      expect(data.totalCost).toBeGreaterThan(0)
    })
  })

  describe('Latency-Aware Fallback', () => {
    it('should prefer faster services for time-sensitive requests', async () => {
      const response = await fetch('http://localhost:3000/api/ai/fallback/latency-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Quick response needed',
          latencyPreference: 'low',
          maxResponseTime: 1000
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.responseTime).toBeLessThan(1000)
      expect(data.latencyOptimized).toBe(true)
    })

    it('should measure and log fallback latency impact', async () => {
      const response = await fetch('http://localhost:3000/api/ai/fallback/latency-impact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test latency impact measurement',
          providers: ['openai', 'anthropic', 'ollama'],
          simulateFailure: ['openai', 'anthropic'],
          measureLatency: true
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data).toHaveProperty('latencyBreakdown')
      expect(data.latencyBreakdown).toHaveProperty('initialAttempt')
      expect(data.latencyBreakdown).toHaveProperty('fallbackAttempt')
      expect(data.latencyBreakdown).toHaveProperty('totalLatency')

      // 验证fallback没有过度增加延迟
      const latencyIncrease = data.latencyBreakdown.fallbackAttempt - data.latencyBreakdown.initialAttempt
      expect(latencyIncrease).toBeLessThan(2000) // 增加不超过2秒
    })
  })

  describe('Quality-Based Fallback', () => {
    it('should fallback when response quality is below threshold', async () => {
      const response = await fetch('http://localhost:3000/api/ai/fallback/quality-based', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test quality-based fallback',
          qualityThreshold: 0.7,
          simulateLowQuality: true
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data).toHaveProperty('qualityScore')
      expect(data.qualityScore).toBeGreaterThanOrEqual(0.7)
      expect(data.qualityBasedFallback).toBe(true)
    })

    it('should validate response quality before returning', async () => {
      const response = await fetch('http://localhost:3000/api/ai/fallback/quality-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test quality validation',
          validateQuality: true,
          qualityChecks: ['length', 'relevance', 'coherence']
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data).toHaveProperty('qualityValidation')
      expect(data.qualityValidation).toHaveProperty('passed')
      expect(data.qualityValidation).toHaveProperty('scores')
      expect(data.qualityValidation.passed).toBe(true)
    })
  })

  afterAll(async () => {
    // 清理测试环境
    console.log('AI Service Fallback tests completed')
  })
})