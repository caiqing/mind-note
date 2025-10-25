/**
 * T113 智能标签显示和管理组件
 *
 * 展示AI生成的智能标签，支持色彩区分、编辑、删除、批量操作等功能
 */

'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import {
  Tag as TagIcon,
  Plus,
  X,
  Edit2,
  Trash2,
  Hash,
  Star,
  TrendingUp,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  CheckCircle,
  AlertCircle,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  MoreHorizontal,
  Palette,
  Copy,
  Share2,
  Bookmark,
  BookmarkPlus,
  Layers,
  Zap,
  Target,
  Calendar,
  User,
  Folder,
  Lightbulb,
  Heart,
  MessageSquare,
  Code,
  Briefcase,
  GraduationCap,
  ShoppingBag,
  Plane,
  Music,
  Camera,
  Gamepad2,
  Dumbbell,
  Utensils,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartTag {
  /** 标签ID */
  id: string;
  /** 标签名称 */
  name: string;
  /** 标签类型 */
  type: 'category' | 'topic' | 'emotion' | 'priority' | 'custom';
  /** 标签颜色 */
  color: string;
  /** 标签权重 */
  weight: number;
  /** 使用次数 */
  usageCount: number;
  /** 创建时间 */
  createdAt: string;
  /** 最后使用时间 */
  lastUsedAt?: string;
  /** 标签描述 */
  description?: string;
  /** 是否为系统标签 */
  isSystem?: boolean;
  /** 是否已收藏 */
  isFavorite?: boolean;
  /** 关联的笔记数量 */
  noteCount?: number;
  /** 标签置信度 */
  confidence?: number;
}

interface SmartTagManagerProps {
  /** 标签列表 */
  tags: SmartTag[];
  /** 是否可编辑 */
  editable?: boolean;
  /** 是否显示统计信息 */
  showStats?: boolean;
  /** 是否显示搜索过滤 */
  showFilter?: boolean;
  /** 最大显示标签数量 */
  maxDisplay?: number;
  /** 标签点击回调 */
  onTagClick?: (tag: SmartTag) => void;
  /** 标签创建回调 */
  onTagCreate?: (tagData: Omit<SmartTag, 'id' | 'createdAt' | 'usageCount'>) => Promise<SmartTag>;
  /** 标签更新回调 */
  onTagUpdate?: (id: string, updates: Partial<SmartTag>) => Promise<void>;
  /** 标签删除回调 */
  onTagDelete?: (id: string) => Promise<void>;
  /** 批量操作回调 */
  onBulkAction?: (action: string, tagIds: string[]) => Promise<void>;
  /** 类名 */
  className?: string;
}

interface TagColor {
  name: string;
  value: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

interface TagType {
  value: SmartTag['type'];
  label: string;
  icon: React.ReactNode;
  defaultColor: string;
}

interface EditingState {
  isEditing: boolean;
  tagId: string | null;
  formData: Partial<SmartTag>;
  isSaving: boolean;
}

const TAG_COLORS: TagColor[] = [
  { name: '蓝色', value: '#3B82F6', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-200' },
  { name: '绿色', value: '#10B981', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-200' },
  { name: '紫色', value: '#8B5CF6', bgColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-200' },
  { name: '粉色', value: '#EC4899', bgColor: 'bg-pink-100', textColor: 'text-pink-800', borderColor: 'border-pink-200' },
  { name: '橙色', value: '#F97316', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-200' },
  { name: '红色', value: '#EF4444', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-200' },
  { name: '黄色', value: '#EAB308', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-200' },
  { name: '青色', value: '#06B6D4', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800', borderColor: 'border-cyan-200' },
  { name: '靛蓝', value: '#6366F1', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800', borderColor: 'border-indigo-200' },
  { name: '灰色', value: '#6B7280', bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-200' },
];

const TAG_TYPES: TagType[] = [
  { value: 'category', label: '分类', icon: <Folder className="w-3 h-3" />, defaultColor: '#3B82F6' },
  { value: 'topic', label: '主题', icon: <Hash className="w-3 h-3" />, defaultColor: '#8B5CF6' },
  { value: 'emotion', label: '情感', icon: <Heart className="w-3 h-3" />, defaultColor: '#EC4899' },
  { value: 'priority', label: '优先级', icon: <Star className="w-3 h-3" />, defaultColor: '#F97316' },
  { value: 'custom', label: '自定义', icon: <TagIcon className="w-3 h-3" />, defaultColor: '#10B981' },
];

const getTagTypeIcon = (type: SmartTag['type']) => {
  const tagType = TAG_TYPES.find(t => t.value === type);
  return tagType?.icon || <TagIcon className="w-3 h-3" />;
};

const getTagTypeLabel = (type: SmartTag['type']) => {
  const tagType = TAG_TYPES.find(t => t.value === type);
  return tagType?.label || '标签';
};

const getColorByValue = (value: string): TagColor => {
  return TAG_COLORS.find(color => color.value === value) || TAG_COLORS[0];
};

const getWeightLabel = (weight: number): string => {
  if (weight >= 0.8) return '高权重';
  if (weight >= 0.5) return '中权重';
  return '低权重';
};

const getWeightColor = (weight: number): string => {
  if (weight >= 0.8) return 'text-green-600';
  if (weight >= 0.5) return 'text-yellow-600';
  return 'text-gray-500';
};

export function SmartTagManager({
  tags,
  editable = true,
  showStats = true,
  showFilter = true,
  maxDisplay,
  onTagClick,
  onTagCreate,
  onTagUpdate,
  onTagDelete,
  onBulkAction,
  className,
}: SmartTagManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<SmartTag['type'] | 'all'>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'weight' | 'created'>('usage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editing, setEditing] = useState<EditingState>({
    isEditing: false,
    tagId: null,
    formData: {},
    isSaving: false,
  });

  // 过滤和排序标签
  const filteredAndSortedTags = useMemo(() => {
    let filtered = tags.filter(tag => {
      const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || tag.type === selectedType;
      const matchesColor = selectedColor === 'all' || tag.color === selectedColor;
      return matchesSearch && matchesType && matchesColor;
    });

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'usage':
          comparison = a.usageCount - b.usageCount;
          break;
        case 'weight':
          comparison = a.weight - b.weight;
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    if (maxDisplay && filtered.length > maxDisplay) {
      filtered = filtered.slice(0, maxDisplay);
    }

    return filtered;
  }, [tags, searchTerm, selectedType, selectedColor, sortBy, sortOrder, maxDisplay]);

  // 统计信息
  const stats = useMemo(() => {
    const totalTags = tags.length;
    const systemTags = tags.filter(tag => tag.isSystem).length;
    const customTags = totalTags - systemTags;
    const totalUsage = tags.reduce((sum, tag) => sum + tag.usageCount, 0);
    const favoriteTags = tags.filter(tag => tag.isFavorite).length;
    const typeDistribution = TAG_TYPES.reduce((acc, type) => {
      acc[type.value] = tags.filter(tag => tag.type === type.value).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTags,
      systemTags,
      customTags,
      totalUsage,
      favoriteTags,
      typeDistribution,
    };
  }, [tags]);

  // 处理标签选择
  const handleTagSelect = useCallback((tagId: string, selected: boolean) => {
    setSelectedTags(prev => {
      if (selected) {
        return [...prev, tagId];
      } else {
        return prev.filter(id => id !== tagId);
      }
    });
  }, []);

  // 处理全选
  const handleSelectAll = useCallback(() => {
    if (selectedTags.length === filteredAndSortedTags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(filteredAndSortedTags.map(tag => tag.id));
    }
  }, [selectedTags.length, filteredAndSortedTags]);

  // 处理批量操作
  const handleBulkAction = useCallback(async (action: string) => {
    if (!onBulkAction || selectedTags.length === 0) return;

    try {
      await onBulkAction(action, selectedTags);
      setSelectedTags([]);
      toast.success(`批量${action}成功`);
    } catch (error) {
      toast.error(`批量${action}失败`);
    }
  }, [onBulkAction, selectedTags]);

  // 处理创建标签
  const handleCreateTag = useCallback(async () => {
    if (!onTagCreate || !editing.formData.name) return;

    setEditing(prev => ({ ...prev, isSaving: true }));

    try {
      const tagType = editing.formData.type || 'custom';
      const defaultColor = TAG_TYPES.find(t => t.value === tagType)?.defaultColor || '#10B981';

      const newTag = await onTagCreate({
        name: editing.formData.name.trim(),
        type: tagType,
        color: editing.formData.color || defaultColor,
        weight: editing.formData.weight || 0.5,
        description: editing.formData.description,
        isSystem: false,
        isFavorite: false,
        confidence: editing.formData.confidence || 1.0,
      });

      setShowCreateDialog(false);
      setEditing({ isEditing: false, tagId: null, formData: {}, isSaving: false });
      toast.success('标签创建成功');
    } catch (error) {
      setEditing(prev => ({ ...prev, isSaving: false }));
      toast.error('创建标签失败');
    }
  }, [onTagCreate, editing.formData]);

  // 处理更新标签
  const handleUpdateTag = useCallback(async () => {
    if (!onTagUpdate || !editing.tagId) return;

    setEditing(prev => ({ ...prev, isSaving: true }));

    try {
      await onTagUpdate(editing.tagId, editing.formData);
      setEditing({ isEditing: false, tagId: null, formData: {}, isSaving: false });
      toast.success('标签更新成功');
    } catch (error) {
      setEditing(prev => ({ ...prev, isSaving: false }));
      toast.error('更新标签失败');
    }
  }, [onTagUpdate, editing.tagId, editing.formData]);

  // 处理删除标签
  const handleDeleteTag = useCallback(async (tagId: string) => {
    if (!onTagDelete) return;

    try {
      await onTagDelete(tagId);
      toast.success('标签删除成功');
    } catch (error) {
      toast.error('删除标签失败');
    }
  }, [onTagDelete]);

  // 处理收藏切换
  const handleToggleFavorite = useCallback(async (tag: SmartTag) => {
    if (!onTagUpdate) return;

    try {
      await onTagUpdate(tag.id, { isFavorite: !tag.isFavorite });
      toast.success(tag.isFavorite ? '已取消收藏' : '已添加收藏');
    } catch (error) {
      toast.error('操作失败');
    }
  }, [onTagUpdate]);

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-semibold">
            <TagIcon className="w-5 h-5 mr-2 text-blue-600" />
            智能标签管理
            <Badge variant="outline" className="ml-2">
              {stats.totalTags} 个标签
            </Badge>
          </CardTitle>

          <div className="flex items-center space-x-2">
            {editable && (
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                新建标签
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  导出标签
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Upload className="w-4 h-4 mr-2" />
                  导入标签
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  标签设置
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 统计信息 */}
        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{stats.totalTags}</div>
              <div className="text-xs text-muted-foreground">总标签数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{stats.customTags}</div>
              <div className="text-xs text-muted-foreground">自定义标签</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">{stats.favoriteTags}</div>
              <div className="text-xs text-muted-foreground">收藏标签</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">{stats.totalUsage}</div>
              <div className="text-xs text-muted-foreground">总使用次数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-cyan-600">
                {Math.round(stats.totalUsage / stats.totalTags) || 0}
              </div>
              <div className="text-xs text-muted-foreground">平均使用次数</div>
            </div>
          </div>
        )}

        {/* 搜索和过滤 */}
        {showFilter && (
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索标签..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="标签类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {TAG_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center">
                      {type.icon}
                      <span className="ml-2">{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="颜色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部颜色</SelectItem>
                {TAG_COLORS.map(color => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: color.value }}
                      />
                      <span>{color.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usage">使用次数</SelectItem>
                <SelectItem value="name">名称</SelectItem>
                <SelectItem value="weight">权重</SelectItem>
                <SelectItem value="created">创建时间</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* 批量操作 */}
        {selectedTags.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm">已选择 {selectedTags.length} 个标签</span>
              <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                {selectedTags.length === filteredAndSortedTags.length ? '取消全选' : '全选'}
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    批量操作
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    批量删除
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('favorite')}>
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    批量收藏
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('export')}>
                    <Share2 className="w-4 h-4 mr-2" />
                    批量导出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="ghost" onClick={() => setSelectedTags([])}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 标签列表 */}
        <div className="space-y-3">
          {filteredAndSortedTags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TagIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无标签</p>
              {editable && (
                <Button size="sm" className="mt-2" onClick={() => setShowCreateDialog(true)}>
                  创建第一个标签
                </Button>
              )}
            </div>
          ) : (
            filteredAndSortedTags.map(tag => {
              const color = getColorByValue(tag.color);
              const isSelected = selectedTags.includes(tag.id);

              return (
                <div
                  key={tag.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-md',
                    isSelected && 'ring-2 ring-blue-500 ring-offset-2',
                    color.borderColor,
                    color.bgColor
                  )}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {editable && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleTagSelect(tag.id, e.target.checked)}
                        className="rounded"
                      />
                    )}

                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 font-medium"
                          onClick={() => onTagClick?.(tag)}
                        >
                          {getTagTypeIcon(tag.type)}
                          <span className="ml-1">{tag.name}</span>
                        </Button>

                        {tag.isSystem && (
                          <Badge variant="outline" className="text-xs">
                            系统
                          </Badge>
                        )}

                        {tag.isFavorite && (
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        )}

                        {tag.confidence && tag.confidence < 1.0 && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(tag.confidence * 100)}%
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                        <span className={cn('font-medium', getWeightColor(tag.weight))}>
                          {getWeightLabel(tag.weight)}
                        </span>
                        <span>使用 {tag.usageCount} 次</span>
                        {tag.noteCount && <span>{tag.noteCount} 个笔记</span>}
                        {tag.lastUsedAt && (
                          <span>最后使用: {new Date(tag.lastUsedAt).toLocaleDateString()}</span>
                        )}
                      </div>

                      {tag.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tag.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(tag)}
                      className="text-muted-foreground"
                    >
                      {tag.isFavorite ? (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(tag.name)}
                      className="text-muted-foreground"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    {editable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing({
                                isEditing: true,
                                tagId: tag.id,
                                formData: tag,
                                isSaving: false,
                              });
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            复制
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="w-4 h-4 mr-2" />
                            分享
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!tag.isSystem && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除标签</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除标签 "{tag.name}" 吗？此操作无法撤销。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTag(tag.id)}>
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 创建标签对话框 */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>创建新标签</DialogTitle>
              <DialogDescription>
                创建一个新的智能标签来分类和组织您的笔记。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">标签名称</label>
                <Input
                  placeholder="输入标签名称..."
                  value={editing.formData.name || ''}
                  onChange={(e) => setEditing(prev => ({
                    ...prev,
                    formData: { ...prev.formData, name: e.target.value }
                  }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">标签类型</label>
                <Select
                  value={editing.formData.type || 'custom'}
                  onValueChange={(value: SmartTag['type']) => setEditing(prev => ({
                    ...prev,
                    formData: { ...prev.formData, type: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center">
                          {type.icon}
                          <span className="ml-2">{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">标签颜色</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TAG_COLORS.map(colorOption => (
                    <button
                      key={colorOption.value}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        editing.formData.color === colorOption.value
                          ? 'ring-2 ring-offset-2 ring-blue-500'
                          : 'border-gray-300'
                      )}
                      style={{ backgroundColor: colorOption.value }}
                      onClick={() => setEditing(prev => ({
                        ...prev,
                        formData: { ...prev.formData, color: colorOption.value }
                      }))}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">权重 (0-1)</label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editing.formData.weight || 0.5}
                  onChange={(e) => setEditing(prev => ({
                    ...prev,
                    formData: { ...prev.formData, weight: parseFloat(e.target.value) }
                  }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">描述 (可选)</label>
                <Input
                  placeholder="标签描述..."
                  value={editing.formData.description || ''}
                  onChange={(e) => setEditing(prev => ({
                    ...prev,
                    formData: { ...prev.formData, description: e.target.value }
                  }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreateTag} disabled={!editing.formData.name || editing.isSaving}>
                {editing.isSaving ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑标签对话框 */}
        <Dialog open={editing.isEditing} onOpenChange={(open) => !open && setEditing({ isEditing: false, tagId: null, formData: {}, isSaving: false })}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>编辑标签</DialogTitle>
              <DialogDescription>
                修改标签的属性和设置。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">标签名称</label>
                <Input
                  value={editing.formData.name || ''}
                  onChange={(e) => setEditing(prev => ({
                    ...prev,
                    formData: { ...prev.formData, name: e.target.value }
                  }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">标签颜色</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TAG_COLORS.map(colorOption => (
                    <button
                      key={colorOption.value}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        editing.formData.color === colorOption.value
                          ? 'ring-2 ring-offset-2 ring-blue-500'
                          : 'border-gray-300'
                      )}
                      style={{ backgroundColor: colorOption.value }}
                      onClick={() => setEditing(prev => ({
                        ...prev,
                        formData: { ...prev.formData, color: colorOption.value }
                      }))}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">权重 (0-1)</label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editing.formData.weight || 0.5}
                  onChange={(e) => setEditing(prev => ({
                    ...prev,
                    formData: { ...prev.formData, weight: parseFloat(e.target.value) }
                  }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">描述</label>
                <Input
                  value={editing.formData.description || ''}
                  onChange={(e) => setEditing(prev => ({
                    ...prev,
                    formData: { ...prev.formData, description: e.target.value }
                  }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing({ isEditing: false, tagId: null, formData: {}, isSaving: false })}>
                取消
              </Button>
              <Button onClick={handleUpdateTag} disabled={editing.isSaving}>
                {editing.isSaving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}