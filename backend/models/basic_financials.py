"""
Database Models for Basic Financials
Beanie ODM models for MongoDB
"""
from beanie import Document
from typing import Dict, Any
from datetime import datetime
from pydantic import Field


class BasicFinancials(Document):
    """Basic Financials MongoDB document model (Finnhub /stock/metric)."""

    ticker: str = Field(..., description="Stock ticker symbol", max_length=10)
    data: Dict[str, Any] = Field(..., description="Basic financials data from Finnhub")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        # Separate collection just for Finnhub basic financials
        name = "finnhub-basic-financials"
        indexes = [
            "ticker",  # Index on ticker field
        ]

    def __repr__(self):
        return f"<BasicFinancials(ticker={self.ticker})>"

    async def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow()
        await self.save()


