#!/usr/bin/env python3
"""
Setup database with test data using Supabase
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from passlib.context import CryptContext
import uuid
from datetime import datetime, timedelta

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def setup_database():
    """Setup database with test users and data"""
    # Use service role key to bypass RLS
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    supabase: Client = create_client(supabase_url, service_key)
    
    # Test users with hashed passwords
    test_users = [
        {
            "user_id": "550e8400-e29b-41d4-a716-446655440001",
            "email": "test@example.com", 
            "display_name": "test",
            "password_hash": pwd_context.hash("password123")
        },
        {
            "user_id": "550e8400-e29b-41d4-a716-446655440002",
            "email": "wq@example.com",
            "display_name": "wq", 
            "password_hash": pwd_context.hash("password123")
        },
        {
            "user_id": "550e8400-e29b-41d4-a716-446655440003",
            "email": "wistone@example.com",
            "display_name": "wistone",
            "password_hash": pwd_context.hash("password123")
        }
    ]
    
    created_users = []
    now = datetime.utcnow().isoformat()
    
    # Create users
    for user_data in test_users:
        try:
            # Check if user exists
            existing = supabase.table("profiles").select("*").eq("user_id", user_data["user_id"]).execute()
            
            if existing.data:
                print(f"User {user_data['display_name']} already exists")
                created_users.append(user_data)
                continue
            
            # Create new user
            new_user = {**user_data, "created_at": now, "updated_at": now}
            result = supabase.table("profiles").insert(new_user).execute()
            
            if result.data:
                print(f"✅ Created user: {user_data['display_name']} ({user_data['email']})")
                created_users.append(user_data)
            else:
                print(f"❌ Failed to create user: {user_data['display_name']}")
                
        except Exception as e:
            print(f"❌ Error creating user {user_data['display_name']}: {e}")
    
    # Create test records for 'test' user
    test_user_id = "550e8400-e29b-41d4-a716-446655440001"
    
    test_records = [
        {
            "user_id": test_user_id,
            "title": "Python基础教程",
            "form_type": "video",
            "duration_min": 45,
            "difficulty": 3,
            "focus": 4,
            "energy": 4,
            "occurred_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
            "privacy": "private",
            "body_md": "学习了Python的基本语法和数据类型"
        },
        {
            "user_id": test_user_id,
            "title": "机器学习入门",
            "form_type": "book", 
            "duration_min": 90,
            "difficulty": 4,
            "focus": 5,
            "energy": 3,
            "occurred_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
            "privacy": "private",
            "body_md": "阅读了机器学习的基础概念和算法"
        },
        {
            "user_id": test_user_id,
            "title": "英语口语练习",
            "form_type": "exercise",
            "duration_min": 30,
            "difficulty": 2,
            "focus": 4,
            "energy": 5,
            "occurred_at": datetime.utcnow().isoformat(),
            "privacy": "private", 
            "body_md": "练习日常英语对话"
        },
        {
            "user_id": test_user_id,
            "title": "React项目开发",
            "form_type": "project",
            "duration_min": 120,
            "difficulty": 4,
            "focus": 4,
            "energy": 3,
            "occurred_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
            "privacy": "private",
            "body_md": "开发了一个简单的Todo应用"
        },
        {
            "user_id": test_user_id,
            "title": "晨跑",
            "form_type": "workout",
            "duration_min": 25,
            "difficulty": 2,
            "focus": 3,
            "energy": 5,
            "occurred_at": datetime.utcnow().isoformat(),
            "privacy": "private",
            "body_md": "5公里晨跑，天气不错"
        }
    ]
    
    created_records = []
    for record_data in test_records:
        try:
            result = supabase.table("records").insert(record_data).execute()
            if result.data:
                created_records.append(result.data[0])
                print(f"✅ Created record: {record_data['title']}")
            else:
                print(f"❌ Failed to create record: {record_data['title']}")
        except Exception as e:
            print(f"❌ Error creating record {record_data['title']}: {e}")
    
    # Create some tags
    test_tags = ["编程", "AI", "英语", "数学", "运动", "历史", "设计"]
    
    for tag_name in test_tags:
        try:
            # Check if tag exists
            existing_tag = supabase.table("tags").select("*").eq("tag_name", tag_name).execute()
            
            if existing_tag.data:
                print(f"Tag {tag_name} already exists")
                continue
            
            new_tag = {
                "tag_name": tag_name,
                "created_at": now,
                "created_by": test_user_id
            }
            
            result = supabase.table("tags").insert(new_tag).execute()
            if result.data:
                print(f"✅ Created tag: {tag_name}")
            
        except Exception as e:
            print(f"❌ Error creating tag {tag_name}: {e}")
    
    print(f"\n🎉 Database setup completed!")
    print(f"✅ Created {len(created_users)} users")
    print(f"✅ Created {len(created_records)} records for test user")
    print(f"\nTest users:")
    for user in created_users:
        print(f"  - {user['email']} (password: password123)")

if __name__ == "__main__":
    setup_database()