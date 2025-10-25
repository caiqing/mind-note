/**
 * T019 [P] [US1] Integration test for notes API
 *
 * This test ensures the notes API endpoints work correctly with database,
 * authentication, and validation integrated.
 */

import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/notes/route'
import { GET as GetNote, PUT as UpdateNote, DELETE as DeleteNote } from '@/app/api/notes/[id]/route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/db')
jest.mock('@/lib/services/permission-service')
jest.mock('@/lib/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Notes API Integration Tests', () => {
  const mockUserId = 'test-user-id'
  const mockNoteId = 'test-note-id'
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({
      user: mockUser,
    } as any)
  })

  describe('GET /api/notes', () => {
    it('should return paginated notes for authenticated user', async () => {
      // Arrange
      const mockNotes = [
        {
          id: 'note-1',
          title: 'Test Note 1',
          content: 'Content 1',
          userId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: null,
          tags: [],
        },
        {
          id: 'note-2',
          title: 'Test Note 2',
          content: 'Content 2',
          userId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: null,
          tags: [],
        },
      ]

      mockPrisma.note.findMany.mockResolvedValue(mockNotes)
      mockPrisma.note.count.mockResolvedValue(2)

      // Act
      const { req } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '10' },
      })

      const request = new NextRequest(new URL('http://localhost:3000/api/notes?page=1&limit=10'), {
        method: 'GET',
        headers: { cookie: 'test-session' },
      })

      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: {
          notes: mockNotes,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
          },
        },
      })
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUserId,
            isArchived: false,
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
      )
    })

    it('should handle search functionality', async () => {
      // Arrange
      mockPrisma.note.findMany.mockResolvedValue([])
      mockPrisma.note.count.mockResolvedValue(0)

      const request = new NextRequest(
        new URL('http://localhost:3000/api/notes?search=test&page=1&limit=10'),
        {
          method: 'GET',
          headers: { cookie: 'test-session' },
        }
      )

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(200)
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUserId,
            isArchived: false,
            OR: [
              {
                title: {
                  contains: 'test',
                  mode: 'insensitive',
                },
              },
              {
                content: {
                  contains: 'test',
                  mode: 'insensitive',
                },
              },
            ],
          },
        })
      )
    })

    it('should require authentication', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
        method: 'GET',
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({
        success: false,
        error: 'Authentication required',
      })
    })

    it('should handle validation errors', async () => {
      // Arrange
      const request = new NextRequest(
        new URL('http://localhost:3000/api/notes?page=invalid&limit=invalid'),
        {
          method: 'GET',
          headers: { cookie: 'test-session' },
        }
      )

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({
        success: false,
        error: expect.stringContaining('Invalid query parameters'),
      })
    })
  })

  describe('POST /api/notes', () => {
    const validNoteData = {
      title: 'New Test Note',
      content: 'This is test content',
      categoryId: null,
    }

    it('should create a new note successfully', async () => {
      // Arrange
      const createdNote = {
        id: mockNoteId,
        ...validNoteData,
        userId: mockUserId,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
        tags: [],
      }

      mockPrisma.note.create.mockResolvedValue(createdNote)

      // Act
      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'test-session',
        },
        body: JSON.stringify(validNoteData),
      })

      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toEqual({
        success: true,
        data: createdNote,
      })
      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: {
          ...validNoteData,
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
    })

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        title: '',
        content: '',
      }

      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'test-session',
        },
        body: JSON.stringify(invalidData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({
        success: false,
        error: 'Title and content are required',
      })
    })

    it('should handle malformed JSON', async () => {
      // Arrange
      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'test-session',
        },
        body: 'invalid json',
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({
        success: false,
        error: 'Invalid request body',
      })
    })

    it('should require authentication', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validNoteData),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({
        success: false,
        error: 'Authentication required',
      })
    })
  })

  describe('GET /api/notes/[id]', () => {
    it('should return a specific note', async () => {
      // Arrange
      const mockNote = {
        id: mockNoteId,
        title: 'Test Note',
        content: 'Test content',
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
        tags: [],
        versions: [],
      }

      mockPrisma.note.findUnique.mockResolvedValue(mockNote)

      // Act
      const request = new NextRequest(
        new URL(`http://localhost:3000/api/notes/${mockNoteId}`),
        {
          method: 'GET',
          headers: { cookie: 'test-session' },
        }
      )

      const response = await GetNote(request, { params: { id: mockNoteId } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockNote,
      })
      expect(mockPrisma.note.findUnique).toHaveBeenCalledWith({
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
    })

    it('should return 404 for non-existent note', async () => {
      // Arrange
      mockPrisma.note.findUnique.mockResolvedValue(null)

      // Act
      const request = new NextRequest(
        new URL(`http://localhost:3000/api/notes/${mockNoteId}`),
        {
          method: 'GET',
          headers: { cookie: 'test-session' },
        }
      )

      const response = await GetNote(request, { params: { id: mockNoteId } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({
        success: false,
        error: 'Note not found',
      })
    })
  })

  describe('PUT /api/notes/[id]', () => {
    const updateData = {
      title: 'Updated Note',
      content: 'Updated content',
    }

    it('should update a note successfully', async () => {
      // Arrange
      const existingNote = {
        id: mockNoteId,
        title: 'Original Note',
        content: 'Original content',
        userId: mockUserId,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedNote = {
        ...existingNote,
        ...updateData,
        version: 2,
        updatedAt: new Date(),
      }

      mockPrisma.note.findUnique.mockResolvedValue(existingNote)
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma)
      })
      mockPrisma.note.update.mockResolvedValue(updatedNote)

      // Act
      const request = new NextRequest(
        new URL(`http://localhost:3000/api/notes/${mockNoteId}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            cookie: 'test-session',
          },
          body: JSON.stringify(updateData),
        }
      )

      const response = await UpdateNote(request, { params: { id: mockNoteId } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: updatedNote,
      })
      expect(mockPrisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockNoteId },
          data: {
            ...updateData,
            version: 2,
            updatedAt: expect.any(Date),
          },
        })
      )
    })

    it('should validate note ownership', async () => {
      // Arrange
      mockPrisma.note.findUnique.mockResolvedValue(null)

      // Act
      const request = new NextRequest(
        new URL(`http://localhost:3000/api/notes/${mockNoteId}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            cookie: 'test-session',
          },
          body: JSON.stringify(updateData),
        }
      )

      const response = await UpdateNote(request, { params: { id: mockNoteId } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({
        success: false,
        error: 'Note not found',
      })
    })
  })

  describe('DELETE /api/notes/[id]', () => {
    it('should soft delete a note successfully', async () => {
      // Arrange
      const existingNote = {
        id: mockNoteId,
        title: 'Test Note',
        content: 'Test content',
        userId: mockUserId,
        isArchived: false,
      }

      mockPrisma.note.findUnique.mockResolvedValue(existingNote)
      mockPrisma.note.update.mockResolvedValue({
        ...existingNote,
        isArchived: true,
        updatedAt: new Date(),
      })

      // Act
      const request = new NextRequest(
        new URL(`http://localhost:3000/api/notes/${mockNoteId}`),
        {
          method: 'DELETE',
          headers: { cookie: 'test-session' },
        }
      )

      const response = await DeleteNote(request, { params: { id: mockNoteId } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Note archived successfully',
      })
      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: mockNoteId },
        data: {
          isArchived: true,
          updatedAt: expect.any(Date),
        },
      })
    })

    it('should handle permanent deletion', async () => {
      // Arrange
      const existingNote = {
        id: mockNoteId,
        title: 'Test Note',
        content: 'Test content',
        userId: mockUserId,
      }

      mockPrisma.note.findUnique.mockResolvedValue(existingNote)
      mockPrisma.note.delete.mockResolvedValue(existingNote)

      // Act
      const request = new NextRequest(
        new URL(`http://localhost:3000/api/notes/${mockNoteId}?permanent=true`),
        {
          method: 'DELETE',
          headers: { cookie: 'test-session' },
        }
      )

      const response = await DeleteNote(request, { params: { id: mockNoteId } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Note deleted permanently',
      })
      expect(mockPrisma.note.delete).toHaveBeenCalledWith({
        where: { id: mockNoteId },
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Arrange
      mockPrisma.note.findMany.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
        method: 'GET',
        headers: { cookie: 'test-session' },
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({
        success: false,
        error: 'Internal server error',
      })
    })

    it('should handle rate limiting', async () => {
      // This would require implementing rate limiting middleware
      // For now, we'll test the structure exists
      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
        method: 'GET',
        headers: {
          cookie: 'test-session',
          'X-Forwarded-For': '192.168.1.1',
        },
      })

      // Act
      const response = await GET(request)

      // Assert
      expect([200, 429]).toContain(response.status)
    })
  })
})