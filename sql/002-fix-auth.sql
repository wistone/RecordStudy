-- 002-fix-auth.sql
-- 修复认证系统和profiles表结构

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

-- 插入测试用户
INSERT INTO public.profiles (user_id, email, display_name, password_hash, created_at, updated_at)
  VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'test@example.com', 'test',
'$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewnTgFAKzfz9NQ3q', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'wq@example.com', 'wq',
'$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewnTgFAKzfz9NQ3q', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'wistone@example.com', 'wistone',
'$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewnTgFAKzfz9NQ3q', NOW(), NOW());