from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class Resource(Base):
    __tablename__ = "resources"
    __table_args__ = {'schema': 'public'}

    resource_id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # resource_type enum
    title = Column(Text, nullable=False)
    url = Column(Text, nullable=True)
    normalized_url = Column(Text, nullable=True)
    platform = Column(Text, nullable=True)
    platform_id = Column(String, nullable=True)  # citext
    isbn = Column(String, nullable=True)  # citext
    author = Column(Text, nullable=True)
    cover_url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class UserResource(Base):
    __tablename__ = "user_resources"
    __table_args__ = {'schema': 'public'}

    user_resource_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    resource_id = Column(Integer, nullable=False, index=True)
    status = Column(String, default='learning', nullable=False)  # resource_status enum
    rating = Column(Integer, nullable=True)
    review_short = Column(Text, nullable=True)
    total_duration_min = Column(Integer, default=0, nullable=False)
    is_favorite = Column(Boolean, default=False, nullable=False)
    privacy = Column(String, default='private', nullable=False)  # privacy_level enum
    last_interaction_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)