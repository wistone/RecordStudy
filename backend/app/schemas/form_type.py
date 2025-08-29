from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class FormTypeCreate(BaseModel):
    type_code: str = Field(..., min_length=1, max_length=50, description="Unique identifier for the type")
    type_name: str = Field(..., min_length=1, max_length=100, description="Display name for the type")
    emoji: Optional[str] = Field(None, max_length=10, description="Emoji icon for the type")
    display_order: Optional[int] = Field(999, ge=0, description="Display order (lower numbers first)")

class FormTypeResponse(BaseModel):
    type_id: int
    user_id: str
    type_code: str
    type_name: str
    emoji: Optional[str]
    is_default: bool
    display_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FormTypeUpdate(BaseModel):
    type_name: Optional[str] = Field(None, min_length=1, max_length=100)
    emoji: Optional[str] = Field(None, max_length=10)
    display_order: Optional[int] = Field(None, ge=0)