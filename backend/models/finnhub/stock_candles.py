from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List


class StockCandlesFetchRequest(BaseModel):
    """Request model for fetching stock candles from Finnhub."""

    ticker: str = Field(..., description="Stock ticker symbol to fetch candles for", example="AAPL")
    resolution: str = Field(..., description="Supported resolution: 1, 5, 15, 30, 60, D, W, M", example="1")
    from_timestamp: int = Field(..., description="UNIX timestamp for interval initial value", example=1738655051, alias="from")
    to_timestamp: int = Field(..., description="UNIX timestamp for interval end value", example=1738741451, alias="to")
    save_to_db: bool = Field(True, description="Whether to save the fetched candles to the database")


class StockCandlesFetchResponse(BaseModel):
    """Response model for stock candles fetch endpoint."""

    ticker: str = Field(..., description="Stock ticker symbol")
    resolution: str = Field(..., description="Resolution used for the candles")
    from_timestamp: int = Field(..., description="UNIX timestamp for interval start", alias="from")
    to_timestamp: int = Field(..., description="UNIX timestamp for interval end", alias="to")
    data: Dict[str, Any] = Field(..., description="Fetched stock candles data from Finnhub (c, h, l, o, s, t, v)")
    saved_to_db: bool = Field(..., description="Indicates if the data was saved to the database")
    record_id: Optional[str] = Field(None, description="ID of the saved record if saved to DB")

    class Config:
        populate_by_name = True

