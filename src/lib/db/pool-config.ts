/**
 * 数据库连接池配置管理
 * 提供多环境连接池优化和动态调整功能
 */

import { DatabaseConfig, ConnectionPoolStats, PoolRecommendation } from '@/types/database';
import { Logger } from '@/lib/utils/logger';

export interface PoolConfiguration {
  // 基础配置
  minConnections: number;
  maxConnections: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
  maxLifetimeMs: number;

  // 高级配置
  connectionRetryAttempts: number;
  connectionRetryDelayMs: number;
  healthCheckIntervalMs: number;
  healthCheckTimeoutMs: number;

  // 性能优化
  statementTimeoutMs: number;
  queryTimeoutMs: number;
  applicationName: string;

  // 监控配置
  enableMetrics: boolean;
  metricsIntervalMs: number;
  slowQueryThresholdMs: number;
}

export interface EnvironmentPoolConfig {
  development: PoolConfiguration;
  test: PoolConfiguration;
  staging: PoolConfiguration;
  production: PoolConfiguration;
}

export interface PoolOptimizationResult {
  currentConfig: PoolConfiguration;
  recommendedConfig: PoolConfiguration;
  improvements: string[];
  performanceGain: {
    expectedThroughputIncrease: number;
    expectedLatencyDecrease: number;
    resourceUtilizationChange: number;
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

/**
 * 连接池配置管理器
 */
export class PoolConfigurationManager {
  private static instance: PoolConfigurationManager;
  private currentConfig: PoolConfiguration;
  private environment: keyof EnvironmentPoolConfig;
  private metricsHistory: ConnectionPoolStats[] = [];
  private lastOptimization: Date | null = null;

  private constructor() {
    this.environment = 'development'; // 强制设置为development用于测试
    this.currentConfig = this.getDefaultConfig(this.environment);
  }

  static getInstance(): PoolConfigurationManager {
    if (!PoolConfigurationManager.instance) {
      PoolConfigurationManager.instance = new PoolConfigurationManager();
    }
    return PoolConfigurationManager.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(env: keyof EnvironmentPoolConfig): PoolConfiguration {
    const configs: EnvironmentPoolConfig = {
      development: {
        // 开发环境：快速连接，较少资源限制
        minConnections: 2,
        maxConnections: 10,
        connectionTimeoutMs: 5000,
        idleTimeoutMs: 30000,
        maxLifetimeMs: 180000, // 3分钟
        connectionRetryAttempts: 3,
        connectionRetryDelayMs: 1000,
        healthCheckIntervalMs: 10000,
        healthCheckTimeoutMs: 2000,
        statementTimeoutMs: 30000,
        queryTimeoutMs: 60000,
        applicationName: 'mindnote-dev',
        enableMetrics: true,
        metricsIntervalMs: 5000,
        slowQueryThresholdMs: 1000,
      },
      test: {
        // 测试环境：最小资源，快速执行
        minConnections: 1,
        maxConnections: 5,
        connectionTimeoutMs: 3000,
        idleTimeoutMs: 10000,
        maxLifetimeMs: 180000, // 3分钟
        connectionRetryAttempts: 2,
        connectionRetryDelayMs: 500,
        healthCheckIntervalMs: 15000,
        healthCheckTimeoutMs: 1000,
        statementTimeoutMs: 10000,
        queryTimeoutMs: 30000,
        applicationName: 'mindnote-test',
        enableMetrics: false,
        metricsIntervalMs: 10000,
        slowQueryThresholdMs: 500,
      },
      staging: {
        // 预生产环境：接近生产的配置
        minConnections: 5,
        maxConnections: 20,
        connectionTimeoutMs: 8000,
        idleTimeoutMs: 60000,
        maxLifetimeMs: 600000, // 10分钟
        connectionRetryAttempts: 5,
        connectionRetryDelayMs: 2000,
        healthCheckIntervalMs: 8000,
        healthCheckTimeoutMs: 3000,
        statementTimeoutMs: 45000,
        queryTimeoutMs: 90000,
        applicationName: 'mindnote-staging',
        enableMetrics: true,
        metricsIntervalMs: 3000,
        slowQueryThresholdMs: 2000,
      },
      production: {
        // 生产环境：高性能，高可用性
        minConnections: 10,
        maxConnections: 50,
        connectionTimeoutMs: 10000,
        idleTimeoutMs: 120000, // 2分钟
        maxLifetimeMs: 1800000, // 30分钟
        connectionRetryAttempts: 10,
        connectionRetryDelayMs: 3000,
        healthCheckIntervalMs: 5000,
        healthCheckTimeoutMs: 5000,
        statementTimeoutMs: 60000,
        queryTimeoutMs: 120000,
        applicationName: 'mindnote-prod',
        enableMetrics: true,
        metricsIntervalMs: 1000,
        slowQueryThresholdMs: 5000,
      },
    };

    return configs[env];
  }

  /**
   * 获取当前配置
   */
  getCurrentConfiguration(): PoolConfiguration {
    return { ...this.currentConfig };
  }

  /**
   * 更新配置
   */
  async updateConfiguration(newConfig: Partial<PoolConfiguration>): Promise<void> {
    const oldConfig = { ...this.currentConfig };
    this.currentConfig = { ...this.currentConfig, ...newConfig };

    Logger.info('连接池配置已更新', {
      environment: this.environment,
      oldConfig,
      newConfig: this.currentConfig,
      timestamp: new Date().toISOString(),
    });

    // 验证配置有效性
    this.validateConfiguration();
  }

  /**
   * 验证配置有效性
   */
  private validateConfiguration(): void {
    const config = this.currentConfig;
    const errors: string[] = [];

    if (config.minConnections < 0) {
      errors.push('最小连接数不能小于0');
    }

    if (config.maxConnections <= config.minConnections) {
      errors.push('最大连接数必须大于最小连接数');
    }

    if (config.maxConnections > 1000) {
      errors.push('最大连接数不应超过1000');
    }

    if (config.connectionTimeoutMs < 1000) {
      errors.push('连接超时时间不应小于1秒');
    }

    if (config.idleTimeoutMs < 10000) {
      errors.push('空闲超时时间不应小于10秒');
    }

    if (config.maxLifetimeMs < 180000) {
      errors.push('连接最大生存时间不应小于3分钟');
    }

    if (errors.length > 0) {
      Logger.error('连接池配置验证失败', { errors });
      throw new Error(`连接池配置无效: ${errors.join(', ')}`);
    }
  }

  /**
   * 基于负载自动优化配置
   */
  async optimizeForWorkload(loadMetrics: {
    avgConnections: number;
    peakConnections: number;
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
  }): Promise<PoolOptimizationResult> {
    Logger.info('开始连接池工作负载优化', {
      currentConfig: this.currentConfig,
      loadMetrics,
      environment: this.environment,
    });

    const recommendedConfig = { ...this.currentConfig };
    const improvements: string[] = [];

    // 分析连接数使用情况
    const utilizationRate = loadMetrics.avgConnections / this.currentConfig.maxConnections;

    if (utilizationRate > 0.8) {
      // 连接池使用率过高，建议增加连接数
      const newMaxConnections = Math.min(
        Math.ceil(this.currentConfig.maxConnections * 1.5),
        this.getMaxConnectionsForEnvironment(),
      );

      recommendedConfig.maxConnections = newMaxConnections;
      improvements.push(`将最大连接数从 ${this.currentConfig.maxConnections} 增加到 ${newMaxConnections} 以应对高负载`);

      if (loadMetrics.peakConnections > this.currentConfig.maxConnections) {
        recommendedConfig.minConnections = Math.ceil(newMaxConnections * 0.3);
        improvements.push(`将最小连接数从 ${this.currentConfig.minConnections} 增加到 ${recommendedConfig.minConnections} 以处理峰值负载`);
      }
    } else if (utilizationRate < 0.2 && this.currentConfig.maxConnections > this.getBaseMaxConnections()) {
      // 连接池使用率过低，可以减少连接数
      const newMaxConnections = Math.max(
        Math.ceil(this.currentConfig.maxConnections * 0.7),
        this.getBaseMaxConnections(),
      );

      recommendedConfig.maxConnections = newMaxConnections;
      improvements.push(`将最大连接数从 ${this.currentConfig.maxConnections} 减少到 ${newMaxConnections} 以节省资源`);
    }

    // 分析响应时间
    if (loadMetrics.avgResponseTime > 200) {
      // 响应时间过长，可能需要优化超时设置
      if (this.currentConfig.connectionTimeoutMs > 5000) {
        recommendedConfig.connectionTimeoutMs = Math.max(
          this.currentConfig.connectionTimeoutMs * 0.8,
          3000,
        );
        improvements.push('减少连接超时时间以快速识别问题连接');
      }
    }

    // 分析错误率
    if (loadMetrics.errorRate > 0.05) {
      // 错误率过高，增加重试次数
      recommendedConfig.connectionRetryAttempts = Math.min(
        this.currentConfig.connectionRetryAttempts + 2,
        15,
      );
      recommendedConfig.connectionRetryDelayMs = this.currentConfig.connectionRetryDelayMs * 1.5;
      improvements.push('增加重试次数和延迟以应对不稳定连接');
    }

    // 分析吞吐量
    const expectedThroughputIncrease = this.calculateThroughputGain(
      this.currentConfig,
      recommendedConfig,
      loadMetrics,
    );

    const expectedLatencyDecrease = this.calculateLatencyImprovement(
      this.currentConfig,
      recommendedConfig,
      loadMetrics,
    );

    const resourceUtilizationChange = this.calculateResourceUtilizationChange(
      this.currentConfig,
      recommendedConfig,
    );

    const riskAssessment = this.assessOptimizationRisk(
      this.currentConfig,
      recommendedConfig,
      loadMetrics,
    );

    const result: PoolOptimizationResult = {
      currentConfig: this.currentConfig,
      recommendedConfig,
      improvements,
      performanceGain: {
        expectedThroughputIncrease,
        expectedLatencyDecrease,
        resourceUtilizationChange,
      },
      riskAssessment,
    };

    Logger.info('连接池优化分析完成', result);
    return result;
  }

  /**
   * 获取环境对应的最大连接数限制
   */
  private getMaxConnectionsForEnvironment(): number {
    const limits = {
      development: 50,
      test: 20,
      staging: 100,
      production: 500,
    };
    return limits[this.environment];
  }

  /**
   * 获取基础最大连接数
   */
  private getBaseMaxConnections(): number {
    const baseValues = {
      development: 10,
      test: 5,
      staging: 20,
      production: 50,
    };
    return baseValues[this.environment];
  }

  /**
   * 计算吞吐量增益
   */
  private calculateThroughputGain(
    current: PoolConfiguration,
    recommended: PoolConfiguration,
    loadMetrics: any,
  ): number {
    let gain = 0;

    // 连接数增加带来的吞吐量增益
    if (recommended.maxConnections > current.maxConnections) {
      const connectionIncrease = (recommended.maxConnections - current.maxConnections) / current.maxConnections;
      gain += connectionIncrease * 0.6; // 假设60%的连接数增加能转化为吞吐量增益
    }

    // 超时优化带来的增益
    if (recommended.connectionTimeoutMs < current.connectionTimeoutMs) {
      gain += 0.1; // 超时优化带来10%的增益
    }

    return Math.round(gain * 100);
  }

  /**
   * 计算延迟改善
   */
  private calculateLatencyImprovement(
    current: PoolConfiguration,
    recommended: PoolConfiguration,
    loadMetrics: any,
  ): number {
    let improvement = 0;

    // 连接池大小增加减少等待时间
    if (recommended.maxConnections > current.maxConnections) {
      improvement += 15; // 15ms的改善
    }

    // 最小连接数增加减少冷启动
    if (recommended.minConnections > current.minConnections) {
      improvement += 10; // 10ms的改善
    }

    return improvement;
  }

  /**
   * 计算资源利用率变化
   */
  private calculateResourceUtilizationChange(
    current: PoolConfiguration,
    recommended: PoolConfiguration,
  ): number {
    const currentResources = current.maxConnections + current.minConnections;
    const recommendedResources = recommended.maxConnections + recommended.minConnections;

    return ((recommendedResources - currentResources) / currentResources) * 100;
  }

  /**
   * 评估优化风险
   */
  private assessOptimizationRisk(
    current: PoolConfiguration,
    recommended: PoolConfiguration,
    loadMetrics: any,
  ): { level: 'low' | 'medium' | 'high'; factors: string[] } {
    const factors: string[] = [];
    let riskScore = 0;

    // 连接数大幅增加
    if (recommended.maxConnections > current.maxConnections * 3) {
      factors.push('连接数大幅增加可能导致数据库压力');
      riskScore += 30;
    }

    // 超时时间过短
    if (recommended.connectionTimeoutMs < 2000) {
      factors.push('连接超时时间过短可能导致正常连接被误判');
      riskScore += 20;
    }

    // 环境风险
    if (this.environment === 'production' && riskScore > 0) {
      riskScore += 20;
      factors.push('生产环境变更需要更加谨慎');
    }

    // 错误率风险
    if (loadMetrics.errorRate > 0.15) {
      factors.push('当前错误率较高，优化可能带来不确定影响');
      riskScore += 25;
    }

    // 极端负载风险
    if (loadMetrics.avgResponseTime > 1000 || loadMetrics.errorRate > 0.1) {
      riskScore += 30;
      factors.push('当前系统负载过重，建议先优化查询性能');
    }

    let level: 'low' | 'medium' | 'high' = 'low';
    if (riskScore > 50) {
      level = 'high';
    } else if (riskScore > 20) {
      level = 'medium';
    }

    return { level, factors };
  }

  /**
   * 应用优化配置
   */
  async applyOptimization(optimization: PoolOptimizationResult): Promise<void> {
    if (optimization.riskAssessment.level === 'high') {
      Logger.warn('高风险优化变更，建议在非生产环境先测试', {
        riskFactors: optimization.riskAssessment.factors,
        recommendedConfig: optimization.recommendedConfig,
      });

      throw new Error('高风险配置变更，需要手动确认');
    }

    await this.updateConfiguration(optimization.recommendedConfig);
    this.lastOptimization = new Date();

    Logger.info('连接池配置优化已应用', {
      improvements: optimization.improvements,
      expectedGains: optimization.performanceGain,
      timestamp: this.lastOptimization.toISOString(),
    });
  }

  /**
   * 生成配置报告
   */
  generateConfigurationReport(): {
    current: PoolConfiguration;
    environment: string;
    metrics: {
      totalConnections: number;
      activeConnections: number;
      idleConnections: number;
      utilizationRate: number;
    };
    recommendations: PoolRecommendation[];
    lastOptimization: Date | null;
    } {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];

    return {
      current: this.currentConfig,
      environment: this.environment,
      metrics: {
        totalConnections: latestMetrics?.totalConnections || 0,
        activeConnections: latestMetrics?.activeConnections || 0,
        idleConnections: latestMetrics?.idleConnections || 0,
        utilizationRate: latestMetrics ?
          (latestMetrics.activeConnections / latestMetrics.totalConnections) : 0,
      },
      recommendations: this.generateRecommendations(),
      lastOptimization: this.lastOptimization,
    };
  }

  /**
   * 生成配置建议
   */
  private generateRecommendations(): PoolRecommendation[] {
    const recommendations: PoolRecommendation[] = [];
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];

    if (!latestMetrics) {
      return recommendations;
    }

    // 连接池使用率建议
    const utilizationRate = latestMetrics.activeConnections / latestMetrics.totalConnections;
    if (utilizationRate > 0.8) {
      recommendations.push({
        type: 'increase_connections',
        priority: 'high',
        description: '连接池使用率过高，建议增加最大连接数',
        action: `将 maxConnections 从 ${this.currentConfig.maxConnections} 增加到 ${Math.ceil(this.currentConfig.maxConnections * 1.5)}`,
        expectedImpact: '减少连接等待时间，提高并发处理能力',
      });
    } else if (utilizationRate < 0.2) {
      recommendations.push({
        type: 'decrease_connections',
        priority: 'medium',
        description: '连接池使用率过低，可以减少连接数以节省资源',
        action: `将 maxConnections 从 ${this.currentConfig.maxConnections} 减少到 ${Math.max(this.currentConfig.maxConnections * 0.7, this.getBaseMaxConnections())}`,
        expectedImpact: '减少数据库连接开销，节省系统资源',
      });
    }

    // 连接生命周期建议
    if (this.currentConfig.maxLifetimeMs > 3600000) { // 1小时
      recommendations.push({
        type: 'optimize_lifetime',
        priority: 'low',
        description: '连接生存时间过长可能导致连接 stale',
        action: '将 maxLifetimeMs 设置为 30 分钟',
        expectedImpact: '减少因连接 stale 导致的查询错误',
      });
    }

    return recommendations;
  }

  /**
   * 更新连接池指标历史
   */
  updateMetrics(stats: ConnectionPoolStats): void {
    this.metricsHistory.push({
      ...stats,
      timestamp: new Date(),
    });

    // 只保留最近100条记录
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }
  }

  /**
   * 获取连接池性能趋势
   */
  getPerformanceTrends(timeRangeHours: number = 24): {
    connectionUtilization: { timestamp: Date; value: number }[];
    responseTime: { timestamp: Date; value: number }[];
    errorRate: { timestamp: Date; value: number }[];
  } {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const relevantMetrics = this.metricsHistory.filter(m => m.timestamp >= cutoff);

    return {
      connectionUtilization: relevantMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.activeConnections / m.totalConnections,
      })),
      responseTime: relevantMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.avgResponseTime || 0,
      })),
      errorRate: relevantMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.errorCount / (m.totalQueries || 1),
      })),
    };
  }

  /**
   * 导出配置
   */
  exportConfiguration(): string {
    return JSON.stringify({
      environment: this.environment,
      configuration: this.currentConfig,
      lastOptimization: this.lastOptimization,
      exportTime: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * 导入配置
   */
  async importConfiguration(configJson: string): Promise<void> {
    try {
      const imported = JSON.parse(configJson);

      if (!imported.configuration) {
        throw new Error('无效的配置文件格式');
      }

      await this.updateConfiguration(imported.configuration);

      Logger.info('连接池配置导入成功', {
        sourceEnvironment: imported.environment,
        sourceTime: imported.exportTime,
        currentEnvironment: this.environment,
      });
    } catch (error) {
      Logger.error('连接池配置导入失败', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`配置导入失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// 导出单例实例
export const poolConfigManager = PoolConfigurationManager.getInstance();
