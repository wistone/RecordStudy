from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_supabase_client
from models import RecordCreate, RecordResponse, RecordUpdate, RecordQuickNote, UserProfile, RecordType
from utils.auth_utils_supabase import get_current_user_supabase
import uuid
import re

router = APIRouter()

async def create_tags_if_not_exist(supabase, tag_names: List[str], user_id: str):
    """Create tags if they don't exist and return tag IDs"""
    tag_ids = []
    
    for tag_name in tag_names:
        tag_name = tag_name.strip().lower()
        if not tag_name:
            continue
            
        # Check if tag exists
        existing_tag = supabase.table("tags").select("*").eq("tag_name", tag_name).execute()
        
        if existing_tag.data:
            tag_id = existing_tag.data[0]["id"]
        else:
            # Create new tag
            new_tag = {
                "id": str(uuid.uuid4()),
                "tag_name": tag_name,
                "created_at": datetime.utcnow().isoformat(),
                "created_by": user_id
            }
            result = supabase.table("tags").insert(new_tag).execute()
            tag_id = result.data[0]["id"]
        
        tag_ids.append(tag_id)
    
    return tag_ids

def parse_quick_note(content: str) -> dict:
    """Parse quick note content and extract structured data"""
    # Simple parsing logic - can be enhanced with AI
    result = {
        "title": "",
        "record_type": "other",
        "tags": [],
        "duration_minutes": None,
        "resource_url": None,
        "summary": content
    }
    
    # Extract URL if present
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    urls = re.findall(url_pattern, content)
    if urls:
        result["resource_url"] = urls[0]
        # Guess type based on URL
        url = urls[0].lower()
        if any(domain in url for domain in ["youtube.com", "youtu.be", "bilibili.com"]):
            result["record_type"] = "video"
        elif any(domain in url for domain in ["spotify.com", "podcast"]):
            result["record_type"] = "podcast"
        elif any(domain in url for domain in ["github.com"]):
            result["record_type"] = "project"
    
    # Extract title from first line or URL title
    lines = content.strip().split('\n')
    if lines:
        first_line = lines[0].strip()
        if len(first_line) < 100:  # Reasonable title length
            result["title"] = first_line
    
    if not result["title"]:
        result["title"] = content[:50] + "..." if len(content) > 50 else content
    
    # Extract potential tags (words starting with #)
    hashtag_pattern = r'#(\w+)'
    hashtags = re.findall(hashtag_pattern, content)
    result["tags"].extend(hashtags)
    
    # Extract duration mentions (e.g., "30min", "1h", "2 hours")
    duration_pattern = r'(\d+)\s*(min|mins|minute|minutes|h|hr|hrs|hour|hours)'
    duration_matches = re.findall(duration_pattern, content.lower())
    if duration_matches:
        num, unit = duration_matches[0]
        num = int(num)
        if unit in ['h', 'hr', 'hrs', 'hour', 'hours']:
            result["duration_minutes"] = num * 60
        else:
            result["duration_minutes"] = num
    
    return result

@router.post("/", response_model=RecordResponse)
async def create_record(
    record_data: RecordCreate,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Create a new learning record"""
    supabase = get_supabase_client()
    
    try:
        # Create tags if they don't exist
        tag_ids = await create_tags_if_not_exist(supabase, record_data.tags, current_user.id)
        
        # Create record
        record_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        occurred_at = record_data.occurred_at.isoformat() if record_data.occurred_at else now
        
        new_record = {
            "id": record_id,
            "user_id": current_user.id,
            "title": record_data.title,
            "record_type": record_data.record_type.value,
            "duration_minutes": record_data.duration_minutes,
            "summary": record_data.summary,
            "content": record_data.content,
            "difficulty_rating": record_data.difficulty_rating,
            "focus_rating": record_data.focus_rating,
            "energy_rating": record_data.energy_rating,
            "occurred_at": occurred_at,
            "created_at": now,
            "updated_at": now,
            "status": record_data.status.value,
            "privacy": record_data.privacy.value
        }
        
        # Insert record
        record_result = supabase.table("records").insert(new_record).execute()
        
        if not record_result.data:
            raise HTTPException(status_code=500, detail="Failed to create record")
        
        created_record = record_result.data[0]
        
        # Create resource if URL provided
        resource_id = None
        if record_data.resource_url:
            resource_id = str(uuid.uuid4())
            new_resource = {
                "id": resource_id,
                "title": record_data.title,
                "url": record_data.resource_url,
                "created_at": now,
                "created_by": current_user.id
            }
            
            resource_result = supabase.table("resources").insert(new_resource).execute()
            
            if resource_result.data:
                # Link record to resource
                supabase.table("user_resources").insert({
                    "user_id": current_user.id,
                    "resource_id": resource_id,
                    "record_id": record_id,
                    "created_at": now
                }).execute()
        
        # Link tags to record
        if tag_ids:
            tag_links = []
            for tag_id in tag_ids:
                tag_links.append({
                    "record_id": record_id,
                    "tag_id": tag_id
                })
            
            if tag_links:
                supabase.table("record_tags").insert(tag_links).execute()
        
        # Return formatted response
        return RecordResponse(
            id=created_record["id"],
            user_id=created_record["user_id"],
            title=created_record["title"],
            record_type=RecordType(created_record["record_type"]),
            tags=record_data.tags,
            duration_minutes=created_record["duration_minutes"],
            summary=created_record["summary"],
            content=created_record["content"],
            difficulty_rating=created_record["difficulty_rating"],
            focus_rating=created_record["focus_rating"],
            energy_rating=created_record["energy_rating"],
            occurred_at=created_record["occurred_at"],
            created_at=created_record["created_at"],
            updated_at=created_record["updated_at"],
            resource_url=record_data.resource_url,
            status=created_record["status"],
            privacy=created_record["privacy"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create record: {str(e)}"
        )

@router.post("/quick-note", response_model=RecordResponse)
async def create_quick_note(
    quick_note: RecordQuickNote,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Create a record from quick note using AI parsing"""
    supabase = get_supabase_client()
    
    try:
        # Parse the quick note content
        parsed_data = parse_quick_note(quick_note.content)
        
        # Create a RecordCreate object
        record_data = RecordCreate(
            title=parsed_data["title"],
            record_type=RecordType(parsed_data["record_type"]),
            tags=parsed_data["tags"],
            duration_minutes=parsed_data["duration_minutes"],
            summary=parsed_data["summary"],
            content=quick_note.content,
            resource_url=parsed_data["resource_url"]
        )
        
        # Use the existing create_record logic
        return await create_record(record_data, current_user)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create quick note: {str(e)}"
        )

@router.get("/", response_model=List[RecordResponse])
async def get_records(
    current_user: UserProfile = Depends(get_current_user_supabase),
    record_type: Optional[RecordType] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0)
):
    """Get user's learning records with filtering"""
    supabase = get_supabase_client()
    
    try:
        # Build query
        query = supabase.table("records").select("""
            *,
            record_tags(
                tag:tags(tag_name)
            )
        """).eq("user_id", current_user.id).order("occurred_at", desc=True)
        
        # Apply filters
        if record_type:
            query = query.eq("record_type", record_type.value)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        records = []
        for record_data in result.data:
            # Extract tags
            tags = []
            if record_data.get("record_tags"):
                tags = [rt["tag"]["tag_name"] for rt in record_data["record_tags"]]
            
            # Search filter (if provided)
            if search:
                search_text = f"{record_data['title']} {record_data.get('summary', '')} {' '.join(tags)}".lower()
                if search.lower() not in search_text:
                    continue
            
            records.append(RecordResponse(
                id=record_data["id"],
                user_id=record_data["user_id"],
                title=record_data["title"],
                record_type=RecordType(record_data["record_type"]),
                tags=tags,
                duration_minutes=record_data["duration_minutes"],
                summary=record_data["summary"],
                content=record_data["content"],
                difficulty_rating=record_data["difficulty_rating"],
                focus_rating=record_data["focus_rating"],
                energy_rating=record_data["energy_rating"],
                occurred_at=record_data["occurred_at"],
                created_at=record_data["created_at"],
                updated_at=record_data["updated_at"],
                resource_url=record_data.get("resource_url"),
                status=record_data["status"],
                privacy=record_data["privacy"]
            ))
        
        return records
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve records: {str(e)}"
        )

@router.get("/{record_id}", response_model=RecordResponse)
async def get_record(
    record_id: str,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Get a specific record"""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("records").select("""
            *,
            record_tags(
                tag:tags(tag_name)
            )
        """).eq("id", record_id).eq("user_id", current_user.id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Record not found")
        
        record_data = result.data
        
        # Extract tags
        tags = []
        if record_data.get("record_tags"):
            tags = [rt["tag"]["tag_name"] for rt in record_data["record_tags"]]
        
        return RecordResponse(
            id=record_data["id"],
            user_id=record_data["user_id"],
            title=record_data["title"],
            record_type=RecordType(record_data["record_type"]),
            tags=tags,
            duration_minutes=record_data["duration_minutes"],
            summary=record_data["summary"],
            content=record_data["content"],
            difficulty_rating=record_data["difficulty_rating"],
            focus_rating=record_data["focus_rating"],
            energy_rating=record_data["energy_rating"],
            occurred_at=record_data["occurred_at"],
            created_at=record_data["created_at"],
            updated_at=record_data["updated_at"],
            resource_url=record_data.get("resource_url"),
            status=record_data["status"],
            privacy=record_data["privacy"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve record: {str(e)}"
        )

@router.put("/{record_id}", response_model=RecordResponse)
async def update_record(
    record_id: str,
    update_data: RecordUpdate,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Update a learning record"""
    supabase = get_supabase_client()
    
    try:
        # Check if record exists and belongs to user
        existing_record = supabase.table("records").select("*").eq("id", record_id).eq("user_id", current_user.id).single().execute()
        
        if not existing_record.data:
            raise HTTPException(status_code=404, detail="Record not found")
        
        # Prepare update data
        update_fields = {}
        for field, value in update_data.dict(exclude_unset=True).items():
            if field == "tags":
                continue  # Handle tags separately
            elif field in ["record_type", "status", "privacy"]:
                update_fields[field] = value.value if value else None
            else:
                update_fields[field] = value
        
        if update_fields:
            update_fields["updated_at"] = datetime.utcnow().isoformat()
            
            # Update record
            result = supabase.table("records").update(update_fields).eq("id", record_id).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="Failed to update record")
        
        # Handle tags update if provided
        if update_data.tags is not None:
            # Remove existing tags
            supabase.table("record_tags").delete().eq("record_id", record_id).execute()
            
            # Add new tags
            if update_data.tags:
                tag_ids = await create_tags_if_not_exist(supabase, update_data.tags, current_user.id)
                
                tag_links = []
                for tag_id in tag_ids:
                    tag_links.append({
                        "record_id": record_id,
                        "tag_id": tag_id
                    })
                
                if tag_links:
                    supabase.table("record_tags").insert(tag_links).execute()
        
        # Return updated record
        return await get_record(record_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update record: {str(e)}"
        )

@router.delete("/{record_id}")
async def delete_record(
    record_id: str,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Delete a learning record"""
    supabase = get_supabase_client()
    
    try:
        # Check if record exists and belongs to user
        existing_record = supabase.table("records").select("*").eq("id", record_id).eq("user_id", current_user.id).single().execute()
        
        if not existing_record.data:
            raise HTTPException(status_code=404, detail="Record not found")
        
        # Delete related data first (due to foreign key constraints)
        supabase.table("record_tags").delete().eq("record_id", record_id).execute()
        supabase.table("user_resources").delete().eq("record_id", record_id).execute()
        
        # Delete the record
        supabase.table("records").delete().eq("id", record_id).execute()
        
        return {"message": "Record deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete record: {str(e)}"
        )