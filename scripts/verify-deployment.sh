#!/bin/bash

# 部署验证脚本
# 验证部署是否成功并运行基本检查

set -euo pipefail

# 配置
NAMESPACE="${1:-mindnote-production}"
RELEASE_NAME="${2:-mindnote-production}"
TIMEOUT="${DEPLOYMENT_TIMEOUT:-300}"
LOG_FILE="deployment-verify-$(date +%Y%m%d-%H%M%S).log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

log_warning() {
    log "WARNING: $1"
}

log_error() {
    log "ERROR: $1"
}

# 检查工具
check_tools() {
    local tools=("kubectl" "helm")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool 命令未找到，请安装 $tool"
            exit 1
        fi
    done
}

# 检查命名空间
check_namespace() {
    log_info "检查命名空间: $NAMESPACE"

    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_success "命名空间 $NAMESPACE 存在"
    else
        log_error "命名空间 $NAMESPACE 不存在"
        return 1
    fi
}

# 检查Helm发布
check_helm_release() {
    log_info "检查Helm发布: $RELEASE_NAME"

    if helm status "$RELEASE_NAME" -n "$NAMESPACE" &> /dev/null; then
        log_success "Helm发布 $RELEASE_NAME 存在"
        helm status "$RELEASE_NAME" -n "$NAMESPACE"
    else
        log_error "Helm发布 $RELEASE_NAME 不存在"
        return 1
    fi
}

# 检查Pod状态
check_pods() {
    log_info "检查Pod状态..."

    local pod_status
    pod_status=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/instance="$RELEASE_NAME" --no-headers)

    if [[ -z "$pod_status" ]]; then
        log_error "未找到相关Pod"
        return 1
    fi

    local running_count=0
    local total_count=0

    while IFS= read -r line; do
        ((total_count++))
        local status=$(echo "$line" | awk '{print $3}')
        local ready=$(echo "$line" | awk '{print $2}')

        if [[ "$status" == "Running" && "$ready" == "1/1" ]]; then
            ((running_count++))
            log_success "Pod运行正常: $(echo "$line" | awk '{print $1}')"
        else
            log_warning "Pod状态异常: $(echo "$line")"
        fi
    done <<< "$pod_status"

    log_info "Pod状态: $running_count/$total_count 运行中"

    if [[ $running_count -eq $total_count && $total_count -gt 0 ]]; then
        return 0
    else
        return 1
    fi
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."

    local services
    services=$(kubectl get services -n "$NAMESPACE" -l app.kubernetes.io/instance="$RELEASE_NAME" --no-headers)

    if [[ -z "$services" ]]; then
        log_warning "未找到相关服务"
        return 0
    fi

    while IFS= read -r line; do
        local service_name=$(echo "$line" | awk '{print $1}')
        local service_type=$(echo "$line" | awk '{print $2}')
        local cluster_ip=$(echo "$line" | awk '{print $3}')

        log_success "服务: $service_name (类型: $service_type, IP: $cluster_ip)"
    done <<< "$services"

    return 0
}

# 检查Ingress状态
check_ingress() {
    log_info "检查Ingress状态..."

    local ingress
    ingress=$(kubectl get ingress -n "$NAMESPACE" -l app.kubernetes.io/instance="$RELEASE_NAME" --no-headers 2>/dev/null || true)

    if [[ -z "$ingress" ]]; then
        log_info "未找到Ingress配置"
        return 0
    fi

    while IFS= read -r line; do
        local ingress_name=$(echo "$line" | awk '{print $1}')
        local address=$(echo "$line" | awk '{print $3}')
        local ports=$(echo "$line" | awk '{print $4}')

        if [[ "$address" == "<none>" ]]; then
            log_warning "Ingress $ingress_name 尚未分配地址"
        else
            log_success "Ingress: $ingress_name (地址: $address, 端口: $ports)"
        fi
    done <<< "$ingress"

    return 0
}

# 等待部署完成
wait_for_deployment() {
    log_info "等待部署完成..."

    local start_time=$(date +%s)
    local timeout_time=$((start_time + TIMEOUT))

    while true; do
        if kubectl rollout status deployment/"$RELEASE_NAME" -n "$NAMESPACE" --timeout=60s &> /dev/null; then
            log_success "部署完成"
            return 0
        fi

        local current_time=$(date +%s)
        if [[ $current_time -gt $timeout_time ]]; then
            log_error "部署超时 (${TIMEOUT}s)"
            return 1
        fi

        log_info "等待部署中... (已等待 $((current_time - start_time))s)"
        sleep 10
    done
}

# 检查应用健康状态
check_app_health() {
    log_info "检查应用健康状态..."

    local service_name="${RELEASE_NAME}"
    local namespace="$NAMESPACE"

    # 端口转发到本地进行健康检查
    local local_port=$((30000 + RANDOM % 1000))

    log_info "设置端口转发: localhost:$local_port -> $service_name:3000"

    # 启动端口转发
    kubectl port-forward -n "$namespace" service/"$service_name" "$local_port":3000 &
    local port_forward_pid=$!

    # 等待端口转发建立
    sleep 5

    # 健康检查
    local health_check_passed=false
    for i in {1..12}; do  # 最多尝试12次，每次间隔5秒，总共1分钟
        if curl -s -f "http://localhost:$local_port/api/health" &> /dev/null; then
            log_success "应用健康检查通过"
            health_check_passed=true
            break
        fi

        log_info "健康检查失败，重试中... ($i/12)"
        sleep 5
    done

    # 清理端口转发
    kill $port_forward_pid 2>/dev/null || true

    if [[ "$health_check_passed" == "true" ]]; then
        return 0
    else
        log_error "应用健康检查失败"
        return 1
    fi
}

# 检查资源使用情况
check_resources() {
    log_info "检查资源使用情况..."

    # 检查Pod资源使用
    local pod_metrics
    pod_metrics=$(kubectl top pods -n "$NAMESPACE" -l app.kubernetes.io/instance="$RELEASE_NAME" --no-headers 2>/dev/null || true)

    if [[ -n "$pod_metrics" ]]; then
        while IFS= read -r line; do
            local pod_name=$(echo "$line" | awk '{print $1}')
            local cpu_usage=$(echo "$line" | awk '{print $2}')
            local memory_usage=$(echo "$line" | awk '{print $3}')

            log_info "Pod $pod_name: CPU $cpu_usage, 内存 $memory_usage"
        done <<< "$pod_metrics"
    else
        log_warning "无法获取资源使用情况 (可能需要安装metrics-server)"
    fi

    return 0
}

# 检查事件
check_events() {
    log_info "检查最近事件..."

    local events
    events=$(kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' --field-selector type!=Normal | tail -10)

    if [[ -n "$events" ]]; then
        log_warning "发现警告事件:"
        echo "$events" | while IFS= read -r line; do
            log_warning "  $line"
        done
    else
        log_success "无警告事件"
    fi

    return 0
}

# 汇总报告
generate_summary() {
    echo
    log_info "部署验证完成"
    log_info "命名空间: $NAMESPACE"
    log_info "Helm发布: $RELEASE_NAME"
    log_info "验证时间: $(date)"
    log_info "日志文件: $LOG_FILE"

    # 生成验证报告
    local report_file="deployment-report-$(date +%Y%m%d-%H%M%S).json"

    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "namespace": "$NAMESPACE",
  "release": "$RELEASE_NAME",
  "status": "completed",
  "log_file": "$LOG_FILE"
}
EOF

    log_info "验证报告: $report_file"
}

# 主函数
main() {
    log_info "开始部署验证"
    log_info "命名空间: $NAMESPACE"
    log_info "Helm发布: $RELEASE_NAME"
    log_info "超时时间: ${TIMEOUT}s"

    # 检查工具
    check_tools

    local failed_checks=0

    # 执行验证检查
    if ! check_namespace; then
        ((failed_checks++))
    fi

    if ! check_helm_release; then
        ((failed_checks++))
    fi

    if ! wait_for_deployment; then
        ((failed_checks++))
    fi

    if ! check_pods; then
        ((failed_checks++))
    fi

    check_services || ((failed_checks++))
    check_ingress || ((failed_checks++))
    check_app_health || ((failed_checks++))
    check_resources || ((failed_checks++))
    check_events || ((failed_checks++))

    # 生成汇总报告
    generate_summary

    # 最终结果
    echo
    if [[ $failed_checks -eq 0 ]]; then
        log_success "所有验证检查通过 ✓"
        exit 0
    else
        log_error "$failed_checks 个验证检查失败 ✗"
        exit 1
    fi
}

# 显示帮助信息
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    cat << EOF
部署验证脚本

用法: $0 [namespace] [release-name]

参数:
    namespace          Kubernetes命名空间 (默认: mindnote-production)
    release-name       Helm发布名称 (默认: mindnote-production)

环境变量:
    DEPLOYMENT_TIMEOUT 部署超时时间 (默认: 300秒)

示例:
    $0                                    # 使用默认参数
    $0 mindnote-staging mindnote-staging  # 指定参数
    DEPLOYMENT_TIMEOUT=600 $0              # 设置超时时间

EOF
    exit 0
fi

# 运行主函数
main "$@"