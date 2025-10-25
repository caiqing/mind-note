/**
 * T109 搜索API服务
 * 提供强大的搜索功能，支持全文搜索、向量搜索、智能推荐和高级过滤
 */

import { BaseAPIService } from '../base-service';
import {
  SearchRequest,
  SearchResponse,
  SearchResult,
  SearchFilters,
  SearchOptions,
  SearchContext,
  SearchSuggestion,
  SearchAnalytics,
  ApiResponse
} from '../types';
import { ValidationError } from '../errors';

export interface SearchServiceConfig {
  baseUrl: string;
  vectorSearchUrl?: string;
  aiServiceUrl?: string;
  enableVectorSearch?: boolean;
  enableAIRecommendations?: boolean;
  maxResults?: number;
  enableFacetedSearch?: boolean;
  enableSearchAnalytics?: boolean;
  defaultSearchProvider?: 'elasticsearch' | 'algolia' | 'custom';
}

export interface SearchIndex {
  name: string;
  type: 'notes' | 'tags' | 'users' | 'categories';
  fields: string[];
  searchableFields: string[];
  filterableFields: string[];
  sortableFields: string[];
  aggregations: Record<string, any>;
}

export interface SearchQuery {
  query: string;
  filters?: any;
  sort?: any[];
  from?: number;
  size?: number;
  highlight?: any;
  aggregations?: string[];
  suggest?: any;
}

export interface VectorSearchRequest {
  query: string;
  vector?: number[];
  filters?: any;
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
}

export interface SearchRecommendation {
  query: string;
  type: 'trending' | 'personal' | 'collaborative' | 'content_based';
  confidence: number;
  context?: string;
  metadata?: any;
}

/**
 * T109 搜索API服务
 */
export class SearchService extends BaseAPIService {
  private vectorSearchUrl?: string;
  private aiServiceUrl?: string;
  private enableVectorSearch: boolean;
  private enableAIRecommendations: boolean;
  private maxResults: number;
  private enableFacetedSearch: boolean;
  private enableSearchAnalytics: boolean;
  private defaultSearchProvider: string;

  private searchIndexes: Map<string, SearchIndex> = new Map();
  private userSearchHistory: Map<string, SearchSuggestion[]> = new Map();

  constructor(config: SearchServiceConfig) {
    super(config);

    this.vectorSearchUrl = config.vectorSearchUrl;
    this.aiServiceUrl = config.aiServiceUrl;
    this.enableVectorSearch = config.enableVectorSearch ?? true;
    this.enableAIRecommendations = config.enableAIRecommendations ?? true;
    this.maxResults = config.maxResults ?? 1000;
    this.enableFacetedSearch = config.enableFacetedSearch ?? true;
    this.enableSearchAnalytics = config.enableSearchAnalytics ?? true;
    this.defaultSearchProvider = config.defaultSearchProvider || 'elasticsearch';

    this.initializeSearchIndexes();
  }

  /**
   * 初始化搜索索引配置
   */
  private initializeSearchIndexes(): void {
    this.searchIndexes.set('notes', {
      name: 'notes',
      type: 'notes',
      fields: ['id', 'title', 'content', 'excerpt', 'tags', 'category', 'userId', 'status', 'visibility', 'createdAt', 'updatedAt'],
      searchableFields: ['title', 'content', 'excerpt', 'tags'],
      filterableFields: ['status', 'visibility', 'categoryId', 'userId', 'tags', 'createdAt', 'updatedAt'],
      sortableFields: ['createdAt', 'updatedAt', 'views', 'likes', 'title'],
      aggregations: {
        categories: { field: 'categoryId', size: 20 },
        tags: { field: 'tags', size: 50 },
        status: { field: 'status' },
        users: { field: 'userId', size: 10 },
        date_ranges: { field: 'createdAt', interval: 'month' }
      }
    });

    this.searchIndexes.set('tags', {
      name: 'tags',
      type: 'tags',
      fields: ['id', 'name', 'description', 'category', 'usageCount', 'createdAt'],
      searchableFields: ['name', 'description'],
      filterableFields: ['categoryId', 'isActive', 'source', 'createdAt'],
      sortableFields: ['usageCount', 'name', 'createdAt'],
      aggregations: {
        categories: { field: 'categoryId', size: 20 },
        sources: { field: 'source', size: 10 }
      }
    });

    this.searchIndexes.set('users', {
      name: 'users',
      type: 'users',
      fields: ['id', 'username', 'displayName', 'bio', 'email', 'roles', 'status', 'createdAt'],
      searchableFields: ['username', 'displayName', 'bio'],
      filterableFields: ['status', 'roles', 'createdAt'],
      sortableFields: ['createdAt', 'displayName', 'username'],
      aggregations: {
        status: { field: 'status', size: 10 },
        roles: { field: 'roles', size: 20 }
      }
    });

    this.searchIndexes.set('categories', {
      name: 'categories',
      type: 'categories',
      fields: ['id', 'name', 'description', 'parentId', 'level', 'isActive'],
      searchableFields: ['name', 'description'],
      filterableFields: ['parentId', 'level', 'isActive'],
      sortableFields: ['name', 'level', 'createdAt'],
      aggregations: {
        levels: { field: 'level', size: 10 }
      }
    });
  }

  /**
   * 验证搜索请求
   */
  private validateSearchRequest(request: SearchRequest): void {
    if (!request.query || typeof request.query !== 'string') {
      throw new ValidationError('Search query is required');
    }

    if (request.query.length < 1) {
      throw new ValidationError('Search query cannot be empty');
    }

    if (request.query.length > 1000) {
      throw new ValidationError('Search query is too long (max 1000 characters)');
    }

    // 验证过滤条件
    if (request.filters) {
      this.validateFilters(request.filters);
    }

    // 验证选项
    if (request.options) {
      this.validateOptions(request.options);
    }
  }

  /**
   * 验证过滤条件
   */
  private validateFilters(filters: SearchFilters): void {
    const rules = {
      dateRange: {
        type: 'object',
        validate: (value: any) => {
          if (!value.start || !value.end) return 'Both start and end dates are required';
          const start = new Date(value.start);
          const end = new Date(value.end);
          if (start >= end) return 'Start date must be before end date';
          return null;
        }
      },
      ratingRange: {
        type: 'object',
        validate: (value: any) => {
          if (!value.min || !value.max) return 'Both min and max ratings are required';
          if (value.min < 0 || value.min > 5) return 'Minimum rating must be between 0 and 5';
          if (value.max < 0 || value.max > 5) return 'Maximum rating must be between 0 and 5';
          if (value.min > value.max) return 'Minimum rating cannot be greater than maximum rating';
          return null;
        }
      },
      wordCountRange: {
        type: 'object',
        validate: (value: any) => {
          if (!value.min || !value.max) return 'Both min and max word counts are required';
          if (value.min < 0 || value.max < 0) return 'Word counts cannot be negative';
          if (value.min > value.max) return 'Minimum word count cannot be greater than maximum';
          return null;
        }
      }
    };

    for (const [field, rule] of Object.entries(rules)) {
      if (filters[field as keyof SearchFilters] !== undefined) {
        const value = filters[field as keyof SearchFilters];
        if (rule.validate && typeof rule.validate === 'function') {
          const error = rule.validate(value);
          if (error) {
            throw new ValidationError(`Invalid ${field} filter: ${error}`);
          }
        }
      }
    }
  }

  /**
   * 验证搜索选项
   */
  private validateOptions(options: SearchOptions): void {
    const rules = {
      limit: {
        type: 'number',
        validate: (value: any) => {
          if (value < 1 || value > this.maxResults) return `Limit must be between 1 and ${this.maxResults}`;
          return null;
        }
      },
      offset: {
        type: 'number',
        validate: (value: any) => {
          if (value < 0) return 'Offset cannot be negative';
          return null;
        }
      }
    };

    for (const [field, rule] of Object.entries(rules)) {
      if (options[field as keyof SearchOptions] !== undefined) {
        const value = options[field as keyof SearchOptions];
        if (rule.validate && typeof rule.validate === 'function') {
          const error = rule.validate(value);
          if (error) {
            throw new ValidationError(`Invalid ${field} option: ${error}`);
          }
        }
      }
    }
  }

  /**
   * 执行搜索
   */
  async search(request: SearchRequest): Promise<ApiResponse<SearchResponse>> {
    try {
      // 验证搜索请求
      this.validateSearchRequest(request);

      this.log('info', 'Search initiated', {
        query: request.query,
        filters: Object.keys(request.filters || {}),
        options: Object.keys(request.options || {})
      });

      // 构建搜索查询
      const searchQuery = this.buildSearchQuery(request);

      // 执行搜索
      const searchResponse = await this.post<any>('/search', searchQuery, {
        customHeaders: {
          'X-Search-Provider': this.defaultSearchProvider,
          'X-Search-Type': request.filters?.type?.join(',') || 'all',
          'X-Search-Query-Length': request.query.length.toString()
        }
      });

      // 处理搜索结果
      const processedResponse = this.processSearchResponse(searchResponse.data, request);

      // 记录搜索分析
      if (this.enableSearchAnalytics) {
        await this.recordSearchAnalytics(request, processedResponse);
      }

      // 更新用户搜索历史
      if (request.context?.userId) {
        this.updateSearchHistory(request.context.userId, request.query, processedResponse);
      }

      // 生成搜索建议
      if (this.enableAIRecommendations && request.context?.userId) {
        const suggestions = await this.generateSearchSuggestions(request, processedResponse);
        if (suggestions.data?.suggestions) {
          processedResponse.suggestions = suggestions.data.suggestions;
        }
      }

      this.log('info', 'Search completed', {
        query: request.query,
        totalResults: processedResponse.total,
        took: processedResponse.took,
        facetsCount: Object.keys(processedResponse.facets || {}).length
      });

      return this.createApiResponse(processedResponse);

    } catch (error) {
      this.log('error', 'Search failed', {
        query: request.query,
        error
      });
      throw error;
    }
  }

  /**
   * 构建搜索查询
   */
  private buildSearchQuery(request: SearchRequest): SearchQuery {
    const query: SearchQuery = {
      query: request.query,
      from: request.options?.offset || 0,
      size: Math.min(request.options?.limit || 20, this.maxResults),
      highlight: request.options?.highlightMatches ? {
        fields: ['title', 'content', 'excerpt'],
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
        fragment_size: 150,
        number_of_fragments: 3
      } : undefined
    };

    // 添加过滤条件
    if (request.filters) {
      query.filters = this.buildFilters(request.filters);
    }

    // 添加排序
    if (request.options?.sortBy) {
      query.sort = this.buildSort(request.options.sortBy, request.options.sortOrder);
    }

    // 添加聚合
    if (this.enableFacetedSearch) {
      query.aggregations = this.buildAggregations(request.filters?.type);
    }

    // 添加建议
    if (request.query.length > 2) {
      query.suggest = {
        text: request.query,
        completion: {
          field: 'suggest',
          size: 5,
          skip_duplicates: true
        }
      };
    }

    return query;
  }

  /**
   * 构建过滤条件
   */
  private buildFilters(filters: SearchFilters): any {
    const filterConditions: any[] = [];

    // 类型过滤
    if (filters.type && filters.type.length > 0) {
      filterConditions.push({
        terms: { _index: filters.type }
      });
    }

    // 状态过滤
    if (filters.status && filters.status.length > 0) {
      filterConditions.push({
        terms: { status: filters.status }
      });
    }

    // 可见性过滤
    if (filters.visibility && filters.visibility.length > 0) {
      filterConditions.push({
        terms: { visibility: filters.visibility }
      });
    }

    // 分类过滤
    if (filters.categories && filters.categories.length > 0) {
      filterConditions.push({
        terms: { categoryId: filters.categories }
      });
    }

    // 标签过滤
    if (filters.tags && filters.tags.length > 0) {
      filterConditions.push({
        terms: { tags: filters.tags }
      });
    }

    // 用户过滤
    if (filters.users && filters.users.length > 0) {
      filterConditions.push({
        terms: { userId: filters.users }
      });
    }

    // 日期范围过滤
    if (filters.dateRange) {
      filterConditions.push({
        range: {
          createdAt: {
            gte: filters.dateRange.start,
            lte: filters.dateRange.end
          }
        }
      });
    }

    // 字数范围过滤
    if (filters.wordCountRange) {
      filterConditions.push({
        range: {
          wordCount: {
            gte: filters.wordCountRange.min,
            lte: filters.wordCountRange.max
          }
        }
      });
    }

    // 评分范围过滤
    if (filters.ratingRange) {
      filterConditions.push({
        range: {
          averageRating: {
            gte: filters.ratingRange.min,
            lte: filters.ratingRange.max
          }
        }
      });
    }

    // AI处理过滤
    if (filters.aiProcessed !== undefined) {
      filterConditions.push({
        term: { aiProcessed: filters.aiProcessed }
      });
    }

    // 附件过滤
    if (filters.hasAttachments !== undefined) {
      filterConditions.push({
        exists: { field: 'attachments' }
      });
    }

    // 语言过滤
    if (filters.language && filters.language.length > 0) {
      filterConditions.push({
        terms: { language: filters.language }
      });
    }

    return filterConditions.length > 0 ? {
      bool: {
        must: filterConditions
      }
    } : undefined;
  }

  /**
   * 构建排序条件
   */
  private buildSort(sortBy: string, sortOrder: 'asc' | 'desc' = 'desc'): any[] {
    if (!sortBy) {
      return [
        { _score: { order: 'desc' } },
        { createdAt: { order: 'desc' } }
      ];
    }

    return [
      { [sortBy]: { order: sortOrder } },
      { _score: { order: 'desc' } }
    ];
  }

  /**
   * 构建聚合查询
   */
  private buildAggregations(types?: string[]): string[] | undefined {
    if (!this.enableFacetedSearch || !types) {
      return undefined;
    }

    const aggregations: string[] = [];
    const typeSet = new Set(types || ['notes', 'tags', 'users']);

    for (const type of typeSet) {
      const index = this.searchIndexes.get(type);
      if (index && index.aggregations) {
        aggregations.push(...Object.keys(index.aggregations));
      }
    }

    return aggregations.length > 0 ? aggregations : undefined;
  }

  /**
   * 处理搜索响应
   */
  private processSearchResponse(response: any, request: SearchRequest): SearchResponse {
    const results: SearchResult[] = (response.hits?.hits || []).map((hit: any) => ({
      item: hit._source,
      score: hit._score,
      highlights: hit.highlight || {},
      explanation: hit._explanation
    }));

    const facets: Record<string, Array<{ value: string; count: number }>> = {};
    if (response.aggregations) {
      for (const [key, aggregation] of Object.entries(response.aggregations)) {
        facets[key] = (aggregation.buckets || []).map((bucket: any) => ({
          value: bucket.key,
          count: bucket.doc_count
        }));
      }
    }

    return {
      results,
      total: response.hits?.total?.value || 0,
      took: response.took || 0,
      suggestions: response.suggest?.text?.[0]?.options?.map((option: any) => ({
        text: option.text,
        score: option._score,
        source: option._source
      })) || [],
      corrections: response.suggest?.text?.[0]?.collate_query?.suggestions?.map((suggestion: any) => ({
        original: suggestion.text,
        correction: suggestion.suggestion,
        confidence: suggestion.collate_match_score
      })) || [],
      facets,
      metadata: {
        query: request.query,
        filters: request.filters || {},
        options: request.options || {},
        timestamp: new Date().toISOString(),
        searchId: this.generateSearchId(),
        processingTime: response.took || 0,
        indexUsed: response.hits?.hits?.[0]?._index || 'unknown'
      }
    };
  }

  /**
   * 向量搜索
   */
  async vectorSearch(request: VectorSearchRequest): Promise<ApiResponse<SearchResult[]>> {
    try {
      if (!this.enableVectorSearch || !this.vectorSearchUrl) {
        throw new Error('Vector search is not enabled');
      }

      if (!request.query && !request.vector) {
        throw new ValidationError('Either query text or vector is required for vector search');
      }

      let vector = request.vector;

      // 如果没有提供向量但有查询文本，生成向量
      if (!vector && request.query) {
        vector = await this.generateQueryVector(request.query);
      }

      const vectorRequest = {
        query: request.query,
        vector,
        filters: request.filters,
        limit: Math.min(request.limit || 20, 100),
        threshold: request.threshold || 0.7,
        includeMetadata: request.includeMetadata || false
      };

      const response = await this.post<any>(`${this.vectorSearchUrl}/search`, vectorRequest);

      const results: SearchResult[] = (response.data?.results || []).map((result: any) => ({
        item: result.item,
        score: result.score,
        similarity: result.similarity,
        explanation: result.explanation
      }));

      this.log('info', 'Vector search completed', {
        query: request.query,
        vectorSize: vector?.length,
        resultCount: results.length
      });

      return this.createApiResponse(results);

    } catch (error) {
      this.log('error', 'Vector search failed', {
        query: request.query,
        error
      });
      throw error;
    }
  }

  /**
   * 获取搜索建议
   */
  async getSearchSuggestions(
    query: string,
    options: {
      limit?: number;
      type?: 'popular' | 'trending' | 'personal' | 'related';
      userId?: string;
      sessionId?: string;
    } = {}
  ): Promise<ApiResponse<string[]>> {
    try {
      if (!query || query.length < 2) {
        return this.createApiResponse([]);
      }

      const suggestionRequest = {
        query: query.trim(),
        type: options.type || 'popular',
        limit: options.limit || 10,
        userId: options.userId,
        sessionId: options.sessionId,
        context: {
          previousQueries: this.getUserSearchHistory(options.userId),
          userPreferences: options.userId ? await this.getUserSearchPreferences(options.userId) : undefined
        }
      };

      const response = await this.post<any>('/search/suggestions', suggestionRequest);

      const suggestions = response.data?.suggestions || [];

      this.log('info', 'Search suggestions retrieved', {
        query,
        type: options.type,
        count: suggestions.length
      });

      return this.createApiResponse(suggestions);

    } catch (error) {
      this.log('error', 'Failed to get search suggestions', { query, error });
      return this.createApiResponse([]);
    }
  }

  /**
   * 获取热门搜索
   */
  async getPopularSearches(limit: number = 10): Promise<ApiResponse<string[]>> {
    try {
      const response = await this.get<any>(`/search/popular?limit=${limit}`);

      const popularSearches = response.data?.queries || [];

      this.log('info', 'Popular searches retrieved', {
        count: popularSearches.length,
        limit
      });

      return this.createApiResponse(popularSearches);

    } catch (error) {
      this.log('error', 'Failed to get popular searches', { limit, error });
      return this.createApiResponse([]);
    }
  }

  /**
   * 获取趋势搜索
   */
  async getTrendingSearches(
    timeRange: '1h' | '6h' | '24h' | '7d' | '30d' = '24h',
    limit: number = 10
  ): Promise<ApiResponse<Array<{ query: string; trend: 'up' | 'down' | 'stable'; changePercent: number }>>> {
    try {
      const response = await this.get<any>(`/search/trending?timeRange=${timeRange}&limit=${limit}`);

      const trendingSearches = response.data?.trends || [];

      this.log('info', 'Trending searches retrieved', {
        timeRange,
        count: trendingSearches.length,
        limit
      });

      return this.createApiResponse(trendingSearches);

    } catch (error) {
      this.log('error', 'Failed to get trending searches', { timeRange, limit, error });
      return this.createApiResponse([]);
    }
  }

  /**
   * 获取搜索分析数据
   */
  async getSearchAnalytics(
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d',
    filters?: any
  ): Promise<ApiResponse<SearchAnalytics>> {
    try {
      if (!this.enableSearchAnalytics) {
        throw new Error('Search analytics is not enabled');
      }

      const params = new URLSearchParams({
        timeRange
      });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else if (value !== undefined) {
            params.set(key, String(value));
          }
        });
      }

      const response = await this.get<any>(`/search/analytics?${params}`);

      this.log('info', 'Search analytics retrieved', {
        timeRange,
        filters: Object.keys(filters || {}).length
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get search analytics', { timeRange, filters, error });
      throw error;
    }
  }

  /**
   * 记录搜索分析
   */
  private async recordSearchAnalytics(request: SearchRequest, response: SearchResponse): Promise<void> {
    try {
      if (!this.enableSearchAnalytics) {
        return;
      }

      const analyticsData = {
        query: request.query,
        userId: request.context?.userId,
        sessionId: request.context?.sessionId,
        timestamp: new Date().toISOString(),
        resultsCount: response.total,
        processingTime: response.took,
        filters: request.filters,
        options: request.options,
        clickThroughRate: 0, // 将在后续更新
        zeroResults: response.total === 0,
        searchId: response.metadata.searchId
      };

      // 异步记录分析数据
      this.post('/search/analytics/record', analyticsData).catch(error => {
        this.log('warn', 'Failed to record search analytics', { error });
      });

    } catch (error) {
      this.log('warn', 'Failed to record search analytics', { error });
    }
  }

  /**
   * 更新用户搜索历史
   */
  private updateSearchHistory(userId: string, query: string, response: SearchResponse): void {
    try {
      if (!this.userSearchHistory.has(userId)) {
        this.userSearchHistory.set(userId, []);
      }

      const history = this.userSearchHistory.get(userId)!;

      // 添加新的搜索
      const suggestion: SearchSuggestion = {
        query,
        type: 'personal',
        count: 1,
        lastUsed: new Date().toISOString(),
        context: response.metadata.searchId
      };

      // 检查是否已存在
      const existingIndex = history.findIndex(item => item.query === query);
      if (existingIndex !== -1) {
        // 更新现有记录
        history[existingIndex].count++;
        history[existingIndex].lastUsed = suggestion.lastUsed;
      } else {
        // 添加新记录
        history.push(suggestion);
      }

      // 保持最近100个搜索记录
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }

      // 按最近使用时间排序
      history.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());

      this.userSearchHistory.set(userId, history);

    } catch (error) {
      this.log('warn', 'Failed to update search history', { userId, error });
    }
  }

  /**
   * 获取用户搜索历史
   */
  private getUserSearchHistory(userId: string): string[] {
    try {
      const history = this.userSearchHistory.get(userId);
      return history ? history.map(item => item.query) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 获取用户搜索偏好
   */
  private async getUserSearchPreferences(userId: string): Promise<any> {
    try {
      const response = await this.get<any>(`/users/${userId}/search-preferences`);
      return response.data;
    } catch (error) {
      return {};
    }
  }

  /**
   * 生成查询向量
   */
  private async generateQueryVector(query: string): Promise<number[]> {
    try {
      if (!this.aiServiceUrl) {
        throw new Error('AI service is not configured for vector generation');
      }

      const response = await this.post<any>(`${this.aiServiceUrl}/embedding/generate`, {
        text: query,
        model: 'text-embedding-ada-002',
        options: {
          normalize: true,
          truncate: true
        }
      });

      return response.data?.embedding || [];

    } catch (error) {
      this.log('warn', 'Failed to generate query vector', { query, error });
      return [];
    }
  }

  /**
   * 生成搜索建议
   */
  private async generateSearchSuggestions(
    request: SearchRequest,
    response: SearchResponse
  ): Promise<ApiResponse<{ suggestions: string[] }>> {
    try {
      if (!this.enableAIRecommendations || !this.aiServiceUrl) {
        return this.createApiResponse({ suggestions: [] });
      }

      const suggestionRequest = {
        originalQuery: request.query,
        context: request.context,
        results: response.results.slice(0, 5),
        filters: request.filters,
        options: request.options,
        userHistory: request.context?.userId ? this.getUserSearchHistory(request.context.userId) : []
      };

      const aiResponse = await this.post<any>(`${this.aiServiceUrl}/search/suggest`, suggestionRequest);

      this.log('info', 'AI search suggestions generated', {
        originalQuery: request.query,
        suggestionCount: aiResponse.data?.suggestions?.length || 0
      });

      return aiResponse;

    } catch (error) {
      this.log('warn', 'Failed to generate AI search suggestions', { error });
      return this.createApiResponse({ suggestions: [] });
    }
  }

  /**
   * 生成搜索ID
   */
  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 搜索自动完成
   */
  async autoComplete(
    prefix: string,
    options: {
      limit?: number;
      type?: string[];
      userId?: string;
      includeContext?: boolean;
    } = {}
  ): Promise<ApiResponse<Array<{ suggestion: string; type: string; context?: string }>>> {
    try {
      if (!prefix || prefix.length < 1) {
        return this.createApiResponse([]);
      }

      const autoCompleteRequest = {
        prefix: prefix.trim(),
        limit: options.limit || 10,
        types: options.type || ['notes', 'tags', 'categories'],
        userId: options.userId,
        includeContext: options.includeContext || false
      };

      const response = await this.post<any>('/search/autocomplete', autoCompleteRequest);

      const completions = response.data?.suggestions || [];

      this.log('info', 'Search autocomplete completed', {
        prefix,
        completionCount: completions.length
      });

      return this.createApiResponse(completions);

    } catch (error) {
      this.log('error', 'Search autocomplete failed', { prefix, error });
      return this.createApiResponse([]);
    }
  }

  /**
   * 保存搜索
   */
  async saveSearch(
    name: string,
    query: string,
    filters: SearchFilters,
    userId: string,
    isPublic: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      if (!name || !query || !userId) {
        throw new ValidationError('Name, query and userId are required');
      }

      const saveRequest = {
        name: name.trim(),
        query: query.trim(),
        filters,
        userId,
        isPublic,
        createdAt: new Date().toISOString(),
        metadata: {
          searchId: this.generateSearchId(),
          resultCount: 0
        }
      };

      const response = await this.post<any>('/search/saved', saveRequest);

      this.log('info', 'Search saved', {
        name,
        userId,
        isPublic
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to save search', { name, error });
      throw error;
    }
  }

  /**
   * 获取保存的搜索
   */
  async getSavedSearches(
    userId: string,
    isPublic?: boolean
  ): Promise<ApiResponse<Array<{ id: string; name: string; query: string; filters: SearchFilters; createdAt: string; isPublic: boolean; usageCount: number }>>> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const params = new URLSearchParams({
        userId
      });

      if (isPublic !== undefined) {
        params.set('isPublic', isPublic.toString());
      }

      const response = await this.get<any>(`/search/saved?${params}`);

      this.log('info', 'Retrieved saved searches', {
        userId,
        isPublic,
        count: response.data?.length || 0
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get saved searches', { userId, error });
      throw error;
    }
  }

  /**
   * 删除保存的搜索
   */
  async deleteSavedSearch(searchId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      if (!searchId || !userId) {
        throw new ValidationError('Search ID and user ID are required');
      }

      const response = await this.delete<void>(`/search/saved/${searchId}`, {
        customHeaders: {
          'X-User-ID': userId
        }
      });

      this.log('info', 'Saved search deleted', { searchId, userId });

      return response;

    } catch (error) {
      this.log('error', 'Failed to delete saved search', { searchId, userId, error });
      throw error;
    }
  }
}

/**
 * 创建搜索服务实例
 */
export function createSearchService(config: SearchServiceConfig): SearchService {
  return new SearchService(config);
}

/**
 * 默认搜索服务配置
 */
export const defaultSearchServiceConfig: SearchServiceConfig = {
  baseUrl: '/api/v1',
  vectorSearchUrl: '/api/v1/vector-search',
  aiServiceUrl: '/api/v1/ai',
  enableVectorSearch: true,
  enableAIRecommendations: true,
  maxResults: 1000,
  enableFacetedSearch: true,
  enableSearchAnalytics: true,
  defaultSearchProvider: 'elasticsearch'
};