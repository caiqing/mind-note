// 摘要对比生成API路由

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
    const { noteTitle, noteContent, providers = ['openai', 'anthropic'], options = {} } = body

    // 验证必填字段
    if (!noteTitle || !noteContent) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Missing required fields: noteTitle, noteContent'
          }
        },
        { status: 400 }
      )
    }

    // 验证内容长度
    if (noteContent.length < 50) {
      return NextResponse.json(
        {
          error: {
            code: 'CONTENT_TOO_SHORT',
            message: 'Content is too short to generate a meaningful summary (minimum 50 characters)'
          }
        },
        { status: 400 }
      )
    }

    if (noteContent.length > 50000) {
      return NextResponse.json(
        {
          error: {
            code: 'CONTENT_TOO_LONG',
            message: 'Content is too long (maximum 50000 characters)'
          }
        },
        { status: 400 }
      )
    }

    // 验证提供商
    const supportedProviders = ['openai', 'anthropic']
    const invalidProviders = providers.filter(p => !supportedProviders.includes(p))
    if (invalidProviders.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PROVIDERS',
            message: `Unsupported providers: ${invalidProviders.join(', ')}`,
            supportedProviders
          }
        },
        { status: 400 }
      )
    }

    if (providers.length < 2) {
      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_PROVIDERS',
            message: 'At least 2 providers are required for comparison'
          }
        },
        { status: 400 }
      )
    }

    logger.info('开始处理摘要对比生成请求', {
      userId: auth.userId,
      title: noteTitle,
      contentLength: noteContent.length,
      providers,
      options
    })

    // 生成对比摘要
    const results = await summaryService.generateComparativeSummaries(
      noteTitle,
      noteContent,
      providers,
      options
    )

    if (results.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_RESULTS',
            message: 'No summaries were generated successfully'
          }
        },
        { status: 500 }
      )
    }

    // 计算对比分析
    const comparison = {
      totalProviders: providers.length,
      successfulProviders: results.length,
      bestProvider: results[0].provider,
      bestQuality: results[0].summary.quality.overall,
      qualityRange: {
        min: Math.min(...results.map(r => r.summary.quality.overall)),
        max: Math.max(...results.map(r => r.summary.quality.overall)),
        average: results.reduce((sum, r) => sum + r.summary.quality.overall, 0) / results.length
      },
      lengthRange: {
        min: Math.min(...results.map(r => r.summary.metadata.summaryLength)),
        max: Math.max(...results.map(r => r.summary.metadata.summaryLength)),
        average: results.reduce((sum, r) => sum + r.summary.metadata.summaryLength, 0) / results.length
      },
      compressionRange: {
        min: Math.min(...results.map(r => r.summary.metadata.compressionRatio)),
        max: Math.max(...results.map(r => r.summary.metadata.compressionRatio)),
        average: results.reduce((sum, r) => sum + r.summary.metadata.compressionRatio, 0) / results.length
      }
    }

    // 记录成功
    logger.info('摘要对比生成请求处理成功', {
      userId: auth.userId,
      successfulProviders: results.length,
      bestProvider: comparison.bestProvider,
      bestQuality: comparison.bestQuality,
      processingTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: {
        results,
        comparison,
        recommendation: {
          provider: comparison.bestProvider,
          reason: `Highest quality score (${comparison.bestQuality.toFixed(2)}) and balanced compression ratio`,
          alternative: results.length > 1 ? results[1].provider : null
        }
      },
      metadata: {
        requestId: `compare_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        processingTime: Date.now() - startTime,
        userId: auth.userId
      }
    })

  } catch (error) {
    logger.error('摘要对比生成API错误', {
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime
    })

    return errorHandler(error)
  }
}