"""
Database model for Recommendation Trends
Beanie ODM document for Finnhub /stock/recommendation data
"""
from beanie import Document
from typing import List, Dict, Any
from datetime import datetime
from pydantic import Field


class RecommendationTrends(Document):
    """Recommendation trends MongoDB document model (Finnhub /stock/recommendation)."""

    ticker: str = Field(..., description="Stock ticker symbol", max_length=10)
    data: List[Dict[str, Any]] = Field(
        ..., description="Raw recommendation trends array from Finnhub"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        # Separate collection for Finnhub recommendation trends
        name = "finnhub-recommendation-trends"
        indexes = [
            "ticker",
        ]

    def __repr__(self):
        return f"<RecommendationTrends(ticker={self.ticker})>"

    async def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow()
        await self.save()



