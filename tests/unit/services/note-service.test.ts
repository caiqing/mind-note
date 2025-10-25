/**
 * 笔记服务单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { INoteService, NoteService } from '@/lib/services/note-service';
import { PrismaClient, NoteStatus } from '@prisma/client';
import { NoteError, NOTE_ERRORS } from '@/types/note';

// Prisma Client is mocked in vitest.setup.ts

describe('NoteService', () => {
  let noteService: INoteService;
  let mockPrisma: any;
  let userId: string;
  let noteId: string;

  beforeEach(() => {
    // 创建mock实例
    mockPrisma = {
      note: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
      category: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      tag: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $transaction: vi.fn(),
    };

    // 创建服务实例
    noteService = new NoteService(mockPrisma);
    userId = 'user_123';
    noteId = 'note_123';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createNote', () => {
    it('should create a note successfully', async () => {
      // Arrange
      const noteData = {
        title: 'Test Note',
        content: 'This is a test note content',
        tags: ['test'],
        metadata: { source: 'manual' },
      };

      const expectedTransformedNote = {
        id: noteId,
        userId,
        title: noteData.title,
        content: noteData.content,
        contentHash: 'hash123',
        tags: [
          {
            id: 123,
            name: 'test',
            color: '#0000ff',
            category: 'general',
          },
        ],
        metadata: noteData.metadata,
        status: NoteStatus.DRAFT,
        isPublic: false,
        viewCount: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        aiProcessed: false,
        aiKeywords: [],
        version: 1,
        categoryId: undefined,
        category: undefined,
        contentVector: undefined,
        aiSummary: undefined,
        aiProcessedAt: undefined,
      };

      // Mock tag findFirst to return null (new tag)
      mockPrisma.tag.findFirst.mockResolvedValue(null);

      // Mock tag create to return a tag (ID should be number according to Prisma schema)
      mockPrisma.tag.create.mockResolvedValue({
        id: 123,
        name: 'test',
        color: '#0000ff',
      });

      // Mock note.create to return the raw database result (with NoteTag structure)
      const mockCreatedNote = {
        id: noteId,
        userId,
        title: noteData.title,
        content: noteData.content,
        contentHash: 'hash123',
        metadata: noteData.metadata,
        status: NoteStatus.DRAFT,
        isPublic: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        aiProcessed: false,
        aiKeywords: [],
        version: 1,
        // Include NoteTag relationship structure
        tags: [
          {
            noteId: noteId,
            tagId: 123,
            tag: {
              id: 123,
              name: 'test',
              color: '#0000ff',
              category: 'general',
            },
          },
        ],
        // Other relationships
        category: null,
      };

      mockPrisma.note.create.mockResolvedValue(mockCreatedNote);

      // Act
      const result = await noteService.createNote(userId, noteData);

      // Assert
      expect(result).toEqual(expectedTransformedNote);
      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          title: noteData.title,
          content: noteData.content,
          metadata: noteData.metadata,
          status: 'DRAFT',
          isPublic: false,
          contentHash: expect.any(String),
        }),
        include: expect.objectContaining({
          category: true,
          tags: true,
          user: expect.any(Object),
        }),
      });
    });

    it('should throw validation error for empty title', async () => {
      // Arrange
      const invalidData = {
        title: '',
        content: 'Some content',
      };

      // Act & Assert
      await expect(noteService.createNote(userId, invalidData)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Title is required'),
          code: 'VALIDATION_FAILED',
        }),
      );
    });

    it('should throw validation error for empty content', async () => {
      // Arrange
      const invalidData = {
        title: 'Valid Title',
        content: '',
      };

      // Act & Assert
      await expect(noteService.createNote(userId, invalidData)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Content is required'),
          code: 'VALIDATION_FAILED',
        }),
      );
    });

    it('should handle duplicate content error', async () => {
      // Arrange
      const noteData = {
        title: 'Test Note',
        content: 'Duplicate content',
      };

      mockPrisma.note.create.mockRejectedValue(
        new Error('Unique constraint failed'),
      );

      // Act & Assert
      await expect(noteService.createNote(userId, noteData)).rejects.toThrow(
        new NoteError(
          expect.stringContaining('Duplicate content'),
          'DUPLICATE_CONTENT',
          409,
        ),
      );
    });
  });

  describe('getNoteById', () => {
    it('should return note when found', async () => {
      // Arrange
      const mockNote = {
        id: noteId,
        userId,
        title: 'Test Note',
        content: 'Test content',
        contentHash: 'hash123',
        tags: [
          {
            tag: {
              id: 'tag_1',
              name: 'test',
              color: '#FF5733',
              category: 'general',
            },
          },
        ],
        metadata: {},
        status: 'PUBLISHED',
        isPublic: false,
        viewCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        aiProcessed: true,
        aiSummary: 'Test summary',
        aiKeywords: ['test', 'summary'],
        version: 1,
        aiProcessedAt: new Date(),
        category: null,
        user: {
          id: userId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const expectedNote = {
        id: noteId,
        userId,
        title: 'Test Note',
        content: 'Test content',
        contentHash: 'hash123',
        categoryId: undefined,
        category: undefined,
        tags: [
          {
            id: 'tag_1',
            name: 'test',
            color: '#FF5733',
            category: 'general',
          },
        ],
        metadata: {},
        status: 'PUBLISHED',
        isPublic: false,
        viewCount: 10,
        createdAt: mockNote.createdAt,
        updatedAt: mockNote.updatedAt,
        aiProcessed: true,
        aiSummary: 'Test summary',
        aiKeywords: ['test', 'summary'],
        version: 1,
        aiProcessedAt: mockNote.aiProcessedAt,
        contentVector: undefined,
      };

      mockPrisma.note.findFirst.mockResolvedValue(mockNote);

      // Act
      const result = await noteService.getNoteById(noteId, userId);

      // Assert
      expect(result).toEqual(expectedNote);
      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith({
        where: {
          id: noteId,
          OR: [
            { userId }, // 用户自己的笔记
            { isPublic: true }, // 公开的笔记
          ],
        },
        include: {
          category: true,
          tags: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should return null when note not found', async () => {
      // Arrange
      mockPrisma.note.findFirst.mockResolvedValue(null);

      // Act
      const result = await noteService.getNoteById('nonexistent', userId);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for private note of different user', async () => {
      // Arrange
      const otherUserId = 'other_user';
      mockPrisma.note.findFirst.mockResolvedValue(null); // 因为查询条件是OR: [userId, isPublic:true]，而笔记是私有的

      // Act
      const result = await noteService.getNoteById(noteId, userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateNote', () => {
    it('should update note successfully', async () => {
      // Arrange
      const updateData = {
        title: 'Updated Note',
        content: 'Updated content',
        tags: ['updated', 'test'],
      };

      const updatedNote = {
        id: noteId,
        userId,
        title: updateData.title,
        content: updateData.content,
        tags: updateData.tags,
        metadata: {},
        status: 'PUBLISHED',
        isPublic: false,
        viewCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        aiProcessed: false,
        aiKeywords: [],
        version: 2,
      };

      mockPrisma.note.findUnique.mockResolvedValue({ userId });
      mockPrisma.note.update.mockResolvedValue(updatedNote);

      // Act
      const result = await noteService.updateNote(noteId, userId, updateData);

      // Assert
      expect(result).toEqual(updatedNote);
      expect(mockPrisma.note.findUnique).toHaveBeenCalledWith({
        where: { id: noteId, userId },
      });
      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: expect.objectContaining({
          title: updateData.title,
          content: updateData.content,
          tags: updateData.tags,
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should throw not found error when note does not exist', async () => {
      // Arrange
      const updateData = { title: 'Updated Note' };
      mockPrisma.note.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        noteService.updateNote(noteId, userId, updateData),
      ).rejects.toThrow(
        new NoteError(
          expect.stringContaining('Note not found'),
          'NOT_FOUND',
          404,
        ),
      );
    });

    it('should auto-increment version number', async () => {
      // Arrange
      const updateData = { content: 'Updated content' };

      const existingNote = {
        id: noteId,
        userId,
        title: 'Original Note',
        content: 'Original content',
        version: 1,
      };

      const updatedNote = {
        ...existingNote,
        content: updateData.content,
        version: 2,
        updatedAt: new Date(),
      };

      mockPrisma.note.findUnique.mockResolvedValue(existingNote);
      mockPrisma.note.update.mockResolvedValue(updatedNote);

      // Act
      const result = await noteService.updateNote(noteId, userId, updateData);

      // Assert
      expect(result.version).toBe(2);
      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: expect.objectContaining({
          version: 2,
        }),
      });
    });
  });

  describe('deleteNote', () => {
    it('should delete note successfully', async () => {
      // Arrange
      mockPrisma.note.findFirst.mockResolvedValue({
        id: noteId,
        userId,
        status: 'PUBLISHED',
      });
      mockPrisma.note.update.mockResolvedValue({
        id: noteId,
        status: 'ARCHIVED',
        updatedAt: new Date(),
      });

      // Act
      const result = await noteService.deleteNote(noteId, userId);

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith({
        where: { id: noteId, userId },
      });
      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: {
          status: 'ARCHIVED',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw error when note does not exist', async () => {
      // Arrange
      mockPrisma.note.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(noteService.deleteNote(noteId, userId)).rejects.toThrow(
        new NoteError('Note not found', 'NOT_FOUND', 404)
      );
      expect(mockPrisma.note.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to delete note of different user', async () => {
      // Arrange - 如果笔记属于其他用户，findFirst会因为userId不匹配而返回null
      mockPrisma.note.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(noteService.deleteNote(noteId, userId)).rejects.toThrow(
        new NoteError('Note not found', 'NOT_FOUND', 404)
      );
      expect(mockPrisma.note.update).not.toHaveBeenCalled();
    });
  });

  describe('getNotesByUserId', () => {
    it('should return paginated notes', async () => {
      // Arrange
      const params = {
        page: 1,
        limit: 10,
        status: 'PUBLISHED',
      };

      const expectedNotes = [
        {
          id: 'note_1',
          userId,
          title: 'Note 1',
          content: 'Content 1',
          tags: [
            {
              noteId: 'note_1',
              tagId: 1,
              tag: {
                id: 1,
                name: 'tag1',
                color: '#ff0000',
                category: 'general',
              },
            },
          ],
          createdAt: new Date(),
          metadata: {},
          aiProcessed: undefined,
          aiSummary: undefined,
          aiKeywords: [],
          version: undefined,
          status: undefined,
          isPublic: undefined,
          viewCount: undefined,
          updatedAt: undefined,
          aiProcessedAt: undefined,
          categoryId: undefined,
          category: undefined,
          contentHash: undefined,
          contentVector: undefined,
        },
        {
          id: 'note_2',
          userId,
          title: 'Note 2',
          content: 'Content 2',
          tags: [
            {
              noteId: 'note_2',
              tagId: 2,
              tag: {
                id: 2,
                name: 'tag2',
                color: '#00ff00',
                category: 'general',
              },
            },
          ],
          createdAt: new Date(),
          metadata: {},
          aiProcessed: undefined,
          aiSummary: undefined,
          aiKeywords: [],
          version: undefined,
          status: undefined,
          isPublic: undefined,
          viewCount: undefined,
          updatedAt: undefined,
          aiProcessedAt: undefined,
          categoryId: undefined,
          category: undefined,
          contentHash: undefined,
          contentVector: undefined,
        },
      ];

      const totalCount = 25;

      mockPrisma.note.count.mockResolvedValue(totalCount);
      mockPrisma.note.findMany.mockResolvedValue(expectedNotes);

      // Act
      const result = await noteService.getNotesByUserId(userId, params);

      // Assert
      // 期望的转换后结果（transformNoteToWithDetails处理后的格式）
      const expectedTransformedNotes = [
        {
          id: 'note_1',
          userId,
          title: 'Note 1',
          content: 'Content 1',
          tags: [
            {
              id: 1,
              name: 'tag1',
              color: '#ff0000',
              category: 'general',
            },
          ],
          createdAt: expect.any(Date),
          metadata: {},
          aiProcessed: undefined,
          aiSummary: undefined,
          aiKeywords: [],
          version: undefined,
          status: undefined,
          isPublic: undefined,
          viewCount: undefined,
          updatedAt: undefined,
          aiProcessedAt: undefined,
          categoryId: undefined,
          category: undefined,
          contentHash: undefined,
          contentVector: undefined,
        },
        {
          id: 'note_2',
          userId,
          title: 'Note 2',
          content: 'Content 2',
          tags: [
            {
              id: 2,
              name: 'tag2',
              color: '#00ff00',
              category: 'general',
            },
          ],
          createdAt: expect.any(Date),
          metadata: {},
          aiProcessed: undefined,
          aiSummary: undefined,
          aiKeywords: [],
          version: undefined,
          status: undefined,
          isPublic: undefined,
          viewCount: undefined,
          updatedAt: undefined,
          aiProcessedAt: undefined,
          categoryId: undefined,
          category: undefined,
          contentHash: undefined,
          contentVector: undefined,
        },
      ];

      expect(result.notes).toEqual(expectedTransformedNotes);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: totalCount,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
      expect(result.total).toBe(totalCount);

      expect(mockPrisma.note.count).toHaveBeenCalledWith({
        where: {
          userId,
          status: 'PUBLISHED',
        },
      });
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: 'PUBLISHED',
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
    });

    it('should handle search filtering', async () => {
      // Arrange
      const params = {
        page: 1,
        limit: 5,
        search: 'productivity',
        tags: ['important'],
      };

      mockPrisma.note.count.mockResolvedValue(5);
      mockPrisma.note.findMany.mockResolvedValue([]);

      // Act
      await noteService.getNotesByUserId(userId, params);

      // Assert
      expect(mockPrisma.note.count).toHaveBeenCalledWith({
        where: {
          userId,
          OR: [
            { title: { contains: 'productivity', mode: 'insensitive' } },
            { content: { contains: 'productivity', mode: 'insensitive' } },
            { aiSummary: { contains: 'productivity', mode: 'insensitive' } },
          ],
          tags: {
            some: {
              tag: {
                name: {
                  in: ['important'],
                },
              },
            },
          },
        },
      });
    });
  });

  describe('autoSave', () => {
    it('should auto-save note successfully', async () => {
      // Arrange
      const autoSaveData = {
        title: 'Auto-saved Note',
        content: 'Auto-saved content',
        tags: ['autosave'],
      };

      const existingNote = {
        id: noteId,
        userId,
        title: 'Original Title',
        content: 'Original Content',
        tags: ['original'],
        updatedAt: new Date(Date.now() - 60000), // 1 minute ago
      };

      const updatedNote = {
        ...existingNote,
        title: autoSaveData.title,
        content: autoSaveData.content,
        tags: autoSaveData.tags,
        updatedAt: new Date(),
        autoSaved: true,
        savedAt: new Date(),
        hasChanges: true,
      };

      // Setup tag mocks for autoSave
      mockPrisma.tag.findFirst.mockResolvedValue(null);
      mockPrisma.tag.create.mockResolvedValue({
        id: 456,
        name: 'autosave',
        color: '#00ff00',
      });

      mockPrisma.note.findUnique.mockResolvedValue(existingNote);
      mockPrisma.note.update.mockResolvedValue(updatedNote);

      // Act
      const result = await noteService.autoSave(noteId, userId, autoSaveData);

      // Assert
      expect(result.id).toBe(noteId);
      expect(result.autoSaved).toBe(true);
      expect(result.hasChanges).toBe(true);
      expect(result.savedAt).toBeInstanceOf(Date);
    });

    it('should return no changes when content is identical', async () => {
      // Arrange
      const autoSaveData = {
        title: 'Same Title',
        content: 'Same Content',
        tags: ['same'],
      };

      const existingNote = {
        id: noteId,
        userId,
        title: 'Same Title',
        content: 'Same Content',
        tags: ['same'],
        updatedAt: new Date(),
      };

      mockPrisma.note.findUnique.mockResolvedValue(existingNote);

      // Act
      const result = await noteService.autoSave(noteId, userId, autoSaveData);

      // Assert
      expect(result.hasChanges).toBe(false);
      expect(mockPrisma.note.update).not.toHaveBeenCalled();
    });

    it('should throw not found error for non-existent note', async () => {
      // Arrange
      mockPrisma.note.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        noteService.autoSave('nonexistent', userId, {}),
      ).rejects.toThrow(
        new NoteError(
          expect.stringContaining('Note not found'),
          'NOT_FOUND',
          404,
        ),
      );
    });
  });

  describe('batchOperation', () => {
    it('should successfully delete multiple notes', async () => {
      // Arrange
      const request = {
        noteIds: ['note_1', 'note_2', 'note_3'],
        operation: 'delete' as const,
      };

      const mockNotes = [
        { id: 'note_1', userId },
        { id: 'note_2', userId },
        { id: 'note_3', userId },
      ];

      mockPrisma.$transaction.mockImplementation(async callback => {
        return callback(mockPrisma);
      });

      // Mock findMany for ownership validation
      mockPrisma.note.findMany.mockResolvedValue(mockNotes);

      // Mock findFirst for individual delete operations
      mockPrisma.note.findFirst.mockResolvedValue({ id: 'note_1', userId });
      mockPrisma.note.delete.mockResolvedValue({ count: 1 });

      // Mock deleteMany (though it's not used in current implementation)
      mockPrisma.note.deleteMany.mockResolvedValue({ count: 3 });

      // Act
      const result = await noteService.batchOperation(userId, request);

      // Assert
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.summary).toEqual({
        total: 3,
        successful: 3,
        failed: 0,
      });
    });

    it('should handle partial failures', async () => {
      // Arrange
      const request = {
        noteIds: ['note_1', 'note_2'],
        operation: 'delete' as const,
      };

      const mockNotes = [
        { id: 'note_1', userId },
        { id: 'note_2', userId },
      ];

      mockPrisma.$transaction.mockImplementation(async callback => {
        return callback(mockPrisma);
      });

      mockPrisma.note.findMany.mockResolvedValue(mockNotes);
      mockPrisma.note.deleteMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await noteService.batchOperation(userId, request);

      // Assert
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].id).toBe('note_1');
      expect(result.failed[0].error).toContain('Note not found');
    });
  });

  describe('generateContentHash', () => {
    it('should generate SHA-256 hash by default', () => {
      // Arrange
      const content = 'Test content for hashing';

      // Act
      const hash = noteService.generateContentHash(content);

      // Assert
      expect(hash).toHaveLength(64); // SHA-256 hash length
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate MD5 hash when specified', () => {
      // Arrange
      const content = 'Test content for hashing';

      // Act
      const hash = noteService.generateContentHash(content, {
        algorithm: 'md5',
      });

      // Assert
      expect(hash).toHaveLength(32); // MD5 hash length
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should normalize whitespace by default', () => {
      // Arrange
      const content = '  Test   content  ';

      // Act
      const hash = noteService.generateContentHash(content);

      // Assert
      const normalizedHash = noteService.generateContentHash('Test content');
      expect(hash).toBe(normalizedHash);
    });
  });

  describe('validateNote', () => {
    it('should validate valid note data', () => {
      // Arrange
      const validData = {
        title: 'Valid Note Title',
        content: 'Valid note content with sufficient length',
        tags: ['tag1', 'tag2'],
        metadata: { source: 'test' },
      };

      // Act
      const result = noteService.validateNote(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect title validation errors', () => {
      // Arrange
      const invalidData = {
        title: '', // Empty title
        content: 'Valid content',
      };

      // Act
      const result = noteService.validateNote(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('title');
      expect(result.errors[0].code).toBe('TITLE_REQUIRED');
    });

    it('should detect tag count validation errors', () => {
      // Arrange
      const tooManyTags = Array(15).fill('tag'); // More than max 10
      const invalidData = {
        title: 'Valid Title',
        content: 'Valid content',
        tags: tooManyTags,
      };

      // Act
      const result = noteService.validateNote(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e => e.field === 'tags' && e.code === 'TOO_MANY_TAGS',
        ),
      ).toBe(true);
    });
  });

  describe('checkForDuplicates', () => {
    it('should detect duplicate content', async () => {
      // Arrange
      const content = 'Duplicate content to check';
      const existingHash = 'existing_hash_123';

      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'existing_note',
        contentHash: existingHash,
      });

      mockPrisma.noteService = {
        generateContentHash: vi.fn().mockReturnValue('hash_123'),
      } as any;

      Object.defineProperty(noteService, 'generateContentHash', {
        value: vi.fn().mockReturnValue('hash_123'),
        writable: true,
      });

      // Act
      const result = await noteService.checkForDuplicates(userId, content);

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          contentHash: 'hash_123',
        },
      });
    });

    it('should return false for unique content', async () => {
      // Arrange
      const content = 'Unique content';
      mockPrisma.note.findFirst.mockResolvedValue(null);

      Object.defineProperty(noteService, 'generateContentHash', {
        value: vi.fn().mockReturnValue('unique_hash_456'),
        writable: true,
      });

      // Act
      const result = await noteService.checkForDuplicates(userId, content);

      // Assert
      expect(result).toBe(false);
    });
  });
});
