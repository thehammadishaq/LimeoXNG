"""
Database model for Pattern Recognition Scans
Beanie ODM document for Finnhub /scan/pattern data
"""
from beanie import Document
from typing import Dict, Any
from datetime import datetime
from pydantic import Field


class PatternScan(Document):
    """Pattern recognition MongoDB document model (Finnhub /scan/pattern)."""

    ticker: str = Field(..., description="Stock ticker symbol", max_length=10)
    resolution: str = Field(
        ..., description="Resolution used for the pattern scan (1,5,15,30,60,D,W,M)"
    )
    data: Dict[str, Any] = Field(
        ..., description="Raw pattern scan payload from Finnhub (including points array)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        # Separate collection for Finnhub pattern recognition
        name = "finnhub-pattern-scan"
        indexes = [
            "ticker",
            "resolution",
        ]

    def __repr__(self):
        return f"<PatternScan(ticker={self.ticker}, resolution={self.resolution})>"

    async def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow()
        await self.save()




