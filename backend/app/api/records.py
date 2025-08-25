from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from datetime import datetime, timedelta
from app.core.auth import get_current_user_id
from app.schemas.record import RecordCreate, RecordUpdate

router = APIRouter()

@router.get("/test", response_model=dict)
async def test_supabase_connection():
    """测试Supabase连接"""
    try:
        from supabase import create_client
        from app.core.config import settings
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        response = client.table('records').select('*', count='exact').execute()
        
        return {
            "status": "success", 
            "total_records": response.count,
            "message": "Supabase connection working!"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Supabase connection failed: {str(e)}"
        }

@router.get("/debug/current-user", response_model=dict)
async def debug_current_user(current_user_id: str = Depends(get_current_user_id)):
    """调试：显示当前用户ID"""
    try:
        from supabase import create_client
        from app.core.config import settings
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # 查询该用户的记录数量
        response = client.table('records').select('*', count='exact').eq('user_id', current_user_id).execute()
        
        return {
            "current_user_id": current_user_id,
            "records_count": response.count,
            "message": "User debug info"
        }
    except Exception as e:
        return {
            "current_user_id": current_user_id,
            "error": str(e),
            "message": "Debug info with error"
        }




@router.get("/", response_model=dict)
async def get_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    days: Optional[int] = Query(None, ge=1, le=365, description="获取最近N天的记录"),
    current_user_id: str = Depends(get_current_user_id)
):
    """获取用户的学习记录"""
    try:
        from supabase import create_client
        from app.core.config import settings
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # 构建查询
        query = client.table('records').select('*').eq('user_id', current_user_id)
        
        # 如果指定了天数，过滤日期
        if days:
            from datetime import datetime, timedelta
            start_date = datetime.now() - timedelta(days=days)
            query = query.gte('occurred_at', start_date.isoformat())
        
        # 执行查询
        response = query.order('occurred_at', desc=True).range(skip, skip + limit - 1).execute()
        
        return {
            "records": response.data,
            "total": len(response.data)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch records: {str(e)}"
        )

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_record(
    record_data: RecordCreate,
    current_user_id: str = Depends(get_current_user_id)
):
    """创建新的学习记录"""
    try:
        from supabase import create_client
        from app.core.config import settings
        from datetime import datetime
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # 准备插入数据
        insert_data = {
            "user_id": current_user_id,
            "resource_id": record_data.resource_id,
            "form_type": record_data.form_type,
            "title": record_data.title,
            "body_md": record_data.body_md,
            "occurred_at": (record_data.occurred_at or datetime.now()).isoformat(),
            "duration_min": record_data.duration_min,
            "effective_duration_min": record_data.effective_duration_min,
            "mood": record_data.mood,
            "difficulty": record_data.difficulty,
            "focus": record_data.focus,
            "energy": record_data.energy,
            "privacy": record_data.privacy or "private",
            "assets": record_data.assets
        }
        
        # 插入记录
        response = client.table('records').insert(insert_data).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create record"
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create record: {str(e)}"
        )

@router.get("/{record_id}", response_model=dict)
async def get_record(
    record_id: int,
    current_user_id: str = Depends(get_current_user_id)
):
    """获取特定的学习记录"""
    try:
        from supabase import create_client
        from app.core.config import settings
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        response = client.table('records').select('*').eq('record_id', record_id).eq('user_id', current_user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Record not found"
            )
        
        return response.data[0]
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch record: {str(e)}"
        )

@router.put("/{record_id}", response_model=dict)
async def update_record(
    record_id: int,
    record_update: RecordUpdate,
    current_user_id: str = Depends(get_current_user_id)
):
    """更新学习记录"""
    try:
        from supabase import create_client
        from app.core.config import settings
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # 首先检查记录是否存在
        check_response = client.table('records').select('record_id').eq('record_id', record_id).eq('user_id', current_user_id).execute()
        
        if not check_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Record not found"
            )
        
        # 更新非空字段
        update_data = record_update.dict(exclude_unset=True)
        if update_data:
            response = client.table('records').update(update_data).eq('record_id', record_id).eq('user_id', current_user_id).execute()
            
            if response.data:
                return response.data[0]
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update record"
                )
        else:
            # 返回原记录
            get_response = client.table('records').select('*').eq('record_id', record_id).eq('user_id', current_user_id).execute()
            return get_response.data[0]
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update record: {str(e)}"
        )

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: int,
    current_user_id: str = Depends(get_current_user_id)
):
    """删除学习记录"""
    try:
        from supabase import create_client
        from app.core.config import settings
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # 首先检查记录是否存在
        check_response = client.table('records').select('record_id').eq('record_id', record_id).eq('user_id', current_user_id).execute()
        
        if not check_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Record not found"
            )
        
        # 删除记录
        response = client.table('records').delete().eq('record_id', record_id).eq('user_id', current_user_id).execute()
        
        # 204 No Content - 无需返回数据
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete record: {str(e)}"
        )