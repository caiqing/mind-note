/**
 * AI组件演示页面
 *
 * 展示所有AI相关组件的使用方法和效果
 */

'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import {
  AIAnalysisDashboard,
  AISummaryCard,
  SmartTagManager,
  RelatedNotesRecommendation,
  type AIAnalysisData,
  type SmartTag,
  type RelatedNote,
} from '@/components/ai';

import {
  Brain,
  FileText,
  Tag as TagIcon,
  Network,
  Code,
  Eye,
  Settings,
  RefreshCw,
  Download,
  Share2,
  Info,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// 示例数据
const mockAnalysisData: AIAnalysisData = {
  summary: {
    content: '这是一个关于人工智能技术在现代软件开发中应用的详细分析。文章深入探讨了机器学习算法如何优化代码质量、自动化测试流程以及提升开发效率。通过实际案例展示了AI在代码审查、缺陷预测、性能优化等方面的显著成果，同时讨论了实施AI工具时需要考虑的技术挑战和团队协作问题。',
    style: 'paragraph',
    length: 156,
    qualityScore: 0.92,
    generatedAt: new Date().toISOString(),
    provider: 'Claude-3.5-Sonnet',
    originalLength: 1250,
    keyPoints: [
      'AI技术在代码审查中的应用可以显著提高审查效率',
      '机器学习算法能够预测潜在的代码缺陷',
      '自动化测试流程通过AI得到大幅优化',
      '团队协作是AI工具成功实施的关键因素',
      '技术挑战包括数据隐私和算法透明度'
    ],
  },
  tags: [
    {
      id: '1',
      name: '人工智能',
      type: 'topic',
      color: '#3B82F6',
      weight: 0.95,
      usageCount: 42,
      createdAt: '2024-01-15T10:30:00Z',
      lastUsedAt: '2024-10-25T14:20:00Z',
      description: '人工智能相关技术和应用',
      isSystem: false,
      isFavorite: true,
      noteCount: 15,
      confidence: 0.98,
    },
    {
      id: '2',
      name: '软件开发',
      type: 'category',
      color: '#10B981',
      weight: 0.88,
      usageCount: 38,
      createdAt: '2024-01-20T09:15:00Z',
      lastUsedAt: '2024-10-24T16:45:00Z',
      description: '软件开发过程和方法论',
      isSystem: false,
      isFavorite: true,
      noteCount: 12,
      confidence: 0.95,
    },
    {
      id: '3',
      name: '机器学习',
      type: 'topic',
      color: '#8B5CF6',
      weight: 0.82,
      usageCount: 25,
      createdAt: '2024-02-01T11:00:00Z',
      lastUsedAt: '2024-10-23T10:30:00Z',
      description: '机器学习算法和模型',
      isSystem: false,
      isFavorite: false,
      noteCount: 8,
      confidence: 0.91,
    },
    {
      id: '4',
      name: '高优先级',
      type: 'priority',
      color: '#F97316',
      weight: 0.90,
      usageCount: 15,
      createdAt: '2024-01-10T08:45:00Z',
      lastUsedAt: '2024-10-25T09:20:00Z',
      description: '高优先级任务和内容',
      isSystem: true,
      isFavorite: false,
      noteCount: 6,
      confidence: 1.0,
    },
    {
      id: '5',
      name: '技术研究',
      type: 'category',
      color: '#EC4899',
      weight: 0.75,
      usageCount: 18,
      createdAt: '2024-01-25T13:20:00Z',
      lastUsedAt: '2024-10-22T15:10:00Z',
      description: '技术研究和探索类内容',
      isSystem: false,
      isFavorite: false,
      noteCount: 9,
      confidence: 0.87,
    },
  ],
  relatedNotes: [
    {
      id: 'note-1',
      title: '深度学习在代码生成中的应用',
      summary: '探讨了深度学习模型如何通过学习大量代码库来自动生成高质量的代码，包括自然语言到代码的转换、代码补全和重构建议等方面的最新进展。',
      similarityScore: 0.89,
      recommendationReasons: [
        {
          type: 'content',
          description: '内容高度相关，都讨论AI在软件开发中的应用',
          weight: 0.9,
          matches: ['人工智能', '代码生成', '软件开发'],
        },
        {
          type: 'semantic',
          description: '语义相似度很高，主题概念重叠度大',
          weight: 0.85,
          matches: ['深度学习', '机器学习', 'AI技术'],
        },
      ],
      commonTags: ['人工智能', '机器学习'],
      commonKeywords: ['代码', 'AI', '学习'],
      type: 'research',
      createdAt: '2024-10-20T10:00:00Z',
      updatedAt: '2024-10-24T16:30:00Z',
      wordCount: 2450,
      isBookmarked: true,
      isViewed: false,
      userFeedback: null,
      estimatedReadTime: 8,
      relevanceStrength: 'high',
    },
    {
      id: 'note-2',
      title: '自动化测试的最佳实践',
      summary: '详细介绍了现代软件开发中自动化测试的实施策略，包括单元测试、集成测试、端到端测试的完整流程，以及如何利用AI工具提高测试覆盖率和效率。',
      similarityScore: 0.76,
      recommendationReasons: [
        {
          type: 'content',
          description: '都涉及软件开发流程优化',
          weight: 0.8,
          matches: ['自动化', '测试', '软件开发'],
        },
        {
          type: 'topics',
          description: '主题相关性较强',
          weight: 0.7,
          matches: ['开发效率', '质量保证'],
        },
      ],
      commonTags: ['软件开发'],
      commonKeywords: ['自动化', '测试', '质量'],
      type: 'article',
      createdAt: '2024-10-18T14:20:00Z',
      updatedAt: '2024-10-23T11:45:00Z',
      wordCount: 1800,
      isBookmarked: false,
      isViewed: true,
      userFeedback: 'positive',
      estimatedReadTime: 6,
      relevanceStrength: 'medium',
    },
    {
      id: 'note-3',
      title: '代码审查工具对比分析',
      summary: '对比分析了市面上主流的代码审查工具，包括传统工具和基于AI的智能审查系统，评估了它们在发现缺陷、提高代码质量方面的效果。',
      similarityScore: 0.71,
      recommendationReasons: [
        {
          type: 'content',
          description: '都讨论代码质量提升方法',
          weight: 0.75,
          matches: ['代码审查', '质量', '工具'],
        },
        {
          type: 'keywords',
          description: '关键词匹配度较高',
          weight: 0.65,
          matches: ['代码', '审查', '质量'],
        },
      ],
      commonTags: ['软件开发'],
      commonKeywords: ['代码', '审查', '质量'],
      type: 'note',
      createdAt: '2024-10-15T09:30:00Z',
      updatedAt: '2024-10-22T13:15:00Z',
      wordCount: 1200,
      isBookmarked: false,
      isViewed: false,
      userFeedback: null,
      estimatedReadTime: 4,
      relevanceStrength: 'medium',
    },
  ],
  analytics: {
    sentimentScore: 0.78,
    topicCategories: ['技术', '软件开发', '人工智能', '研究'],
    readingTime: 5,
    complexity: 'medium',
    keywords: ['人工智能', '机器学习', '代码', '自动化', '质量', '效率'],
    entities: [
      { name: 'AI', type: 'TECHNOLOGY', confidence: 0.95 },
      { name: '机器学习', type: 'CONCEPT', confidence: 0.91 },
      { name: '代码审查', type: 'PROCESS', confidence: 0.88 },
      { name: '自动化测试', type: 'PROCESS', confidence: 0.92 },
    ],
  },
};

export default function AIComponentsDemo() {
  const [layoutMode, setLayoutMode] = useState<'tabs' | 'accordion' | 'grid'>('tabs');
  const [compactMode, setCompactMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 回调函数示例
  const handleSummaryEdit = useCallback(async (newSummary: string) => {
    toast.success('摘要已更新');
    console.log('Updated summary:', newSummary);
  }, []);

  const handleSummaryFeedback = useCallback((type: 'positive' | 'negative' | 'helpful', rating?: number) => {
    toast.success(`感谢您的${type === 'positive' ? '积极' : type === 'negative' ? '消极' : '有帮助'}反馈！`);
    console.log('Summary feedback:', { type, rating });
  }, []);

  const handleSummaryCopy = useCallback((summary: string) => {
    console.log('Copied summary:', summary);
  }, []);

  const handleSummaryRegenerate = useCallback(async () => {
    setIsLoading(true);
    // 模拟重新生成过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    toast.success('摘要已重新生成');
  }, []);

  const handleTagCreate = useCallback(async (tagData: Omit<SmartTag, 'id' | 'createdAt' | 'usageCount'>) => {
    toast.success('标签已创建');
    console.log('Created tag:', tagData);
    return {
      ...tagData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      usageCount: 0,
    } as SmartTag;
  }, []);

  const handleTagUpdate = useCallback(async (id: string, updates: Partial<SmartTag>) => {
    toast.success('标签已更新');
    console.log('Updated tag:', { id, updates });
  }, []);

  const handleTagDelete = useCallback(async (id: string) => {
    toast.success('标签已删除');
    console.log('Deleted tag:', id);
  }, []);

  const handleTagBulkAction = useCallback(async (action: string, tagIds: string[]) => {
    toast.success(`批量${action}成功`);
    console.log('Bulk action:', { action, tagIds });
  }, []);

  const handleTagClick = useCallback((tag: SmartTag) => {
    toast.info(`点击标签: ${tag.name}`);
    console.log('Tag clicked:', tag);
  }, []);

  const handleRelatedNoteClick = useCallback((note: RelatedNote) => {
    toast.info(`查看笔记: ${note.title}`);
    console.log('Related note clicked:', note);
  }, []);

  const handleRelatedNoteFeedback = useCallback(async (noteId: string, feedback: 'positive' | 'negative') => {
    toast.success('反馈已记录');
    console.log('Related note feedback:', { noteId, feedback });
  }, []);

  const handleRelatedNoteBookmark = useCallback(async (noteId: string, bookmarked: boolean) => {
    toast.success(bookmarked ? '已收藏' : '已取消收藏');
    console.log('Related note bookmark:', { noteId, bookmarked });
  }, []);

  const handleRelatedNoteView = useCallback(async (noteId: string) => {
    console.log('Related note viewed:', noteId);
  }, []);

  const handleRelatedNotesRefresh = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    toast.success('推荐已刷新');
  }, []);

  const handleAnalysisRefresh = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    toast.success('AI分析已刷新');
  }, []);

  const handleExport = useCallback(async (format: 'json' | 'pdf' | 'markdown') => {
    toast.success(`正在导出${format.toUpperCase()}格式...`);
    console.log('Export format:', format);
  }, []);

  const handleShare = useCallback(async () => {
    toast.success('分享链接已复制到剪贴板');
    console.log('Shared analysis');
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <Brain className="w-8 h-8 mr-3 text-blue-600" />
              AI组件演示
            </h1>
            <p className="text-muted-foreground text-lg">
              展示MindNote智能笔记应用的AI分析功能组件
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-sm">
              <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
              完整实现
            </Badge>
            <Badge variant="outline" className="text-sm">
              v1.0.0
            </Badge>
          </div>
        </div>
      </div>

      {/* 功能说明 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2 text-blue-600" />
            功能概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">AI智能摘要</h3>
              <p className="text-sm text-muted-foreground">
                自动生成高质量摘要，支持多种风格和质量评分
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <TagIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">智能标签管理</h3>
              <p className="text-sm text-muted-foreground">
                自动生成和分类标签，支持色彩编码和批量操作
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Network className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">相关笔记推荐</h3>
              <p className="text-sm text-muted-foreground">
                基于语义相似度推荐相关笔记，可视化展示推荐理由
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 控制面板 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-blue-600" />
            演示控制
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">布局模式:</span>
              <div className="flex items-center space-x-1">
                <Button
                  variant={layoutMode === 'tabs' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayoutMode('tabs')}
                >
                  标签页
                </Button>
                <Button
                  variant={layoutMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayoutMode('grid')}
                >
                  网格
                </Button>
                <Button
                  variant={layoutMode === 'accordion' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayoutMode('accordion')}
                >
                  手风琴
                </Button>
              </div>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant={compactMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCompactMode(!compactMode)}
            >
              {compactMode ? '详细模式' : '紧凑模式'}
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLoading(!isLoading)}
              disabled
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
              {isLoading ? '加载中...' : '加载状态'}
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <Download className="w-4 h-4 mr-2" />
              导出示例
            </Button>

            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              分享演示
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 主要演示区域 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Brain className="w-6 h-6 mr-2 text-blue-600" />
          AI分析仪表板
        </h2>

        <AIAnalysisDashboard
          noteId="demo-note-001"
          analysisData={mockAnalysisData}
          isLoading={isLoading}
          lastUpdated={new Date().toISOString()}
          visiblePanels={['summary', 'tags', 'recommendations', 'analytics']}
          layoutMode={layoutMode}
          compactMode={compactMode}
          editable={true}
          onSummaryEdit={handleSummaryEdit}
          onSummaryFeedback={handleSummaryFeedback}
          onSummaryCopy={handleSummaryCopy}
          onSummaryRegenerate={handleSummaryRegenerate}
          onTagCreate={handleTagCreate}
          onTagUpdate={handleTagUpdate}
          onTagDelete={handleTagDelete}
          onTagBulkAction={handleTagBulkAction}
          onTagClick={handleTagClick}
          onRelatedNoteClick={handleRelatedNoteClick}
          onRelatedNoteFeedback={handleRelatedNoteFeedback}
          onRelatedNoteBookmark={handleRelatedNoteBookmark}
          onRelatedNoteView={handleRelatedNoteView}
          onRelatedNotesRefresh={handleRelatedNotesRefresh}
          onAnalysisRefresh={handleAnalysisRefresh}
          onExport={handleExport}
          onShare={handleShare}
        />
      </div>

      {/* 单独组件演示 */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Code className="w-6 h-6 mr-2 text-blue-600" />
          单独组件演示
        </h2>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary" className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              摘要卡片
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center">
              <TagIcon className="w-4 h-4 mr-2" />
              标签管理
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center">
              <Network className="w-4 h-4 mr-2" />
              推荐系统
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center">
              <Code className="w-4 h-4 mr-2" />
              使用示例
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>AI摘要卡片组件</CardTitle>
              </CardHeader>
              <CardContent>
                {mockAnalysisData.summary && (
                  <AISummaryCard
                    summary={mockAnalysisData.summary.content}
                    style={mockAnalysisData.summary.style}
                    length={mockAnalysisData.summary.length}
                    qualityScore={mockAnalysisData.summary.qualityScore}
                    generatedAt={mockAnalysisData.summary.generatedAt}
                    provider={mockAnalysisData.summary.provider}
                    originalLength={mockAnalysisData.summary.originalLength}
                    keyPoints={mockAnalysisData.summary.keyPoints}
                    editable={true}
                    onEdit={handleSummaryEdit}
                    onFeedback={handleSummaryFeedback}
                    onCopy={handleSummaryCopy}
                    onRegenerate={handleSummaryRegenerate}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>智能标签管理组件</CardTitle>
              </CardHeader>
              <CardContent>
                <SmartTagManager
                  tags={mockAnalysisData.tags || []}
                  editable={true}
                  onTagCreate={handleTagCreate}
                  onTagUpdate={handleTagUpdate}
                  onTagDelete={handleTagDelete}
                  onBulkAction={handleTagBulkAction}
                  onTagClick={handleTagClick}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>相关笔记推荐组件</CardTitle>
              </CardHeader>
              <CardContent>
                <RelatedNotesRecommendation
                  currentNoteId="demo-note-001"
                  recommendedNotes={mockAnalysisData.relatedNotes || []}
                  onNoteClick={handleRelatedNoteClick}
                  onFeedback={handleRelatedNoteFeedback}
                  onBookmark={handleRelatedNoteBookmark}
                  onView={handleRelatedNoteView}
                  onRefresh={handleRelatedNotesRefresh}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="code" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>使用示例代码</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">基础用法</h4>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import { AIAnalysisDashboard } from '@/components/ai';

<AIAnalysisDashboard
  noteId="note-001"
  analysisData={analysisData}
  layoutMode="tabs"
  editable={true}
  onSummaryEdit={handleEdit}
  onTagCreate={handleTagCreate}
  onRelatedNoteClick={handleNoteClick}
/>`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">单独使用组件</h4>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import { AISummaryCard, SmartTagManager } from '@/components/ai';

// AI摘要
<AISummaryCard
  summary="摘要内容"
  qualityScore={0.9}
  onEdit={handleEdit}
/>

// 标签管理
<SmartTagManager
  tags={tags}
  editable={true}
  onTagCreate={createTag}
/>`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 页脚信息 */}
      <Card className="mt-12">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
              所有AI组件已完全实现并测试
            </p>
            <div className="flex items-center justify-center space-x-4">
              <span>支持 TypeScript</span>
              <span>•</span>
              <span>响应式设计</span>
              <span>•</span>
              <span>可访问性优化</span>
              <span>•</span>
              <span>主题兼容</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}