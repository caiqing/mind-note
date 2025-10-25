/**
 * AI并发文本生成API路由
 * POST /api/ai/concurrent
 */

import { NextRequest, NextResponse } from 'next/server'
import { AIServiceAPI, AIServiceRequest } from '@/lib/api/ai-service'

const aiService = AIServiceAPI.getInstance()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证请求体
    if (!body.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const aiRequest: AIServiceRequest = {
      prompt: body.prompt,
      context: body.context,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      topP: body.topP,
      frequencyPenalty: body.frequencyPenalty,
      presencePenalty: body.presencePenalty,
      stop: body.stop,
      userId: body.userId || 'anonymous',
      sessionId: body.sessionId,
      preferences: body.preferences,
      constraints: body.constraints,
      metadata: body.metadata
    }

    const maxConcurrency = body.maxConcurrency || 2

    // 处理并发请求
    const response = await aiService.generateTextConcurrent(aiRequest, maxConcurrency)

    return NextResponse.json(response, {
      status: response.success ? 200 : 500
    })

  } catch (error) {
    console.error('AI concurrent generation API error:', error)

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