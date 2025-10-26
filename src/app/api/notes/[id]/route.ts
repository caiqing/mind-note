import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 验证schema
const updateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').max(1000000, 'Content too long').optional(),
  categoryId: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
})

// GET /api/notes/[id] - 获取单个笔记
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const noteId = parseInt(id)

    if (isNaN(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID' },
        { status: 400 },
      )
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        categories: true,
        tags: {
          include: { tag: true },
        },
      },
    })

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 },
      )
    }

    // 增加浏览次数
    await prisma.note.update({
      where: { id: noteId },
      data: { viewCount: { increment: 1 } },
    })

    // 格式化数据
    const formattedNote = {
      ...note,
      tags: note.tags.map(nt => nt.tag.name),
    }

    return NextResponse.json(formattedNote)

  } catch (error) {
    console.error('Failed to fetch note:', error)
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 },
    )
  }
}

// PUT /api/notes/[id] - 更新笔记
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const noteId = parseInt(id)

    if (isNaN(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const validatedData = updateNoteSchema.parse(body)

    // 检查笔记是否存在
    const existingNote = await prisma.note.findUnique({
      where: { id: noteId },
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 },
      )
    }

    // 准备更新数据
    const updateData: any = {
      updatedAt: new Date(),
      version: { increment: 1 },
    }

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title
    }

    if (validatedData.content !== undefined) {
      updateData.content = validatedData.content
      updateData.contentPlain = validatedData.content.replace(/<[^>]*>/g, '')
      updateData.wordCount = validatedData.content.split(/\s+/).filter(word => word.length > 0).length
      updateData.readingTimeMinutes = Math.ceil(updateData.wordCount / 200)
    }

    if (validatedData.categoryId !== undefined) {
      updateData.categoryId = validatedData.categoryId
    }

    if (validatedData.isFavorite !== undefined) {
      updateData.isFavorite = validatedData.isFavorite
    }

    if (validatedData.isArchived !== undefined) {
      updateData.isArchived = validatedData.isArchived
    }

    // 处理标签更新
    if (validatedData.tags !== undefined) {
      // 先删除现有关联
      await prisma.noteTag.deleteMany({
        where: { noteId },
      })

      // 然后创建新关联
      if (validatedData.tags.length > 0) {
        updateData.tags = {
          connectOrCreate: validatedData.tags.map(tagName => ({
            where: { name: tagName },
            create: { name: tagName },
          })),
        }
      }
    }

    // 更新笔记
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
      include: {
        categories: true,
        tags: {
          include: { tag: true },
        },
      },
    })

    // 格式化返回数据
    const formattedNote = {
      ...updatedNote,
      tags: updatedNote.tags.map(nt => nt.tag.name),
    }

    return NextResponse.json(formattedNote)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      )
    }

    console.error('Failed to update note:', error)
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 },
    )
  }
}

// DELETE /api/notes/[id] - 删除笔记（软删除）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const noteId = parseInt(id)

    if (isNaN(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID' },
        { status: 400 },
      )
    }

    // 检查笔记是否存在
    const existingNote = await prisma.note.findUnique({
      where: { id: noteId },
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 },
      )
    }

    // 软删除 - 设置为已归档
    const deletedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        isArchived: true,
        updatedAt: new Date(),
      },
      include: {
        categories: true,
        tags: {
          include: { tag: true },
        },
      },
    })

    // 格式化返回数据
    const formattedNote = {
      ...deletedNote,
      tags: deletedNote.tags.map(nt => nt.tag.name),
    }

    return NextResponse.json({
      message: 'Note archived successfully',
      note: formattedNote,
    })

  } catch (error) {
    console.error('Failed to delete note:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 },
    )
  }
}
