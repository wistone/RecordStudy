from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any
from datetime import datetime, timedelta
from database import get_supabase_client
from models import AnalyticsResponse, PeriodStats, TypeStats, SummaryResponse, UserProfile, ChartDataRequest
from utils.auth_utils_supabase import get_current_user_supabase
import calendar

router = APIRouter()

def get_date_range(period: str) -> tuple[datetime, datetime]:
    """Get date range for the specified period"""
    now = datetime.utcnow()
    
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:
        raise ValueError("Invalid period. Must be 'week', 'month', or 'year'")
    
    return start_date, now

def calculate_streak(records: List[Dict]) -> int:
    """Calculate current learning streak in days"""
    if not records:
        return 0
    
    # Sort records by date (most recent first)
    sorted_records = sorted(records, key=lambda x: x["occurred_at"], reverse=True)
    
    # Get unique dates
    unique_dates = set()
    for record in sorted_records:
        date_str = record["occurred_at"][:10]  # YYYY-MM-DD
        unique_dates.add(date_str)
    
    unique_dates = sorted(list(unique_dates), reverse=True)
    
    if not unique_dates:
        return 0
    
    # Check if today has records
    today = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Start counting from today or yesterday
    if unique_dates[0] == today:
        streak = 1
        start_index = 1
    elif unique_dates[0] == yesterday:
        streak = 1
        start_index = 1
    else:
        return 0
    
    # Count consecutive days
    for i in range(start_index, len(unique_dates)):
        expected_date = (datetime.strptime(unique_dates[i-1], "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
        if unique_dates[i] == expected_date:
            streak += 1
        else:
            break
    
    return streak

@router.get("/dashboard", response_model=AnalyticsResponse)
async def get_dashboard_analytics(current_user: UserProfile = Depends(get_current_user_supabase)):
    """Get comprehensive analytics for dashboard"""
    supabase = get_supabase_client()
    
    try:
        # Get all records for the user
        all_records = supabase.table("records").select("""
            *,
            record_tags(
                tag:tags(tag_name)
            )
        """).eq("user_id", current_user.id).execute()
        
        records = all_records.data or []
        
        # Calculate date ranges
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)
        month_start = now - timedelta(days=30)
        
        # Helper function to filter records by date
        def filter_by_date(records, start_date, end_date=None):
            if end_date is None:
                end_date = now
            return [r for r in records if start_date <= datetime.fromisoformat(r["occurred_at"].replace('Z', '+00:00')) <= end_date]
        
        # Today's stats
        today_records = filter_by_date(records, today_start)
        today_duration = sum(r.get("duration_minutes", 0) or 0 for r in today_records)
        
        # Week's stats
        week_records = filter_by_date(records, week_start)
        week_duration = sum(r.get("duration_minutes", 0) or 0 for r in week_records)
        week_unique_days = len(set(r["occurred_at"][:10] for r in week_records))
        
        # Month's stats
        month_records = filter_by_date(records, month_start)
        month_duration = sum(r.get("duration_minutes", 0) or 0 for r in month_records)
        
        # Calculate streak
        streak_days = calculate_streak(records)
        
        # Type distribution
        type_counts = {}
        type_durations = {}
        
        for record in month_records:
            record_type = record["record_type"]
            duration = record.get("duration_minutes", 0) or 0
            
            type_counts[record_type] = type_counts.get(record_type, 0) + 1
            type_durations[record_type] = type_durations.get(record_type, 0) + duration
        
        total_month_duration = sum(type_durations.values())
        
        type_stats = []
        for record_type, count in type_counts.items():
            duration = type_durations[record_type]
            percentage = (duration / total_month_duration * 100) if total_month_duration > 0 else 0
            
            type_stats.append(TypeStats(
                record_type=record_type,
                count=count,
                duration=duration,
                percentage=round(percentage, 1)
            ))
        
        type_stats.sort(key=lambda x: x.duration, reverse=True)
        
        # Popular tags
        tag_counts = {}
        for record in month_records:
            if record.get("record_tags"):
                for rt in record["record_tags"]:
                    tag_name = rt["tag"]["tag_name"]
                    tag_counts[tag_name] = tag_counts.get(tag_name, 0) + 1
        
        popular_tags = [{"name": tag, "count": count} for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]]
        
        # Chart data (placeholder for now)
        chart_data = {
            "week": [],
            "month": [],
            "year": []
        }
        
        return AnalyticsResponse(
            today=PeriodStats(
                total_duration=today_duration,
                total_records=len(today_records),
                active_days=1 if today_records else 0,
                streak_days=streak_days
            ),
            week=PeriodStats(
                total_duration=week_duration,
                total_records=len(week_records),
                active_days=week_unique_days,
                streak_days=streak_days
            ),
            month=PeriodStats(
                total_duration=month_duration,
                total_records=len(month_records),
                active_days=len(set(r["occurred_at"][:10] for r in month_records)),
                streak_days=streak_days
            ),
            type_distribution=type_stats,
            popular_tags=popular_tags,
            chart_data=chart_data
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get analytics: {str(e)}"
        )

@router.post("/chart-data")
async def get_chart_data(
    request: ChartDataRequest,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Get chart data for specified period"""
    supabase = get_supabase_client()
    
    try:
        # Get records for the period
        start_date, end_date = get_date_range(request.period)
        
        result = supabase.table("records").select("occurred_at, duration_minutes").eq(
            "user_id", current_user.id
        ).gte("occurred_at", start_date.isoformat()).lte("occurred_at", end_date.isoformat()).execute()
        
        records = result.data or []
        
        # Group data by time periods
        chart_data = []
        
        if request.period == "week":
            # Group by days for past 7 days
            for i in range(7):
                date = (datetime.utcnow() - timedelta(days=6-i)).strftime("%Y-%m-%d")
                day_records = [r for r in records if r["occurred_at"][:10] == date]
                total_duration = sum(r.get("duration_minutes", 0) or 0 for r in day_records)
                
                chart_data.append({
                    "date": date,
                    "label": (datetime.utcnow() - timedelta(days=6-i)).strftime("%m/%d"),
                    "value": total_duration
                })
        
        elif request.period == "month":
            # Group by days for past 30 days
            for i in range(30):
                date = (datetime.utcnow() - timedelta(days=29-i)).strftime("%Y-%m-%d")
                day_records = [r for r in records if r["occurred_at"][:10] == date]
                total_duration = sum(r.get("duration_minutes", 0) or 0 for r in day_records)
                
                chart_data.append({
                    "date": date,
                    "label": (datetime.utcnow() - timedelta(days=29-i)).strftime("%m/%d"),
                    "value": total_duration
                })
        
        elif request.period == "year":
            # Group by months for past 12 months
            for i in range(12):
                target_date = datetime.utcnow() - timedelta(days=30*(11-i))
                year_month = target_date.strftime("%Y-%m")
                
                month_records = [r for r in records if r["occurred_at"][:7] == year_month]
                total_duration = sum(r.get("duration_minutes", 0) or 0 for r in month_records)
                
                chart_data.append({
                    "date": year_month,
                    "label": target_date.strftime("%m月"),
                    "value": total_duration
                })
        
        return {"chart_data": chart_data}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get chart data: {str(e)}"
        )

@router.get("/summary", response_model=SummaryResponse)
async def get_ai_summary(current_user: UserProfile = Depends(get_current_user_supabase)):
    """Get AI-generated summary and insights"""
    supabase = get_supabase_client()
    
    try:
        # Get recent records (last 30 days)
        start_date = datetime.utcnow() - timedelta(days=30)
        
        result = supabase.table("records").select("""
            *,
            record_tags(
                tag:tags(tag_name)
            )
        """).eq("user_id", current_user.id).gte("occurred_at", start_date.isoformat()).execute()
        
        records = result.data or []
        
        if not records:
            return SummaryResponse(
                trend_insight="暂无学习数据，开始记录你的学习之旅吧！",
                focus_insight="还没有发现你的学习重点，多记录一些内容来获得个性化建议",
                strength_insight="继续记录学习过程，我们会分析出你的学习优势",
                next_action="开始记录第一个学习内容，可以是看视频、读书或练习题目"
            )
        
        # Calculate basic stats for insights
        total_duration = sum(r.get("duration_minutes", 0) or 0 for r in records)
        total_records = len(records)
        
        # Analyze types
        type_counts = {}
        type_durations = {}
        for record in records:
            record_type = record["record_type"]
            duration = record.get("duration_minutes", 0) or 0
            
            type_counts[record_type] = type_counts.get(record_type, 0) + 1
            type_durations[record_type] = type_durations.get(record_type, 0) + duration
        
        # Find dominant type
        if type_durations:
            dominant_type = max(type_durations.items(), key=lambda x: x[1])
            dominant_percentage = (dominant_type[1] / total_duration * 100) if total_duration > 0 else 0
        
        # Analyze tags
        tag_counts = {}
        for record in records:
            if record.get("record_tags"):
                for rt in record["record_tags"]:
                    tag_name = rt["tag"]["tag_name"]
                    tag_counts[tag_name] = tag_counts.get(tag_name, 0) + 1
        
        top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Analyze ratings
        focus_ratings = [r["focus_rating"] for r in records if r.get("focus_rating")]
        avg_focus = sum(focus_ratings) / len(focus_ratings) if focus_ratings else 0
        
        # Generate insights
        type_map = {
            "video": "视频",
            "book": "书籍",
            "course": "课程",
            "podcast": "播客",
            "article": "文章",
            "exercise": "题目",
            "project": "项目",
            "workout": "运动",
            "other": "其他"
        }
        
        # Trend insight
        if total_duration >= 300:  # 5 hours
            trend_insight = f"本月学习时长达到{total_duration//60}小时{total_duration%60}分钟，保持良好学习势头！"
        elif total_duration >= 60:  # 1 hour
            trend_insight = f"本月学习时长{total_duration}分钟，可以适当增加学习时间"
        else:
            trend_insight = "学习时长较少，建议制定规律的学习计划"
        
        # Focus insight
        if top_tags:
            top_tag_names = "、".join([tag[0] for tag in top_tags])
            focus_insight = f"{top_tag_names}是你的主要学习方向，专注度很好！"
        else:
            focus_insight = "尝试给学习内容添加标签，有助于分析学习方向"
        
        # Strength insight
        if type_durations and dominant_percentage > 50:
            dominant_type_name = type_map.get(dominant_type[0], dominant_type[0])
            if avg_focus >= 4:
                strength_insight = f"{dominant_type_name}学习效率最高，平均专注度达到{avg_focus:.1f}/5"
            else:
                strength_insight = f"最喜欢通过{dominant_type_name}学习，占总时长的{dominant_percentage:.0f}%"
        else:
            strength_insight = "学习形式多样化，这有助于保持学习兴趣"
        
        # Next action
        if total_records < 5:
            next_action = "继续记录更多学习内容，以便获得更准确的分析和建议"
        elif avg_focus < 3:
            next_action = "可以尝试调整学习环境或方法，提高学习专注度"
        else:
            next_action = "学习状态很好，建议定期复习之前的内容，巩固学习成果"
        
        return SummaryResponse(
            trend_insight=trend_insight,
            focus_insight=focus_insight,
            strength_insight=strength_insight,
            next_action=next_action
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )