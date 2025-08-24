#!/usr/bin/env python3
"""
Test script for Supabase Auth integration
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_register_user(email, password, display_name):
    """Test user registration"""
    print(f"\n🧪 Testing user registration: {email}")
    
    data = {
        "email": email,
        "password": password,
        "display_name": display_name
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", 
                               json=data,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Registration successful!")
            print(f"   User ID: {result['user']['id']}")
            print(f"   Email: {result['user']['email']}")
            print(f"   Display Name: {result['user']['display_name']}")
            return result['access_token']
        else:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def test_login_user(email, password):
    """Test user login"""
    print(f"\n🔐 Testing user login: {email}")
    
    data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login",
                               json=data, 
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Login successful!")
            print(f"   User ID: {result['user']['id']}")
            print(f"   Email: {result['user']['email']}")
            return result['access_token']
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def test_get_profile(token):
    """Test getting user profile"""
    print(f"\n👤 Testing get profile")
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me",
                              headers={
                                  "Authorization": f"Bearer {token}",
                                  "Content-Type": "application/json"
                              })
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Profile retrieved successfully!")
            print(f"   User ID: {result['id']}")
            print(f"   Email: {result['email']}")
            print(f"   Display Name: {result['display_name']}")
            return True
        else:
            print(f"❌ Profile retrieval failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def main():
    print("🚀 Testing Supabase Auth Integration")
    print("=" * 50)
    
    # Test data
    test_users = [
        {"email": "test@example.com", "password": "password123", "display_name": "Test User"},
        {"email": "demo@example.com", "password": "demo123", "display_name": "Demo User"}
    ]
    
    for user in test_users:
        print(f"\n📋 Testing user: {user['email']}")
        print("-" * 30)
        
        # Test registration
        token = test_register_user(user['email'], user['password'], user['display_name'])
        
        if token:
            # Test profile retrieval
            test_get_profile(token)
            
            # Test login (with a different session)
            login_token = test_login_user(user['email'], user['password'])
            
            if login_token:
                test_get_profile(login_token)
        
        print("-" * 30)
    
    print("\n✨ Test completed!")

if __name__ == "__main__":
    main()