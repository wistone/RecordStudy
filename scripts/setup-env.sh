#!/bin/bash
# RecordStudy Python环境设置脚本

set -e

PROJECT_ROOT=$(dirname $(dirname $(realpath $0)))
VENV_PATH="$PROJECT_ROOT/venv"

echo "🔧 设置RecordStudy Python环境..."
echo "项目根目录: $PROJECT_ROOT"

# 创建虚拟环境（如果不存在）
if [ ! -d "$VENV_PATH" ]; then
    echo "📦 创建Python虚拟环境..."
    python3 -m venv "$VENV_PATH"
else
    echo "✅ 虚拟环境已存在: $VENV_PATH"
fi

# 激活虚拟环境
echo "🚀 激活虚拟环境..."
source "$VENV_PATH/bin/activate"

# 升级pip
echo "📊 升级pip..."
pip install --upgrade pip

# 安装依赖
echo "📋 安装依赖包..."
pip install -r "$PROJECT_ROOT/backend/requirements.txt"

echo "✅ 环境设置完成！"
echo ""
echo "使用方法:"
echo "  激活环境: source venv/bin/activate"
echo "  启动后端: venv/bin/python start-backend.py"
echo "  停用环境: deactivate"