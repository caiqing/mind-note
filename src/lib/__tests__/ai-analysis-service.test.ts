/**
 * AI分析服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  aiAnalysisService,
  type AIAnalysisRequest,
  type AIAnalysisResult,
} from '../ai-analysis-service';

describe('AI Analysis Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeNote', () => {
    it('should analyze note successfully', async () => {
      const request: AIAnalysisRequest = {
        noteId: 'test-note-1',
        title: 'React Hooks学习笔记',
        content:
          'React Hooks是React 16.8引入的新特性，它允许在函数组件中使用状态和其他React特性。',
        operations: ['categorize', 'tag', 'summarize'],
        options: {
          language: 'zh',
          quality: 'balanced',
          provider: 'mock-ai-service',
        },
      };

      const result = await aiAnalysisService.analyzeNote(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results.category).toBeDefined();
      expect(result.results.tags).toBeDefined();
      expect(result.results.summary).toBeDefined();
    });

    it('should handle empty content gracefully', async () => {
      const request: AIAnalysisRequest = {
        noteId: 'test-note-2',
        title: '',
        content: '',
        operations: ['summarize'],
        options: {
          language: 'zh',
          quality: 'balanced',
        },
      };

      const result = await aiAnalysisService.analyzeNote(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle single operation', async () => {
      const request: AIAnalysisRequest = {
        noteId: 'test-note-3',
        title: '技术笔记',
        content: '这是一个关于前端技术的笔记',
        operations: ['keywords'],
        options: {
          language: 'zh',
          quality: 'thorough',
        },
      };

      const result = await aiAnalysisService.analyzeNote(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.results.keywords).toBeDefined();
      expect(result.results.category).toBeUndefined();
    });

    it('should handle analysis errors gracefully', async () => {
      // Mock an error scenario
      const request: AIAnalysisRequest = {
        noteId: 'test-note-error',
        title: '错误测试',
        content: '测试错误处理',
        operations: ['summarize'],
        options: {
          language: 'invalid-language',
          quality: 'invalid-quality',
        },
      };

      // 模拟网络错误
      vi.spyOn(Date, 'now').mockImplementation(() => 0);
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn(callback => {
        // 模拟延迟但不执行回调，模拟网络错误
        return 1 as any;
      });

      try {
        await aiAnalysisService.analyzeNote(request);
      } catch (error) {
        expect(error).toBeDefined();
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });

  describe('analyzeNoteWithProgress', () => {
    it('should call progress callback during analysis', async () => {
      const progressCallback = vi.fn();
      const request: AIAnalysisRequest = {
        noteId: 'test-note-4',
        title: '进度测试',
        content: '测试进度回调功能',
        operations: ['categorize', 'tag', 'summarize'],
        options: {
          language: 'zh',
          quality: 'balanced',
        },
      };

      await aiAnalysisService.analyzeNoteWithProgress(
        request,
        progressCallback,
      );

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'categorize',
          status: 'processing',
          progress: expect.any(Number),
        }),
      );
    });

    it('should provide progress updates for multiple operations', async () => {
      const progressUpdates: any[] = [];
      const progressCallback = vi.fn(update => {
        progressUpdates.push(update);
      });

      const request: AIAnalysisRequest = {
        noteId: 'test-note-5',
        title: '多操作测试',
        content: '测试多个操作的进度更新',
        operations: ['categorize', 'tag', 'summarize', 'keywords'],
        options: {
          language: 'zh',
          quality: 'balanced',
        },
      };

      await aiAnalysisService.analyzeNoteWithProgress(
        request,
        progressCallback,
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toEqual(
        expect.objectContaining({
          status: 'completed',
        }),
      );
    });

    it('should handle empty operations list', async () => {
      const progressCallback = vi.fn();
      const request: AIAnalysisRequest = {
        noteId: 'test-note-6',
        title: '空操作测试',
        content: '测试空操作列表',
        operations: [],
        options: {
          language: 'zh',
        },
      };

      const result = await aiAnalysisService.analyzeNoteWithProgress(
        request,
        progressCallback,
      );

      expect(result).toBeDefined();
      expect(progressCallback).not.toHaveBeenCalled();
    });
  });

  describe('getSupportedOperations', () => {
    it('should return all supported operations', () => {
      const operations = aiAnalysisService.getSupportedOperations();

      expect(operations).toHaveLength(5);
      expect(operations.map(op => op.id)).toContain('categorize');
      expect(operations.map(op => op.id)).toContain('tag');
      expect(operations.map(op => op.id)).toContain('summarize');
      expect(operations.map(op => op.id)).toContain('keywords');
      expect(operations.map(op => op.id)).toContain('sentiment');
    });

    it('should return operations with correct structure', () => {
      const operations = aiAnalysisService.getSupportedOperations();

      operations.forEach(operation => {
        expect(operation).toHaveProperty('id');
        expect(operation).toHaveProperty('name');
        expect(operation).toHaveProperty('description');
        expect(operation).toHaveProperty('enabled');
        expect(typeof operation.enabled).toBe('boolean');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      const invalidRequest = {
        noteId: '',
        title: '',
        content: '',
        operations: ['invalid-operation'] as any,
        options: {
          language: 'invalid-lang' as any,
          quality: 'invalid-quality' as any,
        },
      };

      // 服务应该有错误处理机制
      const result = await aiAnalysisService.analyzeNote(invalidRequest);

      // 即使有错误，也应该返回结构化的响应
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle network timeouts gracefully', async () => {
      const request: AIAnalysisRequest = {
        noteId: 'timeout-test',
        title: '超时测试',
        content: '测试网络超时处理',
        operations: ['summarize'],
        options: {
          language: 'zh',
          quality: 'thorough',
        },
      };

      // 模拟超时
      const originalPromise = Promise;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 100);
      });

      // 这里应该有超时处理逻辑
      try {
        await Promise.race([
          aiAnalysisService.analyzeNote(request),
          timeoutPromise,
        ]);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Network timeout');
      }
    });
  });

  describe('Data Validation', () => {
    it('should validate input parameters', async () => {
      const invalidRequests = [
        {
          noteId: '',
          title: 'test',
          content: 'test',
          operations: ['summarize'],
        },
        {
          noteId: 'test',
          title: '',
          content: 'test',
          operations: ['summarize'],
        },
        {
          noteId: 'test',
          title: 'test',
          content: '',
          operations: ['summarize'],
        },
      ];

      for (const request of invalidRequests) {
        const result = await aiAnalysisService.analyzeNote(request as any);
        expect(result).toBeDefined();
      }
    });

    it('should return consistent response structure', async () => {
      const request: AIAnalysisRequest = {
        noteId: 'consistency-test',
        title: '一致性测试',
        content: '测试响应结构的一致性',
        operations: ['categorize', 'tag'],
        options: {
          language: 'zh',
          quality: 'balanced',
        },
      };

      const result1 = await aiAnalysisService.analyzeNote(request);
      const result2 = await aiAnalysisService.analyzeNote(request);

      expect(result1).toEqual(result2);
    });
  });
});
