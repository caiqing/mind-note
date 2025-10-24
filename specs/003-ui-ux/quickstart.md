# UI/UX Design Quick Start Guide

**Feature**: 产品UI/UX设计 **Branch**: 003-ui-ux **Phase**: Phase 1 - Design & Architecture
**Date**: 2025-10-24

## 概述

本快速开始指南为开发者提供了MindNote UI/UX设计功能的完整实施路径。基于shadcn/ui + Next.js 15 +
TypeScript的现代化技术栈，本指南将帮助您快速搭建和部署美观、高性能的用户界面。

## 前置条件

### 系统要求

- Node.js 20.0+
- npm 10.0+ 或 bun 1.0+
- Git 2.30+
- 现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)

### 开发工具推荐

- VS Code + 相关扩展
- Chrome DevTools
- React Developer Tools
- Tailwind CSS IntelliSense

## 快速开始

### 1. 环境准备

#### 安装依赖

```bash
# 安装UI组件库依赖
bun add @radix-ui/react-slot
bun add @radix-ui/react-dialog
bun add @radix-ui/react-dropdown-menu
bun add @radix-ui/react-tabs
bun add @radix-ui/react-progress
bun add @radix-ui/react-switch
bun add @radix-ui/react-scroll-area
bun add @radix-ui/react-separator
bun add @radix-ui/react-tooltip
bun add @radix-ui/react-select
bun add @radix-ui/react-checkbox

# 安装样式和动画库
bun add tailwindcss-animate
bun add class-variance-authority
bun add clsx
bun add tailwind-merge
bun add lucide-react
bun add framer-motion

# 安装状态管理
bun add zustand
bun add immer

# 安装开发依赖
bun add -D @types/node
bun add -D @types/react
bun add -D @types/react-dom
```

#### 配置TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 配置Tailwind CSS

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### 2. 项目结构设置

#### 创建目录结构

```bash
mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/features
mkdir -p src/lib/styles
mkdir -p src/lib/hooks
mkdir -p src/lib/constants
mkdir -p src/types
mkdir -p tests/components
mkdir -p tests/e2e
```

#### 配置CSS变量

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### 3. 核心组件实现

#### 工具函数库

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 主题相关工具函数
export function getTheme(): 'light' | 'dark' | 'system' {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  }
  return 'system';
}

export function setTheme(theme: 'light' | 'dark' | 'system') {
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  }
}

export function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (typeof window !== 'undefined') {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }
}
```

#### 主题Provider

```typescript
// src/components/providers/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

#### 基础UI组件

```typescript
// src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

```typescript
// src/components/ui/card.tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

### 4. 状态管理设置

#### 主题Store

```typescript
// src/lib/stores/theme-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: theme => set({ theme }),
      toggleTheme: () => {
        const currentTheme = get().theme;
        set({
          theme: currentTheme === 'light' ? 'dark' : 'light',
        });
      },
    }),
    {
      name: 'theme-store',
      partialize: state => ({ theme: state.theme }),
    },
  ),
);
```

#### UI状态Store

```typescript
// src/lib/stores/ui-store.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  searchOpen: boolean;
  activeView: 'dashboard' | 'notes' | 'search' | 'analytics' | 'settings';

  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setActiveView: (view: UIState['activeView']) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>(set => ({
  sidebarOpen: true,
  searchOpen: false,
  activeView: 'dashboard',

  setSidebarOpen: open => set({ sidebarOpen: open }),
  setSearchOpen: open => set({ searchOpen: open }),
  setActiveView: view => set({ activeView: view }),
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

### 5. 布局组件实现

#### 主布局

```typescript
// src/components/layout/main-layout.tsx
'use client'

import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { useUIStore } from '@/lib/stores/ui-store'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-16'
      }`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

#### 侧边栏

```typescript
// src/components/layout/sidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/stores/ui-store'
import {
  LayoutDashboardIcon,
  FileTextIcon,
  SearchIcon,
  BarChart3Icon,
  SettingsIcon,
  MenuIcon,
  XIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboardIcon },
  { name: '笔记', href: '/notes', icon: FileTextIcon },
  { name: '搜索', href: '/search', icon: SearchIcon },
  { name: '分析', href: '/analytics', icon: BarChart3Icon },
  { name: '设置', href: '/settings', icon: SettingsIcon },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { sidebarOpen } = useUIStore()
  const pathname = usePathname()

  if (!sidebarOpen) return null

  return (
    <div className={cn(
      "fixed left-0 top-0 h-full bg-card border-r border-border z-30 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <h1 className="text-lg font-semibold">MindNote</h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <MenuIcon className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {!collapsed && item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
```

### 6. 功能组件实现

#### 搜索栏组件

```typescript
// src/components/features/search/search-bar.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/lib/stores/ui-store'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const router = useRouter()
  const { searchOpen, setSearchOpen } = useUIStore()

  useEffect(() => {
    if (query.length > 2) {
      // 模拟搜索建议
      const mockSuggestions = [
        `${query} - 相关笔记1`,
        `${query} - 相关笔记2`,
        `${query} - 相关笔记3`
      ]
      setSuggestions(mockSuggestions)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [query])

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSuggestions(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setSearchOpen(false)
    }
  }

  if (!searchOpen) return null

  return (
    <div className="absolute top-16 left-0 right-0 z-50 bg-background border-b border-border shadow-lg">
      <div className="max-w-4xl mx-auto p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索笔记、标签或内容..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2"
            onClick={() => setSearchOpen(false)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-2 bg-popover border border-border rounded-md shadow-lg">
            <ul className="py-2">
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <button
                    className="w-full px-4 py-2 text-left hover:bg-accent text-sm"
                    onClick={() => handleSearch(suggestion.replace(' - 相关笔记', ''))}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
```

#### 主题切换器

```typescript
// src/components/features/theme/theme-switcher.tsx
'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <SunIcon className="mr-2 h-4 w-4" />
          <span>浅色</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <MoonIcon className="mr-2 h-4 w-4" />
          <span>深色</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <MonitorIcon className="mr-2 h-4 w-4" />
          <span>跟随系统</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### 7. 页面组件实现

#### 仪表盘页面

```typescript
// src/app/dashboard/page.tsx
'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/lib/stores/ui-store'
import { FileTextIcon, TrendingUpIcon, UsersIcon, ActivityIcon } from 'lucide-react'

export default function DashboardPage() {
  const { setActiveView } = useUIStore()

  useEffect(() => {
    setActiveView('dashboard')
  }, [setActiveView])

  const stats = [
    {
      title: "总笔记数",
      value: "234",
      description: "较上月增长 12%",
      icon: FileTextIcon,
      change: "+12%"
    },
    {
      title: "本周新增",
      value: "18",
      description: "日均新增 2.5 个",
      icon: TrendingUpIcon,
      change: "+8%"
    },
    {
      title: "活跃标签",
      value: "42",
      description: "使用最多的标签",
      icon: UsersIcon,
      change: "+5%"
    },
    {
      title: "AI分析",
      value: "89%",
      description: "AI覆盖率",
      icon: ActivityIcon,
      change: "+15%"
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground">
            欢迎回来！这是您的笔记管理概览。
          </p>
        </div>
        <Button>
          <FileTextIcon className="mr-2 h-4 w-4" />
          新建笔记
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              <div className="mt-2 text-xs text-green-600">
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近笔记</CardTitle>
            <CardDescription>
              您最近编辑的笔记
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <FileTextIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      笔记标题 {i}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      2 小时前
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>
              常用功能快速入口
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <FileTextIcon className="mr-2 h-4 w-4" />
                新建笔记
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <SearchIcon className="mr-2 h-4 w-4" />
                搜索笔记
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUpIcon className="mr-2 h-4 w-4" />
                查看统计
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### 8. 启动应用

#### 更新根布局

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { MainLayout } from '@/components/layout/main-layout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MindNote - 智能笔记管理',
  description: 'AI驱动的智能笔记管理应用',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MainLayout>
            {children}
          </MainLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

#### 更新主页面

```typescript
// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

### 9. 测试设置

#### Jest配置

```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
};

module.exports = createJestConfig(customJestConfig);
```

#### Jest设置

```javascript
// jest.setup.js
import '@testing-library/jest-dom';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }) => children,
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

## 开发工作流

### 1. 开发命令

```bash
# 启动开发服务器
bun run dev

# 构建生产版本
bun run build

# 启动生产服务器
bun run start

# 运行测试
bun run test

# 运行类型检查
bun run type-check

# 代码格式化
bun run format

# 代码检查
bun run lint
```

### 2. 组件开发流程

1. 在 `src/components/ui/` 中创建基础组件
2. 在 `src/components/features/` 中创建功能组件
3. 编写组件测试文件
4. 更新Storybook文档
5. 提交代码审查

### 3. 主题定制流程

1. 在 `src/styles/tokens.css` 中定义设计令牌
2. 更新 `tailwind.config.js` 配置
3. 在组件中使用主题变量
4. 测试深色/浅色主题切换
5. 优化响应式设计

### 4. 性能优化清单

- [ ] 实现代码分割
- [ ] 优化图片加载
- [ ] 使用React.memo优化渲染
- [ ] 实现虚拟化长列表
- [ ] 配置缓存策略
- [ ] 监控性能指标

## 部署指南

### 1. Vercel部署

```bash
# 安装Vercel CLI
bun add -D vercel

# 本地预览
vercel

# 部署到生产环境
vercel --prod
```

### 2. 环境变量配置

```bash
# .env.local
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://your-api.vercel.app
```

### 3. 性能监控

- 配置Vercel Analytics
- 设置错误监控（Sentry）
- 配置性能监控（Web Vitals）

## 故障排除

### 常见问题

#### 1. 样式不生效

- 检查Tailwind CSS配置
- 确认CSS变量定义
- 验证类名拼写

#### 2. 主题切换失败

- 检查ThemeProvider配置
- 验证localStorage权限
- 确认CSS变量设置

#### 3. 组件渲染错误

- 检查TypeScript类型
- 验证props传递
- 查看控制台错误

### 调试技巧

1. 使用React Developer Tools
2. 检查网络请求
3. 使用console.log调试
4. 分析性能面板
5. 检查可访问性工具

## 下一步

1. **完善组件库**: 添加更多UI组件
2. **AI功能集成**: 集成AI分析功能
3. **响应式优化**: 完善移动端适配
4. **性能优化**: 实现代码分割和懒加载
5. **测试完善**: 提高测试覆盖率

---

**指南完成日期**: 2025-10-24 **预计开发时间**: 2-4周 **下一步**: 创建开发任务列表
