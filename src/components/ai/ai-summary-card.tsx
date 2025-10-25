/**
 * T112 AI摘要展示组件
 *
 * 优雅展示AI生成的摘要，支持展开/收起、质量评分显示和编辑功能
 */

'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

import {
  FileText,
  ChevronDown,
  ChevronUp,
  Edit,
  Save,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Settings,
  Star,
  TrendingUp,
  Eye,
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AISummaryCardProps {
  /** 摘要内容 */
  summary: string;
  /** 摘要风格 */
  style?: 'paragraph' | 'bullets' | 'key-points';
  /** 摘要长度 */
  length: number;
  /** 质量评分 (0-1) */
  qualityScore?: number;
  /** 生成时间 */
  generatedAt?: string;
  /** AI提供商 */
  provider?: string;
  /** 原始内容长度 */
  originalLength?: number;
  /** 关键要点 */
  keyPoints?: string[];
  /** 是否可编辑 */
  editable?: boolean;
  /** 编辑模式回调 */
  onEdit?: (newSummary: string) => Promise<void>;
  /** 用户反馈回调 */
  onFeedback?: (type: 'positive' | 'negative' | 'helpful', rating?: number) => void;
  /** 复制摘要回调 */
  onCopy?: (summary: string) => void;
  /** 重新生成回调 */
  onRegenerate?: () => Promise<void>;
  /** 类名 */
  className?: string;
}

interface QualityRating {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
  bgColor: string;
  textColor: string;
  label: string;
}

interface EditingState {
  isEditing: boolean;
  editedContent: string;
  isSaving: boolean;
  hasChanges: boolean;
}

const MAX_PREVIEW_LENGTH = 150;

const getQualityRating = (score?: number): QualityRating => {
  if (!score) {
    return {
      score: 0,
      level: 'poor',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      label: '未评分'
    };
  }

  if (score >= 0.9) {
    return {
      score,
      level: 'excellent',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      label: '优秀'
    };
  }

  if (score >= 0.7) {
    return {
      score,
      level: 'good',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      label: '良好'
    };
  }

  if (score >= 0.5) {
    return {
      score,
      level: 'fair',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      label: '一般'
    };
  }

  return {
    score,
    level: 'poor',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    label: '较差'
  };
};

const getStyleIcon = (style?: string) => {
  switch (style) {
    case 'bullets':
      return <div className="w-2 h-2 bg-blue-500 rounded-full mr-1" />;
    case 'key-points':
      return <Star className="w-3 h-3 text-purple-500 mr-1" />;
    default:
      return <FileText className="w-3 h-3 text-green-500 mr-1" />;
  }
};

const getStyleLabel = (style?: string) => {
  switch (style) {
    case 'bullets':
      return '要点式';
    case 'key-points':
      return '关键点';
    default:
      return '段落式';
  }
};

export function AISummaryCard({
  summary,
  style = 'paragraph',
  length,
  qualityScore,
  generatedAt,
  provider,
  originalLength,
  keyPoints,
  editable = true,
  onEdit,
  onFeedback,
  onCopy,
  onRegenerate,
  className,
}: AISummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [editing, setEditing] = useState<EditingState>({
    isEditing: false,
    editedContent: summary,
    isSaving: false,
    hasChanges: false,
  });
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | 'helpful' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const qualityRating = getQualityRating(qualityScore);
  const shouldTruncate = summary.length > MAX_PREVIEW_LENGTH && !showFullContent;
  const displayContent = shouldTruncate
    ? summary.substring(0, MAX_PREVIEW_LENGTH) + '...'
    : summary;

  // 处理编辑模式
  const handleEdit = useCallback(() => {
    if (!editable) return;

    setEditing({
      isEditing: true,
      editedContent: summary,
      isSaving: false,
      hasChanges: false,
    });
  }, [editable, summary]);

  // 处理保存编辑
  const handleSave = useCallback(async () => {
    if (!onEdit || editing.isSaving) return;

    setEditing(prev => ({ ...prev, isSaving: true }));

    try {
      await onEdit(editing.editedContent);
      setEditing({
        isEditing: false,
        editedContent: editing.editedContent,
        isSaving: false,
        hasChanges: false,
      });
      toast.success('摘要已保存');
    } catch (error) {
      setEditing(prev => ({ ...prev, isSaving: false }));
      toast.error('保存失败，请重试');
    }
  }, [onEdit, editing.editedContent, editing.isSaving]);

  // 处理取消编辑
  const handleCancel = useCallback(() => {
    setEditing({
      isEditing: false,
      editedContent: summary,
      isSaving: false,
      hasChanges: false,
    });
  }, [summary]);

  // 处理内容变化
  const handleContentChange = useCallback((value: string) => {
    setEditing(prev => ({
      ...prev,
      editedContent: value,
      hasChanges: value !== summary,
    }));
  }, [summary]);

  // 处理反馈
  const handleFeedback = useCallback((type: 'positive' | 'negative' | 'helpful', rating?: number) => {
    setFeedbackGiven(type);
    onFeedback?.(type, rating);

    const feedbackMessage = {
      positive: '感谢您的反馈！',
      negative: '感谢您的反馈，我们会持续改进。',
      helpful: '感谢您的反馈！'
    }[type];

    toast.success(feedbackMessage);
  }, [onFeedback]);

  // 处理复制
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(summary);
    onCopy?.(summary);
    toast.success('摘要已复制到剪贴板');
  }, [summary, onCopy]);

  // 处理重新生成
  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate || isGenerating) return;

    setIsGenerating(true);
    try {
      await onRegenerate();
      toast.success('摘要已重新生成');
    } catch (error) {
      toast.error('重新生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [onRegenerate, isGenerating]);

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-lg', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center text-lg font-semibold">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              AI智能摘要
              {provider && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {provider}
                </Badge>
              )}
            </CardTitle>

            {/* 摘要统计信息 */}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                {getStyleIcon(style)}
                <span>{getStyleLabel(style)}</span>
              </div>

              <div className="flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                <span>{length} 字</span>
                {originalLength && (
                  <span className="ml-1">
                    (压缩率: {Math.round((1 - length / originalLength) * 100)}%)
                  </span>
                )}
              </div>

              {generatedAt && (
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{new Date(generatedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* 质量评分 */}
          {qualityScore && (
            <div className="flex flex-col items-end space-y-1">
              <div
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  qualityRating.bgColor,
                  qualityRating.textColor
                )}
              >
                {qualityRating.label}
              </div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'w-3 h-3',
                      star <= qualityScore * 5
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    )}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  ({Math.round(qualityScore * 100)}%)
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {editing.isEditing ? (
          // 编辑模式
          <div className="space-y-4">
            <Textarea
              value={editing.editedContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="min-h-[120px] resize-none"
              placeholder="输入摘要内容..."
            />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {editing.editedContent.length} 字符
              </span>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={editing.isSaving}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!editing.hasChanges || editing.isSaving}
                >
                  {editing.isSaving ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-1" />
                      保存
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // 显示模式
          <div className="space-y-4">
            {/* 摘要内容 */}
            <div className="relative">
              <div className={cn(
                'text-sm leading-relaxed text-gray-700 dark:text-gray-300',
                !showFullContent && shouldTruncate && 'line-clamp-3'
              )}>
                {displayContent}
              </div>

              {shouldTruncate && (
                <Collapsible open={isExpanded}>
                  <CollapsibleContent className="mt-2">
                    <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                      {summary.substring(MAX_PREVIEW_LENGTH)}
                    </div>
                  </CollapsibleContent>

                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => setShowFullContent(!showFullContent)}
                    >
                      {showFullContent ? (
                        <>
                          <ChevronUp className="w-3 h-3 mr-1" />
                          收起
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          展开全文
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>

            {/* 关键要点 */}
            {keyPoints && keyPoints.length > 0 && (
              <div className="border-l-2 border-blue-200 pl-4">
                <h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-300">
                  关键要点
                </h4>
                <ul className="space-y-1">
                  {keyPoints.map((point, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            {/* 操作按钮 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* 用户反馈按钮 */}
                {!feedbackGiven && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        反馈
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleFeedback('positive')}>
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        有帮助
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleFeedback('negative')}>
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        需要改进
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleFeedback('helpful')}>
                        <Eye className="w-4 h-4 mr-2" />
                        信息量大
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {feedbackGiven && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    已反馈
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* 编辑按钮 */}
                {editable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="text-muted-foreground"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                )}

                {/* 复制按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="text-muted-foreground"
                >
                  <Copy className="w-4 h-4" />
                </Button>

                {/* 重新生成按钮 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isGenerating}
                      className="text-muted-foreground"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleRegenerate} disabled={isGenerating}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {isGenerating ? '重新生成中...' : '重新生成'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" />
                      摘要设置
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}