/**
 * 笔记API路由 - 创建笔记和获取笔记列表
 *
 * POST /api/v1/notes - 创建新笔记
 * GET /api/v1/notes - 获取用户的笔记列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NoteService } from '@/lib/services/note-service';
import { PrismaClient } from '@prisma/client';
import {
  type CreateNoteRequest,
  type NoteQueryParams,
  NoteError,
  NOTE_ERRORS,
} from '@/types/note';

// 创建Prisma客户端和服务实例
const prisma = new PrismaClient();
const noteService = new NoteService(prisma);

/**
 * 创建新笔记
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
    const { title, content, categoryId, tags, metadata, status, isPublic } =
      body;

    // 3. 验证必需字段
    if (!title || !content) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Title and content are required',
          },
        },
        { status: 400 },
      );
    }

    // 4. 构建创建请求
    const createRequest: CreateNoteRequest = {
      title: title.trim(),
      content: content.trim(),
      categoryId: categoryId ? Number(categoryId) : undefined,
      tags: tags || [],
      metadata: metadata || {},
      status,
      isPublic: Boolean(isPublic),
    };

    // 5. 创建笔记
    const note = await noteService.createNote(session.user.id, createRequest);

    // 6. 返回成功响应
    return NextResponse.json(
      {
        success: true,
        data: note,
        message: 'Note created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating note:', error);

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
 * 获取笔记列表
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
    const queryParams: NoteQueryParams = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
      status: (searchParams.get('status') as any) || undefined,
      categoryId: searchParams.get('categoryId')
        ? Number(searchParams.get('categoryId'))
        : undefined,
      tags: searchParams.get('tags')
        ? searchParams
          .get('tags')
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
        : undefined,
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      includeContent: searchParams.get('includeContent') !== 'false',
    };

    // 3. 验证分页参数
    if (queryParams.page < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PAGE',
            message: 'Page must be greater than 0',
          },
        },
        { status: 400 },
      );
    }

    if (queryParams.limit < 1 || queryParams.limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LIMIT',
            message: 'Limit must be between 1 and 100',
          },
        },
        { status: 400 },
      );
    }

    // 4. 获取笔记列表
    const result = await noteService.getNotesByUserId(
      session.user.id,
      queryParams,
    );

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Notes retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting notes:', error);

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
