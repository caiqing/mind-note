/**
 * AI分析集成面板
 *
 * 集成T112-AI摘要、T113-智能标签、T114-相关笔记推荐组件
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Brain, FileText, Tags, Link2, Settings, RefreshCw, BarChart3, TrendingUp, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

// 导入AI组件
import { AISummaryCard } from './ai-summary-card'
import { SmartTagDisplay, type SmartTag } from './smart-tag-display'
import { RelatedNotesRecommendation, type RelatedNote } from './related-notes-recommendation'
import { smartTagManager } from '@/lib/ai/smart-tag-manager'

// 分析结果类型定义
export interface AnalysisResult {
  id: string
  summary: {
    content: string
    style: 'paragraph' | 'bullet_points' | 'keywords' | 'executive'
    length: 'short' | 'medium' | 'long'
    qualityScore: number
    generatedAt: string
    provider: string
    originalLength: number
    keyPoints: string[]
  }
  tags: SmartTag[]
  recommendations: RelatedNote[]
  metadata: {
    analyzedAt: string
    processingTime: number
    confidence: number
    modelVersion: string
    analysisTypes: string[]
  }
}

export interface AIAnalysisIntegratedPanelProps {
  /** 笔记ID */
  noteId: string
  /** 笔记标题 */
  noteTitle: string
  /** 笔记内容 */
  noteContent: string
  /** 分析结果 */
  analysisResult?: AnalysisResult
  /** 分析状态 */
  analysisStatus: 'idle' | 'processing' | 'completed' | 'error'
  /** 重新分析回调 */
  onReanalyze?: () => Promise<void>
  /** 保存结果回调 */
  onSaveResults?: (results: AnalysisResult) => void
  /** 配置面板 */
  showSettings?: boolean
  /** 可折叠状态 */
  collapsible?: boolean
  /** 默认展开状态 */
  defaultExpanded?: boolean
  /** 自定义样式类 */
  className?: string
}

// 模拟分析函数
const mockAnalysis = async (noteId: string, content: string): Promise<AnalysisResult> => {
  // 模拟处理时间
  await new Promise(resolve => setTimeout(resolve, 2000))

  return {
    id: `analysis-${noteId}`,
    summary: {
      content: `这是一个基于AI技术生成的${content.length}字文档的综合分析摘要。内容涵盖了${content.includes('React') ? 'React开发' : '相关技术'}的各个方面，包括基础概念、实际应用和最佳实践。通过深入分析，我们可以识别出关键的要点和核心信息，为读者提供清晰的理解路径。`,
      style: 'paragraph',
      length: content.length > 500 ? 'long' : content.length > 200 ? 'medium' : 'short',
      qualityScore: 4.2,
      generatedAt: new Date().toISOString(),
      provider: 'AI-Analysis-Engine',
      originalLength: content.length,
      keyPoints: [
        '深入探讨了核心概念和原理',
        '提供了实际应用场景和案例',
        '强调了最佳实践和注意事项',
        '涵盖了从基础到高级的完整知识体系'
      ]
    },
    tags: [
      {
        id: 'tag-1',
        name: '技术文档',
        category: 'content',
        color: 'blue',
        relevance: 0.95,
        confidence: 0.88,
        count: 15,
        description: '技术相关文档标签',
        createdAt: new Date().toISOString(),
        isUserGenerated: false,
      },
      {
        id: 'tag-2',
        name: '开发指南',
        category: 'content',
        color: 'green',
        relevance: 0.82,
        confidence: 0.91,
        createdAt: new Date().toISOString(),
        isUserGenerated: false,
      },
      {
        id: 'tag-3',
        name: '实用性强',
        category: 'custom',
        color: 'purple',
        relevance: 0.78,
        confidence: 0.85,
        createdAt: new Date().toISOString(),
        isUserGenerated: true,
      }
    ],
    recommendations: [
      {
        id: 'note-1',
        title: 'React Hooks 最佳实践',
        content: '深入探讨React Hooks的使用技巧和最佳实践...',
        summary: '介绍React Hooks的高级用法和性能优化技巧',
        tags: ['React', 'JavaScript', '前端开发'],
        similarity: 0.92,
        relevanceScore: 0.88,
        recommendationReason: {
          primary: '内容高度相似，都涉及相关技术',
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
      }
    ],
    metadata: {
      analyzedAt: new Date().toISOString(),
      processingTime: 2100,
      confidence: 0.89,
      modelVersion: 'v2.1.0',
      analysisTypes: ['summarization', 'tagging', 'recommendation']
    }
  }
}

export function AIAnalysisIntegratedPanel({
  noteId,
  noteTitle,
  noteContent,
  analysisResult,
  analysisStatus,
  onReanalyze,
  onSaveResults,
  showSettings = true,
  collapsible = true,
  defaultExpanded = true,
  className,
}: AIAnalysisIntegratedPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentResults, setCurrentResults] = useState<AnalysisResult | undefined>(analysisResult)
  const [activeTab, setActiveTab] = useState('summary')
  const [showAnalysisStats, setShowAnalysisStats] = useState(true)

  // 处理重新分析
  const handleReanalyze = async () => {
    if (isAnalyzing || !onReanalyze) return

    setIsAnalyzing(true)
    try {
      await onReanalyze()
      const newResults = await mockAnalysis(noteId, noteContent)
      setCurrentResults(newResults)
      toast.success('分析完成')
    } catch (error) {
      console.error('Analysis failed:', error)
      toast.error('分析失败，请重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 初始分析
  useEffect(() => {
    if (!currentResults && noteId && noteContent && analysisStatus === 'idle') {
      setIsAnalyzing(true)
      mockAnalysis(noteId, noteContent)
        .then(results => {
          setCurrentResults(results)
          setIsAnalyzing(false)
        })
        .catch(error => {
          console.error('Initial analysis failed:', error)
          setIsAnalyzing(false)
        })
    }
  }, [noteId, noteContent, analysisStatus, currentResults])

  // 处理标签添加
  const handleTagAdd = async (name: string, category: SmartTag['category']) => {
    const newTag = await smartTagManager.createTag(name, category)
    if (newTag) {
      toast.success('标签已添加')
      return newTag
    }
    return null
  }

  // 处理标签操作
  const handleTagAction = (action: string, tagId: string) => {
    switch (action) {
      case 'delete':
        toast.success('标签已删除')
        break
      case 'edit':
        toast.success('标签已更新')
        break
      default:
        break
    }
  }

  // 处理推荐点击
  const handleRecommendationClick = (note: RelatedNote) => {
    toast.info(`查看笔记: ${note.title}`)
  }

  // 计算分析统计
  const getAnalysisStats = () => {
    if (!currentResults) return null

    return {
      totalTags: currentResults.tags.length,
      highQualityTags: currentResults.tags.filter(tag => tag.relevance > 0.8).length,
      recommendations: currentResults.recommendations.length,
      avgSimilarity: currentResults.recommendations.length > 0
        ? currentResults.recommendations.reduce((sum, note) => sum + note.similarity, 0) / currentResults.recommendations.length
        : 0,
      qualityScore: currentResults.summary.qualityScore,
      processingTime: currentResults.metadata.processingTime,
      confidence: currentResults.metadata.confidence,
    }
  }

  const stats = getAnalysisStats()

  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">AI 智能分析</h3>
          <p className="text-sm text-gray-600">
            {currentResults ? '分析完成' : analysisStatus === 'processing' || isAnalyzing ? '正在分析...' : '等待分析'}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {showAnalysisStats && stats && (
          <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              <span className="font-medium">{Math.round(stats.qualityScore * 20)}/100</span>
            </div>
            <div className="flex items-center gap-1">
              <Tags className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              <span className="font-medium">{stats.totalTags}</span>
            </div>
            <div className="flex items-center gap-1">
              <Link2 className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
              <span className="font-medium">{stats.recommendations}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReanalyze}
            disabled={isAnalyzing}
            className="touch-manipulation"
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', isAnalyzing && 'animate-spin')} />
            <span className="hidden sm:inline">重新分析</span>
            <span className="sm:hidden">重试</span>
          </Button>

          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="touch-manipulation"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  const renderProcessingState = () => (
    <div className="p-8 text-center">
      <div className="max-w-md mx-auto">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            <div className="absolute inset-0 h-8 w-8 bg-blue-600 rounded-full opacity-10 animate-ping" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">AI 正在分析您的笔记</h3>
        <p className="text-gray-600 mb-4">
          这可能需要几秒钟时间，我们正在生成摘要、标签和推荐内容...
        </p>
        <Progress value={33} className="w-full" />
      </div>
    </div>
  )

  const renderErrorState = () => (
    <Alert className="m-4">
      <AlertDescription>
        分析过程中出现问题，请检查笔记内容或稍后重试。
      </AlertDescription>
    </Alert>
  )

  const renderContent = () => {
    if (!currentResults) return null

    return (
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger
              value="summary"
              className="flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white touch-manipulation"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden xs:inline">摘要</span>
              <span className="xs:hidden sm:inline">摘要分析</span>
            </TabsTrigger>
            <TabsTrigger
              value="tags"
              className="flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white touch-manipulation"
            >
              <Tags className="h-4 w-4" />
              <span>标签</span>
            </TabsTrigger>
            <TabsTrigger
              value="recommendations"
              className="flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white touch-manipulation"
            >
              <Link2 className="h-4 w-4" />
              <span className="hidden xs:inline">推荐</span>
              <span className="xs:hidden sm:inline">相关推荐</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <AISummaryCard
              summary={currentResults.summary}
              style={currentResults.summary.style}
              length={currentResults.summary.length}
              qualityScore={currentResults.summary.qualityScore}
              generatedAt={currentResults.summary.generatedAt}
              provider={currentResults.summary.provider}
              originalLength={currentResults.summary.originalLength}
              keyPoints={currentResults.summary.keyPoints}
              editable={true}
              onEdit={() => toast.info('编辑功能开发中')}
              onFeedback={(feedback) => toast.success(`已记录反馈: ${feedback}`)}
              onCopy={() => {
                navigator.clipboard.writeText(currentResults.summary.content)
                toast.success('摘要已复制到剪贴板')
              }}
              onRegenerate={() => handleReanalyze()}
            />
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            <SmartTagDisplay
              tags={currentResults.tags}
              mode="detailed"
              showCategories={true}
              showRelevance={true}
              showConfidence={true}
              editable={true}
              deletable={true}
              allowAdd={true}
              onTagClick={(tag) => toast.info(`点击标签: ${tag.name}`)}
              onTagEdit={(tag) => toast.info(`编辑标签: ${tag.name}`)}
              onTagDelete={(tagId) => handleTagAction('delete', tagId)}
              onTagAdd={handleTagAdd}
              onBatchAction={(action, tagIds) => {
                toast.success(`批量操作: ${action} ${tagIds.length} 个标签`)
              }}
            />
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <RelatedNotesRecommendation
              currentNoteId={noteId}
              recommendations={currentResults.recommendations}
              mode="detailed"
              showSimilarityVisualization={true}
              showRecommendationReasons={true}
              onRecommendation={(notes) => toast.info(`获得 ${notes.length} 个推荐`)}
              onNoteClick={handleRecommendationClick}
              onNoteAction={(action, noteId) => {
                toast.success(`操作: ${action} 笔记 ${noteId}`)
              }}
              onRefresh={async () => {
                // 模拟刷新推荐
                await new Promise(resolve => setTimeout(resolve, 1000))
                toast.success('推荐已刷新')
                return currentResults.recommendations
              }}
            />
          </TabsContent>
        </Tabs>

        {/* 分析统计 */}
        {showAnalysisStats && (
          <div className="mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="h-4 w-4" />
              分析统计
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="bg-white p-2 sm:p-3 rounded border">
                <p className="text-gray-600 mb-1">处理时间</p>
                <p className="font-semibold text-blue-600">{currentResults.metadata.processingTime}ms</p>
              </div>
              <div className="bg-white p-2 sm:p-3 rounded border">
                <p className="text-gray-600 mb-1">置信度</p>
                <p className="font-semibold text-green-600">{Math.round(currentResults.metadata.confidence * 100)}%</p>
              </div>
              <div className="bg-white p-2 sm:p-3 rounded border">
                <p className="text-gray-600 mb-1">模型版本</p>
                <p className="font-semibold text-purple-600 truncate">{currentResults.metadata.modelVersion}</p>
              </div>
              <div className="bg-white p-2 sm:p-3 rounded border">
                <p className="text-gray-600 mb-1">分析类型</p>
                <p className="font-semibold text-orange-600">{currentResults.metadata.analysisTypes.length} 种</p>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 - 移动端优化 */}
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" size="sm" className="w-full sm:w-auto touch-manipulation">
            <Settings className="h-4 w-4 mr-1" />
            设置
          </Button>
          <Button size="sm" onClick={() => onSaveResults?.(currentResults)} className="w-full sm:w-auto touch-manipulation">
            <Star className="h-4 w-4 mr-1" />
            保存结果
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn('w-full shadow-lg', className)}>
      {renderHeader()}

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          {(isAnalyzing || analysisStatus === 'processing') && renderProcessingState()}
          {analysisStatus === 'error' && renderErrorState()}
          {currentResults && analysisStatus === 'completed' && renderContent()}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default AIAnalysisIntegratedPanel