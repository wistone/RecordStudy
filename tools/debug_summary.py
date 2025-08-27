#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.config import settings
from app.api.summaries import safe_parse_datetime
from supabase import create_client
from datetime import datetime, timedelta, date

def debug_summary_calculation():
    """调试汇总计算逻辑"""
    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        user_id = '6d45fa47-7935-4673-ac25-bc39ca3f3481'
        days = 7
        
        print(f"🔍 调试最近{days}天的汇总计算")
        print(f"📅 今天: {date.today()}")
        print(f"🕒 现在时间: {datetime.now()}")
        
        # 1. 获取数据
        start_date = datetime.now() - timedelta(days=days)
        print(f"📆 查询起始时间: {start_date}")
        
        response = client.table('records')\
            .select('occurred_at, duration_min, form_type, difficulty, focus')\
            .eq('user_id', user_id)\
            .gte('occurred_at', start_date.isoformat())\
            .execute()
        
        records = response.data or []
        print(f"📊 查询到记录数: {len(records)}")
        
        # 2. 计算总时长
        total_duration = sum(r.get('duration_min', 0) or 0 for r in records)
        print(f"⏱️ 总时长: {total_duration}分钟 ({total_duration/60:.1f}小时)")
        
        # 3. 计算学习天数 - 详细调试
        learning_dates = set()
        print("\n📋 逐条记录处理:")
        
        for i, record in enumerate(records):
            occurred_at = record.get('occurred_at')
            duration = record.get('duration_min', 0) or 0
            
            if occurred_at:
                parsed_date = safe_parse_datetime(occurred_at)
                if parsed_date:
                    date_part = parsed_date.date()
                    learning_dates.add(date_part)
                    print(f"  {i+1:2d}. {occurred_at} -> {date_part} ({duration}分钟)")
                else:
                    print(f"  {i+1:2d}. ❌ 日期解析失败: {occurred_at}")
            else:
                print(f"  {i+1:2d}. ❌ 没有occurred_at字段")
        
        learning_days = len(learning_dates)
        print(f"\n📅 唯一学习日期: {sorted(learning_dates)}")
        print(f"📆 学习天数: {learning_days}")
        
        # 4. 计算连续天数（更智能的逻辑）
        streak_days = 0
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        print(f"\n🔥 连续天数计算 (智能逻辑):")
        print(f"  今天: {today} - {'✅有记录' if today in learning_dates else '❌无记录'}")
        print(f"  昨天: {yesterday} - {'✅有记录' if yesterday in learning_dates else '❌无记录'}")
        
        # 如果今天有记录，从今天开始计算连续天数
        if today in learning_dates:
            print("  策略: 从今天开始计算连续天数")
            check_date = today
            while check_date in learning_dates:
                streak_days += 1
                print(f"    {check_date}: ✅ (连续{streak_days}天)")
                check_date = check_date - timedelta(days=1)
        # 如果今天没有记录但昨天有记录，连续天数为0（今天断了）
        elif yesterday in learning_dates:
            print("  策略: 今天断了连击，连续天数为0")
            streak_days = 0
        # 如果今天和昨天都没有记录，检查是否有其他连续的学习天数
        else:
            print("  策略: 今天和昨天都没记录，检查最近的连续天数")
            # 找到最近的学习日期
            if learning_dates:
                recent_dates = sorted(learning_dates, reverse=True)
                latest_date = recent_dates[0]
                print(f"    最近学习日期: {latest_date}")
                
                # 如果最近的学习日期距离今天超过1天，连续天数为0
                days_since_latest = (today - latest_date).days
                print(f"    距今天相差: {days_since_latest}天")
                if days_since_latest > 1:
                    print("    距离超过1天，连续天数为0")
                    streak_days = 0
                else:
                    # 从最近的日期开始计算连续天数
                    print(f"    从{latest_date}开始计算连续天数:")
                    check_date = latest_date
                    while check_date in learning_dates:
                        streak_days += 1
                        print(f"      {check_date}: ✅ (连续{streak_days}天)")
                        check_date = check_date - timedelta(days=1)
        
        print(f"🎯 最终连续天数: {streak_days}")
        
        # 5. 今日统计
        today_records = []
        for r in records:
            if r.get('occurred_at'):
                record_date = safe_parse_datetime(r['occurred_at'])
                if record_date and record_date.date() == today:
                    today_records.append(r)
        
        today_count = len(today_records)
        today_duration = sum(r.get('duration_min', 0) or 0 for r in today_records)
        
        print(f"\n📝 今日统计:")
        print(f"  记录数: {today_count}")
        print(f"  时长: {today_duration}分钟")
        
        # 6. 对比期望值
        print(f"\n📊 结果对比:")
        print(f"  时长: {total_duration/60:.1f}小时 (页面显示: 11.2小时)")
        print(f"  学习天数: {learning_days}天 (页面显示: 6天)")
        print(f"  连续天数: {streak_days}天 (页面显示: 0天)")
        
        if total_duration/60 != 11.2:
            print("  ⚠️ 时长不匹配!")
        if learning_days != 6:
            print("  ⚠️ 学习天数不匹配!")
            
    except Exception as e:
        print(f"❌ 调试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_summary_calculation()