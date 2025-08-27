#!/bin/bash
# RecordStudy 本地服务停止脚本
# 使用方法: ./scripts/stop-local-server.sh

set -e

PROJECT_ROOT=$(dirname $(dirname $(realpath $0)))

echo "🛑 停止 RecordStudy 本地服务..."

# 停止通过PID文件记录的进程
stop_service_by_pid() {
    local service_name=$1
    local pid_file="$PROJECT_ROOT/logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "🔧 停止${service_name}服务 (PID: $pid)..."
            kill -TERM "$pid" 2>/dev/null || true
            sleep 2
            # 如果进程仍在运行，强制杀死
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
            echo "✅ ${service_name}服务已停止"
        else
            echo "ℹ️  ${service_name}服务 (PID: $pid) 已经停止"
        fi
        rm -f "$pid_file"
    else
        echo "ℹ️  未找到${service_name}服务的PID文件"
    fi
}

# 通过端口停止进程
stop_service_by_port() {
    local port=$1
    local service_name=$2
    local pid=$(lsof -ti:$port 2>/dev/null || echo "")
    
    if [ ! -z "$pid" ]; then
        echo "🔧 停止占用端口 $port 的${service_name}服务 (PID: $pid)..."
        kill -9 $pid 2>/dev/null || true
        echo "✅ 端口 $port 上的${service_name}服务已停止"
    else
        echo "ℹ️  端口 $port 上没有运行的${service_name}服务"
    fi
}

# 优先通过PID文件停止
stop_service_by_pid "backend"
stop_service_by_pid "frontend"

# 再通过端口清理残留进程
stop_service_by_port 8000 "后端"
stop_service_by_port 3001 "前端"

echo ""
echo "🎉 所有 RecordStudy 本地服务已停止！"
echo ""
echo "📝 如需查看日志:"
echo "  后端日志:    tail -f logs/backend.log"
echo "  前端日志:    tail -f logs/frontend.log"