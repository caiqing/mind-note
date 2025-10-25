# MindNote CI/CD 指南

## 概述

MindNote项目采用现代化的CI/CD流水线，集成了代码质量检查、自动化测试、安全扫描、构建和部署等完整流程。

## 🏗️ 架构概览

```mermaid
graph LR
    A[代码提交] --> B[CI流水线]
    B --> C[质量检查]
    B --> D[单元测试]
    B --> E[集成测试]
    B --> F[构建检查]
    B --> G[安全扫描]
    B --> H[性能测试]

    H --> I{分支类型}
    I -->|develop| J[部署到Staging]
    I -->|main| K[部署到Production]

    J --> L[烟雾测试]
    K --> M[烟雾测试]
    L --> N[通知]
    M --> N
```

## 🚀 CI/CD 流水线

### 1. 持续集成 (CI) 流水线

**触发条件:**
- 推送到 `main` 或 `develop` 分支
- 创建Pull Request

**主要阶段:**

#### 质量检查 (quality)
- ESLint 代码规范检查
- Prettier 代码格式检查
- TypeScript 类型检查

#### 单元测试 (test)
- 运行所有单元测试
- 生成测试覆盖率报告
- 上传到Codecov

#### 集成测试 (integration)
- API集成测试
- 数据库集成测试
- 缓存集成测试

#### 端到端测试 (e2e)
- Playwright浏览器自动化测试
- 用户界面测试
- 用户流程测试

#### 构建检查 (build)
- Next.js应用构建
- Docker镜像构建
- 构建产物验证

#### 安全扫描 (security)
- npm audit依赖漏洞扫描
- Snyk安全扫描
- 生成SARIF报告

#### 性能测试 (performance)
- Lighthouse CI性能评估
- Core Web Vitals检查
- 性能回归检测

#### 数据库迁移测试 (migration-test)
- 数据库结构验证
- 迁移脚本测试
- 种子数据验证

### 2. 持续部署 (CD) 流水线

**触发条件:**
- 推送到 `main` 分支 → Production部署
- 推送到 `develop` 分支 → Staging部署
- 创建版本标签 → Production部署

#### 部署阶段:

1. **构建Docker镜像**
   - 多架构构建 (linux/amd64, linux/arm64)
   - 推送到Container Registry
   - 安全扫描

2. **部署到Staging** (develop分支)
   - Helm部署到Staging环境
   - 运行烟雾测试
   - 健康检查验证

3. **部署到Production** (main分支)
   - 创建数据库备份
   - Helm部署到Production环境
   - 运行烟雾测试
   - 健康检查验证

4. **回滚机制**
   - 自动检测部署失败
   - 执行自动回滚
   - 创建GitHub Issue通知

## 📋 环境配置

### 开发环境 (Development)
- **URL**: `http://localhost:3000`
- **数据库**: 本地PostgreSQL + pgvector
- **缓存**: 本地Redis
- **AI服务**: 本地模型 + 云API

### 测试环境 (Test)
- **触发**: CI流水线
- **数据库**: 临时测试数据库
- **缓存**: 临时Redis实例
- **AI服务**: Mock服务

### 预发布环境 (Staging)
- **URL**: `https://staging.mindnote.com`
- **数据库**: Staging PostgreSQL
- **缓存**: Staging Redis
- **AI服务**: 云API (限制配额)

### 生产环境 (Production)
- **URL**: `https://mindnote.com`
- **数据库**: 生产PostgreSQL集群
- **缓存**: 生产Redis集群
- **AI服务**: 云API (完整配额)

## 🔧 配置文件详解

### GitHub Actions工作流

#### `.github/workflows/ci.yml`
```yaml
name: CI Pipeline
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
```

**关键特性:**
- 并行执行测试任务
- 缓存依赖提高构建速度
- 自动生成测试报告
- 失败时上传调试信息

#### `.github/workflows/deploy.yml`
```yaml
name: Deploy
on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
```

**关键特性:**
- 多环境部署支持
- 自动回滚机制
- 部署通知
- 安全扫描集成

### 环境变量配置

#### 必需的Secrets

**CI/CD Secrets:**
- `DATABASE_URL`: 数据库连接字符串
- `REDIS_URL`: Redis连接字符串
- `NEXTAUTH_SECRET`: NextAuth密钥
- `OPENAI_API_KEY`: OpenAI API密钥
- `ANTHROPIC_API_KEY`: Anthropic API密钥

**部署Secrets:**
- `KUBE_CONFIG_STAGING`: Kubernetes配置 (Staging)
- `KUBE_CONFIG_PRODUCTION`: Kubernetes配置 (Production)
- `STAGING_DOMAIN`: Staging域名
- `PRODUCTION_DOMAIN`: Production域名
- `BACKUP_BUCKET`: 备份存储桶

#### 环境配置文件

`.env.example`:
```bash
# 基础配置
NODE_ENV=development
PORT=3000

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/mindnote

# Redis配置
REDIS_URL=redis://localhost:6379

# 认证配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# AI服务配置
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### Docker配置

#### `Dockerfile`
```dockerfile
# 多阶段构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### `docker-compose.yml`
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mindnote
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: mindnote
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

### Helm配置

#### `helm/mindnote/Chart.yaml`
```yaml
apiVersion: v2
name: mindnote
description: MindNote智能笔记应用
version: 0.1.0
appVersion: "1.0.0"
```

#### `helm/mindnote/values.yaml`
```yaml
replicaCount: 1

image:
  repository: ghcr.io/your-org/mindnote
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: nginx
  annotations: {}
  hosts:
    - host: mindnote.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 100
  targetCPUUtilizationPercentage: 80
```

## 🧪 测试策略

### 测试金字塔

```mermaid
graph TD
    A[E2E Tests] --> B[Integration Tests]
    B --> C[Unit Tests]

    A1[用户流程测试<br/>UI自动化测试] --> A
    B1[API集成测试<br/>数据库集成测试] --> B
    C1[组件单元测试<br/>工具函数测试] --> C
```

### 测试覆盖范围

#### 单元测试
- **覆盖率目标**: >80%
- **测试工具**: Vitest
- **测试内容**: 组件、工具函数、业务逻辑

#### 集成测试
- **测试工具**: Vitest + Supertest
- **测试内容**: API端点、数据库操作、缓存集成

#### 端到端测试
- **测试工具**: Playwright
- **测试内容**: 用户界面、用户流程、跨浏览器兼容性

#### 烟雾测试
- **测试工具**: 自定义Shell脚本
- **测试内容**: 部署后基本功能验证

## 🔒 安全措施

### 代码安全
- **依赖扫描**: npm audit + Snyk
- **代码扫描**: ESLint安全规则
- **密钥检测**: git-secrets

### 部署安全
- **镜像扫描**: Trivy漏洞扫描
- **网络策略**: Kubernetes NetworkPolicy
- **访问控制**: RBAC + ServiceAccount

### 运行时安全
- **HTTPS强制**: SSL/TLS证书
- **安全头**: HSTS, CSP, XSS保护
- **容器安全**: 非root用户运行

## 📊 监控和告警

### 应用监控
- **健康检查**: `/api/health` 端点
- **性能指标**: 响应时间、错误率
- **业务指标**: 用户活跃度、功能使用率

### 基础设施监控
- **服务器监控**: CPU、内存、磁盘
- **数据库监控**: 连接数、查询性能
- **网络监控**: 带宽、延迟

### 告警配置
- **即时告警**: 服务宕机、错误率飙升
- **预警通知**: 性能下降、资源不足
- **通知渠道**: Slack、邮件、GitHub Issues

## 🚦 部署流程

### 开发到生产流程

```mermaid
graph LR
    A[开发分支] --> B[创建PR]
    B --> C[CI检查]
    C --> D{CI通过?}
    D -->|否| A
    D -->|是| E[合并到develop]
    E --> F[自动部署Staging]
    F --> G[烟雾测试]
    G --> H{测试通过?}
    H -->|否| I[修复问题]
    H -->|是| J[创建Release PR]
    J --> K[合并到main]
    K --> L[自动部署Production]
    L --> M[生产烟雾测试]
    M --> N[监控确认]
```

### 版本发布流程

1. **准备发布**
   ```bash
   # 创建发布分支
   git checkout -b release/v1.2.0

   # 更新版本号
   npm version 1.2.0

   # 更新CHANGELOG
   # 修复已知问题
   ```

2. **测试验证**
   ```bash
   # 运行完整测试套件
   npm run test:all

   # 部署到Staging测试
   npm run deploy:staging

   # 运行烟雾测试
   npm run test:smoke:staging
   ```

3. **生产部署**
   ```bash
   # 合并到main分支
   git checkout main
   git merge release/v1.2.0

   # 推送触发部署
   git push origin main

   # 创建标签
   git tag v1.2.0
   git push origin v1.2.0
   ```

4. **部署后验证**
   ```bash
   # 生产烟雾测试
   npm run test:smoke:production

   # 监控检查
   # 性能验证
   # 用户反馈收集
   ```

## 🔄 回滚策略

### 自动回滚条件
- 健康检查失败
- 错误率超过阈值
- 响应时间过长
- 烟雾测试失败

### 手动回滚流程

1. **快速回滚**
   ```bash
   # 使用Helm回滚
   helm rollback mindnote-production -n production

   # 或使用kubectl
   kubectl rollout undo deployment/mindnote-production -n production
   ```

2. **验证回滚**
   ```bash
   # 检查部署状态
   kubectl rollout status deployment/mindnote-production -n production

   # 运行烟雾测试
   npm run test:smoke:production
   ```

3. **问题分析**
   - 查看部署日志
   - 分析错误原因
   - 制定修复计划

## 🛠️ 本地开发

### 环境准备

1. **安装依赖**
   ```bash
   # Node.js 20+
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Docker & Docker Compose
   sudo apt-get install docker.io docker-compose
   ```

2. **克隆项目**
   ```bash
   git clone https://github.com/your-org/mindnote.git
   cd mindnote
   ```

3. **环境配置**
   ```bash
   # 复制环境配置
   cp .env.example .env.local

   # 启动依赖服务
   docker-compose up -d db redis

   # 安装依赖
   npm install

   # 数据库初始化
   npm run db:init
   npm run db:migrate
   npm run db:seed
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

### 本地测试

```bash
# 运行所有测试
npm run test:all

# 运行特定测试
npm run test:unit
npm run test:integration
npm run test:e2e

# 代码质量检查
npm run lint
npm run type-check

# 本地烟雾测试
npm run test:smoke
```

## 📚 故障排除

### 常见问题

#### CI构建失败
1. **检查依赖版本**
   ```bash
   npm audit
   npm audit fix
   ```

2. **清理缓存**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **检查TypeScript错误**
   ```bash
   npm run type-check
   ```

#### 部署失败
1. **检查Kubernetes状态**
   ```bash
   kubectl get pods -n production
   kubectl describe pod <pod-name> -n production
   kubectl logs <pod-name> -n production
   ```

2. **检查Helm部署**
   ```bash
   helm list -n production
   helm status mindnote-production -n production
   ```

3. **检查网络连接**
   ```bash
   kubectl get ingress -n production
   kubectl get service -n production
   ```

#### 性能问题
1. **检查资源使用**
   ```bash
   kubectl top pods -n production
   kubectl top nodes
   ```

2. **检查数据库性能**
   ```bash
   # 查看慢查询
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

3. **分析应用日志**
   ```bash
   kubectl logs -f deployment/mindnote-production -n production
   ```

### 调试技巧

#### 本地调试
```bash
# 启用详细日志
DEBUG=* npm run dev

# 调试测试
NODE_OPTIONS='--inspect' npm run test

# 分析构建包
npm run analyze
```

#### 远程调试
```bash
# 端口转发
kubectl port-forward service/mindnote-production 3000:80 -n production

# 进入容器
kubectl exec -it <pod-name> -n production -- sh

# 查看事件
kubectl get events -n production --sort-by='.lastTimestamp'
```

## 📈 性能优化

### 构建优化
- 使用Next.js增量构建
- 启用Docker层缓存
- 并行执行测试任务
- 优化依赖安装

### 部署优化
- 使用蓝绿部署
- 实施滚动更新
- 配置自动扩缩容
- 优化镜像大小

### 运行时优化
- 启用压缩
- 配置CDN
- 数据库连接池
- Redis缓存策略

## 🔄 最佳实践

### 代码提交
- 使用有意义的提交信息
- 遵循Conventional Commits规范
- 及时创建Pull Request
- 代码审查必须通过

### 分支管理
- main分支保持稳定
- develop分支用于集成
- 功能分支短期存在
- 及时清理已合并分支

### 监控维护
- 定期检查告警配置
- 更新依赖版本
- 备份重要数据
- 文档及时更新

---

**注意**: 本文档会随着项目发展持续更新，请定期查看最新版本。