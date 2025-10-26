'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Heart, Trash2, Edit, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/editor/rich-text-editor';

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

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [useRichEditor, setUseRichEditor] = useState(true);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    tags: [] as string[],
  });

  const noteId = params.id as string;

  // 获取笔记详情
  const fetchNote = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notes/${noteId}`);
      if (response.ok) {
        const noteData: Note = await response.json();
        setNote(noteData);
        setEditForm({
          title: noteData.title,
          content: noteData.content,
          tags: noteData.tags,
        });

        // 如果URL中包含edit=true参数，自动进入编辑模式
        if (searchParams?.get('edit') === 'true') {
          setIsEditing(true);
        }
      } else {
        console.error('笔记不存在');
        router.push('/notes');
      }
    } catch (error) {
      console.error('获取笔记失败:', error);
      router.push('/notes');
    } finally {
      setLoading(false);
    }
  };

  // 保存笔记
  const saveNote = async () => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const updatedNote: Note = await response.json();
        setNote(updatedNote);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
    }
  };

  // 删除笔记
  const deleteNote = async () => {
    if (!confirm('确定要删除这篇笔记吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/notes');
      }
    } catch (error) {
      console.error('删除笔记失败:', error);
    }
  };

  // 切换收藏状态
  const toggleFavorite = async () => {
    if (!note) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFavorite: !note.isFavorite,
        }),
      });

      if (response.ok) {
        const updatedNote: Note = await response.json();
        setNote(updatedNote);
      }
    } catch (error) {
      console.error('更新笔记失败:', error);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 添加标签
  const addTag = (tag: string) => {
    if (tag.trim() && !editForm.tags.includes(tag.trim())) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()],
      }));
    }
  };

  // 移除标签
  const removeTag = (tagToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  useEffect(() => {
    if (noteId) {
      fetchNote();
    }
  }, [noteId]);

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <Card className='w-96'>
          <CardContent className='text-center p-6'>
            <h2 className='text-2xl font-bold mb-4'>笔记不存在</h2>
            <p className='text-gray-600 mb-4'>您要查找的笔记不存在或已被删除</p>
            <Button onClick={() => router.push('/notes')}>返回笔记列表</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* 头部导航 */}
      <header className='bg-white shadow-sm border-b'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => router.push('/notes')}
                className='mr-4'
              >
                <ArrowLeft className='h-4 w-4 mr-2' />
                返回
              </Button>
              <h1 className='text-xl font-semibold text-gray-900'>
                {isEditing ? '编辑笔记' : note.title}
              </h1>
            </div>

            <div className='flex items-center space-x-2'>
              {!isEditing && (
                <Button variant='outline' size='sm' onClick={toggleFavorite}>
                  <Heart
                    className={`h-4 w-4 mr-2 ${note.isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  {note.isFavorite ? '已收藏' : '收藏'}
                </Button>
              )}

              {isEditing ? (
                <>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        title: note.title,
                        content: note.content,
                        tags: note.tags,
                      });
                    }}
                  >
                    取消
                  </Button>
                  <Button size='sm' onClick={saveNote}>
                    <Save className='h-4 w-4 mr-2' />
                    保存
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className='h-4 w-4 mr-2' />
                    编辑
                  </Button>
                  <Button variant='destructive' size='sm' onClick={deleteNote}>
                    <Trash2 className='h-4 w-4 mr-2' />
                    删除
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='space-y-6'>
          {/* 笔记元信息 */}
          {!isEditing && (
            <Card>
              <CardContent className='p-6'>
                <div className='flex items-center justify-between mb-4'>
                  <div className='flex items-center space-x-4 text-sm text-gray-500'>
                    <span>创建于 {formatDate(note.createdAt)}</span>
                    <span>更新于 {formatDate(note.updatedAt)}</span>
                    <span>版本 {note.version}</span>
                  </div>
                  <div className='flex items-center space-x-4 text-sm text-gray-500'>
                    <span>{note.wordCount} 字</span>
                    <span>{note.readingTimeMinutes} 分钟阅读</span>
                    <span>{note.viewCount} 次查看</span>
                  </div>
                </div>

                {note.tags.length > 0 && (
                  <div className='flex flex-wrap gap-2'>
                    {note.tags.map((tag, index) => (
                      <Badge key={index} variant='secondary'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 笔记内容 */}
          <Card>
            <CardContent className='p-6'>
              {isEditing ? (
                <div className='space-y-4'>
                  {/* 标题编辑 */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      标题
                    </label>
                    <Input
                      value={editForm.title}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder='输入笔记标题...'
                      className='text-lg font-medium'
                    />
                  </div>

                  {/* 内容编辑 */}
                  <div>
                    <div className='flex items-center justify-between mb-2'>
                      <label className='block text-sm font-medium text-gray-700'>
                        内容
                      </label>
                      <div className='flex items-center space-x-2'>
                        <Button
                          variant={useRichEditor ? 'default' : 'outline'}
                          size='sm'
                          onClick={() => setUseRichEditor(true)}
                        >
                          富文本
                        </Button>
                        <Button
                          variant={!useRichEditor ? 'default' : 'outline'}
                          size='sm'
                          onClick={() => setUseRichEditor(false)}
                        >
                          纯文本
                        </Button>
                      </div>
                    </div>
                    {useRichEditor ? (
                      <RichTextEditor
                        content={editForm.content}
                        onChange={content =>
                          setEditForm(prev => ({ ...prev, content }))
                        }
                        placeholder='开始记录你的想法...'
                        className='min-h-[400px]'
                      />
                    ) : (
                      <Textarea
                        value={editForm.content}
                        onChange={e =>
                          setEditForm(prev => ({
                            ...prev,
                            content: e.target.value,
                          }))
                        }
                        placeholder='开始记录你的想法...'
                        rows={20}
                        className='min-h-[400px]'
                      />
                    )}
                  </div>

                  {/* 标签编辑 */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      标签
                    </label>
                    <div className='flex flex-wrap gap-2 mb-2'>
                      {editForm.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant='secondary'
                          className='cursor-pointer'
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                    <div className='flex gap-2'>
                      <Input
                        placeholder='添加标签...'
                        onKeyPress={e => {
                          if (e.key === 'Enter') {
                            addTag(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                        className='flex-1'
                      />
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => {
                          const input = document.querySelector(
                            'input[placeholder="添加标签..."]',
                          ) as HTMLInputElement;
                          if (input) {
                            addTag(input.value);
                            input.value = '';
                          }
                        }}
                      >
                        添加
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='prose max-w-none'>
                  <div className='whitespace-pre-wrap text-gray-800 leading-relaxed'>
                    {note.content}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
