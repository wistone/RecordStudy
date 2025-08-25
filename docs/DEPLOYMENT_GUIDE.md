# Study Buddy - Render 部署指南🌐 study-buddy.onrender.com

## 📋 部署前检查清单

✅ **项目已准备好部署：**
- [x] FastAPI 后端配置完整
- [x] Supabase 云数据库已配置
- [x] 前端环境变量自适应配置
- [x] CORS 配置支持生产环境
- [x] 生产环境启动脚本
- [x] 健康检查端点
- [x] Render 配置文件

## 🚀 Step-by-Step 部署步骤

### 第一步：准备 Git 仓库
```bash
# 1. 确保所有更改都已提交
git add .
git commit -m "feat: add fullstack deployment configuration for study-buddy.onrender.com"

# 2. 推送到 GitHub（如果还没有远程仓库）
# 在 GitHub 创建新仓库，然后：
git remote add origin https://github.com/yourusername/StudyBuddy.git
git branch -M main
git push -u origin main
```

### 第二步：在 Render 创建全栈 Web Service

1. **登录 Render**
   - 访问 https://render.com
   - 使用 GitHub 账号登录

2. **创建新的 Web Service**
   - 点击 "New +" → "Web Service"
   - 连接你的 GitHub 仓库
   - 选择 `RecordStudy` 仓库

3. **配置全栈服务**
   ```
   Name: study-buddy
   Environment: Python 3
   Build Command: pip install -r backend/requirements.txt
   Start Command: cd backend && python start.py
   Instance Type: Free (选择免费计划)
   ```

4. **设置环境变量**
   在 Environment Variables 部分添加：
   ```
   SUPABASE_URL=https://rrkpxsjfuiptuufatnmx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJya3B4c2pmdWlwdHV1ZmF0bm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDUzMjAsImV4cCI6MjA3MTYyMTMyMH0.x5TP-elB9X6j2BkA_ejrazkTBE-QKPRjyK_GeShIzpU
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJya3B4c2pmdWlwdHV1ZmF0bm14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA0NTMyMCwiZXhwIjoyMDcxNjIxMzIwfQ.ysbr7C4Pl8E-zTLEpuicIHEBA0B3Gf50Qya9Iw0pbbA
   SECRET_KEY=随机生成的安全密钥（点击 Generate）
   NODE_ENV=production
   PYTHON_VERSION=3.11.0
   ```

5. **部署**
   - 点击 "Create Web Service"
   - 等待构建完成（约 5-10 分钟）

### 第三步：设置自定义域名（可选）

1. **在 Render 中设置自定义域名**
   - 在服务设置中找到 "Custom Domains"
   - 添加 `study-buddy.onrender.com`
   - 或者使用默认的 Render 域名

**注意：**合并部署的优势：
- ✅ 只需要一个域名
- ✅ 无 CORS 问题（同域请求）
- ✅ 部署简单（只需要一个服务）
- ✅ 节省免费资源

## 🔍 部署后验证

### 检查全栈应用
1. 访问应用主页：`https://study-buddy.onrender.com`
2. 检查健康状态：`https://study-buddy.onrender.com/health`
3. 查看 API 文档：`https://study-buddy.onrender.com/docs`
4. 测试用户登录：使用 `demo@example.com` / `abc123`
5. 测试学习记录功能

### 数据库连接测试
1. 登录前端应用
2. 尝试创建一条学习记录
3. 检查记录是否正确保存和显示

## 📝 Render 免费方案注意事项

### 限制
- **休眠机制**：15 分钟无活动后服务会休眠
- **内存限制**：512MB RAM
- **带宽限制**：100GB/月
- **构建时间**：每月 500 分钟

### 优化建议
1. **后端预热**：可以设置定时任务每 14 分钟访问一次健康检查端点
2. **静态资源优化**：压缩 CSS/JS 文件减少传输大小
3. **数据库缓存**：利用应用层缓存减少数据库查询

## 🛠️ 故障排除

### 常见问题

**1. 后端服务启动失败**
- 检查 `requirements.txt` 依赖是否正确
- 查看构建日志中的错误信息
- 确认环境变量设置正确

**2. CORS 错误**
- 确认 `CORS_ORIGINS` 包含正确的前端域名
- 检查前端 API 调用是否使用正确的后端地址

**3. 数据库连接失败**
- 验证 Supabase 环境变量是否正确
- 检查 Supabase 项目状态

**4. 前端页面空白**
- 查看浏览器控制台错误信息
- 检查静态文件路径是否正确

### 调试命令
```bash
# 查看后端日志
curl https://your-backend.onrender.com/health

# 测试 API 连接
curl https://your-backend.onrender.com/api/v1/records/test

# 检查 CORS 配置
curl -H "Origin: https://your-frontend.onrender.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS https://your-backend.onrender.com/api/v1/records
```

## 🎉 部署完成

恭喜！你的 Study Buddy 应用现在已经部署到 Render 上了。

- **应用地址**： https://study-buddy.onrender.com
- **API 文档**： https://study-buddy.onrender.com/docs
- **健康检查**： https://study-buddy.onrender.com/health

记住保存这些 URL，并在需要时更新 DNS 记录或自定义域名。