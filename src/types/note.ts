/**
 * 笔记相关的类型定义
 */

import { NoteStatus, ProcessingType, ProcessingStatus } from '@prisma/client';

// 笔记基础数据类型
export interface NoteData {
  title: string;
  content: string;
  categoryId?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  status?: NoteStatus;
  isPublic?: boolean;
}

// 笔记创建请求
export interface CreateNoteRequest extends NoteData {
  // 继承NoteData的所有字段
}

// 笔记更新请求
export interface UpdateNoteRequest extends Partial<NoteData> {
  // 继承NoteData的所有字段，但都是可选的
}

// 笔记查询参数
export interface NoteQueryParams {
  page?: number;
  limit?: number;
  status?: NoteStatus;
  categoryId?: number;
  tags?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  includeContent?: boolean;
}

// 笔记查询结果
export interface NoteQueryResult {
  notes: NoteWithDetails[];
  pagination: PaginationInfo;
  total: number;
}

// 分页信息
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 包含完整详情的笔记
export interface NoteWithDetails {
  id: string;
  title: string;
  content: string;
  contentHash: string;
  contentVector?: number[];
  categoryId?: number;
  category?: {
    id: number;
    name: string;
    color?: string;
    icon?: string;
  };
  tags: Array<{
    id: number;
    name: string;
    color?: string;
    category?: string;
  }>;
  metadata: Record<string, any>;
  aiProcessed: boolean;
  aiSummary?: string;
  aiKeywords: string[];
  version: number;
  status: NoteStatus;
  isPublic: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  aiProcessedAt?: Date;
  userId: string;
}

// 自动保存请求
export interface AutoSaveRequest {
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// 自动保存结果
export interface AutoSaveResult {
  id: string;
  autoSaved: boolean;
  savedAt: Date;
  hasChanges: boolean;
}

// 相似笔记请求
export interface SimilarNotesRequest {
  limit?: number;
  excludeProcessed?: boolean;
  minSimilarity?: number;
}

// 相似笔记结果
export interface SimilarNotesResult {
  similarNotes: Array<{
    id: string;
    title: string;
    similarityScore: number;
    sharedTags: string[];
    preview: string;
    distance?: number;
  }>;
}

// 笔记搜索请求
export interface SearchRequest {
  query: string;
  filters?: {
    categories?: number[];
    tags?: string[];
    dateRange?: {
      from: string;
      to: string;
    };
    status?: NoteStatus[];
  };
  sort?: {
    field?: 'relevance' | 'createdAt' | 'updatedAt' | 'title' | 'viewCount';
    order?: 'asc' | 'desc';
  };
  pagination?: {
    page?: number;
    limit?: number;
  };
}

// 搜索结果
export interface SearchResult {
  items: Array<
    NoteWithDetails & {
      relevanceScore?: number;
      highlights?: string[];
    }
  >;
  pagination: PaginationInfo;
  searchMeta: {
    queryTime: number;
    totalResults: number;
  };
}

// 批量操作请求
export interface BatchOperationRequest {
  noteIds: string[];
  operation:
    | 'delete'
    | 'archive'
    | 'publish'
    | 'draft'
    | 'addTags'
    | 'removeTags';
  data?: {
    tags?: string[];
    categoryId?: number;
  };
}

// 批量操作结果
export interface BatchOperationResult {
  successful: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// 笔记统计信息
export interface NoteStats {
  totalNotes: number;
  publishedNotes: number;
  draftNotes: number;
  archivedNotes: number;
  totalWords: number;
  averageWordsPerNote: number;
  totalViews: number;
  notesThisWeek: number;
  notesThisMonth: number;
  topCategories: Array<{
    name: string;
    count: number;
    color?: string;
  }>;
  topTags: Array<{
    name: string;
    count: number;
    color?: string;
  }>;
}

// 笔记导入/导出选项
export interface ImportOptions {
  skipDuplicates?: boolean;
  preserveIds?: boolean;
  autoAnalyze?: boolean;
  batchSize?: number;
}

export interface ExportOptions {
  format: 'json' | 'markdown' | 'csv';
  filters?: {
    categories?: number[];
    dateRange?: {
      from: string;
      to: string;
    };
    status?: NoteStatus[];
  };
  includeAIResults?: boolean;
  includeMetadata?: boolean;
  includePrivateNotes?: boolean;
}

// 笔记导入结果
export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{
    line: number;
    error: string;
    data?: any;
  }>;
}

// 笔记导出结果
export interface ExportResult {
  exportId: string;
  downloadUrl?: string;
  format: string;
  size: number;
  noteCount: number;
  status: 'preparing' | 'ready' | 'failed';
  expiresAt?: Date;
}

// 内容哈希生成选项
export interface ContentHashOptions {
  algorithm?: 'sha256' | 'md5' | 'sha1';
  includeMetadata?: boolean;
  normalizeWhitespace?: boolean;
}

// 笔记验证规则
export interface NoteValidationRules {
  title: {
    required: boolean;
    minLength: number;
    maxLength: number;
    allowEmpty: boolean;
  };
  content: {
    required: boolean;
    minLength: number;
    maxLength: number;
    allowEmpty: boolean;
  };
  tags: {
    maxCount: number;
    minTagLength: number;
    maxTagLength: number;
    allowedChars?: RegExp;
  };
  metadata: {
    maxKeyLength: number;
    maxValueSize: number;
  };
}

// 笔记验证结果
export interface NoteValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// 笔记服务接口
export interface INoteService {
  // CRUD操作
  createNote(userId: string, data: CreateNoteRequest): Promise<NoteWithDetails>;
  getNoteById(noteId: string, userId: string): Promise<NoteWithDetails | null>;
  updateNote(
    noteId: string,
    userId: string,
    data: UpdateNoteRequest,
  ): Promise<NoteWithDetails>;
  deleteNote(noteId: string, userId: string): Promise<boolean>;

  // 查询操作
  getNotesByUserId(
    userId: string,
    params?: NoteQueryParams,
  ): Promise<NoteQueryResult>;
  searchNotes(userId: string, search: SearchRequest): Promise<SearchResult>;
  getSimilarNotes(
    noteId: string,
    userId: string,
    params?: SimilarNotesRequest,
  ): Promise<SimilarNotesResult>;

  // 自动保存
  autoSave(
    noteId: string,
    userId: string,
    data: AutoSaveRequest,
  ): Promise<AutoSaveResult>;

  // 批量操作
  batchOperation(
    userId: string,
    request: BatchOperationRequest,
  ): Promise<BatchOperationResult>;

  // 统计和分析
  getNoteStats(userId: string, period?: string): Promise<NoteStats>;

  // 导入导出
  importNotes(
    userId: string,
    data: any[],
    format: string,
    options?: ImportOptions,
  ): Promise<ImportResult>;
  exportNotes(userId: string, options: ExportOptions): Promise<ExportResult>;

  // 工具方法
  generateContentHash(content: string, options?: ContentHashOptions): string;
  validateNote(
    data: NoteData,
    rules?: NoteValidationRules,
  ): NoteValidationResult;
  checkForDuplicates(
    userId: string,
    content: string,
    excludeId?: string,
  ): Promise<boolean>;
}

// 错误类型定义
export class NoteError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any,
  ) {
    super(message);
    this.name = 'NoteError';
  }
}

// 预定义错误类型
export const NOTE_ERRORS = {
  NOT_FOUND: new NoteError('Note not found', 'NOTE_NOT_FOUND', 404),
  ACCESS_DENIED: new NoteError('Access denied', 'ACCESS_DENIED', 403),
  VALIDATION_FAILED: new NoteError(
    'Validation failed',
    'VALIDATION_FAILED',
    400,
  ),
  DUPLICATE_CONTENT: new NoteError(
    'Duplicate content detected',
    'DUPLICATE_CONTENT',
    409,
  ),
  PROCESSING_ERROR: new NoteError('Processing error', 'PROCESSING_ERROR', 500),
  QUOTA_EXCEEDED: new NoteError('Quota exceeded', 'QUOTA_EXCEEDED', 429),
} as const;
