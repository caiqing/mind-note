/**
 * Individual Note API Route
 *
 * Handles GET, PUT, DELETE operations for individual notes
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { noteServiceDB } from '@/lib/services/note-service-db'
import { UpdateNoteInput } from '@/types/note'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/notes/[id] - Get specific note
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req) => {
    try {
      const { id } = await context.params

      const note = await noteServiceDB.getNoteById(id, req.user.id)

      if (!note) {
        return NextResponse.json({
          success: false,
          error: '笔记不存在'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: note,
        message: '获取笔记成功'
      })

    } catch (error) {
      console.error('GET /api/notes/[id] error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '获取笔记失败'
      }, { status: 500 })
    }
  })
}

/**
 * PUT /api/notes/[id] - Update specific note
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req) => {
    try {
      const { id } = await context.params
      const body = await request.json()

      // Validate data if provided
      if (body.title !== undefined) {
        if (!body.title?.trim()) {
          return NextResponse.json({
            success: false,
            error: '标题不能为空'
          }, { status: 400 })
        }

        if (body.title.trim().length > 200) {
          return NextResponse.json({
            success: false,
            error: '标题不能超过200字符'
          }, { status: 400 })
        }
      }

      if (body.content !== undefined && !body.content?.trim()) {
        return NextResponse.json({
          success: false,
          error: '内容不能为空'
        }, { status: 400 })
      }

      const updateData: UpdateNoteInput = {}

      if (body.title !== undefined) updateData.title = body.title.trim()
      if (body.content !== undefined) updateData.content = body.content.trim()
      if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
      if (body.tags !== undefined) updateData.tags = body.tags
      if (body.metadata !== undefined) updateData.metadata = body.metadata
      if (body.status !== undefined) updateData.status = body.status
      if (body.isPublic !== undefined) updateData.isPublic = body.isPublic

      const note = await noteServiceDB.updateNote(id, updateData, req.user.id)

      return NextResponse.json({
        success: true,
        data: note,
        message: '笔记更新成功'
      })

    } catch (error) {
      console.error('PUT /api/notes/[id] error:', error)

      if (error instanceof Error) {
        if (error.message.includes('不存在') || error.message.includes('无权限')) {
          return NextResponse.json({
            success: false,
            error: error.message
          }, { status: 404 })
        }
      }

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '更新笔记失败'
      }, { status: 500 })
    }
  })
}

/**
 * DELETE /api/notes/[id] - Delete specific note
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req) => {
    try {
      const { id } = await context.params

      await noteServiceDB.deleteNote(id, req.user.id)

      return NextResponse.json({
        success: true,
        message: '笔记删除成功'
      })

    } catch (error) {
      console.error('DELETE /api/notes/[id] error:', error)

      if (error instanceof Error) {
        if (error.message.includes('不存在') || error.message.includes('无权限')) {
          return NextResponse.json({
            success: false,
            error: error.message
          }, { status: 404 })
        }
      }

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '删除笔记失败'
      }, { status: 500 })
    }
  })
}