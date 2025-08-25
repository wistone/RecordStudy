-- 修复 profiles 表的 RLS 策略
-- 在 Supabase SQL 编辑器中运行此脚本

-- 为 profiles 表启用 RLS (如果尚未启用)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "profiles_owner_rw" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- 创建新的 RLS 策略

-- 1. 允许用户查看自己的 profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (user_id = auth.uid());

-- 2. 允许用户插入自己的 profile（注册时）
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 3. 允许用户更新自己的 profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid()) 
    WITH CHECK (user_id = auth.uid());

-- 4. 允许用户删除自己的 profile（可选）
CREATE POLICY "profiles_delete_own" ON public.profiles
    FOR DELETE USING (user_id = auth.uid());

-- 验证策略创建
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 测试插入权限
-- 注意：这个测试需要在用户已登录的上下文中运行
-- SELECT auth.uid(); -- 应该返回当前用户的 UUID