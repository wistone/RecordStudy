-- Test data setup for Learning Tracker prototype
-- This script creates test users and sample data

-- Temporarily disable foreign key checks for prototype testing
SET session_replication_role = replica;

-- Create test user profiles
INSERT INTO public.profiles (user_id, display_name, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'test', NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'wq', NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 'wistone', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Create some tags for testing
INSERT INTO public.tags (tag_name, created_at, created_by) VALUES
    ('编程', NOW(), '550e8400-e29b-41d4-a716-446655440001'),
    ('AI', NOW(), '550e8400-e29b-41d4-a716-446655440001'),
    ('英语', NOW(), '550e8400-e29b-41d4-a716-446655440001'),
    ('数学', NOW(), '550e8400-e29b-41d4-a716-446655440001'),
    ('运动', NOW(), '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (tag_id) DO NOTHING;

-- Create some test records for the 'test' user
INSERT INTO public.records (user_id, title, type, duration_minutes, difficulty_rating, focus_rating, energy_rating, occurred_at, created_at, updated_at, status, privacy) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Python基础教程', 'video', 45, 3, 4, 4, NOW() - INTERVAL '1 day', NOW(), NOW(), 'completed', 'private'),
    ('550e8400-e29b-41d4-a716-446655440001', '机器学习入门', 'book', 90, 4, 5, 3, NOW() - INTERVAL '2 days', NOW(), NOW(), 'completed', 'private'),
    ('550e8400-e29b-41d4-a716-446655440001', '英语口语练习', 'exercise', 30, 2, 4, 5, NOW() - INTERVAL '0 days', NOW(), NOW(), 'completed', 'private'),
    ('550e8400-e29b-41d4-a716-446655440001', '晨跑', 'workout', 25, 2, 3, 5, NOW() - INTERVAL '0 days', NOW(), NOW(), 'completed', 'private'),
    ('550e8400-e29b-41d4-a716-446655440001', 'React开发实战', 'project', 120, 4, 4, 3, NOW() - INTERVAL '3 days', NOW(), NOW(), 'completed', 'private');

-- Link some tags to records
INSERT INTO public.record_tags (record_id, tag_id) 
SELECT r.record_id, t.tag_id 
FROM public.records r, public.tags t 
WHERE r.title = 'Python基础教程' AND t.tag_name = '编程'
UNION ALL
SELECT r.record_id, t.tag_id 
FROM public.records r, public.tags t 
WHERE r.title = '机器学习入门' AND t.tag_name = 'AI'
UNION ALL
SELECT r.record_id, t.tag_id 
FROM public.records r, public.tags t 
WHERE r.title = '英语口语练习' AND t.tag_name = '英语'
UNION ALL
SELECT r.record_id, t.tag_id 
FROM public.records r, public.tags t 
WHERE r.title = '晨跑' AND t.tag_name = '运动'
UNION ALL
SELECT r.record_id, t.tag_id 
FROM public.records r, public.tags t 
WHERE r.title = 'React开发实战' AND t.tag_name = '编程';

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Verify test data
SELECT 'Profiles created:' as info;
SELECT user_id, display_name, created_at FROM public.profiles;

SELECT 'Records created:' as info;
SELECT r.record_id, r.title, r.type, r.duration_minutes, r.occurred_at 
FROM public.records r 
WHERE r.user_id = '550e8400-e29b-41d4-a716-446655440001'
ORDER BY r.occurred_at DESC;