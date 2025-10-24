/**
 * 数据分析仪表盘组件
 *
 * 提供完整的数据可视化和用户洞察
 */

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BaseChart,
  SimpleBarChart,
  SimpleLineChart,
  SimplePieChart,
} from '@/components/charts/base-chart';
import { api, type AnalyticsData, type OverviewStats } from '@/lib/api-client';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Eye,
  Brain,
  Calendar,
  Tag,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
  Clock,
  Users,
  Download,
  RefreshCw,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>(
    '30d',
  );
  const [refreshing, setRefreshing] = useState(false);

  // 加载数据
  const loadData = async () => {
    try {
      setError(null);
      const analyticsData = await api.getAnalytics(timeRange);
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [timeRange]);

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // 格式化百分比
  const formatPercent = (num: number): string => {
    return (num * 100).toFixed(1) + '%';
  };

  // 获取趋势图标
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
    case 'up':
      return <TrendingUp className='w-4 h-4 text-green-600' />;
    case 'down':
      return <TrendingDown className='w-4 h-4 text-red-600' />;
    default:
      return <Minus className='w-4 h-4 text-gray-600' />;
    }
  };

  // 概览统计卡片
  const OverviewStatsCard = ({
    title,
    value,
    change,
    changePercent,
    icon,
    color,
  }: {
    title: string;
    value: string | number;
    change?: number;
    changePercent?: number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card>
      <CardContent className='p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium text-muted-foreground'>{title}</p>
            <p className='text-2xl font-bold mt-1'>{value}</p>
            {change !== undefined && (
              <div className='flex items-center mt-2'>
                {changePercent !== undefined && changePercent > 0 ? (
                  <TrendingUp className='w-4 h-4 text-green-600 mr-1' />
                ) : changePercent !== undefined && changePercent < 0 ? (
                  <TrendingDown className='w-4 h-4 text-red-600 mr-1' />
                ) : (
                  <Minus className='w-4 h-4 text-gray-600 mr-1' />
                )}
                <span
                  className={`text-sm ${
                    changePercent !== undefined && changePercent > 0
                      ? 'text-green-600'
                      : changePercent !== undefined && changePercent < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                  }`}
                >
                  {changePercent !== undefined
                    ? formatPercent(changePercent)
                    : '0%'}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className='flex items-center justify-between'>
          <h1 className='text-3xl font-bold'>数据分析</h1>
          <div className='flex items-center space-x-2'>
            <div className='w-32 h-10 bg-gray-200 rounded animate-pulse' />
            <div className='w-24 h-10 bg-gray-200 rounded animate-pulse' />
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='h-32 bg-gray-200 rounded animate-pulse' />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className='flex items-center justify-between'>
          <h1 className='text-3xl font-bold'>数据分析</h1>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            刷新
          </Button>
        </div>
        <Card>
          <CardContent className='pt-12 pb-12 text-center'>
            <BarChart3 className='w-16 h-16 mx-auto text-gray-300 mb-4' />
            <h3 className='text-lg font-semibold mb-2'>加载数据失败</h3>
            <p className='text-gray-500 mb-4'>{error}</p>
            <Button onClick={handleRefresh}>重试</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部 */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>数据分析</h1>
          <p className='text-muted-foreground mt-1'>
            深入了解您的笔记使用情况和创作习惯
          </p>
        </div>
        <div className='flex items-center space-x-2'>
          <Select
            value={timeRange}
            onValueChange={(value: any) => setTimeRange(value)}
          >
            <SelectTrigger className='w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='7d'>最近7天</SelectItem>
              <SelectItem value='30d'>最近30天</SelectItem>
              <SelectItem value='90d'>最近90天</SelectItem>
              <SelectItem value='1y'>最近1年</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant='outline'
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            刷新
          </Button>
          <Button variant='outline'>
            <Download className='w-4 h-4 mr-2' />
            导出
          </Button>
        </div>
      </div>

      {/* 概览统计 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <OverviewStatsCard
          title='总笔记数'
          value={data.overview.totalNotes}
          changePercent={data.overview.growthRate}
          icon={<FileText className='w-6 h-6 text-white' />}
          color='bg-blue-500'
        />
        <OverviewStatsCard
          title='总浏览量'
          value={formatNumber(data.overview.totalViews)}
          changePercent={0.148}
          icon={<Eye className='w-6 h-6 text-white' />}
          color='bg-green-500'
        />
        <OverviewStatsCard
          title='AI处理率'
          value={formatPercent(data.overview.aiProcessingRate)}
          changePercent={0.118}
          icon={<Brain className='w-6 h-6 text-white' />}
          color='bg-purple-500'
        />
        <OverviewStatsCard
          title='平均字数'
          value={data.overview.averageWords}
          changePercent={0.067}
          icon={<FileText className='w-6 h-6 text-white' />}
          color='bg-orange-500'
        />
      </div>

      <Tabs defaultValue='overview' className='space-y-6'>
        <TabsList>
          <TabsTrigger value='overview'>总览</TabsTrigger>
          <TabsTrigger value='content'>内容分析</TabsTrigger>
          <TabsTrigger value='activity'>用户活动</TabsTrigger>
          <TabsTrigger value='insights'>AI洞察</TabsTrigger>
        </TabsList>

        {/* 总览标签页 */}
        <TabsContent value='overview' className='space-y-6'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 时间趋势图 */}
            <BaseChart
              title='笔记创建趋势'
              description='显示笔记数量随时间的变化'
              actions={
                <Button variant='outline' size='sm'>
                  <Activity className='w-4 h-4 mr-2' />
                  详细
                </Button>
              }
            >
              <SimpleLineChart
                data={data.timeSeries.map(item => ({
                  label: new Date(item.date).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                  }),
                  value: item.notes,
                }))}
                height={200}
              />
            </BaseChart>

            {/* 分类分布 */}
            <BaseChart title='分类分布' description='各类别笔记的数量分布'>
              <SimplePieChart
                data={data.categoryDistribution.map(cat => ({
                  label: cat.name,
                  value: cat.count,
                  color: cat.color,
                }))}
                size={200}
              />
            </BaseChart>

            {/* 热门标签 */}
            <BaseChart title='热门标签' description='使用频率最高的标签'>
              <SimpleBarChart
                data={data.tagAnalysis.slice(0, 8).map(tag => ({
                  label: tag.name,
                  value: tag.count,
                }))}
                orientation='horizontal'
              />
            </BaseChart>

            {/* 用户活动热力图 */}
            <BaseChart
              title='活跃时间分析'
              description='一天中不同时间的活动分布'
            >
              <div className='grid grid-cols-12 gap-1'>
                {data.userActivity.hourlyActivity.map((activity, hour) => (
                  <div
                    key={hour}
                    className='h-8 rounded flex items-center justify-center text-xs'
                    style={{
                      backgroundColor: `rgba(59, 130, 246, ${activity / Math.max(...data.userActivity.hourlyActivity)})`,
                      color:
                        activity >
                        Math.max(...data.userActivity.hourlyActivity) / 2
                          ? 'white'
                          : 'transparent',
                    }}
                  >
                    {activity >
                    Math.max(...data.userActivity.hourlyActivity) / 2
                      ? hour
                      : ''}
                  </div>
                ))}
              </div>
              <div className='flex justify-between text-xs text-muted-foreground mt-2'>
                <span>0:00</span>
                <span>6:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </BaseChart>
          </div>
        </TabsContent>

        {/* 内容分析标签页 */}
        <TabsContent value='content' className='space-y-6'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 分类详细分析 */}
            <BaseChart title='分类详细分析'>
              <div className='space-y-4'>
                {data.categoryDistribution.map(category => (
                  <div
                    key={category.id}
                    className='flex items-center justify-between p-3 border rounded-lg'
                  >
                    <div className='flex items-center space-x-3'>
                      <div
                        className='w-4 h-4 rounded'
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <p className='font-medium'>{category.name}</p>
                        <p className='text-sm text-muted-foreground'>
                          {category.count} 篇笔记 •{' '}
                          {formatNumber(category.totalWords)} 字
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='font-semibold'>
                        {category.percentage.toFixed(1)}%
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        AI处理 {formatPercent(category.aiProcessingRate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </BaseChart>

            {/* 标签趋势分析 */}
            <BaseChart title='标签趋势分析'>
              <div className='space-y-3'>
                {data.tagAnalysis.slice(0, 10).map(tag => (
                  <div
                    key={tag.name}
                    className='flex items-center justify-between'
                  >
                    <div className='flex items-center space-x-2'>
                      <Tag className='w-4 h-4 text-muted-foreground' />
                      <span className='font-medium'>{tag.name}</span>
                      {getTrendIcon(tag.trend)}
                    </div>
                    <div className='flex items-center space-x-4 text-sm text-muted-foreground'>
                      <span>{tag.count} 次</span>
                      <span>{formatNumber(tag.views)} 浏览</span>
                    </div>
                  </div>
                ))}
              </div>
            </BaseChart>

            {/* 内容质量指标 */}
            <BaseChart title='内容质量指标'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center p-4 border rounded-lg'>
                  <p className='text-2xl font-bold text-blue-600'>
                    {data.overview.averageWords}
                  </p>
                  <p className='text-sm text-muted-foreground'>平均字数</p>
                </div>
                <div className='text-center p-4 border rounded-lg'>
                  <p className='text-2xl font-bold text-green-600'>
                    {formatPercent(data.overview.aiProcessingRate)}
                  </p>
                  <p className='text-sm text-muted-foreground'>AI处理率</p>
                </div>
                <div className='text-center p-4 border rounded-lg'>
                  <p className='text-2xl font-bold text-purple-600'>
                    {data.overview.averageViews}
                  </p>
                  <p className='text-sm text-muted-foreground'>平均浏览</p>
                </div>
                <div className='text-center p-4 border rounded-lg'>
                  <p className='text-2xl font-bold text-orange-600'>
                    {data.overview.notesCreatedThisWeek}
                  </p>
                  <p className='text-sm text-muted-foreground'>本周新增</p>
                </div>
              </div>
            </BaseChart>

            {/* 趋势指标 */}
            <BaseChart title='关键趋势'>
              <div className='space-y-4'>
                {data.trends.map(trend => (
                  <div
                    key={trend.metric}
                    className='flex items-center justify-between p-3 border rounded-lg'
                  >
                    <div>
                      <p className='font-medium'>{trend.metric}</p>
                      <p className='text-sm text-muted-foreground'>
                        当前: {trend.current} • 上期: {trend.previous}
                      </p>
                    </div>
                    <div className='flex items-center space-x-2'>
                      {getTrendIcon(trend.trend)}
                      <span
                        className={`font-semibold ${
                          trend.trend === 'up'
                            ? 'text-green-600'
                            : trend.trend === 'down'
                              ? 'text-red-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {trend.changePercent > 0 ? '+' : ''}
                        {trend.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </BaseChart>
          </div>
        </TabsContent>

        {/* 用户活动标签页 */}
        <TabsContent value='activity' className='space-y-6'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 每日活动统计 */}
            <BaseChart title='每日活动统计'>
              <SimpleLineChart
                data={data.userActivity.dailyActivity.slice(-14).map(day => ({
                  label: new Date(day.date).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                  }),
                  value: day.notesCreated + day.notesEdited,
                }))}
                height={200}
              />
            </BaseChart>

            {/* 活动类型分布 */}
            <BaseChart title='活动类型分布'>
              <SimplePieChart
                data={data.userActivity.topActivities.map(activity => ({
                  label: activity.type,
                  value: activity.count,
                  color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][
                    data.userActivity.topActivities.indexOf(activity)
                  ],
                }))}
                size={200}
              />
            </BaseChart>

            {/* 会话统计 */}
            <BaseChart title='会话统计'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center p-4 border rounded-lg'>
                  <p className='text-2xl font-bold text-blue-600'>
                    {data.userActivity.sessionStats.averageSessionDuration}分钟
                  </p>
                  <p className='text-sm text-muted-foreground'>平均会话时长</p>
                </div>
                <div className='text-center p-4 border rounded-lg'>
                  <p className='text-2xl font-bold text-green-600'>
                    {data.userActivity.sessionStats.totalSessions}
                  </p>
                  <p className='text-sm text-muted-foreground'>总会话数</p>
                </div>
                <div className='text-center p-4 border rounded-lg'>
                  <p className='text-2xl font-bold text-purple-600'>
                    {formatPercent(
                      data.userActivity.sessionStats.returningUserRate,
                    )}
                  </p>
                  <p className='text-sm text-muted-foreground'>回访率</p>
                </div>
                <div className='text-center p-4 border rounded-lg'>
                  <p className='text-2xl font-bold text-orange-600'>
                    {formatPercent(data.userActivity.sessionStats.bounceRate)}
                  </p>
                  <p className='text-sm text-muted-foreground'>跳出率</p>
                </div>
              </div>
            </BaseChart>

            {/* 时间分布 */}
            <BaseChart title='时间分布模式'>
              <div className='space-y-4'>
                <div>
                  <p className='text-sm font-medium mb-2'>最活跃时间段</p>
                  <div className='flex flex-wrap gap-2'>
                    {data.userActivity.hourlyActivity
                      .map((activity, hour) => ({ hour, activity }))
                      .sort((a, b) => b.activity - a.activity)
                      .slice(0, 5)
                      .map(({ hour }) => (
                        <Badge key={hour} variant='secondary'>
                          {hour}:00
                        </Badge>
                      ))}
                  </div>
                </div>
                <div>
                  <p className='text-sm font-medium mb-2'>活动规律</p>
                  <p className='text-sm text-muted-foreground'>
                    您在 {data.overview.mostActiveDay} 的{' '}
                    {data.overview.mostActiveHour}:00 最为活跃
                  </p>
                </div>
              </div>
            </BaseChart>
          </div>
        </TabsContent>

        {/* AI洞察标签页 */}
        <TabsContent value='insights' className='space-y-6'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 情感分析 */}
            <BaseChart title='情感分析'>
              <div className='space-y-4'>
                <div className='grid grid-cols-3 gap-4 text-center'>
                  <div>
                    <p className='text-2xl font-bold text-green-600'>
                      {formatPercent(
                        data.aiInsights.sentimentAnalysis.positive,
                      )}
                    </p>
                    <p className='text-sm text-muted-foreground'>积极</p>
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-gray-600'>
                      {formatPercent(data.aiInsights.sentimentAnalysis.neutral)}
                    </p>
                    <p className='text-sm text-muted-foreground'>中性</p>
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-red-600'>
                      {formatPercent(
                        data.aiInsights.sentimentAnalysis.negative,
                      )}
                    </p>
                    <p className='text-sm text-muted-foreground'>消极</p>
                  </div>
                </div>
                <SimpleLineChart
                  data={data.aiInsights.sentimentAnalysis.trend.map(item => ({
                    label: new Date(item.date).toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                    }),
                    value: item.positive * 100,
                  }))}
                  height={150}
                />
              </div>
            </BaseChart>

            {/* 内容模式 */}
            <BaseChart title='内容模式识别'>
              <div className='space-y-4'>
                {data.aiInsights.contentPatterns.map((pattern, index) => (
                  <div key={index} className='p-3 border rounded-lg'>
                    <div className='flex items-center justify-between mb-2'>
                      <p className='font-medium'>{pattern.pattern}</p>
                      <Badge variant='secondary'>{pattern.count} 次</Badge>
                    </div>
                    <p className='text-sm text-muted-foreground mb-2'>
                      {pattern.description}
                    </p>
                    <p className='text-sm text-blue-600'>
                      💡 {pattern.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </BaseChart>

            {/* 写作习惯 */}
            <BaseChart title='写作习惯分析'>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='text-center p-3 border rounded'>
                    <p className='text-lg font-bold'>
                      {data.aiInsights.writingHabits.averageWordsPerNote}
                    </p>
                    <p className='text-xs text-muted-foreground'>平均字数/篇</p>
                  </div>
                  <div className='text-center p-3 border rounded'>
                    <p className='text-lg font-bold'>
                      {data.aiInsights.writingHabits.averageWritingTime}分钟
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      平均写作时间
                    </p>
                  </div>
                </div>
                <div>
                  <p className='text-sm font-medium mb-2'>高效时间段</p>
                  <div className='flex flex-wrap gap-1'>
                    {data.aiInsights.writingHabits.mostProductiveHours.map(
                      hour => (
                        <Badge key={hour} variant='outline'>
                          {hour}:00
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </BaseChart>

            {/* 主题聚类 */}
            <BaseChart title='主题聚类分析'>
              <div className='space-y-4'>
                {data.aiInsights.topicClusters.map((cluster, index) => (
                  <div key={index} className='p-3 border rounded-lg'>
                    <div className='flex items-center justify-between mb-2'>
                      <p className='font-medium'>{cluster.cluster}</p>
                      <div className='flex items-center space-x-2'>
                        <span className='text-sm text-muted-foreground'>
                          {cluster.notes} 篇
                        </span>
                        <div className='w-16 h-2 bg-gray-200 rounded'>
                          <div
                            className='h-2 bg-blue-500 rounded'
                            style={{ width: `${cluster.strength * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-1'>
                      {cluster.relatedTopics.map(topic => (
                        <Badge
                          key={topic}
                          variant='secondary'
                          className='text-xs'
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </BaseChart>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
