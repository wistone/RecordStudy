-- ------------ 简化版数据库重置 ------------
-- 仅删除明确的应用表和类型，不进行通用清理

-- 删除应用表
DROP TABLE IF EXISTS public.user_summaries CASCADE;
DROP TABLE IF EXISTS public.resource_tags CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.records CASCADE;
DROP TABLE IF EXISTS public.user_resources CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 删除应用触发器函数
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

-- 删除应用自定义类型
DROP TYPE IF EXISTS public.resource_type CASCADE;
DROP TYPE IF EXISTS public.privacy_level CASCADE;
DROP TYPE IF EXISTS public.resource_status CASCADE;
DROP TYPE IF EXISTS public.summary_period CASCADE;
DROP TYPE IF EXISTS public.asset_type CASCADE;
DROP TYPE IF EXISTS public.tag_type CASCADE;

-- ------------ 基础扩展（建议启用） ------------
create extension if not exists pg_trgm;   -- 中文/英文都受益的模糊搜索
create extension if not exists citext;    -- 大小写不敏感文本（如平台ID）

-- ------------ 枚举类型 ------------
do $$ begin
  create type resource_type as enum ('video','podcast','book','course','article','paper','exercise','project','workout','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type privacy_level as enum ('private','buddies','public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type resource_status as enum ('wishlist','learning','paused','done','reviewing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type summary_period as enum ('daily','weekly','monthly','yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_type as enum ('image','audio','file');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tag_type as enum ('category','topic','skill');
exception when duplicate_object then null; end $$;

-- ------------ 用户档案（可选；你也可以只用 auth.users） ------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ------------ 资源（全局去重，用户共享；URL/ISBN/平台ID三选一或多选） ------------
create table if not exists public.resources (
  resource_id bigserial primary key,
  type resource_type not null,
  title text not null,
  url text,                      -- 原始链接
  normalized_url text,           -- 归一化后用于去重（由应用生成）
  platform text,                 -- youtube/bilibili/douban/medium/...
  platform_id citext,            -- 平台内唯一ID（如 YouTube videoId）
  isbn citext,                   -- 书籍可用
  author text,
  cover_url text,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- URL/ISBN/平台ID的"部分唯一索引"，三者任一命中即可避免重复
create unique index if not exists uq_resources_normalized_url
  on public.resources (normalized_url)
  where normalized_url is not null;

create unique index if not exists uq_resources_isbn
  on public.resources (isbn)
  where isbn is not null;

create unique index if not exists uq_resources_platform_key
  on public.resources (platform, platform_id)
  where platform is not null and platform_id is not null;

create index if not exists idx_resources_title_trgm
  on public.resources using gin (title gin_trgm_ops);

-- ------------ 用户-资源关系（把"状态/评分/进度"放在这里；一人一份） ------------
create table if not exists public.user_resources (
  user_resource_id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id bigint not null references public.resources(resource_id) on delete cascade,
  status resource_status not null default 'learning',
  rating smallint check (rating between 1 and 5) null,
  review_short text,
  total_duration_min integer not null default 0,
  is_favorite boolean not null default false,
  privacy privacy_level not null default 'private',
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

create index if not exists idx_user_resources_user
  on public.user_resources (user_id, last_interaction_at desc);

-- ------------ 记录（你MVP的核心数据；每条学习事件） ------------
create table if not exists public.records (
  record_id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id bigint references public.resources(resource_id) on delete set null, -- 随手记可能还没绑定资源
  form_type resource_type not null,                 -- 记录的"形式类别"，用于兜底统计
  title text not null,
  body_md text,
  occurred_at timestamptz not null default now(),
  duration_min integer check (duration_min >= 0) null,
  effective_duration_min integer check (
    effective_duration_min >= 0 and
    (duration_min is null or effective_duration_min <= duration_min)
  ) null,
  mood text,                                        -- 随手情绪，先留文本
  difficulty smallint check (difficulty between 1 and 5) null,
  focus smallint check (focus between 1 and 5) null,
  energy smallint check (energy between 1 and 5) null,
  privacy privacy_level not null default 'private',
  auto_confidence numeric(4,2) check (auto_confidence between 0 and 1) null,
  assets jsonb,                                     -- 可存图/音等对象存储URL数组 [{type:'image',url:'...'}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_records_user_time
  on public.records (user_id, occurred_at desc);

create index if not exists idx_records_resource_time
  on public.records (resource_id, occurred_at desc);

-- 混合（标题+正文）的模糊/全文检索索引（中文可先靠trgm；后续再引入更好的中文分词）
create index if not exists idx_records_title_trgm
  on public.records using gin (title gin_trgm_ops);

create index if not exists idx_records_body_trgm
  on public.records using gin (body_md gin_trgm_ops);

create index if not exists idx_records_search_expr
  on public.records using gin (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body_md,''))
  );

-- ------------ 标签（系统标签与用户自定义并存；映射到资源上，且"按人"生效） ------------
create table if not exists public.tags (
  tag_id bigserial primary key,
  tag_name text not null,
  tag_type tag_type not null default 'category',
  created_by uuid references auth.users(id),     -- null 表示系统预置
  created_at timestamptz not null default now()
);

-- 创建唯一索引来替代UNIQUE约束中的函数调用
create unique index if not exists uq_tags_name_creator
  on public.tags (tag_name, coalesce(created_by, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.resource_tags (
  resource_tag_id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,   -- 标签归属到"人"
  resource_id bigint not null references public.resources(resource_id) on delete cascade,
  tag_id bigint not null references public.tags(tag_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, resource_id, tag_id)
);

create index if not exists idx_resource_tags_user_resource
  on public.resource_tags (user_id, resource_id);

-- ------------ 总结/报表（为"日卡/周报"预计算，读起来快） ------------
create table if not exists public.user_summaries (
  summary_id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  period summary_period not null,           -- daily / weekly
  period_start date not null,               -- daily: 当天；weekly: 周一
  period_end date not null,                 -- daily: 当天；weekly: 周日
  summary_md text,                          -- 生成的自然语言总结
  metrics jsonb,                            -- 结构化指标（{total_min:.., top_tags:[..], ...}）
  created_at timestamptz not null default now(),
  unique (user_id, period, period_start)
);

-- ------------ 通用的 updated_at 触发器 ------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_resources_updated on public.resources;
create trigger trg_resources_updated
before update on public.resources
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_user_resources_updated on public.user_resources;
create trigger trg_user_resources_updated
before update on public.user_resources
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_records_updated on public.records;
create trigger trg_records_updated
before update on public.records
for each row execute procedure public.set_updated_at();

-- ------------ RLS（Row Level Security）策略 ------------
alter table public.resources enable row level security;
alter table public.user_resources enable row level security;
alter table public.records enable row level security;
alter table public.tags enable row level security;
alter table public.resource_tags enable row level security;
alter table public.user_summaries enable row level security;

-- resources：默认所有登录用户可读；只有创建者可改
do $$ begin
  create policy "resources_select_all_auth" on public.resources
    for select using (auth.role() = 'authenticated' or auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "resources_insert_owner" on public.resources
    for insert with check (created_by = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "resources_mutate_owner" on public.resources
    for update using (created_by = auth.uid()) with check (created_by = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "resources_delete_owner" on public.resources
    for delete using (created_by = auth.uid());
exception when duplicate_object then null; end $$;

-- user_resources：只有本人可见可改
do $$ begin
  create policy "user_resources_owner_rw" on public.user_resources
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- records：本人可读写；若 privacy='public' 则任何登录用户可读
do $$ begin
  create policy "records_owner_rw" on public.records
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "records_public_read" on public.records
    for select using (privacy = 'public');
exception when duplicate_object then null; end $$;

-- tags：系统标签（created_by is null）任何人可读；自定义标签仅本人可读写
do $$ begin
  create policy "tags_read_system_or_owner" on public.tags
    for select using (created_by is null or created_by = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "tags_owner_rw" on public.tags
    for all using (created_by = auth.uid()) with check (created_by = auth.uid());
exception when duplicate_object then null; end $$;

-- resource_tags：仅本人可见可改（因为标注是"按人"的）
do $$ begin
  create policy "resource_tags_owner_rw" on public.resource_tags
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- user_summaries：仅本人可见
do $$ begin
  create policy "summaries_owner_rw" on public.user_summaries
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;