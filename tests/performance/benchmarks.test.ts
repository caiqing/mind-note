/**
 * 性能基准测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { searchService } from '@/lib/services/search-service';
import { analyticsService } from '@/lib/services/analytics-service';
import { aiAnalysisService } from '@/lib/ai-analysis-service';
import {
  createMockSearchRequest,
  createMockAnalyticsData,
} from '../utils/test-factories';

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    // 清除缓存确保测试的一致性
    searchService.clearCache?.();
    analyticsService['clearCache']?.();
  });

  afterEach(() => {
    // 清理测试后的缓存
    searchService.clearCache?.();
    analyticsService['clearCache']?.();
  });

  describe('搜索性能测试', () => {
    it('关键词搜索应在合理时间内完成', async () => {
      const searchRequest = createMockSearchRequest({
        query: 'React JavaScript',
        searchType: 'keyword',
        options: {
          limit: 50,
          sortBy: 'relevance',
        },
      });

      const startTime = performance.now();
      const result = await searchService.search(searchRequest);
      const endTime = performance.now();

      const searchTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(searchTime).toBeLessThan(2000); // 搜索应在2秒内完成
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('语义搜索性能测试', async () => {
      const searchRequest = createMockSearchRequest({
        query: '如何学习React框架的最佳方法',
        searchType: 'semantic',
        options: {
          limit: 20,
        },
      });

      const startTime = performance.now();
      const result = await searchService.search(searchRequest);
      const endTime = performance.now();

      const searchTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(searchTime).toBeLessThan(5000); // 语义搜索应在5秒内完成（需要向量计算）
    });

    it('混合搜索性能测试', async () => {
      const searchRequest = createMockSearchRequest({
        query: 'React组件开发实践',
        searchType: 'hybrid',
        options: {
          limit: 30,
        },
      });

      const startTime = performance.now();
      const result = await searchService.search(searchRequest);
      const endTime = performance.now();

      const searchTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(searchTime).toBeLessThan(3000); // 混合搜索应在3秒内完成
    });

    it('大量数据的搜索性能', async () => {
      // 模拟大量数据搜索
      const searchRequest = createMockSearchRequest({
        query: '前端',
        searchType: 'keyword',
        options: {
          limit: 100,
        },
      });

      const startTime = performance.now();
      const result = await searchService.search(searchRequest);
      const endTime = performance.now();

      const searchTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(searchTime).toBeLessThan(3000); // 即使是大量数据也应在3秒内完成
      expect(result.results.length).toBeLessThanOrEqual(100);
    });

    it('搜索缓存性能测试', async () => {
      const searchRequest = createMockSearchRequest({
        query: '缓存测试查询',
        searchType: 'keyword',
      });

      // 第一次搜索（无缓存）
      const startTime1 = performance.now();
      await searchService.search(searchRequest);
      const endTime1 = performance.now();
      const firstSearchTime = endTime1 - startTime1;

      // 第二次搜索（使用缓存）
      const startTime2 = performance.now();
      await searchService.search(searchRequest);
      const endTime2 = performance.now();
      const cachedSearchTime = endTime2 - startTime2;

      // 缓存搜索应该明显更快
      expect(cachedSearchTime).toBeLessThan(firstSearchTime * 0.5);
    });
  });

  describe('数据分析性能测试', () => {
    it('获取分析数据性能测试', async () => {
      const timeRanges = ['7d', '30d', '90d', '1y'] as const;

      for (const timeRange of timeRanges) {
        const startTime = performance.now();
        const data = await analyticsService.getAnalyticsData(timeRange);
        const endTime = performance.now();

        const processingTime = endTime - startTime;

        expect(data).toBeDefined();
        expect(data.overview).toBeDefined();
        expect(data.timeSeries).toBeDefined();
        expect(processingTime).toBeLessThan(3000); // 数据分析应在3秒内完成

        // 验证时间序列数据的长度
        const expectedLength =
          timeRange === '7d'
            ? 7
            : timeRange === '30d'
              ? 30
              : timeRange === '90d'
                ? 90
                : 365;
        expect(data.timeSeries).toHaveLength(expectedLength);
      }
    });

    it('用户洞察计算性能测试', async () => {
      const startTime = performance.now();
      const insights = await analyticsService.getUserInsights('30d');
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      expect(insights).toBeDefined();
      expect(insights.productivityScore).toBeGreaterThanOrEqual(0);
      expect(insights.engagementScore).toBeGreaterThanOrEqual(0);
      expect(insights.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(insights.growthScore).toBeGreaterThanOrEqual(0);
      expect(insights.overallScore).toBeGreaterThanOrEqual(0);
      expect(processingTime).toBeLessThan(2000); // 用户洞察计算应在2秒内完成
    });

    it('数据分析缓存性能测试', async () => {
      const timeRange = '30d';

      // 第一次获取数据
      const startTime1 = performance.now();
      await analyticsService.getAnalyticsData(timeRange);
      const endTime1 = performance.now();
      const firstTime = endTime1 - startTime1;

      // 第二次获取数据（使用缓存）
      const startTime2 = performance.now();
      await analyticsService.getAnalyticsData(timeRange);
      const endTime2 = performance.now();
      const cachedTime = endTime2 - startTime2;

      // 缓存访问应该明显更快
      expect(cachedTime).toBeLessThan(firstTime * 0.3);
    });
  });

  describe('AI分析性能测试', () => {
    it('单个操作AI分析性能测试', async () => {
      const request = {
        noteId: 'test-note-1',
        title: '测试笔记标题',
        content:
          '这是一个测试笔记的内容，用于测试AI分析的性能。包含一些技术术语和实践经验。',
        operations: ['summarize'] as const,
        options: {
          language: 'zh' as const,
          quality: 'balanced' as const,
          provider: 'mock-ai-service',
        },
      };

      const startTime = performance.now();
      const result = await aiAnalysisService.analyzeNote(request);
      const endTime = performance.now();

      const analysisTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(analysisTime).toBeLessThan(10000); // 单个AI操作应在10秒内完成
    });

    it('多个操作AI分析性能测试', async () => {
      const request = {
        noteId: 'test-note-2',
        title: 'React Hooks学习笔记',
        content:
          'React Hooks是React 16.8版本引入的新特性，它让你在不编写class的情况下使用state以及其他的React特性。包括useState、useEffect、useContext等常用Hooks。',
        operations: [
          'categorize',
          'tag',
          'summarize',
          'keywords',
          'sentiment',
        ] as const,
        options: {
          language: 'zh' as const,
          quality: 'balanced' as const,
        },
      };

      const startTime = performance.now();
      const result = await aiAnalysisService.analyzeNote(request);
      const endTime = performance.now();

      const analysisTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.results.category).toBeDefined();
      expect(result.results.tags).toBeDefined();
      expect(result.results.summary).toBeDefined();
      expect(result.results.keywords).toBeDefined();
      expect(result.results.sentiment).toBeDefined();
      expect(analysisTime).toBeLessThan(30000); // 多个AI操作应在30秒内完成
    });

    it('AI分析进度回调性能测试', async () => {
      const progressUpdates: any[] = [];
      const progressCallback = (update: any) => {
        progressUpdates.push({
          operation: update.operation,
          progress: update.progress,
          timestamp: performance.now(),
        });
      };

      const request = {
        noteId: 'test-note-3',
        title: '进度测试笔记',
        content: '测试AI分析进度回调功能的笔记内容。',
        operations: ['categorize', 'tag', 'summarize'] as const,
        options: {
          language: 'zh' as const,
          quality: 'balanced' as const,
        },
      };

      const startTime = performance.now();
      await aiAnalysisService.analyzeNoteWithProgress(
        request,
        progressCallback,
      );
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].progress).toBe(0);
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
      expect(totalTime).toBeLessThan(20000);

      // 验证进度更新的时间间隔
      for (let i = 1; i < progressUpdates.length; i++) {
        const interval =
          progressUpdates[i].timestamp - progressUpdates[i - 1].timestamp;
        expect(interval).toBeGreaterThan(100); // 进度更新间隔至少100ms
      }
    });
  });

  describe('内存使用性能测试', () => {
    it('大量数据处理内存使用测试', async () => {
      const initialMemory = process.memoryUsage();

      // 执行大量数据处理操作
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(analyticsService.getAnalyticsData('30d'));
        promises.push(
          searchService.search(
            createMockSearchRequest({
              query: `测试查询${i}`,
              searchType: 'keyword',
            }),
          ),
        );
      }

      await Promise.all(promises);

      const finalMemory = process.memoryUsage();

      // 验证内存使用增长在合理范围内
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 内存增长应小于100MB
    });

    it('缓存内存管理测试', async () => {
      const initialMemory = process.memoryUsage();

      // 执行多次操作以填充缓存
      for (let i = 0; i < 50; i++) {
        await searchService.search(
          createMockSearchRequest({
            query: `缓存测试${i}`,
            searchType: 'keyword',
          }),
        );
        await analyticsService.getAnalyticsData('30d');
      }

      const memoryAfterCache = process.memoryUsage();

      // 清除缓存
      searchService.clearCache?.();
      analyticsService['clearCache']?.();

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      const memoryAfterCleanup = process.memoryUsage();

      // 验证缓存清理后内存使用下降
      const cacheMemoryUsage =
        memoryAfterCache.heapUsed - initialMemory.heapUsed;
      const memoryAfterClearing =
        memoryAfterCleanup.heapUsed - initialMemory.heapUsed;

      expect(memoryAfterClearing).toBeLessThan(cacheMemoryUsage * 0.8);
    });
  });

  describe('并发性能测试', () => {
    it('并发搜索请求性能测试', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        searchService.search(
          createMockSearchRequest({
            query: `并发测试${i}`,
            searchType: 'keyword',
          }),
        ),
      );

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.results).toBeDefined();
      });

      // 并发请求的总时间应该接近单个请求的时间
      expect(totalTime).toBeLessThan(5000); // 10个并发请求应在5秒内完成
    });

    it('并发数据分析性能测试', async () => {
      const concurrentRequests = 5;
      const timeRanges = ['7d', '30d', '90d', '1y', '30d'] as const;

      const requests = timeRanges.map(range =>
        analyticsService.getAnalyticsData(range),
      );

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.overview).toBeDefined();
      });

      expect(totalTime).toBeLessThan(8000); // 5个并发分析请求应在8秒内完成
    });
  });
});
