/**
 * AI Classification API Route
 *
 * Provides AI-powered content categorization for notes
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { classifyContent } from '@/lib/ai/classifier'
import logger from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
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
    const { content, existingCategories, confidenceThreshold, maxSuggestions } = body

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

    // Perform classification
    const result = await classifyContent(content, {
      existingCategories,
      confidenceThreshold: confidenceThreshold || 0.6,
      maxSuggestions: maxSuggestions || 3
    })

    // Log classification request for monitoring
    logger.info(`AI classification completed for user ${session.user.id}`, {
      contentLength: content.length,
      primaryCategory: result.primaryCategory?.categoryName,
      alternativeCount: result.alternativeCategories.length,
      processingTime: Date.now() - Date.now() // This should be updated with actual timing
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    logger.error('AI classification error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      if (error.message.includes('API key')) {
        return NextResponse.json(
          { success: false, error: 'AI service configuration error.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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