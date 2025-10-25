/**
 * Mermaid Diagram Demo Page
 *
 * Demonstration of Mermaid diagram support in the Markdown editor
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeftIcon,
  GitBranchIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  Edit3Icon,
  ZapIcon,
  DatabaseIcon,
  UsersIcon,
  CalendarIcon
} from 'lucide-react'
import EnhancedMarkdownEditor from '@/components/editor/enhanced-markdown-editor'
import { useToast } from '@/hooks/use-toast'

export default function MermaidDemoPage() {
  const [content, setContent] = useState(`# Mermaid 图表演示

MindNote 笔记系统现在支持 **Mermaid 图表**！你可以在 Markdown 中直接创建各种类型的图表。

## 🎯 支持的图表类型

### 1. 流程图 (Flowchart)

\`\`\`mermaid
graph TD
    A[开始] --> B{是否需要登录?}
    B -->|是| C[登录页面]
    B -->|否| D[直接访问]
    C --> E{登录成功?}
    E -->|是| F[进入系统]
    E -->|否| G[显示错误]
    D --> F
    F --> H[结束]
\`\`\`

### 2. 时序图 (Sequence Diagram)

\`\`\`mermaid
sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库

    用户->>前端: 访问页面
    前端->>后端: 请求用户数据
    后端->>数据库: 查询用户信息
    数据库-->>后端: 返回用户数据
    后端-->>前端: 发送用户信息
    前端-->>用户: 显示页面
\`\`\`

### 3. 类图 (Class Diagram)

\`\`\`mermaid
classDiagram
    class User {
        +String id
        +String name
        +String email
        +login()
        +logout()
        +updateProfile()
    }

    class Note {
        +String id
        +String title
        +String content
        +Date createdAt
        +save()
        +delete()
        +share()
    }

    class Category {
        +String id
        +String name
        +String color
        +create()
        +update()
        +delete()
    }

    User "1" -- "*" Note : creates
    User "1" -- "*" Category : owns
    Note "1" -- "1" Category : belongs to
\`\`\`

### 4. 状态图 (State Diagram)

\`\`\`mermaid
stateDiagram-v2
    [*] --> 草稿
    草稿 --> 编辑中: 开始编辑
    编辑中 --> 草稿: 保存草稿
    编辑中 --> 已发布: 发布笔记
    已发布 --> 归档: 归档笔记
    归档 --> 已发布: 取消归档
    已发布 --> 编辑中: 编辑内容
    草稿 --> [*]: 删除
\`\`\`

### 5. 实体关系图 (ER Diagram)

\`\`\`mermaid
erDiagram
    USER {
        string id PK
        string name
        string email
        datetime created_at
        datetime updated_at
    }

    NOTE {
        string id PK
        string title
        text content
        string category_id FK
        datetime created_at
        datetime updated_at
    }

    CATEGORY {
        string id PK
        string name
        string color
    }

    TAG {
        string id PK
        string name
        string color
    }

    NOTE_TAG {
        string note_id FK
        string tag_id FK
    }

    USER ||--o{ NOTE : creates
    NOTE }o--|| CATEGORY : belongs_to
    NOTE }o--o{ NOTE_TAG : has
    TAG }o--o{ NOTE_TAG : tagged_by
\`\`\`

### 6. 甘特图 (Gantt Chart)

\`\`\`mermaid
gantt
    title 项目开发时间线
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析      :done,    des1, 2024-01-01, 2024-01-05
    UI设计        :active,  des2, 2024-01-06, 2024-01-12
    原型设计      :         des3, after des2, 3d

    section 开发阶段
    前端开发      :         dev1, after des3, 10d
    后端开发      :         dev2, after des3, 12d
    集成测试      :         test, after dev1, 5d

    section 部署阶段
    部署准备      :         dep1, after test, 2d
    生产部署      :         dep2, after dep1, 1d
\`\`\`

### 7. 饼图 (Pie Chart)

\`\`\`mermaid
pie title 笔记分类统计
    "工作" : 45
    "学习" : 25
    "生活" : 20
    "项目" : 10
\`\`\`

## 🚀 如何使用

1. **切换到 Markdown 模式**：在笔记编辑器中选择"Markdown"标签
2. **插入 Mermaid 图表**：点击工具栏中的 Mermaid 按钮或使用快捷键 Ctrl+M
3. **编写图表代码**：在代码块中编写 Mermaid 语法
4. **实时预览**：切换到预览模式查看渲染效果

## 💡 使用技巧

- 使用 Ctrl+M 快速插入 Mermaid 模板
- 图表会自动调整大小适应容器
- 支持深色模式适配
- 可以在图表中使用中文标签

开始创建你的第一个 Mermaid 图表吧！`)

  const { toast } = useToast()

  const examples = {
    flowchart: `graph TD
    A[开始] --> B{条件判断}
    B -->|是| C[执行动作A]
    B -->|否| D[执行动作B]
    C --> E[结束]
    D --> E`,

    sequence: `sequenceDiagram
    participant A as 用户
    participant B as 系统
    A->>B: 发送请求
    B-->>A: 返回结果`,

    class: `classDiagram
    class User {
        +String name
        +login()
    }
    class Note {
        +String title
        +save()
    }
    User "1" -- "*" Note`,

    er: `erDiagram
    USER ||--o{ NOTES : creates
    USER {
        string id PK
        string name
    }
    NOTES {
        string id PK
        string title
    }`
  }

  const insertExample = (type: keyof typeof examples) => {
    const example = `\`\`\`mermaid
${examples[type]}
\`\`\n\n`
    setContent(prev => prev + example)
    toast({
      title: '示例已插入',
      description: `已插入${type}图表示例`
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
    a.download = `mermaid-demo-${Date.now()}.md`
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
          <GitBranchIcon className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-4xl font-bold text-gray-900">Mermaid 图表演示</h1>
        </div>
        <p className="text-xl text-gray-600 mb-6">
          在 Markdown 中创建专业的图表和流程图
        </p>
        <div className="flex justify-center space-x-4 mb-6">
          <Badge variant="default" className="text-sm">
            <ZapIcon className="h-3 w-3 mr-1" />
            实时渲染
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <DatabaseIcon className="h-3 w-3 mr-1" />
            多种图表类型
          </Badge>
          <Badge variant="outline" className="text-sm">
            <UsersIcon className="h-3 w-3 mr-1" />
            中文支持
          </Badge>
        </div>
        <div className="flex justify-center space-x-4">
          <Link href="/markdown-guide">
            <Button variant="outline">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Markdown指南
            </Button>
          </Link>
          <Link href="/notes/new">
            <Button>
              <Edit3Icon className="h-4 w-4 mr-2" />
              创建笔记
            </Button>
          </Link>
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
                  Mermaid 编辑器
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => insertExample('flowchart')}
                  >
                    流程图
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => insertExample('sequence')}
                  >
                    时序图
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => insertExample('class')}
                  >
                    类图
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedMarkdownEditor
                content={content}
                onChange={setContent}
                placeholder="在这里输入 Mermaid 图表代码..."
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
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">基础图表</TabsTrigger>
                  <TabsTrigger value="advanced">高级图表</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">流程图</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-xs text-gray-800 overflow-x-auto">
                          <code>graph TD
    A[开始] --> B[处理]
    B --> C[结束]</code>
                        </pre>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(examples.flowchart)}
                        className="mt-2"
                      >
                        <CopyIcon className="h-3 w-3 mr-1" />
                        复制
                      </Button>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">时序图</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-xs text-gray-800 overflow-x-auto">
                          <code>sequenceDiagram
    A->>B: 消息
    B-->>A: 响应</code>
                        </pre>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(examples.sequence)}
                        className="mt-2"
                      >
                        <CopyIcon className="h-3 w-3 mr-1" />
                        复制
                      </Button>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">类图</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-xs text-gray-800 overflow-x-auto">
                          <code>classDiagram
    ClassA --> ClassB</code>
                        </pre>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(examples.class)}
                        className="mt-2"
                      >
                        <CopyIcon className="h-3 w-3 mr-1" />
                        复制
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">实体关系图</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <pre className="text-xs text-gray-800 overflow-x-auto">
                        <code>erDiagram
    USER ||--o{ NOTES : creates</code>
                      </pre>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(examples.er)}
                      className="mt-2"
                    >
                      <CopyIcon className="h-3 w-3 mr-1" />
                      复制
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>功能特性</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <EyeIcon className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">实时预览</h4>
                    <p className="text-xs text-gray-600">编辑时可以立即查看图表效果</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <ZapIcon className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">快速插入</h4>
                    <p className="text-xs text-gray-600">工具栏提供常用图表模板</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <DatabaseIcon className="h-4 w-4 text-purple-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">安全渲染</h4>
                    <p className="text-xs text-gray-600">使用安全的渲染机制，防止XSS攻击</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CalendarIcon className="h-4 w-4 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">版本控制</h4>
                    <p className="text-xs text-gray-600">图表随笔记版本一起管理</p>
                  </div>
                </div>
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