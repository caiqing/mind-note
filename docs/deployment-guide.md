# MindNote 生产部署指南

**版本**: v1.0.0 **更新日期**: 2025-10-26 **目标环境**: 生产环境

## 📋 部署概述

本指南详细说明了如何将MindNote智能笔记应用部署到生产环境。MindNote是一个基于Next.js 15、React
19、PostgreSQL和Prisma ORM构建的现代化Web应用。

## 🏗️ 系统架构

```mermaid
graph TB
    A[负载均衡器] --> B[Next.js 应用服务器]
    B --> C[PostgreSQL 数据库]
    B --> D[Redis 缓存]
    B --> E[文件存储 S3/OSS]

    F[用户] --> A
    G[CDN] --> E

    subgraph "监控层"
        H[性能监控]
        I[错误追踪]
        J[日志收集]
    end

    B --> H
    B --> I
    B --> J
```

## 🔧 环境要求

### 最低系统要求

- **CPU**: 2核心
- **内存**: 4GB RAM
- **存储**: 20GB SSD
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2

### 软件依赖

- **Node.js**: v22.14.0+
- **npm**: v10.0.0+
- **PostgreSQL**: v14.0+
- **Redis**: v6.0+ (可选，用于缓存)
- **Nginx**: v1.18+ (推荐，用于反向代理)

## 📦 部署步骤

### 1. 服务器准备

#### 1.1 安装Node.js

```bash
# 使用NVM安装Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22.14.0
nvm use 22.14.0
```

#### 1.2 安装PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 1.3 创建数据库和用户

```bash
sudo -u postgres psql
CREATE DATABASE mindnote_prod;
CREATE USER mindnote_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mindnote_prod TO mindnote_user;
\q
```

#### 1.4 安装Redis (可选)

```bash
# Ubuntu/Debian
sudo apt install redis-server

# CentOS/RHEL
sudo yum install redis
sudo systemctl start redis
sudo systemctl enable redis
```

### 2. 应用部署

#### 2.1 克隆代码库

```bash
# 创建应用目录
sudo mkdir -p /var/www/mindnote
sudo chown $USER:$USER /var/www/mindnote

# 克隆代码
cd /var/www/mindnote
git clone https://github.com/your-username/mindnote.git .
```

#### 2.2 安装依赖

```bash
# 使用legacy-peer-deps解决依赖冲突
npm install --legacy-peer-deps
```

#### 2.3 环境变量配置

创建生产环境配置文件：

```bash
cp .env.example .env.local
nano .env.local
```

**生产环境配置示例**:

```env
# 数据库配置
DATABASE_URL="postgresql://mindnote_user:your_secure_password@localhost:5432/mindnote_prod"

# NextAuth配置
NEXTAUTH_SECRET="your_nextauth_secret_key_here"
NEXTAUTH_URL="https://your-domain.com"

# 应用配置
NODE_ENV="production"
PORT="3000"

# Redis配置 (可选)
REDIS_URL="redis://localhost:6379"

# 文件存储配置
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="mindnote-uploads"

# AI服务配置
ANTHROPIC_API_KEY="your_anthropic_api_key"
OPENAI_API_KEY="your_openai_api_key"

# 监控配置
SENTRY_DSN="your_sentry_dsn"
LOG_LEVEL="info"
```

#### 2.4 数据库迁移

```bash
# 生成Prisma客户端
npx prisma generate

# 推送数据库schema
npx prisma db push

# (可选) 运行数据库种子
npx prisma db seed
```

#### 2.5 构建应用

```bash
# 构建生产版本
npm run build

# 验证构建
ls -la .next
```

### 3. 进程管理

#### 3.1 安装PM2

```bash
npm install -g pm2
```

#### 3.2 创建PM2配置文件

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'mindnote',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/mindnote',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/mindnote/error.log',
      out_file: '/var/log/mindnote/out.log',
      log_file: '/var/log/mindnote/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
    },
  ],
};
```

#### 3.3 启动应用

```bash
# 创建日志目录
sudo mkdir -p /var/log/mindnote
sudo chown $USER:$USER /var/log/mindnote

# 启动应用
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 4. Nginx配置 (推荐)

#### 4.1 安装Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 4.2 创建Nginx配置

创建 `/etc/nginx/sites-available/mindnote`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # 文件上传大小限制
    client_max_body_size 50M;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 代理到Next.js应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态文件缓存
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

#### 4.3 启用站点

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/mindnote /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 5. SSL证书配置

#### 5.1 使用Let's Encrypt (推荐)

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔍 监控和日志

### 1. PM2监控

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs mindnote

# 查看监控面板
pm2 monit
```

### 2. 系统日志

```bash
# 应用日志
tail -f /var/log/mindnote/combined.log

# Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 系统日志
journalctl -u nginx -f
```

### 3. 健康检查

```bash
# 本地健康检查
curl http://localhost:3000/api/health

# 外部健康检查
curl https://your-domain.com/api/health
```

## 🚀 部署脚本

创建自动化部署脚本 `deploy.sh`:

```bash
#!/bin/bash

set -e

echo "🚀 开始MindNote生产部署..."

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用sudo运行此脚本"
    exit 1
fi

# 更新系统
echo "📦 更新系统包..."
apt update && apt upgrade -y

# 安装依赖
echo "📦 安装系统依赖..."
apt install -y curl git nginx postgresql postgresql-contrib redis-server

# 创建应用用户
echo "👤 创建应用用户..."
useradd -m -s /bin/bash mindnote 2>/dev/null || true

# 设置应用目录
APP_DIR="/var/www/mindnote"
echo "📁 设置应用目录: $APP_DIR"
mkdir -p $APP_DIR
chown mindnote:mindnote $APP_DIR

# 切换到应用用户
su - mindnote << 'EOF'

# 克隆代码
echo "📥 克隆代码库..."
cd /var/www/mindnote
git clone https://github.com/your-username/mindnote.git .

# 安装Node.js
echo "📦 安装Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22.14.0
nvm use 22.14.0

# 安装依赖
echo "📦 安装应用依赖..."
npm install --legacy-peer-deps

# 配置环境变量
echo "⚙️ 配置环境变量..."
cp .env.example .env.local
echo "请编辑 .env.local 文件配置生产环境变量"

EOF

echo "✅ 基础环境设置完成！"
echo "📝 请完成以下步骤："
echo "1. 编辑 /var/www/mindnote/.env.local 配置环境变量"
echo "2. 配置PostgreSQL数据库"
echo "3. 运行 npm run build 构建应用"
echo "4. 配置PM2进程管理"
echo "5. 配置Nginx反向代理"
echo "6. 设置SSL证书"

echo "🎉 部署脚本执行完成！"
```

## 🔒 安全配置

### 1. 防火墙设置

```bash
# 配置UFW防火墙
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. 数据库安全

```bash
# PostgreSQL安全配置
sudo -u postgres psql
\password postgres  # 设置postgres用户密码

# 编辑pg_hba.conf配置文件
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

### 3. 定期备份

创建备份脚本 `backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/mindnote"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 数据库备份
pg_dump -h localhost -U mindnote_user mindnote_prod > $BACKUP_DIR/db_backup_$DATE.sql

# 压缩备份
gzip $BACKUP_DIR/db_backup_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "数据库备份完成: $BACKUP_DIR/db_backup_$DATE.sql.gz"
```

## 📊 性能优化

### 1. Node.js优化

- 使用PM2集群模式
- 设置适当的内存限制
- 启用V8优化选项

### 2. 数据库优化

- 配置适当的连接池
- 添加必要的索引
- 定期VACUUM和ANALYZE

### 3. 缓存策略

- Redis缓存热点数据
- CDN加速静态资源
- 浏览器缓存配置

## 🚨 故障排除

### 常见问题

#### 1. 应用无法启动

```bash
# 检查PM2状态
pm2 status

# 查看错误日志
pm2 logs mindnote --err

# 检查端口占用
sudo netstat -tlnp | grep :3000
```

#### 2. 数据库连接失败

```bash
# 测试数据库连接
psql -h localhost -U mindnote_user -d mindnote_prod

# 检查PostgreSQL状态
sudo systemctl status postgresql
```

#### 3. Nginx配置错误

```bash
# 测试Nginx配置
sudo nginx -t

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

## 📈 扩展部署

### 水平扩展

- 使用负载均衡器
- 多个应用实例
- 数据库读写分离

### 容器化部署

- Docker容器化
- Kubernetes编排
- 微服务架构

## 📞 支持和联系

- **技术文档**: [项目Wiki](https://github.com/your-username/mindnote/wiki)
- **问题报告**: [GitHub Issues](https://github.com/your-username/mindnote/issues)
- **邮件支持**: support@mindnote.com

---

**最后更新**: 2025-10-26 **文档版本**: v1.0.0 **维护团队**: MindNote开发团队
