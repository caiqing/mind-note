/**
 * 摘要服务测试用例 - T103.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SummaryService, createSummaryService } from '../summary-service';
import { SummaryRequest } from '../summary-service';

// Mock providers
vi.mock('../../providers/openai-provider-v2', () => ({
  createOpenAIProviderV2: vi.fn(),
}));

vi.mock('../../providers/claude-provider', () => ({
  createClaudeProvider: vi.fn(),
}));

vi.mock('../../ai-config', () => ({
  aiConfig: {
    getFallbackOrder: vi.fn(),
    calculateCost: vi.fn(),
  },
}));

import { createOpenAIProviderV2 } from '../../providers/openai-provider-v2';
import { createClaudeProvider } from '../../providers/claude-provider';
import { aiConfig } from '../../ai-config';

describe('SummaryService', () => {
  let service: SummaryService;
  let mockOpenAIProvider: any;
  let mockClaudeProvider: any;

  beforeEach(() => {
    // Mock providers
    mockOpenAIProvider = {
      name: 'openai',
      generateSummary: vi.fn(),
    };

    mockClaudeProvider = {
      name: 'anthropic',
      generateSummary: vi.fn(),
    };

    (createOpenAIProviderV2 as vi.Mock).mockReturnValue(mockOpenAIProvider);
    (createClaudeProvider as vi.Mock).mockReturnValue(mockClaudeProvider);

    // Mock config
    (aiConfig.getFallbackOrder as vi.Mock).mockReturnValue(['openai', 'anthropic']);
    (aiConfig.calculateCost as vi.Mock).mockReturnValue(0.001);

    // Suppress console output for tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = createSummaryService();
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

      expect(() => createSummaryService()).toThrow('No AI providers available');
    });
  });

  describe('generateSummary', () => {
    const mockRequest: SummaryRequest = {
      content: '这是一个测试内容，用于验证摘要生成服务的功能。包含了多个句子和一些关键信息。',
      userId: 'test-user-001',
    };

    it('应该使用首选提供商生成摘要', async () => {
      mockOpenAIProvider.generateSummary.mockResolvedValue('这是一个测试摘要。');

      const result = await service.generateSummary(mockRequest);

      expect(result).toMatchObject({
        summary: '这是一个测试摘要。',
        provider: 'openai',
        processingTime: expect.any(Number),
        cost: 0.001,
        tokens: expect.objectContaining({
          input: expect.any(Number),
          output: expect.any(Number),
          total: expect.any(Number),
        }),
        quality: expect.objectContaining({
          score: expect.any(Number),
          length: expect.any(Number),
          adherence: expect.any(Number),
        }),
        metadata: expect.objectContaining({
          requestId: expect.stringMatching(/^summary_/),
          processedAt: expect.any(Date),
          version: '1.0.0',
        }),
      });

      expect(mockOpenAIProvider.generateSummary).toHaveBeenCalled();
      expect(mockClaudeProvider.generateSummary).not.toHaveBeenCalled();
    });

    it('应该在首选提供商失败时使用fallback提供商', async () => {
      mockOpenAIProvider.generateSummary.mockRejectedValue(new Error('OpenAI failed'));
      mockClaudeProvider.generateSummary.mockResolvedValue('这是Claude生成的摘要。');

      const result = await service.generateSummary(mockRequest);

      expect(result.provider).toBe('anthropic');
      expect(result.summary).toBe('这是Claude生成的摘要。');
      expect(mockOpenAIProvider.generateSummary).toHaveBeenCalled();
      expect(mockClaudeProvider.generateSummary).toHaveBeenCalled();
    });

    it('应该在所有提供商都失败时抛出错误', async () => {
      mockOpenAIProvider.generateSummary.mockRejectedValue(new Error('OpenAI failed'));
      mockClaudeProvider.generateSummary.mockRejectedValue(new Error('Claude failed'));

      await expect(service.generateSummary(mockRequest)).rejects.toThrow('All providers failed to generate summary');
    });

    it('应该使用指定的首选提供商', async () => {
      const requestWithPreference: SummaryRequest = {
        ...mockRequest,
        preferredProvider: 'anthropic',
      };

      mockClaudeProvider.generateSummary.mockResolvedValue('Claude摘要');

      const result = await service.generateSummary(requestWithPreference);

      expect(result.provider).toBe('anthropic');
      expect(mockClaudeProvider.generateSummary).toHaveBeenCalled();
      expect(mockOpenAIProvider.generateSummary).not.toHaveBeenCalled();
    });

    it('应该处理自定义参数', async () => {
      const customRequest: SummaryRequest = {
        content: '长内容...' + '更多内容。'.repeat(50),
        maxLength: 50,
        style: 'bullet',
        language: 'en',
        focus: ['技术', '创新'],
        userId: 'test-user-001',
      };

      mockOpenAIProvider.generateSummary.mockResolvedValue('Custom summary');

      await service.generateSummary(customRequest);

      const prompt = mockOpenAIProvider.generateSummary.mock.calls[0][0];
      expect(prompt).toContain('长度控制在50字以内');
      expect(prompt).toContain('使用要点形式（• 项目符号）');
      expect(prompt).toContain('使用英文');
      expect(prompt).toContain('特别关注以下方面：技术、创新');
    });
  });

  describe('generateBatchSummaries', () => {
    it('应该批量处理多个摘要请求', async () => {
      const requests: SummaryRequest[] = [
        { content: '内容1', userId: 'user1' },
        { content: '内容2', userId: 'user2' },
        { content: '内容3', userId: 'user3' },
      ];

      mockOpenAIProvider.generateSummary
        .mockResolvedValueOnce('摘要1')
        .mockResolvedValueOnce('摘要2')
        .mockResolvedValueOnce('摘要3');

      const results = await service.generateBatchSummaries(requests);

      expect(results).toHaveLength(3);
      expect(results[0].summary).toBe('摘要1');
      expect(results[1].summary).toBe('摘要2');
      expect(results[2].summary).toBe('摘要3');
    });

    it('应该处理部分失败的请求', async () => {
      const requests: SummaryRequest[] = [
        { content: '内容1', userId: 'user1' },
        { content: '内容2', userId: 'user2' },
        { content: '内容3', userId: 'user3' },
      ];

      mockOpenAIProvider.generateSummary
        .mockResolvedValueOnce('摘要1')
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('摘要3');

      const results = await service.generateBatchSummaries(requests);

      expect(results).toHaveLength(2);
      expect(results[0].summary).toBe('摘要1');
      expect(results[1].summary).toBe('摘要3');
    });

    it('应该控制并发数量', async () => {
      const requests: SummaryRequest[] = Array.from({ length: 10 }, (_, i) => ({
        content: `内容${i + 1}`,
        userId: `user${i + 1}`,
      }));

      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      mockOpenAIProvider.generateSummary.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrentCalls--;
        return `摘要${concurrentCalls}`;
      });

      await service.generateBatchSummaries(requests);

      expect(maxConcurrentCalls).toBeLessThanOrEqual(3); // batchSize = 3
    });
  });

  describe('质量计算', () => {
    it('应该正确计算理想长度摘要的质量分数', async () => {
      const request: SummaryRequest = {
        content: '测试内容',
        maxLength: 100,
        userId: 'user1',
      };

      mockOpenAIProvider.generateSummary.mockResolvedValue('这是一个50字的摘要，长度刚好合适。'.repeat(2));

      const result = await service.generateSummary(request);

      expect(result.quality.length).toBe(50);
      expect(result.quality.adherence).toBe(1.0);
      expect(result.quality.score).toBeGreaterThan(0.8);
    });

    it('应该对超长摘要进行质量惩罚', async () => {
      const request: SummaryRequest = {
        content: '测试内容',
        maxLength: 50,
        userId: 'user1',
      };

      mockOpenAIProvider.generateSummary.mockResolvedValue('这是一个100字的摘要，明显超过了50字的限制要求。'.repeat(2));

      const result = await service.generateSummary(request);

      expect(result.quality.length).toBeGreaterThan(50);
      expect(result.quality.adherence).toBeLessThan(1.0);
      expect(result.quality.score).toBeLessThan(1.0);
    });

    it('应该对过短摘要进行质量惩罚', async () => {
      const request: SummaryRequest = {
        content: '测试内容',
        maxLength: 100,
        userId: 'user1',
      };

      mockOpenAIProvider.generateSummary.mockResolvedValue('短摘要');

      const result = await service.generateSummary(request);

      expect(result.quality.length).toBeLessThan(30); // 100 * 0.3 = 30
      expect(result.quality.score).toBeLessThan(1.0);
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

      const degradedService = createSummaryService();
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
        supportedStyles: ['paragraph', 'bullet', 'key-points'],
      });
    });
  });

  describe('prompt构建', () => {
    it('应该为段落风格构建正确的prompt', async () => {
      const request: SummaryRequest = {
        content: '测试内容',
        style: 'paragraph',
        userId: 'user1',
      };

      mockOpenAIProvider.generateSummary.mockResolvedValue('摘要');

      await service.generateSummary(request);

      const prompt = mockOpenAIProvider.generateSummary.mock.calls[0][0];
      expect(prompt).toContain('使用段落形式');
    });

    it('应该为要点风格构建正确的prompt', async () => {
      const request: SummaryRequest = {
        content: '测试内容',
        style: 'bullet',
        userId: 'user1',
      };

      mockOpenAIProvider.generateSummary.mockResolvedValue('摘要');

      await service.generateSummary(request);

      const prompt = mockOpenAIProvider.generateSummary.mock.calls[0][0];
      expect(prompt).toContain('使用要点形式（• 项目符号）');
    });

    it('应该为关键要点风格构建正确的prompt', async () => {
      const request: SummaryRequest = {
        content: '测试内容',
        style: 'key-points',
        userId: 'user1',
      };

      mockOpenAIProvider.generateSummary.mockResolvedValue('摘要');

      await service.generateSummary(request);

      const prompt = mockOpenAIProvider.generateSummary.mock.calls[0][0];
      expect(prompt).toContain('提取关键要点，每点一行');
    });

    it('应该包含重点关注内容', async () => {
      const request: SummaryRequest = {
        content: '测试内容',
        focus: ['技术', '创新', '效率'],
        userId: 'user1',
      };

      mockOpenAIProvider.generateSummary.mockResolvedValue('摘要');

      await service.generateSummary(request);

      const prompt = mockOpenAIProvider.generateSummary.mock.calls[0][0];
      expect(prompt).toContain('特别关注以下方面：技术、创新、效率');
    });

    it('应该支持英文内容', async () => {
      const request: SummaryRequest = {
        content: 'Test content in English',
        language: 'en',
        userId: 'user1',
      };

      mockOpenAIProvider.generateSummary.mockResolvedValue('Summary');

      await service.generateSummary(request);

      const prompt = mockOpenAIProvider.generateSummary.mock.calls[0][0];
      expect(prompt).toContain('使用英文');
    });
  });
});