/**
 * T022 [P] [US1] Create NoteService in src/lib/services/note-service.ts
 *
 * Service layer for note operations including CRUD, validation,
 * and business logic for smart note management.
 */

import { prisma } from '@/lib/db'
import logger from '@/lib/utils/logger'

export interface CreateNoteData {
  title: string
  content: string
  categoryId?: number | null
  tagIds?: number[]
}

export interface UpdateNoteData {
  title?: string
  content?: string
  categoryId?: number | null
  tagIds?: number[]
  isFavorite?: boolean
}

export interface NoteQueryOptions {
  page?: number
  limit?: number
  search?: string
  categoryId?: number
  tagIds?: number[]
  isFavorite?: boolean
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface NoteStats {
  total: number
  archived: number
  favorites: number
  thisMonth: number
}

export class NoteService {
  /**
   * Get paginated notes for a user with optional filtering
   */
  static async getNotes(
    userId: string,
    options: NoteQueryOptions = {}
  ): Promise<{
    notes: any[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        categoryId,
        tagIds,
        isFavorite,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = options

      // Validate pagination parameters
      const validatedPage = Math.max(1, parseInt(String(page)))
      const validatedLimit = Math.min(100, Math.max(1, parseInt(String(limit))))
      const skip = (validatedPage - 1) * validatedLimit

      // Build where clause
      const where: any = {
        userId,
        isArchived: false,
      }

      if (search) {
        where.OR = [
          {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            content: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ]
      }

      if (categoryId) {
        where.categoryId = categoryId
      }

      if (tagIds && tagIds.length > 0) {
        where.tags = {
          some: {
            tagId: {
              in: tagIds,
            },
          },
        }
      }

      if (typeof isFavorite === 'boolean') {
        where.isFavorite = isFavorite
      }

      // Build order clause
      const orderBy: any = {}
      orderBy[sortBy] = sortOrder

      // Execute queries
      const [notes, total] = await Promise.all([
        prisma.note.findMany({
          where,
          orderBy,
          skip,
          take: validatedLimit,
          include: {
            category: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        }),
        prisma.note.count({ where }),
      ])

      const totalPages = Math.ceil(total / validatedLimit)

      logger.info(`Retrieved ${notes.length} notes for user ${userId}`)

      return {
        notes,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          total,
          totalPages,
        },
      }
    } catch (error) {
      logger.error('Failed to retrieve notes:', error)
      throw error
    }
  }

  /**
   * Get a specific note by ID for a user
   */
  static async getNoteById(noteId: string, userId: string): Promise<any | null> {
    try {
      const note = await prisma.note.findUnique({
        where: {
          id: noteId,
          userId,
        },
        include: {
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
          versions: {
            orderBy: {
              version: 'desc',
            },
            take: 10,
          },
        },
      })

      if (!note) {
        logger.warn(`Unauthorized access attempt for note ${noteId} by user ${userId}`)
        return null
      }

      logger.info(`Retrieved note ${noteId} for user ${userId}`)
      return note
    } catch (error) {
      logger.error(`Failed to retrieve note ${noteId}:`, error)
      throw error
    }
  }

  /**
   * Create a new note for a user
   */
  static async createNote(userId: string, data: CreateNoteData): Promise<any> {
    try {
      // Validate input
      if (!data.title?.trim()) {
        throw new Error('Title and content are required')
      }

      if (data.title.length > 200) {
        throw new Error('Title must be less than 200 characters')
      }

      if (!data.content?.trim()) {
        throw new Error('Title and content are required')
      }

      if (data.content.length > 100000) {
        throw new Error('Content must be less than 100,000 characters')
      }

      // Create note with tags in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create the note
        const note = await tx.note.create({
          data: {
            title: data.title.trim(),
            content: data.content.trim(),
            userId,
            categoryId: data.categoryId || null,
            version: 1,
          },
          include: {
            category: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        })

        // Add tags if provided
        if (data.tagIds && data.tagIds.length > 0) {
          // Create tag associations
          const tagData = data.tagIds.map((tagId) => ({
            noteId: note.id,
            tagId,
          }))

          await tx.noteTag.createMany({
            data: tagData,
          })

          // Refetch with tags
          const noteWithTags = await tx.note.findUnique({
            where: { id: note.id },
            include: {
              category: true,
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          })

          return noteWithTags
        }

        return note
      })

      logger.info(`Created new note ${result.id} for user ${userId}`)
      return result
    } catch (error) {
      logger.error('Failed to create note:', error)
      throw error
    }
  }

  /**
   * Update an existing note
   */
  static async updateNote(
    noteId: string,
    userId: string,
    data: UpdateNoteData
  ): Promise<any> {
    try {
      // First check if note exists and user has permission
      const existingNote = await prisma.note.findUnique({
        where: { id: noteId, userId },
      })

      if (!existingNote) {
        throw new Error('Note not found')
      }

      // Validate updates
      if (data.title !== undefined) {
        if (!data.title.trim()) {
          throw new Error('Title cannot be empty')
        }
        if (data.title.length > 200) {
          throw new Error('Title must be less than 200 characters')
        }
      }

      if (data.content !== undefined) {
        if (!data.content.trim()) {
          throw new Error('Content cannot be empty')
        }
        if (data.content.length > 100000) {
          throw new Error('Content must be less than 100,000 characters')
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create version snapshot if content or title changed
        if (data.title !== undefined || data.content !== undefined) {
          await tx.noteVersion.create({
            data: {
              noteId,
              title: existingNote.title,
              content: existingNote.content,
              version: existingNote.version,
              createdAt: existingNote.updatedAt,
            },
          })
        }

        // Prepare update data
        const updateData: any = {
          updatedAt: new Date(),
        }

        if (data.title !== undefined) {
          updateData.title = data.title.trim()
        }

        if (data.content !== undefined) {
          updateData.content = data.content.trim()
        }

        if (data.categoryId !== undefined) {
          updateData.categoryId = data.categoryId
        }

        if (typeof data.isFavorite === 'boolean') {
          updateData.isFavorite = data.isFavorite
        }

        if (data.title !== undefined || data.content !== undefined) {
          updateData.version = existingNote.version + 1
        }

        // Update the note
        const updatedNote = await tx.note.update({
          where: { id: noteId },
          data: updateData,
          include: {
            category: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        })

        // Update tags if provided
        if (data.tagIds !== undefined) {
          // Remove existing tags
          await tx.noteTag.deleteMany({
            where: { noteId },
          })

          // Add new tags
          if (data.tagIds.length > 0) {
            const tagData = data.tagIds.map((tagId) => ({
              noteId,
              tagId,
            }))

            await tx.noteTag.createMany({
              data: tagData,
            })
          }

          // Refetch with updated tags
          const noteWithUpdatedTags = await tx.note.findUnique({
            where: { id: noteId },
            include: {
              category: true,
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          })

          return noteWithUpdatedTags
        }

        return updatedNote
      })

      logger.info(`Updated note ${noteId} for user ${userId}`)
      return result
    } catch (error) {
      logger.error(`Failed to update note ${noteId}:`, error)
      throw error
    }
  }

  /**
   * Soft delete (archive) or permanently delete a note
   */
  static async deleteNote(
    noteId: string,
    userId: string,
    permanent: boolean = false
  ): Promise<void> {
    try {
      // Check if note exists and user has permission
      const existingNote = await prisma.note.findUnique({
        where: { id: noteId, userId },
      })

      if (!existingNote) {
        throw new Error('Note not found')
      }

      if (permanent) {
        // Permanent deletion
        await prisma.note.delete({
          where: { id: noteId },
        })
        logger.info(`Permanently deleted note ${noteId} for user ${userId}`)
      } else {
        // Soft delete (archive)
        await prisma.note.update({
          where: { id: noteId },
          data: {
            isArchived: true,
            updatedAt: new Date(),
          },
        })
        logger.info(`Archived note ${noteId} for user ${userId}`)
      }
    } catch (error) {
      logger.error(`Failed to delete note ${noteId}:`, error)
      throw error
    }
  }

  /**
   * Get note statistics for a user
   */
  static async getNoteStats(userId: string): Promise<NoteStats> {
    try {
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const [
        total,
        archived,
        favorites,
        thisMonth,
      ] = await Promise.all([
        prisma.note.count({
          where: { userId },
        }),
        prisma.note.count({
          where: {
            userId,
            isArchived: true,
          },
        }),
        prisma.note.count({
          where: {
            userId,
            isFavorite: true,
            isArchived: false,
          },
        }),
        prisma.note.count({
          where: {
            userId,
            createdAt: {
              gte: thisMonthStart,
            },
            isArchived: false,
          },
        }),
      ])

      return {
        total,
        archived,
        favorites,
        thisMonth,
      }
    } catch (error) {
      logger.error('Failed to get note stats:', error)
      throw error
    }
  }

  /**
   * Restore an archived note
   */
  static async restoreNote(noteId: string, userId: string): Promise<any> {
    try {
      const existingNote = await prisma.note.findUnique({
        where: {
          id: noteId,
          userId,
          isArchived: true,
        },
      })

      if (!existingNote) {
        throw new Error('Archived note not found')
      }

      const restoredNote = await prisma.note.update({
        where: { id: noteId },
        data: {
          isArchived: false,
          updatedAt: new Date(),
        },
        include: {
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      })

      logger.info(`Restored note ${noteId} for user ${userId}`)
      return restoredNote
    } catch (error) {
      logger.error(`Failed to restore note ${noteId}:`, error)
      throw error
    }
  }

  /**
   * Search notes using full-text search
   */
  static async searchNotes(
    userId: string,
    query: string,
    options: Omit<NoteQueryOptions, 'search'> = {}
  ): Promise<{
    notes: any[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    return this.getNotes(userId, { ...options, search: query })
  }
}

export default NoteService