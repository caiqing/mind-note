/**
 * Anthropic Claude提供商测试用例 - T103.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeProvider, createClaudeProvider } from '../claude-provider';
import { AnalysisRequest } from '@/types/ai-analysis';

// Mock Anthropic
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(),
}));

// Mock aiConfig
vi.mock('../ai-config', () => ({
  aiConfig: {
    getProviderConfig: vi.fn(),
    calculateCost: vi.fn(),
  },
}));

import { anthropic } from '@ai-sdk/anthropic';
import { aiConfig } from '../ai-config';

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;
  let mockAnthropic: any;

  beforeEach(() => {
    // Mock配置
    (aiConfig.getProviderConfig as vi.Mock).mockReturnValue({
      name: 'anthropic',
      apiKey: 'test-anthropic-key',
      baseURL: 'https://api.anthropic.com',
      models: [{ name: 'claude-3-sonnet-20241022' }],
    });

    (aiConfig.calculateCost as vi.Mock).mockReturnValue(0.003);

    // 创建provider实例
    provider = createClaudeProvider();
    mockAnthropic = (anthropic as vi.Mock);

    // 设置默认的mock响应
    mockAnthropic.mockResolvedValue({
      text: 'Claude测试响应',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该正确初始化Claude提供商', () => {
      expect(provider.name).toBe('anthropic');
      expect(provider).toBeInstanceOf(ClaudeProvider);
    });

    it('应该在没有配置时抛出错误', () => {
      (aiConfig.getProviderConfig as vi.Mock).mockReturnValue(null);

      expect(() => createClaudeProvider()).toThrow('Anthropic provider not configured');
    });
  });

  describe('analyze', () => {
    const mockRequest: AnalysisRequest = {
      noteId: 'test-note-1',
      content: '这是一个测试笔记内容，用于测试Claude AI分析功能。',
      userId: 'test-user-1',
      options: {
        generateSummary: true,
        extractKeywords: true,
        classifyContent: true,
        analyzeSentiment: true,
        extractKeyConcepts: true,
        generateTags: true,
      },
    };

    it('应该成功执行完整分析', async () => {
      // Mock所有类型的响应
      mockAnthropic
        .mockResolvedValueOnce({ text: '这是一个Claude生成的测试摘要，不超过100字。' })
        .mockResolvedValueOnce({ text: '测试, 笔记, Claude, AI, 分析, 功能' })
        .mockResolvedValueOnce({ text: '主要分类：技术\n置信度：0.9\n分类理由：内容涉及AI技术分析\n备选分类：工具, 学习' })
        .mockResolvedValueOnce({ text: '情感倾向：positive\n置信度：0.85\n情感评分：0.7\n分析理由：内容积极正面' })
        .mockResolvedValueOnce({
          text: 'Claude [0.95] [Anthropic开发的AI助手] [AI, 对话, 智能助手]\n分析 [0.85] [深度分析过程] [测试, 验证, 评估]'
        })
        .mockResolvedValueOnce({ text: 'Claude, AI, 测试, 分析, 技术' });

      const result = await provider.analyze(mockRequest);

      expect(result).toMatchObject({
        noteId: 'test-note-1',
        userId: 'test-user-1',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20241022',
        processingTime: expect.any(Number),
        cost: 0.003,
        tokens: expect.objectContaining({
          input: expect.any(Number),
          output: expect.any(Number),
          total: expect.any(Number),
        }),
        results: expect.objectContaining({
          summary: expect.any(String),
          keywords: expect.any(Array),
          classification: expect.objectContaining({
            category: expect.any(String),
            confidence: expect.any(Number),
            reasoning: expect.any(String),
            alternatives: expect.any(Array),
          }),
          sentiment: expect.objectContaining({
            sentiment: expect.any(String),
            confidence: expect.any(Number),
            score: expect.any(Number),
            reasoning: expect.any(String),
          }),
          keyConcepts: expect.any(Array),
          tags: expect.any(Array),
        }),
        metadata: expect.objectContaining({
          confidence: expect.any(Number),
          processedAt: expect.any(Date),
          requestId: expect.stringMatching(/^claude_/),
          version: '1.0.0',
        }),
      });

      // 验证所有6个分析任务都被调用
      expect(mockAnthropic).toHaveBeenCalledTimes(6);
    });

    it('应该正确处理API错误', async () => {
      mockAnthropic.mockRejectedValue(new Error('Claude API Error'));

      await expect(provider.analyze(mockRequest)).rejects.toThrow('Claude analysis failed: Claude API Error');
    });

    it('应该正确解析分类结果', async () => {
      mockAnthropic.mockResolvedValue({
        text: '主要分类：技术\n置信度：0.88\n分类理由：内容涉及Claude AI技术\n备选分类：开发, 编程'
      });

      await provider.analyze({
        ...mockRequest,
        options: { classifyContent: true },
      });

      const calls = mockAnthropic.mock.calls;
      const classifyCall = calls.find(call =>
        call[0].includes('请对以下内容进行分类')
      );

      expect(classifyCall).toBeDefined();
      expect(classifyCall[0]).toContain('请严格按照以下格式回答');
    });

    it('应该正确解析情感分析结果', async () => {
      mockAnthropic.mockResolvedValue({
        text: '情感倾向：positive\n置信度：0.92\n情感评分：0.75\n分析理由：表达积极情绪'
      });

      await provider.analyze({
        ...mockRequest,
        options: { analyzeSentiment: true },
      });

      const calls = mockAnthropic.mock.calls;
      const sentimentCall = calls.find(call =>
        call[0].includes('请分析以下内容的情感倾向')
      );

      expect(sentimentCall).toBeDefined();
      expect(sentimentCall[0]).toContain('请严格按照以下格式回答');
    });
  });

  describe('generateSummary', () => {
    it('应该生成简洁的摘要', async () => {
      mockAnthropic.mockResolvedValue({
        text: '这是一个Claude生成的技术测试摘要。',
      });

      const summary = await provider.generateSummary('这是一个关于Claude AI技术的长文本内容...');

      expect(summary).toBe('这是一个Claude生成的技术测试摘要。');
      expect(mockAnthropic).toHaveBeenCalledWith(
        expect.stringContaining('请为以下内容生成一个简洁的摘要'),
        expect.objectContaining({
          model: 'claude-3-sonnet-20241022',
          maxTokens: 200,
          temperature: 0.2,
          systemPrompt: expect.stringContaining('专业的内容分析师'),
        })
      );
    });

    it('应该处理Claude特定的prompt格式', async () => {
      mockAnthropic.mockResolvedValue({ text: '测试摘要' });

      await provider.generateSummary('测试内容');

      const calls = mockAnthropic.mock.calls;
      expect(calls[0][0]).toContain('<content>');
      expect(calls[0][0]).toContain('</content>');
      expect(calls[0][0]).toContain('请直接返回摘要内容');
    });
  });

  describe('extractKeywords', () => {
    it('应该提取关键词', async () => {
      mockAnthropic.mockResolvedValue({
        text: 'Claude, AI, 技术, 测试, 分析, 功能, 开发'
      });

      const keywords = await provider.extractKeywords('这是一个关于Claude AI技术的开发和分析功能的测试文档。');

      expect(keywords).toEqual(['Claude', 'AI', '技术', '测试', '分析', '功能', '开发']);
    });

    it('应该使用Claude的特定系统提示', async () => {
      mockAnthropic.mockResolvedValue({ text: '测试, 关键词' });

      await provider.extractKeywords('测试内容');

      expect(mockAnthropic).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          systemPrompt: expect.stringContaining('专业的文本分析师'),
          temperature: 0.1, // Claude在关键词提取上使用更低温度
        })
      );
    });
  });

  describe('classifyContent', () => {
    it('应该正确分类内容', async () => {
      mockAnthropic.mockResolvedValue({
        text: '主要分类：技术\n置信度：0.92\n分类理由：内容涉及Claude编程技术\n备选分类：开发, 学习'
      });

      const classification = await provider.classifyContent('这是一个关于Claude编程的技术文档。');

      expect(classification).toMatchObject({
        category: '技术',
        confidence: 0.92,
        reasoning: '内容涉及Claude编程技术',
        alternatives: [
          { category: '开发', confidence: 0.782 }, // 0.92 * 0.85
          { category: '学习', confidence: 0.782 },
        ],
      });
    });

    it('应该处理解析失败的情况', async () => {
      mockAnthropic.mockResolvedValue({
        text: '无法解析的Claude响应内容'
      });

      const classification = await provider.classifyContent('测试内容');

      expect(classification).toMatchObject({
        category: '其他',
        confidence: 0.5,
        reasoning: '分类分析失败',
        alternatives: [],
      });
    });

    it('应该使用零温度确保分类准确性', async () => {
      mockAnthropic.mockResolvedValue({ text: '主要分类：技术\n置信度：0.8\n分类理由：测试' });

      await provider.classifyContent('测试内容');

      expect(mockAnthropic).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          temperature: 0.0,
        })
      );
    });
  });

  describe('analyzeSentiment', () => {
    it('应该正确分析情感', async () => {
      mockAnthropic.mockResolvedValue({
        text: '情感倾向：positive\n置信度：0.89\n情感评分：0.72\n分析理由：表达积极情绪'
      });

      const sentiment = await provider.analyzeSentiment('我非常喜欢Claude这个新技术！');

      expect(sentiment).toMatchObject({
        sentiment: 'positive',
        confidence: 0.89,
        score: 0.72,
        reasoning: '表达积极情绪',
      });
    });

    it('应该处理中文情感词汇', async () => {
      mockAnthropic.mockResolvedValue({
        text: '情感倾向：negative\n置信度：0.85\n情感评分：-0.65\n分析理由：表达负面情绪'
      });

      const sentiment = await provider.analyzeSentiment('我对这个Claude结果感到失望。');

      expect(sentiment.sentiment).toBe('negative');
      expect(sentiment.score).toBe(-0.65);
    });

    it('应该限制分数范围在-1到1之间', async () => {
      mockAnthropic.mockResolvedValue({
        text: '情感倾向：positive\n置信度：0.9\n情感评分：2.5\n分析理由：测试超出范围'
      });

      const sentiment = await provider.analyzeSentiment('测试内容');

      expect(sentiment.score).toBe(1.0);
    });
  });

  describe('extractKeyConcepts', () => {
    it('应该提取关键概念', async () => {
      mockAnthropic.mockResolvedValue({
        text: 'Claude [0.93] [Anthropic开发的AI助手] [AI, 对话, 智能助手]\n机器学习 [0.88] [人工智能核心技术] [AI, 深度学习, 算法]'
      });

      const concepts = await provider.extractKeyConcepts('Claude是Anthropic开发的AI助手，涉及机器学习等AI技术。');

      expect(concepts).toEqual([
        {
          concept: 'Claude',
          importance: 0.93,
          context: 'Anthropic开发的AI助手',
          relatedConcepts: ['AI', '对话', '智能助手'],
        },
        {
          concept: '机器学习',
          importance: 0.88,
          context: '人工智能核心技术',
          relatedConcepts: ['AI', '深度学习', '算法'],
        },
      ]);
    });

    it('应该使用更高的maxTokens因为Claude输出更详细', async () => {
      mockAnthropic.mockResolvedValue({ text: '概念 [0.8] [描述] [相关]' });

      await provider.extractKeyConcepts('测试内容');

      expect(mockAnthropic).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 250, // 比OpenAI的200更高
        })
      );
    });

    it('应该处理格式错误的概念', async () => {
      mockAnthropic.mockResolvedValue({
        text: '格式错误的内容\n无法解析的Claude行'
      });

      const concepts = await provider.extractKeyConcepts('测试内容');

      expect(concepts).toEqual([]);
    });
  });

  describe('generateTags', () => {
    it('应该生成简洁的标签', async () => {
      mockAnthropic.mockResolvedValue({
        text: 'Claude, AI, 机器学习, 技术, 开发'
      });

      const tags = await provider.generateTags('这是一个关于Claude AI和机器学习技术的开发文档。');

      expect(tags).toEqual(['Claude', 'AI', '机器学习', '技术', '开发']);
    });

    it('应该限制标签数量', async () => {
      mockAnthropic.mockResolvedValue({
        text: '标签1, 标签2, 标签3, 标签4, 标签5, 标签6, 标签7, 标签8'
      });

      const tags = await provider.generateTags('测试内容');

      expect(tags.length).toBeLessThanOrEqual(5);
    });

    it('应该强调中文标签要求', async () => {
      mockAnthropic.mockResolvedValue({ text: '测试, 标签' });

      await provider.generateTags('测试内容');

      const calls = mockAnthropic.mock.calls;
      expect(calls[0][0]).toContain('使用中文标签');
    });
  });

  describe('辅助方法', () => {
    it('应该正确估算token数量', () => {
      const testText = 'Hello Claude 世界！This is a test 这是一个测试';

      const estimateTokens = (provider as any).estimateTokens.bind(provider);
      const tokens = estimateTokens(testText);

      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('应该为Claude估算更高的输出token数量', () => {
      const results = {
        summary: '测试摘要',
        keywords: ['关键词1', '关键词2'],
        classification: { category: '技术', confidence: 0.9, reasoning: '测试' },
        sentiment: { sentiment: 'positive', confidence: 0.8, score: 0.5, reasoning: '测试' },
        keyConcepts: [
          { concept: 'Claude', importance: 0.9, context: '测试', relatedConcepts: ['技术'] },
        ],
        tags: ['标签1', '标签2'],
      };

      const estimateOutputTokens = (provider as any).estimateOutputTokens.bind(provider);
      const tokens = estimateOutputTokens(results);

      expect(tokens).toBeGreaterThan(0);
      // Claude应该比OpenAI产生更多的token
      expect(tokens).toBeGreaterThan(100);
    });

    it('应该为Claude给予置信度加成', () => {
      const results = {
        classification: { confidence: 0.9 },
        sentiment: { confidence: 0.8 },
        keyConcepts: [
          { importance: 0.85 },
          { importance: 0.75 },
        ],
      };

      const calculateOverallConfidence = (provider as any).calculateOverallConfidence.bind(provider);
      const confidence = calculateOverallConfidence(results);

      // 基础置信度应该是 (0.9 + 0.8 + 0.8) / 3 = 0.8333
      const baseConfidence = (0.9 + 0.8 + 0.8) / 3;
      expect(confidence).toBeCloseTo(Math.min(1.0, baseConfidence + 0.05), 2);
    });

    it('应该处理空结果时的置信度计算', () => {
      const results = {};

      const calculateOverallConfidence = (provider as any).calculateOverallConfidence.bind(provider);
      const confidence = calculateOverallConfidence(results);

      expect(confidence).toBe(0.75); // 0.7 + 0.05 的Claude加成
    });
  });
});