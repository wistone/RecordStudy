# 🚀 Study Buddy - Render 分离部署指南

## 🏗️ 分离部署架构
经过测试发现，分离部署是更稳定的方案：
- **前端**: `study-buddy.onrender.com` (静态站点)  
- **后端**: `study-buddy-api.onrender.com` (Web Service)
- **优势**: 路由清晰、调试简单、扩展性好

## 📝 快速部署步骤

### 1. 推送代码到 GitHub
```bash
git add .
git commit -m "feat: ready for separated deployment"
git push origin main
```

### 2. 创建后端 API 服务
1. 访问 [Render.com](https://render.com) 并登录
2. 点击 "New +" → "Web Service"
3. 连接你的 GitHub 仓库

**后端配置：**
```
Service Name: your-study-buddy-api
Environment: Python 3
Build Command: pip install -r backend/requirements.txt
Start Command: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT

⚠️ 重要：手动输入启动命令，不要使用 Render 的自动检测！
```

**后端环境变量：**
```
SUPABASE_URL=https://rrkpxsjfuiptuufatnmx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJya3B4c2pmdWlwdHV1ZmF0bm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDUzMjAsImV4cCI6MjA3MTYyMTMyMH0.x5TP-elB9X6j2BkA_ejrazkTBE-QKPRjyK_GeShIzpU
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJya3B4c2pmdWlwdHV1ZmF0bm14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA0NTMyMCwiZXhwIjoyMDcxNjIxMzIwfQ.ysbr7C4Pl8E-zTLEpuicIHEBA0B3Gf50Qya9Iw0pbbA
SECRET_KEY=（让 Render 自动生成）
CORS_ORIGINS=https://your-study-buddy.onrender.com
NODE_ENV=production
```

### 3. 创建前端静态站点
1. 在 Render Dashboard 点击 "New +" → "Static Site"
2. 选择同一个 GitHub 仓库

**前端配置：**
```
Service Name: your-study-buddy
Build Command: echo "No build required"
Publish Directory: frontend
```

**前端重写规则：**
```
/*  /index.html  200
```

### 4. 部署验证
等待两个服务都部署完成，然后：
- **前端**: https://your-study-buddy.onrender.com
- **后端**: https://your-study-buddy-api.onrender.com
- **API 文档**: https://your-study-buddy-api.onrender.com/docs
- **测试登录**: `demo@example.com` / `abc123`

## 🎯 最终访问地址
- **主应用**: https://your-study-buddy.onrender.com  
- **API 文档**: https://your-study-buddy-api.onrender.com/docs
- **健康检查**: https://your-study-buddy-api.onrender.com/health

## 🔧 技术架构说明
- **前端**: Render 静态站点服务
- **后端**: FastAPI REST API 服务  
- **数据库**: Supabase PostgreSQL
- **认证**: Supabase Auth + JWT
- **CORS**: 前端域名白名单配置

**优势**: 服务分离、调试清晰、性能稳定！🎉