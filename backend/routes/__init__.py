"""Routes module"""
from fastapi import APIRouter
from .finnhub.finnhub_routes import router as finnhub_router
from .finnhub.test_routes import router as finnhub_test_router
from .db_read_routes import router as db_read_router
from .institution_ownership_routes import router as institution_ownership_router

# Create main API router
api_router = APIRouter()

# Include route modules
api_router.include_router(finnhub_router)
api_router.include_router(finnhub_test_router)
api_router.include_router(db_read_router)
api_router.include_router(institution_ownership_router)

__all__ = ["api_router"]

