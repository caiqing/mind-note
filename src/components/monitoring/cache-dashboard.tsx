/**
 * Cache Management Dashboard Component
 *
 * Comprehensive cache monitoring and management interface
 */

'use client'

import { useState, useEffect } from 'react'
import {
  DatabaseIcon,
  HardDriveIcon,
  ZapIcon,
  TrashIcon,
  RefreshCwIcon,
  DownloadIcon,
  UploadIcon,
  SettingsIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  ClockIcon,
  TagIcon
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

interface CacheStats {
  totalEntries: number
  totalSize: number
  hitCount: number
  missCount: number
  hitRate: number
  evictionCount: number
  topEntries: Array<{
    key: string
    hitCount: number
    accessCount: number
    size: number
  }>
}

interface CacheData {
  search?: CacheStats
  api?: CacheStats
  image?: CacheStats
  combined?: {
    totalSize: number
    totalEntries: number
    avgHitRate: number
    totalEvictions: number
  }
}

interface OperationResult {
  operation: string
  result: any
  duration: number
  affectedCaches: string[]
}

interface CacheDashboardProps {
  className?: string
  refreshInterval?: number
}

export function CacheDashboard({
  className = '',
  refreshInterval = 30000 // 30 seconds
}: CacheDashboardProps) {
  const { toast } = useToast()

  const [cacheData, setCacheData] = useState<CacheData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedCache, setSelectedCache] = useState<'all' | 'search' | 'api' | 'image'>('all')

  // Fetch cache statistics
  const fetchCacheStats = async () => {
    try {
      const response = await fetch(`/api/cache/manage?type=${selectedCache}`)
      const data = await response.json()

      if (data.success) {
        setCacheData(data.data)
      } else {
        toast({
          title: '获取缓存统计失败',
          description: data.error || '无法加载缓存数据',
          variant: 'destructive'
        })
      }

    } catch (error) {
      console.error('Failed to fetch cache stats:', error)
      toast({
        title: '网络错误',
        description: '无法连接到缓存管理服务',
        variant: 'destructive'
      })
    }
  }

  // Perform cache operation
  const performCacheOperation = async (action: string, data?: any) => {
    setRefreshing(true)

    try {
      const response = await fetch('/api/cache/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          cacheType: selectedCache,
          data
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: '操作成功',
          description: `${action} 操作已完成`
        })

        // Refresh data after operation
        await fetchCacheStats()
      } else {
        toast({
          title: '操作失败',
          description: result.error || '缓存操作失败',
          variant: 'destructive'
        })
      }

    } catch (error) {
      console.error('Cache operation failed:', error)
      toast({
        title: '操作错误',
        description: '无法执行缓存操作',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Initialize data
  useEffect(() => {
    fetchCacheStats()
  }, [selectedCache])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchCacheStats()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, selectedCache])

  // Format size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  // Get hit rate color
  const getHitRateColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600'
    if (rate >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Prepare pie chart data for cache distribution
  const prepareCacheDistributionData = () => {
    if (!cacheData) return []

    return [
      { name: '搜索缓存', value: cacheData.search?.totalSize || 0, color: '#3B82F6' },
      { name: 'API缓存', value: cacheData.api?.totalSize || 0, color: '#10B981' },
      { name: '图片缓存', value: cacheData.image?.totalSize || 0, color: '#F59E0B' }
    ].filter(item => item.value > 0)
  }

  // Prepare top entries data
  const prepareTopEntriesData = () => {
    if (!cacheData || selectedCache === 'all') return []

    const cache = cacheData[selectedCache as keyof Omit<CacheData, 'combined'>]
    if (!cache) return []

    return cache.topEntries.slice(0, 10).map(entry => ({
      key: entry.key.substring(0, 30) + (entry.key.length > 30 ? '...' : ''),
      hits: entry.hitCount,
      accesses: entry.accessCount,
      size: formatSize(entry.size)
    }))
  }

  if (loading && !cacheData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCwIcon className="h-6 w-6 animate-spin" />
            <span>加载缓存数据中...</span>
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
            缓存管理
          </h2>
          <p className="text-gray-600 mt-1">
            监控和管理系统缓存性能
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedCache} onValueChange={(value: any) => setSelectedCache(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部缓存</SelectItem>
              <SelectItem value="search">搜索缓存</SelectItem>
              <SelectItem value="api">API缓存</SelectItem>
              <SelectItem value="image">图片缓存</SelectItem>
            </SelectContent>
          </Select>
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
            onClick={fetchCacheStats}
            disabled={refreshing}
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {cacheData?.combined && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">总缓存大小</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatSize(cacheData.combined.totalSize)}
              </div>
              <div className="text-xs text-gray-500">
                {cacheData.combined.totalEntries} 个条目
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">平均命中率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHitRateColor(cacheData.combined.avgHitRate)}`}>
                {formatPercentage(cacheData.combined.avgHitRate)}
              </div>
              <div className="text-xs text-gray-500">
                {cacheData.combined.avgHitRate >= 0.8 ? '优秀' :
                 cacheData.combined.avgHitRate >= 0.6 ? '良好' : '需要优化'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">驱逐次数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {cacheData.combined.totalEvictions.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                缓存空间不足时触发
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">缓存类型</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(cacheData).filter(key => key !== 'combined').length}
              </div>
              <div className="text-xs text-gray-500">
                活跃缓存实例
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cache Details */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="performance">性能</TabsTrigger>
          <TabsTrigger value="top-entries">热门条目</TabsTrigger>
          <TabsTrigger value="management">管理</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cache Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>缓存分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareCacheDistributionData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prepareCacheDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatSize(value), '大小']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Cache Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>缓存性能对比</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cacheData && Object.entries(cacheData).filter(([key]) => key !== 'combined').map(([type, stats]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium capitalize">{type}</span>
                        <Badge variant={stats.hitRate >= 0.8 ? 'default' : stats.hitRate >= 0.6 ? 'secondary' : 'destructive'}>
                          {formatPercentage(stats.hitRate)}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{stats.totalEntries} 条目</span>
                        <span>{formatSize(stats.totalSize)}</span>
                      </div>
                      <Progress value={stats.hitRate * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Metrics */}
          {cacheData && selectedCache !== 'all' && cacheData[selectedCache as keyof Omit<CacheData, 'combined'>] && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>命中/未命中统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: '命中', value: cacheData[selectedCache as keyof Omit<CacheData, 'combined'>]!.hitCount },
                          { name: '未命中', value: cacheData[selectedCache as keyof Omit<CacheData, 'combined'>]!.missCount }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>缓存效率指标</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getHitRateColor(cacheData[selectedCache as keyof Omit<CacheData, 'combined'>]!.hitRate)}`}>
                        {formatPercentage(cacheData[selectedCache as keyof Omit<CacheData, 'combined'>]!.hitRate)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">命中率</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-xl font-semibold text-blue-600">
                          {cacheData[selectedCache as keyof Omit<CacheData, 'combined'>]!.hitCount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">命中次数</div>
                      </div>
                      <div>
                        <div className="text-xl font-semibold text-red-600">
                          {cacheData[selectedCache as keyof Omit<CacheData, 'combined'>]!.missCount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">未命中次数</div>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-semibold text-orange-600">
                        {cacheData[selectedCache as keyof Omit<CacheData, 'combined'>]!.evictionCount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">驱逐次数</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="top-entries" className="space-y-6">
          {/* Top Entries */}
          <Card>
            <CardHeader>
              <CardTitle>热门缓存条目</CardTitle>
            </CardHeader>
            <CardContent>
              {prepareTopEntriesData().length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareTopEntriesData()} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="key" type="category" width={200} />
                      <Tooltip />
                      <Bar dataKey="hits" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DatabaseIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无缓存条目数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          {/* Cache Management Operations */}
          <Card>
            <CardHeader>
              <CardTitle>缓存管理操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  onClick={() => performCacheOperation('cleanup')}
                  disabled={refreshing}
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
                  <DownloadIcon className="h-4 w-4" />
                  <span>导出数据</span>
                </Button>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  操作说明
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• <strong>清理过期</strong>：删除所有过期的缓存条目</p>
                  <p>• <strong>预热缓存</strong>：加载常用数据到缓存中</p>
                  <p>• <strong>清空缓存</strong>：删除所有缓存条目（谨慎操作）</p>
                  <p>• <strong>导出数据</strong>：导出缓存数据用于备份或分析</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CacheDashboard