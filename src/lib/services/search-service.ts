/**
 * 搜索服务
 */

import { type Note, type Category, type Tag } from '@prisma/client';

// 类型定义
export interface SearchRequest {
  query: string;
  searchType: 'keyword' | 'semantic' | 'hybrid';
  filters?: SearchFilters;
  options?: SearchOptions;
}

export interface SearchFilters {
  categories?: string[];
  status?: ('PUBLISHED' | 'DRAFT')[];
  sentiment?: ('positive' | 'negative' | 'neutral')[];
  isPublic?: boolean;
  aiProcessed?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  wordCountRange?: {
    min: number;
    max: number;
  };
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'title' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult extends Omit<Note, 'content'> {
  snippet: string;
  score: number;
  metadata: {
    category?: Category;
    tags: Tag[];
    createdAt: string;
    updatedAt: string;
    wordCount: number;
    viewCount: number;
    isPublic: boolean;
    aiProcessed: boolean;
    sentiment?: string;
  };
}

export interface SearchAnalytics {
  totalResults: number;
  searchTime: number;
  facets: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    sentiment: Array<{ name: string; count: number }>;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  analytics: SearchAnalytics;
  suggestions: string[];
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'recent' | 'tag';
  frequency?: number;
}

// 搜索历史管理
class SearchHistory {
  private history: string[] = [];
  private maxHistorySize = 20;

  add(query: string): void {
    query = query.trim();
    if (!query) {
      return;
    }

    // 移除已存在的查询
    this.history = this.history.filter(item => item !== query);

    // 添加到开头
    this.history.unshift(query);

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  getAll(): string[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}

// 搜索服务主类
export class SearchService {
  private searchHistory = new SearchHistory();
  private cache = new Map<
    string,
    { data: SearchResponse; timestamp: number }
  >();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  constructor() {}

  /**
   * 执行搜索
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    // 生成缓存键
    const cacheKey = this.generateCacheKey(request);

    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 处理空查询
    if (!request.query.trim()) {
      return this.createEmptyResponse();
    }

    // 记录搜索历史
    this.searchHistory.add(request.query);

    // 模拟搜索结果
    const results = await this.performSearch(request);

    // 计算分析数据
    const analytics = this.calculateAnalytics(results);

    // 生成建议
    const suggestions = this.generateSuggestions(request.query);

    const response: SearchResponse = {
      results,
      analytics,
      suggestions,
    };

    // 缓存结果
    this.setCache(cacheKey, response);

    return response;
  }

  /**
   * 获取实时搜索建议
   */
  async getLiveSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (query.length < 2) {
      return [];
    }

    const suggestions: SearchSuggestion[] = [];

    // 查询建议
    if (query.length >= 3) {
      suggestions.push({
        text: `${query} 教程`,
        type: 'query',
        frequency: 5,
      });
      suggestions.push({
        text: `${query} 入门`,
        type: 'query',
        frequency: 3,
      });
    }

    // 标签建议
    const tagSuggestions = this.getTagSuggestions(query);
    suggestions.push(...tagSuggestions);

    // 历史搜索建议
    const historySuggestions = this.searchHistory
      .getAll()
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map(item => ({
        text: item,
        type: 'recent' as const,
      }));

    suggestions.push(...historySuggestions);

    // 去重并限制数量
    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, self) =>
        index === self.findIndex(t => t.text === suggestion.text),
    );

    return uniqueSuggestions.slice(0, 8);
  }

  /**
   * 获取热门查询
   */
  getPopularQueries(): string[] {
    return [
      'React',
      'JavaScript',
      'TypeScript',
      'Vue.js',
      'Node.js',
      'CSS',
      'HTML',
      '学习笔记',
      '项目计划',
      'AI',
      '机器学习',
      '前端开发',
      '后端开发',
      '数据库',
      'API设计',
    ];
  }

  /**
   * 获取搜索历史
   */
  getSearchHistory(): string[] {
    return this.searchHistory.getAll();
  }

  /**
   * 清除搜索历史
   */
  clearSearchHistory(): void {
    this.searchHistory.clear();
  }

  /**
   * 应用过滤条件
   */
  private applyFilters(
    results: SearchResult[],
    filters: SearchFilters,
  ): SearchResult[] {
    return results.filter(result => {
      // 分类过滤
      if (filters.categories && filters.categories.length > 0) {
        const categoryMatch = filters.categories.includes(
          result.metadata.category?.name || '',
        );
        if (!categoryMatch) {
          return false;
        }
      }

      // 状态过滤
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(result.status)) {
          return false;
        }
      }

      // 情感过滤
      if (filters.sentiment && filters.sentiment.length > 0) {
        const sentimentMatch = filters.sentiment.includes(
          result.metadata.sentiment || 'neutral',
        );
        if (!sentimentMatch) {
          return false;
        }
      }

      // 公开性过滤
      if (filters.isPublic !== undefined) {
        if (result.metadata.isPublic !== filters.isPublic) {
          return false;
        }
      }

      // AI处理过滤
      if (filters.aiProcessed !== undefined) {
        if (result.metadata.aiProcessed !== filters.aiProcessed) {
          return false;
        }
      }

      // 日期范围过滤
      if (filters.dateRange) {
        const noteDate = new Date(result.metadata.createdAt);
        const fromDate = new Date(filters.dateRange.from);
        const toDate = new Date(filters.dateRange.to);

        if (noteDate < fromDate || noteDate > toDate) {
          return false;
        }
      }

      // 字数范围过滤
      if (filters.wordCountRange) {
        const wordCount = result.metadata.wordCount;
        if (
          wordCount < filters.wordCountRange.min ||
          wordCount > filters.wordCountRange.max
        ) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 排序结果
   */
  private sortResults(
    results: SearchResult[],
    options: SearchOptions,
  ): SearchResult[] {
    const { sortBy = 'relevance', sortOrder = 'desc' } = options;

    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
      case 'relevance':
        comparison = b.score - a.score;
        break;
      case 'date':
        comparison =
            new Date(b.metadata.updatedAt).getTime() -
            new Date(a.metadata.updatedAt).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'viewCount':
        comparison = b.metadata.viewCount - a.metadata.viewCount;
        break;
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });
  }

  /**
   * 执行搜索逻辑
   */
  private async performSearch(request: SearchRequest): Promise<SearchResult[]> {
    // 模拟搜索数据库
    const mockData = this.getMockSearchData();

    let results = mockData.filter(note =>
      this.matchesQuery(note, request.query, request.searchType),
    );

    // 应用过滤条件
    if (request.filters) {
      results = this.applyFilters(results, request.filters);
    }

    // 排序
    results = this.sortResults(results, request.options);

    // 分页
    const { limit = 20, offset = 0 } = request.options || {};
    const paginatedResults = results.slice(offset, offset + limit);

    return paginatedResults;
  }

  /**
   * 检查笔记是否匹配查询
   */
  private matchesQuery(
    note: SearchResult,
    query: string,
    searchType: string,
  ): boolean {
    const lowerQuery = query.toLowerCase();
    const lowerTitle = note.title.toLowerCase();
    const lowerContent = note.snippet.toLowerCase();

    switch (searchType) {
    case 'keyword':
      return (
        lowerTitle.includes(lowerQuery) || lowerContent.includes(lowerQuery)
      );
    case 'semantic':
      // 简化的语义搜索匹配
      return this.semanticMatch(lowerQuery, lowerTitle, lowerContent);
    case 'hybrid':
      return this.hybridMatch(note, lowerQuery);
    default:
      return false;
    }
  }

  /**
   * 语义匹配（简化版）
   */
  private semanticMatch(
    query: string,
    title: string,
    content: string,
  ): boolean {
    // 简化的语义匹配逻辑
    const queryWords = query.split(/\s+/);
    const titleWords = title.split(/\s+/);
    const contentWords = content.split(/\s+/);

    // 计算词频相似度
    let matchCount = 0;
    queryWords.forEach(queryWord => {
      if (
        titleWords.some(
          titleWord => this.wordSimilarity(queryWord, titleWord) > 0.8,
        )
      ) {
        matchCount++;
      }
      if (
        contentWords.some(
          contentWord => this.wordSimilarity(queryWord, contentWord) > 0.7,
        )
      ) {
        matchCount++;
      }
    });

    return matchCount >= Math.ceil(queryWords.length * 0.6);
  }

  /**
   * 混合匹配
   */
  private hybridMatch(note: SearchResult, query: string): boolean {
    const keywordMatch = this.matchesQuery(note, query, 'keyword');
    const semanticMatch = this.matchesQuery(note, query, 'semantic');

    return keywordMatch || semanticMatch;
  }

  /**
   * 简单的词语相似度计算
   */
  private wordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) {
      return 1.0;
    }

    // 简化的编辑距离相似度
    const longer = Math.max(word1.length, word2.length);
    const shorter = Math.min(word1.length, word2.length);

    if (longer === 0) {
      return 1.0;
    }

    let matches = 0;
    for (let i = 0; i < shorter; i++) {
      if (word1[i] === word2[i]) {
        matches++;
      }
    }

    return matches / longer;
  }

  /**
   * 计算搜索分析数据
   */
  private calculateAnalytics(results: SearchResult[]): SearchAnalytics {
    const facets = {
      categories: this.calculateCategoryFacets(results),
      tags: this.calculateTagFacets(results),
      sentiment: this.calculateSentimentFacets(results),
    };

    return {
      totalResults: results.length,
      searchTime: 0.15, // 模拟搜索时间
      facets,
    };
  }

  /**
   * 计算分类分面
   */
  private calculateCategoryFacets(
    results: SearchResult[],
  ): Array<{ name: string; count: number }> {
    const categoryCount = new Map<string, number>();

    results.forEach(result => {
      const category = result.metadata.category?.name || '未分类';
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });

    return Array.from(categoryCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 计算标签分面
   */
  private calculateTagFacets(
    results: SearchResult[],
  ): Array<{ name: string; count: number }> {
    const tagCount = new Map<string, number>();

    results.forEach(result => {
      result.metadata.tags.forEach(tag => {
        tagCount.set(tag.name, (tagCount.get(tag.name) || 0) + 1);
      });
    });

    return Array.from(tagCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 只返回前10个标签
  }

  /**
   * 计算情感分面
   */
  private calculateSentimentFacets(
    results: SearchResult[],
  ): Array<{ name: string; count: number }> {
    const sentimentCount = new Map<string, number>();

    results.forEach(result => {
      const sentiment = result.metadata.sentiment || 'neutral';
      sentimentCount.set(sentiment, (sentimentCount.get(sentiment) || 0) + 1);
    });

    return Array.from(sentimentCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 生成搜索建议
   */
  private generateSuggestions(query: string): string[] {
    const suggestions = this.getPopularQueries()
      .filter(
        popularQuery =>
          popularQuery.toLowerCase().includes(query.toLowerCase()) ||
          query.toLowerCase().includes(popularQuery.toLowerCase()),
      )
      .slice(0, 5);

    return suggestions;
  }

  /**
   * 获取标签建议
   */
  private getTagSuggestions(query: string): SearchSuggestion[] {
    const commonTags = [
      'React',
      'JavaScript',
      'TypeScript',
      'Vue.js',
      'Node.js',
      'CSS',
      'HTML',
      '前端',
      '后端',
      '全栈',
      '算法',
      '数据结构',
      '设计模式',
      '架构',
      '性能优化',
    ];

    return commonTags
      .filter(tag => tag.toLowerCase().includes(query.toLowerCase()))
      .map(tag => ({
        text: tag,
        type: 'tag' as const,
        frequency: Math.floor(Math.random() * 10) + 1,
      }));
  }

  /**
   * 创建空搜索响应
   */
  private createEmptyResponse(): SearchResponse {
    return {
      results: [],
      analytics: {
        totalResults: 0,
        searchTime: 0,
        facets: {
          categories: [],
          tags: [],
          sentiment: [],
        },
      },
      suggestions: this.getPopularQueries().slice(0, 3),
    };
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: SearchRequest): string {
    const key = {
      query: request.query,
      searchType: request.searchType,
      filters: request.filters,
      options: request.options,
    };
    return btoa(JSON.stringify(key));
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): SearchResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: SearchResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取模拟搜索数据
   */
  private getMockSearchData(): SearchResult[] {
    return [
      {
        id: '1',
        title: 'React Hooks学习笔记',
        snippet:
          'React Hooks是React 16.8引入的新特性，它让你在不编写class的情况下使用state和其他React特性...',
        score: 0.95,
        status: 'PUBLISHED',
        isPublic: false,
        viewCount: 150,
        createdAt: '2025-10-20T10:00:00Z',
        updatedAt: '2025-10-20T15:30:00Z',
        aiProcessed: true,
        aiSummary: 'React Hooks的使用方法和最佳实践',
        aiKeywords: ['React', 'Hooks', '状态管理'],
        aiCategory: '技术',
        aiSentiment: 'positive',
        aiAnalysisDate: '2025-10-20T16:00:00Z',
        wordCount: 850,
        readingTime: 4,
        authorId: 'user-1',
        categoryId: 1,
        metadata: {
          category: { id: 1, name: '技术', color: '#3B82F6' },
          tags: [
            { id: 1, name: 'React', color: '#61DAFB' },
            { id: 2, name: '前端', color: '#A78BFA' },
          ],
          createdAt: '2025-10-20T10:00:00Z',
          updatedAt: '2025-10-20T15:30:00Z',
          wordCount: 850,
          viewCount: 150,
          isPublic: false,
          aiProcessed: true,
          sentiment: 'positive',
        },
      },
      {
        id: '2',
        title: 'TypeScript入门指南',
        snippet:
          'TypeScript是JavaScript的超集，它添加了静态类型检查和现代JavaScript特性...',
        score: 0.87,
        status: 'PUBLISHED',
        isPublic: true,
        viewCount: 230,
        createdAt: '2025-10-18T09:00:00Z',
        updatedAt: '2025-10-18T14:20:00Z',
        aiProcessed: true,
        aiSummary: 'TypeScript基础语法和类型系统介绍',
        aiKeywords: ['TypeScript', '类型系统', 'JavaScript'],
        aiCategory: '学习',
        aiSentiment: 'positive',
        aiAnalysisDate: '2025-10-18T15:00:00Z',
        wordCount: 1200,
        readingTime: 6,
        authorId: 'user-2',
        categoryId: 2,
        metadata: {
          category: { id: 2, name: '学习', color: '#10B981' },
          tags: [
            { id: 3, name: 'TypeScript', color: '#3178C6' },
            { id: 4, name: '编程', color: '#F59E0B' },
          ],
          createdAt: '2025-10-18T09:00:00Z',
          updatedAt: '2025-10-18T14:20:00Z',
          wordCount: 1200,
          viewCount: 230,
          isPublic: true,
          aiProcessed: true,
          sentiment: 'positive',
        },
      },
      // 可以添加更多模拟数据
    ];
  }
}

// 导出单例实例
export const searchService = new SearchService();
