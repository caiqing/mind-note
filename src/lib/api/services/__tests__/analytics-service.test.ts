/**
 * T110 分析API服务测试套件
 * 测试分析服务的完整功能，包括指标收集、仪表板、报告生成等
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsService } from '../analytics-service';
import { AnalyticsConfig, UserBehaviorEvent, DateRange } from '../../types';
import { ValidationError, NotFoundError } from '../../errors';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let testConfig: AnalyticsConfig;

  beforeEach(() => {
    testConfig = {
      baseUrl: 'http://localhost:3000/api/v1/analytics',
      timeout: 30000,
      retries: 3,
      enableLogging: false,
      enableCaching: true,
      cacheTTL: 300000,
      maxBatchSize: 1000,
      bufferSize: 10000,
      flushInterval: 30000,
      enableRealTimeMetrics: true,
      retentionPeriod: 90 * 24 * 60 * 60 * 1000,
      enableInsights: true,
      insightsThreshold: 0.8,
      enableReports: true,
      maxConcurrentReports: 5
    };

    analyticsService = new AnalyticsService(testConfig);
  });

  afterEach(() => {
    // 清理测试数据
    analyticsService = null as any;
  });

  describe('用户事件跟踪', () => {
    describe('trackUserEvent', () => {
      it('应该成功跟踪单个用户事件', async () => {
        const event: UserBehaviorEvent = {
          eventType: 'note_created',
          userId: 'user_123',
          sessionId: 'session_456',
          timestamp: new Date(),
          properties: {
            noteId: 'note_789',
            category: 'technology',
            tags: ['AI', 'machine learning']
          }
        };

        const result = await analyticsService.trackUserEvent(event);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Event tracked successfully');
      });

      it('应该拒绝无效的事件数据', async () => {
        const invalidEvent = {
          eventType: '',
          userId: '',
          sessionId: '',
          timestamp: 'invalid-date',
          properties: 'invalid-object'
        } as any;

        await expect(analyticsService.trackUserEvent(invalidEvent))
          .rejects.toThrow(ValidationError);
      });

      it('应该接受缺失的可选属性', async () => {
        const minimalEvent: UserBehaviorEvent = {
          eventType: 'user_login',
          userId: 'user_123',
          sessionId: 'session_456',
          timestamp: new Date(),
          properties: {}
        };

        const result = await analyticsService.trackUserEvent(minimalEvent);

        expect(result.success).toBe(true);
      });

      it('应该验证事件类型长度', async () => {
        const longEvent = {
          eventType: 'a'.repeat(101),
          userId: 'user_123',
          sessionId: 'session_456',
          timestamp: new Date(),
          properties: {}
        };

        await expect(analyticsService.trackUserEvent(longEvent as any))
          .rejects.toThrow(ValidationError);
      });
    });

    describe('trackBatchEvents', () => {
      it('应该成功跟踪批量事件', async () => {
        const events: UserBehaviorEvent[] = [
          {
            eventType: 'note_viewed',
            userId: 'user_123',
            sessionId: 'session_456',
            timestamp: new Date(),
            properties: { noteId: 'note_001' }
          },
          {
            eventType: 'search_performed',
            userId: 'user_123',
            sessionId: 'session_456',
            timestamp: new Date(),
            properties: { query: 'machine learning' }
          },
          {
            eventType: 'ai_interaction',
            userId: 'user_123',
            sessionId: 'session_456',
            timestamp: new Date(),
            properties: { action: 'generate_tags' }
          }
        ];

        const result = await analyticsService.trackBatchEvents(events);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Batch events tracked successfully');
      });

      it('应该拒绝空的事件数组', async () => {
        await expect(analyticsService.trackBatchEvents([]))
          .rejects.toThrow(ValidationError);
      });

      it('应该拒绝超过限制的事件数量', async () => {
        const tooManyEvents = Array(1001).fill(null).map((_, i) => ({
          eventType: 'test_event',
          userId: 'user_123',
          sessionId: 'session_456',
          timestamp: new Date(),
          properties: { index: i }
        }));

        await expect(analyticsService.trackBatchEvents(tooManyEvents))
          .rejects.toThrow(ValidationError);
      });

      it('应该验证每个事件的有效性', async () => {
        const mixedEvents = [
          {
            eventType: 'valid_event',
            userId: 'user_123',
            sessionId: 'session_456',
            timestamp: new Date(),
            properties: {}
          },
          {
            eventType: '', // 无效事件
            userId: 'user_123',
            sessionId: 'session_456',
            timestamp: new Date(),
            properties: {}
          }
        ];

        await expect(analyticsService.trackBatchEvents(mixedEvents as any))
          .rejects.toThrow(ValidationError);
      });
    });
  });

  describe('分析查询', () => {
    describe('executeQuery', () => {
      it('应该成功执行指标查询', async () => {
        const query = {
          type: 'metric',
          metrics: ['total_users', 'active_users'],
          timeRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          limit: 100
        };

        const result = await analyticsService.executeQuery(query);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.queryId).toBeDefined();
        expect(result.data.results).toBeDefined();
        expect(result.data.executionTime).toBeGreaterThan(0);
      });

      it('应该成功执行趋势查询', async () => {
        const query = {
          type: 'trend',
          metrics: ['total_notes'],
          timeRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          granularity: 'day'
        };

        const result = await analyticsService.executeQuery(query);

        expect(result.success).toBe(true);
        expect(result.data.results).toBeDefined();
        expect(Array.isArray(result.data.results)).toBe(true);
      });

      it('应该成功执行漏斗查询', async () => {
        const query = {
          type: 'funnel',
          name: '用户注册漏斗',
          funnelSteps: [
            { stepId: 'visit', stepName: '访问网站', description: '用户访问首页' },
            { stepId: 'register', stepName: '开始注册', description: '用户点击注册按钮' },
            { stepId: 'complete', stepName: '完成注册', description: '用户成功注册' }
          ],
          timeRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
        };

        const result = await analyticsService.executeQuery(query);

        expect(result.success).toBe(true);
        expect(result.data.results).toBeDefined();
        expect(result.data.results.steps).toBeDefined();
        expect(Array.isArray(result.data.results.steps)).toBe(true);
      });

      it('应该成功执行队列查询', async () => {
        const query = {
          type: 'cohort',
          cohortType: 'registration',
          timeRange: {
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          metrics: ['retention', 'engagement']
        };

        const result = await analyticsService.executeQuery(query);

        expect(result.success).toBe(true);
        expect(result.data.results).toBeDefined();
        expect(result.data.results.cohorts).toBeDefined();
        expect(Array.isArray(result.data.results.cohorts)).toBe(true);
      });

      it('应该成功执行对比查询', async () => {
        const query = {
          type: 'comparison',
          name: '月度对比',
          metrics: ['total_users', 'active_users'],
          timeRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          comparePeriod: {
            start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        };

        const result = await analyticsService.executeQuery(query);

        expect(result.success).toBe(true);
        expect(result.data.results).toBeDefined();
        expect(result.data.results.results).toBeDefined();
        expect(Array.isArray(result.data.results.results)).toBe(true);
      });

      it('应该拒绝无效的查询类型', async () => {
        const invalidQuery = {
          type: 'invalid_type',
          metrics: ['total_users']
        } as any;

        await expect(analyticsService.executeQuery(invalidQuery))
          .rejects.toThrow(ValidationError);
      });

      it('应该拒绝空的指标数组', async () => {
        const query = {
          type: 'metric',
          metrics: [],
          timeRange: {
            start: new Date(),
            end: new Date()
          }
        } as any;

        await expect(analyticsService.executeQuery(query))
          .rejects.toThrow(ValidationError);
      });

      it('应该验证时间范围的有效性', async () => {
        const query = {
          type: 'metric',
          metrics: ['total_users'],
          timeRange: {
            start: new Date(),
            end: new Date(Date.now() - 24 * 60 * 60 * 1000) // 结束时间早于开始时间
          }
        };

        await expect(analyticsService.executeQuery(query))
          .rejects.toThrow(ValidationError);
      });
    });
  });

  describe('仪表板管理', () => {
    describe('getDashboardConfig', () => {
      it('应该返回默认仪表板配置', async () => {
        const result = await analyticsService.getDashboardConfig('overview');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.id).toBe('overview');
        expect(result.data.name).toBe('总览仪表板');
        expect(result.data.widgets).toBeDefined();
        expect(Array.isArray(result.data.widgets)).toBe(true);
      });

      it('应该返回用户行为仪表板配置', async () => {
        const result = await analyticsService.getDashboardConfig('user_behavior');

        expect(result.success).toBe(true);
        expect(result.data.id).toBe('user_behavior');
        expect(result.data.widgets).toBeDefined();
        expect(result.data.filters).toBeDefined();
      });

      it('应该返回性能监控仪表板配置', async () => {
        const result = await analyticsService.getDashboardConfig('performance');

        expect(result.success).toBe(true);
        expect(result.data.id).toBe('performance');
        expect(result.data.category).toBe('performance');
      });

      it('应该拒绝不存在的仪表板ID', async () => {
        await expect(analyticsService.getDashboardConfig('nonexistent'))
          .rejects.toThrow(NotFoundError);
      });
    });

    describe('getDashboardData', () => {
      it('应该返回仪表板数据', async () => {
        const result = await analyticsService.getDashboardData('overview');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.dashboardId).toBe('overview');
        expect(result.data.widgets).toBeDefined();
        expect(result.data.timeRange).toBeDefined();
        expect(result.data.lastUpdated).toBeDefined();
      });

      it('应该应用过滤器', async () => {
        const filters = { date_range: '30d', user_segment: 'active' };
        const result = await analyticsService.getDashboardData('overview', filters);

        expect(result.success).toBe(true);
        expect(result.data.filters).toEqual(filters);
      });

      it('应该支持自定义时间范围', async () => {
        const timeRange: DateRange = {
          start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          end: new Date()
        };

        const result = await analyticsService.getDashboardData('overview', undefined, timeRange);

        expect(result.success).toBe(true);
        expect(result.data.timeRange).toEqual(timeRange);
      });

      it('应该为不存在的仪表板返回错误', async () => {
        await expect(analyticsService.getDashboardData('nonexistent'))
          .rejects.toThrow(NotFoundError);
      });
    });

    describe('saveDashboardConfig', () => {
      it('应该成功保存新的仪表板配置', async () => {
        const newConfig = {
          id: 'custom_dashboard',
          name: '自定义仪表板',
          description: '用户自定义的仪表板',
          category: 'user',
          layout: 'grid',
          widgets: [
            {
              id: 'widget_1',
              type: 'metric',
              title: '测试小部件',
              metricId: 'total_users',
              visualization: 'number',
              position: { row: 0, col: 0, width: 2, height: 1 },
              refreshInterval: 300
            }
          ],
          filters: [],
          permissions: ['read:analytics']
        };

        const result = await analyticsService.saveDashboardConfig(newConfig);

        expect(result.success).toBe(true);
        expect(result.data.id).toBe('custom_dashboard');
        expect(result.data.createdAt).toBeDefined();
        expect(result.data.updatedAt).toBeDefined();
      });

      it('应该更新现有仪表板配置', async () => {
        const updatedConfig = {
          id: 'overview',
          name: '更新后的总览仪表板',
          description: '更新的描述',
          category: 'overview',
          layout: 'grid',
          widgets: [
            {
              id: 'updated_widget',
              type: 'metric',
              title: '更新的小部件',
              metricId: 'active_users',
              visualization: 'line',
              position: { row: 0, col: 0, width: 4, height: 2 },
              refreshInterval: 60
            }
          ],
          filters: [],
          permissions: ['read:analytics']
        };

        const result = await analyticsService.saveDashboardConfig(updatedConfig);

        expect(result.success).toBe(true);
        expect(result.data.name).toBe('更新后的总览仪表板');
        expect(result.data.widgets[0].id).toBe('updated_widget');
      });

      it('应该验证仪表板配置的必填字段', async () => {
        const invalidConfig = {
          id: '',
          name: '',
          category: 'invalid_category',
          widgets: []
        };

        await expect(analyticsService.saveDashboardConfig(invalidConfig as any))
          .rejects.toThrow(ValidationError);
      });

      it('应该验证小部件数量限制', async () => {
        const tooManyWidgets = Array(21).fill(null).map((_, i) => ({
          id: `widget_${i}`,
          type: 'metric',
          title: `小部件 ${i}`,
          metricId: 'total_users',
          visualization: 'number',
          position: { row: 0, col: 0, width: 1, height: 1 },
          refreshInterval: 300
        }));

        const config = {
          id: 'too_many_widgets',
          name: '小部件过多的仪表板',
          category: 'user',
          layout: 'grid',
          widgets: tooManyWidgets,
          filters: [],
          permissions: ['read:analytics']
        };

        await expect(analyticsService.saveDashboardConfig(config as any))
          .rejects.toThrow(ValidationError);
      });
    });
  });

  describe('KPI管理', () => {
    describe('getKPIData', () => {
      it('应该返回所有KPI数据', async () => {
        const result = await analyticsService.getKPIData();

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);

        const kpi = result.data[0];
        expect(kpi.id).toBeDefined();
        expect(kpi.name).toBeDefined();
        expect(kpi.currentValue).toBeDefined();
        expect(kpi.targetValue).toBeDefined();
        expect(kpi.previousValue).toBeDefined();
        expect(kpi.unit).toBeDefined();
        expect(kpi.status).toBeDefined();
        expect(kpi.trend).toBeDefined();
      });

      it('应该返回指定的KPI数据', async () => {
        const kpiIds = ['user_growth_rate', 'user_retention_rate'];
        const result = await analyticsService.getKPIData(kpiIds);

        expect(result.success).toBe(true);
        expect(result.data.length).toBe(2);
        expect(result.data[0].id).toBe('user_growth_rate');
        expect(result.data[1].id).toBe('user_retention_rate');
      });

      it('应该支持自定义时间范围', async () => {
        const timeRange: DateRange = {
          start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          end: new Date()
        };

        const result = await analyticsService.getKPIData(undefined, timeRange);

        expect(result.success).toBe(true);
        result.data.forEach(kpi => {
          expect(kpi.timeRange).toEqual(timeRange);
        });
      });

      it('应该支持对比时间范围', async () => {
        const timeRange: DateRange = {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        };

        const comparisonRange: DateRange = {
          start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        };

        const result = await analyticsService.getKPIData(undefined, timeRange, comparisonRange);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('用户行为分析', () => {
    describe('getUserBehaviorAnalytics', () => {
      it('应该返回特定用户的行为分析', async () => {
        const userId = 'user_123';
        const result = await analyticsService.getUserBehaviorAnalytics(userId);

        expect(result.success).toBe(true);
        expect(result.data.userId).toBe(userId);
        expect(result.data.totalEvents).toBeGreaterThan(0);
        expect(result.data.sessionCount).toBeGreaterThan(0);
        expect(result.data.avgSessionDuration).toBeGreaterThan(0);
        expect(result.data.topEvents).toBeDefined();
        expect(Array.isArray(result.data.topEvents)).toBe(true);
        expect(result.data.eventTimeline).toBeDefined();
        expect(result.data.engagementScore).toBeGreaterThanOrEqual(0);
        expect(result.data.engagementScore).toBeLessThanOrEqual(100);
      });

      it('应该返回全局用户行为分析', async () => {
        const result = await analyticsService.getUserBehaviorAnalytics();

        expect(result.success).toBe(true);
        expect(result.data.userId).toBeUndefined();
        expect(result.data.totalEvents).toBeGreaterThan(0);
      });

      it('应该支持自定义时间范围', async () => {
        const timeRange: DateRange = {
          start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          end: new Date()
        };

        const result = await analyticsService.getUserBehaviorAnalytics('user_123', timeRange);

        expect(result.success).toBe(true);
        expect(result.data.timeRange).toEqual(timeRange);
      });

      it('应该支持特定事件类型筛选', async () => {
        const eventTypes = ['note_created', 'note_viewed'];
        const result = await analyticsService.getUserBehaviorAnalytics('user_123', undefined, eventTypes);

        expect(result.success).toBe(true);
        // 由于是模拟数据，这里只验证返回结构
        expect(result.data.totalEvents).toBeDefined();
      });
    });
  });

  describe('性能指标', () => {
    describe('getPerformanceMetrics', () => {
      it('应该返回性能指标数据', async () => {
        const result = await analyticsService.getPerformanceMetrics();

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.responseTime).toBeDefined();
        expect(result.data.throughput).toBeDefined();
        expect(result.data.errorRate).toBeDefined();
        expect(result.data.availability).toBeDefined();
        expect(result.data.resourceUsage).toBeDefined();
        expect(result.data.cachePerformance).toBeDefined();

        // 验证响应时间指标
        expect(result.data.responseTime.avg).toBeGreaterThan(0);
        expect(result.data.responseTime.p50).toBeGreaterThan(0);
        expect(result.data.responseTime.p95).toBeGreaterThan(0);
        expect(result.data.responseTime.p99).toBeGreaterThan(0);

        // 验证吞吐量指标
        expect(result.data.throughput.requestsPerSecond).toBeGreaterThan(0);
        expect(result.data.throughput.requestsPerMinute).toBeGreaterThan(0);

        // 验证错误率指标
        expect(result.data.errorRate.total).toBeGreaterThanOrEqual(0);
        expect(result.data.errorRate.clientErrors).toBeGreaterThanOrEqual(0);
        expect(result.data.errorRate.serverErrors).toBeGreaterThanOrEqual(0);

        // 验证可用性指标
        expect(result.data.availability.uptime).toBeGreaterThanOrEqual(0);
        expect(result.data.availability.uptime).toBeLessThanOrEqual(100);

        // 验证资源使用指标
        expect(result.data.resourceUsage.cpu).toBeGreaterThanOrEqual(0);
        expect(result.data.resourceUsage.memory).toBeGreaterThanOrEqual(0);
        expect(result.data.resourceUsage.disk).toBeGreaterThanOrEqual(0);
        expect(result.data.resourceUsage.network).toBeGreaterThanOrEqual(0);

        // 验证缓存性能指标
        expect(result.data.cachePerformance.hitRate).toBeGreaterThanOrEqual(0);
        expect(result.data.cachePerformance.hitRate).toBeLessThanOrEqual(100);
      });

      it('应该支持自定义时间范围', async () => {
        const timeRange: DateRange = {
          start: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12小时前
          end: new Date()
        };

        const result = await analyticsService.getPerformanceMetrics(timeRange);

        expect(result.success).toBe(true);
        expect(result.data.timeRange).toEqual(timeRange);
      });

      it('应该支持特定服务筛选', async () => {
        const services = ['api', 'ai'];
        const result = await analyticsService.getPerformanceMetrics(undefined, services);

        expect(result.success).toBe(true);
        expect(result.data.services).toEqual(services);
      });
    });

    describe('getSystemHealthMetrics', () => {
      it('应该返回系统健康指标', async () => {
        const result = await analyticsService.getSystemHealthMetrics();

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.overallStatus).toBeDefined();
        expect(result.data.timestamp).toBeDefined();
        expect(result.data.services).toBeDefined();
        expect(Array.isArray(result.data.services)).toBe(true);
        expect(result.data.alerts).toBeDefined();
        expect(Array.isArray(result.data.alerts)).toBe(true);
        expect(result.data.dependencies).toBeDefined();
        expect(Array.isArray(result.data.dependencies)).toBe(true);

        // 验证服务状态
        result.data.services.forEach(service => {
          expect(service.name).toBeDefined();
          expect(service.status).toBeDefined();
          expect(service.responseTime).toBeGreaterThan(0);
          expect(service.uptime).toBeGreaterThanOrEqual(0);
          expect(service.uptime).toBeLessThanOrEqual(100);
          expect(service.lastChecked).toBeDefined();
        });

        // 验证告警信息
        result.data.alerts.forEach(alert => {
          expect(alert.id).toBeDefined();
          expect(alert.level).toBeDefined();
          expect(alert.title).toBeDefined();
          expect(alert.message).toBeDefined();
          expect(alert.timestamp).toBeDefined();
        });

        // 验证依赖服务状态
        result.data.dependencies.forEach(dependency => {
          expect(dependency.name).toBeDefined();
          expect(dependency.status).toBeDefined();
          expect(dependency.responseTime).toBeGreaterThan(0);
          expect(dependency.lastChecked).toBeDefined();
        });
      });
    });
  });

  describe('洞察数据', () => {
    describe('getInsights', () => {
      it('应该返回所有洞察数据', async () => {
        const result = await analyticsService.getInsights();

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);

        result.data.forEach(insight => {
          expect(insight.id).toBeDefined();
          expect(insight.title).toBeDefined();
          expect(insight.description).toBeDefined();
          expect(insight.category).toBeDefined();
          expect(insight.type).toBeDefined();
          expect(insight.importance).toBeDefined();
          expect(insight.confidence).toBeGreaterThanOrEqual(0);
          expect(insight.confidence).toBeLessThanOrEqual(1);
          expect(insight.recommendations).toBeDefined();
          expect(Array.isArray(insight.recommendations)).toBe(true);
          expect(insight.createdAt).toBeDefined();
          expect(insight.expiresAt).toBeDefined();
        });
      });

      it('应该支持按类别筛选洞察', async () => {
        const category = 'user';
        const result = await analyticsService.getInsights(category);

        expect(result.success).toBe(true);
        result.data.forEach(insight => {
          expect(insight.category).toBe(category);
        });
      });

      it('应该支持自定义时间范围', async () => {
        const timeRange: DateRange = {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        };

        const result = await analyticsService.getInsights(undefined, timeRange);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('报告管理', () => {
    describe('createReportConfig', () => {
      it('应该成功创建报告配置', async () => {
        const reportConfig = {
          name: '周度用户报告',
          description: '每周用户活动和使用情况报告',
          type: 'scheduled',
          format: 'pdf',
          schedule: {
            frequency: 'weekly',
            dayOfWeek: 1, // 周一
            time: '09:00'
          },
          sections: ['overview', 'users', 'performance'],
          recipients: ['admin@example.com', 'manager@example.com'],
          filters: {
            user_segment: 'all',
            date_range: '7d'
          },
          template: 'standard'
        };

        const result = await analyticsService.createReportConfig(reportConfig);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.id).toBeDefined();
        expect(result.data.name).toBe('周度用户报告');
        expect(result.data.type).toBe('scheduled');
        expect(result.data.format).toBe('pdf');
        expect(result.data.createdAt).toBeDefined();
        expect(result.data.updatedAt).toBeDefined();
      });

      it('应该自动生成报告ID', async () => {
        const reportConfig = {
          name: '测试报告',
          type: 'on_demand',
          format: 'json',
          sections: ['overview'],
          recipients: ['test@example.com']
        };

        const result = await analyticsService.createReportConfig(reportConfig);

        expect(result.success).toBe(true);
        expect(result.data.id).toMatch(/^report_\d+$/);
      });

      it('应该验证报告配置的必填字段', async () => {
        const invalidConfig = {
          name: '',
          type: 'invalid_type',
          format: 'invalid_format',
          sections: [],
          recipients: []
        };

        await expect(analyticsService.createReportConfig(invalidConfig as any))
          .rejects.toThrow(ValidationError);
      });

      it('应该验证收件人列表', async () => {
        const configWithoutRecipients = {
          name: '无收件人报告',
          type: 'on_demand',
          format: 'pdf',
          sections: ['overview'],
          recipients: []
        };

        await expect(analyticsService.createReportConfig(configWithoutRecipients as any))
          .rejects.toThrow(ValidationError);
      });

      it('应该验证报告类型', async () => {
        const invalidTypeConfig = {
          name: '无效类型报告',
          type: 'invalid_type',
          format: 'pdf',
          sections: ['overview'],
          recipients: ['test@example.com']
        };

        await expect(analyticsService.createReportConfig(invalidTypeConfig as any))
          .rejects.toThrow(ValidationError);
      });

      it('应该验证报告格式', async () => {
        const invalidFormatConfig = {
          name: '无效格式报告',
          type: 'on_demand',
          format: 'invalid_format',
          sections: ['overview'],
          recipients: ['test@example.com']
        };

        await expect(analyticsService.createReportConfig(invalidFormatConfig as any))
          .rejects.toThrow(ValidationError);
      });
    });

    describe('generateReport', () => {
      it('应该成功生成报告', async () => {
        // 首先创建报告配置
        const reportConfig = {
          name: '测试报告',
          type: 'on_demand',
          format: 'pdf',
          sections: ['overview', 'users'],
          recipients: ['test@example.com']
        };

        const configResult = await analyticsService.createReportConfig(reportConfig);
        const reportId = configResult.data.id;

        // 生成报告
        const result = await analyticsService.generateReport(reportId);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.reportId).toBe(reportId);
        expect(result.data.name).toBe('测试报告');
        expect(result.data.type).toBe('on_demand');
        expect(result.data.format).toBe('pdf');
        expect(result.data.generatedAt).toBeDefined();
        expect(result.data.sections).toBeDefined();
        expect(Array.isArray(result.data.sections)).toBe(true);
        expect(result.data.metadata).toBeDefined();
      });

      it('应该支持自定义生成选项', async () => {
        // 创建报告配置
        const reportConfig = {
          name: '自定义报告',
          type: 'on_demand',
          format: 'excel',
          sections: ['performance'],
          recipients: ['test@example.com']
        };

        const configResult = await analyticsService.createReportConfig(reportConfig);
        const reportId = configResult.data.id;

        // 自定义生成选项
        const options = {
          timeRange: {
            start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          format: 'json',
          filters: {
            service: 'api',
            metric_type: 'performance'
          }
        };

        const result = await analyticsService.generateReport(reportId, options);

        expect(result.success).toBe(true);
        expect(result.data.format).toBe('json');
        expect(result.data.timeRange).toEqual(options.timeRange);
      });

      it('应该拒绝不存在的报告ID', async () => {
        await expect(analyticsService.generateReport('nonexistent_report'))
          .rejects.toThrow(NotFoundError);
      });
    });
  });

  describe('数据清理', () => {
    describe('cleanupExpiredData', () => {
      it('应该成功清理过期数据', async () => {
        // 该方法主要是内部实现，我们只验证它不会抛出错误
        await expect(analyticsService.cleanupExpiredData()).resolves.not.toThrow();
      });
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的分析工作流', async () => {
      // 1. 跟踪用户事件
      const events: UserBehaviorEvent[] = [
        {
          eventType: 'user_login',
          userId: 'integration_user',
          sessionId: 'session_integration',
          timestamp: new Date(),
          properties: { login_method: 'email' }
        },
        {
          eventType: 'note_created',
          userId: 'integration_user',
          sessionId: 'session_integration',
          timestamp: new Date(),
          properties: { note_type: 'text', word_count: 500 }
        },
        {
          eventType: 'search_performed',
          userId: 'integration_user',
          sessionId: 'session_integration',
          timestamp: new Date(),
          properties: { query: 'machine learning', results_count: 15 }
        }
      ];

      const trackResult = await analyticsService.trackBatchEvents(events);
      expect(trackResult.success).toBe(true);

      // 2. 执行分析查询
      const queryResult = await analyticsService.executeQuery({
        type: 'metric',
        metrics: ['total_users', 'total_notes', 'search_queries'],
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        }
      });
      expect(queryResult.success).toBe(true);

      // 3. 获取仪表板数据
      const dashboardResult = await analyticsService.getDashboardData('overview');
      expect(dashboardResult.success).toBe(true);

      // 4. 获取用户行为分析
      const behaviorResult = await analyticsService.getUserBehaviorAnalytics('integration_user');
      expect(behaviorResult.success).toBe(true);

      // 5. 获取性能指标
      const performanceResult = await analyticsService.getPerformanceMetrics();
      expect(performanceResult.success).toBe(true);

      // 6. 获取系统健康状态
      const healthResult = await analyticsService.getSystemHealthMetrics();
      expect(healthResult.success).toBe(true);

      // 7. 获取洞察数据
      const insightsResult = await analyticsService.getInsights();
      expect(insightsResult.success).toBe(true);

      // 8. 创建并生成报告
      const reportConfig = {
        name: '集成测试报告',
        type: 'on_demand',
        format: 'pdf',
        sections: ['overview', 'users', 'performance'],
        recipients: ['test@example.com']
      };

      const configResult = await analyticsService.createReportConfig(reportConfig);
      expect(configResult.success).toBe(true);

      const reportResult = await analyticsService.generateReport(configResult.data.id);
      expect(reportResult.success).toBe(true);
    });

    it('应该处理高并发请求', async () => {
      const concurrentRequests = 50;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          analyticsService.trackUserEvent({
            eventType: 'concurrent_test',
            userId: `user_${i}`,
            sessionId: `session_${i}`,
            timestamp: new Date(),
            properties: { test_id: i }
          })
        );
      }

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('应该优雅地处理错误情况', async () => {
      // 测试各种错误情况

      // 1. 无效事件数据
      await expect(analyticsService.trackUserEvent({
        eventType: '',
        userId: '',
        sessionId: '',
        timestamp: new Date(),
        properties: {}
      } as any)).rejects.toThrow(ValidationError);

      // 2. 不存在的仪表板
      await expect(analyticsService.getDashboardData('nonexistent'))
        .rejects.toThrow(NotFoundError);

      // 3. 无效查询
      await expect(analyticsService.executeQuery({
        type: 'invalid_type',
        metrics: []
      } as any)).rejects.toThrow(ValidationError);

      // 4. 不存在的报告
      await expect(analyticsService.generateReport('nonexistent_report'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('性能测试', () => {
    it('应该在大批量数据处理时保持性能', async () => {
      const batchSize = 1000;
      const events: UserBehaviorEvent[] = Array(batchSize).fill(null).map((_, i) => ({
        eventType: 'performance_test',
        userId: `perf_user_${i % 100}`, // 100个不同用户
        sessionId: `perf_session_${i % 50}`, // 50个不同会话
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        properties: {
          event_index: i,
          random_data: Math.random().toString(36)
        }
      }));

      const startTime = Date.now();
      const result = await analyticsService.trackBatchEvents(events);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该在复杂查询时保持合理响应时间', async () => {
      const complexQuery = {
        type: 'comparison',
        name: '复杂对比查询',
        metrics: ['total_users', 'active_users', 'total_notes', 'note_views', 'search_queries'],
        timeRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        comparePeriod: {
          start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        },
        filters: {
          user_segment: ['new', 'active', 'returning'],
          content_type: ['note', 'search', 'ai_interaction'],
          device_type: ['desktop', 'mobile', 'tablet']
        },
        limit: 1000
      };

      const startTime = Date.now();
      const result = await analyticsService.executeQuery(complexQuery);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
      expect(result.data.executionTime).toBeLessThan(3000);
    });
  });
});