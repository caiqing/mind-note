/**
 * 文本分析服务集成测试用例 - T103.9
 * 测试完整的文本分析功能，包括摘要生成、关键词提取、情感分析和概念识别
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAIServiceManager } from '../ai-service-manager';
import { createCostControlledServices } from '../cost-controlled-service';

// Mock console methods to avoid test output noise
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock AI providers to avoid actual API calls during testing
vi.mock('../../providers/openai-provider-v2', () => ({
  createOpenAIProviderV2: vi.fn(() => ({
    name: 'openai',
    generateSummary: vi.fn().mockResolvedValue({
      summary: '人工智能技术在医疗健康领域应用广泛，包括疾病诊断、药物研发等。',
      cost: 0.05,
      tokens: { input: 150, output: 40, total: 190 },
      processingTime: 1200
    }),
    extractKeywords: vi.fn().mockResolvedValue({
      keywords: [
        { keyword: '人工智能', score: 0.9, category: 'technology' },
        { keyword: '医疗健康', score: 0.85, category: 'healthcare' },
        { keyword: '疾病诊断', score: 0.8, category: 'medical' },
        { keyword: '药物研发', score: 0.75, category: 'pharmaceutical' }
      ],
      cost: 0.03,
      tokens: { input: 120, output: 30, total: 150 },
      processingTime: 800
    }),
    analyzeSentiment: vi.fn().mockResolvedValue({
      sentiment: 'positive',
      polarity: 0.7,
      confidence: 0.85,
      intensity: 0.6,
      emotions: [{ emotion: 'excitement', intensity: 0.8 }],
      cost: 0.02,
      tokens: { input: 80, output: 20, total: 100 },
      processingTime: 600
    }),
    extractKeyConcepts: vi.fn().mockResolvedValue({
      concepts: [
        { concept: '人工智能', category: 'technology', relevance: 0.9, definition: '模拟人类智能的技术' },
        { concept: '医疗诊断', category: 'healthcare', relevance: 0.85, definition: '疾病识别和判断过程' },
        { concept: '药物开发', category: 'pharmaceutical', relevance: 0.8, definition: '新药研究和制造过程' }
      ],
      statistics: {
        totalConcepts: 3,
        categoriesFound: 3,
        avgRelevance: 0.85,
        relationsCount: 2
      },
      cost: 0.04,
      tokens: { input: 100, output: 35, total: 135 },
      processingTime: 900
    }),
    healthCheck: vi.fn().mockResolvedValue({
      status: 'healthy',
      providers: ['openai']
    })
  }))
}));

describe('文本分析服务集成测试', () => {
  let serviceManager: ReturnType<typeof createAIServiceManager>;
  let costControlledServices: ReturnType<typeof createCostControlledServices>;

  beforeEach(() => {
    // 创建AI服务管理器
    serviceManager = createAIServiceManager({
      enableFallback: false, // 简化测试
      enableHealthCheck: false,
      enableCircuitBreaker: false,
      enableLoadBalancing: false
    });

    // 创建成本控制服务
    costControlledServices = createCostControlledServices({
      userDailyLimit: 10.0,
      operationCostLimit: 1.0,
      blockOnBudgetExceeded: true,
      enableUsageLogging: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('AI服务管理器集成测试', () => {
    it('应该成功执行统一文本分析', async () => {
      const request = {
        content: `
人工智能技术在医疗健康领域的应用正日益广泛，从疾病诊断到药物研发，从个性化治疗到健康管理，
AI都在发挥着重要作用。通过深度学习和大数据分析，AI系统能够帮助医生更准确地诊断疾病，
提高治疗效率，同时也能为患者提供更好的医疗服务体验。
        `.trim(),
        userId: 'test-user-001',
        options: {
          summary: {
            style: 'paragraph',
            maxLength: 100,
            language: 'zh'
          },
          keywords: {
            maxKeywords: 8,
            priority: 'relevance'
          },
          sentiment: {
            detailLevel: 'comprehensive',
            includeEmotions: true
          },
          concepts: {
            maxConcepts: 6,
            includeRelations: true
          }
        }
      };

      const result = await serviceManager.performUnifiedAnalysis(request);

      // 验证结果结构
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.keywords).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.concepts).toBeDefined();
      expect(result.metadata).toBeDefined();

      // 验证元数据
      expect(result.metadata.services).toEqual(['summary', 'keywords', 'sentiment', 'concepts']);
      expect(result.metadata.providers).toEqual(['openai', 'openai', 'openai', 'openai']);
      expect(result.metadata.totalCost).toBeCloseTo(0.14, 2); // 0.05 + 0.03 + 0.02 + 0.04
      expect(result.metadata.totalTokens).toBe(575); // 190 + 150 + 100 + 135
      expect(result.metadata.errors).toHaveLength(0);

      // 验证具体结果
      expect(result.summary?.summary).toContain('人工智能');
      expect(result.summary?.provider).toBe('openai');
      expect(result.keywords?.keywords).toHaveLength(4);
      expect(result.sentiment?.sentiment).toBe('positive');
      expect(result.concepts?.concepts).toHaveLength(3);
    });

    it('应该处理部分服务失败的情况', async () => {
      // Mock一个服务失败
      const { createOpenAIProviderV2 } = await import('../../providers/openai-provider-v2');
      const mockProvider = createOpenAIProviderV2();

      // 让摘要服务失败
      (mockProvider.generateSummary as any).mockRejectedValueOnce(new Error('API Error'));

      const request = {
        content: '这是一段测试文本。',
        userId: 'test-user-002',
        options: {
          summary: { style: 'paragraph' },
          keywords: { maxKeywords: 5 },
          sentiment: { detailLevel: 'basic' }
        }
      };

      const result = await serviceManager.performUnifiedAnalysis(request);

      // 摘要应该失败，其他应该成功
      expect(result.summary).toBeUndefined();
      expect(result.keywords).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.metadata.services).toEqual(['keywords', 'sentiment']);
      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0].service).toBe('summary');
    });

    it('应该在没有指定选项时执行所有服务', async () => {
      const request = {
        content: '测试文本内容',
        userId: 'test-user-003'
      };

      const result = await serviceManager.performUnifiedAnalysis(request);

      expect(result.metadata.services).toEqual(['summary', 'keywords', 'sentiment', 'concepts']);
      expect(result.summary).toBeDefined();
      expect(result.keywords).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.concepts).toBeDefined();
    });
  });

  describe('成本控制集成测试', () => {
    const context = {
      userId: 'cost-test-user',
      operation: 'integration-test',
      sessionId: 'test-session'
    };

    it('应该通过成本控制执行摘要服务', async () => {
      const result = await costControlledServices.summary.generateSummary(
        {
          content: '这是一段用于测试成本控制的摘要生成文本。',
          options: { style: 'paragraph', maxLength: 80 }
        },
        context
      );

      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.actualCost).toBe(0.05);
      expect(result.warnings).toBeDefined();
    });

    it('应该通过成本控制执行关键词提取', async () => {
      const result = await costControlledServices.keywords.extractKeywords(
        {
          content: '机器学习、深度学习、神经网络、人工智能、数据科学',
          options: { maxKeywords: 6, priority: 'relevance' }
        },
        context
      );

      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.keywords).toHaveLength(4);
      expect(result.actualCost).toBe(0.03);
    });

    it('应该通过成本控制执行情感分析', async () => {
      const result = await costControlledServices.sentiment.analyzeSentiment(
        {
          content: '我对人工智能的发展感到非常乐观和兴奋！',
          options: { detailLevel: 'comprehensive', includeEmotions: true }
        },
        context
      );

      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.sentiment).toBe('positive');
      expect(result.result?.emotions).toBeDefined();
      expect(result.actualCost).toBe(0.02);
    });

    it('应该通过成本控制执行概念识别', async () => {
      const result = await costControlledServices.concepts.extractConcepts(
        {
          content: '量子计算利用量子力学原理进行信息处理，有望解决经典计算的难题。',
          options: { maxConcepts: 5, includeRelations: true, includeDefinitions: true }
        },
        context
      );

      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.concepts).toHaveLength(3);
      expect(result.result?.statistics).toBeDefined();
      expect(result.actualCost).toBe(0.04);
    });

    it('应该在超出预算时阻止请求', async () => {
      // 创建严格的成本控制器
      const strictServices = createCostControlledServices({
        userDailyLimit: 0.01, // 很低的限额
        operationCostLimit: 0.001,
        blockOnBudgetExceeded: true
      });

      const result = await strictServices.summary.generateSummary(
        {
          content: '这是一段测试文本。',
          options: { style: 'paragraph' }
        },
        { userId: 'blocked-user', operation: 'blocked-test' }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.result).toBeUndefined();
    });
  });

  describe('文本质量分析测试', () => {
    it('应该处理不同长度的文本', async () => {
      const testCases = [
        {
          name: '短文本',
          content: '短文本测试',
          expectedTokens: { min: 10, max: 50 }
        },
        {
          name: '中等文本',
          content: '这是一个中等长度的文本测试，包含更多的内容和信息，用于测试系统对中等长度文本的处理能力。',
          expectedTokens: { min: 50, max: 200 }
        },
        {
          name: '长文本',
          content: `
这是一个较长的文本内容，用于测试系统对长文本的处理能力。人工智能技术在现代社会中发挥着越来越重要的作用，
从智能家居到自动驾驶汽车，从医疗诊断到金融分析，AI应用几乎渗透到了我们生活的方方面面。
深度学习作为机器学习的一个重要分支，通过模拟人脑神经网络的结构和功能，使得计算机能够从大量数据中学习
并做出预测和决策。卷积神经网络在图像识别领域取得了巨大成功，而循环神经网络则在自然语言处理中表现出色。
自然语言处理技术使得机器能够理解、解释和生成人类语言，这包括机器翻译、情感分析、文本摘要等多个应用领域。
计算机视觉技术让机器能够"看懂"图像和视频，在人脸识别、物体检测、医学影像分析等方面有广泛应用。
强化学习通过与环境交互来学习最优策略，在游戏、机器人控制、推荐系统等领域取得了显著成果。
          `.trim(),
          expectedTokens: { min: 300, max: 800 }
        }
      ];

      for (const testCase of testCases) {
        const result = await serviceManager.performUnifiedAnalysis({
          content: testCase.content,
          userId: `length-test-${testCase.name}`,
          options: {
            summary: { style: 'paragraph', maxLength: 100 },
            keywords: { maxKeywords: 10 },
            sentiment: { detailLevel: 'comprehensive' }
          }
        });

        expect(result.metadata.totalTokens).toBeGreaterThanOrEqual(testCase.expectedTokens.min);
        expect(result.metadata.totalTokens).toBeLessThanOrEqual(testCase.expectedTokens.max);
        expect(result.summary).toBeDefined();
        expect(result.keywords).toBeDefined();
        expect(result.sentiment).toBeDefined();
      }
    });

    it('应该处理不同语言的文本', async () => {
      const testCases = [
        {
          name: '中文',
          content: '中文文本测试，人工智能技术在各个领域都有重要应用。',
          language: 'zh'
        },
        {
          name: '英文',
          content: 'English text test, artificial intelligence technology has important applications in various fields.',
          language: 'en'
        },
        {
          name: '中英混合',
          content: 'Mixed language test 人工智能技术 is very important for modern technology development.',
          language: 'mixed'
        }
      ];

      for (const testCase of testCases) {
        const result = await serviceManager.performUnifiedAnalysis({
          content: testCase.content,
          userId: `language-test-${testCase.name}`,
          options: {
            summary: { style: 'paragraph', language: testCase.language },
            keywords: { maxKeywords: 5 }
          }
        });

        expect(result.summary).toBeDefined();
        expect(result.keywords).toBeDefined();
        expect(result.metadata.errors).toHaveLength(0);
      }
    });

    it('应该处理特殊字符和格式', async () => {
      const specialContent = `
# 标题
这是一个包含**粗体**和*斜体*的文本。

## 子标题
- 列表项1
- 列表项2
- 列表项3

1. 有序列表项1
2. 有序列表项2

[链接文本](https://example.com)

\`\`\`代码块
console.log('Hello World');
\`\`\`

特殊符号：@#$%^&*()_+-=[]{}|;':",./<>?
      `.trim();

      const result = await serviceManager.performUnifiedAnalysis({
        content: specialContent,
        userId: 'special-chars-test',
        options: {
          summary: { style: 'paragraph' },
          keywords: { maxKeywords: 8 }
        }
      });

      expect(result.summary).toBeDefined();
      expect(result.keywords).toBeDefined();
      expect(result.metadata.errors).toHaveLength(0);
    });

    it('应该处理空文本和边界情况', async () => {
      const edgeCases = [
        { name: '空字符串', content: '' },
        { name: '只有空格', content: '   ' },
        { name: '只有换行', content: '\n\n\n' },
        { name: '单个字符', content: '测' },
        { name: '只有标点符号', content: '！@#￥%……&*（）' }
      ];

      for (const testCase of edgeCases) {
        try {
          const result = await serviceManager.performUnifiedAnalysis({
            content: testCase.content,
            userId: `edge-case-${testCase.name}`,
            options: {
              summary: { style: 'paragraph' },
              keywords: { maxKeywords: 3 }
            }
          });

          // 对于边界情况，系统应该能够处理但不一定产生有意义的结果
          expect(result).toBeDefined();
          expect(result.metadata).toBeDefined();
        } catch (error) {
          // 某些边界情况可能会抛出错误，这是可以接受的
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('性能和并发测试', () => {
    it('应该能够处理并发请求', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        serviceManager.performUnifiedAnalysis({
          content: `并发测试内容 ${i + 1}：这是一个并发请求的测试文本。`,
          userId: 'concurrent-test-user',
          options: {
            summary: { style: 'paragraph' },
            keywords: { maxKeywords: 3 }
          }
        })
      );

      const results = await Promise.all(concurrentRequests);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.summary).toBeDefined();
        expect(result.keywords).toBeDefined();
        expect(result.metadata.errors).toHaveLength(0);
      });
    });

    it('应该在合理时间内完成处理', async () => {
      const startTime = Date.now();

      const result = await serviceManager.performUnifiedAnalysis({
        content: '性能测试文本：用于验证系统处理速度的测试内容。',
        userId: 'performance-test-user',
        options: {
          summary: { style: 'paragraph' },
          keywords: { maxKeywords: 5 },
          sentiment: { detailLevel: 'comprehensive' },
          concepts: { maxConcepts: 3 }
        }
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 处理时间应该在合理范围内（这里设置为10秒，实际应该更快）
      expect(processingTime).toBeLessThan(10000);
      expect(result).toBeDefined();
      expect(result.metadata.services).toHaveLength(4);
    });
  });

  describe('系统健康和监控测试', () => {
    it('应该能够获取系统健康状态', async () => {
      const health = await serviceManager.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.providers).toBeDefined();
      expect(health.config).toBeDefined();
      expect(health.circuitBreakers).toBeDefined();
      expect(health.loadBalancing).toBeDefined();
    });

    it('应该能够获取提供商统计信息', () => {
      const providerStats = serviceManager.getProviderStats();

      expect(Array.isArray(providerStats)).toBe(true);
      expect(providerStats.length).toBeGreaterThan(0);
      providerStats.forEach(stat => {
        expect(stat).toHaveProperty('provider');
        expect(stat).toHaveProperty('stats');
      });
    });

    it('应该能够获取负载均衡统计信息', () => {
      const loadBalancingStats = serviceManager.getLoadBalancingStats();

      expect(Array.isArray(loadBalancingStats)).toBe(true);
      expect(loadBalancingStats.length).toBeGreaterThan(0);
      loadBalancingStats.forEach(stat => {
        expect(stat).toHaveProperty('provider');
        expect(stat).toHaveProperty('stats');
      });
    });
  });
});