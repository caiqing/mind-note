/**
 * 批量操作API路由
 *
 * POST /api/v1/notes/batch - 批量操作笔记
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NoteService } from '@/lib/services/note-service';
import { PrismaClient } from '@prisma/client';
import { type BatchOperationRequest, NoteError } from '@/types/note';

// 创建Prisma客户端和服务实例
const prisma = new PrismaClient();
const noteService = new NoteService(prisma);

/**
 * 批量操作笔记
 */
export async function POST(request: NextRequest) {
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

    // 2. 解析请求体
    const body = await request.json();
    const { noteIds, operation, data } = body;

    // 3. 验证必需字段
    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_NOTE_IDS',
            message: 'noteIds must be a non-empty array',
          },
        },
        { status: 400 },
      );
    }

    if (!operation || typeof operation !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'operation is required and must be a string',
          },
        },
        { status: 400 },
      );
    }

    // 4. 验证操作类型
    const validOperations = [
      'delete',
      'archive',
      'publish',
      'draft',
      'addTags',
      'removeTags',
    ];
    if (!validOperations.includes(operation)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNSUPPORTED_OPERATION',
            message: `Unsupported operation: ${operation}. Valid operations: ${validOperations.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    // 5. 验证noteIds数组长度
    if (noteIds.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOO_MANY_NOTES',
            message: 'Cannot process more than 100 notes at once',
          },
        },
        { status: 400 },
      );
    }

    // 6. 验证每个noteId
    for (const noteId of noteIds) {
      if (!noteId || typeof noteId !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_NOTE_ID',
              message: 'All note IDs must be non-empty strings',
            },
          },
          { status: 400 },
        );
      }
    }

    // 7. 验证操作数据
    if (
      (operation === 'addTags' || operation === 'removeTags') &&
      !data?.tags
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TAGS_DATA',
            message: 'Tags data is required for addTags/removeTags operations',
          },
        },
        { status: 400 },
      );
    }

    if (data?.tags && (!Array.isArray(data.tags) || data.tags.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TAGS_DATA',
            message: 'Tags must be a non-empty array',
          },
        },
        { status: 400 },
      );
    }

    // 8. 构建批量操作请求
    const batchRequest: BatchOperationRequest = {
      noteIds,
      operation: operation as any,
      data: data || {},
    };

    // 9. 执行批量操作
    const result = await noteService.batchOperation(
      session.user.id,
      batchRequest,
    );

    // 10. 返回成功响应
    return NextResponse.json({
      success: true,
      data: result,
      message: `Batch operation completed: ${result.summary.successful} successful, ${result.summary.failed} failed`,
    });
  } catch (error) {
    console.error('Error executing batch operation:', error);

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
          message: 'An unexpected error occurred during batch operation',
        },
      },
      { status: 500 },
    );
  }
}
