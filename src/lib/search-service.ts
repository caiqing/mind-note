/**
 * 高级搜索服务
 *
 * 提供向量搜索、语义搜索和高级筛选功能
 */

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  searchType: 'keyword' | 'semantic' | 'hybrid';
  options?: SearchOptions;
}

export interface SearchFilters {
  categories?: string[];
  tags?: string[];
  status?: ('DRAFT' | 'PUBLISHED' | 'ARCHIVED')[];
  dateRange?: {
    from?: string;
    to?: string;
  };
  sentiment?: ('positive' | 'negative' | 'neutral')[];
  hasAttachments?: boolean;
  isPublic?: boolean;
  aiProcessed?: boolean;
  wordCountRange?: {
    min?: number;
    max?: number;
  };
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'title' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  includeContent?: boolean;
  highlightMatches?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  snippet?: string;
  highlights?: {
    title?: string[];
    content?: string[];
  };
  score: number;
  relevanceScore?: number;
  semanticScore?: number;
  matchType: 'exact' | 'partial' | 'semantic';
  metadata: {
    categoryId?: number;
    category?: string;
    tags: string[];
    status: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
    viewCount: number;
    aiProcessed: boolean;
    sentiment?: string;
    wordCount: number;
  };
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'tag' | 'category' | 'recent';
  count?: number;
  score?: number;
}

export interface SearchAnalytics {
  totalResults: number;
  searchTime: number;
  facets: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    status: Array<{ name: string; count: number }>;
    sentiment: Array<{ name: string; count: number }>;
  };
  suggestions: string[];
}

class SearchService {
  private searchHistory: string[] = [];
  private popularQueries: string[] = [
    'React',
    '学习笔记',
    '项目计划',
    'AI',
    '开发',
  ];

  /**
   * 执行搜索
   */
  async search(request: SearchRequest): Promise<{
    results: SearchResult[];
    analytics: SearchAnalytics;
    suggestions: SearchSuggestion[];
  }> {
    const startTime = Date.now();

    // 模拟搜索延迟
    await this.simulateDelay(300 + Math.random() * 500);

    // 执行不同类型的搜索
    let results: SearchResult[] = [];

    switch (request.searchType) {
    case 'keyword':
      results = await this.performKeywordSearch(request);
      break;
    case 'semantic':
      results = await this.performSemanticSearch(request);
      break;
    case 'hybrid':
      results = await this.performHybridSearch(request);
      break;
    }

    // 应用筛选条件
    if (request.filters) {
      results = this.applyFilters(results, request.filters);
    }

    // 排序
    results = this.sortResults(results, request.options);

    // 分页
    const { limit = 20, offset = 0 } = request.options || {};
    const paginatedResults = results.slice(offset, offset + limit);

    // 生成分析数据
    const analytics = this.generateAnalytics(results, Date.now() - startTime);

    // 生成建议
    const suggestions = this.generateSuggestions(request.query, results);

    // 保存搜索历史
    this.saveSearchHistory(request.query);

    return {
      results: paginatedResults,
      analytics,
      suggestions,
    };
  }

  /**
   * 关键词搜索
   */
  private async performKeywordSearch(
    request: SearchRequest,
  ): Promise<SearchResult[]> {
    // 模拟关键词搜索结果
    const mockResults: SearchResult[] = [
      {
        id: '1',
        title: 'React Hooks学习笔记',
        content:
          'React Hooks是React 16.8引入的新特性，它允许在函数组件中使用状态和其他React特性...',
        snippet: 'React Hooks是React 16.8引入的新特性...',
        score: 0.95,
        relevanceScore: 0.95,
        matchType: 'exact',
        highlights: {
          title: ['<mark>React</mark> Hooks学习笔记'],
          content: ['<mark>React</mark> Hooks是React 16.8引入的新特性...'],
        },
        metadata: {
          categoryId: 2,
          category: '学习',
          tags: ['React', 'Hooks', '前端'],
          status: 'PUBLISHED',
          isPublic: true,
          createdAt: '2025-10-21T09:00:00Z',
          updatedAt: '2025-10-21T09:00:00Z',
          viewCount: 15,
          aiProcessed: true,
          sentiment: 'neutral',
          wordCount: 245,
        },
      },
      {
        id: '2',
        title: '项目开发计划',
        content:
          '本周需要完成的主要功能包括用户认证、数据库设计和API接口开发...',
        snippet: '本周需要完成的主要功能包括...',
        score: 0.78,
        relevanceScore: 0.78,
        matchType: 'partial',
        highlights: {
          title: ['<mark>项目</mark>开发计划'],
          content:
            '本周需要完成的主要功能包括用户认证、数据库设计和<mark>API</mark>接口开发...',
        },
        metadata: {
          categoryId: 1,
          category: '工作',
          tags: ['项目', '开发', '计划'],
          status: 'PUBLISHED',
          isPublic: false,
          createdAt: '2025-10-20T10:00:00Z',
          updatedAt: '2025-10-22T15:30:00Z',
          viewCount: 25,
          aiProcessed: true,
          sentiment: 'positive',
          wordCount: 156,
        },
      },
    ];

    // 基于查询相关性过滤
    const query = request.query.toLowerCase();
    return mockResults.filter(
      result =>
        result.title.toLowerCase().includes(query) ||
        result.content.toLowerCase().includes(query) ||
        result.metadata.tags.some(tag => tag.toLowerCase().includes(query)),
    );
  }

  /**
   * 语义搜索
   */
  private async performSemanticSearch(
    request: SearchRequest,
  ): Promise<SearchResult[]> {
    // 模拟语义搜索结果
    const mockResults: SearchResult[] = [
      {
        id: '3',
        title: 'JavaScript基础概念',
        content:
          'JavaScript是一种高级的、解释型的编程语言，它是Web开发的核心技术之一...',
        snippet: 'JavaScript是一种高级的、解释型的编程语言...',
        score: 0.85,
        semanticScore: 0.85,
        matchType: 'semantic',
        highlights: {
          title: ['<mark>JavaScript</mark>基础概念'],
          content: '<mark>JavaScript</mark>是一种高级的、解释型的编程语言...',
        },
        metadata: {
          categoryId: 2,
          category: '学习',
          tags: ['JavaScript', '前端', '编程'],
          status: 'DRAFT',
          isPublic: true,
          createdAt: '2025-10-19T14:30:00Z',
          updatedAt: '2025-10-19T14:30:00Z',
          viewCount: 8,
          aiProcessed: false,
          wordCount: 189,
        },
      },
    ];

    return mockResults;
  }

  /**
   * 混合搜索
   */
  private async performHybridSearch(
    request: SearchRequest,
  ): Promise<SearchResult[]> {
    const keywordResults = await this.performKeywordSearch(request);
    const semanticResults = await this.performSemanticSearch(request);

    // 合并和去重结果
    const combinedResults = new Map<string, SearchResult>();

    keywordResults.forEach(result => {
      combinedResults.set(result.id, {
        ...result,
        score:
          (result.relevanceScore || 0) * 0.6 +
          (result.semanticScore || 0) * 0.4,
      });
    });

    semanticResults.forEach(result => {
      if (combinedResults.has(result.id)) {
        const existing = combinedResults.get(result.id)!;
        existing.score = Math.max(
          existing.score,
          (result.semanticScore || 0) * 0.6 +
            (result.relevanceScore || 0) * 0.4,
        );
      } else {
        combinedResults.set(result.id, {
          ...result,
          score:
            (result.semanticScore || 0) * 0.6 +
            (result.relevanceScore || 0) * 0.4,
        });
      }
    });

    return Array.from(combinedResults.values());
  }

  /**
   * 应用筛选条件
   */
  private applyFilters(
    results: SearchResult[],
    filters: SearchFilters,
  ): SearchResult[] {
    return results.filter(result => {
      // 分类筛选
      if (filters.categories && filters.categories.length > 0) {
        if (
          !result.metadata.category ||
          !filters.categories.includes(result.metadata.category)
        ) {
          return false;
        }
      }

      // 标签筛选
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag =>
          result.metadata.tags.includes(tag),
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // 状态筛选
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(result.metadata.status as any)) {
          return false;
        }
      }

      // 日期范围筛选
      if (filters.dateRange) {
        const resultDate = new Date(result.metadata.createdAt);
        if (
          filters.dateRange.from &&
          resultDate < new Date(filters.dateRange.from)
        ) {
          return false;
        }
        if (
          filters.dateRange.to &&
          resultDate > new Date(filters.dateRange.to)
        ) {
          return false;
        }
      }

      // 情感筛选
      if (filters.sentiment && filters.sentiment.length > 0) {
        if (
          !result.metadata.sentiment ||
          !filters.sentiment.includes(result.metadata.sentiment as any)
        ) {
          return false;
        }
      }

      // 公开状态筛选
      if (
        filters.isPublic !== undefined &&
        result.metadata.isPublic !== filters.isPublic
      ) {
        return false;
      }

      // AI处理状态筛选
      if (
        filters.aiProcessed !== undefined &&
        result.metadata.aiProcessed !== filters.aiProcessed
      ) {
        return false;
      }

      // 字数范围筛选
      if (filters.wordCountRange) {
        if (
          filters.wordCountRange.min &&
          result.metadata.wordCount < filters.wordCountRange.min
        ) {
          return false;
        }
        if (
          filters.wordCountRange.max &&
          result.metadata.wordCount > filters.wordCountRange.max
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
    options?: SearchOptions,
  ): SearchResult[] {
    const { sortBy = 'relevance', sortOrder = 'desc' } = options || {};

    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
      case 'relevance':
        comparison = a.score - b.score;
        break;
      case 'date':
        comparison =
            new Date(a.metadata.createdAt).getTime() -
            new Date(b.metadata.createdAt).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'viewCount':
        comparison = a.metadata.viewCount - b.metadata.viewCount;
        break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * 生成分析数据
   */
  private generateAnalytics(
    results: SearchResult[],
    searchTime: number,
  ): SearchAnalytics {
    const categories = new Map<string, number>();
    const tags = new Map<string, number>();
    const status = new Map<string, number>();
    const sentiment = new Map<string, number>();

    results.forEach(result => {
      // 分类统计
      if (result.metadata.category) {
        categories.set(
          result.metadata.category,
          (categories.get(result.metadata.category) || 0) + 1,
        );
      }

      // 标签统计
      result.metadata.tags.forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });

      // 状态统计
      status.set(
        result.metadata.status,
        (status.get(result.metadata.status) || 0) + 1,
      );

      // 情感统计
      if (result.metadata.sentiment) {
        sentiment.set(
          result.metadata.sentiment,
          (sentiment.get(result.metadata.sentiment) || 0) + 1,
        );
      }
    });

    return {
      totalResults: results.length,
      searchTime,
      facets: {
        categories: Array.from(categories.entries()).map(([name, count]) => ({
          name,
          count,
        })),
        tags: Array.from(tags.entries()).map(([name, count]) => ({
          name,
          count,
        })),
        status: Array.from(status.entries()).map(([name, count]) => ({
          name,
          count,
        })),
        sentiment: Array.from(sentiment.entries()).map(([name, count]) => ({
          name,
          count,
        })),
      },
      suggestions: this.generateQuerySuggestions(results),
    };
  }

  /**
   * 生成查询建议
   */
  private generateQuerySuggestions(results: SearchResult[]): string[] {
    const suggestions = new Set<string>();

    // 从结果中提取相关关键词
    results.forEach(result => {
      result.metadata.tags.forEach(tag => suggestions.add(tag));
      if (result.metadata.category) {
        suggestions.add(result.metadata.category);
      }
    });

    return Array.from(suggestions).slice(0, 8);
  }

  /**
   * 生成搜索建议
   */
  private generateSuggestions(
    query: string,
    results: SearchResult[],
  ): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    // 查询补全建议
    if (query.length > 0) {
      this.popularQueries.forEach(popularQuery => {
        if (popularQuery.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            text: popularQuery,
            type: 'query',
            count: Math.floor(Math.random() * 50) + 10,
          });
        }
      });
    }

    // 最近搜索
    this.searchHistory.slice(-3).forEach(recentQuery => {
      if (recentQuery.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          text: recentQuery,
          type: 'recent',
        });
      }
    });

    // 标签建议
    const tagSuggestions = new Set<string>();
    results.forEach(result => {
      result.metadata.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          tagSuggestions.add(tag);
        }
      });
    });

    tagSuggestions.forEach(tag => {
      suggestions.push({
        text: tag,
        type: 'tag',
      });
    });

    return suggestions.slice(0, 10);
  }

  /**
   * 保存搜索历史
   */
  private saveSearchHistory(query: string): void {
    if (query.trim().length === 0) {
      return;
    }

    // 移除重复项
    this.searchHistory = this.searchHistory.filter(h => h !== query);
    // 添加到开头
    this.searchHistory.unshift(query);
    // 限制历史记录数量
    this.searchHistory = this.searchHistory.slice(0, 20);
  }

  /**
   * 获取搜索历史
   */
  getSearchHistory(): string[] {
    return this.searchHistory;
  }

  /**
   * 获取热门查询
   */
  getPopularQueries(): string[] {
    return this.popularQueries;
  }

  /**
   * 清除搜索历史
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
  }

  /**
   * 模拟延迟
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取搜索建议（实时）
   */
  async getLiveSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (query.length < 2) {
      return [];
    }

    // 模拟API延迟
    await this.simulateDelay(100);

    const suggestions: SearchSuggestion[] = [];

    // 从热门查询中匹配
    this.popularQueries.forEach(popularQuery => {
      if (popularQuery.toLowerCase().startsWith(query.toLowerCase())) {
        suggestions.push({
          text: popularQuery,
          type: 'query',
          score: 0.9,
        });
      }
    });

    // 从搜索历史中匹配
    this.searchHistory.forEach(historicalQuery => {
      if (historicalQuery.toLowerCase().startsWith(query.toLowerCase())) {
        suggestions.push({
          text: historicalQuery,
          type: 'recent',
          score: 0.8,
        });
      }
    });

    // 去重并排序
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(s => [s.text, s])).values(),
    ).sort((a, b) => (b.score || 0) - (a.score || 0));

    return uniqueSuggestions.slice(0, 8);
  }
}

// 导出单例实例
export const searchService = new SearchService();

// 导出类型
export type {
  SearchRequest,
  SearchFilters,
  SearchOptions,
  SearchResult,
  SearchSuggestion,
  SearchAnalytics,
};
