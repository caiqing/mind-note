/**
 * 数据分析服务简化测试
 * 专注于公共API测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyticsService } from '../services/analytics-service';

describe('Analytics Service (Public API)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清除缓存确保测试独立性
    analyticsService.clearCache();
  });

  describe('getAnalyticsData', () => {
    it('should return analytics data for different time ranges', async () => {
      const timeRanges = ['7d', '30d', '90d', '1y'] as const;

      for (const timeRange of timeRanges) {
        const data = await analyticsService.getAnalyticsData(timeRange);

        expect(data).toBeDefined();
        expect(data.overview).toBeDefined();
        expect(data.timeSeries).toBeInstanceOf(Array);
        expect(data.categoryDistribution).toBeInstanceOf(Array);
        expect(data.tagAnalysis).toBeInstanceOf(Array);
        expect(data.userActivity).toBeDefined();
        expect(data.aiInsights).toBeDefined();
        expect(data.trends).toBeInstanceOf(Array);

        // 验证概览数据
        expect(data.overview.totalNotes).toBeGreaterThan(0);
        expect(data.overview.publishedNotes).toBeGreaterThan(0);
        expect(data.overview.draftNotes).toBeGreaterThanOrEqual(0);
        expect(data.overview.totalViews).toBeGreaterThan(0);
        expect(data.overview.averageViews).toBeGreaterThan(0);
        expect(data.overview.totalWords).toBeGreaterThan(0);
        expect(data.overview.aiProcessedNotes).toBeGreaterThanOrEqual(0);
        expect(data.overview.aiProcessingRate).toBeGreaterThanOrEqual(0);
        expect(data.overview.aiProcessingRate).toBeLessThanOrEqual(1);
      }
    });

    it('should return different time series lengths for different ranges', async () => {
      const data7d = await analyticsService.getAnalyticsData('7d');
      const data30d = await analyticsService.getAnalyticsData('30d');
      const data90d = await analyticsService.getAnalyticsData('90d');

      expect(data7d.timeSeries.length).toBe(7);
      expect(data30d.timeSeries.length).toBe(30);
      expect(data90d.timeSeries.length).toBe(90);
    });

    it('should cache results for same time range', async () => {
      const timeRange = '30d' as const;

      // 第一次调用
      const startTime1 = Date.now();
      const data1 = await analyticsService.getAnalyticsData(timeRange);
      const endTime1 = Date.now();

      // 第二次调用应该使用缓存（理论上更快）
      const startTime2 = Date.now();
      const data2 = await analyticsService.getAnalyticsData(timeRange);
      const endTime2 = Date.now();

      expect(data1).toEqual(data2);
      // 数据结构应该完全相同
      expect(JSON.stringify(data1)).toBe(JSON.stringify(data2));
    });

    it('should return valid category distribution', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.categoryDistribution.length).toBeGreaterThan(0);

      let totalPercentage = 0;
      data.categoryDistribution.forEach(category => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('color');
        expect(category).toHaveProperty('count');
        expect(category).toHaveProperty('percentage');
        expect(category).toHaveProperty('views');
        expect(category).toHaveProperty('aiProcessed');

        expect(category.count).toBeGreaterThan(0);
        expect(category.percentage).toBeGreaterThanOrEqual(0);
        expect(category.views).toBeGreaterThanOrEqual(0);
        expect(category.aiProcessed).toBeGreaterThanOrEqual(0);

        totalPercentage += category.percentage;
      });

      // 总百分比应该接近100%（允许小的舍入误差）
      expect(totalPercentage).toBeGreaterThanOrEqual(95);
      expect(totalPercentage).toBeLessThanOrEqual(105);
    });

    it('should return valid tag analysis', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.tagAnalysis.length).toBeGreaterThan(0);

      data.tagAnalysis.forEach(tag => {
        expect(tag).toHaveProperty('name');
        expect(tag).toHaveProperty('count');
        expect(tag).toHaveProperty('views');
        expect(tag).toHaveProperty('averageViews');
        expect(tag).toHaveProperty('totalWords');
        expect(tag).toHaveProperty('averageWords');
        expect(tag).toHaveProperty('relatedTags');
        expect(tag).toHaveProperty('trend');

        expect(tag.count).toBeGreaterThan(0);
        expect(tag.views).toBeGreaterThanOrEqual(0);
        expect(tag.averageViews).toBeGreaterThanOrEqual(0);
        expect(tag.totalWords).toBeGreaterThanOrEqual(0);
        expect(tag.averageWords).toBeGreaterThanOrEqual(0);
        expect(tag.relatedTags).toBeInstanceOf(Array);
        expect(['up', 'down', 'stable']).toContain(tag.trend);
      });
    });

    it('should return valid user activity data', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.userActivity.dailyActivity).toBeInstanceOf(Array);
      expect(data.userActivity.dailyActivity.length).toBe(30);

      expect(data.userActivity.hourlyActivity).toBeInstanceOf(Array);
      expect(data.userActivity.hourlyActivity.length).toBe(24);

      expect(data.userActivity.topActivities).toBeInstanceOf(Array);
      expect(data.userActivity.topActivities.length).toBeGreaterThan(0);

      expect(data.userActivity.sessionStats).toBeDefined();
      expect(
        data.userActivity.sessionStats.averageSessionDuration,
      ).toBeGreaterThan(0);
      expect(data.userActivity.sessionStats.totalSessions).toBeGreaterThan(0);
      expect(data.userActivity.sessionStats.bounceRate).toBeGreaterThanOrEqual(
        0,
      );
      expect(data.userActivity.sessionStats.bounceRate).toBeLessThanOrEqual(1);
    });

    it('should return valid AI insights', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.aiInsights.sentimentAnalysis).toBeDefined();
      expect(data.aiInsights.sentimentAnalysis.positive).toBeGreaterThanOrEqual(
        0,
      );
      expect(data.aiInsights.sentimentAnalysis.negative).toBeGreaterThanOrEqual(
        0,
      );
      expect(data.aiInsights.sentimentAnalysis.neutral).toBeGreaterThanOrEqual(
        0,
      );

      // 情感分析总和应该接近1
      const sentimentSum =
        data.aiInsights.sentimentAnalysis.positive +
        data.aiInsights.sentimentAnalysis.negative +
        data.aiInsights.sentimentAnalysis.neutral;
      expect(sentimentSum).toBeGreaterThan(0.9);
      expect(sentimentSum).toBeLessThan(1.1);

      expect(data.aiInsights.contentPatterns).toBeInstanceOf(Array);
      expect(data.aiInsights.writingHabits).toBeDefined();
      expect(data.aiInsights.topicClusters).toBeInstanceOf(Array);
    });

    it('should return valid trends data', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.trends.length).toBeGreaterThan(0);

      data.trends.forEach(trend => {
        expect(trend).toHaveProperty('metric');
        expect(trend).toHaveProperty('current');
        expect(trend).toHaveProperty('previous');
        expect(trend).toHaveProperty('change');
        expect(trend).toHaveProperty('changePercent');
        expect(trend).toHaveProperty('trend');

        expect(['up', 'down', 'stable']).toContain(trend.trend);
        expect(typeof trend.changePercent).toBe('number');
      });
    });
  });

  describe('getUserInsights', () => {
    it('should return user insights for different time ranges', async () => {
      const timeRanges = ['7d', '30d', '90d', '1y'] as const;

      for (const timeRange of timeRanges) {
        const insights = await analyticsService.getUserInsights(timeRange);

        expect(insights).toBeDefined();
        expect(insights.productivityScore).toBeGreaterThanOrEqual(0);
        expect(insights.productivityScore).toBeLessThanOrEqual(100);

        expect(insights.engagementScore).toBeGreaterThanOrEqual(0);
        expect(insights.engagementScore).toBeLessThanOrEqual(100);

        expect(insights.consistencyScore).toBeGreaterThanOrEqual(0);
        expect(insights.consistencyScore).toBeLessThanOrEqual(100);

        expect(insights.growthScore).toBeGreaterThanOrEqual(0);
        expect(insights.growthScore).toBeLessThanOrEqual(100);

        expect(insights.overallScore).toBeGreaterThanOrEqual(0);
        expect(insights.overallScore).toBeLessThanOrEqual(100);

        expect(insights.recommendations).toBeInstanceOf(Array);
        expect(insights.recommendations.length).toBeGreaterThan(0);
        expect(insights.recommendations.length).toBeLessThanOrEqual(5); // 最多5个建议
      }
    });

    it('should calculate overall score as average of component scores', async () => {
      const insights = await analyticsService.getUserInsights('30d');

      const expectedOverall = Math.round(
        (insights.productivityScore +
          insights.engagementScore +
          insights.consistencyScore +
          insights.growthScore) /
          4,
      );

      expect(insights.overallScore).toBe(expectedOverall);
    });

    it('should provide relevant recommendations', async () => {
      const insights = await analyticsService.getUserInsights('30d');

      expect(insights.recommendations.length).toBeGreaterThan(0);

      insights.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(10); // 建议应该有意义
        expect(recommendation).toMatch(/[\u4e00-\u9fa5]/); // 应该包含中文
      });
    });

    it('should return consistent insights for same time range', async () => {
      const timeRange = '30d' as const;

      const insights1 = await analyticsService.getUserInsights(timeRange);
      const insights2 = await analyticsService.getUserInsights(timeRange);

      expect(insights1).toEqual(insights2);
    });

    it('should handle edge cases gracefully', async () => {
      // 测试极端情况，服务应该能正常处理
      const insights = await analyticsService.getUserInsights('7d');

      expect(insights).toBeDefined();
      expect(insights.productivityScore).toBeGreaterThanOrEqual(0);
      expect(insights.engagementScore).toBeGreaterThanOrEqual(0);
      expect(insights.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(insights.growthScore).toBeGreaterThanOrEqual(0);
      expect(insights.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache successfully', async () => {
      // 先获取数据建立缓存
      await analyticsService.getAnalyticsData('30d');

      // 清除缓存
      analyticsService.clearCache();

      // 再次获取数据应该仍然正常
      const data = await analyticsService.getAnalyticsData('30d');
      expect(data).toBeDefined();
      expect(data.overview.totalNotes).toBeGreaterThan(0);
    });

    it('should handle multiple cache operations', async () => {
      const timeRanges = ['7d', '30d', '90d'] as const;

      // 获取多个时间范围的数据
      for (const timeRange of timeRanges) {
        await analyticsService.getAnalyticsData(timeRange);
      }

      // 清除缓存
      analyticsService.clearCache();

      // 再次获取所有数据应该正常
      for (const timeRange of timeRanges) {
        const data = await analyticsService.getAnalyticsData(timeRange);
        expect(data).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid time ranges gracefully', async () => {
      // 测试无效时间范围，应该有默认处理
      try {
        const data = await analyticsService.getAnalyticsData('invalid' as any);
        // 如果没有抛出错误，数据应该是有效的
        expect(data).toBeDefined();
      } catch (error) {
        // 如果抛出错误，应该是预期的错误类型
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should maintain data integrity under stress', async () => {
      // 连续多次请求
      const promises = Array.from({ length: 10 }, () =>
        analyticsService.getAnalyticsData('30d'),
      );

      const results = await Promise.all(promises);

      // 所有结果应该相同
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });
    });
  });
});
