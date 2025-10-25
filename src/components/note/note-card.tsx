/**
 * Note Card Component
 *
 * Compact card component for displaying note information in lists
 */

'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CalendarIcon,
  EyeIcon,
  FolderIcon,
  TagIcon,
  EditIcon,
  TrashIcon,
  MoreHorizontalIcon,
  LinkIcon
} from 'lucide-react'
import { NoteWithRelations } from '@/types/note'
import { formatDistanceToNow } from '@/lib/utils'

interface NoteCardProps {
  note: NoteWithRelations
  onEdit?: (note: NoteWithRelations) => void
  onDelete?: (note: NoteWithRelations) => void
  onView?: (note: NoteWithRelations) => void
  showActions?: boolean
  className?: string
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onView,
  showActions = true,
  className = ''
}: NoteCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  // Truncate content for preview
  const truncatedContent = useMemo(() => {
    const plainText = note.content
      .replace(/[#*`_~]/g, '') // Remove markdown symbols
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Remove markdown images, keep alt text
      .replace(/```[\s\S]*?```/g, '[代码块]') // Replace code blocks
      .replace(/`[^`]+`/g, '[代码]') // Replace inline code
      .trim()

    return plainText.length > 150
      ? plainText.substring(0, 150) + '...'
      : plainText
  }, [note.content])

  // Get category color and name
  const categoryInfo = useMemo(() => {
    if (!note.category) return null
    return {
      name: note.category.name,
      color: note.category.color,
      icon: note.category.icon
    }
  }, [note.category])

  // Get tag information
  const tagInfo = useMemo(() => {
    return note.noteTags.map(nt => ({
      name: nt.tag.name,
      color: nt.tag.color
    }))
  }, [note.noteTags])

  // Format dates
  const createdTime = useMemo(() => {
    return formatDistanceToNow(new Date(note.createdAt))
  }, [note.createdAt])

  const updatedTime = useMemo(() => {
    return formatDistanceToNow(new Date(note.updatedAt))
  }, [note.updatedAt])

  // Handle card click
  const handleCardClick = () => {
    onView?.(note)
  }

  // Handle edit
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(note)
  }

  // Handle delete
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(note)
  }

  return (
    <Card
      className={`note-card hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between space-y-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold line-clamp-2 leading-tight">
              {note.title}
            </CardTitle>

            {/* Category and Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {categoryInfo && (
                <Badge
                  variant="secondary"
                  className="flex items-center space-x-1 text-xs"
                  style={{
                    backgroundColor: categoryInfo.color + '20',
                    borderColor: categoryInfo.color,
                    color: categoryInfo.color
                  }}
                >
                  <FolderIcon className="h-3 w-3" />
                  <span>{categoryInfo.icon || categoryInfo.name}</span>
                </Badge>
              )}

              {tagInfo.slice(0, 3).map(tag => (
                <Badge
                  key={tag.name}
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: tag.color + '40',
                    color: tag.color
                  }}
                >
                  <TagIcon className="h-3 w-3 mr-1" />
                  {tag.name}
                </Badge>
              ))}

              {tagInfo.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tagInfo.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex items-center space-x-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleEdit}
              >
                <EditIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <CardDescription className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
          {truncatedContent}
        </CardDescription>

        {/* Content preview indicators */}
        <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <span>{note.content.length} 字符</span>
          </div>

          {note.content.includes('http') && (
            <div className="flex items-center space-x-1">
              <LinkIcon className="h-3 w-3" />
              <span>包含链接</span>
            </div>
          )}

          {note.content.includes('```') && (
            <div className="flex items-center space-x-1">
              <span>包含代码</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <CalendarIcon className="h-3 w-3" />
              <span>创建于 {createdTime}</span>
            </div>

            {note.updatedAt !== note.createdAt && (
              <div className="flex items-center space-x-1">
                <span>更新于 {updatedTime}</span>
              </div>
            )}

            {note.viewCount > 0 && (
              <div className="flex items-center space-x-1">
                <EyeIcon className="h-3 w-3" />
                <span>{note.viewCount}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {note.status === 'DRAFT' && (
              <Badge variant="secondary" className="text-xs">
                草稿
              </Badge>
            )}

            {note.isPublic && (
              <Badge variant="outline" className="text-xs">
                公开
              </Badge>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

// Helper function for formatting relative time
function formatDistanceToNow(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return '刚刚'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}小时前`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays}天前`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths}个月前`
  }

  const diffInYears = Math.floor(diffInMonths / 12)
  return `${diffInYears}年前`
}