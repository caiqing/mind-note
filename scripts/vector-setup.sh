#!/bin/bash

# pgvector扩展配置脚本
# 用于安装和配置PostgreSQL向量搜索支持

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
pgvector扩展配置脚本

用法: $0 <命令> [选项]

命令:
    install     安装pgvector扩展
    check       检查pgvector扩展状态
    setup       设置向量搜索配置
    index       创建向量索引
    reindex     重新索引现有数据
    stats       显示向量搜索统计
    help        显示此帮助信息

选项:
    -e, --environment <env>    环境 (development|test|staging) [默认: development]
    -v, --verbose             详细输出
    -f, --force               强制执行操作

示例:
    $0 install -e development
    $0 check
    $0 setup --verbose
    $0 index --force
    $0 reindex -e test
    $0 stats

EOF
}

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."

    local db_url="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev"

    if psql "$db_url" -c "SELECT 1;" &> /dev/null; then
        log_success "数据库连接正常"
        return 0
    else
        log_error "数据库连接失败"
        return 1
    fi
}

# 安装pgvector扩展
install_pgvector() {
    local environment=$1
    local force=$2

    log_info "安装pgvector扩展 (环境: $environment)..."

    local db_url="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_${environment}"

    # 检查扩展是否已安装
    local extension_exists=$(psql "$db_url" -t -c "SELECT 1 FROM pg_extension WHERE extname = 'vector';" 2>/dev/null | tr -d ' ')

    if [ "$extension_exists" = "1" ] && [ "$force" != "true" ]; then
        log_warning "pgvector扩展已存在，使用 --force 强制重新安装"
        return 0
    fi

    # 创建扩展
    if psql "$db_url" -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null; then
        log_success "pgvector扩展安装成功"
    else
        log_error "pgvector扩展安装失败"

        # 提供安装指导
        log_info "请确保系统已安装pgvector，安装方法："
        log_info "  macOS: brew install pgvector"
        log_info "  Ubuntu: sudo apt-get install postgresql-15-pgvector"
        log_info "  或参考: https://github.com/pgvector/pgvector#installation"

        return 1
    fi

    # 验证扩展功能
    log_info "验证扩展功能..."

    local test_result=$(psql "$db_url" -c "SELECT vector('[1,2,3]'::vector); SELECT 1;" 2>/dev/null | tail -n 1 | tr -d ' ')

    if [ "$test_result" = "1" ]; then
        log_success "pgvector扩展功能验证成功"
    else
        log_warning "pgvector扩展功能验证失败，但扩展已安装"
    fi
}

# 检查pgvector扩展状态
check_pgvector_status() {
    local environment=$1

    log_info "检查pgvector扩展状态..."

    local db_url="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_${environment}"

    # 检查扩展是否存在
    local extension_info=$(psql "$db_url" -c "
        SELECT
            extname as name,
            extversion as version,
            n.nspname as schema
        FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE extname = 'vector';
    " 2>/dev/null)

    if [ -n "$extension_info" ]; then
        log_success "pgvector扩展已安装"
        echo "$extension_info"

        # 检查向量类型支持
        log_info "检查向量类型支持..."
        local type_test=$(psql "$db_url" -c "SELECT '[1,2,3]'::vector;" 2>/dev/null)
        if [ $? -eq 0 ]; then
            log_success "向量类型支持正常"
        else
            log_warning "向量类型支持异常"
        fi

        # 检查向量操作符支持
        log_info "检查向量操作符支持..."
        local operator_test=$(psql "$db_url" -c "SELECT '[1,2,3]'::vector <=> '[1,2,3]'::vector;" 2>/dev/null)
        if [ $? -eq 0 ]; then
            log_success "向量操作符支持正常"
        else
            log_warning "向量操作符支持异常"
        fi

    else
        log_warning "pgvector扩展未安装"
        return 1
    fi
}

# 设置向量搜索配置
setup_vector_config() {
    local environment=$1
    local verbose=$2

    log_info "设置向量搜索配置..."

    local db_url="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_${environment}"

    # 创建向量搜索相关的配置表（如果不存在）
    log_info "检查向量嵌入表..."

    local table_exists=$(psql "$db_url" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'vector_embeddings';" 2>/dev/null | tr -d ' ')

    if [ "$table_exists" != "1" ]; then
        log_warning "向量嵌入表不存在，请确保数据库迁移已执行"
        log_info "建议运行: npm run db:migrate:apply"
    else
        log_success "向量嵌入表存在"
    fi

    # 创建向量搜索索引
    log_info "创建向量搜索索引..."
    create_vector_index "$environment" "$verbose"

    # 优化数据库配置
    log_info "优化向量搜索性能配置..."

    # 调整work_mem以支持向量操作
    local current_work_mem=$(psql "$db_url" -t -c "SHOW work_mem;" 2>/dev/null | tr -d ' ')
    if [ "$verbose" = "true" ]; then
        log_info "当前work_mem: $current_work_mem"
    fi

    # 建议的work_mem设置
    local recommended_work_mem="64MB"
    log_info "建议将work_mem设置为 $recommended_work_mem 以优化向量搜索性能"

    # 检查shared_buffers
    local current_shared_buffers=$(psql "$db_url" -t -c "SHOW shared_buffers;" 2>/dev/null | tr -d ' ')
    if [ "$verbose" = "true" ]; then
        log_info "当前shared_buffers: $current_shared_buffers"
    fi

    log_success "向量搜索配置设置完成"
}

# 创建向量索引
create_vector_index() {
    local environment=$1
    local force=$2

    log_info "创建向量搜索索引..."

    local db_url="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_${environment}"

    # 检查向量嵌入表是否存在
    local table_exists=$(psql "$db_url" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'vector_embeddings';" 2>/dev/null | tr -d ' ')

    if [ "$table_exists" != "1" ]; then
        log_error "向量嵌入表不存在，无法创建索引"
        return 1
    fi

    # 检查索引是否已存在
    local index_exists=$(psql "$db_url" -t -c "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vector_embeddings_embedding';" 2>/dev/null | tr -d ' ')

    if [ "$index_exists" = "1" ] && [ "$force" != "true" ]; then
        log_warning "向量索引已存在，使用 --force 强制重新创建"
        return 0
    fi

    # 删除现有索引（如果存在）
    if [ "$index_exists" = "1" ]; then
        log_info "删除现有向量索引..."
        psql "$db_url" -c "DROP INDEX IF EXISTS idx_vector_embeddings_embedding;" 2>/dev/null
    fi

    # 创建IVFFLAT索引（适合大量数据的近似搜索）
    log_info "创建IVFFLAT向量索引..."
    if psql "$db_url" -c "
        CREATE INDEX idx_vector_embeddings_embedding
        ON vector_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    " 2>/dev/null; then
        log_success "IVFFLAT向量索引创建成功"
    else
        log_warning "IVFFLAT索引创建失败，尝试创建基础索引..."

        # 创建基础索引
        if psql "$db_url" -c "
            CREATE INDEX idx_vector_embeddings_embedding_basic
            ON vector_embeddings
            USING gist (embedding vector_cosine_ops);
        " 2>/dev/null; then
            log_success "基础向量索引创建成功"
        else
            log_error "向量索引创建失败"
            return 1
        fi
    fi

    # 创建辅助索引
    log_info "创建辅助索引..."

    # note_id索引
    psql "$db_url" -c "CREATE INDEX IF NOT EXISTS idx_vector_embeddings_note_id ON vector_embeddings (note_id);" 2>/dev/null

    # 创建时间索引
    psql "$db_url" -c "CREATE INDEX IF NOT EXISTS idx_vector_embeddings_created_at ON vector_embeddings (created_at);" 2>/dev/null

    log_success "向量索引创建完成"
}

# 重新索引现有数据
reindex_existing_data() {
    local environment=$1
    local verbose=$2

    log_info "重新索引现有笔记数据..."

    local db_url="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_${environment}"

    # 检查是否有笔记需要重新索引
    local notes_without_embedding=$(psql "$db_url" -t -c "
        SELECT COUNT(*)
        FROM notes n
        LEFT JOIN vector_embeddings ve ON n.id = ve.note_id
        WHERE ve.note_id IS NULL AND n.status = 'PUBLISHED';
    " 2>/dev/null | tr -d ' ')

    if [ "$notes_without_embedding" = "0" ]; then
        log_success "所有已发布笔记都有向量嵌入，无需重新索引"
        return 0
    fi

    log_info "发现 $notes_without_embedding 条笔记需要重新索引"

    # 获取需要重新索引的笔记
    log_info "开始重新索引过程..."

    # 这里可以调用应用程序的重新索引API
    # 或者直接在数据库中生成向量（需要pgvector的embedding函数）

    if command -v curl &> /dev/null; then
        log_info "通过API调用重新索引..."

        # 调用应用程序的重新索引端点
        local api_url="http://localhost:3000/api/v1/vector/reindex"

        if curl -s -X POST "$api_url" -H "Content-Type: application/json" \
           -d "{\"environment\": \"$environment\"}" > /dev/null; then
            log_success "重新索引API调用成功"
        else
            log_warning "重新索引API调用失败，请手动调用API或运行应用程序的重新索引功能"
        fi
    else
        log_warning "curl命令不可用，请手动调用重新索引API"
    fi
}

# 显示向量搜索统计
show_vector_stats() {
    local environment=$1

    log_info "获取向量搜索统计信息..."

    local db_url="postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_${environment}"

    # 基础统计
    echo
    echo "📊 向量搜索统计 (环境: $environment)"
    echo "=================================="

    # 向量嵌入总数
    local total_embeddings=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM vector_embeddings;" 2>/dev/null | tr -d ' ')
    echo "向量嵌入总数: $total_embeddings"

    # 不同模型的嵌入数量
    if [ "$total_embeddings" -gt 0 ]; then
        echo
        echo "模型使用分布:"
        psql "$db_url" -c "
            SELECT model, COUNT(*) as count
            FROM vector_embeddings
            GROUP BY model
            ORDER BY count DESC;
        " 2>/dev/null

        # 向量维度分布
        echo
        echo "向量维度分布:"
        psql "$db_url" -c "
            SELECT dimensions, COUNT(*) as count
            FROM vector_embeddings
            GROUP BY dimensions
            ORDER BY dimensions;
        " 2>/dev/null

        # 创建时间分布
        echo
        echo "创建时间分布（最近7天）:"
        psql "$db_url" -c "
            SELECT
                DATE(created_at) as date,
                COUNT(*) as count
            FROM vector_embeddings
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC;
        " 2>/dev/null
    fi

    # 索引信息
    echo
    echo "向量索引信息:"
    local vector_indexes=$(psql "$db_url" -c "
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE indexname LIKE '%vector%' OR indexname LIKE '%embedding%';
    " 2>/dev/null)

    if [ -n "$vector_indexes" ]; then
        echo "$vector_indexes"
    else
        echo "未找到向量相关索引"
    fi

    # 数据库性能参数
    echo
    echo "相关性能参数:"
    psql "$db_url" -c "
        SELECT name, setting, unit
        FROM pg_settings
        WHERE name IN ('work_mem', 'shared_buffers', 'maintenance_work_mem')
        ORDER BY name;
    " 2>/dev/null
}

# 主函数
main() {
    local command=${1:-help}
    shift

    # 解析选项
    local environment="development"
    local verbose="false"
    local force="false"

    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            -v|--verbose)
                verbose="true"
                shift
                ;;
            -f|--force)
                force="true"
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    case $command in
        install)
            check_database_connection
            install_pgvector "$environment" "$force"
            ;;
        check)
            check_database_connection
            check_pgvector_status "$environment"
            ;;
        setup)
            check_database_connection
            check_pgvector_status "$environment"
            setup_vector_config "$environment" "$verbose"
            ;;
        index)
            check_database_connection
            create_vector_index "$environment" "$force"
            ;;
        reindex)
            check_database_connection
            reindex_existing_data "$environment" "$verbose"
            ;;
        stats)
            check_database_connection
            show_vector_stats "$environment"
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