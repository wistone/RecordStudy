from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from database import get_supabase_client
from models import UserLogin, UserRegister, TokenResponse, UserProfile
from utils.auth_utils_supabase import get_current_user_supabase
import uuid
from datetime import datetime

router = APIRouter()
security = HTTPBearer()

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register a new user using Supabase Auth"""
    supabase = get_supabase_client()
    
    try:
        # Use Supabase Auth to sign up user
        response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "display_name": user_data.display_name or user_data.email.split("@")[0]
                }
            }
        })
        
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        user = response.user
        session = response.session
        
        return TokenResponse(
            access_token=session.access_token if session else "",
            token_type="bearer",
            user=UserProfile(
                id=user.id,
                email=user.email,
                display_name=user.user_metadata.get("display_name", user.email.split("@")[0]) if user.user_metadata else user.email.split("@")[0],
                avatar_url=user.user_metadata.get("avatar_url") if user.user_metadata else None,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
        )
        
    except Exception as e:
        print(f"Registration error details: {e}")
        error_msg = str(e).lower()
        if "already registered" in error_msg or "already exists" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        # More detailed error handling
        if hasattr(e, 'response') and hasattr(e.response, 'json'):
            try:
                error_detail = e.response.json()
                print(f"Supabase error response: {error_detail}")
            except:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user using Supabase Auth"""
    supabase = get_supabase_client()
    
    try:
        # Use Supabase Auth to sign in
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        user = response.user
        session = response.session
        
        return TokenResponse(
            access_token=session.access_token if session else "",
            token_type="bearer",
            user=UserProfile(
                id=user.id,
                email=user.email,
                display_name=user.user_metadata.get("display_name", user.email.split("@")[0]) if user.user_metadata else user.email.split("@")[0],
                avatar_url=user.user_metadata.get("avatar_url") if user.user_metadata else None,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
        )
        
    except Exception as e:
        error_msg = str(e).lower()
        if "invalid" in error_msg and ("login" in error_msg or "credential" in error_msg or "password" in error_msg):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: UserProfile = Depends(get_current_user_supabase)):
    """Get current user profile"""
    return current_user

@router.put("/me", response_model=UserProfile)
async def update_profile(
    update_data: dict,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Update user profile"""
    supabase = get_supabase_client()
    
    try:
        allowed_fields = {"display_name", "avatar_url"}
        update_fields = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not update_fields:
            return current_user
        
        # Update user metadata in Supabase Auth
        response = supabase.auth.update_user({
            "data": update_fields
        })
        
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user = response.user
        
        return UserProfile(
            id=user.id,
            email=user.email,
            display_name=user.user_metadata.get("display_name", current_user.display_name),
            avatar_url=user.user_metadata.get("avatar_url"),
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile update failed: {str(e)}"
        )

@router.post("/logout")
async def logout():
    """Logout user"""
    supabase = get_supabase_client()
    
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        # Even if logout fails, we can still return success
        # since the client will remove the token
        return {"message": "Logged out successfully"}