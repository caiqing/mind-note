/**
 * Mind Map Demo Page
 *
 * Demonstration of Mind Map support in the Markdown editor
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeftIcon,
  BrainIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  Edit3Icon,
  ZapIcon,
  PlusIcon,
  ShareIcon,
  Maximize2Icon
} from 'lucide-react'
import EnhancedMarkdownEditor from '@/components/editor/enhanced-markdown-editor'
import MindMapBlock from '@/components/markdown/mindmap-block'
import { useToast } from '@/hooks/use-toast'

export default function MindMapDemoPage() {
  const [content, setContent] = useState(`# 思维导图演示

MindNote 笔记系统现在支持 **思维导图**！你可以在 Markdown 中直接创建和编辑交互式思维导图。

## 🎯 思维导图功能

### 基础思维导图

\`\`\`mindmap
{
  "nodes": [
    {
      "id": "1",
      "label": "中心主题",
      "color": "#3b82f6",
      "fontSize": 16,
      "fontWeight": "bold",
      "type": "default",
      "position": { "x": 250, "y": 100 }
    },
    {
      "id": "2",
      "label": "分支 1",
      "color": "#10b981",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "3",
      "label": "分支 2",
      "color": "#f59e0b",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 400, "y": 200 }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" },
    { "id": "e1-3", "source": "1", "target": "3" }
  ]
}
\`\`\`

### 复杂思维导图示例

\`\`\`mindmap
{
  "nodes": [
    {
      "id": "root",
      "label": "项目管理",
      "color": "#8b5cf6",
      "fontSize": 18,
      "fontWeight": "bold",
      "type": "default",
      "position": { "x": 400, "y": 50 }
    },
    {
      "id": "plan",
      "label": "规划阶段",
      "color": "#3b82f6",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "input",
      "position": { "x": 150, "y": 150 }
    },
    {
      "id": "execute",
      "label": "执行阶段",
      "color": "#10b981",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "output",
      "position": { "x": 400, "y": 150 }
    },
    {
      "id": "review",
      "label": "评审阶段",
      "color": "#f59e0b",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "decision",
      "position": { "x": 650, "y": 150 }
    },
    {
      "id": "requirements",
      "label": "需求分析",
      "color": "#06b6d4",
      "fontSize": 12,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 50, "y": 250 }
    },
    {
      "id": "design",
      "label": "系统设计",
      "color": "#06b6d4",
      "fontSize": 12,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 150, "y": 250 }
    },
    {
      "id": "development",
      "label": "开发实施",
      "color": "#ec4899",
      "fontSize": 12,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 350, "y": 250 }
    },
    {
      "id": "testing",
      "label": "测试验证",
      "color": "#ec4899",
      "fontSize": 12,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 450, "y": 250 }
    },
    {
      "id": "approval",
      "label": "审批通过",
      "color": "#84cc16",
      "fontSize": 12,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 650, "y": 250 }
    },
    {
      "id": "changes",
      "label": "修改完善",
      "color": "#ef4444",
      "fontSize": 12,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 750, "y": 250 }
    }
  ],
  "edges": [
    { "id": "root-plan", "source": "root", "target": "plan" },
    { "id": "root-execute", "source": "root", "target": "execute" },
    { "id": "root-review", "source": "root", "target": "review" },
    { "id": "plan-requirements", "source": "plan", "target": "requirements" },
    { "id": "plan-design", "source": "plan", "target": "design" },
    { "id": "execute-development", "source": "execute", "target": "development" },
    { "id": "execute-testing", "source": "execute", "target": "testing" },
    { "id": "review-approval", "source": "review", "target": "approval" },
    { "id": "review-changes", "source": "review", "target": "changes" }
  ]
}
\`\`\`

## 🚀 如何使用

1. **切换到 Markdown 模式**：在笔记编辑器中选择"Markdown"标签
2. **插入思维导图**：点击工具栏中的思维导图按钮
3. **编辑思维导图**：在预览模式下点击"编辑"按钮打开交互式编辑器
4. **自定义节点**：调整节点颜色、字体大小、样式等属性
5. **导出分享**：将思维导图导出为JSON格式或复制分享

## 💡 节点类型

- **默认节点**：标准圆形节点，用于一般概念
- **输入节点**：方形节点，表示输入或起点
- **输出节点**：分支形节点，表示输出或结果
- **决策节点**：菱形节点，表示判断或决策点

## 🎨 自定义选项

- **颜色主题**：8种预设颜色可选
- **字体大小**：12-24px可调
- **字体粗细**：正常、粗体、细体
- **连线样式**：直线、曲线、动画效果

开始创建你的第一个思维导图吧！`)

  const { toast } = useToast()

  const examples = {
    simple: `{
  "nodes": [
    {
      "id": "1",
      "label": "中心主题",
      "color": "#3b82f6",
      "fontSize": 16,
      "fontWeight": "bold",
      "type": "default",
      "position": { "x": 250, "y": 100 }
    },
    {
      "id": "2",
      "label": "分支 1",
      "color": "#10b981",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 100, "y": 200 }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" }
  ]
}`,

    complex: `{
  "nodes": [
    {
      "id": "main",
      "label": "核心概念",
      "color": "#8b5cf6",
      "fontSize": 18,
      "fontWeight": "bold",
      "type": "default",
      "position": { "x": 300, "y": 100 }
    },
    {
      "id": "concept1",
      "label": "概念 A",
      "color": "#3b82f6",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "input",
      "position": { "x": 150, "y": 200 }
    },
    {
      "id": "concept2",
      "label": "概念 B",
      "color": "#10b981",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "output",
      "position": { "x": 450, "y": 200 }
    },
    {
      "id": "decision",
      "label": "决策点",
      "color": "#f59e0b",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "decision",
      "position": { "x": 300, "y": 300 }
    }
  ],
  "edges": [
    { "id": "main-concept1", "source": "main", "target": "concept1" },
    { "id": "main-concept2", "source": "main", "target": "concept2" },
    { "id": "concept1-decision", "source": "concept1", "target": "decision" },
    { "id": "concept2-decision", "source": "concept2", "target": "decision" }
  ]
}`
  }

  const insertExample = (type: keyof typeof examples) => {
    const example = `\`\`\`mindmap
${examples[type]}
\`\`\`\n\n`
    setContent(prev => prev + example)
    toast({
      title: '示例已插入',
      description: `已插入${type}思维导图示例`
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: '复制成功',
        description: '代码已复制到剪贴板'
      })
    })
  }

  const downloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mindmap-demo-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: '下载成功',
      description: 'Markdown文件已下载'
    })
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <BrainIcon className="h-8 w-8 text-purple-600 mr-3" />
          <h1 className="text-4xl font-bold text-gray-900">思维导图演示</h1>
        </div>
        <p className="text-xl text-gray-600 mb-6">
          在 Markdown 中创建和编辑交互式思维导图
        </p>
        <div className="flex justify-center space-x-4 mb-6">
          <Badge variant="default" className="text-sm">
            <ZapIcon className="h-3 w-3 mr-1" />
            交互式编辑
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Edit3Icon className="h-3 w-3 mr-1" />
            拖拽操作
          </Badge>
          <Badge variant="outline" className="text-sm">
            <ShareIcon className="h-3 w-3 mr-1" />
            导出分享
          </Badge>
        </div>
        <div className="flex justify-center space-x-4">
          <Button variant="outline">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            返回指南
          </Button>
          <Button>
            <Edit3Icon className="h-4 w-4 mr-2" />
            创建笔记
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <CodeIcon className="h-5 w-5 mr-2" />
                  思维导图编辑器
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => insertExample('simple')}
                  >
                    简单示例
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => insertExample('complex')}
                  >
                    复杂示例
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedMarkdownEditor
                content={content}
                onChange={setContent}
                placeholder="在这里输入思维导图JSON数据..."
                editable={true}
                maxLength={50000}
                className="h-[600px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Examples and Tips */}
        <div className="space-y-6">
          {/* Quick Examples */}
          <Card>
            <CardHeader>
              <CardTitle>快速示例</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="structure" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="structure">数据结构</TabsTrigger>
                  <TabsTrigger value="features">功能特性</TabsTrigger>
                </TabsList>

                <TabsContent value="structure" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">基本结构</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-xs text-gray-800 overflow-x-auto">
                          <code>{`{
  "nodes": [
    {
      "id": "unique_id",
      "label": "节点标签",
      "color": "#3b82f6",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 100, "y": 100 }
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "source": "from_node_id",
      "target": "to_node_id"
    }
  ]
}`}</code>
                        </pre>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(examples.simple)}
                        className="mt-2"
                      >
                        <CopyIcon className="h-3 w-3 mr-1" />
                        复制
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Edit3Icon className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm">交互式编辑</h4>
                        <p className="text-xs text-gray-600">拖拽节点，创建连接，实时编辑</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <PlusIcon className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm">动态添加</h4>
                        <p className="text-xs text-gray-600">点击添加新节点，扩展思维导图</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <ShareIcon className="h-4 w-4 text-purple-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm">导出分享</h4>
                        <p className="text-xs text-gray-600">JSON格式导出，便于分享和存储</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Node Types */}
          <Card>
            <CardHeader>
              <CardTitle>节点类型</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-2"></div>
                  <div className="text-sm font-medium">默认节点</div>
                  <div className="text-xs text-gray-500">标准圆形</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-green-500 mx-auto mb-2"></div>
                  <div className="text-sm font-medium">输入节点</div>
                  <div className="text-xs text-gray-500">方形样式</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-orange-500 mx-auto mb-2"></div>
                  <div className="text-sm font-medium">输出节点</div>
                  <div className="text-xs text-gray-500">分支样式</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-purple-500 mx-auto mb-2 transform rotate-45"></div>
                  <div className="text-sm font-medium">决策节点</div>
                  <div className="text-xs text-gray-500">菱形样式</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle>颜色主题</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: '蓝色', color: '#3b82f6', bg: '#dbeafe' },
                  { name: '绿色', color: '#10b981', bg: '#d1fae5' },
                  { name: '紫色', color: '#8b5cf6', bg: '#ede9fe' },
                  { name: '红色', color: '#ef4444', bg: '#fee2e2' },
                  { name: '黄色', color: '#f59e0b', bg: '#fef3c7' },
                  { name: '粉色', color: '#ec4899', bg: '#fce7f3' },
                  { name: '灰色', color: '#6b7280', bg: '#f3f4f6' },
                  { name: '黑色', color: '#1f2937', bg: '#f9fafb' },
                ].map((theme) => (
                  <div key={theme.color} className="text-center">
                    <div
                      className="w-full h-8 rounded border-2 mb-1"
                      style={{ backgroundColor: theme.bg, borderColor: theme.color }}
                    ></div>
                    <div className="text-xs text-gray-600">{theme.name}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export */}
          <Card>
            <CardHeader>
              <CardTitle>导出选项</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={downloadMarkdown}
                className="w-full"
                variant="outline"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                下载为 Markdown 文件
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}