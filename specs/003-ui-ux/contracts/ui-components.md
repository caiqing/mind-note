# UI Components Contract

**Feature**: 产品UI/UX设计 **Branch**: 003-ui-ux **Phase**: Phase 1 - Design & Architecture
**Date**: 2025-10-24

## Overview

本文档定义了MindNote
UI组件库的接口规范、设计契约和组件标准。所有UI组件必须遵循这些契约以确保一致性、可维护性和可访问性。

## 组件设计原则

### 1. 设计原则

- **一致性 (Consistency)**: 所有组件遵循统一的设计语言
- **可访问性 (Accessibility)**: 符合WCAG 2.1 AA标准
- **可复用性 (Reusability)**: 组件可在不同上下文中使用
- **可组合性 (Composability)**: 小组件可组合成大组件
- **可定制性 (Customizability)**: 支持主题定制和样式覆盖

### 2. API设计原则

- **简洁性**: 最小化必需的props
- **直观性**: prop名称直观易懂
- **一致性**: 相似功能使用相同的prop名称
- **扩展性**: 预留扩展接口
- **向后兼容**: 新版本保持向后兼容

## 基础组件契约

### 1. Button 组件

#### 接口定义

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
  children: React.ReactNode;
}

interface ButtonVariants {
  variant: {
    primary: string;
    secondary: string;
    outline: string;
    ghost: string;
    link: string;
    destructive: string;
  };
  size: {
    sm: string;
    md: string;
    lg: string;
    icon: string;
  };
}
```

#### 使用示例

```typescript
// 基础用法
<Button>Click me</Button>

// 带变体和大小
<Button variant="primary" size="lg">Large Button</Button>

// 带图标
<Button leftIcon={<PlusIcon />} size="sm">Add Item</Button>

// 加载状态
<Button loading={isLoading} disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>

// 自定义样式
<Button className="custom-button" variant="outline">
  Custom Button
</Button>
```

#### 可访问性要求

- 必须支持键盘导航
- 必须有适当的ARIA标签
- 必须支持屏幕阅读器
- 必须有足够的颜色对比度
- 必须有焦点指示器

### 2. Input 组件

#### 接口定义

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

interface InputVariants {
  variant: {
    default: string;
    filled: string;
    outlined: string;
  };
  size: {
    sm: string;
    md: string;
    lg: string;
  };
}
```

#### 使用示例

```typescript
// 基础用法
<Input placeholder="Enter your name" />

// 带标签和描述
<Input
  label="Email Address"
  description="We'll never share your email with anyone else."
  type="email"
  required
/>

// 错误状态
<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
  required
/>

// 成功状态
<Input
  label="Username"
  success="Username is available"
  value={username}
  onChange={setUsername}
/>

// 带图标
<Input
  leftIcon={<SearchIcon />}
  placeholder="Search..."
  size="lg"
/>
```

#### 验证规则

- 必须支持HTML5验证属性
- 必须显示实时验证反馈
- 必须有清晰的错误信息
- 必须标记必填字段

### 3. Card 组件

#### 接口定义

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  selected?: boolean;
  asChild?: boolean;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
```

#### 使用示例

```typescript
// 基础卡片
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>

// 交互式卡片
<Card variant="outlined" interactive>
  <CardHeader>
    <CardTitle>Note Title</CardTitle>
    <CardAction>
      <Button variant="ghost" size="icon">
        <MoreHorizontalIcon />
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <p>Note preview content...</p>
  </CardContent>
  <CardFooter>
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">2 hours ago</span>
      <Badge variant="secondary">Personal</Badge>
    </div>
  </CardFooter>
</Card>
```

### 4. Dialog 组件

#### 接口定义

```typescript
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  showCloseButton?: boolean;
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
```

#### 使用示例

```typescript
// 基础对话框
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you absolutely sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone. This will permanently delete your account
        and remove your data from our servers.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// 大尺寸对话框
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent size="lg" showCloseButton>
    <DialogHeader>
      <DialogTitle>Create New Note</DialogTitle>
    </DialogHeader>
    <NoteEditor onSave={handleSave} />
  </DialogContent>
</Dialog>
```

#### 可访问性要求

- 必须支持焦点管理
- 必须支持ESC键关闭
- 必须有适当的ARIA角色
- 必须支持屏幕阅读器
- 必须有焦点陷阱

### 5. Tabs 组件

#### 接口定义

```typescript
interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children: React.ReactNode;
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'pills' | 'underline';
}

interface TabsTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}
```

#### 使用示例

```typescript
// 基础标签页
<Tabs defaultValue="account" className="w-[400px]">
  <TabsList variant="underline">
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    <AccountSettings />
  </TabsContent>
  <TabsContent value="password">
    <PasswordSettings />
  </TabsContent>
  <TabsContent value="notifications">
    <NotificationSettings />
  </TabsContent>
</Tabs>

// 垂直标签页
<Tabs orientation="vertical" defaultValue="general">
  <div className="flex gap-4">
    <TabsList variant="pills" className="flex-col">
      <TabsTrigger value="general">General</TabsTrigger>
      <TabsTrigger value="appearance">Appearance</TabsTrigger>
      <TabsTrigger value="advanced">Advanced</TabsTrigger>
    </TabsList>
    <div className="flex-1">
      <TabsContent value="general">
        <GeneralSettings />
      </TabsContent>
      <TabsContent value="appearance">
        <AppearanceSettings />
      </TabsContent>
      <TabsContent value="advanced">
        <AdvancedSettings />
      </TabsContent>
    </div>
  </div>
</Tabs>
```

### 6. Progress 组件

#### 接口定义

```typescript
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
  showLabel?: boolean;
  labelFormat?: (value: number, max: number) => string;
}

interface ProgressVariants {
  size: {
    sm: string;
    md: string;
    lg: string;
  };
  variant: {
    default: string;
    success: string;
    warning: string;
    error: string;
  };
}
```

#### 使用示例

```typescript
// 基础进度条
<Progress value={75} />

// 带标签的进度条
<Progress value={60} showLabel />

// 自定义大小和变体
<Progress
  value={40}
  size="lg"
  variant="warning"
  animated
  showLabel
/>

// 自定义标签格式
<Progress
  value={uploadProgress}
  max={totalSize}
  showLabel
  labelFormat={(value, max) => `${Math.round((value / max) * 100)}%`}
/>
```

## 复合组件契约

### 1. SearchBar 组件

#### 接口定义

```typescript
interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'filled';
  showAdvanced?: boolean;
  suggestions?: SearchSuggestion[];
  loading?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'note' | 'tag' | 'category';
  highlight?: string;
  metadata?: Record<string, any>;
}
```

#### 使用示例

```typescript
// 基础搜索栏
<SearchBar
  placeholder="Search notes..."
  value={searchQuery}
  onChange={setSearchQuery}
  onSubmit={handleSearch}
/>

// 带建议的搜索栏
<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  suggestions={suggestions}
  showAdvanced
  size="lg"
/>

// 带加载状态
<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  loading={isSearching}
  disabled={isLoading}
/>
```

### 2. NoteEditor 组件

#### 接口定义

```typescript
interface NoteEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onSave?: (content: string) => void;
  onAutoSave?: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
  maxLength?: number;
  showWordCount?: boolean;
  showReadingTime?: boolean;
  toolbar?: ToolbarConfig;
  aiSuggestions?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

interface ToolbarConfig {
  show?: boolean;
  position?: 'top' | 'bottom' | 'floating';
  items?: ToolbarItem[];
}

interface ToolbarItem {
  type: 'button' | 'separator' | 'dropdown';
  id: string;
  label?: string;
  icon?: React.ReactNode;
  action?: () => void;
  items?: ToolbarItem[];
}
```

#### 使用示例

```typescript
// 基础编辑器
<NoteEditor
  value={content}
  onChange={setContent}
  onSave={handleSave}
  placeholder="Start writing..."
  autoSave
/>

// 高级编辑器
<NoteEditor
  value={content}
  onChange={setContent}
  onSave={handleSave}
  showWordCount
  showReadingTime
  aiSuggestions
  toolbar={{
    show: true,
    position: 'floating',
    items: [
      { type: 'button', id: 'bold', icon: <BoldIcon />, action: () => {} },
      { type: 'button', id: 'italic', icon: <ItalicIcon />, action: () => {} },
      { type: 'separator', id: 'sep1' },
      { type: 'dropdown', id: 'format', label: 'Format', items: [] }
    ]
  }}
/>
```

### 3. ThemeSwitcher 组件

#### 接口定义

```typescript
interface ThemeSwitcherProps {
  value?: 'light' | 'dark' | 'system';
  onChange?: (theme: 'light' | 'dark' | 'system') => void;
  variant?: 'toggle' | 'dropdown' | 'switch';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  disabled?: boolean;
}

interface ThemeOption {
  value: 'light' | 'dark' | 'system';
  label: string;
  icon: React.ReactNode;
  description?: string;
}
```

#### 使用示例

```typescript
// 切换按钮
<ThemeSwitcher
  value={theme}
  onChange={setTheme}
  variant="toggle"
  showLabel
/>

// 下拉选择器
<ThemeSwitcher
  value={theme}
  onChange={setTheme}
  variant="dropdown"
  size="lg"
/>

// 简单开关
<ThemeSwitcher
  value={theme}
  onChange={setTheme}
  variant="switch"
/>
```

## 样式契约

### 1. CSS变量定义

```css
:root {
  /* 颜色系统 */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-900: #1e3a8a;

  /* 间距系统 */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --spacing-8: 2rem;

  /* 字体系统 */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;

  /* 圆角系统 */
  --radius-sm: 0.125rem;
  --radius-base: 0.375rem;
  --radius-lg: 0.5rem;

  /* 阴影系统 */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* 过渡系统 */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
}

[data-theme='dark'] {
  /* 深色主题变量覆盖 */
  --color-background: #0f172a;
  --color-foreground: #f8fafc;
}
```

### 2. 组件样式类命名规范

```typescript
// BEM命名规范
.component-name { /* 块 */ }
.component-name__element { /* 元素 */ }
.component-name--modifier { /* 修饰符 */ }

// 示例
.button { }
.button__icon { }
.button--primary { }
.button--large { }
.button--loading { }
```

### 3. 响应式设计契约

```typescript
// 断点定义
const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
}

// 响应式工具类
.responsive {
  @apply px-4 md:px-6 lg:px-8;
}

// 组件响应式示例
.card {
  @apply w-full md:w-auto lg:w-96;
}
```

## 测试契约

### 1. 组件测试标准

```typescript
// 每个组件必须包含的测试
describe('ComponentName', () => {
  // 渲染测试
  it('renders correctly', () => {});

  // 属性测试
  it('handles props correctly', () => {});

  // 交互测试
  it('handles user interactions', () => {});

  // 可访问性测试
  it('meets accessibility requirements', () => {});

  // 快照测试
  it('matches snapshot', () => {});
});
```

### 2. 可访问性测试要求

- 键盘导航测试
- 屏幕阅读器测试
- 颜色对比度测试
- ARIA属性测试
- 焦点管理测试

### 3. 性能测试要求

- 渲染性能测试
- 内存泄漏测试
- 大数据量测试
- 并发渲染测试

## 文档契约

### 1. 组件文档要求

每个组件必须包含：

- 组件描述
- 使用示例
- API文档（props说明）
- 可访问性说明
- 最佳实践指南
- 常见问题解答

### 2. Storybook集成

```typescript
// Story文件模板
export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  }
}

const Template = (args) => <Button {...args} />

export const Default = Template.bind({})
Default.args = {
  children: 'Button'
}
```

### 3. 变更日志要求

- 重大变更记录
- 新功能说明
- 破坏性变更警告
- 迁移指南
- 版本兼容性说明

---

**文档完成日期**: 2025-10-24 **下一步**: 创建快速开始指南
