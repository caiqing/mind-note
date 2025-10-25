/**
 * Search Suggestions API Route
 *
 * Provides search suggestions and autocomplete functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { getSearchSuggestions } from '@/lib/search/full-text'
import { PrismaClient } from '@prisma/client'
import logger from '@/lib/utils/logger'

const prisma = new PrismaClient()

export interface SuggestionsRequest {
  query: string
  userId: string
  limit?: number
  type?: 'recent' | 'popular' | 'smart'
}

export interface SuggestionsResponse {
  success: boolean
  data?: {
    suggestions: string[]
    categories: Array<{
      id: string
      name: string
      count: number
    }>
    tags: Array<{
      id: string
      name: string
      count: number
      color: string
    }>
  }
  error?: string
}

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
    const body: SuggestionsRequest = await request.json()
    const {
      query,
      userId,
      limit = 10,
      type = 'smart'
    } = body

    // Validate required fields
    if (!userId || userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    // Validate parameters
    if (limit !== undefined && (typeof limit !== 'number' || limit < 1 || limit > 50)) {
      return NextResponse.json(
        { success: false, error: 'limit must be a number between 1 and 50' },
        { status: 400 }
      )
    }

    const validTypes = ['recent', 'popular', 'smart']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid suggestion type' },
        { status: 400 }
      )
    }

    let suggestions: string[] = []
    let categories: Array<{ id: string; name: string; count: number }> = []
    let tags: Array<{ id: string; name: string; count: number; color: string }> = []

    // Get different types of suggestions
    if (type === 'recent' || type === 'smart') {
      // Get recent search suggestions (would typically query search logs)
      suggestions = await getSearchSuggestions(prisma, userId, Math.floor(limit / 2))
    }

    if (type === 'popular' || type === 'smart') {
      // Get popular categories and tags for this user
      try {
        const [userCategories, userTags] = await Promise.all([
          prisma.category.findMany({
            where: { userId },
            include: {
              _count: {
                select: { notes: true }
              }
            },
            orderBy: {
              notes: {
                _count: 'desc'
              }
            },
            take: Math.floor(limit / 2)
          }),
          prisma.tag.findMany({
            where: { userId },
            include: {
              _count: {
                select: { notes: true }
              }
            },
            orderBy: {
              notes: {
                _count: 'desc'
              }
            },
            take: Math.floor(limit / 2)
          })
        ])

        categories = userCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          count: cat._count.notes
        }))

        tags = userTags.map(tag => ({
          id: tag.id,
          name: tag.name,
          count: tag._count.notes,
          color: tag.color || '#3B82F6'
        }))

      } catch (dbError) {
        logger.error('Failed to fetch categories/tags for suggestions:', dbError)
      }
    }

    // Filter suggestions based on query if provided
    if (query?.trim()) {
      const queryLower = query.toLowerCase()
      suggestions = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(queryLower)
      )

      categories = categories.filter(category =>
        category.name.toLowerCase().includes(queryLower)
      )

      tags = tags.filter(tag =>
        tag.name.toLowerCase().includes(queryLower)
      )
    }

    // Limit results
    suggestions = suggestions.slice(0, limit)
    categories = categories.slice(0, Math.floor(limit / 2))
    tags = tags.slice(0, Math.floor(limit / 2))

    // Log suggestion request for monitoring
    logger.info(`Search suggestions generated for user ${userId}`, {
      query,
      type,
      suggestionsCount: suggestions.length,
      categoriesCount: categories.length,
      tagsCount: tags.length
    })

    const response: SuggestionsResponse = {
      success: true,
      data: {
        suggestions,
        categories,
        tags
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Search suggestions API error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}