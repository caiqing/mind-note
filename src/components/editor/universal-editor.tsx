/**
 * Universal Editor Component
 *
 * Hybrid editor supporting both rich text and Markdown modes
 */

'use client'

import { useState, useCallback } from 'react'
import { FileTextIcon, Edit3Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RichTextEditor from './rich-text-editor'
import EnhancedMarkdownEditor from './enhanced-markdown-editor'

interface UniversalEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
  maxLength?: number
  className?: string
  defaultMode?: 'rich' | 'markdown'
}

export function UniversalEditor({
  content,
  onChange,
  placeholder = '开始写作...',
  editable = true,
  maxLength = 100000,
  className = '',
  defaultMode = 'rich'
}: UniversalEditorProps) {
  const [mode, setMode] = useState<'rich' | 'markdown'>(defaultMode)

  // Convert HTML to Markdown (basic implementation)
  const htmlToMarkdown = useCallback((html: string): string => {
    let markdown = html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n'
      })
      .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let index = 1
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${index++}. $1\n`) + '\n'
      })
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()

    return markdown
  }, [])

  // Convert Markdown to HTML (basic implementation)
  const markdownToHtml = useCallback((markdown: string): string => {
    let html = markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*)`/gim, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
      .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br>')

    // Wrap in paragraphs
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>'
    }

    return html
  }, [])

  // Handle mode switch
  const handleModeSwitch = useCallback((newMode: 'rich' | 'markdown') => {
    if (newMode === mode) return

    if (mode === 'rich' && newMode === 'markdown') {
      // Convert HTML to Markdown
      const markdown = htmlToMarkdown(content)
      onChange(markdown)
    } else if (mode === 'markdown' && newMode === 'rich') {
      // Convert Markdown to HTML
      const html = markdownToHtml(content)
      onChange(html)
    }

    setMode(newMode)
  }, [mode, content, onChange, htmlToMarkdown, markdownToHtml])

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Mode Selector */}
      <div className="border-b bg-gray-50 p-2">
        <Tabs value={mode} onValueChange={handleModeSwitch}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rich" className="flex items-center space-x-2">
              <Edit3Icon className="h-4 w-4" />
              <span>富文本</span>
            </TabsTrigger>
            <TabsTrigger value="markdown" className="flex items-center space-x-2">
              <FileTextIcon className="h-4 w-4" />
              <span>Markdown</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rich" className="mt-0">
            <RichTextEditor
              content={content}
              onChange={onChange}
              placeholder={placeholder}
              editable={editable}
              maxLength={maxLength}
              className="border-0 rounded-none"
            />
          </TabsContent>

          <TabsContent value="markdown" className="mt-0">
            <EnhancedMarkdownEditor
              content={content}
              onChange={onChange}
              placeholder={placeholder}
              editable={editable}
              maxLength={maxLength}
              className="border-0 rounded-none"
              showPreview={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default UniversalEditor