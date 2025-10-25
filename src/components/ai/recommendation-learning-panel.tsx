/**
 * 智能推荐学习面板
 *
 * 展示基于机器学习的智能推荐系统
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
  Brain,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  Zap,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Star,
  Clock,
  Eye,
  Heart,
  Share2,
  Bookmark,
  MessageSquare,
  Award,
  Activity,
  GitBranch,
  Database,
  Cpu
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import {
  recommendationLearningEngine,
  type UserProfile,
  type RecommendationResult,
  type LearningMetrics,
  type RecommendationSignal,
  updateRecommendationSignal,
  generateRecommendations,
  addContentVector
} from '@/lib/ai/recommendation-learning'

export interface RecommendationLearningPanelProps {
  /** 用户ID */
  userId: string
  /** 候选内容ID列表 */
  candidateContentIds: string[]
  /** 推荐数量 */
  recommendationCount?: number
  /** 是否显示详细分析 */
  showDetails?: boolean
  /** 是否自动训练 */
  autoTrain?: boolean
  /** 自定义样式类 */
  className?: string
}

// 模拟内容数据
const mockContentData = [
  {
    id: 'content-1',
    title: '深度学习中的注意力机制详解',
    category: 'AI技术',
    tags: ['深度学习', '注意力机制', '神经网络', '机器学习'],
    complexity: 0.8,
    length: 2500,
    viewCount: 1542,
    likeCount: 234,
    averageRating: 4.6,
    qualityScore: 0.92,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'content-2',
    title: 'React 18并发特性完全指南',
    category: '前端开发',
    tags: ['React', '并发特性', 'Hooks', '前端框架'],
    complexity: 0.6,
    length: 1800,
    viewCount: 892,
    likeCount: 156,
    averageRating: 4.4,
    qualityScore: 0.88,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'content-3',
    title: 'TypeScript高级类型系统实战',
    category: '编程语言',
    tags: ['TypeScript', '类型系统', '泛型', '类型推断'],
    complexity: 0.7,
    length: 2200,
    viewCount: 1203,
    averageRating: 4.7,
    qualityScore: 0.91,
    likeCount: 189,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'content-4',
    title: '云原生应用架构设计模式',
    category: '架构设计',
    tags: ['云原生', '微服务', '容器化', 'DevOps'],
    complexity: 0.9,
    length: 3000,
    viewCount: 756,
    likeCount: 98,
    averageRating: 4.3,
    qualityScore: 0.85,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
]

export function RecommendationLearningPanel({
  userId,
  candidateContentIds,
  recommendationCount = 5,
  showDetails = true,
  autoTrain = true,
  className
}: RecommendationLearningPanelProps) {
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [simulationRunning, setSimulationRunning] = useState(false)
  const [activeTab, setActiveTab] = useState('recommendations')
  const [refreshKey, setRefreshKey] = useState(0)

  // 初始化内容数据
  useEffect(() => {
    mockContentData.forEach(content => {
      addContentVector({
        id: content.id,
        features: {
          topics: [Math.random(), Math.random(), Math.random()], // 简化的特征向量
          tags: content.tags,
          category: content.category,
          complexity: content.complexity,
          length: content.length,
          readabilityScore: 0.8,
          sentiment: 0.1
        },
        metadata: {
          createdAt: content.createdAt,
          viewCount: content.viewCount,
          likeCount: content.likeCount,
          shareCount: Math.floor(content.likeCount * 0.3),
          averageRating: content.averageRating,
          qualityScore: content.qualityScore
        }
      })
    })
  }, [])

  // 生成推荐
  useEffect(() => {
    const results = generateRecommendations(userId, candidateContentIds, recommendationCount)
    setRecommendations(results)
  }, [userId, candidateContentIds, recommendationCount, refreshKey])

  // 获取用户画像和指标
  useEffect(() => {
    const profile = recommendationLearningEngine.getUserProfile(userId)
    setUserProfile(profile)

    const engineMetrics = recommendationLearningEngine.getMetrics()
    setMetrics(engineMetrics)
  }, [userId, refreshKey])

  // 模拟用户交互
  const simulateInteraction = async (contentId: string, action: string) => {
    const signal: RecommendationSignal = {
      userId,
      contentId,
      signalType: action as any,
      timestamp: new Date().toISOString(),
      context: {
        source: 'recommendation',
        position: 0,
        sessionId: `session_${Date.now()}`,
        deviceType: 'desktop'
      },
      value: action === 'rating' ? 4 + Math.random() : undefined
    }

    updateRecommendationSignal(signal)
    setRefreshKey(prev => prev + 1)

    toast.success(`已记录${action === 'like' ? '点赞' : action === 'share' ? '分享' : action === 'save' ? '收藏' : '评分'}操作`)
  }

  // 运行模拟
  const runSimulation = async () => {
    setSimulationRunning(true)

    while (simulationRunning) {
      // 随机选择内容和操作
      const contentId = candidateContentIds[Math.floor(Math.random() * candidateContentIds.length)]
      const actions = ['like', 'share', 'save', 'rating', 'view', 'skip']
      const action = actions[Math.floor(Math.random() * actions.length)]

      await simulateInteraction(contentId, action)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    }
  }

  // 停止模拟
  const stopSimulation = () => {
    setSimulationRunning(false)
  }

  // 手动训练模型
  const trainModels = async () => {
    setIsTraining(true)
    try {
      await recommendationLearningEngine.trainModels()
      setRefreshKey(prev => prev + 1)
      toast.success('模型训练完成')
    } catch (error) {
      console.error('Training failed:', error)
      toast.error('模型训练失败')
    } finally {
      setIsTraining(false)
    }
  }

  // 渲染推荐结果
  const renderRecommendations = () => (
    <div className="space-y-4">
      {recommendations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>暂无推荐结果</p>
          <p className="text-sm mt-1">请提供更多内容或训练推荐模型</p>
        </div>
      ) : (
        recommendations.map((recommendation, index) => {
          const content = mockContentData.find(c => c.id === recommendation.contentId)
          if (!content) return null

          return (
            <Card key={recommendation.contentId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-1">{content.title}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {content.category}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-xs text-gray-600">
                          {content.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {recommendation.explanation}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 mb-1">
                      {(recommendation.score * 100).toFixed(0)}%
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {recommendation.strategy}
                    </Badge>
                  </div>
                </div>

                {/* 推荐因子 */}
                {showDetails && (
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">内容相似度</span>
                      <span className="font-medium">
                        {(recommendation.factors.contentSimilarity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={recommendation.factors.contentSimilarity * 100} className="h-1" />

                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">用户匹配度</span>
                      <span className="font-medium">
                        {(recommendation.factors.userProfileMatch * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={recommendation.factors.userProfileMatch * 100} className="h-1" />

                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">置信度</span>
                      <span className="font-medium">
                        {(recommendation.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={recommendation.confidence * 100} className="h-1" />
                  </div>
                )}

                {/* 标签 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {content.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {content.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{content.tags.length - 3}</span>
                  )}
                </div>

                {/* 交互按钮 */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => simulateInteraction(recommendation.contentId, 'like')}
                    className="touch-manipulation"
                  >
                    <Heart className="h-3 w-3 mr-1" />
                    喜欢
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => simulateInteraction(recommendation.contentId, 'share')}
                    className="touch-manipulation"
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    分享
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => simulateInteraction(recommendation.contentId, 'save')}
                    className="touch-manipulation"
                  >
                    <Bookmark className="h-3 w-3 mr-1" />
                    收藏
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => simulateInteraction(recommendation.contentId, 'rating')}
                    className="touch-manipulation"
                  >
                    <Star className="h-3 w-3 mr-1" />
                    评分
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )

  // 渲染用户画像
  const renderUserProfile = () => {
    if (!userProfile) {
      return (
        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            用户画像数据不足，需要更多的用户交互数据
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="space-y-4">
        {/* 交互模式 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">交互模式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {userProfile.interactionPatterns.likesCount}
                </div>
                <div className="text-xs text-gray-500">点赞数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {userProfile.interactionPatterns.sharesCount}
                </div>
                <div className="text-xs text-gray-500">分享数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {userProfile.interactionPatterns.savesCount}
                </div>
                <div className="text-xs text-gray-500">收藏数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {userProfile.interactionPatterns.avgRating.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">平均评分</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 内容偏好 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">内容偏好</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>偏好的内容长度</span>
                  <Badge variant="outline">
                    {userProfile.readingHabits.preferredLength}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>偏好的复杂度</span>
                  <Badge variant="outline">
                    {userProfile.readingHabits.preferredComplexity}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>阅读速度</span>
                  <span className="font-medium">
                    {userProfile.readingHabits.readingSpeed} 词/分钟
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 时间模式 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">使用时间模式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">最活跃时段</span>
                </div>
                <div className="text-lg font-bold">
                  {userProfile.temporalPatterns.mostActiveHour}:00
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-sm">平均会话时长</span>
                </div>
                <div className="text-lg font-bold">
                  {userProfile.temporalPatterns.sessionDuration}分钟
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 渲染学习指标
  const renderMetrics = () => {
    if (!metrics) {
      return (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>暂无指标数据</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">精准度</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(metrics.precision * 100).toFixed(1)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">召回率</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(metrics.recall * 100).toFixed(1)}%
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">F1分数</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {metrics.f1Score.toFixed(3)}
                  </p>
                </div>
                <Award className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">满意度</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {(metrics.satisfaction * 100).toFixed(1)}%
                  </p>
                </div>
                <Heart className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 其他指标 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">其他性能指标</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-cyan-600">
                  {(metrics.mrr * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">MRR</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-pink-600">
                  {(metrics.coverage * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">覆盖率</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-indigo-600">
                  {(metrics.diversity * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">多样性</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            智能推荐学习系统
          </CardTitle>
          <CardDescription>
            基于机器学习的个性化推荐，持续学习和优化
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={runSimulation}
              disabled={simulationRunning}
              className="touch-manipulation"
            >
              <Play className="h-4 w-4 mr-1" />
              开始模拟
            </Button>
            <Button
              onClick={stopSimulation}
              disabled={!simulationRunning}
              variant="outline"
              className="touch-manipulation"
            >
              <Pause className="h-4 w-4 mr-1" />
              停止模拟
            </Button>
            <Button
              onClick={trainModels}
              disabled={isTraining}
              variant="outline"
              className="touch-manipulation"
            >
              {isTraining ? (
                <>
                  <Cpu className="h-4 w-4 mr-1 animate-spin" />
                  训练中...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-1" />
                  训练模型
                </>
              )}
            </Button>
            <Button
              onClick={() => setRefreshKey(prev => prev + 1)}
              variant="outline"
              className="touch-manipulation"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              刷新推荐
            </Button>
          </div>

          {simulationRunning && (
            <Alert className="mt-4">
              <Zap className="h-4 w-4" />
              <AlertDescription>
                正在模拟用户交互，收集学习数据...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            推荐结果
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            用户画像
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            学习指标
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          {renderRecommendations()}
        </TabsContent>

        <TabsContent value="profile">
          {renderUserProfile()}
        </TabsContent>

        <TabsContent value="metrics">
          {renderMetrics()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RecommendationLearningPanel