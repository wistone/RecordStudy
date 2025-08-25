# 学习搭子 - RecordStudy

记录学习，见证成长的个人学习管理系统。

## 🚀 快速开始

### 1. 配置环境变量
确保 `.env` 文件包含以下Supabase配置：
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres
```

### 2. 初始化数据库
在Supabase控制台运行以下SQL脚本：
```bash
# 1. 运行基础表结构
sql/001-init.sql

# 2. 设置RLS权限策略
sql/002-fix-profiles-rls.sql
```

### 3. 启动前端服务器
```bash
npm start
# 或者
python3 -m http.server 3000 --directory frontend
```

访问 `http://localhost:3000` 开始使用。

## 📁 项目结构

```
RecordStudy/
├── .env                    # Supabase环境变量配置
├── frontend/               # 前端源码
│   ├── index.html         # 首页
│   ├── login.html         # 登录页
│   ├── js/
│   │   ├── env.js         # 环境变量加载
│   │   ├── auth.js        # Supabase认证服务
│   │   └── app.js         # 主应用逻辑
│   └── styles/
│       └── main.css       # 样式文件
├── sql/                   # 数据库脚本
│   ├── 001-init.sql      # 初始化表结构
│   └── 002-fix-profiles-rls.sql  # RLS策略
└── package.json          # 项目配置
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
- Supabase (BaaS)
  - PostgreSQL数据库
  - 内置用户认证
  - 实时数据订阅
  - Row Level Security
  - 自动生成API

## ✨ 功能特性

- 🔐 用户注册/登录/登出 (Supabase Auth)
- 📝 学习记录管理 (开发中)
- 📊 数据统计分析 (开发中)
- 🎯 学习进度跟踪 (开发中)
- 📱 响应式设计

## 🎯 后续开发计划

现在基础认证功能已完成，接下来可以：

1. **学习记录功能** - 添加、编辑、查看学习记录
2. **数据分析** - 学习时长统计、进度图表
3. **目标管理** - 设置学习目标和提醒
4. **数据导出** - 学习数据导出到各种格式

所有数据都将存储在Supabase中，充分利用其实时同步和安全特性！