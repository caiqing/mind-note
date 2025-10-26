import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { databaseManager } from '@/lib/db/database-manager'

const prisma = new PrismaClient()

// 验证schema
const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required').max(1000000, 'Content too long'),
  categoryId: z.number().optional(),
  tags: z.array(z.string()).optional().default([]),
})

// GET /api/notes - 获取笔记列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId')
    const isFavorite = searchParams.get('isFavorite') === 'true'
    const isArchived = searchParams.get('isArchived') === 'true'

    // 构建查询条件
    const where: any = {}

    if (isArchived) {
      // 注意：数据库中没有isArchived字段，这个功能暂时不可用
    }

    if (isFavorite) {
      // 注意：数据库中没有isFavorite字段，这个功能暂时不可用
    }

    if (categoryId && parseInt(categoryId) > 0) {
      where.categoryId = parseInt(categoryId)
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    // 计算分页
    const skip = (page - 1) * limit

    // 查询数据库
    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.note.count({ where }),
    ])

    // 格式化数据
    const formattedNotes = notes.map(note => ({
      id: note.id,
      userId: note.userId,
      title: note.title,
      content: note.content,
      contentPlain: note.content.replace(/<[^>]*>/g, ''),
      categoryId: note.categoryId,
      tags: note.tags, // 直接使用tags数组
      metadata: note.metadata,
      aiProcessed: note.aiProcessed,
      aiSummary: note.aiSummary,
      aiKeywords: note.aiKeywords,
      version: note.version,
      status: note.status,
      isFavorite: false, // 数据库中没有这个字段
      isArchived: false, // 数据库中没有这个字段
      isPublic: note.isPublic,
      viewCount: note.viewCount,
      wordCount: note.content.split(/\s+/).filter(word => word.length > 0).length,
      readingTimeMinutes: Math.ceil(note.content.split(/\s+/).filter(word => word.length > 0).length / 200),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      aiProcessedAt: note.aiProcessedAt,
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      notes: formattedNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })

  } catch (error) {
    console.error('Failed to fetch notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 },
    )
  }
}

// POST /api/notes - 创建新笔记
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = createNoteSchema.parse(body)

    // 计算字数和阅读时间
    const wordCount = validatedData.content.split(/\s+/).filter(word => word.length > 0).length
    const readingTimeMinutes = Math.ceil(wordCount / 200) // 假设200字/分钟

    // 生成内容哈希（用于重复检测和版本控制）
    const crypto = require('crypto')
    const contentHash = crypto.createHash('md5').update(validatedData.content).digest('hex')

    // 创建笔记
    const newNote = await prisma.note.create({
      data: {
        id: crypto.randomUUID(), // 生成UUID作为主键
        userId: 'demo-user', // 使用现有的用户ID
        title: validatedData.title,
        content: validatedData.content,
        contentHash,
        categoryId: validatedData.categoryId || null,
        tags: validatedData.tags, // 直接使用tags数组字段
        metadata: {},
        aiProcessed: false,
        aiSummary: null,
        aiKeywords: [],
        version: 1,
        status: 'DRAFT',
        isPublic: false,
        viewCount: 0,
      },
    })

    // 格式化返回数据
    const formattedNote = {
      id: newNote.id,
      userId: newNote.userId,
      title: newNote.title,
      content: newNote.content,
      contentPlain: newNote.content.replace(/<[^>]*>/g, ''),
      categoryId: newNote.categoryId,
      tags: newNote.tags, // 直接使用tags数组
      metadata: newNote.metadata,
      aiProcessed: newNote.aiProcessed,
      aiSummary: newNote.aiSummary,
      aiKeywords: newNote.aiKeywords,
      version: newNote.version,
      status: newNote.status,
      isFavorite: false, // 数据库中没有这个字段，设为默认值
      isArchived: false, // 数据库中没有这个字段，设为默认值
      isPublic: newNote.isPublic,
      viewCount: newNote.viewCount,
      wordCount,
      readingTimeMinutes,
      createdAt: newNote.createdAt,
      updatedAt: newNote.updatedAt,
      aiProcessedAt: newNote.aiProcessedAt,
    }

    return NextResponse.json(formattedNote, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      )
    }

    console.error('Failed to create note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 },
    )
  }
}
