#!/bin/bash

# 开发环境健康检查脚本
# 检查关键服务和依赖是否正常运行

echo "🔍 MindNote 开发环境健康检查"
echo "================================"

# 1. 检查端口占用
echo "📍 检查端口占用..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ 端口 3000 正在使用中"
else
    echo "❌ 端口 3000 未被占用"
fi

# 2. 检查开发服务器响应
echo "🌐 检查开发服务器响应..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 开发服务器响应正常"
else
    echo "❌ 开发服务器无响应"
fi

# 3. 检查代码质量API
echo "🔧 检查代码质量API..."
quality_status=$(curl -s http://localhost:3000/api/dev/quality | jq -r '.data.result.status' 2>/dev/null)
if [ "$quality_status" = "pass" ]; then
    echo "✅ 代码质量检查通过"
elif [ "$quality_status" = "warning" ]; then
    echo "⚠️  代码质量检查有警告"
elif [ "$quality_status" = "fail" ]; then
    echo "❌ 代码质量检查失败"
else
    echo "❓ 代码质量API无响应"
fi

# 4. 检查关键依赖
echo "📦 检查关键依赖..."
dependencies=("clsx" "tailwind-merge" "lucide-react" "next-themes")
for dep in "${dependencies[@]}"; do
    if [ -d "node_modules/$dep" ]; then
        echo "✅ $dep 已安装"
    else
        echo "❌ $dep 未安装"
    fi
done

# 5. 检查Git状态
echo "📂 检查Git状态..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "✅ Git 仓库正常"
    changes=$(git status --porcelain | wc -l)
    if [ $changes -eq 0 ]; then
        echo "✅ 工作区干净"
    else
        echo "⚠️  有 $changes 个文件待提交"
    fi
else
    echo "❌ 不是Git仓库"
fi

# 6. 检查环境文件
echo "🔐 检查环境配置..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local 存在"
else
    echo "⚠️  .env.local 不存在"
fi

echo "================================"
echo "健康检查完成！"

# 7. 提供修复建议
echo ""
echo "💡 修复建议："
echo "1. 如果依赖缺失，运行: npm install --legacy-peer-deps"
echo "2. 如果服务器无响应，运行: npm run dev"
echo "3. 如果代码质量有问题，运行: npm run lint:fix"
echo "4. 检查完整的错误日志: tail -f .next/server.log"