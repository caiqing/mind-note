/**
 * 关键概念识别服务测试用例 - T103.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConceptService, createConceptService } from '../concept-service';
import { ConceptRequest } from '../concept-service';

// Mock providers
vi.mock('../../providers/openai-provider-v2', () => ({
  createOpenAIProviderV2: vi.fn(),
}));

vi.mock('../../providers/claude-provider', () => ({
  createClaudeProvider: vi.fn(),
}));

vi.mock('../../ai-config', () => ({
  aiConfig: {
    getFallbackOrder: vi.fn(() => ['openai', 'anthropic']),
    calculateCost: vi.fn(() => 0.0005),
  },
}));

import { createOpenAIProviderV2 } from '../../providers/openai-provider-v2';
import { createClaudeProvider } from '../../providers/claude-provider';
import { aiConfig } from '../../ai-config';

describe('ConceptService', () => {
  let service: ConceptService;
  let mockOpenAIProvider: any;
  let mockClaudeProvider: any;

  beforeEach(() => {
    // Mock providers
    mockOpenAIProvider = {
      name: 'openai',
      extractKeyConcepts: vi.fn(),
    };

    mockClaudeProvider = {
      name: 'anthropic',
      extractKeyConcepts: vi.fn(),
    };

    (createOpenAIProviderV2 as vi.Mock).mockReturnValue(mockOpenAIProvider);
    (createClaudeProvider as vi.Mock).mockReturnValue(mockClaudeProvider);

    // Suppress console output for tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = createConceptService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('应该正确初始化所有可用的提供商', () => {
      expect(createOpenAIProviderV2).toHaveBeenCalled();
      expect(createClaudeProvider).toHaveBeenCalled();
    });

    it('应该设置正确的fallback顺序', () => {
      expect(aiConfig.getFallbackOrder).toHaveBeenCalled();
    });

    it('应该在没有提供商时抛出错误', () => {
      (createOpenAIProviderV2 as vi.Mock).mockImplementation(() => {
        throw new Error('OpenAI not available');
      });
      (createClaudeProvider as vi.Mock).mockImplementation(() => {
        throw new Error('Claude not available');
      });

      expect(() => createConceptService()).toThrow('No AI providers available for concept extraction');
    });
  });

  describe('extractConcepts', () => {
    const mockRequest: ConceptRequest = {
      content: '人工智能和机器学习是当前技术发展的重要趋势。深度学习作为机器学习的一个重要分支，在图像识别、自然语言处理和推荐系统等领域展现出强大的能力。',
      userId: 'test-user-001',
    };

    it('应该使用首选提供商提取概念', async () => {
      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          {
            concept: '人工智能',
            category: 'technology',
            relevance: 0.9,
            complexity: 0.7,
            importance: 0.8,
            context: ['技术发展'],
            synonyms: ['AI'],
          },
          {
            concept: '机器学习',
            category: 'technology',
            relevance: 0.8,
            complexity: 0.6,
            importance: 0.7,
            context: ['技术趋势'],
            synonyms: ['ML'],
          }
        ]
      });

      const result = await service.extractConcepts(mockRequest);

      expect(result).toMatchObject({
        provider: 'openai',
        processingTime: expect.any(Number),
        cost: 0.0005,
        tokens: expect.objectContaining({
          input: expect.any(Number),
          output: expect.any(Number),
          total: expect.any(Number),
        }),
        statistics: expect.objectContaining({
          totalConcepts: expect.any(Number),
          avgRelevance: expect.any(Number),
          avgComplexity: expect.any(Number),
          categories: expect.any(Array),
          relationsCount: expect.any(Number),
        }),
        metadata: expect.objectContaining({
          requestId: expect.stringMatching(/^concept_/),
          processedAt: expect.any(Date),
          version: '1.0.0',
          language: 'zh',
        }),
      });

      expect(result.concepts).toHaveLength(2);
      expect(result.concepts[0].concept).toBe('人工智能');
      expect(mockOpenAIProvider.extractKeyConcepts).toHaveBeenCalled();
      expect(mockClaudeProvider.extractKeyConcepts).not.toHaveBeenCalled();
    });

    it('应该在首选提供商失败时使用fallback提供商', async () => {
      mockOpenAIProvider.extractKeyConcepts.mockRejectedValue(new Error('OpenAI failed'));
      mockClaudeProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          {
            concept: '深度学习',
            category: 'technology',
            relevance: 0.7,
            complexity: 0.8,
            importance: 0.6,
          }
        ]
      });

      const result = await service.extractConcepts(mockRequest);

      expect(result.provider).toBe('anthropic');
      expect(result.concepts).toHaveLength(1);
      expect(result.concepts[0].concept).toBe('深度学习');
      expect(mockOpenAIProvider.extractKeyConcepts).toHaveBeenCalled();
      expect(mockClaudeProvider.extractKeyConcepts).toHaveBeenCalled();
    });

    it('应该在所有提供商都失败时抛出错误', async () => {
      mockOpenAIProvider.extractKeyConcepts.mockRejectedValue(new Error('OpenAI failed'));
      mockClaudeProvider.extractKeyConcepts.mockRejectedValue(new Error('Claude failed'));

      await expect(service.extractConcepts(mockRequest)).rejects.toThrow('All providers failed to extract concepts');
    });

    it('应该使用指定的首选提供商', async () => {
      const requestWithPreference: ConceptRequest = {
        ...mockRequest,
        preferredProvider: 'anthropic',
      };

      mockClaudeProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          {
            concept: '自然语言处理',
            category: 'technology',
            relevance: 0.6,
            complexity: 0.7,
            importance: 0.5,
          }
        ]
      });

      const result = await service.extractConcepts(requestWithPreference);

      expect(result.provider).toBe('anthropic');
      expect(result.concepts).toHaveLength(1);
      expect(result.concepts[0].concept).toBe('自然语言处理');
      expect(mockClaudeProvider.extractKeyConcepts).toHaveBeenCalled();
      expect(mockOpenAIProvider.extractKeyConcepts).not.toHaveBeenCalled();
    });
  });

  describe('概念处理算法', () => {
    it('应该正确解析JSON格式的概念结果', async () => {
      const request: ConceptRequest = {
        content: '区块链技术在金融领域的应用越来越广泛。',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          {
            concept: '区块链技术',
            category: 'technology',
            relevance: 0.8,
            complexity: 0.7,
            importance: 0.9,
            context: ['金融领域'],
            synonyms: ['blockchain'],
          },
          {
            concept: '金融应用',
            category: 'business',
            relevance: 0.6,
            complexity: 0.5,
            importance: 0.7,
            context: ['广泛'],
            synonyms: ['fintech'],
          }
        ]
      });

      const result = await service.extractConcepts(request);

      expect(result.concepts).toHaveLength(2);
      expect(result.concepts[0].concept).toBe('区块链技术');
      expect(result.concepts[0].category).toBe('technology');
      expect(result.concepts[1].concept).toBe('金融应用');
      expect(result.concepts[1].category).toBe('business');
    });

    it('应该正确解析字符串格式的概念结果', async () => {
      const request: ConceptRequest = {
        content: '云计算和大数据技术正在改变传统IT架构。',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue(JSON.stringify({
        concepts: [
          {
            concept: '云计算',
            category: 'technology',
            relevance: 0.9,
            complexity: 0.6,
            importance: 0.8,
          }
        ]
      }));

      const result = await service.extractConcepts(request);

      expect(result.concepts).toHaveLength(1);
      expect(result.concepts[0].concept).toBe('云计算');
      expect(result.concepts[0].category).toBe('technology');
    });

    it('应该处理无效的概念分析结果', async () => {
      const request: ConceptRequest = {
        content: '简单内容',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue('无法解析的文本内容');

      const result = await service.extractConcepts(request);

      // 应该回退到文本解析
      expect(result.concepts.length).toBeGreaterThan(0);
      expect(result.concepts[0].concept).toBeDefined();
    });

    it('应该正确标准化概念分类', async () => {
      const request: ConceptRequest = {
        content: '测试内容',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          { concept: 'AI技术', category: '技术' },
          { concept: '商业模式', category: 'business' },
          { concept: '学习方法', category: '教育' },
          { concept: '其他概念', category: '其他' },
        ]
      });

      const result = await service.extractConcepts(request);

      expect(result.concepts[0].category).toBe('technology');
      expect(result.concepts[1].category).toBe('business');
      expect(result.concepts[2].category).toBe('education');
      expect(result.concepts[3].category).toBe('other');
    });

    it('应该按重要性排序概念', async () => {
      const request: ConceptRequest = {
        content: '测试内容',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          { concept: '概念A', importance: 0.3 },
          { concept: '概念B', importance: 0.9 },
          { concept: '概念C', importance: 0.6 },
        ]
      });

      const result = await service.extractConcepts(request);

      expect(result.concepts[0].concept).toBe('概念B'); // 最高重要性
      expect(result.concepts[1].concept).toBe('概念C'); // 中等重要性
      expect(result.concepts[2].concept).toBe('概念A'); // 最低重要性
    });

    it('应该去重相似概念', async () => {
      const request: ConceptRequest = {
        content: '测试内容',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          { concept: '人工智能' },
          { concept: 'AI' }, // 同义词
          { concept: '人工智能' }, // 重复
          { concept: '机器学习' },
        ]
      });

      const result = await service.extractConcepts(request);

      // 应该去重，"人工智能"和"AI"应该被视为不同概念
      const duplicateConcepts = result.concepts.filter(c => c.concept === '人工智能');
      expect(duplicateConcepts.length).toBe(1); // 重复的"人工智能"应该被去重
    });
  });

  describe('置信度计算', () => {
    it('应该基于完整性计算置信度', async () => {
      const request: ConceptRequest = {
        content: '测试内容',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          {
            concept: '完整概念',
            definition: '这是一个详细的定义，包含足够的信息来解释这个概念。',
            context: ['相关上下文'],
            synonyms: ['同义词'],
            category: 'technology',
            relations: [{ type: 'related_to', target: '相关概念', strength: 0.7 }],
          },
          {
            concept: '简单概念',
            // 缺少详细信息
          }
        ]
      });

      const result = await service.extractConcepts(request);

      expect(result.concepts[0].confidence).toBeGreaterThan(result.concepts[1].confidence);
      expect(result.concepts[0].confidence).toBeGreaterThan(0.8); // 完整概念应该有高置信度
    });

    it('应该处理缺失的属性', async () => {
      const request: ConceptRequest = {
        content: '测试内容',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          {
            concept: '最小概念',
            // 所有属性都缺失
          }
        ]
      });

      const result = await service.extractConcepts(request);

      expect(result.concepts[0].confidence).toBe(0.5); // 基础置信度
    });
  });

  describe('关系识别', () => {
    it('应该在请求时包含关系识别', async () => {
      const request: ConceptRequest = {
        content: '机器学习是人工智能的一个分支，深度学习又是机器学习的一个子领域。',
        userId: 'user1',
        includeRelations: true,
      };

      mockOpenAIProvider.extractKeyConcepts
        .mockResolvedValueOnce({
          concepts: [
            { concept: '机器学习' },
            { concept: '人工智能' },
            { concept: '深度学习' },
          ]
        })
        .mockResolvedValueOnce({
          relations: [
            {
              source: '机器学习',
              target: '人工智能',
              type: 'is_a',
              strength: 0.9,
              description: '机器学习是人工智能的子集'
            },
            {
              source: '深度学习',
              target: '机器学习',
              type: 'is_a',
              strength: 0.8,
              description: '深度学习是机器学习的子集'
            }
          ]
        });

      const result = await service.extractConcepts(request);

      expect(result.concepts[0].relations).toBeDefined();
      expect(result.concepts[0].relations?.length).toBeGreaterThan(0);
      expect(result.statistics.relationsCount).toBeGreaterThan(0);
    });

    it('应该标准化关系类型', async () => {
      const request: ConceptRequest = {
        content: '测试内容',
        userId: 'user1',
        includeRelations: true,
      };

      mockOpenAIProvider.extractKeyConcepts
        .mockResolvedValueOnce({
          concepts: [{ concept: '概念A' }, { concept: '概念B' }]
        })
        .mockResolvedValueOnce({
          relations: [
            {
              source: '概念A',
              target: '概念B',
              type: 'is-a', // 非标准格式
              strength: 0.7
            }
          ]
        });

      const result = await service.extractConcepts(request);

      expect(result.concepts[0].relations?.[0].type).toBe('is_a'); // 标准化后的类型
    });

    it('应该处理关系识别失败', async () => {
      const request: ConceptRequest = {
        content: '测试内容',
        userId: 'user1',
        includeRelations: true,
      };

      mockOpenAIProvider.extractKeyConcepts
        .mockResolvedValueOnce({
          concepts: [{ concept: '概念A' }]
        })
        .mockRejectedValueOnce(new Error('Relation extraction failed'));

      const result = await service.extractConcepts(request);

      // 关系识别失败不应该影响概念提取
      expect(result.concepts).toHaveLength(1);
      expect(result.concepts[0].relations).toEqual([]);
    });
  });

  describe('批量处理', () => {
    it('应该批量处理多个概念提取请求', async () => {
      const requests: ConceptRequest[] = [
        { content: '第一段：介绍人工智能的基本概念。', userId: 'user1' },
        { content: '第二段：讨论机器学习的算法。', userId: 'user2' },
        { content: '第三段：涉及深度学习的应用。', userId: 'user3' },
      ];

      mockOpenAIProvider.extractKeyConcepts
        .mockResolvedValueOnce({ concepts: [{ concept: '人工智能', category: 'technology' }] })
        .mockResolvedValueOnce({ concepts: [{ concept: '机器学习', category: 'technology' }] })
        .mockResolvedValueOnce({ concepts: [{ concept: '深度学习', category: 'technology' }] });

      const results = await service.extractBatchConcepts(requests);

      expect(results).toHaveLength(3);
      expect(results[0].concepts[0].concept).toBe('人工智能');
      expect(results[1].concepts[0].concept).toBe('机器学习');
      expect(results[2].concepts[0].concept).toBe('深度学习');
    });

    it('应该处理部分失败的请求', async () => {
      const requests: ConceptRequest[] = [
        { content: '内容1', userId: 'user1' },
        { content: '内容2', userId: 'user2' },
        { content: '内容3', userId: 'user3' },
      ];

      mockOpenAIProvider.extractKeyConcepts
        .mockResolvedValueOnce({ concepts: [{ concept: '概念1' }] })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ concepts: [{ concept: '概念3' }] });

      const results = await service.extractBatchConcepts(requests);

      expect(results).toHaveLength(2);
      expect(results[0].concepts[0].concept).toBe('概念1');
      expect(results[1].concepts[0].concept).toBe('概念3');
    });

    it('应该控制并发数量', async () => {
      const requests: ConceptRequest[] = Array.from({ length: 10 }, (_, i) => ({
        content: `批量测试内容${i + 1}`,
        userId: `user${i + 1}`,
      }));

      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      mockOpenAIProvider.extractKeyConcepts.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrentCalls--;
        return { concepts: [{ concept: '测试概念' }] };
      });

      await service.extractBatchConcepts(requests);

      expect(maxConcurrentCalls).toBeLessThanOrEqual(3); // batchSize = 3
    });
  });

  describe('多语言支持', () => {
    it('应该支持中文概念提取', async () => {
      const request: ConceptRequest = {
        content: '人工智能技术在各个领域都有广泛应用。',
        language: 'zh',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          { concept: '人工智能技术', category: 'technology' }
        ]
      });

      const result = await service.extractConcepts(request);

      expect(result.metadata.language).toBe('zh');
      expect(mockOpenAIProvider.extractKeyConcepts).toHaveBeenCalledWith(
        expect.stringContaining('请从以下文本中提取')
      );
    });

    it('应该支持英文概念提取', async () => {
      const request: ConceptRequest = {
        content: 'Artificial intelligence is transforming many industries.',
        language: 'en',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          { concept: 'Artificial intelligence', category: 'technology' }
        ]
      });

      const result = await service.extractConcepts(request);

      expect(result.metadata.language).toBe('en');
      expect(mockOpenAIProvider.extractKeyConcepts).toHaveBeenCalledWith(
        expect.stringContaining('Please extract')
      );
    });
  });

  describe('服务方法', () => {
    it('应该返回可用的提供商列表', () => {
      const providers = service.getAvailableProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });

    it('应该执行健康检查', async () => {
      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.providers).toContain('openai');
      expect(health.providers).toContain('anthropic');
    });

    it('应该在只有一个提供商时返回degraded状态', async () => {
      (createClaudeProvider as vi.Mock).mockImplementation(() => {
        throw new Error('Claude not available');
      });

      const degradedService = createConceptService();
      const health = await degradedService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.providers).toEqual(['openai']);
    });

    it('应该返回服务统计信息', () => {
      const stats = service.getStats();

      expect(stats).toMatchObject({
        totalProviders: 2,
        availableProviders: 2,
        fallbackOrder: ['openai', 'anthropic'],
        supportedLanguages: ['zh', 'en'],
        supportedCategories: [
          'technology', 'business', 'education', 'lifestyle',
          'creative', 'personal', 'other'
        ],
        supportedRelations: [
          'is_a', 'part_of', 'related_to', 'causes',
          'enables', 'requires', 'opposite_of'
        ],
        maxConcepts: 20,
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理JSON解析错误', async () => {
      const request: ConceptRequest = {
        content: '测试内容',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue('无效的JSON字符串{{');

      const result = await service.extractConcepts(request);

      // 应该回退到文本解析
      expect(result.concepts.length).toBeGreaterThan(0);
      expect(result.concepts[0].concept).toBeDefined();
    });

    it('应该处理数值范围错误', async () => {
      const request: ConceptRequest = {
        content: '测试内容',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          {
            concept: '测试概念',
            relevance: 2, // 超出范围
            complexity: -1, // 超出范围
            importance: 5, // 超出范围
          }
        ]
      });

      const result = await service.extractConcepts(request);

      expect(result.concepts[0].relevance).toBeLessThanOrEqual(1);
      expect(result.concepts[0].complexity).toBeGreaterThanOrEqual(0);
      expect(result.concepts[0].importance).toBeLessThanOrEqual(1);
    });

    it('应该过滤无效概念', async () => {
      const request: ConceptRequest = {
        content: '测试内容',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeyConcepts.mockResolvedValue({
        concepts: [
          { concept: '有效概念' },
          { concept: '' }, // 空字符串
          { concept: 'a' }, // 太短
          { concept: '这是一个非常非常长的概念名称，超过了最大长度限制' }, // 太长
        ]
      });

      const result = await service.extractConcepts(request);

      expect(result.concepts).toHaveLength(1);
      expect(result.concepts[0].concept).toBe('有效概念');
    });
  });
});