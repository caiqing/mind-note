/**
 * Note Editor Page
 *
 * Protected page for editing individual notes
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeftIcon,
  SaveIcon,
  TrashIcon,
  ShareIcon,
  MoreHorizontalIcon,
  Edit3Icon,
  FileTextIcon,
  CalendarIcon,
  TagIcon,
  UserIcon
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import AutoSaveNoteEditor from '@/components/editor/auto-save-note-editor'
import { NoteWithRelations } from '@/types/note'

export default function NoteEditorPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string

  const [note, setNote] = useState<NoteWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载应用...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    router.push('/auth-demo');
    return null;
  }

  // Fetch note data
  useEffect(() => {
    if (noteId && isAuthenticated) {
      fetchNote();
    }
  }, [noteId, isAuthenticated]);

  const fetchNote = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notes/${noteId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('笔记不存在或您没有权限访问');
        } else {
          setError('获取笔记失败');
        }
        return;
      }

      const result = await response.json();
      if (result.success) {
        setNote(result.data);
      } else {
        setError(result.error || '获取笔记失败');
      }
    } catch (err) {
      console.error('Failed to fetch note:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteSave = (updatedNote: NoteWithRelations) => {
    setNote(updatedNote);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!note) return;

    if (!confirm('确定要删除这个笔记吗？此操作无法撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || '删除失败');
        return;
      }

      router.push('/app');
    } catch (err) {
      console.error('Failed to delete note:', err);
      alert('删除失败，请稍后重试');
    }
  };

  const handleShare = () => {
    if (note) {
      const shareUrl = `${window.location.origin}/app/notes/${note.id}`;
      navigator.clipboard.writeText(shareUrl);
      alert('笔记链接已复制到剪贴板');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载笔记...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">加载失败</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()} className="flex-1">
                返回
              </Button>
              <Button onClick={() => fetchNote()} className="flex-1">
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>笔记不存在</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center mb-4">您访问的笔记不存在或已被删除</p>
            <Button onClick={() => router.push('/app')} className="w-full">
              返回应用
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span>返回</span>
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center space-x-2">
                <FileTextIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {isEditing ? '编辑笔记' : note.title}
                  </h1>
                  {!isEditing && (
                    <p className="text-sm text-gray-500">
                      最后修改于 {note.updatedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {note.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}

              <Separator orientation="vertical" className="h-6" />

              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center space-x-2"
              >
                <Edit3Icon className="h-4 w-4" />
                <span>{isEditing ? '预览' : '编辑'}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center space-x-2"
              >
                <ShareIcon className="h-4 w-4" />
                <span>分享</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4" />
                <span>删除</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Note Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">笔记信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">作者</p>
                      <p className="text-sm text-gray-600">{user?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">创建时间</p>
                      <p className="text-sm text-gray-600">{note.createdAt.toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">最后修改</p>
                      <p className="text-sm text-gray-600">{note.updatedAt.toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <TagIcon className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">标签</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {note.tags.length > 0 ? (
                          note.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">暂无标签</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">统计信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">字数</span>
                    <span className="font-semibold">{note.content.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">字符数</span>
                    <span className="font-semibold">{note.content.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">段落数</span>
                    <span className="font-semibold">{note.content.split('\n').filter(line => line.trim()).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editor Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <AutoSaveNoteEditor
                  noteId={note.id}
                  initialTitle={note.title}
                  initialContent={note.content}
                  onSave={handleNoteSave}
                  editable={isEditing}
                  showStatus={true}
                  placeholder="开始编写您的笔记..."
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}