from fastapi import APIRouter
from .records import router as records_router
from .resources import router as resources_router
from .stats import router as stats_router
from .profiles import router as profiles_router
from .summaries import router as summaries_router
from .form_types import router as form_types_router

api_router = APIRouter()
api_router.include_router(records_router, prefix="/records", tags=["records"])
api_router.include_router(resources_router, prefix="/resources", tags=["resources"])
api_router.include_router(stats_router, prefix="/stats", tags=["statistics"])
api_router.include_router(profiles_router, prefix="/profiles", tags=["profiles"])
api_router.include_router(summaries_router, prefix="/summaries", tags=["summaries"])
api_router.include_router(form_types_router, prefix="/form-types", tags=["form-types"])