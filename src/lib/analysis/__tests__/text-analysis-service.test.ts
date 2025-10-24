/**
 * 文本分析服务测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TextAnalysisService } from '../text-analysis-service';
import { TextAnalysisRequest } from '../text-analysis-types';

// Mock AI SDK
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => ({
    model: 'gpt-4-turbo-preview',
  })),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => ({
    model: 'claude-3-sonnet-20241022',
  })),
}));

vi.mock('ai', () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
}));

// Mock environment variables
vi.mock('../../../../env', () => ({
  default: {
    OPENAI_API_KEY: 'test-openai-key',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    OPENAI_MODEL: 'gpt-4-turbo-preview',
    ANTHROPIC_MODEL: 'claude-3-sonnet-20241022',
  },
}));

describe('TextAnalysisService', () => {
  let service: TextAnalysisService;

  beforeEach(() => {
    service = TextAnalysisService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('服务初始化', () => {
    it('应该能够获取服务实例', () => {
      expect(service).toBeInstanceOf(TextAnalysisService);
    });

    it('应该返回相同的实例', () => {
      const service2 = TextAnalysisService.getInstance();
      expect(service).toBe(service2);
    });

    it('应该正确识别可用的提供商', () => {
      const providers = service.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);
      expect(providers[0].name).toBe('OpenAI'); // 优先级最高
    });
  });

  describe('请求验证', () => {
    it('应该拒绝空请求', async () => {
      const request: TextAnalysisRequest = {
        title: '',
        content: '',
        userId: 'test-user',
      };

      await expect(service.analyzeText(request))
        .rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    });

    it('应该拒绝过长的内容', async () => {
      const longContent = 'a'.repeat(50001);
      const request: TextAnalysisRequest = {
        title: 'Test',
        content: longContent,
        userId: 'test-user',
      };

      await expect(service.analyzeText(request))
        .rejects.toMatchObject({ code: 'CONTENT_TOO_LONG' });
    });

    it('应该拒绝过短的内容', async () => {
      const request: TextAnalysisRequest = {
        title: 'Hi',
        content: '',
        userId: 'test-user',
      };

      await expect(service.analyzeText(request))
        .rejects.toMatchObject({ code: 'CONTENT_TOO_SHORT' });
    });
  });

  describe('文本摘要功能', () => {
    it('应该能够生成摘要', async () => {
      const { generateText } = vi.mocked(await import('ai'));
      generateText.mockResolvedValue({
        text: '这是一个关于人工智能的简洁摘要。',
      });

      const request: TextAnalysisRequest = {
        title: '人工智能技术',
        content: '人工智能是一门复杂的学科，它涉及机器学习、深度学习、自然语言处理等多个领域。',
        userId: 'test-user',
      };

      const result = await service.analyzeText(request);

      expect(result.summary).toBe('这是一个关于人工智能的简洁摘要。');
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 400,
          temperature: 0.3,
        })
      );
    });

    it('应该使用后备摘要生成方法', async () => {
      const { generateText } = vi.mocked(await import('ai'));
      generateText.mockRejectedValue(new Error('API Error'));

      const request: TextAnalysisRequest = {
        title: '测试',
        content: '这是第一句话。这是第二句话。这是第三句话。',
        userId: 'test-user',
      };

      const result = await service.analyzeText(request);

      expect(result.summary).toBe('这是第一句话。这是第二句话。这是第三句话。');
    });
  });

  describe('关键词提取功能', () => {
    it('应该能够提取关键词', async () => {
      const { generateObject } = vi.mocked(await import('ai'));
      generateObject.mockResolvedValue({
        object: {
          keywords: ['人工智能', '机器学习', '深度学习', '神经网络'],
        },
      });

      const request: TextAnalysisRequest = {
        title: 'AI技术',
        content: '人工智能和机器学习是现代技术的重要组成部分。',
        userId: 'test-user',
        options: { maxKeywords: 5 },
      };

      const result = await service.analyzeText(request);

      expect(result.keywords).toEqual(['人工智能', '机器学习', '深度学习', '神经网络']);
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: expect.any(Object),
        })
      );
    });

    it('应该使用后备关键词提取方法', async () => {
      const { generateObject } = vi.mocked(await import('ai'));
      generateObject.mockRejectedValue(new Error('API Error'));

      const request: TextAnalysisRequest = {
        title: '测试',
        content: '这是一个关于机器学习和人工智能的测试文档。',
        userId: 'test-user',
      };

      const result = await service.analyzeText(request);

      expect(result.keywords).toContain('机器学习');
      expect(result.keywords).toContain('人工智能');
    });
  });

  describe('关键概念识别功能', () => {
    it('应该能够识别关键概念', async () => {
      const { generateObject } = vi.mocked(await import('ai'));
      generateObject.mockResolvedValue({
        object: {
          keyConcepts: ['深度神经网络', '反向传播算法', '梯度下降优化'],
        },
      });

      const request: TextAnalysisRequest = {
        title: '深度学习',
        content: '深度神经网络使用反向传播算法进行训练。',
        userId: 'test-user',
      };

      const result = await service.analyzeText(request);

      expect(result.keyConcepts).toEqual(['深度神经网络', '反向传播算法', '梯度下降优化']);
    });

    it('应该使用后备概念识别方法', async () => {
      const { generateObject } = vi.mocked(await import('ai'));
      generateObject.mockRejectedValue(new Error('API Error'));

      const request: TextAnalysisRequest = {
        title: '测试',
        content: '这是一个关于计算机科学概念的长文档，包含很多专业术语。',
        userId: 'test-user',
      };

      const result = await service.analyzeText(request);

      expect(result.keyConcepts).toBeDefined();
      expect(Array.isArray(result.keyConcepts)).toBe(true);
    });
  });

  describe('情感分析功能', () => {
    it('应该能够分析情感', async () => {
      const { generateObject } = vi.mocked(await import('ai'));
      generateObject.mockResolvedValue({
        object: {
          sentiment: 'positive',
          score: 0.8,
          confidence: 0.9,
          emotions: {
            joy: 0.8,
            sadness: 0.1,
            anger: 0.1,
            fear: 0.1,
            surprise: 0.3,
          },
        },
      });

      const request: TextAnalysisRequest = {
        title: '好消息',
        content: '今天天气真好，心情很愉快！',
        userId: 'test-user',
      };

      const result = await service.analyzeText(request);

      expect(result.sentiment).toEqual({
        label: 'positive',
        score: 0.8,
        confidence: 0.9,
        emotions: {
          joy: 0.8,
          sadness: 0.1,
          anger: 0.1,
          fear: 0.1,
          surprise: 0.3,
        },
      });
    });

    it('应该使用后备情感分析方法', async () => {
      const { generateObject } = vi.mocked(await import('ai'));
      generateObject.mockRejectedValue(new Error('API Error'));

      const request: TextAnalysisRequest = {
        title: '测试',
        content: '这个产品很好用，我很喜欢。',
        userId: 'test-user',
      };

      const result = await service.analyzeText(request);

      expect(result.sentiment).toBeDefined();
      expect(['positive', 'neutral', 'negative']).toContain(result.sentiment!.label);
      expect(result.sentiment!.score).toBeGreaterThanOrEqual(-1);
      expect(result.sentiment!.score).toBeLessThanOrEqual(1);
    });
  });

  describe('分类和标签功能', () => {
    it('应该能够分类和生成标签', async () => {
      const { generateObject } = vi.mocked(await import('ai'));
      generateObject.mockResolvedValue({
        object: {
          category: '技术',
          tags: ['编程', '开发', '软件'],
          confidence: 0.95,
        },
      });

      const request: TextAnalysisRequest = {
        title: '编程教程',
        content: '这是一篇关于软件开发和编程的教程。',
        userId: 'test-user',
      };

      const result = await service.analyzeText(request);

      expect(result.category).toBe('技术');
      expect(result.tags).toEqual(['编程', '开发', '软件']);
      expect(result.confidence).toBe(0.95);
    });

    it('应该使用后备分类方法', async () => {
      const { generateObject } = vi.mocked(await import('ai'));
      generateObject.mockRejectedValue(new Error('API Error'));

      const request: TextAnalysisRequest = {
        title: '测试',
        content: '这是一篇关于编程和软件开发的文章。',
        userId: 'test-user',
      };

      const result = await service.analyzeText(request);

      expect(result.category).toBe('技术');
      expect(result.tags).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('缓存功能', () => {
    it('应该缓存分析结果', async () => {
      const { generateText, generateObject } = vi.mocked(await import('ai'));
      generateText.mockResolvedValue({ text: '摘要内容' });
      generateObject.mockResolvedValue({
        object: {
          keywords: ['关键词'],
          keyConcepts: ['概念'],
          sentiment: { label: 'neutral', score: 0, confidence: 0.5 },
          category: '其他',
          tags: ['标签'],
          confidence: 0.5,
        },
      });

      const request: TextAnalysisRequest = {
        title: '缓存测试',
        content: '这是用于测试缓存功能的内容。',
        userId: 'test-user',
      };

      // 第一次分析
      const result1 = await service.analyzeText(request);
      expect(generateText).toHaveBeenCalledTimes(1);

      // 第二次分析（应该使用缓存）
      const result2 = await service.analyzeText(request);
      expect(generateText).toHaveBeenCalledTimes(1); // 没有增加调用次数

      expect(result1.summary).toBe(result2.summary);
    });

    it('应该能够清理缓存', () => {
      service.clearCache();
      const stats = service.getStatistics();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('进度跟踪', () => {
    it('应该能够跟踪分析进度', async () => {
      const { generateText, generateObject } = vi.mocked(await import('ai'));

      // 模拟延迟的AI响应
      generateText.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { text: '摘要' };
      });

      generateObject.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { object: { keywords: ['关键词'] } };
      });

      const request: TextAnalysisRequest = {
        title: '进度测试',
        content: '这是用于测试进度跟踪的内容。',
        userId: 'test-user',
      };

      const analysisPromise = service.analyzeText(request);

      // 检查进度
      let progress = service.getProgress(request.id!);
      expect(progress).toBeDefined();

      await analysisPromise;

      // 完成后应该清理进度
      progress = service.getProgress(request.id!);
      expect(progress).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('应该正确处理API错误', async () => {
      const { generateText, generateObject } = vi.mocked(await import('ai'));
      generateText.mockRejectedValue(new Error('Rate limit exceeded'));
      generateObject.mockRejectedValue(new Error('Rate limit exceeded'));

      const request: TextAnalysisRequest = {
        title: '错误测试',
        content: '这是用于测试错误处理的内容。',
        userId: 'test-user',
      };

      // 应该使用后备方法，而不是抛出错误
      const result = await service.analyzeText(request);
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('应该提供统计信息', () => {
      const stats = service.getStatistics();
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('activeRequests');
      expect(stats).toHaveProperty('availableProviders');
    });
  });

  describe('选项配置', () => {
    it('应该尊重自定义选项', async () => {
      const { generateText } = vi.mocked(await import('ai'));
      generateText.mockResolvedValue({ text: '短摘要' });

      const request: TextAnalysisRequest = {
        title: '选项测试',
        content: '这是用于测试选项配置的内容。',
        userId: 'test-user',
        options: {
          enableSummary: true,
          enableKeywords: false,
          enableKeyConcepts: false,
          enableSentiment: false,
          enableCategory: false,
          maxSummaryLength: 50,
        },
      };

      const result = await service.analyzeText(request);

      expect(result.summary).toBe('短摘要');
      expect(result.keywords).toBeUndefined();
      expect(result.keyConcepts).toBeUndefined();
      expect(result.sentiment).toBeUndefined();
      expect(result.category).toBeUndefined();
    });
  });
});