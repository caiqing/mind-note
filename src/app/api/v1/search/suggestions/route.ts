/**
 * 搜索建议API路由
 *
 * GET /api/v1/search/suggestions - 获取搜索建议
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchService } from '@/lib/services/search-service';
import { NoteError } from '@/types/note';

/**
 * 获取搜索建议
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
    const query = searchParams.get('q');

    // 3. 验证查询参数
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message:
              'Query parameter "q" is required and must be a non-empty string',
          },
        },
        { status: 400 },
      );
    }

    // 4. 获取搜索建议
    const suggestions = await searchService.getLiveSuggestions(query.trim());

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        query: query.trim(),
        suggestions,
      },
      message: `Found ${suggestions.length} suggestions for "${query.trim()}"`,
    });
  } catch (error) {
    console.error('Error getting search suggestions:', error);

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
            'An unexpected error occurred while fetching search suggestions',
        },
      },
      { status: 500 },
    );
  }
}
