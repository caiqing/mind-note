/**
 * Individual Tag API Route
 *
 * Handles GET, PUT, DELETE operations for individual tags
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/tags/[id] - Get specific tag
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req) => {
    try {
      const { id } = await context.params
      const tagId = parseInt(id)

      if (isNaN(tagId)) {
        return NextResponse.json({
          success: false,
          error: '无效的标签ID'
        }, { status: 400 })
      }

      const tag = await prisma.tag.findFirst({
        where: {
          id: tagId,
          createdBy: req.user.id
        },
        include: {
          _count: {
            select: {
              noteTags: true
            }
          },
          noteTags: {
            include: {
              note: {
                select: {
                  id: true,
                  title: true,
                  updatedAt: true
                },
                orderBy: {
                  updatedAt: 'desc'
                },
                take: 10
              }
            }
          }
        }
      })

      if (!tag) {
        return NextResponse.json({
          success: false,
          error: '标签不存在或无权限访问'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: tag,
        message: '获取标签成功'
      })

    } catch (error) {
      console.error('GET /api/tags/[id] error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '获取标签失败'
      }, { status: 500 })
    }
  })
}

/**
 * PUT /api/tags/[id] - Update specific tag
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req) => {
    try {
      const { id } = await context.params
      const tagId = parseInt(id)
      const body = await request.json()

      if (isNaN(tagId)) {
        return NextResponse.json({
          success: false,
          error: '无效的标签ID'
        }, { status: 400 })
      }

      // Validate tag exists and user has permission
      const existingTag = await prisma.tag.findFirst({
        where: {
          id: tagId,
          createdBy: req.user.id
        }
      })

      if (!existingTag) {
        return NextResponse.json({
          success: false,
          error: '标签不存在或无权限访问'
        }, { status: 404 })
      }

      // Validate data if provided
      if (body.name !== undefined) {
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

        // Check for duplicate name (excluding current tag)
        const duplicateTag = await prisma.tag.findFirst({
          where: {
            name: body.name.trim(),
            createdBy: req.user.id,
            id: { not: tagId }
          }
        })

        if (duplicateTag) {
          return NextResponse.json({
            success: false,
            error: '标签名称已存在'
          }, { status: 409 })
        }
      }

      // Update tag
      const updateData: any = {}

      if (body.name !== undefined) updateData.name = body.name.trim()
      if (body.color !== undefined) updateData.color = body.color || '#6B7280'
      if (body.category !== undefined) updateData.category = body.category || 'general'
      if (body.description !== undefined) updateData.description = body.description?.trim() || null

      const tag = await prisma.tag.update({
        where: { id: tagId },
        data: updateData,
        include: {
          _count: {
            select: {
              noteTags: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: tag,
        message: '标签更新成功'
      })

    } catch (error) {
      console.error('PUT /api/tags/[id] error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '更新标签失败'
      }, { status: 500 })
    }
  })
}

/**
 * DELETE /api/tags/[id] - Delete specific tag
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req) => {
    try {
      const { id } = await context.params
      const tagId = parseInt(id)

      if (isNaN(tagId)) {
        return NextResponse.json({
          success: false,
          error: '无效的标签ID'
        }, { status: 400 })
      }

      // Validate tag exists and user has permission
      const existingTag = await prisma.tag.findFirst({
        where: {
          id: tagId,
          createdBy: req.user.id
        },
        include: {
          _count: {
            select: {
              noteTags: true
            }
          }
        }
      })

      if (!existingTag) {
        return NextResponse.json({
          success: false,
          error: '标签不存在或无权限访问'
        }, { status: 404 })
      }

      // Delete tag (cascade will handle noteTags)
      await prisma.tag.delete({
        where: { id: tagId }
      })

      return NextResponse.json({
        success: true,
        message: '标签删除成功'
      })

    } catch (error) {
      console.error('DELETE /api/tags/[id] error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '删除标签失败'
      }, { status: 500 })
    }
  })
}