from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class TemplatePrivacyLevel(str, Enum):
    private = "private"
    buddies = "buddies"
    public = "public"


class RecordTemplateCreate(BaseModel):
    resource_id: Optional[int] = None
    form_type: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=500)
    body_md: Optional[str] = None
    duration_min: Optional[int] = Field(None, ge=0)
    effective_duration_min: Optional[int] = Field(None, ge=0)
    mood: Optional[str] = None
    difficulty: Optional[int] = Field(None, ge=1, le=5)
    focus: Optional[int] = Field(None, ge=1, le=5)
    energy: Optional[int] = Field(None, ge=1, le=5)
    privacy: TemplatePrivacyLevel = TemplatePrivacyLevel.private
    auto_confidence: Optional[float] = Field(None, ge=0, le=1)
    assets: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

    # Optional resource creation fields
    resource_title: Optional[str] = Field(None, max_length=500)
    resource_type: Optional[str] = Field(None, max_length=100)
    resource_author: Optional[str] = Field(None, max_length=200)
    resource_url: Optional[str] = Field(None, max_length=2000)
    resource_platform: Optional[str] = Field(None, max_length=100)
    resource_isbn: Optional[str] = Field(None, max_length=20)
    resource_description: Optional[str] = Field(None, max_length=2000)


class RecordTemplateUpdate(BaseModel):
    form_type: Optional[str] = Field(None, min_length=1, max_length=50)
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    body_md: Optional[str] = None
    duration_min: Optional[int] = Field(None, ge=0)
    effective_duration_min: Optional[int] = Field(None, ge=0)
    mood: Optional[str] = None
    difficulty: Optional[int] = Field(None, ge=1, le=5)
    focus: Optional[int] = Field(None, ge=1, le=5)
    energy: Optional[int] = Field(None, ge=1, le=5)
    privacy: Optional[TemplatePrivacyLevel] = None
    auto_confidence: Optional[float] = Field(None, ge=0, le=1)
    assets: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

    # Resource update fields
    resource_title: Optional[str] = Field(None, max_length=500)
    resource_type: Optional[str] = Field(None, max_length=100)
    resource_author: Optional[str] = Field(None, max_length=200)
    resource_url: Optional[str] = Field(None, max_length=2000)
    resource_platform: Optional[str] = Field(None, max_length=100)
    resource_isbn: Optional[str] = Field(None, max_length=20)
    resource_description: Optional[str] = Field(None, max_length=2000)
