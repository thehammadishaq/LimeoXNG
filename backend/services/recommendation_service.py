"""
Recommendation Trends Service
Service layer for recommendation trends business logic (MongoDB)
"""
from typing import List, Optional
from datetime import datetime

from models.recommendation import RecommendationTrends
from schemas.recommendation import RecommendationCreate, RecommendationUpdate


class RecommendationService:
    """Service for recommendation trends operations."""

    async def create_record(
        self, record_data: RecommendationCreate
    ) -> RecommendationTrends:
        """Create a new recommendation trends record.

        If a record for the ticker already exists, it will be updated instead.
        """
        existing = await self.get_by_ticker(record_data.ticker)
        if existing:
            return await self.update_record(
                str(existing.id), RecommendationUpdate(data=record_data.data)
            )

        db_record = RecommendationTrends(
            ticker=record_data.ticker.upper(),
            data=record_data.data,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await db_record.insert()
        return db_record

    async def get_by_id(self, record_id: str) -> Optional[RecommendationTrends]:
        """Get recommendation trends record by ID."""
        try:
            return await RecommendationTrends.get(record_id)
        except Exception:
            return None

    async def get_by_ticker(self, ticker: str) -> Optional[RecommendationTrends]:
        """Get recommendation trends record by ticker."""
        return await RecommendationTrends.find_one(
            RecommendationTrends.ticker == ticker.upper()
        )

    async def get_all(
        self, skip: int = 0, limit: int = 100
    ) -> List[RecommendationTrends]:
        """Get all recommendation trends records with pagination."""
        return (
            await RecommendationTrends.find_all().skip(skip).limit(limit).to_list()
        )

    async def get_count(self) -> int:
        """Get total count of recommendation trends records."""
        return await RecommendationTrends.find_all().count()

    async def update_record(
        self, record_id: str, record_data: RecommendationUpdate
    ) -> Optional[RecommendationTrends]:
        """Update recommendation trends record."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return None

        if record_data.data is not None:
            db_record.data = record_data.data
            db_record.updated_at = datetime.utcnow()
            await db_record.save()

        return db_record

    async def delete_record(self, record_id: str) -> bool:
        """Delete recommendation trends record."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return False

        await db_record.delete()
        return True




