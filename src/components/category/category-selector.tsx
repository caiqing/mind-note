/**
 * Category Selector Component
 *
 * A comprehensive category selection component with dropdown, search, and management features
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
  FolderIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
  EditIcon,
  TrashIcon,
  FolderOpenIcon,
  HashIcon
} from 'lucide-react'

interface Category {
  id: number
  name: string
  description?: string
  icon?: string
  color: string
  parentId?: number
  sortOrder: number
  _count?: {
    notes: number
  }
  parent?: {
    id: number
    name: string
  }
  children?: Array<{
    id: number
    name: string
    sortOrder: number
    _count?: {
      notes: number
    }
  }>
}

interface CategorySelectorProps {
  selectedCategoryId?: number | null
  onCategoryChange: (categoryId: number | null) => void
  placeholder?: string
  allowCreate?: boolean
  allowEdit?: boolean
  allowDelete?: boolean
  className?: string
}

export default function CategorySelector({
  selectedCategoryId,
  onCategoryChange,
  placeholder = '选择分类',
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  className = ''
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#6B7280')
  const [newCategoryIcon, setNewCategoryIcon] = useState('')
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Focus create input when create form shows
  useEffect(() => {
    if (showCreateForm && createInputRef.current) {
      createInputRef.current.focus()
    }
  }, [showCreateForm])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/categories?includeStats=true')
      const result = await response.json()

      if (result.success) {
        setCategories(result.data)
      } else {
        console.error('Failed to fetch categories:', result.error)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || undefined,
          color: newCategoryColor,
          icon: newCategoryIcon.trim() || undefined,
          parentId: selectedParentId,
          sortOrder: 0
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchCategories()
        setShowCreateForm(false)
        setNewCategoryName('')
        setNewCategoryDescription('')
        setNewCategoryColor('#6B7280')
        setNewCategoryIcon('')
        setSelectedParentId(null)
        onCategoryChange(result.data.id)
      } else {
        alert(result.error || '创建分类失败')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('创建分类失败，请稍后重试')
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || undefined,
          color: newCategoryColor,
          icon: newCategoryIcon.trim() || undefined,
          parentId: selectedParentId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchCategories()
        setShowEditForm(false)
        setEditingCategory(null)
        setNewCategoryName('')
        setNewCategoryDescription('')
        setNewCategoryColor('#6B7280')
        setNewCategoryIcon('')
        setSelectedParentId(null)
      } else {
        alert(result.error || '更新分类失败')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      alert('更新分类失败，请稍后重试')
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`确定要删除分类"${category.name}"吗？此操作无法撤销。`)) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        await fetchCategories()
        if (selectedCategoryId === category.id) {
          onCategoryChange(null)
        }
      } else {
        alert(result.error || '删除分类失败')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('删除分类失败，请稍后重试')
    }
  }

  const startEditCategory = (category: Category) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setNewCategoryDescription(category.description || '')
    setNewCategoryColor(category.color)
    setNewCategoryIcon(category.icon || '')
    setSelectedParentId(category.parentId || null)
    setShowEditForm(true)
  }

  const getSelectedCategory = () => {
    return categories.find(cat => cat.id === selectedCategoryId)
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderCategoryIcon = (icon?: string, color?: string) => {
    if (icon) {
      return <span style={{ color }}>{icon}</span>
    }
    return <FolderIcon className="h-4 w-4" style={{ color: color || '#6B7280' }} />
  }

  const renderCategoryTree = (categories: Category[], level = 0) => {
    return categories.map(category => (
      <div key={category.id}>
        <DropdownMenuItem
          className="flex items-center justify-between py-2 px-2 cursor-pointer hover:bg-gray-50"
          onClick={() => {
            onCategoryChange(category.id)
            setIsOpen(false)
          }}
        >
          <div className="flex items-center space-x-2 flex-1">
            <div style={{ paddingLeft: `${level * 16}px` }}>
              {renderCategoryIcon(category.icon, category.color)}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{category.name}</span>
                {category._count && category._count.notes > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {category._count.notes}
                  </Badge>
                )}
              </div>
              {category.description && (
                <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
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
                  startEditCategory(category)
                }}
              >
                <EditIcon className="h-3 w-3" />
              </Button>
              {allowDelete && category._count?.notes === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCategory(category)
                  }}
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </DropdownMenuItem>

        {category.children && category.children.length > 0 && (
          renderCategoryTree(category.children, level + 1)
        )}
      </div>
    ))
  }

  const selectedCategory = getSelectedCategory()

  return (
    <div className={`relative ${className}`}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-left"
            onClick={() => setIsOpen(true)}
          >
            <div className="flex items-center space-x-2 flex-1">
              {selectedCategory ? (
                <>
                  {renderCategoryIcon(selectedCategory.icon, selectedCategory.color)}
                  <span className="truncate">{selectedCategory.name}</span>
                </>
              ) : (
                <>
                  <FolderIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">{placeholder}</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {selectedCategory && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCategoryChange(null)
                  }}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80 max-h-96 overflow-hidden" align="start">
          {/* Search Bar */}
          <div className="p-3 border-b">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="搜索分类..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3"
              />
            </div>
          </div>

          {/* Create Category Form */}
          {showCreateForm && allowCreate && (
            <div className="p-3 border-b bg-gray-50">
              <div className="space-y-2">
                <Input
                  ref={createInputRef}
                  placeholder="分类名称"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full"
                />
                <Input
                  placeholder="描述（可选）"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  className="w-full"
                />
                <div className="flex space-x-2">
                  <Input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    placeholder="图标（可选）"
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleCreateCategory} size="sm" className="flex-1">
                    创建
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewCategoryName('')
                      setNewCategoryDescription('')
                      setNewCategoryColor('#6B7280')
                      setNewCategoryIcon('')
                    }}
                    size="sm"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Category Form */}
          {showEditForm && allowEdit && (
            <div className="p-3 border-b bg-gray-50">
              <div className="space-y-2">
                <Input
                  placeholder="分类名称"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full"
                />
                <Input
                  placeholder="描述（可选）"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  className="w-full"
                />
                <div className="flex space-x-2">
                  <Input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    placeholder="图标（可选）"
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleEditCategory} size="sm" className="flex-1">
                    更新
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false)
                      setEditingCategory(null)
                      setNewCategoryName('')
                      setNewCategoryDescription('')
                      setNewCategoryColor('#6B7280')
                      setNewCategoryIcon('')
                    }}
                    size="sm"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Category List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                正在加载分类...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? '没有找到匹配的分类' : '还没有创建分类'}
              </div>
            ) : (
              <div>
                {/* No Category Option */}
                <DropdownMenuItem
                  className="flex items-center space-x-2 py-2 px-2"
                  onClick={() => {
                    onCategoryChange(null)
                    setIsOpen(false)
                  }}
                >
                  <HashIcon className="h-4 w-4 text-gray-400" />
                  <span>无分类</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Categories Tree */}
                {renderCategoryTree(
                  filteredCategories.filter(cat => !cat.parentId)
                )}
              </div>
            )}
          </div>

          {/* Create Category Button */}
          {!showCreateForm && !showEditForm && allowCreate && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowCreateForm(true)}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                新建分类
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}