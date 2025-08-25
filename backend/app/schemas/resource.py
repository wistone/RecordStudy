from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class ResourceStatus(str, Enum):
    wishlist = "wishlist"
    learning = "learning"
    paused = "paused"
    done = "done"
    reviewing = "reviewing"

class ResourceResponse(BaseModel):
    resource_id: int
    type: str
    title: str
    url: Optional[str]
    platform: Optional[str]
    author: Optional[str]
    cover_url: Optional[str]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class UserResourceResponse(BaseModel):
    user_resource_id: int
    resource_id: int
    status: str
    rating: Optional[int]
    review_short: Optional[str]
    total_duration_min: int
    is_favorite: bool
    last_interaction_at: Optional[datetime]
    
    # 关联的资源信息
    resource: ResourceResponse

    class Config:
        from_attributes = True