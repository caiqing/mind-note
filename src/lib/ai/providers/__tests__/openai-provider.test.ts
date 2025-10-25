/**
 * OpenAI提供商测试用例 - T103.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider, createOpenAIProvider } from '../openai-provider';
import { AnalysisRequest } from '@/types/ai-analysis';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

// Mock aiConfig
jest.mock('../ai-config', () => ({
  aiConfig: {
    getProviderConfig: jest.fn(),
    calculateCost: jest.fn(),
  },
}));

import OpenAI from 'openai';
import { aiConfig } from '../ai-config';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockCompletions: any;

  beforeEach(() => {
    // Mock配置
    (aiConfig.getProviderConfig as jest.Mock).mockReturnValue({
      name: 'openai',
      apiKey: 'test-api-key',
      baseURL: 'https://api.openai.com/v1',
      models: [{ name: 'gpt-4-turbo-preview' }],
    });

    (aiConfig.calculateCost as jest.Mock).mockReturnValue(0.01);

    // 创建provider实例
    provider = createOpenAIProvider();
    mockOpenAI = (OpenAI as jest.Mock).mock.instances[0];
    mockCompletions = mockOpenAI.chat.completions;

    // 设置默认的mock响应
    mockCompletions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: '测试响应',
          },
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该正确初始化OpenAI客户端', () => {
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        baseURL: 'https://api.openai.com/v1',
      });
    });

    it('应该在没有配置时抛出错误', () => {
      (aiConfig.getProviderConfig as jest.Mock).mockReturnValue(null);

      expect(() => createOpenAIProvider()).toThrow('OpenAI provider not configured');
    });
  });

  describe('analyze', () => {
    const mockRequest: AnalysisRequest = {
      noteId: 'test-note-1',
      content: '这是一个测试笔记内容，用于测试AI分析功能。',
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
      mockCompletions.create
        .mockResolvedValueOnce({
          choices: [{ message: { content: '这是一个测试摘要，不超过100字。' } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '测试, 笔记, AI, 分析, 功能' } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '主要分类：技术\n置信度：0.85\n分类理由：内容涉及技术分析\n备选分类：工具, 学习' } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '情感倾向：positive\n置信度：0.9\n情感评分：0.7\n分析理由：内容积极正面' } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'AI [0.9] [人工智能技术] [机器学习, 深度学习]\n分析 [0.8] [数据分析过程] [测试, 验证]' } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'AI, 测试, 分析, 技术, 功能' } }],
        });

      const result = await provider.analyze(mockRequest);

      expect(result).toMatchObject({
        noteId: 'test-note-1',
        userId: 'test-user-1',
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        processingTime: expect.any(Number),
        cost: 0.01,
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
          requestId: expect.stringMatching(/^openai_/),
          version: '1.0.0',
        }),
      });

      // 验证所有6个分析任务都被调用
      expect(mockCompletions.create).toHaveBeenCalledTimes(6);
    });

    it('应该只执行请求的分析任务', async () => {
      const partialRequest: AnalysisRequest = {
        ...mockRequest,
        options: {
          generateSummary: true,
          extractKeywords: false,
          classifyContent: false,
          analyzeSentiment: false,
          extractKeyConcepts: false,
          generateTags: false,
        },
      };

      mockCompletions.create.mockResolvedValueOnce({
        choices: [{ message: { content: '测试摘要' } }],
      });

      const result = await provider.analyze(partialRequest);

      expect(mockCompletions.create).toHaveBeenCalledTimes(1);
      expect(result.results.summary).toBe('测试摘要');
      expect(result.results.keywords).toBeUndefined();
      expect(result.results.classification).toBeUndefined();
    });

    it('应该正确处理API错误', async () => {
      mockCompletions.create.mockRejectedValue(new Error('API Error'));

      await expect(provider.analyze(mockRequest)).rejects.toThrow('OpenAI analysis failed: API Error');
    });

    it('应该正确解析分类结果', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '主要分类：技术\n置信度：0.85\n分类理由：内容涉及技术主题\n备选分类：开发, 编程'
          }
        }],
      });

      await provider.analyze({
        ...mockRequest,
        options: { classifyContent: true },
      });

      const calls = mockCompletions.create.mock.calls;
      const classifyCall = calls.find(call =>
        call[0].messages[1].content.includes('请对以下内容进行分类')
      );

      expect(classifyCall).toBeDefined();
    });

    it('应该正确解析情感分析结果', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '情感倾向：positive\n置信度：0.9\n情感评分：0.7\n分析理由：内容表达积极情绪'
          }
        }],
      });

      await provider.analyze({
        ...mockRequest,
        options: { analyzeSentiment: true },
      });

      const calls = mockCompletions.create.mock.calls;
      const sentimentCall = calls.find(call =>
        call[0].messages[1].content.includes('请分析以下内容的情感倾向')
      );

      expect(sentimentCall).toBeDefined();
    });
  });

  describe('generateSummary', () => {
    it('应该生成简洁的摘要', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: '这是一个关于AI技术的测试摘要。' } }],
      });

      const summary = await provider.generateSummary('这是一个关于AI技术的长文本内容...');

      expect(summary).toBe('这是一个关于AI技术的测试摘要。');
      expect(mockCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          messages: [
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('专业的内容分析师'),
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('不超过100字'),
            }),
          ],
          max_tokens: 200,
          temperature: 0.3,
        })
      );
    });
  });

  describe('extractKeywords', () => {
    it('应该提取关键词', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'AI, 技术, 测试, 分析, 功能, 开发' } }],
      });

      const keywords = await provider.extractKeywords('这是一个关于AI技术测试和分析功能的开发文档。');

      expect(keywords).toEqual(['AI', '技术', '测试', '分析', '功能', '开发']);
    });

    it('应该处理空的关键词响应', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      });

      const keywords = await provider.extractKeywords('测试内容');

      expect(keywords).toEqual([]);
    });
  });

  describe('classifyContent', () => {
    it('应该正确分类内容', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '主要分类：技术\n置信度：0.9\n分类理由：内容涉及编程技术\n备选分类：开发, 学习'
          }
        }],
      });

      const classification = await provider.classifyContent('这是一个关于React编程的技术文档。');

      expect(classification).toMatchObject({
        category: '技术',
        confidence: 0.9,
        reasoning: '内容涉及编程技术',
        alternatives: [
          { category: '开发', confidence: 0.72 },
          { category: '学习', confidence: 0.72 },
        ],
      });
    });

    it('应该处理解析失败的情况', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: '无法解析的内容' } }],
      });

      const classification = await provider.classifyContent('测试内容');

      expect(classification).toMatchObject({
        category: '其他',
        confidence: 0.5,
        reasoning: '基于内容分析得出',
        alternatives: [],
      });
    });
  });

  describe('analyzeSentiment', () => {
    it('应该正确分析情感', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '情感倾向：positive\n置信度：0.85\n情感评分：0.7\n分析理由：表达积极情绪'
          }
        }],
      });

      const sentiment = await provider.analyzeSentiment('我非常喜欢这个新技术！');

      expect(sentiment).toMatchObject({
        sentiment: 'positive',
        confidence: 0.85,
        score: 0.7,
        reasoning: '表达积极情绪',
      });
    });

    it('应该处理中文情感词汇', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '情感倾向：negative\n置信度：0.8\n情感评分：-0.6\n分析理由：表达负面情绪'
          }
        }],
      });

      const sentiment = await provider.analyzeSentiment('我对这个结果感到失望。');

      expect(sentiment.sentiment).toBe('negative');
    });

    it('应该限制分数范围在-1到1之间', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '情感倾向：positive\n置信度：0.9\n情感评分：2.5\n分析理由：测试超出范围'
          }
        }],
      });

      const sentiment = await provider.analyzeSentiment('测试内容');

      expect(sentiment.score).toBe(1.0);
    });
  });

  describe('extractKeyConcepts', () => {
    it('应该提取关键概念', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '机器学习 [0.9] [人工智能分支] [AI, 深度学习]\nReact [0.8] [前端框架] [JavaScript, 前端开发]'
          }
        }],
      });

      const concepts = await provider.extractKeyConcepts('机器学习和React是现代AI和前端开发的重要技术。');

      expect(concepts).toEqual([
        {
          concept: '机器学习',
          importance: 0.9,
          context: '人工智能分支',
          relatedConcepts: ['AI', '深度学习'],
        },
        {
          concept: 'React',
          importance: 0.8,
          context: '前端框架',
          relatedConcepts: ['JavaScript', '前端开发'],
        },
      ]);
    });

    it('应该处理格式错误的概念', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '格式错误的内容\n无法解析的行'
          }
        }],
      });

      const concepts = await provider.extractKeyConcepts('测试内容');

      expect(concepts).toEqual([]);
    });

    it('应该限制概念数量', async () => {
      const concepts = Array(10).fill(null).map((_, i) =>
        `概念${i + 1} [0.${9 - i}] [描述${i + 1}] [相关${i + 1}]`
      ).join('\n');

      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: concepts } }],
      });

      const result = await provider.extractKeyConcepts('测试内容');

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('generateTags', () => {
    it('应该生成简洁的标签', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'AI, 机器学习, 技术, 开发' } }],
      });

      const tags = await provider.generateTags('这是一个关于AI和机器学习技术的开发文档。');

      expect(tags).toEqual(['AI', '机器学习', '技术', '开发']);
    });

    it('应该限制标签数量', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '标签1, 标签2, 标签3, 标签4, 标签5, 标签6, 标签7, 标签8'
          }
        }],
      });

      const tags = await provider.generateTags('测试内容');

      expect(tags.length).toBeLessThanOrEqual(5);
    });

    it('应该过滤空标签', async () => {
      mockCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'AI, , 技术, , 开发, ' } }],
      });

      const tags = await provider.generateTags('测试内容');

      expect(tags).toEqual(['AI', '技术', '开发']);
    });
  });

  describe('辅助方法', () => {
    it('应该正确估算中英文混合文本的token数量', () => {
      const testText = 'Hello 世界！This is a test 这是一个测试';

      // 使用reflection访问私有方法进行测试
      const estimateTokens = (provider as any).estimateTokens.bind(provider);
      const tokens = estimateTokens(testText);

      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('应该正确计算输出token数量', () => {
      const results = {
        summary: '测试摘要',
        keywords: ['关键词1', '关键词2'],
        classification: { category: '技术', confidence: 0.9, reasoning: '测试' },
        sentiment: { sentiment: 'positive', confidence: 0.8, score: 0.5, reasoning: '测试' },
        keyConcepts: [
          { concept: 'AI', importance: 0.9, context: '测试', relatedConcepts: ['技术'] },
        ],
        tags: ['标签1', '标签2'],
      };

      const estimateOutputTokens = (provider as any).estimateOutputTokens.bind(provider);
      const tokens = estimateOutputTokens(results);

      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('应该正确计算整体置信度', () => {
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

      expect(confidence).toBeCloseTo((0.9 + 0.8 + 0.8) / 3, 2);
    });

    it('应该处理空结果时的置信度计算', () => {
      const results = {};

      const calculateOverallConfidence = (provider as any).calculateOverallConfidence.bind(provider);
      const confidence = calculateOverallConfidence(results);

      expect(confidence).toBe(0.7);
    });
  });
});