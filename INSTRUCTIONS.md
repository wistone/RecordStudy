# 🚀 学习搭子应用 - 部署说明

## 📁 项目结构
```
RecordStudy/
├── backend/          # Python FastAPI 后端
│   ├── api/         # API路由模块
│   ├── main.py      # FastAPI应用入口
│   ├── database.py  # 数据库配置
│   └── models.py    # 数据模型
├── frontend/        # 前端静态文件
│   ├── index.html   # 主应用页面
│   ├── login.html   # 登录页面
│   └── js/          # JavaScript文件
├── scripts/         # 数据库设置和测试脚本
└── sql/             # SQL脚本文件
```

## 当前状态
- ✅ FastAPI后端服务运行在 http://127.0.0.1:8000
- ✅ 前端页面已连接到后端API
- ✅ 代码已重新组织，后端文件移至 backend/ 目录
- ⚠️ 数据库需要手动更新结构

## 🔧 紧急修复步骤

### 1. 修复数据库结构

**在Supabase SQL编辑器中执行以下SQL：**

```sql
-- 删除现有profiles表，重新创建
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 创建新的profiles表
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 暂时禁用RLS以便测试
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 插入测试用户（密码都是password123）
INSERT INTO public.profiles (user_id, email, display_name, password_hash, created_at, updated_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'test@example.com', 'test', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewnTgFAKzfz9NQ3q', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'wq@example.com', 'wq', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewnTgFAKzfz9NQ3q', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'wistone@example.com', 'wistone', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewnTgFAKzfz9NQ3q', NOW(), NOW());
```

### 2. 启动后端服务

有两种启动方式：

**方式一：使用便捷脚本**
```bash
./run_backend.sh
```

**方式二：手动启动**
```bash
cd backend
source ../venv/bin/activate
python main.py
```

### 3. 测试应用

启动后端服务后：

1. **访问登录页面**: http://127.0.0.1:8000/login
2. **使用测试账户登录**:
   - test@example.com / password123
   - wq@example.com / password123  
   - wistone@example.com / password123

### 3. 功能验证

登录后应该能够：
- ✅ 查看仪表盘
- ✅ 创建学习记录
- ✅ 查看数据分析
- ✅ 管理学习记录

## 🎯 核心功能说明

### 认证系统
- 支持邮箱/密码登录
- JWT token认证
- 用户资料管理

### 学习记录
- 表单记录（5步流程）
- 快速记录（AI解析）
- 记录筛选和搜索

### 数据分析
- 学习统计
- 时长趋势图表
- AI智能洞察

### 标签系统
- 智能标签建议
- 标签统计分析

## 📝 备注

1. **当前为原型版本**，使用简化的认证系统
2. **生产环境需要**完整的Supabase Auth集成
3. **RLS策略已禁用**以便测试，生产环境需要重新启用

## 🔗 相关链接

- API文档: http://127.0.0.1:8000/docs  
- 健康检查: http://127.0.0.1:8000/api/health
- 登录页面: http://127.0.0.1:8000/login
- 主应用: http://127.0.0.1:8000/