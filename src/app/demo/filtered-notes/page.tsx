/**
 * Filtered Notes Demo Page
 *
 * Demonstrates the comprehensive note filtering and pagination system
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import NoteFilter from '@/components/filter/note-filter'
import NoteCard from '@/components/note/note-card'
import Pagination from '@/components/pagination/pagination'
import { useNoteFilter } from '@/hooks/use-note-filter'
import { NoteWithRelations } from '@/types/note'
import {
  BookOpenIcon,
  FilterIcon,
  RefreshCwIcon,
  PlusIcon,
  SearchIcon,
  GridIcon,
  ListIcon,
  FolderOpenIcon,
  TagIcon,
  AlertCircleIcon
} from 'lucide-react'
import { toast } from 'sonner'

export default function FilteredNotesDemoPage() {
  const [pageSize, setPageSize] = useState(12)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Use note filter hook
  const {
    notes,
    categories,
    availableTags,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    filters,
    activeFilterCount,
    setFilters,
    resetFilters,
    refreshData,
    loadNextPage,
    loadPreviousPage,
    goToPage,
    clearError
  } = useNoteFilter({
    pageSize,
    autoRefresh: true
  })

  // Handle note actions
  const handleNoteView = (note: NoteWithRelations) => {
    toast.success(`查看笔记: ${note.title}`)
    // In a real app, navigate to note detail page
  }

  const handleNoteEdit = (note: NoteWithRelations) => {
    toast.info(`编辑笔记: ${note.title}`)
    // In a real app, navigate to edit page
  }

  const handleNoteDelete = (note: NoteWithRelations) => {
    // In a real app, show confirmation dialog and delete
    if (confirm(`确定要删除笔记"${note.title}"吗？`)) {
      toast.success(`已删除笔记: ${note.title}`)
      refreshData()
    }
  }

  const handleCreateNew = () => {
    toast.info('创建新笔记')
    // In a real app, navigate to create page
  }

  // Get filter summary
  const getFilterSummary = () => {
    const parts = []
    if (filters.search) parts.push(`搜索: "${filters.search}"`)
    if (filters.categoryId) {
      const category = categories.find(c => c.id === filters.categoryId)
      if (category) parts.push(`分类: ${category.name}`)
    }
    if (filters.tags.length > 0) parts.push(`标签: ${filters.tags.join(', ')}`)
    if (filters.dateRange.start || filters.dateRange.end) {
      parts.push('时间范围')
    }
    return parts.join(' | ')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <BookOpenIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  笔记筛选系统演示
                </h1>
                <p className="text-sm text-gray-500">
                  强大的分类、标签和搜索筛选功能
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isLoading}
                className="flex items-center space-x-1"
              >
                <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>刷新</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNew}
                className="flex items-center space-x-1"
              >
                <PlusIcon className="h-4 w-4" />
                <span>新建笔记</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-900">
                总笔记数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totalCount}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                所有可见笔记
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-900">
                分类数量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {categories.length}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                已创建分类
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-900">
                标签数量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {availableTags.length}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                已使用标签
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-900">
                活跃筛选
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {activeFilterCount}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                当前筛选条件
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <div className="mb-6">
          <NoteFilter
            categories={categories}
            availableTags={availableTags}
            filters={filters}
            onFiltersChange={setFilters}
            onReset={resetFilters}
          />
        </div>

        {/* Results Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FilterIcon className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-medium text-gray-900">
                  筛选结果
                </h2>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount} 个筛选条件
                  </Badge>
                )}
              </div>

              {activeFilterCount > 0 && (
                <div className="text-sm text-gray-600">
                  {getFilterSummary()}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <span>视图:</span>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <GridIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <ListIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircleIcon className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="flex items-center justify-between">
                <span>加载笔记失败: {error.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="text-red-800 hover:text-red-900"
                >
                  关闭
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && notes.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">正在加载笔记...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && notes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <SearchIcon className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              没有找到匹配的笔记
            </h3>
            <p className="text-gray-600 mb-4">
              {activeFilterCount > 0
                ? '尝试调整筛选条件或创建新笔记'
                : '开始创建您的第一个笔记'
              }
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={resetFilters}>
                清除筛选条件
              </Button>
            )}
          </div>
        )}

        {/* Notes Grid/List */}
        {notes.length > 0 && (
          <div className="space-y-6">
            {/* Results Count */}
            <div className="text-sm text-gray-600">
              显示 {notes.length} 条笔记，共 {totalCount} 条
            </div>

            {/* Notes Display */}
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {notes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onView={handleNoteView}
                  onEdit={handleNoteEdit}
                  onDelete={handleNoteDelete}
                  showActions={true}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="pt-6 border-t">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={goToPage}
                onPageSizeChange={setPageSize}
                showPageSizeSelector={true}
                showTotalCount={true}
              />
            </div>
          </div>
        )}

        {/* Category and Tag Summary */}
        {categories.length > 0 || availableTags.length > 0 ? (
          <div className="mt-12 space-y-6">
            <Separator />

            {/* Categories Summary */}
            {categories.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <FolderOpenIcon className="h-5 w-5" />
                  <span>分类概览</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <Badge
                      key={category.id}
                      variant="outline"
                      className="flex items-center space-x-1"
                      style={{
                        borderColor: category.color + '40',
                        color: category.color
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                      {category._count && (
                        <span className="text-xs opacity-75">
                          ({category._count.notes})
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Summary */}
            {availableTags.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <TagIcon className="h-5 w-5" />
                  <span>标签概览</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableTags.slice(0, 20).map(tag => (
                    <Badge
                      key={tag.name}
                      variant="secondary"
                      className="flex items-center space-x-1"
                    >
                      <span>{tag.name}</span>
                      <span className="text-xs opacity-75">({tag.count})</span>
                    </Badge>
                  ))}
                  {availableTags.length > 20 && (
                    <Badge variant="outline" className="text-xs">
                      +{availableTags.length - 20} 个更多标签
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}