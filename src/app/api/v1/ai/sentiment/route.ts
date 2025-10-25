// 情感分析API路由

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
    const { noteId, noteContent, options = {} } = body

    // 验证必填字段
    if (!noteId || !noteContent) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Missing required fields: noteId, noteContent'
          }
        },
        { status: 400 }
      )
    }

    // 验证内容长度
    if (noteContent.length < 10) {
      return NextResponse.json(
        {
          error: {
            code: 'CONTENT_TOO_SHORT',
            message: 'Content is too short for sentiment analysis (minimum 10 characters)'
          }
        },
        { status: 400 }
      )
    }

    if (noteContent.length > 10000) {
      return NextResponse.json(
        {
          error: {
            code: 'CONTENT_TOO_LONG',
            message: 'Content is too long for sentiment analysis (maximum 10000 characters)'
          }
        },
        { status: 400 }
      )
    }

    // 验证选项
    if (options.customThresholds) {
      const { positive, negative, neutral } = options.customThresholds
      if (typeof positive !== 'number' || positive < -1 || positive > 1) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_THRESHOLD',
              message: 'Positive threshold must be a number between -1 and 1'
            }
          },
          { status: 400 }
        )
      }
      if (typeof negative !== 'number' || negative < -1 || negative > 1) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_THRESHOLD',
              message: 'Negative threshold must be a number between -1 and 1'
            }
          },
          { status: 400 }
        )
      }
      if (typeof neutral !== 'number' || neutral < -1 || neutral > 1) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_THRESHOLD',
              message: 'Neutral threshold must be a number between -1 and 1'
            }
          },
          { status: 400 }
        )
      }
    }

    logger.info('开始处理情感分析请求', {
      userId: auth.userId,
      noteId,
      contentLength: noteContent.length,
      options
    })

    // 进行情感分析
    const result = await sentimentService.analyzeSentiment(
      noteId,
      noteContent,
      options
    )

    // 记录成功
    logger.info('情感分析请求处理成功', {
      userId: auth.userId,
      noteId,
      sentiment: result.polarity,
      score: result.score,
      confidence: result.confidence,
      processingTime: result.metadata.processingTime
    })

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        processingTime: Date.now() - startTime,
        userId: auth.userId
      }
    })

  } catch (error) {
    logger.error('情感分析API错误', {
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime
    })

    return errorHandler(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    // 返回API信息
    return NextResponse.json({
      success: true,
      data: {
        name: 'AI Sentiment Analysis API',
        version: '1.0.0',
        description: '智能文本情感分析服务',
        endpoints: {
          analyze: 'POST /api/v1/ai/sentiment',
          batch: 'POST /api/v1/ai/sentiment/batch'
        },
        options: {
          language: {
            type: 'string',
            enum: ['zh', 'en', 'auto'],
            default: 'zh',
            description: '分析语言'
          },
          granularity: {
            type: 'string',
            enum: ['document', 'sentence', 'aspect'],
            default: 'document',
            description: '分析粒度'
          },
          includeEmotions: {
            type: 'boolean',
            default: false,
            description: '是否包含具体情感类型分析'
          },
          detailedAnalysis: {
            type: 'boolean',
            default: false,
            description: '是否提供详细分析说明'
          },
          customThresholds: {
            type: 'object',
            description: '自定义情感阈值',
            properties: {
              positive: { type: 'number', min: -1, max: 1 },
              negative: { type: 'number', min: -1, max: 1 },
              neutral: { type: 'number', min: -1, max: 1 }
            }
          }
        },
        supportedEmotions: [
          'joy', 'sadness', 'anger', 'fear',
          'surprise', 'disgust', 'trust', 'anticipation'
        ],
        sentimentTypes: ['positive', 'negative', 'neutral'],
        supportedProviders: ['openai', 'anthropic'],
        rateLimit: {
          requests: 15,
          window: '1m',
          perUser: true
        }
      }
    })

  } catch (error) {
    logger.error('情感分析API信息获取失败', { error: error.message })
    return errorHandler(error)
  }
}