"""Routes module"""
from fastapi import APIRouter
from .finnhub.finnhub_routes import router as finnhub_router
from .finnhub.test_routes import router as finnhub_test_router

# Create main API router
api_router = APIRouter()

# Include only Finnhub route modules
api_router.include_router(finnhub_router)
api_router.include_router(finnhub_test_router)

__all__ = ["api_router"]

