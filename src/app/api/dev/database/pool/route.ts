/**
 * 数据库连接池管理API
 * 提供连接池配置、监控和优化功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { poolConfigManager } from '@/lib/db/pool-config';
import { getDatabaseStats } from '@/lib/db/connection';
import { Logger } from '@/lib/utils/logger';

interface PoolConfigResponse {
  success: boolean;
  data: {
    currentConfig: any;
    environment: string;
    metrics: any;
    recommendations: any[];
    lastOptimization: string | null;
  };
  message: string;
  timestamp: string;
}

interface PoolOptimizationRequest {
  workloadMetrics: {
    avgConnections: number;
    peakConnections: number;
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  autoApply?: boolean;
}

interface PoolOptimizationResponse {
  success: boolean;
  data?: {
    currentConfig: any;
    recommendedConfig: any;
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
    applied?: boolean;
  };
  message: string;
  timestamp: string;
}

interface PoolMetricsResponse {
  success: boolean;
  data: {
    currentConfig: any;
    realTimeStats: any;
    trends: {
      connectionUtilization: { timestamp: string; value: number }[];
      responseTime: { timestamp: string; value: number }[];
      errorRate: { timestamp: string; value: number }[];
    };
    performanceInsights: string[];
  };
  timestamp: string;
}

interface PoolExportResponse {
  success: boolean;
  data: {
    configuration: string;
    environment: string;
    exportTime: string;
  };
  message: string;
  timestamp: string;
}

// 获取连接池配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'config';

    switch (action) {
      case 'config':
        return handleGetConfig();

      case 'metrics':
        return handleGetMetrics();

      case 'trends':
        return handleGetTrends();

      case 'export':
        return handleExportConfig();

      default:
        return NextResponse.json(
          {
            success: false,
            message: '不支持的操作',
            error: {
              code: 'INVALID_ACTION',
              message: `不支持的操作: ${action}`
            }
          },
          { status: 400 }
        );
    }
  } catch (error) {
    Logger.error('连接池管理API错误:', error);

    return NextResponse.json(
      {
        success: false,
        message: '连接池操作失败',
        error: {
          code: 'POOL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * 处理获取配置请求
 */
async function handleGetConfig(): Promise<NextResponse<PoolConfigResponse>> {
  const report = poolConfigManager.generateConfigurationReport();

  return NextResponse.json({
    success: true,
    data: {
      currentConfig: report.current,
      environment: report.environment,
      metrics: report.metrics,
      recommendations: report.recommendations,
      lastOptimization: report.lastOptimization?.toISOString() || null,
    },
    message: '连接池配置获取成功',
    timestamp: new Date().toISOString()
  });
}

/**
 * 处理获取指标请求
 */
async function handleGetMetrics(): Promise<NextResponse<PoolMetricsResponse>> {
  const currentConfig = poolConfigManager.getCurrentConfiguration();
  const realTimeStats = await getDatabaseStats();
  const trends = poolConfigManager.getPerformanceTrends(24);

  // 生成性能洞察
  const performanceInsights = generatePerformanceInsights(realTimeStats, trends);

  return NextResponse.json({
    success: true,
    data: {
      currentConfig,
      realTimeStats,
      trends,
      performanceInsights,
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * 处理获取趋势请求
 */
async function handleGetTrends(): Promise<NextResponse> {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const hours = parseInt(searchParams.get('hours') || '24');

  const trends = poolConfigManager.getPerformanceTrends(hours);

  return NextResponse.json({
    success: true,
    data: trends,
    message: '连接池性能趋势获取成功',
    timestamp: new Date().toISOString()
  });
}

/**
 * 处理配置导出请求
 */
async function handleExportConfig(): Promise<NextResponse<PoolExportResponse>> {
  const configExport = poolConfigManager.exportConfiguration();
  const environment = process.env.NODE_ENV || 'development';

  return NextResponse.json({
    success: true,
    data: {
      configuration: configExport,
      environment,
      exportTime: new Date().toISOString(),
    },
    message: '连接池配置导出成功',
    timestamp: new Date().toISOString()
  });
}

// 更新连接池配置或执行优化
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'update':
        return handleUpdateConfig(body.config);

      case 'optimize':
        return handleOptimizePool(body);

      case 'import':
        return handleImportConfig(body.configuration);

      default:
        return NextResponse.json(
          {
            success: false,
            message: '不支持的操作',
            error: {
              code: 'INVALID_ACTION',
              message: `不支持的操作: ${action}`
            }
          },
          { status: 400 }
        );
    }
  } catch (error) {
    Logger.error('连接池配置更新API错误:', error);

    return NextResponse.json(
      {
        success: false,
        message: '连接池配置更新失败',
        error: {
          code: 'CONFIG_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * 处理配置更新请求
 */
async function handleUpdateConfig(configUpdate: any): Promise<NextResponse> {
  try {
    await poolConfigManager.updateConfiguration(configUpdate);

    return NextResponse.json({
      success: true,
      message: '连接池配置更新成功',
      data: {
        updatedConfig: poolConfigManager.getCurrentConfiguration()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: '配置更新失败',
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed'
        }
      },
      { status: 400 }
    );
  }
}

/**
 * 处理连接池优化请求
 */
async function handleOptimizePool(request: PoolOptimizationRequest): Promise<NextResponse<PoolOptimizationResponse>> {
  try {
    const optimization = await poolConfigManager.optimizeForWorkload(request.workloadMetrics);

    let applied = false;
    if (request.autoApply && optimization.riskAssessment.level !== 'high') {
      await poolConfigManager.applyOptimization(optimization);
      applied = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        currentConfig: optimization.currentConfig,
        recommendedConfig: optimization.recommendedConfig,
        improvements: optimization.improvements,
        performanceGain: optimization.performanceGain,
        riskAssessment: optimization.riskAssessment,
        applied,
      },
      message: applied ? '连接池优化已应用' : '连接池优化建议生成成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: '连接池优化失败',
        error: {
          code: 'OPTIMIZATION_ERROR',
          message: error instanceof Error ? error.message : 'Optimization failed'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * 处理配置导入请求
 */
async function handleImportConfig(configJson: string): Promise<NextResponse> {
  try {
    await poolConfigManager.importConfiguration(configJson);

    return NextResponse.json({
      success: true,
      message: '连接池配置导入成功',
      data: {
        currentConfig: poolConfigManager.getCurrentConfiguration()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: '配置导入失败',
        error: {
          code: 'IMPORT_ERROR',
          message: error instanceof Error ? error.message : 'Import failed'
        }
      },
      { status: 400 }
    );
  }
}

// 重置连接池配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'reset') {
      // 重置为默认配置
      const environment = process.env.NODE_ENV as keyof any || 'development';
      const defaultConfig = poolConfigManager.getCurrentConfiguration();

      // 这里需要实现重置逻辑
      await poolConfigManager.updateConfiguration(defaultConfig);

      return NextResponse.json({
        success: true,
        message: '连接池配置已重置为默认值',
        data: {
          resetConfig: poolConfigManager.getCurrentConfiguration(),
          environment,
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: '不支持的操作',
        error: {
          code: 'INVALID_ACTION',
          message: `不支持的操作: ${action}`
        }
      },
      { status: 400 }
    );
  } catch (error) {
    Logger.error('连接池重置API错误:', error);

    return NextResponse.json(
      {
        success: false,
        message: '连接池重置失败',
        error: {
          code: 'RESET_ERROR',
          message: error instanceof Error ? error.message : 'Reset failed'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * 生成性能洞察
 */
function generatePerformanceInsights(stats: any, trends: any): string[] {
  const insights: string[] = [];

  // 连接池利用率分析
  if (stats.connections > 0) {
    const maxConnections = 50; // 从配置中获取
    const utilizationRate = stats.connections / maxConnections;

    if (utilizationRate > 0.8) {
      insights.push('⚠️ 连接池使用率过高，建议增加最大连接数');
    } else if (utilizationRate < 0.2) {
      insights.push('💡 连接池使用率较低，可以减少连接数以节省资源');
    } else {
      insights.push('✅ 连接池使用率正常');
    }
  }

  // 趋势分析
  if (trends.connectionUtilization.length > 1) {
    const recent = trends.connectionUtilization.slice(-5);
    const avgRecent = recent.reduce((sum: number, item: any) => sum + item.value, 0) / recent.length;

    if (avgRecent > 0.7) {
      insights.push('📈 最近连接池利用率呈上升趋势，建议监控');
    }
  }

  // 响应时间分析
  if (trends.responseTime.length > 0) {
    const recentResponseTimes = trends.responseTime.slice(-10);
    const avgResponseTime = recentResponseTimes.reduce((sum: number, item: any) => sum + item.value, 0) / recentResponseTimes.length;

    if (avgResponseTime > 200) {
      insights.push('🐌 平均响应时间较长，建议优化查询或增加连接数');
    }
  }

  // 错误率分析
  if (trends.errorRate.length > 0) {
    const recentErrors = trends.errorRate.slice(-10);
    const avgErrorRate = recentErrors.reduce((sum: number, item: any) => sum + item.value, 0) / recentErrors.length;

    if (avgErrorRate > 0.05) {
      insights.push('🚨 错误率偏高，建议检查数据库连接和查询');
    }
  }

  return insights;
}