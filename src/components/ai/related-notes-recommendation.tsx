/**
 * 相关笔记推荐组件 (T114)
 *
 * 提供智能的笔记推荐功能，包含相似度可视化和推荐理由
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link2, Brain, TrendingUp, Clock, Star, Filter, RefreshCw, ChevronRight, Eye, ThumbsUp, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

// 推荐笔记类型定义
export interface RelatedNote {
  id: string
  title: string
  content: string
  summary: string
  tags: string[]
  similarity: number // 相似度评分 0-1
  relevanceScore: number // 相关性评分 0-1
  recommendationReason: {
    primary: string // 主要推荐理由
    secondary?: string[] // 次要理由
    confidence: number // 置信度 0-1
  }
  metadata: {
    createdAt: string
    updatedAt: string
    viewCount: number
    likeCount: number
    commentCount: number
    readingTime: number // 预估阅读时间(分钟)
    author?: string
    category?: string
  }
  aiInsights: {
    keyTopics: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
    complexity: 'simple' | 'moderate' | 'complex'
    actionability: 'low' | 'medium' | 'high'
  }
}

export interface RecommendationConfig {
  /** 推荐算法 */
  algorithm: 'similarity' | 'collaborative' | 'hybrid' | 'trending'
  /** 推荐数量 */
  maxResults: number
  /** 最小相似度阈值 */
  minSimilarity: number
  /** 包含的推荐因子 */
  factors: ('content' | 'tags' | 'topic' | 'timeline' | 'interaction')[]
  /** 排除已读 */
  excludeRead: boolean
  /** 优先显示高相关性 */
  prioritizeRelevance: boolean
}

export interface RelatedNotesRecommendationProps {
  /** 当前笔记ID */
  currentNoteId: string
  /** 推荐配置 */
  config?: Partial<RecommendationConfig>
  /** 推荐回调 */
  onRecommendation?: (notes: RelatedNote[]) => void
  /** 笔记点击回调 */
  onNoteClick?: (note: RelatedNote) => void
  /** 笔记操作回调 */
  onNoteAction?: (action: string, noteId: string) => void
  /** 刷新推荐 */
  onRefresh?: () => Promise<RelatedNote[]>
  /** 自定义样式类 */
  className?: string
  /** 显示模式 */
  mode?: 'compact' | 'detailed' | 'grid' | 'list'
}

// 默认推荐配置
const DEFAULT_CONFIG: RecommendationConfig = {
  algorithm: 'hybrid',
  maxResults: 8,
  minSimilarity: 0.3,
  factors: ['content', 'tags', 'topic', 'timeline'],
  excludeRead: false,
  prioritizeRelevance: true,
}

// 推荐算法工厂
class RecommendationEngine {
  /**
   * 基于内容相似度的推荐
   */
  static async similarityBased(
    currentNoteId: string,
    options: Partial<RecommendationConfig> = {}
  ): Promise<RelatedNote[]> {
    // 模拟基于内容相似度的推荐算法
    await new Promise(resolve => setTimeout(resolve, 500)) // 模拟API调用

    return this.generateMockRecommendations(currentNoteId, options).filter(
      note => note.similarity >= (options.minSimilarity || 0.3)
    )
  }

  /**
   * 基于协同过滤的推荐
   */
  static async collaborativeFiltering(
    currentNoteId: string,
    options: Partial<RecommendationConfig> = {}
  ): Promise<RelatedNote[]> {
    // 模拟协同过滤推荐算法
    await new Promise(resolve => setTimeout(resolve, 800))

    return this.generateMockRecommendations(currentNoteId, options).map(note => ({
      ...note,
      recommendationReason: {
        primary: '与您兴趣相似的用户也喜欢这篇笔记',
        secondary: ['基于您的阅读历史', '相似用户的互动模式'],
        confidence: Math.random() * 0.3 + 0.6,
      },
    }))
  }

  /**
   * 混合推荐算法
   */
  static async hybrid(
    currentNoteId: string,
    options: Partial<RecommendationConfig> = {}
  ): Promise<RelatedNote[]> {
    const [similarityResults, collaborativeResults] = await Promise.all([
      this.similarityBased(currentNoteId, options),
      this.collaborativeFiltering(currentNoteId, options),
    ])

    // 合并和重新排序结果
    const combined = [...similarityResults, ...collaborativeResults]
    const unique = new Map<string, RelatedNote>()

    combined.forEach(note => {
      const existing = unique.get(note.id)
      if (!existing || note.relevanceScore > existing.relevanceScore) {
        unique.set(note.id, {
          ...note,
          recommendationReason: {
            primary: existing?.recommendationReason.primary || note.recommendationReason.primary,
            secondary: [
              ...(existing?.recommendationReason.secondary || []),
              ...(note.recommendationReason.secondary || []),
            ].filter(Boolean),
            confidence: Math.max(existing?.recommendationReason.confidence || 0, note.recommendationReason.confidence),
          },
        })
      }
    })

    return Array.from(unique.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxResults || 8)
  }

  /**
   * 趋势推荐
   */
  static async trending(
    currentNoteId: string,
    options: Partial<RecommendationConfig> = {}
  ): Promise<RelatedNote[]> {
    await new Promise(resolve => setTimeout(resolve, 600))

    return this.generateMockRecommendations(currentNoteId, options).map(note => ({
      ...note,
      recommendationReason: {
        primary: '近期热门内容',
        secondary: ['高互动率', '近期新增', '社区关注'],
        confidence: Math.random() * 0.2 + 0.7,
      },
      metadata: {
        ...note.metadata,
        viewCount: Math.floor(Math.random() * 1000) + 100,
        likeCount: Math.floor(Math.random() * 100) + 10,
      },
    }))
  }

  /**
   * 生成模拟推荐数据
   */
  private static generateMockRecommendations(
    currentNoteId: string,
    options: Partial<RecommendationConfig> = {}
  ): RelatedNote[] {
    const mockNotes: RelatedNote[] = [
      {
        id: 'note-1',
        title: 'React Hooks 最佳实践',
        content: '深入探讨React Hooks的使用技巧和最佳实践，包括useState、useEffect等常用Hook的高级用法...',
        summary: '介绍React Hooks的高级用法和性能优化技巧',
        tags: ['React', 'JavaScript', '前端开发'],
        similarity: 0.92,
        relevanceScore: 0.88,
        recommendationReason: {
          primary: '内容高度相似，都涉及React开发技术',
          secondary: ['相似的技术栈', '相同的难度级别'],
          confidence: 0.91,
        },
        metadata: {
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-16T14:20:00Z',
          viewCount: 234,
          likeCount: 45,
          commentCount: 12,
          readingTime: 8,
          author: '张三',
          category: '技术文档',
        },
        aiInsights: {
          keyTopics: ['React', 'Hooks', '性能优化', '最佳实践'],
          sentiment: 'positive',
          complexity: 'moderate',
          actionability: 'high',
        },
      },
      {
        id: 'note-2',
        title: 'TypeScript 进阶技巧',
        content: 'TypeScript的高级类型系统使用技巧，包括条件类型、映射类型、模板字面量类型等...',
        summary: '深入讲解TypeScript高级类型系统和实际应用',
        tags: ['TypeScript', '类型系统', 'JavaScript'],
        similarity: 0.85,
        relevanceScore: 0.82,
        recommendationReason: {
          primary: '技术栈相关，都涉及现代前端开发技术',
          secondary: ['互补的学习内容', '相似的技能等级'],
          confidence: 0.85,
        },
        metadata: {
          createdAt: '2024-01-14T09:15:00Z',
          updatedAt: '2024-01-15T16:45:00Z',
          viewCount: 189,
          likeCount: 38,
          commentCount: 8,
          readingTime: 12,
          author: '李四',
          category: '技术文档',
        },
        aiInsights: {
          keyTopics: ['TypeScript', '类型系统', '进阶技巧', '代码质量'],
          sentiment: 'positive',
          complexity: 'complex',
          actionability: 'medium',
        },
      },
      {
        id: 'note-3',
        title: '前端性能优化实战',
        content: '详细讲解前端性能优化的各种技巧和工具，包括代码分割、懒加载、缓存策略等...',
        summary: '全面介绍前端性能优化的策略和实施方案',
        tags: ['性能优化', '前端', 'Web开发'],
        similarity: 0.78,
        relevanceScore: 0.75,
        recommendationReason: {
          primary: '主题相关，都关注前端开发质量提升',
          secondary: ['实用的技术内容', '相似的实践导向'],
          confidence: 0.79,
        },
        metadata: {
          createdAt: '2024-01-13T14:20:00Z',
          updatedAt: '2024-01-14T11:30:00Z',
          viewCount: 156,
          likeCount: 29,
          commentCount: 6,
          readingTime: 15,
          author: '王五',
          category: '最佳实践',
        },
        aiInsights: {
          keyTopics: ['性能优化', '前端', '用户体验', '最佳实践'],
          sentiment: 'positive',
          complexity: 'moderate',
          actionability: 'high',
        },
      },
      {
        id: 'note-4',
        title: 'JavaScript 异步编程指南',
        content: '深入理解JavaScript中的异步编程模式，包括Promise、async/await、事件循环等核心概念...',
        summary: '系统讲解JavaScript异步编程的原理和实践',
        tags: ['JavaScript', '异步编程', 'Promise'],
        similarity: 0.72,
        relevanceScore: 0.68,
        recommendationReason: {
          primary: '基础技术相关，有助于理解React底层原理',
          secondary: ['渐进式学习路径', '基础概念巩固'],
          confidence: 0.73,
        },
        metadata: {
          createdAt: '2024-01-12T16:45:00Z',
          updatedAt: '2024-01-13T09:20:00Z',
          viewCount: 298,
          likeCount: 67,
          commentCount: 15,
          readingTime: 10,
          author: '赵六',
          category: '基础知识',
        },
        aiInsights: {
          keyTopics: ['JavaScript', '异步编程', 'Promise', '事件循环'],
          sentiment: 'neutral',
          complexity: 'moderate',
          actionability: 'medium',
        },
      },
      {
        id: 'note-5',
        title: '组件设计模式总结',
        content: '总结React中常用的组件设计模式，包括高阶组件、Render Props、自定义Hook等...',
        summary: '归纳React组件设计的各种模式和适用场景',
        tags: ['React', '设计模式', '组件化'],
        similarity: 0.68,
        relevanceScore: 0.65,
        recommendationReason: {
          primary: '设计理念相关，都涉及组件化思维',
          secondary: ['架构设计思路', '代码组织模式'],
          confidence: 0.70,
        },
        metadata: {
          createdAt: '2024-01-11T11:30:00Z',
          updatedAt: '2024-01-12T15:40:00Z',
          viewCount: 124,
          likeCount: 31,
          commentCount: 9,
          readingTime: 6,
          author: '孙七',
          category: '架构设计',
        },
        aiInsights: {
          keyTopics: ['React', '设计模式', '组件化', '架构'],
          sentiment: 'positive',
          complexity: 'moderate',
          actionability: 'high',
        },
      },
    ]

    return mockNotes
      .filter(note => note.id !== currentNoteId)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxResults || 8)
  }
}

export function RelatedNotesRecommendation({
  currentNoteId,
  config,
  onRecommendation,
  onNoteClick,
  onNoteAction,
  onRefresh,
  className,
  mode = 'detailed',
}: RelatedNotesRecommendationProps) {
  const [recommendations, setRecommendations] = useState<RelatedNote[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<RecommendationConfig['algorithm']>(
    config?.algorithm || DEFAULT_CONFIG.algorithm
  )
  const [activeTab, setActiveTab] = useState('recommendations')

  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // 加载推荐内容
  const loadRecommendations = useCallback(async () => {
    setLoading(true)
    try {
      let results: RelatedNote[] = []

      switch (selectedAlgorithm) {
        case 'similarity':
          results = await RecommendationEngine.similarityBased(currentNoteId, finalConfig)
          break
        case 'collaborative':
          results = await RecommendationEngine.collaborativeFiltering(currentNoteId, finalConfig)
          break
        case 'hybrid':
          results = await RecommendationEngine.hybrid(currentNoteId, finalConfig)
          break
        case 'trending':
          results = await RecommendationEngine.trending(currentNoteId, finalConfig)
          break
        default:
          results = await RecommendationEngine.hybrid(currentNoteId, finalConfig)
      }

      setRecommendations(results)
      onRecommendation?.(results)
    } catch (error) {
      console.error('Failed to load recommendations:', error)
      toast.error('加载推荐内容失败')
    } finally {
      setLoading(false)
    }
  }, [currentNoteId, selectedAlgorithm, finalConfig, onRecommendation])

  // 初始化加载
  useEffect(() => {
    if (currentNoteId) {
      loadRecommendations()
    }
  }, [currentNoteId, loadRecommendations])

  // 处理刷新
  const handleRefresh = async () => {
    if (onRefresh) {
      const newRecommendations = await onRefresh()
      if (newRecommendations) {
        setRecommendations(newRecommendations)
        onRecommendation?.(newRecommendations)
        toast.success('推荐内容已更新')
        return
      }
    }
    await loadRecommendations()
    toast.success('推荐内容已刷新')
  }

  // 处理笔记点击
  const handleNoteClick = (note: RelatedNote) => {
    onNoteClick?.(note)
    // 可以在这里添加导航逻辑
  }

  // 处理笔记操作
  const handleNoteAction = (action: string, noteId: string) => {
    onNoteAction?.(action, noteId)

    switch (action) {
      case 'like':
        toast.success('已添加到喜欢')
        break
      case 'save':
        toast.success('已保存到收藏')
        break
      case 'share':
        toast.success('分享链接已复制')
        break
      default:
        break
    }
  }

  // 获取相似度颜色
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'bg-green-500'
    if (similarity >= 0.6) return 'bg-blue-500'
    if (similarity >= 0.4) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  // 获取推荐理由标签
  const getReasonBadgeVariant = (reason: string) => {
    if (reason.includes('相似')) return 'default'
    if (reason.includes('热门') || reason.includes('趋势')) return 'secondary'
    if (reason.includes('用户') || reason.includes('协同')) return 'outline'
    return 'destructive'
  }

  // 渲染相似度可视化
  const renderSimilarityVisualization = (note: RelatedNote) => (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Progress
          value={note.similarity * 100}
          className="h-2"
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground min-w-[45px] text-right">
        {Math.round(note.similarity * 100)}%
      </span>
    </div>
  )

  // 渲染推荐理由
  const renderRecommendationReason = (note: RelatedNote) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={getReasonBadgeVariant(note.recommendationReason.primary)}>
          {note.recommendationReason.primary}
        </Badge>
        <span className="text-xs text-muted-foreground">
          置信度: {Math.round(note.recommendationReason.confidence * 100)}%
        </span>
      </div>
      {note.recommendationReason.secondary && note.recommendationReason.secondary.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.recommendationReason.secondary.map((reason, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )

  // 渲染紧凑模式
  const renderCompactMode = () => (
    <div className="space-y-3">
      {recommendations.map(note => (
        <Card
          key={note.id}
          className="cursor-pointer hover:shadow-md transition-all duration-200"
          onClick={() => handleNoteClick(note)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-1 mb-1">
                  {note.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {note.summary}
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full', getSimilarityColor(note.similarity))}
                      style={{ width: `${note.similarity * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(note.similarity * 100)}%
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  // 渲染详细模式
  const renderDetailedMode = () => (
    <div className="space-y-4">
      {recommendations.map(note => (
        <Card
          key={note.id}
          className="cursor-pointer hover:shadow-lg transition-all duration-200"
          onClick={() => handleNoteClick(note)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg line-clamp-1 mb-2">
                  {note.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 mb-3">
                  {note.summary}
                </CardDescription>
                <div className="flex flex-wrap gap-1 mb-3">
                  {note.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className="text-xs">
                  {note.metadata.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {note.metadata.readingTime}分钟阅读
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* 相似度可视化 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">相似度</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(note.similarity * 100)}%
                  </span>
                </div>
                {renderSimilarityVisualization(note)}
              </div>

              {/* 推荐理由 */}
              <div>
                <span className="text-sm font-medium mb-2 block">推荐理由</span>
                {renderRecommendationReason(note)}
              </div>

              {/* AI洞察 */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium mb-1 block">关键主题</span>
                  <div className="flex flex-wrap gap-1">
                    {note.aiInsights.keyTopics.slice(0, 3).map(topic => (
                      <span key={topic} className="bg-gray-100 px-2 py-1 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-medium mb-1 block">内容特征</span>
                  <div className="space-y-1">
                    <div>情感: {note.aiInsights.sentiment}</div>
                    <div>复杂度: {note.aiInsights.complexity}</div>
                    <div>实用性: {note.aiInsights.actionability}</div>
                  </div>
                </div>
              </div>

              {/* 互动数据 */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {note.metadata.viewCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {note.metadata.likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {note.metadata.commentCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNoteAction('like', note.id)
                    }}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNoteAction('save', note.id)
                    }}
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  // 渲染网格模式
  const renderGridMode = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recommendations.map(note => (
        <Card
          key={note.id}
          className="cursor-pointer hover:shadow-lg transition-all duration-200"
          onClick={() => handleNoteClick(note)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base line-clamp-2 mb-2">
              {note.title}
            </CardTitle>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {Math.round(note.similarity * 100)}% 相似
              </Badge>
              <span className="text-xs text-muted-foreground">
                {note.metadata.readingTime}分钟
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
              {note.summary}
            </p>
            <div className="space-y-2">
              {renderSimilarityVisualization(note)}
              <div className="flex flex-wrap gap-1">
                {note.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  // 渲染列表模式
  const renderListMode = () => (
    <div className="space-y-2">
      {recommendations.map(note => (
        <div
          key={note.id}
          className="flex items-center gap-4 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => handleNoteClick(note)}
        >
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1 line-clamp-1">
              {note.title}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {note.summary}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  getSimilarityColor(note.similarity)
                )} />
                <span className="text-xs">{Math.round(note.similarity * 100)}%</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                {note.metadata.viewCount}
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      ))}
    </div>
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* 头部控制区 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            相关笔记推荐
          </h3>
          <p className="text-sm text-muted-foreground">
            基于AI智能算法为您推荐相关笔记
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedAlgorithm}
            onValueChange={(value: RecommendationConfig['algorithm']) => {
              setSelectedAlgorithm(value)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hybrid">混合推荐</SelectItem>
              <SelectItem value="similarity">内容相似</SelectItem>
              <SelectItem value="collaborative">协同过滤</SelectItem>
              <SelectItem value="trending">热门趋势</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
            刷新
          </Button>
        </div>
      </div>

      {/* 推荐统计 */}
      {!loading && recommendations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">推荐数量</p>
                <p className="text-lg font-semibold">{recommendations.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">平均相似度</p>
                <p className="text-lg font-semibold">
                  {Math.round(
                    recommendations.reduce((sum, note) => sum + note.similarity, 0) /
                    recommendations.length * 100
                  )}%
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">高相关性</p>
                <p className="text-lg font-semibold">
                  {recommendations.filter(note => note.relevanceScore > 0.8).length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">总阅读时间</p>
                <p className="text-lg font-semibold">
                  {recommendations.reduce((sum, note) => sum + note.metadata.readingTime, 0)}分钟
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 主要内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recommendations">推荐内容</TabsTrigger>
          <TabsTrigger value="insights">AI洞察</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>正在分析推荐内容...</span>
            </div>
          ) : recommendations.length > 0 ? (
            <>
              {/* 显示模式切换 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  找到 {recommendations.length} 篇相关笔记
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant={mode === 'compact' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('recommendations')}
                  >
                    紧凑
                  </Button>
                  <Button
                    variant={mode === 'detailed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('recommendations')}
                  >
                    详细
                  </Button>
                  <Button
                    variant={mode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('recommendations')}
                  >
                    网格
                  </Button>
                  <Button
                    variant={mode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('recommendations')}
                  >
                    列表
                  </Button>
                </div>
              </div>

              {/* 渲染推荐内容 */}
              {mode === 'compact' && renderCompactMode()}
              {mode === 'detailed' && renderDetailedMode()}
              {mode === 'grid' && renderGridMode()}
              {mode === 'list' && renderListMode()}
            </>
          ) : (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="text-lg font-medium mb-2">暂无推荐内容</h4>
              <p className="text-muted-foreground mb-4">
                尝试切换推荐算法或稍后再试
              </p>
              <Button onClick={handleRefresh} variant="outline">
                重新推荐
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI推荐洞察
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">推荐算法说明</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {selectedAlgorithm === 'hybrid' && (
                    <>
                      <p>• 混合推荐结合了多种推荐策略</p>
                      <p>• 综合考虑内容相似度、协同过滤和热门趋势</p>
                      <p>• 提供更加个性化和多样化的推荐结果</p>
                    </>
                  )}
                  {selectedAlgorithm === 'similarity' && (
                    <>
                      <p>• 基于内容相似度的推荐算法</p>
                      <p>• 分析笔记内容、标签和主题的相似性</p>
                      <p>• 推荐与当前笔记最相似的内容</p>
                    </>
                  )}
                  {selectedAlgorithm === 'collaborative' && (
                    <>
                      <p>• 基于协同过滤的推荐算法</p>
                      <p>• 分析用户的阅读和互动行为</p>
                      <p>• 推荐相似用户喜欢的内容</p>
                    </>
                  )}
                  {selectedAlgorithm === 'trending' && (
                    <>
                      <p>• 基于热门趋势的推荐算法</p>
                      <p>• 优先推荐近期热门和互动量高的内容</p>
                      <p>• 帮助发现社区关注的热点话题</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">推荐质量指标</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">平均相似度:</span>
                    <span className="ml-2 font-medium">
                      {recommendations.length > 0
                        ? Math.round(
                            recommendations.reduce((sum, note) => sum + note.similarity, 0) /
                            recommendations.length * 100
                          ) + '%'
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">平均置信度:</span>
                    <span className="ml-2 font-medium">
                      {recommendations.length > 0
                        ? Math.round(
                            recommendations.reduce((sum, note) => sum + note.recommendationReason.confidence, 0) /
                            recommendations.length * 100
                          ) + '%'
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RelatedNotesRecommendation