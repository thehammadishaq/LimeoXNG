from pydantic import BaseModel, Field
from typing import List, Optional


class EarningsItem(BaseModel):
    """Single quarterly earnings surprise item from Finnhub /stock/earnings."""

    actual: Optional[float] = Field(
        None, description="Actual earnings result for the quarter"
    )
    estimate: Optional[float] = Field(
        None, description="Estimated earnings for the quarter"
    )
    period: Optional[str] = Field(
        None, description="Reported period, e.g. '2023-03-31'"
    )
    quarter: Optional[int] = Field(
        None, description="Fiscal quarter number (1-4)"
    )
    surprise: Optional[float] = Field(
        None, description="Earnings surprise (actual - estimate)"
    )
    surprisePercent: Optional[float] = Field(
        None, description="Surprise percent"
    )
    symbol: Optional[str] = Field(
        None, description="Company symbol returned by Finnhub"
    )
    year: Optional[int] = Field(None, description="Fiscal year")


class EarningsFetchResponse(BaseModel):
    """Response model for earnings surprises fetch endpoint."""

    ticker: str = Field(..., description="Stock ticker symbol")
    limit: Optional[int] = Field(
        None, description="Optional limit applied to Finnhub /stock/earnings"
    )
    data: List[EarningsItem] = Field(
        ..., description="List of quarterly earnings surprise items"
    )
    saved_to_db: bool = Field(
        ..., description="Indicates if the data was saved to the database"
    )
    record_id: Optional[str] = Field(
        None, description="ID of the saved record if saved to DB"
    )




