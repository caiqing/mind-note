/**
 * Simple Demo Page
 *
 * Basic demonstration without authentication dependencies
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpenIcon,
  FolderIcon,
  TagIcon,
  FilterIcon,
  CloudIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from 'lucide-react'

export default function SimpleDemoPage() {
  const [activeTab, setActiveTab] = useState('overview')

  const features = [
    {
      id: 'categories',
      title: '智能分类管理',
      description: '层级分类结构，支持父子关系和颜色标记',
      status: 'completed',
      icon: FolderIcon,
      color: 'blue'
    },
    {
      id: 'tags',
      title: '标签系统',
      description: '智能标签管理，支持颜色分类和使用统计',
      status: 'completed',
      icon: TagIcon,
      color: 'green'
    },
    {
      id: 'filtering',
      title: '高级筛选',
      description: '多维度筛选系统，支持搜索、分类、标签过滤',
      status: 'completed',
      icon: FilterIcon,
      color: 'purple'
    },
    {
      id: 'cloud',
      title: '标签云可视化',
      description: '交互式标签云，动态展示标签使用频率',
      status: 'completed',
      icon: CloudIcon,
      color: 'orange'
    }
  ]

  const components = [
    {
      name: 'CategorySelector',
      description: '分类选择器组件，支持层级展示和内联编辑',
      file: 'src/components/category/category-selector.tsx',
      lines: 539
    },
    {
      name: 'TagInput',
      description: '标签输入组件，支持自动完成和颜色选择',
      file: 'src/components/tag/tag-input.tsx',
      lines: 564
    },
    {
      name: 'NoteFilter',
      description: '笔记筛选组件，支持多维度过滤',
      file: 'src/components/filter/note-filter.tsx',
      lines: 450
    },
    {
      name: 'TagCloud',
      description: '标签云组件，支持多种展示模式',
      file: 'src/components/tag/tag-cloud.tsx',
      lines: 380
    }
  ]

  const apis = [
    {
      endpoint: '/api/categories',
      methods: ['GET', 'POST'],
      description: '分类管理API，支持创建、查询、更新、删除'
    },
    {
      endpoint: '/api/categories/[id]',
      methods: ['GET', 'PUT', 'DELETE'],
      description: '单个分类操作API'
    },
    {
      endpoint: '/api/tags',
      methods: ['GET', 'POST'],
      description: '标签管理API，支持创建、查询、更新、删除'
    },
    {
      endpoint: '/api/tags/[id]',
      methods: ['GET', 'PUT', 'DELETE'],
      description: '单个标签操作API'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <BookOpenIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  MindNote 功能演示
                </h1>
                <p className="text-sm text-gray-500">
                  智能笔记管理核心功能展示
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8">
          {['overview', 'components', 'apis', 'architecture'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab)}
              className="capitalize"
            >
              {tab === 'overview' ? '总览' :
               tab === 'components' ? '组件' :
               tab === 'apis' ? 'API' : '架构'}
            </Button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <Card key={feature.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2">
                        <Icon className={`h-6 w-6 text-${feature.color}-600`} />
                        <span className="text-lg">{feature.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">
                        {feature.description}
                      </p>
                      <div className="flex items-center space-x-2">
                        {feature.status === 'completed' ? (
                          <>
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">已完成</span>
                          </>
                        ) : (
                          <>
                            <AlertCircleIcon className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-yellow-600">开发中</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>开发统计</CardTitle>
                <CardDescription>智能笔记管理功能实现进度</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">4</div>
                    <p className="text-sm text-gray-600">核心组件</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">8</div>
                    <p className="text-sm text-gray-600">API端点</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">3</div>
                    <p className="text-sm text-gray-600">演示页面</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">100%</div>
                    <p className="text-sm text-gray-600">完成度</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Components Tab */}
        {activeTab === 'components' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">核心组件</h2>
            {components.map((component) => (
              <Card key={component.name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{component.name}</span>
                    <Badge variant="secondary">{component.lines} 行</Badge>
                  </CardTitle>
                  <CardDescription>{component.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {component.file}
                  </code>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* APIs Tab */}
        {activeTab === 'apis' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">API接口</h2>
            {apis.map((api) => (
              <Card key={api.endpoint}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{api.endpoint}</span>
                    <div className="flex space-x-1">
                      {api.methods.map((method) => (
                        <Badge
                          key={method}
                          variant={
                            method === 'GET' ? 'secondary' :
                            method === 'POST' ? 'default' :
                            method === 'PUT' ? 'outline' : 'destructive'
                          }
                        >
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </CardTitle>
                  <CardDescription>{api.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Architecture Tab */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">系统架构</h2>

            <Card>
              <CardHeader>
                <CardTitle>技术栈</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold">Next.js 15</div>
                    <p className="text-sm text-gray-600">前端框架</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">TypeScript</div>
                    <p className="text-sm text-gray-600">类型安全</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">Prisma</div>
                    <p className="text-sm text-gray-600">ORM工具</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">PostgreSQL</div>
                    <p className="text-sm text-gray-600">数据库</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>数据库设计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Category表 - 支持层级分类结构</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Tag表 - 标签管理和统计</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span>NoteTag表 - 多对多关联</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>完整的索引策略</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}