/**
 * 反馈分析仪表板
 *
 * 展示AI系统反馈数据的分析和趋势
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Star,
  Users,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Download,
  RefreshCw,
  Brain,
  Target,
  Zap,
  Heart,
  Calendar,
  Filter,
  Minus
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { feedbackSystem, type FeedbackAnalytics, type LearningModel } from '@/lib/ai/feedback-system'

export interface FeedbackDashboardProps {
  /** 自动刷新间隔（秒） */
  refreshInterval?: number
  /** 是否显示详细数据 */
  showDetails?: boolean
  /** 自定义样式类 */
  className?: string
}

// 趋势指示器组件
const TrendIndicator: React.FC<{ value: number; label?: string }> = ({ value, label }) => {
  const isPositive = value > 0
  const isNeutral = value === 0

  return (
    <div className="flex items-center gap-2">
      {isPositive && <TrendingUp className="h-4 w-4 text-green-600" />}
      {isNeutral && <Minus className="h-4 w-4 text-gray-400" />}
      {!isPositive && !isNeutral && <TrendingDown className="h-4 w-4 text-red-600" />}
      <span className={cn(
        'font-medium',
        isPositive && 'text-green-600',
        isNeutral && 'text-gray-400',
        !isPositive && !isNeutral && 'text-red-600'
      )}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  )
}

// 性能指标卡片
const PerformanceMetrics: React.FC<{ metrics: any }> = ({ metrics }) => {
  const metricsList = [
    { key: 'usefulness', label: '有用性', icon: Zap, color: 'blue' },
    { key: 'accuracy', label: '准确性', icon: Target, color: 'green' },
    { key: 'relevance', label: '相关性', icon: Brain, color: 'purple' }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metricsList.map(({ key, label, icon: Icon, color }) => {
        const value = metrics[key] || 0
        const percentage = value * 20 // 转换为百分制（1-5分转换为20-100%）

        return (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', `text-${color}-600`)} />
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-lg font-bold">
                  {value.toFixed(1)}/5.0
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
              <div className="mt-1 text-xs text-gray-500">
                {percentage.toFixed(0)}% 满意度
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// 反馈分布图表
const FeedbackDistribution: React.FC<{ analytics: FeedbackAnalytics }> = ({ analytics }) => {
  const { feedbackDistribution, sentimentDistribution } = analytics

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 类型分布 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">反馈类型分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(feedbackDistribution).map(([type, count]) => {
              const total = analytics.totalFeedbacks
              const percentage = (count / total) * 100
              const typeLabels = {
                summary: 'AI摘要',
                tag: '智能标签',
                recommendation: '相关推荐'
              }

              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{typeLabels[type as keyof typeof typeLabels]}</span>
                    <span className="font-medium">{count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 情感分布 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">情感分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(sentimentDistribution).map(([sentiment, count]) => {
              const total = analytics.totalFeedbacks
              const percentage = (count / total) * 100
              const sentimentConfig = {
                positive: { label: '积极', icon: ThumbsUp, color: 'green' },
                negative: { label: '消极', icon: ThumbsDown, color: 'red' },
                neutral: { label: '中性', icon: Minus, color: 'yellow' }
              }

              const config = sentimentConfig[sentiment as keyof typeof sentimentConfig]
              const Icon = config.icon

              return (
                <div key={sentiment} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', `text-${config.color}-600`)} />
                    <span className="text-sm">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <Badge variant="outline" className="text-xs">
                      {percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 模型状态卡片
const ModelStatus: React.FC<{ model: LearningModel | null }> = ({ model }) => {
  if (!model) {
    return (
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          机器学习模型尚未训练，需要更多反馈数据
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          模型状态
          <Badge variant="outline">v{model.version}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {(model.accuracy * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">准确率</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(model.precision * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">精确率</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {(model.recall * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">召回率</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {model.f1Score.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">F1分数</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">训练数据量</span>
            <span className="font-medium">{model.trainingDataSize.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">最后更新</span>
            <span className="font-medium">
              {new Date(model.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">特征维度</div>
          <div className="flex flex-wrap gap-1">
            {model.features.slice(0, 3).map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
            {model.features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{model.features.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function FeedbackDashboard({
  refreshInterval = 30,
  showDetails = true,
  className
}: FeedbackDashboardProps) {
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null)
  const [model, setModel] = useState<LearningModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // 刷新数据
  const refreshData = async () => {
    setLoading(true)
    try {
      const analyticsData = feedbackSystem.getAnalytics()
      const modelData = feedbackSystem.getLearningModel()

      setAnalytics(analyticsData)
      setModel(modelData)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to refresh feedback data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 初始加载和定时刷新
  useEffect(() => {
    refreshData()

    if (refreshInterval > 0) {
      const interval = setInterval(refreshData, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [refreshInterval])

  // 导出报告
  const exportReport = () => {
    const report = feedbackSystem.generateFeedbackReport()
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feedback-report-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 渲染概览标签页
  const renderOverview = () => {
    if (!analytics) {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载反馈数据中...</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* 核心指标 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">总反馈数</p>
                  <p className="text-2xl font-bold">{analytics.totalFeedbacks.toLocaleString()}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">平均评分</p>
                  <p className="text-2xl font-bold">{analytics.averageRating.toFixed(2)}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">满意度</p>
                  <p className="text-2xl font-bold">{(analytics.satisfactionRate * 100).toFixed(1)}%</p>
                </div>
                <Heart className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">周改进率</p>
                  <TrendIndicator value={analytics.trends.weeklyImprovement} />
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 性能指标 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">性能指标</h3>
          <PerformanceMetrics metrics={analytics.performanceMetrics} />
        </div>

        {/* 反馈分布 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">分布统计</h3>
          <FeedbackDistribution analytics={analytics} />
        </div>

        {/* 模型状态 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">AI模型状态</h3>
          <ModelStatus model={model} />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">反馈分析仪表板</h2>
          <p className="text-gray-600">
            实时监控AI系统的用户反馈和性能表现
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              最后更新: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-4 w-4 mr-1" />
            导出报告
          </Button>
        </div>
      </div>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          {showDetails && (
            <>
              <TabsTrigger value="trends">趋势分析</TabsTrigger>
              <TabsTrigger value="model">模型详情</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>

        {showDetails && (
          <>
            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>趋势分析</CardTitle>
                  <CardDescription>
                    查看系统性能随时间的变化趋势
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">周趋势</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <TrendIndicator
                              value={analytics.trends.weeklyImprovement}
                              label="相比上周"
                            />
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">月趋势</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <TrendIndicator
                              value={analytics.trends.monthlyImprovement}
                              label="相比上月"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="model">
              <div className="space-y-4">
                <ModelStatus model={model} />

                {model && (
                  <Card>
                    <CardHeader>
                      <CardTitle>特征重要性</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {model.features.map((feature, index) => (
                          <div key={feature} className="flex items-center justify-between">
                            <span className="text-sm">{feature}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={(1 - index / model.features.length) * 100} className="w-24 h-2" />
                              <span className="text-xs text-gray-500">
                                {((1 - index / model.features.length) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}

export default FeedbackDashboard