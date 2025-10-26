/**
 * Client-side Note Service
 *
 * 客户端笔记服务，通过API与服务端通信
 */

import clientLogger from '@/lib/utils/client-logger';

export interface CreateNoteData {
  title: string;
  content: string;
  categoryId?: number | null;
  tags?: string[];
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  categoryId?: number | null;
  tags?: string[];
  isFavorite?: boolean;
}

export interface NoteQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  tags?: string[];
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  contentHash: string;
  categoryId: number | null;
  tags: string[];
  metadata: Record<string, any>;
  aiProcessed: boolean;
  aiSummary: string | null;
  aiKeywords: string[];
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isPublic: boolean;
  isFavorite: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNotes {
  notes: Note[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class NoteServiceClient {
  private baseUrl = '/api/notes';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      clientLogger.debug(`Making request to ${url}`, 'NoteServiceClient', {
        options,
      });

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      clientLogger.debug(`Request successful to ${url}`, 'NoteServiceClient', {
        data,
      });
      return data;
    } catch (error) {
      clientLogger.error(
        `Request failed to ${url}: ${error}`,
        'NoteServiceClient',
        { error },
      );
      throw error;
    }
  }

  async createNote(data: CreateNoteData): Promise<Note> {
    return this.request<Note>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getNote(id: string): Promise<Note> {
    return this.request<Note>(`/${id}`);
  }

  async getNotes(options: NoteQueryOptions = {}): Promise<PaginatedNotes> {
    const params = new URLSearchParams();

    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.search) params.append('search', options.search);
    if (options.categoryId)
      params.append('categoryId', options.categoryId.toString());
    if (options.tags) params.append('tags', options.tags.join(','));
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    return this.request<PaginatedNotes>(endpoint);
  }

  async updateNote(id: string, data: UpdateNoteData): Promise<Note> {
    return this.request<Note>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNote(id: string): Promise<void> {
    await this.request<void>(`/${id}`, {
      method: 'DELETE',
    });
  }

  async searchNotes(
    query: string,
    options: NoteQueryOptions = {},
  ): Promise<PaginatedNotes> {
    const params = new URLSearchParams({ q: query });

    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.categoryId)
      params.append('categoryId', options.categoryId.toString());
    if (options.tags) params.append('tags', options.tags.join(','));

    const queryString = params.toString();

    return this.request<PaginatedNotes>(`/search?${queryString}`);
  }

  async getNoteStats(): Promise<{
    totalNotes: number;
    totalWords: number;
    totalViews: number;
    recentNotes: Note[];
  }> {
    return this.request<any>('/stats');
  }
}

// 导出单例实例
const noteServiceClient = new NoteServiceClient();
export default noteServiceClient;

// 便捷的导出函数
export const createNote = (data: CreateNoteData) =>
  noteServiceClient.createNote(data);
export const getNote = (id: string) => noteServiceClient.getNote(id);
export const getNotes = (options?: NoteQueryOptions) =>
  noteServiceClient.getNotes(options);
export const updateNote = (id: string, data: UpdateNoteData) =>
  noteServiceClient.updateNote(id, data);
export const deleteNote = (id: string) => noteServiceClient.deleteNote(id);
export const searchNotes = (query: string, options?: NoteQueryOptions) =>
  noteServiceClient.searchNotes(query, options);
export const getNoteStats = () => noteServiceClient.getNoteStats();
