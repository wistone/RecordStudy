# 学习搭子 - RecordStudy

记录学习，见证成长的个人学习管理系统。

## 🚀 快速开始

### 1. Python环境设置

```bash
# 自动设置Python环境和依赖
./scripts/setup-env.sh
```

### 2. 配置环境变量
确保 `.env` 文件包含以下Supabase配置：
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. 初始化数据库
在Supabase控制台运行以下SQL脚本：
```bash
# 1. 运行基础表结构
sql/001-init.sql

# 2. 设置RLS权限策略
sql/002-fix-profiles-rls.sql

# 3. 插入演示数据
sql/003-demo-data.sql
```

### 4. 启动服务

```bash
# 启动后端API服务器
venv/bin/python start-backend.py

# 启动前端服务器（另一个终端）
cd frontend && python -m http.server 3001
```

访问：
- 前端应用：http://localhost:3001
- 后端API：http://localhost:8000
- API文档：http://localhost:8000/docs

## 📁 项目结构

```
RecordStudy/
├── .env                    # 环境变量配置
├── backend/                # FastAPI后端
│   ├── app/
│   │   ├── api/           # API路由
│   │   ├── core/          # 核心配置
│   │   ├── models/        # 数据模型
│   │   └── schemas/       # Pydantic schemas
│   └── requirements.txt   # Python依赖
├── frontend/               # 前端源码
│   ├── index.html         # 首页
│   ├── login.html         # 登录页
│   ├── js/
│   │   ├── api-service.js # API服务层
│   │   ├── auth.js        # Supabase认证服务
│   │   └── app.js         # 主应用逻辑
│   └── styles/
│       └── main.css       # 样式文件
├── scripts/                # 环境管理脚本
│   ├── setup-env.sh      # 环境设置脚本
│   └── cleanup-envs.sh   # 环境清理脚本
├── sql/                   # 数据库脚本
│   ├── 001-init.sql      # 初始化表结构
│   ├── 002-fix-profiles-rls.sql  # RLS策略
│   └── 003-demo-data.sql # 演示数据
├── venv/                  # Python虚拟环境（自动生成）
└── start-backend.py      # 后端启动脚本
```

## 🔐 安全特性

- Supabase Auth认证，企业级安全
- Row Level Security (RLS) 数据权限控制
- 自动JWT token管理
- 环境变量分离配置

## 🛠️ 开发命令

- `npm start` - 启动前端开发服务器

## 📊 数据库

使用 Supabase PostgreSQL 数据库：

### 获取Supabase配置
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 去 **Settings → API**:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY` 
   - `service_role` key → `SUPABASE_SERVICE_KEY`
4. 去 **Settings → Database**:
   - `Connection string` → `URI` → `DATABASE_URL`

### 数据库表结构
- `auth.users` - Supabase内置用户表
- `public.profiles` - 用户资料表
- 更多学习记录相关表等待开发...

## 🔧 技术栈

### 前端
- 原生HTML/CSS/JavaScript
- Supabase JavaScript SDK
- 响应式CSS设计

### 后端
- FastAPI (Python)
- Supabase Python SDK
- JWT认证中间件
- Pydantic数据验证

### 数据库
- Supabase PostgreSQL
  - Row Level Security (RLS)
  - 实时数据订阅
  - 企业级用户认证
  - RESTful API自动生成

## ✨ 功能特性

### 已完成 ✅
- 🔐 用户注册/登录/登出 (Supabase Auth)
- 🗄️ 数据库连接和API服务
- 📊 学习记录CRUD操作
- 🎨 响应式前端界面
- 🔗 前后端API集成

### 开发中 🚧
- 📝 完整学习记录管理界面
- 📊 数据统计分析和图表
- 🎯 学习进度跟踪
- 📱 移动端优化

## 🎯 后续开发计划

现在基础认证功能已完成，接下来可以：

1. **学习记录功能** - 添加、编辑、查看学习记录
2. **数据分析** - 学习时长统计、进度图表
3. **目标管理** - 设置学习目标和提醒
4. **数据导出** - 学习数据导出到各种格式

所有数据都将存储在Supabase中，充分利用其实时同步和安全特性！