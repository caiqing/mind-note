# 安全扫描系统

这是MindNote项目的安全扫描系统，提供全面的安全漏洞检测和依赖管理功能。

## 🎯 扫描目标

- **依赖漏洞扫描**：检测npm/yarn依赖包中的安全漏洞
- **代码安全扫描**：检查代码中的安全问题和最佳实践违规
- **配置安全检查**：验证配置文件和环境变量的安全性
- **密钥泄露检测**：扫描代码仓库中的敏感信息泄露
- **合规性检查**：确保符合安全标准和最佳实践

## 📁 目录结构

```
scripts/security/
├── security-scanner.ts         # 核心安全扫描器
├── run-security-scan.sh         # 便捷扫描脚本
├── README.md                   # 本文档
└── reports/                    # 扫描报告目录
    ├── security-scan-report.json
    └── security-scan-report.html
```

## 🚀 快速开始

### 基本用法

```bash
# 快速扫描（依赖 + 配置）
npm run security:quick

# 完整扫描（所有类型）
npm run security:full

# 常规扫描
npm run security:scan
```

### 专项扫描

```bash
# 只扫描依赖漏洞
npm run security:deps

# 只扫描代码安全
npm run security:code

# 只扫描配置安全
npm run security:config

# 只扫描密钥泄露
npm run security:secrets
```

### CI/CD集成

```bash
# CI模式扫描（严格模式）
npm run security:ci
```

## 🔧 高级用法

### 使用脚本直接运行

```bash
# 查看所有选项
./scripts/security/run-security-scan.sh --help

# 快速扫描，中危阈值
./scripts/security/run-security-scan.sh --quick --severity medium

# 完整扫描，高危阈值，失败退出
./scripts/security/run-security-scan.sh --full --severity high --fail-on-error

# 自定义报告目录
./scripts/security/run-security-scan.sh --reports-dir ./custom-reports
```

### 使用TypeScript扫描器

```bash
# 直接运行TypeScript扫描器
npx tsx scripts/security/security-scanner.ts

# 带参数运行
npx tsx scripts/security/security-scanner.ts --severity critical --fail-on-vulnerabilities
```

## 📊 扫描类型详解

### 1. 依赖漏洞扫描 (Dependencies)

**检测工具：**
- `npm audit` - Node.js官方依赖审计工具
- `yarn audit` - Yarn包管理器审计工具
- `Snyk` - 第三方漏洞扫描服务

**检测内容：**
- 已知CVE漏洞
- 依赖包安全问题
- 版本兼容性问题
- 恶意包检测

**建议：**
- 定期更新依赖包
- 使用固定版本号
- 监控安全通告
- 使用依赖管理工具

### 2. 代码安全扫描 (Code Security)

**检测工具：**
- `ESLint` - JavaScript/TypeScript代码质量检查
- `TypeScript` - 类型安全检查
- `Semgrep` - 静态代码分析工具

**检测内容：**
- 代码注入漏洞
- 不安全的函数使用
- 类型安全问题
- 安全最佳实践违规

**建议：**
- 启用ESLint安全规则
- 使用严格TypeScript配置
- 遵循安全编码规范
- 定期代码审查

### 3. 配置安全检查 (Configuration)

**检测内容：**
- 环境变量安全
- 配置文件安全
- 文件权限设置
- 敏感信息泄露

**检查文件：**
- `.env*` 环境变量文件
- `package.json` 项目配置
- `next.config.js` Next.js配置
- 其他配置文件

**建议：**
- 避免硬编码敏感信息
- 使用环境变量管理
- 设置适当的文件权限
- 定期审查配置

### 4. 密钥泄露检测 (Secrets)

**检测工具：**
- `GitLeaks` - Git仓库密钥扫描
- `TruffleHog` - 密钥发现工具

**检测内容：**
- API密钥泄露
- 数据库连接字符串
- 私钥和证书
- 其他敏感信息

**建议：**
- 使用环境变量
- 禁用敏感信息提交
- 使用密钥管理服务
- 定期扫描仓库历史

## ⚙️ 配置选项

### 严重程度级别

- `low` - 低危问题
- `medium` - 中危问题（默认）
- `high` - 高危问题
- `critical` - 严重问题

### 扫描模式

- `quick` - 快速扫描（依赖+配置）
- `full` - 完整扫描（所有类型）
- `dependencies` - 只扫描依赖
- `code` - 只扫描代码
- `config` - 只扫描配置
- `secrets` - 只扫描密钥

### 其他选项

- `--fail-on-error` - 发现问题时失败退出
- `--reports-dir` - 自定义报告目录

## 📄 报告格式

扫描完成后会生成两种格式的报告：

### JSON报告

```json
{
  "timestamp": "2025-10-25T10:30:00.000Z",
  "config": {
    "severity": "medium",
    "scanTypes": ["dependencies", "code", "configuration", "secrets"]
  },
  "results": [
    {
      "type": "dependencies",
      "success": true,
      "vulnerabilities": [...],
      "summary": {
        "total": 5,
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 2,
        "passed": true
      },
      "duration": 1500,
      "timestamp": "2025-10-25T10:30:00.000Z"
    }
  ],
  "summary": {
    "total": 12,
    "critical": 1,
    "high": 3,
    "medium": 5,
    "low": 3,
    "passed": false
  }
}
```

### HTML报告

- 可视化界面展示扫描结果
- 按严重程度分类显示问题
- 提供详细的修复建议
- 包含参考链接和资源

## 🔧 工具集成

### ESLint安全规则

安装ESLint安全插件：

```bash
npm install --save-dev eslint-plugin-security
```

配置`.eslintrc.js`：

```javascript
module.exports = {
  extends: [
    'plugin:security/recommended'
  ],
  plugins: ['security']
}
```

### TypeScript配置

使用严格的TypeScript配置：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true
  }
}
```

### Snyk集成

安装Snyk CLI：

```bash
npm install -g snyk
snyk auth
```

## 🚨 问题严重程度说明

### 严重 (Critical)
- 远程代码执行漏洞
- 权限提升漏洞
- 数据泄露风险
- 需要立即修复

### 高危 (High)
- XSS攻击向量
- SQL注入风险
- 认证绕过问题
- 应该优先修复

### 中危 (Medium)
- 安全配置问题
- 信息泄露风险
- 最佳实践违规
- 建议修复

### 低危 (Low)
- 代码质量问题
- 潜在安全风险
- 改进建议
- 可选修复

## 🔄 CI/CD集成

### GitHub Actions示例

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run security scan
        run: npm run security:ci

      - name: Upload security report
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: security-report
          path: reports/security/
```

### Git Hooks集成

使用husky添加pre-commit hook：

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run security:quick"
    }
  }
}
```

## 🛠️ 安全最佳实践

### 依赖管理

1. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

2. **使用固定版本**
   ```json
   {
     "dependencies": {
       "express": "^4.18.0"
     }
   }
   ```

3. **锁定依赖版本**
   ```bash
   npm shrinkwrap
   ```

### 代码安全

1. **输入验证**
   ```typescript
   function validateInput(input: string): boolean {
     const pattern = /^[a-zA-Z0-9\s]+$/
     return pattern.test(input)
   }
   ```

2. **避免不安全的函数**
   ```typescript
   // ❌ 危险
   const result = JSON.parse(userInput)

   // ✅ 安全
   if (typeof userInput === 'string' && userInput.trim()) {
     const result = JSON.parse(userInput)
   }
   ```

3. **使用HTTPS**
   ```typescript
   const response = await fetch('https://api.example.com', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' }
   })
   ```

### 环境变量管理

1. **使用.env文件**
   ```bash
   # .env.example
   DATABASE_URL=postgresql://localhost:5432/mydb
   JWT_SECRET=your-secret-key
   ```

2. **避免提交敏感信息**
   ```bash
   # .gitignore
   .env
   .env.local
   .env.production
   ```

3. **使用环境变量**
   ```typescript
   const dbUrl = process.env.DATABASE_URL
   const jwtSecret = process.env.JWT_SECRET
   ```

## 📚 参考资源

### 官方文档
- [Node.js Security](https://nodejs.org/en/docs/guides/security)
- [npm Audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### 安全工具
- [Snyk](https://snyk.io/) - 依赖漏洞扫描
- [GitLeaks](https://github.com/zricethezard/gitleaks) - 密钥扫描
- [Semgrep](https://semgrep.dev/) - 静态代码分析
- [ESLint Security](https://github.com/nodesecurity/eslint-plugin-security) - 代码安全检查

### 学习资源
- [Secure Coding Handbook](https://github.com/PacktPublishing/Secure-Coding-Handbook)
- [NodeGoat](https://github.com/OWASP/NodeGoat) - Node.js安全练习
- [Web Security Academy](https://portswigger.net/web-security) - Web安全学习

## 🐛 故障排除

### 常见问题

1. **扫描工具未安装**
   ```bash
   # 安装缺少的工具
   npm install -g semgrep gitleaks trufflehog
   ```

2. **权限错误**
   ```bash
   # 给脚本添加执行权限
   chmod +x scripts/security/run-security-scan.sh
   ```

3. **网络问题**
   ```bash
   # 使用代理或镜像
   npm config set registry https://registry.npmjs.org/
   ```

### 调试技巧

1. **查看详细日志**
   ```bash
   # 启用详细输出
   DEBUG=* npm run security:scan
   ```

2. **单独运行扫描器**
   ```bash
   # 只运行依赖扫描
   npx tsx scripts/security/security-scanner.ts --scan-types dependencies
   ```

3. **检查报告文件**
   ```bash
   # 查看JSON报告
   cat reports/security/security-scan-report.json | jq '.'
   ```

## 📞 支持

如果在安全扫描过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查工具是否正确安装
3. 查看扫描报告中的详细信息
4. 在团队频道中寻求帮助

---

**最后更新**: 2025-10-25
**维护者**: MindNote安全团队