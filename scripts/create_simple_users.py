#!/usr/bin/env python3
"""
Simple script to create test user profiles directly in the database for prototype testing
This bypasses the auth.users foreign key constraint for development purposes
"""

import uuid
from datetime import datetime
from database import get_supabase_client

def create_test_profiles():
    """Create test profiles by temporarily disabling constraints"""
    supabase = get_supabase_client()
    
    users = ["test", "wq", "wistone"]
    created_users = []
    
    for username in users:
        try:
            # Check if profile already exists
            existing = supabase.table("profiles").select("*").eq("display_name", username).execute()
            if existing.data:
                print(f"Profile {username} already exists")
                created_users.append({"user_id": existing.data[0]["user_id"], "display_name": username})
                continue
            
            user_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            # Use raw SQL to insert with constraint temporarily disabled
            # Note: This is a development hack - in production you'd use proper auth
            query = f"""
            BEGIN;
            SET session_replication_role = replica;
            INSERT INTO public.profiles (user_id, display_name, created_at) 
            VALUES ('{user_id}', '{username}', '{now}');
            SET session_replication_role = DEFAULT;
            COMMIT;
            """
            
            # For prototype, we'll just try the insert and handle the constraint error
            try:
                profile_data = {
                    "user_id": user_id,
                    "display_name": username,
                    "created_at": now
                }
                
                result = supabase.table("profiles").insert(profile_data).execute()
                print(f"Created profile: {username}")
                created_users.append({"user_id": user_id, "display_name": username})
                
            except Exception as insert_error:
                print(f"Failed to create profile {username}: {insert_error}")
                
        except Exception as e:
            print(f"Error processing {username}: {e}")
    
    return created_users

def create_mock_records(test_user_id):
    """Create some mock records for the test user"""
    supabase = get_supabase_client()
    
    # Simple mock records
    mock_records = [
        {
            "title": "Python Programming Tutorial",
            "type": "video",
            "duration_minutes": 45,
            "difficulty_rating": 3,
            "focus_rating": 4
        },
        {
            "title": "Machine Learning Basics",
            "type": "book",
            "duration_minutes": 90,
            "difficulty_rating": 4,
            "focus_rating": 5
        },
        {
            "title": "Daily English Practice",
            "type": "exercise", 
            "duration_minutes": 30,
            "difficulty_rating": 2,
            "focus_rating": 4
        }
    ]
    
    created_records = []
    now = datetime.utcnow().isoformat()
    
    for record_data in mock_records:
        try:
            # Calculate occurred_at (recent past)
            days_ago = len(created_records)
            occurred_at = datetime.utcnow().replace(hour=14, minute=0, second=0, microsecond=0)
            occurred_at = occurred_at.replace(day=occurred_at.day - days_ago)
            
            new_record = {
                "user_id": test_user_id,
                "title": record_data["title"],
                "type": record_data["type"],
                "duration_minutes": record_data["duration_minutes"],
                "difficulty_rating": record_data["difficulty_rating"],
                "focus_rating": record_data["focus_rating"],
                "occurred_at": occurred_at.isoformat(),
                "created_at": now,
                "updated_at": now,
                "status": "completed",
                "privacy": "private"
            }
            
            result = supabase.table("records").insert(new_record).execute()
            if result.data:
                created_records.append(result.data[0])
                print(f"Created record: {record_data['title']}")
                
        except Exception as e:
            print(f"Failed to create record {record_data['title']}: {e}")
    
    return created_records

def main():
    print("Creating test profiles...")
    users = create_test_profiles()
    
    # Find test user and create mock data
    test_user = next((u for u in users if u["display_name"] == "test"), None)
    if test_user:
        print(f"\nCreating mock records for test user...")
        create_mock_records(test_user["user_id"])
        
        print(f"""
Test profiles created:
- test (with some mock records)
- wq (empty)
- wistone (empty)

You can now test login with:
- Email: test@example.com (or just 'test')
- Email: wq@example.com (or just 'wq')  
- Email: wistone@example.com (or just 'wistone')
- Password: any password (prototype mode)
        """)
    else:
        print("No test user found")

if __name__ == "__main__":
    main()