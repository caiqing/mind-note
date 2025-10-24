/**
 * 高级搜索组件
 *
 * 提供完整的搜索功能，包括关键词搜索、语义搜索和高级筛选
 */

'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { HighlightText } from '@/components/ui/highlight-text';
import {
  api,
  type SearchRequest,
  type SearchFilters,
  type SearchOptions,
  type SearchResult,
} from '@/lib/api-client';
import {
  Search,
  Filter,
  X,
  Clock,
  TrendingUp,
  Tag,
  Calendar,
  FileText,
  Brain,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';

interface AdvancedSearchProps {
  onSearch?: (results: SearchResult[]) => void;
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function AdvancedSearch({
  onSearch,
  onResultSelect,
  className,
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<
    'keyword' | 'semantic' | 'hybrid'
  >('hybrid');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [options, setOptions] = useState<SearchOptions>({
    sortBy: 'relevance',
    sortOrder: 'desc',
    limit: 20,
    includeContent: true,
    highlightMatches: true,
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 加载搜索历史
  useEffect(() => {
    setSearchHistory(searchService.getSearchHistory());
  }, []);

  // 实时搜索建议
  useEffect(() => {
    if (query.length >= 2) {
      const delayDebounce = setTimeout(async () => {
        try {
          const liveSuggestions = await api.searchSuggestions(query);
          setSuggestions(liveSuggestions);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(-1);
        } catch (error) {
          console.error('Failed to get suggestions:', error);
        }
      }, 300);

      return () => clearTimeout(delayDebounce);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) {
        return;
      }

      switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selectedSuggestion = suggestions[selectedSuggestionIndex];
          setQuery(selectedSuggestion.text);
          setShowSuggestions(false);
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
      }
    },
    [showSuggestions, suggestions, selectedSuggestionIndex],
  );

  // 执行搜索
  const handleSearch = useCallback(async () => {
    if (query.trim().length === 0) {
      return;
    }

    setIsSearching(true);
    try {
      const searchRequest: SearchRequest = {
        query: query.trim(),
        searchType,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        options,
      };

      const response = await api.search(searchRequest);
      setResults(response.results);
      onSearch?.(response.results);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [query, searchType, filters, options, onSearch]);

  // 处理筛选条件变化
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // 清除筛选条件
  const clearFilters = () => {
    setFilters({});
  };

  // 应用历史搜索
  const applyHistorySearch = (historyQuery: string) => {
    setQuery(historyQuery);
    handleSearch();
  };

  // 应用建议
  const applySuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch();
  };

  // 搜索类型选项
  const searchTypeOptions = [
    {
      value: 'keyword',
      label: '关键词搜索',
      icon: Search,
      description: '基于关键词精确匹配',
    },
    {
      value: 'semantic',
      label: '语义搜索',
      icon: Brain,
      description: '理解查询意图和语义',
    },
    {
      value: 'hybrid',
      label: '混合搜索',
      icon: Zap,
      description: '结合关键词和语义搜索',
    },
  ];

  // 排序选项
  const sortOptions = [
    { value: 'relevance', label: '相关性' },
    { value: 'date', label: '创建时间' },
    { value: 'title', label: '标题' },
    { value: 'viewCount', label: '浏览次数' },
  ];

  // 获取活跃筛选条件数量
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.categories?.length) {
      count++;
    }
    if (filters.tags?.length) {
      count++;
    }
    if (filters.status?.length) {
      count++;
    }
    if (filters.dateRange) {
      count++;
    }
    if (filters.sentiment?.length) {
      count++;
    }
    if (filters.isPublic !== undefined) {
      count++;
    }
    if (filters.aiProcessed !== undefined) {
      count++;
    }
    if (filters.wordCountRange) {
      count++;
    }
    return count;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 主搜索框 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center text-lg'>
            <Search className='w-5 h-5 mr-2' />
            智能搜索
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* 搜索类型选择 */}
          <div className='flex items-center space-x-2 p-1 bg-muted rounded-lg'>
            {searchTypeOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setSearchType(option.value as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    searchType === option.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className='w-4 h-4' />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          {/* 搜索输入框 */}
          <div className='relative'>
            <div className='relative'>
              <Input
                ref={searchInputRef}
                type='text'
                placeholder={`${
                  searchType === 'keyword'
                    ? '输入关键词进行搜索...'
                    : searchType === 'semantic'
                      ? '描述您要查找的内容...'
                      : '输入关键词或描述内容...'
                }`}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className='pr-20 text-base'
              />
              <div className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1'>
                {query && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setQuery('')}
                    className='h-8 w-8 p-0'
                  >
                    <X className='w-4 h-4' />
                  </Button>
                )}
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || query.trim().length === 0}
                  size='sm'
                  className='h-8'
                >
                  {isSearching ? (
                    <div className='w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  ) : (
                    <Search className='w-4 h-4' />
                  )}
                </Button>
              </div>
            </div>

            {/* 搜索建议 */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className='absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto'
              >
                {suggestions.map((suggestion, index) => {
                  const Icon =
                    suggestion.type === 'query'
                      ? TrendingUp
                      : suggestion.type === 'recent'
                        ? Clock
                        : suggestion.type === 'tag'
                          ? Tag
                          : Search;

                  return (
                    <button
                      key={index}
                      onClick={() => applySuggestion(suggestion)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-muted transition-colors ${
                        index === selectedSuggestionIndex ? 'bg-muted' : ''
                      }`}
                    >
                      <Icon className='w-4 h-4 text-muted-foreground' />
                      <span className='flex-1'>{suggestion.text}</span>
                      {suggestion.count && (
                        <Badge variant='secondary' className='text-xs'>
                          {suggestion.count}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 快速操作 */}
          <div className='flex items-center justify-between'>
            <Button
              variant='outline'
              onClick={() => setShowFilters(!showFilters)}
              className='flex items-center space-x-2'
            >
              <SlidersHorizontal className='w-4 h-4' />
              <span>高级筛选</span>
              {getActiveFiltersCount() > 0 && (
                <Badge variant='secondary' className='ml-1'>
                  {getActiveFiltersCount()}
                </Badge>
              )}
              {showFilters ? (
                <ChevronUp className='w-4 h-4' />
              ) : (
                <ChevronDown className='w-4 h-4' />
              )}
            </Button>

            <div className='flex items-center space-x-2'>
              <Select
                value={options.sortBy}
                onValueChange={value =>
                  setOptions(prev => ({ ...prev, sortBy: value as any }))
                }
              >
                <SelectTrigger className='w-32'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={options.sortOrder}
                onValueChange={value =>
                  setOptions(prev => ({ ...prev, sortOrder: value as any }))
                }
              >
                <SelectTrigger className='w-20'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='desc'>降序</SelectItem>
                  <SelectItem value='asc'>升序</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 高级筛选面板 */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='flex items-center text-lg'>
                <Filter className='w-5 h-5 mr-2' />
                高级筛选
              </CardTitle>
              <div className='flex items-center space-x-2'>
                <Button variant='outline' size='sm' onClick={clearFilters}>
                  清除全部
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowFilters(false)}
                >
                  <X className='w-4 h-4' />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue='basic' className='space-y-4'>
              <TabsList className='grid w-full grid-cols-3'>
                <TabsTrigger value='basic'>基础筛选</TabsTrigger>
                <TabsTrigger value='content'>内容筛选</TabsTrigger>
                <TabsTrigger value='advanced'>高级筛选</TabsTrigger>
              </TabsList>

              <TabsContent value='basic' className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {/* 分类筛选 */}
                  <div>
                    <Label className='text-sm font-medium'>分类</Label>
                    <div className='mt-2 space-y-2'>
                      {['工作', '学习', '生活', '创意'].map(category => (
                        <div
                          key={category}
                          className='flex items-center space-x-2'
                        >
                          <Checkbox
                            id={`category-${category}`}
                            checked={
                              filters.categories?.includes(category) || false
                            }
                            onCheckedChange={checked => {
                              const current = filters.categories || [];
                              if (checked) {
                                handleFilterChange('categories', [
                                  ...current,
                                  category,
                                ]);
                              } else {
                                handleFilterChange(
                                  'categories',
                                  current.filter(c => c !== category),
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`category-${category}`}
                            className='text-sm'
                          >
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 状态筛选 */}
                  <div>
                    <Label className='text-sm font-medium'>状态</Label>
                    <div className='mt-2 space-y-2'>
                      {['PUBLISHED', 'DRAFT', 'ARCHIVED'].map(status => (
                        <div
                          key={status}
                          className='flex items-center space-x-2'
                        >
                          <Checkbox
                            id={`status-${status}`}
                            checked={
                              filters.status?.includes(status as any) || false
                            }
                            onCheckedChange={checked => {
                              const current = filters.status || [];
                              if (checked) {
                                handleFilterChange('status', [
                                  ...current,
                                  status as any,
                                ]);
                              } else {
                                handleFilterChange(
                                  'status',
                                  current.filter(s => s !== status),
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`status-${status}`}
                            className='text-sm'
                          >
                            {status === 'PUBLISHED'
                              ? '已发布'
                              : status === 'DRAFT'
                                ? '草稿'
                                : '已归档'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='content' className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {/* 情感筛选 */}
                  <div>
                    <Label className='text-sm font-medium'>情感倾向</Label>
                    <div className='mt-2 space-y-2'>
                      {['positive', 'neutral', 'negative'].map(sentiment => (
                        <div
                          key={sentiment}
                          className='flex items-center space-x-2'
                        >
                          <Checkbox
                            id={`sentiment-${sentiment}`}
                            checked={
                              filters.sentiment?.includes(sentiment as any) ||
                              false
                            }
                            onCheckedChange={checked => {
                              const current = filters.sentiment || [];
                              if (checked) {
                                handleFilterChange('sentiment', [
                                  ...current,
                                  sentiment as any,
                                ]);
                              } else {
                                handleFilterChange(
                                  'sentiment',
                                  current.filter(s => s !== sentiment),
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`sentiment-${sentiment}`}
                            className='text-sm'
                          >
                            {sentiment === 'positive'
                              ? '积极'
                              : sentiment === 'negative'
                                ? '消极'
                                : '中性'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 其他筛选 */}
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <Label htmlFor='isPublic'>公开笔记</Label>
                      <Switch
                        id='isPublic'
                        checked={filters.isPublic || false}
                        onCheckedChange={checked =>
                          handleFilterChange('isPublic', checked)
                        }
                      />
                    </div>
                    <div className='flex items-center justify-between'>
                      <Label htmlFor='aiProcessed'>AI已处理</Label>
                      <Switch
                        id='aiProcessed'
                        checked={filters.aiProcessed || false}
                        onCheckedChange={checked =>
                          handleFilterChange('aiProcessed', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='advanced' className='space-y-4'>
                {/* 日期范围 */}
                <div>
                  <Label className='text-sm font-medium'>创建日期</Label>
                  <div className='mt-2 grid grid-cols-2 gap-2'>
                    <Input
                      type='date'
                      placeholder='开始日期'
                      value={filters.dateRange?.from || ''}
                      onChange={e =>
                        handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          from: e.target.value,
                        })
                      }
                    />
                    <Input
                      type='date'
                      placeholder='结束日期'
                      value={filters.dateRange?.to || ''}
                      onChange={e =>
                        handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          to: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* 字数范围 */}
                <div>
                  <Label className='text-sm font-medium'>字数范围</Label>
                  <div className='mt-2 grid grid-cols-2 gap-2'>
                    <Input
                      type='number'
                      placeholder='最小字数'
                      value={filters.wordCountRange?.min || ''}
                      onChange={e =>
                        handleFilterChange('wordCountRange', {
                          ...filters.wordCountRange,
                          min: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                    />
                    <Input
                      type='number'
                      placeholder='最大字数'
                      value={filters.wordCountRange?.max || ''}
                      onChange={e =>
                        handleFilterChange('wordCountRange', {
                          ...filters.wordCountRange,
                          max: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 搜索历史 */}
      {searchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center text-lg'>
              <Clock className='w-5 h-5 mr-2' />
              搜索历史
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex flex-wrap gap-2'>
              {searchHistory.slice(0, 10).map((historyQuery, index) => (
                <Badge
                  key={index}
                  variant='outline'
                  className='cursor-pointer hover:bg-muted'
                  onClick={() => applyHistorySearch(historyQuery)}
                >
                  {historyQuery}
                </Badge>
              ))}
              {searchHistory.length > 10 && (
                <Badge variant='outline' className='text-muted-foreground'>
                  +{searchHistory.length - 10} 更多
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜索结果 */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center text-lg'>
              <Target className='w-5 h-5 mr-2' />
              搜索结果 ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {results.map(result => (
                <div
                  key={result.id}
                  className='p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors'
                  onClick={() => onResultSelect?.(result)}
                >
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <h3 className='font-semibold text-base mb-1'>
                        <HighlightText text={result.title} highlight={query} />
                      </h3>
                      {result.snippet && (
                        <p className='text-sm text-muted-foreground mb-2'>
                          <HighlightText
                            text={result.snippet}
                            highlight={query}
                          />
                        </p>
                      )}
                      <div className='flex items-center space-x-4 text-xs text-muted-foreground'>
                        <span>分类: {result.metadata.category}</span>
                        <span>
                          创建:{' '}
                          {new Date(
                            result.metadata.createdAt,
                          ).toLocaleDateString()}
                        </span>
                        <span>浏览: {result.metadata.viewCount}</span>
                        <span>相关度: {Math.round(result.score * 100)}%</span>
                      </div>
                      {result.metadata.tags.length > 0 && (
                        <div className='flex flex-wrap gap-1 mt-2'>
                          {result.metadata.tags.map((tag, tagIndex) => (
                            <Badge
                              key={tagIndex}
                              variant='secondary'
                              className='text-xs'
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {!isSearching && query.trim().length > 0 && results.length === 0 && (
        <Card>
          <CardContent className='pt-6 pb-6 text-center'>
            <Search className='w-12 h-12 mx-auto text-muted-foreground mb-4' />
            <h3 className='text-lg font-semibold mb-2'>未找到相关结果</h3>
            <p className='text-muted-foreground mb-4'>
              尝试使用不同的关键词或调整筛选条件
            </p>
            <div className='space-y-2'>
              <Button variant='outline' onClick={clearFilters}>
                清除筛选条件
              </Button>
              <Button variant='outline' onClick={() => setQuery('')}>
                清空搜索内容
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
