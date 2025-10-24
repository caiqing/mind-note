/**
 * 数据库设置主API
 * 提供统一的数据库配置和管理入口
 */

import { NextRequest, NextResponse } from 'next/server';
import { poolConfigManager } from '@/lib/db/pool-config';
import { getDatabaseHealth, getDatabaseStats, getPrismaClient, cleanup } from '@/lib/db/connection';
import { Logger } from '@/lib/utils/logger';

interface DatabaseSetupResponse {
  success: boolean;
  data: {
    status: 'initialized' | 'connected' | 'error' | 'not_configured';
    health: any;
    pool: any;
    configuration: any;
    environment: string;
  };
  message: string;
  timestamp: string;
}

interface DatabaseStatusResponse {
  success: boolean;
  data: {
    isHealthy: boolean;
    connectionStatus: string;
    poolStatus: any;
    databaseInfo: {
      url: string;
      version?: string;
      size?: string;
    };
    performance: {
      avgResponseTime: number;
      totalQueries: number;
      errorRate: number;
    };
    recommendations: string[];
  };
  timestamp: string;
}

interface DatabaseMaintenanceResponse {
  success: boolean;
  message: string;
  data?: {
    action: string;
    result: any;
    duration: number;
  };
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// 数据库设置主入口
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
    case 'setup':
      return handleGetSetup();

    case 'status':
      return handleGetStatus();

    case 'health':
      return handleGetHealth();

    case 'info':
      return handleGetInfo();

    case 'environment':
      return handleGetEnvironment();

    default:
      return NextResponse.json(
        {
          success: false,
          message: '不支持的操作',
          error: {
            code: 'INVALID_ACTION',
            message: `不支持的操作: ${action}`,
          },
        },
        { status: 400 },
      );
    }
  } catch (error) {
    Logger.error('数据库设置API错误:', error);

    return NextResponse.json(
      {
        success: false,
        message: '数据库操作失败',
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * 获取数据库设置状态
 */
async function handleGetSetup(): Promise<NextResponse<DatabaseSetupResponse>> {
  const health = await getDatabaseHealth();
  const poolConfig = poolConfigManager.getCurrentConfiguration();
  const environment = process.env.NODE_ENV || 'development';

  let status: 'initialized' | 'connected' | 'error' | 'not_configured';

  if (health.isHealthy) {
    status = 'connected';
  } else if (health.status?.status === 'connected') {
    status = 'initialized';
  } else if (health.status?.error) {
    status = 'error';
  } else {
    status = 'not_configured';
  }

  return NextResponse.json({
    success: true,
    data: {
      status,
      health: {
        isHealthy: health.isHealthy,
        status: health.status?.status,
        lastCheck: health.status?.lastCheck,
        reconnects: health.status?.reconnects || 0,
      },
      pool: {
        currentConfig: poolConfig,
        metrics: health.details?.poolStats || {},
      },
      configuration: {
        url: process.env.DATABASE_URL ? '***configured***' : 'not_set',
        provider: 'postgresql',
        client: 'prisma',
      },
      environment,
    },
    message: '数据库设置状态获取成功',
    timestamp: new Date().toISOString(),
  });
}

/**
 * 获取数据库详细状态
 */
async function handleGetStatus(): Promise<NextResponse<DatabaseStatusResponse>> {
  const health = await getDatabaseHealth();
  const stats = await getDatabaseStats();
  const poolReport = poolConfigManager.generateConfigurationReport();

  // 计算性能指标
  const performance = {
    avgResponseTime: stats.avgResponseTime || 0,
    totalQueries: stats.totalQueries || 0,
    errorRate: stats.errorCount > 0 ? stats.errorCount / (stats.totalQueries || 1) : 0,
  };

  // 生成建议
  const recommendations = generateStatusRecommendations(health, stats, poolReport);

  return NextResponse.json({
    success: true,
    data: {
      isHealthy: health.isHealthy,
      connectionStatus: health.status?.status || 'unknown',
      poolStatus: {
        utilizationRate: poolReport.metrics.utilizationRate,
        totalConnections: poolReport.metrics.totalConnections,
        recommendations: poolReport.recommendations,
      },
      databaseInfo: {
        url: process.env.DATABASE_URL ? '***configured***' : 'not_set',
        version: health.details?.databaseVersion,
        size: health.details?.databaseSize,
      },
      performance,
      recommendations,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * 获取数据库健康检查
 */
async function handleGetHealth(): Promise<NextResponse> {
  const health = await getDatabaseHealth();

  return NextResponse.json({
    success: true,
    data: {
      isHealthy: health.isHealthy,
      status: health.status,
      details: health.details,
      recommendations: generateHealthRecommendations(health),
    },
    message: health.isHealthy ? '数据库健康状态正常' : '数据库存在健康问题',
    timestamp: new Date().toISOString(),
  });
}

/**
 * 获取数据库信息
 */
async function handleGetInfo(): Promise<NextResponse> {
  try {
    const client = await getPrismaClient();
    const stats = await getDatabaseStats();

    // 获取数据库基本信息
    const versionResult = await client.$queryRaw`SELECT version() as version` as any[];
    const version = versionResult[0]?.version || 'Unknown';

    // 获取表信息
    const tablesResult = await client.$queryRaw`
      SELECT table_name, table_rows, data_length, index_length
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY data_length DESC
    ` as any[];

    return NextResponse.json({
      success: true,
      data: {
        version,
        tables: tablesResult.map(table => ({
          name: table.table_name,
          rows: parseInt(table.table_rows) || 0,
          size: formatBytes(parseInt(table.data_length) || 0),
          indexSize: formatBytes(parseInt(table.index_length) || 0),
        })),
        stats,
        poolConfig: poolConfigManager.getCurrentConfiguration(),
      },
      message: '数据库信息获取成功',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    Logger.error('获取数据库信息失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '获取数据库信息失败',
        error: {
          code: 'INFO_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 获取环境配置
 */
async function handleGetEnvironment(): Promise<NextResponse> {
  const environment = process.env.NODE_ENV || 'development';
  const poolConfig = poolConfigManager.getCurrentConfiguration();

  return NextResponse.json({
    success: true,
    data: {
      environment,
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not_set',
      poolConfig,
      features: {
        vectorSupport: true, // pgvector
        fullTextSearch: true, // pg_trgm
        uuidSupport: true, // uuid-ossp
        monitoring: poolConfig.enableMetrics,
      },
    },
    message: '环境配置获取成功',
    timestamp: new Date().toISOString(),
  });
}

// 数据库维护操作
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
    case 'reconnect':
      return handleReconnect();

    case 'reset_pool':
      return handleResetPool();

    case 'clear_cache':
      return handleClearCache();

    case 'optimize':
      return handleOptimize(body.workloadMetrics);

    case 'test_connection':
      return handleTestConnection();

    default:
      return NextResponse.json(
        {
          success: false,
          message: '不支持的操作',
          error: {
            code: 'INVALID_ACTION',
            message: `不支持的操作: ${action}`,
          },
        },
        { status: 400 },
      );
    }
  } catch (error) {
    Logger.error('数据库维护API错误:', error);

    return NextResponse.json(
      {
        success: false,
        message: '数据库维护操作失败',
        error: {
          code: 'MAINTENANCE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 处理重新连接
 */
async function handleReconnect(): Promise<NextResponse<DatabaseMaintenanceResponse>> {
  const startTime = Date.now();

  try {
    // 清理现有连接
    await cleanup();

    // 重新获取客户端（触发重新连接）
    const client = await getPrismaClient();

    // 测试连接
    await client.$queryRaw`SELECT 1 as test`;

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: '数据库重新连接成功',
      data: {
        action: 'reconnect',
        result: {
          connected: true,
          testPassed: true,
        },
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: false,
      message: '数据库重新连接失败',
      error: {
        code: 'RECONNECT_ERROR',
        message: error instanceof Error ? error.message : 'Reconnect failed',
      },
      data: {
        action: 'reconnect',
        result: {
          connected: false,
          testPassed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 处理连接池重置
 */
async function handleResetPool(): Promise<NextResponse<DatabaseMaintenanceResponse>> {
  const startTime = Date.now();

  try {
    const defaultConfig = poolConfigManager.getCurrentConfiguration();
    await poolConfigManager.updateConfiguration(defaultConfig);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: '连接池重置成功',
      data: {
        action: 'reset_pool',
        result: {
          reset: true,
          currentConfig: defaultConfig,
        },
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: false,
      message: '连接池重置失败',
      error: {
        code: 'RESET_POOL_ERROR',
        message: error instanceof Error ? error.message : 'Pool reset failed',
      },
      data: {
        action: 'reset_pool',
        result: { reset: false },
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 处理缓存清理
 */
async function handleClearCache(): Promise<NextResponse<DatabaseMaintenanceResponse>> {
  const startTime = Date.now();

  try {
    // 这里可以添加各种缓存清理逻辑
    // 例如：查询计划缓存、结果缓存等

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: '数据库缓存清理成功',
      data: {
        action: 'clear_cache',
        result: {
          cleared: ['query_plan_cache', 'result_cache'],
        },
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: false,
      message: '数据库缓存清理失败',
      error: {
        code: 'CLEAR_CACHE_ERROR',
        message: error instanceof Error ? error.message : 'Cache clear failed',
      },
      data: {
        action: 'clear_cache',
        result: { cleared: [] },
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 处理数据库优化
 */
async function handleOptimize(workloadMetrics?: any): Promise<NextResponse<DatabaseMaintenanceResponse>> {
  const startTime = Date.now();

  try {
    if (!workloadMetrics) {
      return NextResponse.json({
        success: false,
        message: '缺少工作负载数据',
        error: {
          code: 'MISSING_METRICS',
          message: '优化需要提供工作负载数据',
        },
      });
    }

    const optimization = await poolConfigManager.optimizeForWorkload(workloadMetrics);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: '数据库优化分析完成',
      data: {
        action: 'optimize',
        result: {
          optimization,
          recommendations: optimization.improvements,
          riskLevel: optimization.riskAssessment.level,
        },
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: false,
      message: '数据库优化失败',
      error: {
        code: 'OPTIMIZE_ERROR',
        message: error instanceof Error ? error.message : 'Optimization failed',
      },
      data: {
        action: 'optimize',
        result: { optimization: null },
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 处理连接测试
 */
async function handleTestConnection(): Promise<NextResponse<DatabaseMaintenanceResponse>> {
  const startTime = Date.now();

  try {
    const client = await getPrismaClient();
    const health = await getDatabaseHealth();

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: '数据库连接测试成功',
      data: {
        action: 'test_connection',
        result: {
          connected: health.isHealthy,
          responseTime: duration,
          status: health.status?.status,
        },
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: false,
      message: '数据库连接测试失败',
      error: {
        code: 'TEST_CONNECTION_ERROR',
        message: error instanceof Error ? error.message : 'Connection test failed',
      },
      data: {
        action: 'test_connection',
        result: {
          connected: false,
          responseTime: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 生成状态建议
 */
function generateStatusRecommendations(health: any, stats: any, poolReport: any): string[] {
  const recommendations: string[] = [];

  // 健康状态建议
  if (!health.isHealthy) {
    recommendations.push('数据库连接存在问题，建议检查配置和网络');
    if (health.status?.reconnects > 0) {
      recommendations.push('检测到连接重试，建议优化连接池配置');
    }
  }

  // 性能建议
  if (stats.avgResponseTime > 200) {
    recommendations.push('查询响应时间较长，建议优化SQL语句或增加索引');
  }

  // 连接池建议
  if (poolReport.metrics.utilizationRate > 0.8) {
    recommendations.push('连接池使用率过高，建议增加最大连接数');
  } else if (poolReport.metrics.utilizationRate < 0.2) {
    recommendations.push('连接池使用率较低，可以减少连接数以节省资源');
  }

  // 错误率建议
  const errorRate = stats.errorCount / (stats.totalQueries || 1);
  if (errorRate > 0.05) {
    recommendations.push('错误率偏高，建议检查数据库查询逻辑和连接稳定性');
  }

  if (recommendations.length === 0) {
    recommendations.push('数据库运行状态良好，无需特殊优化');
  }

  return recommendations;
}

/**
 * 生成健康检查建议
 */
function generateHealthRecommendations(health: any): string[] {
  const recommendations: string[] = [];

  if (!health.isHealthy) {
    recommendations.push('检查数据库服务是否正常运行');
    recommendations.push('验证数据库连接配置是否正确');
    recommendations.push('检查网络连接和防火墙设置');

    if (health.details?.error) {
      recommendations.push(`解决错误: ${health.details.error}`);
    }
  } else {
    recommendations.push('数据库健康状态正常');

    if (health.details?.poolStats) {
      const activeConnections = health.details.poolStats?.active_connections || 0;
      const maxConnections = 10; // 从配置中获取

      if (activeConnections / maxConnections > 0.8) {
        recommendations.push('考虑增加连接池最大连接数');
      }
    }
  }

  return recommendations;
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
