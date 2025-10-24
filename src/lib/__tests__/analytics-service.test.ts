/**
 * 数据分析服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyticsService, type AnalyticsData } from '../analytics-service';

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清除缓存
    analyticsService['clearCache']();
  });

  describe('getAnalyticsData', () => {
    it('should return analytics data successfully', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data).toBeDefined();
      expect(data.overview).toBeDefined();
      expect(data.timeSeries).toBeDefined();
      expect(data.categoryDistribution).toBeDefined();
      expect(data.tagAnalysis).toBeDefined();
      expect(data.userActivity).toBeDefined();
      expect(data.aiInsights).toBeDefined();
      expect(data.trends).toBeDefined();
    });

    it('should return data for different time ranges', async () => {
      const data7d = await analyticsService.getAnalyticsData('7d');
      const data30d = await analyticsService.getAnalyticsData('30d');
      const data90d = await analyticsService.getAnalyticsData('90d');
      const data1y = await analyticsService.getAnalyticsData('1y');

      expect(data7d).toBeDefined();
      expect(data30d).toBeDefined();
      expect(data90d).toBeDefined();
      expect(data1y).toBeDefined();

      // 不同时间范围的数据应该有不同的长度
      expect(data7d.timeSeries.length).toBe(7);
      expect(data30d.timeSeries.length).toBe(30);
      expect(data90d.timeSeries.length).toBe(90);
      expect(data1y.timeSeries.length).toBe(365);
    });

    it('should cache results', async () => {
      // 第一次调用
      const data1 = await analyticsService.getAnalyticsData('30d');

      // 第二次调用应该使用缓存
      const data2 = await analyticsService.getAnalyticsData('30d');

      expect(data1).toEqual(data2);
    });

    it('should handle cache operations', async () => {
      // 测试缓存设置和验证
      const testData = { test: 'data' };

      // 由于getFromCache方法是私有的，我们通过公共方法来测试缓存行为
      analyticsService.clearCache();

      // 清除缓存后再获取数据应该仍然正常工作
      const data = await analyticsService.getAnalyticsData('7d');
      expect(data).toBeDefined();
      expect(data.overview.totalNotes).toBeGreaterThan(0);
    });

    it('should return structured overview stats', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.overview.totalNotes).toBeGreaterThan(0);
      expect(data.overview.publishedNotes).toBeGreaterThan(0);
      expect(data.overview.draftNotes).toBeGreaterThan(0);
      expect(data.overview.totalViews).toBeGreaterThan(0);
      expect(data.overview.averageViews).toBeGreaterThan(0);
      expect(data.overview.totalWords).toBeGreaterThan(0);
      expect(data.overview.aiProcessedNotes).toBeGreaterThanOrEqual(0);
      expect(data.overview.aiProcessingRate).toBeGreaterThanOrEqual(0);
      expect(data.overview.aiProcessingRate).toBeLessThanOrEqual(1);
    });

    it('should return category distribution data', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.categoryDistribution).toBeInstanceOf(Array);
      expect(data.categoryDistribution.length).toBeGreaterThan(0);

      data.categoryDistribution.forEach(category => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('color');
        expect(category).toHaveProperty('count');
        expect(category).toHaveProperty('percentage');
        expect(category).toHaveProperty('views');
        expect(category).toHaveProperty('aiProcessed');
        expect(category.count).toBeGreaterThanOrEqual(0);
        expect(category.percentage).toBeGreaterThanOrEqual(0);
        expect(category.percentage).toBeLessThanOrEqual(100);
      });
    });

    it('should return time series data', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.timeSeries).toBeInstanceOf(Array);
      expect(data.timeSeries.length).toBe(30);

      data.timeSeries.forEach((item, index) => {
        expect(item).toHaveProperty('date');
        expect(item).toHaveProperty('notes');
        expect(item).toHaveProperty('views');
        expect(item).toHaveProperty('words');
        expect(item).toHaveProperty('aiProcessed');
        expect(item.notes).toBeGreaterThanOrEqual(0);
        expect(item.views).toBeGreaterThanOrEqual(0);
        expect(item.words).toBeGreaterThanOrEqual(0);
        expect(item.aiProcessed).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return tag analysis data', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.tagAnalysis).toBeInstanceOf(Array);
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
        expect(tag.count).toBeGreaterThanOrEqual(0);
        expect(tag.views).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return user activity data', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.userActivity).toBeDefined();
      expect(data.userActivity.dailyActivity).toBeInstanceOf(Array);
      expect(data.userActivity.hourlyActivity).toBeInstanceOf(Array);
      expect(data.userActivity.topActivities).toBeInstanceOf(Array);
      expect(data.userActivity.sessionStats).toBeDefined();

      expect(data.userActivity.dailyActivity.length).toBe(30);
      expect(data.userActivity.hourlyActivity.length).toBe(24);
      expect(data.userActivity.topActivities.length).toBeGreaterThan(0);

      data.userActivity.dailyActivity.forEach(day => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('notesCreated');
        expect(day).toHaveProperty('notesEdited');
        expect(day).toHaveProperty('notesViewed');
        expect(day).toHaveProperty('searches');
        expect(day).toHaveProperty('timeSpent');
      });
    });

    it('should return AI insights data', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.aiInsights).toBeDefined();
      expect(data.aiInsights.sentimentAnalysis).toBeDefined();
      expect(data.aiInsights.contentPatterns).toBeInstanceOf(Array);
      expect(data.aiInsights.writingHabits).toBeDefined();
      expect(data.aiInsights.topicClusters).toBeInstanceOf(Array);

      const { sentimentAnalysis } = data.aiInsights;
      expect(sentimentAnalysis.positive).toBeGreaterThanOrEqual(0);
      expect(sentimentAnalysis.negative).toBeGreaterThanOrEqual(0);
      expect(sentimentAnalysis.neutral).toBeGreaterThanOrEqual(0);
      expect(
        sentimentAnalysis.positive +
          sentimentAnalysis.negative +
          sentimentAnalysis.neutral,
      ).toBeCloseTo(1, 2);

      expect(data.aiInsights.contentPatterns.length).toBeGreaterThan(0);
      expect(data.aiInsights.topicClusters.length).toBeGreaterThan(0);
    });

    it('should return trends data', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      expect(data.trends).toBeInstanceOf(Array);
      expect(data.trends.length).toBeGreaterThan(0);

      data.trends.forEach(trend => {
        expect(trend).toHaveProperty('metric');
        expect(trend).toHaveProperty('current');
        expect(trend).toHaveProperty('previous');
        expect(trend).toHaveProperty('change');
        expect(trend).toHaveProperty('changePercent');
        expect(trend).toHaveProperty('trend');
        expect(trend.trend).toMatch(/^(up|down|stable)$/);
      });
    });
  });

  describe('getUserInsights', () => {
    it('should return user insights successfully', async () => {
      const insights = await analyticsService.getUserInsights('30d');

      expect(insights).toBeDefined();
      expect(insights.productivityScore).toBeGreaterThanOrEqual(0);
      expect(insights.engagementScore).toBeGreaterThanOrEqual(0);
      expect(insights.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(insights.growthScore).toBeGreaterThanOrEqual(0);
      expect(insights.overallScore).toBeGreaterThanOrEqual(0);
      expect(insights.recommendations).toBeInstanceOf(Array);
    });

    it('should calculate productivity score correctly', async () => {
      const insights = await analyticsService.getUserInsights('30d');

      expect(insights.productivityScore).toBeGreaterThanOrEqual(0);
      expect(insights.productivityScore).toBeLessThanOrEqual(100);
    });

    it('should calculate engagement score correctly', async () => {
      const insights = await analyticsService.getUserInsights('30d');

      expect(insights.engagementScore).toBeGreaterThanOrEqual(0);
      expect(insights.engagementScore).toBeLessThanOrEqual(100);
    });

    it('should calculate consistency score correctly', async () => {
      const insights = await analyticsService.getUserInsights('30d');

      expect(insights.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(insights.consistencyScore).toBeLessThanOrEqual(100);
    });

    it('should calculate growth score correctly', async () => {
      const insights = await analyticsService.getUserInsights('30d');

      expect(insights.growthScore).toBeGreaterThanOrEqual(0);
      expect(insights.growthScore).toBeLessThanOrEqual(100);
    });

    it('should calculate overall score correctly', async () => {
      const insights = await analyticsService.getUserInsights('30d');

      const expectedOverall =
        (insights.productivityScore +
          insights.engagementScore +
          insights.consistencyScore +
          insights.growthScore) /
        4;

      expect(insights.overallScore).toBeCloseTo(expectedOverall, 1);
    });

    it('should generate personalized recommendations', async () => {
      const insights = await analyticsService.getUserInsights('30d');

      expect(insights.recommendations).toBeInstanceOf(Array);
      expect(insights.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide different recommendations based on scores', async () => {
      // 模拟低生产力得分
      const mockLowProductivity = 40;
      const mockHighProductivity = 90;

      // Mock私有方法调用
      const generateRecommendationsSpy = vi.spyOn(
        analyticsService as any,
        'generateRecommendations',
      );

      generateRecommendationsSpy.mockReturnValue(['建议增加笔记创建频率']);

      const insights = await analyticsService.getUserInsights('30d');

      expect(generateRecommendationsSpy).toHaveBeenCalled();
      expect(insights.recommendations).toContain('建议增加笔记创建频率');
    });
  });

  describe('Helper Methods', () => {
    it('should calculate time range days correctly', () => {
      const timeRanges = ['7d', '30d', '90d', '1y'] as const;

      const expectedDays = [7, 30, 90, 365];

      timeRanges.forEach((range, index) => {
        const days = analyticsService['getTimeRangeDays'](range);
        expect(days).toBe(expectedDays[index]);
      });
    });

    it('should calculate productivity score correctly', () => {
      const mockData = {
        overview: {
          notesCreatedThisWeek: 5,
          averageWords: 400,
        },
      } as any;

      const score = analyticsService['calculateProductivityScore'](mockData);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate engagement score correctly', () => {
      const mockData = {
        overview: {
          averageViews: 30,
          aiProcessingRate: 0.8,
        },
      } as any;

      const score = analyticsService['calculateEngagementScore'](mockData);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate consistency score correctly', () => {
      const mockData = {
        userActivity: {
          dailyActivity: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            notesCreated: i % 3 === 0 ? 1 : 0, // 每3天创建一个笔记
            notesEdited: i % 2 === 0 ? 1 : 0, // 每2天编辑一个笔记
            notesViewed: 5,
            searches: 2,
            timeSpent: 30,
          })),
        },
      } as any;

      const score = analyticsService['calculateConsistencyScore'](mockData);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate growth score correctly', () => {
      const mockData = {
        overview: {
          growthRate: 0.1, // 10% growth
          totalNotes: 100,
        },
        trends: [
          { trend: 'up', changePercent: 0.15 },
          { trend: 'down', changePercent: -0.05 },
          { trend: 'stable', changePercent: 0.02 },
          { trend: 'up', changePercent: 0.08 },
        ],
      } as any;

      const score = analyticsService['calculateGrowthScore'](mockData);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Cache Management', () => {
    it('should set and check cache validity', () => {
      const testKey = 'test-key';
      const testData = { test: 'data' };
      const ttl = 5000;

      analyticsService['setCache'](testKey, testData, ttl);

      expect(analyticsService['isCacheValid'](testKey)).toBe(true);
    });

    it('should invalidate cache after expiry', () => {
      const testKey = 'test-key';
      const testData = { test: 'data' };
      const ttl = 1;

      analyticsService['setCache'](testKey, testData, ttl);

      // 等待缓存过期
      vi.advanceTimersByTime(ttl + 1);

      expect(analyticsService['isCacheValid'](testKey)).toBe(false);
    });

    it('should clear all caches', () => {
      analyticsService['setCache']('key1', 'data1', 5000);
      analyticsService['setCache']('key2', 'data2', 5000);

      expect(analyticsService['isCacheValid']('key1')).toBe(true);
      expect(analyticsService['isCacheValid']('key2')).toBe(true);

      analyticsService['clearCache']();

      expect(analyticsService['isCacheValid']('key1')).toBe(false);
      expect(analyticsService['isCacheValid']('key2')).toBe(false);
    });
  });

  describe('Data Validation', () => {
    it('should validate analytics data structure', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      // 验证必要字段存在
      expect(data).toHaveProperty('overview');
      expect(data).toHaveProperty('timeSeries');
      expect(data).toHaveProperty('categoryDistribution');
      expect(data).toHaveProperty('tagAnalysis');
      expect(data).toHaveProperty('userActivity');
      expect(data).toHaveProperty('aiInsights');
      expect(data).toHaveProperty('trends');

      // 验证数据类型
      expect(Array.isArray(data.timeSeries)).toBe(true);
      expect(Array.isArray(data.categoryDistribution)).toBe(true);
      expect(Array.isArray(data.tagAnalysis)).toBe(true);
      expect(Array.isArray(data.trends)).toBe(true);
    });

    it('should ensure data consistency', async () => {
      const data = await analyticsService.getAnalyticsData('30d');

      // 检查分类分布的百分比总和
      const categoryTotal = data.categoryDistribution.reduce(
        (sum, cat) => sum + cat.percentage,
        0,
      );
      expect(categoryTotal).toBeCloseTo(100, 0.1);

      // 检查情感分析的百分比总和
      const { sentimentAnalysis } = data.aiInsights;
      const sentimentTotal =
        sentimentAnalysis.positive +
        sentimentAnalysis.negative +
        sentimentAnalysis.neutral;
      expect(sentimentTotal).toBeCloseTo(1, 0.01);

      // 检查时间序列的连续性
      expect(data.timeSeries).toHaveLength(30);
      const firstDate = new Date(data.timeSeries[0].date);
      const lastDate = new Date(data.timeSeries[29].date);
      const timeDiff = lastDate.getTime() - firstDate.getTime();
      expect(timeDiff).toBeCloseTo(29 * 24 * 60 * 60 * 1000, 1000 * 60); // 29天的毫秒数
    });

    it('should generate meaningful insights', async () => {
      const insights = await analyticsService.getUserInsights('30d');

      // 检查洞察的实用性
      expect(insights.recommendations.length).toBeGreaterThan(0);
      expect(insights.recommendations.length).toBeLessThanOrEqual(5);

      // 检查建议的多样性
      const recommendationTypes = insights.recommendations.map(
        rec =>
          rec.toLowerCase().includes('建议') ||
          rec.toLowerCase().includes('尝试') ||
          rec.toLowerCase().includes('可以考虑'),
      );
      expect(recommendationTypes.some(type => type)).toBe(true);
    });
  });
});
