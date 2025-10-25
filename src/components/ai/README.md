# AI组件库

MindNote智能笔记应用的AI分析功能组件库，提供完整的AI摘要、智能标签和相关笔记推荐功能。

## 组件概览

### 🎯 核心组件

1. **AIAnalysisDashboard** - AI分析仪表板（集成组件）
2. **AISummaryCard** - AI智能摘要卡片
3. **SmartTagManager** - 智能标签管理器
4. **RelatedNotesRecommendation** - 相关笔记推荐

### ✨ 功能特性

- 🎨 **美观的UI设计** - 现代化的界面，支持主题切换
- 📱 **响应式布局** - 完美适配桌面和移动设备
- ♿ **可访问性优化** - 遵循WCAG标准，支持键盘导航
- 🔧 **高度可定制** - 丰富的配置选项和回调函数
- 🚀 **性能优化** - 使用React.memo和useCallback优化渲染性能
- 📊 **数据可视化** - 直观的相似度、质量评分等可视化展示
- 🔄 **实时交互** - 支持实时编辑、反馈和状态更新

## 安装和依赖

确保项目中已安装以下依赖：

```bash
npm install @radix-ui/react-alert-dialog \
              @radix-ui/react-checkbox \
              @radix-ui/react-collapsible \
              @radix-ui/react-dialog \
              @radix-ui/react-dropdown-menu \
              @radix-ui/react-label \
              @radix-ui/react-progress \
              @radix-ui/react-scroll-area \
              @radix-ui/react-select \
              @radix-ui/react-separator \
              @radix-ui/react-slot \
              @radix-ui/react-switch \
              @radix-ui/react-tabs \
              @radix-ui/react-toast \
              @radix-ui/react-tooltip \
              clsx \
              tailwind-merge \
              lucide-react \
              sonner
```

## 基础用法

### 1. AI分析仪表板（推荐）

最简单的使用方式是使用集成的AI分析仪表板：

```typescript
import { AIAnalysisDashboard } from '@/components/ai';

function NoteDetailPage({ noteId }: { noteId: string }) {
  const [analysisData, setAnalysisData] = useState<AIAnalysisData>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSummaryEdit = async (newSummary: string) => {
    // 处理摘要编辑
    console.log('Updated summary:', newSummary);
  };

  const handleTagCreate = async (tagData: Omit<SmartTag, 'id' | 'createdAt' | 'usageCount'>) => {
    // 处理标签创建
    return await createTag(tagData);
  };

  const handleRelatedNoteClick = (note: RelatedNote) => {
    // 处理相关笔记点击
    router.push(`/notes/${note.id}`);
  };

  return (
    <AIAnalysisDashboard
      noteId={noteId}
      analysisData={analysisData}
      isLoading={isLoading}
      layoutMode="tabs"
      editable={true}
      visiblePanels={['summary', 'tags', 'recommendations', 'analytics']}
      onSummaryEdit={handleSummaryEdit}
      onTagCreate={handleTagCreate}
      onRelatedNoteClick={handleRelatedNoteClick}
      onAnalysisRefresh={async () => {
        setIsLoading(true);
        const data = await refreshAnalysis(noteId);
        setAnalysisData(data);
        setIsLoading(false);
      }}
    />
  );
}
```

### 2. 单独使用组件

你也可以单独使用各个组件：

#### AI摘要卡片

```typescript
import { AISummaryCard } from '@/components/ai';

<AISummaryCard
  summary="这是一个AI生成的摘要内容..."
  style="paragraph"
  length={150}
  qualityScore={0.92}
  generatedAt="2024-10-25T10:30:00Z"
  provider="Claude-3.5-Sonnet"
  originalLength={1250}
  keyPoints={["关键点1", "关键点2", "关键点3"]}
  editable={true}
  onEdit={async (newSummary) => {
    await updateSummary(newSummary);
  }}
  onFeedback={(type, rating) => {
    console.log('User feedback:', type, rating);
  }}
  onRegenerate={async () => {
    const newSummary = await regenerateSummary();
    setSummary(newSummary);
  }}
/>
```

#### 智能标签管理器

```typescript
import { SmartTagManager } from '@/components/ai';

<SmartTagManager
  tags={tags}
  editable={true}
  showStats={true}
  showFilter={true}
  maxDisplay={20}
  onTagCreate={async (tagData) => {
    const newTag = await createTag(tagData);
    return newTag;
  }}
  onTagUpdate={async (id, updates) => {
    await updateTag(id, updates);
  }}
  onTagDelete={async (id) => {
    await deleteTag(id);
  }}
  onTagClick={(tag) => {
    // 处理标签点击，比如过滤笔记
    filterNotesByTag(tag);
  }}
/>
```

#### 相关笔记推荐

```typescript
import { RelatedNotesRecommendation } from '@/components/ai';

<RelatedNotesRecommendation
  currentNoteId="note-001"
  recommendedNotes={relatedNotes}
  maxDisplay={5}
  showSimilarityVisualization={true}
  showRecommendationReasons={true}
  allowFeedback={true}
  algorithmType="hybrid"
  sortBy="similarity"
  onNoteClick={(note) => {
    router.push(`/notes/${note.id}`);
  }}
  onFeedback={async (noteId, feedback) => {
    await recordFeedback(noteId, feedback);
  }}
  onBookmark={async (noteId, bookmarked) => {
    await toggleBookmark(noteId, bookmarked);
  }}
/>
```

## 数据类型

### AIAnalysisData

```typescript
interface AIAnalysisData {
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
  tags?: SmartTag[];
  relatedNotes?: RelatedNote[];
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
```

### SmartTag

```typescript
interface SmartTag {
  id: string;
  name: string;
  type: 'category' | 'topic' | 'emotion' | 'priority' | 'custom';
  color: string;
  weight: number;
  usageCount: number;
  createdAt: string;
  lastUsedAt?: string;
  description?: string;
  isSystem?: boolean;
  isFavorite?: boolean;
  noteCount?: number;
  confidence?: number;
}
```

### RelatedNote

```typescript
interface RelatedNote {
  id: string;
  title: string;
  summary: string;
  similarityScore: number;
  recommendationReasons: RecommendationReason[];
  commonTags: string[];
  commonKeywords: string[];
  type: 'note' | 'article' | 'task' | 'idea' | 'research';
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  isBookmarked?: boolean;
  isViewed?: boolean;
  userFeedback?: 'positive' | 'negative' | null;
  estimatedReadTime: number;
  relevanceStrength: 'high' | 'medium' | 'low';
}
```

## 高级配置

### 布局模式

AI分析仪表板支持三种布局模式：

```typescript
<AIAnalysisDashboard
  layoutMode="tabs"        // 标签页布局（默认）
  // layoutMode="grid"     // 网格布局
  // layoutMode="accordion" // 手风琴布局
/>
```

### 紧凑模式

```typescript
<AIAnalysisDashboard
  compactMode={true}
  // 在紧凑模式下，统计信息和详细选项会被隐藏
/>
```

### 自定义可见面板

```typescript
<AIAnalysisDashboard
  visiblePanels={['summary', 'tags']} // 只显示摘要和标签
  // visiblePanels={['summary', 'tags', 'recommendations', 'analytics']} // 显示全部（默认）
/>
```

### 推荐算法配置

```typescript
<RelatedNotesRecommendation
  algorithmType="semantic"        // 语义相似度
  // algorithmType="collaborative"  // 协同过滤
  // algorithmType="content-based"  // 基于内容
  // algorithmType="hybrid"         // 混合算法（默认）
  sortBy="similarity"              // 按相似度排序
  // sortBy="relevance"             // 按相关性排序
  // sortBy="recent"                // 按时间排序
  // sortBy="popular"               // 按热度排序
/>
```

## 样式定制

### 使用CSS变量

组件使用Tailwind CSS，可以通过修改CSS变量来定制样式：

```css
:root {
  /* 自定义AI组件的颜色 */
  --ai-primary: #3b82f6;
  --ai-secondary: #10b981;
  --ai-accent: #8b5cf6;

  /* 自定义相似度颜色 */
  --similarity-high: #10b981;
  --similarity-medium: #eab308;
  --similarity-low: #6b7280;
}
```

### 覆盖组件样式

```css
/* 自定义AI摘要卡片样式 */
.ai-summary-card {
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* 自定义标签颜色 */
.smart-tag-high-priority {
  background-color: #fef2f2;
  color: #dc2626;
  border-color: #fca5a5;
}
```

## 最佳实践

### 1. 数据缓存

```typescript
// 使用React Query或SWR进行数据缓存
import { useQuery } from '@tanstack/react-query';

function useAnalysisData(noteId: string) {
  return useQuery({
    queryKey: ['analysis', noteId],
    queryFn: () => fetchAnalysisData(noteId),
    staleTime: 5 * 60 * 1000, // 5分钟
    cacheTime: 10 * 60 * 1000, // 10分钟
  });
}
```

### 2. 错误处理

```typescript
<AIAnalysisDashboard
  analysisData={analysisData}
  onAnalysisRefresh={async () => {
    try {
      const data = await refreshAnalysis(noteId);
      setAnalysisData(data);
      toast.success('分析已刷新');
    } catch (error) {
      console.error('Failed to refresh analysis:', error);
      toast.error('刷新失败，请重试');
    }
  }}
/>
```

### 3. 性能优化

```typescript
import { memo, useCallback } from 'react';

const MemoizedAIDashboard = memo(AIAnalysisDashboard);

function NotePage({ noteId }: { noteId: string }) {
  const handleSummaryEdit = useCallback(async (newSummary: string) => {
    await updateSummary(noteId, newSummary);
  }, [noteId]);

  return (
    <MemoizedAIDashboard
      noteId={noteId}
      analysisData={analysisData}
      onSummaryEdit={handleSummaryEdit}
    />
  );
}
```

### 4. 无障碍访问

```typescript
<AIAnalysisDashboard
  // 确保所有交互元素都有适当的ARIA标签
  aria-label="AI分析结果"
  // 支持键盘导航
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // 处理键盘激活
    }
  }}
/>
```

## 示例页面

完整的示例页面可以在 `/pages/demo/ai-components-demo.tsx` 中查看。

## 贡献指南

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

MIT License

## 支持

如果你在使用过程中遇到问题，请：

1. 查看示例代码
2. 检查控制台错误信息
3. 提交Issue到项目仓库
4. 联系开发团队

---

**注意**: 这些组件设计为与MindNote的AI服务后端配合使用。确保你的后端API提供了相应的数据格式。