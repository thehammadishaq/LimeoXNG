"""
Stock Symbols Model
Model to cache all available stock symbols
"""
from beanie import Document
from typing import List
from datetime import datetime
from pydantic import Field


class StockSymbolsCache(Document):
    """Stock Symbols Cache MongoDB document model"""
    
    cache_key: str = Field(default="all_symbols", description="Cache key")
    symbols: List[str] = Field(..., description="List of all stock ticker symbols")
    total_count: int = Field(..., description="Total number of symbols")
    exchanges: List[str] = Field(default=["US"], description="Exchanges included")
    cached_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "stock_symbols_cache"  # Collection name
        indexes = [
            "cache_key",  # Index on cache key
            "updated_at",  # Index for cache checking
        ]
    
    def __repr__(self):
        return f"<StockSymbolsCache(total={self.total_count}, updated_at={self.updated_at})>"
    
    async def update_timestamp(self):
        """Update the updated_at timestamp"""
        self.updated_at = datetime.utcnow()
        await self.save()


