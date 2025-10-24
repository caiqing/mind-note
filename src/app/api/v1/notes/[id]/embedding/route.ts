/**
 * 向量嵌入管理API路由
 *
 * POST /api/v1/notes/[id]/embedding - 为笔记生成向量嵌入
 * PUT /api/v1/notes/[id]/embedding - 更新笔记的向量嵌入
 * DELETE /api/v1/notes/[id]/embedding - 删除笔记的向量嵌入
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { VectorSearchService } from '@/lib/search/vector-search';
import { PrismaClient } from '@prisma/client';

// 创建服务实例
const prisma = new PrismaClient();
const vectorSearchService = new VectorSearchService(prisma);

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * 为笔记生成向量嵌入
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

    // 3. 验证笔记所有权
    const note = await prisma.note.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Note not found' },
        },
        { status: 404 },
      );
    }

    // 4. 检查是否已经有嵌入
    if (note.contentVector) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMBEDDING_EXISTS',
            message: 'Note already has vector embedding. Use PUT to update it.',
          },
        },
        { status: 409 },
      );
    }

    // 5. 生成向量嵌入
    await vectorSearchService.generateEmbeddingForNote(id);

    // 6. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        noteId: id,
        embeddingGenerated: true,
      },
      message: 'Vector embedding generated successfully',
    });
  } catch (error) {
    console.error('Error generating embedding:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while generating embedding',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 更新笔记的向量嵌入
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

    // 3. 验证笔记所有权
    const note = await prisma.note.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Note not found' },
        },
        { status: 404 },
      );
    }

    // 4. 更新向量嵌入
    await vectorSearchService.updateNoteEmbedding(id);

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        noteId: id,
        embeddingUpdated: true,
      },
      message: 'Vector embedding updated successfully',
    });
  } catch (error) {
    console.error('Error updating embedding:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while updating embedding',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 删除笔记的向量嵌入
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

    // 3. 验证笔记所有权
    const note = await prisma.note.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Note not found' },
        },
        { status: 404 },
      );
    }

    // 4. 删除向量嵌入
    await prisma.note.update({
      where: { id },
      data: {
        contentVector: null,
      },
    });

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        noteId: id,
        embeddingDeleted: true,
      },
      message: 'Vector embedding deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting embedding:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while deleting embedding',
        },
      },
      { status: 500 },
    );
  }
}
