/**
 * 批量向量嵌入管理API路由
 *
 * POST /api/v1/embeddings/batch - 批量生成向量嵌入
 * POST /api/v1/embeddings/rebuild - 重建向量搜索索引
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { VectorSearchService } from '@/lib/search/vector-search';
import { PrismaClient } from '@prisma/client';

// 创建服务实例
const prisma = new PrismaClient();
const vectorSearchService = new VectorSearchService(prisma);

/**
 * 批量生成向量嵌入
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
    const { noteIds, options = {} } = body;

    // 3. 验证参数
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

    // 4. 验证笔记所有权
    const notes = await prisma.note.findMany({
      where: {
        id: { in: noteIds },
        userId: session.user.id,
      },
      select: { id: true },
    });

    const validNoteIds = notes.map(note => note.id);
    const invalidNoteIds = noteIds.filter(id => !validNoteIds.includes(id));

    if (invalidNoteIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: `Access denied for notes: ${invalidNoteIds.join(', ')}`,
          },
        },
        { status: 403 },
      );
    }

    // 5. 检查哪些笔记已经有嵌入
    const existingEmbeddings = await prisma.note.findMany({
      where: {
        id: { in: validNoteIds },
        contentVector: { not: null },
      },
      select: { id: true },
    });

    const existingIds = existingEmbeddings.map(note => note.id);
    const noteIdsToProcess = validNoteIds.filter(
      id => !existingIds.includes(id),
    );

    if (noteIdsToProcess.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            processed: [],
            skipped: existingIds,
            message: 'All specified notes already have embeddings',
          },
        },
        { status: 200 },
      );
    }

    // 6. 执行批量嵌入生成
    const result =
      await vectorSearchService.generateBatchEmbeddings(noteIdsToProcess);

    // 7. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        processed: result.successful,
        failed: result.failed,
        skipped: existingIds,
        total: noteIds.length,
        summary: {
          successful: result.successful.length,
          failed: result.failed.length,
          skipped: existingIds.length,
        },
      },
      message: `Batch embedding generation completed: ${result.successful.length} successful, ${result.failed.length} failed`,
    });
  } catch (error) {
    console.error('Error generating batch embeddings:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'An unexpected error occurred during batch embedding generation',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 重建向量搜索索引
 */
export async function PUT(request: NextRequest) {
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
    const { force = false, options = {} } = body;

    // 3. 检查是否有权限（只有管理员可以重建索引）
    // 这里简化处理，实际应用中应该检查用户角色
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        { status: 403 },
      );
    }

    // 4. 重建索引
    console.log('Starting vector search index rebuild...');
    const startTime = Date.now();

    await vectorSearchService.rebuildIndex();

    const rebuildTime = Date.now() - startTime;

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        rebuilt: true,
        rebuildTime,
        timestamp: new Date().toISOString(),
      },
      message: `Vector search index rebuilt successfully in ${rebuildTime}ms`,
    });
  } catch (error) {
    console.error('Error rebuilding vector search index:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while rebuilding the index',
        },
      },
      { status: 500 },
    );
  }
}
