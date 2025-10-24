/**
 * 负载测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { performance } from 'perf_hooks';
import { searchService } from '@/lib/services/search-service';
import { analyticsService } from '@/lib/services/analytics-service';
import { createMockSearchRequest } from '../utils/test-factories';

describe('负载测试', () => {
  beforeEach(() => {
    // 清除缓存
    searchService.clearCache?.();
    analyticsService['clearCache']?.();
  });

  describe('搜索服务负载测试', () => {
    it('高频搜索请求负载测试', async () => {
      const requestCount = 100;
      const requests = Array.from({ length: requestCount }, (_, i) =>
        searchService.search(
          createMockSearchRequest({
            query: `负载测试${i % 10}`, // 10种不同的查询
            searchType: 'keyword',
            options: { limit: 20 },
          }),
        ),
      );

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / requestCount;

      expect(results).toHaveLength(requestCount);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.results).toBeDefined();
      });

      // 平均每个请求应在合理时间内完成
      expect(averageTime).toBeLessThan(500); // 平均每请求500ms
      expect(totalTime).toBeLessThan(30000); // 总时间不超过30秒
    });

    it('复杂数据搜索负载测试', async () => {
      const complexQueries = [
        'React Hooks useEffect useState',
        'JavaScript 异步编程 Promise async await',
        '前端性能优化 代码分割 懒加载',
        'TypeScript 接口 泛型 类型推断',
        'Vue.js 组件 生命周期 状态管理',
      ];

      const requests = complexQueries.flatMap(query => [
        searchService.search(
          createMockSearchRequest({ query, searchType: 'keyword' }),
        ),
        searchService.search(
          createMockSearchRequest({ query, searchType: 'semantic' }),
        ),
        searchService.search(
          createMockSearchRequest({ query, searchType: 'hybrid' }),
        ),
      ]);

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      expect(results).toHaveLength(15); // 5个查询 × 3种搜索类型
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      expect(totalTime).toBeLessThan(20000); // 复杂搜索应在20秒内完成
    });

    it('大数据量搜索负载测试', async () => {
      const requests = Array.from({ length: 50 }, (_, i) =>
        searchService.search(
          createMockSearchRequest({
            query: `大数据测试${i}`,
            searchType: 'keyword',
            options: {
              limit: 100, // 大结果集
              sortBy: 'relevance',
            },
          }),
        ),
      );

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.results.length).toBeLessThanOrEqual(100);
      });

      expect(totalTime).toBeLessThan(25000); // 大数据量搜索应在25秒内完成
    });
  });

  describe('数据分析服务负载测试', () => {
    it('多时间范围分析负载测试', async () => {
      const timeRanges = ['7d', '30d', '90d', '1y'] as const;
      const requests = [];

      // 每个时间范围执行10次分析
      timeRanges.forEach(range => {
        for (let i = 0; i < 10; i++) {
          requests.push(analyticsService.getAnalyticsData(range));
        }
      });

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / requests.length;

      expect(results).toHaveLength(40);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.overview).toBeDefined();
        expect(result.timeSeries).toBeDefined();
      });

      expect(averageTime).toBeLessThan(1000); // 平均每次分析1秒内
      expect(totalTime).toBeLessThan(20000); // 总时间20秒内
    });

    it('用户洞察并发计算负载测试', async () => {
      const requestCount = 20;
      const requests = Array.from({ length: requestCount }, () =>
        analyticsService.getUserInsights('30d'),
      );

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / requestCount;

      expect(results).toHaveLength(requestCount);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.overallScore).toBeGreaterThanOrEqual(0);
      });

      expect(averageTime).toBeLessThan(500); // 平均每次洞察计算500ms内
      expect(totalTime).toBeLessThan(8000); // 总时间8秒内
    });
  });

  describe('内存压力测试', () => {
    it('持续高负载内存测试', async () => {
      const initialMemory = process.memoryUsage();
      const memorySnapshots = [initialMemory];

      // 执行5轮高负载操作
      for (let round = 0; round < 5; round++) {
        const roundRequests = [];

        // 每轮包含搜索和分析操作
        for (let i = 0; i < 20; i++) {
          roundRequests.push(
            searchService.search(
              createMockSearchRequest({
                query: `内存测试${round}-${i}`,
                searchType: 'keyword',
              }),
            ),
            analyticsService.getAnalyticsData('30d'),
          );
        }

        await Promise.all(roundRequests);

        // 记录内存使用
        const currentMemory = process.memoryUsage();
        memorySnapshots.push(currentMemory);

        // 可选：强制垃圾回收
        if (global.gc && round % 2 === 0) {
          global.gc();
        }
      }

      // 分析内存使用趋势
      const memoryGrowth = memorySnapshots.map(snapshot => snapshot.heapUsed);
      const maxMemory = Math.max(...memoryGrowth);
      const initialHeap = initialMemory.heapUsed;
      const totalGrowth = maxMemory - initialHeap;

      // 内存增长应该在合理范围内
      expect(totalGrowth).toBeLessThan(200 * 1024 * 1024); // 总增长小于200MB

      // 验证内存没有无限增长
      const lastTwoSnapshots = memoryGrowth.slice(-2);
      const recentGrowth = lastTwoSnapshots[1] - lastTwoSnapshots[0];
      expect(recentGrowth).toBeLessThan(50 * 1024 * 1024); // 最近一轮增长小于50MB
    });

    it('缓存压力测试', async () => {
      const initialMemory = process.memoryUsage();

      // 大量不同的查询以填充缓存
      const uniqueQueries = 200;
      const requests = Array.from({ length: uniqueQueries }, (_, i) =>
        searchService.search(
          createMockSearchRequest({
            query: `唯一查询${i}`,
            searchType: 'keyword',
          }),
        ),
      );

      await Promise.all(requests);

      const memoryAfterCache = process.memoryUsage();

      // 执行缓存命中测试
      const cacheHitRequests = Array.from({ length: 100 }, (_, i) =>
        searchService.search(
          createMockSearchRequest({
            query: `唯一查询${i % 50}`, // 重复之前的查询
            searchType: 'keyword',
          }),
        ),
      );

      await Promise.all(cacheHitRequests);

      const memoryAfterHits = process.memoryUsage();

      // 清除缓存
      searchService.clearCache?.();

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const memoryAfterCleanup = process.memoryUsage();

      // 验证缓存内存使用
      const cacheMemoryUsage =
        memoryAfterCache.heapUsed - initialMemory.heapUsed;
      const memoryGrowthFromHits =
        memoryAfterHits.heapUsed - memoryAfterCache.heapUsed;
      const memoryAfterClear =
        memoryAfterCleanup.heapUsed - initialMemory.heapUsed;

      expect(cacheMemoryUsage).toBeLessThan(100 * 1024 * 1024); // 缓存占用小于100MB
      expect(memoryGrowthFromHits).toBeLessThan(cacheMemoryUsage * 0.2); // 缓存命中内存增长很小
      expect(memoryAfterClear).toBeLessThan(cacheMemoryUsage * 0.5); // 清理后内存大幅释放
    });
  });

  describe('极限负载测试', () => {
    it('极限并发搜索测试', async () => {
      const maxConcurrency = 50;
      const requests = Array.from({ length: maxConcurrency }, (_, i) =>
        searchService.search(
          createMockSearchRequest({
            query: `极限测试${i}`,
            searchType: 'keyword',
            options: { limit: 50 },
          }),
        ),
      );

      const startTime = performance.now();

      // 使用 Promise.allSettled 处理可能的失败
      const results = await Promise.allSettled(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const successCount = results.filter(
        result => result.status === 'fulfilled',
      ).length;
      const failureCount = results.filter(
        result => result.status === 'rejected',
      ).length;

      expect(successCount).toBeGreaterThan(maxConcurrency * 0.9); // 至少90%成功
      expect(failureCount).toBeLessThan(maxConcurrency * 0.1); // 最多10%失败
      expect(totalTime).toBeLessThan(60000); // 极限情况下60秒内完成
    });

    it('混合操作极限测试', async () => {
      const operations = [];

      // 混合不同类型的操作
      for (let i = 0; i < 30; i++) {
        operations.push(
          searchService.search(
            createMockSearchRequest({
              query: `混合测试${i}`,
              searchType: 'keyword',
            }),
          ),
          analyticsService.getAnalyticsData('30d'),
          analyticsService.getUserInsights('30d'),
        );
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(operations);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const successCount = results.filter(
        result => result.status === 'fulfilled',
      ).length;

      expect(successCount).toBeGreaterThan(operations.length * 0.8); // 至少80%成功
      expect(totalTime).toBeLessThan(45000); // 45秒内完成
    });
  });

  describe('性能退化检测', () => {
    it('性能退化检测测试', async () => {
      const baseRequests = 10;
      const responseTimes = [];

      // 执行多轮相同的操作，检测性能退化
      for (let round = 0; round < 5; round++) {
        const requests = Array.from({ length: baseRequests }, (_, i) =>
          searchService.search(
            createMockSearchRequest({
              query: '性能检测测试',
              searchType: 'keyword',
            }),
          ),
        );

        const roundStartTime = performance.now();
        await Promise.all(requests);
        const roundEndTime = performance.now();

        const averageTime = (roundEndTime - roundStartTime) / baseRequests;
        responseTimes.push(averageTime);

        // 轮次间隔等待
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 分析性能趋势
      const firstRound = responseTimes[0];
      const lastRound = responseTimes[responseTimes.length - 1];
      const performanceDegradation = (lastRound - firstRound) / firstRound;

      // 性能退化应小于50%
      expect(performanceDegradation).toBeLessThan(0.5);

      // 最后一轮不应超过第一轮的3倍
      expect(lastRound).toBeLessThan(firstRound * 3);

      // 响应时间应该相对稳定
      const averageResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) /
        responseTimes.length;
      const maxDeviation = Math.max(
        ...responseTimes.map(time => Math.abs(time - averageResponseTime)),
      );
      expect(maxDeviation).toBeLessThan(averageResponseTime); // 最大偏差不应超过平均值
    });
  });
});
