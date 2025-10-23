# Quick Start Guide: Smart Note Management

**Version**: 1.0.0
**Date**: 2025-10-23
**Purpose**: Quick setup and development guide for smart note management feature

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 16+ with pgvector extension
- Redis 7+
- Docker & Docker Compose
- AI service API keys (至少配置一个)

### 1. Environment Setup

```bash
# 克隆项目
git clone https://github.com/caiqing/mind-note.git
cd mind-note

# 切换到功能分支
git checkout 002-smart-note-management

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env
```

### 2. Configure AI Services

编辑 `.env` 文件，至少配置一个AI服务：

```bash
# 推荐配置（国内用户）
ZHIPU_API_KEY="your-zhipu-api-key"
AI_PRIMARY_PROVIDER="zhipu"
AI_FALLBACK_PROVIDER="deepseek"

# 或者配置OpenAI（国际用户）
OPENAI_API_KEY="your-openai-api-key"
AI_PRIMARY_PROVIDER="openai"
AI_FALLBACK_PROVIDER="zhipu"
```

### 3. Database Setup

```bash
# 启动数据库服务
docker-compose -f docker-compose.dev.yml up -d postgres redis

# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# 验证数据库配置
node scripts/validate-database-schema.js
```

### 4. Start Development Server

```bash
# 启动开发服务器
npm run dev

# 或者使用快速启动脚本
npm run start:dev
```

访问 http://localhost:3000 查看应用。

## 📋 Development Workflow

### Step 1: 创建笔记

```javascript
// 创建新笔记
const response = await fetch('/api/v1/notes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: '我的第一个智能笔记',
    content: '这是一个测试笔记的内容，包含一些重要信息。',
    tags: ['测试', '重要']
  })
});

const note = await response.json();
console.log('笔记创建成功:', note.data);
```

### Step 2: 触发AI分析

```javascript
// AI分析笔记
const analysisResponse = await fetch(`/api/v1/notes/${note.data.id}/ai-analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    operations: ['categorize', 'tag', 'summarize'],
    provider: 'auto',
    options: {
      language: 'zh-CN',
      maxTags: 5
    }
  })
});

const analysis = await analysisResponse.json();
console.log('AI分析任务已启动:', analysis.data.taskId);
```

### Step 3: 检查AI分析状态

```javascript
// 检查分析状态
const statusResponse = await fetch(`/api/v1/ai/tasks/${analysis.data.taskId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const status = await statusResponse.json();
if (status.data.status === 'COMPLETED') {
  console.log('AI分析结果:', status.data.result);
}
```

## 🔧 开发命令

```bash
# 开发相关
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器

# 数据库相关
npm run db:generate  # 生成Prisma客户端
npm run db:migrate   # 运行数据库迁移
npm run db:studio    # 打开Prisma Studio
npm run db:seed      # 运行种子数据
npm run db:reset      # 重置数据库

# 测试相关
npm run test         # 运行所有测试
npm run test:watch   # 监听模式运行测试
npm run test:coverage # 测试覆盖率
npm run test:e2e     # 端到端测试

# 代码质量
npm run lint         # 代码检查
npm run lint:fix     # 自动修复代码问题
npm run type-check   # TypeScript类型检查
```

## 🗂️ 项目结构

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API路由
│   │   ├── notes/               # 笔记相关API
│   │   ├── ai/                  # AI服务API
│   │   ├── search/              # 搜索API
│   │   └── analytics/           # 分析API
│   ├── notes/                   # 笔记页面
│   └── layout.tsx               # 根布局
├── components/                  # React组件
│   ├── ui/                      # 基础UI组件
│   ├── forms/                   # 表单组件
│   ├── editors/                 # 编辑器组件
│   └── note/                    # 笔记相关组件
├── lib/                         # 工具库
│   ├── ai/                      # AI服务集成
│   │   ├── config.ts           # AI配置管理
│   │   ├── client.ts           # AI客户端
│   │   └── providers/          # AI提供商实现
│   ├── db/                      # 数据库相关
│   ├── utils/                   # 工具函数
│   └── hooks/                   # 自定义Hooks
└── types/                       # TypeScript类型
```

## 🧪 测试指南

### 单元测试

```bash
# 运行特定组件测试
npm test -- NoteEditor

# 监听模式
npm run test:watch -- NoteEditor
```

### API测试

```javascript
// 测试笔记创建API
describe('POST /api/v1/notes', () => {
  test('should create a new note', async () => {
    const response = await request(app)
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Note',
        content: 'Test content'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Test Note');
  });
});
```

### 端到端测试

```javascript
// 使用Playwright测试完整用户流程
import { test, expect } from '@playwright/test';

test('smart note creation and AI analysis', async ({ page }) => {
  await page.goto('/');

  // 创建笔记
  await page.click('[data-testid="new-note-button"]');
  await page.fill('[data-testid="note-title"]', 'E2E Test Note');
  await page.fill('[data-testid="note-content"]', 'This is a test note for E2E testing.');
  await page.click('[data-testid="save-button"]');

  // 验证笔记创建成功
  await expect(page.locator('[data-testid="note-title"]')).toHaveText('E2E Test Note');

  // 触发AI分析
  await page.click('[data-testid="ai-analyze-button"]');

  // 等待AI分析完成
  await page.waitForSelector('[data-testid="ai-result"]');

  // 验证AI结果
  await expect(page.locator('[data-testid="ai-category"]')).toBeVisible();
  await expect(page.locator('[data-testid="ai-tags"]')).toBeVisible();
});
```

## 🔍 调试指南

### 数据库调试

```bash
# 查看数据库状态
npx prisma studio

# 检查数据库连接
node scripts/validate-database-schema.js

# 查看AI处理日志
docker-compose logs postgres | grep ai_processing
```

### AI服务调试

```javascript
// 检查AI服务状态
const statusResponse = await fetch('/api/v1/ai/providers/status', {
  headers: { 'Authorization': `Bearer ${token}` }
});
console.log('AI服务状态:', await statusResponse.json());

// 查看AI使用统计
const usageResponse = await fetch('/api/v1/analytics/ai-usage?period=7d', {
  headers: { 'Authorization': `Bearer ${token}` }
});
console.log('AI使用统计:', await usageResponse.json());
```

### 性能监控

```bash
# 启动性能监控
npm run dev:monitor

# 查看API响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/notes

# 测试搜索性能
time curl -X POST http://localhost:3000/api/v1/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"productivity"}'
```

## 🛠️ 常见问题解决

### 问题1: AI服务不可用

**症状**: AI分析返回502错误

**解决方案**:
```bash
# 检查API密钥配置
echo $OPENAI_API_KEY
echo $ZHIPU_API_KEY

# 测试API连接
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"test"}]}'
```

### 问题2: 向量搜索不工作

**症状**: 搜索结果为空或不相关

**解决方案**:
```bash
# 检查pgvector扩展
docker-compose exec postgres psql -U mindnote -d mindnote_dev -c "SELECT * FROM pg_extension WHERE extname = 'vector'"

# 检查向量索引
docker-compose exec postgres psql -U mindnote -d mindnote_dev -c "\d+ notes"

# 重新生成向量嵌入
npx prisma migrate reset
npm run db:seed
```

### 问题3: 性能问题

**症状**: API响应时间过长

**解决方案**:
```bash
# 检查数据库查询性能
docker-compose exec postgres psql -U mindnote -d mindnote_dev -c "SELECT * FROM pg_stat_statements WHERE mean_time > 1000 ORDER BY mean_time DESC LIMIT 10;"

# 检查缓存状态
docker-compose exec redis redis-cli info stats

# 优化数据库索引
npx prisma db push --force-reset
```

## 📊 监控指标

### 关键性能指标

| 指标 | 目标值 | 监控方法 |
|------|--------|----------|
| API响应时间 | <500ms (P95) | APM工具 |
| AI分析时间 | <3秒 | AI使用统计 |
| 数据库查询 | <100ms | 慢查询日志 |
| 缓存命中率 | >80% | Redis监控 |
| 错误率 | <1% | 错误日志 |

### 监控命令

```bash
# 查看API性能指标
curl http://localhost:3000/api/v1/analytics/ai-usage?period=1d

# 检查应用健康状态
curl http://localhost:3000/api/v1/health

# 查看系统资源使用
docker stats
```

## 🚀 部署指南

### 开发环境部署

```bash
# 使用Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# 或本地运行
npm install
npm run dev
```

### 生产环境部署

```bash
# 构建应用
npm run build

# 启动生产服务
npm start

# 使用PM2管理进程
pm2 start ecosystem.config.js
```

### 环境变量配置

```bash
# 生产环境变量
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379
NEXTAUTH_SECRET=your-super-secret-key
OPENAI_API_KEY=your-production-api-key
```

## 📚 更多资源

### 文档链接

- [API契约文档](./contracts/api-contracts.md)
- [AI服务契约](./contracts/ai-contracts.md)
- [OpenAPI规范](./contracts/openapi.yaml)
- [数据模型设计](./data-model.md)
- [AI服务研究](./research.md)

### 外部资源

- [Next.js文档](https://nextjs.org/docs)
- [Prisma文档](https://www.prisma.io/docs)
- [pgvector文档](https://github.com/pgvector/pgvector)
- [OpenAI API文档](https://platform.openai.com/docs)
- [智谱AI文档](https://open.bigmodel.cn/dev/api)

## 🤝 贡献指南

### 开发流程

1. 创建功能分支：`git checkout -b feature-name`
2. 开发功能并测试
3. 提交代码：`git commit -m "feat: description"`
4. 推送分支：`git push origin feature-name`
5. 创建Pull Request

### 代码规范

- 使用TypeScript进行类型检查
- 遵循ESLint规则
- 编写单元测试和集成测试
- 更新相关文档

---

**需要帮助？** 📧

- 查看故障排除指南：`/docs/troubleshooting.md`
- 提交Issue：[GitHub Issues](https://github.com/caiqing/mind-note/issues)
- 联系团队：support@mindnote.app

**开始智能笔记管理开发之旅！** 🚀