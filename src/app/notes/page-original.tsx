/**
 * T028 [US1] Create notes list page in src/app/notes/page.tsx
 *
 * Main notes listing page with search, filtering, pagination,
 * and bulk operations functionality.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  SortAscIcon,
  SortDescIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import NoteCard from '@/components/notes/note-card';
import noteServiceClient from '@/lib/services/note-service-client';
import { useAuth } from '@/hooks/use-auth';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isArchived: boolean;
  category?: {
    id: number;
    name: string;
    color: string;
  } | null;
  tags?: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  viewCount?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FilterOptions {
  search: string;
  categoryId: number | null;
  tagIds: number[];
  isFavorite: boolean | null;
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'asc' | 'desc';
  category: string | null;
}

const DEFAULT_LIMIT = 12;
const LIMIT_OPTIONS = [12, 24, 48, 96];

export default function NotesPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: number; name: string; color: string }>
  >([]);
  const [tags, setTags] = useState<
    Array<{ id: number; name: string; color: string }>
  >([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('categoryId')
      ? parseInt(searchParams.get('categoryId')!)
      : null,
    tagIds: searchParams.get('tagIds')
      ? searchParams.get('tagIds')!.split(',').map(Number).filter(Boolean)
      : [],
    isFavorite: searchParams.get('isFavorite')
      ? searchParams.get('isFavorite') === 'true'
      : null,
    sortBy:
      (searchParams.get('sortBy') as FilterOptions['sortBy']) || 'updatedAt',
    sortOrder:
      (searchParams.get('sortOrder') as FilterOptions['sortOrder']) || 'desc',
    category: searchParams.get('category') || null,
  });

  // Update URL with current filters
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();

    if (filters.search) params.set('search', filters.search);
    if (filters.categoryId)
      params.set('categoryId', filters.categoryId.toString());
    if (filters.tagIds.length > 0)
      params.set('tagIds', filters.tagIds.join(','));
    if (filters.isFavorite !== null)
      params.set('isFavorite', filters.isFavorite.toString());
    if (filters.sortBy !== 'updatedAt') params.set('sortBy', filters.sortBy);
    if (filters.sortOrder !== 'desc')
      params.set('sortOrder', filters.sortOrder);
    if (pagination.page > 1) params.set('page', pagination.page.toString());
    if (pagination.limit !== DEFAULT_LIMIT)
      params.set('limit', pagination.limit.toString());
    if (showArchived) params.set('archived', 'true');

    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newURL);
  }, [filters, pagination, showArchived]);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const result = await noteServiceClient.getNotes({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        tags:
          filters.tagIds.length > 0
            ? filters.tagIds.map(id => `tag-${id}`)
            : undefined,
        isFavorite: filters.isFavorite || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      // Filter archived notes if not showing archived
      const filteredNotes = showArchived
        ? result.notes
        : result.notes.filter(note => !note.isArchived);

      setNotes(filteredNotes);
      setPagination({
        ...pagination,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      });
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, pagination, filters, showArchived]);

  // Fetch categories and tags
  const fetchMetadata = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Fetch categories (mock data for now)
      const mockCategories = [
        { id: 1, name: '工作', color: '#3B82F6' },
        { id: 2, name: '学习', color: '#10B981' },
        { id: 3, name: '生活', color: '#F59E0B' },
        { id: 4, name: '项目', color: '#8B5CF6' },
      ];
      setCategories(mockCategories);

      // Fetch tags (mock data for now)
      const mockTags = [
        { id: 1, name: '重要', color: '#EF4444' },
        { id: 2, name: '紧急', color: '#F59E0B' },
        { id: 3, name: '想法', color: '#8B5CF6' },
        { id: 4, name: '资料', color: '#10B981' },
        { id: 5, name: '待办', color: '#6B7280' },
      ];
      setTags(mockTags);
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    }
  }, [isAuthenticated]);

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotes();
      fetchMetadata();
    }
  }, [isAuthenticated, fetchNotes, fetchMetadata]);

  // Fetch notes when filters or pagination change
  useEffect(() => {
    fetchNotes();
    updateURL();
  }, [fetchNotes, updateURL]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback(
    (key: keyof FilterOptions, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }));
      setPagination(prev => ({ ...prev, page: 1 }));
    },
    [],
  );

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  }, []);

  // Handle note selection
  const handleNoteSelect = useCallback((noteId: string, selected: boolean) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(noteId);
      } else {
        newSet.delete(noteId);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedNotes.size === notes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(notes.map(note => note.id)));
    }
  }, [notes, selectedNotes]);

  // Handle bulk actions
  const handleBulkArchive = useCallback(async () => {
    if (selectedNotes.size === 0) return;

    const shouldArchive = !showArchived;
    const action = shouldArchive ? '归档' : '恢复';

    if (
      !window.confirm(`确定要${action}选中的 ${selectedNotes.size} 个笔记吗？`)
    ) {
      return;
    }

    setLoading(true);
    try {
      // Mock bulk action - in real implementation, this would call the API
      console.log(`Bulk ${action} ${Array.from(selectedNotes).join(', ')}`);

      // Update UI state
      setNotes(prev =>
        prev.map(note =>
          selectedNotes.has(note.id)
            ? { ...note, isArchived: shouldArchive }
            : note,
        ),
      );
      setSelectedNotes(new Set());
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedNotes, showArchived]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedNotes.size === 0) return;

    if (
      !window.confirm(
        `确定要删除选中的 ${selectedNotes.size} 个笔记吗？此操作无法撤销。`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      // Mock bulk delete - in real implementation, this would call the API
      console.log(`Bulk delete ${Array.from(selectedNotes).join(', ')}`);

      // Update UI state
      setNotes(prev => prev.filter(note => !selectedNotes.has(note.id)));
      setSelectedNotes(new Set());
    } catch (error) {
      console.error('Failed to perform bulk delete:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedNotes]);

  if (!isAuthenticated) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Card className='w-96'>
          <CardContent className='text-center p-6'>
            <h2 className='text-2xl font-bold mb-4'>请先登录</h2>
            <p className='text-gray-600 mb-4'>登录后才能查看和管理笔记</p>
            <Button onClick={() => router.push('/auth/signin')}>登录</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8 max-w-7xl'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>
              {showArchived ? '已归档的笔记' : '我的笔记'}
            </h1>
            <p className='text-gray-600 mt-1'>
              共 {pagination.total} 篇笔记
              {showArchived && (
                <Badge variant='secondary' className='ml-2'>
                  已归档
                </Badge>
              )}
            </p>
          </div>

          <div className='flex items-center gap-4'>
            <Button
              onClick={() => router.push('/notes/new')}
              className='flex items-center gap-2'
            >
              <PlusIcon className='h-4 w-4' />
              新建笔记
            </Button>

            <Button
              variant='outline'
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? '显示活跃笔记' : '显示归档笔记'}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className='bg-white rounded-lg shadow-sm border p-4 mb-6'>
          <div className='flex flex-col lg:flex-row gap-4'>
            {/* Search */}
            <div className='flex-1'>
              <div className='relative'>
                <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                <Input
                  placeholder='搜索笔记...'
                  value={filters.search}
                  onChange={e => handleSearch(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select
              value={filters.categoryId?.toString() || ''}
              onValueChange={value =>
                handleFilterChange('categoryId', value ? parseInt(value) : null)
              }
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='分类' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>所有分类</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tag Filter */}
            <Select
              value={filters.tagIds.join(',')}
              onValueChange={value =>
                handleFilterChange(
                  'tagIds',
                  value ? value.split(',').map(Number).filter(Boolean) : [],
                )
              }
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='标签' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>所有标签</SelectItem>
                {tags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id.toString()}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={filters.isFavorite?.toString() || ''}
              onValueChange={value =>
                handleFilterChange(
                  'isFavorite',
                  value === 'true' ? true : value === 'false' ? false : null,
                )
              }
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='状态' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>所有状态</SelectItem>
                <SelectItem value='true'>收藏</SelectItem>
                <SelectItem value='false'>未收藏</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <div className='flex items-center gap-2'>
              <Select
                value={filters.sortBy}
                onValueChange={value =>
                  handleFilterChange('sortBy', value as FilterOptions['sortBy'])
                }
              >
                <SelectTrigger className='w-32'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='updatedAt'>最近更新</SelectItem>
                  <SelectItem value='createdAt'>创建时间</SelectItem>
                  <SelectItem value='title'>标题</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  handleFilterChange(
                    'sortOrder',
                    filters.sortOrder === 'desc' ? 'asc' : 'desc',
                  )
                }
              >
                {filters.sortOrder === 'desc' ? (
                  <SortDescIcon className='h-4 w-4' />
                ) : (
                  <SortAscIcon className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedNotes.size > 0 && (
            <div className='flex items-center gap-2 pt-4 border-t border-gray-200'>
              <Checkbox
                checked={selectedNotes.size === notes.length}
                onCheckedChange={handleSelectAll}
                disabled={loading}
              />
              <span className='text-sm text-gray-600'>
                已选择 {selectedNotes.size} 个
              </span>
              <div className='flex items-center gap-2 ml-4'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleBulkArchive}
                  disabled={loading}
                >
                  {showArchived ? '恢复' : '归档'}
                </Button>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={handleBulkDelete}
                  disabled={loading}
                >
                  删除
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
        {loading ? (
          // Loading skeleton
          Array.from({ length: pagination.limit }).map((_, index) => (
            <Card key={index} className='animate-pulse'>
              <CardHeader className='pb-4'>
                <div className='h-6 bg-gray-200 rounded w-3/4'></div>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='space-y-2'>
                  <div className='h-4 bg-gray-200 rounded'></div>
                  <div className='h-4 bg-gray-200 rounded w-5/6'></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : notes.length > 0 ? (
          notes.map(note => (
            <div
              key={note.id}
              className={
                selectedNotes.has(note.id)
                  ? 'ring-2 ring-blue-500 rounded-lg'
                  : ''
              }
            >
              <Checkbox
                checked={selectedNotes.has(note.id)}
                onCheckedChange={checked => handleNoteSelect(note.id, checked)}
                className='absolute top-2 left-2 z-10'
              />
              <NoteCard
                note={note}
                onEdit={noteId => router.push(`/notes/${noteId}/edit`)}
                onDelete={(noteId, permanent) => {
                  // Mock delete - in real implementation, this would call the API
                  console.log(`Delete note ${noteId}, permanent: ${permanent}`);
                }}
                onArchive={noteId => {
                  // Mock archive - in real implementation, this would call the API
                  console.log(`Archive note ${noteId}`);
                }}
                onToggleFavorite={noteId => {
                  // Mock toggle favorite - in real implementation, this would call the API
                  console.log(`Toggle favorite for note ${noteId}`);
                }}
                onDuplicate={noteId => {
                  // Mock duplicate - in real implementation, this would call the API
                  console.log(`Duplicate note ${noteId}`);
                }}
              />
            </div>
          ))
        ) : (
          <div className='col-span-full text-center py-12'>
            <div className='text-gray-400 mb-4'>
              <FilterIcon className='h-12 w-12 mx-auto' />
            </div>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              {filters.search || filters.categoryId || filters.tagIds.length > 0
                ? '没有找到匹配的笔记'
                : showArchived
                  ? '没有归档的笔记'
                  : '还没有笔记'}
            </h3>
            <p className='text-gray-500 mb-4'>
              {filters.search || filters.categoryId || filters.tagIds.length > 0
                ? '尝试调整搜索条件'
                : '创建你的第一个笔记吧'}
            </p>
            {!filters.search &&
              !filters.categoryId &&
              filters.tagIds.length === 0 && (
                <Button onClick={() => router.push('/notes/new')}>
                  <PlusIcon className='h-4 w-4 mr-2' />
                  新建笔记
                </Button>
              )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {notes.length > 0 && pagination.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-8'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            上一页
          </Button>

          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-600'>
              第 {pagination.page} 页，共 {pagination.totalPages} 页
            </span>
            <Select
              value={pagination.limit.toString()}
              onValueChange={value => handleLimitChange(parseInt(value))}
            >
              {LIMIT_OPTIONS.map(limit => (
                <SelectItem key={limit} value={limit.toString()}>
                  每页 {limit} 条
                </SelectItem>
              ))}
            </Select>
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
