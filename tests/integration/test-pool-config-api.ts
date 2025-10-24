/**
 * 连接池配置API集成测试
 * 测试连接池配置、监控和优化API的完整功能
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('连接池配置API集成测试', () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const poolApiUrl = `${baseUrl}/api/dev/database/pool`;

  beforeAll(async () => {
    // 确保测试环境已启动
    console.log('开始连接池配置API集成测试...');
  });

  afterAll(async () => {
    console.log('连接池配置API集成测试完成');
  });

  describe('GET /api/dev/database/pool', () => {
    it('应该返回当前连接池配置', async () => {
      const response = await fetch(`${poolApiUrl}?action=config`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('currentConfig');
      expect(data.data).toHaveProperty('environment');
      expect(data.data).toHaveProperty('metrics');
      expect(data.data).toHaveProperty('recommendations');
      expect(data.data).toHaveProperty('lastOptimization');
      expect(data.timestamp).toBeDefined();

      // 验证配置结构
      const { currentConfig } = data.data;
      expect(currentConfig).toHaveProperty('minConnections');
      expect(currentConfig).toHaveProperty('maxConnections');
      expect(currentConfig).toHaveProperty('connectionTimeoutMs');
      expect(currentConfig).toHaveProperty('idleTimeoutMs');
      expect(currentConfig).toHaveProperty('maxLifetimeMs');
    });

    it('应该返回连接池性能指标', async () => {
      const response = await fetch(`${poolApiUrl}?action=metrics`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('currentConfig');
      expect(data.data).toHaveProperty('realTimeStats');
      expect(data.data).toHaveProperty('trends');
      expect(data.data).toHaveProperty('performanceInsights');

      // 验证趋势数据
      const { trends } = data.data;
      expect(trends).toHaveProperty('connectionUtilization');
      expect(trends).toHaveProperty('responseTime');
      expect(trends).toHaveProperty('errorRate');

      // 验证性能洞察
      expect(Array.isArray(data.data.performanceInsights)).toBe(true);
    });

    it('应该返回连接池性能趋势', async () => {
      const hours = 12;
      const response = await fetch(`${poolApiUrl}?action=trends&hours=${hours}`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('connectionUtilization');
      expect(data.data).toHaveProperty('responseTime');
      expect(data.data).toHaveProperty('errorRate');

      // 验证趋势数据格式
      data.data.connectionUtilization.forEach((point: any) => {
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('value');
        expect(typeof point.value).toBe('number');
      });
    });

    it('应该导出连接池配置', async () => {
      const response = await fetch(`${poolApiUrl}?action=export`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('configuration');
      expect(data.data).toHaveProperty('environment');
      expect(data.data).toHaveProperty('exportTime');

      // 验证导出的配置是否为有效JSON
      const configJson = data.data.configuration;
      expect(() => JSON.parse(configJson)).not.toThrow();

      const parsedConfig = JSON.parse(configJson);
      expect(parsedConfig).toHaveProperty('environment');
      expect(parsedConfig).toHaveProperty('configuration');
      expect(parsedConfig).toHaveProperty('exportTime');
    });

    it('应该处理无效的action参数', async () => {
      const response = await fetch(`${poolApiUrl}?action=invalid`);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code', 'INVALID_ACTION');
    });
  });

  describe('POST /api/dev/database/pool', () => {
    it('应该更新连接池配置', async () => {
      const configUpdate = {
        action: 'update',
        config: {
          maxConnections: 15,
          connectionTimeoutMs: 8000,
        },
      };

      const response = await fetch(poolApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configUpdate),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('updatedConfig');
      expect(data.data.updatedConfig.maxConnections).toBe(15);
      expect(data.data.updatedConfig.connectionTimeoutMs).toBe(8000);
    });

    it('应该生成连接池优化建议', async () => {
      const optimizationRequest = {
        action: 'optimize',
        workloadMetrics: {
          avgConnections: 16,
          peakConnections: 22,
          avgResponseTime: 300,
          errorRate: 0.02,
          throughput: 100,
        },
        autoApply: false,
      };

      const response = await fetch(poolApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(optimizationRequest),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('currentConfig');
      expect(data.data).toHaveProperty('recommendedConfig');
      expect(data.data).toHaveProperty('improvements');
      expect(data.data).toHaveProperty('performanceGain');
      expect(data.data).toHaveProperty('riskAssessment');
      expect(data.data).toHaveProperty('applied');
      expect(data.data.applied).toBe(false);

      // 验证性能增益
      const { performanceGain } = data.data;
      expect(typeof performanceGain.expectedThroughputIncrease).toBe('number');
      expect(typeof performanceGain.expectedLatencyDecrease).toBe('number');
      expect(typeof performanceGain.resourceUtilizationChange).toBe('number');

      // 验证风险评估
      const { riskAssessment } = data.data;
      expect(['low', 'medium', 'high']).toContain(riskAssessment.level);
      expect(Array.isArray(riskAssessment.factors)).toBe(true);
    });

    it('应该应用低风险的优化建议', async () => {
      const optimizationRequest = {
        action: 'optimize',
        workloadMetrics: {
          avgConnections: 8,
          peakConnections: 12,
          avgResponseTime: 100,
          errorRate: 0.01,
          throughput: 60,
        },
        autoApply: true,
      };

      const response = await fetch(poolApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(optimizationRequest),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('优化已应用') || expect(data.message).toContain('优化建议生成成功');
    });

    it('应该拒绝高风险的优化建议', async () => {
      const optimizationRequest = {
        action: 'optimize',
        workloadMetrics: {
          avgConnections: 5,
          peakConnections: 30,
          avgResponseTime: 800,
          errorRate: 0.12,
          throughput: 40,
        },
        autoApply: true,
      };

      const response = await fetch(poolApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(optimizationRequest),
      });

      // 高风险优化应该被拒绝或标记
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // 如果是高风险，则不会自动应用
      if (data.data?.riskAssessment?.level === 'high') {
        expect(data.data.applied).toBe(false);
      }
    });

    it('应该导入连接池配置', async () => {
      const testConfig = {
        environment: 'test',
        configuration: {
          minConnections: 3,
          maxConnections: 25,
          connectionTimeoutMs: 8000,
          idleTimeoutMs: 60000,
          maxLifetimeMs: 600000,
          connectionRetryAttempts: 5,
          connectionRetryDelayMs: 2000,
          healthCheckIntervalMs: 8000,
          healthCheckTimeoutMs: 3000,
          statementTimeoutMs: 45000,
          queryTimeoutMs: 90000,
          applicationName: 'mindnote-test-import',
          enableMetrics: true,
          metricsIntervalMs: 3000,
          slowQueryThresholdMs: 2000,
        },
        exportTime: new Date().toISOString(),
      };

      const importRequest = {
        action: 'import',
        configuration: JSON.stringify(testConfig),
      };

      const response = await fetch(poolApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importRequest),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('currentConfig');
      expect(data.data.currentConfig.maxConnections).toBe(25);
      expect(data.data.currentConfig.applicationName).toBe('mindnote-test-import');
    });

    it('应该拒绝无效的配置更新', async () => {
      const invalidConfigUpdate = {
        action: 'update',
        config: {
          maxConnections: -1, // 无效值
        },
      };

      const response = await fetch(poolApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidConfigUpdate),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('应该拒绝无效的导入配置', async () => {
      const invalidImportRequest = {
        action: 'import',
        configuration: 'invalid json',
      };

      const response = await fetch(poolApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidImportRequest),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code', 'IMPORT_ERROR');
    });

    it('应该处理无效的action参数', async () => {
      const invalidRequest = {
        action: 'invalid_action',
      };

      const response = await fetch(poolApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code', 'INVALID_ACTION');
    });
  });

  describe('PUT /api/dev/database/pool', () => {
    it('应该重置连接池配置', async () => {
      const resetRequest = {
        action: 'reset',
      };

      const response = await fetch(poolApiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resetRequest),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('重置为默认值');
      expect(data.data).toHaveProperty('resetConfig');
      expect(data.data).toHaveProperty('environment');
    });

    it('应该处理无效的reset action', async () => {
      const invalidRequest = {
        action: 'invalid_reset',
      };

      const response = await fetch(poolApiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code', 'INVALID_ACTION');
    });
  });

  describe('API响应格式一致性', () => {
    it('所有成功响应应该包含标准字段', async () => {
      const endpoints = [
        `${poolApiUrl}?action=config`,
        `${poolApiUrl}?action=metrics`,
        `${poolApiUrl}?action=export`,
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.timestamp).toBe('string');
      }
    });

    it('所有错误响应应该包含标准错误格式', async () => {
      const invalidEndpoint = `${poolApiUrl}?action=invalid`;
      const response = await fetch(invalidEndpoint);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
    });
  });

  describe('性能测试', () => {
    it('API响应时间应该在合理范围内', async () => {
      const startTime = Date.now();

      const response = await fetch(`${poolApiUrl}?action=config`);
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // 应该在2秒内响应
    });

    it('复杂优化请求应该在合理时间内完成', async () => {
      const complexOptimizationRequest = {
        action: 'optimize',
        workloadMetrics: {
          avgConnections: 20,
          peakConnections: 35,
          avgResponseTime: 400,
          errorRate: 0.03,
          throughput: 120,
        },
        autoApply: false,
      };

      const startTime = Date.now();

      const response = await fetch(poolApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(complexOptimizationRequest),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 优化分析应该在5秒内完成
    });
  });

  describe('并发处理', () => {
    it('应该能够处理并发请求', async () => {
      const concurrentRequests = Array(5).fill(null).map((_, index) =>
        fetch(`${poolApiUrl}?action=config&_id=${index}`)
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      const dataPromises = responses.map(response => response.json());
      const dataResults = await Promise.all(dataPromises);

      dataResults.forEach((data, index) => {
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('currentConfig');
      });
    });
  });
});