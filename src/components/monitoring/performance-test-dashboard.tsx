/**
 * Performance Test Dashboard
 *
 * Comprehensive performance testing and optimization dashboard
 */

'use client'

import { useState, useEffect } from 'react'
import {
  ActivityIcon,
  PlayIcon,
  SquareIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  ZapIcon,
  BarChart3Icon,
  FileTextIcon,
  DownloadIcon
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { useToast } from '@/hooks/use-toast'
import { Switch } from "@/components/ui/switch"

interface PerformanceTestResult {
  timestamp: string
  overallScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  database: {
    score: number
    avgQueryTime: number
    slowQueries: number
    recommendations: string[]
  }
  cache: {
    score: number
    avgHitRate: number
    totalSize: number
    recommendations: string[]
  }
  api: {
    score: number
    avgResponseTime: number
    errorRate: number
    recommendations: string[]
  }
  search: {
    score: number
    avgSearchTime: number
    accuracyRate: number
    recommendations: string[]
  }
  cdn: {
    score: number
    hitRate: number
    avgResponseTime: number
    recommendations: string[]
  }
  criticalIssues: string[]
  highPriorityOptimizations: string[]
  mediumPriorityOptimizations: string[]
  longTermImprovements: string[]
}

interface TestRun {
  runId: string
  status: 'running' | 'completed' | 'failed'
  progress: number
  message: string
  results?: PerformanceTestResult
  startTime: string
}

interface PerformanceTestDashboardProps {
  className?: string
}

export function PerformanceTestDashboard({
  className = ''
}: PerformanceTestDashboardProps) {
  const { toast } = useToast()

  const [currentTest, setCurrentTest] = useState<TestRun | null>(null)
  const [testHistory, setTestHistory] = useState<PerformanceTestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Start performance test
  const startPerformanceTest = async () => {
    if (currentTest && currentTest.status === 'running') {
      toast({
        title: '测试正在进行中',
        description: '请等待当前测试完成',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/performance/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            databaseTest: {
              queryTypes: ['select', 'insert', 'update'],
              recordCount: true,
              analyzeSlowQueries: true
            },
            cacheTest: {
              hitRateTarget: 0.8,
              warmupData: true,
              testEviction: true
            },
            apiTest: {
              endpoints: ['/api/notes', '/api/categories', '/api/search'],
              methods: ['GET'],
              expectedResponseTime: 500
            },
            searchTest: {
              queryTypes: ['text', 'semantic'],
              resultCountRange: [5, 50],
              testSemantic: true
            }
          },
          saveResults: true
        })
      })

      const result = await response.json()

      if (result.success) {
        const testRun: TestRun = {
          runId: result.data.runId,
          status: 'running',
          progress: 0,
          message: result.data.message,
          startTime: new Date().toISOString()
        }

        setCurrentTest(testRun)
        toast({
          title: '性能测试已启动',
          description: '正在执行全面的系统性能测试'
        })

        // Start polling for updates
        pollTestStatus(testRun.runId)

      } else {
        toast({
          title: '测试启动失败',
          description: result.error,
          variant: 'destructive'
        })
      }

    } catch (error) {
      toast({
        title: '启动错误',
        description: '无法启动性能测试',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Cancel running test
  const cancelTest = async () => {
    if (!currentTest || currentTest.status !== 'running') {
      return
    }

    try {
      const response = await fetch(`/api/performance/test?runId=${currentTest.runId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setCurrentTest(null)
        toast({
          title: '测试已取消',
          description: '性能测试已被用户取消'
        })
      }

    } catch (error) {
      toast({
        title: '取消失败',
        description: '无法取消测试',
        variant: 'destructive'
      })
    }
  }

  // Poll test status
  const pollTestStatus = async (runId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/performance/test?runId=${runId}`)
        const result = await response.json()

        if (result.success && result.data) {
          const testStatus = result.data

          setCurrentTest(prev => prev ? {
            ...prev,
            status: testStatus.status,
            progress: testStatus.progress,
            message: testStatus.message,
            results: testStatus.results
          } : null)

          if (testStatus.status === 'completed' && testStatus.results) {
            // Add to history
            setTestHistory(prev => [testStatus.results, ...prev.slice(0, 9)]) // Keep last 10 tests
            clearInterval(pollInterval)

            toast({
              title: '测试完成',
              description: `总体评分: ${testStatus.results.overallScore} (${testStatus.results.grade})`
            })

          } else if (testStatus.status === 'failed') {
            clearInterval(pollInterval)

            toast({
              title: '测试失败',
              description: testStatus.message,
              variant: 'destructive'
            })
          }
        }

      } catch (error) {
        console.error('Error polling test status:', error)
      }
    }, 2000) // Poll every 2 seconds

    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
    }, 10 * 60 * 1000)
  }

  // Load test history on mount
  useEffect(() => {
    // In a real implementation, this would load from database
    setTestHistory([])
  }, [])

  // Auto-refresh for current test
  useEffect(() => {
    if (!autoRefresh || !currentTest || currentTest.status !== 'running') {
      return
    }

    const interval = setInterval(() => {
      if (currentTest.runId) {
        pollTestStatus(currentTest.runId)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh, currentTest])

  // Utility functions
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-50'
      case 'B': return 'text-blue-600 bg-blue-50'
      case 'C': return 'text-yellow-600 bg-yellow-50'
      case 'D': return 'text-orange-600 bg-orange-50'
      case 'F': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const formatScore = (score: number) => `${score}/100`
  const formatTime = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Prepare radar chart data
  const prepareRadarData = (results?: PerformanceTestResult) => {
    if (!results) return []

    return [
      { category: '数据库', score: results.database.score, fullMark: 100 },
      { category: '缓存', score: results.cache.score, fullMark: 100 },
      { category: 'API', score: results.api.score, fullMark: 100 },
      { category: '搜索', score: results.search.score, fullMark: 100 },
      { category: 'CDN', score: results.cdn.score, fullMark: 100 }
    ]
  }

  // Prepare performance trends data
  const prepareTrendsData = () => {
    return testHistory.slice(0, 10).reverse().map((test, index) => ({
      test: `测试${index + 1}`,
      overall: test.overallScore,
      database: test.database.score,
      cache: test.cache.score,
      api: test.api.score,
      search: test.search.score,
      cdn: test.cdn.score
    }))
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <BarChart3Icon className="h-6 w-6 mr-2 text-blue-600" />
            性能测试中心
          </h2>
          <p className="text-gray-600 mt-1">
            全面的系统性能测试和优化建议
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              disabled={!currentTest || currentTest.status !== 'running'}
            />
            <span className="text-sm">自动刷新</span>
          </div>
          <Button
            onClick={startPerformanceTest}
            disabled={loading || (currentTest && currentTest.status === 'running')}
            className="flex items-center space-x-2"
          >
            {loading ? (
              <RefreshCwIcon className="h-4 w-4 animate-spin" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
            <span>开始测试</span>
          </Button>
          {currentTest && currentTest.status === 'running' && (
            <Button
              onClick={cancelTest}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <SquareIcon className="h-4 w-4" />
              <span>取消测试</span>
            </Button>
          )}
        </div>
      </div>

      {/* Current Test Status */}
      {currentTest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>当前测试状态</span>
              <Badge variant={
                currentTest.status === 'running' ? 'default' :
                currentTest.status === 'completed' ? 'secondary' : 'destructive'
              }>
                {currentTest.status === 'running' ? '运行中' :
                 currentTest.status === 'completed' ? '已完成' : '失败'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {currentTest.status === 'running' ? (
                  <RefreshCwIcon className="h-5 w-5 animate-spin text-blue-600" />
                ) : currentTest.status === 'completed' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-600" />
                )}
                <span>{currentTest.message}</span>
              </div>

              {currentTest.status === 'running' && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>测试进度</span>
                    <span>{currentTest.progress}%</span>
                  </div>
                  <Progress value={currentTest.progress} className="h-2" />
                </div>
              )}

              <div className="text-xs text-gray-500">
                开始时间: {new Date(currentTest.startTime).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {currentTest?.results && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">测试概览</TabsTrigger>
            <TabsTrigger value="detailed">详细分析</TabsTrigger>
            <TabsTrigger value="recommendations">优化建议</TabsTrigger>
            <TabsTrigger value="history">历史对比</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center">总体性能评分</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-6xl font-bold mb-4 ${getGradeColor(currentTest.results.grade)}`}>
                    {currentTest.results.overallScore}
                  </div>
                  <Badge className={`text-lg px-4 py-2 ${getGradeColor(currentTest.results.grade)}`}>
                    等级: {currentTest.results.grade}
                  </Badge>
                  <div className="mt-4 text-sm text-gray-600">
                    测试时间: {new Date(currentTest.results.timestamp).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Component Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { name: '数据库', score: currentTest.results.database.score, icon: '🗄️' },
                { name: '缓存', score: currentTest.results.cache.score, icon: '⚡' },
                { name: 'API', score: currentTest.results.api.score, icon: '🌐' },
                { name: '搜索', score: currentTest.results.search.score, icon: '🔍' },
                { name: 'CDN', score: currentTest.results.cdn.score, icon: '🌍' }
              ].map((component) => (
                <Card key={component.name}>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{component.icon}</div>
                    <div className="text-sm font-medium text-gray-600 mb-1">{component.name}</div>
                    <div className={`text-2xl font-bold ${
                      component.score >= 80 ? 'text-green-600' :
                      component.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {component.score}
                    </div>
                    <Progress value={component.score} className="h-1 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>性能雷达图</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={prepareRadarData(currentTest.results)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="性能评分"
                        dataKey="score"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>数据库性能</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>平均查询时间</span>
                      <span>{formatTime(currentTest.results.database.avgQueryTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>慢查询数量</span>
                      <span>{currentTest.results.database.slowQueries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>性能评分</span>
                      <Badge>{currentTest.results.database.score}/100</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>缓存性能</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>平均命中率</span>
                      <span>{formatPercentage(currentTest.results.cache.avgHitRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>缓存大小</span>
                      <span>{formatSize(currentTest.results.cache.totalSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>性能评分</span>
                      <Badge>{currentTest.results.cache.score}/100</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API性能</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>平均响应时间</span>
                      <span>{formatTime(currentTest.results.api.avgResponseTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>错误率</span>
                      <span>{formatPercentage(currentTest.results.api.errorRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>性能评分</span>
                      <Badge>{currentTest.results.api.score}/100</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>搜索性能</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>平均搜索时间</span>
                      <span>{formatTime(currentTest.results.search.avgSearchTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>准确率</span>
                      <span>{formatPercentage(currentTest.results.search.accuracyRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>性能评分</span>
                      <Badge>{currentTest.results.search.score}/100</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            {/* Critical Issues */}
            {currentTest.results.criticalIssues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <AlertTriangleIcon className="h-5 w-5 mr-2" />
                    关键问题
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentTest.results.criticalIssues.map((issue, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-red-800">{issue}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* High Priority Optimizations */}
            {currentTest.results.highPriorityOptimizations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-orange-600">
                    <ZapIcon className="h-5 w-5 mr-2" />
                    高优先级优化
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentTest.results.highPriorityOptimizations.map((opt, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-orange-50 rounded-lg">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-orange-800">{opt}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medium and Long Term Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-600">
                    <TrendingUpIcon className="h-5 w-5 mr-2" />
                    中期改进
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentTest.results.mediumPriorityOptimizations.map((opt, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-blue-800">{opt}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-purple-600">
                    <FileTextIcon className="h-5 w-5 mr-2" />
                    长期规划
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentTest.results.longTermImprovements.map((opt, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-purple-800">{opt}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {/* Performance Trends */}
            {testHistory.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>性能趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prepareTrendsData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="test" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="overall" stroke="#3B82F6" strokeWidth={2} name="总体评分" />
                        <Line type="monotone" dataKey="database" stroke="#10B981" name="数据库" />
                        <Line type="monotone" dataKey="cache" stroke="#F59E0B" name="缓存" />
                        <Line type="monotone" dataKey="api" stroke="#EF4444" name="API" />
                        <Line type="monotone" dataKey="search" stroke="#8B5CF6" name="搜索" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <BarChart3Icon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">暂无历史测试数据</p>
                  <p className="text-sm text-gray-400 mt-2">运行测试后将显示性能趋势</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`

export default PerformanceTestDashboard