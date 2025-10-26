# MindNote - 智能笔记管理应用

[![MindNote Logo](https://img.shields.io/badge/MindNote-智能笔记-blue?style=flat-square)](https://github.com/caiqing/mindnote)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.1.0-orange?style=flat-square)](CHANGELOG.md)
[![Framework](https://img.shields.io/badge/Framework-Next.js%2015%20%2B%20React%2019-black?style=flat-square)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20Prisma-blue?style=flat-square)](https://www.postgresql.org/)

## 🌟 项目概述

MindNote 是一个现代化的智能笔记管理应用，采用 **Next.js 15 + React 19 + TypeScript**
技术栈构建，提供完整的笔记 CRUD 功能，并为未来的 AI 驱动功能奠定坚实基础。

### ✨ 当前版本特性

- **🚀 现代化技术栈**: Next.js 15 + React 19 + TypeScript + Prisma
- **📝 完整笔记管理**: 创建、编辑、删除、搜索笔记
- **🏷️ 智能标签系统**: 灵活的标签分类和管理
- **⭐ 收藏与归档**: 笔记状态管理和组织
- **🔍 实时搜索**: 支持标题和内容的全文搜索
- **📱 响应式设计**: 适配桌面端和移动端
- **🎨 纯CSS实现**: 无UI组件库依赖，高度可定制
- **🗄️ PostgreSQL集成**: 可靠的数据持久化存储

### 🎯 开发路线图

**✅ 已完成 (v0.1.0)**

- [x] 基础笔记 CRUD 功能
- [x] 实时搜索功能
- [x] 标签管理系统
- [x] 收藏和归档功能
- [x] PostgreSQL 数据库集成
- [x] 响应式 UI 设计

**🚧 开发中 (v0.2.0)**

- [ ] 用户认证系统
- [ ] 笔记版本历史
- [ ] 富文本编辑器
- [ ] 笔记分类管理

**🔮 未来规划 (v1.0.0)**

- [ ] AI 驱动的智能分类
- [ ] 笔记关联性分析
- [ ] 知识图谱可视化
- [ ] AI 对话交互
- [ ] 播客生成功能

## 🏗 技术架构

### 核心技术栈

| 技术领域     | 选型方案                | 核心优势               |
| ------------ | ----------------------- | ---------------------- |
| **前端框架** | Next.js 15 + React 19   | AI 原生支持，全栈统一  |
| **类型系统** | TypeScript              | 类型安全，开发体验优秀 |
| **数据库**   | PostgreSQL + Prisma ORM | 可靠，高性能，类型安全 |
| **样式方案** | 纯 CSS-in-JS            | 无依赖，高度可定制     |
| **开发工具** | ESLint + Prettier       | 代码质量保证           |

### 项目架构

```mermaid
graph TB
    subgraph "前端层 Frontend"
        WebApp[Next.js Web 应用]
        Pages[页面组件]
        Components[UI 组件库]
        Hooks[自定义 Hooks]
    end

    subgraph "API 层 API Layer"
        APIRoutes[Next.js API Routes]
        AuthMiddleware[认证中间件]
        Validation[数据验证]
    end

    subgraph "数据层 Data Layer"
        PrismaORM[Prisma ORM]
        PostgreSQL[(PostgreSQL 数据库)]
        Migrations[数据库迁移]
    end

    subgraph "开发工具 DevTools"
        TypeScript[TypeScript]
        ESLint[ESLint]
        Prettier[Prettier]
        GitHooks[Git Hooks]
    end
```

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.0+ (推荐 20.0+)
- **PostgreSQL**: 14+
- **npm** 或 **yarn**: 最新版本

### 安装和运行

```bash
# 1. 克隆项目
git clone https://github.com/caiqing/mindnote.git
cd mindnote

# 2. 安装依赖
npm install

# 3. 环境配置
cp .env.example .env
# 编辑 .env 文件，配置数据库连接信息

# 4. 数据库设置
docker-compose up -d postgres  # 启动 PostgreSQL 容器
npx prisma db push            # 推送数据库 schema

# 5. 生成 Prisma 客户端
npx prisma generate

# 6. 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 环境变量配置

创建 `.env.local` 文件：

```env
# 数据库连接
DATABASE_URL="postgresql://username:password@localhost:5432/mindnote_dev"

# NextAuth 配置（可选）
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# AI 服务配置（未来功能）
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-claude-key"
```

### Docker 开发环境

```bash
# 启动所有服务（数据库 + 应用）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 📁 项目结构

```
mindnote/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/          # 认证相关页面
│   │   ├── api/             # API 路由
│   │   ├── notes/           # 笔记相关页面
│   │   └── globals.css      # 全局样式
│   ├── components/          # React 组件
│   │   ├── notes/          # 笔记组件
│   │   ├── ui/             # UI 基础组件
│   │   └── providers/      # Context Providers
│   ├── lib/                 # 工具库
│   │   ├── db/             # 数据库配置
│   │   ├── utils/          # 工具函数
│   │   └── services/       # 服务层
│   ├── hooks/               # 自定义 Hooks
│   ├── types/               # TypeScript 类型定义
│   └── styles/              # 样式文件
├── prisma/                  # Prisma 数据库配置
│   ├── schema.prisma       # 数据库模型
│   └── migrations/         # 数据库迁移
├── public/                  # 静态资源
├── docs/                    # 项目文档
│   └── reports/            # 开发报告
├── scripts/                 # 自动化脚本
└── tests/                   # 测试文件
```

## 📚 核心功能

### 笔记管理

- **创建笔记**: 支持标题、内容、标签的完整创建流程
- **编辑笔记**: 实时保存，支持富文本编辑（开发中）
- **删除笔记**: 软删除机制，支持数据恢复
- **搜索笔记**: 全文搜索，支持标题和内容检索
- **标签系统**: 灵活的标签分类和管理
- **状态管理**: 收藏、归档等状态操作

### API 接口

| 端点              | 方法   | 描述                                 |
| ----------------- | ------ | ------------------------------------ |
| `/api/notes`      | GET    | 获取笔记列表（支持分页、搜索、排序） |
| `/api/notes`      | POST   | 创建新笔记                           |
| `/api/notes/[id]` | GET    | 获取单个笔记详情                     |
| `/api/notes/[id]` | PUT    | 更新笔记内容                         |
| `/api/notes/[id]` | DELETE | 删除笔记（软删除）                   |

### 数据模型

```typescript
interface Note {
  id: string; // UUID 主键
  title: string; // 笔记标题
  content: string; // 笔记内容
  contentPlain?: string; // 纯文本内容（搜索用）
  contentHash?: string; // 内容哈希（去重用）
  tags?: string[]; // 标签数组
  categoryId?: number; // 分类ID
  isFavorite: boolean; // 是否收藏
  isArchived: boolean; // 是否归档
  wordCount?: number; // 字数统计
  readingTimeMinutes?: number; // 阅读时间（分钟）
  viewCount?: number; // 浏览次数
  status: 'DRAFT' | 'PUBLISHED'; // 状态
  isPublic: boolean; // 是否公开
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}
```

## 🛠️ 开发指南

### 代码规范

- **TypeScript**: 启用严格模式，所有文件使用 TypeScript
- **ESLint**: 遵循项目 ESLint 配置
- **Prettier**: 统一代码格式化
- **Git Hooks**: 使用 husky 和 lint-staged 进行代码检查

### 提交规范

```bash
# 提交格式
git commit -m "feat: add note search functionality"

# 提交类型
feat:     新功能
fix:      修复 bug
docs:     文档更新
style:    代码格式调整
refactor: 代码重构
test:     测试相关
chore:    构建工具或辅助工具的变动
```

### 开发工作流

```bash
# 1. 创建功能分支
git checkout -b feature/note-search

# 2. 开发功能
# - 编写代码
# - 运行测试
# - 更新文档

# 3. 提交代码
git add .
git commit -m "feat: add note search functionality"

# 4. 推送分支
git push origin feature/note-search

# 5. 创建 Pull Request
# 代码审查通过后合并到 main 分支
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行 E2E 测试
npm run test:e2e
```

### 测试策略

- **单元测试**: 测试独立函数和组件
- **集成测试**: 测试 API 接口和数据库操作
- **E2E 测试**: 测试完整的用户流程

## 📦 部署

### 生产环境部署

```bash
# 1. 构建应用
npm run build

# 2. 启动生产服务器
npm start

# 3. 使用 PM2 管理进程（可选）
pm2 start npm --name "mindnote" -- start
```

### Docker 部署

```bash
# 构建镜像
docker build -t mindnote .

# 运行容器
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  mindnote
```

### Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署到 Vercel
vercel --prod
```

## 🤝 贡献指南

### 如何贡献

1. **Fork** 项目到你的 GitHub 账户
2. **Clone** 你的 fork 到本地
3. **创建** 功能分支 (`git checkout -b feature/AmazingFeature`)
4. **提交** 你的更改 (`git commit -m 'Add some AmazingFeature'`)
5. **推送** 到分支 (`git push origin feature/AmazingFeature`)
6. **创建** Pull Request

### 开发环境设置

```bash
# 安装依赖
npm install

# 设置开发环境
npm run dev

# 运行代码检查
npm run lint

# 格式化代码
npm run format
```

## 📊 项目状态

### 版本历史

- **v0.1.0** (2025-10-26) - 基础笔记管理功能
  - ✅ 笔记 CRUD 操作
  - ✅ 搜索功能
  - ✅ 标签系统
  - ✅ PostgreSQL 集成

### 性能指标

| 指标             | 当前值  | 目标值  |
| ---------------- | ------- | ------- |
| **页面加载时间** | < 2s    | < 1s    |
| **API 响应时间** | < 200ms | < 100ms |
| **搜索响应时间** | < 500ms | < 200ms |
| **数据库查询**   | < 100ms | < 50ms  |

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE)，允许自由使用、修改和分发。

## 🙏 致谢

感谢所有为 MindNote 项目做出贡献的开发者和用户！

### 技术支持

- **前端框架**: [Next.js](https://nextjs.org/) + [React](https://react.dev/)
- **数据库**: [PostgreSQL](https://www.postgresql.org/) + [Prisma](https://www.prisma.io/)
- **开发工具**: [TypeScript](https://www.typescriptlang.org/) + [ESLint](https://eslint.org/)

## 📞 联系我们

- **GitHub 仓库**: [https://github.com/caiqing/mindnote](https://github.com/caiqing/mindnote)
- **问题反馈**: [Issues](https://github.com/caiqing/mindnote/issues)
- **功能请求**: [Discussions](https://github.com/caiqing/mindnote/discussions)

---

**⭐ 如果 MindNote 对您有帮助，请给我们一个 Star！**

[![GitHub stars](https://img.shields.io/github/stars/caiqing/mindnote?style=social)](https://github.com/caiqing/mindnote/stargazers)

_最后更新: 2025-10-26_
