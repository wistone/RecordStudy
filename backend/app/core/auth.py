from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from supabase import create_client, Client
from app.core.config import settings

# Supabase客户端
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

security = HTTPBearer()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """
    验证JWT token并返回用户ID
    """
    token = credentials.credentials
    
    try:
        # 验证Supabase JWT token
        response = supabase.auth.get_user(token)
        
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return response.user.id
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    验证JWT token并返回用户信息
    """
    token = credentials.credentials
    
    try:
        # 验证Supabase JWT token
        response = supabase.auth.get_user(token)
        
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # 解析JWT token获取payload
        try:
            # 不验证签名，只解析payload（因为Supabase已经验证过了）
            payload = jwt.get_unverified_claims(token)
            return payload
        except JWTError:
            # 如果JWT解析失败，至少返回用户基本信息
            return {
                "sub": response.user.id,
                "email": response.user.email
            }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )