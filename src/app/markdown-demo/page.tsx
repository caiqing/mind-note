/**
 * Markdown Editor Demo Page
 *
 * Demonstration of the Markdown editor functionality
 */

'use client'

import { useState } from 'react'
import UniversalEditor from '@/components/editor/universal-editor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CodeIcon, BookOpenIcon } from 'lucide-react'

export default function MarkdownDemoPage() {
  const [content, setContent] = useState(`# Markdown编辑器演示

欢迎使用MindNote的Markdown编辑器！这是一个**功能强大**的编辑器，支持实时预览和语法高亮。

## 主要特性

### 📝 富文本功能
- **粗体文本** 和 *斜体文本*
- `行内代码` 和代码块
- [链接](https://example.com) 和图片

### 🎯 列表功能
- 无序列表项 1
- 无序列表项 2
  - 嵌套项目
  - 另一个嵌套项目

### 🔢 有序列表
1. 第一项
2. 第二项
3. 第三项

### 💡 引用
> 这是一个引用块。你可以用它来强调重要的信息或引用其他来源的内容。

### 🖼️ 图片
![示例图片](https://via.placeholder.com/600x300/3B82F6/FFFFFF?text=Markdown+Editor)

### 💻 代码块

\`\`\`javascript
// JavaScript 示例
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

## 使用说明

1. **编辑模式**: 在左侧编辑器中输入Markdown语法
2. **预览模式**: 点击预览按钮查看渲染效果
3. **工具栏**: 使用顶部工具栏快速插入格式
4. **快捷键**: 支持 Ctrl+B (粗体), Ctrl+I (斜体), Ctrl+K (链接)

## 表格支持

| 功能 | 快捷键 | 说明 |
|------|--------|------|
| 粗体 | Ctrl+B | **文本** |
| 斜体 | Ctrl+I | *文本* |
| 链接 | Ctrl+K | [文本](url) |
| 代码 | - | \`代码\` |

---

**提示**: 试试切换到富文本模式，体验不同的编辑方式！`)

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `markdown-demo-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const sampleMarkdown = `# 标题
## 二级标题
### 三级标题

**粗体** *斜体* ~~删除线~~

- 列表项
- 另一项

1. 有序列表
2. 第二项

\`代码\`

\`\`\`javascript
console.log('Hello World');
\`\`\`

> 引用文本

[链接](https://example.com)
![图片](https://via.placeholder.com/300x200)`

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Markdown编辑器演示
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            体验功能强大的Markdown编辑，支持实时预览和富文本切换
          </p>
          <div className="flex justify-center space-x-4">
            <Button onClick={() => setContent(sampleMarkdown)}>
              <BookOpenIcon className="h-4 w-4 mr-2" />
              加载示例
            </Button>
            <Button onClick={handleExport} variant="outline">
              <CodeIcon className="h-4 w-4 mr-2" />
              导出Markdown
            </Button>
          </div>
        </div>

        {/* Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CodeIcon className="h-5 w-5 mr-2" />
              Markdown编辑器
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UniversalEditor
              content={content}
              onChange={setContent}
              placeholder="在这里输入Markdown内容..."
              editable={true}
              maxLength={50000}
              defaultMode="markdown"
            />
          </CardContent>
        </Card>

        {/* Quick Reference */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>快速参考</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><code># 标题</code> → H1标题</div>
                <div><code>## 标题</code> → H2标题</div>
                <div><code>**粗体**</code> → <strong>粗体</strong></div>
                <div><code>*斜体*</code> → <em>斜体</em></div>
                <div><code>\`代码\`</code> → <code>代码</code></div>
                <div><code>[文本](链接)</code> → 链接</div>
                <div><code>![alt](图片)</code> → 图片</div>
                <div><code>- 列表</code> → 无序列表</div>
                <div><code>1. 列表</code> → 有序列表</div>
                <div><code>> 引用</code> → 引用块</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>高级功能</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <strong>表格:</strong>
                  <code className="block mt-1 text-xs">| 列1 | 列2 |</code>
                  <code className="block text-xs">|-----|-----|</code>
                  <code className="block text-xs">| 数据 | 数据 |</code>
                </div>
                <div>
                  <strong>代码块:</strong>
                  <code className="block mt-1 text-xs">\`\`\`javascript</code>
                  <code className="block text-xs">// 代码</code>
                  <code className="block text-xs">\`\`\`</code>
                </div>
                <div>
                  <strong>任务列表:</strong>
                  <code className="block mt-1 text-xs">- [x] 已完成</code>
                  <code className="block text-xs">- [ ] 待完成</code>
                </div>
                <div>
                  <strong>快捷键:</strong>
                  <div className="mt-1 text-xs">
                    Ctrl+B → 粗体<br/>
                    Ctrl+I → 斜体<br/>
                    Ctrl+K → 链接
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}