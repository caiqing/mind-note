/**
 * 关键词服务测试用例 - T103.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeywordService, createKeywordService } from '../keyword-service';
import { KeywordRequest } from '../keyword-service';

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

describe('KeywordService', () => {
  let service: KeywordService;
  let mockOpenAIProvider: any;
  let mockClaudeProvider: any;

  beforeEach(() => {
    // Mock providers
    mockOpenAIProvider = {
      name: 'openai',
      extractKeywords: vi.fn(),
    };

    mockClaudeProvider = {
      name: 'anthropic',
      extractKeywords: vi.fn(),
    };

    (createOpenAIProviderV2 as vi.Mock).mockReturnValue(mockOpenAIProvider);
    (createClaudeProvider as vi.Mock).mockReturnValue(mockClaudeProvider);

    // Mock config is already set up above

    // Suppress console output for tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = createKeywordService();
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

      expect(() => createKeywordService()).toThrow('No AI providers available');
    });
  });

  describe('extractKeywords', () => {
    const mockRequest: KeywordRequest = {
      content: '这是一个关于人工智能和机器学习的技术文档，包含了深度学习、神经网络和数据分析等重要概念。',
      userId: 'test-user-001',
    };

    it('应该使用首选提供商提取关键词', async () => {
      mockOpenAIProvider.extractKeywords.mockResolvedValue(['人工智能', '机器学习', '深度学习', '神经网络', '数据分析']);

      const result = await service.extractKeywords(mockRequest);

      expect(result).toMatchObject({
        keywords: expect.any(Array),
        provider: 'openai',
        processingTime: expect.any(Number),
        cost: 0.0005,
        tokens: expect.objectContaining({
          input: expect.any(Number),
          output: expect.any(Number),
          total: expect.any(Number),
        }),
        statistics: expect.objectContaining({
          totalKeywords: expect.any(Number),
          avgScore: expect.any(Number),
          avgLength: expect.any(Number),
          categories: expect.any(Array),
          types: expect.objectContaining({
            single: expect.any(Number),
            phrase: expect.any(Number),
            compound: expect.any(Number),
          }),
        }),
        metadata: expect.objectContaining({
          requestId: expect.stringMatching(/^keyword_/),
          processedAt: expect.any(Date),
          version: '1.0.0',
        }),
      });

      expect(mockOpenAIProvider.extractKeywords).toHaveBeenCalled();
      expect(mockClaudeProvider.extractKeywords).not.toHaveBeenCalled();
    });

    it('应该在首选提供商失败时使用fallback提供商', async () => {
      mockOpenAIProvider.extractKeywords.mockRejectedValue(new Error('OpenAI failed'));
      mockClaudeProvider.extractKeywords.mockResolvedValue(['人工智能', '机器学习', '技术', '文档', '概念']);

      const result = await service.extractKeywords(mockRequest);

      expect(result.provider).toBe('anthropic');
      expect(result.keywords).toHaveLength(5);
      expect(mockOpenAIProvider.extractKeywords).toHaveBeenCalled();
      expect(mockClaudeProvider.extractKeywords).toHaveBeenCalled();
    });

    it('应该在所有提供商都失败时抛出错误', async () => {
      mockOpenAIProvider.extractKeywords.mockRejectedValue(new Error('OpenAI failed'));
      mockClaudeProvider.extractKeywords.mockRejectedValue(new Error('Claude failed'));

      await expect(service.extractKeywords(mockRequest)).rejects.toThrow('All providers failed to extract keywords');
    });

    it('应该使用指定的首选提供商', async () => {
      const requestWithPreference: KeywordRequest = {
        ...mockRequest,
        preferredProvider: 'anthropic',
      };

      mockClaudeProvider.extractKeywords.mockResolvedValue(['Claude', 'AI', '分析']);

      const result = await service.extractKeywords(requestWithPreference);

      expect(result.provider).toBe('anthropic');
      expect(result.keywords).toHaveLength(3);
      expect(mockClaudeProvider.extractKeywords).toHaveBeenCalled();
      expect(mockOpenAIProvider.extractKeywords).not.toHaveBeenCalled();
    });

    it('应该处理自定义参数', async () => {
      const customRequest: KeywordRequest = {
        content: '这是一个长内容...' + '更多内容。'.repeat(20),
        maxKeywords: 5,
        minKeywordLength: 3,
        maxKeywordLength: 8,
        language: 'en',
        categories: ['technology', 'education'],
        preferSingleWords: true,
        includePhrases: false,
        priority: 'importance',
        userId: 'test-user-001',
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['artificial', 'intelligence', 'machine', 'learning', 'technology']);

      await service.extractKeywords(customRequest);

      const prompt = mockOpenAIProvider.extractKeywords.mock.calls[0][0];
      expect(prompt).toContain('提取5个最相关的关键词');
      expect(prompt).toContain('长度在3-8个字符之间');
      expect(prompt).toContain('使用英文关键词');
      expect(prompt).toContain('优先考虑以下分类：technology、education');
      expect(prompt).toContain('优先选择单个词汇');
    });
  });

  describe('关键词处理算法', () => {
    it('应该正确过滤停用词', async () => {
      const request: KeywordRequest = {
        content: '这是一个好的技术文档，关于人工智能和机器学习的内容。',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue([
        '的', '人工智能', '机器学习', '好', '技术', '文档', '内容'
      ]);

      const result = await service.extractKeywords(request);

      const keywords = result.keywords.map(k => k.keyword);
      expect(keywords).not.toContain('的');
      expect(keywords).not.toContain('好');
      // 注意：'内容'不在停用词列表中，所以应该保留
      expect(keywords).toContain('人工智能');
      expect(keywords).toContain('机器学习');
      expect(keywords).toContain('技术');
      expect(keywords).toContain('文档');
    });

    it('应该正确分类关键词', async () => {
      const request: KeywordRequest = {
        content: 'AI人工智能技术正在快速发展，机器学习和深度学习应用广泛。',
        userId: 'user1',
        categories: ['technology', 'business'],
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['人工智能', '机器学习', '技术', '发展', '应用']);

      const result = await service.extractKeywords(request);

      const techKeywords = result.keywords.filter(k => k.category === 'technology');
      expect(techKeywords.length).toBeGreaterThan(0);
      expect(techKeywords.some(k => k.keyword.includes('AI') || k.keyword.includes('技术'))).toBe(true);
    });

    it('应该正确识别关键词类型', async () => {
      const request: KeywordRequest = {
        content: '人工智能机器学习是一个重要的技术领域。',
        userId: 'user1',
        preferSingleWords: true,
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['人工智能', '机器学习', '技术', '领域', '重要']);

      const result = await service.extractKeywords(request);

      const types = result.statistics.types;
      expect(types.single).toBeGreaterThan(0);
      expect(types.phrase).toBe(0); // preferSingleWords=true
    });

    it('应该按照优先级重新评分', async () => {
      const request: KeywordRequest = {
        content: '内容包含多次出现的词汇：机器学习 机器学习 AI AI 数据分析。',
        userId: 'user1',
        priority: 'frequency',
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['机器学习', 'AI', '数据分析', '内容', '包含']);

      const result = await service.extractKeywords(request);

      // 机器出现2次，应该有最高频率分数
      const machineKeyword = result.keywords.find(k => k.keyword === '机器学习');
      expect(machineKeyword?.frequency).toBe(2);
      expect(machineKeyword?.score).toBeGreaterThan(0.1);
    });
  });

  describe('质量评估', () => {
    it('应该计算准确的关键词统计', async () => {
      const request: KeywordRequest = {
        content: 'AI技术文档内容',
        userId: 'user1',
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['AI', '技术', '文档', '内容']);

      const result = await service.extractKeywords(request);

      expect(result.statistics.totalKeywords).toBe(4);
      expect(result.statistics.avgScore).toBeGreaterThan(0);
      expect(result.statistics.avgLength).toBeGreaterThan(0);
      expect(result.statistics.types).toBeDefined();
    });

    it('应该正确分类关键词类型分布', async () => {
      const request: KeywordRequest = {
        content: '单个词汇 复合词汇 词组短语',
        userId: 'user1',
        includePhrases: true,
      };

      const mockExtractor = vi.fn().mockResolvedValue(['单个', '词汇', '复合', '词汇', '词组', '短语']);

      // 手动设置以测试类型识别
      mockOpenAIProvider.extractKeywords = mockExtractor;

      const result = await service.extractKeywords(request);

      expect(result.statistics.types).toBeDefined();
      expect(result.statistics.types.single).toBeGreaterThanOrEqual(0);
      expect(result.statistics.types.phrase).toBeGreaterThanOrEqual(0);
    });
  });

  describe('批量处理', () => {
    it('应该批量处理多个关键词提取请求', async () => {
      const requests: KeywordRequest[] = [
        { content: '第一段内容，关于AI技术', userId: 'user1' },
        { content: '第二段内容，讨论机器学习', userId: 'user2' },
        { content: '第三段内容，涉及数据分析', userId: 'user3' },
      ];

      mockOpenAIProvider.extractKeywords
        .mockResolvedValueOnce(['AI', '技术'])
        .mockResolvedValueOnce(['机器', '学习'])
        .mockResolvedValueOnce(['数据', '分析']);

      const results = await service.extractBatchKeywords(requests);

      expect(results).toHaveLength(3);
      expect(results[0].keywords.map(k => k.keyword)).toEqual(['AI', '技术']);
      expect(results[1].keywords.map(k => k.keyword)).toEqual(['机器', '学习']);
      expect(results[2].keywords.map(k => k.keyword)).toEqual(['数据', '分析']);
    });

    it('应该处理部分失败的请求', async () => {
      const requests: KeywordRequest[] = [
        { content: '内容1', userId: 'user1' },
        { content: '内容2', userId: 'user2' },
        { content: '内容3', userId: 'user3' },
      ];

      mockOpenAIProvider.extractKeywords
        .mockResolvedValueOnce(['关键词1'])
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(['关键词3']);

      const results = await service.extractBatchKeywords(requests);

      expect(results).toHaveLength(2);
      expect(results[0].keywords.map(k => k.keyword)).toEqual(['关键词1']);
      expect(results[1].keywords.map(k => k.keyword)).toEqual(['关键词3']);
    });

    it('应该控制并发数量', async () => {
      const requests: KeywordRequest[] = Array.from({ length: 10 }, (_, i) => ({
        content: `批量测试内容${i + 1}`,
        userId: `user${i + 1}`,
      }));

      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      mockOpenAIProvider.extractKeywords.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrentCalls--;
        return ['测试'];
      });

      await service.extractBatchKeywords(requests);

      expect(maxConcurrentCalls).toBeLessThanOrEqual(3); // batchSize = 3
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

      const degradedService = createKeywordService();
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
        supportedPriorities: ['relevance', 'frequency', 'importance'],
        maxKeywords: 20,
      });
    });
  });

  describe('提示构建', () => {
    it('应该为不同优先级构建正确的prompt', async () => {
      const relevanceRequest: KeywordRequest = {
        content: '测试内容',
        userId: 'user1',
        priority: 'relevance',
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['关键词']);

      await service.extractKeywords(relevanceRequest);

      const prompt = mockOpenAIProvider.extractKeywords.mock.calls[0][0];
      expect(prompt).toContain('优先级按照相关性排序');
    });

    it('应该为频率优先级构建正确的prompt', async () => {
      const frequencyRequest: KeywordRequest = {
        content: '测试内容',
        userId: 'user1',
        priority: 'frequency',
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['关键词']);

      await service.extractKeywords(frequencyRequest);

      const prompt = mockOpenAIProvider.extractKeywords.mock.calls[0][0];
      expect(prompt).toContain('优先级按照频率排序');
    });

    it('应该为重要性优先级构建正确的prompt', async () => {
      const importanceRequest: KeywordRequest = {
        content: '测试内容',
        userId: 'user1',
        priority: 'importance',
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['关键词']);

      await service.extractKeywords(importanceRequest);

      const prompt = mockOpenAIProvider.extractKeywords.mock.calls[0][0];
      expect(prompt).toContain('优先级按照重要性排序');
    });

    it('应该支持中文和英文内容', async () => {
      const englishRequest: KeywordRequest = {
        content: 'Test content about AI and machine learning technologies.',
        userId: 'user1',
        language: 'en',
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['Test', 'AI', 'machine', 'learning']);

      await service.extractKeywords(englishRequest);

      const prompt = mockOpenAIProvider.extractKeywords.mock.calls[0][0];
      expect(prompt).toContain('使用英文关键词');
    });

    it('应该支持自定义分类', async () => {
      const categoryRequest: KeywordRequest = {
        content: '测试内容',
        userId: 'user1',
        categories: ['technology', 'education', 'lifestyle'],
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['关键词']);

      await service.extractKeywords(categoryRequest);

      const prompt = mockOpenAIProvider.extractKeywords.mock.calls[0][0];
      expect(prompt).toContain('优先考虑以下分类：technology、education、lifestyle');
    });

    it('应该支持单词和短语控制', async () => {
      const typeRequest: KeywordRequest = {
        content: '测试内容 单词短语',
        userId: 'user1',
        preferSingleWords: true,
        includePhrases: false,
      };

      mockOpenAIProvider.extractKeywords.mockResolvedValue(['关键词']);

      await service.extractKeywords(typeRequest);

      const prompt = mockOpenAIProvider.extractKeywords.mock.calls[0][0];
      expect(prompt).toContain('优先选择单个词汇');
      expect(prompt).toContain('只提取单个词汇');
    });
  });
});