/**
 * AI分析移动端优化组件
 *
 * 专门为移动设备设计的AI分析界面，优化触控交互和响应式布局
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Brain, FileText, Tags, Link2, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Share2, X, Plus, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

// 导入AI组件类型
import type { AnalysisResult } from './ai-analysis-integrated-panel'
import { AISummaryCard } from './ai-summary-card'
import { SmartTagDisplay, type SmartTag } from './smart-tag-display'
import { RelatedNotesRecommendation, type RelatedNote } from './related-notes-recommendation'

export interface AIAnalysisMobileProps {
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
  /** 自定义样式类 */
  className?: string
}

// 移动端优化的标签组件
const MobileTagGrid = ({ tags, onTagClick }: { tags: SmartTag[], onTagClick?: (tag: SmartTag) => void }) => {
  const [showAll, setShowAll] = useState(false)
  const displayTags = showAll ? tags : tags.slice(0, 6)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {displayTags.map(tag => (
          <Badge
            key={tag.id}
            variant="secondary"
            className={cn(
              'px-3 py-1.5 text-sm cursor-pointer touch-manipulation transition-all',
              'hover:scale-105 active:scale-95',
              tag.category === 'content' && 'bg-blue-100 text-blue-800 border-blue-200',
              tag.category === 'emotion' && 'bg-green-100 text-green-800 border-green-200',
              tag.category === 'topic' && 'bg-purple-100 text-purple-800 border-purple-200',
              tag.category === 'priority' && 'bg-orange-100 text-orange-800 border-orange-200',
              tag.category === 'custom' && 'bg-pink-100 text-pink-800 border-pink-200',
              tag.category === 'system' && 'bg-gray-100 text-gray-800 border-gray-200'
            )}
            onClick={() => onTagClick?.(tag)}
          >
            {tag.name}
            {tag.relevance > 0.8 && <span className="ml-1 text-xs">★</span>}
          </Badge>
        ))}
      </div>

      {tags.length > 6 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full justify-center text-sm"
        >
          {showAll ? '收起' : `显示全部 ${tags.length} 个标签`}
          {showAll ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
        </Button>
      )}
    </div>
  )
}

// 移动端优化的推荐卡片
const MobileRecommendationCard = ({
  note,
  onClick,
  onLike,
  onShare
}: {
  note: RelatedNote
  onClick?: () => void
  onLike?: () => void
  onShare?: () => void
}) => {
  return (
    <Card className="mb-3 cursor-pointer touch-manipulation active:scale-[0.98] transition-transform">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-base line-clamp-2 flex-1">{note.title}</h4>
          <div className="ml-2 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-500">{Math.round(note.similarity * 100)}%</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{note.summary}</p>

        {/* 相似度可视化 */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>相关度</span>
            <span>{Math.round(note.similarity * 100)}%</span>
          </div>
          <Progress
            value={note.similarity * 100}
            className="h-2"
            // 根据相似度设置颜色
            style={{
              background: note.similarity > 0.8 ? '#10b981' : note.similarity > 0.6 ? '#3b82f6' : '#f59e0b'
            }}
          />
        </div>

        {/* 推荐理由简化版 */}
        <div className="bg-blue-50 p-2 rounded mb-3">
          <p className="text-xs text-blue-800">{note.recommendationReason.primary}</p>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
              {tag}
            </Badge>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{note.tags.length - 3}</span>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            <Button size="sm" variant="ghost" onClick={onLike}>
              <ThumbsUp className="h-4 w-4 mr-1" />
              喜欢
            </Button>
            <Button size="sm" variant="ghost" onClick={onShare}>
              <Share2 className="h-4 w-4 mr-1" />
              分享
            </Button>
          </div>
          <Button size="sm" onClick={onClick}>
            查看详情
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AIAnalysisMobile({
  noteId,
  noteTitle,
  noteContent,
  analysisResult,
  analysisStatus,
  onReanalyze,
  onSaveResults,
  className,
}: AIAnalysisMobileProps) {
  const [activeTab, setActiveTab] = useState('summary')
  const [currentResults, setCurrentResults] = useState<AnalysisResult | undefined>(analysisResult)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 处理重新分析
  const handleReanalyze = async () => {
    if (isAnalyzing || !onReanalyze) return
    setIsAnalyzing(true)
    try {
      await onReanalyze()
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
      // 模拟分析过程
      setTimeout(() => {
        setIsAnalyzing(false)
        // 这里应该调用实际的分析API
      }, 2000)
    }
  }, [noteId, noteContent, analysisStatus, currentResults])

  // 处理标签点击
  const handleTagClick = (tag: SmartTag) => {
    toast.info(`查看标签: ${tag.name}`)
  }

  // 处理推荐点击
  const handleRecommendationClick = (note: RelatedNote) => {
    toast.info(`查看笔记: ${note.title}`)
  }

  // 处理推荐喜欢
  const handleRecommendationLike = (note: RelatedNote) => {
    toast.success(`已喜欢: ${note.title}`)
  }

  // 处理推荐分享
  const handleRecommendationShare = (note: RelatedNote) => {
    toast.success(`分享链接已复制: ${note.title}`)
  }

  // 移动端优化：紧凑的头部
  const renderMobileHeader = () => (
    <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">AI 分析</h2>
            <p className="text-sm text-gray-600">
              {currentResults ? '分析完成' : isAnalyzing ? '分析中...' : '待分析'}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReanalyze}
          disabled={isAnalyzing}
          className="touch-manipulation"
        >
          <Brain className="h-4 w-4 mr-1" />
          重新分析
        </Button>
      </div>

      {/* 快速统计 */}
      {currentResults && (
        <div className="flex justify-around mt-3 pt-3 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {Math.round(currentResults.summary.qualityScore * 20)}
            </div>
            <div className="text-xs text-gray-500">质量分</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {currentResults.tags.length}
            </div>
            <div className="text-xs text-gray-500">标签数</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {currentResults.recommendations.length}
            </div>
            <div className="text-xs text-gray-500">推荐数</div>
          </div>
        </div>
      )}
    </div>
  )

  // 移动端分析中状态
  const renderMobileProcessing = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="relative mb-6">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h3 className="text-lg font-semibold mb-2">AI 正在分析</h3>
      <p className="text-gray-600 text-center mb-4">正在为您生成智能摘要、标签和推荐</p>
      <Progress value={65} className="w-full max-w-xs" />
    </div>
  )

  // 移动端摘要显示
  const renderMobileSummary = () => {
    if (!currentResults) return null

    return (
      <div className="px-4 py-3">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">智能摘要</h3>
            <Badge variant="outline">
              质量评分: {Math.round(currentResults.summary.qualityScore * 20)}/100
            </Badge>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm leading-relaxed mb-3">
                {currentResults.summary.content}
              </p>

              {/* 关键要点 */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-blue-800">关键要点</h4>
                <ul className="space-y-1">
                  {currentResults.summary.keyPoints.map((point, index) => (
                    <li key={index} className="text-sm text-blue-700 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <ThumbsUp className="h-4 w-4 mr-1" />
            有用
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <ThumbsDown className="h-4 w-4 mr-1" />
            需改进
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <Share2 className="h-4 w-4 mr-1" />
            分享
          </Button>
        </div>
      </div>
    )
  }

  // 移动端推荐列表
  const renderMobileRecommendations = () => {
    if (!currentResults || currentResults.recommendations.length === 0) return null

    return (
      <div className="px-4 py-3">
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2">相关推荐</h3>
          <p className="text-sm text-gray-600">
            基于您的内容智能推荐 {currentResults.recommendations.length} 个相关笔记
          </p>
        </div>

        <div>
          {currentResults.recommendations.map((note) => (
            <MobileRecommendationCard
              key={note.id}
              note={note}
              onClick={() => handleRecommendationClick(note)}
              onLike={() => handleRecommendationLike(note)}
              onShare={() => handleRecommendationShare(note)}
            />
          ))}
        </div>

        {/* 查看更多 */}
        <Button variant="outline" className="w-full mt-4">
          查看更多推荐
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {renderMobileHeader()}

      {/* 主要内容区域 */}
      <div className="pb-20">
        {(isAnalyzing || analysisStatus === 'processing') && renderMobileProcessing()}

        {analysisStatus === 'error' && (
          <Alert className="mx-4 mt-4">
            <AlertDescription>
              分析过程中出现问题，请检查内容或稍后重试。
            </AlertDescription>
          </Alert>
        )}

        {currentResults && analysisStatus === 'completed' && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* 移动端优化的标签页 */}
            <TabsList className="grid w-full grid-cols-3 sticky top-16 z-10 bg-white border-b">
              <TabsTrigger value="summary" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <FileText className="h-4 w-4 mr-1" />
                摘要
              </TabsTrigger>
              <TabsTrigger value="tags" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Tags className="h-4 w-4 mr-1" />
                标签
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Link2 className="h-4 w-4 mr-1" />
                推荐
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-0">
              {renderMobileSummary()}
            </TabsContent>

            <TabsContent value="tags" className="mt-0">
              <div className="px-4 py-3">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg mb-2">智能标签</h3>
                  <p className="text-sm text-gray-600">
                    为您的内容生成了 {currentResults.tags.length} 个相关标签
                  </p>
                </div>
                <MobileTagGrid tags={currentResults.tags} onTagClick={handleTagClick} />
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="mt-0">
              {renderMobileRecommendations()}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* 底部固定操作栏 */}
      {currentResults && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-20">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onSaveResults?.(currentResults)}
            >
              保存结果
            </Button>
            <Button size="sm" className="flex-1 bg-blue-600">
              导出报告
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIAnalysisMobile