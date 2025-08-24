# 学习搭子数据库设计文档

## 🎯 总体设计原则

基于PRD需求，数据库设计围绕**学习记录**为核心，支持：
- 快速记录学习过程（表单+随手记）
- 多维度统计分析（时间、类别、资源等）  
- 情绪反馈和进度追踪

---

## 📊 表结构概览

### 核心表
- `records` - **学习记录核心表**（PRD核心需求）
- `resources` - 学习资源库（去重管理）
- `user_resources` - 用户资源关系表

### 辅助表  
- `profiles` - 用户档案扩展
- `tags` + `resource_tags` - 标签系统
- `user_summaries` - 预计算报表

---

## 📋 详细表结构

### 1. records - 学习记录表 ⭐ **核心表**

```sql
create table public.records (
  record_id bigserial primary key,
  user_id uuid not null,                          -- 用户ID
  resource_id bigint,                              -- 关联资源(可空)
  form_type resource_type not null,                -- 形式类别(必填)
  title text not null,                             -- 标题(必填)
  body_md text,                                    -- 记录正文(Markdown)
  occurred_at timestamptz not null default now(), -- 学习时间
  duration_min integer,                            -- 总时长(分钟)
  effective_duration_min integer,                  -- 有效时长(分钟)
  
  -- 反馈字段(PRD情绪反馈需求)
  mood text,                                       -- 情绪(文本)
  difficulty smallint check (difficulty between 1 and 5), -- 主观难度1-5
  focus smallint check (focus between 1 and 5),           -- 专注度1-5  
  energy smallint check (energy between 1 and 5),         -- 体感能量1-5
  
  privacy privacy_level not null default 'private',       -- 权限控制
  auto_confidence numeric(4,2),                           -- 自动置信度
  assets jsonb,                                            -- 配图/音频等
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**索引设计**：
- `idx_records_user_time` - 用户维度时间查询
- `idx_records_title_trgm` + `idx_records_body_trgm` - 中文模糊搜索
- `idx_records_search_expr` - 全文搜索

---

### 2. resources - 学习资源表

```sql
create table public.resources (
  resource_id bigserial primary key,
  type resource_type not null,                     -- 资源类型
  title text not null,                             -- 资源标题
  url text,                                        -- 原始链接
  normalized_url text,                             -- 去重用归一化URL
  platform text,                                  -- 平台(youtube/bilibili等)
  platform_id citext,                             -- 平台内ID
  isbn citext,                                     -- ISBN(书籍)
  author text,                                     -- 作者
  cover_url text,                                  -- 封面
  description text,                                -- 描述
  created_by uuid,                                 -- 创建者
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**去重策略**：
- URL归一化去重
- ISBN去重  
- 平台+平台ID组合去重

---

### 3. user_resources - 用户资源关系表

```sql
create table public.user_resources (
  user_resource_id bigserial primary key,
  user_id uuid not null,
  resource_id bigint not null,
  status resource_status not null default 'learning',    -- 学习状态
  rating smallint check (rating between 1 and 5),        -- 评分1-5
  review_short text,                                      -- 简短评价
  total_duration_min integer not null default 0,         -- 累计时长
  is_favorite boolean not null default false,            -- 是否收藏
  privacy privacy_level not null default 'private',      -- 权限
  last_interaction_at timestamptz,                        -- 最后交互时间
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, resource_id)
);
```

---

### 4. tags - 标签表

```sql
create table public.tags (
  tag_id bigserial primary key,
  tag_name text not null,                          -- 标签名
  tag_type tag_type not null default 'category',   -- 类型(category/topic/skill)
  created_by uuid,                                 -- 创建者(null=系统标签)
  created_at timestamptz not null default now(),
  unique (tag_name, coalesce(created_by, '00000000-0000-0000-0000-000000000000'))
);

create table public.resource_tags (
  resource_tag_id bigserial primary key,
  user_id uuid not null,                           -- 标签归属用户  
  resource_id bigint not null,
  tag_id bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id, resource_id, tag_id)
);
```

---

### 5. user_summaries - 用户总结表

```sql
create table public.user_summaries (
  summary_id bigserial primary key,
  user_id uuid not null,
  period summary_period not null,                  -- daily/weekly/monthly/yearly
  period_start date not null,                      -- 周期开始
  period_end date not null,                        -- 周期结束
  summary_md text,                                 -- AI生成总结
  metrics jsonb,                                   -- 结构化指标
  created_at timestamptz not null default now(),
  unique (user_id, period, period_start)
);
```

---

### 6. profiles - 用户档案表

```sql
create table public.profiles (
  user_id uuid primary key,
  display_name text,                               -- 显示名称
  avatar_url text,                                 -- 头像URL
  created_at timestamptz not null default now()
);
```

---

## 🏷️ 枚举类型定义

```sql
-- 资源类型
resource_type: 'video','podcast','book','course','article','paper','exercise','project','workout','other'

-- 隐私级别  
privacy_level: 'private','buddies','public'

-- 资源状态
resource_status: 'wishlist','learning','paused','done','reviewing' 

-- 总结周期
summary_period: 'daily','weekly','monthly','yearly'

-- 资产类型
asset_type: 'image','audio','file'

-- 标签类型  
tag_type: 'category','topic','skill'
```

---

## 🔐 权限策略(RLS)

### 核心权限原则
- **resources**: 登录用户可读，创建者可改
- **user_resources**: 仅本人可见可改
- **records**: 本人全权限 + public记录任何人可读
- **tags**: 系统标签公开，自定义标签仅本人可见
- **resource_tags**: 仅本人可见(标注是按人的)
- **user_summaries**: 仅本人可见

---

## 🚨 MVP版本简化建议

### 过度设计问题
1. **资源管理过复杂** - `resources` + `user_resources` 两表对MVP太重
2. **标签系统过复杂** - 系统标签+用户标签+关联表过度设计  
3. **预计算报表** - `user_summaries` 对MVP不必要
4. **用户档案** - `profiles` PRD未提及
5. **权限过复杂** - RLS策略对MVP过度

### MVP简化方案

**保留核心**：
- `records` 表（完整保留）
- 基础枚举类型
- 基础索引

**简化方案**：
- 资源信息直接存在 `records.assets` jsonb字段
- 标签存在 `records` 表中的 `categories` jsonb数组  
- 统计实时计算，不预存
- 权限先只做基础用户隔离

---

## 📈 关键查询模式

### 1. 记录列表（按时间倒序）
```sql
SELECT * FROM records 
WHERE user_id = $1 
ORDER BY occurred_at DESC 
LIMIT 20;
```

### 2. 学习时长统计（日期范围）  
```sql
SELECT 
  DATE(occurred_at) as date,
  SUM(COALESCE(effective_duration_min, duration_min, 0)) as total_min
FROM records 
WHERE user_id = $1 
  AND occurred_at >= $2 
  AND occurred_at <= $3
GROUP BY DATE(occurred_at)
ORDER BY date;
```

### 3. 类别统计
```sql  
SELECT 
  form_type,
  COUNT(*) as count,
  SUM(COALESCE(effective_duration_min, duration_min, 0)) as total_min
FROM records
WHERE user_id = $1
  AND occurred_at >= $2
GROUP BY form_type
ORDER BY total_min DESC;
```

### 4. 模糊搜索
```sql
SELECT * FROM records
WHERE user_id = $1 
  AND (title ILIKE $2 OR body_md ILIKE $2)
ORDER BY occurred_at DESC;
```

---

## 🔧 部署注意事项

1. **扩展安装**：需要 `pg_trgm` 和 `citext` 扩展
2. **索引构建**：GIN索引构建可能较慢，建议在数据量小时创建
3. **RLS策略**：生产环境需确保Supabase的auth.uid()正常工作
4. **JSONB字段**：assets和metrics字段需要应用层验证数据结构

---

## 📝 后续优化方向

1. **分区表**：records表按时间分区（数据量大后）
2. **读写分离**：reports类查询考虑只读副本
3. **缓存层**：统计数据考虑Redis缓存
4. **全文搜索**：中文分词优化（如jieba + pg_jieba）
