"""
Pydantic Schemas for Earnings Surprises
Request and Response models for DB-facing API endpoints (if needed)
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class EarningsCreate(BaseModel):
    """Schema for creating/uploading earnings surprises."""

    ticker: str = Field(..., description="Stock ticker symbol", example="AAPL")
    data: List[Dict[str, Any]] = Field(
        ..., description="Array of earnings surprise objects from Finnhub /stock/earnings"
    )


class EarningsResponse(BaseModel):
    """Schema for earnings surprises response (single document)."""

    id: Optional[str] = Field(None, alias="_id")  # MongoDB uses _id
    ticker: str
    data: List[Dict[str, Any]]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class EarningsListResponse(BaseModel):
    """Schema for list of earnings history documents."""

    items: List[EarningsResponse]
    total: int
    page: int
    page_size: int


class EarningsUpdate(BaseModel):
    """Schema for updating earnings history."""

    data: Optional[List[Dict[str, Any]]] = None




