/**
 * Category and Tag Integration Demo Page
 *
 * Demonstrates the enhanced note editor with category and tag management
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import AutoSaveNoteEditor from '@/components/editor/auto-save-note-editor'
import { useAuth } from '@/hooks/use-auth'
import { NoteWithRelations } from '@/types/note'
import {
  BookOpenIcon,
  TagIcon,
  FolderIcon,
  PlusIcon,
  SaveIcon,
  EyeIcon,
  SettingsIcon
} from 'lucide-react'
import { toast } from 'sonner'

export default function CategoryTagDemoPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [currentNote, setCurrentNote] = useState<NoteWithRelations | null>(null)
  const [demoMode, setDemoMode] = useState<'create' | 'edit'>('create')
  const [showCategoryTag, setShowCategoryTag] = useState(true)

  // Handle note save
  const handleNoteSave = (note: NoteWithRelations) => {
    setCurrentNote(note)
    toast.success('笔记保存成功！')
  }

  // Handle note error
  const handleNoteError = (error: Error) => {
    console.error('Note editor error:', error)
    toast.error('笔记操作失败：' + error.message)
  }

  // Create new demo note
  const handleCreateNew = () => {
    setCurrentNote(null)
    setDemoMode('create')
  }

  // Edit existing note
  const handleEditNote = () => {
    if (currentNote) {
      setDemoMode('edit')
    } else {
      toast.error('请先创建一个笔记')
    }
  }

  // Demo data for quick testing
  const loadDemoData = () => {
    // This would typically come from your API
    const demoNote = {
      id: 'demo-note-id',
      title: '我的第一个分类标签笔记',
      content: `# 分类和标签功能演示

这是一个集成了**分类管理**和**标签系统**的智能笔记编辑器。

## 主要功能

### 🗂️ 分类管理
- 支持层级分类结构
- 可创建、编辑、删除分类
- 支持分类搜索和筛选
- 彩色图标区分不同分类

### 🏷️ 标签系统
- 灵活的标签输入和管理
- 支持颜色标记
- 自动补全功能
- 标签使用统计

### 💾 智能保存
- 自动保存功能
- 实时状态显示
- 离线模式支持
- 版本控制

## 使用方法

1. **选择分类**：在编辑器顶部的分类选择器中选择合适的分类
2. **添加标签**：使用标签输入组件添加相关标签，支持自定义创建
3. **编写内容**：使用增强的 Markdown 编辑器编写笔记内容
4. **自动保存**：系统会自动保存您的更改，也可以手动保存

这个演示展示了 MindNote 智能笔记系统中分类和标签功能的完整集成。`,
      categoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'DRAFT' as const,
      isPublic: false,
      viewCount: 0,
      userId: user?.id || '',
      user: {
        id: user?.id || '',
        username: user?.username || 'demo',
        fullName: user?.fullName || 'Demo User',
        avatarUrl: user?.avatarUrl || null
      },
      category: null,
      noteTags: [],
      _count: {
        sourceRelations: 0,
        targetRelations: 0
      }
    }
    setCurrentNote(demoNote)
    setDemoMode('edit')
    toast.success('已加载演示数据')
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error('请先登录以访问此页面')
      // In a real app, you would redirect to login
    }
  }, [isAuthenticated, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <BookOpenIcon className="h-12 w-12 text-blue-600 mx-auto mb-2" />
            <CardTitle>需要登录</CardTitle>
            <CardDescription>
              请先登录以访问分类标签功能演示
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.href = '/login'}>
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
                  分类标签功能演示
                </h1>
                <p className="text-sm text-gray-500">
                  智能笔记编辑器集成演示
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryTag(!showCategoryTag)}
                className="flex items-center space-x-1"
              >
                <SettingsIcon className="h-4 w-4" />
                <span>{showCategoryTag ? '隐藏' : '显示'}分类标签</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={loadDemoData}
                className="flex items-center space-x-1"
              >
                <EyeIcon className="h-4 w-4" />
                <span>加载演示数据</span>
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

              {currentNote && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditNote}
                  className="flex items-center space-x-1"
                >
                  <SaveIcon className="h-4 w-4" />
                  <span>编辑当前</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Bar */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${demoMode === 'create' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <span className="text-sm font-medium">
                  {demoMode === 'create' ? '创建模式' : '编辑模式'}
                </span>
              </div>

              {currentNote && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>当前笔记：</span>
                  <Badge variant="outline">{currentNote.title}</Badge>
                  {currentNote.category && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <FolderIcon className="h-3 w-3" />
                      <span>{currentNote.category.name}</span>
                    </Badge>
                  )}
                  {currentNote.noteTags.length > 0 && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <TagIcon className="h-3 w-3" />
                      <span>{currentNote.noteTags.length} 个标签</span>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>用户：</span>
              <Badge variant="secondary">{user?.username}</Badge>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FolderIcon className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">智能分类</CardTitle>
              </div>
              <CardDescription>
                层级化的分类管理系统，支持树形结构和动态创建
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 支持多级分类嵌套</li>
                <li>• 实时搜索和过滤</li>
                <li>• 彩色图标标识</li>
                <li>• 使用统计展示</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TagIcon className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">灵活标签</CardTitle>
              </div>
              <CardDescription>
                强大的标签系统，支持颜色标记和智能推荐
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 自动补全功能</li>
                <li>• 颜色分类管理</li>
                <li>• 使用频次统计</li>
                <li>• 快捷键操作</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <SaveIcon className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">自动保存</CardTitle>
              </div>
              <CardDescription>
                智能的自动保存机制，确保数据安全不丢失
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 实时状态显示</li>
                <li>• 离线模式支持</li>
                <li>• 冲突解决机制</li>
                <li>• 版本历史记录</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        <div className="bg-white rounded-lg shadow-sm border">
          <AutoSaveNoteEditor
            noteId={currentNote?.id}
            initialTitle={currentNote?.title || ''}
            initialContent={currentNote?.content || ''}
            initialCategoryId={currentNote?.categoryId || null}
            initialTags={currentNote?.noteTags?.map(nt => nt.tag.name) || []}
            onSave={handleNoteSave}
            onError={handleNoteError}
            showCategoryTag={showCategoryTag}
            placeholder="开始编写您的笔记..."
            editable={true}
            showStatus={true}
            autoSaveInterval={3000}
          />
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">使用说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">分类管理</h4>
              <ul className="space-y-1">
                <li>• 点击分类选择器选择合适分类</li>
                <li>• 支持搜索已有分类</li>
                <li>• 可以直接创建新分类</li>
                <li>• 支持编辑和删除分类</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">标签操作</h4>
              <ul className="space-y-1">
                <li>• 输入标签名称进行搜索</li>
                <li>• 按Enter键快速创建标签</li>
                <li>• 支持为标签选择颜色</li>
                <li>• 最多可添加10个标签</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}