# MindNote 数据库操作指南

## 概述

本指南提供了 MindNote 数据库的日常操作、维护和故障排除方法，涵盖从基础设置到高级优化的各个方面。

## 快速开始

### 1. 数据库初始化

```bash
# 完整初始化（推荐）
npm run db:init

# 或者分步执行
npm run db:reset  # 重置数据库
npm run db:seed  # 生成种子数据
```

### 2. 检查数据库状态

```bash
# 基础健康检查
npm run db:health

# 生成详细报告
npm run db:health:report

# 检查配置信息
npm run db:info
```

### 3. 种子数据管理

```bash
# 运行增强种子脚本
npm run db:seed-enhanced

# 开发环境种子数据
npm run db:seed:dev

# 测试环境种子数据（20条笔记）
npm run db:seed:test

# 验证种子数据
npm run db:seed:validate

# 查看统计信息
npm run db:seed:stats
```

## 向量搜索设置

### 1. 安装和配置 pgvector

```bash
# 安装pgvector扩展
npm run vector:install

# 检查扩展状态
npm run vector:check

# 设置向量搜索配置
npm run vector:setup

# 创建向量索引
npm run vector:index
```

### 2. 向量搜索操作

```bash
# 重新索引现有数据
npm run vector:reindex

# 查看向量搜索统计
npm run vector:stats
```

## 数据库迁移管理

### 1. 创建新迁移

```bash
# 创建迁移文件
npx prisma migrate dev --name add_new_feature

# 应用迁移
npm run db:migrate:apply
```

### 2. 迁移操作

```bash
# 应用所有待处理的迁移
npm run db:migrate:apply

# 回滚最后一个迁移
npm run db:migrate:rollback

# 查看迁移状态
npm run db:migrate:status

# 验证迁移结果
npm run db:migrate:validate
```

### 3. 数据库模式管理

```bash
# 生成 Prisma 客户端
npm run db:generate

# 推送模式更改（开发环境）
npm run db:push

# 打开 Prisma Studio
npm run db:studio
```

## 连接池管理

### 1. 连接池配置

通过 API 获取当前配置：

```bash
curl -X GET "http://localhost:3000/api/dev/database/pool?action=config" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 连接池优化

```bash
# 通过 Web 界面
# 访问: http://localhost:3000/api/dev/database/pool

# 使用脚本监控
./scripts/database-health-check.sh performance
```

### 3. 常见配置调整

开发环境配置：
```json
{
  "minConnections": 2,
  "maxConnections": 10,
  "connectionTimeoutMs": 5000,
  "idleTimeoutMs": 30000
}
```

生产环境配置：
```json
{
  "minConnections": 10,
  "maxConnections": 50,
  "connectionTimeoutMs": 10000,
  "idleTimeoutMs": 120000
}
```

## 健康检查和监控

### 1. 基础健康检查

```bash
# 完整健康检查
npm run db:health

# 特定组件检查
./scripts/database-health-check.sh connection
./scripts/database-health-check.sh performance
./scripts/database-health-check.sh extensions
```

### 2. 详细健康报告

```bash
# 生成健康报告
npm run db:health:report

# 查看报告文件
cat database-health-report-$(date +%Y%m%d-%H%M%S).txt
```

### 3. 通过 API 监控

```bash
# 综合健康检查
curl -X GET "http://localhost:3000/api/dev/health?detailed=true"

# 检查特定组件
curl -X GET "http://localhost:3000/api/dev/health?component=pool"
curl -X GET "http://localhost:3000/api/dev/health?component=performance"
```

## 性能优化

### 1. 查询优化

```bash
# 检查慢查询
psql -d mindnote_dev -c "
  SELECT query, calls, total_time, mean_time, rows
  FROM pg_stat_statements
  WHERE mean_time > 1000
  ORDER BY mean_time DESC
  LIMIT 10;
"

# 检查索引使用情况
psql -d mindnote_dev -c "
  SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes
  ORDER BY idx_scan DESC;
"
```

### 2. 索引优化

```sql
-- 为常用查询创建索引
CREATE INDEX CONCURRENTLY idx_notes_user_status
ON notes(user_id, status);

-- 为全文搜索创建索引
CREATE INDEX CONCURRENTLY idx_notes_fulltext
ON notes USING gin(to_tsvector('chinese', title || ' ' || content));

-- 为向量搜索创建索引
CREATE INDEX CONCURRENTLY idx_vector_embeddings_embedding
ON vector_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 3. 数据库参数调优

```sql
-- 调整工作内存（适合向量操作）
SET work_mem = '64MB';

-- 调整共享缓冲区
SET shared_buffers = '256MB';

-- 调整维护工作内存
SET maintenance_work_mem = '1GB';
```

## 备份和恢复

### 1. 数据备份

```bash
# 全量备份
pg_dump -h localhost -U mindnote -d mindnote_dev \
  --format=custom \
  --compress=9 \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump

# 仅备份数据（不含结构）
pg_dump -h localhost -U mindnote -d mindnote_dev \
  --data-only \
  --compress=9 \
  --file=data_backup_$(date +%Y%m%d_%H%M%S).sql

# 备份特定表
pg_dump -h localhost -U mindnote -d mindnote_dev \
  --table=notes \
  --table=users \
  --file=notes_users_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 数据恢复

```bash
# 恢复完整数据库
psql -h localhost -U mindnote -d mindnote_dev \
  < backup_20241024_200000.dump

# 恢复数据（保留结构）
psql -h localhost -U mindnote -d mindnote_dev \
  < data_backup_20241024_200000.sql

# 恢复特定表
psql -h localhost -U mindnote -d mindnote_dev \
  < notes_users_backup_20241024_200000.sql
```

### 3. 自动备份脚本

```bash
#!/bin/bash
# 创建自动备份脚本
BACKUP_DIR="/path/to/backups"
DB_NAME="mindnote_dev"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mindnote_backup_$DATE.dump"

mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -h localhost -U mindnote -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --file=$BACKUP_FILE

# 清理旧备份（保留7天）
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete

echo "备份完成: $BACKUP_FILE"
```

## 故障排除

### 1. 连接问题

#### 检查数据库服务状态

```bash
# 检查 PostgreSQL 服务
pg_isready -h localhost -p 5432

# 检查连接
psql -h localhost -U mindnote -d mindnote_dev -c "SELECT 1;"
```

#### 常见连接错误及解决方法

**错误**: `Connection refused`
```bash
# 启动 PostgreSQL 服务
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux
```

**错误**: `FATAL: database "mindnote_dev" does not exist`
```bash
# 创建数据库
createdb -U mindnote mindnote_dev
```

**错误**: `FATAL: role "mindnote" does not exist`
```bash
# 创建用户
createuser -s mindnote
psql -c "ALTER USER mindnote PASSWORD 'mindnote_dev_123';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE mindnote_dev TO mindnote;"
```

### 2. 权限问题

#### 检查表权限

```sql
-- 检查表所有权
SELECT tableowner, tablename
FROM pg_tables
WHERE schemaname = 'public';

-- 修复表所有权
ALTER TABLE notes OWNER TO mindnote;
ALTER TABLE users OWNER TO mindnote;
```

#### 修复扩展权限

```sql
-- 授予扩展权限
GRANT ALL ON SCHEMA public TO mindnote;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mindnote;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mindnote;
```

### 3. 性能问题

#### 检查锁等待

```sql
-- 查看锁等待
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process,
       blocked_activity.application_name AS blocked_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

#### 检查长事务

```sql
-- 查看长事务
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

### 4. 磁盘空间问题

#### 检查数据库大小

```sql
-- 检查数据库总大小
SELECT pg_size_pretty(pg_database_size('mindnote_dev'));

-- 检查表大小
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                     pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 数据库监控

### 1. 实时监控脚本

```bash
#!/bin/bash
# 数据库监控脚本

DB_NAME="mindnote_dev"
LOG_FILE="/var/log/db_monitor.log"
ALERT_THRESHOLD=90

# 检查连接数
CONNECTIONS=$(psql -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity;")
echo "$(date): 当前连接数: $CONNECTIONS" >> $LOG_FILE

if [ $CONNECTIONS -gt $ALERT_THRESHOLD ]; then
    echo "$(date): WARNING: 连接数超过阈值 ($CONNECTIONS > $ALERT_THRESHOLD)" >> $LOG_FILE
fi

# 检查数据库大小
DB_SIZE=$(psql -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
echo "$(date): 数据库大小: $DB_SIZE" >> $LOG_FILE

# 检查慢查询
SLOW_QUERIES=$(psql -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM pg_stat_statements
  WHERE mean_time > 1000;
")

if [ $SLOW_QUERIES -gt 0 ]; then
    echo "$(date): WARNING: 发现 $SLOW_QUERIES 个慢查询" >> $LOG_FILE
fi
```

### 2. 告警配置

```sql
-- 设置连接数警告
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- 启用日志记录
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 5000;
```

## 安全操作

### 1. 用户管理

```sql
-- 创建只读用户
CREATE USER readonly_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE mindnote_dev TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- 创建应用用户
CREATE USER app_user WITH PASSWORD 'app_password';
GRANT CONNECT ON DATABASE mindnote_dev TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### 2. 权限检查

```sql
-- 检查用户权限
SELECT
    u.usename,
    d.datname,
    u.has_database_privilege,
    u.has_schema_privilege,
    u.has_table_privilege
FROM (
    SELECT
        usename,
        has_database_privilege(usesysid, datname) AS has_database_privilege,
        has_schema_privilege(usesysid, nspname) AS has_schema_privilege,
        has_table_privilege(usesysid, nspname, relname) AS has_table_privilege
    FROM pg_user u
    CROSS JOIN pg_database d ON u.usesysid = d.datdba
    CROSS JOIN pg_namespace n ON u.usesysid = n.nspowner
    CROSS JOIN pg_class c ON n.oid = c.relnamespace
    WHERE u.usename = 'app_user' AND d.datname = 'mindnote_dev'
) u
JOIN pg_database d ON u.usename = 'app_user';
```

## 最佳实践

### 1. 开发环境

- 使用较小的连接池（2-10个连接）
- 启用详细日志记录
- 定期清理测试数据
- 使用模拟数据避免敏感信息泄露

### 2. 生产环境

- 使用较大的连接池（10-50个连接）
- 配置SSL连接
- 设置连接超时和重试机制
- 实施定期备份策略
- 监控性能指标和告警

### 3. 数据迁移

- 始终在测试环境验证迁移脚本
- 创建回滚计划
- 备份重要数据
- 在低峰期执行迁移
- 验证迁移结果

## 工具和资源

### 1. 推荐工具

- **Prisma Studio**: 可视化数据库管理
- **pgAdmin**: PostgreSQL 管理工具
- **DBeaver**: 通用数据库工具
- **DataGrip**: JetBrains 数据库IDE

### 2. 监控工具

- **pg_stat_statements**: 查询性能统计
- **pg_stat_activity**: 连接和活动监控
- **pg_stat_user_indexes**: 索引使用统计
- **pg_stat_user_tables**: 表访问统计

### 3. 学习资源

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [Prisma 文档](https://www.prisma.io/docs/)
- [pgvector 文档](https://github.com/pgvector/pgvector)
- [数据库性能优化指南](https://www.postgresql.org/docs/current/performance-tips.html)

---

本文档最后更新时间: 2024年10月24日