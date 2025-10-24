/**
 * 用户洞察API路由
 *
 * GET /api/v1/analytics/insights - 获取用户洞察
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyticsService } from '@/lib/services/analytics-service';
import { NoteError } from '@/types/note';

/**
 * 获取用户洞察
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 },
      );
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url);
    const timeRange =
      (searchParams.get('timeRange') as '7d' | '30d' | '90d' | '1y') || '30d';

    // 3. 验证时间范围
    const validTimeRanges = ['7d', '30d', '90d', '1y'];
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TIME_RANGE',
            message: `Invalid time range: ${timeRange}. Valid options: ${validTimeRanges.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    // 4. 获取用户洞察
    const userInsights = await analyticsService.getUserInsights(timeRange);

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        insights: userInsights,
      },
      message: `User insights for ${timeRange}`,
    });
  } catch (error) {
    console.error('Error getting user insights:', error);

    // 处理已知错误类型
    if (error instanceof NoteError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.statusCode },
      );
    }

    // 处理未知错误
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while fetching user insights',
        },
      },
      { status: 500 },
    );
  }
}
