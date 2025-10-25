/**
 * Main App Page
 *
 * Main dashboard page after user authentication
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  PlusIcon,
  SearchIcon,
  FileTextIcon,
  TagIcon,
  FolderIcon,
  SettingsIcon,
  UserIcon,
  ClockIcon,
  StarIcon,
  Edit3Icon,
  TrashIcon,
  LogOutIcon,
  BarChart3Icon,
  CalendarIcon,
  FilterIcon,
  SettingsIcon
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import AutoSaveNoteEditor from '@/components/editor/auto-save-note-editor'
import { NoteWithRelations } from '@/types/note'
import { useRouter } from 'next/navigation'

// Real data state
const [notes, setNotes] = useState<NoteWithRelations[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const mockCategories = [
  { id: '1', name: '工作', count: 5, color: 'blue' },
  { id: '2', name: '个人', count: 3, color: 'green' },
  { id: '3', name: '学习', count: 8, color: 'purple' }
];

const mockTags = [
  { name: '重要', count: 2, color: 'red' },
  { name: '工作', count: 4, color: 'blue' },
  { name: '学习', count: 6, color: 'purple' },
  { name: '会议', count: 3, color: 'orange' },
  { name: '团队', count: 2, color: 'indigo' }
];

export default function AppPage() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const router = useRouter();
  const [selectedNote, setSelectedNote] = useState<NoteWithRelations | null>(null);
  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<NoteWithRelations[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('notes');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notes data
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotes();
    }
  }, [isAuthenticated]);

  // Filter notes based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredNotes(filtered);
    } else {
      setFilteredNotes(notes);
    }
  }, [searchQuery, notes]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notes');

      if (!response.ok) {
        throw new Error('获取笔记列表失败');
      }

      const result = await response.json();
      if (result.success) {
        setNotes(result.data.notes || []);
      } else {
        setError(result.error || '获取笔记失败');
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>需要登录</CardTitle>
            <CardDescription>请先登录以访问您的笔记</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/auth-demo'} className="w-full">
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleNoteSave = (note: NoteWithRelations) => {
    setNotes(prev => {
      const existingIndex = prev.findIndex(n => n.id === note.id);
      if (existingIndex >= 0) {
        // Update existing note
        const updatedNotes = [...prev];
        updatedNotes[existingIndex] = note;
        return updatedNotes;
      } else {
        // Add new note
        return [note, ...prev];
      }
    });
  };

  const handleCreateNote = () => {
    setIsCreatingNote(true);
    setSelectedNote(null);
  };

  const handleSelectNote = (note: NoteWithRelations) => {
    // Navigate to note editor page
    router.push(`/app/notes/${note.id}`);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileTextIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">MindNote</h1>
              </div>
              <Badge variant="secondary">
                Beta
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索笔记..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              <Button onClick={handleCreateNote} className="flex items-center space-x-2">
                <PlusIcon className="h-4 w-4" />
                <span>新建笔记</span>
              </Button>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/app/profile'}>
                  <UserIcon className="h-4 w-4 mr-1" />
                  {user?.name}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/app/settings'}>
                  <SettingsIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOutIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">统计概览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileTextIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600">总笔记</span>
                    </div>
                    <span className="text-2xl font-bold">{notes.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TagIcon className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-600">标签</span>
                    </div>
                    <span className="text-2xl font-bold">{[...new Set(notes.flatMap(note => note.tags))].length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FolderIcon className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-gray-600">分类</span>
                    </div>
                    <span className="text-2xl font-bold">{mockCategories.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">分类</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <FolderIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{category.name}</span>
                      </div>
                      <Badge variant="outline">{category.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">热门标签</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(notes.flatMap(note => note.tags))].map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {[...new Set(notes.flatMap(note => note.tags))].length === 0 && (
                    <p className="text-sm text-gray-500">暂无标签</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="notes">笔记列表</TabsTrigger>
                <TabsTrigger value="editor">编辑器</TabsTrigger>
                <TabsTrigger value="analytics">分析</TabsTrigger>
              </TabsList>

              {/* Notes List */}
              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>我的笔记</CardTitle>
                    <CardDescription>
                      {searchQuery ? `搜索 "${searchQuery}" 的结果` : '最近创建的笔记'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                        <span className="text-gray-600">正在加载笔记...</span>
                      </div>
                    ) : error ? (
                      <div className="text-center py-8">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={fetchNotes} size="sm">
                          重试
                        </Button>
                      </div>
                    ) : filteredNotes.length === 0 ? (
                      <div className="text-center py-8">
                        <FileTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                          {searchQuery ? `没有找到包含 "${searchQuery}" 的笔记` : '还没有创建任何笔记'}
                        </p>
                        {!searchQuery && (
                          <Button onClick={handleCreateNote} className="mt-4">
                            创建第一个笔记
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredNotes.map((note) => (
                          <div
                            key={note.id}
                            onClick={() => handleSelectNote(note)}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedNote?.id === note.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{note.title}</h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {note.content.substring(0, 150)}...
                                </p>
                                <div className="flex items-center space-x-2 mt-2">
                                  {note.tags.map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-400">
                                <ClockIcon className="h-3 w-3" />
                                <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Editor */}
              <TabsContent value="editor">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {isCreatingNote ? '新建笔记' : '笔记编辑器'}
                    </CardTitle>
                    <CardDescription>
                      使用增强的Markdown编辑器，支持思维导图和Mermaid图表
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <AutoSaveNoteEditor
                      noteId={undefined}
                      initialTitle={isCreatingNote ? '' : ''}
                      initialContent={isCreatingNote ? '' : ''}
                      onSave={handleNoteSave}
                      editable={true}
                      showStatus={true}
                      placeholder="开始编写您的笔记..."
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics */}
              <TabsContent value="analytics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3Icon className="h-5 w-5" />
                        <span>统计概览</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">总笔记数</span>
                          <span className="font-semibold">{notes.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">总字数</span>
                          <span className="font-semibold">
                            {notes.reduce((total, note) => total + note.content.length, 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">平均字数</span>
                          <span className="font-semibold">
                            {notes.length > 0
                              ? Math.round(notes.reduce((total, note) => total + note.content.length, 0) / notes.length)
                              : 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">唯一标签数</span>
                          <span className="font-semibold">{[...new Set(notes.flatMap(note => note.tags))].length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <CalendarIcon className="h-5 w-5" />
                        <span>最近笔记</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {notes.length > 0 ? (
                          [...notes]
                            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                            .slice(0, 5)
                            .map((note, index) => (
                              <div key={note.id} className="flex items-center space-x-3 text-sm">
                                <div className={`w-2 h-2 rounded-full ${
                                  index === 0 ? 'bg-green-500' :
                                  index === 1 ? 'bg-blue-500' :
                                  index === 2 ? 'bg-purple-500' :
                                  'bg-gray-400'
                                }`}></div>
                                <span className="flex-1 truncate">{note.title}</span>
                                <span className="text-gray-400 whitespace-nowrap">
                                  {new Date(note.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-500">暂无笔记活动</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}