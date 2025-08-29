from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import random
from supabase import create_client
from app.core.config import settings
from app.core.auth import get_current_user_id
from app.schemas.form_type import FormTypeCreate, FormTypeResponse, FormTypeUpdate

router = APIRouter()

# Emoji pool for random assignment
EMOJI_POOL = [
    '🎯', '🎨', '🎭', '🎪', '🎬', '🎤', '🎸', '🎹', '🎺', '🎻',
    '🏀', '⚽', '🏈', '🎾', '🏐', '🎳', '🏓', '🏸', '🥊', '🥋',
    '🧘', '🤸', '🏄', '🏊', '🚴', '🧗', '🤺', '🏇', '⛷️', '🏂',
    '🎮', '🎲', '🧩', '♟️', '🎰', '🧸', '🪀', '🪁', '🛹', '🎪',
    '📖', '📊', '📈', '📉', '📝', '📋', '📌', '📍', '📎', '📏',
    '🔍', '🔎', '🔬', '🔭', '⚗️', '🧪', '🧮', '🔧', '🔨', '⚙️',
    '💡', '🔦', '🕯️', '🪔', '📡', '📻', '📺', '📱', '💻', '⌨️',
    '🎨', '🖌️', '🖊️', '✏️', '📐', '📏', '🖇️', '📎', '🔗', '📌'
]

def get_supabase_client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

@router.get("/form-types", response_model=List[FormTypeResponse])
async def get_user_form_types(user_id: str = Depends(get_current_user_id)):
    """Get all form types for the current user (default + custom)"""
    try:
        client = get_supabase_client()
        
        response = client.table('user_form_types').select('*').eq('user_id', user_id).order('display_order', desc=False).order('type_id', desc=False).execute()
        
        if not response.data:
            # If user has no form types, create default ones
            await create_default_form_types_for_user(user_id)
            # Retry the query
            response = client.table('user_form_types').select('*').eq('user_id', user_id).order('display_order', desc=False).order('type_id', desc=False).execute()
        
        return [FormTypeResponse(**item) for item in response.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch form types: {str(e)}")

@router.post("/form-types", response_model=FormTypeResponse)
async def create_form_type(
    form_type: FormTypeCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new custom form type"""
    try:
        client = get_supabase_client()
        
        # Check if type_code already exists for this user
        existing = client.table('user_form_types').select('type_id').eq('user_id', user_id).eq('type_code', form_type.type_code).execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Type code already exists for this user")
        
        # Assign random emoji if not provided
        emoji = form_type.emoji or random.choice(EMOJI_POOL)
        
        # Create the form type
        form_type_data = {
            'user_id': user_id,
            'type_code': form_type.type_code,
            'type_name': form_type.type_name,
            'emoji': emoji,
            'is_default': False,
            'display_order': form_type.display_order
        }
        
        response = client.table('user_form_types').insert(form_type_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create form type")
        
        return FormTypeResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create form type: {str(e)}")

@router.put("/form-types/{type_id}", response_model=FormTypeResponse)
async def update_form_type(
    type_id: int,
    form_type_update: FormTypeUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update a form type (only custom types can be updated)"""
    try:
        client = get_supabase_client()
        
        # Check if form type exists and belongs to user
        existing = client.table('user_form_types').select('*').eq('type_id', type_id).eq('user_id', user_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Form type not found")
        
        form_type = existing.data[0]
        if form_type['is_default']:
            raise HTTPException(status_code=400, detail="Cannot modify default form types")
        
        # Prepare update data
        update_data = {}
        if form_type_update.type_name is not None:
            update_data['type_name'] = form_type_update.type_name
        if form_type_update.emoji is not None:
            update_data['emoji'] = form_type_update.emoji
        if form_type_update.display_order is not None:
            update_data['display_order'] = form_type_update.display_order
        
        if not update_data:
            return FormTypeResponse(**form_type)
        
        # Update the form type
        response = client.table('user_form_types').update(update_data).eq('type_id', type_id).eq('user_id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update form type")
        
        return FormTypeResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update form type: {str(e)}")

@router.delete("/form-types/{type_id}")
async def delete_form_type(
    type_id: int,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a custom form type (default types cannot be deleted)"""
    try:
        client = get_supabase_client()
        
        # Check if form type exists and belongs to user
        existing = client.table('user_form_types').select('*').eq('type_id', type_id).eq('user_id', user_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Form type not found")
        
        form_type = existing.data[0]
        if form_type['is_default']:
            raise HTTPException(status_code=400, detail="Cannot delete default form types")
        
        # Check if this form type is being used in any records
        records = client.table('records').select('record_id').eq('user_id', user_id).eq('form_type', form_type['type_code']).limit(1).execute()
        
        if records.data:
            raise HTTPException(status_code=400, detail="Cannot delete form type that is being used in records")
        
        # Delete the form type
        response = client.table('user_form_types').delete().eq('type_id', type_id).eq('user_id', user_id).execute()
        
        return {"message": "Form type deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete form type: {str(e)}")

async def create_default_form_types_for_user(user_id: str):
    """Helper function to create default form types for a user"""
    client = get_supabase_client()
    
    default_types = [
        {'type_code': 'video', 'type_name': '视频', 'emoji': '📹', 'display_order': 1},
        {'type_code': 'podcast', 'type_name': '播客', 'emoji': '🎙️', 'display_order': 2},
        {'type_code': 'book', 'type_name': '书籍', 'emoji': '📚', 'display_order': 3},
        {'type_code': 'course', 'type_name': '课程', 'emoji': '🎓', 'display_order': 4},
        {'type_code': 'article', 'type_name': '文章', 'emoji': '📄', 'display_order': 5},
        {'type_code': 'exercise', 'type_name': '题目', 'emoji': '✏️', 'display_order': 6},
        {'type_code': 'project', 'type_name': '项目', 'emoji': '💻', 'display_order': 7},
        {'type_code': 'workout', 'type_name': '运动', 'emoji': '🏃', 'display_order': 8},
        {'type_code': 'paper', 'type_name': '论文', 'emoji': '📑', 'display_order': 9},
        {'type_code': 'other', 'type_name': '其他', 'emoji': '📌', 'display_order': 10}
    ]
    
    for default_type in default_types:
        default_type.update({
            'user_id': user_id,
            'is_default': True
        })
    
    try:
        client.table('user_form_types').insert(default_types).execute()
    except Exception as e:
        # Ignore conflicts (user might already have some default types)
        pass