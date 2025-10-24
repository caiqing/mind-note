/**
 * 笔记服务实现
 *
 * 提供完整的笔记CRUD操作、搜索、统计分析等功能
 * 遵循领域驱动设计原则，实现业务逻辑和数据访问的分离
 */

import { PrismaClient, Prisma, NoteStatus } from '@prisma/client';
import crypto from 'crypto';
import {
  type INoteService,
  type CreateNoteRequest,
  type UpdateNoteRequest,
  type NoteWithDetails,
  type NoteQueryParams,
  type NoteQueryResult,
  type SearchRequest,
  type SearchResult,
  type SimilarNotesRequest,
  type SimilarNotesResult,
  type AutoSaveRequest,
  type AutoSaveResult,
  type BatchOperationRequest,
  type BatchOperationResult,
  type NoteStats,
  type ImportOptions,
  type ImportResult,
  type ExportOptions,
  type ExportResult,
  type ContentHashOptions,
  type NoteValidationRules,
  type NoteValidationResult,
  type PaginationInfo,
  NoteError,
  NOTE_ERRORS,
} from '@/types/note';

export class NoteService implements INoteService {
  constructor(private readonly prisma: PrismaClient) {}

  // ==================== CRUD Operations ====================

  async createNote(
    userId: string,
    data: CreateNoteRequest,
  ): Promise<NoteWithDetails> {
    try {
      // 1. 验证数据
      const validation = this.validateNote(data);
      if (!validation.isValid) {
        throw new NoteError(
          `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          'VALIDATION_FAILED',
          400,
          validation.errors,
        );
      }

      // 2. 检查重复内容
      const isDuplicate = await this.checkForDuplicates(userId, data.content);
      if (isDuplicate) {
        throw NOTE_ERRORS.DUPLICATE_CONTENT;
      }

      // 3. 生成内容哈希
      const contentHash = this.generateContentHash(data.content);

      // 4. 处理标签
      const tags = await this.processTags(data.tags || []);

      // 5. 创建笔记
      const note = await this.prisma.note.create({
        data: {
          title: data.title,
          content: data.content,
          contentHash,
          categoryId: data.categoryId,
          userId,
          status: data.status || NoteStatus.DRAFT,
          isPublic: data.isPublic || false,
          metadata: data.metadata || {},
          version: 1,
          viewCount: 0,
          aiProcessed: false,
          aiKeywords: [],
          tags: {
            connect: tags.map(tag => ({ id: tag.id })),
          },
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

      // 6. 转换为标准格式并返回
      return this.transformNoteToWithDetails(note);
    } catch (error) {
      if (error instanceof NoteError) {
        throw error;
      }
      console.error('Error creating note:', error);
      throw new NoteError('Failed to create note', 'CREATION_ERROR', 500);
    }
  }

  async getNoteById(
    noteId: string,
    userId: string,
  ): Promise<NoteWithDetails | null> {
    try {
      const note = await this.prisma.note.findFirst({
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

      if (!note) {
        return null;
      }

      // 增加浏览次数（异步，不影响返回）
      if (note.userId !== userId) {
        this.incrementViewCount(noteId).catch(console.error);
      }

      return this.transformNoteToWithDetails(note);
    } catch (error) {
      console.error('Error getting note by ID:', error);
      throw new NoteError('Failed to retrieve note', 'RETRIEVAL_ERROR', 500);
    }
  }

  async updateNote(
    noteId: string,
    userId: string,
    data: UpdateNoteRequest,
  ): Promise<NoteWithDetails> {
    try {
      // 1. 检查笔记是否存在且属于用户
      const existingNote = await this.prisma.note.findFirst({
        where: { id: noteId, userId },
      });

      if (!existingNote) {
        throw NOTE_ERRORS.NOT_FOUND;
      }

      // 2. 验证更新数据
      const validation = this.validateNote(data as any);
      if (!validation.isValid) {
        throw new NoteError(
          `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          'VALIDATION_FAILED',
          400,
          validation.errors,
        );
      }

      // 3. 检查内容是否变化
      const contentChanged =
        data.content && data.content !== existingNote.content;
      const newContentHash = contentChanged
        ? this.generateContentHash(data.content)
        : existingNote.contentHash;

      // 4. 如果内容变化，检查重复
      if (contentChanged) {
        const isDuplicate = await this.checkForDuplicates(
          userId,
          data.content!,
          noteId,
        );
        if (isDuplicate) {
          throw NOTE_ERRORS.DUPLICATE_CONTENT;
        }
      }

      // 5. 处理标签更新
      const tagUpdates = data.tags
        ? await this.processTags(data.tags)
        : undefined;

      // 6. 准备更新数据
      const updateData: any = {
        ...data,
        contentHash: newContentHash,
        version: existingNote.version + 1,
        updatedAt: new Date(),
        aiProcessed: false, // 内容变化时重置AI处理状态
      };

      // 7. 处理标签关联
      if (tagUpdates) {
        updateData.tags = {
          set: tagUpdates.map(tag => ({ id: tag.id })),
        };
      }

      // 8. 执行更新
      const updatedNote = await this.prisma.note.update({
        where: { id: noteId },
        data: updateData,
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

      return this.transformNoteToWithDetails(updatedNote);
    } catch (error) {
      if (error instanceof NoteError) {
        throw error;
      }
      console.error('Error updating note:', error);
      throw new NoteError('Failed to update note', 'UPDATE_ERROR', 500);
    }
  }

  async deleteNote(noteId: string, userId: string): Promise<boolean> {
    try {
      // 检查笔记是否存在且属于用户
      const existingNote = await this.prisma.note.findFirst({
        where: { id: noteId, userId },
      });

      if (!existingNote) {
        throw NOTE_ERRORS.NOT_FOUND;
      }

      // 软删除：更新状态为ARCHIVED
      await this.prisma.note.update({
        where: { id: noteId },
        data: {
          status: NoteStatus.ARCHIVED,
          updatedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      if (error instanceof NoteError) {
        throw error;
      }
      console.error('Error deleting note:', error);
      throw new NoteError('Failed to delete note', 'DELETION_ERROR', 500);
    }
  }

  // ==================== Query Operations ====================

  async getNotesByUserId(
    userId: string,
    params?: NoteQueryParams,
  ): Promise<NoteQueryResult> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        categoryId,
        tags,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeContent = true,
      } = params || {};

      const offset = (page - 1) * limit;

      // 构建查询条件
      const where: Prisma.NoteWhereInput = {
        userId,
        ...(status && { status }),
        ...(categoryId && { categoryId }),
        ...(tags &&
          tags.length > 0 && {
          tags: {
            some: {
              tag: {
                name: {
                  in: tags,
                },
              },
            },
          },
        }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { aiSummary: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // 获取总数
      const total = await this.prisma.note.count({ where });

      // 构建排序条件
      const orderBy: Prisma.NoteOrderByWithRelationInput = {};
      orderBy[sortBy] = sortOrder;

      // 查询笔记
      const notes = await this.prisma.note.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
          ...(includeContent
            ? {}
            : {
              select: {
                id: true,
                title: true,
                status: true,
                isPublic: true,
                viewCount: true,
                createdAt: true,
                updatedAt: true,
                userId: true,
                categoryId: true,
                category: true,
                tags: true,
              },
            }),
        },
      });

      // 转换数据格式
      const transformedNotes = notes.map(note =>
        this.transformNoteToWithDetails(note),
      );

      // 构建分页信息
      const totalPages = Math.ceil(total / limit);
      const pagination: PaginationInfo = {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      return {
        notes: transformedNotes,
        pagination,
        total,
      };
    } catch (error) {
      console.error('Error getting notes by user ID:', error);
      throw new NoteError('Failed to retrieve notes', 'QUERY_ERROR', 500);
    }
  }

  async searchNotes(
    userId: string,
    search: SearchRequest,
  ): Promise<SearchResult> {
    try {
      const { query, filters = {}, sort = {}, pagination = {} } = search;

      const { categories, tags, dateRange, status } = filters;

      const { field = 'relevance', order = 'desc' } = sort;

      const { page = 1, limit = 20 } = pagination;

      const offset = (page - 1) * limit;

      // 构建复杂查询条件
      const where: Prisma.NoteWhereInput = {
        userId,
        ...(categories &&
          categories.length > 0 && {
          categoryId: { in: categories },
        }),
        ...(tags &&
          tags.length > 0 && {
          tags: {
            some: {
              tag: {
                name: { in: tags },
              },
            },
          },
        }),
        ...(dateRange && {
          createdAt: {
            gte: new Date(dateRange.from),
            lte: new Date(dateRange.to),
          },
        }),
        ...(status &&
          status.length > 0 && {
          status: { in: status },
        }),
        ...(query && {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { aiSummary: { contains: query, mode: 'insensitive' } },
            { aiKeywords: { hasSome: query.split(' ') } },
          ],
        }),
      };

      // 获取总数
      const total = await this.prisma.note.count({ where });

      // 构建排序条件
      let orderBy: Prisma.NoteOrderByWithRelationInput;
      switch (field) {
      case 'relevance':
        // 简化的相关性排序：标题匹配优先
        orderBy = query
          ? [
            {
              title: { contains: query, mode: 'insensitive' }
                ? 'desc'
                : 'asc',
            },
            { createdAt: 'desc' },
          ]
          : { createdAt: 'desc' };
        break;
      case 'viewCount':
        orderBy = { viewCount: order };
        break;
      case 'title':
        orderBy = { title: order };
        break;
      case 'updatedAt':
        orderBy = { updatedAt: order };
        break;
      default:
        orderBy = { createdAt: 'desc' };
      }

      // 执行搜索
      const notes = await this.prisma.note.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          category: true,
          tags: {
            include: { tag: true },
          },
        },
      });

      // 转换并添加相关性评分
      const items = notes.map(note => {
        const transformed = this.transformNoteToWithDetails(note);
        const relevanceScore = this.calculateRelevanceScore(query, transformed);
        return {
          ...transformed,
          relevanceScore,
          highlights: this.generateHighlights(query, transformed),
        };
      });

      // 构建分页信息
      const totalPages = Math.ceil(total / limit);
      const paginationInfo: PaginationInfo = {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      // 模拟查询时间
      const queryTime = Math.random() * 100 + 50; // 50-150ms

      return {
        items,
        pagination: paginationInfo,
        searchMeta: {
          queryTime,
          totalResults: total,
        },
      };
    } catch (error) {
      console.error('Error searching notes:', error);
      throw new NoteError('Failed to search notes', 'SEARCH_ERROR', 500);
    }
  }

  async getSimilarNotes(
    noteId: string,
    userId: string,
    params?: SimilarNotesRequest,
  ): Promise<SimilarNotesResult> {
    try {
      const {
        limit = 10,
        excludeProcessed = false,
        minSimilarity = 0.3,
      } = params || {};

      // 获取目标笔记
      const targetNote = await this.prisma.note.findFirst({
        where: { id: noteId, userId },
        include: {
          tags: {
            include: { tag: true },
          },
        },
      });

      if (!targetNote) {
        throw NOTE_ERRORS.NOT_FOUND;
      }

      // 构建查询条件
      const where: Prisma.NoteWhereInput = {
        userId,
        id: { not: noteId }, // 排除自己
        ...(excludeProcessed && { aiProcessed: false }),
      };

      // 查询潜在相似的笔记
      const candidateNotes = await this.prisma.note.findMany({
        where,
        take: limit * 2, // 获取更多候选以便筛选
        include: {
          tags: {
            include: { tag: true },
          },
        },
      });

      // 计算相似度并筛选
      const similarNotes = candidateNotes
        .map(note => {
          const similarity = this.calculateNoteSimilarity(targetNote, note);
          const sharedTags = this.findSharedTags(targetNote, note);

          return {
            id: note.id,
            title: note.title,
            similarityScore: similarity,
            sharedTags: sharedTags.map(tag => tag.name),
            preview: this.generatePreview(note.content),
            distance: 1 - similarity, // 余弦距离
          };
        })
        .filter(note => note.similarityScore >= minSimilarity)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

      return { similarNotes };
    } catch (error) {
      if (error instanceof NoteError) {
        throw error;
      }
      console.error('Error getting similar notes:', error);
      throw new NoteError(
        'Failed to get similar notes',
        'SIMILARITY_ERROR',
        500,
      );
    }
  }

  // ==================== Auto-save ====================

  async autoSave(
    noteId: string,
    userId: string,
    data: AutoSaveRequest,
  ): Promise<AutoSaveResult> {
    try {
      // 检查笔记是否存在且属于用户
      const existingNote = await this.prisma.note.findFirst({
        where: { id: noteId, userId },
      });

      if (!existingNote) {
        // 如果笔记不存在，创建新笔记
        if (data.title && data.content) {
          const newNote = await this.createNote(userId, {
            title: data.title,
            content: data.content,
            tags: data.tags,
            metadata: data.metadata,
          });

          return {
            id: newNote.id,
            autoSaved: true,
            savedAt: new Date(),
            hasChanges: false,
          };
        } else {
          throw NOTE_ERRORS.NOT_FOUND;
        }
      }

      // 检查是否有实际变化
      const hasChanges =
        (data.title && data.title !== existingNote.title) ||
        (data.content && data.content !== existingNote.content) ||
        (data.tags &&
          JSON.stringify(data.tags.sort()) !==
            JSON.stringify(
              existingNote.tags?.map(t => t.tag.name).sort() || [],
            )) ||
        (data.metadata &&
          JSON.stringify(data.metadata) !==
            JSON.stringify(existingNote.metadata));

      if (!hasChanges) {
        return {
          id: noteId,
          autoSaved: false,
          savedAt: new Date(),
          hasChanges: false,
        };
      }

      // 准备更新数据
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.title && data.title !== existingNote.title) {
        updateData.title = data.title;
      }

      if (data.content && data.content !== existingNote.content) {
        updateData.content = data.content;
        updateData.contentHash = this.generateContentHash(data.content);
        updateData.version = existingNote.version + 1;
        updateData.aiProcessed = false; // 内容变化时重置AI处理状态
      }

      if (data.tags) {
        const tags = await this.processTags(data.tags);
        updateData.tags = {
          set: tags.map(tag => ({ id: tag.id })),
        };
      }

      if (data.metadata) {
        updateData.metadata = { ...existingNote.metadata, ...data.metadata };
      }

      // 执行更新
      await this.prisma.note.update({
        where: { id: noteId },
        data: updateData,
      });

      return {
        id: noteId,
        autoSaved: true,
        savedAt: new Date(),
        hasChanges: true,
      };
    } catch (error) {
      if (error instanceof NoteError) {
        throw error;
      }
      console.error('Error auto-saving note:', error);
      throw new NoteError('Failed to auto-save note', 'AUTOSAVE_ERROR', 500);
    }
  }

  // ==================== Batch Operations ====================

  async batchOperation(
    userId: string,
    request: BatchOperationRequest,
  ): Promise<BatchOperationResult> {
    try {
      const { noteIds, operation, data = {} } = request;
      const successful: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      // 验证笔记所有权
      const notes = await this.prisma.note.findMany({
        where: {
          id: { in: noteIds },
          userId,
        },
      });

      const validNoteIds = notes.map(note => note.id);
      const invalidNoteIds = noteIds.filter(id => !validNoteIds.includes(id));

      // 处理无效的笔记ID
      invalidNoteIds.forEach(id => {
        failed.push({ id, error: 'Note not found or access denied' });
      });

      // 批量处理有效笔记
      for (const noteId of validNoteIds) {
        try {
          await this.executeBatchOperation(noteId, operation, data);
          successful.push(noteId);
        } catch (error) {
          failed.push({
            id: noteId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const summary = {
        total: noteIds.length,
        successful: successful.length,
        failed: failed.length,
      };

      return {
        successful,
        failed,
        summary,
      };
    } catch (error) {
      console.error('Error executing batch operation:', error);
      throw new NoteError(
        'Failed to execute batch operation',
        'BATCH_OPERATION_ERROR',
        500,
      );
    }
  }

  // ==================== Statistics ====================

  async getNoteStats(userId: string, period?: string): Promise<NoteStats> {
    try {
      // 计算时间范围
      const now = new Date();
      const timeRange = this.calculateTimeRange(period, now);

      // 基础统计查询
      const [
        totalNotes,
        publishedNotes,
        draftNotes,
        archivedNotes,
        totalWordsResult,
        totalViewsResult,
        recentNotesResult,
        categoryStats,
        tagStats,
      ] = await Promise.all([
        // 总笔记数
        this.prisma.note.count({
          where: { userId },
        }),
        // 已发布笔记数
        this.prisma.note.count({
          where: { userId, status: NoteStatus.PUBLISHED },
        }),
        // 草稿笔记数
        this.prisma.note.count({
          where: { userId, status: NoteStatus.DRAFT },
        }),
        // 归档笔记数
        this.prisma.note.count({
          where: { userId, status: NoteStatus.ARCHIVED },
        }),
        // 总字数统计
        this.prisma.note.aggregate({
          where: { userId },
          _sum: {
            // 这里假设有一个wordCount字段，如果没有需要计算
            content: true, // 暂时用内容长度代替
          },
        }),
        // 总浏览数
        this.prisma.note.aggregate({
          where: { userId },
          _sum: {
            viewCount: true,
          },
        }),
        // 最近创建的笔记（用于统计本周和本月）
        this.prisma.note.findMany({
          where: {
            userId,
            createdAt: {
              gte: timeRange.weekStart,
            },
          },
          select: { createdAt: true },
        }),
        // 分类统计
        this.prisma.note.groupBy({
          by: ['categoryId'],
          where: { userId },
          _count: true,
        }),
        // 标签统计（需要通过关联表查询）
        this.prisma.$queryRaw`
          SELECT t.name, t.color, COUNT(*) as count
          FROM tags t
          JOIN note_tags nt ON t.id = nt.tag_id
          JOIN notes n ON nt.note_id = n.id
          WHERE n.user_id = ${userId}
          GROUP BY t.id, t.name, t.color
          ORDER BY count DESC
          LIMIT 10
        ` as Array<{ name: string; color: string | null; count: bigint }>,
      ]);

      // 计算平均值
      const averageWordsPerNote =
        totalNotes > 0
          ? Math.round(Number(totalWordsResult._sum.content || 0) / totalNotes)
          : 0;

      // 计算时间范围内的笔记数
      const notesThisWeek = recentNotesResult.filter(
        note => note.createdAt >= timeRange.weekStart,
      ).length;

      const notesThisMonth = recentNotesResult.filter(
        note => note.createdAt >= timeRange.monthStart,
      ).length;

      // 处理分类统计
      const topCategories = await Promise.all(
        categoryStats.map(async stat => {
          if (!stat.categoryId) {
            return null;
          }
          const category = await this.prisma.category.findUnique({
            where: { id: stat.categoryId },
            select: { name: true, color: true, icon: true },
          });
          return category
            ? {
              name: category.name,
              count: stat._count,
              color: category.color || undefined,
              icon: category.icon || undefined,
            }
            : null;
        }),
      );

      // 处理标签统计
      const topTags = tagStats.map(stat => ({
        name: stat.name,
        count: Number(stat.count),
        color: stat.color || undefined,
      }));

      return {
        totalNotes,
        publishedNotes,
        draftNotes,
        archivedNotes,
        totalWords: Number(totalWordsResult._sum.content || 0),
        averageWordsPerNote,
        totalViews: Number(totalViewsResult._sum.viewCount || 0),
        notesThisWeek,
        notesThisMonth,
        topCategories: topCategories.filter(Boolean) as Array<{
          name: string;
          count: number;
          color?: string;
          icon?: string;
        }>,
        topTags,
      };
    } catch (error) {
      console.error('Error getting note stats:', error);
      throw new NoteError(
        'Failed to retrieve note statistics',
        'STATS_ERROR',
        500,
      );
    }
  }

  // ==================== Import/Export ====================

  async importNotes(
    userId: string,
    data: any[],
    format: string,
    options?: ImportOptions,
  ): Promise<ImportResult> {
    try {
      const {
        skipDuplicates = true,
        preserveIds = false,
        autoAnalyze = false,
        batchSize = 10,
      } = options || {};

      let imported = 0;
      let skipped = 0;
      let failed = 0;
      const errors: Array<{ line: number; error: string; data?: any }> = [];

      // 分批处理
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const lineNumber = i + j + 1;

          try {
            // 验证数据格式
            if (!item.title || !item.content) {
              throw new Error('Missing required fields: title or content');
            }

            // 检查重复
            if (skipDuplicates) {
              const isDuplicate = await this.checkForDuplicates(
                userId,
                item.content,
              );
              if (isDuplicate) {
                skipped++;
                continue;
              }
            }

            // 准备创建数据
            const createData: CreateNoteRequest = {
              title: item.title,
              content: item.content,
              tags: item.tags,
              categoryId: item.categoryId,
              metadata: item.metadata,
              status: item.status,
              isPublic: item.isPublic,
            };

            // 如果保留ID且用户有权限
            if (preserveIds && item.id) {
              // 这里需要特殊处理，因为Prisma不允许自定义ID
              // 暂时跳过ID保留逻辑
            }

            // 创建笔记
            await this.createNote(userId, createData);
            imported++;

            // 如果需要自动分析
            if (autoAnalyze) {
              // 这里可以触发AI分析任务
              // await this.triggerAIAnalysis(noteId);
            }
          } catch (error) {
            failed++;
            errors.push({
              line: lineNumber,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: item,
            });
          }
        }
      }

      return {
        imported,
        skipped,
        failed,
        errors,
      };
    } catch (error) {
      console.error('Error importing notes:', error);
      throw new NoteError('Failed to import notes', 'IMPORT_ERROR', 500);
    }
  }

  async exportNotes(
    userId: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      const {
        format,
        filters = {},
        includeAIResults = true,
        includeMetadata = true,
        includePrivateNotes = true,
      } = options;

      // 构建查询条件
      const where: Prisma.NoteWhereInput = {
        userId,
        ...(!includePrivateNotes && { isPublic: true }),
        ...(filters.categories &&
          filters.categories.length > 0 && {
          categoryId: { in: filters.categories },
        }),
        ...(filters.dateRange && {
          createdAt: {
            gte: new Date(filters.dateRange.from),
            lte: new Date(filters.dateRange.to),
          },
        }),
        ...(filters.status &&
          filters.status.length > 0 && {
          status: { in: filters.status },
        }),
      };

      // 查询笔记
      const notes = await this.prisma.note.findMany({
        where,
        include: {
          category: true,
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 转换为导出格式
      const exportData = notes.map(note => {
        const transformed = this.transformNoteToWithDetails(note);

        const exportItem: any = {
          id: transformed.id,
          title: transformed.title,
          content: transformed.content,
          tags: transformed.tags.map(tag => tag.name),
          category: transformed.category?.name,
          status: transformed.status,
          isPublic: transformed.isPublic,
          viewCount: transformed.viewCount,
          createdAt: transformed.createdAt,
          updatedAt: transformed.updatedAt,
        };

        if (includeAIResults) {
          exportItem.aiSummary = transformed.aiSummary;
          exportItem.aiKeywords = transformed.aiKeywords;
          exportItem.aiProcessed = transformed.aiProcessed;
        }

        if (includeMetadata) {
          exportItem.metadata = transformed.metadata;
        }

        return exportItem;
      });

      // 生成导出文件
      const exportId = crypto.randomUUID();
      let content: string;
      let mimeType: string;
      let fileExtension: string;

      switch (format) {
      case 'json':
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
      case 'markdown':
        content = this.convertToMarkdown(exportData);
        mimeType = 'text/markdown';
        fileExtension = 'md';
        break;
      case 'csv':
        content = this.convertToCSV(exportData);
        mimeType = 'text/csv';
        fileExtension = 'csv';
        break;
      default:
        throw new NoteError(
          `Unsupported export format: ${format}`,
          'UNSUPPORTED_FORMAT',
          400,
        );
      }

      // 这里应该保存到文件存储或云存储
      // 为了演示，我们返回一个模拟的下载URL
      const downloadUrl = `/api/v1/exports/${exportId}.${fileExtension}`;
      const size = Buffer.byteLength(content, 'utf8');

      // 模拟导出任务完成
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

      return {
        exportId,
        downloadUrl,
        format,
        size,
        noteCount: exportData.length,
        status: 'ready',
        expiresAt,
      };
    } catch (error) {
      if (error instanceof NoteError) {
        throw error;
      }
      console.error('Error exporting notes:', error);
      throw new NoteError('Failed to export notes', 'EXPORT_ERROR', 500);
    }
  }

  // ==================== Utility Methods ====================

  generateContentHash(content: string, options?: ContentHashOptions): string {
    const {
      algorithm = 'sha256',
      includeMetadata = false,
      normalizeWhitespace = true,
    } = options || {};

    let processedContent = content;

    if (normalizeWhitespace) {
      // 标准化空白字符
      processedContent = content.replace(/\s+/g, ' ').trim();
    }

    return crypto
      .createHash(algorithm)
      .update(processedContent, 'utf8')
      .digest('hex');
  }

  validateNote(
    data: NoteData,
    rules?: NoteValidationRules,
  ): NoteValidationResult {
    const defaultRules: NoteValidationRules = {
      title: {
        required: true,
        minLength: 1,
        maxLength: 200,
        allowEmpty: false,
      },
      content: {
        required: true,
        minLength: 1,
        maxLength: 100000,
        allowEmpty: false,
      },
      tags: {
        maxCount: 10,
        minTagLength: 1,
        maxTagLength: 50,
        allowedChars: /^[\w\s\u4e00-\u9fa5\-_]+$/,
      },
      metadata: {
        maxKeyLength: 100,
        maxValueSize: 1000,
      },
    };

    const validationRules = rules || defaultRules;
    const errors: Array<{ field: string; message: string; code: string }> = [];
    const warnings: Array<{ field: string; message: string; code: string }> =
      [];

    // 验证标题
    if (
      validationRules.title.required &&
      (!data.title || data.title.trim().length === 0)
    ) {
      errors.push({
        field: 'title',
        message: 'Title is required',
        code: 'TITLE_REQUIRED',
      });
    } else if (data.title) {
      if (data.title.length < validationRules.title.minLength) {
        errors.push({
          field: 'title',
          message: `Title must be at least ${validationRules.title.minLength} characters`,
          code: 'TITLE_TOO_SHORT',
        });
      }
      if (data.title.length > validationRules.title.maxLength) {
        errors.push({
          field: 'title',
          message: `Title must be no more than ${validationRules.title.maxLength} characters`,
          code: 'TITLE_TOO_LONG',
        });
      }
    }

    // 验证内容
    if (
      validationRules.content.required &&
      (!data.content || data.content.trim().length === 0)
    ) {
      errors.push({
        field: 'content',
        message: 'Content is required',
        code: 'CONTENT_REQUIRED',
      });
    } else if (data.content) {
      if (data.content.length < validationRules.content.minLength) {
        errors.push({
          field: 'content',
          message: `Content must be at least ${validationRules.content.minLength} characters`,
          code: 'CONTENT_TOO_SHORT',
        });
      }
      if (data.content.length > validationRules.content.maxLength) {
        errors.push({
          field: 'content',
          message: `Content must be no more than ${validationRules.content.maxLength} characters`,
          code: 'CONTENT_TOO_LONG',
        });
      }
    }

    // 验证标签
    if (data.tags) {
      if (data.tags.length > validationRules.tags.maxCount) {
        errors.push({
          field: 'tags',
          message: `Maximum ${validationRules.tags.maxCount} tags allowed`,
          code: 'TOO_MANY_TAGS',
        });
      }

      data.tags.forEach((tag, index) => {
        if (tag.length < validationRules.tags.minTagLength) {
          errors.push({
            field: `tags[${index}]`,
            message: `Tag must be at least ${validationRules.tags.minTagLength} characters`,
            code: 'TAG_TOO_SHORT',
          });
        }
        if (tag.length > validationRules.tags.maxTagLength) {
          errors.push({
            field: `tags[${index}]`,
            message: `Tag must be no more than ${validationRules.tags.maxTagLength} characters`,
            code: 'TAG_TOO_LONG',
          });
        }
        if (
          validationRules.tags.allowedChars &&
          !validationRules.tags.allowedChars.test(tag)
        ) {
          errors.push({
            field: `tags[${index}]`,
            message: 'Tag contains invalid characters',
            code: 'INVALID_TAG_CHARS',
          });
        }
      });
    }

    // 验证元数据
    if (data.metadata) {
      Object.entries(data.metadata).forEach(([key, value]) => {
        if (key.length > validationRules.metadata.maxKeyLength) {
          errors.push({
            field: `metadata.${key}`,
            message: `Metadata key must be no more than ${validationRules.metadata.maxKeyLength} characters`,
            code: 'METADATA_KEY_TOO_LONG',
          });
        }
        if (
          JSON.stringify(value).length > validationRules.metadata.maxValueSize
        ) {
          errors.push({
            field: `metadata.${key}`,
            message: `Metadata value must be no more than ${validationRules.metadata.maxValueSize} bytes`,
            code: 'METADATA_VALUE_TOO_LARGE',
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async checkForDuplicates(
    userId: string,
    content: string,
    excludeId?: string,
  ): Promise<boolean> {
    try {
      const contentHash = this.generateContentHash(content);

      const existingNote = await this.prisma.note.findFirst({
        where: {
          userId,
          contentHash,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });

      return !!existingNote;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // 在检查重复时出错，为了安全起见，假设没有重复
      return false;
    }
  }

  // ==================== Private Helper Methods ====================

  private async processTags(
    tagNames: string[],
  ): Promise<Array<{ id: number }>> {
    const uniqueTags = [...new Set(tagNames)];
    const tags: Array<{ id: number }> = [];

    for (const tagName of uniqueTags) {
      const trimmedTag = tagName.trim();
      if (trimmedTag.length === 0) {
        continue;
      }

      // 查找或创建标签
      let tag = await this.prisma.tag.findFirst({
        where: { name: trimmedTag },
      });

      if (!tag) {
        tag = await this.prisma.tag.create({
          data: {
            name: trimmedTag,
            color: this.generateTagColor(),
          },
        });
      }

      tags.push({ id: tag.id });
    }

    return tags;
  }

  private generateTagColor(): string {
    const colors = [
      '#3B82F6',
      '#EF4444',
      '#10B981',
      '#F59E0B',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F97316',
      '#6366F1',
      '#84CC16',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private transformNoteToWithDetails(note: any): NoteWithDetails {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      contentHash: note.contentHash,
      contentVector: note.contentVector || undefined,
      categoryId: note.categoryId,
      category: note.category
        ? {
          id: note.category.id,
          name: note.category.name,
          color: note.category.color || undefined,
          icon: note.category.icon || undefined,
        }
        : undefined,
      tags: note.tags
        ? note.tags.map((nt: any) => ({
          id: nt.tag.id,
          name: nt.tag.name,
          color: nt.tag.color || undefined,
          category: nt.tag.category || undefined,
        }))
        : [],
      metadata: note.metadata || {},
      aiProcessed: note.aiProcessed,
      aiSummary: note.aiSummary || undefined,
      aiKeywords: note.aiKeywords || [],
      version: note.version,
      status: note.status,
      isPublic: note.isPublic,
      viewCount: note.viewCount,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      aiProcessedAt: note.aiProcessedAt || undefined,
      userId: note.userId,
    };
  }

  private async incrementViewCount(noteId: string): Promise<void> {
    try {
      await this.prisma.note.update({
        where: { id: noteId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  private calculateRelevanceScore(
    query: string,
    note: NoteWithDetails,
  ): number {
    if (!query) {
      return 1;
    }

    const queryLower = query.toLowerCase();
    const titleLower = note.title.toLowerCase();
    const contentLower = note.content.toLowerCase();
    const summaryLower = (note.aiSummary || '').toLowerCase();

    let score = 0;

    // 标题匹配权重最高
    if (titleLower.includes(queryLower)) {
      score += 0.5;
    }

    // 内容匹配
    if (contentLower.includes(queryLower)) {
      score += 0.3;
    }

    // 摘要匹配
    if (summaryLower.includes(queryLower)) {
      score += 0.2;
    }

    // 关键词匹配
    const queryWords = queryLower.split(' ');
    const matchedKeywords = queryWords.filter(word =>
      note.aiKeywords.some(keyword => keyword.toLowerCase().includes(word)),
    );
    score += matchedKeywords.length * 0.1;

    return Math.min(score, 1);
  }

  private generateHighlights(query: string, note: NoteWithDetails): string[] {
    const highlights: string[] = [];
    const queryLower = query.toLowerCase();

    // 在标题中查找匹配
    if (note.title.toLowerCase().includes(queryLower)) {
      highlights.push(`标题: ${this.highlightText(note.title, query)}`);
    }

    // 在内容中查找匹配
    const contentMatches = this.findContentMatches(note.content, query, 2);
    highlights.push(...contentMatches);

    // 在AI摘要中查找匹配
    if (note.aiSummary?.toLowerCase().includes(queryLower)) {
      highlights.push(`AI摘要: ${this.highlightText(note.aiSummary, query)}`);
    }

    return highlights;
  }

  private highlightText(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '**$1**');
  }

  private findContentMatches(
    content: string,
    query: string,
    maxMatches: number = 2,
  ): string[] {
    const matches: string[] = [];
    const queryLower = query.toLowerCase();
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(queryLower)) {
        const highlighted = this.highlightText(sentence.trim(), query);
        matches.push(`内容: ${highlighted}`);

        if (matches.length >= maxMatches) {
          break;
        }
      }
    }

    return matches;
  }

  private calculateNoteSimilarity(note1: any, note2: any): number {
    // 简化的相似度计算算法
    let similarity = 0;

    // 标题相似度 (权重: 0.3)
    const titleSimilarity = this.calculateTextSimilarity(
      note1.title,
      note2.title,
    );
    similarity += titleSimilarity * 0.3;

    // 标签重叠度 (权重: 0.4)
    const tagSimilarity = this.calculateTagSimilarity(note1.tags, note2.tags);
    similarity += tagSimilarity * 0.4;

    // 分类相同度 (权重: 0.2)
    const categorySimilarity = note1.categoryId === note2.categoryId ? 1 : 0;
    similarity += categorySimilarity * 0.2;

    // 内容相似度 (权重: 0.1)
    const contentSimilarity = this.calculateTextSimilarity(
      note1.content.substring(0, 500), // 只比较前500个字符
      note2.content.substring(0, 500),
    );
    similarity += contentSimilarity * 0.1;

    return Math.min(similarity, 1);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateTagSimilarity(tags1: any[], tags2: any[]): number {
    const tagNames1 = new Set(tags1.map((t: any) => t.tag.name.toLowerCase()));
    const tagNames2 = new Set(tags2.map((t: any) => t.tag.name.toLowerCase()));

    const intersection = new Set(
      [...tagNames1].filter(tag => tagNames2.has(tag)),
    );
    const union = new Set([...tagNames1, ...tagNames2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private findSharedTags(note1: any, note2: any[]): any[] {
    const tagNames1 = new Set(note1.tags.map((t: any) => t.tag.name));
    const sharedTags = note2.tags.filter((t: any) => tagNames1.has(t.tag.name));
    return sharedTags.map((t: any) => t.tag);
  }

  private generatePreview(content: string, maxLength: number = 200): string {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return cleaned.substring(0, maxLength) + '...';
  }

  private async executeBatchOperation(
    noteId: string,
    operation: string,
    data: any,
  ): Promise<void> {
    switch (operation) {
    case 'delete':
      await this.deleteNote(noteId, data.userId || '');
      break;
    case 'archive':
      await this.prisma.note.update({
        where: { id: noteId },
        data: { status: NoteStatus.ARCHIVED },
      });
      break;
    case 'publish':
      await this.prisma.note.update({
        where: { id: noteId },
        data: { status: NoteStatus.PUBLISHED },
      });
      break;
    case 'draft':
      await this.prisma.note.update({
        where: { id: noteId },
        data: { status: NoteStatus.DRAFT },
      });
      break;
    case 'addTags':
      if (data.tags && Array.isArray(data.tags)) {
        const tags = await this.processTags(data.tags);
        await this.prisma.note.update({
          where: { id: noteId },
          data: {
            tags: {
              connect: tags.map(tag => ({ id: tag.id })),
            },
          },
        });
      }
      break;
    case 'removeTags':
      if (data.tags && Array.isArray(data.tags)) {
        const tagsToRemove = await this.prisma.tag.findMany({
          where: { name: { in: data.tags } },
        });
        await this.prisma.note.update({
          where: { id: noteId },
          data: {
            tags: {
              disconnect: tagsToRemove.map(tag => ({ id: tag.id })),
            },
          },
        });
      }
      break;
    default:
      throw new Error(`Unsupported batch operation: ${operation}`);
    }
  }

  private calculateTimeRange(
    period?: string,
    now: Date = new Date(),
  ): {
    weekStart: Date;
    monthStart: Date;
  } {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // 本周开始
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // 本月开始

    return {
      weekStart,
      monthStart,
    };
  }

  private convertToMarkdown(notes: any[]): string {
    let markdown = '# Exported Notes\n\n';

    notes.forEach((note, index) => {
      markdown += `## ${index + 1}. ${note.title}\n\n`;
      markdown += `**Status:** ${note.status}\n`;
      markdown += `**Created:** ${note.createdAt}\n`;
      markdown += `**Tags:** ${note.tags.join(', ')}\n\n`;
      markdown += `${note.content}\n\n`;
      markdown += '---\n\n';
    });

    return markdown;
  }

  private convertToCSV(notes: any[]): string {
    const headers = [
      'Title',
      'Content',
      'Tags',
      'Category',
      'Status',
      'Created',
      'Updated',
    ];
    const csvRows = [headers.join(',')];

    notes.forEach(note => {
      const row = [
        `"${this.escapeCSV(note.title)}"`,
        `"${this.escapeCSV(note.content)}"`,
        `"${note.tags.join('; ')}"`,
        `"${note.category || ''}"`,
        note.status,
        note.createdAt,
        note.updatedAt,
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private escapeCSV(text: string): string {
    return text.replace(/"/g, '""').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }
}
