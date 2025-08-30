from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from datetime import datetime, timedelta
from app.core.auth import get_current_user_id
from app.schemas.record import RecordCreate, RecordUpdate

router = APIRouter()

# Global utility function for resource type validation
def get_valid_resource_type(form_type_value, fallback_type=None):
    """Convert any form_type to a valid resource_type enum value"""
    valid_types = {
        'video', 'podcast', 'book', 'course', 'article', 
        'paper', 'exercise', 'project', 'workout', 'other'
    }
    if form_type_value and form_type_value in valid_types:
        return form_type_value
    elif fallback_type and fallback_type in valid_types:
        return fallback_type
    else:
        return 'other'  # Default fallback for custom types

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
        
        # 批量获取所有记录的标签信息（解决N+1查询问题）
        records_with_tags = []
        if response.data:
            # 1. 收集所有有效的resource_id
            resource_ids = [record['resource_id'] for record in response.data if record.get('resource_id')]
            
            # 2. 如果有资源ID，批量查询所有标签信息
            resource_tags_map = {}  # resource_id -> tag_names
            if resource_ids:
                try:
                    # 批量查询资源标签关联
                    resource_tags_response = client.table('resource_tags')\
                        .select('resource_id, tag_id')\
                        .eq('user_id', current_user_id)\
                        .in_('resource_id', resource_ids)\
                        .execute()
                    
                    if resource_tags_response.data:
                        # 收集所有标签ID
                        tag_ids = list(set([rt['tag_id'] for rt in resource_tags_response.data]))
                        
                        if tag_ids:
                            # 批量查询标签名称
                            tags_response = client.table('tags')\
                                .select('tag_id, tag_name')\
                                .in_('tag_id', tag_ids)\
                                .execute()
                            
                            # 构建tag_id -> tag_name映射
                            tag_id_to_name = {}
                            if tags_response.data:
                                tag_id_to_name = {tag['tag_id']: tag['tag_name'] for tag in tags_response.data}
                            
                            # 构建resource_id -> tag_names映射
                            for rt in resource_tags_response.data:
                                resource_id = rt['resource_id']
                                tag_name = tag_id_to_name.get(rt['tag_id'])
                                
                                if tag_name:
                                    if resource_id not in resource_tags_map:
                                        resource_tags_map[resource_id] = []
                                    resource_tags_map[resource_id].append(tag_name)
                                    
                except Exception as tag_error:
                    print(f"批量标签查询失败: {tag_error}")
            
            # 3. 组装最终结果
            for record in response.data:
                resource_id = record.get('resource_id')
                if resource_id and resource_id in resource_tags_map:
                    record['tags'] = ','.join(resource_tags_map[resource_id])
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

@router.get("/recent-tags", response_model=list)
async def get_recent_tags(current_user_id: str = Depends(get_current_user_id)):
    """获取用户最近使用的标签（基于最近10条记录）"""
    try:
        from supabase import create_client
        from app.core.config import settings
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # 查询用户最近10条记录
        records_response = client.table('records')\
            .select('resource_id')\
            .eq('user_id', current_user_id)\
            .order('occurred_at', desc=True)\
            .limit(10)\
            .execute()
        
        if not records_response.data:
            return []
        
        # 收集所有有效的resource_id
        resource_ids = [record['resource_id'] for record in records_response.data if record.get('resource_id')]
        
        if not resource_ids:
            return []
        
        # 批量查询资源标签关联
        resource_tags_response = client.table('resource_tags')\
            .select('tag_id')\
            .eq('user_id', current_user_id)\
            .in_('resource_id', resource_ids)\
            .execute()
        
        if not resource_tags_response.data:
            return []
        
        # 收集所有标签ID
        tag_ids = list(set([rt['tag_id'] for rt in resource_tags_response.data]))
        
        # 批量查询标签名称
        tags_response = client.table('tags')\
            .select('tag_name')\
            .in_('tag_id', tag_ids)\
            .execute()
        
        if not tags_response.data:
            return []
        
        # 提取标签名称并去重
        tag_names = list(set([tag['tag_name'] for tag in tags_response.data]))
        
        return tag_names
        
    except Exception as e:
        print(f"获取最近标签失败: {e}")
        # 如果出错，返回空列表而不是抛出异常，让前端可以优雅降级
        return []

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
        
        # Validate form_type against user's form types
        form_type_check = client.table('user_form_types').select('type_id').eq('user_id', current_user_id).eq('type_code', record_data.form_type).execute()
        if not form_type_check.data:
            raise HTTPException(status_code=400, detail=f"Invalid form_type '{record_data.form_type}' for user")
        
        resource_id = record_data.resource_id

        # 如果没有提供resource_id，但有资源信息，则创建或查找资源
        if not resource_id and hasattr(record_data, 'resource_title') and record_data.resource_title:
            resource_type = get_valid_resource_type(
                record_data.resource_type or record_data.form_type, 
                record_data.resource_type
            )
            resource_id = await create_or_find_resource(
                client, 
                title=record_data.resource_title,
                resource_type=resource_type,
                created_by=current_user_id,
                author=getattr(record_data, 'resource_author', None),
                url=getattr(record_data, 'resource_url', None),
                platform=getattr(record_data, 'resource_platform', None),
                isbn=getattr(record_data, 'resource_isbn', None),
                description=getattr(record_data, 'resource_description', None)
            )
        elif not resource_id:
            # 如果没有资源信息，使用记录标题创建简单资源
            resource_type = get_valid_resource_type(record_data.form_type)
            resource_id = await create_or_find_resource(
                client, 
                title=record_data.title,
                resource_type=resource_type,
                created_by=current_user_id
            )
        
        # 准备插入记录数据
        insert_data = {
            "user_id": current_user_id,
            "resource_id": resource_id,
            "form_type": record_data.form_type,
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
        
        # 异步清除汇总缓存（新记录会影响统计数据）
        try:
            from .summaries import get_cache_key, _cache, _cache_expiry
            
            # 清除该用户的所有汇总缓存
            keys_to_remove = []
            for key in _cache.keys():
                if key.startswith(f"{current_user_id}:"):
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                if key in _cache:
                    del _cache[key]
                if key in _cache_expiry:
                    del _cache_expiry[key]
                    
            print(f"✅ 清除了 {len(keys_to_remove)} 个缓存条目")
                    
        except Exception as cache_error:
            print(f"⚠️ 清除缓存失败: {cache_error}")
            # 缓存清除失败不应影响记录创建
        
        return record_with_tags
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create record: {str(e)}"
        )


async def create_or_find_resource(client, title: str, resource_type: str, created_by: str, 
                                author: str = None, url: str = None, platform: str = None, 
                                isbn: str = None, description: str = None):
    """创建或查找资源"""
    try:
        # 确保resource_type是有效的枚举值（对自定义类型使用"other"）
        validated_resource_type = get_valid_resource_type(resource_type)
        
        # 首先尝试通过标题查找现有资源
        existing_response = client.table('resources').select('resource_id').eq('title', title).eq('type', validated_resource_type).limit(1).execute()
        
        if existing_response.data:
            return existing_response.data[0]['resource_id']
        
        # 如果不存在，创建新资源
        resource_data = {
            "type": validated_resource_type,
            "title": title,
            "created_by": created_by
        }
        
        # 添加可选字段（只有非空值才添加）
        if author:
            resource_data["author"] = author
        if url:
            resource_data["url"] = url
        if platform:
            resource_data["platform"] = platform
        if isbn:
            resource_data["isbn"] = isbn
        if description:
            resource_data["description"] = description
        
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
    """获取特定的学习记录及其完整详情"""
    try:
        from supabase import create_client
        from app.core.config import settings
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # 1. 获取记录基本信息
        record_response = client.table('records').select('*').eq('record_id', record_id).eq('user_id', current_user_id).execute()
        
        if not record_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Record not found"
            )
        
        record = record_response.data[0]
        result = dict(record)
        
        # 2. 获取关联的资源信息
        resource_info = None
        if record.get('resource_id'):
            resource_response = client.table('resources').select('*').eq('resource_id', record['resource_id']).execute()
            if resource_response.data:
                resource_info = resource_response.data[0]
        result['resource'] = resource_info
        
        # 3. 获取用户-资源关系信息
        user_resource_info = None
        if record.get('resource_id'):
            user_resource_response = client.table('user_resources').select('*').eq('user_id', current_user_id).eq('resource_id', record['resource_id']).execute()
            if user_resource_response.data:
                user_resource_info = user_resource_response.data[0]
        result['user_resource'] = user_resource_info
        
        # 4. 获取标签信息
        tags_info = []
        if record.get('resource_id'):
            # 获取资源标签关联
            resource_tags_response = client.table('resource_tags').select('tag_id').eq('user_id', current_user_id).eq('resource_id', record['resource_id']).execute()
            
            if resource_tags_response.data:
                tag_ids = [rt['tag_id'] for rt in resource_tags_response.data]
                
                # 获取标签详细信息
                if tag_ids:
                    tags_response = client.table('tags').select('*').in_('tag_id', tag_ids).execute()
                    if tags_response.data:
                        tags_info = tags_response.data
        
        result['tags'] = tags_info
        
        return result
        
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
    record_update: dict,
    current_user_id: str = Depends(get_current_user_id)
):
    """更新学习记录及其相关资源、标签信息"""
    try:
        from supabase import create_client
        from app.core.config import settings
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # 首先检查记录是否存在并获取当前数据
        check_response = client.table('records').select('*').eq('record_id', record_id).eq('user_id', current_user_id).execute()
        
        if not check_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Record not found"
            )
        
        current_record = check_response.data[0]
        
        # 分离记录数据和资源数据
        record_fields = {
            'title', 'form_type', 'body_md', 'occurred_at', 'duration_min', 
            'effective_duration_min', 'mood', 'difficulty', 'focus', 'energy',
            'privacy', 'auto_confidence', 'assets'
        }
        
        resource_fields = {
            'resource_title', 'resource_type', 'resource_author', 'resource_url',
            'resource_platform', 'resource_isbn', 'resource_description', 'resource_cover_url'
        }
        
        # 更新记录数据
        record_update_data = {k: v for k, v in record_update.items() if k in record_fields}
        if record_update_data:
            response = client.table('records').update(record_update_data).eq('record_id', record_id).eq('user_id', current_user_id).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update record"
                )
        
        # 更新资源数据（如果存在资源）
        resource_update_data = {}
        for k, v in record_update.items():
            if k.startswith('resource_'):
                field_name = k.replace('resource_', '')
                if field_name == 'cover_url':
                    field_name = 'cover_url'
                elif field_name == 'title':
                    field_name = 'title'  
                elif field_name == 'type':
                    field_name = 'type'
                elif field_name == 'author':
                    field_name = 'author'
                elif field_name == 'url':
                    field_name = 'url'
                elif field_name == 'platform':
                    field_name = 'platform'
                elif field_name == 'isbn':
                    field_name = 'isbn'
                elif field_name == 'description':
                    field_name = 'description'
                resource_update_data[field_name] = v
        
        if resource_update_data and current_record.get('resource_id'):
            resource_response = client.table('resources').update(resource_update_data).eq('resource_id', current_record['resource_id']).execute()
            
            if not resource_response.data:
                print(f"警告: 资源更新可能失败，resource_id: {current_record['resource_id']}")
        
        # 处理标签更新（如果有标签数据）
        if 'tags' in record_update:
            await update_record_tags(client, current_record['resource_id'], record_update['tags'], current_user_id, record_id)
        
        # 返回更新后的完整记录
        return await get_full_record_detail(client, record_id, current_user_id)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"更新记录失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update record: {str(e)}"
        )

# 辅助函数
async def get_full_record_detail(client, record_id: int, user_id: str):
    """获取完整的记录详情"""
    # 重用现有的get_record逻辑
    record_response = client.table('records').select('*').eq('record_id', record_id).eq('user_id', user_id).execute()
    
    if not record_response.data:
        return None
    
    record = record_response.data[0]
    result = dict(record)
    
    # 获取关联的资源信息
    resource_info = None
    if record.get('resource_id'):
        resource_response = client.table('resources').select('*').eq('resource_id', record['resource_id']).execute()
        if resource_response.data:
            resource_info = resource_response.data[0]
    result['resource'] = resource_info
    
    # 获取用户-资源关系信息
    user_resource_info = None
    if record.get('resource_id'):
        user_resource_response = client.table('user_resources').select('*').eq('user_id', user_id).eq('resource_id', record['resource_id']).execute()
        if user_resource_response.data:
            user_resource_info = user_resource_response.data[0]
    result['user_resource'] = user_resource_info
    
    # 获取标签信息
    tags_info = []
    if record.get('resource_id'):
        resource_tags_response = client.table('resource_tags').select('tag_id').eq('user_id', user_id).eq('resource_id', record['resource_id']).execute()
        
        if resource_tags_response.data:
            tag_ids = [rt['tag_id'] for rt in resource_tags_response.data]
            
            if tag_ids:
                tags_response = client.table('tags').select('*').in_('tag_id', tag_ids).execute()
                if tags_response.data:
                    tags_info = tags_response.data
    
    result['tags'] = tags_info
    
    return result

async def update_record_tags(client, resource_id: int, tags_data: list, user_id: str, record_id: int = None):
    """更新记录的标签"""
    # 如果没有资源ID但有标签数据，为记录创建一个虚拟资源
    if not resource_id and tags_data and record_id:
        print(f"为记录 {record_id} 创建虚拟资源以关联标签")
        
        # 获取记录信息作为资源
        record_response = client.table('records').select('title, form_type').eq('record_id', record_id).execute()
        if not record_response.data:
            return
            
        record_data = record_response.data[0]
        
        # 创建虚拟资源（确保使用有效的resource_type）
        validated_resource_type = get_valid_resource_type(record_data['form_type'])
        
        resource_data = {
            'type': validated_resource_type,
            'title': record_data['title'],
            'created_by': user_id
        }
        
        resource_response = client.table('resources').insert(resource_data).execute()
        if resource_response.data:
            resource_id = resource_response.data[0]['resource_id']
            
            # 更新记录的resource_id
            client.table('records').update({'resource_id': resource_id}).eq('record_id', record_id).execute()
            print(f"✅ 为记录 {record_id} 创建了虚拟资源 {resource_id}")
        else:
            print(f"❌ 创建虚拟资源失败")
            return
    
    if not resource_id:
        return
        
    try:
        # 删除现有的资源标签关联
        client.table('resource_tags').delete().eq('user_id', user_id).eq('resource_id', resource_id).execute()
        
        # 添加新的标签关联
        for tag_data in tags_data:
            tag_name = tag_data.get('tag_name')
            if not tag_name:
                continue
                
            # 创建或查找标签
            tag_id = await create_or_find_tag(client, tag_name, user_id)
            
            # 创建资源-标签关系
            await create_resource_tag_relation(client, user_id, resource_id, tag_id)
            
    except Exception as e:
        print(f"更新标签失败: {e}")
        # 不抛出异常，因为标签更新失败不应该影响记录更新

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
        
        # 返回空响应 (204 No Content)
        from fastapi import Response
        return Response(status_code=204)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete record: {str(e)}"
        )