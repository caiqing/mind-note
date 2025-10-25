/**
 * 数据库连接池和查询监控演示组件
 *
 * 展示连接池管理、查询性能监控和优化建议的完整功能
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// 数据库组件导入 (实际项目中需要正确导入)
import {
  connectionPoolManager,
  ConnectionStats,
  ConnectionType,
  PoolStatus,
  HealthCheckResult
} from '@/lib/database/connection-pool-manager'
import {
  queryMonitor,
  QueryRecord,
  QueryStats,
  SlowQueryRecord,
  PerformanceReport
} from '@/lib/database/query-monitor'

// 模拟数据生成器
class DatabaseDataGenerator {
  private static instance: DatabaseDataGenerator

  static getInstance(): DatabaseDataGenerator {
    if (!DatabaseDataGenerator.instance) {
      DatabaseDataGenerator.instance = new DatabaseDataGenerator()
    }
    return DatabaseDataGenerator.instance
  }

  generateConnectionStats(): ConnectionStats[] {
    return [
      {
        poolName: 'primary_read',
        type: ConnectionType.READ,
        totalConnections: 25,
        activeConnections: 8,
        idleConnections: 17,
        waitingClients: 0,
        totalAcquires: 15234,
        totalReleases: 15226,
        totalErrors: 12,
        averageAcquireTime: 5.2,
        averageUsageTime: 245.8,
        connectionUtilization: 32.0,
        errorRate: 0.08,
        lastError: null,
        lastErrorTime: null,
        uptime: Date.now() - 86400000,
        status: PoolStatus.HEALTHY
      },
      {
        poolName: 'primary_write',
        type: ConnectionType.WRITE,
        totalConnections: 10,
        activeConnections: 3,
        idleConnections: 7,
        waitingClients: 1,
        totalAcquires: 5432,
        totalReleases: 5431,
        totalErrors: 3,
        averageAcquireTime: 3.8,
        averageUsageTime: 125.4,
        connectionUtilization: 30.0,
        errorRate: 0.06,
        lastError: null,
        lastErrorTime: null,
        uptime: Date.now() - 86400000,
        status: PoolStatus.HEALTHY
      },
      {
        poolName: 'analytics_read',
        type: ConnectionType.ANALYTICS,
        totalConnections: 15,
        activeConnections: 12,
        idleConnections: 3,
        waitingClients: 0,
        totalAcquires: 3210,
        totalReleases: 3208,
        totalErrors: 8,
        averageAcquireTime: 12.5,
        averageUsageTime: 3456.2,
        connectionUtilization: 80.0,
        errorRate: 0.25,
        lastError: 'Connection timeout',
        lastErrorTime: Date.now() - 300000,
        uptime: Date.now() - 86400000,
        status: PoolStatus.DEGRADED
      },
      {
        poolName: 'backup_read',
        type: ConnectionType.BACKUP,
        totalConnections: 5,
        activeConnections: 1,
        idleConnections: 4,
        waitingClients: 0,
        totalAcquires: 156,
        totalReleases: 155,
        totalErrors: 0,
        averageAcquireTime: 8.3,
        averageUsageTime: 567.1,
        connectionUtilization: 20.0,
        errorRate: 0.0,
        lastError: null,
        lastErrorTime: null,
        uptime: Date.now() - 86400000,
        status: PoolStatus.HEALTHY
      }
    ]
  }

  generateQueryStats(): QueryStats[] {
    return [
      {
        queryPattern: 'SELECT * FROM notes WHERE user_id = ?',
        type: 'SELECT' as any,
        totalExecutions: 2341,
        averageExecutionTime: 15.2,
        minExecutionTime: 3.5,
        maxExecutionTime: 234.8,
        totalRowsAffected: 45210,
        averageRowsAffected: 19.3,
        successRate: 99.8,
        errorCount: 4,
        lastExecuted: Date.now() - 30000,
        frequency: 12.5,
        performanceLevel: 'good' as any,
        optimizationSuggestions: ['查询性能良好', '可以考虑添加user_id索引']
      },
      {
        queryPattern: 'SELECT * FROM notes WHERE created_at > ? ORDER BY created_at DESC',
        type: 'SELECT' as any,
        totalExecutions: 876,
        averageExecutionTime: 456.3,
        minExecutionTime: 23.1,
        maxExecutionTime: 2345.6,
        totalRowsAffected: 123450,
        averageRowsAffected: 140.9,
        successRate: 98.7,
        errorCount: 11,
        lastExecuted: Date.now() - 120000,
        frequency: 4.8,
        performanceLevel: 'slow' as any,
        optimizationSuggestions: ['查询执行时间过长', '添加created_at索引', '考虑分页查询']
      },
      {
        queryPattern: 'INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)',
        type: 'INSERT' as any,
        totalExecutions: 432,
        averageExecutionTime: 8.5,
        minExecutionTime: 2.1,
        maxExecutionTime: 45.3,
        totalRowsAffected: 432,
        averageRowsAffected: 1.0,
        successRate: 99.5,
        errorCount: 2,
        lastExecuted: Date.now() - 60000,
        frequency: 2.1,
        performanceLevel: 'excellent' as any,
        optimizationSuggestions: ['插入性能优秀']
      }
    ]
  }

  generateSlowQueries(): SlowQueryRecord[] {
    return [
      {
        id: 'slow_1',
        query: 'SELECT * FROM notes WHERE content LIKE ? AND created_at > ? ORDER BY created_at DESC',
        params: ['%important%', '2024-01-01'],
        type: 'SELECT' as any,
        executionTime: 2345.6,
        affectedRows: 45,
        poolName: 'analytics_read',
        connectionType: ConnectionType.READ,
        timestamp: Date.now() - 120000,
        userId: 'user_123',
        tags: ['search', 'content'],
        success: true,
        performanceLevel: 'very_slow' as any,
        cacheHit: false,
        indexUsage: [],
        tablesAccessed: ['notes'],
        estimatedCost: 12500,
        analysis: {
          reason: '检测到全表扫描',
          suggestions: ['添加适当的索引以避免全表扫描', '考虑使用全文搜索'],
          missingIndexes: ['content', 'created_at'],
          tableScanDetected: true,
          nPlusOneDetected: false,
          cartesianProduct: false,
          subqueryIssue: false
        }
      },
      {
        id: 'slow_2',
        query: 'SELECT n.*, u.name FROM notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.created_at > ?',
        params: ['2024-01-01'],
        type: 'SELECT' as any,
        executionTime: 1567.3,
        affectedRows: 2340,
        poolName: 'analytics_read',
        connectionType: ConnectionType.READ,
        timestamp: Date.now() - 300000,
        tags: ['report', 'analytics'],
        success: true,
        performanceLevel: 'slow' as any,
        cacheHit: false,
        indexUsage: ['users.id'],
        tablesAccessed: ['notes', 'users'],
        estimatedCost: 8900,
        analysis: {
          reason: 'JOIN查询性能问题',
          suggestions: ['添加n.user_id索引', '考虑查询结果缓存'],
          missingIndexes: ['notes.user_id', 'notes.created_at'],
          tableScanDetected: false,
          nPlusOneDetected: false,
          cartesianProduct: false,
          subqueryIssue: false
        }
      }
    ]
  }

  generatePerformanceData() {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i
      return {
        hour: `${hour}:00`,
        totalQueries: 450 + Math.random() * 200,
        avgExecutionTime: 50 + Math.random() * 150,
        slowQueries: Math.floor(Math.random() * 10),
        errorRate: Math.random() * 2,
        cacheHitRate: 60 + Math.random() * 30
      }
    })
  }
}

// 主组件
export default function DatabaseMonitorDemo() {
  const [activeTab, setActiveTab] = useState('overview')
  const [connectionStats, setConnectionStats] = useState<ConnectionStats[]>([])
  const [queryStats, setQueryStats] = useState<QueryStats[]>([])
  const [slowQueries, setSlowQueries] = useState<SlowQueryRecord[]>([])
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([])
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const dataGenerator = DatabaseDataGenerator.getInstance()

  // 初始化数据
  useEffect(() => {
    setConnectionStats(dataGenerator.generateConnectionStats())
    setQueryStats(dataGenerator.generateQueryStats())
    setSlowQueries(dataGenerator.generateSlowQueries())
    setPerformanceData(dataGenerator.generatePerformanceData())

    // 模拟健康检查结果
    setHealthResults([
      {
        poolName: 'primary_read',
        isHealthy: true,
        responseTime: 5.2,
        checkedAt: Date.now(),
        metrics: {
          connectionCount: 25,
          activeConnections: 8,
          idleConnections: 17,
          averageResponseTime: 5.2
        }
      },
      {
        poolName: 'primary_write',
        isHealthy: true,
        responseTime: 3.8,
        checkedAt: Date.now(),
        metrics: {
          connectionCount: 10,
          activeConnections: 3,
          idleConnections: 7,
          averageResponseTime: 3.8
        }
      },
      {
        poolName: 'analytics_read',
        isHealthy: false,
        responseTime: 45.6,
        error: 'Connection timeout',
        checkedAt: Date.now(),
        metrics: {
          connectionCount: 15,
          activeConnections: 12,
          idleConnections: 3,
          averageResponseTime: 45.6
        }
      }
    ])

    // 生成性能报告
    const report: PerformanceReport = {
      generatedAt: Date.now(),
      period: {
        start: Date.now() - 24 * 60 * 60 * 1000,
        end: Date.now(),
        duration: 24 * 60 * 60 * 1000
      },
      summary: {
        totalQueries: 15234,
        averageExecutionTime: 125.4,
        slowQueries: 234,
        errorRate: 0.8,
        cacheHitRate: 72.5
      },
      queryTypeStats: new Map([
        ['SELECT', { count: 12345, avgTime: 85.2, slowCount: 198 }],
        ['INSERT', { count: 1543, avgTime: 12.5, slowCount: 23 }],
        ['UPDATE', { count: 876, avgTime: 45.8, slowCount: 12 }],
        ['DELETE', { count: 470, avgTime: 23.4, slowCount: 1 }]
      ]),
      topSlowQueries: dataGenerator.generateSlowQueries(),
      optimizationRecommendations: [
        '为notes表添加content和created_at复合索引',
        '优化高频查询的WHERE条件',
        '实施查询结果缓存策略',
        '考虑数据库读写分离'
      ],
      indexRecommendations: [
        {
          table: 'notes',
          columns: ['user_id', 'created_at'],
          estimatedImprovement: '预计可提升查询性能 65%'
        },
        {
          table: 'notes',
          columns: ['content'],
          estimatedImprovement: '预计可提升全文搜索性能 80%'
        }
      ]
    }
    setPerformanceReport(report)

  }, [])

  // 实时更新数据
  useEffect(() => {
    const interval = setInterval(() => {
      // 更新连接统计
      setConnectionStats(prev => prev.map(pool => ({
        ...pool,
        activeConnections: Math.max(1, pool.activeConnections + (Math.random() - 0.5) * 2),
        averageAcquireTime: Math.max(1, pool.averageAcquireTime + (Math.random() - 0.5) * 2),
        connectionUtilization: Math.max(5, Math.min(95, pool.connectionUtilization + (Math.random() - 0.5) * 5))
      })))

      // 更新查询统计
      setQueryStats(prev => prev.map(stats => ({
        ...stats,
        totalExecutions: stats.totalExecutions + Math.floor(Math.random() * 5),
        averageExecutionTime: Math.max(1, stats.averageExecutionTime + (Math.random() - 0.5) * 10),
        frequency: Math.max(0.1, stats.frequency + (Math.random() - 0.5) * 2)
      })))

      // 更新性能数据
      setPerformanceData(prev => {
        const newData = [...prev.slice(1)]
        const lastHour = parseInt(prev[prev.length - 1].hour)
        const newHour = (lastHour + 1) % 24
        newData.push({
          hour: `${newHour}:00`,
          totalQueries: 450 + Math.random() * 200,
          avgExecutionTime: 50 + Math.random() * 150,
          slowQueries: Math.floor(Math.random() * 10),
          errorRate: Math.random() * 2,
          cacheHitRate: 60 + Math.random() * 30
        })
        return newData
      })

    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // 获取连接池状态颜色
  const getPoolStatusColor = (status: PoolStatus) => {
    switch (status) {
      case PoolStatus.HEALTHY: return 'text-green-600'
      case PoolStatus.DEGRADED: return 'text-yellow-600'
      case PoolStatus.UNHEALTHY: return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  // 获取性能级别颜色
  const getPerformanceLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'acceptable': return 'text-yellow-600'
      case 'slow': return 'text-orange-600'
      case 'very_slow': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">数据库连接池和查询监控</h1>
          <p className="text-gray-600 mt-2">
            连接池管理 • 查询性能监控 • 慢查询分析 • 优化建议
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600">
            系统监控中
          </Badge>
          <Badge variant="outline" className="text-blue-600">
            实时更新
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">系统概览</TabsTrigger>
          <TabsTrigger value="pools">连接池状态</TabsTrigger>
          <TabsTrigger value="queries">查询监控</TabsTrigger>
          <TabsTrigger value="slow-queries">慢查询分析</TabsTrigger>
          <TabsTrigger value="performance">性能报告</TabsTrigger>
          <TabsTrigger value="optimization">优化建议</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* 核心指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">总连接数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {connectionStats.reduce((sum, pool) => sum + pool.totalConnections, 0)}
                </div>
                <p className="text-xs text-gray-600">
                  活跃: {connectionStats.reduce((sum, pool) => sum + pool.activeConnections, 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">平均获取时间</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {(connectionStats.reduce((sum, pool) => sum + pool.averageAcquireTime, 0) / connectionStats.length).toFixed(1)}ms
                </div>
                <p className="text-xs text-gray-600">
                  目标: &lt;10ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">查询总数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {queryStats.reduce((sum, stats) => sum + stats.totalExecutions, 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-600">
                  慢查询: {slowQueries.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">整体错误率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {(
                    (connectionStats.reduce((sum, pool) => sum + pool.errorRate, 0) / connectionStats.length)
                  ).toFixed(2)}%
                </div>
                <p className="text-xs text-gray-600">
                  过去24小时
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 连接池健康状态 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>连接池健康状态</CardTitle>
                <CardDescription>
                  各连接池的实时健康检查结果
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {healthResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{result.poolName}</p>
                        <p className="text-sm text-gray-600">
                          响应时间: {result.responseTime.toFixed(1)}ms
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={result.isHealthy ? 'default' : 'destructive'}>
                          {result.isHealthy ? '健康' : '异常'}
                        </Badge>
                        {!result.isHealthy && result.error && (
                          <span className="text-sm text-red-600">{result.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>查询性能趋势</CardTitle>
                <CardDescription>
                  最近24小时的查询性能统计
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgExecutionTime"
                      stroke="#f59e0b"
                      name="平均执行时间(ms)"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="slowQueries"
                      stroke="#ef4444"
                      name="慢查询数"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>连接池详细信息</CardTitle>
              <CardDescription>
                各连接池的详细状态和性能指标
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>连接池名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>总连接数</TableHead>
                      <TableHead>活跃连接</TableHead>
                      <TableHead>空闲连接</TableHead>
                      <TableHead>利用率</TableHead>
                      <TableHead>获取时间</TableHead>
                      <TableHead>错误率</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connectionStats.map((pool, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{pool.poolName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {pool.type === ConnectionType.READ && '读'}
                            {pool.type === ConnectionType.WRITE && '写'}
                            {pool.type === ConnectionType.ANALYTICS && '分析'}
                            {pool.type === ConnectionType.BACKUP && '备份'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={getPoolStatusColor(pool.status)}>
                            {pool.status === PoolStatus.HEALTHY && '健康'}
                            {pool.status === PoolStatus.DEGRADED && '降级'}
                            {pool.status === PoolStatus.UNHEALTHY && '异常'}
                            {pool.status === PoolStatus.MAINTENANCE && '维护'}
                          </span>
                        </TableCell>
                        <TableCell>{pool.totalConnections}</TableCell>
                        <TableCell>{pool.activeConnections}</TableCell>
                        <TableCell>{pool.idleConnections}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={pool.connectionUtilization} className="w-16" />
                            <span className="text-sm">{pool.connectionUtilization.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{pool.averageAcquireTime.toFixed(1)}ms</TableCell>
                        <TableCell>
                          <span className={pool.errorRate > 1 ? 'text-red-600' : 'text-green-600'}>
                            {pool.errorRate.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 查询类型统计 */}
            <Card>
              <CardHeader>
                <CardTitle>查询类型分布</CardTitle>
                <CardDescription>
                  不同类型查询的执行统计
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={queryStats.map(stats => ({
                        name: stats.type,
                        value: stats.totalExecutions,
                        color: stats.type === 'SELECT' ? '#3b82f6' :
                               stats.type === 'INSERT' ? '#10b981' :
                               stats.type === 'UPDATE' ? '#f59e0b' :
                               stats.type === 'DELETE' ? '#ef4444' : '#6b7280'
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {queryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 查询性能排行 */}
            <Card>
              <CardHeader>
                <CardTitle>查询性能排行</CardTitle>
                <CardDescription>
                  按执行频率和性能排序的查询
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {queryStats
                    .sort((a, b) => b.frequency - a.frequency)
                    .slice(0, 10)
                    .map((stats, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">{stats.queryPattern}</p>
                          <p className="text-xs text-gray-600">
                            执行: {stats.totalExecutions}次 • 频率: {stats.frequency.toFixed(1)}/min
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{stats.averageExecutionTime.toFixed(1)}ms</p>
                          <p className={`text-xs ${getPerformanceLevelColor(stats.performanceLevel)}`}>
                            {stats.performanceLevel}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 详细查询统计表 */}
          <Card>
            <CardHeader>
              <CardTitle>详细查询统计</CardTitle>
              <CardDescription>
                各查询模式的详细性能指标
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>查询模式</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>执行次数</TableHead>
                      <TableHead>平均时间</TableHead>
                      <TableHead>最小时间</TableHead>
                      <TableHead>最大时间</TableHead>
                      <TableHead>成功率</TableHead>
                      <TableHead>频率(/min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryStats.map((stats, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs truncate max-w-xs">
                          {stats.queryPattern}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{stats.type}</Badge>
                        </TableCell>
                        <TableCell>{stats.totalExecutions.toLocaleString()}</TableCell>
                        <TableCell>{stats.averageExecutionTime.toFixed(1)}ms</TableCell>
                        <TableCell>{stats.minExecutionTime.toFixed(1)}ms</TableCell>
                        <TableCell>{stats.maxExecutionTime.toFixed(1)}ms</TableCell>
                        <TableCell>
                          <span className={stats.successRate < 95 ? 'text-red-600' : 'text-green-600'}>
                            {stats.successRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>{stats.frequency.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slow-queries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>慢查询分析</CardTitle>
              <CardDescription>
                执行时间过长的查询及其优化建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {slowQueries.map((query, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm font-mono">{query.query}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="destructive">
                            {query.executionTime.toFixed(1)}ms
                          </Badge>
                          <Badge variant="outline">
                            {query.poolName}
                          </Badge>
                          <span className="text-xs text-gray-600">
                            {new Date(query.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2">分析结果:</h4>
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-yellow-800">
                          {query.analysis.reason}
                        </p>
                        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                          {query.analysis.suggestions.map((suggestion, i) => (
                            <li key={i}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">影响行数:</span>
                        <span className="ml-2 font-medium">{query.affectedRows}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">缓存命中:</span>
                        <span className="ml-2 font-medium">{query.cacheHit ? '是' : '否'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">预估成本:</span>
                        <span className="ml-2 font-medium">{query.estimatedCost}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">访问表:</span>
                        <span className="ml-2 font-medium">{query.tablesAccessed.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {performanceReport && (
            <>
              {/* 性能摘要 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">总查询数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {performanceReport.summary.totalQueries.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">平均执行时间</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {performanceReport.summary.averageExecutionTime.toFixed(1)}ms
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">慢查询数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {performanceReport.summary.slowQueries}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">错误率</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {performanceReport.summary.errorRate.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">缓存命中率</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {performanceReport.summary.cacheHitRate.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 优化建议 */}
              <Card>
                <CardHeader>
                  <CardTitle>优化建议</CardTitle>
                  <CardDescription>
                    基于性能分析生成的改进建议
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceReport.optimizationRecommendations.map((recommendation, index) => (
                      <Alert key={index}>
                        <AlertTitle>优化建议 #{index + 1}</AlertTitle>
                        <AlertDescription>{recommendation}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 索引建议 */}
              <Card>
                <CardHeader>
                  <CardTitle>索引建议</CardTitle>
                  <CardDescription>
                    推荐创建的索引及预期效果
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceReport.indexRecommendations.map((rec, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">表: {rec.table}</p>
                          <p className="text-sm text-gray-600">
                            列: {rec.columns.join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{rec.estimatedImprovement}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 数据库优化检查 */}
            <Card>
              <CardHeader>
                <CardTitle>数据库优化检查</CardTitle>
                <CardDescription>
                  系统自动检测的优化机会
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">连接池配置</p>
                      <p className="text-sm text-gray-600">检查连接池参数是否合理</p>
                    </div>
                    <Badge variant="outline">良好</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">查询缓存</p>
                      <p className="text-sm text-gray-600">评估查询缓存使用率</p>
                    </div>
                    <Badge variant="outline">72.5%</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">索引覆盖率</p>
                      <p className="text-sm text-gray-600">重要查询的索引覆盖情况</p>
                    </div>
                    <Badge variant="destructive">待优化</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">慢查询比例</p>
                      <p className="text-sm text-gray-600">慢查询占总查询的比例</p>
                    </div>
                    <Badge variant="outline">1.5%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 性能改进计划 */}
            <Card>
              <CardHeader>
                <CardTitle>性能改进计划</CardTitle>
                <CardDescription>
                  基于监控数据制定的优化计划
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">第一阶段：索引优化</h4>
                      <Badge variant="outline">高优先级</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      为高频查询添加缺失索引，预计可提升65%查询性能
                    </p>
                    <div className="mt-2">
                      <Progress value={0} className="w-full" />
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">第二阶段：查询优化</h4>
                      <Badge variant="outline">中优先级</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      重写复杂查询，优化JOIN操作和子查询
                    </p>
                    <div className="mt-2">
                      <Progress value={0} className="w-full" />
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">第三阶段：缓存优化</h4>
                      <Badge variant="outline">中优先级</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      实施查询结果缓存，减少数据库负载
                    </p>
                    <div className="mt-2">
                      <Progress value={0} className="w-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 自动优化建议 */}
          <Card>
            <CardHeader>
              <CardTitle>自动优化建议</CardTitle>
              <CardDescription>
                AI驱动的智能优化建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Alert>
                  <AlertTitle>连接池优化</AlertTitle>
                  <AlertDescription>
                    analytics_read连接池利用率达到80%，建议增加连接数或优化查询以减少连接占用。
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertTitle>查询重写建议</AlertTitle>
                  <AlertDescription>
                    检测到大量排序查询，建议添加适当的索引或使用分页减少排序负担。
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertTitle>缓存策略优化</AlertTitle>
                  <AlertDescription>
                    用户查询缓存命中率为72.5%，建议对更多查询实施缓存策略。
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertTitle>索引维护建议</AlertTitle>
                  <AlertDescription>
                    建议定期分析索引使用情况，移除未使用的索引以提高写入性能。
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}