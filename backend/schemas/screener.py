"""
Screener Schemas
Pydantic schemas for screener data requests and responses
"""
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime


class ScreenerStockData(BaseModel):
    """Single stock data in screener response"""
    ticker: str
    quote: Optional[Dict[str, Any]] = None
    profile: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    fetched_at: Optional[str] = None


class ScreenerRequest(BaseModel):
    """Request to fetch screener data"""
    symbols: Optional[List[str]] = Field(None, description="List of stock ticker symbols (if not provided, will use pagination)")
    force_refresh: bool = Field(False, description="Force refresh from API, ignore cache")
    save_to_db: bool = Field(True, description="Save fetched data to database")
    page: Optional[int] = Field(1, description="Page number for pagination")
    page_size: Optional[int] = Field(20, description="Number of items per page")


class ScreenerResponse(BaseModel):
    """Response with screener data"""
    stocks: List[ScreenerStockData]
    total: int = Field(..., description="Total number of stocks in current page")
    total_available: int = Field(..., description="Total number of available stocks from Finnhub")
    page: int = Field(1, description="Current page number")
    page_size: int = Field(20, description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    cached_count: int = Field(0, description="Number of stocks served from cache")
    fresh_count: int = Field(0, description="Number of stocks fetched fresh from API")
    fetched_at: str
    source: str = "finnhub"


class SingleStockRequest(BaseModel):
    """Request for single stock data"""
    ticker: str = Field(..., description="Stock ticker symbol")
    force_refresh: bool = Field(False, description="Force refresh from API, ignore cache")
    save_to_db: bool = Field(True, description="Save fetched data to database")


class SingleStockResponse(BaseModel):
    """Response for single stock data"""
    ticker: str
    data: Dict[str, Any]
    from_cache: bool = Field(False, description="Whether data was served from cache")
    saved_to_db: bool = Field(False, description="Whether data was saved to database")
    fetched_at: str

