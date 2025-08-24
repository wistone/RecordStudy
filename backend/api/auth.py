from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from passlib.context import CryptContext
from database import get_supabase_client, get_supabase_admin_client
from models import UserLogin, UserRegister, TokenResponse, UserProfile
from utils.auth_utils import create_access_token, get_current_user
import uuid
from datetime import datetime, timedelta

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password"""
    return pwd_context.verify(plain_password, hashed_password)

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register a new user"""
    supabase = get_supabase_client()
    
    try:
        # Check if user exists by email
        existing_user = supabase.table("profiles").select("*").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user profile
        user_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        new_profile = {
            "user_id": user_id,
            "email": user_data.email,
            "display_name": user_data.display_name or user_data.email.split("@")[0],
            "password_hash": hashed_password,
            "created_at": now,
            "updated_at": now
        }
        
        result = supabase.table("profiles").insert(new_profile).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        user = result.data[0]
        
        # Create access token
        token_data = {"sub": user["user_id"], "email": user["email"], "display_name": user["display_name"]}
        access_token = create_access_token(token_data)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserProfile(
                id=user["user_id"],
                email=user["email"],
                display_name=user["display_name"],
                avatar_url=user.get("avatar_url"),
                created_at=user["created_at"],
                updated_at=user["updated_at"]
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user"""
    supabase = get_supabase_client()
    
    try:
        # Get user by email
        result = supabase.table("profiles").select("*").eq("email", credentials.email).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        user = result.data[0]
        
        # Verify password
        if not verify_password(credentials.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Create access token
        token_data = {"sub": user["user_id"], "email": user["email"], "display_name": user["display_name"]}
        access_token = create_access_token(token_data)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserProfile(
                id=user["user_id"],
                email=user["email"],
                display_name=user["display_name"],
                avatar_url=user.get("avatar_url"),
                created_at=user["created_at"],
                updated_at=user["updated_at"]
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: UserProfile = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

@router.put("/me", response_model=UserProfile)
async def update_profile(
    update_data: dict,
    current_user: UserProfile = Depends(get_current_user)
):
    """Update user profile"""
    supabase = get_supabase_client()
    
    try:
        allowed_fields = {"display_name", "avatar_url"}
        update_fields = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not update_fields:
            return current_user
        
        # Note: profiles table doesn't have updated_at field in this schema
        
        result = supabase.table("profiles").update(update_fields).eq("user_id", current_user.id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        updated_user = result.data[0]
        
        return UserProfile(
            id=updated_user["user_id"],
            email=current_user.email,  # Keep the email from current user
            display_name=updated_user["display_name"],
            avatar_url=updated_user.get("avatar_url"),
            created_at=updated_user["created_at"],
            updated_at=updated_user.get("updated_at") or updated_user["created_at"]
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
    """Logout user (client-side token removal)"""
    return {"message": "Logged out successfully"}

# Demo endpoint for prototype testing
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
    """Demo login for prototype testing - works without database"""
    
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

@router.post("/create-demo-data")
async def create_demo_data():
    """Create demo data for the test user"""
    from database import get_supabase_client
    
    supabase = get_supabase_client()
    test_user_id = "550e8400-e29b-41d4-a716-446655440001"
    
    try:
        # Sample records for demo
        demo_records = [
            {
                "user_id": test_user_id,
                "title": "Python基础教程",
                "type": "video", 
                "duration_minutes": 45,
                "difficulty_rating": 3,
                "focus_rating": 4,
                "occurred_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "status": "completed",
                "privacy": "private"
            },
            {
                "user_id": test_user_id,
                "title": "机器学习入门",
                "type": "book",
                "duration_minutes": 90, 
                "difficulty_rating": 4,
                "focus_rating": 5,
                "occurred_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(), 
                "status": "completed",
                "privacy": "private"
            },
            {
                "user_id": test_user_id,
                "title": "英语口语练习",
                "type": "exercise",
                "duration_minutes": 30,
                "difficulty_rating": 2,
                "focus_rating": 4, 
                "occurred_at": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "status": "completed",
                "privacy": "private"
            }
        ]
        
        # Create records using raw insert (bypassing foreign key constraints)
        for record in demo_records:
            try:
                result = supabase.table("records").insert(record).execute()
                print(f"Created demo record: {record['title']}")
            except Exception as e:
                print(f"Failed to create record {record['title']}: {e}")
        
        return {"message": "Demo data created successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create demo data: {str(e)}"
        )