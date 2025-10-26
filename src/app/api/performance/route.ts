/**
 * 性能监控API端点
 *
 * 收集和分析应用性能数据
 */

import { NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance/performance-monitor';

// 模拟性能数据存储（实际应用中应使用数据库）
let performanceData: any[] = [];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';

    switch (type) {
      case 'summary':
        return getPerformanceSummary();
      case 'detailed':
        return getDetailedMetrics();
      case 'recommendations':
        return getRecommendations();
      case 'core-web-vitals':
        return getCoreWebVitals();
      default:
        return getPerformanceSummary();
    }
  } catch (error) {
    console.error('Failed to get performance data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve performance data',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const metrics = await request.json();

    // 验证数据格式
    if (!Array.isArray(metrics)) {
      return NextResponse.json(
        { success: false, error: 'Invalid metrics format' },
        { status: 400 },
      );
    }

    // 存储性能数据
    performanceData.push({
      timestamp: new Date().toISOString(),
      metrics,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // 保持数据量在合理范围内
    if (performanceData.length > 1000) {
      performanceData = performanceData.slice(-500);
    }

    return NextResponse.json({
      success: true,
      message: 'Performance metrics recorded successfully',
      recorded: metrics.length,
    });
  } catch (error) {
    console.error('Failed to record performance metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record performance metrics',
      },
      { status: 500 },
    );
  }
}

async function getPerformanceSummary() {
  const report = performanceMonitor.generateReport();

  // 添加服务器端性能指标
  const serverMetrics = {
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    cpuUsage: process.cpuUsage(),
  };

  return NextResponse.json({
    success: true,
    data: {
      ...report.summary,
      serverMetrics,
      lastUpdated: new Date().toISOString(),
    },
  });
}

async function getDetailedMetrics() {
  const report = performanceMonitor.generateReport();
  const coreWebVitals = performanceMonitor.getCoreWebVitals();

  return NextResponse.json({
    success: true,
    data: {
      metrics: report.metrics,
      coreWebVitals,
      summary: report.summary,
    },
  });
}

async function getRecommendations() {
  const report = performanceMonitor.generateReport();

  return NextResponse.json({
    success: true,
    data: {
      recommendations: report.recommendations,
      summary: report.summary,
    },
  });
}

async function getCoreWebVitals() {
  const vitals = performanceMonitor.getCoreWebVitals();

  return NextResponse.json({
    success: true,
    data: {
      coreWebVitals: vitals,
      thresholds: {
        LCP: { good: 2500, needsImprovement: 4000 },
        FID: { good: 100, needsImprovement: 300 },
        CLS: { good: 0.1, needsImprovement: 0.25 },
      },
      assessment: assessCoreWebVitals(vitals),
    },
  });
}

function assessCoreWebVitals(vitals: any): {
  overall: 'good' | 'needs-improvement' | 'poor';
  details: Record<string, any>;
} {
  const details: Record<string, any> = {};
  let score = 0;

  // LCP assessment
  if (vitals.LCP) {
    if (vitals.LCP <= 2500) {
      details.LCP = { status: 'good', value: vitals.LCP };
      score += 1;
    } else if (vitals.LCP <= 4000) {
      details.LCP = { status: 'needs-improvement', value: vitals.LCP };
      score += 0.5;
    } else {
      details.LCP = { status: 'poor', value: vitals.LCP };
    }
  }

  // FID assessment
  if (vitals.FID) {
    if (vitals.FID <= 100) {
      details.FID = { status: 'good', value: vitals.FID };
      score += 1;
    } else if (vitals.FID <= 300) {
      details.FID = { status: 'needs-improvement', value: vitals.FID };
      score += 0.5;
    } else {
      details.FID = { status: 'poor', value: vitals.FID };
    }
  }

  // CLS assessment
  if (vitals.CLS) {
    if (vitals.CLS <= 0.1) {
      details.CLS = { status: 'good', value: vitals.CLS };
      score += 1;
    } else if (vitals.CLS <= 0.25) {
      details.CLS = { status: 'needs-improvement', value: vitals.CLS };
      score += 0.5;
    } else {
      details.CLS = { status: 'poor', value: vitals.CLS };
    }
  }

  const overall =
    score >= 2.5 ? 'good' : score >= 1.5 ? 'needs-improvement' : 'poor';

  return { overall, details };
}
