from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer
from database import get_supabase_client
from models import UserProfile
from datetime import datetime

security = HTTPBearer()

async def get_current_user_supabase(token: str = Depends(security)) -> UserProfile:
    """Get current user from Supabase Auth token"""
    supabase = get_supabase_client()
    
    try:
        # Use the access token to get user info
        access_token = token.credentials
        
        # Set the session
        supabase.auth.set_session(access_token, "")
        
        # Get current user with the token
        user_response = supabase.auth.get_user(access_token)
        
        if not user_response or not user_response.user:
            print(f"Failed to get user with token: {access_token[:20]}...")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        user = user_response.user
        print(f"Successfully authenticated user: {user.email}")
        
        return UserProfile(
            id=user.id,
            email=user.email,
            display_name=user.user_metadata.get("display_name", user.email.split("@")[0]) if user.user_metadata else user.email.split("@")[0],
            avatar_url=user.user_metadata.get("avatar_url") if user.user_metadata else None,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )