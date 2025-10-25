// 批量摘要生成API路由

import { NextRequest, NextResponse } from 'next/server'
import { summaryService } from '@/lib/ai/services/summary-service'
import { authenticateRequest } from '@/lib/ai/middleware/auth'
import { errorHandler } from '@/lib/ai/middleware'
import { logger } from '@/lib/ai/services'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 认证检查
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const { notes } = body

    // 验证必填字段
    if (!notes || !Array.isArray(notes)) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_NOTES_ARRAY',
            message: 'Missing or invalid notes array'
          }
        },
        { status: 400 }
      )
    }

    // 验证笔记数量
    if (notes.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'EMPTY_NOTES_ARRAY',
            message: 'Notes array cannot be empty'
          }
        },
        { status: 400 }
      )
    }

    if (notes.length > 20) {
      return NextResponse.json(
        {
          error: {
            code: 'TOO_MANY_NOTES',
            message: 'Maximum 20 notes allowed per batch request'
          }
        },
        { status: 400 }
      )
    }

    // 验证每个笔记的必填字段
    for (const note of notes) {
      if (!note.id || !note.title || !note.content) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_NOTE_FORMAT',
              message: 'Each note must have id, title, and content fields',
              noteId: note.id
            }
          },
          { status: 400 }
        )
      }

      if (note.content.length < 50) {
        return NextResponse.json(
          {
            error: {
              code: 'CONTENT_TOO_SHORT',
              message: 'Content is too short to generate a meaningful summary (minimum 50 characters)',
              noteId: note.id
            }
          },
          { status: 400 }
        )
      }

      if (note.content.length > 50000) {
        return NextResponse.json(
          {
            error: {
              code: 'CONTENT_TOO_LONG',
              message: 'Content is too long (maximum 50000 characters)',
              noteId: note.id
            }
          },
          { status: 400 }
        )
      }
    }

    logger.info('开始处理批量摘要生成请求', {
      userId: auth.userId,
      noteCount: notes.length,
      totalContentLength: notes.reduce((sum, note) => sum + note.content.length, 0)
    })

    // 生成批量摘要
    const results = await summaryService.generateBatchSummaries(notes)

    // 统计结果
    const successCount = results.filter(r => r.summary).length
    const failedCount = results.length - successCount

    // 记录成功
    logger.info('批量摘要生成请求处理成功', {
      userId: auth.userId,
      total: notes.length,
      success: successCount,
      failed: failedCount,
      processingTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total: notes.length,
          success: successCount,
          failed: failedCount,
          successRate: successCount / notes.length
        }
      },
      metadata: {
        requestId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        processingTime: Date.now() - startTime,
        userId: auth.userId
      }
    })

  } catch (error) {
    logger.error('批量摘要生成API错误', {
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime
    })

    return errorHandler(error)
  }
}