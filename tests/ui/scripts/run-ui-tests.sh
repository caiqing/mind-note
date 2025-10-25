#!/bin/bash

# UI自动化测试运行脚本
#
# 用法:
# ./run-ui-tests.sh [选项]
#
# 选项:
#   --watch              监听模式运行测试
#   --coverage           运行测试并生成覆盖率报告
#   --components         只运行组件测试
#   --ai-components      只运行AI组件测试
#   --all                运行所有测试（默认）
#   --report             生成HTML报告
#   --ci                 CI模式运行
#   --help               显示帮助信息

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
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TESTS_DIR="$PROJECT_ROOT/tests/ui"
COVERAGE_DIR="$TESTS_DIR/coverage"
REPORTS_DIR="$TESTS_DIR/reports"

# 默认选项
WATCH=false
COVERAGE=false
COMPONENTS_ONLY=false
AI_COMPONENTS_ONLY=false
GENERATE_REPORT=false
CI_MODE=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --watch)
            WATCH=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --components)
            COMPONENTS_ONLY=true
            shift
            ;;
        --ai-components)
            AI_COMPONENTS_ONLY=true
            shift
            ;;
        --all)
            # 默认选项
            shift
            ;;
        --report)
            GENERATE_REPORT=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        --help)
            echo "UI自动化测试运行脚本"
            echo ""
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --watch              监听模式运行测试"
            echo "  --coverage           运行测试并生成覆盖率报告"
            echo "  --components         只运行组件测试"
            echo "  --ai-components      只运行AI组件测试"
            echo "  --all                运行所有测试（默认）"
            echo "  --report             生成HTML报告"
            echo "  --ci                 CI模式运行"
            echo "  --help               显示帮助信息"
            echo ""
            echo "示例:"
            echo "  $0 --coverage --report    运行测试并生成覆盖率和HTML报告"
            echo "  $0 --components           只运行基础组件测试"
            echo "  $0 --ai-components        只运行AI组件测试"
            echo "  $0 --watch                监听模式运行"
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 --help 查看帮助信息"
            exit 1
            ;;
    esac
done

# 创建必要的目录
mkdir -p "$COVERAGE_DIR"
mkdir -p "$REPORTS_DIR"

# 打印配置信息
echo -e "${BLUE}🎨 UI自动化测试运行器${NC}"
echo -e "${CYAN}============================${NC}"
echo -e "${YELLOW}项目根目录:${NC} $PROJECT_ROOT"
echo -e "${YELLOW}测试目录:${NC} $TESTS_DIR"
echo -e "${YELLOW}覆盖率目录:${NC} $COVERAGE_DIR"
echo -e "${YELLOW}报告目录:${NC} $REPORTS_DIR"
echo ""

# 构建测试命令
VITEST_CMD="npx vitest"
VITEST_ARGS=""

# 添加配置文件
VITEST_ARGS="$VITEST_ARGS --config $TESTS_DIR/config/ui-test.config.ts"

# 添加覆盖率参数
if [ "$COVERAGE" = true ]; then
    VITEST_ARGS="$VITEST_ARGS --coverage"
    echo -e "${GREEN}✅ 启用覆盖率报告${NC}"
fi

# 添加报告生成参数
if [ "$GENERATE_REPORT" = true ]; then
    VITEST_ARGS="$VITEST_ARGS --reporter=html --reporter=json --outputFile=$REPORTS_DIR/ui-test-results.json"
    echo -e "${GREEN}✅ 启用HTML报告生成${NC}"
fi

# 添加监听模式
if [ "$WATCH" = true ]; then
    VITEST_ARGS="$VITEST_ARGS --watch"
    echo -e "${GREEN}✅ 启用监听模式${NC}"
fi

# 添加CI模式
if [ "$CI_MODE" = true ]; then
    VITEST_ARGS="$VITEST_ARGS --run --reporter=basic --reporter=json"
    export CI=true
    echo -e "${GREEN}✅ 启用CI模式${NC}"
fi

# 确定测试文件模式
TEST_PATTERN=""
if [ "$COMPONENTS_ONLY" = true ]; then
    TEST_PATTERN="tests/ui/components/ui/*.test.{ts,tsx}"
    echo -e "${GREEN}✅ 只运行基础UI组件测试${NC}"
elif [ "$AI_COMPONENTS_ONLY" = true ]; then
    TEST_PATTERN="tests/ui/components/ai/*.test.{ts,tsx}"
    echo -e "${GREEN}✅ 只运行AI组件测试${NC}"
else
    TEST_PATTERN="tests/ui/**/*.test.{ts,tsx}"
    echo -e "${GREEN}✅ 运行所有UI测试${NC}"
fi

# 检查依赖
echo -e "${YELLOW}📦 检查依赖...${NC}"
cd "$PROJECT_ROOT"

# 检查是否安装了必要的依赖
check_dependency() {
    local dep=$1
    if ! npm list "$dep" > /dev/null 2>&1; then
        echo -e "${RED}❌ 缺少依赖: $dep${NC}"
        echo -e "${YELLOW}📦 正在安装依赖...${NC}"
        npm install --no-save "$dep"
    fi
}

check_dependency "vitest"
check_dependency "@testing-library/react"
check_dependency "@testing-library/user-event"
check_dependency "@testing-library/jest-dom"
check_dependency "jsdom"

# 运行测试前的准备工作
echo -e "${YELLOW}🔧 准备测试环境...${NC}"

# 清理旧的覆盖率数据
if [ "$COVERAGE" = true ]; then
    rm -rf "$COVERAGE_DIR"/*
    echo -e "${GREEN}✅ 清理旧的覆盖率数据${NC}"
fi

# 设置环境变量
export NODE_ENV=test
export VITE_CJS_IGNORE_WARNING=true

# 运行测试
echo -e "${CYAN}🚀 开始运行UI测试...${NC}"
echo ""

# 构建完整的命令
FULL_CMD="$VITEST_CMD $VITEST_ARGS $TEST_PATTERN"

# 在CI模式下添加超时
if [ "$CI_MODE" = true ]; then
    FULL_CMD="timeout 300 $FULL_CMD"
fi

# 执行测试
if [ "$CI_MODE" = true ]; then
    eval "$FULL_CMD"
    TEST_EXIT_CODE=$?
else
    # 在非CI模式下，允许用户中断
    trap 'echo -e "\n${YELLOW}⚠️  测试被中断${NC}"; exit 130' INT
    eval "$FULL_CMD"
    TEST_EXIT_CODE=$?
fi

# 处理测试结果
echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ 所有UI测试通过！${NC}"
else
    echo -e "${RED}❌ 测试失败，退出码: $TEST_EXIT_CODE${NC}"
    exit $TEST_EXIT_CODE
fi

# 生成覆盖率报告摘要
if [ "$COVERAGE" = true ]; then
    echo -e "${YELLOW}📊 生成覆盖率报告摘要...${NC}"

    if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
        echo -e "${CYAN}覆盖率统计:${NC}"
        node -e "
        const summary = require('$COVERAGE_DIR/coverage-summary.json');
        console.log('  总计:   ' + summary.total.lines.pct + '% (行), ' + summary.total.functions.pct + '% (函数), ' + summary.total.branches.pct + '% (分支), ' + summary.total.statements.pct + '% (语句)');
        console.log('  行:     ' + summary.total.lines.covered + ' / ' + summary.total.lines.total);
        console.log('  函数:   ' + summary.total.functions.covered + ' / ' + summary.total.functions.total);
        console.log('  分支:   ' + summary.total.branches.covered + ' / ' + summary.total.branches.total);
        console.log('  语句:   ' + summary.total.statements.covered + ' / ' + summary.total.statements.total);
        "
        echo ""
        echo -e "${GREEN}📈 覆盖率报告已生成: $COVERAGE_DIR/index.html${NC}"
    fi
fi

# 生成测试报告摘要
if [ "$GENERATE_REPORT" = true ]; then
    echo -e "${YELLOW}📋 生成测试报告摘要...${NC}"

    if [ -f "$REPORTS_DIR/ui-test-results.json" ]; then
        # 提取测试统计信息
        node -e "
        const results = require('$REPORTS_DIR/ui-test-results.json');
        const numTotalTests = results.numTotalTests;
        const numPassedTests = results.numPassedTests;
        const numFailedTests = results.numFailedTests;
        const numPendingTests = results.numPendingTests;
        const testResults = results.testResults || [];

        console.log('📊 测试统计:');
        console.log('  总测试数: ' + numTotalTests);
        console.log('  通过: ' + numPassedTests + ' (' + Math.round(numPassedTests/numTotalTests*100) + '%)');
        console.log('  失败: ' + numFailedTests);
        console.log('  跳过: ' + numPendingTests);
        console.log('');

        if (numFailedTests > 0) {
            console.log('❌ 失败的测试:');
            testResults.forEach(result => {
                result.assertionResults.forEach(assertion => {
                    if (assertion.status === 'failed') {
                        console.log('  - ' + result.title + ' > ' + assertion.title);
                    }
                });
            });
        }
        "
        echo ""
        echo -e "${GREEN}📄 HTML测试报告已生成: $REPORTS_DIR/index.html${NC}"
    fi
fi

# 运行性能分析（如果启用）
if [ "$CI_MODE" = false ] && [ -f "$PROJECT_ROOT/package.json" ]; then
    # 检查是否启用了性能分析
    if grep -q "performance.*test" "$PROJECT_ROOT/package.json"; then
        echo -e "${YELLOW}⚡ 运行性能分析...${NC}"
        # 这里可以添加性能分析脚本
    fi
fi

# 输出结果摘要
echo ""
echo -e "${PURPLE}🎉 UI自动化测试完成！${NC}"
echo ""

if [ "$COVERAGE" = true ]; then
    echo -e "${CYAN}📊 查看覆盖率报告:${NC} file://$COVERAGE_DIR/index.html"
fi

if [ "$GENERATE_REPORT" = true ]; then
    echo -e "${CYAN}📄 查看测试报告:${NC} file://$REPORTS_DIR/index.html"
fi

echo ""
echo -e "${GREEN}✨ 建议下一步操作:${NC}"
echo "  1. 检查测试覆盖率是否达标"
echo "  2. 查看失败的测试用例（如果有）"
echo "  3. 运行 E2E 测试验证整体功能"
echo "  4. 提交代码前确保所有测试通过"

exit $TEST_EXIT_CODE