/**
 * Analytics Page
 *
 * Displays AI analysis insights, relationship graphs, and usage statistics.
 *
 * Reference: specs/003-ui-ux/tasks.md - T058
 */

import { Suspense } from 'react';
import {
  Brain,
  TrendingUp,
  Calendar,
  Tag,
  FileText,
  Network,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI分析洞察 - MindNote',
  description: '深入了解您的笔记模式和知识关联，获取AI分析报告',
};

export default function AnalyticsPage() {
  return (
    <div className='container mx-auto px-4 py-8 max-w-7xl'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>AI 分析洞察</h1>
            <p className='text-muted-foreground mt-2'>
              深入了解您的笔记模式和知识关联
            </p>
          </div>
          <button className='btn btn-primary'>
            <Brain className='h-4 w-4 mr-2' />
            生成新报告
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        <div className='card'>
          <div className='card-content'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  总笔记数
                </p>
                <p className='text-2xl font-bold'>0</p>
              </div>
              <FileText className='h-8 w-8 text-muted-foreground' />
            </div>
          </div>
        </div>
        <div className='card'>
          <div className='card-content'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  标签数量
                </p>
                <p className='text-2xl font-bold'>0</p>
              </div>
              <Tag className='h-8 w-8 text-muted-foreground' />
            </div>
          </div>
        </div>
        <div className='card'>
          <div className='card-content'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  本周活跃
                </p>
                <p className='text-2xl font-bold'>0</p>
              </div>
              <Calendar className='h-8 w-8 text-muted-foreground' />
            </div>
          </div>
        </div>
        <div className='card'>
          <div className='card-content'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>
                  关联强度
                </p>
                <p className='text-2xl font-bold'>0%</p>
              </div>
              <Network className='h-8 w-8 text-muted-foreground' />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Relationship Graph */}
        <div className='lg:col-span-2'>
          <div className='card h-[500px]'>
            <div className='card-header'>
              <div className='card-title'>知识关系图谱</div>
              <p className='card-description'>可视化展示笔记之间的关联关系</p>
            </div>
            <div className='card-content'>
              <Suspense
                fallback={
                  <div className='text-center py-12'>生成图谱中...</div>
                }
              >
                <div className='h-[400px] flex items-center justify-center text-muted-foreground'>
                  <div className='text-center'>
                    <Network className='h-12 w-12 mx-auto mb-4 opacity-50' />
                    <p className='text-lg mb-2'>知识图谱</p>
                    <p className='text-sm'>
                      开始创建笔记后，这里将显示您的知识关联图谱
                    </p>
                  </div>
                </div>
              </Suspense>
            </div>
          </div>
        </div>

        {/* Insights Panel */}
        <div className='space-y-6'>
          {/* AI Insights */}
          <div className='card'>
            <div className='card-header'>
              <div className='card-title flex items-center'>
                <Brain className='h-5 w-5 mr-2' />
                AI 洞察
              </div>
            </div>
            <div className='card-content'>
              <div className='space-y-4'>
                <div className='p-3 bg-muted/50 rounded-md'>
                  <p className='text-sm font-medium mb-1'>内容分析</p>
                  <p className='text-xs text-muted-foreground'>
                    您的笔记主要集中在技术和创意领域
                  </p>
                </div>
                <div className='p-3 bg-muted/50 rounded-md'>
                  <p className='text-sm font-medium mb-1'>写作模式</p>
                  <p className='text-xs text-muted-foreground'>
                    最佳创作时间是下午2-4点
                  </p>
                </div>
                <div className='p-3 bg-muted/50 rounded-md'>
                  <p className='text-sm font-medium mb-1'>建议</p>
                  <p className='text-xs text-muted-foreground'>
                    考虑将相关笔记进行归类整理
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className='card'>
            <div className='card-header'>
              <div className='card-title'>快速操作</div>
            </div>
            <div className='card-content'>
              <div className='space-y-2'>
                <button className='btn btn-outline w-full justify-start'>
                  <TrendingUp className='h-4 w-4 mr-2' />
                  生成周报
                </button>
                <button className='btn btn-outline w-full justify-start'>
                  <Tag className='h-4 w-4 mr-2' />
                  优化标签
                </button>
                <button className='btn btn-outline w-full justify-start'>
                  <FileText className='h-4 w-4 mr-2' />
                  导出数据
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className='mt-8'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <div className='card'>
            <div className='card-header'>
              <div className='card-title'>创作趋势</div>
              <p className='card-description'>过去30天的笔记创作活动</p>
            </div>
            <div className='card-content'>
              <div className='h-[300px] flex items-center justify-center text-muted-foreground'>
                <p className='text-sm'>图表将在数据可用时显示</p>
              </div>
            </div>
          </div>

          <div className='card'>
            <div className='card-header'>
              <div className='card-title'>分类分布</div>
              <p className='card-description'>不同类别笔记的分布情况</p>
            </div>
            <div className='card-content'>
              <div className='h-[300px] flex items-center justify-center text-muted-foreground'>
                <p className='text-sm'>图表将在数据可用时显示</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
