#!/bin/bash

# 数据库初始化脚本
# 用于创建开发环境的数据库和扩展

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."

    # 检查 PostgreSQL
    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL 未安装或不在 PATH 中"
        log_info "请安装 PostgreSQL: https://www.postgresql.org/download/"
        exit 1
    fi

    # 检查 PostgreSQL 服务状态
    if ! pg_isready -q; then
        log_warning "PostgreSQL 服务未运行，尝试启动..."

        # 尝试启动 PostgreSQL (macOS)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew &> /dev/null; then
                brew services start postgresql || true
                sleep 3
            fi
        fi

        # 再次检查
        if ! pg_isready -q; then
            log_error "无法启动 PostgreSQL 服务，请手动启动"
            exit 1
        fi
    fi

    # 检查 Redis (可选)
    if command -v redis-cli &> /dev/null; then
        if ! redis-cli ping &> /dev/null; then
            log_warning "Redis 服务未运行，某些功能可能不可用"
            log_info "启动 Redis: redis-server 或 brew services start redis"
        else
            log_success "Redis 服务运行正常"
        fi
    else
        log_warning "Redis 未安装，某些功能可能不可用"
        log_info "安装 Redis: https://redis.io/download"
    fi

    log_success "依赖检查完成"
}

# 创建数据库用户和数据库
create_database() {
    log_info "创建数据库用户和数据库..."

    local db_user="mindnote"
    local db_password="mindnote_dev_123"
    local db_name="mindnote_dev"
    local test_db_name="mindnote_test"

    # 检查是否使用 sudo
    local sudo_cmd=""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS 通常不需要 sudo
        sudo_cmd=""
    else
        # Linux 可能需要 sudo
        sudo_cmd="sudo -u postgres"
    fi

    # 创建用户（如果不存在）
    log_info "创建数据库用户: $db_user"
    $sudo_cmd psql -c "DO \$\$BEGIN
        CREATE USER $db_user WITH PASSWORD '$db_password';
    \$\$EXCEPT
        -- 用户已存在，跳过
    \$\$END;" 2>/dev/null || true

    # 创建主数据库
    log_info "创建主数据库: $db_name"
    $sudo_cmd psql -c "CREATE DATABASE $db_name OWNER $db_user;" 2>/dev/null || {
        log_warning "数据库 $db_name 已存在"
    }

    # 创建测试数据库
    log_info "创建测试数据库: $test_db_name"
    $sudo_cmd psql -c "CREATE DATABASE $test_db_name OWNER $db_user;" 2>/dev/null || {
        log_warning "数据库 $test_db_name 已存在"
    }

    # 授予权限
    log_info "设置数据库权限..."
    $sudo_cmd psql -c "GRANT ALL PRIVILEGES ON DATABASE $db_name TO $db_user;" 2>/dev/null || true
    $sudo_cmd psql -c "GRANT ALL PRIVILEGES ON DATABASE $test_db_name TO $db_user;" 2>/dev/null || true

    log_success "数据库创建完成"
}

# 安装 PostgreSQL 扩展
install_extensions() {
    log_info "安装 PostgreSQL 扩展..."

    # 获取数据库连接信息
    local db_url="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"

    # 安装 pgvector 扩展
    log_info "安装 pgvector 扩展 (向量搜索支持)..."
    psql "$db_url" -c "CREATE EXTENSION IF NOT EXISTS vector;" || {
        log_error "安装 pgvector 扩展失败"
        log_info "请手动安装 pgvector: https://github.com/pgvector/pgvector"
        return 1
    }

    # 安装其他有用的扩展
    log_info "安装其他扩展..."
    psql "$db_url" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null || true # 模糊搜索
    psql "$db_url" -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;" 2>/dev/null || true # UUID 生成
    psql "$db_url" -c "CREATE EXTENSION IF NOT EXISTS btree_gin;" 2>/dev/null || true # GIN 索引支持

    log_success "扩展安装完成"
}

# 验证数据库连接
verify_connection() {
    log_info "验证数据库连接..."

    local db_url="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"

    # 测试连接
    if psql "$db_url" -c "SELECT 1;" &> /dev/null; then
        log_success "数据库连接验证成功"
    else
        log_error "数据库连接验证失败"
        return 1
    fi

    # 检查 pgvector 扩展
    if psql "$db_url" -c "SELECT * FROM pg_extension WHERE extname = 'vector';" | grep -q vector; then
        log_success "pgvector 扩展可用"
    else
        log_error "pgvector 扩展不可用"
        return 1
    fi
}

# 初始化数据库结构
initialize_schema() {
    log_info "初始化数据库结构..."

    # 生成 Prisma 客户端
    log_info "生成 Prisma 客户端..."
    npm run db:generate || {
        log_error "Prisma 客户端生成失败"
        return 1
    }

    # 推送 schema 到数据库
    log_info "推送数据库 schema..."
    npm run db:push || {
        log_error "数据库 schema 推送失败"
        return 1
    }

    log_success "数据库结构初始化完成"
}

# 运行种子数据
run_seeds() {
    log_info "运行种子数据..."

    npm run db:seed || {
        log_error "种子数据运行失败"
        return 1
    }

    log_success "种子数据运行完成"
}

# 显示数据库信息
show_database_info() {
    log_info "数据库连接信息:"
    echo "  主机: localhost"
    echo "  端口: 5432"
    echo "  用户: mindnote"
    echo "  密码: mindnote_dev_123"
    echo "  数据库: mindnote_dev"
    echo ""
    log_info "连接字符串:"
    echo "  postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"
    echo ""
    log_info "管理命令:"
    echo "  连接数据库: psql postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"
    echo "  查看数据库: \\l"
    echo "  查看表: \\dt"
    echo "  Prisma Studio: npm run db:studio"
}

# 主函数
main() {
    echo "🗄️  MindNote 数据库初始化脚本"
    echo "=================================="

    case "${1:-init}" in
        "check")
            check_dependencies
            ;;
        "create")
            create_database
            ;;
        "extensions")
            install_extensions
            ;;
        "verify")
            verify_connection
            ;;
        "schema")
            initialize_schema
            ;;
        "seed")
            run_seeds
            ;;
        "info")
            show_database_info
            ;;
        "init")
            check_dependencies
            create_database
            install_extensions
            verify_connection
            initialize_schema
            run_seeds
            show_database_info
            log_success "数据库初始化完成！"
            ;;
        "reset")
            log_warning "重置数据库..."
            log_info "删除现有数据库..."
            local sudo_cmd=""
            if [[ "$OSTYPE" != "darwin"* ]]; then
                sudo_cmd="sudo -u postgres"
            fi
            $sudo_cmd psql -c "DROP DATABASE IF EXISTS mindnote_dev;" 2>/dev/null || true
            $sudo_cmd psql -c "DROP DATABASE IF EXISTS mindnote_test;" 2>/dev/null || true
            log_success "数据库删除完成"
            main init
            ;;
        "help"|"-h"|"--help")
            echo "用法: $0 [命令]"
            echo ""
            echo "命令:"
            echo "  init      完整初始化数据库 (默认)"
            echo "  check     检查系统依赖"
            echo "  create    创建数据库用户和数据库"
            echo "  extensions 安装 PostgreSQL 扩展"
            echo "  verify    验证数据库连接"
            echo "  schema    初始化数据库结构"
            echo "  seed      运行种子数据"
            echo "  info      显示数据库连接信息"
            echo "  reset     重置数据库"
            echo "  help      显示此帮助信息"
            ;;
        *)
            log_error "未知命令: $1"
            echo "使用 '$0 help' 查看帮助信息"
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"