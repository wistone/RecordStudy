#!/usr/bin/env python3
"""
Script to create the user_form_types table and initialize default form types.
Since we cannot run DDL through Supabase Python client, this script will attempt
to work with the existing structure or provide instructions for manual setup.
"""

import sys
import os
sys.path.append('backend')

from backend.app.core.config import settings
from supabase import create_client

def main():
    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        print("🔄 Checking if user_form_types table exists...")
        
        # Try to query the table to see if it exists
        try:
            response = client.table('user_form_types').select('*').limit(1).execute()
            print("✅ user_form_types table already exists!")
            
            # Check if demo user has form types
            demo_user_id = '6d45fa47-7935-4673-ac25-bc39ca3f3481'
            existing_types = client.table('user_form_types').select('*').eq('user_id', demo_user_id).execute()
            
            if existing_types.data:
                print(f"✅ Demo user already has {len(existing_types.data)} form types:")
                for form_type in existing_types.data:
                    print(f"   - {form_type['emoji']} {form_type['type_name']} ({form_type['type_code']})")
            else:
                print("🔄 Creating default form types for demo user...")
                create_default_form_types(client, demo_user_id)
                
        except Exception as e:
            if 'Could not find the table' in str(e):
                print("❌ user_form_types table does not exist!")
                print("\n📝 Please run the following SQL in your Supabase SQL Editor:")
                print("=" * 80)
                
                with open('sql/004-custom-form-types.sql', 'r', encoding='utf-8') as f:
                    sql_content = f.read()
                    print(sql_content)
                    
                print("=" * 80)
                print("After running the SQL, this script will work correctly.")
                return False
            else:
                raise
                
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def create_default_form_types(client, user_id):
    """Create default form types for a user"""
    default_types = [
        {'user_id': user_id, 'type_code': 'video', 'type_name': '视频', 'emoji': '📹', 'is_default': True, 'display_order': 1},
        {'user_id': user_id, 'type_code': 'podcast', 'type_name': '播客', 'emoji': '🎙️', 'is_default': True, 'display_order': 2},
        {'user_id': user_id, 'type_code': 'book', 'type_name': '书籍', 'emoji': '📚', 'is_default': True, 'display_order': 3},
        {'user_id': user_id, 'type_code': 'course', 'type_name': '课程', 'emoji': '🎓', 'is_default': True, 'display_order': 4},
        {'user_id': user_id, 'type_code': 'article', 'type_name': '文章', 'emoji': '📄', 'is_default': True, 'display_order': 5},
        {'user_id': user_id, 'type_code': 'exercise', 'type_name': '题目', 'emoji': '✏️', 'is_default': True, 'display_order': 6},
        {'user_id': user_id, 'type_code': 'project', 'type_name': '项目', 'emoji': '💻', 'is_default': True, 'display_order': 7},
        {'user_id': user_id, 'type_code': 'workout', 'type_name': '运动', 'emoji': '🏃', 'is_default': True, 'display_order': 8},
        {'user_id': user_id, 'type_code': 'paper', 'type_name': '论文', 'emoji': '📑', 'is_default': True, 'display_order': 9},
        {'user_id': user_id, 'type_code': 'other', 'type_name': '其他', 'emoji': '📌', 'is_default': True, 'display_order': 10}
    ]
    
    try:
        result = client.table('user_form_types').insert(default_types).execute()
        print(f"✅ Created {len(result.data)} default form types for user {user_id}")
    except Exception as e:
        print(f"❌ Failed to create default form types: {e}")

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 Setup completed successfully!")
        print("🚀 The custom form types feature is now ready to use!")
    else:
        print("\n⚠️  Manual setup required - see instructions above.")
    
    sys.exit(0 if success else 1)