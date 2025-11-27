from pydantic import BaseModel, Field
from typing import List, Optional


class RecommendationTrend(BaseModel):
    """Single analyst recommendation trend point from Finnhub /stock/recommendation."""

    buy: int = Field(..., description="Number of recommendations in the Buy category")
    hold: int = Field(..., description="Number of recommendations in the Hold category")
    period: str = Field(..., description="Updated period, e.g. '2025-03-01'")
    sell: int = Field(..., description="Number of recommendations in the Sell category")
    strongBuy: int = Field(..., description="Number of recommendations in the Strong Buy category")
    strongSell: int = Field(..., description="Number of recommendations in the Strong Sell category")
    symbol: str = Field(..., description="Company symbol")


class RecommendationFetchResponse(BaseModel):
    """Response model for recommendation trends fetch endpoint."""

    ticker: str = Field(..., description="Stock ticker symbol")
    data: List[RecommendationTrend] = Field(
        ..., description="List of recommendation trend entries from Finnhub"
    )
    saved_to_db: bool = Field(..., description="Indicates if the data was saved to the database")
    record_id: Optional[str] = Field(
        None, description="ID of the saved record if saved to DB"
    )




