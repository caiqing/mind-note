/**
 * NoteMetadataPanel Component
 *
 * Sidebar panel for managing note metadata like categories, tags, and status
 */

'use client'

import { useState } from 'react'
import {
  TagIcon,
  FolderIcon,
  StarIcon,
  ArchiveBoxIcon,
  PlusIcon,
  XIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

interface Category {
  id: number
  name: string
  color: string
}

interface Tag {
  id: number
  name: string
  color: string
}

interface Note {
  id: string
  title: string
  isFavorite: boolean
  isArchived: boolean
  categoryId?: number
  tags?: Array<{
    id: number
    name: string
    color: string
  }>
}

interface NoteMetadataPanelProps {
  note: Note
  categories: Category[]
  tags: Tag[]
  onUpdate: (updates: Partial<Note>) => void
}

export function NoteMetadataPanel({
  note,
  categories,
  tags,
  onUpdate
}: NoteMetadataPanelProps) {
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(note.categoryId || null)
  const [selectedTags, setSelectedTags] = useState<Set<number>>(
    new Set(note.tags?.map(tag => tag.id) || [])
  )

  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategory(categoryId)
    onUpdate({ categoryId: categoryId })
  }

  const handleTagToggle = (tagId: number) => {
    const newSelectedTags = new Set(selectedTags)
    if (newSelectedTags.has(tagId)) {
      newSelectedTags.delete(tagId)
    } else {
      newSelectedTags.add(tagId)
    }
    setSelectedTags(newSelectedTags)

    const updatedTags = Array.from(newSelectedTags).map(id =>
      tags.find(tag => tag.id === id)
    ).filter(Boolean)

    onUpdate({ tags: updatedTags })
  }

  const handleAddTag = () => {
    if (!newTagName.trim()) return

    // In real implementation, this would call an API to create a new tag
    const newTag: Tag = {
      id: Math.max(...tags.map(t => t.id), 0) + 1,
      name: newTagName.trim(),
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    }

    // Add to tags list (in real app, this would update the global state)
    const updatedTags = [
      ...tags,
      newTag
    ]

    // Select the new tag
    setSelectedTags(prev => new Set([...prev, newTag.id]))
    setNewTagName('')
    setIsAddingTag(false)

    // Update note with new tag
    const noteTags = Array.from(selectedTags).map(id =>
      updatedTags.find(tag => tag.id === id)
    ).filter(Boolean)
    noteTags.push(newTag)

    onUpdate({ tags: noteTags })
  }

  const handleFavoriteToggle = () => {
    onUpdate({ isFavorite: !note.isFavorite })
  }

  const handleArchiveToggle = () => {
    onUpdate({ isArchived: !note.isArchived })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">笔记设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <StarIcon className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">收藏</span>
            </div>
            <Switch
              checked={note.isFavorite}
              onCheckedChange={handleFavoriteToggle}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArchiveBoxIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">归档</span>
            </div>
            <Switch
              checked={note.isArchived}
              onCheckedChange={handleArchiveToggle}
            />
          </div>
        </div>

        <Separator />

        {/* Category Selection */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <FolderIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">分类</span>
          </div>

          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                  selectedCategory === category.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm">{category.name}</span>
                </div>
              </button>
            ))}

            <button
              onClick={() => handleCategoryChange(null)}
              className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                selectedCategory === null
                  ? 'border-gray-500 bg-gray-100 text-gray-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm text-gray-500">无分类</span>
            </button>
          </div>
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TagIcon className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">标签</span>
            </div>
            {!isAddingTag ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingTag(true)}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="新标签"
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTag()
                    } else if (e.key === 'Escape') {
                      setIsAddingTag(false)
                      setNewTagName('')
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingTag(false)
                    setNewTagName('')
                  }}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.has(tag.id) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selectedTags.has(tag.id)
                    ? ''
                    : 'hover:bg-gray-100'
                }`}
                style={{
                  borderColor: tag.color,
                  ...(selectedTags.has(tag.id) && {
                    backgroundColor: tag.color,
                    color: 'white'
                  })
                }}
                onClick={() => handleTagToggle(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Note Info */}
        <Separator />
        <div className="text-xs text-gray-500 space-y-1">
          <div>创建时间: {new Date(note.createdAt).toLocaleString()}</div>
          <div>更新时间: {new Date(note.updatedAt).toLocaleString()}</div>
          <div>版本: v{note.version}</div>
        </div>
      </CardContent>
    </Card>
  )
}