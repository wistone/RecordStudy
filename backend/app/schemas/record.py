from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ResourceType(str, Enum):
    video = "video"
    podcast = "podcast" 
    book = "book"
    course = "course"
    article = "article"
    paper = "paper"
    exercise = "exercise"
    project = "project"
    workout = "workout"
    other = "other"

class PrivacyLevel(str, Enum):
    private = "private"
    buddies = "buddies"
    public = "public"

class RecordCreate(BaseModel):
    resource_id: Optional[int] = None
    form_type: ResourceType
    title: str = Field(..., min_length=1, max_length=500)
    body_md: Optional[str] = None
    occurred_at: Optional[datetime] = None
    duration_min: Optional[int] = Field(None, ge=0)
    effective_duration_min: Optional[int] = Field(None, ge=0)
    mood: Optional[str] = None
    difficulty: Optional[int] = Field(None, ge=1, le=5)
    focus: Optional[int] = Field(None, ge=1, le=5)
    energy: Optional[int] = Field(None, ge=1, le=5)
    privacy: PrivacyLevel = PrivacyLevel.private
    assets: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    
    # Resource fields for creating new resources
    resource_title: Optional[str] = Field(None, max_length=500)
    resource_type: Optional[str] = Field(None, max_length=100) 
    resource_author: Optional[str] = Field(None, max_length=200)
    resource_url: Optional[str] = Field(None, max_length=2000)
    resource_platform: Optional[str] = Field(None, max_length=100)
    resource_isbn: Optional[str] = Field(None, max_length=20)
    resource_description: Optional[str] = Field(None, max_length=2000)

class RecordResponse(BaseModel):
    record_id: int
    user_id: str
    resource_id: Optional[int]
    form_type: str
    title: str
    body_md: Optional[str]
    occurred_at: datetime
    duration_min: Optional[int]
    effective_duration_min: Optional[int]
    mood: Optional[str]
    difficulty: Optional[int]
    focus: Optional[int]
    energy: Optional[int]
    privacy: str
    assets: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RecordUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    body_md: Optional[str] = None
    duration_min: Optional[int] = Field(None, ge=0)
    effective_duration_min: Optional[int] = Field(None, ge=0)
    mood: Optional[str] = None
    difficulty: Optional[int] = Field(None, ge=1, le=5)
    focus: Optional[int] = Field(None, ge=1, le=5)
    energy: Optional[int] = Field(None, ge=1, le=5)
    privacy: Optional[PrivacyLevel] = None