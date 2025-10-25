/**
 * Database Optimization Dashboard Component
 *
 * Provides database performance analysis and optimization tools
 */

'use client'

import { useState, useEffect } from 'react'
import {
  DatabaseIcon,
  ActivityIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ZapIcon,
  BarChart3Icon,
  RefreshCwIcon,
  PlayIcon,
  EyeIcon
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  LineChart,
  Line,
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

interface QueryStats {
  totalQueries: number
  averageDuration: number
  slowQueries: number
  errorRate: number
  mostActiveTable: string
  operationDistribution: Record<string, number>
}

interface SlowQuery {
  id: string
  table: string
  operation: string
  duration: number
  timestamp: string
  query: string
}

interface IndexInfo {
  table: string
  index_name: string
  index_definition: string
  table_name: string
  statistics?: {
    live_tuples: number
    dead_tuples: number
    inserts: number
    updates: number
    deletes: number
  }
}

interface DatabaseOptimizationDashboardProps {
  className?: string
}

export function DatabaseOptimizationDashboard({
  className = ''
}: DatabaseOptimizationDashboardProps) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [statistics, setStatistics] = useState<QueryStats | null>(null)
  const [indexes, setIndexes] = useState<IndexInfo[]>([])
  const [optimizing, setOptimizing] = useState(false)
  const [vacuuming, setVacuuming] = useState(false)

  // Fetch database analysis
  const fetchAnalysis = async () => {
    try {
      const response = await fetch('/api/database/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'analyze'
        })
      })

      const data = await response.json()

      if (data.success) {
        setAnalysis(data.data.analysis)
      }

    } catch (error) {
      console.error('Failed to fetch database analysis:', error)
      toast({
        title: '分析失败',
        description: '无法获取数据库分析数据',
        variant: 'destructive'
      })
    }
  }

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/database/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'statistics'
        })
      })

      const data = await response.json()

      if (data.success) {
        setStatistics(data.data.statistics)
      }

    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  // Fetch index information
  const fetchIndexes = async () => {
    try {
      const response = await fetch('/api/database/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'indexes'
        })
      })

      const data = await response.json()

      if (data.success) {
        setIndexes(data.data.indexes)
      }

    } catch (error) {
      console.error('Failed to fetch index information:', error)
    }
  }

  // Refresh all data
  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchAnalysis(),
      fetchStatistics(),
      fetchIndexes()
    ])
    setRefreshing(false)
  }

  // Perform optimization
  const performOptimization = async (dryRun: boolean = false) => {
    setOptimizing(true)

    try {
      const response = await fetch('/api/database/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'optimize',
          dryRun
        })
      })

      const data = await response.json()

      if (data.success) {
        const optimization = data.data.optimization

        toast({
          title: dryRun ? '优化分析完成' : '数据库优化完成',
          description: dryRun
            ? `发现 ${optimization.queriesOptimized} 个可优化查询`
            : `创建了 ${optimization.indexesCreated} 个索引，优化了 ${optimization.queriesOptimized} 个查询`,
        })

        // Refresh data after optimization
        await refreshData()
      }

    } catch (error) {
      console.error('Optimization failed:', error)
      toast({
        title: '优化失败',
        description: '数据库优化操作失败',
        variant: 'destructive'
      })
    } finally {
      setOptimizing(false)
    }
  }

  // Perform VACUUM
  const performVacuum = async (dryRun: boolean = false) => {
    setVacuuming(true)

    try {
      const response = await fetch('/api/database/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'vacuum',
          dryRun
        })
      })

      const data = await response.json()

      if (data.success) {
        const vacuumResult = data.data.vacuumResult

        toast({
          title: dryRun ? 'VACUUM分析完成' : 'VACUUM操作完成',
          description: dryRun
            ? `将处理 ${vacuumResult.tablesProcessed.length} 个表`
            : `成功处理 ${vacuumResult.tablesProcessed.length} 个表，耗时 ${vacuumResult.duration}ms`,
        })

        // Refresh data after vacuum
        await refreshData()
      }

    } catch (error) {
      console.error('VACUUM failed:', error)
      toast({
        title: 'VACUUM失败',
        description: '数据库维护操作失败',
        variant: 'destructive'
      })
    } finally {
      setVacuuming(false)
    }
  }

  // Initialize data
  useEffect(() => {
    refreshData()
  }, [])

  // Format time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Format query
  const formatQuery = (query: string, maxLength: number = 100) => {
    if (query.length <= maxLength) return query
    return query.substring(0, maxLength) + '...'
  }

  // Get operation chart data
  const getOperationChartData = () => {
    if (!statistics) return []

    return Object.entries(statistics.operationDistribution).map(([operation, count]) => ({
      name: operation.toUpperCase(),
      value: count,
      fill: operation === 'select' ? '#3B82F6' :
             operation === 'insert' ? '#10B981' :
             operation === 'update' ? '#F59E0B' : '#EF4444'
    }))
  }

  // Get index health status
  const getIndexHealth = (indexInfo: IndexInfo[]) => {
    if (!indexInfo.statistics) return { health: 'unknown', deadTupleRatio: 0 }

    const { live_tuples, dead_tuples } = indexInfo.statistics
    const total = live_tuples + dead_tuples
    const deadRatio = total > 0 ? dead_tuples / total : 0

    let health = 'healthy'
    if (deadRatio > 0.2) health = 'warning'
    if (deadRatio > 0.5) health = 'critical'

    return { health, deadTupleRatio }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCwIcon className="h-6 w-6 animate-spin" />
            <span>加载数据库优化数据中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <DatabaseIcon className="h-6 w-6 mr-2 text-blue-600" />
            数据库优化
          </h2>
          <p className="text-gray-600 mt-1">
            数据库性能分析和优化工具
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总查询数</p>
                  <p className="text-2xl font-bold">{statistics.totalQueries.toLocaleString()}</p>
                </div>
                <BarChart3Icon className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">平均查询时间</p>
                  <p className="text-2xl font-bold">{formatTime(statistics.averageDuration)}</p>
                </div>
                <ClockIcon className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">慢查询数</p>
                  <p className="text-2xl font-bold">{statistics.slowQueries}</p>
                </div>
                <AlertTriangleIcon className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">错误率</p>
                  <p className="text-2xl font-bold">{(statistics.errorRate * 100).toFixed(1)}%</p>
                </div>
                <ActivityIcon className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList>
          <TabsTrigger value="analysis">查询分析</TabsTrigger>
          <TabsTrigger value="indexes">索引管理</TabsTrigger>
          <TabsTrigger value="maintenance">维护操作</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          {/* Query Distribution */}
          {statistics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>查询操作分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getOperationChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {getOperationChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>最活跃表</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <DatabaseIcon className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                    <h3 className="text-lg font-semibold">{statistics.mostActiveTable}</h3>
                    <p className="text-gray-600">查询最频繁的表</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Slow Queries */}
          {analysis?.slowQueries && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>慢查询分析</span>
                  <Badge variant="outline">
                    {analysis.slowQueries.length} 个慢查询
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.slowQueries.slice(0, 10).map((query: SlowQuery, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline">{query.table}</Badge>
                            <Badge variant="outline">{query.operation.toUpperCase()}</Badge>
                            <Badge variant="destructive">
                              {formatTime(query.duration)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 font-mono">
                            {formatQuery(query.query)}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(query.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}

                  {analysis.slowQueries.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>没有发现慢查询</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {analysis?.recommendations && (
            <Card>
              <CardHeader>
                <CardTitle>优化建议</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.recommendations.map((recommendation: string, index: number) => (
                    <Alert key={index}>
                      <AlertDescription>{recommendation}</AlertDescription>
                    </Alert>
                  ))}

                  {analysis.recommendations.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>数据库性能良好，暂无优化建议</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="indexes" className="space-y-6">
          {/* Index Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>索引概览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {indexes.map((indexInfo, index) => {
                    const { health, deadTupleRatio } = getIndexHealth(indexInfo)
                    const isHealthy = health === 'healthy'

                    return (
                      <div key={index} className={`p-4 border rounded-lg ${isHealthy ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{indexInfo.table}</h4>
                          <Badge variant={isHealthy ? 'default' : 'secondary'}>
                            {indexInfo.indexes.length} 个索引
                          </Badge>
                        </div>

                        {indexInfo.indexes.map((idx, idxIndex) => (
                          <div key={idxIndex} className="text-sm text-gray-600 mb-2">
                            <div className="font-mono">{idx.index_name}</div>
                          </div>
                        ))}

                        {indexInfo.statistics && (
                          <div className="text-xs text-gray-500 mt-2">
                            <div>活跃元组: {indexInfo.statistics.live_tuples.toLocaleString()}</div>
                            <div>死元组: {indexInfo.statistics.dead_tuples.toLocaleString()} ({(deadTupleRatio * 100).toFixed(1)}%)</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Index Suggestions */}
            {analysis?.indexSuggestions && (
              <Card>
                <CardHeader>
                  <CardTitle>索引建议</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.indexSuggestions.slice(0, 5).map((suggestion: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{suggestion.table}</h4>
                            <p className="text-sm text-gray-600">
                              列: {suggestion.columns.join(', ')}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {suggestion.reason}
                            </p>
                          </div>
                          <Badge variant="outline">{suggestion.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          {/* Maintenance Actions */}
          <Card>
            <CardHeader>
              <CardTitle>数据库维护操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">查询优化</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      自动分析并优化慢查询，创建必要的索引
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => performOptimization(true)}
                      disabled={optimizing}
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      预览
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => performOptimization(false)}
                      disabled={optimizing}
                    >
                      {optimizing ? (
                        <>
                          <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                          优化中...
                        </>
                      ) : (
                        <>
                          <ZapIcon className="h-4 w-4 mr-2" />
                          执行优化
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">VACUUM 操作</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      清理死元组并更新表统计信息
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => performVacuum(true)}
                      disabled={vacuuming}
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      预览
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => performVacuum(false)}
                      disabled={vacuuming}
                    >
                      {vacuuming ? (
                        <>
                          <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                          执行中...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4 mr-2" />
                          执行VACUUM
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  ⚠️ 维护操作可能影响数据库性能，建议在低峰期执行。
                  大型表的VACUUM操作可能需要较长时间完成。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DatabaseOptimizationDashboard