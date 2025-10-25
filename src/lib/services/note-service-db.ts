/**
 * Database-backed Note Service
 *
 * Implements persistent storage for notes with PostgreSQL
 */

import { PrismaClient, Note, NoteStatus, Prisma } from '@prisma/client'
import { Note as NoteType } from '@/types/note'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty'
})

export interface CreateNoteData {
  title: string
  content: string
  userId: string
  categoryId?: number
  tags?: string[]
  metadata?: Record<string, any>
  status?: NoteStatus
  isPublic?: boolean
}

export interface UpdateNoteData {
  title?: string
  content?: string
  categoryId?: number
  tags?: string[]
  metadata?: Record<string, any>
  status?: NoteStatus
  isPublic?: boolean
}

export interface NoteFilters {
  userId?: string
  categoryId?: number
  tags?: string[]
  status?: NoteStatus
  isPublic?: boolean
  search?: string
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'viewCount'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedNotes {
  notes: Note[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

class NoteServiceDB {
  /**
   * Create a new note
   */
  async createNote(data: CreateNoteData): Promise<Note> {
    try {
      const contentHash = this.generateContentHash(data.content)

      const note = await prisma.note.create({
        data: {
          title: data.title,
          content: data.content,
          contentHash,
          userId: data.userId,
          categoryId: data.categoryId,
          tags: data.tags || [],
          metadata: data.metadata || {},
          status: data.status || NoteStatus.DRAFT,
          isPublic: data.isPublic || false,
          version: 1,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true
            }
          },
          category: true,
          noteTags: {
            include: {
              tag: true
            }
          },
          versions: {
            orderBy: { version: 'desc' },
            take: 1
          }
        }
      })

      // Create initial version
      await prisma.noteVersion.create({
        data: {
          noteId: note.id,
          title: note.title,
          content: note.content,
          version: 1
        }
      })

      return note
    } catch (error) {
      console.error('Failed to create note:', error)
      throw new Error(`创建笔记失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * Get note by ID
   */
  async getNoteById(id: string, userId?: string): Promise<Note | null> {
    try {
      const where: Prisma.NoteWhereInput = { id }

      // If userId is provided, ensure user can access this note
      if (userId) {
        where.OR = [
          { userId },
          { isPublic: true }
        ]
      } else {
        where.isPublic = true
      }

      const note = await prisma.note.findFirst({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true
            }
          },
          category: true,
          noteTags: {
            include: {
              tag: true
            }
          },
          versions: {
            orderBy: { version: 'desc' },
            take: 5
          },
          _count: {
            select: {
              sourceRelations: true,
              targetRelations: true
            }
          }
        }
      })

      if (note) {
        // Increment view count for public notes
        if (note.isPublic && (!userId || note.userId !== userId)) {
          await prisma.note.update({
            where: { id },
            data: { viewCount: { increment: 1 } }
          })
        }
      }

      return note
    } catch (error) {
      console.error('Failed to get note:', error)
      throw new Error(`获取笔记失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * Update note
   */
  async updateNote(id: string, data: UpdateNoteData, userId: string): Promise<Note> {
    try {
      // First check if note exists and user has permission
      const existingNote = await prisma.note.findUnique({
        where: { id },
        select: { userId: true, version: true, content: true, title: true }
      })

      if (!existingNote) {
        throw new Error('笔记不存在')
      }

      if (existingNote.userId !== userId) {
        throw new Error('无权限修改此笔记')
      }

      // Prepare update data
      const updateData: Prisma.NoteUpdateInput = {
        updatedAt: new Date()
      }

      if (data.title !== undefined) updateData.title = data.title
      if (data.content !== undefined) updateData.content = data.content
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.metadata !== undefined) updateData.metadata = data.metadata
      if (data.status !== undefined) updateData.status = data.status
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic

      // Update content hash if content changed
      if (data.content !== undefined && data.content !== existingNote.content) {
        updateData.contentHash = this.generateContentHash(data.content)
        updateData.version = { increment: 1 }
      }

      const note = await prisma.note.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true
            }
          },
          category: true,
          noteTags: {
            include: {
              tag: true
            }
          }
        }
      })

      // Create new version if content changed
      if (data.content !== undefined && data.content !== existingNote.content) {
        await prisma.noteVersion.create({
          data: {
            noteId: id,
            title: note.title,
            content: note.content,
            version: note.version
          }
        })
      }

      return note
    } catch (error) {
      console.error('Failed to update note:', error)
      throw new Error(`更新笔记失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * Delete note
   */
  async deleteNote(id: string, userId: string): Promise<void> {
    try {
      const note = await prisma.note.findUnique({
        where: { id },
        select: { userId: true }
      })

      if (!note) {
        throw new Error('笔记不存在')
      }

      if (note.userId !== userId) {
        throw new Error('无权限删除此笔记')
      }

      await prisma.note.delete({
        where: { id }
      })
    } catch (error) {
      console.error('Failed to delete note:', error)
      throw new Error(`删除笔记失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * Get notes with filters and pagination
   */
  async getNotes(filters: NoteFilters): Promise<PaginatedNotes> {
    try {
      const where: Prisma.NoteWhereInput = {}

      // Apply filters
      if (filters.userId) {
        where.userId = filters.userId
      } else if (!filters.isPublic) {
        // If no userId specified, only show public notes
        where.isPublic = true
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId
      }

      if (filters.status) {
        where.status = filters.status
      }

      if (filters.isPublic !== undefined) {
        where.isPublic = filters.isPublic
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = {
          hasSome: filters.tags
        }
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } }
        ]
      }

      // Count total notes
      const total = await prisma.note.count({ where })

      // Calculate pagination
      const pageSize = filters.limit || 20
      const page = Math.floor((filters.offset || 0) / pageSize) + 1
      const totalPages = Math.ceil(total / pageSize)

      // Get notes
      const notes = await prisma.note.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true
            }
          },
          category: true,
          noteTags: {
            include: {
              tag: true
            }
          },
          _count: {
            select: {
              sourceRelations: true,
              targetRelations: true
            }
          }
        },
        orderBy: {
          [filters.sortBy || 'updatedAt']: filters.sortOrder || 'desc'
        },
        skip: filters.offset || 0,
        take: pageSize
      })

      return {
        notes,
        total,
        page,
        pageSize,
        totalPages
      }
    } catch (error) {
      console.error('Failed to get notes:', error)
      throw new Error(`获取笔记列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * Get note versions
   */
  async getNoteVersions(noteId: string, userId?: string): Promise<any[]> {
    try {
      // Check permission
      if (userId) {
        const note = await prisma.note.findUnique({
          where: { id: noteId },
          select: { userId: true, isPublic: true }
        })

        if (!note) {
          throw new Error('笔记不存在')
        }

        if (note.userId !== userId && !note.isPublic) {
          throw new Error('无权限查看此笔记')
        }
      }

      const versions = await prisma.noteVersion.findMany({
        where: { noteId },
        orderBy: { version: 'desc' }
      })

      return versions
    } catch (error) {
      console.error('Failed to get note versions:', error)
      throw new Error(`获取笔记版本失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * Get note statistics
   */
  async getNoteStats(userId: string): Promise<{
    totalNotes: number
    draftNotes: number
    publishedNotes: number
    archivedNotes: number
    totalWords: number
    totalViews: number
    recentActivity: number
  }> {
    try {
      const stats = await prisma.note.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
        _sum: {
          viewCount: true,
          // Note: word count would need to be calculated differently
        }
      })

      const totalNotes = stats.reduce((sum, stat) => sum + stat._count.id, 0)
      const draftNotes = stats.find(stat => stat.status === NoteStatus.DRAFT)?._count.id || 0
      const publishedNotes = stats.find(stat => stat.status === NoteStatus.PUBLISHED)?._count.id || 0
      const archivedNotes = stats.find(stat => stat.status === NoteStatus.ARCHIVED)?._count.id || 0
      const totalViews = stats.reduce((sum, stat) => sum + (stat._sum.viewCount || 0), 0)

      // Get recent activity (notes updated in last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentActivity = await prisma.note.count({
        where: {
          userId,
          updatedAt: { gte: sevenDaysAgo }
        }
      })

      // Calculate total words (simplified - would need proper word counting)
      const notes = await prisma.note.findMany({
        where: { userId },
        select: { content: true }
      })

      const totalWords = notes.reduce((sum, note) => {
        return sum + (note.content.replace(/<[^>]*>/g, '').split(/\s+/).length || 0)
      }, 0)

      return {
        totalNotes,
        draftNotes,
        publishedNotes,
        archivedNotes,
        totalWords,
        totalViews,
        recentActivity
      }
    } catch (error) {
      console.error('Failed to get note stats:', error)
      throw new Error(`获取笔记统计失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * Generate content hash for change detection
   */
  private generateContentHash(content: string): string {
    // Simple hash function - in production, use crypto
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async disconnect(): Promise<void> {
    await prisma.$disconnect()
  }
}

// Export singleton instance
export const noteServiceDB = new NoteServiceDB()
export default noteServiceDB