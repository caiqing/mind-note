/**
 * Search Page
 *
 * Advanced search interface with semantic search, filters, and AI-powered suggestions.
 *
 * Reference: specs/003-ui-ux/tasks.md - T044
 */

import { Suspense } from 'react';
import { Search, Filter, Clock, TrendingUp, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '智能搜索 - MindNote',
  description: '使用AI驱动的语义搜索快速找到您需要的内容',
};

export default function SearchPage() {
  return (
    <div className='container mx-auto px-4 py-8 max-w-6xl'>
      {/* Header */}
      <div className='mb-8'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold tracking-tight mb-4'>智能搜索</h1>
          <p className='text-muted-foreground text-lg'>
            使用AI驱动的语义搜索快速找到您需要的内容
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className='mb-8'>
        <div className='relative max-w-2xl mx-auto'>
          <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground' />
          <input
            type='text'
            placeholder='搜索笔记、标签、内容...'
            className='input input-lg input-with-icon w-full text-center'
            autoFocus
          />
          <div className='absolute right-4 top-1/2 transform -translate-y-1/2'>
            <button className='btn btn-sm btn-outline'>
              <Filter className='h-4 w-4 mr-2' />
              高级搜索
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className='mb-8'>
        <div className='flex items-center justify-center space-x-4'>
          <button className='btn btn-outline'>
            <Clock className='h-4 w-4 mr-2' />
            最近搜索
          </button>
          <button className='btn btn-outline'>
            <TrendingUp className='h-4 w-4 mr-2' />
            热门标签
          </button>
          <button className='btn btn-outline'>
            <Sparkles className='h-4 w-4 mr-2' />
            AI 推荐
          </button>
        </div>
      </div>

      {/* Search Results */}
      <div className='min-h-[400px]'>
        <Suspense fallback={<div className='text-center py-12'>搜索中...</div>}>
          <div className='text-center py-12'>
            <div className='text-muted-foreground'>
              <Search className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <p className='text-lg mb-2'>开始搜索您的笔记</p>
              <p className='text-sm'>
                输入关键词或使用高级搜索功能来查找相关内容
              </p>
            </div>
          </div>
        </Suspense>
      </div>

      {/* Search Tips */}
      <div className='mt-12'>
        <div className='card'>
          <div className='card-content'>
            <h3 className='text-lg font-semibold mb-4'>搜索技巧</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
              <div className='flex items-start space-x-2'>
                <span className='text-primary'>•</span>
                <div>
                  <strong>语义搜索:</strong> 输入自然语言描述
                </div>
              </div>
              <div className='flex items-start space-x-2'>
                <span className='text-primary'>•</span>
                <div>
                  <strong>标签过滤:</strong> 使用 #标签名 搜索
                </div>
              </div>
              <div className='flex items-start space-x-2'>
                <span className='text-primary'>•</span>
                <div>
                  <strong>日期范围:</strong> 使用 after:2024-01-01
                </div>
              </div>
              <div className='flex items-start space-x-2'>
                <span className='text-primary'>•</span>
                <div>
                  <strong>文件类型:</strong> 使用 type:pdf 或 type:doc
                </div>
              </div>
              <div className='flex items-start space-x-2'>
                <span className='text-primary'>•</span>
                <div>
                  <strong>排除词汇:</strong> 使用 -排除词
                </div>
              </div>
              <div className='flex items-start space-x-2'>
                <span className='text-primary'>•</span>
                <div>
                  <strong>精确匹配:</strong> 使用 "精确短语"
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
