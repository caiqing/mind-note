/**
 * Auto Save Demo Page
 *
 * Demonstrates the auto-save note editor functionality
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileTextIcon,
  PlusIcon,
  SaveIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon
} from 'lucide-react'
import AutoSaveNoteEditor from '@/components/editor/auto-save-note-editor'
import { NoteWithRelations } from '@/types/note'

export default function AutoSaveDemoPage() {
  const [currentNote, setCurrentNote] = useState<NoteWithRelations | null>(null)
  const [demoNotes, setDemoNotes] = useState<NoteWithRelations[]>([])

  // Sample notes for demonstration
  const sampleNotes = [
    {
      id: 'demo-1',
      title: '项目计划',
      content: `# 项目计划

## 目标
- 完成MVP版本
- 用户测试
- 性能优化

## 时间线
\`\`\`mermaid
gantt
    title 项目时间线
    dateFormat  YYYY-MM-DD
    section 开发阶段
    需求分析     :a1, 2024-01-01, 7d
    系统设计     :a2, after a1, 7d
    开发实现     :a3, after a2, 14d
    section 测试阶段
    单元测试     :b1, after a3, 5d
    集成测试     :b2, after b1, 5d
    用户测试     :b3, after b2, 7d
\`\`\`

## 技术栈
- React 18
- TypeScript
- Next.js 15
- PostgreSQL`,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryId: null,
      tags: [],
      isPublic: false
    } as NoteWithRelations,
    {
      id: 'demo-2',
      title: '会议记录',
      content: `# 团队会议记录

## 日期
2024年1月15日

## 参与人员
- 张三 (产品经理)
- 李四 (技术负责人)
- 王五 (设计师)

## 讨论内容

### 1. 新功能规划
- 用户反馈分析
- 功能优先级排序
- 资源分配

### 2. 技术方案评审
- 架构设计讨论
- 技术选型确认
- 风险评估

## 行动项
- [ ] 完成需求文档
- [ ] 准备技术方案
- [ ] 安排下次会议

## 思维导图
\`\`\`mindmap
{
  "nodes": [
    {"id": "1", "text": "会议记录", "x": 400, "y": 300, "color": "#3b82f6"},
    {"id": "2", "text": "新功能规划", "x": 200, "y": 200, "color": "#10b981"},
    {"id": "3", "text": "技术方案", "x": 600, "y": 200, "color": "#f59e0b"},
    {"id": "4", "text": "行动项", "x": 400, "y": 400, "color": "#ef4444"}
  ],
  "edges": [
    {"from": "1", "to": "2"},
    {"from": "1", "to": "3"},
    {"from": "1", "to": "4"}
  ]
}
\`\`\``,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryId: null,
      tags: [],
      isPublic: false
    } as NoteWithRelations
  ]

  useEffect(() => {
    setDemoNotes(sampleNotes)
  }, [])

  const handleSaveNote = (note: NoteWithRelations) => {
    setCurrentNote(note)
    console.log('Note saved:', note)
  }

  const handleError = (error: Error) => {
    console.error('Editor error:', error)
  }

  const createNewNote = () => {
    setCurrentNote(null)
  }

  const loadNote = (note: NoteWithRelations) => {
    setCurrentNote(note)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            自动保存笔记编辑器演示
          </h1>
          <p className="text-gray-600">
            体验集成了自动保存功能的智能笔记编辑器，支持实时保存、离线缓存和冲突解决。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>演示笔记</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={createNewNote}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    新建
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {demoNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                      currentNote?.id === note.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => loadNote(note)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {note.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {note.content.substring(0, 100)}...
                        </p>
                      </div>
                      <FileTextIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {note.updatedAt.toLocaleDateString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {note.content.length} 字符
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Features Card */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">功能特性</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm">自动保存</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm">离线缓存</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm">冲突解决</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm">状态指示</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Markdown支持</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Mermaid图表</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm">思维导图</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Editor */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {currentNote ? `编辑: ${currentNote.title}` : '新建笔记'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <SaveIcon className="h-3 w-3" />
                      <span>自动保存</span>
                    </Badge>
                    {currentNote && (
                      <Badge variant="secondary">
                        ID: {currentNote.id}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AutoSaveNoteEditor
                  noteId={currentNote?.id}
                  initialTitle={currentNote?.title || ''}
                  initialContent={currentNote?.content || ''}
                  onSave={handleSaveNote}
                  onError={handleError}
                  placeholder="开始编写你的笔记..."
                  editable={true}
                  showStatus={true}
                  autoSaveInterval={2000}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <InfoIcon className="h-5 w-5" />
              <span>使用说明</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">基础功能</TabsTrigger>
                <TabsTrigger value="advanced">高级功能</TabsTrigger>
                <TabsTrigger value="tips">使用技巧</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">自动保存</h4>
                    <p className="text-sm text-gray-600">
                      编辑器会在你停止输入2秒后自动保存内容，无需手动点击保存按钮。
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">状态指示</h4>
                    <p className="text-sm text-gray-600">
                      编辑器顶部会显示当前的保存状态：保存中、已保存、未保存或离线状态。
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Markdown支持</h4>
                    <p className="text-sm text-gray-600">
                      支持完整的Markdown语法，包括表格、列表、引用等格式。
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">实时预览</h4>
                    <p className="text-sm text-gray-600">
                      可以在编辑和预览模式之间切换，实时查看格式化效果。
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Mermaid图表</h4>
                    <p className="text-sm text-gray-600">
                      使用代码块语言标识符 "mermaid" 来创建流程图、时序图、甘特图等。
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">思维导图</h4>
                    <p className="text-sm text-gray-600">
                      使用代码块语言标识符 "mindmap" 来创建交互式思维导图。
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">离线支持</h4>
                    <p className="text-sm text-gray-600">
                      在网络断开时，内容会保存到本地缓存，恢复网络后自动同步。
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">冲突解决</h4>
                    <p className="text-sm text-gray-600">
                      自动处理保存冲突，确保数据不会丢失。
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tips" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">快捷键</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Ctrl+B: 粗体</li>
                      <li>• Ctrl+I: 斜体</li>
                      <li>• Ctrl+K: 插入链接</li>
                      <li>• Ctrl+M: 插入Mermaid图表</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">最佳实践</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 使用描述性的标题</li>
                      <li>• 合理使用标题层级</li>
                      <li>• 定期检查保存状态</li>
                      <li>• 利用离线缓存功能</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}