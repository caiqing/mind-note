/**
 * Tags API Route
 *
 * Handles CRUD operations for note tags
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tags - Get user's tags
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { searchParams } = new URL(request.url)
      const includeStats = searchParams.get('includeStats') === 'true'
      const search = searchParams.get('search')
      const category = searchParams.get('category')
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

      // Build where clause
      const where: any = {
        createdBy: req.user.id
      }

      if (search) {
        where.name = {
          contains: search,
          mode: 'insensitive'
        }
      }

      if (category) {
        where.category = category
      }

      // Get tags with optional note count
      const tags = await prisma.tag.findMany({
        where,
        include: {
          _count: includeStats ? {
            select: {
              noteTags: true
            }
          } : false
        },
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit
      })

      return NextResponse.json({
        success: true,
        data: tags,
        message: '获取标签列表成功'
      })

    } catch (error) {
      console.error('GET /api/tags error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '获取标签列表失败'
      }, { status: 500 })
    }
  })
}

/**
 * POST /api/tags - Create new tag
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const body = await request.json()

      // Validate required fields
      if (!body.name?.trim()) {
        return NextResponse.json({
          success: false,
          error: '标签名称不能为空'
        }, { status: 400 })
      }

      if (body.name.trim().length > 30) {
        return NextResponse.json({
          success: false,
          error: '标签名称不能超过30字符'
        }, { status: 400 })
      }

      // Check for duplicate tag name
      const existingTag = await prisma.tag.findFirst({
        where: {
          name: body.name.trim(),
          createdBy: req.user.id
        }
      })

      if (existingTag) {
        return NextResponse.json({
          success: false,
          error: '标签名称已存在'
        }, { status: 409 })
      }

      // Create tag
      const tag = await prisma.tag.create({
        data: {
          name: body.name.trim(),
          color: body.color || '#6B7280',
          category: body.category || 'general',
          description: body.description?.trim() || null,
          createdBy: req.user.id
        }
      })

      return NextResponse.json({
        success: true,
        data: tag,
        message: '标签创建成功'
      }, { status: 201 })

    } catch (error) {
      console.error('POST /api/tags error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '创建标签失败'
      }, { status: 500 })
    }
  })
}