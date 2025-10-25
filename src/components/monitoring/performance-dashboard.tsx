/**
 * Performance Dashboard Component
 *
 * Real-time performance monitoring dashboard with alerts and metrics
 */

'use client'

import { useState, useEffect } from 'react'
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuIcon,
  DatabaseIcon,
  MemoryStickIcon,
  RefreshCwIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  ZapIcon
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { useToast } from '@/hooks/use-toast'

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  responseTime: number
  errorRate: number
  throughput: number
  memoryUsage: number
  cpuUsage: number
  lastUpdated: string
}

interface PerformanceAlert {
  id: string
  type: 'threshold' | 'trend' | 'anomaly'
  severity: 'info' | 'warning' | 'error' | 'critical'
  metric: string
  value: number
  threshold?: number
  message: string
  timestamp: string
  acknowledged: boolean
  resolved: boolean
}

interface PerformanceMetrics {
  responseTime: { data: any[]; stats: any }
  errorRate: { data: any[]; stats: any }
  memoryUsage: { data: any[]; stats: any }
  cpuUsage: { data: any[]; stats: any }
  searchQueryTime: { data: any[]; stats: any }
}

interface PerformanceDashboardProps {
  className?: string
  refreshInterval?: number
}

export function PerformanceDashboard({
  className = '',
  refreshInterval = 30000 // 30 seconds
}: PerformanceDashboardProps) {
  const { toast } = useToast()

  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch monitoring data
  const fetchMonitoringData = async () => {
    try {
      const response = await fetch('/api/monitoring/performance')
      const data = await response.json()

      if (data.success) {
        setHealth(data.data.health)
        setAlerts(data.data.alerts || [])
      }

    } catch (error) {
      console.error('Failed to fetch monitoring data:', error)
      toast({
        title: '获取监控数据失败',
        description: '无法加载性能监控数据',
        variant: 'destructive'
      })
    }
  }

  // Fetch detailed metrics
  const fetchDetailedMetrics = async () => {
    try {
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000) // Last hour

      const response = await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: {
            start: startTime.toISOString(),
            end: endTime.toISOString()
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setMetrics(data.data.metrics)
      }

    } catch (error) {
      console.error('Failed to fetch detailed metrics:', error)
    }
  }

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchMonitoringData(),
      fetchDetailedMetrics()
    ])
    setRefreshing(false)
  }

  // Handle alert acknowledgment
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'acknowledge',
          alertId
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local alert state
        setAlerts(prev => prev.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ))

        toast({
          title: '警报已确认',
          description: '警报状态已更新'
        })
      }

    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
      toast({
        title: '确认失败',
        description: '无法确认警报',
        variant: 'destructive'
      })
    }
  }

  // Initialize data
  useEffect(() => {
    refreshData()
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Format time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Format uptime
  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}天 ${hours % 24}小时`
    if (hours > 0) return `${hours}小时 ${minutes % 60}分钟`
    if (minutes > 0) return `${minutes}分钟`
    return `${seconds}秒`
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'error': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Prepare chart data
  const prepareChartData = (metricData: any[]) => {
    return metricData.map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString(),
      value: item.value
    }))
  }

  if (loading && !health) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCwIcon className="h-6 w-6 animate-spin" />
            <span>加载监控数据中...</span>
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
            <ActivityIcon className="h-6 w-6 mr-2 text-blue-600" />
            性能监控
          </h2>
          <p className="text-gray-600 mt-1">
            实时系统性能监控和警报
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '停止自动刷新' : '启用自动刷新'}
          </Button>
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

      {/* System Status */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>系统状态</span>
              <Badge className={getStatusColor(health.status)}>
                {health.status === 'healthy' ? '健康' :
                 health.status === 'warning' ? '警告' : '严重'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatUptime(health.uptime)}
                </div>
                <div className="text-sm text-gray-500">运行时间</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatTime(health.responseTime)}
                </div>
                <div className="text-sm text-gray-500">响应时间</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {(health.errorRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">错误率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {health.throughput.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">吞吐量/秒</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource Usage */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <MemoryStickIcon className="h-5 w-5 mr-2 text-blue-600" />
                内存使用
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>内存使用率</span>
                  <span className="font-medium">{(health.memoryUsage * 100).toFixed(1)}%</span>
                </div>
                <Progress value={health.memoryUsage * 100} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">
                  {health.memoryUsage < 0.7 ? '正常' :
                   health.memoryUsage < 0.85 ? '警告' : '严重'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <CpuIcon className="h-5 w-5 mr-2 text-green-600" />
                CPU 使用
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>CPU 使用率</span>
                  <span className="font-medium">{(health.cpuUsage * 100).toFixed(1)}%</span>
                </div>
                <Progress value={health.cpuUsage * 100} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">
                  {health.cpuUsage < 0.7 ? '正常' :
                   health.cpuUsage < 0.85 ? '警告' : '严重'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">性能指标</TabsTrigger>
          <TabsTrigger value="alerts">警报</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          {/* Performance Charts */}
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>响应时间趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prepareChartData(metrics.responseTime.data)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [formatTime(value), '响应时间']} />
                        <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>错误率趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={prepareChartData(metrics.errorRate.data)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, '错误率']} />
                        <Area type="monotone" dataKey="value" stroke="#EF4444" fill="#FEE2E2" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>内存使用趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prepareChartData(metrics.memoryUsage.data)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, '内存使用']} />
                        <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>搜索查询时间</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepareChartData(metrics.searchQueryTime.data)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [formatTime(value), '查询时间']} />
                        <Bar dataKey="value" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>最近警报</span>
                <Badge variant="outline">
                  {alerts.filter(a => !a.acknowledged && !a.resolved).length} 未确认
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>暂无警报</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{alert.metric}</h4>
                            <Badge variant="outline" className="text-xs">
                              {alert.severity}
                            </Badge>
                            {alert.acknowledged && (
                              <Badge variant="outline" className="text-xs">
                                已确认
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mb-2">{alert.message}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            <span>值: {alert.value}</span>
                            {alert.threshold && <span>阈值: {alert.threshold}</span>}
                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                            >
                              确认
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PerformanceDashboard