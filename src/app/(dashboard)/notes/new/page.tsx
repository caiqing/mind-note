/**
 * New Note Page
 *
 * Interface for creating a new note with rich text editing capabilities
 * and AI-powered suggestions.
 *
 * Reference: specs/003-ui-ux/tasks.md - T030
 */

import { Suspense } from 'react';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '新建笔记 - MindNote',
  description: '创建新的智能笔记，支持AI辅助编辑',
};

export default function NewNotePage() {
  return (
    <div className='container mx-auto px-4 py-8 max-w-4xl'>
      {/* Header */}
      <div className='mb-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <button className='btn btn-outline btn-icon'>
              <ArrowLeft className='h-4 w-4' />
            </button>
            <div>
              <h1 className='text-2xl font-bold tracking-tight'>新建笔记</h1>
              <p className='text-muted-foreground text-sm mt-1'>
                开始创建您的智能笔记
              </p>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            <button className='btn btn-outline'>
              <EyeOff className='h-4 w-4 mr-2' />
              预览
            </button>
            <button className='btn btn-primary'>
              <Save className='h-4 w-4 mr-2' />
              保存
            </button>
          </div>
        </div>
      </div>

      {/* Note Editor */}
      <div className='min-h-[600px]'>
        <Suspense
          fallback={<div className='text-center py-12'>加载编辑器中...</div>}
        >
          <div className='card'>
            <div className='card-content'>
              {/* Title Input */}
              <div className='mb-6'>
                <input
                  type='text'
                  placeholder='输入笔记标题...'
                  className='input text-2xl font-semibold w-full border-0 px-0 focus-visible:ring-0'
                />
              </div>

              {/* Rich Text Editor */}
              <div className='min-h-[400px] border rounded-md p-4'>
                <div className='text-muted-foreground text-center py-12'>
                  <p className='text-lg mb-4'>智能编辑器</p>
                  <p className='text-sm mb-6'>
                    支持富文本编辑、AI建议、自动保存等功能
                  </p>
                  <div className='text-xs text-muted-foreground'>
                    <p>编辑器功能将在下一步实现</p>
                  </div>
                </div>
              </div>

              {/* AI Suggestions Panel */}
              <div className='mt-6 p-4 bg-muted/50 rounded-md'>
                <h3 className='text-sm font-medium mb-2'>AI 建议</h3>
                <div className='flex flex-wrap gap-2'>
                  <span className='badge badge-outline'>工作</span>
                  <span className='badge badge-outline'>重要</span>
                  <span className='badge badge-outline'>待办</span>
                  <span className='badge badge-outline'>+ 添加标签</span>
                </div>
              </div>
            </div>
          </div>
        </Suspense>
      </div>

      {/* Status Bar */}
      <div className='mt-6 flex items-center justify-between text-sm text-muted-foreground'>
        <div>自动保存已启用</div>
        <div>字数: 0 | 预计阅读时间: 0 分钟</div>
      </div>
    </div>
  );
}
