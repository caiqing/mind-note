#!/bin/bash

# CI/CD烟雾测试脚本 (简化版)
# 专为CI/CD流水线设计的快速烟雾测试

set -euo pipefail

# 配置
BASE_URL="${1:-$STAGING_URL}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
TIMEOUT="${SMOKE_TEST_TIMEOUT:-30}"
LOG_FILE="smoke-test-ci-$(date +%Y%m%d-%H%M%S).log"

# 颜色定义 (在CI中可能不支持)
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO: $1"
}

log_success() {
    log "SUCCESS: $1"
}

log_error() {
    log "ERROR: $1"
}

# HTTP请求函数 (简化版)
make_request() {
    local endpoint="$1"
    local url="${BASE_URL}${endpoint}"

    log_info "测试: $url"

    local response
    response=$(curl -s -w "%{http_code}" \
        --connect-timeout "$TIMEOUT" \
        --max-time "$TIMEOUT" \
        "$url" 2>/dev/null || echo "000")

    local http_code="${response: -3}"
    local response_body="${response%???}"

    case "$http_code" in
        200|201|204)
            log_success "$endpoint - HTTP $http_code ✓"
            return 0
            ;;
        000)
            log_error "$endpoint - 连接失败 ✗"
            return 1
            ;;
        *)
            log_error "$endpoint - HTTP $http_code ✗"
            return 1
            ;;
    esac
}

# 基本健康检查
test_basic_health() {
    log_info "基本健康检查..."

    # 测试主要端点
    local endpoints=(
        "/api/health"
        "/api/monitoring/health"
        "/api/health/database"
        "/api/health/redis"
    )

    local failed=0
    for endpoint in "${endpoints[@]}"; do
        if ! make_request "$endpoint"; then
            ((failed++))
        fi
    done

    if [[ $failed -eq 0 ]]; then
        log_success "所有健康检查通过"
        return 0
    else
        log_error "$failed 个健康检查失败"
        return 1
    fi
}

# 核心功能测试
test_core_features() {
    log_info "核心功能测试..."

    # 测试主要API端点
    local endpoints=(
        "/api/auth/status"
        "/api/notes"
        "/api/search?q=test"
        "/api/dev/ai/status"
    )

    local failed=0
    for endpoint in "${endpoints[@]}"; do
        # 某些端点可能返回401 (未认证)，这是正常的
        if make_request "$endpoint"; then
            log_success "$endpoint 正常"
        elif [[ "$endpoint" == "/api/notes" || "$endpoint" == "/api/search"* ]]; then
            log_info "$endpoint 可能需要认证 (HTTP 401是正常的)"
        else
            ((failed++))
        fi
    done

    if [[ $failed -eq 0 ]]; then
        log_success "核心功能测试通过"
        return 0
    else
        log_error "$failed 个核心功能测试失败"
        return 1
    fi
}

# 性能检查
test_performance() {
    log_info "性能检查..."

    local start_time=$(date +%s)

    if make_request "/api/health"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        if [[ $duration -le 10 ]]; then
            log_success "响应时间: ${duration}s ✓"
            return 0
        else
            log_error "响应时间过慢: ${duration}s ✗"
            return 1
        fi
    else
        return 1
    fi
}

# 安全检查
test_security() {
    log_info "安全检查..."

    # 检查HTTPS (仅在生产环境)
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ "$BASE_URL" == https://* ]]; then
            log_success "生产环境使用HTTPS ✓"
        else
            log_error "生产环境未使用HTTPS ✗"
            return 1
        fi
    fi

    return 0
}

# 主函数
main() {
    log_info "开始CI/CD烟雾测试"
    log_info "环境: $ENVIRONMENT"
    log_info "URL: $BASE_URL"
    log_info "超时: ${TIMEOUT}s"

    # 检查必要工具
    if ! command -v curl &> /dev/null; then
        log_error "curl命令未找到"
        exit 1
    fi

    # 检查URL
    if [[ -z "$BASE_URL" ]]; then
        log_error "未设置BASE_URL"
        log_error "使用方法: $0 <URL>"
        log_error "或设置环境变量: STAGING_URL"
        exit 1
    fi

    local total_failed=0

    # 运行测试
    if ! test_basic_health; then
        ((total_failed++))
    fi

    if ! test_core_features; then
        ((total_failed++))
    fi

    if ! test_performance; then
        ((total_failed++))
    fi

    if ! test_security; then
        ((total_failed++))
    fi

    # 汇总结果
    log_info "烟雾测试完成"

    if [[ $total_failed -eq 0 ]]; then
        log_success "所有烟雾测试通过 ✓"
        echo "::set-output name=status::success"
        exit 0
    else
        log_error "$total_failed 个测试失败 ✗"
        echo "::set-output name=status::failure"
        exit 1
    fi
}

# 显示使用帮助
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    cat << EOF
CI/CD烟雾测试脚本

用法: $0 [URL]

参数:
    URL                    要测试的URL (可选)

环境变量:
    STAGING_URL           Staging环境URL
    ENVIRONMENT           环境名称 (staging|production)
    SMOKE_TEST_TIMEOUT    超时时间 (默认30秒)

示例:
    $0 https://staging.mindnote.com
    STAGING_URL=https://staging.mindnote.com $0

EOF
    exit 0
fi

# 运行主函数
main "$@"