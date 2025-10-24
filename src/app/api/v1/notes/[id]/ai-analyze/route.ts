/**
 * AI分析API路由
 *
 * POST /api/v1/notes/[id]/ai-analyze - 对笔记进行AI分析
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NoteService } from '@/lib/services/note-service';
import {
  aiAnalysisService,
  type AIAnalysisRequest as ServiceAIAnalysisRequest,
} from '@/lib/ai-analysis-service';
import { PrismaClient } from '@prisma/client';
import { NoteError } from '@/types/note';

// 创建服务实例
const prisma = new PrismaClient();
const noteService = new NoteService(prisma);

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * 对笔记进行AI分析
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

    // 3. 获取笔记内容
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

    // 4. 解析请求体
    const body = await request.json();
    const { operations = ['categorize', 'tag', 'summarize'], options = {} } =
      body;

    // 5. 验证操作类型
    const validOperations = [
      'categorize',
      'tag',
      'summarize',
      'keywords',
      'sentiment',
    ];
    const invalidOperations = operations.filter(
      op => !validOperations.includes(op),
    );
    if (invalidOperations.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_OPERATIONS',
            message: `Invalid operations: ${invalidOperations.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    // 6. 构建AI分析请求
    const analysisRequest: ServiceAIAnalysisRequest = {
      noteId: id,
      title: note.title,
      content: note.content,
      operations: operations,
      options: {
        language: options.language || 'zh',
        quality: options.quality || 'balanced',
        provider: options.provider,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      },
    };

    // 7. 执行AI分析
    const analysisResult = await aiAnalysisService.analyzeNote(analysisRequest);

    // 8. 如果分析成功，更新笔记的AI处理状态
    if (analysisResult.success && analysisResult.results) {
      try {
        const updateData: any = {
          aiProcessed: true,
          aiProcessedAt: new Date(),
        };

        // 更新分类
        if (analysisResult.results.category) {
          // 查找或创建分类
          const category = await prisma.category.findFirst({
            where: { name: analysisResult.results.category },
          });

          if (category) {
            updateData.categoryId = category.id;
          } else {
            const newCategory = await prisma.category.create({
              data: {
                name: analysisResult.results.category,
                color: generateCategoryColor(),
              },
            });
            updateData.categoryId = newCategory.id;
          }
        }

        // 更新标签
        if (
          analysisResult.results.tags &&
          analysisResult.results.tags.length > 0
        ) {
          const tags = await processTags(analysisResult.results.tags);
          updateData.tags = {
            connect: tags.map(tag => ({ id: tag.id })),
          };
        }

        // 更新AI摘要
        if (analysisResult.results.summary) {
          updateData.aiSummary = analysisResult.results.summary;
        }

        // 更新关键词
        if (
          analysisResult.results.keywords &&
          analysisResult.results.keywords.length > 0
        ) {
          updateData.aiKeywords = analysisResult.results.keywords;
        }

        // 更新情感分析
        if (analysisResult.results.sentiment) {
          updateData.aiSentiment = analysisResult.results.sentiment;
        }

        // 更新笔记
        await prisma.note.update({
          where: { id },
          data: updateData,
        });
      } catch (updateError) {
        console.error('Error updating note with AI results:', updateError);
        // 不影响API响应，只记录错误
      }
    }

    // 9. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        noteId: id,
        analysis: analysisResult,
        processed: analysisResult.success,
      },
      message: analysisResult.success
        ? 'AI analysis completed successfully'
        : 'AI analysis completed with some errors',
    });
  } catch (error) {
    console.error('Error analyzing note:', error);

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
          message: 'An unexpected error occurred during AI analysis',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 生成分类颜色
 */
function generateCategoryColor(): string {
  const colors = [
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F97316',
    '#6366F1',
    '#84CC16',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 处理标签
 */
async function processTags(tagNames: string[]): Promise<Array<{ id: number }>> {
  const tags: Array<{ id: number }> = [];

  for (const tagName of tagNames) {
    const trimmedTag = tagName.trim();
    if (trimmedTag.length === 0) {
      continue;
    }

    // 查找或创建标签
    let tag = await prisma.tag.findFirst({
      where: { name: trimmedTag },
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: {
          name: trimmedTag,
          color: generateTagColor(),
        },
      });
    }

    tags.push({ id: tag.id });
  }

  return tags;
}

/**
 * 生成标签颜色
 */
function generateTagColor(): string {
  const colors = [
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F97316',
    '#6366F1',
    '#84CC16',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
