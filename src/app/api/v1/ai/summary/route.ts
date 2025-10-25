// 摘要生成API路由

import { NextRequest, NextResponse } from 'next/server'
import { summaryService } from '@/lib/ai/services/summary-service'
import { authenticateRequest } from '@/lib/ai/middleware/auth'
import { errorHandler } from '@/lib/ai/middleware'
import { validateAnalysisRequest } from '@/lib/ai/middleware/input-validation'
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

    // 解析和验证请求体
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body'
          }
        },
        { status: 400 }
      )
    }

    const { noteId, noteTitle, noteContent, options = {} } = body

    // 综合输入验证
    const validationResult = validateAnalysisRequest({
      userId: auth.userId,
      noteId,
      noteTitle,
      noteContent,
      options
    })

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: validationResult.errors
          }
        },
        { status: 400 }
      )
    }

    // 使用清理后的数据
    const { noteId: cleanNoteId, noteTitle: cleanNoteTitle, noteContent: cleanNoteContent, options: cleanOptions } = validationResult.sanitizedData!

    // 额外的摘要特定验证
    if (cleanOptions.maxLength && (cleanOptions.maxLength < 50 || cleanOptions.maxLength > 1000)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_MAX_LENGTH',
            message: 'Maximum length must be between 50 and 1000 characters'
          }
        },
        { status: 400 }
      )
    }

    logger.info('开始处理摘要生成请求', {
      userId: auth.userId,
      noteId: cleanNoteId,
      title: cleanNoteTitle,
      contentLength: cleanNoteContent.length,
      options: cleanOptions
    })

    // 生成摘要
    const result = await summaryService.generateSummary(
      cleanNoteId,
      cleanNoteTitle,
      cleanNoteContent,
      cleanOptions
    )

    // 记录成功
    logger.info('摘要生成请求处理成功', {
      userId: auth.userId,
      noteId,
      provider: result.provider,
      quality: result.quality.overall,
      processingTime: Date.now() - startTime
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
    logger.error('摘要生成API错误', {
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
        name: 'AI Summary API',
        version: '1.0.0',
        description: '智能文本摘要生成服务',
        endpoints: {
          generate: 'POST /api/v1/ai/summary',
          batch: 'POST /api/v1/ai/summary/batch',
          compare: 'POST /api/v1/ai/summary/compare'
        },
        options: {
          maxLength: {
            type: 'number',
            range: [50, 1000],
            default: 200,
            description: '摘要最大长度'
          },
          language: {
            type: 'string',
            enum: ['zh', 'en', 'auto'],
            default: 'zh',
            description: '摘要语言'
          },
          style: {
            type: 'string',
            enum: ['concise', 'detailed', 'bullet', 'paragraph'],
            default: 'paragraph',
            description: '摘要风格'
          },
          includeKeyPoints: {
            type: 'boolean',
            default: false,
            description: '是否包含关键要点'
          },
          targetAudience: {
            type: 'string',
            enum: ['general', 'technical', 'executive'],
            default: 'general',
            description: '目标受众'
          }
        },
        supportedProviders: ['openai', 'anthropic'],
        rateLimit: {
          requests: 10,
          window: '1m',
          perUser: true
        }
      }
    })

  } catch (error) {
    logger.error('摘要API信息获取失败', { error: error.message })
    return errorHandler(error)
  }
}