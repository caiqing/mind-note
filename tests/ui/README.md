# UI自动化测试框架

这是MindNote项目的UI自动化测试框架，基于Vitest和Testing Library构建，提供全面的组件测试和UI交互验证。

## 🎯 测试目标

- **组件功能验证**：确保所有UI组件按预期工作
- **交互行为测试**：验证用户交互和响应
- **可访问性测试**：确保符合WCAG标准
- **响应式设计测试**：验证不同设备和屏幕尺寸的适配
- **性能测试**：确保组件渲染性能达标
- **AI组件专项测试**：针对AI功能的深度测试

## 📁 目录结构

```
tests/ui/
├── components/              # 组件测试
│   ├── ui/                 # 基础UI组件测试
│   │   ├── button.test.tsx
│   │   ├── input.test.tsx
│   │   ├── card.test.tsx
│   │   └── dialog.test.tsx
│   └── ai/                 # AI组件测试
│       ├── ai-summary-card.test.tsx
│       ├── ai-tags-display.test.tsx
│       └── related-notes-recommendation.test.tsx
├── config/                 # 测试配置
│   └── ui-test.config.ts
├── setup/                  # 测试环境设置
│   ├── ui-test-setup.ts
│   └── mocks/
│       └── server.ts
├── scripts/                # 测试脚本
│   └── run-ui-tests.sh
├── reports/                # 测试报告
├── coverage/               # 覆盖率报告
└── README.md              # 本文档
```

## 🚀 快速开始

### 安装依赖

```bash
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

### 运行测试

```bash
# 运行所有UI测试
npm run test:ui:all

# 运行基础UI组件测试
npm run test:ui:components

# 运行AI组件测试
npm run test:ui:ai

# 生成覆盖率报告
npm run test:ui:coverage

# 监听模式运行
npm run test:ui:watch

# CI模式运行
npm run test:ui:ci
```

### 使用脚本直接运行

```bash
# 查看所有选项
./tests/ui/scripts/run-ui-tests.sh --help

# 运行带覆盖率和HTML报告的测试
./tests/ui/scripts/run-ui-tests.sh --coverage --report

# 只运行组件测试
./tests/ui/scripts/run-ui-tests.sh --components

# 只运行AI组件测试
./tests/ui/scripts/run-ui-tests.sh --ai-components
```

## 🧪 测试框架特性

### 1. 全面的测试覆盖

每个组件测试包含以下方面：

- **基础渲染测试**：验证组件正确渲染
- **交互测试**：验证用户交互行为
- **可访问性测试**：确保键盘导航、屏幕阅读器支持
- **响应式测试**：验证不同设备适配
- **样式测试**：验证CSS样式和主题切换
- **性能测试**：验证渲染性能
- **错误处理测试**：验证边界情况处理
- **集成测试**：验证与其他组件的协作

### 2. Mock数据支持

```typescript
import { mockDataGenerators } from '../../setup/ui-test-setup'

const mockAIAnalysis = mockDataGenerators.generateAIAnalysis({
  summary: 'AI生成的摘要',
  keywords: ['关键词1', '关键词2'],
  sentiment: { polarity: 0.5, confidence: 0.8, label: 'positive' },
  score: 4.2
})
```

### 3. 测试工具类

```typescript
import { UITestUtils } from '../../setup/ui-test-setup'

// 等待元素出现
await UITestUtils.waitForElement('#element-selector')

// 检查元素可见性
const isVisible = UITestUtils.isElementVisible(element)

// 检查颜色对比度
const contrast = UITestUtils.checkColorContrast(bgColor, textColor)

// 响应式测试
const results = await UITestUtils.checkResponsiveLayout(element, viewports)
```

### 4. Mock Service Worker

自动模拟API响应，支持：
- 用户认证API
- 笔记管理API
- AI分析API
- 搜索API
- 标签管理API
- 分析API
- 通知API

## 📊 测试配置

### 覆盖率阈值

```typescript
coverage: {
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### 视觉回归测试

```typescript
VISUAL_REGRESSION: {
  enabled: process.env.UI_VISUAL_REGRESSION === 'true',
  threshold: 0.1,
  updateSnapshots: process.env.UI_UPDATE_SNAPSHOTS === 'true'
}
```

### 可访问性规则

```typescript
ACCESSIBILITY: {
  enabled: true,
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'aria-labels': { enabled: true },
    'heading-order': { enabled: true },
    'alt-text': { enabled: true }
  }
}
```

## 🎮 AI组件专项测试

### AI摘要卡片测试

```typescript
describe('AISummaryCard组件', () => {
  // 测试AI分析结果显示
  // 测试展开/收起功能
  // 测试质量评分显示
  // 测试关键词展示
  // 测试情感分析显示
  // 测试用户反馈收集
})
```

### AI标签显示测试

```typescript
describe('AITagsDisplay组件', () => {
  // 测试智能标签渲染
  // 测试标签颜色和样式
  // 测试置信度显示
  // 测试标签搜索过滤
  // 测试标签管理功能
})
```

### 相关笔记推荐测试

```typescript
describe('RelatedNotesRecommendation组件', () => {
  // 测试推荐算法结果
  // 测试相似度可视化
  // 测试推荐理由显示
  // 测试筛选和搜索
  // 测试交互行为
})
```

## 🔧 编写测试指南

### 1. 测试文件命名

- 使用 `.test.tsx` 或 `.spec.tsx` 后缀
- 放置在对应组件目录下
- 例如：`tests/ui/components/ui/button.test.tsx`

### 2. 测试结构

```typescript
describe('组件名称', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    // 基础渲染相关测试
  })

  describe('交互测试', () => {
    // 用户交互相关测试
  })

  describe('可访问性测试', () => {
    // 可访问性相关测试
  })

  // ... 其他测试组
})
```

### 3. 最佳实践

- **使用描述性的测试名称**
- **每个测试只验证一个行为**
- **使用Mock数据避免外部依赖**
- **包含正面和负面测试用例**
- **测试边界情况和错误处理**
- **验证可访问性要求**
- **包含性能测试**

### 4. 示例测试

```typescript
it('应该正确渲染按钮并响应点击事件', async () => {
  const handleClick = vi.fn()
  render(<Button onClick={handleClick}>点击我</Button>)

  const button = screen.getByRole('button', { name: '点击我' })
  expect(button).toBeInTheDocument()

  await userEvent.click(button)
  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

## 📈 报告和覆盖率

### 查看测试报告

```bash
# 生成HTML报告
npm run test:ui:coverage

# 查看覆盖率报告
open tests/ui/coverage/index.html

# 查看测试报告
open tests/ui/reports/index.html
```

### CI/CD集成

在CI环境中运行：

```bash
npm run test:ui:ci
```

这将：
- 运行所有测试
- 生成覆盖率报告
- 输出JSON格式结果
- 在测试失败时退出

## 🛠️ 故障排除

### 常见问题

1. **测试超时**
   ```bash
   # 增加超时时间
   export VITEST_TEST_TIMEOUT=10000
   ```

2. **Mock Service Worker问题**
   ```bash
   # 重置MSW
   npm run test:clean
   ```

3. **内存不足**
   ```bash
   # 增加Node.js内存限制
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

### 调试技巧

```typescript
// 使用screen.debug()打印当前DOM
screen.debug()

// 使用logRoles查看可访问的角色
import { logRoles } from '@testing-library/dom'
logRoles(container)

// 暂停测试执行
await userEvent.pause()
```

## 🤝 贡献指南

### 添加新测试

1. 在对应的组件目录下创建测试文件
2. 遵循现有的测试结构和命名规范
3. 确保测试覆盖组件的所有主要功能
4. 包含可访问性和响应式测试
5. 运行测试确保通过

### 修改现有测试

1. 理解测试的目的和范围
2. 保持测试的独立性和可重复性
3. 更新相关的Mock数据
4. 验证修改后的测试仍然有效

## 📚 相关资源

- [Vitest文档](https://vitest.dev/)
- [Testing Library文档](https://testing-library.com/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest DOM](https://github.com/testing-library/jest-dom)
- [Mock Service Worker](https://mswjs.io/)
- [Web可访问性指南](https://www.w3.org/WAI/WCAG21/quickref/)

## 📞 支持

如果在测试过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查相关的GitHub Issues
3. 在团队频道中寻求帮助
4. 查看项目的Wiki页面

---

**最后更新**: 2025-10-25
**维护者**: MindNote开发团队