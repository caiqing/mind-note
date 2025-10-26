/**
 * 错误报告API端点
 *
 * 接收来自前端的错误报告，用于监控和调试
 */

import { NextResponse } from 'next/server';
import { errorHandler } from '@/lib/errors/error-handler';

export async function POST(request: Request) {
  try {
    const errorData = await request.json();

    // 验证必需字段
    if (!errorData.message) {
      return NextResponse.json(
        { success: false, error: 'Missing error message' },
        { status: 400 },
      );
    }

    // 记录错误到监控系统
    const appError = errorHandler.createError(
      'FRONTEND_ERROR',
      'CLIENT' as any,
      'MEDIUM' as any,
      `Frontend error: ${errorData.message}`,
      '前端出现错误，已记录并处理',
      {
        ...errorData,
        source: 'frontend',
        timestamp: new Date().toISOString(),
      },
      {
        path: errorData.url,
        userAgent: errorData.userAgent,
      },
    );

    // 在生产环境中，这里可以发送到外部监控服务
    if (process.env.NODE_ENV === 'production') {
      // TODO: 集成Sentry、LogRocket等服务
      console.log('Production error reported:', appError);
    }

    return NextResponse.json({
      success: true,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: '错误报告已收到，感谢您的反馈',
    });
  } catch (error) {
    console.error('Failed to process error report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process error report',
      },
      { status: 500 },
    );
  }
}

// 获取错误统计（仅限开发环境）
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 },
    );
  }

  try {
    const stats = errorHandler.getErrorStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get error stats',
      },
      { status: 500 },
    );
  }
}
