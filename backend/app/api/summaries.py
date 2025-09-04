from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta, date, timezone
import pytz
from app.core.auth import get_current_user_id
from supabase import create_client
from app.core.config import settings
import json
import sys
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 用户时区设置（默认为中国时间，后续可以从用户配置中获取）
USER_TIMEZONE = pytz.timezone('Asia/Shanghai')

def utc_to_local_date(utc_datetime):
    """将UTC时间转换为本地时区的日期"""
    if utc_datetime.tzinfo is None:
        utc_datetime = utc_datetime.replace(tzinfo=timezone.utc)
    local_datetime = utc_datetime.astimezone(USER_TIMEZONE)
    return local_datetime.date()

def get_local_date_boundaries(days_back=0):
    """获取本地时区的日期边界（开始时间和结束时间的UTC表示）"""
    # 获取本地时间的今天
    local_now = datetime.now(USER_TIMEZONE)
    local_today = local_now.date()
    
    # 计算目标日期
    target_date = local_today - timedelta(days=days_back)
    
    # 构建本地时间的开始和结束时间
    local_start = USER_TIMEZONE.localize(datetime.combine(target_date, datetime.min.time()))
    local_end = USER_TIMEZONE.localize(datetime.combine(local_today + timedelta(days=1), datetime.min.time()))
    
    # 转换为UTC时间用于数据库查询
    utc_start = local_start.astimezone(timezone.utc)
    utc_end = local_end.astimezone(timezone.utc)
    
    return utc_start, utc_end

def safe_parse_datetime(datetime_str):
    """安全解析日期字符串，返回UTC时间"""
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
        
        # 使用本地时区计算日期边界
        utc_start, utc_end = get_local_date_boundaries(days - 1)
        
        # 获取记录数据（只查询必要字段）
        response = client.table('records')\
            .select('occurred_at, duration_min, form_type, difficulty, focus')\
            .eq('user_id', current_user_id)\
            .gte('occurred_at', utc_start.isoformat())\
            .lt('occurred_at', utc_end.isoformat())\
            .execute()
        
        records = response.data or []
        
        # 计算汇总数据
        total_records = len(records)
        total_duration = sum(r.get('duration_min', 0) or 0 for r in records)
        
        # 计算学习天数（有记录的天数）- 使用本地时区
        learning_dates = set()
        for record in records:
            if record.get('occurred_at'):
                utc_datetime = safe_parse_datetime(record['occurred_at'])
                if utc_datetime:
                    # 转换为本地时区的日期
                    local_date = utc_to_local_date(utc_datetime)
                    learning_dates.add(local_date)
        
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
        
        # 注意: consecutive_days 在 init endpoint 中全局计算，这里不需要计算
        
        # 今日统计（使用本地时区）
        today_records = []
        for r in records:
            if r.get('occurred_at'):
                utc_datetime = safe_parse_datetime(r['occurred_at'])
                if utc_datetime:
                    local_date = utc_to_local_date(utc_datetime)
                    if local_date == today:
                        today_records.append(r)
        
        today_count = len(today_records)
        today_duration = sum(r.get('duration_min', 0) or 0 for r in today_records)
        
        # 组装结果
        dashboard_data = {
            "period_days": days,
            "total_records": total_records,
            "total_duration_hours": round(total_duration / 60, 1) if total_duration else 0,
            "learning_days": learning_days,
            "streak_days": consecutive_days,
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

@router.get("/init", response_model=Dict[str, Any])
async def get_init_data(
    current_user_id: str = Depends(get_current_user_id)
):
    """聚合初始化API - 一次调用获取所有首页数据（优化版）"""
    
    # 检查缓存
    cache_key = get_cache_key(current_user_id, "init_data", "")
    cached_data = get_from_cache(cache_key)
    if cached_data:
        return cached_data
    
    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # 并行查询所有必要数据
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        def get_dashboard_data(days):
            """获取指定天数的仪表盘数据"""
            utc_start, utc_end = get_local_date_boundaries(days - 1)
            
            response = client.table('records')\
                .select('occurred_at, duration_min, form_type, difficulty, focus')\
                .eq('user_id', current_user_id)\
                .gte('occurred_at', utc_start.isoformat())\
                .lt('occurred_at', utc_end.isoformat())\
                .execute()
            
            records = response.data or []
            total_records = len(records)
            total_duration = sum(r.get('duration_min', 0) or 0 for r in records)
            
            # 计算学习天数
            learning_dates = set()
            for record in records:
                if record.get('occurred_at'):
                    utc_datetime = safe_parse_datetime(record['occurred_at'])
                    if utc_datetime:
                        local_date = utc_to_local_date(utc_datetime)
                        learning_dates.add(local_date)
            
            learning_days = len(learning_dates)
            
            # 计算平均分数
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
                {"type": k, "count": v['count'], "total_duration": v['duration']}
                for k, v in type_stats.items()
            ]
            
            # 注意: consecutive_days 在 init endpoint 中全局计算，这里不需要重复计算
            
            return {
                "period_days": days,
                "total_records": total_records,
                "total_duration_hours": round(total_duration / 60, 1) if total_duration else 0,
                "learning_days": learning_days,
                "avg_difficulty": round(avg_difficulty, 1),
                "avg_focus": round(avg_focus, 1),
                "daily_avg_duration": round(total_duration / max(learning_days, 1), 1) if total_duration else 0,
                "type_distribution": type_distribution,
                "learning_dates": [d.isoformat() for d in learning_dates]  # 序列化date对象
            }
        
        def get_recent_records():
            """获取最近记录"""
            # 先获取基础记录信息
            response = client.table('records')\
                .select('record_id, title, form_type, occurred_at, duration_min, resource_id')\
                .eq('user_id', current_user_id)\
                .order('occurred_at', desc=True)\
                .limit(20)\
                .execute()
            
            records = []
            resource_ids = []
            
            # 收集有resource_id的记录
            for record in response.data or []:
                records.append({
                    "record_id": record['record_id'],  # 使用record_id字段保持一致
                    "title": record['title'],
                    "form_type": record['form_type'],  # 使用form_type字段保持一致
                    "occurred_at": record['occurred_at'],
                    "duration_min": record.get('duration_min', 0),
                    "resource_id": record.get('resource_id'),
                    "tags": []
                })
                if record.get('resource_id'):
                    resource_ids.append(record['resource_id'])
            
            # 如果有resource_ids，批量获取标签
            if resource_ids:
                try:
                    # 获取资源标签关联
                    resource_tags_response = client.table('resource_tags')\
                        .select('resource_id, tag_id')\
                        .eq('user_id', current_user_id)\
                        .in_('resource_id', resource_ids)\
                        .execute()
                    
                    if resource_tags_response.data:
                        # 收集标签ID
                        tag_ids = list(set([rt['tag_id'] for rt in resource_tags_response.data]))
                        
                        if tag_ids:
                            # 获取标签详情
                            tags_response = client.table('tags')\
                                .select('tag_id, tag_name')\
                                .in_('tag_id', tag_ids)\
                                .execute()
                            
                            # 创建tag_id到name的映射
                            tag_map = {tag['tag_id']: tag['tag_name'] for tag in tags_response.data or []}
                            
                            # 创建resource_id到tags的映射
                            resource_tag_map = {}
                            for rt in resource_tags_response.data:
                                resource_id = rt['resource_id']
                                tag_name = tag_map.get(rt['tag_id'])
                                if tag_name:
                                    if resource_id not in resource_tag_map:
                                        resource_tag_map[resource_id] = []
                                    resource_tag_map[resource_id].append({
                                        'name': tag_name,
                                        'color': '#gray'  # 默认颜色，可以后续优化
                                    })
                            
                            # 为记录添加标签
                            for record in records:
                                if record['resource_id'] and record['resource_id'] in resource_tag_map:
                                    record['tags'] = resource_tag_map[record['resource_id']]
                                # 清除resource_id字段
                                del record['resource_id']
                
                except Exception as e:
                    print(f"获取标签失败: {e}")
                    # 继续处理，只是没有标签信息
            
            # 清除所有记录的resource_id字段
            for record in records:
                record.pop('resource_id', None)
            
            return records
        
        def get_form_types():
            """获取学习形式类型"""
            try:
                # 使用正确的表名：user_form_types
                response = client.table('user_form_types')\
                    .select('*')\
                    .eq('user_id', current_user_id)\
                    .order('display_order', desc=False)\
                    .order('type_id', desc=False)\
                    .execute()
                
                return response.data or []
                
            except Exception as e:
                print(f"获取表单类型失败: {e}")
                # 返回空列表，让前端使用默认值
                return []

        def get_user_profile():
            """获取用户资料"""
            try:
                response = client.table('profiles')\
                    .select('*')\
                    .eq('user_id', current_user_id)\
                    .limit(1)\
                    .execute()
                
                if response.data:
                    return response.data[0]
                else:
                    # 如果没有profile记录，返回基本信息
                    return {
                        'user_id': current_user_id,
                        'display_name': None,
                        'avatar_url': None
                    }
                
            except Exception as e:
                print(f"获取用户资料失败: {e}")
                return {
                    'user_id': current_user_id,
                    'display_name': None,
                    'avatar_url': None
                }
        
        # 使用线程池并行执行查询
        with ThreadPoolExecutor(max_workers=5) as executor:
            # 提交所有查询任务
            week_future = executor.submit(get_dashboard_data, 7)
            month_future = executor.submit(get_dashboard_data, 30)
            records_future = executor.submit(get_recent_records)
            form_types_future = executor.submit(get_form_types)
            profile_future = executor.submit(get_user_profile)
            
            # 等待所有任务完成
            week_summary = week_future.result()
            month_summary = month_future.result()
            recent_records = records_future.result()
            form_types = form_types_future.result()
            user_profile = profile_future.result()
        
        # 计算连续学习天数
        learning_dates_str = week_summary.get('learning_dates', [])
        # 将ISO字符串转换回date对象
        learning_dates = set()
        for date_str in learning_dates_str:
            try:
                learning_dates.add(datetime.fromisoformat(date_str).date())
            except (ValueError, AttributeError):
                continue
        
        consecutive_days = 0
        local_now = datetime.now(USER_TIMEZONE)
        today = local_now.date()
        yesterday = today - timedelta(days=1)
        
        # 调试日志
        print(f"🔍 连续天数计算调试:")
        print(f"   今天: {today}")
        print(f"   昨天: {yesterday}")
        print(f"   学习日期: {sorted(learning_dates)}")
        print(f"   今天在学习日期中: {today in learning_dates}")
        print(f"   昨天在学习日期中: {yesterday in learning_dates}")
        
        if today in learning_dates:
            check_date = today
            while check_date in learning_dates:
                consecutive_days += 1
                check_date = check_date - timedelta(days=1)
                print(f"   检查日期 {check_date}: 连续天数 = {consecutive_days}")
        elif yesterday in learning_dates:
            check_date = yesterday
            while check_date in learning_dates:
                consecutive_days += 1
                check_date = check_date - timedelta(days=1)
                print(f"   检查日期 {check_date}: 连续天数 = {consecutive_days}")
        
        print(f"   最终连续天数: {consecutive_days}")
        
        # 计算今日统计
        today_records = [r for r in recent_records if r.get('occurred_at') and utc_to_local_date(safe_parse_datetime(r['occurred_at'])) == today]
        today_count = len(today_records)
        today_duration = sum(r.get('duration_min', 0) for r in today_records)
        
        # 组装最终响应
        init_data = {
            "dashboard": {
                "week": {**week_summary, "streak_days": consecutive_days, "today": {"count": today_count, "duration_minutes": today_duration}},
                "month": {**month_summary, "streak_days": consecutive_days}
            },
            "recent_records": {
                "records": recent_records,
                "total": len(recent_records)
            },
            "form_types": form_types,
            "user_profile": user_profile,
            "cache_timestamp": datetime.now().isoformat()
        }
        
        # 缓存结果（3分钟）
        set_cache(cache_key, init_data, 180)
        
        return init_data
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch initialization data: {str(e)}"
        )