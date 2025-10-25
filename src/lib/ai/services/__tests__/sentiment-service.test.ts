/**
 * 情感分析服务测试用例 - T103.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SentimentService, createSentimentService } from '../sentiment-service';
import { SentimentRequest } from '../sentiment-service';

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

describe('SentimentService', () => {
  let service: SentimentService;
  let mockOpenAIProvider: any;
  let mockClaudeProvider: any;

  beforeEach(() => {
    // Mock providers
    mockOpenAIProvider = {
      name: 'openai',
      analyzeSentiment: vi.fn(),
    };

    mockClaudeProvider = {
      name: 'anthropic',
      analyzeSentiment: vi.fn(),
    };

    (createOpenAIProviderV2 as vi.Mock).mockReturnValue(mockOpenAIProvider);
    (createClaudeProvider as vi.Mock).mockReturnValue(mockClaudeProvider);

    // Suppress console output for tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = createSentimentService();
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

      expect(() => createSentimentService()).toThrow('No AI providers available for sentiment analysis');
    });
  });

  describe('analyzeSentiment', () => {
    const mockRequest: SentimentRequest = {
      content: '这个产品真的很棒，我非常喜欢它的设计和功能！',
      userId: 'test-user-001',
    };

    it('应该使用首选提供商分析情感', async () => {
      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 0.8,
        confidence: 0.9
      });

      const result = await service.analyzeSentiment(mockRequest);

      expect(result).toMatchObject({
        sentiment: 'positive',
        polarity: 0.8,
        provider: 'openai',
        processingTime: expect.any(Number),
        cost: 0.0005,
        tokens: expect.objectContaining({
          input: expect.any(Number),
          output: expect.any(Number),
          total: expect.any(Number),
        }),
        metadata: expect.objectContaining({
          requestId: expect.stringMatching(/^sentiment_/),
          processedAt: expect.any(Date),
          version: '1.0.0',
          language: 'zh',
          detailLevel: 'basic',
        }),
      });

      expect(mockOpenAIProvider.analyzeSentiment).toHaveBeenCalled();
      expect(mockClaudeProvider.analyzeSentiment).not.toHaveBeenCalled();
    });

    it('应该在首选提供商失败时使用fallback提供商', async () => {
      mockOpenAIProvider.analyzeSentiment.mockRejectedValue(new Error('OpenAI failed'));
      mockClaudeProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 0.7,
        confidence: 0.8
      });

      const result = await service.analyzeSentiment(mockRequest);

      expect(result.provider).toBe('anthropic');
      expect(result.sentiment).toBe('positive');
      expect(mockOpenAIProvider.analyzeSentiment).toHaveBeenCalled();
      expect(mockClaudeProvider.analyzeSentiment).toHaveBeenCalled();
    });

    it('应该在所有提供商都失败时抛出错误', async () => {
      mockOpenAIProvider.analyzeSentiment.mockRejectedValue(new Error('OpenAI failed'));
      mockClaudeProvider.analyzeSentiment.mockRejectedValue(new Error('Claude failed'));

      await expect(service.analyzeSentiment(mockRequest)).rejects.toThrow('All providers failed to analyze sentiment');
    });

    it('应该使用指定的首选提供商', async () => {
      const requestWithPreference: SentimentRequest = {
        ...mockRequest,
        preferredProvider: 'anthropic',
      };

      mockClaudeProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'neutral',
        polarity: 0.1,
        confidence: 0.6
      });

      const result = await service.analyzeSentiment(requestWithPreference);

      expect(result.provider).toBe('anthropic');
      expect(result.sentiment).toBe('neutral');
      expect(mockClaudeProvider.analyzeSentiment).toHaveBeenCalled();
      expect(mockOpenAIProvider.analyzeSentiment).not.toHaveBeenCalled();
    });
  });

  describe('情感处理算法', () => {
    it('应该正确处理正面情感', async () => {
      const request: SentimentRequest = {
        content: '太棒了！这个产品完全超出我的期望，强烈推荐给大家！',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 0.9,
        confidence: 0.85
      });

      const result = await service.analyzeSentiment(request);

      expect(result.sentiment).toBe('positive');
      expect(result.polarity).toBeGreaterThan(0.5);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('应该正确处理负面情感', async () => {
      const request: SentimentRequest = {
        content: '非常失望，产品质量很差，完全不推荐购买。',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'negative',
        polarity: -0.8,
        confidence: 0.9
      });

      const result = await service.analyzeSentiment(request);

      expect(result.sentiment).toBe('negative');
      expect(result.polarity).toBeLessThan(-0.5);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('应该正确处理中性情感', async () => {
      const request: SentimentRequest = {
        content: '这个产品有一些特点，但总体来说还可以。',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'neutral',
        polarity: 0.1,
        confidence: 0.7
      });

      const result = await service.analyzeSentiment(request);

      expect(result.sentiment).toBe('neutral');
      expect(Math.abs(result.polarity)).toBeLessThan(0.3);
    });

    it('应该正确解析文本格式的情感结果', async () => {
      const request: SentimentRequest = {
        content: '产品不错，但价格有点贵。',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue(
        JSON.stringify({
          sentiment: 'neutral',
          polarity: 0.2,
          confidence: 0.75,
          reasoning: '产品有优点但也有缺点'
        })
      );

      const result = await service.analyzeSentiment(request);

      expect(result.sentiment).toBe('neutral');
      expect(result.polarity).toBe(0.2);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('应该处理无效的情感分析结果', async () => {
      const request: SentimentRequest = {
        content: '简单的文本内容',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue('无法解析的文本内容');

      const result = await service.analyzeSentiment(request);

      expect(result.sentiment).toBe('neutral'); // 默认值
      expect(result.polarity).toBe(0); // 默认值
    });
  });

  describe('详细程度支持', () => {
    it('应该支持基础分析', async () => {
      const request: SentimentRequest = {
        content: '产品很好用',
        userId: 'user1',
        detailLevel: 'basic',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 0.7,
        confidence: 0.8
      });

      const result = await service.analyzeSentiment(request);

      expect(result.metadata.detailLevel).toBe('basic');
      expect(result.sentiment).toBeDefined();
      expect(result.polarity).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('应该支持详细分析', async () => {
      const request: SentimentRequest = {
        content: '这个产品的设计非常精美，功能也很实用，但是价格偏高',
        userId: 'user1',
        detailLevel: 'detailed',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 0.6,
        confidence: 0.8,
        reasoning: '产品有多个优点，但价格是一个负面因素',
        keyPhrases: ['设计精美', '功能实用', '价格偏高']
      });

      const result = await service.analyzeSentiment(request);

      expect(result.metadata.detailLevel).toBe('detailed');
      expect(result.intensity).toBeGreaterThan(0.5); // 基于推理详细程度
    });

    it('应该支持全面分析', async () => {
      const request: SentimentRequest = {
        content: '这个产品让我既惊喜又有点失望，整体感觉复杂',
        userId: 'user1',
        detailLevel: 'comprehensive',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'neutral',
        polarity: 0.1,
        confidence: 0.7,
        reasoning: '产品有正面和负面因素，情感复杂',
        keyPhrases: ['惊喜', '失望', '复杂'],
        emotionalWords: ['惊喜', '失望'],
        intensity: 0.6
      });

      const result = await service.analyzeSentiment(request);

      expect(result.metadata.detailLevel).toBe('comprehensive');
      expect(result.intensity).toBeGreaterThan(0.2); // 基于推理详细程度应该有基本强度
      expect(result.aspects).toBeDefined(); // 全面分析应该包含方面情感
    });
  });

  describe('情感分析支持', () => {
    it('应该在请求时包含情感分析', async () => {
      const request: SentimentRequest = {
        content: '看到这个消息我既高兴又担心',
        userId: 'user1',
        includeEmotions: true,
      };

      mockOpenAIProvider.analyzeSentiment
        .mockResolvedValueOnce({
          sentiment: 'neutral',
          polarity: 0.1,
          confidence: 0.7
        })
        .mockResolvedValueOnce({
          emotions: [
            { emotion: 'joy', intensity: 0.6, triggers: ['高兴'] },
            { emotion: 'fear', intensity: 0.4, triggers: ['担心'] }
          ]
        });

      const result = await service.analyzeSentiment(request);

      expect(result.emotions).toBeDefined();
      expect(result.emotions).toHaveLength(2);
      expect(result.emotions?.[0].emotion).toBe('joy');
      expect(result.emotions?.[1].emotion).toBe('fear');
    });

    it('应该处理情感分析失败的情况', async () => {
      const request: SentimentRequest = {
        content: '简单内容',
        userId: 'user1',
        includeEmotions: true,
      };

      mockOpenAIProvider.analyzeSentiment
        .mockResolvedValueOnce({
          sentiment: 'neutral',
          polarity: 0,
          confidence: 0.5
        })
        .mockRejectedValueOnce(new Error('Emotion extraction failed'));

      const result = await service.analyzeSentiment(request);

      expect(result.emotions).toEqual([]); // 失败时返回空数组
    });
  });

  describe('置信度和强度计算', () => {
    it('应该根据内容长度调整置信度', async () => {
      const shortRequest: SentimentRequest = {
        content: '好',
        userId: 'user1',
      };

      const longRequest: SentimentRequest = {
        content: '这个产品真的非常好用，设计精美，功能强大，性能稳定，完全超出了我的期望，我非常满意这次购买体验，强烈推荐给大家！',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 0.8,
        confidence: 0.8,
        keyPhrases: ['好']
      });

      const shortResult = await service.analyzeSentiment(shortRequest);
      const longResult = await service.analyzeSentiment(longRequest);

      expect(longResult.confidence).toBeGreaterThan(shortResult.confidence);
    });

    it('应该基于关键词数量增加置信度', async () => {
      const request: SentimentRequest = {
        content: '优秀的产品',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 0.8,
        confidence: 0.7,
        keyPhrases: ['优秀', '产品']
      });

      const result = await service.analyzeSentiment(request);

      expect(result.confidence).toBeGreaterThan(0.5); // 有关键词时置信度增加
    });

    it('应该计算合理的情感强度', async () => {
      const request: SentimentRequest = {
        content: '非常满意的产品',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 0.9,
        confidence: 0.8,
        emotionalWords: ['非常', '满意']
      });

      const result = await service.analyzeSentiment(request);

      expect(result.intensity).toBeGreaterThan(0.8); // 高极性值加情感词汇
    });
  });

  describe('批量处理', () => {
    it('应该批量处理多个情感分析请求', async () => {
      const requests: SentimentRequest[] = [
        { content: '产品很好', userId: 'user1' },
        { content: '服务一般', userId: 'user2' },
        { content: '价格实惠', userId: 'user3' },
      ];

      mockOpenAIProvider.analyzeSentiment
        .mockResolvedValueOnce({ sentiment: 'positive', polarity: 0.7, confidence: 0.8 })
        .mockResolvedValueOnce({ sentiment: 'neutral', polarity: 0.1, confidence: 0.6 })
        .mockResolvedValueOnce({ sentiment: 'positive', polarity: 0.6, confidence: 0.7 });

      const results = await service.analyzeBatchSentiments(requests);

      expect(results).toHaveLength(3);
      expect(results[0].sentiment).toBe('positive');
      expect(results[1].sentiment).toBe('neutral');
      expect(results[2].sentiment).toBe('positive');
    });

    it('应该处理部分失败的请求', async () => {
      const requests: SentimentRequest[] = [
        { content: '内容1', userId: 'user1' },
        { content: '内容2', userId: 'user2' },
        { content: '内容3', userId: 'user3' },
      ];

      mockOpenAIProvider.analyzeSentiment
        .mockResolvedValueOnce({ sentiment: 'positive', polarity: 0.6, confidence: 0.7 })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ sentiment: 'negative', polarity: -0.5, confidence: 0.8 });

      const results = await service.analyzeBatchSentiments(requests);

      expect(results).toHaveLength(2);
      expect(results[0].sentiment).toBe('positive');
      expect(results[1].sentiment).toBe('negative');
    });

    it('应该控制并发数量', async () => {
      const requests: SentimentRequest[] = Array.from({ length: 10 }, (_, i) => ({
        content: `批量测试内容${i + 1}`,
        userId: `user${i + 1}`,
      }));

      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      mockOpenAIProvider.analyzeSentiment.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrentCalls--;
        return { sentiment: 'neutral', polarity: 0, confidence: 0.5 };
      });

      await service.analyzeBatchSentiments(requests);

      expect(maxConcurrentCalls).toBeLessThanOrEqual(3); // batchSize = 3
    });
  });

  describe('多语言支持', () => {
    it('应该支持中文情感分析', async () => {
      const request: SentimentRequest = {
        content: '这个产品真的很棒！',
        language: 'zh',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 0.8,
        confidence: 0.9
      });

      const result = await service.analyzeSentiment(request);

      expect(result.metadata.language).toBe('zh');
      expect(mockOpenAIProvider.analyzeSentiment).toHaveBeenCalledWith(
        expect.stringContaining('请分析以下文本的情感倾向')
      );
    });

    it('应该支持英文情感分析', async () => {
      const request: SentimentRequest = {
        content: 'This product is amazing!',
        language: 'en',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 0.9,
        confidence: 0.85
      });

      const result = await service.analyzeSentiment(request);

      expect(result.metadata.language).toBe('en');
      expect(mockOpenAIProvider.analyzeSentiment).toHaveBeenCalledWith(
        expect.stringContaining('Please analyze the sentiment of the following text')
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

      const degradedService = createSentimentService();
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
        supportedDetailLevels: ['basic', 'detailed', 'comprehensive'],
        supportedEmotions: [
          'joy', 'anger', 'fear', 'sadness', 'surprise',
          'disgust', 'trust', 'anticipation'
        ],
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理JSON解析错误', async () => {
      const request: SentimentRequest = {
        content: '测试内容',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue('无效的JSON字符串{{');

      const result = await service.analyzeSentiment(request);

      // 应该回退到文本解析
      expect(result.sentiment).toBe('neutral');
      expect(result.polarity).toBe(0);
    });

    it('应该处理数值范围错误', async () => {
      const request: SentimentRequest = {
        content: '测试内容',
        userId: 'user1',
      };

      mockOpenAIProvider.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        polarity: 5, // 超出范围
        confidence: 2, // 超出范围
      });

      const result = await service.analyzeSentiment(request);

      expect(result.polarity).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});