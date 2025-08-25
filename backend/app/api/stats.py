from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.record import Record
from app.models.resource import UserResource

router = APIRouter()

@router.get("/overview", response_model=Dict[str, Any])
async def get_stats_overview(
    days: int = Query(30, ge=1, le=365, description="统计最近N天"),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取学习统计概览"""
    start_date = datetime.now() - timedelta(days=days)
    
    # 基础统计
    total_records = db.query(func.count(Record.record_id)).filter(
        and_(Record.user_id == current_user_id, Record.occurred_at >= start_date)
    ).scalar() or 0
    
    total_duration = db.query(func.sum(Record.duration_min)).filter(
        and_(Record.user_id == current_user_id, Record.occurred_at >= start_date)
    ).scalar() or 0
    
    # 学习天数（有记录的天数）
    learning_days = db.query(func.count(func.distinct(func.date(Record.occurred_at)))).filter(
        and_(Record.user_id == current_user_id, Record.occurred_at >= start_date)
    ).scalar() or 0
    
    # 平均分数
    avg_difficulty = db.query(func.avg(Record.difficulty)).filter(
        and_(
            Record.user_id == current_user_id, 
            Record.occurred_at >= start_date,
            Record.difficulty.isnot(None)
        )
    ).scalar() or 0
    
    avg_focus = db.query(func.avg(Record.focus)).filter(
        and_(
            Record.user_id == current_user_id, 
            Record.occurred_at >= start_date,
            Record.focus.isnot(None)
        )
    ).scalar() or 0
    
    # 按类型统计
    type_stats = db.query(
        Record.form_type,
        func.count(Record.record_id).label('count'),
        func.sum(Record.duration_min).label('total_duration')
    ).filter(
        and_(Record.user_id == current_user_id, Record.occurred_at >= start_date)
    ).group_by(Record.form_type).all()
    
    type_distribution = [
        {
            "type": stat.form_type,
            "count": stat.count,
            "total_duration": stat.total_duration or 0
        }
        for stat in type_stats
    ]
    
    return {
        "period_days": days,
        "total_records": total_records,
        "total_duration_hours": round(total_duration / 60, 1) if total_duration else 0,
        "learning_days": learning_days,
        "avg_difficulty": round(float(avg_difficulty), 1) if avg_difficulty else 0,
        "avg_focus": round(float(avg_focus), 1) if avg_focus else 0,
        "daily_avg_duration": round(total_duration / max(learning_days, 1), 1) if total_duration else 0,
        "type_distribution": type_distribution
    }

@router.get("/daily", response_model=List[Dict[str, Any]])
async def get_daily_stats(
    days: int = Query(30, ge=1, le=90, description="获取最近N天的每日统计"),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取每日学习统计"""
    start_date = datetime.now() - timedelta(days=days)
    
    daily_stats = db.query(
        func.date(Record.occurred_at).label('date'),
        func.count(Record.record_id).label('record_count'),
        func.sum(Record.duration_min).label('total_duration'),
        func.avg(Record.difficulty).label('avg_difficulty'),
        func.avg(Record.focus).label('avg_focus')
    ).filter(
        and_(Record.user_id == current_user_id, Record.occurred_at >= start_date)
    ).group_by(
        func.date(Record.occurred_at)
    ).order_by(
        func.date(Record.occurred_at)
    ).all()
    
    # 生成完整的日期序列，包括没有记录的日子
    result = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=days-1-i)).date()
        
        # 查找当天的统计
        day_stat = next((stat for stat in daily_stats if stat.date == date), None)
        
        if day_stat:
            result.append({
                "date": date.isoformat(),
                "record_count": day_stat.record_count,
                "total_duration": day_stat.total_duration or 0,
                "avg_difficulty": round(float(day_stat.avg_difficulty), 1) if day_stat.avg_difficulty else 0,
                "avg_focus": round(float(day_stat.avg_focus), 1) if day_stat.avg_focus else 0
            })
        else:
            result.append({
                "date": date.isoformat(),
                "record_count": 0,
                "total_duration": 0,
                "avg_difficulty": 0,
                "avg_focus": 0
            })
    
    return result

@router.get("/resources", response_model=Dict[str, Any])
async def get_resource_stats(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取资源学习统计"""
    
    # 按状态统计资源数量
    status_stats = db.query(
        UserResource.status,
        func.count(UserResource.user_resource_id).label('count')
    ).filter(
        UserResource.user_id == current_user_id
    ).group_by(UserResource.status).all()
    
    status_distribution = [
        {"status": stat.status, "count": stat.count}
        for stat in status_stats
    ]
    
    # 收藏资源数量
    favorite_count = db.query(func.count(UserResource.user_resource_id)).filter(
        and_(UserResource.user_id == current_user_id, UserResource.is_favorite == True)
    ).scalar() or 0
    
    # 已完成并评分的资源平均评分
    avg_rating = db.query(func.avg(UserResource.rating)).filter(
        and_(
            UserResource.user_id == current_user_id,
            UserResource.rating.isnot(None)
        )
    ).scalar() or 0
    
    return {
        "status_distribution": status_distribution,
        "favorite_count": favorite_count,
        "avg_rating": round(float(avg_rating), 1) if avg_rating else 0
    }