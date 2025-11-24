"""
Pydantic Schemas for Market News
Request and Response models for API endpoints
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class NewsCreate(BaseModel):
    """Schema for creating/uploading market news."""

    category: str = Field(..., description="News category (general, forex, crypto, merger)", example="general")
    min_id: int = Field(default=0, description="Minimum news ID used for fetching", example=0)
    data: List[Dict[str, Any]] = Field(..., description="List of news articles from Finnhub")


class NewsResponse(BaseModel):
    """Schema for market news response (single document)."""

    id: Optional[str] = Field(None, alias="_id")  # MongoDB uses _id
    category: str
    min_id: int
    data: List[Dict[str, Any]]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class NewsListResponse(BaseModel):
    """Schema for list of market news documents."""

    items: List[NewsResponse]
    total: int
    page: int
    page_size: int


class NewsUpdate(BaseModel):
    """Schema for updating market news."""

    data: Optional[List[Dict[str, Any]]] = None
    min_id: Optional[int] = None


class ErrorResponse(BaseModel):
    """Schema for error responses."""

    error: str
    detail: Optional[str] = None
    status_code: int


class SuccessResponse(BaseModel):
    """Schema for success responses."""

    message: str
    data: Optional[Dict[str, Any]] = None


