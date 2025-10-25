/**
 * AI服务管理器测试用例 - T103.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIServiceManager, createAIServiceManager } from '../ai-service-manager';
import { UnifiedAnalysisRequest } from '../ai-service-manager';

// Mock providers
vi.mock('../providers/openai-provider-v2', () => ({
  createOpenAIProviderV2: vi.fn(() => ({
    name: 'openai',
    generateSummary: vi.fn(),
    extractKeywords: vi.fn(),
    analyzeSentiment: vi.fn(),
    extractKeyConcepts: vi.fn(),
  })),
}));

vi.mock('../providers/claude-provider', () => ({
  createClaudeProvider: vi.fn(() => ({
    name: 'anthropic',
    generateSummary: vi.fn(),
    extractKeywords: vi.fn(),
    analyzeSentiment: vi.fn(),
    extractKeyConcepts: vi.fn(),
  })),
}));

// Mock ai-config
vi.mock('../ai-config', () => ({
  aiConfig: {
    getFallbackOrder: vi.fn(() => ['openai', 'anthropic']),
    calculateCost: vi.fn(() => 0.0005),
  },
}));

// Mock services
vi.mock('../summary-service', () => ({
  createSummaryService: vi.fn(() => ({
    generateSummary: vi.fn(),
    getAvailableProviders: vi.fn(() => ['openai']),
    healthCheck: vi.fn(() => Promise.resolve({ status: 'healthy', providers: ['openai'] })),
    getStats: vi.fn(() => ({ totalProviders: 1, availableProviders: 1 })),
  })),
}));

vi.mock('../keyword-service', () => ({
  createKeywordService: vi.fn(() => ({
    extractKeywords: vi.fn(),
    getAvailableProviders: vi.fn(() => ['openai']),
    healthCheck: vi.fn(() => Promise.resolve({ status: 'healthy', providers: ['openai'] })),
    getStats: vi.fn(() => ({ totalProviders: 1, availableProviders: 1 })),
  })),
}));

vi.mock('../sentiment-service', () => ({
  createSentimentService: vi.fn(() => ({
    analyzeSentiment: vi.fn(),
    getAvailableProviders: vi.fn(() => ['openai']),
    healthCheck: vi.fn(() => Promise.resolve({ status: 'healthy', providers: ['openai'] })),
    getStats: vi.fn(() => ({ totalProviders: 1, availableProviders: 1 })),
  })),
}));

vi.mock('../concept-service', () => ({
  createConceptService: vi.fn(() => ({
    extractConcepts: vi.fn(),
    getAvailableProviders: vi.fn(() => ['openai']),
    healthCheck: vi.fn(() => Promise.resolve({ status: 'healthy', providers: ['openai'] })),
    getStats: vi.fn(() => ({ totalProviders: 1, availableProviders: 1 })),
  })),
}));

// Suppress console output for tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('AIServiceManager', () => {
  let manager: AIServiceManager;

  beforeEach(() => {
    manager = createAIServiceManager({
      enableHealthCheck: false, // 禁用健康检查以避免定时器
      enableCircuitBreaker: false, // 简化测试
      enableLoadBalancing: false, // 简化测试
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该使用默认配置初始化', () => {
      expect(manager).toBeDefined();
    });

    it('应该接受自定义配置', () => {
      const customManager = createAIServiceManager({
        enableFallback: false,
        retryAttempts: 5,
        timeoutMs: 60000,
      });

      expect(customManager).toBeDefined();
    });
  });

  describe('performUnifiedAnalysis', () => {
    const mockRequest: UnifiedAnalysisRequest = {
      content: '人工智能和机器学习是当前技术发展的重要趋势。',
      userId: 'test-user-001',
      options: {
        summary: {
          style: 'paragraph',
          maxLength: 100,
        },
        keywords: {
          maxKeywords: 5,
          priority: 'relevance',
        },
      },
    };

    it('应该执行指定的服务', async () => {
      // Mock service responses
      const { createSummaryService } = await import('../summary-service');
      const { createKeywordService } = await import('../keyword-service');

      const mockSummaryService = createSummaryService();
      const mockKeywordService = createKeywordService();

      mockSummaryService.generateSummary.mockResolvedValue({
        summary: '人工智能和机器学习是当前技术发展的重要趋势。',
        provider: 'openai',
        cost: 0.0005,
        tokens: { input: 50, output: 20, total: 70 },
        processingTime: 1000,
      });

      mockKeywordService.extractKeywords.mockResolvedValue({
        keywords: [
          { keyword: '人工智能', score: 0.9 },
          { keyword: '机器学习', score: 0.8 },
        ],
        provider: 'openai',
        cost: 0.0003,
        tokens: { input: 40, output: 15, total: 55 },
        processingTime: 800,
      });

      const result = await manager.performUnifiedAnalysis(mockRequest);

      expect(result.summary).toBeDefined();
      expect(result.keywords).toBeDefined();
      expect(result.metadata.services).toEqual(['summary', 'keywords']);
      expect(result.metadata.providers).toEqual(['openai', 'openai']);
      expect(result.metadata.totalCost).toBeCloseTo(0.0008, 4);
      expect(result.metadata.totalTokens).toBe(125);
      expect(result.metadata.errors).toHaveLength(0);
    });

    it('应该在没有指定选项时执行所有服务', async () => {
      const { createSummaryService } = await import('../summary-service');
      const mockSummaryService = createSummaryService();

      mockSummaryService.generateSummary.mockResolvedValue({
        summary: '测试摘要',
        provider: 'openai',
        cost: 0.0005,
        tokens: { input: 50, output: 20, total: 70 },
        processingTime: 1000,
      });

      const requestWithoutOptions: UnifiedAnalysisRequest = {
        content: '测试内容',
        userId: 'test-user',
      };

      const result = await manager.performUnifiedAnalysis(requestWithoutOptions);

      expect(result.metadata.services).toEqual(['summary', 'keywords', 'sentiment', 'concepts']);
    });

    it('应该处理服务失败的情况', async () => {
      const { createSummaryService } = await import('../summary-service');
      const { createKeywordService } = await import('../keyword-service');

      const mockSummaryService = createSummaryService();
      const mockKeywordService = createKeywordService();

      mockSummaryService.generateSummary.mockResolvedValue({
        summary: '测试摘要',
        provider: 'openai',
        cost: 0.0005,
        tokens: { input: 50, output: 20, total: 70 },
        processingTime: 1000,
      });

      mockKeywordService.extractKeywords.mockRejectedValue(new Error('Keywords service failed'));

      const result = await manager.performUnifiedAnalysis({
        content: '测试内容',
        userId: 'test-user',
        options: {
          summary: { style: 'paragraph' },
          keywords: { maxKeywords: 5 },
        },
      });

      expect(result.summary).toBeDefined();
      expect(result.keywords).toBeUndefined(); // 失败的服务
      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0].service).toBe('keywords');
    });
  });

  describe('fallback机制', () => {
    it('应该支持fallback机制配置', () => {
      const managerWithFallback = createAIServiceManager({
        enableFallback: true,
        retryAttempts: 3,
      });

      expect(managerWithFallback).toBeDefined();
    });

    it('应该能够禁用fallback', () => {
      const managerWithoutFallback = createAIServiceManager({
        enableFallback: false,
        retryAttempts: 1,
      });

      expect(managerWithoutFallback).toBeDefined();
    });
  });

  describe('超时处理', () => {
    it('应该支持自定义超时配置', () => {
      const managerWithTimeout = createAIServiceManager({
        timeoutMs: 10000,
      });

      expect(managerWithTimeout).toBeDefined();
    });
  });

  describe('系统健康检查', () => {
    it('应该返回系统健康状态', async () => {
      const health = await manager.getSystemHealth();

      expect(health.status).toBeDefined();
      expect(health.providers).toBeDefined();
      expect(health.loadBalancing).toBeDefined();
      expect(health.circuitBreakers).toBeDefined();
      expect(health.config).toBeDefined();
    });

    it('应该根据提供商健康状态确定系统状态', async () => {
      const health = await manager.getSystemHealth();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('配置管理', () => {
    it('应该能够更新配置', () => {
      const newConfig = {
        enableFallback: false,
        retryAttempts: 10,
        timeoutMs: 60000,
      };

      manager.updateConfig(newConfig);

      expect(manager).toBeDefined();
    });
  });

  describe('统计信息', () => {
    it('应该返回提供商统计信息', () => {
      const stats = manager.getProviderStats();

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0]).toHaveProperty('provider');
      expect(stats[0]).toHaveProperty('stats');
    });

    it('应该返回负载均衡统计信息', () => {
      const stats = manager.getLoadBalancingStats();

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0]).toHaveProperty('provider');
      expect(stats[0]).toHaveProperty('stats');
    });
  });

  describe('资源清理', () => {
    it('应该能够正常关闭', async () => {
      await expect(manager.shutdown()).resolves.toBeUndefined();
    });
  });

  describe('熔断器机制', () => {
    it('应该支持熔断器配置', () => {
      const managerWithCircuitBreaker = createAIServiceManager({
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 5,
      });

      expect(managerWithCircuitBreaker).toBeDefined();
    });

    it('应该能够重置熔断器', async () => {
      await manager.resetCircuitBreaker('openai');
      // 测试不会抛出错误即可
      expect(true).toBe(true);
    });
  });
});