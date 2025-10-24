/**
 * 连接池配置管理测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PoolConfigurationManager, poolConfigManager } from '../pool-config';
import type { PoolConfiguration, PoolOptimizationResult } from '../pool-config';

// Mock Logger
vi.mock('@/lib/utils/logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('PoolConfigurationManager', () => {
  let manager: PoolConfigurationManager;

  beforeEach(() => {
    // 获取新实例进行测试
    manager = PoolConfigurationManager.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('配置初始化', () => {
    it('应该根据环境获取正确的默认配置', () => {
      const config = manager.getCurrentConfiguration();

      expect(config).toBeDefined();
      expect(config.minConnections).toBeGreaterThanOrEqual(0);
      expect(config.maxConnections).toBeGreaterThan(config.minConnections);
      expect(config.connectionTimeoutMs).toBeGreaterThan(0);
      expect(config.idleTimeoutMs).toBeGreaterThan(0);
    });

    it('应该有合理的默认值范围', () => {
      const config = manager.getCurrentConfiguration();

      // 验证连接数范围
      expect(config.minConnections).toBeGreaterThanOrEqual(0);
      expect(config.maxConnections).toBeLessThanOrEqual(1000);

      // 验证超时时间范围
      expect(config.connectionTimeoutMs).toBeGreaterThanOrEqual(1000);
      expect(config.idleTimeoutMs).toBeGreaterThanOrEqual(10000);
      expect(config.maxLifetimeMs).toBeGreaterThanOrEqual(180000);

      // 验证重试配置
      expect(config.connectionRetryAttempts).toBeGreaterThan(0);
      expect(config.connectionRetryDelayMs).toBeGreaterThan(0);
    });
  });

  describe('配置更新', () => {
    it('应该能够更新配置', async () => {
      const originalConfig = manager.getCurrentConfiguration();
      const newConfig = {
        maxConnections: originalConfig.maxConnections + 5,
        connectionTimeoutMs: originalConfig.connectionTimeoutMs + 1000,
      };

      await manager.updateConfiguration(newConfig);
      const updatedConfig = manager.getCurrentConfiguration();

      expect(updatedConfig.maxConnections).toBe(newConfig.maxConnections);
      expect(updatedConfig.connectionTimeoutMs).toBe(newConfig.connectionTimeoutMs);
    });

    it('应该拒绝无效的配置', async () => {
      const invalidConfigs = [
        { minConnections: -1 },
        { maxConnections: 0, minConnections: 10 },
        { maxConnections: 1001 },
        { connectionTimeoutMs: 500 },
        { idleTimeoutMs: 5000 },
        { maxLifetimeMs: 60000 },
      ];

      for (const config of invalidConfigs) {
        await expect(manager.updateConfiguration(config)).rejects.toThrow();
      }
    });

    it('应该验证最大连接数大于最小连接数', async () => {
      await expect(
        manager.updateConfiguration({ minConnections: 10, maxConnections: 5 })
      ).rejects.toThrow();
    });
  });

  describe('工作负载优化', () => {
    it('应该为高负载场景生成正确的优化建议', async () => {
      const highLoadMetrics = {
        avgConnections: 16, // 80% 使用率 (假设 max=20)
        peakConnections: 22,
        avgResponseTime: 300,
        errorRate: 0.02,
        throughput: 100,
      };

      const optimization = await manager.optimizeForWorkload(highLoadMetrics);

      expect(optimization.recommendedConfig.maxConnections)
        .toBeGreaterThan(optimization.currentConfig.maxConnections);
      expect(optimization.improvements.length).toBeGreaterThan(0);
      expect(optimization.performanceGain.expectedThroughputIncrease).toBeGreaterThan(0);
    });

    it('应该为低负载场景生成减少资源的建议', async () => {
      const lowLoadMetrics = {
        avgConnections: 2, // 低使用率
        peakConnections: 5,
        avgResponseTime: 50,
        errorRate: 0.001,
        throughput: 20,
      };

      const optimization = await manager.optimizeForWorkload(lowLoadMetrics);

      expect(optimization.recommendedConfig.maxConnections)
        .toBeLessThanOrEqual(optimization.currentConfig.maxConnections);
      expect(optimization.performanceGain.expectedThroughputIncrease).toBeGreaterThanOrEqual(0);
    });

    it('应该为高错误率场景增加重试机制', async () => {
      const highErrorMetrics = {
        avgConnections: 10,
        peakConnections: 15,
        avgResponseTime: 150,
        errorRate: 0.08, // 8% 错误率
        throughput: 80,
      };

      const optimization = await manager.optimizeForWorkload(highErrorMetrics);

      expect(optimization.recommendedConfig.connectionRetryAttempts)
        .toBeGreaterThan(optimization.currentConfig.connectionRetryAttempts);
      expect(optimization.recommendedConfig.connectionRetryDelayMs)
        .toBeGreaterThan(optimization.currentConfig.connectionRetryDelayMs);
    });

    it('应该正确评估优化风险', async () => {
      const riskyMetrics = {
        avgConnections: 5,
        peakConnections: 25,
        avgResponseTime: 500,
        errorRate: 0.15, // 15% 错误率
        throughput: 50,
      };

      const optimization = await manager.optimizeForWorkload(riskyMetrics);

      expect(optimization.riskAssessment).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(optimization.riskAssessment.level);
      expect(optimization.riskAssessment.factors).toBeInstanceOf(Array);
    });
  });

  describe('配置应用', () => {
    it('应该应用低风险优化', async () => {
      const metrics = {
        avgConnections: 8,
        peakConnections: 12,
        avgResponseTime: 100,
        errorRate: 0.01,
        throughput: 60,
      };

      const optimization = await manager.optimizeForWorkload(metrics);

      if (optimization.riskAssessment.level !== 'high') {
        await expect(manager.applyOptimization(optimization)).resolves.not.toThrow();

        const currentConfig = manager.getCurrentConfiguration();
        expect(currentConfig).toEqual(optimization.recommendedConfig);
      }
    });

    it('应该拒绝高风险优化', async () => {
      const metrics = {
        avgConnections: 5,
        peakConnections: 30,
        avgResponseTime: 800,
        errorRate: 0.12,
        throughput: 40,
      };

      const optimization = await manager.optimizeForWorkload(metrics);

      if (optimization.riskAssessment.level === 'high') {
        await expect(manager.applyOptimization(optimization)).rejects.toThrow();
      }
    });
  });

  describe('配置报告生成', () => {
    it('应该生成完整的配置报告', () => {
      const report = manager.generateConfigurationReport();

      expect(report).toHaveProperty('current');
      expect(report).toHaveProperty('environment');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('lastOptimization');

      expect(typeof report.current).toBe('object');
      expect(typeof report.environment).toBe('string');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('应该根据指标生成合适的建议', () => {
      // 模拟高使用率指标
      manager.updateMetrics({
        totalConnections: 20,
        activeConnections: 18,
        idleConnections: 2,
        errorCount: 1,
        totalQueries: 100,
        avgResponseTime: 150,
        timestamp: new Date(),
      });

      const report = manager.generateConfigurationReport();

      // 应该有增加连接数的建议
      const increaseRecommendation = report.recommendations.find(r => r.type === 'increase_connections');
      expect(increaseRecommendation).toBeDefined();
    });
  });

  describe('指标更新和趋势分析', () => {
    it('应该更新连接池指标历史', () => {
      const stats = {
        totalConnections: 10,
        activeConnections: 7,
        idleConnections: 3,
        errorCount: 0,
        totalQueries: 50,
        avgResponseTime: 80,
        timestamp: new Date(),
      };

      manager.updateMetrics(stats);

      const trends = manager.getPerformanceTrends(1);
      expect(trends.connectionUtilization).toHaveLength(1);
      expect(trends.responseTime).toHaveLength(1);
      expect(trends.errorRate).toHaveLength(1);
    });

    it('应该正确计算趋势数据', () => {
      const now = new Date();

      // 添加多个数据点
      for (let i = 0; i < 5; i++) {
        manager.updateMetrics({
          totalConnections: 10,
          activeConnections: 5 + i,
          idleConnections: 5 - i,
          errorCount: i,
          totalQueries: 50,
          avgResponseTime: 80 + i * 10,
          timestamp: new Date(now.getTime() - (4 - i) * 60 * 60 * 1000), // 每小时一个数据点
        });
      }

      const trends = manager.getPerformanceTrends(6);

      expect(trends.connectionUtilization).toHaveLength(5);
      expect(trends.responseTime).toHaveLength(5);
      expect(trends.errorRate).toHaveLength(5);

      // 验证趋势数据格式
      trends.connectionUtilization.forEach(point => {
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('value');
        expect(point.value).toBeGreaterThanOrEqual(0);
        expect(point.value).toBeLessThanOrEqual(1);
      });
    });

    it('应该限制指标历史记录数量', () => {
      // 添加超过限制的数据点
      for (let i = 0; i < 150; i++) {
        manager.updateMetrics({
          totalConnections: 10,
          activeConnections: 5,
          idleConnections: 5,
          errorCount: 0,
          totalQueries: 50,
          avgResponseTime: 80,
          timestamp: new Date(Date.now() - i * 60 * 1000),
        });
      }

      const trends = manager.getPerformanceTrends(48);
      expect(trends.connectionUtilization.length).toBeLessThanOrEqual(100);
    });
  });

  describe('配置导入导出', () => {
    it('应该正确导出配置', () => {
      const exported = manager.exportConfiguration();

      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('environment');
      expect(parsed).toHaveProperty('configuration');
      expect(parsed).toHaveProperty('exportTime');
    });

    it('应该正确导入配置', async () => {
      const originalConfig = manager.getCurrentConfiguration();

      // 创建测试配置
      const testConfig = {
        environment: 'test',
        configuration: {
          ...originalConfig,
          maxConnections: 25,
          connectionTimeoutMs: 8000,
          idleTimeoutMs: 60000,
          maxLifetimeMs: 300000,
        },
        exportTime: new Date().toISOString(),
      };

      const configJson = JSON.stringify(testConfig);

      await manager.importConfiguration(configJson);
      const importedConfig = manager.getCurrentConfiguration();

      expect(importedConfig.maxConnections).toBe(25);
      expect(importedConfig.connectionTimeoutMs).toBe(8000);
    });

    it('应该拒绝无效的导入配置', async () => {
      const invalidConfigs = [
        'invalid json',
        '{}',
        '{"invalid": "structure"}',
        '{"configuration": null}',
      ];

      for (const config of invalidConfigs) {
        await expect(manager.importConfiguration(config)).rejects.toThrow();
      }
    });
  });

  describe('环境特定配置', () => {
    it('应该为不同环境提供不同的默认配置', () => {
      // 这里需要模拟不同环境
      const developmentConfig = manager.getCurrentConfiguration();

      // 验证开发环境配置特征
      expect(developmentConfig.maxConnections).toBeLessThanOrEqual(50);
      expect(developmentConfig.applicationName).toBe('mindnote-dev');
    });
  });

  describe('性能优化算法', () => {
    it('应该正确计算吞吐量增益', async () => {
      const metrics = {
        avgConnections: 16,
        peakConnections: 20,
        avgResponseTime: 200,
        errorRate: 0.02,
        throughput: 100,
      };

      const optimization = await manager.optimizeForWorkload(metrics);

      expect(optimization.performanceGain.expectedThroughputIncrease).toBeGreaterThanOrEqual(0);
      expect(optimization.performanceGain.expectedThroughputIncrease).toBeLessThanOrEqual(100);
    });

    it('应该正确计算延迟改善', async () => {
      const metrics = {
        avgConnections: 8,
        peakConnections: 12,
        avgResponseTime: 150,
        errorRate: 0.01,
        throughput: 80,
      };

      const optimization = await manager.optimizeForWorkload(metrics);

      expect(optimization.performanceGain.expectedLatencyDecrease).toBeGreaterThanOrEqual(0);
    });

    it('应该正确计算资源利用率变化', async () => {
      const metrics = {
        avgConnections: 10,
        peakConnections: 15,
        avgResponseTime: 100,
        errorRate: 0.01,
        throughput: 90,
      };

      const optimization = await manager.optimizeForWorkload(metrics);

      expect(typeof optimization.performanceGain.resourceUtilizationChange).toBe('number');
    });
  });

  describe('边界情况处理', () => {
    it('应该处理零负载情况', async () => {
      const zeroLoadMetrics = {
        avgConnections: 0,
        peakConnections: 1,
        avgResponseTime: 0,
        errorRate: 0,
        throughput: 0,
      };

      const optimization = await manager.optimizeForWorkload(zeroLoadMetrics);

      expect(optimization).toBeDefined();
      expect(optimization.recommendedConfig).toBeDefined();
    });

    it('应该处理极端负载情况', async () => {
      const extremeLoadMetrics = {
        avgConnections: 100,
        peakConnections: 300, // 3倍以上增加
        avgResponseTime: 1200, // 超过1000ms
        errorRate: 0.2, // 超过15%
        throughput: 1000,
      };

      const optimization = await manager.optimizeForWorkload(extremeLoadMetrics);

      expect(optimization.riskAssessment.level).toBe('high');
      expect(optimization.riskAssessment.factors.length).toBeGreaterThan(0);
    });
  });
});

describe('poolConfigManager 单例', () => {
  it('应该返回相同的实例', () => {
    const instance1 = PoolConfigurationManager.getInstance();
    const instance2 = PoolConfigurationManager.getInstance();

    expect(instance1).toBe(instance2);
  });

  it('导出的单例应该是同一个实例', () => {
    const instance = PoolConfigurationManager.getInstance();

    expect(poolConfigManager).toBe(instance);
  });
});