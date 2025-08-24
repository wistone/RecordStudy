-- Complete fix for foreign key constraints and RLS
-- Run this in Supabase SQL Editor

-- 1. Drop all foreign key constraints that reference auth.users
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop foreign key constraints
    FOR r IN (
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = 'public'
          AND ccu.table_name = 'users'
          AND tc.table_name IN ('records', 'tags', 'resources', 'user_resources', 'resource_tags', 'user_summaries', 'profiles')
    )
    LOOP
        EXECUTE 'ALTER TABLE public.' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
        RAISE NOTICE 'Dropped constraint % from table %', r.constraint_name, r.table_name;
    END LOOP;
END $$;

-- 2. Disable RLS on all tables
ALTER TABLE public.records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources DISABLE ROW LEVEL SECURITY;  
ALTER TABLE public.user_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. Insert test data for records
INSERT INTO public.records (user_id, title, form_type, duration_min, difficulty, focus, energy, occurred_at, privacy, body_md)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Python基础教程', 'video', 45, 3, 4, 4, NOW() - INTERVAL '1 day', 'private', '学习了Python的基本语法和数据类型'),
    ('550e8400-e29b-41d4-a716-446655440001', '机器学习入门', 'book', 90, 4, 5, 3, NOW() - INTERVAL '2 days', 'private', '阅读了机器学习的基础概念和算法'),
    ('550e8400-e29b-41d4-a716-446655440001', '英语口语练习', 'exercise', 30, 2, 4, 5, NOW(), 'private', '练习日常英语对话'),
    ('550e8400-e29b-41d4-a716-446655440001', 'React项目开发', 'project', 120, 4, 4, 3, NOW() - INTERVAL '3 days', 'private', '开发了一个简单的Todo应用'),
    ('550e8400-e29b-41d4-a716-446655440001', '晨跑', 'workout', 25, 2, 3, 5, NOW(), 'private', '5公里晨跑，天气不错')
ON CONFLICT DO NOTHING;

-- 4. Insert test tags (with NULL created_by to avoid foreign key issues)  
INSERT INTO public.tags (tag_name, tag_type, created_by)
VALUES 
    ('编程', 'category', NULL),
    ('AI', 'topic', NULL),
    ('英语', 'skill', NULL),
    ('数学', 'topic', NULL),
    ('运动', 'category', NULL),
    ('历史', 'topic', NULL),
    ('设计', 'skill', NULL)
ON CONFLICT (tag_name, COALESCE(created_by, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;

-- 5. Verify data insertion
SELECT 'Records count: ' || COUNT(*)::TEXT as result FROM public.records WHERE user_id = '550e8400-e29b-41d4-a716-446655440001'
UNION ALL
SELECT 'Tags count: ' || COUNT(*)::TEXT as result FROM public.tags;