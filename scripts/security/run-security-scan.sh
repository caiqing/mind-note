#!/bin/bash

# 安全扫描运行脚本
#
# 用法:
# ./run-security-scan.sh [选项]
#
# 选项:
#   --quick               快速扫描（只扫描依赖和配置）
#   --full                完整扫描（所有类型）
#   --dependencies       只扫描依赖漏洞
#   --code                只扫描代码安全
#   --config              只扫描配置安全
#   --secrets             只扫描密钥泄露
#   --severity LEVEL      设置严重程度阈值 (low|medium|high|critical)
#   --fail-on-error       发现问题时失败退出
#   --reports-dir DIR     设置报告输出目录
#   --help                显示帮助信息

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCANNER_SCRIPT="$SCRIPT_DIR/security-scanner.ts"
REPORTS_DIR="$PROJECT_ROOT/reports/security"

# 默认选项
SCAN_TYPE="full"
SEVERITY="medium"
FAIL_ON_ERROR=false
CUSTOM_REPORTS_DIR=""

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            SCAN_TYPE="quick"
            shift
            ;;
        --full)
            SCAN_TYPE="full"
            shift
            ;;
        --dependencies)
            SCAN_TYPE="dependencies"
            shift
            ;;
        --code)
            SCAN_TYPE="code"
            shift
            ;;
        --config)
            SCAN_TYPE="config"
            shift
            ;;
        --secrets)
            SCAN_TYPE="secrets"
            shift
            ;;
        --severity)
            SEVERITY="$2"
            shift 2
            ;;
        --fail-on-error)
            FAIL_ON_ERROR=true
            shift
            ;;
        --reports-dir)
            CUSTOM_REPORTS_DIR="$2"
            shift 2
            ;;
        --help)
            echo "安全扫描运行脚本"
            echo ""
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --quick               快速扫描（依赖+配置）"
            echo "  --full                完整扫描（所有类型）"
            echo "  --dependencies       只扫描依赖漏洞"
            echo "  --code                只扫描代码安全"
            echo "  --config              只扫描配置安全"
            echo "  --secrets             只扫描密钥泄露"
            echo "  --severity LEVEL      设置严重程度阈值 (low|medium|high|critical)"
            echo "  --fail-on-error       发现问题时失败退出"
            echo "  --reports-dir DIR     设置报告输出目录"
            echo "  --help                显示帮助信息"
            echo ""
            echo "示例:"
            echo "  $0 --quick                          快速扫描"
            echo "  $0 --full --severity high --fail-on-error  完整扫描，高危阈值，失败退出"
            echo "  $0 --dependencies --severity low        只扫描依赖，低危阈值"
            echo ""
            echo "扫描类型说明:"
            echo "  dependencies - 依赖漏洞扫描 (npm audit, yarn audit, snyk)"
            echo "  code        - 代码安全扫描 (ESLint, TypeScript, Semgrep)"
            echo "  config      - 配置安全检查 (环境变量, 配置文件, 权限)"
            echo "  secrets     - 密钥泄露检测 (GitLeaks, TruffleHog)"
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 --help 查看帮助信息"
            exit 1
            ;;
    esac
done

# 打印配置信息
echo -e "${BLUE}🔒 安全扫描运行器${NC}"
echo -e "${CYAN}============================${NC}"
echo -e "${YELLOW}项目根目录:${NC} $PROJECT_ROOT"
echo -e "${YELLOW}扫描脚本:${NC} $SCANNER_SCRIPT"
echo -e "${YELLOW}扫描类型:${NC} $SCAN_TYPE"
echo -e "${YELLOW}严重程度:${NC} $SEVERITY"
echo -e "${YELLOW}失败退出:${NC} $FAIL_ON_ERROR"
echo ""

# 构建扫描命令
SCANNER_ARGS=""

# 添加严重程度参数
SCANNER_ARGS="$SCANNER_ARGS --severity=$SEVERITY"

# 添加失败退出参数
if [ "$FAIL_ON_ERROR" = true ]; then
    SCANNER_ARGS="$SCANNER_ARGS --fail-on-vulnerabilities"
fi

# 添加报告目录参数
if [ -n "$CUSTOM_REPORTS_DIR" ]; then
    REPORTS_DIR="$CUSTOM_REPORTS_DIR"
fi
SCANNER_ARGS="$SCANNER_ARGS --reports-dir=$REPORTS_DIR"

# 根据扫描类型构建命令
case $SCAN_TYPE in
    "quick")
        echo -e "${GREEN}🚀 启动快速安全扫描...${NC}"
        echo -e "${YELLOW}扫描项目:${NC} 依赖漏洞 + 配置安全"
        ;;
    "full")
        echo -e "${GREEN}🚀 启动完整安全扫描...${NC}"
        echo -e "${YELLOW}扫描项目:${NC} 依赖 + 代码 + 配置 + 密钥"
        ;;
    "dependencies")
        echo -e "${GREEN}🚀 启动依赖漏洞扫描...${NC}"
        echo -e "${YELLOW}扫描项目:${NC} npm/yarn audit + Snyk"
        ;;
    "code")
        echo -e "${GREEN}🚀 启动代码安全扫描...${NC}"
        echo -e "${YELLOW}扫描项目:${NC} ESLint + TypeScript + Semgrep"
        ;;
    "config")
        echo -e "${GREEN}🚀 启动配置安全扫描...${NC}"
        echo -e "${YELLOW}扫描项目:${NC} 环境变量 + 配置文件 + 权限"
        ;;
    "secrets")
        echo -e "${GREEN}🚀 启动密钥泄露扫描...${NC}"
        echo -e "${YELLOW}扫描项目:${NC} GitLeaks + TruffleHog"
        ;;
esac

echo ""

# 检查依赖
echo -e "${YELLOW}📦 检查扫描工具依赖...${NC}"
cd "$PROJECT_ROOT"

# 检查Node.js版本
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js版本: $NODE_VERSION${NC}"

# 检查TypeScript
if command -v tsc &> /dev/null; then
    echo -e "${GREEN}✅ TypeScript已安装${NC}"
else
    echo -e "${YELLOW}⚠️  TypeScript未安装，将使用npx${NC}"
fi

# 检查必要的安全工具
check_security_tool() {
    local tool=$1
    local description=$2

    if command -v "$tool" &> /dev/null; then
        echo -e "${GREEN}✅ $description ($tool) 已安装${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $description ($tool) 未安装，将跳过相关扫描${NC}"
        return 1
    fi
}

echo -e "${CYAN}检查安全工具:${NC}"
check_security_tool "npm" "Node.js包管理器"
check_security_tool "eslint" "JavaScript代码检查工具"
check_security_tool "npx" "Node.js包执行器"

# 可选工具检查
check_security_tool "snyk" "依赖漏洞扫描工具"
check_security_tool "semgrep" "静态代码分析工具"
check_security_tool "gitleaks" "Git仓库密钥扫描"
check_security_tool "trufflehog" "密钥发现工具"

echo ""

# 确保报告目录存在
if [ ! -d "$REPORTS_DIR" ]; then
    echo -e "${YELLOW}📁 创建报告目录: $REPORTS_DIR${NC}"
    mkdir -p "$REPORTS_DIR"
fi

# 运行安全扫描
echo -e "${CYAN}🔍 开始执行安全扫描...${NC}"
echo ""

# 根据扫描类型执行不同的命令
case $SCAN_TYPE in
    "quick")
        # 快速扫描：只扫描依赖和配置
        if [ -f "$SCANNER_SCRIPT" ]; then
            npx tsx "$SCANNER_SCRIPT" \
                --scan-types dependencies,configuration \
                $SCANNER_ARGS
        else
            echo -e "${RED}❌ 扫描脚本不存在: $SCANNER_SCRIPT${NC}"
            exit 1
        fi
        ;;
    "full")
        # 完整扫描：扫描所有类型
        if [ -f "$SCANNER_SCRIPT" ]; then
            npx tsx "$SCANNER_SCRIPT" $SCANNER_ARGS
        else
            echo -e "${RED}❌ 扫描脚本不存在: $SCANNER_SCRIPT${NC}"
            exit 1
        fi
        ;;
    "dependencies")
        # 只扫描依赖
        if [ -f "$SCANNER_SCRIPT" ]; then
            npx tsx "$SCANNER_SCRIPT" \
                --scan-types dependencies \
                $SCANNER_ARGS
        else
            echo -e "${RED}❌ 扫描脚本不存在: $SCANNER_SCRIPT${NC}"
            exit 1
        fi
        ;;
    "code")
        # 只扫描代码
        if [ -f "$SCANNER_SCRIPT" ]; then
            npx tsx "$SCANNER_SCRIPT" \
                --scan-types code \
                $SCANNER_ARGS
        else
            echo -e "${RED}❌ 扫描脚本不存在: $SCANNER_SCRIPT${NC}"
            exit 1
        fi
        ;;
    "config")
        # 只扫描配置
        if [ -f "$SCANNER_SCRIPT" ]; then
            npx tsx "$SCANNER_SCRIPT" \
                --scan-types configuration \
                $SCANNER_ARGS
        else
            echo -e "${RED}❌ 扫描脚本不存在: $SCANNER_SCRIPT${NC}"
            exit 1
        fi
        ;;
    "secrets")
        # 只扫描密钥
        if [ -f "$SCANNER_SCRIPT" ]; then
            npx tsx "$SCANNER_SCRIPT" \
                --scan-types secrets \
                $SCANNER_ARGS
        else
            echo -e "${RED}❌ 扫描脚本不存在: $SCANNER_SCRIPT${NC}"
            exit 1
        fi
        ;;
esac

SCAN_EXIT_CODE=$?

# 处理扫描结果
echo ""
if [ $SCAN_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ 安全扫描完成！${NC}"

    # 显示报告文件
    echo -e "${CYAN}📄 扫描报告:${NC}"

    if [ -f "$REPORTS_DIR/security-scan-report.json" ]; then
        echo -e "  📊 JSON报告: $REPORTS_DIR/security-scan-report.json"

        # 显示简要统计
        if command -v jq &> /dev/null; then
            echo -e "  📈 快速统计:"
            TOTAL=$(jq -r '.summary.total' "$REPORTS_DIR/security-scan-report.json" 2>/dev/null || echo "0")
            CRITICAL=$(jq -r '.summary.critical' "$REPORTS_DIR/security-scan-report.json" 2>/dev/null || echo "0")
            HIGH=$(jq -r '.summary.high' "$REPORTS_DIR/security-scan-report.json" 2>/dev/null || echo "0")
            MEDIUM=$(jq -r '.summary.medium' "$REPORTS_DIR/security-scan-report.json" 2>/dev/null || echo "0")
            LOW=$(jq -r '.summary.low' "$REPORTS_DIR/security-scan-report.json" 2>/dev/null || echo "0")
            PASSED=$(jq -r '.summary.passed' "$REPORTS_DIR/security-scan-report.json" 2>/dev/null || echo "true")

            echo -e "    🔴 严重: $CRITICAL"
            echo -e "    🟠 高危: $HIGH"
            echo -e "    🟡 中危: $MEDIUM"
            echo -e "    🟢 低危: $LOW"
            echo -e "    总计: $TOTAL"
            echo -e "    状态: $([ "$PASSED" = "true" ] && echo "✅ 通过" || echo "❌ 未通过")"
        fi
    fi

    if [ -f "$REPORTS_DIR/security-scan-report.html" ]; then
        echo -e "  🌐 HTML报告: $REPORTS_DIR/security-scan-report.html"

        # 如果在macOS上，询问是否打开HTML报告
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo ""
            read -p "🌐 是否打开HTML报告查看详细信息？(y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                open "$REPORTS_DIR/security-scan-report.html"
            fi
        fi
    fi
else
    echo -e "${RED}❌ 安全扫描失败，退出码: $SCAN_EXIT_CODE${NC}"

    # 显示错误信息
    if [ -f "$REPORTS_DIR/security-scan-report.json" ]; then
        echo -e "${YELLOW}📄 错误详情请查看: $REPORTS_DIR/security-scan-report.json${NC}"
    fi
fi

echo ""

# 提供后续建议
echo -e "${PURPLE}💡 建议后续操作:${NC}"
echo "  1. 查看详细的扫描报告了解安全问题"
echo "  2. 根据报告中的建议修复发现的问题"
echo "  3. 定期运行安全扫描保持项目安全"
echo "  4. 在CI/CD流程中集成安全扫描"

if [ $SCAN_EXIT_CODE -eq 0 ]; then
    # 如果扫描通过，提供额外建议
    echo ""
    echo -e "${GREEN}🎉 扫描通过！为了保持项目安全，建议:${NC}"
    echo "  • 定期更新依赖包"
    echo "  • 在代码提交前运行本地扫描"
    echo "  • 设置自动化安全扫描（如GitHub Actions）"
    echo "  • 关注安全漏洞通告和更新"
else
    echo ""
    echo -e "${RED}⚠️  发现安全问题，请优先修复:${NC}"
    echo "  • 严重和高危问题应立即修复"
    echo "  • 中危问题应在下次发布前修复"
    echo "  • 低危问题可在方便时修复"
    echo "  • 修复后重新运行扫描验证"
fi

echo ""
echo -e "${CYAN}📚 相关资源:${NC}"
echo "  • OWASP Top 10: https://owasp.org/www-project-top-ten/"
echo "  • Node.js安全最佳实践: https://nodejs.org/en/docs/guides/security"
echo "  • npm audit: https://docs.npmjs.com/cli/v8/commands/npm-audit"
echo "  • Snyk: https://snyk.io/"

exit $SCAN_EXIT_CODE