/**
 * 笔记列表组件
 *
 * 支持多种视图模式、筛选、排序和批量操作
 */

'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Filter,
  Grid,
  List,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Archive,
  Share,
  Tag,
  Calendar,
  TrendingUp,
  Clock,
  Zap,
  ChevronDown,
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  snippet?: string;
  categoryId?: number;
  category?: Category;
  tags: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isPublic: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  aiProcessed: boolean;
  aiSummary?: string;
  aiKeywords?: string[];
}

interface NoteListProps {
  notes: Note[];
  categories: Category[];
  loading?: boolean;
  onNoteClick?: (note: Note) => void;
  onNoteEdit?: (note: Note) => void;
  onNoteDelete?: (noteId: string) => void;
  onNoteArchive?: (noteId: string) => void;
  onNoteShare?: (noteId: string) => void;
  onNoteSelect?: (noteIds: string[]) => void;
  onSearch?: (query: string) => void;
  onFilter?: (filters: NoteFilters) => void;
  onSort?: (sort: SortOption) => void;
  selectedNotes?: string[];
  className?: string;
}

interface NoteFilters {
  status?: string[];
  categoryIds?: number[];
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

interface SortOption {
  field: 'createdAt' | 'updatedAt' | 'title' | 'viewCount';
  order: 'asc' | 'desc';
}

type ViewMode = 'grid' | 'list';

export function NoteList({
  notes,
  categories,
  loading = false,
  onNoteClick,
  onNoteEdit,
  onNoteDelete,
  onNoteArchive,
  onNoteShare,
  onNoteSelect,
  onSearch,
  onFilter,
  onSort,
  selectedNotes = [],
  className,
}: NoteListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<NoteFilters>({});
  const [sort, setSort] = useState<SortOption>({
    field: 'updatedAt',
    order: 'desc',
  });
  const [selectedNoteIds, setSelectedNoteIds] =
    useState<string[]>(selectedNotes);
  const [showFilters, setShowFilters] = useState(false);

  // 防抖搜索
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        onSearch?.(query);
      }, 300),
    [onSearch],
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    onFilter?.(filters);
  }, [filters, onFilter]);

  useEffect(() => {
    onSort?.(sort);
  }, [sort, onSort]);

  useEffect(() => {
    onNoteSelect?.(selectedNoteIds);
  }, [selectedNoteIds, onNoteSelect]);

  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // 处理笔记选择
  const handleNoteSelect = (noteId: string, checked: boolean) => {
    setSelectedNoteIds(prev =>
      checked ? [...prev, noteId] : prev.filter(id => id !== noteId),
    );
  };

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    setSelectedNoteIds(checked ? notes.map(note => note.id) : []);
  };

  // 批量操作
  const handleBatchAction = async (
    action: 'delete' | 'archive' | 'publish' | 'draft',
  ) => {
    if (selectedNoteIds.length === 0) {
      return;
    }

    switch (action) {
    case 'delete':
      selectedNoteIds.forEach(id => onNoteDelete?.(id));
      break;
    case 'archive':
      selectedNoteIds.forEach(id => onNoteArchive?.(id));
      break;
      // TODO: 实现其他批量操作
    }
  };

  // 格式化时间
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
    return date.toLocaleDateString();
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
    case 'PUBLISHED':
      return '已发布';
    case 'ARCHIVED':
      return '已归档';
    default:
      return '草稿';
    }
  };

  // 网格视图卡片
  const NoteCard = ({ note }: { note: Note }) => (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
        selectedNoteIds.includes(note.id) ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onNoteClick?.(note)}
    >
      <CardHeader className='pb-2'>
        <div className='flex items-start justify-between'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center space-x-2 mb-2'>
              <h3 className='font-semibold text-lg truncate'>{note.title}</h3>
              {note.aiProcessed && <Zap className='w-4 h-4 text-blue-500' />}
            </div>
            <div className='flex items-center space-x-2'>
              <Badge className={getStatusColor(note.status)}>
                {getStatusText(note.status)}
              </Badge>
              {note.category && (
                <Badge
                  variant='outline'
                  style={{
                    borderColor: note.category.color,
                    color: note.category.color,
                  }}
                >
                  {note.category.name}
                </Badge>
              )}
            </div>
          </div>
          <Checkbox
            checked={selectedNoteIds.includes(note.id)}
            onCheckedChange={checked =>
              handleNoteSelect(note.id, checked as boolean)
            }
            onClick={e => e.stopPropagation()}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {/* 内容预览 */}
          <p className='text-sm text-muted-foreground line-clamp-3'>
            {note.snippet || note.content.substring(0, 150) + '...'}
          </p>

          {/* AI摘要 */}
          {note.aiSummary && (
            <div className='bg-blue-50 p-2 rounded text-xs text-blue-700'>
              <strong>AI摘要:</strong> {note.aiSummary}
            </div>
          )}

          {/* 标签 */}
          {note.tags.length > 0 && (
            <div className='flex flex-wrap gap-1'>
              {note.tags.slice(0, 3).map(tag => (
                <Badge
                  key={tag.id}
                  variant='secondary'
                  className='text-xs'
                  style={{
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                    borderColor: tag.color,
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
              {note.tags.length > 3 && (
                <Badge variant='secondary' className='text-xs'>
                  +{note.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* 底部信息 */}
          <div className='flex items-center justify-between text-xs text-muted-foreground'>
            <div className='flex items-center space-x-3'>
              <div className='flex items-center space-x-1'>
                <Calendar className='w-3 h-3' />
                <span>{formatDate(note.createdAt)}</span>
              </div>
              <div className='flex items-center space-x-1'>
                <Eye className='w-3 h-3' />
                <span>{note.viewCount}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 p-0'
                  onClick={e => e.stopPropagation()}
                >
                  <MoreHorizontal className='w-3 h-3' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onNoteClick?.(note);
                  }}
                >
                  <Eye className='w-4 h-4 mr-2' />
                  查看
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onNoteEdit?.(note);
                  }}
                >
                  <Edit className='w-4 h-4 mr-2' />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onNoteShare?.(note.id);
                  }}
                >
                  <Share className='w-4 h-4 mr-2' />
                  分享
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onNoteArchive?.(note.id);
                  }}
                >
                  <Archive className='w-4 h-4 mr-2' />
                  归档
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onNoteDelete?.(note.id);
                  }}
                  className='text-red-600'
                >
                  <Trash2 className='w-4 h-4 mr-2' />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 列表视图行
  const NoteRow = ({ note }: { note: Note }) => (
    <div
      className={`border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
        selectedNoteIds.includes(note.id) ? 'bg-muted border-primary' : ''
      }`}
      onClick={() => onNoteClick?.(note)}
    >
      <div className='flex items-center space-x-4'>
        <Checkbox
          checked={selectedNoteIds.includes(note.id)}
          onCheckedChange={checked =>
            handleNoteSelect(note.id, checked as boolean)
          }
          onClick={e => e.stopPropagation()}
        />

        <div className='flex-1 min-w-0'>
          <div className='flex items-center space-x-3 mb-2'>
            <h3 className='font-semibold truncate'>{note.title}</h3>
            {note.aiProcessed && <Zap className='w-4 h-4 text-blue-500' />}
            <Badge className={getStatusColor(note.status)}>
              {getStatusText(note.status)}
            </Badge>
            {note.category && (
              <Badge
                variant='outline'
                style={{
                  borderColor: note.category.color,
                  color: note.category.color,
                }}
              >
                {note.category.name}
              </Badge>
            )}
          </div>

          <p className='text-sm text-muted-foreground line-clamp-2 mb-2'>
            {note.snippet || note.content.substring(0, 200) + '...'}
          </p>

          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              {note.tags.length > 0 && (
                <div className='flex items-center space-x-1'>
                  <Tag className='w-3 h-3' />
                  <div className='flex gap-1'>
                    {note.tags.slice(0, 2).map(tag => (
                      <Badge
                        key={tag.id}
                        variant='secondary'
                        className='text-xs'
                        style={{
                          backgroundColor: tag.color + '20',
                          color: tag.color,
                          borderColor: tag.color,
                        }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                    {note.tags.length > 2 && (
                      <span className='text-xs text-muted-foreground'>
                        +{note.tags.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className='flex items-center space-x-3 text-xs text-muted-foreground'>
                <div className='flex items-center space-x-1'>
                  <Calendar className='w-3 h-3' />
                  <span>{formatDate(note.createdAt)}</span>
                </div>
                <div className='flex items-center space-x-1'>
                  <Eye className='w-3 h-3' />
                  <span>{note.viewCount}</span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={e => e.stopPropagation()}
                >
                  <MoreHorizontal className='w-4 h-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onNoteClick?.(note);
                  }}
                >
                  <Eye className='w-4 h-4 mr-2' />
                  查看
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onNoteEdit?.(note);
                  }}
                >
                  <Edit className='w-4 h-4 mr-2' />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onNoteDelete?.(note.id);
                  }}
                  className='text-red-600'
                >
                  <Trash2 className='w-4 h-4 mr-2' />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 工具栏 */}
      <div className='flex flex-col space-y-4'>
        {/* 搜索和筛选栏 */}
        <div className='flex flex-col sm:flex-row gap-4'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4' />
            <Input
              placeholder='搜索笔记...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>

          <div className='flex items-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className='w-4 h-4 mr-2' />
              筛选
              {Object.keys(filters).length > 0 && (
                <Badge variant='secondary' className='ml-1'>
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>

            <Select
              value={sort.field}
              onValueChange={value => setSort({ ...sort, field: value as any })}
            >
              <SelectTrigger className='w-[120px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='updatedAt'>更新时间</SelectItem>
                <SelectItem value='createdAt'>创建时间</SelectItem>
                <SelectItem value='title'>标题</SelectItem>
                <SelectItem value='viewCount'>浏览量</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sort.order}
              onValueChange={value => setSort({ ...sort, order: value as any })}
            >
              <SelectTrigger className='w-[80px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='desc'>降序</SelectItem>
                <SelectItem value='asc'>升序</SelectItem>
              </SelectContent>
            </Select>

            <div className='flex items-center border rounded-md'>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('grid')}
                className='rounded-r-none'
              >
                <Grid className='w-4 h-4' />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('list')}
                className='rounded-l-none'
              >
                <List className='w-4 h-4' />
              </Button>
            </div>
          </div>
        </div>

        {/* 筛选面板 */}
        {showFilters && (
          <Card>
            <CardContent className='pt-6'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {/* 状态筛选 */}
                <div>
                  <label className='text-sm font-medium mb-2 block'>状态</label>
                  <div className='space-y-2'>
                    {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map(status => (
                      <div key={status} className='flex items-center space-x-2'>
                        <Checkbox
                          id={`status-${status}`}
                          checked={filters.status?.includes(status) || false}
                          onCheckedChange={checked => {
                            setFilters(prev => ({
                              ...prev,
                              status: checked
                                ? [...(prev.status || []), status]
                                : prev.status?.filter(s => s !== status) || [],
                            }));
                          }}
                        />
                        <label htmlFor={`status-${status}`} className='text-sm'>
                          {getStatusText(status)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 分类筛选 */}
                <div>
                  <label className='text-sm font-medium mb-2 block'>分类</label>
                  <div className='space-y-2 max-h-32 overflow-y-auto'>
                    {categories.map(category => (
                      <div
                        key={category.id}
                        className='flex items-center space-x-2'
                      >
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={
                            filters.categoryIds?.includes(category.id) || false
                          }
                          onCheckedChange={checked => {
                            setFilters(prev => ({
                              ...prev,
                              categoryIds: checked
                                ? [...(prev.categoryIds || []), category.id]
                                : prev.categoryIds?.filter(
                                  id => id !== category.id,
                                ) || [],
                            }));
                          }}
                        />
                        <label
                          htmlFor={`category-${category.id}`}
                          className='text-sm flex items-center space-x-2'
                        >
                          <div
                            className='w-3 h-3 rounded-full'
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 标签筛选 */}
                <div>
                  <label className='text-sm font-medium mb-2 block'>标签</label>
                  <div className='space-y-2'>
                    {/* TODO: 实现标签筛选 */}
                    <p className='text-sm text-muted-foreground'>
                      标签筛选功能开发中...
                    </p>
                  </div>
                </div>
              </div>

              <div className='flex justify-end mt-4 space-x-2'>
                <Button variant='outline' onClick={() => setFilters({})}>
                  清除筛选
                </Button>
                <Button onClick={() => setShowFilters(false)}>应用筛选</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 批量操作栏 */}
        {selectedNoteIds.length > 0 && (
          <Card className='border-primary'>
            <CardContent className='pt-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-4'>
                  <Checkbox
                    checked={selectedNoteIds.length === notes.length}
                    onCheckedChange={checked =>
                      handleSelectAll(checked as boolean)
                    }
                  />
                  <span className='text-sm font-medium'>
                    已选择 {selectedNoteIds.length} 个笔记
                  </span>
                </div>

                <div className='flex items-center space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleBatchAction('publish')}
                  >
                    批量发布
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleBatchAction('archive')}
                  >
                    批量归档
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleBatchAction('delete')}
                    className='text-red-600 hover:text-red-700'
                  >
                    批量删除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 笔记列表 */}
      {loading ? (
        <div className='space-y-4'>
          {[...Array(6)].map((_, i) => (
            <Card key={i} className='animate-pulse'>
              <CardContent className='pt-6'>
                <div className='space-y-3'>
                  <div className='h-4 bg-muted rounded w-3/4' />
                  <div className='h-3 bg-muted rounded w-1/2' />
                  <div className='h-3 bg-muted rounded w-full' />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className='pt-12 pb-12 text-center'>
            <div className='space-y-4'>
              <div className='w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center'>
                <Search className='w-8 h-8 text-muted-foreground' />
              </div>
              <div>
                <h3 className='text-lg font-semibold'>没有找到笔记</h3>
                <p className='text-muted-foreground'>
                  {searchQuery || Object.keys(filters).length > 0
                    ? '尝试调整搜索条件或筛选器'
                    : '创建您的第一个笔记开始使用'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-4'
          }
        >
          {notes.map(note =>
            viewMode === 'grid' ? (
              <NoteCard key={note.id} note={note} />
            ) : (
              <NoteRow key={note.id} note={note} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
