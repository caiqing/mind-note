// 批量情感分析API路由

import { NextRequest, NextResponse } from 'next/server'
import { sentimentService } from '@/lib/ai/services/sentiment-service'
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

    if (notes.length > 15) {
      return NextResponse.json(
        {
          error: {
            code: 'TOO_MANY_NOTES',
            message: 'Maximum 15 notes allowed per batch request for sentiment analysis'
          }
        },
        { status: 400 }
      )
    }

    // 验证每个笔记的必填字段
    for (const note of notes) {
      if (!note.id || !note.content) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_NOTE_FORMAT',
              message: 'Each note must have id and content fields',
              noteId: note.id
            }
          },
          { status: 400 }
        )
      }

      if (note.content.length < 10) {
        return NextResponse.json(
          {
            error: {
              code: 'CONTENT_TOO_SHORT',
              message: 'Content is too short for sentiment analysis (minimum 10 characters)',
              noteId: note.id
            }
          },
          { status: 400 }
        )
      }

      if (note.content.length > 10000) {
        return NextResponse.json(
          {
            error: {
              code: 'CONTENT_TOO_LONG',
              message: 'Content is too long for sentiment analysis (maximum 10000 characters)',
              noteId: note.id
            }
          },
          { status: 400 }
        )
      }
    }

    logger.info('开始处理批量情感分析请求', {
      userId: auth.userId,
      noteCount: notes.length,
      totalContentLength: notes.reduce((sum, note) => sum + note.content.length, 0)
    })

    // 生成批量情感分析
    const results = await sentimentService.analyzeBatchSentiment(notes)

    // 统计结果
    const successCount = results.filter(r => r.result).length
    const failedCount = results.length - successCount

    // 生成统计摘要
    const successfulResults = results.filter(r => r.result).map(r => r.result!)
    const sentimentSummary = this.generateSentimentSummary(successfulResults)

    // 记录成功
    logger.info('批量情感分析请求处理成功', {
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
        },
        sentimentSummary
      },
      metadata: {
        requestId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        processingTime: Date.now() - startTime,
        userId: auth.userId
      }
    })

  } catch (error) {
    logger.error('批量情感分析API错误', {
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime
    })

    return errorHandler(error)
  }
}

/**
 * 生成情感分析摘要
 */
function generateSentimentSummary(results: any[]) {
  if (results.length === 0) {
    return {
      totalSentiments: { positive: 0, negative: 0, neutral: 0 },
      averageScore: 0,
      averageConfidence: 0,
      averageMagnitude: 0,
      emotionDistribution: {},
      sentimentRange: { min: 0, max: 0 }
    }
  }

  const totalSentiments = results.reduce((acc, result) => {
    acc[result.polarity]++
    return acc
  }, { positive: 0, negative: 0, neutral: 0 })

  const averageScore = results.reduce((sum, result) => sum + result.score, 0) / results.length
  const averageConfidence = results.reduce((sum, result) => sum + result.confidence, 0) / results.length
  const averageMagnitude = results.reduce((sum, result) => sum + result.magnitude, 0) / results.length

  const scores = results.map(r => r.score)
  const sentimentRange = {
    min: Math.min(...scores),
    max: Math.max(...scores)
  }

  // 情感类型分布
  const emotionDistribution: Record<string, number> = {}
  results.forEach(result => {
    if (result.emotions) {
      result.emotions.forEach((emotion: any) => {
        emotionDistribution[emotion.emotion] = (emotionDistribution[emotion.emotion] || 0) + 1
      })
    }
  })

  return {
    totalSentiments,
    averageScore,
    averageConfidence,
    averageMagnitude,
    emotionDistribution,
    sentimentRange,
    mostCommonSentiment: Object.entries(totalSentiments).reduce((a, b) =>
      totalSentiments[a[0] as keyof typeof totalSentiments] > totalSentiments[b[0] as keyof typeof totalSentiments] ? a : b
    )[0] as 'positive' | 'negative' | 'neutral'
  }
}