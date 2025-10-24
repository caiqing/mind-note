/**
 * API客户端
 *
 * 提供与后端API通信的统一接口
 */

import type {
  SearchRequest,
  SearchResult,
  SearchResponse,
  SearchFilters,
  SearchOptions,
} from './services/search-service';

import type { AnalyticsData, UserInsights } from './services/analytics-service';

import type {
  AIAnalysisRequest,
  AIAnalysisResult,
} from './ai-analysis-service';

// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}

// API客户端类
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // 搜索API
  async search(request: SearchRequest): Promise<SearchResponse> {
    const response = await this.request<SearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.data!;
  }

  async searchSuggestions(query: string): Promise<string[]> {
    const response = await this.request<{ suggestions: string[] }>(
      `/search/suggestions?q=${encodeURIComponent(query)}`,
    );
    return response.data?.suggestions || [];
  }

  async getPopularSearches(): Promise<string[]> {
    const response = await this.request<{ queries: string[] }>(
      '/search/popular',
    );
    return response.data?.queries || [];
  }

  // 分析API
  async getAnalytics(
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d',
  ): Promise<AnalyticsData> {
    const response = await this.request<{ analytics: AnalyticsData }>(
      `/analytics?timeRange=${timeRange}`,
    );
    return response.data!.analytics;
  }

  async getUserInsights(
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d',
  ): Promise<UserInsights> {
    const response = await this.request<{ insights: UserInsights }>(
      `/analytics/insights?timeRange=${timeRange}`,
    );
    return response.data!.insights;
  }

  // AI分析API
  async analyzeNote(
    noteId: string,
    request: Partial<AIAnalysisRequest>,
  ): Promise<AIAnalysisResult> {
    const response = await this.request<{ analysis: AIAnalysisResult }>(
      `/notes/${noteId}/ai-analyze`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    );

    return response.data!.analysis;
  }

  // 笔记API (现有的)
  async getNotes(
    params: {
      page?: number;
      limit?: number;
      categoryId?: number;
      tags?: string[];
      status?: string[];
      search?: string;
    } = {},
  ): Promise<{
    notes: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    const searchParams = new URLSearchParams();

    if (params.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params.categoryId) {
      searchParams.set('categoryId', params.categoryId.toString());
    }
    if (params.tags) {
      searchParams.set('tags', params.tags.join(','));
    }
    if (params.status) {
      searchParams.set('status', params.status.join(','));
    }
    if (params.search) {
      searchParams.set('search', params.search);
    }

    const response = await this.request('/notes?' + searchParams.toString());
    return response.data;
  }

  async createNote(noteData: {
    title: string;
    content: string;
    categoryId?: number;
    tags?: string[];
    status?: string;
    isPublic?: boolean;
  }): Promise<any> {
    const response = await this.request('/notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });

    return response.data;
  }

  async updateNote(
    id: string,
    noteData: Partial<{
      title: string;
      content: string;
      categoryId?: number;
      tags?: string[];
      status?: string;
      isPublic?: boolean;
    }>,
  ): Promise<any> {
    const response = await this.request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });

    return response.data;
  }

  async deleteNote(id: string): Promise<void> {
    await this.request(`/notes/${id}`, {
      method: 'DELETE',
    });
  }

  async getNoteById(id: string): Promise<any> {
    const response = await this.request(`/notes/${id}`);
    return response.data;
  }

  // 自动保存API
  async autoSaveNote(id: string, content: string): Promise<any> {
    const response = await this.request(`/notes/${id}/autosave`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    return response.data;
  }

  // 批量操作API
  async batchDeleteNotes(noteIds: string[]): Promise<void> {
    await this.request('/notes/batch', {
      method: 'DELETE',
      body: JSON.stringify({ noteIds }),
    });
  }

  async batchUpdateCategory(
    noteIds: string[],
    categoryId: number,
  ): Promise<void> {
    await this.request('/notes/batch', {
      method: 'PATCH',
      body: JSON.stringify({ noteIds, categoryId }),
    });
  }

  async batchUpdateTags(noteIds: string[], tagIds: number[]): Promise<void> {
    await this.request('/notes/batch', {
      method: 'PATCH',
      body: JSON.stringify({ noteIds, tagIds }),
    });
  }

  // 统计API
  async getNotesStats(): Promise<{
    totalNotes: number;
    publishedNotes: number;
    draftNotes: number;
    archivedNotes: number;
    totalViews: number;
    aiProcessedNotes: number;
    totalWords: number;
    averageWordsPerNote: number;
  }> {
    const response = await this.request('/notes/stats');
    return response.data;
  }

  // 相似笔记API
  async getSimilarNotes(noteId: string, limit: number = 5): Promise<any[]> {
    const response = await this.request(
      `/notes/${noteId}/similar?limit=${limit}`,
    );
    return response.data?.notes || [];
  }

  // 向量嵌入API
  async generateEmbedding(noteId: string): Promise<{
    embedding: number[];
    dimensions: number;
  }> {
    const response = await this.request(`/notes/${noteId}/embedding`, {
      method: 'POST',
    });

    return response.data;
  }

  async batchGenerateEmbeddings(noteIds: string[]): Promise<{
    results: Array<{
      noteId: string;
      embedding: number[];
      dimensions: number;
      success: boolean;
      error?: string;
    }>;
  }> {
    const response = await this.request('/embeddings/batch', {
      method: 'POST',
      body: JSON.stringify({ noteIds }),
    });

    return response.data;
  }

  // AI状态API
  async getAIStatus(): Promise<{
    isAvailable: boolean;
    providers: Array<{
      name: string;
      status: 'available' | 'unavailable' | 'error';
      lastCheck: string;
      error?: string;
    }>;
    currentProvider: string;
    queueSize: number;
  }> {
    const response = await this.request('/ai/status');
    return response.data;
  }
}

// 导出单例实例
export const apiClient = new ApiClient();

// 导出便捷方法
export const api = {
  // 搜索
  search: apiClient.search.bind(apiClient),
  searchSuggestions: apiClient.searchSuggestions.bind(apiClient),
  getPopularSearches: apiClient.getPopularSearches.bind(apiClient),

  // 分析
  getAnalytics: apiClient.getAnalytics.bind(apiClient),
  getUserInsights: apiClient.getUserInsights.bind(apiClient),

  // AI分析
  analyzeNote: apiClient.analyzeNote.bind(apiClient),

  // 笔记
  getNotes: apiClient.getNotes.bind(apiClient),
  createNote: apiClient.createNote.bind(apiClient),
  updateNote: apiClient.updateNote.bind(apiClient),
  deleteNote: apiClient.deleteNote.bind(apiClient),
  getNoteById: apiClient.getNoteById.bind(apiClient),
  autoSaveNote: apiClient.autoSaveNote.bind(apiClient),

  // 批量操作
  batchDeleteNotes: apiClient.batchDeleteNotes.bind(apiClient),
  batchUpdateCategory: apiClient.batchUpdateCategory.bind(apiClient),
  batchUpdateTags: apiClient.batchUpdateTags.bind(apiClient),

  // 统计
  getNotesStats: apiClient.getNotesStats.bind(apiClient),

  // 相似笔记
  getSimilarNotes: apiClient.getSimilarNotes.bind(apiClient),

  // 向量嵌入
  generateEmbedding: apiClient.generateEmbedding.bind(apiClient),
  batchGenerateEmbeddings: apiClient.batchGenerateEmbeddings.bind(apiClient),

  // AI状态
  getAIStatus: apiClient.getAIStatus.bind(apiClient),
};
