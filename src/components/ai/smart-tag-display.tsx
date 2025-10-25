/**
 * 智能标签显示和管理组件 (T113)
 *
 * 提供美观的标签展示、编辑和管理功能
 * 支持色彩区分、交互功能和批量操作
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { X, Edit2, Plus, Filter, Tag as TagIcon, Hash, Star, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

// 标签类型定义
export interface SmartTag {
  id: string
  name: string
  category: 'content' | 'emotion' | 'topic' | 'priority' | 'custom' | 'system'
  color: string
  relevance: number // 相关性评分 0-1
  confidence: number // 置信度 0-1
  count?: number // 使用次数
  description?: string
  createdAt: string
  isUserGenerated?: boolean
  metadata?: Record<string, any>
}

export interface TagGroup {
  category: SmartTag['category']
  tags: SmartTag[]
  color: string
  icon: React.ReactNode
  label: string
}

export interface SmartTagDisplayProps {
  /** 标签列表 */
  tags: SmartTag[]
  /** 显示模式 */
  mode?: 'compact' | 'detailed' | 'editable' | 'categorized'
  /** 最大显示数量 */
  maxVisible?: number
  /** 是否允许编辑 */
  editable?: boolean
  /** 是否允许删除 */
  deletable?: boolean
  /** 是否允许添加 */
  allowAdd?: boolean
  /** 分类显示 */
  showCategories?: boolean
  /** 显示相关性 */
  showRelevance?: boolean
  /** 显示置信度 */
  showConfidence?: boolean
  /** 点击回调 */
  onTagClick?: (tag: SmartTag) => void
  /** 标签编辑回调 */
  onTagEdit?: (tag: SmartTag) => void
  /** 标签删除回调 */
  onTagDelete?: (tagId: string) => void
  /** 标签添加回调 */
  onTagAdd?: (tagName: string, category: SmartTag['category']) => Promise<SmartTag | null>
  /** 批量操作回调 */
  onBatchAction?: (action: string, tagIds: string[]) => void
  /** 自定义样式类 */
  className?: string
}

// 标签色彩系统
const TAG_COLORS = {
  content: ['bg-blue-100 text-blue-800 border-blue-200', 'bg-blue-500'],
  emotion: ['bg-pink-100 text-pink-800 border-pink-200', 'bg-pink-500'],
  topic: ['bg-green-100 text-green-800 border-green-200', 'bg-green-500'],
  priority: ['bg-red-100 text-red-800 border-red-200', 'bg-red-500'],
  custom: ['bg-purple-100 text-purple-800 border-purple-200', 'bg-purple-500'],
  system: ['bg-gray-100 text-gray-800 border-gray-200', 'bg-gray-500'],
}

const CATEGORY_COLORS = {
  content: 'border-blue-300 bg-blue-50',
  emotion: 'border-pink-300 bg-pink-50',
  topic: 'border-green-300 bg-green-50',
  priority: 'border-red-300 bg-red-50',
  custom: 'border-purple-300 bg-purple-50',
  system: 'border-gray-300 bg-gray-50',
}

const CATEGORY_ICONS = {
  content: <TagIcon className="h-4 w-4" />,
  emotion: <Star className="h-4 w-4" />,
  topic: <Hash className="h-4 w-4" />,
  priority: <TrendingUp className="h-4 w-4" />,
  custom: <Edit2 className="h-4 w-4" />,
  system: <Filter className="h-4 w-4" />,
}

const CATEGORY_LABELS = {
  content: '内容标签',
  emotion: '情感标签',
  topic: '主题标签',
  priority: '优先级标签',
  custom: '自定义标签',
  system: '系统标签',
}

export function SmartTagDisplay({
  tags,
  mode = 'compact',
  maxVisible = 10,
  editable = false,
  deletable = false,
  allowAdd = false,
  showCategories = false,
  showRelevance = false,
  showConfidence = false,
  onTagClick,
  onTagEdit,
  onTagDelete,
  onTagAdd,
  onBatchAction,
  className,
}: SmartTagDisplayProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [editingTag, setEditingTag] = useState<SmartTag | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagCategory, setNewTagCategory] = useState<SmartTag['category']>('content')
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // 按分类组织标签
  const groupedTags = useMemo(() => {
    const groups: Record<SmartTag['category'], SmartTag[]> = {
      content: [],
      emotion: [],
      topic: [],
      priority: [],
      custom: [],
      system: [],
    }

    tags.forEach(tag => {
      groups[tag.category].push(tag)
    })

    return Object.entries(groups)
      .filter(([_, tags]) => tags.length > 0)
      .map(([category, tags]) => ({
        category: category as SmartTag['category'],
        tags: tags.sort((a, b) => b.relevance - a.relevance),
        color: CATEGORY_COLORS[category as SmartTag['category']],
        icon: CATEGORY_ICONS[category as SmartTag['category']],
        label: CATEGORY_LABELS[category as SmartTag['category']],
      }))
  }, [tags])

  // 显示的标签列表
  const visibleTags = useMemo(() => {
    if (showAll) return tags
    return tags.slice(0, maxVisible)
  }, [tags, maxVisible, showAll])

  // 处理标签点击
  const handleTagClick = useCallback((tag: SmartTag) => {
    if (mode === 'editable') {
      setSelectedTags(prev => {
        const newSet = new Set(prev)
        if (newSet.has(tag.id)) {
          newSet.delete(tag.id)
        } else {
          newSet.add(tag.id)
        }
        return newSet
      })
    }

    onTagClick?.(tag)
  }, [mode, onTagClick])

  // 处理标签编辑
  const handleTagEdit = useCallback((tag: SmartTag) => {
    setEditingTag(tag)
    onTagEdit?.(tag)
  }, [onTagEdit])

  // 处理标签删除
  const handleTagDelete = useCallback((tagId: string) => {
    onTagDelete?.(tagId)
    toast.success('标签已删除')
  }, [onTagDelete])

  // 处理添加标签
  const handleAddTag = useCallback(async () => {
    if (!newTagName.trim() || !onTagAdd) return

    setIsAddingTag(true)
    try {
      const newTag = await onTagAdd(newTagName.trim(), newTagCategory)
      if (newTag) {
        setNewTagName('')
        toast.success('标签添加成功')
      }
    } catch (error) {
      toast.error('添加标签失败')
    } finally {
      setIsAddingTag(false)
    }
  }, [newTagName, newTagCategory, onTagAdd])

  // 获取标签样式
  const getTagStyle = useCallback((tag: SmartTag) => {
    const baseColors = TAG_COLORS[tag.category]
    const relevance = tag.relevance

    // 根据相关性调整透明度
    const opacity = 0.5 + (relevance * 0.5)

    return cn(
      baseColors[0],
      'inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium border cursor-pointer transition-all duration-200 hover:shadow-md',
      `opacity-${Math.round(opacity * 100)}`,
      selectedTags.has(tag.id) && 'ring-2 ring-offset-2 ring-blue-500'
    )
  }, [selectedTags])

  // 渲染单个标签
  const renderTag = useCallback((tag: SmartTag) => {
    const isSelected = selectedTags.has(tag.id)

    return (
      <Badge
        key={tag.id}
        className={getTagStyle(tag)}
        variant="outline"
        onClick={() => handleTagClick(tag)}
      >
        {showRelevance && (
          <span className="w-1 h-1 rounded-full bg-current mr-1"
                style={{ opacity: tag.relevance }} />
        )}

        <span className="max-w-20 truncate">{tag.name}</span>

        {showConfidence && (
          <span className="text-xs opacity-70 ml-1">
            {Math.round(tag.confidence * 100)}%
          </span>
        )}

        {editable && (
          <Button
            size="sm"
            variant="ghost"
            className="h-4 w-4 p-0 ml-1 hover:bg-inherit"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedTags(prev => {
                const newSet = new Set(prev)
                newSet.toggle(tag.id)
                return newSet
              })
            }}
          >
            {isSelected && <X className="h-3 w-3" />}
          </Button>
        )}

        {deletable && (
          <Button
            size="sm"
            variant="ghost"
            className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation()
              handleTagDelete(tag.id)
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </Badge>
    )
  }, [getTagStyle, showRelevance, showConfidence, editable, deletable, selectedTags, handleTagClick, handleTagDelete])

  // 渲染分类视图
  const renderCategorizedView = () => {
    return (
      <div className="space-y-4">
        {groupedTags.map(group => (
          <div key={group.category} className={cn('p-3 rounded-lg border', group.color)}>
            <div className="flex items-center gap-2 mb-3">
              {group.icon}
              <h4 className="font-medium text-sm">{group.label}</h4>
              <Badge variant="secondary" className="text-xs">
                {group.tags.length}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {group.tags.slice(0, showAll ? undefined : 5).map(renderTag)}
              {!showAll && group.tags.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{group.tags.length - 5} 更多
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 渲染紧凑视图
  const renderCompactView = () => {
    return (
      <div className="flex flex-wrap gap-2">
        {visibleTags.map(renderTag)}
        {!showAll && tags.length > maxVisible && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(true)}
            className="text-xs"
          >
            +{tags.length - maxVisible} 个标签
          </Button>
        )}
      </div>
    )
  }

  // 渲染详细视图
  const renderDetailedView = () => {
    return (
      <div className="space-y-3">
        {tags.map(tag => (
          <div
            key={tag.id}
            className={cn(
              'p-3 rounded-lg border flex items-center justify-between',
              getTagStyle(tag),
              'cursor-pointer'
            )}
            onClick={() => handleTagClick(tag)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{tag.name}</span>
                {tag.description && (
                  <span className="text-xs opacity-70">{tag.description}</span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1 text-xs opacity-70">
                <span>相关性: {Math.round(tag.relevance * 100)}%</span>
                <span>置信度: {Math.round(tag.confidence * 100)}%</span>
                {tag.count && <span>使用: {tag.count}次</span>}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {editable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTagEdit(tag)
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}

              {deletable && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>删除标签</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定要删除标签 "{tag.name}" 吗？此操作无法撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleTagDelete(tag.id)}>
                        删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部操作栏 */}
      {(editable || allowAdd) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">智能标签</h3>
            <Badge variant="secondary">{tags.length}</Badge>
          </div>

          <div className="flex items-center gap-2">
            {allowAdd && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    添加标签
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>添加新标签</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">标签名称</label>
                      <Input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="输入标签名称"
                        maxLength={50}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">标签分类</label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <Button
                            key={key}
                            variant={newTagCategory === key ? "default" : "outline"}
                            size="sm"
                            onClick={() => setNewTagCategory(key as SmartTag['category'])}
                            className="text-xs"
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setNewTagName('')}>
                        取消
                      </Button>
                      <Button
                        onClick={handleAddTag}
                        disabled={!newTagName.trim() || isAddingTag}
                      >
                        {isAddingTag ? '添加中...' : '添加'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {editable && selectedTags.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    批量操作 ({selectedTags.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => {
                    onBatchAction?.('delete', Array.from(selectedTags))
                    setSelectedTags(new Set())
                  }}>
                    删除选中标签
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    onBatchAction?.('merge', Array.from(selectedTags))
                    setSelectedTags(new Set())
                  }}>
                    合并选中标签
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    onBatchAction?.('export', Array.from(selectedTags))
                  }}>
                    导出选中标签
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* 标签展示区域 */}
      <div className="min-h-[100px]">
        {mode === 'categorized' && renderCategorizedView()}
        {mode === 'compact' && renderCompactView()}
        {mode === 'detailed' && renderDetailedView()}
        {mode === 'editable' && renderCompactView()}
      </div>

      {/* 标签编辑对话框 */}
      {editingTag && (
        <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑标签</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">标签名称</label>
                <Input defaultValue={editingTag.name} />
              </div>

              <div>
                <label className="text-sm font-medium">描述</label>
                <Input defaultValue={editingTag.description || ''} placeholder="可选描述" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTag(null)}>
                  取消
                </Button>
                <Button>保存修改</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 空状态 */}
      {tags.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <TagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>暂无标签</p>
          {allowAdd && (
            <p className="text-sm mt-2">点击上方按钮添加第一个标签</p>
          )}
        </div>
      )}
    </div>
  )
}

export default SmartTagDisplay