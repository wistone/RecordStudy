from fastapi import APIRouter
from .records import router as records_router
from .resources import router as resources_router
from .stats import router as stats_router

api_router = APIRouter()
api_router.include_router(records_router, prefix="/records", tags=["records"])
api_router.include_router(resources_router, prefix="/resources", tags=["resources"])
api_router.include_router(stats_router, prefix="/stats", tags=["statistics"])