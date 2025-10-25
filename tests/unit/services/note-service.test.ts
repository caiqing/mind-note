/**
 * T018 [P] [US1] Unit test for NoteService
 *
 * This test ensures the NoteService properly handles note CRUD operations,
 * validation, and error handling according to the specifications.
 */

import { NoteService } from '@/lib/services/note-service'
import { prisma } from '@/lib/db'
import logger from '@/lib/utils/logger'

// Mock the dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    note: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    noteVersion: {
      create: jest.fn(),
    },
    noteTag: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

describe('NoteService', () => {
  const mockUserId = 'test-user-id'
  const mockNoteId = 'test-note-id'
  const mockNoteData = {
    id: mockNoteId,
    title: 'Test Note',
    content: 'This is a test note content',
    userId: mockUserId,
    categoryId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: 1,
    isArchived: false,
    isFavorite: false,
    aiProcessed: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getNotes', () => {
    it('should return paginated notes for a user', async () => {
      // Arrange
      const mockNotes = [mockNoteData]
      ;(prisma.note.findMany as jest.Mock).mockResolvedValue(mockNotes)
      ;(prisma.note.count as jest.Mock).mockResolvedValue(1)

      // Act
      const result = await NoteService.getNotes(mockUserId, {
        page: 1,
        limit: 10,
      })

      // Assert
      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isArchived: false,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: 0,
        take: 10,
        include: {
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      })
      expect(result).toEqual({
        notes: mockNotes,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      })
      expect(logger.info).toHaveBeenCalledWith(
        `Retrieved ${mockNotes.length} notes for user ${mockUserId}`
      )
    })

    it('should handle search query filtering', async () => {
      // Arrange
      const searchQuery = 'test search'
      ;(prisma.note.findMany as jest.Mock).mockResolvedValue([mockNoteData])
      ;(prisma.note.count as jest.Mock).mockResolvedValue(1)

      // Act
      await NoteService.getNotes(mockUserId, {
        page: 1,
        limit: 10,
        search: searchQuery,
      })

      // Assert
      expect(prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUserId,
            isArchived: false,
            OR: [
              {
                title: {
                  contains: searchQuery,
                  mode: 'insensitive',
                },
              },
              {
                content: {
                  contains: searchQuery,
                  mode: 'insensitive',
                },
              },
            ],
          },
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database connection failed')
      ;(prisma.note.findMany as jest.Mock).mockRejectedValue(mockError)

      // Act & Assert
      await expect(NoteService.getNotes(mockUserId)).rejects.toThrow(
        'Database connection failed'
      )
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to retrieve notes:',
        mockError
      )
    })
  })

  describe('getNoteById', () => {
    it('should return a specific note for the user', async () => {
      // Arrange
      ;(prisma.note.findUnique as jest.Mock).mockResolvedValue(mockNoteData)

      // Act
      const result = await NoteService.getNoteById(mockNoteId, mockUserId)

      // Assert
      expect(prisma.note.findUnique).toHaveBeenCalledWith({
        where: {
          id: mockNoteId,
          userId: mockUserId,
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
      expect(result).toEqual(mockNoteData)
    })

    it('should return null if note is not found', async () => {
      // Arrange
      ;(prisma.note.findUnique as jest.Mock).mockResolvedValue(null)

      // Act
      const result = await NoteService.getNoteById(mockNoteId, mockUserId)

      // Assert
      expect(result).toBeNull()
    })

    it('should throw error for unauthorized access attempts', async () => {
      // Arrange
      const unauthorizedUserId = 'different-user-id'
      ;(prisma.note.findUnique as jest.Mock).mockResolvedValue(null)

      // Act
      const result = await NoteService.getNoteById(mockNoteId, unauthorizedUserId)

      // Assert
      expect(result).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(
        `Unauthorized access attempt for note ${mockNoteId} by user ${unauthorizedUserId}`
      )
    })
  })

  describe('createNote', () => {
    const createNoteData = {
      title: 'New Test Note',
      content: 'This is new test content',
      categoryId: null,
    }

    it('should create a new note successfully', async () => {
      // Arrange
      const createdNote = { ...mockNoteData, id: 'new-note-id', ...createNoteData }

      // Mock transaction client
      const mockTxClient = {
        note: { create: jest.fn().mockResolvedValue(createdNote) },
        noteTag: { createMany: jest.fn().mockResolvedValue({}) },
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockTxClient)
      })

      // Act
      const result = await NoteService.createNote(mockUserId, createNoteData)

      // Assert
      expect(mockTxClient.note.create).toHaveBeenCalledWith({
        data: {
          ...createNoteData,
          userId: mockUserId,
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
      expect(result).toEqual(createdNote)
      expect(logger.info).toHaveBeenCalledWith(
        `Created new note ${createdNote.id} for user ${mockUserId}`
      )
    })

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        title: '',
        content: '',
      }

      // Act & Assert
      await expect(NoteService.createNote(mockUserId, invalidData)).rejects.toThrow(
        'Title and content are required'
      )
    })

    it('should handle title length validation', async () => {
      // Arrange
      const longTitle = 'a'.repeat(201) // Exceeds 200 character limit
      const invalidData = {
        title: longTitle,
        content: 'Valid content',
      }

      // Act & Assert
      await expect(NoteService.createNote(mockUserId, invalidData)).rejects.toThrow(
        'Title must be less than 200 characters'
      )
    })

    it('should handle database errors during creation', async () => {
      // Arrange
      const mockError = new Error('Database constraint violation')

      // Mock transaction client that throws error
      const mockTxClient = {
        note: { create: jest.fn().mockRejectedValue(mockError) },
        noteTag: { createMany: jest.fn().mockResolvedValue({}) },
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockTxClient)
      })

      // Act & Assert
      await expect(NoteService.createNote(mockUserId, createNoteData)).rejects.toThrow(
        'Database constraint violation'
      )
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create note:',
        mockError
      )
    })
  })

  describe('updateNote', () => {
    const updateNoteData = {
      title: 'Updated Test Note',
      content: 'This is updated test content',
    }

    it('should update an existing note successfully', async () => {
      // Arrange
      const updatedNote = { ...mockNoteData, ...updateNoteData, version: 2 }
      ;(prisma.note.findUnique as jest.Mock).mockResolvedValue(mockNoteData)

      // Mock transaction client
      const mockTxClient = {
        noteVersion: { create: jest.fn().mockResolvedValue({}) },
        note: {
          findUnique: jest.fn().mockResolvedValue(updatedNote),
          update: jest.fn().mockResolvedValue(updatedNote)
        },
        noteTag: { deleteMany: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}) },
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockTxClient)
      })

      // Act
      const result = await NoteService.updateNote(mockNoteId, mockUserId, updateNoteData)

      // Assert
      expect(prisma.note.findUnique).toHaveBeenCalledWith({
        where: { id: mockNoteId, userId: mockUserId },
      })
      expect(prisma.$transaction).toHaveBeenCalled()
      expect(result).toEqual(updatedNote)
      expect(logger.info).toHaveBeenCalledWith(
        `Updated note ${mockNoteId} for user ${mockUserId}`
      )
    })

    it('should throw error if note is not found', async () => {
      // Arrange
      ;(prisma.note.findUnique as jest.Mock).mockResolvedValue(null)

      // Act & Assert
      await expect(
        NoteService.updateNote(mockNoteId, mockUserId, updateNoteData)
      ).rejects.toThrow('Note not found')
    })

    it('should create a version snapshot before updating', async () => {
      // Arrange
      const updatedNote = { ...mockNoteData, ...updateNoteData, version: 2 }

      // Mock the transaction operations
      const mockCreateVersion = jest.fn().mockResolvedValue({})
      const mockUpdateNote = jest.fn().mockResolvedValue(updatedNote)

      // Mock transaction client
      const mockTxClient = {
        noteVersion: { create: mockCreateVersion },
        note: { update: mockUpdateNote },
        noteTag: { deleteMany: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}) },
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockTxClient)
      })

      // Mock findUnique for permission check
      ;(prisma.note.findUnique as jest.Mock).mockResolvedValue(mockNoteData)

      // Act
      await NoteService.updateNote(mockNoteId, mockUserId, updateNoteData)

      // Assert
      expect(mockCreateVersion).toHaveBeenCalledWith({
        data: {
          noteId: mockNoteId,
          title: mockNoteData.title,
          content: mockNoteData.content,
          version: mockNoteData.version,
          createdAt: mockNoteData.updatedAt,
        },
      })
      expect(mockUpdateNote).toHaveBeenCalledWith({
        where: { id: mockNoteId },
        data: {
          ...updateNoteData,
          version: mockNoteData.version + 1,
          updatedAt: expect.any(Date),
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
    })
  })

  describe('deleteNote', () => {
    it('should soft delete a note successfully', async () => {
      // Arrange
      ;(prisma.note.findUnique as jest.Mock).mockResolvedValue(mockNoteData)
      ;(prisma.note.update as jest.Mock).mockResolvedValue({
        ...mockNoteData,
        isArchived: true,
      })

      // Act
      await NoteService.deleteNote(mockNoteId, mockUserId)

      // Assert
      expect(prisma.note.findUnique).toHaveBeenCalledWith({
        where: { id: mockNoteId, userId: mockUserId },
      })
      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: mockNoteId },
        data: {
          isArchived: true,
          updatedAt: expect.any(Date),
        },
      })
      expect(logger.info).toHaveBeenCalledWith(
        `Archived note ${mockNoteId} for user ${mockUserId}`
      )
    })

    it('should throw error if note is not found', async () => {
      // Arrange
      ;(prisma.note.findUnique as jest.Mock).mockResolvedValue(null)

      // Act & Assert
      await expect(NoteService.deleteNote(mockNoteId, mockUserId)).rejects.toThrow(
        'Note not found'
      )
    })

    it('should handle permanent deletion option', async () => {
      // Arrange
      ;(prisma.note.findUnique as jest.Mock).mockResolvedValue(mockNoteData)
      ;(prisma.note.delete as jest.Mock).mockResolvedValue(mockNoteData)

      // Act
      await NoteService.deleteNote(mockNoteId, mockUserId, true)

      // Assert
      expect(prisma.note.delete).toHaveBeenCalledWith({
        where: { id: mockNoteId },
      })
      expect(logger.info).toHaveBeenCalledWith(
        `Permanently deleted note ${mockNoteId} for user ${mockUserId}`
      )
    })
  })

  describe('getNoteStats', () => {
    it('should return note statistics for a user', async () => {
      // Arrange
      const mockStats = {
        total: 100,
        archived: 10,
        favorites: 25,
        thisMonth: 15,
      }

      ;(prisma.note.count as jest.Mock)
        .mockResolvedValueOnce(mockStats.total)
        .mockResolvedValueOnce(mockStats.archived)
        .mockResolvedValueOnce(mockStats.favorites)
        .mockResolvedValueOnce(mockStats.thisMonth)

      // Act
      const result = await NoteService.getNoteStats(mockUserId)

      // Assert
      expect(result).toEqual(mockStats)
      expect(prisma.note.count).toHaveBeenCalledTimes(4)
    })

    it('should handle stats calculation errors', async () => {
      // Arrange
      const mockError = new Error('Stats calculation failed')
      ;(prisma.note.count as jest.Mock).mockRejectedValue(mockError)

      // Act & Assert
      await expect(NoteService.getNoteStats(mockUserId)).rejects.toThrow(
        'Stats calculation failed'
      )
    })
  })
})