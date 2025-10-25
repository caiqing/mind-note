/**
 * AI Tag Generation API Route
 *
 * Provides AI-powered tag generation for notes
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { generateTags } from '@/lib/ai/tag-generator'
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
    const { content, existingTags, maxTags, confidenceThreshold } = body

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

    // Validate parameters
    if (maxTags !== undefined && (typeof maxTags !== 'number' || maxTags < 1 || maxTags > 20)) {
      return NextResponse.json(
        { success: false, error: 'maxTags must be a number between 1 and 20' },
        { status: 400 }
      )
    }

    if (confidenceThreshold !== undefined && (typeof confidenceThreshold !== 'number' || confidenceThreshold < 0 || confidenceThreshold > 1)) {
      return NextResponse.json(
        { success: false, error: 'confidenceThreshold must be a number between 0 and 1' },
        { status: 400 }
      )
    }

    // Generate tags
    const result = await generateTags(content, {
      existingTags: existingTags || [],
      maxTags: maxTags || 10,
      confidenceThreshold: confidenceThreshold || 0.5,
      includeNouns: true,
      includeVerbs: true,
      includeAdjectives: true,
      includeConcepts: true
    })

    // Log tag generation request for monitoring
    logger.info(`AI tag generation completed for user ${session.user.id}`, {
      contentLength: content.length,
      suggestedTagsCount: result.suggestedTags.length,
      processingTime: result.processingTime,
      tokensUsed: result.tokensUsed
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    logger.error('AI tag generation error:', error)

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