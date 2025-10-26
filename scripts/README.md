# 脚本使用指南

MindNote 项目提供了一组精简的核心脚本，用于开发和测试工作。

## 📁 核心脚本

### 1. test-api-complete.js

**完整的API测试套件**

```bash
# 运行完整API测试
node scripts/test-api-complete.js
```

**功能覆盖：**

- API连接测试 (/api/health)
- 笔记API测试 (GET/POST/PUT/DELETE)
- 用户认证测试
- 错误处理测试
- 性能基准测试

### 2. test-db-connection.js

**数据库连接测试**

```bash
# 测试数据库连接
node scripts/test-db-connection.js
```

**功能覆盖：**

- PostgreSQL连接测试
- 基本CRUD操作测试
- 数据库schema验证
- 查询性能测试
- 事务处理测试

### 3. check-db-users.js

**数据库用户验证**

```bash
# 验证数据库用户
node scripts/check-db-users.js
```

**功能覆盖：**

- 数据库用户连接验证
- 用户权限检查
- 演示数据验证

## 🚀 使用建议

### 开发工作流

1. **启动开发服务器前**

   ```bash
   node scripts/test-db-connection.js
   ```

2. **API开发完成后**

   ```bash
   node scripts/test-api-complete.js
   ```

3. **遇到数据库问题时**
   ```bash
   node scripts/check-db-users.js
   ```

### 持续集成

这些脚本可以集成到CI/CD流程中：

```yaml
# .github/workflows/test.yml示例
- name: Test Database Connection
  run: node scripts/test-db-connection.js

- name: Test API Endpoints
  run: node scripts/test-api-complete.js
```

## 🔧 环境要求

- **Node.js**: 18.0+
- **PostgreSQL**: 14+
- **环境变量**: 确保 `.env.local` 配置正确

## 📊 输出说明

所有脚本都提供结构化的输出：

```
✅ 测试名称 - 通过
❌ 测试名称 - 失败
📊 性能指标 - 数值
⏱️ 执行时间 - X秒
```

## 🛠️ 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 PostgreSQL 服务是否运行
   - 验证 `.env.local` 中的数据库连接字符串

2. **API测试失败**
   - 确保开发服务器正在运行 (`npm run dev`)
   - 检查端口 3000 是否可用

3. **权限错误**
   - 确保数据库用户具有必要的权限
   - 验证数据库表结构是否正确

### 调试模式

大多数脚本支持详细输出：

```bash
# 启用详细日志
DEBUG=true node scripts/test-api-complete.js
```

## 📝 贡献指南

如需添加新的测试脚本：

1. 遵循现有的命名约定
2. 提供清晰的错误消息
3. 包含性能基准测试
4. 更新此README文档

## 📞 支持

如遇到问题，请：

1. 查看项目文档
2. 检查 GitHub Issues
3. 运行诊断脚本获取详细信息

---

**最后更新**: 2025-10-26
