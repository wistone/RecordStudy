#!/usr/bin/env python3
"""
Create mock data directly using raw SQL to bypass foreign key constraints
"""
import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timedelta

load_dotenv()

def create_mock_data():
    """Create mock data using raw SQL"""
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    supabase = create_client(supabase_url, service_key)
    
    test_user_id = "550e8400-e29b-41d4-a716-446655440001"
    
    # Create records directly with SQL
    records_sql = f"""
    INSERT INTO public.records (user_id, title, form_type, duration_min, difficulty, focus, energy, occurred_at, privacy, body_md)
    VALUES 
    ('{test_user_id}', 'Python基础教程', 'video', 45, 3, 4, 4, '{(datetime.utcnow() - timedelta(days=1)).isoformat()}', 'private', '学习了Python的基本语法和数据类型'),
    ('{test_user_id}', '机器学习入门', 'book', 90, 4, 5, 3, '{(datetime.utcnow() - timedelta(days=2)).isoformat()}', 'private', '阅读了机器学习的基础概念和算法'),
    ('{test_user_id}', '英语口语练习', 'exercise', 30, 2, 4, 5, '{datetime.utcnow().isoformat()}', 'private', '练习日常英语对话'),
    ('{test_user_id}', 'React项目开发', 'project', 120, 4, 4, 3, '{(datetime.utcnow() - timedelta(days=3)).isoformat()}', 'private', '开发了一个简单的Todo应用'),
    ('{test_user_id}', '晨跑', 'workout', 25, 2, 3, 5, '{datetime.utcnow().isoformat()}', 'private', '5公里晨跑，天气不错')
    ON CONFLICT DO NOTHING;
    """
    
    # Create tags directly with SQL (without created_by to avoid foreign key issue)
    tags_sql = """
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
    """
    
    try:
        # Execute records SQL
        result = supabase.rpc('exec', {'sql': records_sql})
        print('✅ Created records with SQL')
    except Exception as e:
        print(f'❌ Error creating records: {e}')
    
    try:
        # Execute tags SQL  
        result = supabase.rpc('exec', {'sql': tags_sql})
        print('✅ Created tags with SQL')
    except Exception as e:
        print(f'❌ Error creating tags: {e}')
    
    # Verify data was created
    try:
        records = supabase.table('records').select('*').eq('user_id', test_user_id).execute()
        print(f'✅ Found {len(records.data)} records for test user')
        
        tags = supabase.table('tags').select('*').execute()
        print(f'✅ Found {len(tags.data)} tags in database')
        
    except Exception as e:
        print(f'❌ Error verifying data: {e}')

if __name__ == "__main__":
    create_mock_data()