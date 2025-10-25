/**
 * T021 [P] [US1] Contract test for API endpoints
 *
 * This test ensures API contracts are maintained and responses match
 * the specified schema format, preventing breaking changes.
 */

import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/notes/route'
import { GET as GetNote, PUT as UpdateNote } from '@/app/api/notes/[id]/route'

// Mock authentication and database
jest.mock('next-auth/next')
jest.mock('@/lib/db')
jest.mock('@/lib/services/permission-service')

describe('Notes API Contract Tests', () => {
  const mockUserId = 'test-user-id'
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue({
      user: mockUser,
    })
  })

  describe('Response Schema Contracts', () => {
    it('GET /api/notes should return correct response schema', async () => {
      // Arrange
      const mockNotes = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Test content',
          userId: mockUserId,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isArchived: false,
          isFavorite: false,
          version: 1,
          category: null,
          tags: [],
        },
      ]

      const { prisma } = require('@/lib/db')
      prisma.note.findMany.mockResolvedValue(mockNotes)
      prisma.note.count.mockResolvedValue(1)

      // Act
      const request = new NextRequest(
        new URL('http://localhost:3000/api/notes?page=1&limit=10'),
        { method: 'GET' }
      )
      const response = await GET(request)
      const data = await response.json()

      // Assert - Verify response structure
      expect(response.status).toBe(200)

      // Top-level structure
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
      expect(data.success).toBe(true)

      // Data structure
      expect(data.data).toHaveProperty('notes')
      expect(data.data).toHaveProperty('pagination')
      expect(Array.isArray(data.data.notes)).toBe(true)

      // Pagination structure
      expect(data.data.pagination).toHaveProperty('page')
      expect(data.data.pagination).toHaveProperty('limit')
      expect(data.data.pagination).toHaveProperty('total')
      expect(data.data.pagination).toHaveProperty('totalPages')
      expect(typeof data.data.pagination.page).toBe('number')
      expect(typeof data.data.pagination.limit).toBe('number')
      expect(typeof data.data.pagination.total).toBe('number')
      expect(typeof data.data.pagination.totalPages).toBe('number')

      // Note structure
      if (data.data.notes.length > 0) {
        const note = data.data.notes[0]
        expect(note).toHaveProperty('id')
        expect(note).toHaveProperty('title')
        expect(note).toHaveProperty('content')
        expect(note).toHaveProperty('userId')
        expect(note).toHaveProperty('createdAt')
        expect(note).toHaveProperty('updatedAt')
        expect(note).toHaveProperty('isArchived')
        expect(note).toHaveProperty('isFavorite')
        expect(note).toHaveProperty('version')
        expect(note).toHaveProperty('category')
        expect(note).toHaveProperty('tags')

        // Verify data types
        expect(typeof note.id).toBe('string')
        expect(typeof note.title).toBe('string')
        expect(typeof note.content).toBe('string')
        expect(typeof note.userId).toBe('string')
        expect(typeof note.isArchived).toBe('boolean')
        expect(typeof note.isFavorite).toBe('boolean')
        expect(typeof note.version).toBe('number')
        expect(Array.isArray(note.tags)).toBe(true)
      }
    })

    it('POST /api/notes should return correct response schema', async () => {
      // Arrange
      const createdNote = {
        id: 'new-note-id',
        title: 'New Note',
        content: 'New content',
        userId: mockUserId,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        isArchived: false,
        isFavorite: false,
        version: 1,
        category: null,
        tags: [],
      }

      const { prisma } = require('@/lib/db')
      prisma.note.create.mockResolvedValue(createdNote)

      const noteData = {
        title: 'New Note',
        content: 'New content',
        categoryId: null,
      }

      // Act
      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      })
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
      expect(data.success).toBe(true)

      // Verify created note structure
      const note = data.data
      expect(note).toHaveProperty('id')
      expect(note).toHaveProperty('title')
      expect(note).toHaveProperty('content')
      expect(note).toHaveProperty('userId')
      expect(note).toHaveProperty('createdAt')
      expect(note).toHaveProperty('updatedAt')
      expect(note).toHaveProperty('version')
      expect(note.title).toBe(noteData.title)
      expect(note.content).toBe(noteData.content)
      expect(note.userId).toBe(mockUserId)
      expect(note.version).toBe(1)
    })

    it('GET /api/notes/[id] should return correct response schema', async () => {
      // Arrange
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
        userId: mockUserId,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        isArchived: false,
        isFavorite: false,
        version: 1,
        category: null,
        tags: [],
        versions: [],
      }

      const { prisma } = require('@/lib/db')
      prisma.note.findUnique.mockResolvedValue(mockNote)

      // Act
      const request = new NextRequest(
        new URL('http://localhost:3000/api/notes/note-1'),
        { method: 'GET' }
      )
      const response = await GetNote(request, { params: { id: 'note-1' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
      expect(data.success).toBe(true)

      const note = data.data
      expect(note).toHaveProperty('id')
      expect(note).toHaveProperty('title')
      expect(note).toHaveProperty('content')
      expect(note).toHaveProperty('userId')
      expect(note).toHaveProperty('createdAt')
      expect(note).toHaveProperty('updatedAt')
      expect(note).toHaveProperty('version')
      expect(note).toHaveProperty('versions')
      expect(Array.isArray(note.versions)).toBe(true)
    })

    it('Error responses should follow consistent schema', async () => {
      // Test authentication error
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
        method: 'GET',
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('error')
      expect(data.success).toBe(false)
      expect(typeof data.error).toBe('string')

      // Restore auth for other tests
      getServerSession.mockResolvedValue({ user: mockUser })
    })
  })

  describe('Input Validation Contracts', () => {
    it('should validate POST /api/notes input schema', async () => {
      // Test missing required fields
      const invalidInputs = [
        {},
        { title: '' },
        { content: '' },
        { title: '', content: '' },
        { title: 'a'.repeat(201) }, // Title too long
        { content: 'x'.repeat(100001) }, // Content too long
      ]

      for (const invalidInput of invalidInputs) {
        const request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidInput),
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data).toHaveProperty('error')
        expect(typeof data.error).toBe('string')
      }
    })

    it('should validate GET /api/notes query parameters', async () => {
      const invalidQueries = [
        'page=invalid',
        'limit=invalid',
        'page=-1',
        'limit=0',
        'limit=101', // Over max limit
        'page=0',    // Page must start from 1
      ]

      for (const query of invalidQueries) {
        const request = new NextRequest(
          new URL(`http://localhost:3000/api/notes?${query}`),
          { method: 'GET' }
        )
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data).toHaveProperty('error')
      }
    })
  })

  describe('HTTP Status Code Contracts', () => {
    it('should return correct HTTP status codes', async () => {
      const { prisma } = require('@/lib/db')

      // 200 - Success cases
      prisma.note.findMany.mockResolvedValue([])
      prisma.note.count.mockResolvedValue(0)
      let request = new NextRequest(new URL('http://localhost:3000/api/notes'), { method: 'GET' })
      let response = await GET(request)
      expect(response.status).toBe(200)

      // 201 - Resource created
      prisma.note.create.mockResolvedValue({
        id: 'new-id',
        title: 'Test',
        content: 'Test',
        userId: mockUserId,
        version: 1,
      })
      request = new NextRequest(new URL('http://localhost:3000/api/notes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', content: 'Test' }),
      })
      response = await POST(request)
      expect(response.status).toBe(201)

      // 400 - Bad request
      request = new NextRequest(new URL('http://localhost:3000/api/notes?page=invalid'), { method: 'GET' })
      response = await GET(request)
      expect(response.status).toBe(400)

      // 401 - Unauthorized
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)
      request = new NextRequest(new URL('http://localhost:3000/api/notes'), { method: 'GET' })
      response = await GET(request)
      expect(response.status).toBe(401)
      getServerSession.mockResolvedValue({ user: mockUser })

      // 404 - Not found
      prisma.note.findUnique.mockResolvedValue(null)
      request = new NextRequest(new URL('http://localhost:3000/api/notes/nonexistent'), { method: 'GET' })
      response = await GetNote(request, { params: { id: 'nonexistent' } })
      expect(response.status).toBe(404)

      // 422 - Validation error (if implemented)
      // This would be tested when more complex validation is added

      // 500 - Server error
      prisma.note.findMany.mockRejectedValue(new Error('Database error'))
      request = new NextRequest(new URL('http://localhost:3000/api/notes'), { method: 'GET' })
      response = await GET(request)
      expect(response.status).toBe(500)
    })
  })

  describe('Response Headers Contracts', () => {
    it('should include appropriate response headers', async () => {
      const { prisma } = require('@/lib/db')
      prisma.note.findMany.mockResolvedValue([])
      prisma.note.count.mockResolvedValue(0)

      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), { method: 'GET' })
      const response = await GET(request)

      // Content-Type header
      expect(response.headers.get('content-type')).toMatch(/application\/json/)

      // Security headers (if implemented)
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      expect(response.headers.get('x-frame-options')).toBe('DENY')
      expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')

      // CORS headers (if implemented)
      expect(response.headers.get('access-control-allow-origin')).toBeDefined()
    })

    it('should include rate limiting headers', async () => {
      // This test would verify rate limiting headers are present
      // when rate limiting middleware is implemented
      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), { method: 'GET' })
      const response = await GET(request)

      // Rate limit headers (if implemented)
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining')
      const rateLimitReset = response.headers.get('x-ratelimit-reset')

      // These would be expected when rate limiting is implemented
      if (rateLimitRemaining) {
        expect(typeof rateLimitRemaining).toBe('string')
      }
      if (rateLimitReset) {
        expect(typeof rateLimitReset).toBe('string')
      }
    })
  })

  describe('Pagination Contracts', () => {
    it('should handle pagination consistently', async () => {
      const { prisma } = require('@/lib/db')

      // Test different pagination scenarios
      const paginationTests = [
        { page: 1, limit: 10, expectedTotal: 0, expectedPages: 0 },
        { page: 1, limit: 5, expectedTotal: 23, expectedPages: 5 },
        { page: 2, limit: 10, expectedTotal: 15, expectedPages: 2 },
        { page: 1, limit: 20, expectedTotal: 100, expectedPages: 5 },
      ]

      for (const test of paginationTests) {
        prisma.note.findMany.mockResolvedValue(Array(test.limit).fill({}))
        prisma.note.count.mockResolvedValue(test.expectedTotal)

        const request = new NextRequest(
          new URL(`http://localhost:3000/api/notes?page=${test.page}&limit=${test.limit}`),
          { method: 'GET' }
        )
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.pagination.page).toBe(test.page)
        expect(data.data.pagination.limit).toBe(test.limit)
        expect(data.data.pagination.total).toBe(test.expectedTotal)
        expect(data.data.pagination.totalPages).toBe(test.expectedPages)

        // Verify page bounds
        expect(test.page).toBeGreaterThanOrEqual(1)
        expect(test.page).toBeLessThanOrEqual(test.expectedPages || 1)
      }
    })

    it('should handle edge cases in pagination', async () => {
      const { prisma } = require('@/lib/db')

      // Test page beyond available
      prisma.note.findMany.mockResolvedValue([])
      prisma.note.count.mockResolvedValue(5)

      const request = new NextRequest(
        new URL('http://localhost:3000/api/notes?page=10&limit=10'),
        { method: 'GET' }
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.notes).toEqual([])
      expect(data.data.pagination.page).toBe(10)
      expect(data.data.pagination.totalPages).toBe(1)
    })
  })

  describe('Field Format Contracts', () => {
    it('should ensure consistent date formats', async () => {
      const { prisma } = require('@/lib/db')
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
        userId: mockUserId,
        createdAt: new Date('2024-01-01T12:00:00.000Z'),
        updatedAt: new Date('2024-01-01T12:30:00.000Z'),
        isArchived: false,
        isFavorite: false,
        version: 1,
        category: null,
        tags: [],
        versions: [],
      }

      prisma.note.findUnique.mockResolvedValue(mockNote)

      const request = new NextRequest(
        new URL('http://localhost:3000/api/notes/note-1'),
        { method: 'GET' }
      )
      const response = await GetNote(request, { params: { id: 'note-1' } })
      const data = await response.json()

      const note = data.data
      expect(note.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
      expect(note.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)

      // Verify dates are parseable
      expect(() => new Date(note.createdAt)).not.toThrow()
      expect(() => new Date(note.updatedAt)).not.toThrow()
    })

    it('should ensure consistent ID formats', async () => {
      const { prisma } = require('@/lib/db')
      const mockNotes = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000', // UUID format
          title: 'Test Note 1',
          content: 'Content 1',
          userId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          isFavorite: false,
          version: 1,
          category: null,
          tags: [],
        },
        {
          id: 'note-2-simple-id', // Simple string ID
          title: 'Test Note 2',
          content: 'Content 2',
          userId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          isFavorite: false,
          version: 1,
          category: null,
          tags: [],
        },
      ]

      prisma.note.findMany.mockResolvedValue(mockNotes)
      prisma.note.count.mockResolvedValue(2)

      const request = new NextRequest(new URL('http://localhost:3000/api/notes'), { method: 'GET' })
      const response = await GET(request)
      const data = await response.json()

      // Verify ID formats are consistent strings
      data.data.notes.forEach((note: any) => {
        expect(typeof note.id).toBe('string')
        expect(note.id.length).toBeGreaterThan(0)
        // Could enforce UUID format if that's the requirement
        // expect(note.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      })
    })
  })
})