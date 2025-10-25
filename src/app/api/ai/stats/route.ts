/**
 * AI服务统计API路由
 * GET /api/ai/stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { AIServiceAPI } from '@/lib/api/ai-service'

const aiService = AIServiceAPI.getInstance()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeRouting = searchParams.get('includeRouting') === 'true'
    const includeConversations = searchParams.get('includeConversations') === 'true'

    // 获取API统计信息
    const stats = aiService.getAPIStats()

    // 根据查询参数过滤返回的统计信息
    let filteredStats: any = {
      api: stats.api
    }

    if (includeRouting) {
      filteredStats.routing = stats.routing
    }

    if (includeConversations) {
      filteredStats.conversations = stats.conversations
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date(),
      stats: filteredStats
    })

  } catch (error) {
    console.error('AI stats API error:', error)

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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}