'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Grid,
  List,
  Heart,
  Archive,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 类型定义
interface Note {
  id: number;
  title: string;
  content: string;
  contentPlain: string;
  tags: string[];
  categoryId: number | null;
  isFavorite: boolean;
  isArchived: boolean;
  viewCount: number;
  wordCount: number;
  readingTimeMinutes: number;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedNotesResponse {
  notes: Note[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function SimpleNotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>(
    'updatedAt',
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // 获取笔记列表
  const fetchNotes = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
      });

      const response = await fetch(`/api/notes?${searchParams}`);
      if (response.ok) {
        const data: PaginatedNotesResponse = await response.json();
        setNotes(data.notes);
        setPagination(data.pagination);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('获取笔记失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索笔记
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchNotes(1, value);
  };

  // 创建新笔记
  const createNote = async () => {
    try {
      const newNote = {
        title: '新笔记',
        content: '# 新笔记\n\n开始记录你的想法...',
        tags: ['草稿'],
      };

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote),
      });

      if (response.ok) {
        fetchNotes(currentPage, searchTerm);
      }
    } catch (error) {
      console.error('创建笔记失败:', error);
    }
  };

  // 删除笔记
  const deleteNote = async (noteId: number) => {
    if (!confirm('确定要删除这篇笔记吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchNotes(currentPage, searchTerm);
      }
    } catch (error) {
      console.error('删除笔记失败:', error);
    }
  };

  // 切换收藏状态
  const toggleFavorite = async (noteId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFavorite: !currentStatus,
        }),
      });

      if (response.ok) {
        fetchNotes(currentPage, searchTerm);
      }
    } catch (error) {
      console.error('更新笔记失败:', error);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取预览文本
  const getPreviewText = (content: string, maxLength = 150) => {
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > maxLength
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* 头部 */}
      <header className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center'>
              <h1 className='text-2xl font-bold text-gray-900'>MindNote</h1>
              <Badge variant='secondary' className='ml-3'>
                Beta
              </Badge>
            </div>

            <div className='flex items-center space-x-4'>
              <Button onClick={createNote} size='sm'>
                <Plus className='h-4 w-4 mr-2' />
                新建笔记
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* 搜索和筛选栏 */}
        <div className='mb-8 space-y-4'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
              <Input
                type='text'
                placeholder='搜索笔记...'
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                className='pl-10'
              />
            </div>

            <div className='flex items-center space-x-2'>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setViewMode('grid')}
              >
                <Grid className='h-4 w-4' />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setViewMode('list')}
              >
                <List className='h-4 w-4' />
              </Button>

              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className='w-32'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='updatedAt'>最近更新</SelectItem>
                  <SelectItem value='createdAt'>最近创建</SelectItem>
                  <SelectItem value='title'>标题</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className='flex justify-center items-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
          </div>
        )}

        {/* 笔记列表 */}
        {!loading && (
          <>
            {notes.length === 0 ? (
              <div className='text-center py-12'>
                <div className='text-gray-400 mb-4'>
                  <Search className='h-12 w-12 mx-auto' />
                </div>
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  {searchTerm ? '没有找到匹配的笔记' : '还没有笔记'}
                </h3>
                <p className='text-gray-500 mb-6'>
                  {searchTerm
                    ? '尝试使用其他关键词搜索'
                    : '创建你的第一篇笔记开始记录'}
                </p>
                {!searchTerm && (
                  <Button onClick={createNote}>
                    <Plus className='h-4 w-4 mr-2' />
                    创建第一篇笔记
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* 网格视图 */}
                {viewMode === 'grid' && (
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8'>
                    {notes.map(note => (
                      <Card
                        key={note.id}
                        className='hover:shadow-md transition-shadow group'
                      >
                        <CardHeader className='pb-3'>
                          <div className='flex items-start justify-between'>
                            <CardTitle className='text-lg font-medium line-clamp-2 group-hover:text-blue-600 transition-colors'>
                              {note.title}
                            </CardTitle>
                            <div className='flex items-center space-x-1'>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() =>
                                  toggleFavorite(note.id, note.isFavorite)
                                }
                                className='h-8 w-8 p-0'
                              >
                                <Heart
                                  className={`h-4 w-4 ${note.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                                />
                              </Button>
                            </div>
                          </div>
                          <CardDescription className='text-sm'>
                            {formatDate(note.updatedAt)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className='text-gray-600 text-sm mb-4 line-clamp-3'>
                            {getPreviewText(note.contentPlain)}
                          </p>
                          <div className='flex items-center justify-between text-xs text-gray-500 mb-3'>
                            <span>{note.wordCount} 字</span>
                            <span>{note.readingTimeMinutes} 分钟阅读</span>
                            <span>{note.viewCount} 次查看</span>
                          </div>
                          {note.tags.length > 0 && (
                            <div className='flex flex-wrap gap-1 mb-4'>
                              {note.tags.slice(0, 3).map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant='outline'
                                  className='text-xs'
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {note.tags.length > 3 && (
                                <Badge variant='outline' className='text-xs'>
                                  +{note.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center space-x-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                className='h-8'
                              >
                                <Eye className='h-3 w-3 mr-1' />
                                查看
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                className='h-8'
                              >
                                <Edit className='h-3 w-3 mr-1' />
                                编辑
                              </Button>
                            </div>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => deleteNote(note.id)}
                              className='h-8 w-8 p-0 text-red-500 hover:text-red-700'
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* 列表视图 */}
                {viewMode === 'list' && (
                  <div className='space-y-4 mb-8'>
                    {notes.map(note => (
                      <Card
                        key={note.id}
                        className='hover:shadow-md transition-shadow'
                      >
                        <CardContent className='p-6'>
                          <div className='flex items-start justify-between'>
                            <div className='flex-1'>
                              <div className='flex items-center mb-2'>
                                <h3 className='text-lg font-medium mr-3 group-hover:text-blue-600 transition-colors'>
                                  {note.title}
                                </h3>
                                {note.isFavorite && (
                                  <Badge variant='secondary'>⭐</Badge>
                                )}
                              </div>
                              <p className='text-gray-600 text-sm mb-3 line-clamp-2'>
                                {getPreviewText(note.contentPlain)}
                              </p>
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center space-x-4 text-xs text-gray-500'>
                                  <span>{formatDate(note.updatedAt)}</span>
                                  <span>{note.wordCount} 字</span>
                                  <span>{note.readingTimeMinutes} 分钟</span>
                                  <span>{note.viewCount} 次查看</span>
                                </div>
                                {note.tags.length > 0 && (
                                  <div className='flex flex-wrap gap-1'>
                                    {note.tags.slice(0, 3).map((tag, index) => (
                                      <Badge
                                        key={index}
                                        variant='outline'
                                        className='text-xs'
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                    {note.tags.length > 3 && (
                                      <Badge
                                        variant='outline'
                                        className='text-xs'
                                      >
                                        +{note.tags.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className='flex items-center space-x-2 ml-4'>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() =>
                                  toggleFavorite(note.id, note.isFavorite)
                                }
                              >
                                <Heart
                                  className={`h-4 w-4 ${note.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                                />
                              </Button>
                              <Button variant='outline' size='sm'>
                                <Eye className='h-4 w-4' />
                              </Button>
                              <Button variant='outline' size='sm'>
                                <Edit className='h-4 w-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => deleteNote(note.id)}
                                className='text-red-500 hover:text-red-700'
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* 分页 */}
                {pagination.totalPages > 1 && (
                  <div className='flex justify-center items-center space-x-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={!pagination.hasPrev}
                      onClick={() => fetchNotes(currentPage - 1, searchTerm)}
                    >
                      上一页
                    </Button>

                    <span className='text-sm text-gray-600'>
                      第 {currentPage} 页，共 {pagination.totalPages} 页
                    </span>

                    <Button
                      variant='outline'
                      size='sm'
                      disabled={!pagination.hasNext}
                      onClick={() => fetchNotes(currentPage + 1, searchTerm)}
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
