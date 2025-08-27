#!/bin/bash
# RecordStudy 本地服务启动脚本
# 使用方法: ./scripts/launch-local-server.sh

set -e

PROJECT_ROOT=$(dirname $(dirname $(realpath $0)))
VENV_PATH="$PROJECT_ROOT/venv"

echo "🚀 启动 RecordStudy 本地服务..."
echo "项目根目录: $PROJECT_ROOT"

# 检查虚拟环境
if [ ! -d "$VENV_PATH" ]; then
    echo "❌ 虚拟环境不存在，请先运行 ./scripts/setup-env.sh"
    exit 1
fi

# 检查并清理端口占用
cleanup_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null || echo "")
    if [ ! -z "$pid" ]; then
        echo "🔧 清理端口 $port 上的进程 $pid..."
        kill -9 $pid
        sleep 1
    fi
}

# 清理可能占用的端口
echo "🔍 检查端口占用情况..."
cleanup_port 8000
cleanup_port 3001

# 创建日志目录
mkdir -p "$PROJECT_ROOT/logs"

# 启动后端服务
echo "🔧 启动后端服务 (端口 8000)..."
cd "$PROJECT_ROOT"
nohup "$VENV_PATH/bin/python" start-backend.py > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "后端服务 PID: $BACKEND_PID"

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 3

# 检查后端服务是否启动成功
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "❌ 后端服务启动失败，请检查日志: logs/backend.log"
    exit 1
fi
echo "✅ 后端服务启动成功"

# 启动前端服务
echo "🌐 启动前端服务 (端口 3001)..."
cd "$PROJECT_ROOT/frontend"
nohup python3 -m http.server 3001 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端服务 PID: $FRONTEND_PID"

# 等待前端启动
sleep 2

# 检查前端服务是否启动成功
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "❌ 前端服务启动失败，请检查日志: logs/frontend.log"
    exit 1
fi
echo "✅ 前端服务启动成功"

# 保存PID信息
echo "$BACKEND_PID" > "$PROJECT_ROOT/logs/backend.pid"
echo "$FRONTEND_PID" > "$PROJECT_ROOT/logs/frontend.pid"

echo ""
echo "🎉 RecordStudy 本地服务启动完成！"
echo ""
echo "📡 服务地址："
echo "  前端页面:    http://localhost:3001"
echo "  后端API:     http://localhost:8000"
echo "  API文档:     http://localhost:8000/docs"
echo "  健康检查:    http://localhost:8000/health"
echo ""
echo "📊 服务状态："
echo "  后端PID:     $BACKEND_PID"
echo "  前端PID:     $FRONTEND_PID"
echo ""
echo "📝 日志文件："
echo "  后端日志:    logs/backend.log"
echo "  前端日志:    logs/frontend.log"
echo ""
echo "🛑 停止服务："
echo "  停止所有:    ./scripts/stop-local-server.sh"
echo "  手动停止:    kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "💡 按 Ctrl+C 不会停止后台服务，请使用停止脚本"