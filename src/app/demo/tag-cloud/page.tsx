/**
 * Tag Cloud Demo Page
 *
 * Comprehensive demonstration of the interactive tag cloud system
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import TagCloud from '@/components/tag/tag-cloud'
import { useTagCloud } from '@/hooks/use-tag-cloud'
import { toast } from 'sonner'
import {
  TagIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  TrendingUpIcon,
  ClockIcon,
  EditIcon,
  TrashIcon,
  AlertCircleIcon,
  BarChartIcon,
  FilterIcon
} from 'lucide-react'

export default function TagCloudDemoPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTagData, setNewTagData] = useState({
    name: '',
    color: '#6B7280',
    category: 'general',
    description: ''
  })

  const {
    tags,
    isLoading,
    error,
    totalTags,
    totalNotes,
    averageUsage,
    categories,
    refreshData,
    createTag,
    updateTag,
    deleteTag,
    clearError,
    searchTags,
    getPopularTags,
    getRecentTags
  } = useTagCloud({
    maxTags: 50,
    autoRefresh: true
  })

  // Get popular and recent tags
  const popularTags = getPopularTags(5)
  const recentTags = getRecentTags(5)

  // Handle tag creation
  const handleCreateTag = async () => {
    if (!newTagData.name.trim()) {
      toast.error('标签名称不能为空')
      return
    }

    const createdTag = await createTag(newTagData)
    if (createdTag) {
      toast.success(`标签 "${createdTag.name}" 创建成功`)
      setShowCreateForm(false)
      setNewTagData({
        name: '',
        color: '#6B7280',
        category: 'general',
        description: ''
      })
    } else {
      toast.error('创建标签失败')
    }
  }

  // Handle tag edit
  const handleTagEdit = (tag: any) => {
    // In a real app, this would open an edit dialog
    const newName = prompt(`编辑标签名称:`, tag.name)
    if (newName && newName.trim() && newName !== tag.name) {
      updateTag(tag.name, { name: newName.trim() }).then(updated => {
        if (updated) {
          toast.success(`标签已更新为 "${updated.name}"`)
        } else {
          toast.error('更新标签失败')
        }
      })
    }
  }

  // Handle tag delete
  const handleTagDelete = (tag: any) => {
    if (confirm(`确定要删除标签"${tag.name}"吗？此操作无法撤销。`)) {
      deleteTag(tag.name).then(success => {
        if (success) {
          toast.success(`标签 "${tag.name}" 已删除`)
        } else {
          toast.error('删除标签失败')
        }
      })
    }
  }

  // Handle tag click
  const handleTagClick = (tag: any) => {
    toast.info(`点击标签: ${tag.name} (${tag.count} 个笔记)`)
    // In a real app, this would filter notes by tag
  }

  // Color palette for tag creation
  const colorPalette = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <TagIcon className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  标签云演示
                </h1>
                <p className="text-sm text-gray-500">
                  交互式标签可视化和管理系统
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isLoading}
                className="flex items-center space-x-1"
              >
                <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>刷新</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center space-x-1"
              >
                <PlusIcon className="h-4 w-4" />
                <span>新建标签</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-900 flex items-center space-x-2">
                <TagIcon className="h-5 w-5" />
                <span>总标签数</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {totalTags}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                已创建标签
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-900 flex items-center space-x-2">
                <BarChartIcon className="h-5 w-5" />
                <span>关联笔记</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totalNotes}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                标签关联总数
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-900 flex items-center space-x-2">
                <TrendingUpIcon className="h-5 w-5" />
                <span>平均使用</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {averageUsage}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                次数/标签
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-900 flex items-center space-x-2">
                <FilterIcon className="h-5 w-5" />
                <span>分类数量</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {categories.length}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                标签分类
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Create Tag Form */}
        {showCreateForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlusIcon className="h-5 w-5" />
                <span>创建新标签</span>
              </CardTitle>
              <CardDescription>
                添加新标签来组织您的笔记
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      标签名称 *
                    </label>
                    <Input
                      placeholder="输入标签名称..."
                      value={newTagData.name}
                      onChange={(e) => setNewTagData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      分类
                    </label>
                    <Input
                      placeholder="标签分类..."
                      value={newTagData.category}
                      onChange={(e) => setNewTagData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    描述
                  </label>
                  <Input
                    placeholder="标签描述（可选）..."
                    value={newTagData.description}
                    onChange={(e) => setNewTagData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    颜色
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorPalette.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-lg border-2 ${
                          newTagData.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={handleCreateTag} className="flex-1">
                    创建标签
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewTagData({
                        name: '',
                        color: '#6B7280',
                        category: 'general',
                        description: ''
                      })
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircleIcon className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="flex items-center justify-between">
                <span>加载标签失败: {error.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="text-red-800 hover:text-red-900"
                >
                  关闭
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Popular and Recent Tags */}
        {(popularTags.length > 0 || recentTags.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {popularTags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUpIcon className="h-5 w-5" />
                    <span>热门标签</span>
                  </CardTitle>
                  <CardDescription>
                    使用频率最高的标签
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {popularTags.map(tag => (
                      <div
                        key={tag.name}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleTagClick(tag)}
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="font-medium">{tag.name}</span>
                        </div>
                        <Badge variant="secondary">{tag.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {recentTags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ClockIcon className="h-5 w-5" />
                    <span>最近使用</span>
                  </CardTitle>
                  <CardDescription>
                    最近更新的标签
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentTags.map(tag => (
                      <div
                        key={tag.name}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleTagClick(tag)}
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="font-medium">{tag.name}</span>
                        </div>
                        <Badge variant="secondary">{tag.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tag Cloud */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TagIcon className="h-6 w-6" />
              <span>标签云</span>
            </CardTitle>
            <CardDescription>
              点击标签查看相关笔记，标签大小表示使用频率
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TagCloud
              tags={tags}
              onTagClick={handleTagClick}
              onTagEdit={handleTagEdit}
              onTagDelete={handleTagDelete}
              onCreateTag={() => setShowCreateForm(true)}
              maxTags={50}
              showSearch={true}
              showSortOptions={true}
              showViewToggle={true}
            />
          </CardContent>
        </Card>

        {/* Categories Overview */}
        {categories.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FilterIcon className="h-5 w-5" />
                <span>分类概览</span>
              </CardTitle>
              <CardDescription>
                按分类组织的标签统计
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(category => {
                  const categoryTags = tags.filter(tag => tag.category === category)
                  const totalUsage = categoryTags.reduce((sum, tag) => sum + tag.count, 0)

                  return (
                    <div key={category} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{category}</h3>
                        <Badge variant="secondary">{categoryTags.length}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {totalUsage} 次使用
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {categoryTags.slice(0, 5).map(tag => (
                          <span
                            key={tag.name}
                            className="px-2 py-1 text-xs rounded-full"
                            style={{
                              backgroundColor: tag.color + '20',
                              color: tag.color
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {categoryTags.length > 5 && (
                          <span className="px-2 py-1 text-xs text-gray-500">
                            +{categoryTags.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}