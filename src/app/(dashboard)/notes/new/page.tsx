/**
 * New Note Page
 *
 * Interface for creating a new note with rich text editing capabilities
 * and AI-powered suggestions.
 *
 * Reference: specs/003-ui-ux/tasks.md - T030
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NoteEditor } from '@/components/note/note-editor-new';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '新建笔记 - MindNote',
  description: '创建新的智能笔记，支持AI辅助编辑',
};

export default function NewNotePage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  // Event handlers
  const handleSaveNote = React.useCallback(
    async (data: {
      title: string;
      content: string;
      tags: string[];
      summary?: string;
    }) => {
      setLoading(true);

      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // eslint-disable-next-line no-console
        console.log('Creating new note:', data);

        // In real app, would save to backend and get the new note ID
        // Then navigate to the note detail page or notes list

        // For now, navigate back to notes list
        router.push('/notes');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to save note:', error);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const handleCancel = React.useCallback(() => {
    // Navigate back to notes list
    router.push('/notes');
  }, [router]);

  return (
    <div className='container mx-auto px-4 py-8 max-w-4xl'>
      {/* Header */}
      <div className='mb-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Button variant='outline' size='sm' onClick={handleCancel}>
              <ArrowLeft className='h-4 w-4 mr-2' />
              返回
            </Button>
            <div>
              <h1 className='text-2xl font-bold tracking-tight'>新建笔记</h1>
              <p className='text-muted-foreground text-sm mt-1'>
                开始创建您的智能笔记
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Note Editor */}
      <div className='min-h-[600px]'>
        <NoteEditor
          initialTitle=''
          initialContent=''
          initialTags={[]}
          onSave={handleSaveNote}
          onCancel={handleCancel}
          autoSave={true}
          enableAI={true}
          loading={loading}
          placeholder='开始输入您的内容...'
        />
      </div>

      {/* Footer Info */}
      <div className='mt-8 pt-6 border-t'>
        <div className='flex items-center justify-between text-sm text-muted-foreground'>
          <div>
            <span className='inline-flex items-center'>
              <div className='w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse' />
              自动保存已启用
            </span>
          </div>
          <div>支持Markdown语法 • AI智能建议 • 实时预览</div>
        </div>
      </div>
    </div>
  );
}
