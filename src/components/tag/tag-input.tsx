/**
 * Tag Input Component
 *
 * A comprehensive tag input component with autocomplete, creation, and management features
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  TagIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
  EditIcon,
  TrashIcon,
  HashIcon,
  PaletteIcon
} from 'lucide-react'

interface Tag {
  id: number
  name: string
  color: string
  category: string
  description?: string
  usageCount: number
  createdAt: string
}

interface TagInputProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
  allowCreate?: boolean
  allowEdit?: boolean
  allowDelete?: boolean
  maxTags?: number
  className?: string
}

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
]

export default function TagInput({
  selectedTags,
  onTagsChange,
  placeholder = '添加标签...',
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  maxTags = 10,
  className = ''
}: TagInputProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6B7280')
  const [newTagCategory, setNewTagCategory] = useState('general')
  const [newTagDescription, setNewTagDescription] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)

  // Fetch tags on mount
  useEffect(() => {
    fetchTags()
  }, [])

  // Filter available tags based on input
  useEffect(() => {
    if (inputValue) {
      const filtered = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedTags.includes(tag.name)
      )
      setFilteredTags(filtered)
    } else {
      setFilteredTags(availableTags.filter(tag => !selectedTags.includes(tag.name)))
    }
  }, [inputValue, availableTags, selectedTags])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Focus create input when create form shows
  useEffect(() => {
    if (showCreateForm && createInputRef.current) {
      createInputRef.current.focus()
    }
  }, [showCreateForm])

  const fetchTags = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/tags?includeStats=true')
      const result = await response.json()

      if (result.success) {
        setAvailableTags(result.data)
      } else {
        console.error('Failed to fetch tags:', result.error)
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
          category: newTagCategory,
          description: newTagDescription.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchTags()
        setShowCreateForm(false)
        setNewTagName('')
        setNewTagColor('#6B7280')
        setNewTagCategory('general')
        setNewTagDescription('')
        onTagsChange([...selectedTags, result.data.name])
      } else {
        alert(result.error || '创建标签失败')
      }
    } catch (error) {
      console.error('Error creating tag:', error)
      alert('创建标签失败，请稍后重试')
    }
  }

  const handleEditTag = async () => {
    if (!editingTag || !newTagName.trim()) return

    try {
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
          category: newTagCategory,
          description: newTagDescription.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchTags()
        setShowEditForm(false)
        setEditingTag(null)
        setNewTagName('')
        setNewTagColor('#6B7280')
        setNewTagCategory('general')
        setNewTagDescription('')

        // Update selected tags if name changed
        if (editingTag.name !== result.data.name) {
          onTagsChange(selectedTags.map(tag =>
            tag === editingTag.name ? result.data.name : tag
          ))
        }
      } else {
        alert(result.error || '更新标签失败')
      }
    } catch (error) {
      console.error('Error updating tag:', error)
      alert('更新标签失败，请稍后重试')
    }
  }

  const handleDeleteTag = async (tag: Tag) => {
    if (!confirm(`确定要删除标签"${tag.name}"吗？此操作无法撤销。`)) {
      return
    }

    try {
      const response = await fetch(`/api/tags/${tag.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        await fetchTags()
        onTagsChange(selectedTags.filter(selectedTag => selectedTag !== tag.name))
      } else {
        alert(result.error || '删除标签失败')
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
      alert('删除标签失败，请稍后重试')
    }
  }

  const startEditTag = (tag: Tag) => {
    setEditingTag(tag)
    setNewTagName(tag.name)
    setNewTagColor(tag.color)
    setNewTagCategory(tag.category)
    setNewTagDescription(tag.description || '')
    setShowEditForm(true)
  }

  const addTag = (tagName: string) => {
    if (selectedTags.includes(tagName) || selectedTags.length >= maxTags) {
      return
    }
    onTagsChange([...selectedTags, tagName])
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove))
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      const exactMatch = availableTags.find(tag =>
        tag.name.toLowerCase() === inputValue.trim().toLowerCase()
      )

      if (exactMatch) {
        addTag(exactMatch.name)
      } else if (allowCreate) {
        // Create new tag with Enter
        setNewTagName(inputValue.trim())
        setShowCreateForm(true)
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      e.preventDefault()
      removeTag(selectedTags[selectedTags.length - 1])
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
            style={{
              backgroundColor: availableTags.find(t => t.name === tag)?.color + '20' || undefined,
              borderColor: availableTags.find(t => t.name === tag)?.color || undefined,
              color: availableTags.find(t => t.name === tag)?.color || undefined
            }}
          >
            <span className="text-sm">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {selectedTags.length >= maxTags && (
          <span className="text-sm text-gray-500">
            最多 {maxTags} 个标签
          </span>
        )}
      </div>

      {/* Tag Input */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <div className="flex items-center border rounded-lg p-2 bg-white">
              <TagIcon className="h-4 w-4 text-gray-400 mr-2" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setIsOpen(true)}
                placeholder={selectedTags.length === 0 ? placeholder : ''}
                className="flex-1 outline-none bg-transparent text-sm"
                disabled={selectedTags.length >= maxTags}
              />
            </div>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80 max-h-96 overflow-hidden" align="start">
          {/* Search Bar */}
          <div className="p-3 border-b sticky top-0 bg-white">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索标签..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-9 pr-3"
              />
            </div>
          </div>

          {/* Create Tag Form */}
          {showCreateForm && allowCreate && (
            <div className="p-3 border-b bg-gray-50">
              <div className="space-y-2">
                <Input
                  ref={createInputRef}
                  placeholder="标签名称"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full"
                />
                <Input
                  placeholder="描述（可选）"
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  className="w-full"
                />
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <PaletteIcon className="h-4 w-4 text-gray-400" />
                    <div className="flex space-x-1">
                      {TAG_COLORS.slice(0, 8).map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color)}
                          className={`w-6 h-6 rounded border-2 ${
                            newTagColor === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleCreateTag} size="sm" className="flex-1">
                    创建
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewTagName('')
                      setNewTagColor('#6B7280')
                      setNewTagCategory('general')
                      setNewTagDescription('')
                    }}
                    size="sm"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Tag Form */}
          {showEditForm && allowEdit && (
            <div className="p-3 border-b bg-gray-50">
              <div className="space-y-2">
                <Input
                  placeholder="标签名称"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full"
                />
                <Input
                  placeholder="描述（可选）"
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  className="w-full"
                />
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <PaletteIcon className="h-4 w-4 text-gray-400" />
                    <div className="flex space-x-1">
                      {TAG_COLORS.slice(0, 8).map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color)}
                          className={`w-6 h-6 rounded border-2 ${
                            newTagColor === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleEditTag} size="sm" className="flex-1">
                    更新
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false)
                      setEditingTag(null)
                      setNewTagName('')
                      setNewTagColor('#6B7280')
                      setNewTagCategory('general')
                      setNewTagDescription('')
                    }}
                    size="sm"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Available Tags List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                正在加载标签...
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {inputValue ? '没有找到匹配的标签' : '还没有创建标签'}
              </div>
            ) : (
              <div>
                {filteredTags.map(tag => (
                  <DropdownMenuItem
                    key={tag.id}
                    className="flex items-center justify-between py-2 px-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      addTag(tag.name)
                      setInputValue('')
                    }}
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div className="flex-1">
                        <span className="font-medium">{tag.name}</span>
                        {tag.usageCount > 0 && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            {tag.usageCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {allowEdit && (
                      <div className="flex items-center space-x-1 opacity-0 hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            startEditTag(tag)
                          }}
                        >
                          <EditIcon className="h-3 w-3" />
                        </Button>
                        {allowDelete && tag.usageCount === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTag(tag)
                            }}
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </div>

          {/* Create Tag Button */}
          {!showCreateForm && !showEditForm && allowCreate && inputValue && !filteredTags.length && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setNewTagName(inputValue.trim())
                  setShowCreateForm(true)
                }}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                创建标签 "{inputValue.trim()}"
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}