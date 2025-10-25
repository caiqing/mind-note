/**
 * AI对话API路由
 * POST /api/ai/chat
 */

import { NextRequest, NextResponse } from 'next/server'
import { AIServiceAPI } from '@/lib/api/ai-service'

const aiService = AIServiceAPI.getInstance()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证请求体
    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!body.conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    const userId = body.userId || 'anonymous'
    const conversationId = body.conversationId
    const message = body.message

    // 处理对话请求
    const response = await aiService.continueConversation(
      conversationId,
      message,
      userId,
      {
        preferences: body.preferences,
        constraints: body.constraints
      }
    )

    return NextResponse.json(response, {
      status: response.success ? 200 : 500
    })

  } catch (error) {
    console.error('AI chat API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    )
  }
}

// 获取对话历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const userId = searchParams.get('userId') || 'anonymous'

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // 获取对话历史
    const conversation = aiService.getConversationHistory(conversationId, userId)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(conversation)

  } catch (error) {
    console.error('AI chat history API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    )
  }
}

// 清除对话历史
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const userId = searchParams.get('userId') || 'anonymous'

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // 清除对话历史
    const success = aiService.clearConversation(conversationId, userId)

    if (!success) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('AI chat clear API error:', error)

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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}