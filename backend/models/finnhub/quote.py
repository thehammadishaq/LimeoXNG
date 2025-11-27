from pydantic import BaseModel, Field
from typing import Dict, Any, Optional


class QuoteFetchRequest(BaseModel):
    """Request model for fetching real-time quote from Finnhub."""

    ticker: str = Field(
        ...,
        description="Stock ticker symbol to fetch quote for",
        example="AAPL",
    )
    save_to_db: bool = Field(
        False,
        description="Whether to save the fetched quote to the database (not implemented yet)",
    )


class QuoteFetchResponse(BaseModel):
    """Response model for real-time quote fetch endpoint."""

    ticker: str = Field(..., description="Stock ticker symbol")
    # Raw Finnhub payload, typically contains: c, d, dp, h, l, o, pc, t
    data: Dict[str, Any] = Field(
        ...,
        description="Fetched real-time quote data from Finnhub /quote endpoint",
    )
    saved_to_db: bool = Field(
        ...,
        description="Indicates if the quote was saved to the database (always False for now)",
    )
    record_id: Optional[str] = Field(
        None,
        description="ID of the saved record if saved to DB (reserved for future use)",
    )



