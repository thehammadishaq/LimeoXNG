"""
Database Models for Screener Data
Beanie ODM models for MongoDB
"""
from beanie import Document
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import Field


class ScreenerData(Document):
    """Screener Data MongoDB document model"""
    
    ticker: str = Field(..., description="Stock ticker symbol", max_length=10)
    data: Dict[str, Any] = Field(..., description="Screener data (quote, profile, metrics)")
    source: str = Field(default="finnhub", description="Data source")
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "screener_data"  # Collection name
        indexes = [
            "ticker",  # Index on ticker field
            "updated_at",  # Index for cache checking
        ]
    
    def __repr__(self):
        return f"<ScreenerData(ticker={self.ticker}, updated_at={self.updated_at})>"
    
    async def update_timestamp(self):
        """Update the updated_at timestamp"""
        self.updated_at = datetime.utcnow()
        await self.save()


