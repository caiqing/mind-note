/**
 * 自动保存API路由
 *
 * POST /api/v1/notes/[id]/autosave - 自动保存笔记
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NoteService } from '@/lib/services/note-service';
import { PrismaClient } from '@prisma/client';
import { type AutoSaveRequest, NoteError } from '@/types/note';

// 创建Prisma客户端和服务实例
const prisma = new PrismaClient();
const noteService = new NoteService(prisma);

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * 自动保存笔记
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // 3. 解析请求体
    const body = await request.json();
    const { title, content, tags, metadata } = body;

    // 4. 构建自动保存请求
    const autoSaveRequest: AutoSaveRequest = {};

    if (title !== undefined) {
      if (typeof title === 'string') {
        autoSaveRequest.title = title.trim();
      }
    }

    if (content !== undefined) {
      if (typeof content === 'string') {
        autoSaveRequest.content = content.trim();
      }
    }

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        autoSaveRequest.tags = tags.filter(
          (tag: any) => typeof tag === 'string' && tag.trim().length > 0,
        );
      }
    }

    if (metadata !== undefined) {
      if (typeof metadata === 'object' && metadata !== null) {
        autoSaveRequest.metadata = metadata;
      }
    }

    // 5. 检查是否有实际变化
    if (Object.keys(autoSaveRequest).length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          id,
          autoSaved: false,
          savedAt: new Date(),
          hasChanges: false,
        },
        message: 'No changes to save',
      });
    }

    // 6. 执行自动保存
    const result = await noteService.autoSave(
      id,
      session.user.id,
      autoSaveRequest,
    );

    // 7. 返回成功响应
    return NextResponse.json({
      success: true,
      data: result,
      message: result.autoSaved
        ? 'Note auto-saved successfully'
        : 'No changes to save',
    });
  } catch (error) {
    console.error('Error auto-saving note:', error);

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
          message: 'An unexpected error occurred during auto-save',
        },
      },
      { status: 500 },
    );
  }
}
