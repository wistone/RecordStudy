#!/usr/bin/env python3
"""
Script to create test users and populate mock data for Learning Tracker
"""

import uuid
from datetime import datetime, timedelta
import random
from database import get_supabase_client
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_test_users():
    """Create 3 test users using Supabase Auth"""
    supabase = get_supabase_admin_client()  # Need admin client for user creation
    
    # Test users data
    users = [
        {
            "email": "test@example.com",
            "password": "password123",
            "display_name": "test"
        },
        {
            "email": "wq@example.com",
            "password": "password123",
            "display_name": "wq"
        },
        {
            "email": "wistone@example.com",
            "password": "password123",
            "display_name": "wistone"
        }
    ]
    
    created_users = []
    
    for user_data in users:
        try:
            # Check if profile exists with this display_name
            existing_profile = supabase.table("profiles").select("*").eq("display_name", user_data["display_name"]).execute()
            if existing_profile.data:
                print(f"User {user_data['display_name']} already exists, skipping...")
                created_users.append({**user_data, "user_id": existing_profile.data[0]["user_id"]})
                continue
            
            # Create auth user first
            auth_response = supabase.auth.admin.create_user({
                "email": user_data["email"],
                "password": user_data["password"],
                "email_confirm": True
            })
            
            if auth_response.user:
                user_id = auth_response.user.id
                
                # Create profile
                now = datetime.utcnow().isoformat()
                new_profile = {
                    "user_id": user_id,
                    "display_name": user_data["display_name"],
                    "created_at": now
                }
                
                profile_result = supabase.table("profiles").insert(new_profile).execute()
                
                if profile_result.data:
                    print(f"Created user: {user_data['email']} with profile {user_data['display_name']}")
                    created_users.append({**user_data, "user_id": user_id})
                else:
                    print(f"Created auth user but failed to create profile for: {user_data['email']}")
            else:
                print(f"Failed to create auth user: {user_data['email']}")
                
        except Exception as e:
            print(f"Error creating user {user_data['email']}: {str(e)}")
    
    return created_users

def create_mock_data_for_test_user(test_user_id):
    """Create comprehensive mock data for the test user"""
    supabase = get_supabase_client()
    
    # Create common tags first
    tags_data = [
        "编程", "AI", "数学", "英语", "历史", "物理", "设计", 
        "音乐", "运动", "健身", "读书", "心理学", "经济学"
    ]
    
    created_tags = {}
    now = datetime.utcnow().isoformat()
    
    for tag_name in tags_data:
        try:
            # Check if tag exists
            existing_tag = supabase.table("tags").select("*").eq("tag_name", tag_name).execute()
            if existing_tag.data:
                created_tags[tag_name] = existing_tag.data[0]["id"]
                continue
            
            tag_id = str(uuid.uuid4())
            new_tag = {
                "id": tag_id,
                "tag_name": tag_name,
                "created_at": now,
                "created_by": test_user_id
            }
            
            result = supabase.table("tags").insert(new_tag).execute()
            if result.data:
                created_tags[tag_name] = tag_id
                print(f"Created tag: {tag_name}")
                
        except Exception as e:
            print(f"Error creating tag {tag_name}: {str(e)}")
    
    # Create mock records for the past 30 days
    record_types = ["video", "book", "course", "article", "exercise", "project", "podcast", "workout"]
    
    mock_records = [
        # Recent records (last 7 days)
        {"title": "Python异步编程深入解析", "type": "video", "tags": ["编程", "AI"], "duration": 45, "difficulty": 4, "focus": 5},
        {"title": "机器学习数学基础", "type": "book", "tags": ["AI", "数学"], "duration": 120, "difficulty": 5, "focus": 4},
        {"title": "英语口语练习", "type": "exercise", "tags": ["英语"], "duration": 30, "difficulty": 3, "focus": 4},
        {"title": "晨跑训练", "type": "workout", "tags": ["运动", "健身"], "duration": 40, "difficulty": 2, "focus": 3},
        {"title": "React进阶课程", "type": "course", "tags": ["编程"], "duration": 90, "difficulty": 4, "focus": 5},
        
        # Week 2 records
        {"title": "深度学习论文阅读", "type": "article", "tags": ["AI"], "duration": 60, "difficulty": 5, "focus": 4},
        {"title": "UI设计实战项目", "type": "project", "tags": ["设计"], "duration": 150, "difficulty": 3, "focus": 4},
        {"title": "历史播客：明朝那些事", "type": "podcast", "tags": ["历史"], "duration": 35, "difficulty": 2, "focus": 3},
        {"title": "数据结构算法题", "type": "exercise", "tags": ["编程", "数学"], "duration": 75, "difficulty": 4, "focus": 5},
        {"title": "英语新闻听力", "type": "article", "tags": ["英语"], "duration": 25, "difficulty": 3, "focus": 4},
        
        # Week 3 records
        {"title": "Node.js后端开发", "type": "course", "tags": ["编程"], "duration": 120, "difficulty": 4, "focus": 4},
        {"title": "心理学入门", "type": "book", "tags": ["心理学"], "duration": 80, "difficulty": 3, "focus": 4},
        {"title": "力量训练", "type": "workout", "tags": ["运动", "健身"], "duration": 50, "difficulty": 3, "focus": 4},
        {"title": "经济学原理视频", "type": "video", "tags": ["经济学"], "duration": 45, "difficulty": 4, "focus": 3},
        {"title": "前端性能优化", "type": "article", "tags": ["编程"], "duration": 35, "difficulty": 4, "focus": 5},
        
        # Week 4 records
        {"title": "TensorFlow实战", "type": "project", "tags": ["AI", "编程"], "duration": 180, "difficulty": 5, "focus": 4},
        {"title": "古典音乐欣赏", "type": "video", "tags": ["音乐"], "duration": 55, "difficulty": 2, "focus": 3},
        {"title": "物理学概念", "type": "book", "tags": ["物理"], "duration": 90, "difficulty": 4, "focus": 4},
        {"title": "英语写作练习", "type": "exercise", "tags": ["英语"], "duration": 40, "difficulty": 3, "focus": 4},
        {"title": "瑜伽练习", "type": "workout", "tags": ["运动", "健身"], "duration": 60, "difficulty": 2, "focus": 4},
    ]
    
    # Create records with realistic timestamps
    created_records = []
    base_date = datetime.utcnow()
    
    for i, record_data in enumerate(mock_records):
        try:
            # Calculate occurrence date (distribute over past 30 days)
            days_ago = random.randint(0, 29)
            occurred_at = (base_date - timedelta(days=days_ago))
            
            # Add some time variation
            hours = random.randint(8, 22)
            minutes = random.randint(0, 59)
            occurred_at = occurred_at.replace(hour=hours, minute=minutes, second=0, microsecond=0)
            
            record_id = str(uuid.uuid4())
            new_record = {
                "record_id": record_id,
                "user_id": test_user_id,
                "title": record_data["title"],
                "type": record_data["type"],
                "duration_minutes": record_data["duration"],
                "difficulty_rating": record_data["difficulty"],
                "focus_rating": record_data["focus"],
                "energy_rating": random.randint(3, 5),
                "occurred_at": occurred_at.isoformat(),
                "created_at": now,
                "updated_at": now,
                "status": "completed",
                "privacy": "private"
            }
            
            result = supabase.table("records").insert(new_record).execute()
            
            if result.data:
                created_records.append(record_id)
                print(f"Created record: {record_data['title']}")
                
                # Link tags to record
                for tag_name in record_data["tags"]:
                    if tag_name in created_tags:
                        try:
                            supabase.table("record_tags").insert({
                                "record_id": record_id,
                                "tag_id": created_tags[tag_name]
                            }).execute()
                        except Exception as e:
                            print(f"Error linking tag {tag_name} to record: {str(e)}")
            
        except Exception as e:
            print(f"Error creating record {record_data['title']}: {str(e)}")
    
    print(f"Created {len(created_records)} mock records for test user")
    return created_records

def create_resources_for_test_user(test_user_id):
    """Create some sample resources for the test user"""
    supabase = get_supabase_client()
    
    resources = [
        {
            "title": "Python官方文档",
            "url": "https://docs.python.org/3/",
            "platform": "Python.org",
            "description": "Python编程语言官方文档"
        },
        {
            "title": "机器学习课程",
            "url": "https://www.coursera.org/learn/machine-learning",
            "platform": "Coursera", 
            "author": "Andrew Ng",
            "description": "斯坦福大学机器学习课程"
        },
        {
            "title": "React官方教程",
            "url": "https://reactjs.org/tutorial/tutorial.html",
            "platform": "React.js",
            "description": "React框架官方入门教程"
        }
    ]
    
    created_resources = []
    now = datetime.utcnow().isoformat()
    
    for resource_data in resources:
        try:
            resource_id = str(uuid.uuid4())
            new_resource = {
                "id": resource_id,
                "title": resource_data["title"],
                "url": resource_data["url"],
                "platform": resource_data["platform"],
                "author": resource_data.get("author"),
                "description": resource_data["description"],
                "created_at": now,
                "created_by": test_user_id
            }
            
            result = supabase.table("resources").insert(new_resource).execute()
            
            if result.data:
                created_resources.append(resource_id)
                print(f"Created resource: {resource_data['title']}")
                
                # Link resource to user
                supabase.table("user_resources").insert({
                    "user_id": test_user_id,
                    "resource_id": resource_id,
                    "created_at": now
                }).execute()
                
        except Exception as e:
            print(f"Error creating resource {resource_data['title']}: {str(e)}")
    
    return created_resources

def main():
    """Main function to set up all test data"""
    print("Creating test users...")
    users = create_test_users()
    
    # Find test user
    test_user = None
    for user in users:
        if user["display_name"] == "test":
            test_user = user
            break
    
    if test_user:
        print(f"\nCreating mock data for test user (ID: {test_user['user_id']})...")
        create_mock_data_for_test_user(test_user["user_id"])
        create_resources_for_test_user(test_user["user_id"])
        print("\nTest data setup completed!")
        
        print(f"""
Test users created as profiles:
- Display name: test (with mock data)
- Display name: wq (empty user)
- Display name: wistone (empty user)

Note: These are profile records for testing the frontend.
For full authentication, you'll need to implement proper auth.users integration.
        """)
    else:
        print("Failed to create test user")

if __name__ == "__main__":
    main()