/**
 * Auto Save Note Editor Component
 *
 * Enhanced note editor with integrated auto-save functionality
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  SaveIcon,
  CloudIcon,
  CloudOffIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  FolderIcon,
  TagIcon
} from 'lucide-react'
import { toast } from 'sonner'
import EnhancedMarkdownEditor from './enhanced-markdown-editor'
import CategorySelector from '@/components/category/category-selector'
import TagInput from '@/components/tag/tag-input'
import { useNoteApi } from '@/hooks/use-note-api'
import { useAutoSave } from '@/hooks/use-auto-save'
import { NoteWithRelations, CreateNoteInput, UpdateNoteInput } from '@/types/note'

interface AutoSaveNoteEditorProps {
  noteId?: string
  initialContent?: string
  initialTitle?: string
  initialCategoryId?: number | null
  initialTags?: string[]
  onSave?: (note: NoteWithRelations) => void
  onError?: (error: Error) => void
  className?: string
  placeholder?: string
  editable?: boolean
  showStatus?: boolean
  showCategoryTag?: boolean
  autoSaveInterval?: number
}

export function AutoSaveNoteEditor({
  noteId,
  initialContent = '',
  initialTitle = '',
  initialCategoryId = null,
  initialTags = [],
  onSave,
  onError,
  className = '',
  placeholder = '开始编写笔记...',
  editable = true,
  showStatus = true,
  showCategoryTag = true,
  autoSaveInterval = 2000
}: AutoSaveNoteEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [isCreatingNew, setIsCreatingNew] = useState(!noteId)
  const [currentNoteId, setCurrentNoteId] = useState(noteId)

  const noteApi = useNoteApi({
    onSuccess: (message) => {
      console.log('Note operation successful:', message)
    },
    onError: (error) => {
      console.error('Note operation failed:', error)
      onError?.(error)
    }
  })

  // Auto-save functionality
  const autoSave = useAutoSave({
    content: content,
    onSave: async (contentToSave: string) => {
      if (!currentNoteId) {
        // Create new note
        if (!title.trim() && !contentToSave.trim()) {
          throw new Error('标题和内容不能都为空')
        }

        const newNoteData: CreateNoteInput = {
          title: title.trim() || '无标题笔记',
          content: contentToSave,
          categoryId: categoryId,
          tags: tags,
          isPublic: false
        }

        const newNote = await noteApi.createNote(newNoteData)
        if (newNote) {
          setCurrentNoteId(newNote.id)
          setIsCreatingNew(false)
          onSave?.(newNote)
          toast.success('笔记创建成功')
        } else {
          throw new Error('创建笔记失败')
        }
      } else {
        // Update existing note
        const updateData: UpdateNoteInput = {
          title: title.trim() || '无标题笔记',
          content: contentToSave,
          categoryId: categoryId,
          tags: tags
        }

        const updatedNote = await noteApi.updateNote(currentNoteId, updateData)
        if (updatedNote) {
          onSave?.(updatedNote)
          toast.success('笔记保存成功')
        } else {
          throw new Error('保存笔记失败')
        }
      }
    },
    interval: autoSaveInterval,
    debounceDelay: 500,
    enabled: editable,
    maxRetries: 3,
    storageKey: currentNoteId ? `note-draft-${currentNoteId}` : 'note-draft-new'
  })

  // Handle title change
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle)
  }, [])

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  // Handle category change
  const handleCategoryChange = useCallback((newCategoryId: number | null) => {
    setCategoryId(newCategoryId)
  }, [])

  // Handle tags change
  const handleTagsChange = useCallback((newTags: string[]) => {
    setTags(newTags)
  }, [])

  // Manual save function
  const handleManualSave = useCallback(async () => {
    try {
      await autoSave.forceSave()
    } catch (error) {
      console.error('Manual save failed:', error)
      toast.error('手动保存失败')
    }
  }, [autoSave])

  // Status indicator component
  const StatusIndicator = () => {
    if (!showStatus) return null

    const getStatusIcon = () => {
      switch (autoSave.status) {
        case 'saving':
          return <RefreshCwIcon className="h-4 w-4 animate-spin text-blue-600" />
        case 'saved':
          return <CheckCircleIcon className="h-4 w-4 text-green-600" />
        case 'error':
          return <AlertCircleIcon className="h-4 w-4 text-red-600" />
        case 'offline':
          return <CloudOffIcon className="h-4 w-4 text-orange-600" />
        default:
          return <ClockIcon className="h-4 w-4 text-gray-600" />
      }
    }

    const getStatusText = () => {
      switch (autoSave.status) {
        case 'saving':
          return '正在保存...'
        case 'saved':
          return autoSave.lastSavedAt ? `已保存 ${autoSave.lastSavedAt.toLocaleTimeString()}` : '已保存'
        case 'error':
          return autoSave.error || '保存失败'
        case 'offline':
          return '离线模式'
        default:
          return autoSave.hasUnsavedChanges ? '未保存' : '无更改'
      }
    }

    const getStatusColor = () => {
      switch (autoSave.status) {
        case 'saving':
          return 'bg-blue-100 text-blue-800 border-blue-200'
        case 'saved':
          return 'bg-green-100 text-green-800 border-green-200'
        case 'error':
          return 'bg-red-100 text-red-800 border-red-200'
        case 'offline':
          return 'bg-orange-100 text-orange-800 border-orange-200'
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }

    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className={`flex items-center space-x-1 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-xs">{getStatusText()}</span>
        </Badge>

        {!autoSave.isOnline && (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
            <CloudOffIcon className="h-3 w-3 mr-1" />
            离线
          </Badge>
        )}

        {autoSave.hasUnsavedChanges && (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            有未保存的更改
          </Badge>
        )}
      </div>
    )
  }

  // Initialize content if noteId changes
  useEffect(() => {
    if (noteId && noteId !== currentNoteId) {
      setCurrentNoteId(noteId)
      setIsCreatingNew(false)

      // Load existing note content
      noteApi.getNote(noteId).then(note => {
        if (note) {
          setTitle(note.title)
          setContent(note.content)
          setCategoryId(note.categoryId)

          // Extract tags from noteTags relationship
          const noteTags = note.noteTags?.map(nt => nt.tag.name) || []
          setTags(noteTags)
        }
      }).catch(error => {
        console.error('Failed to load note:', error)
        onError?.(error)
      })
    }
  }, [noteId, currentNoteId, noteApi, onError])

  return (
    <div className={`auto-save-note-editor ${className}`}>
      {/* Header with title and status */}
      <div className="border-b bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="笔记标题..."
              disabled={!editable}
              className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder-gray-400 disabled:opacity-50"
            />
          </div>

          <div className="flex items-center space-x-2">
            <StatusIndicator />

            {editable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSave}
                disabled={autoSave.isSaving}
                className="flex items-center space-x-1"
              >
                <SaveIcon className="h-4 w-4" />
                <span>保存</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Category and Tags Section */}
      {showCategoryTag && (
        <div className="border-b bg-white p-4">
          <div className="space-y-4">
            {/* Category Selector */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 min-w-0">
                <FolderIcon className="h-4 w-4" />
                <span>分类</span>
              </div>
              <div className="flex-1 min-w-0">
                <CategorySelector
                  selectedCategoryId={categoryId}
                  onCategoryChange={handleCategoryChange}
                  placeholder="选择分类..."
                  allowCreate={true}
                  allowEdit={true}
                  allowDelete={true}
                  className="w-full"
                />
              </div>
            </div>

            {/* Tag Input */}
            <div className="flex items-start space-x-3">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 min-w-0 mt-2">
                <TagIcon className="h-4 w-4" />
                <span>标签</span>
              </div>
              <div className="flex-1 min-w-0">
                <TagInput
                  selectedTags={tags}
                  onTagsChange={handleTagsChange}
                  placeholder="添加标签..."
                  allowCreate={true}
                  allowEdit={true}
                  allowDelete={true}
                  maxTags={10}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="min-h-screen">
        <EnhancedMarkdownEditor
          content={content}
          onChange={handleContentChange}
          placeholder={placeholder}
          editable={editable}
          showPreview={true}
        />
      </div>

      {/* Footer with additional info */}
      {showStatus && (
        <div className="border-t bg-gray-50 p-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>
                {content.length} 字符 • {content.split(/\s+/).filter(w => w.length > 0).length} 词
              </span>
              {categoryId && (
                <span className="flex items-center space-x-1">
                  <FolderIcon className="h-3 w-3" />
                  <span>已分类</span>
                </span>
              )}
              {tags.length > 0 && (
                <span className="flex items-center space-x-1">
                  <TagIcon className="h-3 w-3" />
                  <span>{tags.length} 个标签</span>
                </span>
              )}
              {currentNoteId && (
                <span>ID: {currentNoteId}</span>
              )}
              {isCreatingNew && (
                <Badge variant="outline" className="text-xs">
                  新笔记
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {autoSave.isOnline ? (
                <CloudIcon className="h-3 w-3" />
              ) : (
                <CloudOffIcon className="h-3 w-3" />
              )}
              <span>{autoSave.isOnline ? '在线' : '离线'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AutoSaveNoteEditor