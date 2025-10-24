# Data Model & Schema Design

**Feature**: 产品UI/UX设计 **Branch**: 003-ui-ux **Phase**: Phase 1 - Design & Architecture
**Date**: 2025-10-24

## Overview

本文档定义了MindNote
UI/UX功能的数据模型、类型定义和接口规范。这些数据结构支持现代化的用户界面设计，包括主题系统、用户偏好、UI状态管理和AI功能集成。

## Core Data Models

### 1. 主题系统 (Theme System)

#### Theme Configuration

```typescript
interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark' | 'system';
  colors: ColorPalette;
  typography: TypographySettings;
  spacing: SpacingSettings;
  shadows: ShadowSettings;
  borderRadius: BorderRadiusSettings;
  transitions: TransitionSettings;
  customCSS?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ColorPalette {
  // 基础色彩
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  neutral: ColorScale;

  // 语义色彩
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;

  // 背景色彩
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    overlay: string;
  };

  // 文本色彩
  foreground: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };

  // 边框色彩
  border: {
    primary: string;
    secondary: string;
    focus: string;
    error: string;
  };
}

interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string; // 主色
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

interface TypographySettings {
  fontFamily: {
    sans: string[];
    mono: string[];
    serif?: string[];
  };
  fontSize: {
    xs: [string, CSSProperties];
    sm: [string, CSSProperties];
    base: [string, CSSProperties];
    lg: [string, CSSProperties];
    xl: [string, CSSProperties];
    '2xl': [string, CSSProperties];
    '3xl': [string, CSSProperties];
    '4xl': [string, CSSProperties];
    '5xl': [string, CSSProperties];
  };
  fontWeight: {
    thin: number;
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
}

interface SpacingSettings {
  scale: Record<string, string>;
  breakpoints: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  container: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

interface ShadowSettings {
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  none: string;
}

interface BorderRadiusSettings {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

interface TransitionSettings {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    linear: string;
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}
```

### 2. 用户偏好系统 (User Preferences)

#### User Preferences

```typescript
interface UserPreferences {
  userId: string;

  // 界面偏好
  interface: {
    theme: {
      mode: 'light' | 'dark' | 'system' | 'auto';
      selectedThemeId?: string;
      customTheme?: Theme;
    };
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };

  // 编辑器偏好
  editor: {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    maxWidth: number;
    autoFocus: boolean;
    autoSave: boolean;
    autoSaveDelay: number;
    spellCheck: boolean;
    wordWrap: boolean;
    showLineNumbers: boolean;
  };

  // 布局偏好
  layout: {
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    showMinimap: boolean;
    showRuler: boolean;
    density: 'compact' | 'normal' | 'comfortable';
  };

  // AI功能偏好
  ai: {
    autoAnalysis: boolean;
    suggestionFrequency: 'aggressive' | 'normal' | 'conservative';
    preferredProvider: string;
    analysisDepth: 'basic' | 'detailed' | 'comprehensive';
    voiceEnabled: boolean;
  };

  // 通知偏好
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  };

  // 快捷键偏好
  shortcuts: Record<string, string>;

  // 隐私偏好
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
    usageData: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 3. UI状态管理 (UI State Management)

#### Application State

```typescript
interface ApplicationState {
  // 全局状态
  global: {
    isLoading: boolean;
    isOnline: boolean;
    notifications: Notification[];
    modals: Modal[];
    toasts: Toast[];
  };

  // 用户界面状态
  ui: {
    activeView: 'dashboard' | 'notes' | 'search' | 'analytics' | 'settings';
    sidebarOpen: boolean;
    searchOpen: boolean;
    commandPaletteOpen: boolean;
    contextMenu: ContextMenu | null;

    // 分页状态
    pagination: {
      notes: PaginationState;
      search: PaginationState;
      analytics: PaginationState;
    };

    // 过滤和排序状态
    filters: {
      notes: NoteFilters;
      search: SearchFilters;
      analytics: AnalyticsFilters;
    };

    // 排序状态
    sort: {
      notes: SortState;
      search: SortState;
    };
  };

  // 编辑器状态
  editor: {
    activeNoteId: string | null;
    isDirty: boolean;
    isSaving: boolean;
    lastSavedAt: Date | null;
    wordCount: number;
    readingTime: number;

    // 选择状态
    selection: {
      text: string;
      range: Range;
    } | null;

    // 协作状态
    collaboration: {
      isActive: boolean;
      users: Collaborator[];
      changes: Change[];
    };
  };

  // 搜索状态
  search: {
    query: string;
    results: SearchResult[];
    isSearching: boolean;
    suggestions: SearchSuggestion[];
    history: string[];

    // 高级搜索状态
    advanced: {
      isOpen: boolean;
      filters: AdvancedSearchFilters;
    };
  };

  // AI分析状态
  ai: {
    isAnalyzing: boolean;
    analysis: AnalysisResult | null;
    suggestions: AISuggestion[];
    insights: AIInsight[];

    // 关系图谱状态
    graph: {
      nodes: GraphNode[];
      edges: GraphEdge[];
      layout: GraphLayout;
      selectedNode: string | null;
    };
  };
}

// 支持类型定义
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  action?: NotificationAction;
  createdAt: Date;
}

interface Modal {
  id: string;
  type: 'confirm' | 'alert' | 'prompt' | 'custom';
  title: string;
  content: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  onClose?: () => void;
}

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
}

interface ContextMenu {
  id: string;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface NoteFilters {
  category?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: 'draft' | 'published' | 'archived';
  author?: string;
}

interface SearchFilters {
  contentType?: 'note' | 'tag' | 'category';
  dateRange?: {
    start: Date;
    end: Date;
  };
  author?: string;
  hasAttachments?: boolean;
}

interface AnalyticsFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
  compareWith?: {
    start: Date;
    end: Date;
  };
}

interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

interface SearchResult {
  id: string;
  type: 'note' | 'tag' | 'category';
  title: string;
  excerpt: string;
  highlights: string[];
  score: number;
  metadata: Record<string, any>;
}

interface SearchSuggestion {
  text: string;
  type: 'query' | 'note' | 'tag';
  count?: number;
}

interface AdvancedSearchFilters {
  query: string;
  exactPhrase?: string;
  excludeWords?: string[];
  categories?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  author?: string;
  contentType?: string[];
}

interface AnalysisResult {
  id: string;
  noteId: string;
  category: string;
  tags: string[];
  sentiment: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  };
  keywords: Keyword[];
  summary: string;
  entities: Entity[];
  relationships: Relationship[];
  createdAt: Date;
}

interface AISuggestion {
  id: string;
  type: 'category' | 'tag' | 'link' | 'improvement';
  title: string;
  description: string;
  confidence: number;
  action: SuggestionAction;
}

interface AIInsight {
  id: string;
  type: 'pattern' | 'trend' | 'recommendation' | 'anomaly';
  title: string;
  description: string;
  data: any;
  visualizations: Visualization[];
}

interface GraphNode {
  id: string;
  label: string;
  type: 'note' | 'tag' | 'category' | 'concept';
  x: number;
  y: number;
  size: number;
  color: string;
  metadata: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'related' | 'tagged' | 'categorized' | 'referenced';
  weight: number;
  color: string;
}

interface GraphLayout {
  algorithm: 'force' | 'circular' | 'hierarchical' | 'grid';
  options: Record<string, any>;
}
```

### 4. 组件数据模型 (Component Data Models)

#### UI组件状态

```typescript
interface ComponentState {
  // 按钮组件
  button: {
    variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
    size: 'sm' | 'md' | 'lg';
    disabled: boolean;
    loading: boolean;
    iconPosition: 'left' | 'right';
  };

  // 输入组件
  input: {
    type: 'text' | 'email' | 'password' | 'search' | 'url';
    size: 'sm' | 'md' | 'lg';
    state: 'default' | 'error' | 'success';
    disabled: boolean;
    readonly: boolean;
    placeholder: string;
    value: string;
  };

  // 卡片组件
  card: {
    variant: 'default' | 'outlined' | 'elevated';
    padding: 'none' | 'sm' | 'md' | 'lg';
    interactive: boolean;
    selected: boolean;
  };

  // 对话框组件
  dialog: {
    open: boolean;
    size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closable: boolean;
    title: string;
    content: React.ReactNode;
  };

  // 标签页组件
  tabs: {
    activeTab: string;
    orientation: 'horizontal' | 'vertical';
    variant: 'default' | 'pills' | 'underline';
  };

  // 进度条组件
  progress: {
    value: number;
    max: number;
    size: 'sm' | 'md' | 'lg';
    variant: 'default' | 'success' | 'warning' | 'error';
    animated: boolean;
    showLabel: boolean;
  };
}
```

### 5. 性能监控数据模型

#### Performance Metrics

```typescript
interface PerformanceMetrics {
  // 页面性能
  page: {
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
  };

  // 组件性能
  component: {
    renderTime: number;
    updateCount: number;
    memoryUsage: number;
  };

  // 用户交互性能
  interaction: {
    clickResponseTime: number;
    scrollPerformance: number;
    typingLatency: number;
  };

  // 资源加载性能
  resources: {
    bundleSize: number;
    assetLoadTime: number;
    cacheHitRate: number;
  };

  // AI功能性能
  ai: {
    analysisTime: number;
    responseTime: number;
    accuracy: number;
  };

  timestamp: Date;
  sessionId: string;
  userId?: string;
}
```

## API接口规范

### 1. 主题管理API

#### GET /api/v1/themes

```typescript
// 获取可用主题列表
interface GetThemesResponse {
  themes: Theme[];
  defaultTheme: string;
  userTheme?: string;
}
```

#### POST /api/v1/themes

```typescript
// 创建自定义主题
interface CreateThemeRequest {
  name: string;
  baseThemeId?: string;
  colors: Partial<ColorPalette>;
  typography?: Partial<TypographySettings>;
  customCSS?: string;
}

interface CreateThemeResponse {
  theme: Theme;
}
```

#### PUT /api/v1/themes/:id

```typescript
// 更新主题
interface UpdateThemeRequest {
  name?: string;
  colors?: Partial<ColorPalette>;
  typography?: Partial<TypographySettings>;
  customCSS?: string;
}

interface UpdateThemeResponse {
  theme: Theme;
}
```

### 2. 用户偏好API

#### GET /api/v1/user/preferences

```typescript
// 获取用户偏好
interface GetUserPreferencesResponse {
  preferences: UserPreferences;
}
```

#### PUT /api/v1/user/preferences

```typescript
// 更新用户偏好
interface UpdateUserPreferencesRequest {
  interface?: Partial<UserPreferences['interface']>;
  editor?: Partial<UserPreferences['editor']>;
  layout?: Partial<UserPreferences['layout']>;
  ai?: Partial<UserPreferences['ai']>;
  notifications?: Partial<UserPreferences['notifications']>;
  shortcuts?: Record<string, string>;
  privacy?: Partial<UserPreferences['privacy']>;
}

interface UpdateUserPreferencesResponse {
  preferences: UserPreferences;
}
```

### 3. UI状态API

#### GET /api/v1/ui/state

```typescript
// 获取UI状态
interface GetUIStateResponse {
  state: ApplicationState;
}
```

#### POST /api/v1/ui/state

```typescript
// 更新UI状态
interface UpdateUIStateRequest {
  state: Partial<ApplicationState>;
}

interface UpdateUIStateResponse {
  state: ApplicationState;
}
```

### 4. 性能监控API

#### POST /api/v1/analytics/performance

```typescript
// 上报性能数据
interface ReportPerformanceRequest {
  metrics: PerformanceMetrics;
}

interface ReportPerformanceResponse {
  success: boolean;
  id: string;
}
```

## 数据库Schema扩展

### 1. 主题相关表

#### themes表

```sql
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  mode VARCHAR(20) NOT NULL DEFAULT 'system',
  colors JSONB NOT NULL DEFAULT '{}',
  typography JSONB NOT NULL DEFAULT '{}',
  spacing JSONB NOT NULL DEFAULT '{}',
  shadows JSONB NOT NULL DEFAULT '{}',
  borderRadius JSONB NOT NULL DEFAULT '{}',
  transitions JSONB NOT NULL DEFAULT '{}',
  custom_css TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### user_theme_preferences表

```sql
CREATE TABLE user_theme_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme_mode VARCHAR(20) NOT NULL DEFAULT 'system',
  selected_theme_id UUID REFERENCES themes(id),
  custom_colors JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 2. 用户偏好表

#### user_preferences表

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interface_preferences JSONB NOT NULL DEFAULT '{}',
  editor_preferences JSONB NOT NULL DEFAULT '{}',
  layout_preferences JSONB NOT NULL DEFAULT '{}',
  ai_preferences JSONB NOT NULL DEFAULT '{}',
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  shortcuts JSONB NOT NULL DEFAULT '{}',
  privacy_preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 3. UI状态表

#### ui_states表

```sql
CREATE TABLE ui_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  state_data JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_ui_states_user_session (user_id, session_id),
  INDEX idx_ui_states_expires (expires_at)
);
```

### 4. 性能监控表

#### performance_metrics表

```sql
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(255) NOT NULL,
  page_metrics JSONB NOT NULL DEFAULT '{}',
  component_metrics JSONB NOT NULL DEFAULT '{}',
  interaction_metrics JSONB NOT NULL DEFAULT '{}',
  resource_metrics JSONB NOT NULL DEFAULT '{}',
  ai_metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_performance_metrics_user (user_id),
  INDEX idx_performance_metrics_session (session_id),
  INDEX idx_performance_metrics_created (created_at)
);
```

## 状态管理架构

### 1. Zustand Store结构

#### 主题Store

```typescript
interface ThemeStore {
  // 状态
  currentTheme: Theme;
  mode: 'light' | 'dark' | 'system';
  customThemes: Theme[];

  // 动作
  setTheme: (theme: Theme) => void;
  setMode: (mode: 'light' | 'dark' | 'system') => void;
  createCustomTheme: (theme: Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomTheme: (id: string, updates: Partial<Theme>) => void;
  deleteCustomTheme: (id: string) => void;

  // 计算属性
  isDarkMode: boolean;
  effectiveTheme: Theme;
}
```

#### 用户偏好Store

```typescript
interface UserPreferencesStore {
  // 状态
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;

  // 动作
  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;

  // 偏好更新快捷方法
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: string) => void;
  setFontSize: (size: number) => void;
  toggleSidebar: () => void;
}
```

#### UI状态Store

```typescript
interface UIStateStore {
  // 状态
  activeView: string;
  sidebarOpen: boolean;
  searchOpen: boolean;
  notifications: Notification[];
  modals: Modal[];
  toasts: Toast[];

  // 动作
  setActiveView: (view: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;

  // 通知管理
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;

  // 模态框管理
  openModal: (modal: Omit<Modal, 'id'>) => void;
  closeModal: (id: string) => void;

  // Toast管理
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}
```

### 2. 状态持久化策略

#### LocalStorage持久化

```typescript
interface PersistedState {
  theme: {
    mode: 'light' | 'dark' | 'system';
    customThemeId?: string;
  };
  userPreferences: Omit<UserPreferences, 'userId' | 'createdAt' | 'updatedAt'>;
  uiState: {
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    lastActiveView: string;
  };
}
```

#### 服务端同步

```typescript
interface SyncableState {
  userPreferences: UserPreferences;
  customThemes: Theme[];
  performanceSettings: {
    analytics: boolean;
    crashReporting: boolean;
  };
}
```

## 数据验证规则

### 1. 主题数据验证

```typescript
const themeValidationSchema = z.object({
  name: z.string().min(1).max(100),
  mode: z.enum(['light', 'dark', 'system']),
  colors: z.object({
    primary: colorScaleSchema,
    secondary: colorScaleSchema,
    // ... 其他颜色
  }),
  typography: typographySchema.optional(),
  customCSS: z.string().max(10000).optional(),
});
```

### 2. 用户偏好验证

```typescript
const userPreferencesValidationSchema = z.object({
  interface: z.object({
    theme: z.object({
      mode: z.enum(['light', 'dark', 'system', 'auto']),
      selectedThemeId: z.string().uuid().optional(),
    }),
    language: z.string().min(2).max(10),
    timezone: z.string(),
  }),
  editor: z.object({
    fontSize: z.number().min(10).max(32),
    fontFamily: z.string(),
    autoSave: z.boolean(),
    autoSaveDelay: z.number().min(1000).max(300000),
  }),
});
```

## 性能优化策略

### 1. 数据加载优化

- 懒加载主题数据
- 缓存用户偏好设置
- 虚拟化大型列表数据
- 分页加载搜索结果

### 2. 状态更新优化

- 使用React.memo防止不必要重渲染
- 实现状态变更的批量更新
- 使用useDebounce优化频繁状态变更
- 实现选择性状态订阅

### 3. 存储优化

- 压缩localStorage数据
- 实现数据的增量同步
- 使用IndexedDB存储大量数据
- 定期清理过期数据

---

**文档完成日期**: 2025-10-24 **下一步**: 创建API契约文档和快速开始指南
