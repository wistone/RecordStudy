from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from supabase import create_client
from app.core.config import settings
from app.core.auth import get_current_user_id
from app.schemas.record_template import RecordTemplateCreate, RecordTemplateUpdate
from .records import (
    get_valid_resource_type,
    create_or_find_resource,
    process_tags_for_resource,
    update_record_tags,
)

router = APIRouter()


def get_supabase_client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


async def get_template_tags(client, template: dict, user_id: str) -> List[str]:
    """Fetch associated tag names for a template via resource relations."""
    if not template.get("resource_id"):
        return []

    try:
        resource_tags_response = client.table("resource_tags")\
            .select("tag_id")\
            .eq("user_id", user_id)\
            .eq("resource_id", template["resource_id"])\
            .execute()

        if not resource_tags_response.data:
            return []

        tag_ids = [rt["tag_id"] for rt in resource_tags_response.data]
        if not tag_ids:
            return []

        tags_response = client.table("tags")\
            .select("tag_name")\
            .in_("tag_id", tag_ids)\
            .execute()

        if not tags_response.data:
            return []

        return [tag["tag_name"] for tag in tags_response.data]
    except Exception as tag_error:
        print(f"获取模板标签失败: {tag_error}")
        return []


async def get_template_detail(client, template_id: int, user_id: str) -> Optional[dict]:
    """Assemble template detail with resource and tags information."""
    template_response = client.table("record_templates")\
        .select("*")\
        .eq("template_id", template_id)\
        .eq("user_id", user_id)\
        .execute()

    if not template_response.data:
        return None

    template = template_response.data[0]
    detail = dict(template)

    # Resource info
    resource_info = None
    if template.get("resource_id"):
        resource_response = client.table("resources")\
            .select("*")\
            .eq("resource_id", template["resource_id"])\
            .execute()
        if resource_response.data:
            resource_info = resource_response.data[0]
    detail["resource"] = resource_info

    # User resource relationship (reuse existing structure)
    user_resource_info = None
    if template.get("resource_id"):
        user_resource_response = client.table("user_resources")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("resource_id", template["resource_id"])\
            .execute()
        if user_resource_response.data:
            user_resource_info = user_resource_response.data[0]
    detail["user_resource"] = user_resource_info

    # Tags
    tag_names = await get_template_tags(client, template, user_id)
    detail["tags"] = tag_names

    return detail


@router.get("/", response_model=dict)
async def list_record_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, min_length=1, description="Search by title"),
    current_user_id: str = Depends(get_current_user_id)
):
    """List templates for the current user."""
    try:
        client = get_supabase_client()

        query = client.table("record_templates")\
            .select("*")\
            .eq("user_id", current_user_id)

        if search:
            query = query.ilike("title", f"%{search}%")

        response = query.order("updated_at", desc=True)\
            .range(skip, skip + limit - 1)\
            .execute()

        templates = response.data or []

        # Attach tag strings for list view
        if templates:
            for template in templates:
                tag_names = await get_template_tags(client, template, current_user_id)
                template["tags"] = tag_names

        return {
            "templates": templates,
            "total": len(templates)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch record templates: {str(e)}"
        )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_record_template(
    template_data: RecordTemplateCreate,
    current_user_id: str = Depends(get_current_user_id)
):
    """Create a new record template."""
    try:
        client = get_supabase_client()

        # Validate form_type for user
        form_type_check = client.table("user_form_types")\
            .select("type_id")\
            .eq("user_id", current_user_id)\
            .eq("type_code", template_data.form_type)\
            .execute()
        if not form_type_check.data:
            raise HTTPException(status_code=400, detail=f"Invalid form_type '{template_data.form_type}' for user")

        resource_id = template_data.resource_id

        # Create resource if necessary
        if not resource_id and getattr(template_data, "resource_title", None):
            resource_type = get_valid_resource_type(
                template_data.resource_type or template_data.form_type,
                template_data.resource_type
            )
            resource_id = await create_or_find_resource(
                client,
                title=template_data.resource_title,
                resource_type=resource_type,
                created_by=current_user_id,
                author=getattr(template_data, "resource_author", None),
                url=getattr(template_data, "resource_url", None),
                platform=getattr(template_data, "resource_platform", None),
                isbn=getattr(template_data, "resource_isbn", None),
                description=getattr(template_data, "resource_description", None)
            )
        elif not resource_id:
            # Fallback simple resource using template title
            resource_type = get_valid_resource_type(template_data.form_type)
            resource_id = await create_or_find_resource(
                client,
                title=template_data.title,
                resource_type=resource_type,
                created_by=current_user_id
            )

        insert_data = {
            "user_id": current_user_id,
            "resource_id": resource_id,
            "form_type": template_data.form_type,
            "title": template_data.title,
            "body_md": template_data.body_md,
            "duration_min": template_data.duration_min,
            "effective_duration_min": template_data.effective_duration_min,
            "mood": template_data.mood,
            "difficulty": template_data.difficulty,
            "focus": template_data.focus,
            "energy": template_data.energy,
            "privacy": template_data.privacy.value if template_data.privacy else "private",
            "auto_confidence": template_data.auto_confidence,
            "assets": template_data.assets
        }

        template_response = client.table("record_templates").insert(insert_data).execute()
        if not template_response.data:
            raise HTTPException(status_code=500, detail="Failed to create record template")

        created_template = template_response.data[0]

        # Tags handling
        if template_data.tags and resource_id:
            await process_tags_for_resource(
                client,
                tags=template_data.tags,
                resource_id=resource_id,
                user_id=current_user_id
            )

        detail = await get_template_detail(client, created_template["template_id"], current_user_id)
        return detail

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create record template: {str(e)}"
        )


@router.get("/{template_id}", response_model=dict)
async def get_record_template(
    template_id: int,
    current_user_id: str = Depends(get_current_user_id)
):
    """Get detailed information for a template."""
    try:
        client = get_supabase_client()
        detail = await get_template_detail(client, template_id, current_user_id)
        if not detail:
            raise HTTPException(status_code=404, detail="Template not found")
        return detail
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch template: {str(e)}"
        )


@router.put("/{template_id}", response_model=dict)
async def update_record_template(
    template_id: int,
    template_update: RecordTemplateUpdate,
    current_user_id: str = Depends(get_current_user_id)
):
    """Update a record template."""
    try:
        client = get_supabase_client()

        existing = client.table("record_templates")\
            .select("*")\
            .eq("template_id", template_id)\
            .eq("user_id", current_user_id)\
            .execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Template not found")

        current_template = existing.data[0]
        update_data = {}

        for field in [
            "form_type", "title", "body_md", "duration_min",
            "effective_duration_min", "mood", "difficulty",
            "focus", "energy", "auto_confidence"
        ]:
            value = getattr(template_update, field)
            if value is not None:
                update_data[field] = value

        # Handle privacy separately due to enum
        if template_update.privacy is not None:
            update_data["privacy"] = template_update.privacy.value

        if template_update.assets is not None:
            update_data["assets"] = template_update.assets

        # Validate form_type if updated
        if "form_type" in update_data:
            form_type_check = client.table("user_form_types")\
                .select("type_id")\
                .eq("user_id", current_user_id)\
                .eq("type_code", update_data["form_type"])\
                .execute()
            if not form_type_check.data:
                raise HTTPException(status_code=400, detail=f"Invalid form_type '{update_data['form_type']}' for user")

        if update_data:
            update_response = client.table("record_templates")\
                .update(update_data)\
                .eq("template_id", template_id)\
                .eq("user_id", current_user_id)\
                .execute()
            if not update_response.data:
                raise HTTPException(status_code=500, detail="Failed to update record template")

        # Resource updates
        resource_update = {}
        for attr in [
            "resource_title", "resource_type", "resource_author", "resource_url",
            "resource_platform", "resource_isbn", "resource_description"
        ]:
            value = getattr(template_update, attr)
            if value is not None:
                field_name = attr.replace("resource_", "")
                if field_name == "title":
                    resource_update["title"] = value
                elif field_name == "type":
                    resource_update["type"] = get_valid_resource_type(value)
                else:
                    resource_update[field_name] = value

        if resource_update and current_template.get("resource_id"):
            client.table("resources")\
                .update(resource_update)\
                .eq("resource_id", current_template["resource_id"])\
                .execute()

        # Tags
        if template_update.tags is not None:
            resource_id = current_template.get("resource_id")
            # Ensure resource exists to hold tags
            if not resource_id:
                resource_type = get_valid_resource_type(
                    template_update.form_type or current_template["form_type"]
                )
                resource_id = await create_or_find_resource(
                    client,
                    title=current_template["title"],
                    resource_type=resource_type,
                    created_by=current_user_id
                )
                client.table("record_templates")\
                    .update({"resource_id": resource_id})\
                    .eq("template_id", template_id)\
                    .execute()

            tag_payload = []
            for tag in template_update.tags:
                if isinstance(tag, dict):
                    tag_name = tag.get("tag_name")
                else:
                    tag_name = str(tag).strip() if tag else None
                if tag_name:
                    tag_payload.append({"tag_name": tag_name})

            await update_record_tags(
                client,
                resource_id,
                tag_payload,
                current_user_id
            )

        detail = await get_template_detail(client, template_id, current_user_id)
        return detail

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update record template: {str(e)}"
        )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record_template(
    template_id: int,
    current_user_id: str = Depends(get_current_user_id)
):
    """Delete a record template."""
    try:
        client = get_supabase_client()

        existing = client.table("record_templates")\
            .select("template_id")\
            .eq("template_id", template_id)\
            .eq("user_id", current_user_id)\
            .execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Template not found")

        client.table("record_templates")\
            .delete()\
            .eq("template_id", template_id)\
            .eq("user_id", current_user_id)\
            .execute()

        from fastapi import Response
        return Response(status_code=204)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete record template: {str(e)}"
        )
