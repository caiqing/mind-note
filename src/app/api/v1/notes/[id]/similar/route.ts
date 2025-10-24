/**
 * 相似笔记API路由
 *
 * GET /api/v1/notes/[id]/similar - 获取相似笔记
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NoteService } from '@/lib/services/note-service';
import { PrismaClient } from '@prisma/client';
import { type SimilarNotesRequest, NoteError } from '@/types/note';

// 创建Prisma客户端和服务实例
const prisma = new PrismaClient();
const noteService = new NoteService(prisma);

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * 获取相似笔记
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = params;

    // 2. 验证笔记ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_ID', message: 'Valid note ID is required' },
        },
        { status: 400 },
      );
    }

    // 3. 解析查询参数
    const { searchParams } = new URL(request.url);
    const queryParams: SimilarNotesRequest = {
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 10,
      excludeProcessed: searchParams.get('excludeProcessed') === 'true',
      minSimilarity: searchParams.get('minSimilarity')
        ? Number(searchParams.get('minSimilarity'))
        : 0.3,
    };

    // 4. 验证查询参数
    if (queryParams.limit < 1 || queryParams.limit > 50) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LIMIT',
            message: 'Limit must be between 1 and 50',
          },
        },
        { status: 400 },
      );
    }

    if (queryParams.minSimilarity < 0 || queryParams.minSimilarity > 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SIMILARITY',
            message: 'Minimum similarity must be between 0 and 1',
          },
        },
        { status: 400 },
      );
    }

    // 5. 获取相似笔记
    const result = await noteService.getSimilarNotes(
      id,
      session.user.id,
      queryParams,
    );

    // 6. 返回成功响应
    return NextResponse.json({
      success: true,
      data: result,
      message: `Found ${result.similarNotes.length} similar notes`,
    });
  } catch (error) {
    console.error('Error getting similar notes:', error);

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
          message: 'An unexpected error occurred while finding similar notes',
        },
      },
      { status: 500 },
    );
  }
}
