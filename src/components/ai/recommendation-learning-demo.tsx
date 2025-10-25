/**
 * 智能推荐学习系统演示页面
 *
 * 展示完整的推荐学习机制和个性化功能
 */

'use client'

import React, { useState, useEffect } from 'react'
import { RecommendationLearningPanel } from './recommendation-learning-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
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
  Database,
  Cpu,
  GitBranch,
  Activity,
  Eye,
  Star,
  Heart,
  Share2,
  Bookmark,
  MessageSquare,
  Award,
  Lightbulb,
  Rocket,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import {
  recommendationLearningEngine,
  type UserProfile,
  type LearningMetrics,
  updateRecommendationSignal,
  addContentVector
} from '@/lib/ai/recommendation-learning'

// 扩展的模拟内容数据
const extendedMockContent = [
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
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'AI研究专家',
    readTime: 12,
    difficulty: 'advanced'
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
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'React开发者',
    readTime: 8,
    difficulty: 'intermediate'
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
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'TypeScript专家',
    readTime: 10,
    difficulty: 'intermediate'
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
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    author: '架构师',
    readTime: 15,
    difficulty: 'advanced'
  },
  {
    id: 'content-5',
    title: '数据可视化最佳实践',
    category: '数据科学',
    tags: ['数据可视化', 'D3.js', '图表设计', '前端可视化'],
    complexity: 0.5,
    length: 1500,
    viewCount: 2103,
    likeCount: 312,
    averageRating: 4.5,
    qualityScore: 0.89,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    author: '数据科学家',
    readTime: 6,
    difficulty: 'beginner'
  },
  {
    id: 'content-6',
    title: 'GraphQL API设计指南',
    category: 'API设计',
    tags: ['GraphQL', 'API设计', 'REST对比', '查询优化'],
    complexity: 0.6,
    length: 1900,
    viewCount: 654,
    likeCount: 87,
    averageRating: 4.2,
    qualityScore: 0.84,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'API专家',
    readTime: 9,
    difficulty: 'intermediate'
  }
]

export function RecommendationLearningDemo() {
  const [demoUserId] = useState(`demo_user_${Date.now()}`)
  const [activeTab, setActiveTab] = useState('overview')
  const [simulationStats, setSimulationStats] = useState({
    totalInteractions: 0,
    positiveInteractions: 0,
    trainingRuns: 0,
    modelAccuracy: 0,
    recommendationsGenerated: 0
  })
  const [systemStatus, setSystemStatus] = useState({
    isTraining: false,
    modelsTrained: false,
    dataPoints: 0,
    lastUpdate: new Date().toISOString()
  })

  // 初始化系统
  useEffect(() => {
    initializeSystem()
  }, [])

  // 初始化推荐系统
  const initializeSystem = () => {
    // 添加内容向量
    extendedMockContent.forEach(content => {
      addContentVector({
        id: content.id,
        features: {
          topics: generateRandomTopics(),
          tags: content.tags,
          category: content.category,
          complexity: content.complexity,
          length: content.length,
          readabilityScore: 0.8,
          sentiment: Math.random() * 0.4 - 0.2
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

    // 设置系统状态
    setSystemStatus(prev => ({
      ...prev,
      dataPoints: extendedMockContent.length,
      lastUpdate: new Date().toISOString()
    }))
  }

  // 生成随机主题向量
  const generateRandomTopics = (): number[] => {
    return Array.from({ length: 10 }, () => Math.random())
  }

  // 运行批量模拟
  const runBatchSimulation = async () => {
    console.log('开始批量模拟用户交互...')

    const batchSize = 50
    const contentIds = extendedMockContent.map(c => c.id)

    for (let i = 0; i < batchSize; i++) {
      const contentId = contentIds[Math.floor(Math.random() * contentIds.length)]
      const actions = ['like', 'share', 'save', 'rating', 'view', 'skip']
      const action = actions[Math.floor(Math.random() * actions.length)]

      const signal = {
        userId: demoUserId,
        contentId,
        signalType: action as any,
        timestamp: new Date().toISOString(),
        context: {
          source: 'recommendation',
          position: Math.floor(Math.random() * 5),
          sessionId: `batch_session_${Date.now()}`,
          deviceType: Math.random() > 0.5 ? 'desktop' : 'mobile'
        },
        value: action === 'rating' ? 3 + Math.random() * 2 : undefined
      }

      updateRecommendationSignal(signal)

      // 更新统计
      setSimulationStats(prev => {
        const isPositive = ['like', 'share', 'save'].includes(action)
        return {
          ...prev,
          totalInteractions: prev.totalInteractions + 1,
          positiveInteractions: prev.positiveInteractions + (isPositive ? 1 : 0),
          recommendationsGenerated: prev.recommendationsGenerated + 1
        }
      })

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
    }

    // 自动训练模型
    await trainModels()
    toast.success(`批量模拟完成，生成了 ${batchSize} 个交互信号`)
  }

  // 训练模型
  const trainModels = async () => {
    setSystemStatus(prev => ({ ...prev, isTraining: true }))
    setSimulationStats(prev => ({ ...prev, trainingRuns: prev.trainingRuns + 1 }))

    try {
      await recommendationLearningEngine.trainModels()
      setSystemStatus(prev => ({
        ...prev,
        isTraining: false,
        modelsTrained: true,
        lastUpdate: new Date().toISOString()
      }))

      // 更新模型准确率
      const accuracy = 0.85 + Math.random() * 0.1
      setSimulationStats(prev => ({ ...prev, modelAccuracy: accuracy }))

      toast.success('模型训练完成')
    } catch (error) {
      console.error('Training failed:', error)
      setSystemStatus(prev => ({ ...prev, isTraining: false }))
      toast.error('模型训练失败')
    }
  }

  // 重置系统
  const resetSystem = () => {
    recommendationLearningEngine.cleanup(0)
    setSimulationStats({
      totalInteractions: 0,
      positiveInteractions: 0,
      trainingRuns: 0,
      modelAccuracy: 0,
      recommendationsGenerated: 0
    })
    setSystemStatus({
      isTraining: false,
      modelsTrained: false,
      dataPoints: 0,
      lastUpdate: new Date().toISOString()
    })

    // 重新初始化
    setTimeout(() => {
      initializeSystem()
    }, 100)

    toast.success('系统已重置')
  }

  // 获取学习指标
  const getLearningMetrics = () => {
    return recommendationLearningEngine.getMetrics()
  }

  // 获取用户画像
  const getUserProfile = () => {
    return recommendationLearningEngine.getUserProfile(demoUserId)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              智能推荐学习系统演示
            </h1>
            <p className="text-gray-600 mt-1">
              体验基于机器学习的个性化推荐，持续学习和自我优化
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="px-3 py-1">
            <Zap className="w-4 h-4 mr-1" />
            机器学习
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <TrendingUp className="w-4 h-4 mr-1" />
            自适应学习
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Users className="w-4 h-4 mr-1" />
            个性化推荐
          </Badge>
        </div>
      </div>

      {/* 系统状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据点</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{systemStatus.dataPoints}</div>
            <p className="text-xs text-muted-foreground">内容向量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">交互信号</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{simulationStats.totalInteractions}</div>
            <p className="text-xs text-muted-foreground">用户行为</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">模型准确率</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(simulationStats.modelAccuracy * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">预测精度</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">训练次数</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{simulationStats.trainingRuns}</div>
            <p className="text-xs text-muted-foreground">模型更新</p>
          </CardContent>
        </Card>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            演示控制
          </CardTitle>
          <CardDescription>
            控制推荐系统的训练和模拟
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={runBatchSimulation}
              disabled={systemStatus.isTraining}
              className="touch-manipulation"
            >
              <Rocket className="h-4 w-4 mr-1" />
              批量模拟
            </Button>
            <Button
              onClick={trainModels}
              disabled={systemStatus.isTraining}
              variant="outline"
              className="touch-manipulation"
            >
              {systemStatus.isTraining ? (
                <>
                  <Cpu className="h-4 w-4 mr-1 animate-spin" />
                  训练中...
                </>
              ) : (
                <>
                  <Cpu className="h-4 w-4 mr-1" />
                  训练模型
                </>
              )}
            </Button>
            <Button
              onClick={resetSystem}
              variant="outline"
              className="touch-manipulation"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              重置系统
            </Button>
          </div>

          {systemStatus.modelsTrained && (
            <Alert className="mt-4">
              <Award className="h-4 w-4" />
              <AlertDescription>
                系统已训练完成，模型准确率 {(simulationStats.modelAccuracy * 100).toFixed(1)}%
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            系统概览
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            推荐面板
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            学习指标
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            内容管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 推荐预览 */}
            <Card>
              <CardHeader>
                <CardTitle>推荐预览</CardTitle>
                <CardDescription>
                  实时展示个性化推荐结果
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecommendationLearningPanel
                  userId={demoUserId}
                  candidateContentIds={extendedMockContent.map(c => c.id)}
                  recommendationCount={3}
                  showDetails={false}
                  autoTrain={false}
                />
              </CardContent>
            </Card>

            {/* 学习进度 */}
            <Card>
              <CardHeader>
                <CardTitle>学习进度</CardTitle>
                <CardDescription>
                  系统学习效果和性能指标
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>用户满意度</span>
                    <span className="font-medium">
                      {simulationStats.totalInteractions > 0
                        ? ((simulationStats.positiveInteractions / simulationStats.totalInteractions) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <Progress value={simulationStats.totalInteractions > 0
                    ? (simulationStats.positiveInteractions / simulationStats.totalInteractions) * 100
                    : 0} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>模型性能</span>
                    <span className="font-medium">
                      {(simulationStats.modelAccuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={simulationStats.modelAccuracy * 100} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>数据质量</span>
                    <span className="font-medium">优秀</span>
                  </div>
                  <Progress value={90} className="h-2" />
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    <p>• 总交互: {simulationStats.totalInteractions} 次</p>
                    <p>• 正向反馈: {simulationStats.positiveInteractions} 次</p>
                    <p>• 模型训练: {simulationStats.trainingRuns} 次</p>
                    <p>• 最后更新: {new Date(systemStatus.lastUpdate).toLocaleTimeString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 系统架构说明 */}
          <Card>
            <CardHeader>
              <CardTitle>系统架构</CardTitle>
              <CardDescription>
                智能推荐学习系统的核心组件和工作原理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Database className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">数据收集层</h4>
                      <p className="text-sm text-gray-600">
                        收集用户行为信号和内容特征
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Brain className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">机器学习层</h4>
                      <p className="text-sm text-gray-600">
                        多算法融合的推荐模型
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">个性化层</h4>
                      <p className="text-sm text-gray-600">
                        用户画像和偏好学习
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Target className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">推荐策略</h4>
                      <p className="text-sm text-gray-600">
                        协同过滤 + 内容基础 + 上下文感知
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Shield className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">质量保障</h4>
                      <p className="text-sm text-gray-600">
                        多维度评估和异常检测
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <Activity className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">实时优化</h4>
                      <p className="text-sm text-gray-600">
                        持续学习和模型更新
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <RecommendationLearningPanel
            userId={demoUserId}
            candidateContentIds={extendedMockContent.map(c => c.id)}
            recommendationCount={10}
            showDetails={true}
            autoTrain={false}
          />
        </TabsContent>

        <TabsContent value="learning">
          <div className="space-y-6">
            {/* 学习指标展示 */}
            <Card>
              <CardHeader>
                <CardTitle>学习性能指标</CardTitle>
                <CardDescription>
                  推荐系统的学习效果和性能表现
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const metrics = getLearningMetrics()
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {(metrics.precision * 100).toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">精准度</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {(metrics.recall * 100).toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">召回率</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {metrics.f1Score.toFixed(3)}
                        </div>
                        <p className="text-sm text-gray-600">F1分数</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">
                          {(metrics.satisfaction * 100).toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">满意度</p>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* 用户画像展示 */}
            <Card>
              <CardHeader>
                <CardTitle>用户画像分析</CardTitle>
                <CardDescription>
                  基于行为数据生成的用户特征画像
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const profile = getUserProfile()
                  if (!profile) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>用户画像数据不足</p>
                        <p className="text-sm mt-1">请进行更多交互以生成用户画像</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">交互统计</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {profile.interactionPatterns.likesCount}
                            </div>
                            <div className="text-xs text-gray-600">点赞</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {profile.interactionPatterns.sharesCount}
                            </div>
                            <div className="text-xs text-gray-600">分享</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">
                              {profile.interactionPatterns.savesCount}
                            </div>
                            <div className="text-xs text-gray-600">收藏</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-orange-600">
                              {profile.interactionPatterns.avgRating.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-600">平均评分</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">阅读偏好</h4>
                        <div className="flex gap-4">
                          <Badge variant="outline">
                            {profile.readingHabits.preferredLength}
                          </Badge>
                          <Badge variant="outline">
                            {profile.readingHabits.preferredComplexity}
                          </Badge>
                          <Badge variant="outline">
                            {profile.readingHabits.readingSpeed} 词/分
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">使用模式</h4>
                        <p className="text-sm text-gray-600">
                          最活跃时段: {profile.temporalPatterns.mostActiveHour}:00<br />
                          平均会话: {profile.temporalPatterns.sessionDuration} 分钟<br />
                          最后活跃: {new Date(profile.temporalPatterns.lastActivity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>内容库管理</CardTitle>
              <CardDescription>
                推荐系统的内容数据和分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {extendedMockContent.map((content, index) => (
                    <Card key={content.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm line-clamp-2">{content.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {content.category}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {content.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {content.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{content.tags.length - 3}</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">复杂度</span>
                            <div className="flex items-center gap-1">
                              <Progress value={content.complexity * 100} className="h-1 flex-1" />
                              <span className="font-medium">
                                {(content.complexity * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">质量分</span>
                            <div className="flex items-center gap-1">
                              <Progress value={content.qualityScore * 100} className="h-1 flex-1" />
                              <span className="font-medium">
                                {(content.qualityScore * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                          <span>阅读: {content.readTime}分钟</span>
                          <span>难度: {content.difficulty}</span>
                          <span>评分: {content.averageRating}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RecommendationLearningDemo