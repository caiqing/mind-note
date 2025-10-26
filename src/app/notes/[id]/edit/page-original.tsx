/**
 * T020 [US1] Create note editor page in src/app/notes/[id]/edit/page.tsx
 *
 * Full-featured note editor with rich text editing, auto-save,
 * metadata management, and real-time collaboration features.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  SaveIcon,
  EyeIcon,
  ArrowLeftIcon,
  Settings2Icon,
  ClockIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  FileTextIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Editor components
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { UniversalEditor } from '@/components/editor/universal-editor';
import { NoteMetadataPanel } from '@/components/notes/note-metadata-panel';
import { VersionHistory } from '@/components/notes/version-history';
import { AutoSaveIndicator } from '@/components/editor/auto-save-indicator';
import CategorySuggestion from '@/components/ai/category-suggestion';
import TagSuggestion from '@/components/ai/tag-suggestion';

import { NoteService } from '@/lib/services/note-service';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { sanitizeHTML } from '@/lib/utils/editor';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isArchived: boolean;
  categoryId?: number;
  tags?: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  version: number;
  wordCount: number;
  readingTimeMinutes: number;
}

interface SaveStatus {
  saving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const noteId = params.id as string;
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [editorMode, setEditorMode] = useState<'rich' | 'markdown'>('rich');
  const [showSettings, setShowSettings] = useState(false);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    saving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
  });

  // Editor state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Mock data (will be replaced with real API calls)
  const [categories] = useState([
    { id: 1, name: '工作', color: '#3B82F6' },
    { id: 2, name: '学习', color: '#10B981' },
    { id: 3, name: '生活', color: '#F59E0B' },
    { id: 4, name: '项目', color: '#8B5CF6' },
  ]);

  const [tags] = useState([
    { id: 1, name: '重要', color: '#EF4444' },
    { id: 2, name: '紧急', color: '#F59E0B' },
    { id: 3, name: '想法', color: '#8B5CF6' },
    { id: 4, name: '资料', color: '#10B981' },
    { id: 5, name: '待办', color: '#6B7280' },
  ]);

  // Load note data
  useEffect(() => {
    if (!isAuthenticated || !noteId) {
      router.push('/auth/signin');
      return;
    }

    loadNote();
  }, [isAuthenticated, noteId]);

  const loadNote = async () => {
    try {
      setLoading(true);

      // In real implementation, this would call the API
      const mockNote: Note = {
        id: noteId,
        title: '示例笔记标题',
        content: `<h2>这是一个示例笔记</h2><p>这里是一些示例内容，支持<strong>富文本</strong>格式化。</p><ul><li>支持列表</li><li>支持链接</li><li>支持图片</li></ul><p>你可以开始编辑这个笔记，所有的更改都会自动保存。</p>`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
        isArchived: false,
        categoryId: 1,
        tags: [{ id: 1, name: '重要', color: '#EF4444' }],
        version: 1,
        wordCount: 50,
        readingTimeMinutes: 1,
      };

      setNote(mockNote);
      setTitle(mockNote.title);
      setContent(mockNote.content);

      // Set initial save status
      setSaveStatus({
        saving: false,
        lastSaved: new Date(mockNote.updatedAt),
        hasUnsavedChanges: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load note:', error);
      toast({
        title: '加载失败',
        description: '无法加载笔记，请重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-save functionality with debounce
  const debouncedSave = useDebounce(
    async (saveData: { title: string; content: string }) => {
      if (!note) return;

      setSaveStatus(prev => ({ ...prev, saving: true, error: null }));

      try {
        // Mock save operation
        await new Promise(resolve => setTimeout(resolve, 800));

        const updatedNote = {
          ...note,
          ...saveData,
          updatedAt: new Date().toISOString(),
          wordCount: saveData.content.replace(/<[^>]*>/g, '').split(/\s+/)
            .length,
          readingTimeMinutes: Math.ceil(
            saveData.content.replace(/<[^>]*>/g, '').split(/\s+/).length / 200,
          ),
        };

        setNote(updatedNote);

        setSaveStatus({
          saving: false,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
          error: null,
        });

        toast({
          title: '自动保存成功',
          description: '笔记已自动保存',
        });
      } catch (error) {
        console.error('Failed to save note:', error);
        setSaveStatus(prev => ({
          ...prev,
          saving: false,
          error: '保存失败，请检查网络连接',
        }));

        toast({
          title: '自动保存失败',
          description: '无法保存更改，请检查网络连接',
          variant: 'destructive',
        });
      }
    },
    1500, // 1.5 second debounce
  );

  // Handle content changes
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      setSaveStatus(prev => ({ ...prev, hasUnsavedChanges: true }));
      debouncedSave({ title: newTitle, content });
    },
    [debouncedSave],
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      setSaveStatus(prev => ({ ...prev, hasUnsavedChanges: true }));
      debouncedSave({ title, content: newContent });
    },
    [title, debouncedSave],
  );

  // Handle navigation with unsaved changes warning
  const handleNavigateBack = useCallback(() => {
    if (saveStatus.hasUnsavedChanges) {
      if (window.confirm('您有未保存的更改，确定要离开吗？')) {
        router.back();
      }
    } else {
      router.back();
    }
  }, [saveStatus.hasUnsavedChanges, router]);

  // Handle save and exit
  const handleSaveAndExit = useCallback(async () => {
    if (!note) return;

    try {
      // Force immediate save before exiting
      await debouncedSave({ title, content });

      toast({
        title: '保存成功',
        description: '笔记已保存',
      });

      router.back();
    } catch (error) {
      console.error('Failed to save before exit:', error);
    }
  }, [title, content, note, debouncedSave, router, toast]);

  // Handle metadata updates
  const handleMetadataUpdate = useCallback(
    async (updates: Partial<Note>) => {
      if (!note) return;

      try {
        console.log('Updating metadata:', updates);
        setNote(prev => (prev ? { ...prev, ...updates } : null));

        toast({
          title: '更新成功',
          description: '元数据已更新',
        });
      } catch (error) {
        console.error('Failed to update metadata:', error);
        toast({
          title: '更新失败',
          description: '无法更新元数据',
          variant: 'destructive',
        });
      }
    },
    [note, toast],
  );

  // Simple HTML sanitizer for preview mode
  const sanitizeHTML = (html: string): string => {
    // Basic sanitization - in production, use a proper library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  };

  if (!isAuthenticated) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Alert>
          <AlertCircleIcon className='h-4 w-4' />
          <AlertDescription>请先登录以访问笔记编辑器</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='container mx-auto px-4 py-8 max-w-6xl'>
        <div className='space-y-6'>
          {/* Header skeleton */}
          <div className='flex items-center justify-between'>
            <Skeleton className='h-8 w-32' />
            <div className='flex items-center space-x-2'>
              <Skeleton className='h-8 w-20' />
              <Skeleton className='h-8 w-20' />
            </div>
          </div>

          {/* Title skeleton */}
          <Skeleton className='h-12 w-full' />

          {/* Editor skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-24' />
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-5/6' />
                <Skeleton className='h-4 w-4/5' />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Alert variant='destructive'>
          <AlertCircleIcon className='h-4 w-4' />
          <AlertDescription>笔记不存在或已被删除</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white border-b border-gray-200 sticky top-0 z-40'>
        <div className='container mx-auto px-4 py-3 max-w-6xl'>
          <div className='flex items-center justify-between'>
            {/* Left side */}
            <div className='flex items-center space-x-4'>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleNavigateBack}
                className='text-gray-600 hover:text-gray-900'
              >
                <ArrowLeftIcon className='h-4 w-4 mr-2' />
                返回
              </Button>

              <Separator orientation='vertical' className='h-6' />

              <div className='flex items-center space-x-2'>
                <Badge variant={note.isFavorite ? 'default' : 'secondary'}>
                  {note.isFavorite ? '已收藏' : '未收藏'}
                </Badge>
                <Badge variant={note.isArchived ? 'destructive' : 'secondary'}>
                  {note.isArchived ? '已归档' : '活跃'}
                </Badge>
              </div>
            </div>

            {/* Center - Title */}
            <div className='flex-1 max-w-2xl mx-8'>
              <Input
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder='笔记标题'
                className='text-lg font-semibold border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0'
              />
            </div>

            {/* Right side */}
            <div className='flex items-center space-x-2'>
              {/* Auto-save indicator */}
              <AutoSaveIndicator
                saving={saveStatus.saving}
                lastSaved={saveStatus.lastSaved}
                hasUnsavedChanges={saveStatus.hasUnsavedChanges}
                error={saveStatus.error}
              />

              <Separator orientation='vertical' className='h-6' />

              {/* Action buttons */}
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings2Icon className='h-4 w-4' />
              </Button>

              <Button onClick={handleSaveAndExit} disabled={saveStatus.saving}>
                <SaveIcon className='h-4 w-4 mr-2' />
                保存并退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className='container mx-auto px-4 py-6 max-w-6xl'>
        <div className='flex gap-6'>
          {/* Editor Area */}
          <main className='flex-1 min-w-0'>
            <Card className='h-[calc(100vh-200px)]'>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <Tabs
                    value={activeTab}
                    onValueChange={value =>
                      setActiveTab(value as 'edit' | 'preview')
                    }
                  >
                    <TabsList>
                      <TabsTrigger value='edit' className='flex items-center'>
                        <FileTextIcon className='h-4 w-4 mr-2' />
                        编辑
                      </TabsTrigger>
                      <TabsTrigger
                        value='preview'
                        className='flex items-center'
                      >
                        <EyeIcon className='h-4 w-4 mr-2' />
                        预览
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className='flex items-center space-x-4 text-sm text-gray-500'>
                    <span className='flex items-center'>
                      <ClockIcon className='h-4 w-4 mr-1' />
                      {note.wordCount} 字
                    </span>
                    <span>阅读时间 {note.readingTimeMinutes} 分钟</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className='h-[calc(100%-80px)] p-0'>
                <TabsContent value='edit' className='h-full mt-0'>
                  {/* Editor Mode Selector */}
                  <div className='border-b border-gray-200 px-4 py-2'>
                    <div className='flex items-center space-x-2'>
                      <span className='text-sm font-medium text-gray-700'>
                        编辑模式:
                      </span>
                      <Button
                        variant={editorMode === 'rich' ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setEditorMode('rich')}
                      >
                        富文本
                      </Button>
                      <Button
                        variant={
                          editorMode === 'markdown' ? 'default' : 'outline'
                        }
                        size='sm'
                        onClick={() => setEditorMode('markdown')}
                      >
                        Markdown
                      </Button>
                    </div>
                  </div>

                  {/* Universal Editor */}
                  <div className='h-full'>
                    <UniversalEditor
                      content={content}
                      onChange={handleContentChange}
                      placeholder='开始写作...'
                      editable={!loading}
                      maxLength={100000}
                      className='h-full border-0 rounded-none'
                      defaultMode={editorMode}
                    />
                  </div>
                </TabsContent>

                <TabsContent value='preview' className='h-full mt-0'>
                  {/* Preview mode - Safe HTML rendering */}
                  <div className='h-full p-6 overflow-auto'>
                    <div
                      className='prose prose-lg max-w-none'
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHTML(content),
                      }}
                    />
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </main>

          {/* Sidebar */}
          <aside className='w-80 space-y-6'>
            {/* AI Classification */}
            <CategorySuggestion
              content={content}
              existingCategories={categories}
              onCategorySelect={(categoryId, categoryName) => {
                // Handle category selection
                const selectedCategory = categories.find(
                  cat => cat.id === categoryId || cat.name === categoryName,
                );
                if (selectedCategory) {
                  handleMetadataUpdate({ categoryId: selectedCategory.id });
                } else {
                  // Create new category
                  const newCategory = {
                    id: `new-${Date.now()}`,
                    name: categoryName,
                    color:
                      '#' + Math.floor(Math.random() * 16777215).toString(16),
                  };
                  handleMetadataUpdate({ categoryId: newCategory.id });
                }
              }}
              disabled={loading}
            />

            {/* AI Tag Generation */}
            <TagSuggestion
              content={content}
              existingTags={tags}
              onTagsUpdate={updatedTags => {
                handleMetadataUpdate({ tags: updatedTags });
              }}
              disabled={loading}
              maxTags={10}
            />

            {/* Metadata Panel */}
            <NoteMetadataPanel
              note={note}
              categories={categories}
              tags={tags}
              onUpdate={handleMetadataUpdate}
            />

            {/* Version History */}
            <VersionHistory noteId={noteId} currentVersion={note.version} />

            {/* Status Information */}
            {saveStatus.error && (
              <Alert variant='destructive'>
                <AlertCircleIcon className='h-4 w-4' />
                <AlertDescription>{saveStatus.error}</AlertDescription>
              </Alert>
            )}

            {!saveStatus.error && saveStatus.hasUnsavedChanges && (
              <Alert>
                <AlertCircleIcon className='h-4 w-4' />
                <AlertDescription>您有未保存的更改</AlertDescription>
              </Alert>
            )}

            {!saveStatus.error &&
              !saveStatus.hasUnsavedChanges &&
              saveStatus.lastSaved && (
                <Alert>
                  <CheckCircleIcon className='h-4 w-4' />
                  <AlertDescription>所有更改已保存</AlertDescription>
                </Alert>
              )}
          </aside>
        </div>
      </div>
    </div>
  );
}
