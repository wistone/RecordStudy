from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional
from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.resource import Resource, UserResource
from app.schemas.resource import ResourceResponse, UserResourceResponse

router = APIRouter()

@router.get("/", response_model=List[ResourceResponse])
async def get_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    resource_type: Optional[str] = Query(None, description="过滤资源类型"),
    search: Optional[str] = Query(None, min_length=2, description="搜索资源标题"),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取资源列表"""
    query = db.query(Resource)
    
    # 类型过滤
    if resource_type:
        query = query.filter(Resource.type == resource_type)
    
    # 标题搜索
    if search:
        query = query.filter(Resource.title.ilike(f"%{search}%"))
    
    resources = query.order_by(Resource.created_at.desc()).offset(skip).limit(limit).all()
    return resources

@router.get("/my", response_model=List[UserResourceResponse])
async def get_my_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, description="过滤学习状态"),
    favorites_only: bool = Query(False, description="只显示收藏"),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取用户的资源学习状态"""
    query = db.query(UserResource).options(
        joinedload(UserResource.resource)
    ).filter(UserResource.user_id == current_user_id)
    
    # 状态过滤
    if status:
        query = query.filter(UserResource.status == status)
    
    # 收藏过滤
    if favorites_only:
        query = query.filter(UserResource.is_favorite == True)
    
    user_resources = query.order_by(
        UserResource.last_interaction_at.desc().nullslast()
    ).offset(skip).limit(limit).all()
    
    # 手动构建响应，包含resource信息
    result = []
    for ur in user_resources:
        result.append(UserResourceResponse(
            user_resource_id=ur.user_resource_id,
            resource_id=ur.resource_id,
            status=ur.status,
            rating=ur.rating,
            review_short=ur.review_short,
            total_duration_min=ur.total_duration_min,
            is_favorite=ur.is_favorite,
            last_interaction_at=ur.last_interaction_at,
            resource=ResourceResponse(
                resource_id=ur.resource.resource_id,
                type=ur.resource.type,
                title=ur.resource.title,
                url=ur.resource.url,
                platform=ur.resource.platform,
                author=ur.resource.author,
                cover_url=ur.resource.cover_url,
                description=ur.resource.description,
                created_at=ur.resource.created_at
            )
        ))
    
    return result

@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(
    resource_id: int,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取特定资源详情"""
    resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    return resource