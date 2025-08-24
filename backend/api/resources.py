from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from database import get_supabase_client
from models import ResourceCreate, ResourceResponse, UserProfile
from utils.auth_utils_supabase import get_current_user_supabase
import uuid

router = APIRouter()

@router.post("/", response_model=ResourceResponse)
async def create_resource(
    resource_data: ResourceCreate,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Create a new learning resource"""
    supabase = get_supabase_client()
    
    try:
        # Create resource
        resource_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        new_resource = {
            "id": resource_id,
            "title": resource_data.title,
            "url": resource_data.url,
            "platform": resource_data.platform,
            "author": resource_data.author,
            "description": resource_data.description,
            "created_at": now,
            "created_by": current_user.id
        }
        
        # Insert resource
        result = supabase.table("resources").insert(new_resource).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create resource")
        
        created_resource = result.data[0]
        
        # Handle tags if provided
        if resource_data.tags:
            # Create tags if they don't exist
            tag_ids = []
            for tag_name in resource_data.tags:
                tag_name = tag_name.strip().lower()
                if not tag_name:
                    continue
                    
                # Check if tag exists
                existing_tag = supabase.table("tags").select("*").eq("tag_name", tag_name).execute()
                
                if existing_tag.data:
                    tag_id = existing_tag.data[0]["id"]
                else:
                    # Create new tag
                    tag_id = str(uuid.uuid4())
                    new_tag = {
                        "id": tag_id,
                        "tag_name": tag_name,
                        "created_at": now,
                        "created_by": current_user.id
                    }
                    supabase.table("tags").insert(new_tag).execute()
                
                tag_ids.append(tag_id)
            
            # Link tags to resource
            if tag_ids:
                tag_links = []
                for tag_id in tag_ids:
                    tag_links.append({
                        "resource_id": resource_id,
                        "tag_id": tag_id
                    })
                
                supabase.table("resource_tags").insert(tag_links).execute()
        
        return ResourceResponse(
            id=created_resource["id"],
            title=created_resource["title"],
            url=created_resource["url"],
            platform=created_resource["platform"],
            author=created_resource["author"],
            description=created_resource["description"],
            tags=resource_data.tags or [],
            created_at=created_resource["created_at"],
            created_by=created_resource["created_by"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create resource: {str(e)}"
        )

@router.get("/", response_model=List[ResourceResponse])
async def get_resources(
    current_user: UserProfile = Depends(get_current_user_supabase),
    search: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0)
):
    """Get user's learning resources"""
    supabase = get_supabase_client()
    
    try:
        # Build query to get user's resources
        query = supabase.table("user_resources").select("""
            resource:resources(
                *,
                resource_tags(
                    tag:tags(tag_name)
                )
            )
        """).eq("user_id", current_user.id).order("created_at", desc=True)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        resources = []
        for item in result.data:
            resource_data = item["resource"]
            if not resource_data:
                continue
            
            # Extract tags
            tags = []
            if resource_data.get("resource_tags"):
                tags = [rt["tag"]["tag_name"] for rt in resource_data["resource_tags"]]
            
            # Apply search filter
            if search:
                search_text = f"{resource_data['title']} {resource_data.get('description', '')} {resource_data.get('author', '')} {' '.join(tags)}".lower()
                if search.lower() not in search_text:
                    continue
            
            # Apply platform filter
            if platform and resource_data.get("platform") != platform:
                continue
            
            resources.append(ResourceResponse(
                id=resource_data["id"],
                title=resource_data["title"],
                url=resource_data["url"],
                platform=resource_data["platform"],
                author=resource_data["author"],
                description=resource_data["description"],
                tags=tags,
                created_at=resource_data["created_at"],
                created_by=resource_data["created_by"]
            ))
        
        return resources
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve resources: {str(e)}"
        )

@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(
    resource_id: str,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Get a specific resource"""
    supabase = get_supabase_client()
    
    try:
        # Check if user has access to this resource
        access_check = supabase.table("user_resources").select("*").eq(
            "user_id", current_user.id
        ).eq("resource_id", resource_id).execute()
        
        if not access_check.data:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        # Get resource details
        result = supabase.table("resources").select("""
            *,
            resource_tags(
                tag:tags(tag_name)
            )
        """).eq("id", resource_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        resource_data = result.data
        
        # Extract tags
        tags = []
        if resource_data.get("resource_tags"):
            tags = [rt["tag"]["tag_name"] for rt in resource_data["resource_tags"]]
        
        return ResourceResponse(
            id=resource_data["id"],
            title=resource_data["title"],
            url=resource_data["url"],
            platform=resource_data["platform"],
            author=resource_data["author"],
            description=resource_data["description"],
            tags=tags,
            created_at=resource_data["created_at"],
            created_by=resource_data["created_by"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve resource: {str(e)}"
        )

@router.delete("/{resource_id}")
async def delete_resource(
    resource_id: str,
    current_user: UserProfile = Depends(get_current_user_supabase)
):
    """Delete a learning resource (removes from user's collection)"""
    supabase = get_supabase_client()
    
    try:
        # Check if user has access to this resource
        access_check = supabase.table("user_resources").select("*").eq(
            "user_id", current_user.id
        ).eq("resource_id", resource_id).execute()
        
        if not access_check.data:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        # Remove from user's collection
        supabase.table("user_resources").delete().eq(
            "user_id", current_user.id
        ).eq("resource_id", resource_id).execute()
        
        return {"message": "Resource removed from collection"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete resource: {str(e)}"
        )