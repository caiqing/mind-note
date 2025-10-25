/**
 * Rich Text Editor Component
 *
 * Advanced rich text editor using Tiptap with auto-save integration
 */

'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect, useCallback, useState } from 'react'
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  CodeIcon,
  LinkIcon,
  ImageIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  HighlighterIcon,
  PaletteIcon,
  Undo2Icon,
  Redo2Icon,
  UploadIcon,
  XIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toggleClass } from '@/lib/utils/editor'
import ImageUpload from './image-upload'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
  maxLength?: number
  className?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = '开始写作...',
  editable = true,
  maxLength = 100000,
  className = ''
}: RichTextEditorProps) {
  const [showImageUpload, setShowImageUpload] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-inside',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-inside',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-gray-300 pl-4 italic',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto',
          },
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  })

  // Sync content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + B for bold
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault()
        editor.chain().focus().toggleBold().run()
      }
      // Ctrl/Cmd + I for italic
      if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
        event.preventDefault()
        editor.chain().focus().toggleItalic().run()
      }
      // Ctrl/Cmd + U for underline (if we add extension)
      if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault()
        // editor.chain().focus().toggleUnderline().run()
      }
      // Ctrl/Cmd + K for link
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        setLink()
      }
      // Ctrl/Cmd + Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        editor.chain().focus().undo().run()
      }
      // Ctrl/Cmd + Shift + Z for redo
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') {
        event.preventDefault()
        editor.chain().focus().redo().run()
      }
    }

    editor.view.dom.addEventListener('keydown', handleKeyDown)
    return () => {
      editor.view.dom.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('请输入链接地址:', previousUrl)

    if (url === null) {
      return
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    setShowImageUpload(true)
  }, [])

  const handleImageInsert = useCallback((imageUrl: string) => {
    if (!editor) return

    editor.chain().focus().setImage({ src: imageUrl }).run()
    setShowImageUpload(false)
  }, [editor])

  const setTextAlign = useCallback((alignment: 'left' | 'center' | 'right') => {
    if (!editor) return
    editor.chain().focus().setTextAlign(alignment).run()
  }, [editor])

  const setColor = useCallback((color: string) => {
    if (!editor) return
    editor.chain().focus().setColor(color).run()
  }, [editor])

  const toggleHighlight = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleHighlight().run()
  }, [editor])

  if (!editor) {
    return (
      <div className="border rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-1">
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2Icon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2Icon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Formatting */}
        <Button
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('strike') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <StrikethroughIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('code') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <CodeIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <Button
          variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1Icon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2Icon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3Icon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <Button
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrderedIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <QuoteIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <Button
          variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTextAlign('left')}
        >
          <AlignLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTextAlign('center')}
        >
          <AlignCenterIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTextAlign('right')}
        >
          <AlignRightIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Colors and Highlight */}
        <div className="flex items-center gap-1">
          <input
            type="color"
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
            title="文字颜色"
          />
          <Button
            variant={editor.isActive('highlight') ? 'default' : 'ghost'}
            size="sm"
            onClick={toggleHighlight}
          >
            <HighlighterIcon className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Links and Images */}
        <Button
          variant={editor.isActive('link') ? 'default' : 'ghost'}
          size="sm"
          onClick={setLink}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={addImage}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <div className="min-h-[400px] max-h-[600px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Status Bar */}
      <div className="border-t bg-gray-50 px-4 py-2 flex justify-between items-center text-sm text-gray-600">
        <div>
          {editor.storage.characterCount.characters()} / {maxLength} 字符
        </div>
        <div>
          {editor.storage.characterCount.words()} 词
        </div>
      </div>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">上传图片</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImageUpload(false)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            <ImageUpload
              onImageInsert={handleImageInsert}
              maxFileSize={5}
              acceptedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
            />
          </div>
        </div>
      )}
    </div>
  )
}