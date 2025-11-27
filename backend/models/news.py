"""
Database Models for Market News
Beanie ODM models for MongoDB
"""
from beanie import Document
from typing import List, Dict, Any, Optional
from datetime import datetime as dt_datetime
from pydantic import Field


class MarketNews(Document):
    """Market News MongoDB document model (aggregated snapshot per category + min_id).

    NOTE:
    - This keeps the latest snapshot of Finnhub news array for (category, min_id).
    - Individual news articles are also stored in `NewsArticleDocument` for per-article access.
    """

    category: str = Field(..., description="News category (general, forex, crypto, merger)")
    min_id: int = Field(default=0, description="Minimum news ID used for fetching")
    data: List[Dict[str, Any]] = Field(..., description="List of news articles from Finnhub")
    created_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)
    updated_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)

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
        self.updated_at = dt_datetime.utcnow()
        await self.save()


class NewsArticleDocument(Document):
    """Single news article stored as its own document.

    This allows:
    - Appending new news without losing older ones
    - De-duplicating by (category, finnhub_id)
    - Efficient querying/filtering by category, source, date, etc.
    """

    category: str = Field(..., description="News category (general, forex, crypto, merger)")
    finnhub_id: int = Field(..., description="Finnhub news ID (id field from API)")
    published_at: dt_datetime = Field(..., description="Published time (converted from UNIX timestamp)")
    headline: str = Field(..., description="News headline")
    source: str = Field(..., description="News source")
    summary: Optional[str] = Field(None, description="News summary")
    url: str = Field(..., description="Original article URL")
    image: Optional[str] = Field(None, description="Thumbnail image URL")
    related: Optional[str] = Field(None, description="Related symbols string from Finnhub")
    raw: Dict[str, Any] = Field(default_factory=dict, description="Raw Finnhub article payload")
    created_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)
    updated_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)

    class Settings:
        name = "finnhub-News-Articles"
        indexes = [
            "category",
            "finnhub_id",
        ]

    def __repr__(self):
        return f"<NewsArticleDocument(category={self.category}, finnhub_id={self.finnhub_id})>"

    async def touch(self):
        """Update the updated_at timestamp and save."""
        self.updated_at = dt_datetime.utcnow()
        await self.save()

