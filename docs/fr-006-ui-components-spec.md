# FR-006 AI功能UI组件设计规格

**分支**: `004-ai` | **日期**: 2025-01-25 | **相关任务**: T112-T114

**设计原则**: AI-native, 用户体验优先, 视觉一致性, 响应式设计

---

## 设计概述

MindNote的AI功能UI组件设计遵循"AI-first"原则，确保AI分析结果以直观、美观、易用的方式呈现给用户。所有组件都采用现代化设计语言，支持深色/浅色主题，并具备完全的响应式特性。

### 核心设计理念

1. **智能呈现**: AI分析结果应该一目了然，不需要用户思考
2. **渐进式披露**: 重要信息优先，详细信息按需展开
3. **视觉层次**: 使用色彩、大小、间距建立清晰的信息层次
4. **交互反馈**: 所有AI功能都应有清晰的加载状态和错误处理

---

## T112: AI摘要显示组件规格

### 组件名称: `AISummaryCard`

### 功能描述
显示AI生成的笔记摘要，支持展开/收起、编辑、质量评分等功能。

### 设计规格

#### 布局结构
```
┌─────────────────────────────────────┐
│ 🔍 AI智能摘要    [质量评分: 4.2/5]  │
├─────────────────────────────────────┤
│ 这是一个智能生成的笔记摘要，不超过100│
│ 字。支持点击展开查看完整内容...     │
│                                     │
│ [展开全部] [编辑] [重新生成] [更多]  │
└─────────────────────────────────────┘
```

#### 视觉设计
- **容器**: 圆角卡片，白色背景，浅灰阴影
- **标题栏**: 左侧AI图标 + 标题，右侧质量评分
- **内容区**: 16px行高，适合长时间阅读
- **操作栏**: 次要按钮样式，hover状态明显

#### 交互状态
- **加载状态**: 骨架屏 + 脉冲动画
- **错误状态**: 友好的错误提示 + 重试按钮
- **展开状态**: 平滑的高度变化动画
- **编辑模式**: 内联文本编辑器

#### 响应式规格
- **桌面版**: 最大宽度600px，居中显示
- **平板版**: 最大宽度500px，左右padding 20px
- **手机版**: 全宽，左右padding 16px，字体大小15px

### 技术规格

#### 组件接口
```typescript
interface AISummaryCardProps {
  summary: string;
  qualityScore?: number;
  isExpanded?: boolean;
  isLoading?: boolean;
  error?: string;
  onEdit?: (newSummary: string) => void;
  onRegenerate?: () => void;
  onToggleExpand?: () => void;
  maxPreviewLength?: number;
}
```

#### 状态管理
```typescript
interface SummaryState {
  text: string;
  isEditing: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  error: string | null;
  qualityScore: number;
  wordCount: number;
}
```

---

## T113: 智能标签显示组件规格

### 组件名称: `SmartTagCloud`

### 功能描述
显示AI生成的智能标签，支持编辑、删除、搜索、分类等功能。

### 设计规格

#### 色彩系统
```typescript
const TAG_COLORS = {
  technology: '#3B82F6',    // 蓝色 - 技术类
  business: '#10B981',      // 绿色 - 商业类
  education: '#F59E0B',     // 橙色 - 教育类
  lifestyle: '#EC4899',     // 粉色 - 生活类
  creative: '#8B5CF6',      // 紫色 - 创意类
  personal: '#6B7280',      // 灰色 - 个人类
  other: '#64748B'          // 中灰 - 其他类
};
```

#### 布局结构
```
┌─────────────────────────────────────┐
│ 🏷️ 智能标签    [添加标签] [管理]    │
├─────────────────────────────────────┤
│ [React] [Next.js] [TypeScript]     │
│ [前端开发] [AI] [Machine Learning]  │
│ [JavaScript] [Web开发]              │
│                                     │
│ 显示 7 个标签 | [编辑模式] [搜索]   │
└─────────────────────────────────────┘
```

#### 标签设计
- **形状**: 圆角矩形，6px圆角
- **尺寸**: 高度32px，内边距8px 12px
- **字体**: 14px，中等粗细
- **间距**: 标签间距6px，行间距12px
- **交互**: hover时轻微放大，点击时有涟漪效果

#### 交互功能
- **标签管理**: 点击编辑模式进入批量选择
- **快速搜索**: 点击搜索按钮过滤标签
- **标签统计**: hover显示标签使用频率
- **分类筛选**: 按颜色分类快速筛选

### 技术规格

#### 组件接口
```typescript
interface SmartTagCloudProps {
  tags: SmartTag[];
  editable?: boolean;
  maxDisplay?: number;
  showSearch?: boolean;
  showStatistics?: boolean;
  onTagAdd?: (tag: string) => void;
  onTagRemove?: (tagId: string) => void;
  onTagEdit?: (tagId: string, newTag: string) => void;
  onTagFilter?: (category: string) => void;
}

interface SmartTag {
  id: string;
  text: string;
  category: TagCategory;
  confidence: number;
  frequency: number;
  color: string;
}
```

---

## T114: 相关笔记推荐组件规格

### 组件名称: `RelatedNotesCard`

### 功能描述
基于向量相似度的相关笔记推荐，显示相似度评分和推荐理由。

### 设计规格

#### 布局结构
```
┌─────────────────────────────────────┐
│ 🔗 相关笔记推荐    [刷新] [设置]    │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 📄 学习React Hooks的心得      95% │ │
│ │ 相似原因: 都讨论React开发...   │ │
│ │ 更新于: 2天前               [→] │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 📄 TypeScript最佳实践        87% │ │
│ │ 相似原因: 技术主题相似...     │ │
│ │ 更新于: 1周前               [→] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 推荐算法: 向量相似度 | [反馈] [更多] │
└─────────────────────────────────────┘
```

#### 相似度可视化
- **相似度评分**: 圆形进度条，颜色从蓝到绿渐变
- **相似度范围**: 90%+(深绿), 80-89%(绿色), 70-79%(橙色), <70%(红色)
- **推荐理由**: 简短的文本说明相似原因
- **更新时间**: 相对时间显示

#### 交互功能
- **快速预览**: hover显示笔记预览卡片
- **一键跳转**: 点击箭头按钮跳转到相关笔记
- **反馈收集**: 👍/👎 按钮收集用户反馈
- **推荐设置**: 调整推荐算法参数

### 技术规格

#### 组件接口
```typescript
interface RelatedNotesCardProps {
  notes: RelatedNote[];
  isLoading?: boolean;
  algorithm: 'vector' | 'keyword' | 'hybrid';
  maxRecommendations?: number;
  showSimilarityScore?: boolean;
  showReason?: boolean;
  onRefresh?: () => void;
  onNoteClick?: (noteId: string) => void;
  onFeedback?: (noteId: string, feedback: 'positive' | 'negative') => void;
  onSettings?: () => void;
}

interface RelatedNote {
  id: string;
  title: string;
  summary: string;
  similarityScore: number;
  reason: string;
  lastModified: Date;
  thumbnail?: string;
}
```

---

## 通用设计系统

### 色彩规范
```css
:root {
  /* 主色调 */
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-900: #1e3a8a;

  /* 语义色彩 */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #06b6d4;

  /* 中性色 */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-500: #6b7280;
  --gray-900: #111827;
}
```

### 字体规范
```css
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
```

### 间距规范
```css
.space-1 { margin: 0.25rem; }
.space-2 { margin: 0.5rem; }
.space-4 { margin: 1rem; }
.space-6 { margin: 1.5rem; }
.space-8 { margin: 2rem; }
```

### 动画规范
```css
.transition-all { transition: all 0.2s ease-in-out; }
.transition-colors { transition: color 0.2s ease-in-out; }
.transition-transform { transition: transform 0.2s ease-in-out; }
```

---

## 响应式设计策略

### 断点系统
- **xs**: 0px - 639px (手机竖屏)
- **sm**: 640px - 767px (手机横屏/小平板)
- **md**: 768px - 1023px (平板)
- **lg**: 1024px - 1279px (小桌面)
- **xl**: 1280px+ (大桌面)

### 适配原则
1. **移动优先**: 基础样式针对手机设计
2. **渐进增强**: 大屏幕增加功能和信息密度
3. **触摸友好**: 移动端增大点击区域
4. **性能优化**: 移动端减少动画和阴影效果

---

## 可访问性设计

### WCAG 2.1 AA 标准
- **颜色对比度**: 文本对比度至少4.5:1
- **键盘导航**: 所有功能支持Tab键导航
- **屏幕阅读器**: 提供语义化HTML和ARIA标签
- **焦点指示**: 清晰的焦点状态样式

### 实现要点
```typescript
// 键盘导航支持
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleClick();
  }
};

// ARIA标签
<div
  role="button"
  tabIndex={0}
  aria-label="AI摘要卡片"
  aria-expanded={isExpanded}
  onKeyDown={handleKeyDown}
>
```

---

## 性能优化

### 组件懒加载
```typescript
// React.lazy + Suspense
const AISummaryCard = React.lazy(() => import('./AISummaryCard'));
const SmartTagCloud = React.lazy(() => import('./SmartTagCloud'));
const RelatedNotesCard = React.lazy(() => import('./RelatedNotesCard'));
```

### 虚拟化长列表
```typescript
// 对于大量标签或推荐笔记，使用react-window
import { FixedSizeList as List } from 'react-window';
```

### 图片优化
```typescript
// Next.js Image组件
<Image
  src={thumbnail}
  alt={title}
  width={80}
  height={60}
  placeholder="blur"
  loading="lazy"
/>
```

---

## 测试策略

### 单元测试
- 组件渲染测试
- 交互行为测试
- 状态管理测试
- 错误处理测试

### 集成测试
- 组件间数据流测试
- API集成测试
- 路由导航测试

### 视觉回归测试
- 多分辨率截图对比
- 主题切换测试
- 响应式布局测试

### 可访问性测试
- 键盘导航测试
- 屏幕阅读器测试
- 颜色对比度测试

---

## 实施计划

### 阶段1: 基础组件 (T112)
1. 创建 `AISummaryCard` 组件
2. 实现基础显示功能
3. 添加展开/收起交互
4. 集成质量评分显示

### 阶段2: 标签系统 (T113)
1. 实现 `SmartTagCloud` 组件
2. 创建色彩系统和分类
3. 添加标签管理功能
4. 实现搜索和统计

### 阶段3: 推荐系统 (T114)
1. 开发 `RelatedNotesCard` 组件
2. 实现相似度可视化
3. 添加反馈收集机制
4. 集成推荐算法

### 阶段4: 集成测试
1. 组件间集成测试
2. 响应式设计验证
3. 性能优化
4. 可访问性测试

---

## 验收标准

### 功能验收
- [ ] 所有AI分析结果正确显示
- [ ] 交互功能完整可用
- [ ] 错误处理机制完善
- [ ] 响应式设计适配所有设备

### 性能验收
- [ ] 组件渲染时间 < 100ms
- [ ] 交互响应时间 < 50ms
- [ ] 内存使用稳定
- [ ] 无内存泄漏

### 用户体验验收
- [ ] 界面直观易用
- [ ] 加载状态清晰
- [ ] 错误提示友好
- [ ] 可访问性标准达标

### 技术验收
- [ ] TypeScript类型定义完整
- [ ] 单元测试覆盖率 > 90%
- [ ] 代码质量检查通过
- [ ] 文档完整准确

---

这个设计规格为MindNote的AI功能UI组件提供了完整的设计指导，确保用户体验的一致性和功能的完整性。