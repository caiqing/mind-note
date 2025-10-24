/**
 * 搜索服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchService,
  type SearchRequest,
  type SearchFilters,
  type SearchOptions,
  type SearchResult,
} from '../search-service';

describe('Search Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清除搜索历史
    searchService.clearSearchHistory();
  });

  describe('search', () => {
    it('should perform keyword search successfully', async () => {
      const request: SearchRequest = {
        query: 'React',
        searchType: 'keyword',
        options: {
          limit: 10,
          sortBy: 'relevance',
          sortOrder: 'desc',
        },
      };

      const result = await searchService.search(request);

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.analytics).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should perform semantic search successfully', async () => {
      const request: SearchRequest = {
        query: '前端开发技术',
        searchType: 'semantic',
        options: {
          limit: 10,
          sortBy: 'relevance',
        },
      };

      const result = await searchService.search(request);

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should perform hybrid search successfully', async () => {
      const request: SearchRequest = {
        query: 'React组件开发',
        searchType: 'hybrid',
        options: {
          limit: 10,
          sortBy: 'relevance',
        },
      };

      const result = await searchService.search(request);

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should apply filters correctly', async () => {
      const filters: SearchFilters = {
        categories: ['技术', '学习'],
        status: ['PUBLISHED'],
        sentiment: ['positive'],
        isPublic: false,
        aiProcessed: true,
      };

      const request: SearchRequest = {
        query: 'React',
        searchType: 'keyword',
        filters,
        options: {
          limit: 10,
        },
      };

      const result = await searchService.search(request);

      expect(result).toBeDefined();
      expect(result.analytics).toBeDefined();
      expect(result.analytics.facets.categories).toBeDefined();
    });

    it('should handle empty query gracefully', async () => {
      const request: SearchRequest = {
        query: '',
        searchType: 'keyword',
        options: {
          limit: 10,
        },
      };

      const result = await searchService.search(request);

      expect(result).toBeDefined();
      expect(result.results.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const request: SearchRequest = {
        query: 'test',
        searchType: 'keyword',
        options: {
          limit: 5,
        },
      };

      const result = await searchService.search(request);

      expect(result).toBeDefined();
      expect(result.results.length).toBeLessThanOrEqual(5);
    });

    it('should respect offset parameter', async () => {
      const request1: SearchRequest = {
        query: 'test',
        searchType: 'keyword',
        options: {
          limit: 5,
          offset: 0,
        },
      };

      const request2: SearchRequest = {
        query: 'test',
        searchType: 'keyword',
        options: {
          limit: 5,
          offset: 5,
        },
      };

      const result1 = await searchService.search(request1);
      const result2 = await searchService.search(request2);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // 两个请求的结果不应该重复（模拟数据的情况）
    });
  });

  describe('applyFilters', () => {
    it('should filter by categories correctly', () => {
      const results = [
        {
          id: '1',
          title: 'Test Note 1',
          metadata: {
            category: '技术',
            status: 'PUBLISHED',
            isPublic: false,
            aiProcessed: true,
          },
        },
        {
          id: '2',
          title: 'Test Note 2',
          metadata: {
            category: '学习',
            status: 'PUBLISHED',
            isPublic: false,
            aiProcessed: true,
          },
        },
      ] as SearchResult[];

      const filters: SearchFilters = {
        categories: ['技术'],
      };

      const filteredResults = searchService['applyFilters'](results, filters);

      expect(filteredResults).toHaveLength(1);
      expect(filteredResults[0].metadata.category).toBe('技术');
    });

    it('should filter by status correctly', () => {
      const results = [
        {
          id: '1',
          title: 'Test Note 1',
          metadata: {
            status: 'PUBLISHED',
            isPublic: false,
            aiProcessed: true,
          },
        },
        {
          id: '2',
          title: 'Test Note 2',
          metadata: {
            status: 'DRAFT',
            isPublic: false,
            aiProcessed: true,
          },
        },
      ] as SearchResult[];

      const filters: SearchFilters = {
        status: ['PUBLISHED'],
      };

      const filteredResults = searchService['applyFilters'](results, filters);

      expect(filteredResults).toHaveLength(1);
      expect(filteredResults[0].metadata.status).toBe('PUBLISHED');
    });

    it('should filter by date range correctly', () => {
      const results = [
        {
          id: '1',
          title: 'Test Note 1',
          metadata: {
            createdAt: '2025-10-01T00:00:00Z',
            isPublic: false,
            aiProcessed: true,
          },
        },
        {
          id: '2',
          title: 'Test Note 2',
          metadata: {
            createdAt: '2025-10-15T00:00:00Z',
            isPublic: false,
            aiProcessed: true,
          },
        },
      ] as SearchResult[];

      const filters: SearchFilters = {
        dateRange: {
          from: '2025-10-10',
          to: '2025-10-20',
        },
      };

      const filteredResults = searchService['applyFilters'](results, filters);

      expect(filteredResults).toHaveLength(1);
      expect(filteredResults[0].metadata.createdAt).toBe(
        '2025-10-15T00:00:00Z',
      );
    });

    it('should filter by sentiment correctly', () => {
      const results = [
        {
          id: '1',
          title: 'Test Note 1',
          metadata: {
            sentiment: 'positive',
            isPublic: false,
            aiProcessed: true,
          },
        },
        {
          id: '2',
          title: 'Test Note 2',
          metadata: {
            sentiment: 'negative',
            isPublic: false,
            aiProcessed: true,
          },
        },
      ] as SearchResult[];

      const filters: SearchFilters = {
        sentiment: ['positive'],
      };

      const filteredResults = searchService['applyFilters'](results, filters);

      expect(filteredResults).toHaveLength(1);
      expect(filteredResults[0].metadata.sentiment).toBe('positive');
    });

    it('should filter by AI processing status', () => {
      const results = [
        {
          id: '1',
          title: 'Test Note 1',
          metadata: {
            aiProcessed: true,
            isPublic: false,
          },
        },
        {
          id: '2',
          title: 'Test Note 2',
          metadata: {
            aiProcessed: false,
            isPublic: false,
          },
        },
      ] as SearchResult[];

      const filters: SearchFilters = {
        aiProcessed: true,
      };

      const filteredResults = searchService['applyFilters'](results, filters);

      expect(filteredResults).toHaveLength(1);
      expect(filteredResults[0].metadata.aiProcessed).toBe(true);
    });

    it('should filter by word count range correctly', () => {
      const results = [
        {
          id: '1',
          title: 'Test Note 1',
          metadata: {
            wordCount: 100,
            isPublic: false,
          },
        },
        {
          id: '2',
          title: 'Test Note 2',
          metadata: {
            wordCount: 500,
            isPublic: false,
          },
        },
      ] as SearchResult[];

      const filters: SearchFilters = {
        wordCountRange: {
          min: 200,
          max: 400,
        },
      };

      const filteredResults = searchService['applyFilters'](results, filters);

      expect(filteredResults).toHaveLength(0);
    });

    it('should handle multiple filters combined', () => {
      const results = [
        {
          id: '1',
          title: 'Test Note 1',
          metadata: {
            category: '技术',
            status: 'PUBLISHED',
            isPublic: false,
            aiProcessed: true,
            wordCount: 300,
          },
        },
        {
          id: '2',
          title: 'Test Note 2',
          metadata: {
            category: '学习',
            status: 'DRAFT',
            isPublic: true,
            aiProcessed: false,
            wordCount: 150,
          },
        },
      ] as SearchResult[];

      const filters: SearchFilters = {
        categories: ['技术'],
        status: ['PUBLISHED'],
        aiProcessed: true,
        isPublic: false,
      };

      const filteredResults = searchService['applyFilters'](results, filters);

      expect(filteredResults).toHaveLength(1);
      expect(filteredResults[0].metadata.category).toBe('技术');
      expect(filteredResults[0].metadata.status).toBe('PUBLISHED');
      expect(filteredResults[0].metadata.aiProcessed).toBe(true);
      expect(filteredResults[0].metadata.isPublic).toBe(false);
    });
  });

  describe('sortResults', () => {
    it('should sort by relevance correctly', () => {
      const results = [
        {
          id: '1',
          title: 'Low Relevance',
          score: 0.3,
          metadata: { isPublic: false },
        },
        {
          id: '2',
          title: 'High Relevance',
          score: 0.9,
          metadata: { isPublic: false },
        },
        {
          id: '3',
          title: 'Medium Relevance',
          score: 0.6,
          metadata: { isPublic: false },
        },
      ] as SearchResult[];

      const options: SearchOptions = {
        sortBy: 'relevance',
        sortOrder: 'desc',
      };

      const sortedResults = searchService['sortResults'](results, options);

      expect(sortedResults).toHaveLength(3);
      expect(sortedResults[0].score).toBe(0.9);
      expect(sortedResults[1].score).toBe(0.6);
      expect(sortedResults[2].score).toBe(0.3);
    });

    it('should sort by date correctly', () => {
      const results = [
        {
          id: '1',
          title: 'Old Note',
          score: 0.5,
          metadata: {
            createdAt: '2025-10-01T00:00:00Z',
            isPublic: false,
          },
        },
        {
          id: '2',
          title: 'New Note',
          score: 0.5,
          metadata: {
            createdAt: '2025-10-15T00:00:00Z',
            isPublic: false,
          },
        },
      ] as SearchResult[];

      const options: SearchOptions = {
        sortBy: 'date',
        sortOrder: 'desc',
      };

      const sortedResults = searchService['sortResults'](results, options);

      expect(sortedResults).toHaveLength(2);
      expect(sortedResults[0].metadata.createdAt).toBe('2025-10-15T00:00:00Z');
      expect(sortedResults[1].metadata.createdAt).toBe('2025-10-01T00:00:00Z');
    });

    it('should sort by title correctly', () => {
      const results = [
        {
          id: '1',
          title: 'A Note',
          score: 0.5,
          metadata: { isPublic: false },
        },
        {
          id: '2',
          title: 'B Note',
          score: 0.5,
          metadata: { isPublic: false },
        },
        {
          id: '3',
          title: 'C Note',
          score: 0.5,
          metadata: { isPublic: false },
        },
      ] as SearchResult[];

      const options: SearchOptions = {
        sortBy: 'title',
        sortOrder: 'asc',
      };

      const sortedResults = searchService['sortResults'](results, options);

      expect(sortedResults).toHaveLength(3);
      expect(sortedResults[0].title).toBe('A Note');
      expect(sortedResults[1].title).toBe('B Note');
      expect(sortedResults[2].title).toBe('C Note');
    });

    it('should sort by view count correctly', () => {
      const results = [
        {
          id: '1',
          title: 'Low Views',
          score: 0.5,
          metadata: {
            viewCount: 5,
            isPublic: false,
          },
        },
        {
          id: '2',
          title: 'High Views',
          score: 0.5,
          metadata: {
            viewCount: 25,
            isPublic: false,
          },
        },
        {
          id: '3',
          title: 'Medium Views',
          score: 0.5,
          metadata: {
            viewCount: 15,
            isPublic: false,
          },
        },
      ] as SearchResult[];

      const options: SearchOptions = {
        sortBy: 'viewCount',
        sortOrder: 'desc',
      };

      const sortedResults = searchService['sortResults'](results, options);

      expect(sortedResults).toHaveLength(3);
      expect(sortedResults[0].metadata.viewCount).toBe(25);
      expect(sortedResults[1].metadata.viewCount).toBe(15);
      expect(sortedResults[2].metadata.viewCount).toBe(5);
    });
  });

  describe('getLiveSuggestions', () => {
    it('should return empty suggestions for short queries', async () => {
      const suggestions = await searchService.getLiveSuggestions('a');

      expect(suggestions).toEqual([]);
    });

    it('should return suggestions for valid queries', async () => {
      const suggestions = await searchService.getLiveSuggestions('React');

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return relevant suggestions based on query', async () => {
      const suggestions = await searchService.getLiveSuggestions('React Hooks');

      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('React'),
            type: expect.stringMatching(/query|recent|tag/),
          }),
        ]),
      );
    });

    it('should limit suggestions count', async () => {
      const suggestions = await searchService.getLiveSuggestions('test');

      expect(suggestions.length).toBeLessThanOrEqual(8);
    });

    it('should handle special characters', async () => {
      const suggestions =
        await searchService.getLiveSuggestions('React@component');

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('Search History', () => {
    it('should save search history automatically when searching', async () => {
      const request: SearchRequest = {
        query: 'React Hooks',
        searchType: 'keyword',
        options: { limit: 5 },
      };

      await searchService.search(request);
      const history = searchService.getSearchHistory();

      expect(history).toContain('React Hooks');
      expect(history[0]).toBe('React Hooks');
    });

    it('should not duplicate search history entries', async () => {
      const request: SearchRequest = {
        query: 'test query',
        searchType: 'keyword',
        options: { limit: 5 },
      };

      // 搜索两次相同的查询
      await searchService.search(request);
      await searchService.search(request);

      const history = searchService.getSearchHistory();

      expect(history.filter(item => item === 'test query')).toHaveLength(1);
    });

    it('should limit search history size', async () => {
      // 添加超过限制的搜索历史
      for (let i = 0; i < 25; i++) {
        const request: SearchRequest = {
          query: `search query ${i}`,
          searchType: 'keyword',
          options: { limit: 5 },
        };
        await searchService.search(request);
      }

      const history = searchService.getSearchHistory();

      expect(history.length).toBeLessThanOrEqual(20);
    });

    it('should clear search history', async () => {
      const request1: SearchRequest = {
        query: 'test 1',
        searchType: 'keyword',
        options: { limit: 5 },
      };
      const request2: SearchRequest = {
        query: 'test 2',
        searchType: 'keyword',
        options: { limit: 5 },
      };

      await searchService.search(request1);
      await searchService.search(request2);
      expect(searchService.getSearchHistory()).toHaveLength(2);

      searchService.clearSearchHistory();
      expect(searchService.getSearchHistory()).toHaveLength(0);
    });
  });

  describe('Popular Queries', () => {
    it('should return popular queries', () => {
      const popularQueries = searchService.getPopularQueries();

      expect(popularQueries).toBeDefined();
      expect(Array.isArray(popularQueries)).toBe(true);
      expect(popularQueries.length).toBeGreaterThan(0);
    });

    it('should include expected popular queries', () => {
      const popularQueries = searchService.getPopularQueries();

      expect(popularQueries).toContain('React');
      expect(popularQueries).toContain('学习笔记');
      expect(popularQueries).toContain('项目计划');
      expect(popularQueries).toContain('AI');
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      const request: SearchRequest = {
        query: '',
        searchType: 'keyword' as any,
        options: {},
      };

      const result = await searchService.search(request);

      expect(result).toBeDefined();
      expect(result.results).toEqual([]);
    });

    it('should handle invalid search types gracefully', async () => {
      const request: SearchRequest = {
        query: 'test',
        searchType: 'invalid' as any,
        options: {},
      };

      // 应该有默认处理逻辑
      const result = await searchService.search(request);

      expect(result).toBeDefined();
    });
  });
});
