/**
 * Categories API Route
 *
 * Handles CRUD operations for note categories
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/categories - Get user's categories
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { searchParams } = new URL(request.url)
      const includeStats = searchParams.get('includeStats') === 'true'

      // Get categories with optional note count
      const categories = await prisma.category.findMany({
        where: {
          createdBy: req.user.id
        },
        include: {
          _count: includeStats ? {
            select: {
              notes: true
            }
          } : false,
          parent: {
            select: {
              id: true,
              name: true
            }
          },
          children: {
            select: {
              id: true,
              name: true,
              sortOrder: true
            },
            orderBy: {
              sortOrder: 'asc'
            }
          }
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' }
        ]
      })

      return NextResponse.json({
        success: true,
        data: categories,
        message: '获取分类列表成功'
      })

    } catch (error) {
      console.error('GET /api/categories error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '获取分类列表失败'
      }, { status: 500 })
    }
  })
}

/**
 * POST /api/categories - Create new category
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const body = await request.json()

      // Validate required fields
      if (!body.name?.trim()) {
        return NextResponse.json({
          success: false,
          error: '分类名称不能为空'
        }, { status: 400 })
      }

      if (body.name.trim().length > 50) {
        return NextResponse.json({
          success: false,
          error: '分类名称不能超过50字符'
        }, { status: 400 })
      }

      // Check for duplicate category name
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: body.name.trim(),
          createdBy: req.user.id
        }
      })

      if (existingCategory) {
        return NextResponse.json({
          success: false,
          error: '分类名称已存在'
        }, { status: 409 })
      }

      // Validate parent category if provided
      let parentCategory = null
      if (body.parentId) {
        parentCategory = await prisma.category.findFirst({
          where: {
            id: body.parentId,
            createdBy: req.user.id
          }
        })

        if (!parentCategory) {
          return NextResponse.json({
            success: false,
            error: '父分类不存在或无权限访问'
          }, { status: 400 })
        }
      }

      // Create category
      const category = await prisma.category.create({
        data: {
          name: body.name.trim(),
          description: body.description?.trim() || null,
          icon: body.icon || null,
          color: body.color || '#6B7280',
          parentId: body.parentId || null,
          sortOrder: body.sortOrder || 0,
          createdBy: req.user.id
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true
            }
          },
          children: {
            select: {
              id: true,
              name: true,
              sortOrder: true
            },
            orderBy: {
              sortOrder: 'asc'
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: category,
        message: '分类创建成功'
      }, { status: 201 })

    } catch (error) {
      console.error('POST /api/categories error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '创建分类失败'
      }, { status: 500 })
    }
  })
}