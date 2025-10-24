/**
 * MindNote 统一类型定义
 *
 * 定义整个应用中使用的标准类型和接口
 * 确保类型安全和术语一致性
 *
 * Reference: docs/tech-stack-standards.md
 */

// =========================================================================
// 基础类型定义
// =========================================================================

/** 应用程序主题类型 */
export type Theme = 'light' | 'dark' | 'system';

/** 响应式断点类型 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** 布局密度类型 */
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';

/** 视图模式类型 */
export type ViewMode = 'grid' | 'list' | 'masonry';

/** 排序字段类型 */
export type SortField = 'updatedAt' | 'createdAt' | 'title' | 'wordCount';

/** 排序方向类型 */
export type SortOrder = 'asc' | 'desc';

/** 组件尺寸类型 */
export type ComponentSize = 'sm' | 'md' | 'lg';

/** 组件变体类型 */
export type ComponentVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive';

// =========================================================================
// 核心实体类型
// =========================================================================

/** 基础实体接口 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 标签实体 */
export interface Tag extends BaseEntity {
  name: string;
  color: string;
  usageCount: number;
}

/** 分类实体 */
export interface Category extends BaseEntity {
  name: string;
  color: string;
  icon?: string;
  description?: string;
}

/** 笔记实体 */
export interface Note extends BaseEntity {
  title: string;
  content: string;
  snippet?: string;
  categoryId?: string;
  category?: Category;
  tags: string[];
  status: NoteStatus;
  isPinned: boolean;
  isArchived: boolean;
  isPublic: boolean;
  viewCount: number;
  wordCount?: number;
  readingTime?: number;

  // AI相关字段
  aiProcessed: boolean;
  aiSummary?: string;
  aiKeywords?: string[];
  aiCategory?: string;
  aiSentiment?: SentimentType;
  aiAnalysisDate?: Date;
  aiRelevanceScore?: number;
}

/** 笔记状态类型 */
export type NoteStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** 情感分析类型 */
export type SentimentType = 'positive' | 'negative' | 'neutral';

// =========================================================================
// 搜索相关类型
// =========================================================================

/** 搜索过滤器接口 */
export interface SearchFilter {
  query: string;
  categoryId?: string;
  tags: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  isPinned?: boolean;
  isArchived?: boolean;
  status?: NoteStatus[];
  sentiment?: SentimentType[];
}

/** 搜索建议接口 */
export interface SearchSuggestion {
  id: string;
  text: string;
  type: SuggestionType;
  highlight?: string;
  metadata?: Record<string, any>;
}

/** 建议类型 */
export type SuggestionType = 'query' | 'note' | 'tag' | 'category';

/** 搜索结果接口 */
export interface SearchResult {
  id: string;
  title: string;
  content: string;
  snippet: string;
  score: number;
  highlights: string[];
  metadata: {
    category?: string;
    tags: string[];
    updatedAt: string;
    wordCount: number;
  };
}

// =========================================================================
// UI状态类型
// =========================================================================

/** 通知类型 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/** 通知接口 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** 加载状态接口 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

/** 编辑器状态接口 */
export interface EditorState {
  isDirty: boolean;
  isAutoSaving: boolean;
  lastSavedAt?: Date;
  cursorPosition?: number;
  selectionRange?: {
    start: number;
    end: number;
  };
  wordCount: number;
  readingTime: number;
}

/** 对话框配置接口 */
export interface DialogConfig {
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: ComponentVariant;
}

// =========================================================================
// API相关类型
// =========================================================================

/** API响应基础接口 */
export interface ApiResponse<T = any> {
  data: T;
  message: string;
  success: boolean;
  errors?: string[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

/** API错误接口 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/** 分页参数接口 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/** 分页响应接口 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =========================================================================
// 组件Props类型
// =========================================================================

/** 基础组件Props接口 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/** 交互组件Props接口 */
export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

/** 表单组件Props接口 */
export interface FormComponentProps extends BaseComponentProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
}

// =========================================================================
// 配置相关类型
// =========================================================================

/** 用户偏好设置接口 */
export interface UserPreferences {
  theme: Theme;
  layoutDensity: LayoutDensity;
  language: string;
  autoSave: boolean;
  autoSaveDelay: number;
  showMinimap: boolean;
  showRuler: boolean;
  defaultViewMode: ViewMode;
  defaultSortField: SortField;
  defaultSortOrder: SortOrder;
  notifications: NotificationSettings;
}

/** 通知设置接口 */
export interface NotificationSettings {
  email: boolean;
  desktop: boolean;
  aiInsights: boolean;
  security: boolean;
  weekly: boolean;
}

/** 应用配置接口 */
export interface AppConfig {
  apiBaseUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    aiAnalysis: boolean;
    semanticSearch: boolean;
    collaboration: boolean;
    export: boolean;
  };
  limits: {
    maxNotesPerUser: number;
    maxFileSize: number;
    maxTagsPerNote: number;
  };
}

// =========================================================================
// 工具类型
// =========================================================================

/** 可选字段类型 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** 必需字段类型 */
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/** 深度部分类型 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** 提取数组元素类型 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/** 排除空值类型 */
export type NonNullable<T> = T extends null | undefined ? never : T;

// =========================================================================
// 事件类型
// =========================================================================

/** 键盘事件类型 */
export type KeyboardEventHandler = (event: React.KeyboardEvent) => void;

/** 鼠标事件类型 */
export type MouseEventHandler = (event: React.MouseEvent) => void;

/** 表单事件类型 */
export type FormEventHandler = (event: React.FormEvent) => void;

/** 变更事件类型 */
export type ChangeEventHandler = (event: React.ChangeEvent) => void;

// =========================================================================
// 路由相关类型
// =========================================================================

/** 动态路由参数类型 */
export interface DynamicRouteParams {
  [key: string]: string | string[] | undefined;
}

/** 搜索参数类型 */
export interface SearchParams {
  [key: string]: string | string[] | undefined;
}

// =========================================================================
// 导出所有类型
// =========================================================================

export type {
  // Re-export commonly used types for convenience
  ComponentProps as ReactComponentProps,
  CSSProperties,
  ReactNode,
  ReactElement,
} from 'react';

// 默认导出
export default {
  // 基础类型
  Theme,
  Breakpoint,
  LayoutDensity,
  ViewMode,
  SortField,
  SortOrder,
  ComponentSize,
  ComponentVariant,

  // 实体类型
  Tag,
  Category,
  Note,
  BaseEntity,

  // API类型
  ApiResponse,
  ApiError,
  PaginationParams,
  PaginatedResponse,

  // UI类型
  Notification,
  LoadingState,
  EditorState,
  DialogConfig,

  // 配置类型
  UserPreferences,
  AppConfig,
};
