/**
 * Enhanced Markdown Editor Component
 *
 * Comprehensive Markdown editor with Mermaid and MindMap support
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  BoldIcon,
  ItalicIcon,
  CodeIcon,
  LinkIcon,
  ImageIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  EyeIcon,
  Edit3Icon,
  DownloadIcon,
  UploadIcon,
  ZapIcon,
  BrainIcon,
  ChevronDownIcon
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CodeHighlighter from '@/components/ui/code-highlighter'
import MermaidRenderer from '@/components/markdown/mermaid-renderer'
import MindMapBlock from '@/components/markdown/mindmap-block'
import ImageUpload from './image-upload'
import { useToast } from '@/hooks/use-toast'

interface EnhancedMarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
  maxLength?: number
  className?: string
  showPreview?: boolean
}

export function EnhancedMarkdownEditor({
  content,
  onChange,
  placeholder = '开始写作...',
  editable = true,
  maxLength = 100000,
  className = '',
  showPreview = true
}: EnhancedMarkdownEditorProps) {
  const { toast } = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(showPreview)
  const [wordCount, setWordCount] = useState(0)

  // Update word count
  useEffect(() => {
    const text = content.trim()
    const words = text ? text.split(/\s+/).length : 0
    const chars = text.length
    setWordCount(words)
  }, [content])

  // Insert text at cursor position
  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    const newText = before + selectedText + after
    const newContent = content.substring(0, start) + newText + content.substring(end)

    onChange(newContent)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      )
    }, 0)
  }, [content, onChange])

  // Toolbar actions
  const toolbarActions = {
    bold: () => insertText('**', '**'),
    italic: () => insertText('*', '*'),
    code: () => insertText('`', '`'),
    link: () => insertText('[', '](url)'),
    image: () => insertText('![', '](url)'),
    list: () => insertText('- '),
    orderedList: () => insertText('1. '),
    quote: () => insertText('> '),
    mermaid: () => insertText('\n```mermaid\ngraph TD\n    A[开始] --> B[处理]\n    B --> C[结束]\n```\n'),
    mindmap: () => insertText('\n```mindmap\n{"nodes": [], "edges": []}\n```\n')
  }

  // Handle image upload
  const handleImageUpload = useCallback((url: string) => {
    insertText('![', `](${url})`)
    toast({
      title: '图片已插入',
      description: '图片链接已添加到编辑器'
    })
  }, [insertText, toast])

  // Handle file import
  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      onChange(text)
      toast({
        title: '文件已导入',
        description: `已导入文件: ${file.name}`
      })
    }
    reader.readAsText(file)
  }, [onChange, toast])

  // Handle file export
  const handleFileExport = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `markdown-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: '导出成功',
      description: 'Markdown文件已下载'
    })
  }, [content, toast])

  // Custom renderers for Markdown
  const renderers = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''

      // Handle Mermaid diagrams
      if (language === 'mermaid') {
        return <MermaidRenderer chart={String(children).replace(/\n$/, '')} />
      }

      // Handle MindMap diagrams
      if (language === 'mindmap') {
        try {
          const mindMapData = JSON.parse(String(children).replace(/\n$/, ''))
          return <MindMapBlock data={mindMapData} readOnly={true} />
        } catch (error) {
          return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
              <div className="text-red-600 font-medium">思维导图格式错误</div>
              <div className="text-red-500 text-sm mt-1">请检查JSON格式是否正确</div>
            </div>
          )
        }
      }

      return !inline && match ? (
        <div className="relative">
          <CodeHighlighter
            language={language}
            className="rounded-lg"
          >
            {String(children).replace(/\n$/, '')}
          </CodeHighlighter>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity bg-gray-700"
            onClick={() => {
              navigator.clipboard.writeText(String(children))
              toast({ title: '代码已复制', description: '代码已复制到剪贴板' })
            }}
          >
            <CodeIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      )
    },

    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-300">
          {children}
        </table>
      </div>
    ),

    th: ({ children }: any) => (
      <th className="border border-gray-300 bg-gray-50 px-4 py-2 text-left font-semibold">
        {children}
      </th>
    ),

    td: ({ children }: any) => (
      <td className="border border-gray-300 px-4 py-2">
        {children}
      </td>
    ),
  }

  return (
    <div className={`enhanced-markdown-editor border rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* Formatting Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toolbarActions.bold}
              disabled={!editable}
              title="粗体 (Ctrl+B)"
            >
              <BoldIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toolbarActions.italic}
              disabled={!editable}
              title="斜体 (Ctrl+I)"
            >
              <ItalicIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toolbarActions.code}
              disabled={!editable}
              title="代码 (Ctrl+`)"
            >
              <CodeIcon className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={toolbarActions.link}
              disabled={!editable}
              title="链接 (Ctrl+K)"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>

            {editable && (
              <ImageUpload onUpload={handleImageUpload}>
                <Button
                  variant="ghost"
                  size="sm"
                  title="插入图片"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </ImageUpload>
            )}

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={toolbarActions.list}
              disabled={!editable}
              title="无序列表"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toolbarActions.orderedList}
              disabled={!editable}
              title="有序列表"
            >
              <ListOrderedIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toolbarActions.quote}
              disabled={!editable}
              title="引用"
            >
              <QuoteIcon className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Advanced Features */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toolbarActions.mermaid}
              disabled={!editable}
              title="插入Mermaid图表 (Ctrl+M)"
            >
              <ZapIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toolbarActions.mindmap}
              disabled={!editable}
              title="插入思维导图"
            >
              <BrainIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {/* Word Count */}
            <Badge variant="outline" className="text-xs">
              {wordCount} 词
            </Badge>

            {/* Import/Export */}
            {editable && (
              <>
                <label className="cursor-pointer">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="导入文件"
                    asChild
                  >
                    <span>
                      <UploadIcon className="h-4 w-4" />
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".md,.txt"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFileExport}
                  title="导出文件"
                >
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* View Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              title={isPreviewMode ? "切换到编辑" : "切换到预览"}
            >
              {isPreviewMode ? <Edit3Icon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex h-full">
        {showPreview ? (
          <Tabs value={isPreviewMode ? "preview" : "edit"} className="flex-1">
            <TabsList className="grid w-full grid-cols-2 m-2">
              <TabsTrigger value="edit" className="flex items-center space-x-2">
                <Edit3Icon className="h-4 w-4" />
                <span>编辑</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center space-x-2">
                <EyeIcon className="h-4 w-4" />
                <span>预览</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-0">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={!editable}
                maxLength={maxLength}
                className="w-full h-96 p-4 border-0 resize-none focus:outline-none font-mono text-sm"
                style={{ minHeight: '500px' }}
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <div className="p-4 overflow-auto" style={{ minHeight: '500px', maxHeight: '600px' }}>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={renderers}
                  >
                    {content || '开始输入内容以查看预览...'}
                  </ReactMarkdown>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={!editable}
            maxLength={maxLength}
            className="w-full h-96 p-4 border-0 resize-none focus:outline-none font-mono text-sm"
            style={{ minHeight: '500px' }}
          />
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="border-t bg-gray-50 p-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>快捷键:</span>
            <span>Ctrl+B 粗体</span>
            <span>Ctrl+I 斜体</span>
            <span>Ctrl+K 链接</span>
            <span>Ctrl+M Mermaid</span>
          </div>
          <div>
            {content.length} / {maxLength} 字符
          </div>
        </div>
      </div>

      {/* Keyboard Event Handlers */}
      <style jsx global>{`
        .enhanced-markdown-editor textarea {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }

        .enhanced-markdown-editor textarea::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .enhanced-markdown-editor textarea::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .enhanced-markdown-editor textarea::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .enhanced-markdown-editor textarea::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}

export default EnhancedMarkdownEditor