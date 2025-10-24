/**
 * 搜索功能集成测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInterface } from '@/components/search/search-interface';
import {
  createMockSearchResult,
  createMockSearchFilters,
} from '../../tests/utils/test-factories';
import { mockSearchService } from '../../tests/utils/test-helpers';

// Mock search service
jest.mock('@/lib/services/search-service', () => ({
  searchService: mockSearchService,
}));

describe('Search Integration', () => {
  const mockResults = [
    createMockSearchResult({
      id: '1',
      title: 'React Hooks学习笔记',
      content: 'React Hooks是React 16.8引入的新特性...',
      score: 0.95,
    }),
    createMockSearchResult({
      id: '2',
      title: 'TypeScript入门指南',
      content: 'TypeScript是JavaScript的超集...',
      score: 0.87,
    }),
  ];

  const mockAnalytics = {
    totalResults: 2,
    searchTime: 0.15,
    facets: {
      categories: [
        { name: '技术', count: 15 },
        { name: '学习', count: 8 },
      ],
      tags: [
        { name: 'React', count: 12 },
        { name: 'TypeScript', count: 6 },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform keyword search and display results', async () => {
    mockSearchService.search.mockResolvedValue({
      results: mockResults,
      analytics: mockAnalytics,
      suggestions: [],
    });

    render(<SearchInterface />);

    const searchInput = screen.getByPlaceholderText(/搜索笔记/i);
    await userEvent.type(searchInput, 'React');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'React',
          searchType: 'keyword',
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('React Hooks学习笔记')).toBeInTheDocument();
      expect(screen.getByText('TypeScript入门指南')).toBeInTheDocument();
    });

    expect(screen.getByText(/找到 2 个结果/i)).toBeInTheDocument();
  });

  it('should apply filters and update search results', async () => {
    const filteredResults = [mockResults[0]];

    mockSearchService.search
      .mockResolvedValueOnce({
        results: mockResults,
        analytics: mockAnalytics,
        suggestions: [],
      })
      .mockResolvedValueOnce({
        results: filteredResults,
        analytics: { ...mockAnalytics, totalResults: 1 },
        suggestions: [],
      });

    render(<SearchInterface />);

    // 初始搜索
    const searchInput = screen.getByPlaceholderText(/搜索笔记/i);
    await userEvent.type(searchInput, 'React');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('React Hooks学习笔记')).toBeInTheDocument();
      expect(screen.getByText('TypeScript入门指南')).toBeInTheDocument();
    });

    // 应用分类过滤
    const categoryFilter = screen.getByLabelText(/分类/i);
    await userEvent.click(categoryFilter);
    await userEvent.click(screen.getByText('技术'));

    await waitFor(() => {
      expect(mockSearchService.search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: 'React',
          filters: expect.objectContaining({
            categories: ['技术'],
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('React Hooks学习笔记')).toBeInTheDocument();
      expect(screen.queryByText('TypeScript入门指南')).not.toBeInTheDocument();
    });
  });

  it('should handle live suggestions', async () => {
    const mockSuggestions = [
      { text: 'React Hooks', type: 'query' as const },
      { text: 'React组件', type: 'query' as const },
      { text: 'React', type: 'recent' as const },
    ];

    mockSearchService.getLiveSuggestions.mockResolvedValue(mockSuggestions);

    render(<SearchInterface />);

    const searchInput = screen.getByPlaceholderText(/搜索笔记/i);
    await userEvent.type(searchInput, 'React');

    await waitFor(() => {
      expect(mockSearchService.getLiveSuggestions).toHaveBeenCalledWith(
        'React',
      );
    });

    await waitFor(() => {
      expect(screen.getByText('React Hooks')).toBeInTheDocument();
      expect(screen.getByText('React组件')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    // 点击建议项
    await userEvent.click(screen.getByText('React Hooks'));

    expect(searchInput).toHaveValue('React Hooks');
  });

  it('should handle different search types', async () => {
    mockSearchService.search.mockResolvedValue({
      results: mockResults,
      analytics: mockAnalytics,
      suggestions: [],
    });

    render(<SearchInterface />);

    // 切换到语义搜索
    const semanticSearchButton = screen.getByRole('button', {
      name: /语义搜索/i,
    });
    await userEvent.click(semanticSearchButton);

    const searchInput = screen.getByPlaceholderText(/搜索笔记/i);
    await userEvent.type(searchInput, '前端开发技术');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '前端开发技术',
          searchType: 'semantic',
        }),
      );
    });
  });

  it('should handle search result pagination', async () => {
    const page1Results = mockResults;
    const page2Results = [
      createMockSearchResult({
        id: '3',
        title: 'Vue.js教程',
        content: 'Vue.js是渐进式JavaScript框架...',
        score: 0.82,
      }),
    ];

    mockSearchService.search
      .mockResolvedValueOnce({
        results: page1Results,
        analytics: { ...mockAnalytics, totalResults: 3 },
        suggestions: [],
      })
      .mockResolvedValueOnce({
        results: page2Results,
        analytics: { ...mockAnalytics, totalResults: 3 },
        suggestions: [],
      });

    render(<SearchInterface />);

    // 第一页搜索
    const searchInput = screen.getByPlaceholderText(/搜索笔记/i);
    await userEvent.type(searchInput, 'JavaScript');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('React Hooks学习笔记')).toBeInTheDocument();
      expect(screen.getByText('TypeScript入门指南')).toBeInTheDocument();
    });

    // 点击下一页
    const nextPageButton = screen.getByRole('button', { name: /下一页/i });
    await userEvent.click(nextPageButton);

    await waitFor(() => {
      expect(mockSearchService.search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: 'JavaScript',
          options: expect.objectContaining({
            offset: 2,
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Vue.js教程')).toBeInTheDocument();
      expect(screen.queryByText('React Hooks学习笔记')).not.toBeInTheDocument();
    });
  });

  it('should handle search history', async () => {
    const recentSearches = ['React Hooks', 'TypeScript', 'JavaScript'];
    mockSearchService.getSearchHistory.mockReturnValue(recentSearches);
    mockSearchService.search.mockResolvedValue({
      results: mockResults,
      analytics: mockAnalytics,
      suggestions: [],
    });

    render(<SearchInterface />);

    // 搜索历史记录应该显示
    await waitFor(() => {
      expect(screen.getByText('React Hooks')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    // 点击历史搜索项
    await userEvent.click(screen.getByText('React Hooks'));

    const searchInput = screen.getByPlaceholderText(/搜索笔记/i);
    expect(searchInput).toHaveValue('React Hooks');

    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'React Hooks',
        }),
      );
    });
  });

  it('should handle empty search results', async () => {
    mockSearchService.search.mockResolvedValue({
      results: [],
      analytics: { totalResults: 0, searchTime: 0.05, facets: {} },
      suggestions: ['React Hooks', 'React组件'],
    });

    render(<SearchInterface />);

    const searchInput = screen.getByPlaceholderText(/搜索笔记/i);
    await userEvent.type(searchInput, '不存在的关键词');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText(/没有找到相关结果/i)).toBeInTheDocument();
    });

    // 应该显示搜索建议
    await waitFor(() => {
      expect(screen.getByText('React Hooks')).toBeInTheDocument();
      expect(screen.getByText('React组件')).toBeInTheDocument();
    });
  });

  it('should handle search errors gracefully', async () => {
    mockSearchService.search.mockRejectedValue(new Error('搜索服务不可用'));

    render(<SearchInterface />);

    const searchInput = screen.getByPlaceholderText(/搜索笔记/i);
    await userEvent.type(searchInput, 'React');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText(/搜索失败，请稍后重试/i)).toBeInTheDocument();
    });
  });

  it('should update URL with search parameters', async () => {
    mockSearchService.search.mockResolvedValue({
      results: mockResults,
      analytics: mockAnalytics,
      suggestions: [],
    });

    // Mock window.history
    const pushStateMock = jest.fn();
    Object.defineProperty(window.history, 'pushState', {
      value: pushStateMock,
      writable: true,
    });

    render(<SearchInterface />);

    const searchInput = screen.getByPlaceholderText(/搜索笔记/i);
    await userEvent.type(searchInput, 'React');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(pushStateMock).toHaveBeenCalledWith(
        null,
        '',
        expect.stringContaining('q=React'),
      );
    });
  });
});
