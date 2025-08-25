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
        
        # 获取记录的标签信息
        records_with_tags = []
        for record in response.data:
            if record.get('resource_id'):
                try:
                    # 查询资源标签关联
                    resource_tags_response = client.table('resource_tags').select('tag_id').eq('user_id', current_user_id).eq('resource_id', record['resource_id']).execute()
                    
                    tag_names = []
                    if resource_tags_response.data:
                        # 获取所有标签ID
                        tag_ids = [rt['tag_id'] for rt in resource_tags_response.data]
                        
                        if tag_ids:
                            # 查询标签名称
                            tags_response = client.table('tags').select('tag_name').in_('tag_id', tag_ids).execute()
                            if tags_response.data:
                                tag_names = [tag['tag_name'] for tag in tags_response.data]
                    
                    record['tags'] = ','.join(tag_names) if tag_names else ''
                except Exception as tag_error:
                    print(f"标签查询失败: {tag_error}")
                    record['tags'] = ''
            else:
                record['tags'] = ''
            
            records_with_tags.append(record)
        
        return {
            "records": records_with_tags,
            "total": len(records_with_tags)
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
    """创建新的学习记录，包括资源和标签处理"""
    try:
        from supabase import create_client
        from app.core.config import settings
        from datetime import datetime
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        resource_id = record_data.resource_id
        
        # 如果没有提供resource_id，则创建或查找资源
        if not resource_id:
            resource_id = await create_or_find_resource(
                client, 
                title=record_data.title,
                resource_type=record_data.form_type.value,
                created_by=current_user_id
            )
        
        # 准备插入记录数据
        insert_data = {
            "user_id": current_user_id,
            "resource_id": resource_id,
            "form_type": record_data.form_type.value,
            "title": record_data.title,
            "body_md": record_data.body_md,
            "occurred_at": (record_data.occurred_at or datetime.utcnow()).isoformat(),
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
        record_response = client.table('records').insert(insert_data).execute()
        
        if not record_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create record"
            )
        
        created_record = record_response.data[0]
        record_id = created_record['record_id']
        
        # 处理标签关系
        if record_data.tags and resource_id:
            await process_tags_for_resource(
                client,
                tags=record_data.tags,
                resource_id=resource_id,
                user_id=current_user_id
            )
        
        # 重新查询记录以包含标签信息（使用与get_records相同的逻辑）
        record_with_tags = await get_record_with_tags(client, record_id, current_user_id)
        return record_with_tags
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create record: {str(e)}"
        )


async def create_or_find_resource(client, title: str, resource_type: str, created_by: str):
    """创建或查找资源"""
    try:
        # 首先尝试通过标题查找现有资源
        existing_response = client.table('resources').select('resource_id').eq('title', title).eq('type', resource_type).limit(1).execute()
        
        if existing_response.data:
            return existing_response.data[0]['resource_id']
        
        # 如果不存在，创建新资源
        resource_data = {
            "type": resource_type,
            "title": title,
            "created_by": created_by
        }
        
        create_response = client.table('resources').insert(resource_data).execute()
        
        if create_response.data:
            return create_response.data[0]['resource_id']
        else:
            raise Exception("Failed to create resource")
            
    except Exception as e:
        print(f"Error in create_or_find_resource: {e}")
        raise


async def process_tags_for_resource(client, tags: list, resource_id: int, user_id: str):
    """处理资源的标签关系"""
    try:
        for tag_name in tags:
            if not tag_name.strip():
                continue
                
            # 创建或查找标签
            tag_id = await create_or_find_tag(client, tag_name.strip(), user_id)
            
            # 创建资源-标签关系（如果不存在）
            await create_resource_tag_relation(client, user_id, resource_id, tag_id)
            
    except Exception as e:
        print(f"Error in process_tags_for_resource: {e}")
        # 不抛出异常，因为记录已经创建成功，标签失败不应该影响整个流程


async def create_or_find_tag(client, tag_name: str, created_by: str):
    """创建或查找标签"""
    try:
        # 查找现有标签
        existing_response = client.table('tags').select('tag_id').eq('tag_name', tag_name).eq('created_by', created_by).limit(1).execute()
        
        if existing_response.data:
            return existing_response.data[0]['tag_id']
        
        # 如果不存在，创建新标签
        tag_data = {
            "tag_name": tag_name,
            "tag_type": "category",
            "created_by": created_by
        }
        
        create_response = client.table('tags').insert(tag_data).execute()
        
        if create_response.data:
            return create_response.data[0]['tag_id']
        else:
            raise Exception(f"Failed to create tag: {tag_name}")
            
    except Exception as e:
        print(f"Error in create_or_find_tag: {e}")
        raise


async def create_resource_tag_relation(client, user_id: str, resource_id: int, tag_id: int):
    """创建资源-标签关系"""
    try:
        # 检查关系是否已存在
        existing_response = client.table('resource_tags').select('resource_tag_id').eq('user_id', user_id).eq('resource_id', resource_id).eq('tag_id', tag_id).limit(1).execute()
        
        if existing_response.data:
            return  # 关系已存在
        
        # 创建新的关系
        relation_data = {
            "user_id": user_id,
            "resource_id": resource_id,
            "tag_id": tag_id
        }
        
        client.table('resource_tags').insert(relation_data).execute()
        
    except Exception as e:
        print(f"Error in create_resource_tag_relation: {e}")
        # 不抛出异常，因为这不是关键失败


async def get_record_with_tags(client, record_id: int, user_id: str):
    """获取包含标签信息的单条记录"""
    try:
        # 查询记录
        record_response = client.table('records').select('*').eq('record_id', record_id).eq('user_id', user_id).execute()
        
        if not record_response.data:
            return None
        
        record = record_response.data[0]
        
        # 添加标签信息（使用与get_records相同的逻辑）
        if record.get('resource_id'):
            try:
                # 查询资源标签关联
                resource_tags_response = client.table('resource_tags').select('tag_id').eq('user_id', user_id).eq('resource_id', record['resource_id']).execute()
                
                tag_names = []
                if resource_tags_response.data:
                    # 获取所有标签ID
                    tag_ids = [rt['tag_id'] for rt in resource_tags_response.data]
                    
                    if tag_ids:
                        # 查询标签名称
                        tags_response = client.table('tags').select('tag_name').in_('tag_id', tag_ids).execute()
                        if tags_response.data:
                            tag_names = [tag['tag_name'] for tag in tags_response.data]
                
                record['tags'] = ','.join(tag_names) if tag_names else ''
            except Exception as tag_error:
                print(f"标签查询失败: {tag_error}")
                record['tags'] = ''
        else:
            record['tags'] = ''
        
        return record
        
    except Exception as e:
        print(f"Error in get_record_with_tags: {e}")
        return None

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