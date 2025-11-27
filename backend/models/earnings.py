"""
Database model for Earnings Surprises
Beanie ODM document for Finnhub /stock/earnings data
"""
from beanie import Document
from typing import List, Dict, Any
from datetime import datetime
from pydantic import Field


class EarningsHistory(Document):
    """Earnings surprises MongoDB document model (Finnhub /stock/earnings)."""

    ticker: str = Field(..., description="Stock ticker symbol", max_length=10)
    data: List[Dict[str, Any]] = Field(
        ..., description="Raw earnings surprises array from Finnhub"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        # Separate collection for Finnhub earnings history
        name = "finnhub-earnings-history"
        indexes = [
            "ticker",
        ]

    def __repr__(self):
        return f"<EarningsHistory(ticker={self.ticker})>"

    async def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow()
        await self.save()




