/**
 * Notes List Page
 *
 * Displays all notes in a grid or list view with search and filtering capabilities.
 * This is the main notes management interface.
 *
 * Reference: specs/003-ui-ux/tasks.md - T029
 */

import { Suspense } from 'react';
import { Plus, Search, Grid, List, Filter } from 'lucide-react';
import type { Metadata } from 'next';

// These components will be created in the next phase
// import { NoteList } from '@/components/features/note/note-list'
// import { SearchBar } from '@/components/features/search/search-bar'
// import { ThemeSwitcher } from '@/components/features/theme/theme-switcher'
// import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'

export const metadata: Metadata = {
  title: '我的笔记 - MindNote',
  description: '管理和浏览您的所有智能笔记',
};

export default function NotesPage() {
  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>我的笔记</h1>
            <p className='text-muted-foreground mt-2'>
              管理和浏览您的所有智能笔记
            </p>
          </div>
          <div className='flex items-center space-x-4'>
            {/* <ThemeSwitcher showLabel /> */}
            <button className='btn btn-primary'>
              <Plus className='h-4 w-4 mr-2' />
              新建笔记
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className='mb-6'>
        <div className='flex items-center space-x-4'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <input
              type='text'
              placeholder='搜索笔记...'
              className='input input-with-icon w-full'
            />
          </div>
          <button className='btn btn-outline'>
            <Filter className='h-4 w-4 mr-2' />
            筛选
          </button>
          <div className='flex items-center border rounded-md'>
            <button className='p-2 hover:bg-accent'>
              <Grid className='h-4 w-4' />
            </button>
            <button className='p-2 hover:bg-accent'>
              <List className='h-4 w-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Notes Grid/List */}
      <div className='min-h-[400px]'>
        <Suspense
          fallback={<div className='text-center py-12'>加载笔记中...</div>}
        >
          {/* <NoteList /> */}
          <div className='text-center py-12'>
            <div className='text-muted-foreground'>
              <p className='text-lg mb-4'>还没有笔记</p>
              <p className='text-sm mb-6'>
                创建您的第一篇笔记开始使用智能笔记功能
              </p>
              <button className='btn btn-primary'>
                <Plus className='h-4 w-4 mr-2' />
                创建笔记
              </button>
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
