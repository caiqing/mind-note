#!/bin/bash

# 数据库健康检查脚本
# 用于验证数据库环境是否正常运行

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

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."

    if [ -z "$DATABASE_URL" ]; then
        # 使用默认连接字符串
        DATABASE_URL="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"
    fi

    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        log_success "数据库连接正常"
        return 0
    else
        log_error "数据库连接失败"
        return 1
    fi
}

# 检查数据库版本和配置
check_database_info() {
    log_info "检查数据库信息..."

    if [ -z "$DATABASE_URL" ]; then
        DATABASE_URL="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"
    fi

    echo "数据库版本:"
    psql "$DATABASE_URL" -c "SELECT version();" 2>/dev/null || {
        log_error "无法获取数据库版本信息"
        return 1
    }

    echo ""
    echo "数据库大小:"
    psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null || {
        log_warning "无法获取数据库大小信息"
    }

    echo ""
    echo "连接数:"
    psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || {
        log_warning "无法获取连接数信息"
    }
}

# 检查必需的表
check_required_tables() {
    log_info "检查必需的表..."

    if [ -z "$DATABASE_URL" ]; then
        DATABASE_URL="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"
    fi

    local required_tables=(
        "users"
        "notes"
        "categories"
        "tags"
        "note_tags"
        "note_relationships"
        "ai_processing_logs"
        "user_feedback"
        "system_config"
    )

    local missing_tables=()
    local existing_tables=()

    for table in "${required_tables[@]}"; do
        if psql "$DATABASE_URL" -c "\dt $table;" 2>/dev/null | grep -q "$table"; then
            existing_tables+=("$table")
        else
            missing_tables+=("$table")
        fi
    done

    if [ ${#missing_tables[@]} -eq 0 ]; then
        log_success "所有必需的表都存在"
        echo "存在的表: ${existing_tables[*]}"
    else
        log_error "缺少必需的表: ${missing_tables[*]}"
        return 1
    fi
}

# 检查扩展
check_extensions() {
    log_info "检查 PostgreSQL 扩展..."

    if [ -z "$DATABASE_URL" ]; then
        DATABASE_URL="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"
    fi

    local required_extensions=(
        "vector"
        "uuid-ossp"
        "pg_trgm"
    )

    local missing_extensions=()
    local installed_extensions=()

    for ext in "${required_extensions[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM pg_extension WHERE extname = '$ext';" 2>/dev/null | grep -q "1"; then
            installed_extensions+=("$ext")
        else
            missing_extensions+=("$ext")
        fi
    done

    if [ ${#missing_extensions[@]} -eq 0 ]; then
        log_success "所有必需的扩展都已安装"
        echo "已安装的扩展: ${installed_extensions[*]}"
    else
        log_warning "缺少扩展: ${missing_extensions[*]}"
        echo "安装命令:"
        for ext in "${missing_extensions[@]}"; do
            echo "  CREATE EXTENSION IF NOT EXISTS $ext;"
        done
        return 1
    fi
}

# 检查索引
check_indexes() {
    log_info "检查重要索引..."

    if [ -z "$DATABASE_URL" ]; then
        DATABASE_URL="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"
    fi

    local important_indexes=(
        "users_email_key"
        "users_username_key"
        "categories_name_key"
        "tags_name_key"
        "notes_user_id_created_at_idx"
        "notes_status_idx"
        "notes_fulltext_search"
    )

    local missing_indexes=()
    local existing_indexes=()

    for index in "${important_indexes[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM pg_indexes WHERE indexname = '$index';" 2>/dev/null | grep -q "1"; then
            existing_indexes+=("$index")
        else
            missing_indexes+=("$index")
        fi
    done

    if [ ${#missing_indexes[@]} -eq 0 ]; then
        log_success "所有重要索引都存在"
        echo "存在的索引: ${existing_indexes[*]}"
    else
        log_warning "缺少重要索引: ${missing_indexes[*]}"
        return 1
    fi
}

# 检查外键约束
check_foreign_keys() {
    log_info "检查外键约束..."

    if [ -z "$DATABASE_URL" ]; then
        DATABASE_URL="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"
    fi

    local fk_count=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';" 2>/dev/null | tr -d ' ')

    if [ "$fk_count" -gt 0 ]; then
        log_success "外键约束正常 ($fk_count 个)"
    else
        log_warning "未找到外键约束"
        return 1
    fi
}

# 检查数据完整性
check_data_integrity() {
    log_info "检查数据完整性..."

    if [ -z "$DATABASE_URL" ]; then
        DATABASE_URL="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"
    fi

    # 检查用户数
    local user_count=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM users;" 2>/dev/null | tr -d ' ')
    echo "用户数: $user_count"

    # 检查笔记数
    local note_count=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM notes;" 2>/dev/null | tr -d ' ')
    echo "笔记数: $note_count"

    # 检查分类数
    local category_count=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM categories;" 2>/dev/null | tr -d ' ')
    echo "分类数: $category_count"

    # 检查标签数
    local tag_count=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM tags;" 2>/dev/null | tr -d ' ')
    echo "标签数: $tag_count"

    # 检查孤立数据
    local orphaned_notes=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM notes n LEFT JOIN users u ON n.user_id = u.id WHERE u.id IS NULL;" 2>/dev/null | tr -d ' ')
    if [ "$orphaned_notes" -gt 0 ]; then
        log_warning "发现 $orphaned_notes 条孤立笔记"
    fi

    # 检查数据一致性
    local invalid_statuses=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM notes WHERE status NOT IN ('DRAFT', 'PUBLISHED', 'ARCHIVED');" 2>/dev/null | tr -d ' ')
    if [ "$invalid_statuses" -gt 0 ]; then
        log_warning "发现 $invalid_statuses 条无效状态的笔记"
    fi
}

# 检查性能指标
check_performance() {
    log_info "检查性能指标..."

    if [ -z "$DATABASE_URL" ]; then
        DATABASE_URL="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"
    fi

    # 检查慢查询
    echo "最近慢查询:"
    psql "$DATABASE_URL" -c "SELECT query, calls, total_time, mean_time, rows FROM pg_stat_statements WHERE mean_time > 100 ORDER BY mean_time DESC LIMIT 5;" 2>/dev/null || {
        log_warning "无法获取慢查询信息"
    }

    echo ""
    echo "表大小:"
    psql "$DATABASE_URL" -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;" 2>/dev/null || {
        log_warning "无法获取表大小信息"
    }
}

# 生成健康报告
generate_health_report() {
    local report_file="database-health-report-$(date +%Y%m%d-%H%M%S).txt"

    log_info "生成健康报告: $report_file"

    {
        echo "MindNote 数据库健康报告"
        echo "生成时间: $(date)"
        echo "=================================="
        echo ""

        echo "连接信息:"
        check_database_connection
        echo ""

        echo "数据库信息:"
        check_database_info
        echo ""

        echo "必需表检查:"
        check_required_tables
        echo ""

        echo "扩展检查:"
        check_extensions
        echo ""

        echo "索引检查:"
        check_indexes
        echo ""

        echo "外键约束检查:"
        check_foreign_keys
        echo ""

        echo "数据完整性:"
        check_data_integrity
        echo ""

        echo "性能指标:"
        check_performance

    } > "$report_file" 2>&1

    log_success "健康报告已生成: $report_file"
}

# 主函数
main() {
    echo "🏥 MindNote 数据库健康检查"
    echo "==============================="
    echo ""

    case "${1:-full}" in
        "connection")
            check_database_connection
            ;;
        "info")
            check_database_info
            ;;
        "tables")
            check_required_tables
            ;;
        "extensions")
            check_extensions
            ;;
        "indexes")
            check_indexes
            ;;
        "constraints")
            check_foreign_keys
            ;;
        "integrity")
            check_data_integrity
            ;;
        "performance")
            check_performance
            ;;
        "report")
            generate_health_report
            ;;
        "full")
            local exit_code=0

            check_database_connection || exit_code=1
            echo ""

            check_database_info
            echo ""

            check_required_tables || exit_code=1
            echo ""

            check_extensions || exit_code=1
            echo ""

            check_indexes || exit_code=1
            echo ""

            check_foreign_keys || exit_code=1
            echo ""

            check_data_integrity
            echo ""

            check_performance
            echo ""

            if [ $exit_code -eq 0 ]; then
                log_success "所有健康检查通过！"
            else
                log_error "发现健康问题，请检查上述错误"
            fi

            exit $exit_code
            ;;
        "help"|"-h"|"--help")
            echo "用法: $0 [检查类型]"
            echo ""
            echo "检查类型:"
            echo "  connection   检查数据库连接"
            echo "  info         检查数据库基本信息"
            echo "  tables       检查必需的表"
            echo "  extensions    检查 PostgreSQL 扩展"
            echo "  indexes      检查重要索引"
            echo "  constraints   检查外键约束"
            echo "  integrity    检查数据完整性"
            echo "  performance   检查性能指标"
            echo "  report       生成完整健康报告"
            echo "  full         执行所有检查 (默认)"
            echo "  help         显示此帮助信息"
            ;;
        *)
            log_error "未知检查类型: $1"
            echo "使用 '$0 help' 查看帮助信息"
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"