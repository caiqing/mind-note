/**
 * 搜索结果组件
 *
 * 展示搜索结果列表，支持多种视图和交互
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HighlightText } from '@/components/ui/highlight-text';
import type { SearchResult } from '@/lib/search-service';
import {
  Search,
  Eye,
  Calendar,
  Tag,
  FileText,
  User,
  Clock,
  TrendingUp,
  Grid3X3,
  List,
  ExternalLink,
} from 'lucide-react';

interface SearchResultsProps {
  results: SearchResult[];
  query?: string;
  totalResults?: number;
  searchTime?: number;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onResultClick?: (result: SearchResult) => void;
  onResultPreview?: (result: SearchResult) => void;
  className?: string;
}

type ViewMode = 'list' | 'grid';

export function SearchResults({
  results,
  query,
  totalResults,
  searchTime,
  isLoading,
  onLoadMore,
  hasMore,
  onResultClick,
  onResultPreview,
  className,
}: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<
    'relevance' | 'date' | 'title' | 'viewCount'
  >('relevance');

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return '今天';
    }
    if (diffDays === 2) {
      return '昨天';
    }
    if (diffDays <= 7) {
      return `${diffDays - 1}天前`;
    }
    if (diffDays <= 30) {
      return `${Math.floor(diffDays / 7)}周前`;
    }
    if (diffDays <= 365) {
      return `${Math.floor(diffDays / 30)}个月前`;
    }
    return `${Math.floor(diffDays / 365)}年前`;
  };

  // 获取情感颜色
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
    case 'positive':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'negative':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'neutral':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // 获取状态标签
  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      PUBLISHED: 'default',
      DRAFT: 'secondary',
      ARCHIVED: 'outline',
    };
    const labels: Record<string, string> = {
      PUBLISHED: '已发布',
      DRAFT: '草稿',
      ARCHIVED: '已归档',
    };
    return (
      <Badge variant={variants[status] || 'secondary'} className='text-xs'>
        {labels[status] || status}
      </Badge>
    );
  };

  // 列表视图
  const ListView = () => (
    <div className='space-y-4'>
      {results.map((result, index) => (
        <Card
          key={result.id}
          className='hover:shadow-md transition-shadow cursor-pointer'
          onClick={() => onResultClick?.(result)}
        >
          <CardContent className='p-6'>
            <div className='flex items-start justify-between'>
              <div className='flex-1 min-w-0'>
                {/* 标题和状态 */}
                <div className='flex items-center space-x-3 mb-2'>
                  <h3 className='font-semibold text-lg text-gray-900 truncate'>
                    <HighlightText text={result.title} highlight={query} />
                  </h3>
                  {getStatusBadge(result.metadata.status)}
                  {result.matchType === 'semantic' && (
                    <Badge variant='outline' className='text-xs'>
                      <Brain className='w-3 h-3 mr-1' />
                      语义匹配
                    </Badge>
                  )}
                </div>

                {/* 摘要 */}
                {result.snippet && (
                  <p className='text-sm text-gray-600 mb-3 line-clamp-2'>
                    <HighlightText text={result.snippet} highlight={query} />
                  </p>
                )}

                {/* 元数据 */}
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-4 text-xs text-gray-500'>
                    {result.metadata.category && (
                      <span className='flex items-center'>
                        <Tag className='w-3 h-3 mr-1' />
                        {result.metadata.category}
                      </span>
                    )}
                    <span className='flex items-center'>
                      <Calendar className='w-3 h-3 mr-1' />
                      {formatDate(result.metadata.createdAt)}
                    </span>
                    <span className='flex items-center'>
                      <Eye className='w-3 h-3 mr-1' />
                      {result.metadata.viewCount}
                    </span>
                    <span className='flex items-center'>
                      <FileText className='w-3 h-3 mr-1' />
                      {result.metadata.wordCount}字
                    </span>
                  </div>

                  <div className='flex items-center space-x-2'>
                    {/* 相关度分数 */}
                    <div className='flex items-center space-x-1'>
                      <TrendingUp className='w-3 h-3 text-green-500' />
                      <span className='text-xs font-medium text-green-600'>
                        {Math.round(result.score * 100)}%
                      </span>
                    </div>

                    {/* 情感标签 */}
                    {result.metadata.sentiment && (
                      <Badge
                        className={`text-xs ${getSentimentColor(result.metadata.sentiment)}`}
                      >
                        {result.metadata.sentiment === 'positive'
                          ? '积极'
                          : result.metadata.sentiment === 'negative'
                            ? '消极'
                            : '中性'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 标签 */}
                {result.metadata.tags.length > 0 && (
                  <div className='flex flex-wrap gap-1 mt-3'>
                    {result.metadata.tags.slice(0, 5).map((tag, tagIndex) => (
                      <Badge
                        key={tagIndex}
                        variant='secondary'
                        className='text-xs'
                      >
                        {tag}
                      </Badge>
                    ))}
                    {result.metadata.tags.length > 5 && (
                      <Badge variant='secondary' className='text-xs'>
                        +{result.metadata.tags.length - 5}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className='flex items-center space-x-2 ml-4'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={e => {
                    e.stopPropagation();
                    onResultPreview?.(result);
                  }}
                >
                  <Eye className='w-4 h-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={e => {
                    e.stopPropagation();
                    window.open(`/notes/${result.id}`, '_blank');
                  }}
                >
                  <ExternalLink className='w-4 h-4' />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // 网格视图
  const GridView = () => (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
      {results.map(result => (
        <Card
          key={result.id}
          className='hover:shadow-lg transition-all cursor-pointer group'
          onClick={() => onResultClick?.(result)}
        >
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between mb-2'>
              {getStatusBadge(result.metadata.status)}
              <div className='flex items-center space-x-1'>
                <TrendingUp className='w-3 h-3 text-green-500' />
                <span className='text-xs font-medium text-green-600'>
                  {Math.round(result.score * 100)}%
                </span>
              </div>
            </div>
            <CardTitle className='text-base line-clamp-2 group-hover:text-primary transition-colors'>
              <HighlightText text={result.title} highlight={query} />
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            {/* 摘要 */}
            {result.snippet && (
              <p className='text-sm text-gray-600 mb-4 line-clamp-3'>
                <HighlightText text={result.snippet} highlight={query} />
              </p>
            )}

            {/* 元数据 */}
            <div className='flex items-center justify-between text-xs text-gray-500 mb-3'>
              <div className='flex items-center space-x-2'>
                {result.metadata.category && (
                  <span>{result.metadata.category}</span>
                )}
                <span>•</span>
                <span>{formatDate(result.metadata.createdAt)}</span>
              </div>
              <div className='flex items-center space-x-1'>
                <Eye className='w-3 h-3' />
                <span>{result.metadata.viewCount}</span>
              </div>
            </div>

            {/* 标签 */}
            {result.metadata.tags.length > 0 && (
              <div className='flex flex-wrap gap-1 mb-3'>
                {result.metadata.tags.slice(0, 3).map((tag, tagIndex) => (
                  <Badge key={tagIndex} variant='secondary' className='text-xs'>
                    {tag}
                  </Badge>
                ))}
                {result.metadata.tags.length > 3 && (
                  <Badge variant='secondary' className='text-xs'>
                    +{result.metadata.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* 情感标签 */}
            {result.metadata.sentiment && (
              <div className='flex items-center justify-between'>
                <Badge
                  className={`text-xs ${getSentimentColor(result.metadata.sentiment)}`}
                >
                  {result.metadata.sentiment === 'positive'
                    ? '积极'
                    : result.metadata.sentiment === 'negative'
                      ? '消极'
                      : '中性'}
                </Badge>
                {result.matchType === 'semantic' && (
                  <Badge variant='outline' className='text-xs'>
                    <Brain className='w-3 h-3 mr-1' />
                    语义匹配
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // 加载状态
  if (isLoading) {
    return (
      <div className='space-y-4'>
        {[...Array(3)].map((_, index) => (
          <Card key={index}>
            <CardContent className='p-6'>
              <div className='animate-pulse space-y-4'>
                <div className='flex items-center space-x-3'>
                  <div className='h-6 bg-gray-200 rounded w-3/4' />
                  <div className='h-5 bg-gray-200 rounded w-16' />
                </div>
                <div className='space-y-2'>
                  <div className='h-4 bg-gray-200 rounded' />
                  <div className='h-4 bg-gray-200 rounded w-5/6' />
                </div>
                <div className='flex items-center space-x-4'>
                  <div className='h-3 bg-gray-200 rounded w-20' />
                  <div className='h-3 bg-gray-200 rounded w-16' />
                  <div className='h-3 bg-gray-200 rounded w-12' />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 空状态
  if (!isLoading && results.length === 0) {
    return (
      <Card>
        <CardContent className='pt-12 pb-12 text-center'>
          <Search className='w-16 h-16 mx-auto text-gray-300 mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            未找到相关结果
          </h3>
          <p className='text-gray-500 mb-6'>
            {query ? `没有找到与 "${query}" 相关的内容` : '请输入搜索关键词'}
          </p>
          <div className='space-y-2'>
            <Button variant='outline'>调整搜索条件</Button>
            <Button variant='outline'>浏览所有笔记</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 搜索统计和工具栏 */}
      {(totalResults !== undefined || searchTime !== undefined) && (
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-4 text-sm text-gray-600'>
                {totalResults !== undefined && (
                  <span>
                    找到{' '}
                    <span className='font-semibold text-gray-900'>
                      {totalResults}
                    </span>{' '}
                    个结果
                  </span>
                )}
                {searchTime !== undefined && (
                  <span>
                    用时{' '}
                    <span className='font-semibold text-gray-900'>
                      {searchTime}ms
                    </span>
                  </span>
                )}
                {query && (
                  <span>
                    关键词:{' '}
                    <span className='font-semibold text-gray-900'>
                      "{query}"
                    </span>
                  </span>
                )}
              </div>

              <div className='flex items-center space-x-2'>
                {/* 排序选择 */}
                <Select
                  value={sortBy}
                  onValueChange={value => setSortBy(value as any)}
                >
                  <SelectTrigger className='w-32 h-8'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='relevance'>相关性</SelectItem>
                    <SelectItem value='date'>时间</SelectItem>
                    <SelectItem value='title'>标题</SelectItem>
                    <SelectItem value='viewCount'>热度</SelectItem>
                  </SelectContent>
                </Select>

                <Separator orientation='vertical' className='h-6' />

                {/* 视图切换 */}
                <div className='flex items-center border rounded-md'>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size='sm'
                    onClick={() => setViewMode('list')}
                    className='h-8 px-3 rounded-r-none'
                  >
                    <List className='w-4 h-4' />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size='sm'
                    onClick={() => setViewMode('grid')}
                    className='h-8 px-3 rounded-l-none'
                  >
                    <Grid3X3 className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜索结果 */}
      {viewMode === 'list' ? <ListView /> : <GridView />}

      {/* 加载更多 */}
      {hasMore && onLoadMore && (
        <div className='text-center'>
          <Button
            variant='outline'
            onClick={onLoadMore}
            disabled={isLoading}
            className='min-w-32'
          >
            {isLoading ? (
              <div className='flex items-center space-x-2'>
                <div className='w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                <span>加载中...</span>
              </div>
            ) : (
              '加载更多'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
