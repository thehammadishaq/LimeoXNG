"""
Pydantic Schemas for Recommendation Trends
Request and Response models for DB-facing API endpoints (if needed)
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class RecommendationCreate(BaseModel):
    """Schema for creating/uploading recommendation trends."""

    ticker: str = Field(..., description="Stock ticker symbol", example="AAPL")
    data: List[Dict[str, Any]] = Field(
        ..., description="Array of recommendation trend objects from Finnhub /stock/recommendation"
    )


class RecommendationResponse(BaseModel):
    """Schema for recommendation trends response (single document)."""

    id: Optional[str] = Field(None, alias="_id")  # MongoDB uses _id
    ticker: str
    data: List[Dict[str, Any]]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class RecommendationListResponse(BaseModel):
    """Schema for list of recommendation trends documents."""

    items: List[RecommendationResponse]
    total: int
    page: int
    page_size: int


class RecommendationUpdate(BaseModel):
    """Schema for updating recommendation trends."""

    data: Optional[List[Dict[str, Any]]] = None




