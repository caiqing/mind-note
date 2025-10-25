/**
 * 智能标签组件演示页面
 */

'use client'

import React, { useState, useEffect } from 'react'
import { SmartTagDisplay, type SmartTag } from './smart-tag-display'
import { smartTagManager } from '@/lib/ai/smart-tag-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { BarChart3, Tags, TrendingUp, Users, Plus, Search } from 'lucide-react'

export function SmartTagDemo() {
  const [tags, setTags] = useState<SmartTag[]>([])
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadTags()
    loadAnalytics()
  }, [])

  const loadTags = () => {
    const allTags = smartTagManager.getAllTags()
    setTags(allTags)
  }

  const loadAnalytics = () => {
    const data = smartTagManager.getAnalytics()
    setAnalytics(data)
  }

  const handleTagAdd = async (name: string, category: SmartTag['category']) => {
    const newTag = await smartTagManager.createTag(name, category)
    if (newTag) {
      loadTags()
      loadAnalytics()
      return newTag
    }
    return null
  }

  const handleTagEdit = async (tag: SmartTag) => {
    const updatedTag = await smartTagManager.updateTag(tag.id, {
      description: prompt('请输入标签描述:', tag.description || '') || tag.description,
    })
    if (updatedTag) {
      loadTags()
      toast.success('标签已更新')
    }
  }

  const handleTagDelete = async (tagId: string) => {
    const success = await smartTagManager.deleteTag(tagId)
    if (success) {
      loadTags()
      loadAnalytics()
    }
  }

  const handleTagClick = (tag: SmartTag) => {
    smartTagManager.incrementTagUsage(tag.id)
    toast.success(`已使用标签: ${tag.name}`)
  }

  const handleBatchAction = async (action: string, tagIds: string[]) => {
    const success = await smartTagManager.batchOperation(action, tagIds)
    if (success) {
      loadTags()
      loadAnalytics()
      toast.success(`批量${action}操作完成`)
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const searchResults = smartTagManager.searchTags(searchQuery)
      setTags(searchResults)
    } else {
      loadTags()
    }
  }

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category)
    if (category === 'all') {
      loadTags()
    } else {
      const filtered = smartTagManager.filterTags({
        categories: [category as SmartTag['category']],
      })
      setTags(filtered)
    }
  }

  const generateSampleTags = async () => {
    setLoading(true)
    try {
      const sampleTags = [
        { name: 'React开发', category: 'content' as const },
        { name: 'TypeScript', category: 'topic' as const },
        { name: '积极向上', category: 'emotion' as const },
        { name: '紧急处理', category: 'priority' as const },
        { name: '学习笔记', category: 'custom' as const },
        { name: '项目管理', category: 'content' as const },
        { name: '设计模式', category: 'topic' as const },
        { name: '代码优化', category: 'custom' as const },
      ]

      for (const tagData of sampleTags) {
        await smartTagManager.createTag(tagData.name, tagData.category)
      }

      loadTags()
      loadAnalytics()
      toast.success('示例标签已生成')
    } catch (error) {
      toast.error('生成示例标签失败')
    } finally {
      setLoading(false)
    }
  }

  const filteredTags = selectedCategory === 'all'
    ? tags
    : tags.filter(tag => tag.category === selectedCategory)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">智能标签系统演示</h1>
          <p className="text-muted-foreground mt-2">
            展示T113智能标签显示和管理组件的功能特性
          </p>
        </div>
        <Button onClick={generateSampleTags} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          {loading ? '生成中...' : '生成示例标签'}
        </Button>
      </div>

      {/* 统计信息 */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总标签数</CardTitle>
              <Tags className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalTags}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均相关性</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(analytics.averageRelevance * 100)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均置信度</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(analytics.averageConfidence * 100)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">分类数量</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(analytics.categoryDistribution).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 搜索和过滤 */}
      <Card>
        <CardHeader>
          <CardTitle>搜索和过滤</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索标签..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleSearch}>搜索</Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryFilter('all')}
            >
              全部
            </Button>
            {['content', 'emotion', 'topic', 'priority', 'custom', 'system'].map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryFilter(category)}
              >
                {category === 'content' && '内容'}
                {category === 'emotion' && '情感'}
                {category === 'topic' && '主题'}
                {category === 'priority' && '优先级'}
                {category === 'custom' && '自定义'}
                {category === 'system' && '系统'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 标签展示 */}
      <Tabs defaultValue="compact" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compact">紧凑模式</TabsTrigger>
          <TabsTrigger value="detailed">详细模式</TabsTrigger>
          <TabsTrigger value="categorized">分类模式</TabsTrigger>
          <TabsTrigger value="editable">编辑模式</TabsTrigger>
        </TabsList>

        <TabsContent value="compact">
          <Card>
            <CardHeader>
              <CardTitle>紧凑模式</CardTitle>
              <CardDescription>
                以简洁的标签形式展示，适合在列表中使用
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmartTagDisplay
                tags={filteredTags}
                mode="compact"
                maxVisible={15}
                showRelevance={true}
                allowAdd={true}
                onTagClick={handleTagClick}
                onTagAdd={handleTagAdd}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle>详细模式</CardTitle>
              <CardDescription>
                显示标签的详细信息，包括相关性、置信度等指标
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmartTagDisplay
                tags={filteredTags}
                mode="detailed"
                showRelevance={true}
                showConfidence={true}
                editable={true}
                deletable={true}
                onTagClick={handleTagClick}
                onTagEdit={handleTagEdit}
                onTagDelete={handleTagDelete}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorized">
          <Card>
            <CardHeader>
              <CardTitle>分类模式</CardTitle>
              <CardDescription>
                按照标签分类进行组织展示
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmartTagDisplay
                tags={filteredTags}
                mode="categorized"
                showCategories={true}
                showRelevance={true}
                allowAdd={true}
                onTagClick={handleTagClick}
                onTagAdd={handleTagAdd}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editable">
          <Card>
            <CardHeader>
              <CardTitle>编辑模式</CardTitle>
              <CardDescription>
                支持批量选择、编辑和管理标签
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmartTagDisplay
                tags={filteredTags}
                mode="editable"
                editable={true}
                deletable={true}
                allowAdd={true}
                showRelevance={true}
                onTagClick={handleTagClick}
                onTagEdit={handleTagEdit}
                onTagDelete={handleTagDelete}
                onTagAdd={handleTagAdd}
                onBatchAction={handleBatchAction}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 分类分布 */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle>分类分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(analytics.categoryDistribution).map(([category, count]) => (
                <div key={category} className="flex items-center gap-2">
                  <Badge variant="outline">
                    {category === 'content' && '内容'}
                    {category === 'emotion' && '情感'}
                    {category === 'topic' && '主题'}
                    {category === 'priority' && '优先级'}
                    {category === 'custom' && '自定义'}
                    {category === 'system' && '系统'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{count} 个</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SmartTagDemo