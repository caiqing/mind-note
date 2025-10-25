/**
 * AI分析仪表板集成组件
 *
 * 集成T112 AI摘要、T113智能标签、T114相关笔记推荐的综合展示界面
 */

'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from 'sonner';

import { AISummaryCard } from './ai-summary-card';
import { SmartTagManager, SmartTag } from './smart-tag-manager';
import { RelatedNotesRecommendation, RelatedNote } from './related-notes-recommendation';

import {
  Brain,
  TrendingUp,
  FileText,
  Tag as TagIcon,
  Network,
  BarChart3,
  PieChart,
  Activity,
  Settings,
  RefreshCw,
  Download,
  Upload,
  Share2,
  Eye,
  EyeOff,
  Zap,
  Target,
  Clock,
  Calendar,
  Star,
  ThumbsUp,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Sparkles,
  Lightbulb,
  Heart,
  Bookmark,
  Filter,
  Search,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIAnalysisData {
  /** AI摘要 */
  summary?: {
    content: string;
    style: 'paragraph' | 'bullets' | 'key-points';
    length: number;
    qualityScore: number;
    generatedAt: string;
    provider: string;
    originalLength: number;
    keyPoints: string[];
  };
  /** 智能标签 */
  tags?: SmartTag[];
  /** 相关笔记推荐 */
  relatedNotes?: RelatedNote[];
  /** 分析统计 */
  analytics?: {
    sentimentScore: number;
    topicCategories: string[];
    readingTime: number;
    complexity: 'low' | 'medium' | 'high';
    keywords: string[];
    entities: Array<{
      name: string;
      type: string;
      confidence: number;
    }>;
  };
}

interface AIAnalysisDashboardProps {
  /** 当前笔记ID */
  noteId: string;
  /** AI分析数据 */
  analysisData: AIAnalysisData;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 最后更新时间 */
  lastUpdated?: string;
  /** 可见的面板 */
  visiblePanels?: Array<'summary' | 'tags' | 'recommendations' | 'analytics'>;
  /** 布局模式 */
  layoutMode?: 'tabs' | 'accordion' | 'grid';
  /** 紧凑模式 */
  compactMode?: boolean;
  /** 是否可编辑 */
  editable?: boolean;
  /** 摘要编辑回调 */
  onSummaryEdit?: (newSummary: string) => Promise<void>;
  /** 摘要反馈回调 */
  onSummaryFeedback?: (type: 'positive' | 'negative' | 'helpful', rating?: number) => void;
  /** 摘要复制回调 */
  onSummaryCopy?: (summary: string) => void;
  /** 摘要重新生成回调 */
  onSummaryRegenerate?: () => Promise<void>;
  /** 标签创建回调 */
  onTagCreate?: (tagData: Omit<SmartTag, 'id' | 'createdAt' | 'usageCount'>) => Promise<SmartTag>;
  /** 标签更新回调 */
  onTagUpdate?: (id: string, updates: Partial<SmartTag>) => Promise<void>;
  /** 标签删除回调 */
  onTagDelete?: (id: string) => Promise<void>;
  /** 标签批量操作回调 */
  onTagBulkAction?: (action: string, tagIds: string[]) => Promise<void>;
  /** 标签点击回调 */
  onTagClick?: (tag: SmartTag) => void;
  /** 相关笔记点击回调 */
  onRelatedNoteClick?: (note: RelatedNote) => void;
  /** 相关笔记反馈回调 */
  onRelatedNoteFeedback?: (noteId: string, feedback: 'positive' | 'negative') => Promise<void>;
  /** 相关笔记收藏回调 */
  onRelatedNoteBookmark?: (noteId: string, bookmarked: boolean) => Promise<void>;
  /** 相关笔记查看回调 */
  onRelatedNoteView?: (noteId: string) => Promise<void>;
  /** 相关笔记刷新回调 */
  onRelatedNotesRefresh?: () => Promise<void>;
  /** 分析刷新回调 */
  onAnalysisRefresh?: () => Promise<void>;
  /** 导出回调 */
  onExport?: (format: 'json' | 'pdf' | 'markdown') => Promise<void>;
  /** 分享回调 */
  onShare?: () => Promise<void>;
  /** 类名 */
  className?: string;
}

const SENTIMENT_LEVELS = {
  positive: { label: '积极', color: 'text-green-600', bgColor: 'bg-green-100' },
  neutral: { label: '中性', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  negative: { label: '消极', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const COMPLEXITY_LEVELS = {
  low: { label: '简单', color: 'text-green-600', bgColor: 'bg-green-100' },
  medium: { label: '中等', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  high: { label: '复杂', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const getSentimentLevel = (score: number) => {
  if (score >= 0.6) return SENTIMENT_LEVELS.positive;
  if (score >= 0.4) return SENTIMENT_LEVELS.neutral;
  return SENTIMENT_LEVELS.negative;
};

export function AIAnalysisDashboard({
  noteId,
  analysisData,
  isLoading = false,
  lastUpdated,
  visiblePanels = ['summary', 'tags', 'recommendations', 'analytics'],
  layoutMode = 'tabs',
  compactMode = false,
  editable = true,
  onSummaryEdit,
  onSummaryFeedback,
  onSummaryCopy,
  onSummaryRegenerate,
  onTagCreate,
  onTagUpdate,
  onTagDelete,
  onTagBulkAction,
  onTagClick,
  onRelatedNoteClick,
  onRelatedNoteFeedback,
  onRelatedNoteBookmark,
  onRelatedNoteView,
  onRelatedNotesRefresh,
  onAnalysisRefresh,
  onExport,
  onShare,
  className,
}: AIAnalysisDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(visiblePanels[0]);
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set(['summary']));
  const [showFullscreen, setShowFullscreen] = useState(false);

  // 统计信息
  const stats = useMemo(() => {
    const summary = analysisData.summary;
    const tags = analysisData.tags || [];
    const relatedNotes = analysisData.relatedNotes || [];
    const analytics = analysisData.analytics;

    return {
      hasSummary: !!summary?.content,
      summaryQuality: summary?.qualityScore || 0,
      tagCount: tags.length,
      favoriteTagCount: tags.filter(tag => tag.isFavorite).length,
      relatedNoteCount: relatedNotes.length,
      highSimilarityNotes: relatedNotes.filter(note => note.similarityScore >= 0.8).length,
      sentimentScore: analytics?.sentimentScore || 0,
      keywordCount: analytics?.keywords.length || 0,
      entityCount: analytics?.entities.length || 0,
      lastAnalysisTime: lastUpdated || new Date().toISOString(),
    };
  }, [analysisData, lastUpdated]);

  // 处理刷新分析
  const handleRefreshAnalysis = useCallback(async () => {
    if (!onAnalysisRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onAnalysisRefresh();
      toast.success('AI分析已刷新');
    } catch (error) {
      toast.error('刷新失败');
    } finally {
      setIsRefreshing(false);
    }
  }, [onAnalysisRefresh, isRefreshing]);

  // 处理面板展开/收起
  const togglePanelExpansion = useCallback((panel: string) => {
    setExpandedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panel)) {
        newSet.delete(panel);
      } else {
        newSet.add(panel);
      }
      return newSet;
    });
  }, []);

  // 渲染分析统计
  const renderAnalyticsStats = () => {
    if (!analysisData.analytics) return null;

    const { sentimentScore, topicCategories, readingTime, complexity, keywords, entities } = analysisData.analytics;
    const sentimentLevel = getSentimentLevel(sentimentScore);
    const complexityLevel = COMPLEXITY_LEVELS[complexity];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">情感分析</span>
            <Heart className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className={cn('px-2 py-1 rounded-full text-xs font-medium mb-2', sentimentLevel.bgColor, sentimentLevel.textColor)}>
            {sentimentLevel.label}
          </div>
          <div className="text-xs text-muted-foreground">
            分数: {Math.round(sentimentScore * 100)}%
          </div>
        </div>

        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">复杂度</span>
            <Brain className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className={cn('px-2 py-1 rounded-full text-xs font-medium mb-2', complexityLevel.bgColor, complexityLevel.textColor)}>
            {complexityLevel.label}
          </div>
          <div className="text-xs text-muted-foreground">
            阅读时间: {readingTime}分钟
          </div>
        </div>

        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">关键词</span>
            <Search className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-lg font-semibold">{keywords.length}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {keywords.slice(0, 3).map((keyword, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
            {keywords.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{keywords.length - 3}
              </Badge>
            )}
          </div>
        </div>

        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">实体识别</span>
            <Target className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-lg font-semibold">{entities.length}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {topicCategories.slice(0, 2).map((category, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {category}
              </Badge>
            ))}
            {topicCategories.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{topicCategories.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染概览卡片
  const renderOverviewCard = () => (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-semibold">
            <Brain className="w-5 h-5 mr-2 text-blue-600" />
            AI分析概览
            <Badge variant="outline" className="ml-2">
              {[
                stats.hasSummary && '摘要',
                stats.tagCount > 0 && '标签',
                stats.relatedNoteCount > 0 && '推荐',
                stats.keywordCount > 0 && '分析'
              ].filter(Boolean).length} 项分析
            </Badge>
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAnalysis}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onExport?.('json')}>
                  <Download className="w-4 h-4 mr-2" />
                  导出JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('pdf')}>
                  <Download className="w-4 h-4 mr-2" />
                  导出PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('markdown')}>
                  <Download className="w-4 h-4 mr-2" />
                  导出Markdown
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  分享分析
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowFullscreen(!showFullscreen)}>
                  {showFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                  {showFullscreen ? '退出全屏' : '全屏显示'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 分析统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {stats.hasSummary ? Math.round(stats.summaryQuality * 100) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">摘要质量</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{stats.tagCount}</div>
            <div className="text-xs text-muted-foreground">智能标签</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{stats.favoriteTagCount}</div>
            <div className="text-xs text-muted-foreground">收藏标签</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">{stats.relatedNoteCount}</div>
            <div className="text-xs text-muted-foreground">相关笔记</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-cyan-600">{stats.highSimilarityNotes}</div>
            <div className="text-xs text-muted-foreground">高相似度</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-pink-600">
              {Math.round(stats.sentimentScore * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">情感分数</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-indigo-600">{stats.keywordCount}</div>
            <div className="text-xs text-muted-foreground">关键词</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">{stats.entityCount}</div>
            <div className="text-xs text-muted-foreground">实体识别</div>
          </div>
        </div>

        {/* 最后更新时间 */}
        {lastUpdated && (
          <div className="flex items-center text-xs text-muted-foreground mt-4">
            <Clock className="w-3 h-3 mr-1" />
            最后更新: {new Date(lastUpdated).toLocaleString()}
          </div>
        )}
      </CardHeader>
    </Card>
  );

  // 渲染标签页布局
  const renderTabsLayout = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        {visiblePanels.includes('summary') && (
          <TabsTrigger value="summary" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            AI摘要
            {analysisData.summary && <CheckCircle className="w-3 h-3 ml-1 text-green-500" />}
          </TabsTrigger>
        )}
        {visiblePanels.includes('tags') && (
          <TabsTrigger value="tags" className="flex items-center">
            <TagIcon className="w-4 h-4 mr-2" />
            智能标签
            {analysisData.tags && analysisData.tags.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">
                {analysisData.tags.length}
              </Badge>
            )}
          </TabsTrigger>
        )}
        {visiblePanels.includes('recommendations') && (
          <TabsTrigger value="recommendations" className="flex items-center">
            <Network className="w-4 h-4 mr-2" />
            相关推荐
            {analysisData.relatedNotes && analysisData.relatedNotes.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">
                {analysisData.relatedNotes.length}
              </Badge>
            )}
          </TabsTrigger>
        )}
        {visiblePanels.includes('analytics') && (
          <TabsTrigger value="analytics" className="flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            分析统计
            {analysisData.analytics && <Sparkles className="w-3 h-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
        )}
      </TabsList>

      <div className="mt-6">
        {visiblePanels.includes('summary') && (
          <TabsContent value="summary" className="mt-0">
            {analysisData.summary ? (
              <AISummaryCard
                summary={analysisData.summary.content}
                style={analysisData.summary.style}
                length={analysisData.summary.length}
                qualityScore={analysisData.summary.qualityScore}
                generatedAt={analysisData.summary.generatedAt}
                provider={analysisData.summary.provider}
                originalLength={analysisData.summary.originalLength}
                keyPoints={analysisData.summary.keyPoints}
                editable={editable}
                onEdit={onSummaryEdit}
                onFeedback={onSummaryFeedback}
                onCopy={onSummaryCopy}
                onRegenerate={onSummaryRegenerate}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无AI摘要</p>
                  {editable && onSummaryRegenerate && (
                    <Button size="sm" className="mt-2" onClick={onSummaryRegenerate}>
                      生成摘要
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {visiblePanels.includes('tags') && (
          <TabsContent value="tags" className="mt-0">
            {analysisData.tags && analysisData.tags.length > 0 ? (
              <SmartTagManager
                tags={analysisData.tags}
                editable={editable}
                onTagCreate={onTagCreate}
                onTagUpdate={onTagUpdate}
                onTagDelete={onTagDelete}
                onBulkAction={onTagBulkAction}
                onTagClick={onTagClick}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <TagIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无智能标签</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {visiblePanels.includes('recommendations') && (
          <TabsContent value="recommendations" className="mt-0">
            {analysisData.relatedNotes && analysisData.relatedNotes.length > 0 ? (
              <RelatedNotesRecommendation
                currentNoteId={noteId}
                recommendedNotes={analysisData.relatedNotes}
                onNoteClick={onRelatedNoteClick}
                onFeedback={onRelatedNoteFeedback}
                onBookmark={onRelatedNoteBookmark}
                onView={onRelatedNoteView}
                onRefresh={onRelatedNotesRefresh}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无相关推荐</p>
                  {onRelatedNotesRefresh && (
                    <Button size="sm" className="mt-2" onClick={onRelatedNotesRefresh}>
                      刷新推荐
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {visiblePanels.includes('analytics') && (
          <TabsContent value="analytics" className="mt-0">
            {analysisData.analytics ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    深度分析统计
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderAnalyticsStats()}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无分析统计</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </div>
    </Tabs>
  );

  // 渲染网格布局
  const renderGridLayout = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {visiblePanels.includes('summary') && analysisData.summary && (
        <AISummaryCard
          summary={analysisData.summary.content}
          style={analysisData.summary.style}
          length={analysisData.summary.length}
          qualityScore={analysisData.summary.qualityScore}
          generatedAt={analysisData.summary.generatedAt}
          provider={analysisData.summary.provider}
          originalLength={analysisData.summary.originalLength}
          keyPoints={analysisData.summary.keyPoints}
          editable={editable}
          onEdit={onSummaryEdit}
          onFeedback={onSummaryFeedback}
          onCopy={onSummaryCopy}
          onRegenerate={onSummaryRegenerate}
        />
      )}

      {visiblePanels.includes('analytics') && analysisData.analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              分析统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderAnalyticsStats()}
          </CardContent>
        </Card>
      )}

      {visiblePanels.includes('tags') && analysisData.tags && (
        <div className="lg:col-span-2">
          <SmartTagManager
            tags={analysisData.tags}
            editable={editable}
            showStats={compactMode}
            showFilter={!compactMode}
            onTagCreate={onTagCreate}
            onTagUpdate={onTagUpdate}
            onTagDelete={onTagDelete}
            onBulkAction={onTagBulkAction}
            onTagClick={onTagClick}
          />
        </div>
      )}

      {visiblePanels.includes('recommendations') && analysisData.relatedNotes && (
        <div className="lg:col-span-2">
          <RelatedNotesRecommendation
            currentNoteId={noteId}
            recommendedNotes={analysisData.relatedNotes}
            maxDisplay={compactMode ? 3 : 5}
            showSimilarityVisualization={!compactMode}
            showRecommendationReasons={!compactMode}
            onNoteClick={onRelatedNoteClick}
            onFeedback={onRelatedNoteFeedback}
            onBookmark={onRelatedNoteBookmark}
            onView={onRelatedNoteView}
            onRefresh={onRelatedNotesRefresh}
          />
        </div>
      )}
    </div>
  );

  // 渲染手风琴布局
  const renderAccordionLayout = () => (
    <div className="space-y-4">
      {visiblePanels.includes('summary') && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => togglePanelExpansion('summary')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                AI摘要
                {analysisData.summary && (
                  <CheckCircle className="w-4 h-4 ml-2 text-green-500" />
                )}
              </CardTitle>
              <ChevronRight
                className={cn(
                  'w-4 h-4 transition-transform',
                  expandedPanels.has('summary') && 'rotate-90'
                )}
              />
            </div>
          </CardHeader>
          {expandedPanels.has('summary') && (
            <CardContent className="pt-0">
              {analysisData.summary ? (
                <AISummaryCard
                  summary={analysisData.summary.content}
                  style={analysisData.summary.style}
                  length={analysisData.summary.length}
                  qualityScore={analysisData.summary.qualityScore}
                  generatedAt={analysisData.summary.generatedAt}
                  provider={analysisData.summary.provider}
                  originalLength={analysisData.summary.originalLength}
                  keyPoints={analysisData.summary.keyPoints}
                  editable={editable}
                  onEdit={onSummaryEdit}
                  onFeedback={onSummaryFeedback}
                  onCopy={onSummaryCopy}
                  onRegenerate={onSummaryRegenerate}
                  className="border-0 shadow-none"
                />
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  暂无AI摘要
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {visiblePanels.includes('tags') && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => togglePanelExpansion('tags')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <TagIcon className="w-5 h-5 mr-2 text-blue-600" />
                智能标签
                {analysisData.tags && (
                  <Badge variant="outline" className="ml-2">
                    {analysisData.tags.length}
                  </Badge>
                )}
              </CardTitle>
              <ChevronRight
                className={cn(
                  'w-4 h-4 transition-transform',
                  expandedPanels.has('tags') && 'rotate-90'
                )}
              />
            </div>
          </CardHeader>
          {expandedPanels.has('tags') && (
            <CardContent className="pt-0">
              {analysisData.tags && analysisData.tags.length > 0 ? (
                <SmartTagManager
                  tags={analysisData.tags}
                  editable={editable}
                  showStats={false}
                  showFilter={false}
                  onTagCreate={onTagCreate}
                  onTagUpdate={onTagUpdate}
                  onTagDelete={onTagDelete}
                  onBulkAction={onTagBulkAction}
                  onTagClick={onTagClick}
                  className="border-0 shadow-none"
                />
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  暂无智能标签
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {visiblePanels.includes('recommendations') && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => togglePanelExpansion('recommendations')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Network className="w-5 h-5 mr-2 text-blue-600" />
                相关推荐
                {analysisData.relatedNotes && (
                  <Badge variant="outline" className="ml-2">
                    {analysisData.relatedNotes.length}
                  </Badge>
                )}
              </CardTitle>
              <ChevronRight
                className={cn(
                  'w-4 h-4 transition-transform',
                  expandedPanels.has('recommendations') && 'rotate-90'
                )}
              />
            </div>
          </CardHeader>
          {expandedPanels.has('recommendations') && (
            <CardContent className="pt-0">
              {analysisData.relatedNotes && analysisData.relatedNotes.length > 0 ? (
                <RelatedNotesRecommendation
                  currentNoteId={noteId}
                  recommendedNotes={analysisData.relatedNotes}
                  maxDisplay={compactMode ? 2 : 3}
                  showSimilarityVisualization={!compactMode}
                  showRecommendationReasons={!compactMode}
                  onNoteClick={onRelatedNoteClick}
                  onFeedback={onRelatedNoteFeedback}
                  onBookmark={onRelatedNoteBookmark}
                  onView={onRelatedNoteView}
                  onRefresh={onRelatedNotesRefresh}
                  className="border-0 shadow-none"
                />
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  暂无相关推荐
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {visiblePanels.includes('analytics') && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => togglePanelExpansion('analytics')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                分析统计
                {analysisData.analytics && (
                  <Sparkles className="w-4 h-4 ml-2 text-yellow-500" />
                )}
              </CardTitle>
              <ChevronRight
                className={cn(
                  'w-4 h-4 transition-transform',
                  expandedPanels.has('analytics') && 'rotate-90'
                )}
              />
            </div>
          </CardHeader>
          {expandedPanels.has('analytics') && (
            <CardContent className="pt-0">
              {analysisData.analytics ? (
                renderAnalyticsStats()
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  暂无分析统计
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Card className={cn('transition-all duration-200', className)}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>AI分析进行中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('transition-all duration-200', className)}>
      {/* 概览卡片 */}
      {!compactMode && renderOverviewCard()}

      {/* 布局切换 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">布局模式:</span>
          <div className="flex items-center space-x-1">
            <Button
              variant={layoutMode === 'tabs' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(visiblePanels[0])}
            >
              <List className="w-4 h-4 mr-1" />
              标签页
            </Button>
            <Button
              variant={layoutMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayoutMode('grid')}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              网格
            </Button>
            <Button
              variant={layoutMode === 'accordion' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayoutMode('accordion')}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              手风琴
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={compactMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCompactMode(!compactMode)}
          >
            {compactMode ? <Maximize2 className="w-4 h-4 mr-1" /> : <Minimize2 className="w-4 h-4 mr-1" />}
            {compactMode ? '详细模式' : '紧凑模式'}
          </Button>
        </div>
      </div>

      {/* 主要内容 */}
      {layoutMode === 'tabs' && renderTabsLayout()}
      {layoutMode === 'grid' && renderGridLayout()}
      {layoutMode === 'accordion' && renderAccordionLayout()}
    </div>
  );
}