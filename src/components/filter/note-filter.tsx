/**
 * Note Filter Component
 *
 * Comprehensive filtering component for notes with categories, tags, and search
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  SearchIcon,
  FilterIcon,
  XIcon,
  FolderIcon,
  TagIcon,
  CalendarIcon,
  SortAscIcon,
  SortDescIcon,
  RotateCcwIcon
} from 'lucide-react'
import { Category } from '@/types/note'

export interface FilterOptions {
  search: string
  categoryId: number | null
  tags: string[]
  dateRange: {
    start: Date | null
    end: Date | null
  }
  sortBy: 'createdAt' | 'updatedAt' | 'title' | 'viewCount'
  sortOrder: 'asc' | 'desc'
}

interface NoteFilterProps {
  categories: Category[]
  availableTags: Array<{ name: string; count: number }>
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  onReset: () => void
  className?: string
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'updatedAt', label: '更新时间' },
  { value: 'title', label: '标题' },
  { value: 'viewCount', label: '浏览次数' }
] as const

const DATE_RANGE_OPTIONS = [
  { label: '今天', value: 1 },
  { label: '本周', value: 7 },
  { label: '本月', value: 30 },
  { label: '三个月', value: 90 },
  { label: '全部', value: null }
] as const

export default function NoteFilter({
  categories,
  availableTags,
  filters,
  onFiltersChange,
  onReset,
  className = ''
}: NoteFilterProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ ...filters, search: localSearch })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [localSearch, filters, onFiltersChange])

  // Get selected category name
  const selectedCategory = useMemo(() => {
    if (!filters.categoryId) return null
    return categories.find(cat => cat.id === filters.categoryId)
  }, [filters.categoryId, categories])

  // Get selected tag details
  const selectedTagDetails = useMemo(() => {
    return filters.tags.map(tagName => {
      const tag = availableTags.find(t => t.name === tagName)
      return {
        name: tagName,
        count: tag?.count || 0
      }
    })
  }, [filters.tags, availableTags])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.categoryId) count++
    if (filters.tags.length > 0) count++
    if (filters.dateRange.start || filters.dateRange.end) count++
    if (filters.sortBy !== 'updatedAt' || filters.sortOrder !== 'desc') count++
    return count
  }, [filters])

  // Handle category change
  const handleCategoryChange = (categoryId: number | null) => {
    onFiltersChange({ ...filters, categoryId })
  }

  // Handle tag toggle
  const handleTagToggle = (tagName: string) => {
    const newTags = filters.tags.includes(tagName)
      ? filters.tags.filter(t => t !== tagName)
      : [...filters.tags, tagName]
    onFiltersChange({ ...filters, tags: newTags })
  }

  // Handle sort change
  const handleSortChange = (sortBy: typeof filters.sortBy) => {
    // Toggle order if same sort field, otherwise default to desc
    const sortOrder = sortBy === filters.sortBy
      ? (filters.sortOrder === 'desc' ? 'asc' : 'desc')
      : 'desc'
    onFiltersChange({ ...filters, sortBy, sortOrder })
  }

  // Handle date range preset
  const handleDateRangePreset = (days: number | null) => {
    if (days === null) {
      onFiltersChange({
        ...filters,
        dateRange: { start: null, end: null }
      })
    } else {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - days)
      onFiltersChange({
        ...filters,
        dateRange: { start, end }
      })
    }
  }

  // Remove single filter
  const removeFilter = (type: keyof FilterOptions, value?: any) => {
    switch (type) {
      case 'search':
        setLocalSearch('')
        onFiltersChange({ ...filters, search: '' })
        break
      case 'categoryId':
        onFiltersChange({ ...filters, categoryId: null })
        break
      case 'tags':
        const newTags = filters.tags.filter((t: string) => t !== value)
        onFiltersChange({ ...filters, tags: newTags })
        break
      case 'dateRange':
        onFiltersChange({ ...filters, dateRange: { start: null, end: null } })
        break
    }
  }

  // Get sort option label
  const getSortOptionLabel = (value: string) => {
    return SORT_OPTIONS.find(opt => opt.value === value)?.label || value
  }

  return (
    <div className={`note-filter bg-white border rounded-lg p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FilterIcon className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">筛选条件</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} 个筛选条件
            </Badge>
          )}
        </div>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-gray-500 hover:text-gray-700"
          >
            <RotateCcwIcon className="h-4 w-4 mr-1" />
            重置
          </Button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="搜索笔记标题或内容..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap gap-2">
        {/* Category Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filters.categoryId ? "default" : "outline"}
              size="sm"
              className="flex items-center space-x-1"
            >
              <FolderIcon className="h-4 w-4" />
              <span>
                {selectedCategory ? selectedCategory.name : '选择分类'}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuLabel>选择分类</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => handleCategoryChange(null)}>
              <span>全部分类</span>
            </DropdownMenuItem>

            {categories.map(category => (
              <DropdownMenuItem
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
                {category._count && (
                  <Badge variant="secondary" className="text-xs">
                    {category._count.notes}
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tags Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filters.tags.length > 0 ? "default" : "outline"}
              size="sm"
              className="flex items-center space-x-1"
            >
              <TagIcon className="h-4 w-4" />
              <span>
                {filters.tags.length > 0
                  ? `${filters.tags.length} 个标签`
                  : '选择标签'
                }
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-64 max-h-80" align="start">
            <DropdownMenuLabel>选择标签</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <div className="max-h-60 overflow-y-auto">
              {availableTags.length === 0 ? (
                <div className="p-2 text-sm text-gray-500 text-center">
                  暂无可用标签
                </div>
              ) : (
                availableTags.map(tag => (
                  <DropdownMenuCheckboxItem
                    key={tag.name}
                    checked={filters.tags.includes(tag.name)}
                    onCheckedChange={() => handleTagToggle(tag.name)}
                    className="flex items-center justify-between py-2"
                  >
                    <span>{tag.name}</span>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {tag.count}
                    </Badge>
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Range Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filters.dateRange.start || filters.dateRange.end ? "default" : "outline"}
              size="sm"
              className="flex items-center space-x-1"
            >
              <CalendarIcon className="h-4 w-4" />
              <span>时间范围</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            <DropdownMenuLabel>选择时间范围</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {DATE_RANGE_OPTIONS.map(option => (
              <DropdownMenuItem
                key={option.label}
                onClick={() => handleDateRangePreset(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              {filters.sortOrder === 'asc' ? (
                <SortAscIcon className="h-4 w-4" />
              ) : (
                <SortDescIcon className="h-4 w-4" />
              )}
              <span>{getSortOptionLabel(filters.sortBy)}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            <DropdownMenuLabel>排序方式</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {SORT_OPTIONS.map(option => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleSortChange(option.value as typeof filters.sortBy)}
                className="flex items-center justify-between"
              >
                <span>{option.label}</span>
                {filters.sortBy === option.value && (
                  <div className="flex items-center space-x-1">
                    {filters.sortOrder === 'asc' ? (
                      <SortAscIcon className="h-4 w-4" />
                    ) : (
                      <SortDescIcon className="h-4 w-4" />
                    )}
                  </div>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="space-y-2">
          <Separator />
          <div className="flex flex-wrap gap-2">
            {/* Search filter */}
            {filters.search && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>"{filters.search}"</span>
                <button
                  onClick={() => removeFilter('search')}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Category filter */}
            {selectedCategory && (
              <Badge
                variant="secondary"
                className="flex items-center space-x-1"
                style={{
                  backgroundColor: selectedCategory.color + '20',
                  borderColor: selectedCategory.color,
                  color: selectedCategory.color
                }}
              >
                <FolderIcon className="h-3 w-3" />
                <span>{selectedCategory.name}</span>
                <button
                  onClick={() => removeFilter('categoryId')}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Tags filters */}
            {selectedTagDetails.map(tag => (
              <Badge key={tag.name} variant="secondary" className="flex items-center space-x-1">
                <TagIcon className="h-3 w-3" />
                <span>{tag.name}</span>
                <button
                  onClick={() => removeFilter('tags', tag.name)}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {/* Date range filter */}
            {(filters.dateRange.start || filters.dateRange.end) && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <CalendarIcon className="h-3 w-3" />
                <span>
                  {filters.dateRange.start && filters.dateRange.end
                    ? `${filters.dateRange.start.toLocaleDateString()} - ${filters.dateRange.end.toLocaleDateString()}`
                    : '自定义时间'
                  }
                </span>
                <button
                  onClick={() => removeFilter('dateRange')}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}