/**
 * AI文本生成API路由
 * POST /api/ai/generate
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
      stream: body.stream || false,
      metadata: body.metadata
    }

    // 处理流式请求
    if (aiRequest.stream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of aiService.generateTextStream(aiRequest)) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`
              controller.enqueue(encoder.encode(data))
            }

            // 发送结束标记
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            const errorChunk = {
              type: 'error',
              error: error.message,
              done: true
            }
            const data = `data: ${JSON.stringify(errorChunk)}\n\n`
            controller.enqueue(encoder.encode(data))
            controller.close()
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    }

    // 处理普通请求
    const response = await aiService.generateText(aiRequest)

    return NextResponse.json(response, {
      status: response.success ? 200 : 500
    })

  } catch (error) {
    console.error('AI generation API error:', error)

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