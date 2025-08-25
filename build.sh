#!/bin/bash
# 构建脚本 - 为 Render 部署准备项目

echo "🚀 准备 Study Buddy 全栈项目部署..."

# 检查 Python 环境
echo "📋 检查 Python 环境..."
python3 --version

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
pip install -r requirements.txt
cd ..

# 验证配置文件
echo "🔍 验证配置文件..."
if [ ! -f "render.yaml" ]; then
    echo "❌ 缺少 render.yaml 配置文件"
    exit 1
fi

if [ ! -f "runtime.txt" ]; then
    echo "❌ 缺少 runtime.txt 文件" 
    exit 1
fi

if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ 缺少 requirements.txt 文件"
    exit 1
fi

echo "✅ 项目准备就绪，可以部署到 Render！"
echo ""
echo "下一步："
echo "1. 提交代码到 Git：git add . && git commit -m 'ready for fullstack deployment'"
echo "2. 推送到 GitHub：git push origin main"
echo "3. 按照 DEPLOYMENT_GUIDE.md 的步骤在 Render 上部署到 study-buddy.onrender.com"
echo "4. 部署完成后访问：https://study-buddy.onrender.com"