/**
 * Tag Cloud Component
 *
 * Interactive tag cloud visualization with size-based frequency display
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  TagIcon,
  SearchIcon,
  FilterIcon,
  SortAscIcon,
  SortDescIcon,
  TrendingUpIcon,
  GridIcon,
  ListIcon,
  XIcon,
  PlusIcon
} from 'lucide-react'

interface TagData {
  name: string
  count: number
  color: string
  category?: string
  description?: string
  createdAt: string
  lastUsed?: string
}

interface TagCloudProps {
  tags: TagData[]
  onTagClick?: (tag: TagData) => void
  onTagEdit?: (tag: TagData) => void
  onTagDelete?: (tag: TagData) => void
  onCreateTag?: () => void
  maxTags?: number
  showSearch?: boolean
  showSortOptions?: boolean
  showViewToggle?: boolean
  className?: string
}

type SortOption = 'name' | 'count' | 'recent' | 'alpha'
type ViewMode = 'cloud' | 'list' | 'grid'

const SORT_OPTIONS = [
  { value: 'count', label: '使用频率', icon: TrendingUpIcon },
  { value: 'name', label: '标签名称', icon: SortAscIcon },
  { value: 'recent', label: '最近使用', icon: SortDescIcon },
  { value: 'alpha', label: '字母顺序', icon: SortAscIcon }
] as const

export default function TagCloud({
  tags,
  onTagClick,
  onTagEdit,
  onTagDelete,
  onCreateTag,
  maxTags = 50,
  showSearch = true,
  showSortOptions = true,
  showViewToggle = true,
  className = ''
}: TagCloudProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('count')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('cloud')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(tags.map(tag => tag.category).filter(Boolean))) as string[]
    return cats.sort()
  }, [tags])

  // Filter and sort tags
  const processedTags = useMemo(() => {
    let filtered = tags

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tag =>
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tag.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(tag => tag.category === selectedCategory)
    }

    // Sort tags
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'count':
          comparison = a.count - b.count
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'recent':
          const aTime = new Date(a.lastUsed || a.createdAt).getTime()
          const bTime = new Date(b.lastUsed || b.createdAt).getTime()
          comparison = aTime - bTime
          break
        case 'alpha':
          comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    // Limit to maxTags
    return filtered.slice(0, maxTags)
  }, [tags, searchTerm, selectedCategory, sortBy, sortOrder, maxTags])

  // Calculate font sizes for cloud view
  const getFontSize = useCallback((count: number, maxCount: number) => {
    const minSize = 12
    const maxSize = 32
    const ratio = count / maxCount
    return minSize + (maxSize - minSize) * ratio
  }, [])

  // Get max count for sizing
  const maxCount = useMemo(() => {
    return Math.max(...processedTags.map(tag => tag.count), 1)
  }, [processedTags])

  // Handle tag click
  const handleTagClick = useCallback((tag: TagData, e: React.MouseEvent) => {
    e.preventDefault()
    onTagClick?.(tag)
  }, [onTagClick])

  // Handle tag edit
  const handleTagEdit = useCallback((tag: TagData, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onTagEdit?.(tag)
  }, [onTagEdit])

  // Handle tag delete
  const handleTagDelete = useCallback((tag: TagData, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`确定要删除标签"${tag.name}"吗？此操作无法撤销。`)) {
      onTagDelete?.(tag)
    }
  }, [onTagDelete])

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  // Clear search
  const clearSearch = () => {
    setSearchTerm('')
  }

  // Clear category filter
  const clearCategoryFilter = () => {
    setSelectedCategory(null)
  }

  return (
    <div className={`tag-cloud ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TagIcon className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">标签云</h2>
            <p className="text-sm text-gray-500">
              共 {tags.length} 个标签，显示 {processedTags.length} 个
            </p>
          </div>
        </div>

        {onCreateTag && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateTag}
            className="flex items-center space-x-1"
          >
            <PlusIcon className="h-4 w-4" />
            <span>新建标签</span>
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4 mb-6">
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Filter and Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          {categories.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={selectedCategory ? "default" : "outline"}
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <FilterIcon className="h-4 w-4" />
                  <span>
                    {selectedCategory ? selectedCategory : '分类筛选'}
                  </span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-48" align="start">
                <DropdownMenuLabel>选择分类</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={clearCategoryFilter}>
                  <span>全部分类</span>
                </DropdownMenuItem>

                {categories.map(category => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <span>{category}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Sort Options */}
          {showSortOptions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  {SORT_OPTIONS.find(opt => opt.value === sortBy)?.icon && (
                    React.createElement(SORT_OPTIONS.find(opt => opt.value === sortBy)!.icon, {
                      className: "h-4 w-4"
                    })
                  )}
                  <span>{SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}</span>
                  <button
                    onClick={toggleSortOrder}
                    className="ml-1 hover:bg-black hover:bg-opacity-10 rounded p-0.5"
                  >
                    {sortOrder === 'asc' ? (
                      <SortAscIcon className="h-3 w-3" />
                    ) : (
                      <SortDescIcon className="h-3 w-3" />
                    )}
                  </button>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start">
                <DropdownMenuLabel>排序方式</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {SORT_OPTIONS.map(option => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <option.icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </div>
                    {sortBy === option.value && (
                      <div className="flex items-center space-x-1">
                        {sortOrder === 'asc' ? (
                          <SortAscIcon className="h-3 w-3" />
                        ) : (
                          <SortDescIcon className="h-3 w-3" />
                        )}
                      </div>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* View Mode Toggle */}
          {showViewToggle && (
            <div className="flex items-center space-x-1 border rounded-md">
              <Button
                variant={viewMode === 'cloud' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cloud')}
                className="h-8 px-3"
              >
                <TagIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-3"
              >
                <ListIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-3"
              >
                <GridIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Active Filters Display */}
        {(searchTerm || selectedCategory) && (
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>搜索: "{searchTerm}"</span>
                <button
                  onClick={clearSearch}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {selectedCategory && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>分类: {selectedCategory}</span>
                <button
                  onClick={clearCategoryFilter}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Tag Display */}
      {processedTags.length === 0 ? (
        <div className="text-center py-12">
          <TagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || selectedCategory ? '没有找到匹配的标签' : '还没有创建标签'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory
              ? '尝试调整筛选条件'
              : '开始创建标签来组织您的笔记'
            }
          </p>
          {(searchTerm || selectedCategory) && (
            <div className="space-x-2">
              {searchTerm && (
                <Button variant="outline" size="sm" onClick={clearSearch}>
                  清除搜索
                </Button>
              )}
              {selectedCategory && (
                <Button variant="outline" size="sm" onClick={clearCategoryFilter}>
                  清除分类筛选
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-[400px]">
          {/* Cloud View */}
          {viewMode === 'cloud' && (
            <div className="flex flex-wrap gap-3 items-center justify-center p-6 bg-gray-50 rounded-lg">
              {processedTags.map(tag => (
                <button
                  key={tag.name}
                  onClick={(e) => handleTagClick(tag, e)}
                  className="relative group hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  style={{
                    fontSize: `${getFontSize(tag.count, maxCount)}px`,
                    color: tag.color,
                    fontWeight: tag.count > 10 ? 600 : tag.count > 5 ? 500 : 400,
                    opacity: 0.8 + (tag.count / maxCount) * 0.2
                  }}
                  title={`${tag.name}: ${tag.count} 个笔记${tag.description ? ` - ${tag.description}` : ''}`}
                >
                  {tag.name}

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    <div className="font-medium">{tag.name}</div>
                    <div>{tag.count} 个笔记</div>
                    {tag.category && (
                      <div className="text-gray-300">{tag.category}</div>
                    )}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>

                  {/* Edit/Delete Actions */}
                  {(onTagEdit || onTagDelete) && (
                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      {onTagEdit && (
                        <button
                          onClick={(e) => handleTagEdit(tag, e)}
                          className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 text-xs"
                          title="编辑标签"
                        >
                          ✏️
                        </button>
                      )}
                      {onTagDelete && (
                        <button
                          onClick={(e) => handleTagDelete(tag, e)}
                          className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 text-xs"
                          title="删除标签"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-2">
              {processedTags.map(tag => (
                <div
                  key={tag.name}
                  onClick={(e) => handleTagClick(tag, e)}
                  className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <div className="font-medium">{tag.name}</div>
                      {tag.description && (
                        <div className="text-sm text-gray-500">{tag.description}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium text-blue-600">{tag.count}</div>
                      <div className="text-xs text-gray-500">笔记</div>
                    </div>

                    {tag.category && (
                      <Badge variant="outline" className="text-xs">
                        {tag.category}
                      </Badge>
                    )}

                    <div className="flex items-center space-x-1">
                      {onTagEdit && (
                        <button
                          onClick={(e) => handleTagEdit(tag, e)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="编辑"
                        >
                          ✏️
                        </button>
                      )}
                      {onTagDelete && (
                        <button
                          onClick={(e) => handleTagDelete(tag, e)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="删除"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {processedTags.map(tag => (
                <div
                  key={tag.name}
                  onClick={(e) => handleTagClick(tag, e)}
                  className="p-4 bg-white border rounded-lg hover:shadow-md cursor-pointer transition-all hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div className="flex items-center space-x-1">
                      {onTagEdit && (
                        <button
                          onClick={(e) => handleTagEdit(tag, e)}
                          className="p-1 hover:bg-gray-100 rounded text-xs"
                          title="编辑"
                        >
                          ✏️
                        </button>
                      )}
                      {onTagDelete && (
                        <button
                          onClick={(e) => handleTagDelete(tag, e)}
                          className="p-1 hover:bg-gray-100 rounded text-xs"
                          title="删除"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="font-medium text-gray-900 mb-1">{tag.name}</div>
                  {tag.description && (
                    <div className="text-sm text-gray-500 mb-2 line-clamp-2">{tag.description}</div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-blue-600">{tag.count}</div>
                    {tag.category && (
                      <Badge variant="outline" className="text-xs">
                        {tag.category}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-gray-400 mt-2">
                    最后使用: {tag.lastUsed ? new Date(tag.lastUsed).toLocaleDateString() : new Date(tag.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Stats */}
      {processedTags.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{processedTags.length}</div>
              <div className="text-sm text-gray-500">显示标签</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {processedTags.reduce((sum, tag) => sum + tag.count, 0)}
              </div>
              <div className="text-sm text-gray-500">关联笔记</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
              <div className="text-sm text-gray-500">标签分类</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {processedTags.length > 0 ? Math.round(processedTags.reduce((sum, tag) => sum + tag.count, 0) / processedTags.length) : 0}
              </div>
              <div className="text-sm text-gray-500">平均使用次数</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}