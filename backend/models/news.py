"""
Database Models for Market News
Beanie ODM models for MongoDB
"""
from beanie import Document
from typing import List, Dict, Any
from datetime import datetime
from pydantic import Field


class MarketNews(Document):
    """Market News MongoDB document model"""
    
    category: str = Field(..., description="News category (general, forex, crypto, merger)")
    min_id: int = Field(default=0, description="Minimum news ID used for fetching")
    data: List[Dict[str, Any]] = Field(..., description="List of news articles from Finnhub")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "finnhub-Market-News"  # Collection name
        indexes = [
            "category",  # Index on category field
            "min_id",    # Index on min_id field
        ]
    
    def __repr__(self):
        return f"<MarketNews(category={self.category}, min_id={self.min_id}, articles={len(self.data)})>"
    
    async def update_timestamp(self):
        """Update the updated_at timestamp"""
        self.updated_at = datetime.utcnow()
        await self.save()


