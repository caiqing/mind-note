/**
 * 笔记服务单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { INoteService, NoteService } from '@/lib/services/note-service';
import { PrismaClient } from '@prisma/client';
import { NoteError, NOTE_ERRORS } from '@/types/note';

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
}));

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
        count: vi.fn(),
        findFirst: vi.fn(),
      },
      category: {
        findMany: vi.fn(),
      },
      tag: {
        findMany: vi.fn(),
      },
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

      const expectedNote = {
        id: noteId,
        userId,
        title: noteData.title,
        content: noteData.content,
        contentHash: 'hash123',
        tags: noteData.tags,
        metadata: noteData.metadata,
        status: 'DRAFT',
        isPublic: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        aiProcessed: false,
        aiKeywords: [],
        version: 1,
      };

      mockPrisma.note.create.mockResolvedValue(expectedNote);

      // Act
      const result = await noteService.createNote(userId, noteData);

      // Assert
      expect(result).toEqual(expectedNote);
      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          title: noteData.title,
          content: noteData.content,
          tags: noteData.tags,
          metadata: noteData.metadata,
          status: 'DRAFT',
          isPublic: false,
          contentHash: expect.any(String),
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
        new NoteError(
          expect.stringContaining('Title is required'),
          'VALIDATION_FAILED',
          400,
        ),
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
        new NoteError(
          expect.stringContaining('Content is required'),
          'VALIDATION_FAILED',
          400,
        ),
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
      const expectedNote = {
        id: noteId,
        userId,
        title: 'Test Note',
        content: 'Test content',
        contentHash: 'hash123',
        tags: ['test'],
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
      };

      mockPrisma.note.findUnique.mockResolvedValue(expectedNote);

      // Act
      const result = await noteService.getNoteById(noteId, userId);

      // Assert
      expect(result).toEqual(expectedNote);
      expect(mockPrisma.note.findUnique).toHaveBeenCalledWith({
        where: {
          id: noteId,
          userId,
        },
        include: expect.any(Object),
      });
    });

    it('should return null when note not found', async () => {
      // Arrange
      mockPrisma.note.findUnique.mockResolvedValue(null);

      // Act
      const result = await noteService.getNoteById('nonexistent', userId);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw access denied error for different user', async () => {
      // Arrange
      const otherUserId = 'other_user';
      mockPrisma.note.findUnique.mockResolvedValue({
        id: noteId,
        userId: otherUserId,
        title: 'Test Note',
        content: 'Test content',
      });

      // Act & Assert
      await expect(noteService.getNoteById(noteId, userId)).rejects.toThrow(
        new NoteError(
          expect.stringContaining('Access denied'),
          'ACCESS_DENIED',
          403,
        ),
      );
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
      mockPrisma.note.findUnique.mockResolvedValue({ userId });
      mockPrisma.note.delete.mockResolvedValue({ id: noteId });

      // Act
      const result = await noteService.deleteNote(noteId, userId);

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.note.findUnique).toHaveBeenCalledWith({
        where: { id: noteId, userId },
      });
      expect(mockPrisma.note.delete).toHaveBeenCalledWith({
        where: { id: noteId },
      });
    });

    it('should return false when note does not exist', async () => {
      // Arrange
      mockPrisma.note.findUnique.mockResolvedValue(null);

      // Act
      const result = await noteService.deleteNote(noteId, userId);

      // Assert
      expect(result).toBe(false);
      expect(mockPrisma.note.delete).not.toHaveBeenCalled();
    });

    it('should throw access denied error for different user', async () => {
      // Arrange
      const otherUserId = 'other_user';
      mockPrisma.note.findUnique.mockResolvedValue({
        id: noteId,
        userId: otherUserId,
        title: 'Test Note',
      });

      // Act & Assert
      await expect(noteService.deleteNote(noteId, userId)).rejects.toThrow(
        new NoteError(
          expect.stringContaining('Access denied'),
          'ACCESS_DENIED',
          403,
        ),
      );
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
          tags: ['tag1'],
          createdAt: new Date(),
        },
        {
          id: 'note_2',
          userId,
          title: 'Note 2',
          content: 'Content 2',
          tags: ['tag2'],
          createdAt: new Date(),
        },
      ];

      const totalCount = 25;

      mockPrisma.note.count.mockResolvedValue(totalCount);
      mockPrisma.note.findMany.mockResolvedValue(expectedNotes);

      // Act
      const result = await noteService.getNotesByUserId(userId, params);

      // Assert
      expect(result.notes).toEqual(expectedNotes);
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
          AND: [
            {
              OR: [
                { title: { contains: 'productivity', mode: 'insensitive' } },
                { content: { contains: 'productivity', mode: 'insensitive' } },
              ],
            },
            { tags: { hasSome: ['important'] } },
          ],
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

      mockPrisma.note.findMany.mockResolvedValue(mockNotes);
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
      expect(result.failed[0].error).toContain('Database error');
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
      expect(result.errors[0].code).toBe('REQUIRED');
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
      const result = noteService.validateNote(invalidData, {
        tags: { maxCount: 10 },
      });

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
