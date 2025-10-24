# MindNote 技术栈标准与规范

**版本**: v1.0.0 **更新日期**: 2025-10-24 **维护者**: MindNote Team

## 📋 概述

本文档定义了MindNote智能笔记应用的统一技术栈版本、术语标准、性能指标和开发规范。确保所有开发人员使用一致的技术标准和最佳实践。

## 🛠️ 核心技术栈

### 前端框架

- **Next.js**: `15.0.0` - React全栈框架
- **React**: `19.0.0` - 用户界面库
- **TypeScript**: `5.7.2` - 类型安全的JavaScript

### 样式系统

- **Tailwind CSS**: `3.4.15` - 原子化CSS框架
- **shadcn/ui**: `latest` - 基于Radix UI的组件库
- **PostCSS**: `8.4.49` - CSS处理工具
- **Autoprefixer**: `10.4.20` - CSS兼容性处理

### UI组件

- **Radix UI**: `^1.1.2 - ^2.2.6` - 无样式组件库
  - `@radix-ui/react-slot`: `^1.2.3`
  - `@radix-ui/react-dialog`: `^1.1.2`
  - `@radix-ui/react-dropdown-menu`: `^2.1.16`
  - `@radix-ui/react-tabs`: `^1.1.13`
  - `@radix-ui/react-progress`: `^1.1.7`
  - `@radix-ui/react-switch`: `^1.2.6`
  - 其他组件保持一致版本

### 状态管理

- **Zustand**: `^5.0.8` - 轻量级状态管理
- **Immer**: `^10.1.3` - 不可变状态更新

### 样式工具

- **clsx**: `^2.1.1` - 条件类名工具
- **tailwind-merge**: `^3.3.1` - Tailwind类名合并
- **class-variance-authority**: `^0.7.1` - 组件变体管理

### 动画与交互

- **Framer Motion**: `^12.23.24` - 动画库
- **tailwindcss-animate**: `^1.0.7` - Tailwind动画插件

### 主题系统

- **next-themes**: `^0.4.6` - 主题管理

### 图标

- **Lucide React**: `^0.547.0` - 统一图标库

### 数据层

- **Prisma**: `^5.22.0` - 数据库ORM
- **@prisma/client**: `^5.22.0` - Prisma客户端

### 开发工具

- **ESLint**: `^8.57.1` - 代码质量检查
- **Prettier**: `^3.3.3` - 代码格式化
- **TypeScript ESLint**: `^8.16.0` - TS代码检查

### 测试框架

- **Vitest**: `^1.0.0` - 单元测试框架
- **@testing-library/react**: `^16.0.1` - React测试工具
- **@testing-library/jest-dom**: `^6.6.3` - DOM断言扩展

### 包管理器

- **Bun**: `latest` - 快速JavaScript运行时和包管理器

## 🎨 设计系统标准

### 颜色系统

```css
/* 主色调 - Blue */
--color-primary-50: #eff6ff;
--color-primary-500: #3b82f6;
--color-primary-900: #1e3a8a;

/* 语义化颜色 */
--color-success-500: #22c55e;
--color-warning-500: #f59e0b;
--color-error-500: #ef4444;

/* 中性色 */
--color-neutral-0: #ffffff;
--color-neutral-950: #171717;
```

### 字体系统

```css
/* 字体族 */
--font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
--font-family-mono: ui-monospace, SFMono-Regular, 'SF Mono', Consolas;

/* 字体大小 - 流式排版 */
--font-size-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
--font-size-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
--font-size-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
--font-size-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
```

### 间距系统

```css
/* 8px 网格系统 */
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-4: 1rem; /* 16px */
--space-8: 2rem; /* 32px */
--space-16: 4rem; /* 64px */
```

### 断点系统

```css
/* 响应式断点 */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

## 📏 术语标准

### 组件命名

- **基础组件**: PascalCase (例: `Button`, `Input`, `Card`)
- **功能组件**: PascalCase (例: `NoteEditor`, `SearchBar`)
- **页面组件**: PascalCase (例: `NotesPage`, `SearchPage`)
- **Hook**: camelCase with `use` 前缀 (例: `useNote`, `useTheme`)
- **Store**: camelCase with `Store` 后缀 (例: `noteStore`, `uiStore`)

### 文件命名

- **组件文件**: kebab-case (例: `note-editor.tsx`, `search-bar.tsx`)
- **Hook文件**: camelCase (例: `useNote.ts`, `useTheme.ts`)
- **Store文件**: kebab-case (例: `note-store.ts`, `ui-store.ts`)
- **类型文件**: kebab-case (例: `note-types.ts`, `api-types.ts`)
- **工具文件**: kebab-case (例: `date-utils.ts`, `format-utils.ts`)

### CSS类名

- **Tailwind类名**: 使用官方命名规范
- **自定义类名**: BEM命名法 (例: `.card`, `.card__header`, `.card--large`)
- **状态类名**: 使用状态前缀 (例: `.is-active`, `.has-error`)

## ⚡ 性能标准

### Core Web Vitals

- **FCP (First Contentful Paint)**: < 1.5秒
- **LCP (Largest Contentful Paint)**: < 2.5秒
- **FID (First Input Delay)**: < 100毫秒
- **CLS (Cumulative Layout Shift)**: < 0.1

### 应用性能指标

- **页面加载时间**: < 2秒
- **交互响应时间**: < 100ms
- **动画帧率**: 60fps
- **内存使用**: < 50MB (桌面端)
- **包体积**: < 1MB (初始加载)

### 代码质量标准

- **TypeScript严格模式**: 启用
- **ESLint规则**: 0警告
- **测试覆盖率**: > 80%
- **Lighthouse评分**: > 90分

## 🔧 开发规范

### 代码风格

```typescript
// ✅ 好的实践
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const useNote = (id: string) => {
  const [note, setNote] = useState<Note | null>(null);
  // ...
};

// ❌ 避免的实践
interface note {
  id: any;
  title: string;
}

const usenote = id => {
  const [note, setNote] = useState({});
  // ...
};
```

### 组件结构

```typescript
// 组件文件结构
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ComponentProps {
  // props定义
}

export function Component({
  prop1,
  prop2,
  className
}: ComponentProps) {
  // Hooks
  const [state, setState] = useState()

  // Effects
  useEffect(() => {
    // side effects
  }, [])

  // Event handlers
  const handleClick = () => {
    // handle logic
  }

  return (
    <div className={cn('base-styles', className)}>
      {/* JSX content */}
    </div>
  )
}
```

### API设计规范

```typescript
// API响应类型
interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  errors?: string[];
}

// API函数
export const fetchNotes = async (): Promise<ApiResponse<Note[]>> => {
  try {
    const response = await fetch('/api/notes');
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch notes: ${error}`);
  }
};
```

## 🎯 状态管理模式

### Zustand Store结构

```typescript
interface StoreState {
  // State
  data: any[];
  loading: boolean;
  error: string | null;
}

interface StoreActions {
  // Actions
  setData: (data: any[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      // State
      data: [],
      loading: false,
      error: null,

      // Actions
      setData: data => set({ data }),
      setLoading: loading => set({ loading }),
      setError: error => set({ error }),
    }),
    {
      name: 'store-name',
      partialize: state => ({
        // 只持久化必要的状态
      }),
    },
  ),
);
```

## 🔒 安全标准

### 输入验证

- 所有用户输入必须经过验证
- 使用Zod进行运行时类型检查
- 防止XSS攻击的字符串处理

### API安全

- 使用CORS策略
- 实施速率限制
- 敏感数据加密存储

### 依赖安全

- 定期更新依赖包
- 使用npm audit检查漏洞
- 避免使用已知有安全问题的包

## 📱 浏览器兼容性

### 目标浏览器

- **Chrome**: 最新版本
- **Firefox**: 最新版本
- **Safari**: 最新版本
- **Edge**: 最新版本
- **移动端**: iOS Safari 12+, Chrome Mobile 80+

### Polyfill策略

- 使用Babel进行JSX转译
- 添加必要的polyfill
- 渐进式增强功能支持

## 🧪 测试策略

### 测试类型

- **单元测试**: 组件和工具函数
- **集成测试**: 组件交互和数据流
- **E2E测试**: 关键用户流程
- **可访问性测试**: WCAG 2.1 AA标准

### 测试覆盖率要求

- **核心组件**: 100%
- **工具函数**: 100%
- **页面组件**: > 80%
- **整体覆盖率**: > 80%

## 📦 构建与部署

### 构建优化

- 代码分割和懒加载
- Tree shaking优化
- 资源压缩和缓存
- 图片优化和WebP支持

### 环境配置

- **开发环境**: 本地开发和测试
- **预发环境**: 最终测试和验证
- **生产环境**: 正式发布环境

## 🔄 版本管理

### 语义化版本

- **主版本号**: 不兼容的API修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

### 分支策略

- **main**: 生产环境代码
- **develop**: 开发环境代码
- **feature/**: 功能开发分支
- **hotfix/**: 紧急修复分支

## 📚 相关文档

- [设计系统指南](./design-system.md)
- [组件库文档](./component-library.md)
- [API文档](./api-documentation.md)
- [部署指南](./deployment-guide.md)

---

**注意**: 本文档会随项目发展持续更新。所有技术人员必须遵循此标准进行开发工作。
