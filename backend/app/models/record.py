from sqlalchemy import Column, Integer, String, Text, DateTime, SmallInteger, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base

class Record(Base):
    __tablename__ = "records"
    __table_args__ = {'schema': 'public'}

    record_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    resource_id = Column(Integer, nullable=True, index=True)
    form_type = Column(String, nullable=False)  # resource_type enum
    title = Column(Text, nullable=False)
    body_md = Column(Text, nullable=True)
    occurred_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    duration_min = Column(Integer, nullable=True)
    effective_duration_min = Column(Integer, nullable=True)
    mood = Column(String, nullable=True)
    difficulty = Column(SmallInteger, nullable=True)
    focus = Column(SmallInteger, nullable=True)  
    energy = Column(SmallInteger, nullable=True)
    privacy = Column(String, default='private', nullable=False)  # privacy_level enum
    auto_confidence = Column(Numeric(4, 2), nullable=True)
    assets = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)