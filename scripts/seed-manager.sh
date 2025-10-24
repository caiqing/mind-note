#!/bin/bash

# 种子数据管理脚本
# 提供便捷的种子数据操作命令

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

# 显示帮助信息
show_help() {
    cat << EOF
种子数据管理脚本

用法: $0 <命令> [选项]

命令:
    run         运行种子数据初始化
    reset       重置数据库（清理所有数据）
    validate    验证种子数据完整性
    stats       显示数据库统计信息
    export      导出种子数据
    help        显示此帮助信息

选项:
    -e, --environment <env>    环境 (development|test|staging) [默认: development]
    -c, --clear               清理现有数据
    -n, --notes <count>        创建笔记数量 [默认: 50]
    --skip-ai                 跳过AI处理日志
    --skip-feedback           跳过用户反馈
    --skip-relationships      跳过笔记关系
    -v, --verbose             详细输出
    --dry-run                 模拟运行
    -o, --output <file>       输出文件路径 (用于export命令)

示例:
    $0 run -e development -c -n 100
    $0 run --environment test --skip-ai --verbose
    $0 reset -e development
    $0 validate
    $0 stats
    $0 export -o ./seed-data.json

EOF
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi

    # 检查 npm/npx
    if ! command -v npx &> /dev/null; then
        log_error "npx 未安装"
        exit 1
    fi

    # 检查 tsx
    if ! command -v tsx &> /dev/null; then
        log_warning "tsx 未安装，尝试安装..."
        npm install -g tsx || {
            log_error "tsx 安装失败"
            exit 1
        }
    fi

    # 检查 Prisma
    if ! npx prisma --version &> /dev/null; then
        log_error "Prisma CLI 未安装"
        exit 1
    fi

    log_success "依赖检查完成"
}

# 设置环境变量
setup_environment() {
    local env=${1:-development}

    export NODE_ENV=$env
    export DATABASE_URL=${DATABASE_URL:-"postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_${env}"}

    # 种子脚本配置
    export SEED_CLEAR_DATA=${SEED_CLEAR_DATA:-"false"}
    export SEED_NOTE_COUNT=${SEED_NOTE_COUNT:-"50"}
    export SEED_SKIP_AI=${SEED_SKIP_AI:-"false"}
    export SEED_SKIP_FEEDBACK=${SEED_SKIP_FEEDBACK:-"false"}
    export SEED_SKIP_RELATIONSHIPS=${SEED_SKIP_RELATIONSHIPS:-"false"}
    export SEED_VERBOSE=${SEED_VERBOSE:-"false"}

    log_info "环境配置: $env"
    log_info "数据库: ${DATABASE_URL//mindnote_dev_123@/***@}"
}

# 运行种子数据
run_seed() {
    local environment=$1
    local clear_data=$2
    local notes_count=$3
    local skip_ai=$4
    local skip_feedback=$5
    local skip_relationships=$6
    local verbose=$7
    local dry_run=$8

    setup_environment "$environment"

    # 设置种子脚本配置
    export SEED_CLEAR_DATA=$clear_data
    export SEED_NOTE_COUNT=$notes_count
    export SEED_SKIP_AI=$skip_ai
    export SEED_SKIP_FEEDBACK=$skip_feedback
    export SEED_SKIP_RELATIONSHIPS=$skip_relationships
    export SEED_VERBOSE=$verbose

    log_info "运行种子数据初始化..."
    log_info "环境: $environment"
    log_info "清理现有数据: $clear_data"
    log_info "笔记数量: $notes_count"
    log_info "跳过AI: $skip_ai"
    log_info "跳过反馈: $skip_feedback"
    log_info "跳过关系: $skip_relationships"
    log_info "详细输出: $verbose"
    log_info "模拟运行: $dry_run"

    if [ "$dry_run" = "true" ]; then
        log_warning "模拟模式 - 不会执行实际操作"
        echo
        echo "将要执行的操作:"
        echo "  🧹 清理现有数据: $clear_data"
        echo "  ⚙️ 创建系统配置"
        echo "  👤 创建测试用户"
        echo "  📁 创建分类和标签"
        echo "  📝 创建 $notes_count 条示例笔记"
        echo "  🔗 创建笔记关系: $([ "$skip_relationships" = "false" ] && echo "是" || echo "否")"
        echo "  🤖 创建AI处理日志: $([ "$skip_ai" = "false" ] && echo "是" || echo "否")"
        echo "  💬 创建用户反馈: $([ "$skip_feedback" = "false" ] && echo "是" || echo "否")"
        return 0
    fi

    # 检查种子脚本文件
    local seed_file="prisma/seed-enhanced.ts"
    if [ ! -f "$seed_file" ]; then
        log_error "种子脚本文件不存在: $seed_file"
        exit 1
    fi

    # 运行种子脚本
    if [ "$verbose" = "true" ]; then
        log_info "执行命令: npx tsx $seed_file"
        npx tsx "$seed_file"
    else
        npx tsx "$seed_file" 2>/dev/null
    fi

    if [ $? -eq 0 ]; then
        log_success "种子数据初始化完成"
        show_stats "$environment"
    else
        log_error "种子数据初始化失败"
        exit 1
    fi
}

# 重置数据库
reset_database() {
    local environment=$1
    local verbose=$2

    setup_environment "$environment"

    log_warning "重置数据库 (环境: $environment)..."

    if [ "$verbose" = "true" ]; then
        log_info "清理所有数据表..."
    fi

    # 使用 Prisma 重置数据库
    if [ "$verbose" = "true" ]; then
        npx prisma db push --force-reset
    else
        npx prisma db push --force-reset --skip-generate
    fi

    if [ $? -eq 0 ]; then
        log_success "数据库重置完成"
    else
        log_error "数据库重置失败"
        exit 1
    fi
}

# 验证种子数据
validate_seed() {
    local environment=$1

    setup_environment "$environment"

    log_info "验证种子数据完整性..."

    # 检查基本数据表
    local tables=("users" "categories" "tags" "notes" "system_config")
    local issues=0

    for table in "${tables[@]}"; do
        local count=$(npx prisma db execute --stdin --schema=./prisma/schema.prisma 2>/dev/null <<EOF
SELECT COUNT(*) FROM $table;
EOF
    2>/dev/null | tail -n 1 | tr -d ' ' || echo "0")

        if [ "$count" = "0" ] || [ "$count" = "ERROR" ]; then
            log_error "表 $table 为空或不存在"
            ((issues++))
        else
            if [ "$verbose" = "true" ]; then
                log_info "表 $table: $count 条记录"
            fi
        fi
    done

    if [ $issues -eq 0 ]; then
        log_success "种子数据验证通过"
    else
        log_error "发现 $issues 个数据完整性问题"
        exit 1
    fi
}

# 显示统计信息
show_stats() {
    local environment=$1

    setup_environment "$environment"

    log_info "获取数据库统计信息..."

    echo
    echo "📊 数据库统计:"

    # 获取各表的记录数
    local queries=(
        "SELECT COUNT(*) as count FROM users;"
        "SELECT COUNT(*) as count FROM categories;"
        "SELECT COUNT(*) as count FROM tags;"
        "SELECT COUNT(*) as count FROM notes;"
        "SELECT COUNT(*) as count FROM ai_processing_logs;"
        "SELECT COUNT(*) as count FROM user_feedback;"
        "SELECT COUNT(*) as count FROM note_relationships;"
        "SELECT COUNT(*) as count FROM system_config;"
    )

    local labels=("用户" "分类" "标签" "笔记" "AI处理日志" "用户反馈" "笔记关系" "系统配置")
    local icons=("👤" "📁" "🏷️" "📝" "🤖" "💬" "🔗" "⚙️")

    for i in "${!queries[@]}"; do
        local count=$(npx prisma db execute --stdin --schema=./prisma/schema.prisma 2>/dev/null <<EOF
${queries[$i]}
EOF
    2>/dev/null | tail -n 1 | tr -d ' ' || echo "0")

        printf "  ${icons[$i]} %-12s: %s\n" "${labels[$i]}" "$count"
    done

    echo
}

# 导出种子数据
export_seed() {
    local environment=$1
    local output_file=$2

    setup_environment "$environment"

    log_info "导出种子数据到: $output_file"

    # 创建导出目录
    local output_dir=$(dirname "$output_file")
    mkdir -p "$output_dir"

    # 生成导出脚本
    local export_script="/tmp/export-seed.sql"
    cat > "$export_script" << 'EOF'
-- 种子数据导出脚本
-- 格式化为JSON输出

SELECT json_build_object(
    'metadata', json_build_object(
        'exported_at', NOW(),
        'environment', current_setting('node_env', true),
        'version', '1.0.0'
    ),
    'data', json_build_object(
        'users', (SELECT json_agg(row_to_json(users)) FROM (
            SELECT id, email, username, full_name, email_verified, is_active, settings, ai_preferences, created_at
            FROM users
        ) users),
        'categories', (SELECT json_agg(row_to_json(categories)) FROM categories),
        'tags', (SELECT json_agg(row_to_json(tags)) FROM tags),
        'notes', (SELECT json_agg(row_to_json(notes)) FROM (
            SELECT id, title, content, status, word_count, reading_time, ai_processed, is_public, view_count, created_at, updated_at, category_id, user_id, ai_summary, ai_keywords, ai_categories
            FROM notes
        ) notes),
        'system_configs', (SELECT json_agg(row_to_json(system_configs)) FROM system_configs)
    )
) as seed_data;
EOF

    # 执行导出
    if npx prisma db execute --file "$export_script" --schema=./prisma/schema.prisma 2>/dev/null > "$output_file"; then
        # 清理输出（移除PostgreSQL的额外格式）
        sed -i.bak '1d;$d' "$output_file" 2>/dev/null || sed -i '' '1d;$d' "$output_file"
        rm -f "${output_file}.bak"

        log_success "数据导出成功"
        log_info "输出文件: $output_file"
    else
        log_error "数据导出失败"
        exit 1
    fi

    # 清理临时文件
    rm -f "$export_script"
}

# 主函数
main() {
    local command=${1:-help}
    shift

    # 解析选项
    local environment="development"
    local clear_data="false"
    local notes_count="50"
    local skip_ai="false"
    local skip_feedback="false"
    local skip_relationships="false"
    local verbose="false"
    local dry_run="false"
    local output_file="./seed-export.json"

    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            -c|--clear)
                clear_data="true"
                shift
                ;;
            -n|--notes)
                notes_count="$2"
                shift 2
                ;;
            --skip-ai)
                skip_ai="true"
                shift
                ;;
            --skip-feedback)
                skip_feedback="true"
                shift
                ;;
            --skip-relationships)
                skip_relationships="true"
                shift
                ;;
            -v|--verbose)
                verbose="true"
                shift
                ;;
            --dry-run)
                dry_run="true"
                shift
                ;;
            -o|--output)
                output_file="$2"
                shift 2
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    case $command in
        run)
            check_dependencies
            run_seed "$environment" "$clear_data" "$notes_count" "$skip_ai" "$skip_feedback" "$skip_relationships" "$verbose" "$dry_run"
            ;;
        reset)
            check_dependencies
            reset_database "$environment" "$verbose"
            ;;
        validate)
            check_dependencies
            validate_seed "$environment"
            ;;
        stats)
            check_dependencies
            show_stats "$environment"
            ;;
        export)
            check_dependencies
            export_seed "$environment" "$output_file"
            ;;
        help)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"