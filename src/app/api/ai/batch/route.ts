/**
 * AI批量文本生成API路由
 * POST /api/ai/batch
 */

import { NextRequest, NextResponse } from 'next/server'
import { AIServiceAPI, BatchAIServiceRequest } from '@/lib/api/ai-service'

const aiService = AIServiceAPI.getInstance()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证请求体
    if (!body.requests || !Array.isArray(body.requests)) {
      return NextResponse.json(
        { error: 'Requests array is required' },
        { status: 400 }
      )
    }

    if (body.requests.length === 0) {
      return NextResponse.json(
        { error: 'Requests array cannot be empty' },
        { status: 400 }
      )
    }

    if (body.requests.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 requests allowed per batch' },
        { status: 400 }
      )
    }

    const batchRequest: BatchAIServiceRequest = {
      requests: body.requests,
      strategy: body.strategy || 'parallel',
      maxConcurrency: body.maxConcurrency || 3
    }

    // 处理批量请求
    const startTime = Date.now()
    const responses = await aiService.generateTextBatch(batchRequest)
    const totalTime = Date.now() - startTime

    const successCount = responses.filter(r => r.success).length
    const failureCount = responses.length - successCount

    const batchResponse = {
      batchId: `batch_${Date.now()}`,
      totalCount: responses.length,
      successCount,
      failureCount,
      totalTime,
      averageResponseTime: totalTime / responses.length,
      responses
    }

    return NextResponse.json(batchResponse, {
      status: successCount > 0 ? 200 : 500
    })

  } catch (error) {
    console.error('AI batch generation API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    )
  }
}

// 支持CORS预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}