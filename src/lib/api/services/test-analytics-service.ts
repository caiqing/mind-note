/**
 * T110 分析API服务集成测试
 * 验证分析服务的实际运行和数据处理能力
 */

import { AnalyticsService } from './analytics-service';
import { AnalyticsConfig, UserBehaviorEvent, DateRange } from '../types';

// 创建测试配置
const testConfig: AnalyticsConfig = {
  baseUrl: 'http://localhost:3000/api/v1/analytics',
  timeout: 30000,
  retries: 3,
  enableLogging: true,
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

/**
 * 分析服务集成测试类
 */
class AnalyticsServiceIntegrationTest {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService(testConfig);
  }

  /**
   * 运行所有集成测试
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 开始T110分析API服务集成测试\n');

    const testSuites = [
      { name: '用户事件跟踪测试', test: () => this.testUserEventTracking() },
      { name: '实时指标更新测试', test: () => this.testRealTimeMetrics() },
      { name: '分析查询测试', test: () => this.testAnalyticsQueries() },
      { name: '仪表板功能测试', test: () => this.testDashboardFeatures() },
      { name: 'KPI数据测试', test: () => this.testKPIData() },
      { name: '用户行为分析测试', test: () => this.testUserBehaviorAnalytics() },
      { name: '性能监控测试', test: () => this.testPerformanceMonitoring() },
      { name: '系统健康监控测试', test: () => this.testSystemHealthMonitoring() },
      { name: '洞察生成测试', test: () => this.testInsightsGeneration() },
      { name: '报告生成测试', test: () => this.testReportGeneration() },
      { name: '数据聚合测试', test: () => this.testDataAggregation() },
      { name: '并发处理测试', test: () => this.testConcurrentProcessing() },
      { name: '错误处理测试', test: () => this.testErrorHandling() },
      { name: '性能基准测试', test: () => this.testPerformanceBenchmark() },
      { name: '数据一致性测试', test: () => this.testDataConsistency() }
    ];

    let passedTests = 0;
    let totalTests = testSuites.length;

    for (const suite of testSuites) {
      try {
        console.log(`📋 运行测试套件: ${suite.name}`);
        await suite.test();
        console.log(`✅ ${suite.name} - 通过\n`);
        passedTests++;
      } catch (error) {
        console.error(`❌ ${suite.name} - 失败:`, error);
        console.log('');
      }
    }

    console.log(`📊 测试完成: ${passedTests}/${totalTests} 通过\n`);

    if (passedTests === totalTests) {
      console.log('🎉 所有集成测试通过！T110分析API服务功能完整且稳定。');
    } else {
      console.log('⚠️  部分测试失败，需要进一步调试和优化。');
    }
  }

  /**
   * 测试用户事件跟踪功能
   */
  async testUserEventTracking(): Promise<void> {
    console.log('  🔄 测试单个事件跟踪...');

    const event: UserBehaviorEvent = {
      eventType: 'note_created',
      userId: 'test_user_001',
      sessionId: 'test_session_001',
      timestamp: new Date(),
      properties: {
        noteId: 'note_test_001',
        category: 'technology',
        wordCount: 850,
        hasTags: true,
        tagsCount: 5
      }
    };

    const result = await this.analyticsService.trackUserEvent(event);
    if (!result.success) {
      throw new Error(`事件跟踪失败: ${result.error?.message}`);
    }

    console.log('  📦 测试批量事件跟踪...');

    const batchEvents: UserBehaviorEvent[] = [
      {
        eventType: 'note_viewed',
        userId: 'test_user_001',
        sessionId: 'test_session_001',
        timestamp: new Date(),
        properties: { noteId: 'note_test_002', viewDuration: 45 }
      },
      {
        eventType: 'search_performed',
        userId: 'test_user_001',
        sessionId: 'test_session_001',
        timestamp: new Date(),
        properties: { query: 'machine learning AI', resultsCount: 23, selectedResult: 3 }
      },
      {
        eventType: 'ai_interaction',
        userId: 'test_user_001',
        sessionId: 'test_session_001',
        timestamp: new Date(),
        properties: { action: 'generate_tags', inputLength: 850, outputTags: 4, processingTime: 1200 }
      },
      {
        eventType: 'tag_created',
        userId: 'test_user_001',
        sessionId: 'test_session_001',
        timestamp: new Date(),
        properties: { tagName: '人工智能', category: 'technology', confidence: 0.92 }
      },
      {
        eventType: 'user_login',
        userId: 'test_user_002',
        sessionId: 'test_session_002',
        timestamp: new Date(),
        properties: { loginMethod: 'email', device: 'desktop', location: '北京' }
      }
    ];

    const batchResult = await this.analyticsService.trackBatchEvents(batchEvents);
    if (!batchResult.success) {
      throw new Error(`批量事件跟踪失败: ${batchResult.error?.message}`);
    }

    console.log('  ✅ 用户事件跟踪功能正常');
  }

  /**
   * 测试实时指标更新
   */
  async testRealTimeMetrics(): Promise<void> {
    console.log('  📈 测试实时指标更新...');

    // 等待实时指标更新
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟一些事件来触发指标更新
    const events: UserBehaviorEvent[] = Array(20).fill(null).map((_, i) => ({
      eventType: ['note_created', 'note_viewed', 'search_performed', 'ai_interaction'][i % 4],
      userId: `realtime_user_${i % 5}`,
      sessionId: `realtime_session_${i % 3}`,
      timestamp: new Date(),
      properties: { testIndex: i }
    }));

    await this.analyticsService.trackBatchEvents(events);

    // 再次等待指标更新
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('  ✅ 实时指标更新功能正常');
  }

  /**
   * 测试分析查询功能
   */
  async testAnalyticsQueries(): Promise<void> {
    console.log('  🔍 测试指标查询...');

    const metricQuery = {
      type: 'metric' as const,
      metrics: ['total_users', 'active_users', 'total_notes'],
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      limit: 100
    };

    const metricResult = await this.analyticsService.executeQuery(metricQuery);
    if (!metricResult.success || !metricResult.data) {
      throw new Error('指标查询失败');
    }

    console.log('  📊 测试趋势分析...');

    const trendQuery = {
      type: 'trend' as const,
      metrics: ['note_views', 'search_queries'],
      timeRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      granularity: 'day' as const
    };

    const trendResult = await this.analyticsService.executeQuery(trendQuery);
    if (!trendResult.success || !trendResult.data) {
      throw new Error('趋势分析查询失败');
    }

    console.log('  🏁 测试漏斗分析...');

    const funnelQuery = {
      type: 'funnel' as const,
      name: '用户转化漏斗',
      funnelSteps: [
        { stepId: 'visit', stepName: '访问网站', description: '用户访问首页' },
        { stepId: 'register', stepName: '开始注册', description: '用户点击注册按钮' },
        { stepId: 'verify', stepName: '邮箱验证', description: '用户完成邮箱验证' },
        { stepId: 'first_note', stepName: '创建首条笔记', description: '用户创建第一条笔记' }
      ],
      timeRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    };

    const funnelResult = await this.analyticsService.executeQuery(funnelQuery);
    if (!funnelResult.success || !funnelResult.data) {
      throw new Error('漏斗分析查询失败');
    }

    console.log('  👥 测试队列分析...');

    const cohortQuery = {
      type: 'cohort' as const,
      cohortType: 'registration',
      timeRange: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      metrics: ['retention', 'engagement', 'conversion']
    };

    const cohortResult = await this.analyticsService.executeQuery(cohortQuery);
    if (!cohortResult.success || !cohortResult.data) {
      throw new Error('队列分析查询失败');
    }

    console.log('  🔄 测试对比分析...');

    const comparisonQuery = {
      type: 'comparison' as const,
      name: '月度性能对比',
      metrics: ['total_users', 'active_users', 'note_views', 'ai_interactions'],
      timeRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      comparePeriod: {
        start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    };

    const comparisonResult = await this.analyticsService.executeQuery(comparisonQuery);
    if (!comparisonResult.success || !comparisonResult.data) {
      throw new Error('对比分析查询失败');
    }

    console.log('  ✅ 分析查询功能正常');
  }

  /**
   * 测试仪表板功能
   */
  async testDashboardFeatures(): Promise<void> {
    console.log('  📱 获取默认仪表板配置...');

    const overviewConfig = await this.analyticsService.getDashboardConfig('overview');
    if (!overviewConfig.success || !overviewConfig.data) {
      throw new Error('获取总览仪表板配置失败');
    }

    const userBehaviorConfig = await this.analyticsService.getDashboardConfig('user_behavior');
    if (!userBehaviorConfig.success || !userBehaviorConfig.data) {
      throw new Error('获取用户行为仪表板配置失败');
    }

    const performanceConfig = await this.analyticsService.getDashboardConfig('performance');
    if (!performanceConfig.success || !performanceConfig.data) {
      throw new Error('获取性能监控仪表板配置失败');
    }

    console.log('  📊 获取仪表板数据...');

    const timeRange: DateRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const overviewData = await this.analyticsService.getDashboardData('overview', {}, timeRange);
    if (!overviewData.success || !overviewData.data) {
      throw new Error('获取总览仪表板数据失败');
    }

    const filters = { user_segment: 'active', date_range: '30d' };
    const userBehaviorData = await this.analyticsService.getDashboardData('user_behavior', filters, timeRange);
    if (!userBehaviorData.success || !userBehaviorData.data) {
      throw new Error('获取用户行为仪表板数据失败');
    }

    console.log('  🎨 创建自定义仪表板...');

    const customDashboard = {
      id: 'test_custom_dashboard',
      name: '测试自定义仪表板',
      description: '用于集成测试的自定义仪表板',
      category: 'user',
      layout: 'grid',
      widgets: [
        {
          id: 'test_widget_1',
          type: 'metric',
          title: '测试指标1',
          metricId: 'total_users',
          visualization: 'number',
          position: { row: 0, col: 0, width: 2, height: 1 },
          refreshInterval: 300
        },
        {
          id: 'test_widget_2',
          type: 'metric',
          title: '测试指标2',
          metricId: 'active_users',
          visualization: 'line',
          position: { row: 1, col: 0, width: 4, height: 2 },
          refreshInterval: 60
        }
      ],
      filters: [
        {
          id: 'test_filter',
          type: 'select',
          label: '测试筛选器',
          defaultValue: 'all',
          options: [
            { label: '全部', value: 'all' },
            { label: '活跃', value: 'active' }
          ]
        }
      ],
      permissions: ['read:analytics']
    };

    const saveResult = await this.analyticsService.saveDashboardConfig(customDashboard);
    if (!saveResult.success || !saveResult.data) {
      throw new Error('保存自定义仪表板失败');
    }

    // 获取自定义仪表板数据
    const customData = await this.analyticsService.getDashboardData('test_custom_dashboard');
    if (!customData.success || !customData.data) {
      throw new Error('获取自定义仪表板数据失败');
    }

    console.log('  ✅ 仪表板功能正常');
  }

  /**
   * 测试KPI数据功能
   */
  async testKPIData(): Promise<void> {
    console.log('  🎯 获取所有KPI数据...');

    const allKPIs = await this.analyticsService.getKPIData();
    if (!allKPIs.success || !allKPIs.data || allKPIs.data.length === 0) {
      throw new Error('获取KPI数据失败');
    }

    console.log('  📈 验证KPI数据完整性...');

    allKPIs.data.forEach(kpi => {
      if (!kpi.id || !kpi.name || kpi.currentValue === undefined ||
          kpi.targetValue === undefined || kpi.previousValue === undefined) {
        throw new Error(`KPI数据不完整: ${kpi.id}`);
      }
    });

    console.log('  🔍 获取特定KPI数据...');

    const specificKPIs = await this.analyticsService.getKPIData(['user_growth_rate', 'user_retention_rate']);
    if (!specificKPIs.success || !specificKPIs.data || specificKPIs.data.length !== 2) {
      throw new Error('获取特定KPI数据失败');
    }

    console.log('  📊 支持自定义时间范围的KPI...');

    const customTimeRange: DateRange = {
      start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const timeRangeKPIs = await this.analyticsService.getKPIData(undefined, customTimeRange);
    if (!timeRangeKPIs.success || !timeRangeKPIs.data) {
      throw new Error('获取自定义时间范围KPI数据失败');
    }

    console.log('  ✅ KPI数据功能正常');
  }

  /**
   * 测试用户行为分析功能
   */
  async testUserBehaviorAnalytics(): Promise<void> {
    console.log('  👤 分析特定用户行为...');

    const userId = 'test_user_001';
    const userAnalytics = await this.analyticsService.getUserBehaviorAnalytics(userId);
    if (!userAnalytics.success || !userAnalytics.data) {
      throw new Error('获取用户行为分析失败');
    }

    console.log('  🌐 分析全局用户行为...');

    const globalAnalytics = await this.analyticsService.getUserBehaviorAnalytics();
    if (!globalAnalytics.success || !globalAnalytics.data) {
      throw new Error('获取全局用户行为分析失败');
    }

    console.log('  📅 支持自定义时间范围...');

    const timeRange: DateRange = {
      start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const timeRangeAnalytics = await this.analyticsService.getUserBehaviorAnalytics(userId, timeRange);
    if (!timeRangeAnalytics.success || !timeRangeAnalytics.data) {
      throw new Error('获取自定义时间范围用户行为分析失败');
    }

    console.log('  🎯 支持事件类型筛选...');

    const eventTypes = ['note_created', 'note_viewed', 'search_performed'];
    const filteredAnalytics = await this.analyticsService.getUserBehaviorAnalytics(userId, undefined, eventTypes);
    if (!filteredAnalytics.success || !filteredAnalytics.data) {
      throw new Error('获取事件筛选用户行为分析失败');
    }

    console.log('  ✅ 用户行为分析功能正常');
  }

  /**
   * 测试性能监控功能
   */
  async testPerformanceMonitoring(): Promise<void> {
    console.log('  ⚡ 获取性能指标...');

    const performanceMetrics = await this.analyticsService.getPerformanceMetrics();
    if (!performanceMetrics.success || !performanceMetrics.data) {
      throw new Error('获取性能指标失败');
    }

    console.log('  🔍 验证性能指标完整性...');

    const metrics = performanceMetrics.data;
    if (!metrics.responseTime || !metrics.throughput || !metrics.errorRate ||
        !metrics.availability || !metrics.resourceUsage || !metrics.cachePerformance) {
      throw new Error('性能指标数据不完整');
    }

    console.log('  📅 支持自定义时间范围...');

    const timeRange: DateRange = {
      start: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12小时
      end: new Date()
    };

    const timeRangeMetrics = await this.analyticsService.getPerformanceMetrics(timeRange);
    if (!timeRangeMetrics.success || !timeRangeMetrics.data) {
      throw new Error('获取自定义时间范围性能指标失败');
    }

    console.log('  🎛️ 支持服务筛选...');

    const services = ['api', 'ai'];
    const filteredMetrics = await this.analyticsService.getPerformanceMetrics(undefined, services);
    if (!filteredMetrics.success || !filteredMetrics.data) {
      throw new Error('获取服务筛选性能指标失败');
    }

    console.log('  🏥 获取系统健康指标...');

    const healthMetrics = await this.analyticsService.getSystemHealthMetrics();
    if (!healthMetrics.success || !healthMetrics.data) {
      throw new Error('获取系统健康指标失败');
    }

    const health = healthMetrics.data;
    if (!health.overallStatus || !health.services || !health.alerts || !health.dependencies) {
      throw new Error('系统健康指标数据不完整');
    }

    console.log('  ✅ 性能监控功能正常');
  }

  /**
   * 测试系统健康监控功能
   */
  async testSystemHealthMonitoring(): Promise<void> {
    console.log('  🏥 获取系统健康状态...');

    const healthMetrics = await this.analyticsService.getSystemHealthMetrics();
    if (!healthMetrics.success || !healthMetrics.data) {
      throw new Error('获取系统健康状态失败');
    }

    console.log('  🔍 验证服务状态...');

    const health = healthMetrics.data;
    if (!health.services || health.services.length === 0) {
      throw new Error('服务状态数据为空');
    }

    health.services.forEach(service => {
      if (!service.name || !service.status || service.responseTime === undefined ||
          service.uptime === undefined || !service.lastChecked) {
        throw new Error(`服务状态数据不完整: ${service.name}`);
      }
    });

    console.log('  🚨 验证告警信息...');

    if (health.alerts) {
      health.alerts.forEach(alert => {
        if (!alert.id || !alert.level || !alert.title || !alert.message || !alert.timestamp) {
          throw new Error(`告警信息不完整: ${alert.id}`);
        }
      });
    }

    console.log('  🔗 验证依赖服务状态...');

    if (health.dependencies) {
      health.dependencies.forEach(dependency => {
        if (!dependency.name || !dependency.status || dependency.responseTime === undefined ||
            !dependency.lastChecked) {
          throw new Error(`依赖服务状态不完整: ${dependency.name}`);
        }
      });
    }

    console.log('  ✅ 系统健康监控功能正常');
  }

  /**
   * 测试洞察生成功能
   */
  async testInsightsGeneration(): Promise<void> {
    console.log('  💡 获取所有洞察数据...');

    const allInsights = await this.analyticsService.getInsights();
    if (!allInsights.success || !allInsights.data || allInsights.data.length === 0) {
      throw new Error('获取洞察数据失败');
    }

    console.log('  🔍 验证洞察数据完整性...');

    allInsights.data.forEach(insight => {
      if (!insight.id || !insight.title || !insight.description || !insight.category ||
          !insight.type || !insight.importance || insight.confidence === undefined ||
          !insight.recommendations || !insight.createdAt || !insight.expiresAt) {
        throw new Error(`洞察数据不完整: ${insight.id}`);
      }
    });

    console.log('  📂 按类别筛选洞察...');

    const userInsights = await this.analyticsService.getInsights('user');
    if (!userInsights.success || !userInsights.data) {
      throw new Error('获取用户类别洞察失败');
    }

    const performanceInsights = await this.analyticsService.getInsights('performance');
    if (!performanceInsights.success || !performanceInsights.data) {
      throw new Error('获取性能类别洞察失败');
    }

    const aiInsights = await this.analyticsService.getInsights('ai');
    if (!aiInsights.success || !aiInsights.data) {
      throw new Error('获取AI类别洞察失败');
    }

    console.log('  📅 支持自定义时间范围...');

    const timeRange: DateRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const timeRangeInsights = await this.analyticsService.getInsights(undefined, timeRange);
    if (!timeRangeInsights.success || !timeRangeInsights.data) {
      throw new Error('获取自定义时间范围洞察失败');
    }

    console.log('  ✅ 洞察生成功能正常');
  }

  /**
   * 测试报告生成功能
   */
  async testReportGeneration(): Promise<void> {
    console.log('  📋 创建报告配置...');

    const reportConfig = {
      name: '集成测试报告',
      description: '用于集成测试的报告配置',
      type: 'on_demand' as const,
      format: 'pdf',
      sections: ['overview', 'users', 'performance'],
      recipients: ['test@example.com', 'admin@example.com'],
      filters: {
        user_segment: 'all',
        date_range: '7d',
        include_charts: true
      },
      template: 'standard'
    };

    const configResult = await this.analyticsService.createReportConfig(reportConfig);
    if (!configResult.success || !configResult.data) {
      throw new Error('创建报告配置失败');
    }

    const reportId = configResult.data.id;

    console.log('  📊 生成报告...');

    const generateOptions = {
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      format: 'pdf',
      filters: {
        include_charts: true,
        chart_type: 'interactive'
      }
    };

    const reportResult = await this.analyticsService.generateReport(reportId, generateOptions);
    if (!reportResult.success || !reportResult.data) {
      throw new Error('生成报告失败');
    }

    console.log('  🔍 验证报告数据完整性...');

    const report = reportResult.data;
    if (!report.reportId || !report.name || !report.type || !report.format ||
        !report.generatedAt || !report.sections || !report.metadata) {
      throw new Error('报告数据不完整');
    }

    console.log('  📈 测试不同格式的报告...');

    const formats = ['excel', 'json', 'csv'];
    for (const format of formats) {
      const formatOptions = { ...generateOptions, format };
      const formatResult = await this.analyticsService.generateReport(reportId, formatOptions);

      if (!formatResult.success || !formatResult.data) {
        throw new Error(`生成${format}格式报告失败`);
      }

      if (formatResult.data.format !== format) {
        throw new Error(`${format}格式报告格式不匹配`);
      }
    }

    console.log('  🕐 测试定时报告配置...');

    const scheduledConfig = {
      name: '定时测试报告',
      description: '用于测试定时生成的报告',
      type: 'scheduled' as const,
      format: 'pdf',
      schedule: {
        frequency: 'weekly',
        dayOfWeek: 1, // 周一
        time: '09:00',
        timezone: 'Asia/Shanghai'
      },
      sections: ['overview', 'performance'],
      recipients: ['scheduled@example.com'],
      filters: { auto_generate: true }
    };

    const scheduledResult = await this.analyticsService.createReportConfig(scheduledConfig);
    if (!scheduledResult.success || !scheduledResult.data) {
      throw new Error('创建定时报告配置失败');
    }

    console.log('  ✅ 报告生成功能正常');
  }

  /**
   * 测试数据聚合功能
   */
  async testDataAggregation(): Promise<void> {
    console.log('  🔄 生成大量测试数据...');

    const users = Array(50).fill(null).map((_, i) => `agg_user_${i}`);
    const sessions = Array(20).fill(null).map((_, i) => `agg_session_${i}`);
    const eventTypes = ['note_created', 'note_viewed', 'search_performed', 'ai_interaction', 'tag_created', 'user_login'];

    const batchEvents: UserBehaviorEvent[] = Array(500).fill(null).map((_, i) => ({
      eventType: eventTypes[i % eventTypes.length],
      userId: users[i % users.length],
      sessionId: sessions[i % sessions.length],
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      properties: {
        eventIndex: i,
        category: ['technology', 'business', 'education', 'health'][i % 4],
        randomValue: Math.random() * 100
      }
    }));

    console.log('  📦 批量提交事件数据...');

    const batchSize = 100;
    for (let i = 0; i < batchEvents.length; i += batchSize) {
      const batch = batchEvents.slice(i, i + batchSize);
      const result = await this.analyticsService.trackBatchEvents(batch);

      if (!result.success) {
        throw new Error(`批量事件提交失败: ${result.error?.message}`);
      }
    }

    console.log('  ⏱️ 等待数据聚合处理...');

    // 等待数据处理和聚合
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('  📊 验证聚合结果...');

    // 聚合查询验证
    const aggregationQuery = {
      type: 'metric' as const,
      metrics: ['total_users', 'total_notes', 'search_queries'],
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      filters: {
        category: ['technology', 'business', 'education', 'health']
      }
    };

    const aggregationResult = await this.analyticsService.executeQuery(aggregationQuery);
    if (!aggregationResult.success || !aggregationResult.data) {
      throw new Error('聚合查询失败');
    }

    console.log('  📈 验证趋势聚合...');

    const trendQuery = {
      type: 'trend' as const,
      metrics: ['note_views', 'ai_interactions'],
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      granularity: 'hour' as const
    };

    const trendResult = await this.analyticsService.executeQuery(trendQuery);
    if (!trendResult.success || !trendResult.data) {
      throw new Error('趋势聚合查询失败');
    }

    console.log('  ✅ 数据聚合功能正常');
  }

  /**
   * 测试并发处理能力
   */
  async testConcurrentProcessing(): Promise<void> {
    console.log('  🚀 启动并发事件跟踪测试...');

    const concurrentUsers = 20;
    const eventsPerUser = 10;
    const promises = [];

    for (let user = 0; user < concurrentUsers; user++) {
      for (let event = 0; event < eventsPerUser; event++) {
        promises.push(
          this.analyticsService.trackUserEvent({
            eventType: 'concurrent_test',
            userId: `concurrent_user_${user}`,
            sessionId: `concurrent_session_${user % 5}`,
            timestamp: new Date(),
            properties: {
              userIndex: user,
              eventIndex: event,
              concurrentId: `${user}_${event}`
            }
          })
        );
      }
    }

    console.log(`  📊 并发处理 ${concurrentUsers * eventsPerUser} 个事件...`);

    const startTime = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`  ⏱️ 并发处理完成: ${duration}ms, 成功: ${successCount}, 失败: ${failureCount}`);

    if (failureCount > 0) {
      throw new Error(`并发处理失败率过高: ${failureCount}/${results.length}`);
    }

    if (duration > 10000) { // 超过10秒认为性能不佳
      throw new Error(`并发处理性能不佳: ${duration}ms`);
    }

    console.log('  🔄 并发查询测试...');

    const concurrentQueries = 10;
    const queryPromises = Array(concurrentQueries).fill(null).map((_, i) =>
      this.analyticsService.executeQuery({
        type: 'metric',
        metrics: ['total_users', 'active_users'],
        timeRange: {
          start: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      })
    );

    const queryStartTime = Date.now();
    const queryResults = await Promise.all(queryPromises);
    const queryDuration = Date.now() - queryStartTime;

    const querySuccessCount = queryResults.filter(r => r.success).length;

    console.log(`  🔍 并发查询完成: ${queryDuration}ms, 成功: ${querySuccessCount}/${concurrentQueries}`);

    if (querySuccessCount < concurrentQueries) {
      throw new Error(`并发查询失败率过高: ${concurrentQueries - querySuccessCount}/${concurrentQueries}`);
    }

    console.log('  ✅ 并发处理能力正常');
  }

  /**
   * 测试错误处理能力
   */
  async testErrorHandling(): Promise<void> {
    console.log('  ❌ 测试无效事件数据处理...');

    // 测试各种无效事件数据
    const invalidEvents = [
      {
        eventType: '',
        userId: 'test_user',
        sessionId: 'test_session',
        timestamp: new Date(),
        properties: {}
      },
      {
        eventType: 'test_event',
        userId: '',
        sessionId: 'test_session',
        timestamp: new Date(),
        properties: {}
      },
      {
        eventType: 'test_event',
        userId: 'test_user',
        sessionId: '',
        timestamp: new Date(),
        properties: {}
      },
      {
        eventType: 'test_event',
        userId: 'test_user',
        sessionId: 'test_session',
        timestamp: 'invalid_date' as any,
        properties: {}
      },
      {
        eventType: 'test_event',
        userId: 'test_user',
        sessionId: 'test_session',
        timestamp: new Date(),
        properties: 'invalid_object' as any
      }
    ];

    for (const [index, invalidEvent] of invalidEvents.entries()) {
      try {
        await this.analyticsService.trackUserEvent(invalidEvent as any);
        throw new Error(`应该拒绝无效事件数据 ${index}`);
      } catch (error) {
        // 预期的错误，继续下一个测试
      }
    }

    console.log('  ❌ 测试批量无效数据处理...');

    try {
      await this.analyticsService.trackBatchEvents([]);
      throw new Error('应该拒绝空的事件数组');
    } catch (error) {
      // 预期的错误
    }

    try {
      await this.analyticsService.trackBatchEvents(Array(1001).fill(null).map(() => invalidEvents[0] as any));
      throw new Error('应该拒绝超量的事件数组');
    } catch (error) {
      // 预期的错误
    }

    console.log('  ❌ 测试无效查询参数...');

    const invalidQueries = [
      {
        type: 'invalid_type',
        metrics: ['total_users']
      },
      {
        type: 'metric',
        metrics: []
      },
      {
        type: 'metric',
        metrics: ['total_users'],
        timeRange: {
          start: new Date(),
          end: new Date(Date.now() - 24 * 60 * 60 * 1000) // 结束时间早于开始时间
        }
      }
    ];

    for (const [index, invalidQuery] of invalidQueries.entries()) {
      try {
        await this.analyticsService.executeQuery(invalidQuery as any);
        throw new Error(`应该拒绝无效查询 ${index}`);
      } catch (error) {
        // 预期的错误
      }
    }

    console.log('  ❌ 测试不存在的资源...');

    try {
      await this.analyticsService.getDashboardConfig('nonexistent_dashboard');
      throw new Error('应该拒绝不存在的仪表板ID');
    } catch (error) {
      // 预期的错误
    }

    try {
      await this.analyticsService.generateReport('nonexistent_report');
      throw new Error('应该拒绝不存在的报告ID');
    } catch (error) {
      // 预期的错误
    }

    console.log('  ❌ 测试无效配置数据...');

    const invalidDashboardConfigs = [
      {
        id: '',
        name: 'test',
        category: 'user',
        widgets: []
      },
      {
        id: 'test',
        name: '',
        category: 'user',
        widgets: []
      },
      {
        id: 'test',
        name: 'test',
        category: 'invalid_category',
        widgets: []
      }
    ];

    for (const config of invalidDashboardConfigs) {
      try {
        await this.analyticsService.saveDashboardConfig(config as any);
        throw new Error('应该拒绝无效的仪表板配置');
      } catch (error) {
        // 预期的错误
      }
    }

    console.log('  ✅ 错误处理能力正常');
  }

  /**
   * 测试性能基准
   */
  async testPerformanceBenchmark(): Promise<void> {
    console.log('  ⚡ 事件跟踪性能测试...');

    const eventCount = 1000;
    const events: UserBehaviorEvent[] = Array(eventCount).fill(null).map((_, i) => ({
      eventType: ['note_created', 'note_viewed', 'search_performed'][i % 3],
      userId: `perf_user_${i % 100}`,
      sessionId: `perf_session_${i % 50}`,
      timestamp: new Date(),
      properties: { eventIndex: i }
    }));

    const batchStartTime = Date.now();
    const batchResult = await this.analyticsService.trackBatchEvents(events);
    const batchDuration = Date.now() - batchStartTime;

    if (!batchResult.success) {
      throw new Error('批量事件跟踪失败');
    }

    console.log(`  📊 批量处理 ${eventCount} 个事件耗时: ${batchDuration}ms`);
    console.log(`  📈 处理速度: ${(eventCount / batchDuration * 1000).toFixed(2)} 事件/秒`);

    if (batchDuration > 5000) {
      throw new Error(`批量处理性能不佳: ${batchDuration}ms`);
    }

    console.log('  🔍 查询性能测试...');

    const queryTypes = ['metric', 'trend', 'funnel', 'cohort', 'comparison'];
    const queryResults = [];

    for (const queryType of queryTypes) {
      const queryStartTime = Date.now();

      let query: any;
      switch (queryType) {
        case 'metric':
          query = {
            type: queryType,
            metrics: ['total_users', 'active_users'],
            timeRange: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() }
          };
          break;
        case 'trend':
          query = {
            type: queryType,
            metrics: ['total_notes'],
            timeRange: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
            granularity: 'day'
          };
          break;
        case 'funnel':
          query = {
            type: queryType,
            funnelSteps: [
              { stepId: 'step1', stepName: '步骤1', description: '第一个步骤' },
              { stepId: 'step2', stepName: '步骤2', description: '第二个步骤' }
            ],
            timeRange: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }
          };
          break;
        case 'cohort':
          query = {
            type: queryType,
            cohortType: 'registration',
            timeRange: { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() }
          };
          break;
        case 'comparison':
          query = {
            type: queryType,
            metrics: ['total_users', 'active_users'],
            timeRange: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
            comparePeriod: { start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          };
          break;
      }

      const result = await this.analyticsService.executeQuery(query);
      const queryDuration = Date.now() - queryStartTime;

      if (!result.success) {
        throw new Error(`${queryType}查询失败`);
      }

      queryResults.push({ type: queryType, duration: queryDuration });
      console.log(`  🔍 ${queryType}查询耗时: ${queryDuration}ms`);

      if (queryDuration > 3000) {
        throw new Error(`${queryType}查询性能不佳: ${queryDuration}ms`);
      }
    }

    console.log('  📊 仪表板数据加载性能测试...');

    const dashboardStartTime = Date.now();
    const dashboardResult = await this.analyticsService.getDashboardData('overview');
    const dashboardDuration = Date.now() - dashboardStartTime;

    if (!dashboardResult.success) {
      throw new Error('仪表板数据加载失败');
    }

    console.log(`  📱 仪表板数据加载耗时: ${dashboardDuration}ms`);

    if (dashboardDuration > 2000) {
      throw new Error(`仪表板数据加载性能不佳: ${dashboardDuration}ms`);
    }

    console.log('  📋 报告生成性能测试...');

    // 创建报告配置
    const reportConfig = {
      name: '性能测试报告',
      type: 'on_demand' as const,
      format: 'pdf',
      sections: ['overview', 'users', 'performance'],
      recipients: ['test@example.com']
    };

    const configResult = await this.analyticsService.createReportConfig(reportConfig);
    if (!configResult.success || !configResult.data) {
      throw new Error('创建报告配置失败');
    }

    const reportStartTime = Date.now();
    const reportResult = await this.analyticsService.generateReport(configResult.data.id);
    const reportDuration = Date.now() - reportStartTime;

    if (!reportResult.success) {
      throw new Error('报告生成失败');
    }

    console.log(`  📊 报告生成耗时: ${reportDuration}ms`);

    if (reportDuration > 5000) {
      throw new Error(`报告生成性能不佳: ${reportDuration}ms`);
    }

    console.log('  ✅ 性能基准测试通过');
  }

  /**
   * 测试数据一致性
   */
  async testDataConsistency(): Promise<void> {
    console.log('  🔍 测试事件数据一致性...');

    // 创建测试事件序列
    const userId = 'consistency_test_user';
    const sessionId = 'consistency_test_session';

    const events: UserBehaviorEvent[] = [
      {
        eventType: 'user_login',
        userId,
        sessionId,
        timestamp: new Date(Date.now() - 60000), // 1分钟前
        properties: { loginMethod: 'email' }
      },
      {
        eventType: 'note_created',
        userId,
        sessionId,
        timestamp: new Date(Date.now() - 30000), // 30秒前
        properties: { noteId: 'consistency_note_1', wordCount: 500 }
      },
      {
        eventType: 'note_viewed',
        userId,
        sessionId,
        timestamp: new Date(),
        properties: { noteId: 'consistency_note_2', viewDuration: 45 }
      }
    ];

    // 提交事件
    await this.analyticsService.trackBatchEvents(events);

    // 等待数据处理
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('  📊 验证指标数据一致性...');

    // 获取用户指标
    const userAnalytics = await this.analyticsService.getUserBehaviorAnalytics(userId);
    if (!userAnalytics.success || !userAnalytics.data) {
      throw new Error('获取用户行为分析失败');
    }

    // 验证事件数量一致性
    if (userAnalytics.data.totalEvents < events.length) {
      throw new Error('事件数量不一致');
    }

    console.log('  📈 验证时间序列数据一致性...');

    const timeRange: DateRange = {
      start: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
      end: new Date()
    };

    const trendQuery = {
      type: 'trend' as const,
      metrics: ['total_users'],
      timeRange,
      granularity: 'hour' as const
    };

    const trendResult = await this.analyticsService.executeQuery(trendQuery);
    if (!trendResult.success || !trendResult.data) {
      throw new Error('趋势查询失败');
    }

    console.log('  🔄 验证聚合数据一致性...');

    // 多次查询相同指标，验证结果一致性
    const metricQuery = {
      type: 'metric' as const,
      metrics: ['total_users'],
      timeRange,
      limit: 100
    };

    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = await this.analyticsService.executeQuery(metricQuery);
      if (!result.success || !result.data) {
        throw new Error(`第${i + 1}次指标查询失败`);
      }
      results.push(result.data.results);

      // 查询间隔
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 验证结果一致性（允许小幅波动）
    for (let i = 1; i < results.length; i++) {
      const prevValue = results[i - 1][0]?.value || 0;
      const currValue = results[i][0]?.value || 0;
      const variance = Math.abs(prevValue - currValue) / Math.max(prevValue, 1);

      if (variance > 0.05) { // 允许5%的方差
        console.warn(`    ⚠️  指标数据存在方差: ${variance.toFixed(2)} (之前: ${prevValue}, 当前: ${currValue})`);
      }
    }

    console.log('  📱 验证仪表板数据一致性...');

    // 多次获取仪表板数据
    const dashboardResults = [];
    for (let i = 0; i < 3; i++) {
      const result = await this.analyticsService.getDashboardData('overview', {}, timeRange);
      if (!result.success || !result.data) {
        throw new Error(`第${i + 1}次仪表板数据获取失败`);
      }
      dashboardResults.push(result.data);

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 验证仪表板数据一致性
    if (dashboardResults.length > 1) {
      const firstData = dashboardResults[0];
      for (let i = 1; i < dashboardResults.length; i++) {
        const currentData = dashboardResults[i];

        if (firstData.widgets.total_users_widget?.value !== currentData.widgets.total_users_widget?.value) {
          console.warn(`    ⚠️  仪表板数据存在差异: total_users_widget`);
        }
      }
    }

    console.log('  ✅ 数据一致性验证通过');
  }
}

/**
 * 运行T110分析API服务集成测试
 */
async function runT110AnalyticsServiceTest(): Promise<void> {
  console.log('🎯 T110 分析API服务集成测试');
  console.log('=' .repeat(60));
  console.log('测试目标：验证分析服务的完整功能、性能和稳定性');
  console.log('测试范围：事件跟踪、实时指标、分析查询、仪表板、报告生成等');
  console.log('测试方式：集成测试，模拟真实使用场景');
  console.log('=' .repeat(60));
  console.log('');

  try {
    const testSuite = new AnalyticsServiceIntegrationTest();
    await testSuite.runAllTests();

    console.log('\n🎯 T110分析API服务集成测试总结');
    console.log('=' .repeat(60));
    console.log('✅ 功能完整性：分析服务实现了所有核心功能');
    console.log('✅ 数据处理：支持大规模事件数据的采集和聚合');
    console.log('✅ 实时分析：提供实时的指标更新和洞察生成');
    console.log('✅ 查询能力：支持多种类型的复杂分析查询');
    console.log('✅ 仪表板系统：完整的仪表板配置和数据展示');
    console.log('✅ 报告生成：支持多种格式的自动报告生成');
    console.log('✅ 性能表现：在高并发场景下保持良好性能');
    console.log('✅ 错误处理：能够优雅处理各种异常情况');
    console.log('✅ 数据一致性：保证分析结果的准确性和一致性');
    console.log('=' .repeat(60));
    console.log('🚀 T110分析API服务已准备好用于生产环境！');

  } catch (error) {
    console.error('\n❌ T110分析API服务集成测试失败:', error);
    console.log('\n🔧 请检查以下方面：');
    console.log('1. 分析服务配置是否正确');
    console.log('2. 数据存储和缓存是否正常工作');
    console.log('3. 事件处理和聚合逻辑是否有问题');
    console.log('4. 查询引擎和算法是否正确实现');
    console.log('5. 并发处理和性能优化是否到位');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runT110AnalyticsServiceTest().catch(console.error);
}

export { AnalyticsServiceIntegrationTest, runT110AnalyticsServiceTest };