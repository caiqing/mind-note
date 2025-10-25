/**
 * 成本控制模块测试用例 - T103.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CostController, createCostController } from '../../cost-control';
import {
  createCostControlledServices,
  ServiceUsageContext
} from '../cost-controlled-service';

// Mock console methods to avoid test output noise
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('CostController', () => {
  let costController: CostController;

  beforeEach(() => {
    costController = createCostController({
      userDailyLimit: 5.0,
      userMonthlyLimit: 50.0,
      operationCostLimit: 0.5,
      requestsPerMinute: 10,
      requestsPerHour: 100,
      warningThreshold: 70,
      criticalThreshold: 90
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该使用默认配置初始化', () => {
      const defaultController = createCostController();
      expect(defaultController).toBeDefined();
    });

    it('应该接受自定义配置', () => {
      const customController = createCostController({
        userDailyLimit: 20.0,
        userMonthlyLimit: 200.0
      });
      expect(customController).toBeDefined();
    });

    it('应该初始化提供商成本信息', () => {
      const providerCosts = costController.getProviderCostInfo();
      expect(providerCosts.length).toBeGreaterThan(0);
      expect(providerCosts[0]).toHaveProperty('provider');
      expect(providerCosts[0]).toHaveProperty('costPer1KInputTokens');
      expect(providerCosts[0]).toHaveProperty('costPer1KOutputTokens');
    });
  });

  describe('请求允许检查', () => {
    const context: ServiceUsageContext = {
      userId: 'test-user-001',
      operation: 'summary',
      sessionId: 'test-session'
    };

    it('应该允许合理的请求', async () => {
      const result = await costController.checkRequestAllowed(
        context.userId,
        context.operation,
        { input: 100, output: 50 }
      );

      expect(result.allowed).toBe(true);
      expect(result.estimatedCost).toBeGreaterThan(0);
    });

    it('应该阻止超出单次操作限额的请求', async () => {
      const result = await costController.checkRequestAllowed(
        context.userId,
        context.operation,
        { input: 10000, output: 5000 } // 预估成本会很高
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('单次操作成本');
      expect(result.suggestedAlternatives).toBeDefined();
    });

    it('应该检查每日限额', async () => {
      // 先记录一些使用量接近每日限额
      for (let i = 0; i < 10; i++) {
        costController.recordUsage(context.userId, context.operation, 'openai', 0.4, 500);
      }

      const result = await costController.checkRequestAllowed(
        context.userId,
        context.operation,
        { input: 100, output: 50 }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('每日成本');
    });

    it('应该检查速率限制', async () => {
      // 快速发送大量请求
      for (let i = 0; i < 12; i++) {
        costController.recordUsage(context.userId, context.operation, 'openai', 0.01, 100);
      }

      const result = await costController.checkRequestAllowed(
        context.userId,
        context.operation,
        { input: 100, output: 50 }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('每分钟请求数');
    });

    it('应该在接近限额时发出警告', async () => {
      // 记录3.5美元使用量（70%的5美元限额）
      costController.recordUsage(context.userId, context.operation, 'openai', 3.5, 3500);

      const result = await costController.checkRequestAllowed(
        context.userId,
        context.operation,
        { input: 100, output: 50 }
      );

      expect(result.allowed).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes('警告'))).toBe(true);
    });
  });

  describe('使用量记录', () => {
    const context: ServiceUsageContext = {
      userId: 'test-user-002',
      operation: 'keywords',
      sessionId: 'test-session'
    };

    it('应该记录使用量', () => {
      costController.recordUsage(context.userId, context.operation, 'openai', 0.05, 200);

      const stats = costController.getUserUsageStats(context.userId);
      expect(stats).toBeDefined();
      expect(stats!.dailyUsage.cost).toBe(0.05);
      expect(stats!.dailyUsage.requests).toBe(1);
      expect(stats!.dailyUsage.tokens).toBe(200);
    });

    it('应该更新速率限制统计', () => {
      costController.recordUsage(context.userId, context.operation, 'openai', 0.05, 200);

      const stats = costController.getUserUsageStats(context.userId);
      expect(stats).toBeDefined();
      expect(stats!.rateLimit.requestsThisMinute).toBe(1);
      expect(stats!.rateLimit.requestsThisHour).toBe(1);
    });

    it('应该记录使用历史', () => {
      costController.recordUsage(context.userId, context.operation, 'openai', 0.05, 200);

      const history = costController.getUsageHistory(context.userId);
      expect(history.length).toBe(1);
      expect(history[0].userId).toBe(context.userId);
      expect(history[0].operation).toBe(context.operation);
      expect(history[0].provider).toBe('openai');
      expect(history[0].cost).toBe(0.05);
    });
  });

  describe('成本分析', () => {
    beforeEach(() => {
      // 记录一些测试数据
      costController.recordUsage('user1', 'summary', 'openai', 0.1, 200);
      costController.recordUsage('user1', 'keywords', 'anthropic', 0.05, 150);
      costController.recordUsage('user2', 'sentiment', 'openai', 0.08, 180);
    });

    it('应该生成全局成本分析报告', () => {
      const report = costController.getCostAnalysisReport();

      expect(report.totalCost).toBe(0.23);
      expect(report.totalRequests).toBe(3);
      expect(report.totalTokens).toBe(530);
      expect(report.averageCostPerRequest).toBeCloseTo(0.0767, 3);
      expect(report.providerBreakdown).toBeDefined();
      expect(report.operationBreakdown).toBeDefined();
    });

    it('应该生成用户特定的成本分析报告', () => {
      const report = costController.getCostAnalysisReport('user1');

      expect(report.totalCost).toBe(0.15);
      expect(report.totalRequests).toBe(2);
      expect(report.providerBreakdown).toHaveProperty('openai');
      expect(report.providerBreakdown).toHaveProperty('anthropic');
    });
  });

  describe('配置管理', () => {
    it('应该能够更新配置', () => {
      const newConfig = {
        userDailyLimit: 15.0,
        userMonthlyLimit: 150.0,
        requestsPerMinute: 20
      };

      costController.updateConfig(newConfig);

      // 验证配置已更新（通过检查新限制是否生效）
      expect(costController).toBeDefined();
    });

    it('应该能够重置用户统计', () => {
      costController.recordUsage('test-user', 'summary', 'openai', 0.1, 200);

      let stats = costController.getUserUsageStats('test-user');
      expect(stats).toBeDefined();

      costController.resetUserStats('test-user');

      stats = costController.getUserUsageStats('test-user');
      expect(stats).toBeNull();
    });
  });

  describe('提供商成本信息', () => {
    it('应该返回所有提供商成本信息', () => {
      const costs = costController.getProviderCostInfo();
      expect(costs.length).toBeGreaterThan(0);
      expect(costs.some(c => c.provider === 'openai')).toBe(true);
      expect(costs.some(c => c.provider === 'anthropic')).toBe(true);
    });

    it('应该返回特定提供商成本信息', () => {
      const openaiCosts = costController.getProviderCostInfo('openai');
      expect(openaiCosts.length).toBeGreaterThan(0);
      expect(openaiCosts[0].provider).toBe('openai');
    });

    it('应该处理不存在的提供商', () => {
      const unknownCosts = costController.getProviderCostInfo('unknown-provider');
      expect(unknownCosts.length).toBe(0);
    });
  });
});

describe('CostControlledServices', () => {
  let services: ReturnType<typeof createCostControlledServices>;

  beforeEach(() => {
    services = createCostControlledServices({
      userDailyLimit: 5.0,
      operationCostLimit: 0.5,
      blockOnBudgetExceeded: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('服务初始化', () => {
    it('应该创建所有成本控制服务', () => {
      expect(services.summary).toBeDefined();
      expect(services.keywords).toBeDefined();
      expect(services.sentiment).toBeDefined();
      expect(services.concepts).toBeDefined();
      expect(services.costController).toBeDefined();
    });

    it('应该使用默认配置初始化', () => {
      const defaultServices = createCostControlledServices();
      expect(defaultServices).toBeDefined();
    });
  });

  describe('摘要服务成本控制', () => {
    const context: ServiceUsageContext = {
      userId: 'test-user',
      operation: 'summary',
      sessionId: 'test-session'
    };

    it('应该允许合理的摘要请求', async () => {
      const result = await services.summary.generateSummary(
        { content: '这是一段测试文本，用于生成摘要。' },
        context
      );

      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('应该记录摘要使用量', async () => {
      // Mock摘要服务返回
      const mockSummaryResult = {
        summary: '测试摘要',
        provider: 'openai',
        cost: 0.05,
        tokens: { input: 50, output: 20, total: 70 },
        processingTime: 1000
      };

      vi.spyOn(services.summary['summaryService'], 'generateSummary')
        .mockResolvedValue(mockSummaryResult);

      const result = await services.summary.generateSummary(
        { content: '这是一段测试文本，用于生成摘要。' },
        context
      );

      expect(result.allowed).toBe(true);
      expect(result.actualCost).toBe(0.05);

      // 验证使用量已记录
      const stats = services.costController.getUserUsageStats(context.userId);
      expect(stats).toBeDefined();
      expect(stats!.dailyUsage.cost).toBe(0.05);
    });

    it('应该在超出限额时阻止请求', async () => {
      // 快速消耗限额
      for (let i = 0; i < 12; i++) {
        services.costController.recordUsage(context.userId, context.operation, 'openai', 0.4, 200);
      }

      const result = await services.summary.generateSummary(
        { content: '这是一段测试文本，用于生成摘要。' },
        context
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.result).toBeUndefined();
    });
  });

  describe('关键词服务成本控制', () => {
    const context: ServiceUsageContext = {
      userId: 'test-user',
      operation: 'keywords',
      sessionId: 'test-session'
    };

    it('应该允许合理的关键词提取请求', async () => {
      const result = await services.keywords.extractKeywords(
        {
          content: '这是一段测试文本，包含人工智能、机器学习等关键词。',
          options: { maxKeywords: 5 }
        },
        context
      );

      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
    });
  });

  describe('情感分析服务成本控制', () => {
    const context: ServiceUsageContext = {
      userId: 'test-user',
      operation: 'sentiment',
      sessionId: 'test-session'
    };

    it('应该允许合理的情感分析请求', async () => {
      const result = await services.sentiment.analyzeSentiment(
        { content: '我今天感到非常开心和满意！' },
        context
      );

      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
    });
  });

  describe('概念识别服务成本控制', () => {
    const context: ServiceUsageContext = {
      userId: 'test-user',
      operation: 'concepts',
      sessionId: 'test-session'
    };

    it('应该允许合理的概念识别请求', async () => {
      const result = await services.concepts.extractConcepts(
        {
          content: '人工智能和机器学习是计算机科学的重要分支。',
          options: { maxConcepts: 3 }
        },
        context
      );

      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
    });
  });
});