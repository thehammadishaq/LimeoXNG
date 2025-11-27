"""
Pydantic Schemas for Basic Financials
Request and Response models for API endpoints
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class BasicFinancialsCreate(BaseModel):
    """Schema for creating/uploading basic financials."""

    ticker: str = Field(..., description="Stock ticker symbol", example="AAPL")
    data: Dict[str, Any] = Field(..., description="Basic financials data from Finnhub /stock/metric")


class BasicFinancialsResponse(BaseModel):
    """Schema for basic financials response (single document)."""

    id: Optional[str] = Field(None, alias="_id")  # MongoDB uses _id
    ticker: str
    data: Dict[str, Any]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            # Handle MongoDB ObjectId serialization
            "ObjectId": str,
        }


class BasicFinancialsListResponse(BaseModel):
    """Schema for list of basic financials documents."""

    items: List[BasicFinancialsResponse]
    total: int
    page: int
    page_size: int


class BasicFinancialsUpdate(BaseModel):
    """Schema for updating basic financials."""

    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Schema for error responses."""

    error: str
    detail: Optional[str] = None
    status_code: int


class SuccessResponse(BaseModel):
    """Schema for success responses."""

    message: str
    data: Optional[Dict[str, Any]] = None


