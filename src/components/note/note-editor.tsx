/**
 * 笔记编辑器组件
 *
 * 支持富文本编辑、自动保存、标签管理等功能
 */

'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AIAnalysisPanelNew } from '@/components/ai/ai-analysis-panel-new';
import {
  Save,
  Eye,
  EyeOff,
  Tags,
  Hash,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string;
}

interface Note {
  id?: string;
  title: string;
  content: string;
  categoryId?: number;
  tags: string[];
  isPublic: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
  aiProcessed?: boolean;
  aiSummary?: string;
  aiKeywords?: string[];
  aiCategory?: string;
  aiSentiment?: 'positive' | 'negative' | 'neutral';
  aiAnalysisDate?: string;
}

interface NoteEditorProps {
  note?: Note;
  categories: Category[];
  onSave: (note: Partial<Note>) => Promise<void>;
  onAutoSave?: (note: Partial<Note>) => Promise<void>;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  className?: string;
}

export function NoteEditor({
  note,
  categories,
  onSave,
  onAutoSave,
  onCancel,
  mode = 'create',
  className,
}: NoteEditorProps) {
  const [formData, setFormData] = useState<Partial<Note>>({
    title: note?.title || '',
    content: note?.content || '',
    categoryId: note?.categoryId,
    tags: note?.tags || [],
    isPublic: note?.isPublic || false,
    status: note?.status || 'DRAFT',
  });

  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState('write');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 自动保存逻辑
  const triggerAutoSave = useCallback(
    debounce(async (data: Partial<Note>) => {
      if (!onAutoSave || !data.title?.trim() || !data.content?.trim()) {
        return;
      }

      setIsAutoSaving(true);
      try {
        await onAutoSave(data);
        setLastSavedAt(new Date());
      } catch (error) {
        console.error('Auto save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 2000),
    [onAutoSave],
  );

  // 监听数据变化，触发自动保存
  useEffect(() => {
    if (note?.id && onAutoSave) {
      triggerAutoSave(formData);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, note?.id, onAutoSave, triggerAutoSave]);

  // 防抖函数
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // 处理表单数据变化
  const handleInputChange = (field: keyof Note, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 添加标签
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), trimmedTag],
      }));
      setTagInput('');
    }
  };

  // 移除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  // 处理标签输入回车
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 保存笔记
  const handleSave = async () => {
    if (!formData.title?.trim() || !formData.content?.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 计算字数
  const wordCount = formData.content?.length || 0;
  const estimatedReadTime = Math.ceil(wordCount / 200); // 假设每分钟200字

  // 检查是否有更改
  const hasChanges =
    formData.title !== note?.title ||
    formData.content !== note?.content ||
    JSON.stringify(formData.tags) !== JSON.stringify(note?.tags) ||
    formData.categoryId !== note?.categoryId ||
    formData.isPublic !== note?.isPublic ||
    formData.status !== note?.status;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 工具栏 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          {mode === 'edit' && (
            <Badge
              variant={note?.status === 'PUBLISHED' ? 'default' : 'secondary'}
            >
              {note?.status === 'PUBLISHED'
                ? '已发布'
                : note?.status === 'ARCHIVED'
                  ? '已归档'
                  : '草稿'}
            </Badge>
          )}

          {note?.aiProcessed && (
            <Badge
              variant='outline'
              className='text-green-600 border-green-600'
            >
              <Zap className='w-3 h-3 mr-1' />
              AI已处理
            </Badge>
          )}

          {hasChanges && (
            <Badge
              variant='outline'
              className='text-orange-600 border-orange-600'
            >
              <AlertCircle className='w-3 h-3 mr-1' />
              有未保存更改
            </Badge>
          )}
        </div>

        <div className='flex items-center space-x-2'>
          {/* 自动保存状态 */}
          {note?.id && onAutoSave && (
            <div className='flex items-center space-x-1 text-sm text-muted-foreground'>
              {isAutoSaving ? (
                <>
                  <Clock className='w-3 h-3 animate-spin' />
                  <span>自动保存中...</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <CheckCircle className='w-3 h-3 text-green-600' />
                  <span>已于 {lastSavedAt.toLocaleTimeString()} 保存</span>
                </>
              ) : null}
            </div>
          )}

          {/* 预览模式切换 */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? (
              <Eye className='w-4 h-4 mr-2' />
            ) : (
              <EyeOff className='w-4 h-4 mr-2' />
            )}
            {previewMode ? '编辑' : '预览'}
          </Button>

          {/* 操作按钮 */}
          {onCancel && (
            <Button variant='outline' onClick={onCancel}>
              取消
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={
              isSaving || !formData.title?.trim() || !formData.content?.trim()
            }
          >
            <Save className='w-4 h-4 mr-2' />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
        {/* 主要内容区域 */}
        <div className='lg:col-span-3 space-y-4'>
          {/* 标题输入 */}
          <Input
            placeholder='输入笔记标题...'
            value={formData.title}
            onChange={e => handleInputChange('title', e.target.value)}
            className='text-2xl font-semibold h-12'
          />

          {/* 编辑/预览标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value='write'>写作</TabsTrigger>
              <TabsTrigger value='ai'>AI分析</TabsTrigger>
            </TabsList>

            <TabsContent value='write' className='space-y-4'>
              {previewMode ? (
                <Card>
                  <CardContent className='pt-6'>
                    <div className='prose max-w-none'>
                      <h2 className='text-2xl font-bold mb-4'>
                        {formData.title}
                      </h2>
                      <div className='whitespace-pre-wrap'>
                        {formData.content}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Textarea
                  ref={contentRef}
                  placeholder='开始写作...'
                  value={formData.content}
                  onChange={e => handleInputChange('content', e.target.value)}
                  className='min-h-[400px] resize-none'
                />
              )}

              {/* 内容统计 */}
              <div className='flex items-center justify-between text-sm text-muted-foreground'>
                <div className='flex items-center space-x-4'>
                  <span>{wordCount} 字</span>
                  <span>约 {estimatedReadTime} 分钟阅读</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <Hash className='w-4 h-4' />
                  <span>纯文本</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='ai' className='space-y-4'>
              <AIAnalysisPanelNew
                noteId={note?.id}
                noteTitle={formData.title || ''}
                noteContent={formData.content || ''}
                initialData={{
                  aiProcessed: note?.aiProcessed || false,
                  aiSummary: note?.aiSummary,
                  aiKeywords: note?.aiKeywords || [],
                  aiCategory: note?.aiCategory,
                  aiSentiment: note?.aiSentiment,
                  aiAnalysisDate: note?.aiAnalysisDate,
                }}
                onAnalysisComplete={results => {
                  // 将AI分析结果应用到笔记数据
                  if (results.summary) {
                    handleInputChange('aiSummary', results.summary);
                  }
                  if (results.keywords && results.keywords.length > 0) {
                    handleInputChange('aiKeywords', results.keywords);
                  }
                  if (results.category) {
                    handleInputChange('aiCategory', results.category);
                  }
                  if (results.sentiment) {
                    handleInputChange('aiSentiment', results.sentiment);
                  }
                  handleInputChange('aiProcessed', true);
                  handleInputChange('aiAnalysisDate', new Date().toISOString());
                }}
                onNoteUpdate={updatedFields => {
                  // 处理AI驱动的笔记更新
                  Object.entries(updatedFields).forEach(([field, value]) => {
                    handleInputChange(field as keyof Note, value);
                  });
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* 侧边栏设置 */}
        <div className='space-y-4'>
          {/* 分类设置 */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>分类</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.categoryId?.toString()}
                onValueChange={value =>
                  handleInputChange(
                    'categoryId',
                    value ? parseInt(value) : undefined,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择分类' />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      <div className='flex items-center space-x-2'>
                        <div
                          className='w-3 h-3 rounded-full'
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* 标签设置 */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg flex items-center'>
                <Tags className='w-4 h-4 mr-2' />
                标签
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {/* 标签输入 */}
              <div className='flex space-x-2'>
                <Input
                  placeholder='添加标签...'
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                />
                <Button size='sm' onClick={handleAddTag}>
                  添加
                </Button>
              </div>

              {/* 已有标签 */}
              {formData.tags && formData.tags.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {formData.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant='secondary'
                      className='cursor-pointer'
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <span className='ml-1 hover:text-red-500'>×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 发布设置 */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>发布设置</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* 状态选择 */}
              <div>
                <Label htmlFor='status'>状态</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    handleInputChange('status', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='DRAFT'>草稿</SelectItem>
                    <SelectItem value='PUBLISHED'>已发布</SelectItem>
                    <SelectItem value='ARCHIVED'>已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 公开设置 */}
              <div className='flex items-center justify-between'>
                <Label htmlFor='public'>公开笔记</Label>
                <Switch
                  id='public'
                  checked={formData.isPublic}
                  onCheckedChange={checked =>
                    handleInputChange('isPublic', checked)
                  }
                />
              </div>

              <Separator />

              {/* 时间信息 */}
              {note?.createdAt && (
                <div className='text-sm text-muted-foreground space-y-1'>
                  <div>
                    创建时间: {new Date(note.createdAt).toLocaleString()}
                  </div>
                  {note.updatedAt && (
                    <div>
                      更新时间: {new Date(note.updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
