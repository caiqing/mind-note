/**
 * Advanced Search Component
 *
 * Provides comprehensive search interface with filters and search options
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  SearchIcon,
  FilterIcon,
  XIcon,
  SparklesIcon,
  ClockIcon,
  HashIcon,
  CalendarIcon,
  TagIcon,
  FolderIcon,
  StarIcon,
  ArchiveIcon,
  TrendingUpIcon,
  ChevronDownIcon,
  RefreshCwIcon
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import { SearchAutocomplete } from './search-autocomplete'

interface SearchFilters {
  categoryId?: string
  tagIds: string[]
  isFavorite?: boolean
  isArchived?: boolean
  dateRange?: {
    start: string
    end: string
  }
}

interface SearchOptions {
  searchType: 'fulltext' | 'vector' | 'hybrid'
  sortBy: 'relevance' | 'created' | 'updated' | 'title'
  sortOrder: 'asc' | 'desc'
  threshold: number
  limit: number
  includeContent: boolean
}

interface SearchResult {
  id: string
  title: string
  content: string
  contentSnippet: string
  category?: {
    id: string
    name: string
    color: string
  }
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  score: number
  similarity?: number
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  isArchived: boolean
  searchType: 'fulltext' | 'vector' | 'hybrid'
}

interface SearchStats {
  totalResults: number
  searchTime: number
  searchType: string
  fulltextResults?: number
  vectorResults?: number
  embeddingTime?: number
}

interface AdvancedSearchProps {
  onResults?: (results: SearchResult[], stats: SearchStats) => void
  className?: string
}

export function AdvancedSearch({
  onResults,
  className = ''
}: AdvancedSearchProps) {
  const { toast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Search state
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [stats, setStats] = useState<SearchStats | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filters state
  const [filters, setFilters] = useState<SearchFilters>({
    tagIds: []
  })

  // Options state
  const [options, setOptions] = useState<SearchOptions>({
    searchType: 'hybrid',
    sortBy: 'relevance',
    sortOrder: 'desc',
    threshold: 0.3,
    limit: 20,
    includeContent: true
  })

  // Suggestions state
  const [suggestions, setSuggestions] = useState<{
    suggestions: string[]
    categories: Array<{ id: string; name: string; count: number }>
    tags: Array<{ id: string; name: string; count: number; color: string }>
  }>({
    suggestions: [],
    categories: [],
    tags: []
  })
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Mock data for categories and tags (will be replaced with real data)
  const [categories] = useState([
    { id: '1', name: '工作', color: '#3B82F6' },
    { id: '2', name: '学习', color: '#10B981' },
    { id: '3', name: '生活', color: '#F59E0B' },
    { id: '4', name: '项目', color: '#8B5CF6' },
  ])

  const [tags] = useState([
    { id: '1', name: '重要', color: '#EF4444' },
    { id: '2', name: '紧急', color: '#F59E0B' },
    { id: '3', name: '想法', color: '#8B5CF6' },
    { id: '4', name: '资料', color: '#10B981' },
    { id: '5', name: '待办', color: '#6B7280' },
  ])

  // Debounced search function
  const debouncedSearch = useDebounce(
    useCallback(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setStats(null)
        return
      }

      setSearching(true)
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            userId: 'demo-user', // Replace with actual user ID from auth
            searchType: options.searchType,
            filters,
            options
          })
        })

        const data = await response.json()

        if (data.success) {
          setResults(data.data.results)
          setStats(data.data.stats)
          onResults?.(data.data.results, data.data.stats)
        } else {
          throw new Error(data.error || '搜索失败')
        }

      } catch (error) {
        console.error('Search error:', error)
        toast({
          title: '搜索失败',
          description: error instanceof Error ? error.message : '请重试',
          variant: 'destructive'
        })
      } finally {
        setSearching(false)
      }
    }, [filters, options, onResults, toast]),
    500 // 500ms debounce
  )

  // Load suggestions
  const loadSuggestions = useCallback(async () => {
    if (!query.trim()) return

    setLoadingSuggestions(true)
    try {
      const response = await fetch('/api/search/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          userId: 'demo-user', // Replace with actual user ID from auth
          limit: 10,
          type: 'smart'
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuggestions(data.data)
      }

    } catch (error) {
      console.error('Failed to load suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }, [query])

  // Handle search input changes
  const handleSearchChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    debouncedSearch(newQuery)
  }, [debouncedSearch])

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Handle option changes
  const handleOptionChange = useCallback((newOptions: Partial<SearchOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }))
  }, [])

  // Handle tag selection
  const handleTagToggle = useCallback((tagId: string) => {
    setFilters(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({ tagIds: [] })
    setQuery('')
    setResults([])
    setStats(null)
  }, [])

  // Format search time
  const formatSearchTime = (time: number) => {
    if (time < 1000) return `${time}ms`
    return `${(time / 1000).toFixed(2)}s`
  }

  // Get search type label
  const getSearchTypeLabel = (type: string) => {
    const labels = {
      fulltext: '全文搜索',
      vector: '语义搜索',
      hybrid: '混合搜索'
    }
    return labels[type as keyof typeof labels] || type
  }

  // Get score color
  const getScoreColor = (score: number, type: 'score' | 'similarity' = 'score') => {
    if (type === 'similarity') {
      if (score >= 0.8) return 'text-green-600'
      if (score >= 0.6) return 'text-yellow-600'
      if (score >= 0.4) return 'text-orange-600'
      return 'text-gray-500'
    } else {
      if (score >= 0.8) return 'text-blue-600'
      if (score >= 0.6) return 'text-indigo-600'
      if (score >= 0.4) return 'text-purple-600'
      return 'text-gray-500'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center text-xl\">
            <SearchIcon className=\"h-6 w-6 mr-2 text-blue-600\" />
            智能搜索
          </CardTitle>
        </CardHeader>
        <CardContent className=\"space-y-4\">
          {/* Main Search Input */}
          <SearchAutocomplete
            onSearch={handleSearchChange}
            placeholder=\"搜索笔记内容、标题或标签...\"
          />

          {/* Search Options Bar */}
          <div className=\"flex items-center justify-between flex-wrap gap-2\">
            <div className=\"flex items-center space-x-2\">
              <Select
                value={options.searchType}
                onValueChange={(value: any) => handleOptionChange({ searchType: value })}
              >
                <SelectTrigger className=\"w-32\">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"hybrid\">混合搜索</SelectItem>
                  <SelectItem value=\"fulltext\">全文搜索</SelectItem>
                  <SelectItem value=\"vector\">语义搜索</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={options.sortBy}
                onValueChange={(value: any) => handleOptionChange({ sortBy: value })}
              >
                <SelectTrigger className=\"w-28\">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"relevance\">相关性</SelectItem>
                  <SelectItem value=\"updated\">更新时间</SelectItem>
                  <SelectItem value=\"created\">创建时间</SelectItem>
                  <SelectItem value=\"title\">标题</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant=\"outline\"
                size=\"sm\"
                onClick={() => setShowFilters(!showFilters)}
                className=\"flex items-center\"
              >
                <FilterIcon className=\"h-4 w-4 mr-2\" />
                筛选
                {Object.values(filters).some(v =>
                  Array.isArray(v) ? v.length > 0 : v !== undefined
                ) && (
                  <Badge variant=\"secondary\" className=\"ml-2 h-5 px-1 text-xs\">
                    已筛选
                  </Badge>
                )}
              </Button>
            </div>

            <div className=\"flex items-center space-x-2 text-sm text-gray-500\">
              {searching && (
                <div className=\"flex items-center\">
                  <RefreshCwIcon className=\"h-4 w-4 animate-spin mr-1\" />
                  搜索中...
                </div>
              )}
              {stats && !searching && (
                <div className=\"flex items-center space-x-4\">
                  <span>找到 {stats.totalResults} 个结果</span>
                  <span>{formatSearchTime(stats.searchTime)}</span>
                  <Badge variant=\"outline\">
                    {getSearchTypeLabel(stats.searchType)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className=\"bg-gray-50\">
              <CardContent className=\"pt-6 space-y-4\">
                {/* Category Filter */}
                <div className=\"space-y-2\">
                  <label className=\"text-sm font-medium flex items-center\">
                    <FolderIcon className=\"h-4 w-4 mr-2\" />
                    分类
                  </label>
                  <div className=\"flex flex-wrap gap-2\">
                    {categories.map(category => (
                      <Badge
                        key={category.id}
                        variant={filters.categoryId === category.id ? \"default\" : \"outline\"}
                        className=\"cursor-pointer\"
                        style={{
                          ...(filters.categoryId === category.id ? {
                            backgroundColor: category.color,
                            borderColor: category.color
                          } : { borderColor: category.color })
                        }}
                        onClick={() => handleFilterChange({
                          categoryId: filters.categoryId === category.id ? undefined : category.id
                        })}
                      >
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tag Filter */}
                <div className=\"space-y-2\">
                  <label className=\"text-sm font-medium flex items-center\">
                    <TagIcon className=\"h-4 w-4 mr-2\" />
                    标签
                  </label>
                  <div className=\"flex flex-wrap gap-2\">
                    {tags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={filters.tagIds.includes(tag.id) ? \"default\" : \"outline\"}
                        className=\"cursor-pointer\"
                        style={{
                          ...(filters.tagIds.includes(tag.id) ? {
                            backgroundColor: tag.color,
                            borderColor: tag.color
                          } : { borderColor: tag.color })
                        }}
                        onClick={() => handleTagToggle(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Status Filters */}
                <div className=\"space-y-2\">
                  <label className=\"text-sm font-medium\">状态</label>
                  <div className=\"flex items-center space-x-4\">
                    <div className=\"flex items-center space-x-2\">
                      <Checkbox
                        id=\"favorite\"
                        checked={filters.isFavorite === true}
                        onCheckedChange={(checked) =>
                          handleFilterChange({ isFavorite: checked ? true : undefined })
                        }
                      />
                      <label htmlFor=\"favorite\" className=\"text-sm flex items-center cursor-pointer\">
                        <StarIcon className=\"h-4 w-4 mr-1 text-yellow-500\" />
                        已收藏
                      </label>
                    </div>
                    <div className=\"flex items-center space-x-2\">
                      <Checkbox
                        id=\"archived\"
                        checked={filters.isArchived === false}
                        onCheckedChange={(checked) =>
                          handleFilterChange({ isArchived: checked ? false : undefined })
                        }
                      />
                      <label htmlFor=\"archived\" className=\"text-sm flex items-center cursor-pointer\">
                        <ArchiveIcon className=\"h-4 w-4 mr-1 text-gray-500\" />
                        未归档
                      </label>
                    </div>
                  </div>
                </div>

                {/* Date Range Filter */}
                <div className=\"space-y-2\">
                  <label className=\"text-sm font-medium flex items-center\">
                    <CalendarIcon className=\"h-4 w-4 mr-2\" />
                    日期范围
                  </label>
                  <div className=\"flex items-center space-x-2\">
                    <Input
                      type=\"date\"
                      value={filters.dateRange?.start || ''}
                      onChange={(e) => handleFilterChange({
                        dateRange: {
                          ...filters.dateRange,
                          start: e.target.value,
                          end: filters.dateRange?.end || new Date().toISOString().split('T')[0]
                        }
                      })}
                      className=\"w-40\"
                    />
                    <span>至</span>
                    <Input
                      type=\"date\"
                      value={filters.dateRange?.end || ''}
                      onChange={(e) => handleFilterChange({
                        dateRange: {
                          ...filters.dateRange,
                          end: e.target.value,
                          start: filters.dateRange?.start || new Date().toISOString().split('T')[0]
                        }
                      })}
                      className=\"w-40\"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                <div className=\"flex justify-end\">
                  <Button
                    variant=\"outline\"
                    size=\"sm\"
                    onClick={clearFilters}
                  >
                    清除所有筛选
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {(results.length > 0 || searching) && (
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center justify-between\">
              <span className=\"flex items-center\">
                {searching ? (
                  <RefreshCwIcon className=\"h-5 w-5 mr-2 animate-spin\" />
                ) : (
                  <TrendingUpIcon className=\"h-5 w-5 mr-2 text-green-600\" />
                )}
                搜索结果
              </span>
              {stats && (
                <div className=\"flex items-center space-x-4 text-sm text-gray-500\">
                  <span>{stats.totalResults} 个结果</span>
                  <span>{formatSearchTime(stats.searchTime)}</span>
                  {stats.embeddingTime && (
                    <span>AI分析: {formatSearchTime(stats.embeddingTime)}</span>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searching ? (
              <div className=\"space-y-4\">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className=\"space-y-2\">
                    <Skeleton className=\"h-6 w-3/4\" />
                    <Skeleton className=\"h-4 w-full\" />
                    <Skeleton className=\"h-4 w-5/6\" />
                  </div>
                ))}
              </div>
            ) : (
              <div className=\"space-y-4\">
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    className=\"p-4 border rounded-lg hover:bg-gray-50 transition-colors\"
                  >
                    <div className=\"flex items-start justify-between mb-2\">
                      <h3 className=\"font-semibold text-lg flex-1 mr-4\">
                        {result.title}
                      </h3>
                      <div className=\"flex items-center space-x-2 text-sm text-gray-500\">
                        {result.similarity && (
                          <span className={getScoreColor(result.similarity, 'similarity')}>
                            {Math.round(result.similarity * 100)}% 匹配
                          </span>
                        )}
                        <Badge variant=\"outline\" className=\"text-xs\">
                          {getSearchTypeLabel(result.searchType)}
                        </Badge>
                      </div>
                    </div>

                    <p className=\"text-gray-600 mb-3 line-clamp-2\">
                      {result.contentSnippet}
                    </p>

                    <div className=\"flex items-center justify-between\">
                      <div className=\"flex items-center space-x-2\">
                        {result.category && (
                          <Badge
                            variant=\"secondary\"
                            style={{
                              backgroundColor: result.category.color + '20',
                              borderColor: result.category.color,
                              color: result.category.color
                            }}
                          >
                            {result.category.name}
                          </Badge>
                        )}
                        {result.tags.map(tag => (
                          <Badge
                            key={tag.id}
                            variant=\"outline\"
                            style={{ borderColor: tag.color }}
                            className=\"text-xs\"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                      <div className=\"flex items-center space-x-2 text-xs text-gray-500\">
                        {result.isFavorite && <StarIcon className=\"h-3 w-3 text-yellow-500\" />}
                        {result.isArchived && <ArchiveIcon className=\"h-3 w-3 text-gray-500\" />}
                        <span>{new Date(result.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {results.length === 0 && !searching && (
                  <div className=\"text-center py-8 text-gray-500\">
                    <SearchIcon className=\"h-12 w-12 mx-auto mb-4 text-gray-300\" />
                    <p className=\"text-lg font-medium mb-2\">未找到相关结果</p>
                    <p className=\"text-sm\">
                      尝试调整搜索关键词或筛选条件
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Tips */}
      {results.length === 0 && !searching && !query && (
        <Card className=\"bg-blue-50 border-blue-200\">
          <CardContent className=\"pt-6\">
            <div className=\"flex items-start space-x-3\">
              <SparklesIcon className=\"h-6 w-6 text-blue-600 mt-1\" />
              <div className=\"space-y-2\">
                <h4 className=\"font-medium text-blue-900\">搜索技巧</h4>
                <ul className=\"text-sm text-blue-700 space-y-1\">
                  <li>• 使用关键词搜索，支持中文和英文</li>
                  <li>• 混合搜索结合了全文搜索和AI语义搜索</li>
                  <li>• 使用筛选器可以精确找到特定分类或标签的笔记</li>
                  <li>• 语义搜索能理解概念关系，即使关键词不完全匹配</li>
                  <li>• 可以按相关性、时间或标题排序结果</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdvancedSearch