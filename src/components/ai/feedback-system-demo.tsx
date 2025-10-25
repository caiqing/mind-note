/**
 * 反馈系统演示页面
 *
 * 完整展示用户反馈收集和分析功能
 */

'use client'

import React, { useState, useEffect } from 'react'
import { FeedbackCollection } from './feedback-collection'
import { FeedbackDashboard } from './feedback-dashboard'
import { AIAnalysisIntegratedPanel, type AnalysisResult } from './ai-analysis-integrated-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  MessageSquare,
  BarChart3,
  Users,
  Star,
  ThumbsUp,
  Brain,
  Zap,
  Target,
  Heart,
  TrendingUp,
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { feedbackSystem, submitFeedback, generateFeedbackReport } from '@/lib/ai/feedback-system'

// 模拟分析结果
const mockAnalysisResult: AnalysisResult = {
  id: 'demo-analysis-001',
  summary: {
    content: '这是一个关于人工智能和机器学习的综合性分析报告。内容涵盖了从基础概念到实际应用的完整知识体系，包括深度学习、自然语言处理、计算机视觉等核心技术领域。通过深入分析现有技术趋势和发展方向，我们识别出了关键的创新机会和挑战。报告特别强调了数据质量、算法优化和伦理考量在现代AI系统中的重要性，为读者提供了全面的技术洞察和实践指导。',
    style: 'paragraph',
    length: 'long',
    qualityScore: 4.5,
    generatedAt: new Date().toISOString(),
    provider: 'AI-Analysis-Engine-v3.0',
    originalLength: 256,
    keyPoints: [
      '深入探讨了AI技术的核心概念和发展历程',
      '提供了实际应用场景和案例分析',
      '强调了数据质量和算法优化的重要性',
      '涵盖了伦理考量和负责任AI的实践指导'
    ]
  },
  tags: [
    {
      id: 'tag-1',
      name: '人工智能',
      category: 'content',
      color: 'blue',
      relevance: 0.95,
      confidence: 0.92,
      count: 25,
      description: 'AI相关技术标签',
      createdAt: new Date().toISOString(),
      isUserGenerated: false,
    },
    {
      id: 'tag-2',
      name: '机器学习',
      category: 'content',
      color: 'green',
      relevance: 0.88,
      confidence: 0.89,
      createdAt: new Date().toISOString(),
      isUserGenerated: false,
    },
    {
      id: 'tag-3',
      name: '深度学习',
      category: 'content',
      color: 'purple',
      relevance: 0.92,
      confidence: 0.87,
      createdAt: new Date().toISOString(),
      isUserGenerated: false,
    },
    {
      id: 'tag-4',
      name: '高价值内容',
      category: 'priority',
      color: 'orange',
      relevance: 0.90,
      confidence: 0.88,
      createdAt: new Date().toISOString(),
      isUserGenerated: true,
    }
  ],
  recommendations: [
    {
      id: 'rec-1',
      title: '深度学习框架对比分析',
      content: '详细比较TensorFlow、PyTorch、JAX等主流深度学习框架的特点、性能和适用场景...',
      summary: '深入分析各大深度学习框架的优缺点和选择建议',
      tags: ['深度学习', 'TensorFlow', 'PyTorch', '框架对比'],
      similarity: 0.94,
      relevanceScore: 0.91,
      recommendationReason: {
        primary: '内容高度相关，都属于AI技术领域',
        secondary: ['相似的技术栈', '互补的知识内容', '相同的目标受众'],
        confidence: 0.96,
      },
      metadata: {
        createdAt: '2024-01-25T10:00:00Z',
        updatedAt: '2024-01-25T15:30:00Z',
        viewCount: 2456,
        likeCount: 342,
        commentCount: 58,
        readingTime: 12,
        author: 'AI研究专家',
        category: '技术文档',
      },
      aiInsights: {
        keyTopics: ['深度学习', '框架比较', '性能分析', '最佳实践'],
        sentiment: 'positive',
        complexity: 'advanced',
        actionability: 'high',
      },
    },
    {
      id: 'rec-2',
      title: '自然语言处理最新进展',
      content: '介绍NLP领域的最新技术突破，包括大语言模型、Transformer架构、多模态理解等...',
      summary: '全面了解NLP技术的前沿发展和应用前景',
      tags: ['NLP', '大语言模型', 'Transformer', '多模态'],
      similarity: 0.89,
      relevanceScore: 0.86,
      recommendationReason: {
        primary: '相关的AI技术领域，内容互补',
        secondary: ['相同的技术方向', '相似的应用场景'],
        confidence: 0.92,
      },
      metadata: {
        createdAt: '2024-01-24T14:20:00Z',
        updatedAt: '2024-01-25T09:15:00Z',
        viewCount: 1834,
        likeCount: 267,
        commentCount: 43,
        readingTime: 10,
        author: 'NLP工程师',
        category: '技术文档',
      },
      aiInsights: {
        keyTopics: ['NLP', 'LLM', 'Transformer', '应用实践'],
        sentiment: 'positive',
        complexity: 'intermediate',
        actionability: 'high',
      },
    }
  ],
  metadata: {
    analyzedAt: new Date().toISOString(),
    processingTime: 2800,
    confidence: 0.94,
    modelVersion: 'v3.2.0',
    analysisTypes: ['summarization', 'tagging', 'recommendation', 'sentiment-analysis']
  }
}

export function FeedbackSystemDemo() {
  const [activeTab, setActiveTab] = useState('demo')
  const [feedbackHistory, setFeedbackHistory] = useState<string[]>([])
  const [simulationRunning, setSimulationRunning] = useState(false)
  const [demoUserId] = useState(`demo_user_${Date.now()}`)
  const [refreshKey, setRefreshKey] = useState(0)

  // 模拟反馈数据生成
  const generateSimulationFeedback = async () => {
    const feedbackTypes: Array<'summary' | 'tag' | 'recommendation'> = ['summary', 'tag', 'recommendation']
    const sentiments: Array<'positive' | 'negative' | 'neutral'> = ['positive', 'positive', 'positive', 'neutral', 'negative']

    const feedbackType = feedbackTypes[Math.floor(Math.random() * feedbackTypes.length)]
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)]
    const rating = sentiment === 'positive' ? 4 + Math.random() : sentiment === 'neutral' ? 3 + Math.random() : 1 + Math.random() * 2

    try {
      const feedbackId = await submitFeedback({
        userId: demoUserId,
        noteId: `demo_note_${Math.floor(Math.random() * 100)}`,
        analysisId: `demo_analysis_${Math.floor(Math.random() * 100)}`,
        feedbackType,
        rating,
        sentiment,
        comments: `模拟${sentiment === 'positive' ? '积极' : sentiment === 'negative' ? '消极' : '中性'}反馈`,
        specificFeedback: {
          usefulness: rating,
          accuracy: rating - 0.2 + Math.random() * 0.4,
          relevance: rating - 0.1 + Math.random() * 0.2
        },
        context: {
          deviceType: Math.random() > 0.5 ? 'mobile' : 'desktop',
          timeOfDay: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)],
          sessionDuration: 300 + Math.random() * 1800,
          userAction: 'like' as const
        }
      })

      setFeedbackHistory(prev => [feedbackId, ...prev.slice(0, 9)])
      setRefreshKey(prev => prev + 1) // 触发仪表板刷新

    } catch (error) {
      console.error('Simulation feedback failed:', error)
    }
  }

  // 运行模拟
  const runSimulation = async () => {
    setSimulationRunning(true)

    while (simulationRunning) {
      await generateSimulationFeedback()
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    }
  }

  // 停止模拟
  const stopSimulation = () => {
    setSimulationRunning(false)
  }

  // 处理反馈提交
  const handleFeedbackSubmit = (feedbackId: string) => {
    setFeedbackHistory(prev => [feedbackId, ...prev.slice(0, 9)])
    setRefreshKey(prev => prev + 1)
    toast.success('反馈已提交并记录')
  }

  // 导出反馈报告
  const handleExportReport = () => {
    try {
      const report = generateFeedbackReport()
      const blob = new Blob([report], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feedback-system-report-${new Date().toISOString().split('T')[0]}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('报告已导出')
    } catch (error) {
      toast.error('导出失败')
    }
  }

  // 清理数据
  const handleCleanup = () => {
    feedbackSystem.cleanupOldFeedback(0) // 清理所有数据
    setFeedbackHistory([])
    setRefreshKey(prev => prev + 1)
    toast.success('数据已清理')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              AI反馈系统演示
            </h1>
            <p className="text-gray-600 mt-1">
              体验完整的用户反馈收集、分析和学习系统
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="px-3 py-1">
            <Star className="w-4 h-4 mr-1" />
            智能学习
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <TrendingUp className="w-4 h-4 mr-1" />
            实时分析
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Users className="w-4 h-4 mr-1" />
            个性化推荐
          </Badge>
        </div>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            演示控制
          </CardTitle>
          <CardDescription>
            控制反馈系统的模拟和演示
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
              onClick={generateSimulationFeedback}
              disabled={simulationRunning}
              variant="outline"
              className="touch-manipulation"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              生成单条反馈
            </Button>
            <Button
              onClick={handleExportReport}
              variant="outline"
              className="touch-manipulation"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              导出报告
            </Button>
            <Button
              onClick={handleCleanup}
              variant="outline"
              className="touch-manipulation"
            >
              清理数据
            </Button>
          </div>

          {simulationRunning && (
            <Alert className="mt-4">
              <Zap className="h-4 w-4" />
              <AlertDescription>
                正在模拟用户反馈生成中... ({feedbackHistory.length} 条反馈)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="demo" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            反馈演示
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            分析仪表板
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            反馈历史
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          {/* AI分析演示 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">AI分析结果演示</h3>
            <AIAnalysisIntegratedPanel
              noteId="demo-note-001"
              noteTitle="人工智能技术发展趋势分析"
              noteContent="这是一份关于人工智能技术发展的详细分析报告..."
              analysisResult={mockAnalysisResult}
              analysisStatus="completed"
              collapsible={true}
              defaultExpanded={true}
            />
          </div>

          {/* 反馈收集演示 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">反馈收集演示</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">AI摘要反馈</CardTitle>
                  <CardDescription className="text-sm">
                    对AI生成的摘要提供反馈
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FeedbackCollection
                    noteId="demo-note-001"
                    analysisId="demo-analysis-001"
                    userId={demoUserId}
                    feedbackType="summary"
                    contentTitle="人工智能技术发展趋势分析"
                    showStats={true}
                    onFeedbackSubmit={handleFeedbackSubmit}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">智能标签反馈</CardTitle>
                  <CardDescription className="text-sm">
                    对AI生成的标签提供反馈
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FeedbackCollection
                    noteId="demo-note-001"
                    analysisId="demo-analysis-001"
                    userId={demoUserId}
                    feedbackType="tag"
                    contentTitle="AI技术标签"
                    showStats={true}
                    onFeedbackSubmit={handleFeedbackSubmit}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">推荐内容反馈</CardTitle>
                  <CardDescription className="text-sm">
                    对相关推荐提供反馈
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FeedbackCollection
                    noteId="demo-note-001"
                    analysisId="demo-analysis-001"
                    userId={demoUserId}
                    feedbackType="recommendation"
                    contentTitle="深度学习框架对比分析"
                    showStats={true}
                    onFeedbackSubmit={handleFeedbackSubmit}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <FeedbackDashboard
            key={refreshKey} // 强制重新渲染
            refreshInterval={5}
            showDetails={true}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                反馈历史记录
              </CardTitle>
              <CardDescription>
                查看最近提交的反馈记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无反馈记录</p>
                  <p className="text-sm mt-1">开始模拟或提交反馈以查看历史</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbackHistory.map((feedbackId, index) => (
                    <div key={feedbackId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">反馈 #{feedbackHistory.length - index}</p>
                          <p className="text-xs text-gray-500">{feedbackId}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {new Date().toLocaleTimeString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 功能说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">系统功能特性</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <h4 className="font-medium">智能反馈收集</h4>
              </div>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 快速反馈和详细反馈模式</li>
                <li>• 多维度评价体系</li>
                <li>• 上下文感知收集</li>
                <li>• 移动端优化体验</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium">机器学习优化</h4>
              </div>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 自动模型训练</li>
                <li>• 个性化推荐调整</li>
                <li>• 性能指标监控</li>
                <li>• 持续学习改进</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <h4 className="font-medium">实时分析仪表板</h4>
              </div>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 实时数据更新</li>
                <li>• 趋势分析可视化</li>
                <li>• 性能指标展示</li>
                <li>• 报告自动生成</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FeedbackSystemDemo