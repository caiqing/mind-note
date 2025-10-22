# Quick Start Guide

**Feature**: 项目基础设施搭建和开发环境配置
**Branch**: 001-dev-env-setup
**Created**: 2025-10-22
**Status**: Guide Ready

---

## 🚀 快速开始

本指南帮助您在30分钟内完成MindNote开发环境的完整搭建。

### 前置要求

- **Docker** 24.x 或更高版本
- **Git** 2.x 或更高版本
- **Node.js** 20.x 或更高版本（可选，Docker包含）
- **操作系统**: macOS, Linux, 或 Windows (WSL2)

### 快速命令

```bash
# 1. 克隆项目并切换到开发环境分支
git clone https://github.com/your-org/mindnote.git
cd mindnote
git checkout 001-dev-env-setup

# 2. 一键启动开发环境
./scripts/setup-dev.sh

# 3. 启动所有服务
docker-compose up -d

# 4. 验证环境状态
npm run dev:check

# 5. 开始开发！
npm run dev
```

---

## 📋 详细安装步骤

### 1. 环境准备

#### 1.1 安装Docker

**macOS (推荐使用Homebrew)**:
```bash
brew install --cask docker
brew install --cask docker-compose
```

**Ubuntu/Debian**:
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

**Windows**:
1. 下载并安装 Docker Desktop for Windows
2. 启用 WSL2 后端
3. 重启计算机

#### 1.2 验证安装

```bash
docker --version
docker-compose --version
```

### 2. 项目设置

#### 2.1 克隆仓库

```bash
git clone https://github.com/your-org/mindnote.git
cd mindnote
git checkout 001-dev-env-setup
```

#### 2.2 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（根据需要）
nano .env
```

**必要的环境变量**:
```bash
# 数据库配置
DATABASE_URL="postgresql://mindnote:dev_password@localhost:5432/mindnote_dev"

# Redis配置
REDIS_URL="redis://localhost:6379"

# AI服务配置（可选，本地模型将自动配置）
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Next.js配置
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. 自动化环境搭建

#### 3.1 运行安装脚本

```bash
# 执行自动化安装脚本
./scripts/setup-dev.sh
```

该脚本将自动：
- ✅ 检查系统要求
- ✅ 安装项目依赖
- ✅ 配置Docker容器
- ✅ 初始化数据库
- ✅ 设置AI服务
- ✅ 配置开发工具

#### 3.2 验证安装结果

脚本执行完成后，运行检查命令：

```bash
# 检查所有服务状态
npm run dev:check

# 预期输出：
# ✅ Docker containers: Running (4/4)
# ✅ Database: Connected and ready
# ✅ Redis: Connected and ready
# ✅ AI Services: Local models loaded
# ✅ Development Tools: Configured
# 🎉 Environment setup complete!
```

### 4. 启动开发服务

#### 4.1 启动所有服务

```bash
# 启动所有容器服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

#### 4.2 启动开发服务器

```bash
# 安装依赖（如果需要）
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看应用。

### 5. 验证开发环境

#### 5.1 基础功能验证

```bash
# 1. 检查API健康状态
curl http://localhost:3000/api/health

# 2. 测试数据库连接
npm run db:test

# 3. 验证AI服务
npm run ai:test

# 4. 运行所有测试
npm run test
```

#### 5.2 测试用户注册

```bash
# 创建测试用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@example.com",
    "username": "developer",
    "password": "devpassword123",
    "full_name": "Development User"
  }'
```

---

## 🔧 开发工具配置

### 代码编辑器

推荐使用 **VS Code** 并安装以下扩展：

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "ms-vscode-remote-containers"
  ]
}
```

### 命令行工具

项目已配置以下有用的NPM脚本：

```bash
# 开发相关
npm run dev              # 启动开发服务器
npm run build           # 构建生产版本
npm run start           # 启动生产服务器

# 数据库相关
npm run db:setup          # 初始化数据库
npm run db:migrate        # 运行数据库迁移
npm run db:seed           # 填充测试数据
npm run db:reset           # 重置数据库

# AI服务相关
npm run ai:test            # 测试AI服务连接
npm run ai:setup           # 配置AI服务
npm run ai:local-download   # 下载本地模型

# 测试相关
npm run test              # 运行所有测试
npm run test:unit         # 运行单元测试
npm run test:integration  # 运行集成测试
npm run test:e2e           # 运行端到端测试
npm run test:coverage      # 生成测试覆盖率报告

# 代码质量
npm run lint              # 检查代码风格
npm run lint:fix           # 自动修复代码问题
npm run type-check         # TypeScript类型检查
npm run format             # 格式化代码

# 部署相关
npm run deploy:staging    # 部署到测试环境
npm run deploy:production  # 部署到生产环境
```

---

## 🐳 故障排除

### 常见问题

#### 1. Docker相关问题

**问题**: `docker: command not found`
```bash
# 解决方案
# macOS
brew install docker docker-compose

# Ubuntu
sudo apt-get install docker.io docker-compose
```

**问题**: `Permission denied while trying to connect to Docker daemon`
```bash
# 解决方案
sudo usermod -aG docker $USER
newgrp docker
# 重新登录终端
```

#### 2. 数据库连接问题

**问题**: `ECONNREFUSED: Connection refused`
```bash
# 检查PostgreSQL容器状态
docker-compose logs postgres

# 重启PostgreSQL容器
docker-compose restart postgres
```

**问题**: `FATAL: database "mindnote_dev" does not exist`
```bash
# 创建数据库
docker-compose exec postgres createdb -U mindnote mindnote_dev

# 运行初始化脚本
npm run db:setup
```

#### 3. Redis连接问题

**问题**: `ECONNREFUSED: Connection refused`
```bash
# 检查Redis容器状态
docker-compose logs redis

# 重启Redis容器
docker-compose restart redis
```

#### 4. AI服务问题

**问题**: 本地模型无法加载
```bash
# 检查Ollama容器状态
docker-compose logs ollama

# 手动下载模型
docker-compose exec ollama ollama pull distilbert
```

**问题**: 云端API连接失败
```bash
# 检查API密钥配置
cat .env | grep API_KEY

# 测试API连接
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

### 调试模式

启用详细日志输出：

```bash
# 设置调试环境变量
export DEBUG=true
export LOG_LEVEL=debug

# 重新启动服务
docker-compose down
docker-compose up -d
npm run dev
```

查看容器日志：

```bash
# 查看特定服务日志
docker-compose logs app
docker-compose logs -f postgres  # 实时跟踪日志
```

---

## 📊 性能优化

### 开发环境优化

#### 1. Docker性能调优

```yaml
# docker-compose.dev.yml 优化配置
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    volumes:
      - .:/app:cached
      - /app/node_modules
    environment:
      - NODE_OPTIONS=--max-old-space-size=4096
    # 增加内存限制
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

#### 2. 数据库优化

```sql
-- PostgreSQL性能优化
ALTER SYSTEM SET shared_preload_libraries = 'vector';
ALTER SYSTEM SET max_connections = 200;

-- pgvector索引优化
CREATE INDEX CONCURRENTLY notes_content_vector_idx
ON notes USING ivfflat (content_vector vector_cosine_ops)
WITH (lists = 100);
```

#### 3. Redis缓存策略

```typescript
// 缓存配置优化
const cacheConfig = {
  ai_conversations: { ttl: 1800 }, // 30分钟
  search_results: { ttl: 300 },    // 5分钟
  user_sessions: { ttl: 3600 },   // 1小时
  popular_notes: { ttl: 7200 }   // 2小时
};
```

---

## 🔐 开发工作流

### 日常开发流程

1. **启动开发环境**
   ```bash
   docker-compose up -d && npm run dev
   ```

2. **创建功能分支**
   ```bash
   git checkout -b feature/new-feature
   ```

3. **进行开发**
   - 修改代码
   - 运行测试
   - 提交代码

4. **代码质量检查**
   ```bash
   npm run lint && npm run type-check && npm run test
   ```

5. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

### 团队协作

#### 代码审查流程

1. 创建Pull Request
2. 自动运行CI/CD检查
3. 团队成员审查代码
4. 合并到主分支

#### 环境同步

```bash
# 同步最新代码
git pull origin main

# 更新依赖
npm install

# 重启服务
docker-compose restart
```

---

## 📚 进一步学习

### 开发文档

- [API文档](./contracts/api-contracts.md)
- [数据模型设计](./data-model.md)
- [研究文档](./research.md)

### 技术参考

- [Next.js 15 文档](https://nextjs.org/docs)
- [PostgreSQL 15 文档](https://www.postgresql.org/docs/)
- [Docker 文档](https://docs.docker.com/)
- [AI集成指南](./ai-services/README.md)

### 社区支持

- [GitHub Issues](https://github.com/your-org/mindnote/issues)
- [开发者论坛](https://forum.mindnote.com)
- [Discord社区](https://discord.gg/mindnote)

---

## ✅ 验证清单

完成以下步骤以确保开发环境正常：

- [ ] Docker安装并运行正常
- [ ] 项目代码克隆成功
- [ ] 环境变量配置完成
- [ ] 自动化安装脚本执行成功
- [ ] 所有Docker容器启动正常
- [ ] 数据库连接正常
- [ ] Redis缓存工作正常
- [ ] AI服务配置完成
- [ ] 开发服务器启动成功
- [ ] 基础API测试通过
- [ ] 代码质量工具配置完成
- [ ] 测试套件运行正常

**环境状态**: ✅ 就绪
**下一步**: 开始功能开发或运行 `/speckit.tasks` 生成开发任务

---

*快速开始指南支持30分钟内完成开发环境搭建，包含完整的故障排除和性能优化建议。*