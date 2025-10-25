/**
 * T106 笔记管理API服务
 * 提供完整的笔记CRUD操作和高级功能
 */

import { BaseAPIService } from '../base-service';
import {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteFilters,
  BatchNoteOperation,
  ApiResponse,
  PaginatedResponse,
  BatchOperationResult
} from '../types';
import { ValidationError, NotFoundError } from '../errors';

export interface NotesServiceConfig {
  baseUrl: string;
  aiServiceUrl?: string;
  enableAutoTagging?: boolean;
  enableAutoSummary?: boolean;
  maxNoteLength?: number;
  maxAttachments?: number;
}

/**
 * T106 笔记管理API服务
 */
export class NotesService extends BaseAPIService {
  private aiServiceUrl?: string;
  private enableAutoTagging: boolean;
  private enableAutoSummary: boolean;
  private maxNoteLength: number;
  private maxAttachments: number;

  constructor(config: NotesServiceConfig) {
    super(config);

    this.aiServiceUrl = config.aiServiceUrl;
    this.enableAutoTagging = config.enableAutoTagging ?? true;
    this.enableAutoSummary = config.enableAutoSummary ?? true;
    this.maxNoteLength = config.maxNoteLength ?? 1000000; // 1MB
    this.maxAttachments = config.maxAttachments ?? 50;
  }

  /**
   * 验证笔记数据
   */
  private validateNoteData(data: CreateNoteRequest | UpdateNoteRequest, isUpdate: boolean = false): void {
    const rules: Record<string, any> = {
      title: {
        required: !isUpdate,
        type: 'string',
        minLength: 1,
        maxLength: 255,
        pattern: /^.{1,255}$/
      },
      content: {
        required: !isUpdate,
        type: 'string',
        minLength: 1,
        maxLength: this.maxNoteLength
      },
      categoryId: {
        type: 'string',
        pattern: /^[a-zA-Z0-9-]+$/
      },
      tags: {
        type: 'object',
        validate: (value: any) => {
          if (!Array.isArray(value)) return 'Tags must be an array';
          if (value.length > 20) return 'Maximum 20 tags allowed';
          for (const tag of value) {
            if (typeof tag !== 'string') return 'All tags must be strings';
            if (tag.length < 1 || tag.length > 50) return 'Tag length must be between 1 and 50 characters';
          }
          return null;
        }
      },
      status: {
        type: 'string',
        validate: (value: any) => {
          const validStatuses = ['draft', 'published', 'archived'];
          return validStatuses.includes(value) ? null : 'Invalid status';
        }
      },
      visibility: {
        type: 'string',
        validate: (value: any) => {
          const validVisibilities = ['private', 'public', 'shared'];
          return validVisibilities.includes(value) ? null : 'Invalid visibility';
        }
      }
    };

    this.validateParams(data, rules);
  }

  /**
   * 创建笔记
   */
  async createNote(request: CreateNoteRequest): Promise<ApiResponse<Note>> {
    try {
      // 验证请求数据
      this.validateNoteData(request);

      this.log('info', 'Creating note', { title: request.title });

      let processedRequest = { ...request };

      // 自动生成标签
      if (this.enableAutoTagging && request.autoGenerateTags) {
        try {
          const tags = await this.generateTags(request.content);
          processedRequest.tags = [...(request.tags || []), ...tags];
        } catch (error) {
          this.log('warn', 'Auto-tagging failed', { error });
          // 继续执行，不阻止创建
        }
      }

      // 自动生成摘要
      if (this.enableAutoSummary && request.autoGenerateSummary) {
        try {
          const excerpt = await this.generateSummary(request.content);
          processedRequest.excerpt = excerpt;
        } catch (error) {
          this.log('warn', 'Auto-summary failed', { error });
          // 继续执行，不阻止创建
        }
      }

      // 生成摘录（如果没有自动生成）
      if (!processedRequest.excerpt) {
        processedRequest.excerpt = this.extractExcerpt(request.content);
      }

      const response = await this.post<Note>('/notes', processedRequest);

      this.log('info', 'Note created successfully', {
        noteId: response.data?.id,
        title: request.title
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to create note', {
        title: request.title,
        error
      });
      throw error;
    }
  }

  /**
   * 获取笔记列表
   */
  async getNotes(
    filters: NoteFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<ApiResponse<PaginatedResponse<Note>>> {
    try {
      const params = {
        page: pagination.page || 1,
        limit: Math.min(pagination.limit || 20, 100), // 限制最大每页数量
        ...filters
      };

      // 处理数组参数
      if (filters.status) {
        params.status = filters.status.join(',');
      }
      if (filters.visibility) {
        params.visibility = filters.visibility.join(',');
      }
      if (filters.tags) {
        params.tags = filters.tags.join(',');
      }

      // 处理日期范围
      if (filters.dateRange) {
        params.dateStart = filters.dateRange.start;
        params.dateEnd = filters.dateRange.end;
      }

      // 处理字数范围
      if (filters.wordCountRange) {
        params.wordCountMin = filters.wordCountRange.min;
        params.wordCountMax = filters.wordCountRange.max;
      }

      const response = await this.get<PaginatedResponse<Note>>('/notes', {
        customHeaders: { 'X-Filter-Applied': 'true' }
      });

      this.log('info', 'Retrieved notes list', {
        count: response.data?.items.length,
        page: pagination.page,
        filters: Object.keys(filters).length
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to retrieve notes', { filters, error });
      throw error;
    }
  }

  /**
   * 根据ID获取笔记
   */
  async getNoteById(id: string, includeContent: boolean = true): Promise<ApiResponse<Note>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid note ID');
      }

      const response = await this.get<Note>(`/notes/${id}`, {
        customHeaders: {
          'X-Include-Content': includeContent.toString(),
          'X-Note-View': 'true'
        }
      });

      this.log('info', 'Retrieved note by ID', { noteId: id });

      return response;

    } catch (error) {
      if (error instanceof NotFoundError) {
        this.log('warn', 'Note not found', { noteId: id });
      } else {
        this.log('error', 'Failed to retrieve note', { noteId: id, error });
      }
      throw error;
    }
  }

  /**
   * 更新笔记
   */
  async updateNote(id: string, request: UpdateNoteRequest): Promise<ApiResponse<Note>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid note ID');
      }

      // 验证请求数据
      this.validateNoteData({ ...request, id }, true);

      // 获取当前笔记进行版本检查
      const currentNote = await this.getNoteById(id);
      if (!currentNote.data) {
        throw new NotFoundError('Note');
      }

      // 版本检查
      if (request.version !== undefined && request.version !== currentNote.data.metadata.version) {
        throw new ValidationError('Note version mismatch', {
          currentVersion: currentNote.data.metadata.version,
          requestedVersion: request.version
        });
      }

      let processedRequest = { ...request };

      // 自动生成标签（如果请求中指定）
      if (this.enableAutoTagging && request.autoGenerateTags && request.content) {
        try {
          const tags = await this.generateTags(request.content);
          processedRequest.tags = [...(request.tags || []), ...tags];
        } catch (error) {
          this.log('warn', 'Auto-tagging failed during update', { error });
        }
      }

      // 自动更新摘要（如果内容有变化）
      if (this.enableAutoSummary && request.content && request.autoGenerateSummary) {
        try {
          const excerpt = await this.generateSummary(request.content);
          processedRequest.excerpt = excerpt;
        } catch (error) {
          this.log('warn', 'Auto-summary failed during update', { error });
        }
      }

      const response = await this.put<Note>(`/notes/${id}`, processedRequest, {
        customHeaders: {
          'X-Update-Reason': 'user_request',
          'X-Current-Version': currentNote.data.metadata.version.toString()
        }
      });

      this.log('info', 'Note updated successfully', {
        noteId: id,
        version: response.data?.metadata.version
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to update note', { noteId: id, error });
      throw error;
    }
  }

  /**
   * 删除笔记
   */
  async deleteNote(id: string, permanent: boolean = false): Promise<ApiResponse<void>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid note ID');
      }

      const endpoint = permanent ? `/notes/${id}/permanent` : `/notes/${id}`;
      const response = await this.delete<void>(endpoint, {
        customHeaders: {
          'X-Delete-Reason': 'user_request',
          'X-Permanent-Delete': permanent.toString()
        }
      });

      this.log('info', 'Note deleted', {
        noteId: id,
        permanent
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to delete note', { noteId: id, error });
      throw error;
    }
  }

  /**
   * 自动保存笔记
   */
  async autoSaveNote(id: string, content: string): Promise<ApiResponse<Note>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid note ID');
      }

      if (!content || typeof content !== 'string') {
        throw new ValidationError('Invalid content');
      }

      const response = await this.post<Note>(`/notes/${id}/autosave`, {
        content,
        timestamp: new Date().toISOString()
      }, {
        customHeaders: {
          'X-Auto-Save': 'true',
          'X-Save-Reason': 'auto_save'
        }
      });

      this.log('info', 'Note auto-saved', { noteId: id });

      return response;

    } catch (error) {
      this.log('warn', 'Auto-save failed', { noteId: id, error });
      throw error;
    }
  }

  /**
   * 批量操作笔记
   */
  async batchOperation(operation: BatchNoteOperation): Promise<ApiResponse<BatchOperationResult<Note>>> {
    try {
      if (!operation.noteIds || !Array.isArray(operation.noteIds) || operation.noteIds.length === 0) {
        throw new ValidationError('Invalid note IDs for batch operation');
      }

      if (operation.noteIds.length > 100) {
        throw new ValidationError('Maximum 100 notes allowed per batch operation');
      }

      const response = await this.post<BatchOperationResult<Note>>('/notes/batch', operation, {
        customHeaders: {
          'X-Batch-Operation': operation.operation,
          'X-Batch-Size': operation.noteIds.length.toString()
        }
      });

      this.log('info', 'Batch operation completed', {
        operation: operation.operation,
        totalNotes: operation.noteIds.length,
        successRate: response.data?.successRate
      });

      return response;

    } catch (error) {
      this.log('error', 'Batch operation failed', {
        operation: operation.operation,
        noteCount: operation.noteIds.length,
        error
      });
      throw error;
    }
  }

  /**
   * 获取相似笔记
   */
  async getSimilarNotes(id: string, limit: number = 5): Promise<ApiResponse<Note[]>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid note ID');
      }

      if (limit < 1 || limit > 20) {
        throw new ValidationError('Limit must be between 1 and 20');
      }

      const response = await this.get<Note[]>(`/notes/${id}/similar`, {
        customHeaders: {
          'X-Similarity-Limit': limit.toString(),
          'X-Similarity-Algorithm': 'vector'
        }
      });

      this.log('info', 'Retrieved similar notes', {
        noteId: id,
        count: response.data?.length,
        limit
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get similar notes', { noteId: id, error });
      throw error;
    }
  }

  /**
   * 搜索笔记（内部方法，调用T109搜索API）
   */
  async searchNotes(
    query: string,
    filters: Partial<NoteFilters> = {},
    options: {
      limit?: number;
      offset?: number;
      highlight?: boolean;
    } = {}
  ): Promise<ApiResponse<Note[]>> {
    try {
      if (!query || typeof query !== 'string') {
        throw new ValidationError('Invalid search query');
      }

      const searchRequest = {
        query,
        filters: {
          type: ['notes'],
          ...filters
        },
        options: {
          limit: options.limit || 20,
          offset: options.offset || 0,
          highlightMatches: options.highlight || false,
          includeContent: true
        }
      };

      const response = await this.post<any>('/search', searchRequest);

      // 提取笔记结果
      const notes = response.data?.results?.map((result: any) => result.item) || [];

      this.log('info', 'Note search completed', {
        query,
        resultCount: notes.length,
        filters: Object.keys(filters).length
      });

      return this.createApiResponse(notes);

    } catch (error) {
      this.log('error', 'Note search failed', { query, error });
      throw error;
    }
  }

  /**
   * 获取笔记统计
   */
  async getNotesStatistics(userId?: string): Promise<ApiResponse<any>> {
    try {
      const endpoint = userId ? `/notes/stats?userId=${userId}` : '/notes/stats';
      const response = await this.get<any>(endpoint);

      this.log('info', 'Retrieved notes statistics', { userId });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get notes statistics', { userId, error });
      throw error;
    }
  }

  /**
   * 生成标签（调用AI服务）
   */
  private async generateTags(content: string): Promise<string[]> {
    if (!this.aiServiceUrl) {
      return [];
    }

    try {
      const response = await fetch(`${this.aiServiceUrl}/tagging/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          maxTags: 8,
          options: {
            includeCategories: true,
            includeEmotions: false,
            minRelevance: 0.3
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      return data.tags?.map((tag: any) => tag.name) || [];

    } catch (error) {
      this.log('warn', 'Failed to generate tags via AI service', { error });
      return [];
    }
  }

  /**
   * 生成摘要（调用AI服务）
   */
  private async generateSummary(content: string): Promise<string> {
    if (!this.aiServiceUrl) {
      return this.extractExcerpt(content);
    }

    try {
      const response = await fetch(`${this.aiServiceUrl}/summary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          maxLength: 200,
          options: {
            style: 'concise',
            includeKeywords: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      return data.summary || this.extractExcerpt(content);

    } catch (error) {
      this.log('warn', 'Failed to generate summary via AI service', { error });
      return this.extractExcerpt(content);
    }
  }

  /**
   * 提取摘录（本地方法）
   */
  private extractExcerpt(content: string, maxLength: number = 200): string {
    if (!content) {
      return '';
    }

    // 移除多余的空白字符
    const cleanContent = content.replace(/\s+/g, ' ').trim();

    // 如果内容短于最大长度，直接返回
    if (cleanContent.length <= maxLength) {
      return cleanContent;
    }

    // 找到最接近最大长度的句子边界
    let excerpt = cleanContent.substring(0, maxLength);
    const lastSentenceIndex = Math.max(
      excerpt.lastIndexOf('。'),
      excerpt.lastIndexOf('.'),
      excerpt.lastIndexOf('！'),
      excerpt.lastIndexOf('!'),
      excerpt.lastIndexOf('？'),
      excerpt.lastIndexOf('?')
    );

    if (lastSentenceIndex > maxLength * 0.6) {
      excerpt = excerpt.substring(0, lastSentenceIndex + 1);
    } else {
      excerpt = excerpt.substring(0, maxLength - 3) + '...';
    }

    return excerpt;
  }

  /**
   * 验证笔记访问权限
   */
  private async validateNoteAccess(noteId: string, userId: string): Promise<boolean> {
    try {
      const response = await this.get<any>(`/notes/${noteId}/access?userId=${userId}`);
      return response.data?.hasAccess || false;
    } catch (error) {
      this.log('warn', 'Failed to validate note access', { noteId, userId, error });
      return false;
    }
  }

  /**
   * 获取笔记历史版本
   */
  async getNoteHistory(id: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid note ID');
      }

      const response = await this.get<any[]>(`/notes/${id}/history?limit=${limit}`);

      this.log('info', 'Retrieved note history', { noteId: id, limit });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get note history', { noteId: id, error });
      throw error;
    }
  }

  /**
   * 恢复笔记到指定版本
   */
  async restoreNoteVersion(id: string, version: number): Promise<ApiResponse<Note>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid note ID');
      }

      if (!version || version < 1) {
        throw new ValidationError('Invalid version number');
      }

      const response = await this.post<Note>(`/notes/${id}/restore`, {
        version,
        reason: 'user_request'
      }, {
        customHeaders: {
          'X-Restore-Version': version.toString(),
          'X-Restore-Reason': 'user_request'
        }
      });

      this.log('info', 'Note version restored', {
        noteId: id,
        version,
        newVersion: response.data?.metadata.version
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to restore note version', { noteId: id, version, error });
      throw error;
    }
  }
}

/**
 * 创建笔记服务实例
 */
export function createNotesService(config: NotesServiceConfig): NotesService {
  return new NotesService(config);
}

/**
 * 默认笔记服务配置
 */
export const defaultNotesServiceConfig: NotesServiceConfig = {
  baseUrl: '/api/v1',
  aiServiceUrl: '/api/v1/ai',
  enableAutoTagging: true,
  enableAutoSummary: true,
  maxNoteLength: 1000000,
  maxAttachments: 50
};