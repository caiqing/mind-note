/**
 * AI Classification API Route
 *
 * Provides AI-powered content categorization for notes
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { aiManager } from '@/lib/ai/ai-manager'
import logger from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify authentication
    const session = await authOptions.adapter?.getSession?.(request)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      content,
      existingCategories = [],
      existingTags = [],
      confidenceThreshold = 0.6,
      maxSuggestions = 3,
      forceProvider
    } = body

    // Validate required fields
    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    // Validate content length
    if (content.trim().length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Content too long. Maximum 10,000 characters allowed.' },
        { status: 400 }
      )
    }

    // Perform AI analysis
    const analysisResult = await aiManager.analyzeContent(content, {
      includeCategories: true,
      includeTags: false, // 分类API只返回分类
      includeSummary: false,
      existingCategories: existingCategories.map((cat: any) => ({
        id: cat.id,
        name: cat.name
      })),
      existingTags: existingTags,
      forceProvider
    })

    // Process and format results
    const categories = analysisResult.categories
      .filter(cat => cat.confidence >= confidenceThreshold)
      .slice(0, maxSuggestions)

    const result = {
      primaryCategory: categories[0] || null,
      alternativeCategories: categories.slice(1),
      metadata: {
        provider: analysisResult.metadata.provider,
        model: analysisResult.metadata.model,
        processingTime: analysisResult.metadata.processingTime,
        tokensUsed: analysisResult.metadata.tokensUsed,
        cost: analysisResult.metadata.cost
      }
    }

    // Log classification request for monitoring
    logger.info(`AI classification completed for user ${session.user.id}`, {
      contentLength: content.length,
      primaryCategory: result.primaryCategory?.categoryName,
      alternativeCount: result.alternativeCategories.length,
      provider: result.metadata.provider,
      processingTime: result.metadata.processingTime,
      cost: result.metadata.cost
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('AI classification error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
            metadata: { processingTime }
          },
          { status: 429 }
        )
      }

      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI service configuration error.',
            metadata: { processingTime }
          },
          { status: 503 }
        )
      }

      if (error.message.includes('timeout')) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI service timeout. Please try again.',
            metadata: { processingTime }
          },
          { status: 408 }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        metadata: { processingTime }
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}