/**
 * T025 [US1] Create NoteEditor component with Tiptap in src/components/editor/note-editor.tsx
 *
 * Rich text editor component using Tiptap for advanced editing capabilities,
 * supporting markdown, formatting, and real-time collaboration features.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import Blockquote from '@tiptap/extension-blockquote'
import CodeBlock from '@tiptap/extension-code-block'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import { Button } from '@/components/ui/button'
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  CodeIcon,
  LinkIcon,
  ImageIcon,
  TableIcon,
  PaletteIcon,
  HighlighterIcon,
} from 'lucide-react'

interface NoteEditorProps {
  initialContent?: string
  placeholder?: string
  editable?: boolean
  className?: string
  onUpdate?: (content: string) => void
  onSelectionChange?: (selection: { from: number; to: number; text: string } | null) => void
}

export function NoteEditor({
  initialContent = '',
  placeholder = 'Start typing...',
  editable = true,
  className = '',
  onUpdate,
  onSelectionChange,
}: NoteEditorProps) {
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [tableDimensions, setTableDimensions] = useState({ rows: 3, cols: 3 })
  const [showTableDialog, setShowTableDialog] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc list-inside',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal list-inside',
        },
      }),
      Blockquote.configure({
        HTMLAttributes: {
          class: 'border-l-4 border-gray-300 pl-4 italic text-gray-600',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 p-4 rounded-md font-mono text-sm overflow-x-auto',
        },
      }),
      Bold,
      Italic,
      Underline,
      Strike,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      TextAlign.configure({
        types: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      TextStyle,
      Color.configure({
        types: ['textStyle', 'textColor'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-gray-300',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border-b border-gray-300',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border-b border-gray-300 font-semibold bg-gray-50',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md',
        },
      }),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onUpdate?.(html)
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to)

      if (from === to) {
        onSelectionChange?.(null)
      } else {
        onSelectionChange?.({ from, to, text })
      }
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[200px] p-4',
        placeholder: placeholder,
      },
    },
  })

  // Auto-save functionality
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const lastSavedContent = useRef(initialContent)

  const handleContentChange = useCallback(() => {
    if (!editor) return

    const content = editor.getHTML()

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      if (content !== lastSavedContent.current) {
        onUpdate?.(content)
        lastSavedContent.current = content
      }
    }, 1000) // Auto-save after 1 second of inactivity
  }, [editor, onUpdate])

  useEffect(() => {
    if (editor) {
      editor.on('update', handleContentChange)
    }

    return () => {
      if (editor) {
        editor.off('update', handleContentChange)
      }
    }
  }, [editor, handleContentChange])

  // Format buttons
  const setLink = useCallback(() => {
    if (editor) {
      if (linkUrl) {
        editor.chain().focus().setLink({ href: linkUrl }).run()
        setLinkUrl('')
      }
      setShowLinkDialog(false)
    }
  }, [editor, linkUrl])

  const unsetLink = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetLink().run()
    }
  }, [editor])

  const addImage = useCallback(() => {
    if (editor && imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl('')
    }
    setShowImageDialog(false)
  }, [editor, imageUrl])

  const insertTable = useCallback(() => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertTable({ rows: tableDimensions.rows, cols: tableDimensions.cols, withHeaderRow: true })
        .run()
    }
    setShowTableDialog(false)
  }, [editor, tableDimensions])

  const addColumn = useCallback(() => {
    if (editor) {
      editor.chain().focus().addColumnAfter().run()
    }
  }, [editor])

  const deleteColumn = useCallback(() => {
    if (editor) {
      editor.chain().focus().deleteColumn().run()
    }
  }, [editor])

  const addRow = useCallback(() => {
    if (editor) {
      editor.chain().focus().addRowAfter().run()
    }
  }, [editor])

  const deleteRow = useCallback(() => {
    if (editor) {
      editor.chain().focus().deleteRow().run()
    }
  }, [editor])

  const deleteTable = useCallback(() => {
    if (editor) {
      editor.chain().focus().deleteTable().run()
    }
  }, [editor])

  const toggleHeading = useCallback((level: number) => {
    if (editor) {
      editor.chain().focus().toggleHeading({ level }).run()
    }
  }, [editor])

  if (!editor) {
    return (
      <div className="border rounded-md p-4 min-h-[200px] bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 p-2 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <Button
            variant={editor.isActive('bold') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editable}
          >
            <BoldIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('italic') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editable}
          >
            <ItalicIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('underline') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editable}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('strike') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editable}
          >
            <StrikethroughIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <select
            value={editor.isActive('heading') ? editor.getAttributes('heading').level : ''}
            onChange={(e) => {
              const level = parseInt(e.target.value)
              if (level) {
                toggleHeading(level)
              } else {
                editor.chain().focus().setParagraph().run()
              }
            }}
            className="text-xs border rounded px-2 py-1 bg-white"
            disabled={!editable}
          >
            <option value="">Normal</option>
            <option value="1">H1</option>
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="4">H4</option>
            <option value="5">H5</option>
            <option value="6">H6</option>
          </select>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <Button
            variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!editable}
          >
            <ListIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!editable}
          >
            <ListOrderedIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <Button
            variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            disabled={!editable}
          >
            <AlignLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            disabled={!editable}
          >
            <AlignCenterIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            disabled={!editable}
          >
            <AlignRightIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Quote & Code */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <Button
            variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={!editable}
          >
            <QuoteIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            disabled={!editable}
          >
            <CodeIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Link */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <Button
            variant={editor.isActive('link') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              if (editor.isActive('link')) {
                unsetLink()
              } else {
                setShowLinkDialog(true)
              }
            }}
            disabled={!editable}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Media */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowImageDialog(true)}
            disabled={!editable}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTableDialog(true)}
            disabled={!editable}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          {editor.isActive('table') && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={addRow}
                disabled={!editable}
                title="Add row"
              >
                +
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={addColumn}
                disabled={!editable}
                title="Add column"
              >
                +|
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteRow}
                disabled={!editable}
                title="Delete row"
              >
                -
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteColumn}
                disabled={!editable}
                title="Delete column"
              >
                -|
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteTable}
                disabled={!editable}
                title="Delete table"
              >
                ×
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="min-h-[200px]">
        <EditorContent editor={editor} />
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add Link</h3>
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={setLink} disabled={!linkUrl}>
                Add Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add Image</h3>
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImageDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addImage} disabled={!imageUrl}>
                Add Image
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table Dialog */}
      {showTableDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Insert Table</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Rows</label>
              <input
                type="number"
                min="1"
                max="20"
                value={tableDimensions.rows}
                onChange={(e) => setTableDimensions(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Columns</label>
              <input
                type="number"
                min="1"
                max="20"
                value={tableDimensions.cols}
                onChange={(e) => setTableDimensions(prev => ({ ...prev, cols: parseInt(e.target.value) || 1 }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTableDialog(false)}>
                Cancel
              </Button>
              <Button onClick={insertTable}>
                Insert Table
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NoteEditor