/**
 * Cache & CDN Management Dashboard
 *
 * Unified dashboard for cache and CDN monitoring and management
 */

'use client'

import { useState, useEffect } from 'react'
import {
  DatabaseIcon,
  GlobeIcon,
  ZapIcon,
  TrashIcon,
  RefreshCwIcon,
  SettingsIcon,
  ActivityIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  HardDriveIcon,
  ShieldIcon,
  NetworkIcon,
  BarChart3Icon
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
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface CacheStats {
  totalEntries: number
  totalSize: number
  hitCount: number
  missCount: number
  hitRate: number
  evictionCount: number
}

interface CDNStats {
  provider: string
  requests: number
  bandwidth: number
  hits: number
  misses: number
  hitRate: number
  avgResponseTime: number
  errorRate: number
}

interface CacheCDNDashboardProps {
  className?: string
  refreshInterval?: number
}

export function CacheCDNDashboard({
  className = '',
  refreshInterval = 30000 // 30 seconds
}: CacheCDNDashboardProps) {
  const { toast } = useToast()

  const [cacheData, setCacheData] = useState<any>(null)
  const [cdnData, setCDNData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch both cache and CDN statistics
  const fetchAllStats = async () => {
    try {
      const [cacheResponse, cdnResponse] = await Promise.all([
        fetch('/api/cache/manage?type=all'),
        fetch('/api/cdn/manage?action=stats')
      ])

      const cacheResult = await cacheResponse.json()
      const cdnResult = await cdnResponse.json()

      if (cacheResult.success) {
        setCacheData(cacheResult.data)
      }

      if (cdnResult.success) {
        setCDNData(cdnResult.data)
      }

      if (!cacheResult.success || !cdnResult.success) {
        toast({
          title: '数据获取失败',
          description: '无法加载部分统计数据',
          variant: 'destructive'
        })
      }

    } catch (error) {
      console.error('Failed to fetch stats:', error)
      toast({
        title: '网络错误',
        description: '无法连接到服务',
        variant: 'destructive'
      })
    }
  }

  // Perform cache operation
  const performCacheOperation = async (action: string) => {
    setRefreshing(true)

    try {
      const response = await fetch('/api/cache/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, cacheType: 'all' })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: '缓存操作成功',
          description: `${action} 操作已完成`
        })
        await fetchAllStats()
      } else {
        toast({
          title: '操作失败',
          description: result.error,
          variant: 'destructive'
        })
      }

    } catch (error) {
      toast({
        title: '操作错误',
        description: '无法执行操作',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Perform CDN operation
  const performCDNOperation = async (action: string) => {
    setRefreshing(true)

    try {
      const response = await fetch('/api/cdn/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'CDN操作成功',
          description: `${action} 操作已完成`
        })
        await fetchAllStats()
      } else {
        toast({
          title: '操作失败',
          description: result.error,
          variant: 'destructive'
        })
      }

    } catch (error) {
      toast({
        title: '操作错误',
        description: '无法执行CDN操作',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Initialize data
  useEffect(() => {
    fetchAllStats()
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchAllStats()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Format utilities
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatTime = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`

  const getHitRateColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600'
    if (rate >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 0.8) return 'bg-green-100 text-green-800'
    if (rate >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  // Prepare chart data
  const preparePerformanceData = () => {
    if (!cacheData?.combined || !cdnData?.stats) return []

    return [
      {
        name: '缓存命中',
        cache: cacheData.combined.avgHitRate * 100,
        cdn: cdnData.stats.hitRate * 100
      },
      {
        name: '响应时间',
        cache: 50, // Mock data for cache response time
        cdn: cdnData.stats.avgResponseTime
      },
      {
        name: '错误率',
        cache: 0.1, // Mock data for cache error rate
        cdn: cdnData.stats.errorRate * 100
      }
    ]
  }

  const prepareUsageData = () => {
    if (!cacheData?.combined) return []

    return [
      { name: '搜索缓存', value: cacheData.search?.totalSize || 0, color: '#3B82F6' },
      { name: 'API缓存', value: cacheData.api?.totalSize || 0, color: '#10B981' },
      { name: '图片缓存', value: cacheData.image?.totalSize || 0, color: '#F59E0B' }
    ].filter(item => item.value > 0)
  }

  if (loading && (!cacheData || !cdnData)) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCwIcon className="h-6 w-6 animate-spin" />
            <span>加载性能数据中...</span>
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
            性能管理中心
          </h2>
          <p className="text-gray-600 mt-1">
            统一监控和管理缓存与CDN性能
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <span className="text-sm">自动刷新</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllStats}
            disabled={refreshing}
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DatabaseIcon className="h-4 w-4 mr-2" />
              缓存命中率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHitRateColor(cacheData?.combined?.avgHitRate || 0)}`}>
              {formatPercentage(cacheData?.combined?.avgHitRate || 0)}
            </div>
            <Progress
              value={(cacheData?.combined?.avgHitRate || 0) * 100}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <GlobeIcon className="h-4 w-4 mr-2" />
              CDN命中率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHitRateColor(cdnData?.stats?.hitRate || 0)}`}>
              {formatPercentage(cdnData?.stats?.hitRate || 0)}
            </div>
            <Progress
              value={(cdnData?.stats?.hitRate || 0) * 100}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <HardDriveIcon className="h-4 w-4 mr-2" />
              总缓存大小
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatSize(cacheData?.combined?.totalSize || 0)}
            </div>
            <div className="text-xs text-gray-500">
              {cacheData?.combined?.totalEntries || 0} 个条目
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <NetworkIcon className="h-4 w-4 mr-2" />
              CDN响应时间
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatTime(cdnData?.stats?.avgResponseTime || 0)}
            </div>
            <div className="text-xs text-gray-500">
              平均响应时间
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">性能概览</TabsTrigger>
          <TabsTrigger value="cache">缓存管理</TabsTrigger>
          <TabsTrigger value="cdn">CDN管理</TabsTrigger>
          <TabsTrigger value="operations">系统操作</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>性能对比</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={preparePerformanceData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="cache" fill="#3B82F6" name="缓存" />
                      <Bar dataKey="cdn" fill="#10B981" name="CDN" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>缓存使用分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareUsageData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prepareUsageData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatSize(value), '大小']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">系统健康状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>缓存系统</span>
                    <Badge className={getStatusColor(cacheData?.combined?.avgHitRate || 0)}>
                      {cacheData?.combined?.avgHitRate >= 0.8 ? '健康' :
                       cacheData?.combined?.avgHitRate >= 0.6 ? '警告' : '异常'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>CDN服务</span>
                    <Badge className={getStatusColor(cdnData?.stats?.hitRate || 0)}>
                      {cdnData?.stats?.hitRate >= 0.8 ? '健康' :
                       cdnData?.stats?.hitRate >= 0.6 ? '警告' : '异常'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>网络延迟</span>
                    <Badge variant="outline">
                      {(cdnData?.stats?.avgResponseTime || 0) < 500 ? '良好' : '较高'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">优化建议</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {cdnData?.recommendations?.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  )) || <div className="text-gray-500">暂无建议</div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">资源使用</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>缓存使用率</span>
                      <span>{formatPercentage((cacheData?.combined?.totalSize || 0) / (100 * 1024 * 1024))}</span>
                    </div>
                    <Progress value={((cacheData?.combined?.totalSize || 0) / (100 * 1024 * 1024)) * 100} className="h-2" />
                  </div>
                  <div className="text-xs text-gray-500">
                    带宽使用: {formatSize(cdnData?.stats?.bandwidth || 0)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>缓存操作管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  onClick={() => performCacheOperation('cleanup')}
                  disabled={refreshing}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>清理过期</span>
                </Button>

                <Button
                  onClick={() => performCacheOperation('warmup')}
                  disabled={refreshing}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <ZapIcon className="h-4 w-4" />
                  <span>预热缓存</span>
                </Button>

                <Button
                  onClick={() => performCacheOperation('clear')}
                  disabled={refreshing}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <RefreshCwIcon className="h-4 w-4" />
                  <span>清空缓存</span>
                </Button>

                <Button
                  onClick={() => performCacheOperation('export')}
                  disabled={refreshing}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <BarChart3Icon className="h-4 w-4" />
                  <span>导出数据</span>
                </Button>
              </div>

              {cacheData && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(cacheData).filter(([key]) => key !== 'combined').map(([type, stats]: [string, any]) => (
                    <div key={type} className="p-4 border rounded-lg">
                      <h4 className="font-medium capitalize mb-3">{type} 缓存</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>条目数</span>
                          <span>{stats.totalEntries.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>大小</span>
                          <span>{formatSize(stats.totalSize)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>命中率</span>
                          <Badge className={getStatusColor(stats.hitRate)}>
                            {formatPercentage(stats.hitRate)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cdn" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CDN操作管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  onClick={() => performCDNOperation('purge')}
                  disabled={refreshing}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>清除CDN</span>
                </Button>

                <Button
                  onClick={() => performCDNOperation('optimize')}
                  disabled={refreshing}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <TrendingUpIcon className="h-4 w-4" />
                  <span>优化配置</span>
                </Button>

                <Button
                  onClick={() => performCDNOperation('test')}
                  disabled={refreshing}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <ShieldIcon className="h-4 w-4" />
                  <span>连接测试</span>
                </Button>

                <Button
                  disabled={refreshing}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span>高级设置</span>
                </Button>
              </div>

              {cdnData?.stats && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">提供商</h4>
                    <div className="text-2xl font-bold text-blue-600 capitalize">
                      {cdnData.stats.provider}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">请求数</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {cdnData.stats.requests.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">带宽</h4>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatSize(cdnData.stats.bandwidth)}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">错误率</h4>
                    <div className="text-2xl font-bold text-red-600">
                      {formatPercentage(cdnData.stats.errorRate)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>系统维护操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <ZapIcon className="h-4 w-4 mr-2 text-blue-600" />
                    性能优化
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    执行全面的系统性能优化，包括缓存清理、CDN优化和数据库维护。
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        performCacheOperation('cleanup')
                        performCDNOperation('optimize')
                      }}
                      disabled={refreshing}
                      size="sm"
                    >
                      执行优化
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <RefreshCwIcon className="h-4 w-4 mr-2 text-yellow-600" />
                    缓存重置
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    清理所有缓存数据并重新预热。此操作可能导致短期内性能下降。
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        performCacheOperation('clear')
                        performCacheOperation('warmup')
                      }}
                      disabled={refreshing}
                      variant="outline"
                      size="sm"
                    >
                      重置缓存
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <TrashIcon className="h-4 w-4 mr-2 text-red-600" />
                    全面清理
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    清理所有缓存和CDN数据。⚠️ 警告：这将影响系统性能，建议在维护窗口期执行。
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        performCacheOperation('clear')
                        performCDNOperation('purge')
                      }}
                      disabled={refreshing}
                      variant="destructive"
                      size="sm"
                    >
                      全面清理
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CacheCDNDashboard