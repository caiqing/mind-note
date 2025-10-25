/**
 * Simple Category Demo Page
 *
 * Basic demonstration of category management functionality
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import CategorySelector from '@/components/category/category-selector'
import { FolderIcon, PlusIcon, CheckCircleIcon } from 'lucide-react'

export default function CategorySimpleDemo() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [savedCategories, setSavedCategories] = useState<Array<{id: number, name: string}>>([])

  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId)
    console.log('Selected category:', categoryId)
  }

  const handleSaveCategory = () => {
    if (selectedCategoryId) {
      // 模拟保存分类
      setSavedCategories(prev => [...prev, { id: selectedCategoryId, name: `分类 ${selectedCategoryId}` }])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <FolderIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  分类管理演示
                </h1>
                <p className="text-sm text-gray-500">
                  简化版分类选择和管理功能
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FolderIcon className="h-5 w-5" />
                <span>分类选择器</span>
              </CardTitle>
              <CardDescription>
                选择或创建笔记分类，支持层级结构和搜索功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    选择分类
                  </label>
                  <CategorySelector
                    value={selectedCategoryId}
                    onChange={handleCategoryChange}
                    placeholder="请选择分类..."
                    allowCreate={true}
                    showStats={true}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleSaveCategory}
                    disabled={!selectedCategoryId}
                    size="sm"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    保存选择
                  </Button>

                  {selectedCategoryId && (
                    <Badge variant="secondary">
                      已选择分类 ID: {selectedCategoryId}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Panel */}
          <Card>
            <CardHeader>
              <CardTitle>状态面板</CardTitle>
              <CardDescription>
                显示当前选择和操作状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">当前选择</h4>
                  <div className="p-3 bg-gray-50 rounded-md">
                    {selectedCategoryId ? (
                      <p className="text-sm">
                        <span className="font-medium">分类ID:</span> {selectedCategoryId}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">未选择分类</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">已保存分类</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {savedCategories.length > 0 ? (
                      savedCategories.map((cat, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <span className="text-sm">{cat.name}</span>
                          <Badge variant="outline">{cat.id}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">暂无保存的分类</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">功能说明</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• 支持搜索现有分类</li>
                    <li>• 可以创建新的分类</li>
                    <li>• 支持层级分类结构</li>
                    <li>• 显示分类使用统计</li>
                    <li>• 内联编辑分类名称</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Overview */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>CategorySelector 组件特性</CardTitle>
            <CardDescription>
              完整的分类管理功能列表
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: '搜索功能', desc: '快速搜索现有分类', icon: '🔍' },
                { title: '创建分类', desc: '内联创建新分类', icon: '➕' },
                { title: '层级结构', desc: '支持父子分类关系', icon: '📊' },
                { title: '统计信息', desc: '显示分类使用统计', icon: '📈' },
                { title: '编辑功能', desc: '内联编辑分类信息', icon: '✏️' },
                { title: '颜色标记', desc: '分类颜色视觉区分', icon: '🎨' }
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="text-2xl">{feature.icon}</div>
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-gray-600">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}