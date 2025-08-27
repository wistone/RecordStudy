from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from supabase import create_client
from app.core.config import settings
from app.core.auth import get_current_user
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
import hashlib
import os
from datetime import datetime

router = APIRouter()

# Supabase client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

# Pydantic models
class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None

class EmailChange(BaseModel):
    new_email: EmailStr
    current_password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ProfileResponse(BaseModel):
    user_id: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str

@router.get("/current", response_model=ProfileResponse)
async def get_current_profile(current_user: dict = Depends(get_current_user)):
    """获取当前用户的个人资料"""
    try:
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="无效的用户信息")
        
        # 从 auth.users 获取基本信息
        auth_response = supabase.auth.admin.get_user_by_id(user_id)
        if not auth_response.user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        auth_user = auth_response.user
        
        # 从 profiles 表获取扩展信息
        profile_response = supabase.table('profiles').select('*').eq('user_id', user_id).execute()
        
        profile_data = None
        if profile_response.data and len(profile_response.data) > 0:
            profile_data = profile_response.data[0]
        
        # 组合返回数据
        return ProfileResponse(
            user_id=user_id,
            email=auth_user.email,
            display_name=profile_data.get('display_name') if profile_data else auth_user.user_metadata.get('display_name'),
            avatar_url=profile_data.get('avatar_url') if profile_data else None,
            created_at=str(auth_user.created_at) if auth_user.created_at else ""
        )
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"获取用户资料失败: {e}")
        raise HTTPException(status_code=500, detail="获取用户资料失败")

@router.put("/current")
async def update_current_profile(
    profile_update: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """更新当前用户的个人资料"""
    try:
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="无效的用户信息")
        
        # 检查是否存在 profile 记录
        existing_profile = supabase.table('profiles').select('*').eq('user_id', user_id).execute()
        
        update_data = {}
        if profile_update.display_name is not None:
            update_data['display_name'] = profile_update.display_name
        
        if not update_data:
            return {"message": "没有需要更新的数据"}
        
        if existing_profile.data and len(existing_profile.data) > 0:
            # 更新现有记录
            response = supabase.table('profiles').update(update_data).eq('user_id', user_id).execute()
        else:
            # 创建新记录
            update_data['user_id'] = user_id
            response = supabase.table('profiles').insert(update_data).execute()
        
        if response.data:
            return {"message": "个人资料更新成功", "data": response.data[0]}
        else:
            raise HTTPException(status_code=500, detail="更新失败")
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"更新用户资料失败: {e}")
        raise HTTPException(status_code=500, detail="更新用户资料失败")

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """上传用户头像"""
    try:
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="无效的用户信息")
        
        # 验证文件类型
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="请上传图片文件")
        
        # 验证文件大小 (最大 5MB)
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="文件大小不能超过5MB")
        
        # 生成唯一文件名
        file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
        unique_filename = f"avatar_{user_id}_{uuid.uuid4().hex[:8]}{file_extension}"
        
        # 上传到 Supabase Storage
        try:
            # 上传文件
            storage_response = supabase.storage.from_('avatars').upload(
                unique_filename,
                file_content,
                file_options={
                    "content-type": file.content_type,
                    "cache-control": "3600",
                    "upsert": "false"
                }
            )
            
            if storage_response:
                # 获取公共URL
                avatar_url = supabase.storage.from_('avatars').get_public_url(unique_filename)
                
                # 更新用户资料中的头像URL
                profile_response = supabase.table('profiles').select('*').eq('user_id', user_id).execute()
                
                if profile_response.data and len(profile_response.data) > 0:
                    # 更新现有记录
                    update_response = supabase.table('profiles').update({
                        'avatar_url': avatar_url
                    }).eq('user_id', user_id).execute()
                else:
                    # 创建新记录
                    update_response = supabase.table('profiles').insert({
                        'user_id': user_id,
                        'avatar_url': avatar_url
                    }).execute()
                
                return {
                    "message": "头像上传成功",
                    "avatar_url": avatar_url
                }
            else:
                raise HTTPException(status_code=500, detail="文件上传失败")
                
        except Exception as storage_error:
            print(f"Storage error: {storage_error}")
            raise HTTPException(status_code=500, detail=f"存储服务错误: {str(storage_error)}")
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"上传头像失败: {e}")
        raise HTTPException(status_code=500, detail="上传头像失败")

@router.put("/change-email")
async def change_email(
    email_change: EmailChange,
    current_user: dict = Depends(get_current_user)
):
    """修改用户邮箱"""
    try:
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="无效的用户信息")
        
        # 获取当前用户信息以验证密码
        auth_user_response = supabase.auth.admin.get_user_by_id(user_id)
        if not auth_user_response.user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        current_email = auth_user_response.user.email
        
        # 验证当前密码（通过尝试登录）
        try:
            sign_in_response = supabase.auth.sign_in_with_password({
                "email": current_email,
                "password": email_change.current_password
            })
            if not sign_in_response.user:
                raise HTTPException(status_code=400, detail="当前密码错误")
        except Exception:
            raise HTTPException(status_code=400, detail="当前密码错误")
        
        # 检查新邮箱是否已被使用
        try:
            existing_user = supabase.auth.admin.list_users()
            for user in existing_user:
                if user.email == email_change.new_email and user.id != user_id:
                    raise HTTPException(status_code=400, detail="邮箱地址已被使用")
        except Exception as check_error:
            print(f"检查邮箱唯一性时出错: {check_error}")
        
        # 更新邮箱（不需要验证）
        try:
            update_response = supabase.auth.admin.update_user_by_id(
                user_id,
                {"email": email_change.new_email}
            )
            
            if update_response.user:
                return {
                    "message": "邮箱修改成功",
                    "new_email": email_change.new_email
                }
            else:
                raise HTTPException(status_code=500, detail="邮箱更新失败")
                
        except Exception as update_error:
            print(f"更新邮箱失败: {update_error}")
            raise HTTPException(status_code=500, detail="邮箱更新失败")
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"修改邮箱失败: {e}")
        raise HTTPException(status_code=500, detail="修改邮箱失败")

@router.put("/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """修改用户密码"""
    try:
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="无效的用户信息")
        
        # 验证密码长度
        if len(password_change.new_password) < 6:
            raise HTTPException(status_code=400, detail="新密码长度至少6位")
        
        # 获取当前用户邮箱
        auth_user_response = supabase.auth.admin.get_user_by_id(user_id)
        if not auth_user_response.user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        current_email = auth_user_response.user.email
        
        # 验证当前密码
        try:
            sign_in_response = supabase.auth.sign_in_with_password({
                "email": current_email,
                "password": password_change.current_password
            })
            if not sign_in_response.user:
                raise HTTPException(status_code=400, detail="当前密码错误")
        except Exception:
            raise HTTPException(status_code=400, detail="当前密码错误")
        
        # 更新密码
        try:
            update_response = supabase.auth.admin.update_user_by_id(
                user_id,
                {"password": password_change.new_password}
            )
            
            if update_response.user:
                return {"message": "密码修改成功"}
            else:
                raise HTTPException(status_code=500, detail="密码更新失败")
                
        except Exception as update_error:
            print(f"更新密码失败: {update_error}")
            raise HTTPException(status_code=500, detail="密码更新失败")
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"修改密码失败: {e}")
        raise HTTPException(status_code=500, detail="修改密码失败")