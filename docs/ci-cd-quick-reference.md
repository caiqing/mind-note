# CI/CD 快速参考

## 🚀 常用命令

### 本地开发
```bash
# 启动开发服务器
npm run dev

# 安装依赖
npm install

# 类型检查
npm run type-check

# 代码检查
npm run lint
npm run lint:fix

# 运行测试
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:all
```

### 数据库操作
```bash
# 数据库迁移
npm run db:migrate
npm run db:migrate:rollback
npm run db:migrate:status

# 数据库种子
npm run db:seed
npm run db:seed:dev
npm run db:seed:test

# 数据库健康检查
npm run db:health
npm run db:health:report
```

### 构建和部署
```bash
# 构建应用
npm run build

# 烟雾测试
npm run test:smoke
npm run test:smoke:staging
npm run test:smoke:production

# 安全扫描
npm run security:scan
npm run security:quick
npm run security:full
```

## 🔄 CI/CD 流程

### 开发流程
1. 创建功能分支: `git checkout -b feature/new-feature`
2. 开发和测试: `npm run test:all`
3. 提交代码: `git commit -m "feat: add new feature"`
4. 推送分支: `git push origin feature/new-feature`
5. 创建Pull Request
6. CI自动运行测试
7. 代码审查通过后合并到develop
8. 自动部署到Staging
9. Staging测试通过后合并到main
10. 自动部署到Production

### 发布流程
```bash
# 1. 更新版本号
npm version patch|minor|major

# 2. 创建发布标签
git tag v1.2.0
git push origin v1.2.0

# 3. 触发Production部署
git push origin main

# 4. 验证部署
npm run test:smoke:production
```

## 📊 环境配置

### 环境变量
| 变量名 | 开发环境 | Staging | Production |
|--------|----------|---------|------------|
| NODE_ENV | development | staging | production |
| DATABASE_URL | localhost | staging-db | prod-db |
| REDIS_URL | localhost | staging-redis | prod-redis |
| NEXTAUTH_SECRET | dev-secret | staging-secret | prod-secret |

### URLs
| 环境 | URL | 说明 |
|------|-----|-----|
| 开发 | http://localhost:3000 | 本地开发 |
| Staging | https://staging.mindnote.com | 预发布环境 |
| Production | https://mindnote.com | 生产环境 |

## 🧪 测试命令

### 单元测试
```bash
# 运行所有单元测试
npm run test:unit

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# UI模式
npm run test:ui
```

### 集成测试
```bash
# 运行集成测试
npm run test:integration

# API测试
npm run test:api
```

### E2E测试
```bash
# 运行E2E测试
npm run test:e2e

# UI组件测试
npm run test:ui:components
npm run test:ui:ai
npm run test:ui:all
```

### 烟雾测试
```bash
# 本地烟雾测试
npm run test:smoke

# Staging环境
npm run test:smoke:staging

# Production环境
npm run test:smoke:production

# CI模式
npm run test:smoke:ci
```

## 🔧 故障排除

### CI失败
```bash
# 1. 检查代码质量
npm run lint
npm run type-check

# 2. 运行本地测试
npm run test:all

# 3. 检查依赖
npm audit
npm audit fix

# 4. 清理重新安装
rm -rf node_modules package-lock.json
npm install
```

### 部署失败
```bash
# 1. 检查Kubernetes状态
kubectl get pods -n production
kubectl describe pod <pod-name> -n production

# 2. 查看日志
kubectl logs <pod-name> -n production

# 3. 检查服务状态
kubectl get services -n production
kubectl get ingress -n production
```

### 性能问题
```bash
# 1. 检查资源使用
kubectl top pods -n production
kubectl top nodes

# 2. 分析应用性能
npm run analyze

# 3. 检查数据库性能
npm run db:health:report
```

## 🚨 回滚操作

### 快速回滚
```bash
# Helm回滚
helm rollback mindnote-production -n production

# Kubectl回滚
kubectl rollout undo deployment/mindnote-production -n production

# 检查回滚状态
kubectl rollout status deployment/mindnote-production -n production
```

### 紧急修复
```bash
# 1. 创建hotfix分支
git checkout -b hotfix/critical-issue

# 2. 修复问题
# ... 编写修复代码 ...

# 3. 测试验证
npm run test:all

# 4. 快速合并和部署
git add .
git commit -m "hotfix: fix critical issue"
git push origin hotfix/critical-issue

# 5. 创建紧急PR并合并
```

## 📈 监控命令

### 应用监控
```bash
# 健康检查
curl https://mindnote.com/api/health

# 监控状态
curl https://mindnote.com/api/monitoring/health

# 系统信息
curl https://mindnote.com/api/monitoring/status
```

### 日志查看
```bash
# 生产环境日志
kubectl logs -f deployment/mindnote-production -n production

# Staging环境日志
kubectl logs -f deployment/mindnote-staging -n staging

# 过滤错误日志
kubectl logs deployment/mindnote-production -n production | grep ERROR
```

## 🔐 安全操作

### 安全扫描
```bash
# 快速扫描
npm run security:quick

# 完整扫描
npm run security:full

# 依赖扫描
npm run security:deps

# 代码扫描
npm run security:code

# 配置扫描
npm run security:config

# 密钥扫描
npm run security:secrets
```

### 密钥管理
```bash
# 添加新的GitHub Secret
# 1. 进入GitHub仓库Settings
# 2. Secrets and variables > Actions
# 3. New repository secret
# 4. 添加密钥对

# 更新环境变量
# 1. 修改.env.example
# 2. 更新各个环境的.env文件
# 3. 更新GitHub Secrets
```

## 📋 检查清单

### 提交前检查
- [ ] 代码通过所有测试 (`npm run test:all`)
- [ ] 代码质量检查通过 (`npm run lint`)
- [ ] 类型检查通过 (`npm run type-check`)
- [ ] 构建成功 (`npm run build`)
- [ ] 安全扫描通过 (`npm run security:quick`)
- [ ] 文档已更新 (如有必要)
- [ ] 提交信息符合规范

### 发布前检查
- [ ] 所有测试通过
- [ ] Staging环境验证通过
- [ ] 烟雾测试通过
- [ ] 性能测试通过
- [ ] 安全扫描通过
- [ ] 备份已完成
- [ ] 回滚计划已准备

### 部署后检查
- [ ] 应用健康状态正常
- [ ] 烟雾测试通过
- [ ] 核心功能验证
- [ ] 性能指标正常
- [ ] 错误日志检查
- [ ] 用户反馈监控

## 📞 联系信息

### 开发团队
- **技术负责人**: [姓名] <email@example.com>
- **DevOps工程师**: [姓名] <email@example.com>
- **测试工程师**: [姓名] <email@example.com>

### 紧急联系
- **生产问题**: #production-alerts (Slack)
- **安全问题**: security@example.com
- **值班电话**: [电话号码]

---

**提示**: 将此页面添加到浏览器书签，方便快速查阅常用命令和流程。