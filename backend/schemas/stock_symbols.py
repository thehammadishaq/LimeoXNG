"""
Pydantic Schemas for Stock Symbols Cache
Read-only models for exposing cached symbol list from MongoDB
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class StockSymbolsResponse(BaseModel):
    """Schema for stock symbols cache response (single document)."""

    id: Optional[str] = Field(None, alias="_id")  # MongoDB uses _id
    cache_key: str
    symbols: List[str]
    total_count: int
    exchanges: List[str]
    cached_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class StockSymbolsListResponse(BaseModel):
    """Schema for list-style response of symbols."""

    symbols: List[str]
    total: int
    exchanges: List[str]
    updated_at: Optional[datetime] = None



