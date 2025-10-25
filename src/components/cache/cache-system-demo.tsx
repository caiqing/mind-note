/**
 * 缓存系统演示组件
 *
 * 展示多级缓存架构、智能策略和性能监控的完整功能
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// 缓存系统导入 (实际项目中需要正确导入)
import {
  intelligentCacheStrategyManager,
  DataType,
  CachePerformanceMetrics
} from '@/lib/cache/intelligent-cache-strategy'
import {
  cachePerformanceMonitor,
  CacheAlert,
  PerformanceReport
} from '@/lib/cache/cache-monitor'
import { CacheLevel } from '@/lib/cache/multi-level-cache'

// 模拟数据生成器
class MockDataGenerator {
  private static instance: MockDataGenerator

  static getInstance(): MockDataGenerator {
    if (!MockDataGenerator.instance) {
      MockDataGenerator.instance = new MockDataGenerator()
    }
    return MockDataGenerator.instance
  }

  generateUserProfile(userId: string) {
    return {
      id: userId,
      name: `用户${userId}`,
      email: `user${userId}@example.com`,
      preferences: {
        theme: 'dark',
        language: 'zh-CN',
        notifications: true
      },
      stats: {
        notesCount: Math.floor(Math.random() * 100),
        tagsCount: Math.floor(Math.random() * 50),
        lastLogin: new Date().toISOString()
      }
    }
  }

  generateAIAnalysis(noteId: string) {
    return {
      noteId,
      summary: `这是笔记 ${noteId} 的智能摘要`,
      keywords: [`关键词${Math.floor(Math.random() * 10)}`, `标签${Math.floor(Math.random() * 10)}`],
      sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
      categories: [`分类${Math.floor(Math.random() * 5)}`],
      confidence: Math.random(),
      generatedAt: new Date().toISOString()
    }
  }

  generateRecommendations(userId: string) {
    return {
      userId,
      recommendations: Array.from({ length: 5 }, (_, i) => ({
        id: `rec_${i}`,
        noteId: `note_${Math.floor(Math.random() * 100)}`,
        score: Math.random(),
        reason: `推荐原因${i}`,
        category: `分类${Math.floor(Math.random() * 5)}`
      })),
      generatedAt: new Date().toISOString()
    }
  }

  generateSearchResults(query: string) {
    return {
      query,
      results: Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => ({
        id: `result_${i}`,
        title: `搜索结果 ${i} for ${query}`,
        snippet: `这是搜索结果 ${i} 的摘要...`,
        relevance: Math.random(),
        category: `分类${Math.floor(Math.random() * 5)}`
      })),
      totalHits: Math.floor(Math.random() * 100) + 20,
      searchTime: Math.random() * 100
    }
  }
}

// 性能数据生成器
class PerformanceDataGenerator {
  generateTimeSeriesData(points: number = 60) {
    const now = Date.now()
    const interval = 60000 // 1分钟间隔

    return Array.from({ length: points }, (_, i) => ({
      timestamp: now - (points - i - 1) * interval,
      hitRate: 0.7 + Math.random() * 0.25,
      responseTime: 20 + Math.random() * 80,
      memoryUsage: 60 + Math.random() * 30,
      throughput: 100 + Math.random() * 400,
      errorRate: Math.random() * 5
    }))
  }

  generateDistributionData() {
    return [
      { name: 'L1 内存缓存', value: 45, color: '#3b82f6' },
      { name: 'L2 Redis缓存', value: 30, color: '#10b981' },
      { name: 'L3 数据库缓存', value: 20, color: '#f59e0b' },
      { name: 'L4 计算缓存', value: 5, color: '#ef4444' }
    ]
  }

  generateAlertData(): CacheAlert[] {
    return [
      {
        id: 'alert_1',
        level: 'warning' as any,
        type: 'low_hit_rate',
        message: 'AI分析结果缓存命中率低于70%',
        timestamp: Date.now() - 300000,
        metrics: { hitRate: 0.65 },
        recommendations: ['检查缓存键生成逻辑', '验证数据更新频率'],
        acknowledged: false,
        resolved: false
      },
      {
        id: 'alert_2',
        level: 'info' as any,
        type: 'high_memory_usage',
        message: '内存使用率达到75%',
        timestamp: Date.now() - 600000,
        metrics: { memoryUsage: 75 },
        recommendations: ['监控内存增长趋势', '准备清理策略'],
        acknowledged: true,
        resolved: false
      }
    ]
  }
}

// 主组件
export default function CacheSystemDemo() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [distributionData, setDistributionData] = useState<any[]>([])
  const [alerts, setAlerts] = useState<CacheAlert[]>([])
  const [testResults, setTestResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [metrics, setMetrics] = useState<CachePerformanceMetrics | null>(null)

  const mockDataGenerator = MockDataGenerator.getInstance()
  const performanceGenerator = new PerformanceDataGenerator()

  // 初始化缓存系统
  const initializeCacheSystem = useCallback(async () => {
    setIsLoading(true)
    try {
      // 模拟初始化过程
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 初始化数据
      setPerformanceData(performanceGenerator.generateTimeSeriesData())
      setDistributionData(performanceGenerator.generateDistributionData())
      setAlerts(performanceGenerator.generateAlertData())

      // 模拟性能指标
      setMetrics({
        overallHitRate: 0.82,
        overallMissRate: 0.18,
        avgResponseTime: 45,
        totalRequests: 12500,
        cacheSize: 256000000, // 256MB
        memoryUsage: 68,
        evictionRate: 2.5,
        invalidationRate: 1.2,
        warmupSuccessRate: 95,
        compressionRatio: 0.65,
        efficiency: 87
      })

      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to initialize cache system:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 执行缓存测试
  const runCacheTest = useCallback(async (testType: string) => {
    setIsLoading(true)

    try {
      const testResult = {
        id: Date.now(),
        type: testType,
        timestamp: new Date().toISOString(),
        results: []
      }

      switch (testType) {
        case 'user_profile':
          for (let i = 0; i < 100; i++) {
            const userId = `user_${i}`
            const data = mockDataGenerator.generateUserProfile(userId)

            // 模拟缓存操作
            const startTime = Date.now()
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
            const endTime = Date.now()

            testResult.results.push({
              key: userId,
              hitRate: Math.random() > 0.2 ? 1 : 0,
              responseTime: endTime - startTime,
              dataSize: JSON.stringify(data).length
            })
          }
          break

        case 'ai_analysis':
          for (let i = 0; i < 50; i++) {
            const noteId = `note_${i}`
            const data = mockDataGenerator.generateAIAnalysis(noteId)

            const startTime = Date.now()
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
            const endTime = Date.now()

            testResult.results.push({
              key: noteId,
              hitRate: Math.random() > 0.3 ? 1 : 0,
              responseTime: endTime - startTime,
              dataSize: JSON.stringify(data).length
            })
          }
          break

        case 'recommendations':
          for (let i = 0; i < 30; i++) {
            const userId = `user_${i}`
            const data = mockDataGenerator.generateRecommendations(userId)

            const startTime = Date.now()
            await new Promise(resolve => setTimeout(resolve, Math.random() * 30))
            const endTime = Date.now()

            testResult.results.push({
              key: userId,
              hitRate: Math.random() > 0.4 ? 1 : 0,
              responseTime: endTime - startTime,
              dataSize: JSON.stringify(data).length
            })
          }
          break

        case 'search':
          for (let i = 0; i < 20; i++) {
            const query = `search_${i}`
            const data = mockDataGenerator.generateSearchResults(query)

            const startTime = Date.now()
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
            const endTime = Date.now()

            testResult.results.push({
              key: query,
              hitRate: Math.random() > 0.6 ? 1 : 0,
              responseTime: endTime - startTime,
              dataSize: JSON.stringify(data).length
            })
          }
          break
      }

      // 计算测试统计
      const hits = testResult.results.filter(r => r.hitRate === 1).length
      const totalRequests = testResult.results.length
      const avgResponseTime = testResult.results.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests

      testResult.summary = {
        hitRate: hits / totalRequests,
        avgResponseTime,
        totalRequests,
        cacheSize: testResult.results.reduce((sum, r) => sum + r.dataSize, 0)
      }

      setTestResults(prev => [...prev.slice(-4), testResult])

    } catch (error) {
      console.error(`Cache test ${testType} failed:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 确认告警
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }, [])

  // 解决告警
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  // 实时更新数据
  useEffect(() => {
    if (!isInitialized) return

    const interval = setInterval(() => {
      // 更新性能数据
      setPerformanceData(prev => {
        const newData = [...prev.slice(1), performanceGenerator.generateTimeSeriesData(1)[0]]
        return newData
      })

      // 更新指标
      if (metrics) {
        setMetrics(prev => ({
          ...prev!,
          overallHitRate: Math.max(0.7, Math.min(0.95, prev!.overallHitRate + (Math.random() - 0.5) * 0.02)),
          avgResponseTime: Math.max(20, Math.min(100, prev!.avgResponseTime + (Math.random() - 0.5) * 5)),
          memoryUsage: Math.max(50, Math.min(85, prev!.memoryUsage + (Math.random() - 0.5) * 3))
        }))
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isInitialized, metrics])

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>缓存系统初始化</CardTitle>
            <CardDescription>
              正在启动多级缓存架构和智能策略管理器...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={isLoading ? 50 : 0} className="w-full" />
              <p className="text-sm text-gray-600 text-center">
                {isLoading ? '正在连接缓存服务...' : '准备就绪'}
              </p>
              <Button
                onClick={initializeCacheSystem}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? '初始化中...' : '启动缓存系统'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">智能缓存系统演示</h1>
          <p className="text-gray-600 mt-2">
            多级缓存架构 • 智能策略管理 • 性能监控 • 自动优化
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600">
            系统运行中
          </Badge>
          <Badge variant="outline" className="text-blue-600">
            效率分数: {metrics?.efficiency || 0}%
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">系统概览</TabsTrigger>
          <TabsTrigger value="performance">性能监控</TabsTrigger>
          <TabsTrigger value="strategy">策略管理</TabsTrigger>
          <TabsTrigger value="testing">缓存测试</TabsTrigger>
          <TabsTrigger value="alerts">告警管理</TabsTrigger>
          <TabsTrigger value="reports">分析报告</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* 核心指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">整体命中率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {((metrics?.overallHitRate || 0) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-gray-600">
                  较上小时 +2.3%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics?.avgResponseTime?.toFixed(1) || 0}ms
                </div>
                <p className="text-xs text-gray-600">
                  目标: &lt;50ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">内存使用率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics?.memoryUsage || 0}%
                </div>
                <Progress value={metrics?.memoryUsage || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">总请求数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {(metrics?.totalRequests || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-600">
                  今日: 45.2K
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 缓存层级分布 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>缓存层级分布</CardTitle>
                <CardDescription>
                  数据在不同缓存层级的分布情况
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>实时性能趋势</CardTitle>
                <CardDescription>
                  最近60分钟的缓存性能表现
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="hitRate"
                      stroke="#10b981"
                      name="命中率"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#f59e0b"
                      name="响应时间(ms)"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 吞吐量监控 */}
            <Card>
              <CardHeader>
                <CardTitle>吞吐量监控</CardTitle>
                <CardDescription>
                  每秒请求数和系统负载
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="throughput"
                      stroke="#3b82f6"
                      fill="#93c5fd"
                      name="吞吐量 (req/s)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 内存使用趋势 */}
            <Card>
              <CardHeader>
                <CardTitle>内存使用趋势</CardTitle>
                <CardDescription>
                  缓存内存使用情况监控
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="memoryUsage"
                      stroke="#ef4444"
                      fill="#fca5a5"
                      name="内存使用率 (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 详细性能指标 */}
          <Card>
            <CardHeader>
              <CardTitle>详细性能指标</CardTitle>
              <CardDescription>
                各缓存层级的详细性能数据
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">缓存层级</th>
                      <th className="text-left p-2">命中率</th>
                      <th className="text-left p-2">响应时间</th>
                      <th className="text-left p-2">缓存大小</th>
                      <th className="text-left p-2">驱逐次数</th>
                      <th className="text-left p-2">错误次数</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">L1 内存缓存</td>
                      <td className="p-2 text-green-600">92.5%</td>
                      <td className="p-2">12ms</td>
                      <td className="p-2">128MB</td>
                      <td className="p-2">15</td>
                      <td className="p-2">0</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">L2 Redis缓存</td>
                      <td className="p-2 text-green-600">87.2%</td>
                      <td className="p-2">35ms</td>
                      <td className="p-2">256MB</td>
                      <td className="p-2">42</td>
                      <td className="p-2">3</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">L3 数据库缓存</td>
                      <td className="p-2 text-yellow-600">65.8%</td>
                      <td className="p-2">125ms</td>
                      <td className="p-2">512MB</td>
                      <td className="p-2">128</td>
                      <td className="p-2">7</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">L4 计算缓存</td>
                      <td className="p-2 text-yellow-600">45.3%</td>
                      <td className="p-2">450ms</td>
                      <td className="p-2">64MB</td>
                      <td className="p-2">8</td>
                      <td className="p-2">2</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 数据类型策略 */}
            <Card>
              <CardHeader>
                <CardTitle>数据类型策略</CardTitle>
                <CardDescription>
                  不同数据类型的缓存策略配置
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: '用户画像', ttl: '30分钟', level: '高', compression: '启用' },
                    { type: 'AI分析', ttl: '1小时', level: '中', compression: '启用' },
                    { type: '推荐结果', ttl: '15分钟', level: '高', compression: '启用' },
                    { type: '搜索结果', ttl: '5分钟', level: '低', compression: '启用' }
                  ].map((strategy, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{strategy.type}</p>
                        <p className="text-sm text-gray-600">TTL: {strategy.ttl}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={strategy.level === '高' ? 'default' : strategy.level === '中' ? 'secondary' : 'outline'}>
                          {strategy.level}优先级
                        </Badge>
                        <Badge variant="outline">
                          {strategy.compression}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 智能优化建议 */}
            <Card>
              <CardHeader>
                <CardTitle>智能优化建议</CardTitle>
                <CardDescription>
                  基于性能数据的自动优化建议
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <AlertTitle>优化建议</AlertTitle>
                    <AlertDescription>
                      AI分析结果的命中率较低(65%)，建议增加缓存时间至2小时。
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTitle>性能优化</AlertTitle>
                    <AlertDescription>
                      用户画像数据访问频率高，建议提升到L1缓存层级。
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTitle>内存优化</AlertTitle>
                    <AlertDescription>
                      搜索结果占用内存较多，建议启用更激进的压缩策略。
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 预热策略配置 */}
          <Card>
            <CardHeader>
              <CardTitle>预热策略配置</CardTitle>
              <CardDescription>
                智能预热策略和执行计划
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">主动预热</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    系统启动时预热核心用户数据
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>用户画像</span>
                      <Badge variant="outline">已启用</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>推荐模型</span>
                      <Badge variant="outline">已启用</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">响应式预热</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    基于访问模式动态预热数据
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>相关笔记</span>
                      <Badge variant="outline">已启用</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>标签数据</span>
                      <Badge variant="outline">已启用</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">定时预热</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    按计划定期更新热门数据
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>热门笔记</span>
                      <Badge variant="outline">每日 02:00</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>统计数据</span>
                      <Badge variant="outline">每小时</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>缓存性能测试</CardTitle>
              <CardDescription>
                测试不同数据类型的缓存性能表现
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Button
                  onClick={() => runCacheTest('user_profile')}
                  disabled={isLoading}
                  className="w-full"
                >
                  测试用户画像
                </Button>
                <Button
                  onClick={() => runCacheTest('ai_analysis')}
                  disabled={isLoading}
                  className="w-full"
                >
                  测试AI分析
                </Button>
                <Button
                  onClick={() => runCacheTest('recommendations')}
                  disabled={isLoading}
                  className="w-full"
                >
                  测试推荐结果
                </Button>
                <Button
                  onClick={() => runCacheTest('search')}
                  disabled={isLoading}
                  className="w-full"
                >
                  测试搜索结果
                </Button>
              </div>

              {testResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">测试结果</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">测试类型</th>
                          <th className="text-left p-2">时间</th>
                          <th className="text-left p-2">请求数</th>
                          <th className="text-left p-2">命中率</th>
                          <th className="text-left p-2">平均响应时间</th>
                          <th className="text-left p-2">缓存大小</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResults.map((result, index) => (
                          <tr key={result.id} className="border-b">
                            <td className="p-2 font-medium">
                              {result.type === 'user_profile' && '用户画像'}
                              {result.type === 'ai_analysis' && 'AI分析'}
                              {result.type === 'recommendations' && '推荐结果'}
                              {result.type === 'search' && '搜索结果'}
                            </td>
                            <td className="p-2">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="p-2">{result.summary.totalRequests}</td>
                            <td className="p-2">
                              <span className={
                                result.summary.hitRate > 0.8 ? 'text-green-600' :
                                result.summary.hitRate > 0.6 ? 'text-yellow-600' : 'text-red-600'
                              }>
                                {(result.summary.hitRate * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-2">
                              {result.summary.avgResponseTime.toFixed(1)}ms
                            </td>
                            <td className="p-2">
                              {(result.summary.cacheSize / 1024).toFixed(1)}KB
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>告警管理</CardTitle>
              <CardDescription>
                系统告警和异常处理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无活跃告警
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <Alert key={alert.id} className={
                      alert.level === 'critical' ? 'border-red-200' :
                      alert.level === 'warning' ? 'border-yellow-200' : 'border-blue-200'
                    }>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <AlertTitle className="flex items-center gap-2">
                            <Badge variant={
                              alert.level === 'critical' ? 'destructive' :
                              alert.level === 'warning' ? 'secondary' : 'outline'
                            }>
                              {alert.level === 'critical' ? '严重' :
                               alert.level === 'warning' ? '警告' : '信息'}
                            </Badge>
                            {alert.type === 'low_hit_rate' && '命中率过低'}
                            {alert.type === 'high_memory_usage' && '内存使用过高'}
                            {alert.type === 'high_response_time' && '响应时间过长'}
                            {alert.type === 'trend_hit_rate_declining' && '命中率下降趋势'}
                          </AlertTitle>
                          <AlertDescription className="mt-2">
                            {alert.message}
                            <div className="mt-2 text-xs text-gray-600">
                              时间: {new Date(alert.timestamp).toLocaleString()}
                            </div>
                            {alert.recommendations.length > 0 && (
                              <div className="mt-2">
                                <strong>建议:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {alert.recommendations.map((rec, index) => (
                                    <li key={index} className="text-sm">{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </AlertDescription>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {!alert.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              确认
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            解决
                          </Button>
                        </div>
                      </div>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>性能分析报告</CardTitle>
              <CardDescription>
                缓存系统性能的详细分析和优化建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 系统健康评分 */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">系统健康评分</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-600">87/100</div>
                      <p className="text-sm text-gray-600">系统状态: 良好</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">可用性:</span>
                        <span className="ml-2 font-medium">99.8%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">效率分数:</span>
                        <span className="ml-2 font-medium">87%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">错误率:</span>
                        <span className="ml-2 font-medium">0.2%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">响应时间:</span>
                        <span className="ml-2 font-medium">45ms</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 优化建议 */}
                <div>
                  <h3 className="text-lg font-medium mb-4">优化建议</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2 text-green-600">已实施优化</h4>
                      <ul className="text-sm space-y-1">
                        <li>✅ 启用数据压缩，节省35%内存</li>
                        <li>✅ 优化缓存键生成策略</li>
                        <li>✅ 调整各级缓存TTL配置</li>
                        <li>✅ 实施智能预热机制</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2 text-blue-600">建议优化</h4>
                      <ul className="text-sm space-y-1">
                        <li>🔄 考虑增加Redis集群</li>
                        <li>🔄 优化AI分析结果缓存策略</li>
                        <li>🔄 实施更细粒度的监控</li>
                        <li>🔄 添加机器学习预测模型</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 导出报告按钮 */}
                <div className="flex justify-end space-x-4">
                  <Button variant="outline">
                    导出详细报告
                  </Button>
                  <Button variant="outline">
                    分享报告
                  </Button>
                  <Button>
                    生成PDF报告
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}