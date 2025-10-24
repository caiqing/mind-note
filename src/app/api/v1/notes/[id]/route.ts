/**
 * 单个笔记API路由
 *
 * GET /api/v1/notes/[id] - 获取单个笔记
 * PUT /api/v1/notes/[id] - 更新笔记
 * DELETE /api/v1/notes/[id] - 删除笔记
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NoteService } from '@/lib/services/note-service';
import { PrismaClient } from '@prisma/client';
import { type UpdateNoteRequest, NoteError, NOTE_ERRORS } from '@/types/note';

// 创建Prisma客户端和服务实例
const prisma = new PrismaClient();
const noteService = new NoteService(prisma);

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * 获取单个笔记
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

    // 3. 获取笔记
    const note = await noteService.getNoteById(id, session.user.id);

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Note not found' },
        },
        { status: 404 },
      );
    }

    // 4. 返回成功响应
    return NextResponse.json({
      success: true,
      data: note,
      message: 'Note retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting note:', error);

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
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 更新笔记
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const { title, content, categoryId, tags, metadata, status, isPublic } =
      body;

    // 4. 验证至少有一个更新字段
    if (
      !title &&
      !content &&
      !categoryId &&
      !tags &&
      !metadata &&
      !status &&
      typeof isPublic === 'undefined'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_UPDATE_DATA',
            message: 'At least one field must be provided for update',
          },
        },
        { status: 400 },
      );
    }

    // 5. 构建更新请求
    const updateRequest: UpdateNoteRequest = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TITLE',
              message: 'Title must be a non-empty string',
            },
          },
          { status: 400 },
        );
      }
      updateRequest.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_CONTENT',
              message: 'Content must be a non-empty string',
            },
          },
          { status: 400 },
        );
      }
      updateRequest.content = content.trim();
    }

    if (categoryId !== undefined) {
      updateRequest.categoryId = categoryId ? Number(categoryId) : undefined;
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TAGS',
              message: 'Tags must be an array',
            },
          },
          { status: 400 },
        );
      }
      updateRequest.tags = tags.filter(
        (tag: any) => typeof tag === 'string' && tag.trim().length > 0,
      );
    }

    if (metadata !== undefined) {
      if (typeof metadata !== 'object' || metadata === null) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_METADATA',
              message: 'Metadata must be a valid object',
            },
          },
          { status: 400 },
        );
      }
      updateRequest.metadata = metadata;
    }

    if (status !== undefined) {
      updateRequest.status = status;
    }

    if (isPublic !== undefined) {
      updateRequest.isPublic = Boolean(isPublic);
    }

    // 6. 更新笔记
    const updatedNote = await noteService.updateNote(
      id,
      session.user.id,
      updateRequest,
    );

    // 7. 返回成功响应
    return NextResponse.json({
      success: true,
      data: updatedNote,
      message: 'Note updated successfully',
    });
  } catch (error) {
    console.error('Error updating note:', error);

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
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 删除笔记
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 3. 删除笔记
    const deleted = await noteService.deleteNote(id, session.user.id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Note not found' },
        },
        { status: 404 },
      );
    }

    // 4. 返回成功响应
    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting note:', error);

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
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 },
    );
  }
}
