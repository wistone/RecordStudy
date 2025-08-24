#!/usr/bin/env python3
"""
Demo authentication script - creates a simplified auth system for testing
"""

from api.auth import router
from fastapi import HTTPException, status
from models import UserLogin, TokenResponse, UserProfile
from utils.auth_utils import create_access_token
from datetime import datetime
import uuid

# Hardcoded demo users for prototype testing
DEMO_USERS = {
    "test": {
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "email": "test@example.com",
        "display_name": "test"
    },
    "wq": {
        "user_id": "550e8400-e29b-41d4-a716-446655440002", 
        "email": "wq@example.com",
        "display_name": "wq"
    },
    "wistone": {
        "user_id": "550e8400-e29b-41d4-a716-446655440003",
        "email": "wistone@example.com", 
        "display_name": "wistone"
    }
}

@router.post("/demo-login", response_model=TokenResponse)
async def demo_login(credentials: UserLogin):
    """Demo login endpoint that works without database"""
    
    # Extract username from email or use directly
    username = credentials.email.split("@")[0] if "@" in credentials.email else credentials.email
    
    if username not in DEMO_USERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Demo user not found. Use: test, wq, or wistone"
        )
    
    user_data = DEMO_USERS[username]
    
    # Create access token
    token_data = {
        "sub": user_data["user_id"], 
        "email": user_data["email"],
        "display_name": user_data["display_name"]
    }
    access_token = create_access_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserProfile(
            id=user_data["user_id"],
            email=user_data["email"],
            display_name=user_data["display_name"],
            avatar_url=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    )

print("Demo auth endpoints added. Use /api/auth/demo-login for testing.")