/**
 * 用户反馈收集组件
 *
 * 收集用户对AI建议的反馈，提供多种反馈方式
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  MessageSquare,
  Share2,
  Bookmark,
  Send,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  BarChart3,
  Heart,
  Zap,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { feedbackSystem, type FeedbackData, submitFeedback } from '@/lib/ai/feedback-system'

export interface FeedbackCollectionProps {
  /** 笔记ID */
  noteId: string
  /** 分析ID */
  analysisId: string
  /** 用户ID */
  userId: string
  /** 反馈类型 */
  feedbackType: 'summary' | 'tag' | 'recommendation'
  /** 内容标题 */
  contentTitle: string
  /** 是否显示统计信息 */
  showStats?: boolean
  /** 自定义样式类 */
  className?: string
  /** 反馈提交回调 */
  onFeedbackSubmit?: (feedbackId: string) => void
}

interface RatingComponentProps {
  value: number
  onChange: (value: number) => void
  max?: number
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
}

// 评分组件
const RatingComponent: React.FC<RatingComponentProps> = ({
  value,
  onChange,
  max = 5,
  size = 'md',
  readonly = false
}) => {
  const [hoverValue, setHoverValue] = useState(0)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1
        const isFilled = starValue <= (hoverValue || value)

        return (
          <button
            key={index}
            type="button"
            disabled={readonly}
            className={cn(
              'transition-all duration-200',
              sizeClasses[size],
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            )}
            onClick={() => !readonly && onChange(starValue)}
            onMouseEnter={() => !readonly && setHoverValue(starValue)}
            onMouseLeave={() => !readonly && setHoverValue(0)}
          >
            <Star
              className={cn(
                isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
                'transition-colors'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

// 快速反馈按钮
const QuickFeedbackButtons: React.FC<{
  onFeedback: (type: 'positive' | 'negative' | 'neutral', rating: number) => void
  disabled?: boolean
}> = ({ onFeedback, disabled = false }) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onFeedback('positive', 5)}
        disabled={disabled}
        className="flex-1 touch-manipulation"
      >
        <ThumbsUp className="h-4 w-4 mr-1 text-green-600" />
        有用
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onFeedback('neutral', 3)}
        disabled={disabled}
        className="flex-1 touch-manipulation"
      >
        <Minus className="h-4 w-4 mr-1 text-yellow-600" />
        一般
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onFeedback('negative', 1)}
        disabled={disabled}
        className="flex-1 touch-manipulation"
      >
        <ThumbsDown className="h-4 w-4 mr-1 text-red-600" />
        无用
      </Button>
    </div>
  )
}

// 详细反馈表单
const DetailedFeedbackForm: React.FC<{
  onSubmit: (feedback: {
    rating: number
    usefulness: number
    accuracy: number
    relevance: number
    comments: string
  }) => void
  onCancel: () => void
  loading?: boolean
}> = ({ onSubmit, onCancel, loading = false }) => {
  const [rating, setRating] = useState(4)
  const [usefulness, setUsefulness] = useState(4)
  const [accuracy, setAccuracy] = useState(4)
  const [relevance, setRelevance] = useState(4)
  const [comments, setComments] = useState('')

  const handleSubmit = () => {
    onSubmit({
      rating,
      usefulness,
      accuracy,
      relevance,
      comments
    })
  }

  return (
    <div className="space-y-4">
      {/* 总体评分 */}
      <div>
        <label className="block text-sm font-medium mb-2">总体评分</label>
        <RatingComponent
          value={rating}
          onChange={setRating}
          size="lg"
        />
      </div>

      {/* 具体指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">有用性</label>
          <RatingComponent
            value={usefulness}
            onChange={setUsefulness}
            size="md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">准确性</label>
          <RatingComponent
            value={accuracy}
            onChange={setAccuracy}
            size="md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">相关性</label>
          <RatingComponent
            value={relevance}
            onChange={setRelevance}
            size="md"
          />
        </div>
      </div>

      {/* 详细评论 */}
      <div>
        <label className="block text-sm font-medium mb-2">详细反馈（可选）</label>
        <Textarea
          placeholder="请告诉我们您的具体想法..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              提交中...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-1" />
              提交反馈
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function FeedbackCollection({
  noteId,
  analysisId,
  userId,
  feedbackType,
  contentTitle,
  showStats = true,
  className,
  onFeedbackSubmit
}: FeedbackCollectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('quick')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)

  // 获取分析数据
  useEffect(() => {
    const data = feedbackSystem.getAnalytics()
    setAnalytics(data)
  }, [])

  // 获取设备类型和时间信息
  const getDeviceInfo = () => {
    const width = window.innerWidth
    let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop'

    if (width < 768) deviceType = 'mobile'
    else if (width < 1024) deviceType = 'tablet'

    const hour = new Date().getHours()
    let timeOfDay = 'morning'
    if (hour >= 12 && hour < 18) timeOfDay = 'afternoon'
    else if (hour >= 18) timeOfDay = 'evening'

    return { deviceType, timeOfDay }
  }

  // 处理快速反馈
  const handleQuickFeedback = async (sentiment: 'positive' | 'negative' | 'neutral', rating: number) => {
    await submitFullFeedback({
      rating,
      sentiment,
      specificFeedback: {
        usefulness: rating,
        accuracy: rating,
        relevance: rating
      },
      comments: ''
    })
  }

  // 处理详细反馈
  const handleDetailedFeedback = async (feedbackData: {
    rating: number
    usefulness: number
    accuracy: number
    relevance: number
    comments: string
  }) => {
    await submitFullFeedback({
      rating: feedbackData.rating,
      sentiment: feedbackData.rating >= 4 ? 'positive' : feedbackData.rating <= 2 ? 'negative' : 'neutral',
      specificFeedback: {
        usefulness: feedbackData.usefulness,
        accuracy: feedbackData.accuracy,
        relevance: feedbackData.relevance
      },
      comments: feedbackData.comments
    })
  }

  // 提交完整反馈
  const submitFullFeedback = async (feedbackData: {
    rating: number
    sentiment: 'positive' | 'negative' | 'neutral'
    specificFeedback?: {
      usefulness: number
      accuracy: number
      relevance: number
    }
    comments: string
  }) => {
    setLoading(true)

    try {
      const { deviceType, timeOfDay } = getDeviceInfo()

      const feedbackId = await submitFeedback({
        userId,
        noteId,
        analysisId,
        feedbackType,
        rating: feedbackData.rating,
        sentiment: feedbackData.sentiment,
        comments: feedbackData.comments,
        specificFeedback: feedbackData.specificFeedback,
        context: {
          deviceType,
          timeOfDay,
          sessionDuration: Math.floor(Math.random() * 3600) + 300, // 模拟会话时长
          userAction: 'like' as const
        }
      })

      setSubmitted(true)
      setIsOpen(false)
      toast.success('感谢您的反馈！')
      onFeedbackSubmit?.(feedbackId)

      // 重置状态
      setTimeout(() => setSubmitted(false), 3000)
    } catch (error) {
      console.error('Feedback submission failed:', error)
      toast.error('反馈提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 渲染反馈统计
  const renderStats = () => {
    if (!showStats || !analytics) return null

    const typeStats = analytics.feedbackDistribution[feedbackType] || 0
    const totalStats = analytics.totalFeedbacks
    const percentage = totalStats > 0 ? (typeStats / totalStats * 100).toFixed(1) : '0'

    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <BarChart3 className="h-3 w-3" />
        <span>{typeStats} 人已反馈</span>
        <span>({percentage}%)</span>
      </div>
    )
  }

  // 渲染触发器
  const renderTrigger = () => (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {renderStats()}
      <Button
        variant={submitted ? "secondary" : "outline"}
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn(
          'touch-manipulation transition-all',
          submitted && 'bg-green-50 border-green-200 text-green-700'
        )}
      >
        {submitted ? (
          <>
            <CheckCircle className="h-4 w-4 mr-1" />
            已反馈
          </>
        ) : (
          <>
            <MessageSquare className="h-4 w-4 mr-1" />
            提供反馈
          </>
        )}
      </Button>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {renderTrigger()}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            反馈建议
          </DialogTitle>
          <DialogDescription>
            您的反馈将帮助我们改进AI推荐质量
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 内容信息 */}
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>{contentTitle}</strong>
              <span className="ml-2 text-gray-500">
                ({feedbackType === 'summary' ? 'AI摘要' : feedbackType === 'tag' ? '智能标签' : '相关推荐'})
              </span>
            </AlertDescription>
          </Alert>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                快速反馈
              </TabsTrigger>
              <TabsTrigger value="detailed" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                详细反馈
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  这条建议对您有帮助吗？
                </p>
                <QuickFeedbackButtons
                  onFeedback={handleQuickFeedback}
                  disabled={loading}
                />
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4">
              <DetailedFeedbackForm
                onSubmit={handleDetailedFeedback}
                onCancel={() => setIsOpen(false)}
                loading={loading}
              />
            </TabsContent>
          </Tabs>

          {/* 贡献说明 */}
          <div className="text-center text-xs text-gray-500">
            <p>您的每一条反馈都在帮助我们改进AI系统</p>
            {analytics && (
              <p className="mt-1">
                已收集 <strong>{analytics.totalFeedbacks}</strong> 条反馈，
                用户满意度 <strong>{(analytics.satisfactionRate * 100).toFixed(1)}%</strong>
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FeedbackCollection