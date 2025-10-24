/**
 * 热门搜索查询API路由
 *
 * GET /api/v1/search/popular - 获取热门搜索查询
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchService } from '@/lib/services/search-service';
import { NoteError } from '@/types/note';

/**
 * 获取热门搜索查询
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

    // 2. 获取热门查询
    const popularQueries = searchService.getPopularQueries();

    // 3. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        queries: popularQueries,
      },
      message: `Found ${popularQueries.length} popular search queries`,
    });
  } catch (error) {
    console.error('Error getting popular search queries:', error);

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
          message:
            'An unexpected error occurred while fetching popular search queries',
        },
      },
      { status: 500 },
    );
  }
}
