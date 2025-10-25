/**
 * Complete Markdown Features Demo
 *
 * Comprehensive demonstration of all Markdown capabilities including
 * Mermaid diagrams and Mind Maps
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeftIcon,
  FileTextIcon,
  ZapIcon,
  BrainIcon,
  CodeIcon,
  EyeIcon,
  Edit3Icon,
  DownloadIcon,
  PlusIcon,
  ShareIcon
} from 'lucide-react'
import EnhancedMarkdownEditor from '@/components/editor/enhanced-markdown-editor'
import { useToast } from '@/hooks/use-toast'

export default function MarkdownFeaturesPage() {
  const [content, setContent] = useState(`# Markdown 功能完整演示

这是一个展示 MindNote 笔记系统 **完整 Markdown 功能** 的演示页面。

## 🚀 核心功能

### 基础 Markdown 语法

- **粗体文本** 和 *斜体文本*
- \`行内代码\` 和代码块
- [链接](https://example.com) 和图片
- 列表和引用

### 扩展语法支持

### 表格

| 功能 | 支持程度 | 说明 |
|------|----------|------|
| 基础语法 | ✅ 完全支持 | 标准 Markdown 语法 |
| 扩展语法 | ✅ 完全支持 | GitHub Flavored Markdown |
| Mermaid图表 | ✅ 完全支持 | 流程图、时序图等 |
| 思维导图 | ✅ 完全支持 | 交互式思维导图 |

### 任务列表

- [x] 完成基础 Markdown 支持
- [x] 集成 Mermaid 图表渲染
- [x] 添加思维导图功能
- [ ] 实现实时协作编辑
- [ ] 添加更多图表类型

## 🎯 图表功能

### 1. Mermaid 流程图

\`\`\`mermaid
graph TD
    A[开始] --> B{选择图表类型}
    B -->|Mermaid| C[创建流程图]
    B -->|MindMap| D[创建思维导图]
    C --> E[配置样式]
    D --> F[编辑节点]
    E --> G[完成图表]
    F --> G
    G --> H[导出分享]
\`\`\`

### 2. Mermaid 时序图

\`\`\`mermaid
sequenceDiagram
    participant 用户
    participant 编辑器
    participant 渲染器

    用户->>编辑器: 输入图表代码
    编辑器->>渲染器: 解析图表语法
    渲染器->>渲染器: 生成 SVG 图形
    渲染器-->>编辑器: 返回渲染结果
    编辑器-->>用户: 显示图表
\`\`\`

### 3. 思维导图示例

\`\`\`mindmap
{
  "nodes": [
    {
      "id": "root",
      "label": "Markdown 功能",
      "color": "#8b5cf6",
      "fontSize": 18,
      "fontWeight": "bold",
      "type": "default",
      "position": { "x": 300, "y": 50 }
    },
    {
      "id": "basic",
      "label": "基础功能",
      "color": "#3b82f6",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "input",
      "position": { "x": 150, "y": 150 }
    },
    {
      "id": "advanced",
      "label": "高级功能",
      "color": "#10b981",
      "fontSize": 14,
      "fontWeight": "normal",
      "type": "output",
      "position": { "x": 450, "y": 150 }
    },
    {
      "id": "formatting",
      "label": "格式化",
      "color": "#06b6d4",
      "fontSize": 12,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 80, "y": 250 }
    },
    {
      "id": "lists",
      "label": "列表",
      "color": "#06b6d4",
      "fontSize": 12,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 220, "y": 250 }
    },
    {
      "id": "mermaid",
      "label": "Mermaid 图表",
      "color": "#ec4899",
      "fontSize": 12,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 380, "y": 250 }
    },
    {
      "id": "mindmaps",
      "label": "思维导图",
      "color": "#ec4899",
      "fontSize": 12,
      "fontWeight": "normal",
      "type": "default",
      "position": { "x": 520, "y": 250 }
    }
  ],
  "edges": [
    { "id": "root-basic", "source": "root", "target": "basic" },
    { "id": "root-advanced", "source": "root", "target": "advanced" },
    { "id": "basic-formatting", "source": "basic", "target": "formatting" },
    { "id": "basic-lists", "source": "basic", "target": "lists" },
    { "id": "advanced-mermaid", "source": "advanced", "target": "mermaid" },
    { "id": "advanced-mindmaps", "source": "advanced", "target": "mindmaps" }
  ]
}
\`\`\`

### 4. Mermaid 类图

\`\`\`mermaid
classDiagram
    class MarkdownEditor {
        +String content
        +Boolean editable
        +edit()
        +save()
        +export()
    }

    class MermaidRenderer {
        +String chart
        +render()
        +validate()
    }

    class MindMapEditor {
        +Object nodes
        +Object edges
        +addNode()
        +connectNodes()
        +export()
    }

    MarkdownEditor --> MermaidRenderer : uses
    MarkdownEditor --> MindMapEditor : uses
\`\`\`

## 🎨 使用技巧

### 快捷键

- \`Ctrl+B\` - 粗体
- \`Ctrl+I\` - 斜体
- \`Ctrl+K\` - 插入链接
- \`Ctrl+M\` - 插入 Mermaid 图表

### 最佳实践

1. **图表命名**：为每个图表提供清晰的描述
2. **代码格式**：保持图表代码的整洁和可读性
3. **预览检查**：及时预览图表效果
4. **导出备份**：定期导出重要的 Markdown 文档

## 📝 总结

MindNote 的 Markdown 编辑器提供了：

- ✅ **完整的 Markdown 语法支持**
- ✅ **Mermaid 图表渲染** (7种图表类型)
- ✅ **交互式思维导图** (4种节点类型)
- ✅ **实时预览**功能
- ✅ **安全的 HTML 渲染**
- ✅ **导出和分享**功能

开始探索这些强大的功能吧！`)

  const { toast } = useToast()

  const downloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `markdown-features-${Date.now()}.md`
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
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <FileTextIcon className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-4xl font-bold text-gray-900">Markdown 功能完整演示</h1>
        </div>
        <p className="text-xl text-gray-600 mb-6">
          探索 MindNote 笔记系统的完整 Markdown 功能
        </p>
        <div className="flex justify-center space-x-4 mb-6">
          <Badge variant="default" className="text-sm">
            <CodeIcon className="h-3 w-3 mr-1" />
            语法高亮
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <ZapIcon className="h-3 w-3 mr-1" />
            Mermaid 图表
          </Badge>
          <Badge variant="outline" className="text-sm">
            <BrainIcon className="h-3 w-3 mr-1" />
            思维导图
          </Badge>
        </div>
        <div className="flex justify-center space-x-4">
          <Button variant="outline">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            返回首页
          </Button>
          <Button onClick={downloadMarkdown}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            下载演示
          </Button>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CodeIcon className="h-5 w-5 mr-2 text-blue-600" />
              基础 Markdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              支持标准 Markdown 语法，包括标题、列表、链接、图片、表格等基础功能。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ZapIcon className="h-5 w-5 mr-2 text-purple-600" />
              Mermaid 图表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              支持 7 种 Mermaid 图表类型：流程图、时序图、类图、状态图、ER图、甘特图、饼图。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BrainIcon className="h-5 w-5 mr-2 text-green-600" />
              思维导图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              交互式思维导图编辑器，支持拖拽操作、多种节点类型和自定义样式。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Edit3Icon className="h-5 w-5 mr-2" />
              Markdown 编辑器
            </div>
            <div className="flex space-x-2">
              <Badge variant="outline" className="text-xs">
                <EyeIcon className="h-3 w-3 mr-1" />
                实时预览
              </Badge>
              <Badge variant="outline" className="text-xs">
                <PlusIcon className="h-3 w-3 mr-1" />
                动态渲染
              </Badge>
              <Badge variant="outline" className="text-xs">
                <ShareIcon className="h-3 w-3 mr-1" />
                导出分享
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedMarkdownEditor
            content={content}
            onChange={setContent}
            placeholder="在这里输入 Markdown 内容..."
            editable={true}
            maxLength={100000}
            className="h-[800px]"
          />
        </CardContent>
      </Card>

      {/* Instructions */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          提示：你可以直接编辑上面的内容，试试添加新的图表或修改现有的思维导图。
          使用工具栏的按钮可以快速插入不同类型的图表模板。
        </p>
      </div>
    </div>
  )
}