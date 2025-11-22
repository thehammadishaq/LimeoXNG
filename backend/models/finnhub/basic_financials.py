from pydantic import BaseModel, Field
from typing import Dict, Any, Optional


class BasicFinancialsFetchRequest(BaseModel):
    """Request model for fetching basic financials from Finnhub."""

    ticker: str = Field(..., description="Stock ticker symbol to fetch basic financials for", example="AAPL")
    metric: str = Field("all", description="Metric type. Finnhub recommends 'all'.", example="all")
    save_to_db: bool = Field(True, description="Whether to save the fetched basic financials to the database")


class BasicFinancialsFetchResponse(BaseModel):
    """Response model for basic financials fetch endpoint."""

    ticker: str = Field(..., description="Stock ticker symbol")
    metric: str = Field(..., description="Metric type requested from Finnhub")
    data: Dict[str, Any] = Field(..., description="Fetched basic financials data from Finnhub")
    saved_to_db: bool = Field(..., description="Indicates if the data was saved to the database")
    record_id: Optional[str] = Field(None, description="ID of the saved record if saved to DB")



