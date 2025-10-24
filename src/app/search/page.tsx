/**
 * 搜索页面
 *
 * 提供完整的搜索体验
 */

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { AdvancedSearch } from '@/components/search/advanced-search';
import { SearchResults } from '@/components/search/search-results';
import {
  searchService,
  type SearchResult,
  type SearchAnalytics,
} from '@/lib/search-service';
import type { SearchRequest } from '@/lib/search-service';

export default function SearchPage() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentSearchType, setCurrentSearchType] = useState<
    'keyword' | 'semantic' | 'hybrid'
  >('hybrid');

  // 处理搜索请求
  const handleSearch = async (searchResults: SearchResult[]) => {
    setResults(searchResults);
    setHasMore(searchResults.length >= 20); // 假设每页20条结果
  };

  // 处理结果点击
  const handleResultClick = (result: SearchResult) => {
    // 这里可以导航到笔记详情页
    console.log('点击笔记:', result.title);
    // router.push(`/notes/${result.id}`)
  };

  // 处理结果预览
  const handleResultPreview = (result: SearchResult) => {
    // 这里可以打开预览模态框
    console.log('预览笔记:', result.title);
  };

  // 加载更多结果
  const handleLoadMore = async () => {
    if (!currentQuery || isSearching) {
      return;
    }

    setIsSearching(true);
    try {
      const searchRequest: SearchRequest = {
        query: currentQuery,
        searchType: currentSearchType,
        options: {
          limit: 20,
          offset: results.length,
          sortBy: 'relevance',
          sortOrder: 'desc',
        },
      };

      const response = await searchService.search(searchRequest);
      setResults(prev => [...prev, ...response.results]);
      setHasMore(response.results.length >= 20);
      setAnalytics(response.analytics);
    } catch (error) {
      console.error('加载更多结果失败:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='container mx-auto px-4 py-8 max-w-6xl'>
        {/* 页面标题 */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>智能搜索</h1>
          <p className='text-gray-600'>使用AI技术快速找到您需要的笔记内容</p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* 搜索侧边栏 */}
          <div className='lg:col-span-1'>
            <AdvancedSearch
              onSearch={searchResults => {
                setCurrentQuery(currentQuery);
                handleSearch(searchResults);
              }}
              onResultSelect={handleResultClick}
            />
          </div>

          {/* 搜索结果 */}
          <div className='lg:col-span-2'>
            <SearchResults
              results={results}
              query={currentQuery}
              totalResults={analytics?.totalResults}
              searchTime={analytics?.searchTime}
              isLoading={isSearching}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              onResultClick={handleResultClick}
              onResultPreview={handleResultPreview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
