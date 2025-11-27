"""
Earnings Surprises Service
Service layer for earnings surprises business logic (MongoDB)
"""
from typing import List, Optional
from datetime import datetime

from models.earnings import EarningsHistory
from schemas.earnings import EarningsCreate, EarningsUpdate


class EarningsService:
    """Service for earnings history operations."""

    async def create_record(self, record_data: EarningsCreate) -> EarningsHistory:
        """Create a new earnings history record.

        If a record for the ticker already exists, it will be updated instead.
        """
        existing = await self.get_by_ticker(record_data.ticker)
        if existing:
            return await self.update_record(
                str(existing.id), EarningsUpdate(data=record_data.data)
            )

        db_record = EarningsHistory(
            ticker=record_data.ticker.upper(),
            data=record_data.data,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await db_record.insert()
        return db_record

    async def get_by_id(self, record_id: str) -> Optional[EarningsHistory]:
        """Get earnings history record by ID."""
        try:
            return await EarningsHistory.get(record_id)
        except Exception:
            return None

    async def get_by_ticker(self, ticker: str) -> Optional[EarningsHistory]:
        """Get earnings history record by ticker."""
        return await EarningsHistory.find_one(
            EarningsHistory.ticker == ticker.upper()
        )

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[EarningsHistory]:
        """Get all earnings history records with pagination."""
        return await EarningsHistory.find_all().skip(skip).limit(limit).to_list()

    async def get_count(self) -> int:
        """Get total count of earnings history records."""
        return await EarningsHistory.find_all().count()

    async def update_record(
        self, record_id: str, record_data: EarningsUpdate
    ) -> Optional[EarningsHistory]:
        """Update earnings history record (replace raw data)."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return None

        if record_data.data is not None:
            db_record.data = record_data.data
            db_record.updated_at = datetime.utcnow()
            await db_record.save()

        return db_record

    async def delete_record(self, record_id: str) -> bool:
        """Delete earnings history record."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return False

        await db_record.delete()
        return True




