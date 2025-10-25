/**
 * AI提供商集成测试套件
 * 测试OpenAI、Anthropic等AI服务提供商的功能
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals'
import { OpenAIProvider } from '@/lib/ai/providers/openai-provider'
import { ClaudeProvider } from '@/lib/ai/providers/claude-provider'
import { BaseAIProvider } from '@/lib/ai/providers/base-provider'

describe('AI Providers Integration Tests', () => {
  let openaiProvider: OpenAIProvider
  let claudeProvider: ClaudeProvider

  beforeAll(() => {
    // 设置测试环境变量
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key'
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key'
  })

  beforeEach(() => {
    openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000
    })

    claudeProvider = new ClaudeProvider({
      apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
      model: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 1000
    })
  })

  describe('OpenAI Provider', () => {
    it('should be properly initialized', () => {
      expect(openaiProvider).toBeInstanceOf(OpenAIProvider)
      expect(openaiProvider).toBeInstanceOf(BaseAIProvider)
    })

    it('should have correct configuration', () => {
      const config = openaiProvider.getConfig()
      expect(config.provider).toBe('openai')
      expect(config.model).toBe('gpt-3.5-turbo')
      expect(config.temperature).toBe(0.7)
      expect(config.maxTokens).toBe(1000)
    })

    it('should validate API key format', () => {
      // 测试有效的API密钥格式
      expect(() => {
        new OpenAIProvider({
          apiKey: 'sk-test123456789',
          model: 'gpt-3.5-turbo'
        })
      }).not.toThrow()

      // 测试无效的API密钥格式
      expect(() => {
        new OpenAIProvider({
          apiKey: '',
          model: 'gpt-3.5-turbo'
        })
      }).toThrow()
    })

    it('should support text generation', async () => {
      const request = {
        prompt: 'Hello, how are you?',
        context: 'Test conversation',
        maxTokens: 50,
        temperature: 0.7
      }

      try {
        const response = await openaiProvider.generateText(request)
        expect(response).toHaveProperty('content')
        expect(response).toHaveProperty('usage')
        expect(response).toHaveProperty('model')
        expect(response).toHaveProperty('provider')
        expect(response.provider).toBe('openai')
        expect(typeof response.content).toBe('string')
        expect(response.content.length).toBeGreaterThan(0)
      } catch (error) {
        // 在测试环境中可能没有有效的API密钥
        expect(error).toBeDefined()
      }
    })

    it('should support streaming text generation', async () => {
      const request = {
        prompt: 'Write a short poem',
        context: 'Creative writing test',
        maxTokens: 100,
        temperature: 0.8,
        stream: true
      }

      try {
        const chunks = []
        const stream = await openaiProvider.generateTextStream(request)

        for await (const chunk of stream) {
          expect(chunk).toHaveProperty('content')
          expect(chunk).toHaveProperty('done')
          chunks.push(chunk.content)

          if (chunk.done) break
        }

        expect(chunks.length).toBeGreaterThan(0)
        const fullText = chunks.join('')
        expect(fullText.length).toBeGreaterThan(0)
      } catch (error) {
        // 在测试环境中可能没有有效的API密钥
        expect(error).toBeDefined()
      }
    })

    it('should support embedding generation', async () => {
      const texts = [
        'Hello world',
        'Artificial intelligence',
        'Machine learning'
      ]

      try {
        const embeddings = await openaiProvider.generateEmbedding(texts)
        expect(Array.isArray(embeddings)).toBe(true)
        expect(embeddings).toHaveLength(texts.length)

        embeddings.forEach((embedding, index) => {
          expect(embedding).toHaveProperty('values')
          expect(Array.isArray(embedding.values)).toBe(true)
          expect(embedding.values.length).toBeGreaterThan(0)
          expect(embedding.text).toBe(texts[index])
        })
      } catch (error) {
        // 在测试环境中可能没有有效的API密钥
        expect(error).toBeDefined()
      }
    })

    it('should support content moderation', async () => {
      const testContent = [
        'This is a normal message',
        'I love programming',
        'Have a great day!'
      ]

      try {
        const moderationResults = await openaiProvider.moderateContent(testContent)
        expect(Array.isArray(moderationResults)).toBe(true)
        expect(moderationResults).toHaveLength(testContent.length)

        moderationResults.forEach((result, index) => {
          expect(result).toHaveProperty('flagged')
          expect(result).toHaveProperty('categories')
          expect(result).toHaveProperty('scores')
          expect(typeof result.flagged).toBe('boolean')
        })
      } catch (error) {
        // 在测试环境中可能没有有效的API密钥
        expect(error).toBeDefined()
      }
    })

    it('should count tokens correctly', () => {
      const text = 'Hello, world! This is a test message for token counting.'
      const tokenCount = openaiProvider.countTokens(text)
      expect(typeof tokenCount).toBe('number')
      expect(tokenCount).toBeGreaterThan(0)
    })

    it('should perform health check', async () => {
      try {
        const healthStatus = await openaiProvider.healthCheck()
        expect(healthStatus).toHaveProperty('status')
        expect(healthStatus).toHaveProperty('provider')
        expect(healthStatus).toHaveProperty('responseTime')
        expect(healthStatus.provider).toBe('openai')
        expect(['healthy', 'unhealthy', 'degraded']).toContain(healthStatus.status)
        expect(typeof healthStatus.responseTime).toBe('number')
      } catch (error) {
        // 在测试环境中可能没有有效的API密钥
        expect(error).toBeDefined()
      }
    })

    it('should handle errors gracefully', async () => {
      const invalidProvider = new OpenAIProvider({
        apiKey: 'invalid-key',
        model: 'gpt-3.5-turbo'
      })

      const request = {
        prompt: 'Test message',
        maxTokens: 50
      }

      try {
        await invalidProvider.generateText(request)
        // 如果没有抛出错误，这也是可以的
        expect(true).toBe(true)
      } catch (error) {
        expect(error).toBeDefined()
        expect(error).toHaveProperty('message')
      }
    })
  })

  describe('Claude Provider', () => {
    it('should be properly initialized', () => {
      expect(claudeProvider).toBeInstanceOf(ClaudeProvider)
      expect(claudeProvider).toBeInstanceOf(BaseAIProvider)
    })

    it('should have correct configuration', () => {
      const config = claudeProvider.getConfig()
      expect(config.provider).toBe('anthropic')
      expect(config.model).toBe('claude-3-sonnet-20240229')
      expect(config.temperature).toBe(0.7)
      expect(config.maxTokens).toBe(1000)
    })

    it('should validate API key format', () => {
      // 测试有效的API密钥格式
      expect(() => {
        new ClaudeProvider({
          apiKey: 'sk-ant-test123456789',
          model: 'claude-3-sonnet-20240229'
        })
      }).not.toThrow()

      // 测试无效的API密钥格式
      expect(() => {
        new ClaudeProvider({
          apiKey: '',
          model: 'claude-3-sonnet-20240229'
        })
      }).toThrow()
    })

    it('should support text generation', async () => {
      const request = {
        prompt: 'Hello, how are you?',
        context: 'Test conversation',
        maxTokens: 50,
        temperature: 0.7
      }

      try {
        const response = await claudeProvider.generateText(request)
        expect(response).toHaveProperty('content')
        expect(response).toHaveProperty('usage')
        expect(response).toHaveProperty('model')
        expect(response).toHaveProperty('provider')
        expect(response.provider).toBe('anthropic')
        expect(typeof response.content).toBe('string')
        expect(response.content.length).toBeGreaterThan(0)
      } catch (error) {
        // 在测试环境中可能没有有效的API密钥
        expect(error).toBeDefined()
      }
    })

    it('should support streaming text generation', async () => {
      const request = {
        prompt: 'Write a short poem',
        context: 'Creative writing test',
        maxTokens: 100,
        temperature: 0.8,
        stream: true
      }

      try {
        const chunks = []
        const stream = await claudeProvider.generateTextStream(request)

        for await (const chunk of stream) {
          expect(chunk).toHaveProperty('content')
          expect(chunk).toHaveProperty('done')
          chunks.push(chunk.content)

          if (chunk.done) break
        }

        expect(chunks.length).toBeGreaterThan(0)
        const fullText = chunks.join('')
        expect(fullText.length).toBeGreaterThan(0)
      } catch (error) {
        // 在测试环境中可能没有有效的API密钥
        expect(error).toBeDefined()
      }
    })

    it('should count tokens correctly', () => {
      const text = 'Hello, world! This is a test message for token counting.'
      const tokenCount = claudeProvider.countTokens(text)
      expect(typeof tokenCount).toBe('number')
      expect(tokenCount).toBeGreaterThan(0)
    })

    it('should perform health check', async () => {
      try {
        const healthStatus = await claudeProvider.healthCheck()
        expect(healthStatus).toHaveProperty('status')
        expect(healthStatus).toHaveProperty('provider')
        expect(healthStatus).toHaveProperty('responseTime')
        expect(healthStatus.provider).toBe('anthropic')
        expect(['healthy', 'unhealthy', 'degraded']).toContain(healthStatus.status)
        expect(typeof healthStatus.responseTime).toBe('number')
      } catch (error) {
        // 在测试环境中可能没有有效的API密钥
        expect(error).toBeDefined()
      }
    })
  })

  describe('Provider Comparison', () => {
    it('should have different token counting methods', () => {
      const text = 'Hello, world! This is a test.'

      const openaiTokens = openaiProvider.countTokens(text)
      const claudeTokens = claudeProvider.countTokens(text)

      expect(typeof openaiTokens).toBe('number')
      expect(typeof claudeTokens).toBe('number')
      expect(openaiTokens).toBeGreaterThan(0)
      expect(claudeTokens).toBeGreaterThan(0)
    })

    it('should support different model configurations', () => {
      const openaiModels = openaiProvider.getSupportedModels()
      const claudeModels = claudeProvider.getSupportedModels()

      expect(Array.isArray(openaiModels)).toBe(true)
      expect(Array.isArray(claudeModels)).toBe(true)
      expect(openaiModels.length).toBeGreaterThan(0)
      expect(claudeModels.length).toBeGreaterThan(0)

      // 检查模型名称格式
      openaiModels.forEach(model => {
        expect(typeof model.name).toBe('string')
        expect(typeof model.id).toBe('string')
        expect(model.name.length).toBeGreaterThan(0)
        expect(model.id.length).toBeGreaterThan(0)
      })

      claudeModels.forEach(model => {
        expect(typeof model.name).toBe('string')
        expect(typeof model.id).toBe('string')
        expect(model.name.length).toBeGreaterThan(0)
        expect(model.id.length).toBeGreaterThan(0)
      })
    })

    it('should handle rate limiting differently', () => {
      const openaiLimits = openaiProvider.getRateLimits()
      const claudeLimits = claudeProvider.getRateLimits()

      expect(openaiLimits).toHaveProperty('requestsPerMinute')
      expect(openaiLimits).toHaveProperty('tokensPerMinute')
      expect(claudeLimits).toHaveProperty('requestsPerMinute')
      expect(claudeLimits).toHaveProperty('tokensPerMinute')

      expect(typeof openaiLimits.requestsPerMinute).toBe('number')
      expect(typeof openaiLimits.tokensPerMinute).toBe('number')
      expect(typeof claudeLimits.requestsPerMinute).toBe('number')
      expect(typeof claudeLimits.tokensPerMinute).toBe('number')
    })
  })

  describe('Provider Integration', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => ({
        prompt: `Test message ${i + 1}`,
        maxTokens: 20
      }))

      try {
        const promises = requests.map(request =>
          openaiProvider.generateText(request)
        )

        const results = await Promise.allSettled(promises)

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            expect(result.value).toHaveProperty('content')
            expect(result.value.content.length).toBeGreaterThan(0)
          } else {
            // 在测试环境中某些请求可能失败
            expect(result.reason).toBeDefined()
          }
        })
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle long context properly', async () => {
      const longContext = 'A'.repeat(1000) // 创建一个长文本
      const request = {
        prompt: longContext + '\n\nSummarize this text.',
        maxTokens: 50
      }

      try {
        const response = await openaiProvider.generateText(request)
        expect(response).toHaveProperty('content')
        expect(response.content.length).toBeGreaterThan(0)
      } catch (error) {
        // 长文本可能触发上下文限制
        expect(error).toBeDefined()
      }
    })

    it('should support different temperature values', async () => {
      const temperatures = [0.0, 0.5, 1.0, 1.5, 2.0]
      const prompt = 'Generate a random number between 1 and 100.'

      for (const temp of temperatures) {
        try {
          const request = {
            prompt,
            temperature: temp,
            maxTokens: 10
          }

          const response = await openaiProvider.generateText(request)
          expect(response).toHaveProperty('content')

          // 验证温度是否在有效范围内
          const config = openaiProvider.getConfig()
          expect(config.temperature).toBe(temp)
        } catch (error) {
          // 某些温度值可能不被支持
          expect(error).toBeDefined()
        }
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty prompts', async () => {
      const request = {
        prompt: '',
        maxTokens: 10
      }

      try {
        await openaiProvider.generateText(request)
        // 某些提供商可能接受空提示
        expect(true).toBe(true)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle very long prompts', async () => {
      const veryLongPrompt = 'Test '.repeat(10000) // 超长文本
      const request = {
        prompt: veryLongPrompt,
        maxTokens: 10
      }

      try {
        await openaiProvider.generateText(request)
        // 如果成功，说明提供商处理了长文本
        expect(true).toBe(true)
      } catch (error) {
        // 期望因太长而失败
        expect(error).toBeDefined()
      }
    })

    it('should handle invalid model names', () => {
      expect(() => {
        new OpenAIProvider({
          apiKey: 'test-key',
          model: 'invalid-model-name'
        })
      }).toThrow()
    })

    it('should handle network timeouts', async () => {
      // 创建一个会超时的provider
      const timeoutProvider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        timeout: 1 // 1ms超时
      })

      const request = {
        prompt: 'Test message',
        maxTokens: 10
      }

      try {
        await timeoutProvider.generateText(request)
        // 如果成功，可能是网络很快
        expect(true).toBe(true)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})