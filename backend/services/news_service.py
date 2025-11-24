"""
Market News Service
Service layer for market news business logic (MongoDB)
"""
from typing import List, Optional
from datetime import datetime

from models.news import MarketNews
from schemas.news import NewsCreate, NewsUpdate


class NewsService:
    """Service for market news operations."""

    async def create_record(self, record_data: NewsCreate) -> MarketNews:
        """Create a new market news record.

        If a record for the category and min_id already exists, it will be updated instead.
        """
        existing = await self.get_by_category_and_min_id(record_data.category, record_data.min_id)
        if existing:
            return await self.update_record(
                str(existing.id),
                NewsUpdate(data=record_data.data, min_id=record_data.min_id),
            )

        db_record = MarketNews(
            category=record_data.category.lower(),
            min_id=record_data.min_id,
            data=record_data.data,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await db_record.insert()
        return db_record

    async def get_by_id(self, record_id: str) -> Optional[MarketNews]:
        """Get market news record by ID."""
        try:
            return await MarketNews.get(record_id)
        except Exception:
            return None

    async def get_by_category_and_min_id(self, category: str, min_id: int = 0) -> Optional[MarketNews]:
        """Get market news record by category and min_id."""
        return await MarketNews.find_one(
            MarketNews.category == category.lower(),
            MarketNews.min_id == min_id
        )

    async def get_by_category(self, category: str, skip: int = 0, limit: int = 100) -> List[MarketNews]:
        """Get all market news records for a category with pagination."""
        return await MarketNews.find(
            MarketNews.category == category.lower()
        ).skip(skip).limit(limit).to_list()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[MarketNews]:
        """Get all market news records with pagination."""
        return await MarketNews.find_all().skip(skip).limit(limit).to_list()

    async def get_count(self) -> int:
        """Get total count of market news records."""
        return await MarketNews.find_all().count()

    async def get_count_by_category(self, category: str) -> int:
        """Get count of market news records for a category."""
        return await MarketNews.find(
            MarketNews.category == category.lower()
        ).count()

    async def update_record(
        self,
        record_id: str,
        record_data: NewsUpdate,
    ) -> Optional[MarketNews]:
        """Update market news record."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return None

        if record_data.data is not None:
            db_record.data = record_data.data
        if record_data.min_id is not None:
            db_record.min_id = record_data.min_id
        db_record.updated_at = datetime.utcnow()
        await db_record.save()

        return db_record

    async def delete_record(self, record_id: str) -> bool:
        """Delete market news record."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return False

        await db_record.delete()
        return True


