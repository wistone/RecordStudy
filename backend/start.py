#!/usr/bin/env python3
"""
生产环境启动脚本 - 合并前后端部署
"""
import uvicorn
import os
import sys
from pathlib import Path

# 添加 app 目录到 Python 路径
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    
    print(f"🚀 启动 Study Buddy 全栈应用")
    print(f"📡 端口: {port}")
    print(f"🌐 环境: {os.environ.get('NODE_ENV', 'production')}")
    print(f"📁 前端文件: ../frontend/")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )