from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"

class RecordType(str, Enum):
    VIDEO = "video"
    PODCAST = "podcast"
    BOOK = "book"
    COURSE = "course"
    ARTICLE = "article"
    EXERCISE = "exercise"
    PROJECT = "project"
    WORKOUT = "workout"
    OTHER = "other"

class RecordStatus(str, Enum):
    WANT_TO_LEARN = "want_to_learn"
    LEARNING = "learning"
    PAUSED = "paused"
    COMPLETED = "completed"
    REVIEWING = "reviewing"

class Privacy(str, Enum):
    PRIVATE = "private"
    FRIENDS = "friends"
    PUBLIC = "public"

# Pydantic models for API requests/responses
class UserProfile(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class UserRegister(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserProfile

# Record models
class RecordCreate(BaseModel):
    title: str
    record_type: RecordType
    tags: Optional[List[str]] = []
    duration_minutes: Optional[int] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    difficulty_rating: Optional[int] = Field(None, ge=1, le=5)
    focus_rating: Optional[int] = Field(None, ge=1, le=5)
    energy_rating: Optional[int] = Field(None, ge=1, le=5)
    occurred_at: Optional[datetime] = None
    resource_url: Optional[str] = None
    status: Optional[RecordStatus] = RecordStatus.COMPLETED
    privacy: Optional[Privacy] = Privacy.PRIVATE

class RecordQuickNote(BaseModel):
    content: str

class RecordResponse(BaseModel):
    id: str
    user_id: str
    title: str
    record_type: RecordType
    tags: List[str]
    duration_minutes: Optional[int] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    difficulty_rating: Optional[int] = None
    focus_rating: Optional[int] = None
    energy_rating: Optional[int] = None
    occurred_at: datetime
    created_at: datetime
    updated_at: datetime
    resource_url: Optional[str] = None
    status: RecordStatus
    privacy: Privacy

class RecordUpdate(BaseModel):
    title: Optional[str] = None
    record_type: Optional[RecordType] = None
    tags: Optional[List[str]] = None
    duration_minutes: Optional[int] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    difficulty_rating: Optional[int] = Field(None, ge=1, le=5)
    focus_rating: Optional[int] = Field(None, ge=1, le=5)
    energy_rating: Optional[int] = Field(None, ge=1, le=5)
    resource_url: Optional[str] = None
    status: Optional[RecordStatus] = None
    privacy: Optional[Privacy] = None

# Resource models
class ResourceCreate(BaseModel):
    title: str
    url: Optional[str] = None
    platform: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = []

class ResourceResponse(BaseModel):
    id: str
    title: str
    url: Optional[str] = None
    platform: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    tags: List[str]
    created_at: datetime
    created_by: str

# Tag models
class TagResponse(BaseModel):
    id: str
    tag_name: str
    usage_count: int
    created_at: datetime
    created_by: Optional[str] = None

class TagCreate(BaseModel):
    tag_name: str

# Analytics models
class PeriodStats(BaseModel):
    total_duration: int
    total_records: int
    active_days: int
    streak_days: int

class TypeStats(BaseModel):
    record_type: RecordType
    count: int
    duration: int
    percentage: float

class AnalyticsResponse(BaseModel):
    today: PeriodStats
    week: PeriodStats
    month: PeriodStats
    type_distribution: List[TypeStats]
    popular_tags: List[dict]
    chart_data: dict

class ChartDataRequest(BaseModel):
    period: str = Field(..., pattern="^(week|month|year)$")

# AI Summary models
class SummaryResponse(BaseModel):
    trend_insight: str
    focus_insight: str
    strength_insight: str
    next_action: str