#!/bin/bash

# MindNote烟雾测试脚本
# 验证部署后的基本功能是否正常工作

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
DEFAULT_TIMEOUT=30
DEFAULT_BASE_URL="http://localhost:3000"
LOG_FILE="smoke-test-$(date +%Y%m%d-%H%M%S).log"

# 参数解析
BASE_URL="${STAGING_URL:-$DEFAULT_BASE_URL}"
PRODUCTION_URL="${PRODUCTION_URL:-}"
ENVIRONMENT="${ENVIRONMENT:-development}"
TIMEOUT="${SMOKE_TEST_TIMEOUT:-$DEFAULT_TIMEOUT}"
VERBOSE="${VERBOSE:-false}"

# 显示帮助信息
show_help() {
    cat << EOF
MindNote烟雾测试脚本

用法: $0 [选项] [URL]

选项:
    -u, --url URL          设置基础URL (默认: $DEFAULT_BASE_URL)
    -e, --env ENV          设置环境 (development|staging|production)
    -t, --timeout SEC      设置超时时间 (默认: $DEFAULT_TIMEOUT秒)
    -v, --verbose          详细输出
    -q, --quiet            静默模式
    -h, --help             显示此帮助信息

环境变量:
    STAGING_URL            Staging环境URL
    PRODUCTION_URL         Production环境URL
    ENVIRONMENT            环境名称
    SMOKE_TEST_TIMEOUT     超时时间
    VERBOSE                详细输出

示例:
    $0                                    # 测试本地开发环境
    $0 -e staging                         # 测试staging环境
    $0 -u https://staging.mindnote.com    # 测试指定URL
    $0 -e production -t 60                # 测试生产环境，超时60秒

EOF
}

# 日志函数
log() {
    if [[ "$VERBOSE" == "true" ]] || [[ "$1" != "DEBUG" ]]; then
        echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $2" | tee -a "$LOG_FILE"
    fi
}

log_info() {
    log "INFO" "${BLUE}INFO:${NC} $1"
}

log_success() {
    log "SUCCESS" "${GREEN}SUCCESS:${NC} $1"
}

log_warning() {
    log "WARNING" "${YELLOW}WARNING:${NC} $1"
}

log_error() {
    log "ERROR" "${RED}ERROR:${NC} $1"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        log "DEBUG" "DEBUG: $1"
    fi
}

# HTTP请求函数
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local expected_status="${4:-200}"
    local url="${BASE_URL}${endpoint}"

    log_debug "发送 $method 请求到: $url"

    if [[ -n "$data" ]]; then
        response=$(curl -s -w "\n%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            --connect-timeout "$TIMEOUT" \
            --max-time "$TIMEOUT" \
            "$url" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            --connect-timeout "$TIMEOUT" \
            --max-time "$TIMEOUT" \
            "$url" 2>&1)
    fi

    # 分离响应体和状态码
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)

    log_debug "HTTP状态码: $http_code"
    log_debug "响应体: $response_body"

    if [[ "$http_code" == "$expected_status" ]]; then
        log_success "$endpoint - HTTP $http_code ✓"
        return 0
    else
        log_error "$endpoint - HTTP $http_code (期望 $expected_status) ✗"
        log_error "响应: $response_body"
        return 1
    fi
}

# 健康检查
test_health_check() {
    log_info "开始健康检查..."

    # 基本健康检查
    if make_request "GET" "/api/health"; then
        log_success "基本健康检查通过"
    else
        log_error "基本健康检查失败"
        return 1
    fi

    # 详细健康检查
    if make_request "GET" "/api/monitoring/health"; then
        log_success "详细健康检查通过"
    else
        log_warning "详细健康检查失败 (可能未启用监控)"
    fi

    return 0
}

# 数据库连接测试
test_database_connection() {
    log_info "测试数据库连接..."

    if make_request "GET" "/api/health/database"; then
        log_success "数据库连接正常"
        return 0
    else
        log_error "数据库连接失败"
        return 1
    fi
}

# Redis连接测试
test_redis_connection() {
    log_info "测试Redis连接..."

    if make_request "GET" "/api/health/redis"; then
        log_success "Redis连接正常"
        return 0
    else
        log_warning "Redis连接失败 (可能未启用Redis)"
        return 0
    fi
}

# AI服务测试
test_ai_services() {
    log_info "测试AI服务..."

    # 测试AI配置
    if make_request "GET" "/api/dev/ai/configure"; then
        log_success "AI配置端点正常"
    else
        log_warning "AI配置端点异常 (开发环境可能未启用)"
    fi

    # 测试AI状态
    if make_request "GET" "/api/dev/ai/status"; then
        log_success "AI状态端点正常"
    else
        log_warning "AI状态端点异常"
    fi

    return 0
}

# 用户功能测试
test_user_features() {
    log_info "测试用户功能..."

    # 测试注册端点
    local test_user='{"email":"test@example.com","name":"Test User","password":"test123456"}'
    if make_request "POST" "/api/auth/register" "$test_user" "201"; then
        log_success "用户注册端点正常"
    else
        log_warning "用户注册端点异常 (可能用户已存在)"
    fi

    # 测试登录端点
    local login_data='{"email":"test@example.com","password":"test123456"}'
    if make_request "POST" "/api/auth/login" "$login_data" "200"; then
        log_success "用户登录端点正常"
    else
        log_warning "用户登录端点异常"
    fi

    return 0
}

# 笔记功能测试
test_note_features() {
    log_info "测试笔记功能..."

    # 测试获取笔记列表
    if make_request "GET" "/api/notes"; then
        log_success "笔记列表端点正常"
    else
        log_warning "笔记列表端点异常 (可能需要认证)"
    fi

    # 测试创建笔记
    local note_data='{"title":"Smoke Test Note","content":"This is a smoke test note"}'
    if make_request "POST" "/api/notes" "$note_data" "201"; then
        log_success "创建笔记端点正常"
    else
        log_warning "创建笔记端点异常 (可能需要认证)"
    fi

    return 0
}

# 搜索功能测试
test_search_features() {
    log_info "测试搜索功能..."

    # 测试搜索端点
    if make_request "GET" "/api/search?q=test"; then
        log_success "搜索端点正常"
    else
        log_warning "搜索端点异常"
    fi

    return 0
}

# 文件上传测试
test_file_upload() {
    log_info "测试文件上传功能..."

    # 创建临时测试文件
    local temp_file=$(mktemp)
    echo "Smoke test content" > "$temp_file"

    # 测试文件上传
    if curl -s -w "%{http_code}" \
        -X POST \
        -F "file=@$temp_file" \
        --connect-timeout "$TIMEOUT" \
        --max-time "$TIMEOUT" \
        "${BASE_URL}/api/upload" | grep -q "200\|201"; then
        log_success "文件上传端点正常"
    else
        log_warning "文件上传端点异常"
    fi

    # 清理临时文件
    rm -f "$temp_file"

    return 0
}

# 性能测试
test_performance() {
    log_info "进行基本性能测试..."

    local start_time=$(date +%s.%N)

    if make_request "GET" "/api/health"; then
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc -l)

        if (( $(echo "$duration < 5.0" | bc -l) )); then
            log_success "响应时间: ${duration}s ✓"
        else
            log_warning "响应时间较慢: ${duration}s"
        fi
    fi

    return 0
}

# 安全性测试
test_security() {
    log_info "进行基本安全性测试..."

    # 测试HTTPS重定向 (仅在生产环境)
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ "$BASE_URL" == https://* ]]; then
            log_success "生产环境使用HTTPS ✓"
        else
            log_error "生产环境未使用HTTPS ✗"
            return 1
        fi
    fi

    # 测试安全头
    local security_headers=$(curl -s -I "${BASE_URL}/api/health" 2>/dev/null || true)

    if echo "$security_headers" | grep -qi "x-frame-options"; then
        log_success "X-Frame-Options头存在 ✓"
    else
        log_warning "X-Frame-Options头缺失"
    fi

    if echo "$security_headers" | grep -qi "x-content-type-options"; then
        log_success "X-Content-Type-Options头存在 ✓"
    else
        log_warning "X-Content-Type-Options头缺失"
    fi

    return 0
}

# 主测试函数
run_smoke_tests() {
    local failed_tests=0
    local total_tests=0

    log_info "开始烟雾测试 - 环境: $ENVIRONMENT"
    log_info "目标URL: $BASE_URL"
    log_info "超时时间: ${TIMEOUT}s"
    log_info "日志文件: $LOG_FILE"

    # 运行测试
    local tests=(
        "test_health_check"
        "test_database_connection"
        "test_redis_connection"
        "test_ai_services"
        "test_user_features"
        "test_note_features"
        "test_search_features"
        "test_performance"
        "test_security"
    )

    # 可选的文件上传测试
    if [[ "${SKIP_FILE_UPLOAD:-false}" != "true" ]]; then
        tests+=("test_file_upload")
    fi

    for test in "${tests[@]}"; do
        echo
        log_info "运行测试: $test"
        ((total_tests++))

        if $test; then
            log_success "$test 通过"
        else
            log_error "$test 失败"
            ((failed_tests++))
        fi
    done

    # 汇总结果
    echo
    log_info "烟雾测试完成"
    log_info "总测试数: $total_tests"
    log_info "失败测试数: $failed_tests"
    log_info "成功率: $(( (total_tests - failed_tests) * 100 / total_tests ))%"

    if [[ $failed_tests -eq 0 ]]; then
        log_success "所有烟雾测试通过 ✓"
        return 0
    else
        log_error "$failed_tests 个测试失败 ✗"
        return 1
    fi
}

# 参数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            case $2 in
                staging)
                    BASE_URL="${STAGING_URL:-https://staging.mindnote.com}"
                    ;;
                production)
                    BASE_URL="${PRODUCTION_URL:-https://mindnote.com}"
                    ;;
                *)
                    log_error "无效的环境: $2"
                    exit 1
                    ;;
            esac
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -q|--quiet)
            VERBOSE="false"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
        *)
            BASE_URL="$1"
            shift
            ;;
    esac
done

# 检查curl是否可用
if ! command -v curl &> /dev/null; then
    log_error "curl命令未找到，请安装curl"
    exit 1
fi

# 检查bc是否可用 (用于性能测试)
if ! command -v bc &> /dev/null; then
    log_warning "bc命令未找到，跳过性能测试"
    SKIP_PERFORMANCE_TEST="true"
fi

# 检查URL是否可达
log_info "检查服务器可达性..."
if ! curl -s --connect-timeout 5 --max-time 10 "$BASE_URL/api/health" > /dev/null 2>&1; then
    log_error "无法连接到服务器: $BASE_URL"
    exit 1
fi

# 运行烟雾测试
if run_smoke_tests; then
    log_success "烟雾测试成功完成"
    exit 0
else
    log_error "烟雾测试失败"
    exit 1
fi