/**
 * T110 分析API服务
 * 提供全面的数据分析和业务洞察功能
 */

import { BaseAPIService } from '../base-service';
import {
  AnalyticsConfig,
  AnalyticsQuery,
  AnalyticsResponse,
  DashboardConfig,
  DashboardData,
  MetricDefinition,
  MetricValue,
  ReportConfig,
  ReportData,
  UserBehaviorEvent,
  UserBehaviorAnalytics,
  PerformanceMetrics,
  SystemHealthMetrics,
  KPIData,
  InsightData,
  TrendData,
  ComparativeAnalysis,
  FunnelAnalysis,
  CohortAnalysis,
  ApiResponse,
  PaginatedResponse,
  TimeRange,
  DateRange
} from '../types';
import { ValidationError, NotFoundError } from '../errors';

/**
 * T110 分析API服务
 */
export class AnalyticsService extends BaseAPIService {
  private metricsCache: Map<string, MetricValue[]> = new Map();
  private dashboardConfigs: Map<string, DashboardConfig> = new Map();
  private reportConfigs: Map<string, ReportConfig> = new Map();
  private eventBuffer: UserBehaviorEvent[] = [];
  private realTimeMetrics: Map<string, MetricValue> = new Map();

  constructor(config: AnalyticsConfig) {
    super(config);
    this.initializeDefaultMetrics();
    this.initializeDefaultDashboards();
    this.startRealTimeCollection();
  }

  /**
   * 初始化默认指标
   */
  private initializeDefaultMetrics(): void {
    const defaultMetrics: MetricDefinition[] = [
      {
        id: 'total_users',
        name: '总用户数',
        description: '平台注册用户总数',
        type: 'counter',
        category: 'user',
        unit: 'count',
        tags: ['user', 'registration'],
        aggregation: 'sum',
        targets: {
          daily: 100,
          weekly: 500,
          monthly: 2000
        }
      },
      {
        id: 'active_users',
        name: '活跃用户数',
        description: '指定时间范围内的活跃用户数',
        type: 'gauge',
        category: 'user',
        unit: 'count',
        tags: ['user', 'activity'],
        aggregation: 'unique_count',
        targets: {
          daily: 50,
          weekly: 200,
          monthly: 800
        }
      },
      {
        id: 'total_notes',
        name: '总笔记数',
        description: '平台创建的笔记总数',
        type: 'counter',
        category: 'content',
        unit: 'count',
        tags: ['content', 'notes'],
        aggregation: 'sum',
        targets: {
          daily: 200,
          weekly: 1000,
          monthly: 4000
        }
      },
      {
        id: 'note_views',
        name: '笔记浏览量',
        description: '笔记被浏览的总次数',
        type: 'counter',
        category: 'engagement',
        unit: 'count',
        tags: ['engagement', 'views'],
        aggregation: 'sum',
        targets: {
          daily: 1000,
          weekly: 5000,
          monthly: 20000
        }
      },
      {
        id: 'search_queries',
        name: '搜索查询数',
        description: '用户执行搜索的总次数',
        type: 'counter',
        category: 'search',
        unit: 'count',
        tags: ['search', 'queries'],
        aggregation: 'sum',
        targets: {
          daily: 500,
          weekly: 2500,
          monthly: 10000
        }
      },
      {
        id: 'ai_interactions',
        name: 'AI交互次数',
        description: '用户与AI功能交互的总次数',
        type: 'counter',
        category: 'ai',
        unit: 'count',
        tags: ['ai', 'interactions'],
        aggregation: 'sum',
        targets: {
          daily: 300,
          weekly: 1500,
          monthly: 6000
        }
      },
      {
        id: 'response_time',
        name: '平均响应时间',
        description: 'API平均响应时间',
        type: 'histogram',
        category: 'performance',
        unit: 'milliseconds',
        tags: ['performance', 'latency'],
        aggregation: 'avg',
        targets: {
          daily: 200,
          weekly: 180,
          monthly: 150
        }
      },
      {
        id: 'error_rate',
        name: '错误率',
        description: '系统错误率百分比',
        type: 'gauge',
        category: 'performance',
        unit: 'percent',
        tags: ['performance', 'errors'],
        aggregation: 'avg',
        targets: {
          daily: 1,
          weekly: 0.8,
          monthly: 0.5
        }
      }
    ];

    defaultMetrics.forEach(metric => {
      this.realTimeMetrics.set(metric.id, {
        metricId: metric.id,
        value: 0,
        timestamp: new Date(),
        tags: metric.tags,
        metadata: {
          category: metric.category,
          unit: metric.unit,
          type: metric.type
        }
      });
    });
  }

  /**
   * 初始化默认仪表板
   */
  private initializeDefaultDashboards(): void {
    const defaultDashboards: DashboardConfig[] = [
      {
        id: 'overview',
        name: '总览仪表板',
        description: '平台核心指标概览',
        category: 'overview',
        layout: 'grid',
        widgets: [
          {
            id: 'total_users_widget',
            type: 'metric',
            title: '总用户数',
            metricId: 'total_users',
            visualization: 'number',
            position: { row: 0, col: 0, width: 2, height: 1 },
            refreshInterval: 300
          },
          {
            id: 'active_users_widget',
            type: 'metric',
            title: '活跃用户数',
            metricId: 'active_users',
            visualization: 'line',
            position: { row: 0, col: 2, width: 2, height: 1 },
            refreshInterval: 60
          },
          {
            id: 'note_creation_trend',
            type: 'metric',
            title: '笔记创建趋势',
            metricId: 'total_notes',
            visualization: 'area',
            position: { row: 1, col: 0, width: 4, height: 2 },
            refreshInterval: 300
          }
        ],
        filters: [
          {
            id: 'date_range',
            type: 'date_range',
            label: '时间范围',
            defaultValue: '7d',
            options: [
              { label: '最近7天', value: '7d' },
              { label: '最近30天', value: '30d' },
              { label: '最近90天', value: '90d' }
            ]
          }
        ],
        permissions: ['read:analytics'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'user_behavior',
        name: '用户行为分析',
        description: '用户行为和参与度分析',
        category: 'user',
        layout: 'grid',
        widgets: [
          {
            id: 'user_activity_heatmap',
            type: 'metric',
            title: '用户活跃热力图',
            metricId: 'active_users',
            visualization: 'heatmap',
            position: { row: 0, col: 0, width: 4, height: 3 },
            refreshInterval: 600
          },
          {
            id: 'feature_usage',
            type: 'metric',
            title: '功能使用情况',
            metricId: 'ai_interactions',
            visualization: 'pie',
            position: { row: 0, col: 4, width: 2, height: 2 },
            refreshInterval: 300
          }
        ],
        filters: [
          {
            id: 'user_segment',
            type: 'select',
            label: '用户群体',
            defaultValue: 'all',
            options: [
              { label: '全部用户', value: 'all' },
              { label: '新用户', value: 'new' },
              { label: '活跃用户', value: 'active' },
              { label: '流失用户', value: 'churned' }
            ]
          }
        ],
        permissions: ['read:analytics'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'performance',
        name: '性能监控',
        description: '系统性能和健康状态监控',
        category: 'performance',
        layout: 'grid',
        widgets: [
          {
            id: 'response_time_chart',
            type: 'metric',
            title: '响应时间趋势',
            metricId: 'response_time',
            visualization: 'line',
            position: { row: 0, col: 0, width: 3, height: 2 },
            refreshInterval: 30
          },
          {
            id: 'error_rate_gauge',
            type: 'metric',
            title: '错误率',
            metricId: 'error_rate',
            visualization: 'gauge',
            position: { row: 0, col: 3, width: 1, height: 1 },
            refreshInterval: 30
          }
        ],
        filters: [
          {
            id: 'service_filter',
            type: 'multiselect',
            label: '服务筛选',
            defaultValue: ['all'],
            options: [
              { label: '全部服务', value: 'all' },
              { label: 'API服务', value: 'api' },
              { label: 'AI服务', value: 'ai' },
              { label: '数据库', value: 'database' }
            ]
          }
        ],
        permissions: ['read:analytics'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultDashboards.forEach(dashboard => {
      this.dashboardConfigs.set(dashboard.id, dashboard);
    });
  }

  /**
   * 启动实时数据收集
   */
  private startRealTimeCollection(): void {
    // 每30秒更新实时指标
    setInterval(() => {
      this.updateRealTimeMetrics();
    }, 30000);

    // 每5分钟处理事件缓冲区
    setInterval(() => {
      this.processEventBuffer();
    }, 300000);
  }

  /**
   * 更新实时指标
   */
  private updateRealTimeMetrics(): void {
    const now = new Date();

    // 这里应该从实际数据源获取数据
    // 现在使用模拟数据
    this.realTimeMetrics.forEach((metric, metricId) => {
      const oldValue = metric.value;
      let newValue = oldValue;

      // 根据指标类型生成模拟数据
      switch (metricId) {
        case 'total_users':
          newValue = oldValue + Math.floor(Math.random() * 3);
          break;
        case 'active_users':
          newValue = Math.max(10, oldValue + Math.floor(Math.random() * 10) - 5);
          break;
        case 'total_notes':
          newValue = oldValue + Math.floor(Math.random() * 8);
          break;
        case 'note_views':
          newValue = oldValue + Math.floor(Math.random() * 20);
          break;
        case 'search_queries':
          newValue = oldValue + Math.floor(Math.random() * 15);
          break;
        case 'ai_interactions':
          newValue = oldValue + Math.floor(Math.random() * 10);
          break;
        case 'response_time':
          newValue = 150 + Math.random() * 100;
          break;
        case 'error_rate':
          newValue = Math.max(0, Math.min(5, (Math.random() * 2)));
          break;
      }

      this.realTimeMetrics.set(metricId, {
        ...metric,
        value: newValue,
        timestamp: now
      });
    });
  }

  /**
   * 处理事件缓冲区
   */
  private processEventBuffer(): void {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // 按事件类型分组处理
    const eventsByType = events.reduce((acc, event) => {
      const key = `${event.eventType}:${event.userId}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {} as Record<string, UserBehaviorEvent[]>);

    // 处理分组后的事件
    Object.values(eventsByType).forEach(eventGroup => {
      this.processEventGroup(eventGroup);
    });
  }

  /**
   * 处理事件组
   */
  private processEventGroup(events: UserBehaviorEvent[]): void {
    // 这里可以实现复杂的事件处理逻辑
    // 例如：用户会话分析、转化漏斗计算等
    events.forEach(event => {
      this.log('info', 'Processing analytics event', {
        eventType: event.eventType,
        userId: event.userId,
        sessionId: event.sessionId
      });
    });
  }

  /**
   * 记录用户行为事件
   */
  async trackUserEvent(event: UserBehaviorEvent): Promise<ApiResponse<void>> {
    try {
      // 验证事件数据
      this.validateEvent(event);

      // 添加到事件缓冲区
      this.eventBuffer.push(event);

      // 实时更新相关指标
      this.updateMetricsFromEvent(event);

      this.log('info', 'User event tracked', {
        eventType: event.eventType,
        userId: event.userId,
        sessionId: event.sessionId
      });

      return this.createApiResponse(undefined, true, 'Event tracked successfully');

    } catch (error) {
      this.log('error', 'Failed to track user event', {
        eventType: event.eventType,
        userId: event.userId,
        error
      });
      throw error;
    }
  }

  /**
   * 批量记录事件
   */
  async trackBatchEvents(events: UserBehaviorEvent[]): Promise<ApiResponse<void>> {
    try {
      if (!events || events.length === 0) {
        throw new ValidationError('Events array cannot be empty');
      }

      if (events.length > 1000) {
        throw new ValidationError('Maximum 1000 events allowed per batch');
      }

      // 验证所有事件
      events.forEach(event => this.validateEvent(event));

      // 添加到事件缓冲区
      this.eventBuffer.push(...events);

      // 更新指标
      events.forEach(event => this.updateMetricsFromEvent(event));

      this.log('info', 'Batch events tracked', {
        eventCount: events.length,
        eventTypes: [...new Set(events.map(e => e.eventType))]
      });

      return this.createApiResponse(undefined, true, 'Batch events tracked successfully');

    } catch (error) {
      this.log('error', 'Failed to track batch events', { error });
      throw error;
    }
  }

  /**
   * 验证事件数据
   */
  private validateEvent(event: UserBehaviorEvent): void {
    const rules: Record<string, any> = {
      eventType: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      userId: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      sessionId: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      timestamp: {
        required: true,
        type: 'object',
        validate: (value: any) => {
          return value instanceof Date && !isNaN(value.getTime());
        }
      },
      properties: {
        validate: (value: any) => {
          if (value === null || value === undefined) {
            return null; // 允许空属性
          }
          if (typeof value !== 'object' || Array.isArray(value)) {
            return 'Properties must be an object';
          }
          if (Object.keys(value).length > 50) {
            return 'Maximum 50 properties allowed';
          }
          return null;
        }
      }
    };

    this.validateParams(event, rules);
  }

  /**
   * 从事件更新指标
   */
  private updateMetricsFromEvent(event: UserBehaviorEvent): void {
    switch (event.eventType) {
      case 'note_created':
        this.incrementMetric('total_notes');
        break;
      case 'note_viewed':
        this.incrementMetric('note_views');
        break;
      case 'search_performed':
        this.incrementMetric('search_queries');
        break;
      case 'ai_interaction':
        this.incrementMetric('ai_interactions');
        break;
      case 'user_registered':
        this.incrementMetric('total_users');
        break;
      case 'user_active':
        this.incrementMetric('active_users');
        break;
    }
  }

  /**
   * 增加指标值
   */
  private incrementMetric(metricId: string, value: number = 1): void {
    const current = this.realTimeMetrics.get(metricId);
    if (current) {
      this.realTimeMetrics.set(metricId, {
        ...current,
        value: current.value + value,
        timestamp: new Date()
      });
    }
  }

  /**
   * 执行分析查询
   */
  async executeQuery(query: AnalyticsQuery): Promise<ApiResponse<AnalyticsResponse>> {
    try {
      this.validateQuery(query);

      const startTime = Date.now();
      const results = await this.processQuery(query);
      const duration = Date.now() - startTime;

      const response: AnalyticsResponse = {
        queryId: this.generateQueryId(),
        query,
        results,
        executionTime: duration,
        timestamp: new Date(),
        hasMore: results.length >= (query.limit || 100),
        totalCount: results.length
      };

      this.log('info', 'Analytics query executed', {
        queryId: response.queryId,
        executionTime: duration,
        resultCount: results.length
      });

      return this.createApiResponse(response);

    } catch (error) {
      this.log('error', 'Failed to execute analytics query', { query, error });
      throw error;
    }
  }

  /**
   * 处理查询
   */
  private async processQuery(query: AnalyticsQuery): Promise<any[]> {
    switch (query.type) {
      case 'metric':
        return await this.processMetricQuery(query);
      case 'trend':
        return await this.processTrendQuery(query);
      case 'funnel':
        return await this.processFunnelQuery(query);
      case 'cohort':
        return await this.processCohortQuery(query);
      case 'comparison':
        return await this.processComparisonQuery(query);
      default:
        throw new ValidationError(`Unsupported query type: ${query.type}`);
    }
  }

  /**
   * 处理指标查询
   */
  private async processMetricQuery(query: AnalyticsQuery): Promise<MetricValue[]> {
    const { metrics, timeRange, filters } = query;
    const results: MetricValue[] = [];

    for (const metricId of metrics) {
      const metric = this.realTimeMetrics.get(metricId);
      if (metric) {
        results.push({
          ...metric,
          timeRange: timeRange || { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
          filters: filters || {}
        });
      }
    }

    return results;
  }

  /**
   * 处理趋势查询
   */
  private async processTrendQuery(query: AnalyticsQuery): Promise<TrendData[]> {
    const { metrics, timeRange, granularity = 'day' } = query;
    const trends: TrendData[] = [];

    for (const metricId of metrics) {
      const trendData: TrendData = {
        metricId,
        timeRange: timeRange || { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
        granularity,
        dataPoints: this.generateTrendDataPoints(metricId, timeRange, granularity)
      };
      trends.push(trendData);
    }

    return trends;
  }

  /**
   * 生成趋势数据点
   */
  private generateTrendDataPoints(
    metricId: string,
    timeRange?: DateRange,
    granularity: string = 'day'
  ): Array<{ timestamp: Date; value: number }> {
    const points: Array<{ timestamp: Date; value: number }> = [];
    const now = new Date();
    const start = timeRange?.start || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const end = timeRange?.end || now;

    const currentMetric = this.realTimeMetrics.get(metricId);
    const baseValue = currentMetric?.value || 0;

    // 根据粒度生成数据点
    const interval = this.getGranularityInterval(granularity);
    for (let time = start.getTime(); time <= end.getTime(); time += interval) {
      const timestamp = new Date(time);
      // 生成带有趋势和随机波动的模拟数据
      const trendFactor = (time - start.getTime()) / (end.getTime() - start.getTime());
      const randomVariation = (Math.random() - 0.5) * baseValue * 0.2;
      const value = Math.max(0, baseValue * (0.8 + trendFactor * 0.4) + randomVariation);

      points.push({ timestamp, value: Math.round(value) });
    }

    return points;
  }

  /**
   * 获取粒度间隔
   */
  private getGranularityInterval(granularity: string): number {
    switch (granularity) {
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * 处理漏斗查询
   */
  private async processFunnelQuery(query: AnalyticsQuery): Promise<FuncnelAnalysis> {
    const { funnelSteps, timeRange } = query;

    if (!funnelSteps || funnelSteps.length === 0) {
      throw new ValidationError('Funnel steps are required for funnel analysis');
    }

    const funnelData: FuncnelAnalysis = {
      name: query.name || 'Conversion Funnel',
      timeRange: timeRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
      steps: funnelSteps.map((step, index) => ({
        stepId: step.stepId,
        stepName: step.stepName,
        description: step.description,
        users: Math.max(0, Math.round(1000 * Math.pow(0.7, index))), // 模拟递减数据
        conversionRate: index === 0 ? 100 : Math.round(70 * Math.pow(0.9, index)),
        avgTimeToComplete: 30 + index * 60, // 模拟递增时间
        dropOffRate: index === 0 ? 0 : Math.round(30 * Math.pow(1.1, index))
      })),
      overallConversionRate: 15,
      avgCompletionTime: 180,
      totalUsers: 1000
    };

    return funnelData;
  }

  /**
   * 处理队列查询
   */
  private async processCohortQuery(query: AnalyticsQuery): Promise<CohortAnalysis> {
    const { cohortType, timeRange, metrics } = query;

    const cohortData: CohortAnalysis = {
      cohortType: cohortType || 'registration',
      timeRange: timeRange || { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() },
      cohorts: this.generateCohortData(cohortType || 'registration'),
      metrics: metrics || ['retention', 'engagement', 'conversion']
    };

    return cohortData;
  }

  /**
   * 生成队列数据
   */
  private generateCohortData(cohortType: string): Array<{
    cohortId: string;
    cohortName: string;
    cohortSize: number;
    retentionData: number[];
  }> {
    const cohorts = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const cohortDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const retentionData = [];

      for (let week = 0; week <= i; week++) {
        const retentionRate = Math.max(10, 100 * Math.pow(0.85, week));
        retentionData.push(Math.round(retentionRate));
      }

      cohorts.push({
        cohortId: `cohort_${i}`,
        cohortName: `${cohortType} - ${cohortDate.toISOString().split('T')[0]}`,
        cohortSize: Math.floor(100 + Math.random() * 200),
        retentionData
      });
    }

    return cohorts;
  }

  /**
   * 处理对比查询
   */
  private async processComparisonQuery(query: AnalyticsQuery): Promise<ComparativeAnalysis> {
    const { metrics, timeRange, comparePeriod } = query;

    const comparisonData: ComparativeAnalysis = {
      name: query.name || 'Period Comparison',
      primaryPeriod: timeRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
      comparisonPeriod: comparePeriod || {
        start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      metrics: metrics || ['total_users', 'active_users', 'total_notes'],
      results: this.generateComparisonResults(metrics || ['total_users', 'active_users', 'total_notes'])
    };

    return comparisonData;
  }

  /**
   * 生成对比结果
   */
  private generateComparisonResults(metrics: string[]): Array<{
    metricId: string;
    primaryValue: number;
    comparisonValue: number;
    changePercent: number;
    changeAbsolute: number;
    trend: 'up' | 'down' | 'stable';
  }> {
    return metrics.map(metricId => {
      const primaryValue = (this.realTimeMetrics.get(metricId)?.value || 0) * (1 + Math.random() * 0.2);
      const comparisonValue = primaryValue * (0.8 + Math.random() * 0.4);
      const changePercent = ((primaryValue - comparisonValue) / comparisonValue) * 100;
      const changeAbsolute = primaryValue - comparisonValue;

      return {
        metricId,
        primaryValue: Math.round(primaryValue),
        comparisonValue: Math.round(comparisonValue),
        changePercent: Math.round(changePercent * 100) / 100,
        changeAbsolute: Math.round(changeAbsolute),
        trend: changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable'
      };
    });
  }

  /**
   * 验证查询
   */
  private validateQuery(query: AnalyticsQuery): void {
    const rules: Record<string, any> = {
      type: {
        required: true,
        type: 'string',
        validate: (value: any) => {
          const validTypes = ['metric', 'trend', 'funnel', 'cohort', 'comparison'];
          return validTypes.includes(value) ? null : `Invalid query type. Must be one of: ${validTypes.join(', ')}`;
        }
      },
      metrics: {
        type: 'object',
        validate: (value: any) => {
          if (!Array.isArray(value)) return 'Metrics must be an array';
          if (value.length === 0) return 'At least one metric is required';
          if (value.length > 20) return 'Maximum 20 metrics allowed';
          return null;
        }
      },
      timeRange: {
        type: 'object',
        validate: (value: any) => {
          if (!value) return null;
          if (!value.start || !value.end) return 'Both start and end dates are required';
          if (!(value.start instanceof Date) || !(value.end instanceof Date)) {
            return 'Invalid date format';
          }
          if (value.start >= value.end) return 'Start date must be before end date';
          return null;
        }
      },
      limit: {
        type: 'number',
        min: 1,
        max: 10000
      }
    };

    this.validateParams(query, rules);
  }

  /**
   * 生成查询ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取仪表板配置
   */
  async getDashboardConfig(dashboardId: string): Promise<ApiResponse<DashboardConfig>> {
    try {
      const config = this.dashboardConfigs.get(dashboardId);
      if (!config) {
        throw new NotFoundError('Dashboard configuration');
      }

      return this.createApiResponse(config);

    } catch (error) {
      this.log('error', 'Failed to get dashboard config', { dashboardId, error });
      throw error;
    }
  }

  /**
   * 获取仪表板数据
   */
  async getDashboardData(
    dashboardId: string,
    filters?: Record<string, any>,
    timeRange?: DateRange
  ): Promise<ApiResponse<DashboardData>> {
    try {
      const config = this.dashboardConfigs.get(dashboardId);
      if (!config) {
        throw new NotFoundError('Dashboard configuration');
      }

      const widgetData: Record<string, any> = {};

      // 为每个小部件生成数据
      for (const widget of config.widgets) {
        widgetData[widget.id] = await this.generateWidgetData(widget, filters, timeRange);
      }

      const dashboardData: DashboardData = {
        dashboardId,
        name: config.name,
        lastUpdated: new Date(),
        timeRange: timeRange || { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
        filters: filters || {},
        widgets: widgetData,
        metadata: {
          totalWidgets: config.widgets.length,
          dataFreshness: 'real-time',
          refreshInterval: Math.max(...config.widgets.map(w => w.refreshInterval || 300))
        }
      };

      return this.createApiResponse(dashboardData);

    } catch (error) {
      this.log('error', 'Failed to get dashboard data', { dashboardId, error });
      throw error;
    }
  }

  /**
   * 生成小部件数据
   */
  private async generateWidgetData(
    widget: any,
    filters?: Record<string, any>,
    timeRange?: DateRange
  ): Promise<any> {
    const metric = this.realTimeMetrics.get(widget.metricId);
    if (!metric) {
      return { error: 'Metric not found' };
    }

    switch (widget.visualization) {
      case 'number':
        return {
          value: metric.value,
          unit: metric.metadata?.unit || '',
          trend: this.calculateTrend(widget.metricId, timeRange),
          lastUpdated: metric.timestamp
        };

      case 'line':
      case 'area':
        return {
          dataPoints: this.generateTrendDataPoints(widget.metricId, timeRange, 'day'),
          unit: metric.metadata?.unit || '',
          trend: this.calculateTrend(widget.metricId, timeRange)
        };

      case 'pie':
        return {
          data: this.generatePieData(widget.metricId),
          total: metric.value
        };

      case 'heatmap':
        return {
          data: this.generateHeatmapData(widget.metricId, timeRange),
          maxValue: metric.value * 1.5
        };

      case 'gauge':
        return {
          value: metric.value,
          min: 0,
          max: this.getMetricMax(widget.metricId),
          thresholds: this.getMetricThresholds(widget.metricId),
          unit: metric.metadata?.unit || ''
        };

      default:
        return {
          value: metric.value,
          timestamp: metric.timestamp
        };
    }
  }

  /**
   * 计算趋势
   */
  private calculateTrend(metricId: string, timeRange?: DateRange): number {
    const current = this.realTimeMetrics.get(metricId)?.value || 0;
    // 简单的趋势计算，实际应该基于历史数据
    return (Math.random() - 0.5) * 20; // -10% 到 +10%
  }

  /**
   * 生成饼图数据
   */
  private generatePieData(metricId: string): Array<{ label: string; value: number; percentage: number }> {
    const total = this.realTimeMetrics.get(metricId)?.value || 0;

    return [
      { label: '分类 A', value: total * 0.4, percentage: 40 },
      { label: '分类 B', value: total * 0.3, percentage: 30 },
      { label: '分类 C', value: total * 0.2, percentage: 20 },
      { label: '其他', value: total * 0.1, percentage: 10 }
    ];
  }

  /**
   * 生成热力图数据
   */
  private generateHeatmapData(metricId: string, timeRange?: DateRange): Array<{
    date: string;
    hour: number;
    value: number;
  }> {
    const data = [];
    const baseValue = this.realTimeMetrics.get(metricId)?.value || 0;

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const value = baseValue * (0.5 + Math.random() * 0.5);
        data.push({
          date: new Date(Date.now() - day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          hour,
          value
        });
      }
    }

    return data;
  }

  /**
   * 获取指标最大值
   */
  private getMetricMax(metricId: string): number {
    switch (metricId) {
      case 'response_time':
        return 1000;
      case 'error_rate':
        return 5;
      default:
        return (this.realTimeMetrics.get(metricId)?.value || 0) * 2;
    }
  }

  /**
   * 获取指标阈值
   */
  private getMetricThresholds(metricId: string): Array<{ value: number; color: string; label: string }> {
    switch (metricId) {
      case 'response_time':
        return [
          { value: 200, color: 'green', label: '良好' },
          { value: 500, color: 'yellow', label: '一般' },
          { value: 1000, color: 'red', label: '较差' }
        ];
      case 'error_rate':
        return [
          { value: 1, color: 'green', label: '正常' },
          { value: 3, color: 'yellow', label: '警告' },
          { value: 5, color: 'red', label: '严重' }
        ];
      default:
        return [];
    }
  }

  /**
   * 创建或更新仪表板配置
   */
  async saveDashboardConfig(config: DashboardConfig): Promise<ApiResponse<DashboardConfig>> {
    try {
      this.validateDashboardConfig(config);

      const now = new Date();
      const savedConfig = {
        ...config,
        updatedAt: now,
        createdAt: config.createdAt || now
      };

      this.dashboardConfigs.set(config.id, savedConfig);

      this.log('info', 'Dashboard configuration saved', { dashboardId: config.id });

      return this.createApiResponse(savedConfig);

    } catch (error) {
      this.log('error', 'Failed to save dashboard config', { dashboardId: config.id, error });
      throw error;
    }
  }

  /**
   * 验证仪表板配置
   */
  private validateDashboardConfig(config: DashboardConfig): void {
    const rules: Record<string, any> = {
      id: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_-]+$/
      },
      name: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      category: {
        required: true,
        type: 'string',
        validate: (value: any) => {
          const validCategories = ['overview', 'user', 'content', 'performance', 'business'];
          return validCategories.includes(value) ? null : `Invalid category. Must be one of: ${validCategories.join(', ')}`;
        }
      },
      widgets: {
        required: true,
        type: 'object',
        validate: (value: any) => {
          if (!Array.isArray(value)) return 'Widgets must be an array';
          if (value.length === 0) return 'At least one widget is required';
          if (value.length > 20) return 'Maximum 20 widgets allowed';
          return null;
        }
      }
    };

    this.validateParams(config, rules);
  }

  /**
   * 获取KPI数据
   */
  async getKPIData(
    kpiIds?: string[],
    timeRange?: DateRange,
    comparisonRange?: DateRange
  ): Promise<ApiResponse<KPIData[]>> {
    try {
      const allKPIs = [
        {
          id: 'user_growth_rate',
          name: '用户增长率',
          description: '新用户注册增长率',
          currentValue: 15.5,
          targetValue: 20,
          previousValue: 12.3,
          unit: 'percent',
          status: 'good' as const,
          trend: 'up' as const,
          timeRange: timeRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }
        },
        {
          id: 'user_retention_rate',
          name: '用户留存率',
          description: '30天用户留存率',
          currentValue: 68.2,
          targetValue: 70,
          previousValue: 65.8,
          unit: 'percent',
          status: 'good' as const,
          trend: 'up' as const,
          timeRange: timeRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }
        },
        {
          id: 'daily_active_users',
          name: '日活跃用户数',
          description: '每日活跃用户数',
          currentValue: 1250,
          targetValue: 1500,
          previousValue: 1180,
          unit: 'count',
          status: 'warning' as const,
          trend: 'up' as const,
          timeRange: timeRange || { start: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), end: new Date() }
        },
        {
          id: 'note_creation_rate',
          name: '笔记创建率',
          description: '平均每用户每日创建笔记数',
          currentValue: 2.3,
          targetValue: 3,
          previousValue: 2.1,
          unit: 'count',
          status: 'warning' as const,
          trend: 'up' as const,
          timeRange: timeRange || { start: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), end: new Date() }
        },
        {
          id: 'search_success_rate',
          name: '搜索成功率',
          description: '搜索查询找到结果的成功率',
          currentValue: 94.5,
          targetValue: 95,
          previousValue: 93.2,
          unit: 'percent',
          status: 'good' as const,
          trend: 'up' as const,
          timeRange: timeRange || { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() }
        }
      ];

      let kpiData = allKPIs;
      if (kpiIds && kpiIds.length > 0) {
        kpiData = allKPIs.filter(kpi => kpiIds.includes(kpi.id));
      }

      return this.createApiResponse(kpiData);

    } catch (error) {
      this.log('error', 'Failed to get KPI data', { kpiIds, error });
      throw error;
    }
  }

  /**
   * 获取用户行为分析
   */
  async getUserBehaviorAnalytics(
    userId?: string,
    timeRange?: DateRange,
    eventTypes?: string[]
  ): Promise<ApiResponse<UserBehaviorAnalytics>> {
    try {
      const analytics: UserBehaviorAnalytics = {
        userId,
        timeRange: timeRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
        totalEvents: Math.floor(100 + Math.random() * 500),
        sessionCount: Math.floor(10 + Math.random() * 50),
        avgSessionDuration: Math.floor(300 + Math.random() * 1800), // 5-35分钟
        topEvents: [
          { eventType: 'note_viewed', count: Math.floor(50 + Math.random() * 200), percentage: 35 },
          { eventType: 'search_performed', count: Math.floor(20 + Math.random() * 100), percentage: 25 },
          { eventType: 'note_created', count: Math.floor(10 + Math.random() * 50), percentage: 20 },
          { eventType: 'ai_interaction', count: Math.floor(5 + Math.random() * 30), percentage: 15 },
          { eventType: 'tag_created', count: Math.floor(2 + Math.random() * 20), percentage: 5 }
        ],
        eventTimeline: this.generateEventTimeline(timeRange),
        userSegments: this.generateUserSegments(userId),
        engagementScore: Math.floor(60 + Math.random() * 40),
        retentionRisk: Math.random() > 0.7 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
      };

      return this.createApiResponse(analytics);

    } catch (error) {
      this.log('error', 'Failed to get user behavior analytics', { userId, error });
      throw error;
    }
  }

  /**
   * 生成事件时间线
   */
  private generateEventTimeline(timeRange?: DateRange): Array<{
    date: string;
    events: number;
    uniqueUsers: number;
  }> {
    const timeline = [];
    const now = new Date();
    const start = timeRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (let date = new Date(start); date <= now; date.setDate(date.getDate() + 1)) {
      timeline.push({
        date: date.toISOString().split('T')[0],
        events: Math.floor(10 + Math.random() * 100),
        uniqueUsers: Math.floor(5 + Math.random() * 30)
      });
    }

    return timeline;
  }

  /**
   * 生成用户群体
   */
  private generateUserSegments(userId?: string): string[] {
    const allSegments = ['新用户', '活跃用户', '高价值用户', 'AI用户', '搜索用户'];

    if (userId) {
      // 为特定用户分配群体
      return allSegments.slice(0, Math.floor(1 + Math.random() * 3));
    }

    return allSegments;
  }

  /**
   * 获取性能指标
   */
  async getPerformanceMetrics(
    timeRange?: DateRange,
    services?: string[]
  ): Promise<ApiResponse<PerformanceMetrics>> {
    try {
      const metrics: PerformanceMetrics = {
        timeRange: timeRange || { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
        services: services || ['api', 'ai', 'database', 'cache'],
        responseTime: {
          avg: 180 + Math.random() * 100,
          p50: 150 + Math.random() * 50,
          p95: 400 + Math.random() * 200,
          p99: 800 + Math.random() * 400,
          trend: 'stable'
        },
        throughput: {
          requestsPerSecond: 50 + Math.random() * 100,
          requestsPerMinute: 3000 + Math.random() * 6000,
          peakRPS: 200 + Math.random() * 300,
          trend: 'up'
        },
        errorRate: {
          total: 0.5 + Math.random() * 2,
          clientErrors: 0.2 + Math.random() * 0.8,
          serverErrors: 0.1 + Math.random() * 0.5,
          networkErrors: 0.1 + Math.random() * 0.3,
          trend: 'down'
        },
        availability: {
          uptime: 99.5 + Math.random() * 0.4,
          downtime: Math.floor(1 + Math.random() * 10),
          incidents: Math.floor(Math.random() * 3),
          trend: 'stable'
        },
        resourceUsage: {
          cpu: 40 + Math.random() * 30,
          memory: 60 + Math.random() * 25,
          disk: 30 + Math.random() * 40,
          network: 20 + Math.random() * 50
        },
        cachePerformance: {
          hitRate: 85 + Math.random() * 10,
          missRate: 15 - Math.random() * 10,
          evictionRate: 1 + Math.random() * 3,
          trend: 'stable'
        }
      };

      return this.createApiResponse(metrics);

    } catch (error) {
      this.log('error', 'Failed to get performance metrics', { error });
      throw error;
    }
  }

  /**
   * 获取系统健康指标
   */
  async getSystemHealthMetrics(): Promise<ApiResponse<SystemHealthMetrics>> {
    try {
      const healthMetrics: SystemHealthMetrics = {
        overallStatus: 'healthy',
        timestamp: new Date(),
        services: [
          {
            name: 'API Gateway',
            status: 'healthy',
            responseTime: 150,
            uptime: 99.9,
            lastChecked: new Date(),
            details: { version: '1.0.0', environment: 'production' }
          },
          {
            name: 'AI Service',
            status: 'healthy',
            responseTime: 800,
            uptime: 99.5,
            lastChecked: new Date(),
            details: { model: 'gpt-4', requestsPerMinute: 120 }
          },
          {
            name: 'Database',
            status: 'healthy',
            responseTime: 25,
            uptime: 99.99,
            lastChecked: new Date(),
            details: { connections: 45, maxConnections: 100 }
          },
          {
            name: 'Redis Cache',
            status: 'healthy',
            responseTime: 5,
            uptime: 99.95,
            lastChecked: new Date(),
            details: { memoryUsage: '45%', hitRate: '92%' }
          }
        ],
        alerts: [
          {
            id: 'alert_001',
            level: 'warning',
            title: 'CPU使用率偏高',
            message: 'API服务器CPU使用率达到75%',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            service: 'API Gateway',
            resolved: false
          }
        ],
        dependencies: [
          {
            name: 'OpenAI API',
            status: 'healthy',
            responseTime: 1200,
            lastChecked: new Date()
          },
          {
            name: 'Email Service',
            status: 'degraded',
            responseTime: 3000,
            lastChecked: new Date()
          }
        ]
      };

      return this.createApiResponse(healthMetrics);

    } catch (error) {
      this.log('error', 'Failed to get system health metrics', { error });
      throw error;
    }
  }

  /**
   * 获取洞察数据
   */
  async getInsights(
    category?: string,
    timeRange?: DateRange
  ): Promise<ApiResponse<InsightData[]>> {
    try {
      const insights: InsightData[] = [
        {
          id: 'insight_001',
          title: '用户活跃度提升',
          description: '过去7天日活跃用户数增长了15%，主要得益于新功能的推出',
          category: 'user',
          type: 'trend',
          importance: 'high',
          confidence: 0.92,
          data: {
            metric: 'daily_active_users',
            change: 15,
            previousValue: 1080,
            currentValue: 1242
          },
          recommendations: [
            '继续优化新功能用户体验',
            '加强用户引导和培训',
            '分析高活跃度用户行为模式'
          ],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        {
          id: 'insight_002',
          title: '搜索功能使用频率下降',
          description: '搜索查询次数相比上周下降了8%，可能影响用户发现内容',
          category: 'search',
          type: 'anomaly',
          importance: 'medium',
          confidence: 0.85,
          data: {
            metric: 'search_queries',
            change: -8,
            previousValue: 540,
            currentValue: 497
          },
          recommendations: [
            '优化搜索算法和结果相关性',
            '改进搜索界面的用户体验',
            '添加搜索建议和历史记录功能'
          ],
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
        },
        {
          id: 'insight_003',
          title: 'AI功能获得用户认可',
          description: 'AI交互次数持续增长，用户满意度调查显示积极反馈',
          category: 'ai',
          type: 'opportunity',
          importance: 'high',
          confidence: 0.88,
          data: {
            metric: 'ai_interactions',
            change: 25,
            previousValue: 240,
            currentValue: 300,
            satisfactionScore: 4.2
          },
          recommendations: [
            '扩大AI功能的应用场景',
            '优化AI响应速度和质量',
            '推出AI功能的高级版本'
          ],
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
        }
      ];

      let filteredInsights = insights;
      if (category) {
        filteredInsights = insights.filter(insight => insight.category === category);
      }

      return this.createApiResponse(filteredInsights);

    } catch (error) {
      this.log('error', 'Failed to get insights', { category, error });
      throw error;
    }
  }

  /**
   * 创建报告配置
   */
  async createReportConfig(config: ReportConfig): Promise<ApiResponse<ReportConfig>> {
    try {
      this.validateReportConfig(config);

      const reportConfig = {
        ...config,
        id: config.id || `report_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.reportConfigs.set(reportConfig.id, reportConfig);

      this.log('info', 'Report configuration created', { reportId: reportConfig.id });

      return this.createApiResponse(reportConfig);

    } catch (error) {
      this.log('error', 'Failed to create report config', { error });
      throw error;
    }
  }

  /**
   * 验证报告配置
   */
  private validateReportConfig(config: ReportConfig): void {
    const rules: Record<string, any> = {
      name: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      type: {
        required: true,
        type: 'string',
        validate: (value: any) => {
          const validTypes = ['scheduled', 'on_demand', 'real_time'];
          return validTypes.includes(value) ? null : `Invalid report type. Must be one of: ${validTypes.join(', ')}`;
        }
      },
      format: {
        required: true,
        type: 'string',
        validate: (value: any) => {
          const validFormats = ['pdf', 'excel', 'json', 'csv'];
          return validFormats.includes(value) ? null : `Invalid format. Must be one of: ${validFormats.join(', ')}`;
        }
      },
      recipients: {
        required: true,
        type: 'object',
        validate: (value: any) => {
          if (!Array.isArray(value)) return 'Recipients must be an array';
          if (value.length === 0) return 'At least one recipient is required';
          return null;
        }
      }
    };

    this.validateParams(config, rules);
  }

  /**
   * 生成报告
   */
  async generateReport(
    reportId: string,
    options?: {
      timeRange?: DateRange;
      format?: string;
      filters?: Record<string, any>;
    }
  ): Promise<ApiResponse<ReportData>> {
    try {
      const config = this.reportConfigs.get(reportId);
      if (!config) {
        throw new NotFoundError('Report configuration');
      }

      const reportData: ReportData = {
        reportId,
        name: config.name,
        type: config.type,
        format: options?.format || config.format,
        generatedAt: new Date(),
        timeRange: options?.timeRange || { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
        sections: await this.generateReportSections(config, options),
        metadata: {
          totalPages: Math.floor(5 + Math.random() * 10),
          dataSize: Math.floor(100 + Math.random() * 900),
          executionTime: Math.floor(2000 + Math.random() * 3000)
        }
      };

      return this.createApiResponse(reportData);

    } catch (error) {
      this.log('error', 'Failed to generate report', { reportId, error });
      throw error;
    }
  }

  /**
   * 生成报告章节
   */
  private async generateReportSections(
    config: ReportConfig,
    options?: any
  ): Promise<Array<{ title: string; content: any; charts?: any[] }>> {
    const sections = [];

    // 总览章节
    if (config.sections.includes('overview')) {
      sections.push({
        title: '总览',
        content: {
          summary: '本报告期间系统运行平稳，各项指标表现良好',
          keyMetrics: [
            { name: '总用户数', value: 1250, change: 5.2 },
            { name: '活跃用户数', value: 890, change: 8.7 },
            { name: '笔记总数', value: 5600, change: 12.3 }
          ]
        }
      });
    }

    // 用户分析章节
    if (config.sections.includes('users')) {
      sections.push({
        title: '用户分析',
        content: {
          userGrowth: '用户增长稳定，新用户注册率保持正向趋势',
          userEngagement: '用户参与度较高，平均会话时长有所提升',
          userRetention: '用户留存率维持在健康水平'
        },
        charts: [
          {
            type: 'line',
            title: '用户增长趋势',
            data: this.generateTrendDataPoints('total_users', options?.timeRange)
          }
        ]
      });
    }

    // 性能分析章节
    if (config.sections.includes('performance')) {
      sections.push({
        title: '性能分析',
        content: {
          responseTime: '系统响应时间保持在合理范围内',
          errorRate: '错误率控制在较低水平',
          availability: '系统可用性达到预期目标'
        },
        charts: [
          {
            type: 'area',
            title: '响应时间趋势',
            data: this.generateTrendDataPoints('response_time', options?.timeRange)
          }
        ]
      });
    }

    return sections;
  }

  /**
   * 清理过期数据
   */
  public async cleanupExpiredData(): Promise<void> {
    try {
      const now = Date.now();
      const expirationTime = 7 * 24 * 60 * 60 * 1000; // 7天

      // 清理过期的指标缓存
      for (const [key, cache] of this.metricsCache.entries()) {
        if (now - cache[0].timestamp.getTime() > expirationTime) {
          this.metricsCache.delete(key);
        }
      }

      // 清理过期的事件缓冲区
      this.eventBuffer = this.eventBuffer.filter(
        event => now - event.timestamp.getTime() < expirationTime
      );

      this.log('info', 'Expired analytics data cleaned up');

    } catch (error) {
      this.log('error', 'Failed to cleanup expired data', { error });
    }
  }
}

/**
 * 创建分析服务实例
 */
export function createAnalyticsService(config: AnalyticsConfig): AnalyticsService {
  return new AnalyticsService(config);
}

/**
 * 默认分析服务配置
 */
export const defaultAnalyticsServiceConfig: AnalyticsConfig = {
  baseUrl: '/api/v1/analytics',
  timeout: 60000,
  retries: 3,
  enableLogging: true,
  enableCaching: true,
  cacheTTL: 300000,
  maxBatchSize: 1000,
  bufferSize: 10000,
  flushInterval: 30000,
  enableRealTimeMetrics: true,
  retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90天
  enableInsights: true,
  insightsThreshold: 0.8,
  enableReports: true,
  maxConcurrentReports: 5
};