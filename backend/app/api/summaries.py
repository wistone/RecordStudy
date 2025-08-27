from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta, date
from app.core.auth import get_current_user_id
from supabase import create_client
from app.core.config import settings
import json

def safe_parse_datetime(datetime_str):
    """安全解析日期字符串，处理各种格式问题"""
    try:
        occurred_at = datetime_str
        # 处理不同的日期格式
        if occurred_at.endswith('Z'):
            occurred_at = occurred_at.replace('Z', '+00:00')
        elif '+' not in occurred_at and 'T' in occurred_at:
            occurred_at = occurred_at + '+00:00'
        
        # 处理微秒精度问题
        if '.' in occurred_at:
            parts = occurred_at.split('.')
            if len(parts) == 2:
                microseconds = parts[1].split('+')[0].split('-')[0]
                # 确保微秒部分是6位数
                if len(microseconds) > 6:
                    microseconds = microseconds[:6]
                elif len(microseconds) < 6:
                    microseconds = microseconds.ljust(6, '0')
                
                timezone_part = parts[1][len(microseconds.rstrip('0') or '0'):]
                occurred_at = f"{parts[0]}.{microseconds}{timezone_part}"
        
        return datetime.fromisoformat(occurred_at)
    except (ValueError, AttributeError) as e:
        print(f"⚠️ 日期解析失败: {datetime_str} - {e}")
        return None

router = APIRouter()

# 简单的内存缓存（生产环境应使用Redis）
_cache = {}
_cache_expiry = {}
CACHE_DURATION = 300  # 5分钟缓存

def get_cache_key(user_id: str, cache_type: str, params: str = "") -> str:
    """生成缓存键"""
    return f"{user_id}:{cache_type}:{params}"

def get_from_cache(key: str) -> Optional[Any]:
    """从缓存获取数据"""
    if key in _cache and key in _cache_expiry:
        if datetime.now() < _cache_expiry[key]:
            return _cache[key]
        else:
            # 缓存过期，清理
            del _cache[key]
            del _cache_expiry[key]
    return None

def set_cache(key: str, data: Any, duration: int = CACHE_DURATION):
    """设置缓存"""
    _cache[key] = data
    _cache_expiry[key] = datetime.now() + timedelta(seconds=duration)

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_summary(
    days: int = Query(7, ge=1, le=30, description="统计最近N天"),
    current_user_id: str = Depends(get_current_user_id)
):
    """获取首页仪表盘汇总数据（优化版）"""
    
    # 检查缓存
    cache_key = get_cache_key(current_user_id, "dashboard", str(days))
    cached_data = get_from_cache(cache_key)
    if cached_data:
        return cached_data
    
    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        start_date = datetime.now() - timedelta(days=days)
        
        # 获取记录数据（只查询必要字段）
        response = client.table('records')\
            .select('occurred_at, duration_min, form_type, difficulty, focus')\
            .eq('user_id', current_user_id)\
            .gte('occurred_at', start_date.isoformat())\
            .execute()
        
        records = response.data or []
        
        # 计算汇总数据
        total_records = len(records)
        total_duration = sum(r.get('duration_min', 0) or 0 for r in records)
        
        # 计算学习天数（有记录的天数）
        learning_dates = set()
        for record in records:
            if record.get('occurred_at'):
                record_date = safe_parse_datetime(record['occurred_at'])
                if record_date:
                    learning_dates.add(record_date.date())
        
        learning_days = len(learning_dates)
        
        # 计算平均分数（跳过None值）
        valid_difficulty = [r['difficulty'] for r in records if r.get('difficulty') is not None]
        valid_focus = [r['focus'] for r in records if r.get('focus') is not None]
        
        avg_difficulty = sum(valid_difficulty) / len(valid_difficulty) if valid_difficulty else 0
        avg_focus = sum(valid_focus) / len(valid_focus) if valid_focus else 0
        
        # 按类型统计
        type_stats = {}
        for record in records:
            form_type = record.get('form_type', 'other')
            if form_type not in type_stats:
                type_stats[form_type] = {'count': 0, 'duration': 0}
            type_stats[form_type]['count'] += 1
            type_stats[form_type]['duration'] += record.get('duration_min', 0) or 0
        
        type_distribution = [
            {
                "type": k,
                "count": v['count'],
                "total_duration": v['duration']
            }
            for k, v in type_stats.items()
        ]
        
        # 计算连续学习天数（更智能的逻辑）
        streak_days = 0
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        # 如果今天有记录，从今天开始计算连续天数
        if today in learning_dates:
            check_date = today
            while check_date in learning_dates:
                streak_days += 1
                check_date = check_date - timedelta(days=1)
        # 如果今天没有记录但昨天有记录，连续天数为0（今天断了）
        elif yesterday in learning_dates:
            streak_days = 0
        # 如果今天和昨天都没有记录，检查是否有其他连续的学习天数
        else:
            # 找到最近的学习日期
            if learning_dates:
                recent_dates = sorted(learning_dates, reverse=True)
                latest_date = recent_dates[0]
                
                # 如果最近的学习日期距离今天超过1天，连续天数为0
                days_since_latest = (today - latest_date).days
                if days_since_latest > 1:
                    streak_days = 0
                else:
                    # 从最近的日期开始计算连续天数
                    check_date = latest_date
                    while check_date in learning_dates:
                        streak_days += 1
                        check_date = check_date - timedelta(days=1)
        
        # 今日统计
        today_records = []
        for r in records:
            if r.get('occurred_at'):
                record_date = safe_parse_datetime(r['occurred_at'])
                if record_date and record_date.date() == today:
                    today_records.append(r)
        
        today_count = len(today_records)
        today_duration = sum(r.get('duration_min', 0) or 0 for r in today_records)
        
        # 组装结果
        dashboard_data = {
            "period_days": days,
            "total_records": total_records,
            "total_duration_hours": round(total_duration / 60, 1) if total_duration else 0,
            "learning_days": learning_days,
            "streak_days": streak_days,
            "avg_difficulty": round(avg_difficulty, 1),
            "avg_focus": round(avg_focus, 1),
            "daily_avg_duration": round(total_duration / max(learning_days, 1), 1) if total_duration else 0,
            "type_distribution": type_distribution,
            "today": {
                "count": today_count,
                "duration_minutes": today_duration
            },
            "cache_timestamp": datetime.now().isoformat()
        }
        
        # 缓存结果
        set_cache(cache_key, dashboard_data)
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch dashboard summary: {str(e)}"
        )

@router.get("/recent-records", response_model=Dict[str, Any])
async def get_recent_records_summary(
    limit: int = Query(10, ge=1, le=50, description="最近记录数量"),
    current_user_id: str = Depends(get_current_user_id)
):
    """获取最近记录的简化信息（用于首页显示）"""
    
    cache_key = get_cache_key(current_user_id, "recent", str(limit))
    cached_data = get_from_cache(cache_key)
    if cached_data:
        return cached_data
    
    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # 只查询首页需要的字段
        response = client.table('records')\
            .select('record_id, title, form_type, occurred_at, duration_min')\
            .eq('user_id', current_user_id)\
            .order('occurred_at', desc=True)\
            .limit(limit)\
            .execute()
        
        records = []
        for record in response.data or []:
            # 简化的记录信息
            records.append({
                "id": record['record_id'],
                "title": record['title'],
                "type": record['form_type'],
                "occurred_at": record['occurred_at'],
                "duration_min": record.get('duration_min', 0)
            })
        
        recent_data = {
            "records": records,
            "total": len(records),
            "cache_timestamp": datetime.now().isoformat()
        }
        
        # 缓存结果
        set_cache(cache_key, recent_data, 180)  # 3分钟缓存
        
        return recent_data
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch recent records: {str(e)}"
        )

@router.post("/invalidate-cache")
async def invalidate_user_cache(current_user_id: str = Depends(get_current_user_id)):
    """手动清除用户缓存（当创建新记录时调用）"""
    try:
        # 清除该用户的所有缓存
        keys_to_remove = []
        for key in _cache.keys():
            if key.startswith(f"{current_user_id}:"):
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            if key in _cache:
                del _cache[key]
            if key in _cache_expiry:
                del _cache_expiry[key]
        
        return {"message": f"Invalidated {len(keys_to_remove)} cache entries", "user_id": current_user_id}
        
    except Exception as e:
        return {"error": str(e), "message": "Failed to invalidate cache"}

@router.get("/cache-stats", response_model=Dict[str, Any])
async def get_cache_stats():
    """获取缓存统计信息（调试用）"""
    now = datetime.now()
    valid_entries = sum(1 for key, expiry in _cache_expiry.items() if expiry > now)
    expired_entries = len(_cache) - valid_entries
    
    return {
        "total_entries": len(_cache),
        "valid_entries": valid_entries,
        "expired_entries": expired_entries,
        "cache_duration_seconds": CACHE_DURATION
    }