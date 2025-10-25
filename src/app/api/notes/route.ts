/**
 * Notes API Route
 *
 * Handles CRUD operations for notes with database persistence
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { noteServiceDB } from '@/lib/services/note-service-db'
import { CreateNoteInput, NoteListFilters } from '@/types/note'

/**
 * GET /api/notes - Get notes with filters and pagination
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { searchParams } = new URL(request.url)

      // Parse query parameters
      const filters: NoteListFilters = {
        userId: req.user.id,
        categoryId: searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : undefined,
        tags: searchParams.get('tags')?.split(',') || undefined,
        status: searchParams.get('status') as any || undefined,
        isPublic: searchParams.get('isPublic') === 'true' ? true : undefined,
        search: searchParams.get('search') || undefined,
        dateRange: (searchParams.get('dateRange.start') || searchParams.get('dateRange.end')) ? {
          start: searchParams.get('dateRange.start') ? new Date(searchParams.get('dateRange.start')!) : undefined,
          end: searchParams.get('dateRange.end') ? new Date(searchParams.get('dateRange.end')!) : undefined
        } : undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
        offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
        sortBy: searchParams.get('sortBy') as any || 'updatedAt',
        sortOrder: searchParams.get('sortOrder') as any || 'desc'
      }

      const result = await noteServiceDB.getNotes(filters)

      return NextResponse.json({
        success: true,
        data: result,
        message: '获取笔记列表成功'
      })

    } catch (error) {
      console.error('GET /api/notes error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '获取笔记列表失败'
      }, { status: 500 })
    }
  })
}

/**
 * POST /api/notes - Create new note
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const body = await request.json()

      // Validate required fields
      if (!body.title?.trim() || !body.content?.trim()) {
        return NextResponse.json({
          success: false,
          error: '标题和内容不能为空'
        }, { status: 400 })
      }

      if (body.title.trim().length > 200) {
        return NextResponse.json({
          success: false,
          error: '标题不能超过200字符'
        }, { status: 400 })
      }

      const noteData: CreateNoteInput = {
        title: body.title.trim(),
        content: body.content.trim(),
        categoryId: body.categoryId,
        tags: body.tags || [],
        metadata: body.metadata || {},
        status: body.status || 'DRAFT',
        isPublic: body.isPublic || false
      }

      const note = await noteServiceDB.createNote(noteData)

      return NextResponse.json({
        success: true,
        data: note,
        message: '笔记创建成功'
      }, { status: 201 })

    } catch (error) {
      console.error('POST /api/notes error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '创建笔记失败'
      }, { status: 500 })
    }
  })
}