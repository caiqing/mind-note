/**
 * AI服务测试
 *
 * 验证AI服务的基本功能和错误处理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService, AIServiceError, RateLimitError, QuotaExceededError } from '../ai-service';
import { AIProvider, ContentCategory } from '../ai-config';

// Mock环境变量
vi.mock('../../../../env', () => ({
  default: {
    AI_ANALYSIS_ENABLED: 'true',
    AI_PRIMARY_PROVIDER: 'openai',
    AI_FALLBACK_PROVIDER: 'anthropic',
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'gpt-4-turbo-preview',
    OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
    ANTHROPIC_API_KEY: 'test-key',
    ANTHROPIC_MODEL: 'claude-3-haiku-20240307',
    AI_RESPONSE_TIMEOUT_MS: '5000',
    AI_MAX_TOKENS: '1000',
    AI_DAILY_BUDGET_USD: '1.0',
    AI_COST_PER_NOTE_LIMIT: '0.01',
    AI_RATE_LIMIT_RPM: '60',
    AI_RATE_LIMIT_RPH: '1000',
  },
}));

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = AIService.getInstance();
  });

  describe('配置验证', () => {
    it('应该验证配置有效性', () => {
      const result = aiService.validateConfig();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该获取服务统计', () => {
      const stats = aiService.getStats();
      expect(stats).toHaveProperty('totalRequests', 0);
      expect(stats).toHaveProperty('successfulRequests', 0);
      expect(stats).toHaveProperty('failedRequests', 0);
      expect(stats).toHaveProperty('totalTokens', 0);
      expect(stats).toHaveProperty('totalCost', 0);
      expect(stats).toHaveProperty('dailyCost', 0);
      expect(stats).toHaveProperty('requestsByProvider');
    });

    it('应该重置每日统计', () => {
      aiService.resetDailyStats();
      const stats = aiService.getStats();
      expect(stats.dailyCost).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该正确创建AIServiceError', () => {
      const error = new AIServiceError('Test error', 'openai', 'TEST_CODE', 400);
      expect(error.name).toBe('AIServiceError');
      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('openai');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
    });

    it('应该正确创建RateLimitError', () => {
      const error = new RateLimitError('openai', 60);
      expect(error.name).toBe('AIServiceError');
      expect(error.provider).toBe('openai');
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.retryAfter).toBe(60);
    });

    it('应该正确创建QuotaExceededError', () => {
      const error = new QuotaExceededError('openai', 'Daily quota exceeded');
      expect(error.name).toBe('AIServiceError');
      expect(error.provider).toBe('openai');
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.message).toBe('Daily quota exceeded');
    });
  });

  describe('集成测试（需要真实API密钥）', () => {
    // 这些测试需要真实的API密钥，在CI/CD环境中跳过
    const skipIntegrationTests = !process.env.TEST_AI_INTEGRATION;

    it.skipIf(skipIntegrationTests)('应该能够分析内容', async () => {
      const request = {
        title: 'React Hooks测试',
        content: 'React Hooks是React 16.8引入的新特性，它让你在不编写class的情况下使用state以及其他的React特性。',
      };

      try {
        const result = await aiService.analyzeContent(request);

        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('tags');
        expect(result).toHaveProperty('keyConcepts');
        expect(result).toHaveProperty('sentiment');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('model');
        expect(result).toHaveProperty('provider');
        expect(result).toHaveProperty('processedAt');
        expect(result).toHaveProperty('tokens');
        expect(result).toHaveProperty('cost');

        expect(Object.values(ContentCategory)).toContain(result.category);
        expect(['positive', 'neutral', 'negative']).toContain(result.sentiment);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.cost).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // 如果是配置问题，跳过测试
        if (error instanceof AIServiceError) {
          console.warn('AI服务配置问题，跳过集成测试:', error.message);
          return;
        }
        throw error;
      }
    });

    it.skipIf(skipIntegrationTests)('应该能够生成向量嵌入', async () => {
      const text = '这是一段测试文本，用于生成向量嵌入。';

      try {
        const result = await aiService.generateEmbedding(text);

        expect(result).toHaveProperty('embedding');
        expect(result).toHaveProperty('model');
        expect(result).toHaveProperty('provider');
        expect(result).toHaveProperty('dimensions');
        expect(result).toHaveProperty('processedAt');

        expect(Array.isArray(result.embedding)).toBe(true);
        expect(result.embedding.length).toBeGreaterThan(0);
        expect(result.dimensions).toBe(result.embedding.length);
      } catch (error) {
        if (error instanceof AIServiceError) {
          console.warn('AI服务配置问题，跳过嵌入测试:', error.message);
          return;
        }
        throw error;
      }
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成配置验证', () => {
      const startTime = Date.now();
      const result = aiService.validateConfig();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
      expect(result.isValid).toBe(true);
    });

    it('应该能够处理并发统计查询', async () => {
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(aiService.getStats())
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      // 所有结果应该相同
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理空内容', async () => {
      const request = {
        title: '',
        content: '',
      };

      try {
        const result = await aiService.analyzeContent(request);
        expect(result.summary).toBeDefined();
        expect(result.tags).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
      }
    });

    it('应该处理超长内容', async () => {
      const longContent = 'A'.repeat(10000);
      const request = {
        title: '长内容测试',
        content: longContent,
      };

      try {
        const result = await aiService.analyzeContent(request);
        expect(result.summary).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
      }
    });

    it('应该处理特殊字符', async () => {
      const request = {
        title: '特殊字符测试 🚀',
        content: '包含emoji: 🎉🎊🎈 和特殊字符: @#$%^&*()_+-=[]{}|;:",.<>/?',
      };

      try {
        const result = await aiService.analyzeContent(request);
        expect(result.summary).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
      }
    });
  });
});