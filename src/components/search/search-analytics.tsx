/**
 * Search Analytics Component
 *
 * Displays search performance analytics and optimization suggestions
 */

'use client'

import { useState, useEffect } from 'react'
import {
  BarChartIcon,
  TrendingUpIcon,
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  SearchIcon,
  ZapIcon,
  DatabaseIcon,
  RefreshCwIcon,
  InfoIcon
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface SearchAnalytics {
  totalSearches: number
  averageResponseTime: number
  mostSearchedTerms: Array<{
    term: string
    count: number
    successRate: number
  }>
  searchTypeDistribution: {
    fulltext: number
    vector: number
    hybrid: number
  }
  failedSearches: number
  commonErrors: Array<{
    error: string
    count: number
  }>
  dailySearchCounts: Array<{
    date: string
    count: number
  }>
  performanceMetrics: {
    p50ResponseTime: number
    p95ResponseTime: number
    cacheHitRate: number
    averageResultCount: number
  }
}

interface SearchOptimization {
  suggestions: Array<{
    type: 'performance' | 'relevance' | 'coverage'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    action?: string
  }>
  indexStats: {
    totalNotes: number
    indexedNotes: number
    coveragePercentage: number
    lastIndexUpdate: Date | null
  }
  embeddingStats: {
    notesWithEmbeddings: number
    embeddingCoverage: number
    averageEmbeddingTime: number
    lastEmbeddingUpdate: Date | null
  }
}

interface SearchAnalyticsProps {
  className?: string
}

export function SearchAnalytics({ className = '' }: SearchAnalyticsProps) {
  const { toast } = useToast()

  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null)
  const [optimizations, setOptimizations] = useState<SearchOptimization | null>(null)
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)

      const [analyticsResponse, optimizationsResponse] = await Promise.all([
        fetch(`/api/search/analytics?type=analytics&timeRange=${timeRange}`),
        fetch('/api/search/analytics?type=optimizations')
      ])

      if (analyticsResponse.ok && optimizationsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        const optimizationsData = await optimizationsResponse.json()

        if (analyticsData.success && optimizationsData.success) {
          setAnalytics(analyticsData.data)
          setOptimizations(optimizationsData.data)
        }
      }

    } catch (error) {
      console.error('Failed to load analytics:', error)
      toast({
        title: '加载失败',
        description: '无法加载搜索分析数据',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [timeRange, toast])

  // Rebuild search index
  const handleRebuildIndex = useCallback(async () => {
    if (!confirm('重建搜索索引可能需要一些时间，确定要继续吗？')) {
      return
    }

    setRebuilding(true)
    try {
      const response = await fetch('/api/search/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'rebuild-index' })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: '索引重建完成',
          description: `成功处理 ${data.data.processedNotes} 个笔记`,
        })

        // Reload analytics after rebuild
        loadAnalytics()
      } else {
        throw new Error(data.error || '重建失败')
      }

    } catch (error) {
      console.error('Failed to rebuild index:', error)
      toast({
        title: '重建失败',
        description: error instanceof Error ? error.message : '请重试',
        variant: 'destructive'
      })
    } finally {
      setRebuilding(false)
    }
  }, [loadAnalytics, toast])

  // Load data on mount and time range change
  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // Format response time
  const formatResponseTime = (time: number) => {
    if (time < 1000) return `${time}ms`
    return `${(time / 1000).toFixed(2)}s`
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return '未知'
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4\">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className=\"pt-6\">
                <div className=\"space-y-2\">
                  <div className=\"h-4 bg-gray-200 rounded w-3/4\"></div>
                  <div className=\"h-8 bg-gray-200 rounded w-1/2\"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className=\"flex items-center justify-between\">
        <h3 className=\"text-lg font-semibold flex items-center\">
          <BarChartIcon className=\"h-5 w-5 mr-2 text-blue-600\" />
          搜索分析
        </h3>
        <div className=\"flex items-center space-x-2\">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className=\"w-32\">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=\"7d\">7天</SelectItem>
              <SelectItem value=\"30d\">30天</SelectItem>
              <SelectItem value=\"90d\">90天</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant=\"outline\"
            size=\"sm\"
            onClick={loadAnalytics}
            disabled={loading}
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {analytics && (
        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4\">
          <Card>
            <CardContent className=\"pt-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm font-medium text-gray-600\">总搜索次数</p>
                  <p className=\"text-2xl font-bold\">{analytics.totalSearches}</p>
                </div>
                <SearchIcon className=\"h-8 w-8 text-blue-600\" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className=\"pt-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm font-medium text-gray-600\">平均响应时间</p>
                  <p className=\"text-2xl font-bold\">{formatResponseTime(analytics.averageResponseTime)}</p>
                </div>
                <ClockIcon className=\"h-8 w-8 text-green-600\" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className=\"pt-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm font-medium text-gray-600\">成功率</p>
                  <p className=\"text-2xl font-bold\">
                    {((analytics.totalSearches - analytics.failedSearches) / analytics.totalSearches * 100).toFixed(1)}%
                  </p>
                </div>
                <CheckCircleIcon className=\"h-8 w-8 text-green-600\" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className=\"pt-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm font-medium text-gray-600\">缓存命中率</p>
                  <p className=\"text-2xl font-bold\">{(analytics.performanceMetrics.cacheHitRate * 100).toFixed(1)}%</p>
                </div>
                <ZapIcon className=\"h-8 w-8 text-yellow-600\" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue=\"performance\" className=\"w-full\">
        <TabsList>
          <TabsTrigger value=\"performance\">性能指标</TabsTrigger>
          <TabsTrigger value=\"usage\">使用统计</TabsTrigger>
          <TabsTrigger value=\"optimization\">优化建议</TabsTrigger>
        </TabsList>

        <TabsContent value=\"performance\" className=\"space-y-6\">
          {analytics && (
            <>
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className=\"flex items-center text-lg\">
                    <ActivityIcon className=\"h-5 w-5 mr-2 text-green-600\" />
                    性能指标
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
                    <div className=\"space-y-2\">
                      <div className=\"flex justify-between text-sm\">
                        <span>P50 响应时间</span>
                        <span className=\"font-medium\">{formatResponseTime(analytics.performanceMetrics.p50ResponseTime)}</span>
                      </div>
                      <Progress value={(analytics.performanceMetrics.p50ResponseTime / 1000) * 100} className=\"h-2\" />
                    </div>

                    <div className=\"space-y-2\">
                      <div className=\"flex justify-between text-sm\">
                        <span>P95 响应时间</span>
                        <span className=\"font-medium\">{formatResponseTime(analytics.performanceMetrics.p95ResponseTime)}</span>
                      </div>
                      <Progress value={(analytics.performanceMetrics.p95ResponseTime / 2000) * 100} className=\"h-2\" />
                    </div>

                    <div className=\"space-y-2\">
                      <div className=\"flex justify-between text-sm\">
                        <span>平均结果数</span>
                        <span className=\"font-medium\">{analytics.performanceMetrics.averageResultCount.toFixed(1)}</span>
                      </div>
                      <Progress value={(analytics.performanceMetrics.averageResultCount / 50) * 100} className=\"h-2\" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Search Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className=\"flex items-center text-lg\">
                    <BarChartIcon className=\"h-5 w-5 mr-2 text-purple-600\" />
                    搜索类型分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className=\"space-y-4\">
                    <div className=\"flex items-center justify-between\">
                      <span className=\"text-sm\">全文搜索</span>
                      <div className=\"flex items-center space-x-2\">
                        <Progress value={(analytics.searchTypeDistribution.fulltext / analytics.totalSearches) * 100} className=\"w-32 h-2\" />
                        <span className=\"text-sm font-medium w-12\">{analytics.searchTypeDistribution.fulltext}</span>
                      </div>
                    </div>

                    <div className=\"flex items-center justify-between\">
                      <span className=\"text-sm\">语义搜索</span>
                      <div className=\"flex items-center space-x-2\">
                        <Progress value={(analytics.searchTypeDistribution.vector / analytics.totalSearches) * 100} className=\"w-32 h-2\" />
                        <span className=\"text-sm font-medium w-12\">{analytics.searchTypeDistribution.vector}</span>
                      </div>
                    </div>

                    <div className=\"flex items-center justify-between\">
                      <span className=\"text-sm\">混合搜索</span>
                      <div className=\"flex items-center space-x-2\">
                        <Progress value={(analytics.searchTypeDistribution.hybrid / analytics.totalSearches) * 100} className=\"w-32 h-2\" />
                        <span className=\"text-sm font-medium w-12\">{analytics.searchTypeDistribution.hybrid}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value=\"usage\" className=\"space-y-6\">
          {analytics && (
            <>
              {/* Most Searched Terms */}
              <Card>
                <CardHeader>
                  <CardTitle className=\"flex items-center text-lg\">
                    <TrendingUpIcon className=\"h-5 w-5 mr-2 text-orange-600\" />
                    热门搜索词
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className=\"space-y-3\">
                    {analytics.mostSearchedTerms.map((term, index) => (
                      <div key={index} className=\"flex items-center justify-between\">
                        <div className=\"flex items-center space-x-3\">
                          <span className=\"text-sm font-medium text-gray-500 w-6\">#{index + 1}</span>
                          <span className=\"text-sm\">{term.term}</span>
                        </div>
                        <div className=\"flex items-center space-x-4\">
                          <Badge variant=\"outline\">{term.count} 次</Badge>
                          <Badge variant={term.successRate >= 0.9 ? 'default' : 'secondary'}>
                            {(term.successRate * 100).toFixed(0)}% 成功
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Common Errors */}
              {analytics.commonErrors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className=\"flex items-center text-lg\">
                      <AlertTriangleIcon className=\"h-5 w-5 mr-2 text-red-600\" />
                      常见错误
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className=\"space-y-3\">
                      {analytics.commonErrors.map((error, index) => (
                        <div key={index} className=\"flex items-center justify-between p-3 bg-red-50 rounded-lg\">
                          <div className=\"flex items-center space-x-3\">
                            <AlertTriangleIcon className=\"h-4 w-4 text-red-500\" />
                            <span className=\"text-sm\">{error.error}</span>
                          </div>
                          <Badge variant=\"destructive\">{error.count} 次</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value=\"optimization\" className=\"space-y-6\">
          {optimizations && (
            <>
              {/* Index Status */}
              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
                <Card>
                  <CardHeader>
                    <CardTitle className=\"flex items-center text-lg\">
                      <DatabaseIcon className=\"h-5 w-5 mr-2 text-blue-600\" />
                      搜索索引状态
                    </CardTitle>
                  </CardHeader>
                  <CardContent className=\"space-y-4\">
                    <div className=\"space-y-2\">
                      <div className=\"flex justify-between text-sm\">
                        <span>索引覆盖率</span>
                        <span className=\"font-medium\">{optimizations.indexStats.coveragePercentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={optimizations.indexStats.coveragePercentage} className=\"h-2\" />
                    </div>

                    <div className=\"text-sm text-gray-500\">
                      <p>已索引: {optimizations.indexStats.indexedNotes} / {optimizations.indexStats.totalNotes}</p>
                      <p>最后更新: {optimizations.indexStats.lastIndexUpdate?.toLocaleString() || '未知'}</p>
                    </div>

                    {optimizations.indexStats.coveragePercentage < 90 && (
                      <Button
                        variant=\"outline\"
                        size=\"sm\"
                        onClick={handleRebuildIndex}
                        disabled={rebuilding}
                        className=\"w-full\"
                      >
                        <RefreshCwIcon className={`h-4 w-4 mr-2 ${rebuilding ? 'animate-spin' : ''}`} />
                        {rebuilding ? '重建中...' : '重建索引'}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className=\"flex items-center text-lg\">
                      <ZapIcon className=\"h-5 w-5 mr-2 text-purple-600\" />
                      向量嵌入状态
                    </CardTitle>
                  </CardHeader>
                  <CardContent className=\"space-y-4\">
                    <div className=\"space-y-2\">
                      <div className=\"flex justify-between text-sm\">
                        <span>嵌入覆盖率</span>
                        <span className=\"font-medium\">{optimizations.embeddingStats.embeddingCoverage.toFixed(1)}%</span>
                      </div>
                      <Progress value={optimizations.embeddingStats.embeddingCoverage} className=\"h-2\" />
                    </div>

                    <div className=\"text-sm text-gray-500\">
                      <p>已嵌入: {optimizations.embeddingStats.notesWithEmbeddings} / {optimizations.indexStats.totalNotes}</p>
                      <p>平均处理时间: {optimizations.embeddingStats.averageEmbeddingTime}ms</p>
                      <p>最后更新: {optimizations.embeddingStats.lastEmbeddingUpdate?.toLocaleString() || '未知'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Optimization Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle className=\"flex items-center text-lg\">
                    <InfoIcon className=\"h-5 w-5 mr-2 text-green-600\" />
                    优化建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className=\"space-y-4\">
                    {optimizations.suggestions.map((suggestion, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${getPriorityColor(suggestion.priority)}`}>
                        <div className=\"flex items-start justify-between mb-2\">
                          <h4 className=\"font-medium\">{suggestion.title}</h4>
                          <Badge variant=\"outline\" className=\"text-xs\">
                            {getPriorityLabel(suggestion.priority)}
                          </Badge>
                        </div>
                        <p className=\"text-sm mb-3\">{suggestion.description}</p>
                        {suggestion.action && (
                          <Button variant=\"outline\" size=\"sm\" className=\"text-xs\">
                            {suggestion.action}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SearchAnalytics