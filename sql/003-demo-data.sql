-- Demo用户示例数据迁移脚本
-- 为 demo@example.com 用户创建丰富的学习记录数据

-- 获取demo用户的ID (假设已经通过Supabase Auth创建)
-- 需要先在Supabase Dashboard中手动创建用户: demo@example.com / abc123

-- 1. 插入系统预置标签
INSERT INTO public.tags (tag_name, tag_type, created_by) VALUES
('AI', 'category'::tag_type, NULL),
('编程', 'category'::tag_type, NULL),
('数学', 'category'::tag_type, NULL),
('英语', 'category'::tag_type, NULL),
('机器学习', 'category'::tag_type, NULL),
('算法', 'category'::tag_type, NULL),
('数据科学', 'category'::tag_type, NULL),
('产品设计', 'category'::tag_type, NULL),
('历史', 'category'::tag_type, NULL),
('Python', 'skill'::tag_type, NULL),
('JavaScript', 'skill'::tag_type, NULL),
('React', 'skill'::tag_type, NULL),
('深度学习', 'topic'::tag_type, NULL),
('自然语言处理', 'topic'::tag_type, NULL),
('计算机视觉', 'topic'::tag_type, NULL)
ON CONFLICT (tag_name, coalesce(created_by, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;

-- 2. 插入学习资源
INSERT INTO public.resources (type, title, url, platform, author, description, created_by) VALUES
-- 视频资源
('video'::resource_type, 'MIT 6.001 Structure and Interpretation', 'https://www.youtube.com/watch?v=2Op3QLzMgSY', 'youtube', 'MIT OpenCourseWare', '经典计算机科学课程，深入理解程序设计', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('video'::resource_type, 'CS50 Introduction to Computer Science', 'https://www.youtube.com/watch?v=YoXxevp1WRQ', 'youtube', 'Harvard University', 'Harvard的计算机科学入门课程', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('video'::resource_type, '3Blue1Brown - 线性代数的本质', 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab', 'youtube', '3Blue1Brown', '用动画解释线性代数核心概念', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('video'::resource_type, 'Andrew Ng - Deep Learning Course', 'https://www.coursera.org/learn/neural-networks-deep-learning', 'coursera', 'Andrew Ng', '深度学习专项课程第一门', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('video'::resource_type, 'Python 数据结构与算法', 'https://www.bilibili.com/video/BV1uA411N7c5', 'bilibili', '程序员Carl', 'Python实现常用数据结构和算法', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),

-- 书籍资源  
('book'::resource_type, '深度学习入门：基于Python的理论与实现', NULL, NULL, '斋藤康毅', '深度学习入门经典教材', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('book'::resource_type, '算法导论（第三版）', NULL, NULL, 'Thomas H. Cormen', '算法设计与分析的权威教材', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('book'::resource_type, '统计学习方法', NULL, NULL, '李航', '机器学习理论经典教材', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('book'::resource_type, 'Clean Code', NULL, NULL, 'Robert C. Martin', '编写高质量代码的艺术', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),

-- 课程资源
('course'::resource_type, 'Coursera - Machine Learning by Andrew Ng', 'https://www.coursera.org/learn/machine-learning', 'coursera', 'Andrew Ng', '经典机器学习课程', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('course'::resource_type, 'edX - Introduction to Computer Science', 'https://www.edx.org/course/introduction-computer-science-harvardx-cs50x', 'edx', 'Harvard', 'Harvard CS50x 计算机科学导论', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('course'::resource_type, '慕课网 - Python数据分析', 'https://www.imooc.com/learn/1147', 'imooc', '慕课网', 'Python数据分析实战课程', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),

-- 播客资源
('podcast'::resource_type, 'Lex Fridman Podcast - Yann LeCun', 'https://lexfridman.com/yann-lecun', 'spotify', 'Lex Fridman', '与深度学习先驱的深度对话', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('podcast'::resource_type, 'Talk Python to Me - FastAPI', 'https://talkpython.fm/episodes/show/259/fastapi-for-apis', 'podcast', 'Michael Kennedy', 'FastAPI框架深度解析', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),

-- 文章资源
('article'::resource_type, 'Attention Is All You Need 论文解读', 'https://arxiv.org/abs/1706.03762', 'arxiv', 'Vaswani et al.', 'Transformer模型原始论文', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('article'::resource_type, 'React Hooks 最佳实践', 'https://react.dev/learn', 'react.dev', 'React Team', 'React Hooks使用指南', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),

-- 练习资源
('exercise'::resource_type, 'LeetCode 两数之和', 'https://leetcode.com/problems/two-sum/', 'leetcode', 'LeetCode', '经典算法题：数组中找到两数之和', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('exercise'::resource_type, 'HackerRank SQL 挑战', 'https://www.hackerrank.com/domains/sql', 'hackerrank', 'HackerRank', 'SQL技能练习题集', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),

-- 项目资源
('project'::resource_type, '个人博客系统开发', 'https://github.com/demo/blog-system', 'github', 'demo', '使用React和Node.js开发的个人博客', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)),
('project'::resource_type, '机器学习股票预测', 'https://github.com/demo/stock-prediction', 'github', 'demo', '基于LSTM的股票价格预测模型', (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1));

-- 3. 为demo用户创建用户-资源关系
INSERT INTO public.user_resources (user_id, resource_id, status, rating, total_duration_min, is_favorite)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1) as user_id,
    resource_id,
    CASE 
        WHEN resource_id % 4 = 0 THEN 'done'::resource_status
        WHEN resource_id % 4 = 1 THEN 'learning'::resource_status 
        WHEN resource_id % 4 = 2 THEN 'paused'::resource_status
        ELSE 'wishlist'::resource_status
    END as status,
    CASE 
        WHEN resource_id % 4 = 0 THEN (3 + (resource_id % 3))  -- 已完成的给3-5星
        ELSE NULL
    END as rating,
    CASE 
        WHEN type = 'video'::resource_type THEN 45 + (resource_id % 30)
        WHEN type = 'book'::resource_type THEN 120 + (resource_id % 60)  
        WHEN type = 'course'::resource_type THEN 180 + (resource_id % 120)
        WHEN type = 'podcast'::resource_type THEN 60 + (resource_id % 30)
        ELSE 30 + (resource_id % 20)
    END as total_duration_min,
    (resource_id % 5 = 0) as is_favorite
FROM public.resources 
WHERE created_by = (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1);

-- 4. 创建近期学习记录（最近9天，每天1-4条记录）
DO $$
DECLARE
    demo_user_id uuid := (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1);
    record_date date;
    daily_records integer;
    i integer;
    resource_ids integer[];
    selected_resource_id integer;
    record_titles text[] := ARRAY[
        '学习了Transformer架构原理',
        '练习Python数据结构',
        '阅读算法导论第12章',
        '观看3Blue1Brown线性代数',
        '完成LeetCode动态规划题',
        '学习React Hooks用法',
        '听了AI播客讨论',
        '写了机器学习笔记',
        '复习深度学习概念',
        '练习SQL查询优化',
        '学习FastAPI框架',
        '阅读Clean Code',
        '观看MIT算法课程',
        '完成数据分析项目',
        '学习计算机视觉基础',
        '听英语技术播客',
        '写了学习总结',
        '练习算法题',
        '学习统计学方法',
        '开发个人项目'
    ];
BEGIN
    -- 获取所有资源ID
    SELECT ARRAY(SELECT resource_id FROM public.resources WHERE created_by = demo_user_id) INTO resource_ids;
    
    -- 为最近9天创建记录
    FOR day_offset IN 0..8 LOOP
        record_date := CURRENT_DATE - day_offset;
        daily_records := 1 + (day_offset % 4); -- 每天1-4条记录
        
        FOR i IN 1..daily_records LOOP
            -- 随机选择一个资源
            selected_resource_id := resource_ids[1 + (day_offset * daily_records + i - 1) % array_length(resource_ids, 1)];
            
            INSERT INTO public.records (
                user_id,
                resource_id, 
                form_type,
                title,
                body_md,
                occurred_at,
                duration_min,
                effective_duration_min,
                difficulty,
                focus,
                energy
            ) VALUES (
                demo_user_id,
                selected_resource_id,
                (ARRAY['video'::resource_type,'book'::resource_type,'course'::resource_type,'podcast'::resource_type,'article'::resource_type,'exercise'::resource_type,'project'::resource_type])[1 + ((day_offset + i) % 7)],
                record_titles[1 + ((day_offset * daily_records + i - 1) % array_length(record_titles, 1))],
                CASE 
                    WHEN (day_offset + i) % 3 = 0 THEN '今天的学习很有收获，理解了核心概念。需要继续深入练习。'
                    WHEN (day_offset + i) % 3 = 1 THEN '进度不错，但是有些地方还需要反复理解。'
                    ELSE '学习状态很好，知识点掌握扎实。'
                END,
                record_date + INTERVAL '1 hour' * (8 + (i * 3 + day_offset) % 12), -- 8AM-8PM时间分布
                15 + ((day_offset + i) % 90), -- 15-104分钟
                15 + ((day_offset + i) % 80), -- 有效时间略少
                1 + ((day_offset + i) % 5), -- 难度1-5
                1 + ((day_offset + i + 1) % 5), -- 专注度1-5
                1 + ((day_offset + i + 2) % 5)  -- 精力1-5
            );
        END LOOP;
    END LOOP;
END $$;

-- 5. 为资源添加标签关联
INSERT INTO public.resource_tags (user_id, resource_id, tag_id)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1) as user_id,
    r.resource_id,
    t.tag_id
FROM public.resources r
CROSS JOIN public.tags t
WHERE r.created_by = (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1)
AND t.created_by IS NULL  -- 只关联系统标签
AND (
    -- 为不同类型资源关联相关标签
    (r.type = 'video'::resource_type AND t.tag_name IN ('AI', '编程', '数学')) OR
    (r.type = 'book'::resource_type AND t.tag_name IN ('算法', '机器学习', '编程')) OR  
    (r.type = 'course'::resource_type AND t.tag_name IN ('AI', '数学', '数据科学')) OR
    (r.type = 'podcast'::resource_type AND t.tag_name IN ('AI', '英语', '产品设计')) OR
    (r.type = 'article'::resource_type AND t.tag_name IN ('深度学习', 'React', 'JavaScript')) OR
    (r.type = 'exercise'::resource_type AND t.tag_name IN ('算法', 'Python', 'JavaScript')) OR
    (r.type = 'project'::resource_type AND t.tag_name IN ('React', 'Python', '数据科学'))
)
AND random() < 0.7; -- 70%的概率添加标签，让数据更真实

-- 插入完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ Demo用户示例数据插入完成！';
    RAISE NOTICE '📊 统计信息:';
    RAISE NOTICE '   - 资源数量: %', (SELECT COUNT(*) FROM public.resources WHERE created_by = (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1));
    RAISE NOTICE '   - 学习记录: %', (SELECT COUNT(*) FROM public.records WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1));
    RAISE NOTICE '   - 标签关联: %', (SELECT COUNT(*) FROM public.resource_tags WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1));
END $$;