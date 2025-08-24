from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from database import get_supabase_client
from models import TagResponse, TagCreate, UserProfile
from utils.auth_utils_supabase import get_current_user_supabase
import uuid

router = APIRouter()

@router.get("/", response_model=List[TagResponse])
async def get_tags(
    current_user: UserProfile = Depends(get_current_user_supabase),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    """Get user's tags with usage statistics"""
    supabase = get_supabase_client()
    
    try:
        # Get all tags with their usage count for the current user
        query = """
            SELECT 
                t.id,
                t.tag_name,
                t.created_at,
                t.created_by,
                COUNT(rt.tag_id) as usage_count
            FROM tags t
            LEFT JOIN record_tags rt ON t.id = rt.tag_id
            LEFT JOIN records r ON rt.record_id = r.id
            WHERE (t.created_by = %s OR r.user_id = %s)
            GROUP BY t.id, t.tag_name, t.created_at, t.created_by
            ORDER BY usage_count DESC, t.tag_name ASC
        """
        
        # Note: Supabase Python client doesn't support raw SQL with parameters
        # Using a workaround with RPC or simplified query
        
        # Simplified approach: get tags and calculate usage separately
        result = supabase.table("tags").select("*").order("tag_name").limit(limit).execute()
        
        tags = []
        for tag_data in result.data:
            # Count usage for this user
            usage_result = supabase.table("record_tags").select("""
                record:records(user_id)
            """).eq("tag_id", tag_data["id"]).execute()
            
            user_usage = sum(1 for item in usage_result.data 
                           if item.get("record") and item["record"]["user_id"] == current_user.id)
            
            # Apply search filter
            if search and search.lower() not in tag_data["tag_name"].lower():
                continue
            
            tags.append(TagResponse(
                id=tag_data["id"],
                tag_name=tag_data["tag_name"],
                usage_count=user_usage,
                created_at=tag_data["created_at"],
                created_by=tag_data.get("created_by")
            ))
        
        # Sort by usage count (descending) then by name
        tags.sort(key=lambda x: (-x.usage_count, x.tag_name))
        
        return tags[:limit]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve tags: {str(e)}"
        )

@router.get("/suggestions")
async def get_tag_suggestions(
    current_user: UserProfile = Depends(get_current_user_supabase),
    query: str = Query(..., min_length=1),
    limit: int = Query(10, le=20)
):
    """Get tag suggestions based on query"""
    supabase = get_supabase_client()
    
    try:
        # Search for similar tags
        # Using ilike for case-insensitive search
        result = supabase.table("tags").select("*").ilike(
            "tag_name", f"%{query}%"
        ).order("tag_name").limit(limit).execute()
        
        suggestions = []
        for tag_data in result.data:
            # Check if user has used this tag
            usage_result = supabase.table("record_tags").select("""
                record:records(user_id)
            """).eq("tag_id", tag_data["id"]).execute()
            
            user_usage = sum(1 for item in usage_result.data 
                           if item.get("record") and item["record"]["user_id"] == current_user.id)
            
            suggestions.append({
                "tag_name": tag_data["tag_name"],
                "usage_count": user_usage,
                "is_used": user_usage > 0
            })
        
        # Add common tags if not found
        common_tags = [
            "英语", "编程", "AI", "数学", "历史", "物理", "化学", 
            "经济", "心理学", "设计", "音乐", "运动", "健身", "读书"
        ]
        
        existing_tags = {s["tag_name"] for s in suggestions}
        
        for common_tag in common_tags:
            if (common_tag.lower().startswith(query.lower()) or 
                query.lower() in common_tag.lower()) and \
               common_tag not in existing_tags:
                suggestions.append({
                    "tag_name": common_tag,
                    "usage_count": 0,
                    "is_used": False
                })
        
        # Sort by relevance (exact match first, then by usage, then alphabetically)
        def sort_key(item):
            exact_match = item["tag_name"].lower() == query.lower()
            starts_with = item["tag_name"].lower().startswith(query.lower())
            return (not exact_match, not starts_with, -item["usage_count"], item["tag_name"])
        
        suggestions.sort(key=sort_key)
        
        return {"suggestions": suggestions[:limit]}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get tag suggestions: {str(e)}"
        )

@router.post("/", response_model=TagResponse)
async def create_tag(
    tag_data: TagCreate,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Create a new tag"""
    supabase = get_supabase_client()
    
    try:
        tag_name = tag_data.tag_name.strip().lower()
        
        if not tag_name:
            raise HTTPException(status_code=400, detail="Tag name cannot be empty")
        
        # Check if tag already exists
        existing_tag = supabase.table("tags").select("*").eq("tag_name", tag_name).execute()
        
        if existing_tag.data:
            # Return existing tag
            tag = existing_tag.data[0]
            return TagResponse(
                id=tag["id"],
                tag_name=tag["tag_name"],
                usage_count=0,  # Will be calculated separately if needed
                created_at=tag["created_at"],
                created_by=tag.get("created_by")
            )
        
        # Create new tag
        tag_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        new_tag = {
            "id": tag_id,
            "tag_name": tag_name,
            "created_at": now,
            "created_by": current_user.id
        }
        
        result = supabase.table("tags").insert(new_tag).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create tag")
        
        created_tag = result.data[0]
        
        return TagResponse(
            id=created_tag["id"],
            tag_name=created_tag["tag_name"],
            usage_count=0,
            created_at=created_tag["created_at"],
            created_by=created_tag["created_by"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create tag: {str(e)}"
        )

@router.get("/popular")
async def get_popular_tags(
    current_user: UserProfile = Depends(get_current_user_supabase),
    limit: int = Query(20, le=50)
):
    """Get popular tags for the current user"""
    supabase = get_supabase_client()
    
    try:
        # Get user's most used tags from their records
        result = supabase.table("record_tags").select("""
            tag:tags(id, tag_name),
            record:records!inner(user_id)
        """).eq("record.user_id", current_user.id).execute()
        
        tag_counts = {}
        for item in result.data:
            if item.get("tag"):
                tag_name = item["tag"]["tag_name"]
                tag_counts[tag_name] = tag_counts.get(tag_name, 0) + 1
        
        # Sort by count and return top tags
        popular_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        return {
            "popular_tags": [
                {"tag_name": tag_name, "count": count} 
                for tag_name, count in popular_tags
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get popular tags: {str(e)}"
        )