/**
 * T026 [US1] Create NoteCard component for note display in src/components/notes/note-card.tsx
 *
 * Card component for displaying note previews with metadata,
 * including title preview, excerpt, tags, categories, and actions.
 */

'use client'

import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  Archive,
  ArchiveBox,
  MoreHorizontal,
  Edit,
  Trash,
  Eye,
  CopyIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NoteCardProps {
  note: {
    id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
    isFavorite: boolean
    isArchived: boolean
    category?: {
      id: number
      name: string
      color: string
    } | null
    tags?: Array<{
      id: number
      name: string
      color: string
    }>
    viewCount?: number
  }
  onEdit?: (noteId: string) => void
  onDelete?: (noteId: string, permanent?: boolean) => void
  onArchive?: (noteId: string) => void
  onToggleFavorite?: (noteId: string) => void
  onDuplicate?: (noteId: string) => void
  className?: string
  showActions?: boolean
}

export function NoteCard({
  note,
  onEdit,
  onDelete,
  onArchive,
  onToggleFavorite,
  onDuplicate,
  className = '',
  showActions = true,
}: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  // Generate excerpt from content
  const getExcerpt = (content: string, maxLength: number = 150) => {
    // Remove HTML tags
    const plainText = content.replace(/<[^>]*>/g, '')
    if (plainText.length <= maxLength) return plainText
    return plainText.substring(0, maxLength).trim() + '...'
  }

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN })
    } catch {
      return dateString
    }
  }

  const handleDelete = async (permanent: boolean = false) => {
    if (isDeleting) return

    const confirmMessage = permanent
      ? '确定要永久删除这个笔记吗？此操作无法撤销。'
      : '确定要归档这个笔记吗？'

    if (!window.confirm(confirmMessage)) return

    setIsDeleting(true)
    try {
      await onDelete?.(note.id, permanent)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleArchive = async () => {
    if (isDeleting) return

    const action = note.isArchived ? '恢复' : '归档'
    const confirmMessage = `确定要${action}这个笔记吗？`

    if (!window.confirm(confirmMessage)) return

    setIsDeleting(true)
    try {
      await onArchive?.(note.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleFavorite = async () => {
    try {
      await onToggleFavorite?.(note.id)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleDuplicate = async () => {
    try {
      await onDuplicate?.(note.id)
    } catch (error) {
      console.error('Failed to duplicate note:', error)
    }
  }

  return (
    <Card className={`hover:shadow-md transition-shadow duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link href={`/notes/${note.id}`}>
              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer">
                {note.title || '无标题'}
              </h3>
            </Link>

            {/* Category */}
            {note.category && (
              <Badge
                variant="secondary"
                className="mt-2 inline-flex items-center"
                style={{ backgroundColor: note.category.color + '20', color: note.category.color }}
              >
                {note.category.name}
              </Badge>
            )}
          </div>

          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className="ml-2 flex-shrink-0"
            disabled={isDeleting}
          >
            {note.isFavorite ? (
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
            ) : (
              <Star className="h-5 w-5 text-gray-400 hover:text-yellow-500" />
            )}
          </Button>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Content Excerpt */}
        <p className="text-gray-600 text-sm line-clamp-3 mb-3">
          {getExcerpt(note.content)}
        </p>

        {/* Metadata */}
        <div className="flex items-center text-xs text-gray-500 space-x-4">
          <span>
            {note.isArchived ? (
              <ArchiveBox className="h-4 w-4 inline mr-1" />
            ) : (
              <>
                更新于 {formatDate(note.updatedAt)}
                {note.viewCount && (
                  <>
                    <span className="mx-1">•</span>
                    <Eye className="h-3 w-3 inline mr-1" />
                    {note.viewCount}
                  </>
                )}
              </>
            )}
          </span>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="pt-3">
          <div className="flex items-center justify-between">
            {/* View Button */}
            <Link href={`/notes/${note.id}`}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                查看
              </Button>
            </Link>

            {/* Action Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isDeleting}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(note.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleDuplicate}>
                  <CopyIcon className="h-4 w-4 mr-2" />
                  复制
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => window.open(`/notes/${note.id}`, '_blank')}
                >
                  <ExternalLinkIcon className="h-4 w-4 mr-2" />
                  在新标签页打开
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  {note.isArchived ? '恢复' : '归档'}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleDelete(false)}
                  className="text-orange-600"
                >
                  <ArchiveBox className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleDelete(true)}
                  className="text-red-600"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  永久删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

export default NoteCard