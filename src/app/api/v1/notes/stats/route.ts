/**
 * 笔记统计API路由
 *
 * GET /api/v1/notes/stats - 获取笔记统计信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NoteService } from '@/lib/services/note-service';
import { PrismaClient } from '@prisma/client';
import { NoteError } from '@/types/note';

// 创建Prisma客户端和服务实例
const prisma = new PrismaClient();
const noteService = new NoteService(prisma);

/**
 * 获取笔记统计信息
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
    const period = searchParams.get('period') || undefined;

    // 3. 验证period参数
    const validPeriods = ['week', 'month', 'quarter', 'year'];
    if (period && !validPeriods.includes(period)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PERIOD',
            message: `Invalid period: ${period}. Valid periods: ${validPeriods.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    // 4. 获取统计信息
    const stats = await noteService.getNoteStats(session.user.id, period);

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Statistics retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting note stats:', error);

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
          message: 'An unexpected error occurred while retrieving statistics',
        },
      },
      { status: 500 },
    );
  }
}
