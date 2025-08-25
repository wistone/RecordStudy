#!/usr/bin/env python3
"""
启动Python后端服务
使用方法: python start-backend.py
"""
import uvicorn
import os
import sys
from pathlib import Path

# 添加backend目录到Python路径
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    # 设置工作目录到backend
    os.chdir(backend_dir)
    
    print("🚀 启动 RecordStudy Python 后端")
    print("📡 地址: http://localhost:8000")
    print("📖 API文档: http://localhost:8000/docs")
    print("🔍 健康检查: http://localhost:8000/health")
    print("💡 按 Ctrl+C 停止服务器\n")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        reload_dirs=["app"]
    )