/**
 * Individual Category API Route
 *
 * Handles GET, PUT, DELETE operations for individual categories
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/categories/[id] - Get specific category
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req) => {
    try {
      const { id } = await context.params
      const categoryId = parseInt(id)

      if (isNaN(categoryId)) {
        return NextResponse.json({
          success: false,
          error: '无效的分类ID'
        }, { status: 400 })
      }

      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
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
              description: true,
              icon: true,
              color: true,
              sortOrder: true,
              _count: {
                select: {
                  notes: true
                }
              }
            },
            orderBy: {
              sortOrder: 'asc'
            }
          },
          _count: {
            select: {
              notes: true
            }
          }
        }
      })

      if (!category) {
        return NextResponse.json({
          success: false,
          error: '分类不存在或无权限访问'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: category,
        message: '获取分类成功'
      })

    } catch (error) {
      console.error('GET /api/categories/[id] error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '获取分类失败'
      }, { status: 500 })
    }
  })
}

/**
 * PUT /api/categories/[id] - Update specific category
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req) => {
    try {
      const { id } = await context.params
      const categoryId = parseInt(id)
      const body = await request.json()

      if (isNaN(categoryId)) {
        return NextResponse.json({
          success: false,
          error: '无效的分类ID'
        }, { status: 400 })
      }

      // Validate category exists and user has permission
      const existingCategory = await prisma.category.findFirst({
        where: {
          id: categoryId,
          createdBy: req.user.id
        }
      })

      if (!existingCategory) {
        return NextResponse.json({
          success: false,
          error: '分类不存在或无权限访问'
        }, { status: 404 })
      }

      // Validate data if provided
      if (body.name !== undefined) {
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

        // Check for duplicate name (excluding current category)
        const duplicateCategory = await prisma.category.findFirst({
          where: {
            name: body.name.trim(),
            createdBy: req.user.id,
            id: { not: categoryId }
          }
        })

        if (duplicateCategory) {
          return NextResponse.json({
            success: false,
            error: '分类名称已存在'
          }, { status: 409 })
        }
      }

      // Validate parent category if provided
      if (body.parentId !== undefined) {
        if (body.parentId !== null) {
          const parentCategory = await prisma.category.findFirst({
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

          // Prevent creating circular reference
          if (body.parentId === categoryId) {
            return NextResponse.json({
              success: false,
              error: '不能将分类设置为自己的子分类'
            }, { status: 400 })
          }
        }
      }

      // Update category
      const updateData: any = {}

      if (body.name !== undefined) updateData.name = body.name.trim()
      if (body.description !== undefined) updateData.description = body.description?.trim() || null
      if (body.icon !== undefined) updateData.icon = body.icon || null
      if (body.color !== undefined) updateData.color = body.color || '#6B7280'
      if (body.parentId !== undefined) updateData.parentId = body.parentId
      if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder

      const category = await prisma.category.update({
        where: { id: categoryId },
        data: updateData,
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
          },
          _count: {
            select: {
              notes: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: category,
        message: '分类更新成功'
      })

    } catch (error) {
      console.error('PUT /api/categories/[id] error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '更新分类失败'
      }, { status: 500 })
    }
  })
}

/**
 * DELETE /api/categories/[id] - Delete specific category
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req) => {
    try {
      const { id } = await context.params
      const categoryId = parseInt(id)

      if (isNaN(categoryId)) {
        return NextResponse.json({
          success: false,
          error: '无效的分类ID'
        }, { status: 400 })
      }

      // Validate category exists and user has permission
      const existingCategory = await prisma.category.findFirst({
        where: {
          id: categoryId,
          createdBy: req.user.id
        },
        include: {
          _count: {
            select: {
              notes: true,
              children: true
            }
          }
        }
      })

      if (!existingCategory) {
        return NextResponse.json({
          success: false,
          error: '分类不存在或无权限访问'
        }, { status: 404 })
      }

      // Check if category has notes or subcategories
      if (existingCategory._count.notes > 0) {
        return NextResponse.json({
          success: false,
          error: '该分类下还有笔记，无法删除。请先移动或删除相关笔记'
        }, { status: 400 })
      }

      if (existingCategory._count.children > 0) {
        return NextResponse.json({
          success: false,
          error: '该分类下还有子分类，无法删除。请先删除或移动子分类'
        }, { status: 400 })
      }

      // Delete category
      await prisma.category.delete({
        where: { id: categoryId }
      })

      return NextResponse.json({
        success: true,
        message: '分类删除成功'
      })

    } catch (error) {
      console.error('DELETE /api/categories/[id] error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '删除分类失败'
      }, { status: 500 })
    }
  })
}