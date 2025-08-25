# 📖 Study Buddy 文档

## 🚀 部署指南

### [快速开始](./RENDER_QUICKSTART.md)
5分钟快速部署到 Render 平台：
- 分离部署架构说明
- 核心配置步骤
- 环境变量设置
- 验证测试

### [详细部署指南](./DEPLOYMENT_GUIDE.md) 
完整的部署流程和故障排除：
- Step-by-step 详细步骤
- 常见问题解决方案
- 性能优化建议
- 调试和监控

## 📋 文档说明

**两个部署文档的区别：**

- **RENDER_QUICKSTART.md**: 精简版，适合快速部署
- **DEPLOYMENT_GUIDE.md**: 完整版，包含详细说明和故障排除

推荐：
- 🔰 首次部署用户 → 先看 DEPLOYMENT_GUIDE.md  
- ⚡ 有经验用户 → 直接看 RENDER_QUICKSTART.md

## 🏗️ 项目架构

**最终部署架构：**
```
study-buddy.onrender.com         (前端静态站点)
     ↓ API calls
study-buddy-api.onrender.com     (后端 API 服务)
     ↓ Database queries  
supabase.co                      (PostgreSQL 数据库)
```

## 🎯 部署目标

- **前端**: https://study-buddy.onrender.com
- **后端**: https://study-buddy-api.onrender.com  
- **API 文档**: https://study-buddy-api.onrender.com/docs