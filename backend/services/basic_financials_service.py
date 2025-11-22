"""
Basic Financials Service
Service layer for basic financials business logic (MongoDB)
"""
from typing import List, Optional
from datetime import datetime

from models.basic_financials import BasicFinancials
from schemas.basic_financials import BasicFinancialsCreate, BasicFinancialsUpdate


class BasicFinancialsService:
    """Service for basic financials operations."""

    async def create_record(self, record_data: BasicFinancialsCreate) -> BasicFinancials:
        """Create a new basic financials record.

        If a record for the ticker already exists, it will be updated instead.
        """
        existing = await self.get_by_ticker(record_data.ticker)
        if existing:
            return await self.update_record(
                str(existing.id),
                BasicFinancialsUpdate(data=record_data.data),
            )

        db_record = BasicFinancials(
            ticker=record_data.ticker.upper(),
            data=record_data.data,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await db_record.insert()
        return db_record

    async def get_by_id(self, record_id: str) -> Optional[BasicFinancials]:
        """Get basic financials record by ID."""
        try:
            return await BasicFinancials.get(record_id)
        except Exception:
            return None

    async def get_by_ticker(self, ticker: str) -> Optional[BasicFinancials]:
        """Get basic financials record by ticker."""
        return await BasicFinancials.find_one(
            BasicFinancials.ticker == ticker.upper()
        )

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[BasicFinancials]:
        """Get all basic financials records with pagination."""
        return await BasicFinancials.find_all().skip(skip).limit(limit).to_list()

    async def get_count(self) -> int:
        """Get total count of basic financials records."""
        return await BasicFinancials.find_all().count()

    async def update_record(
        self,
        record_id: str,
        record_data: BasicFinancialsUpdate,
    ) -> Optional[BasicFinancials]:
        """Update basic financials record."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return None

        if record_data.data is not None:
            db_record.data = record_data.data
            db_record.updated_at = datetime.utcnow()
            await db_record.save()

        return db_record

    async def delete_record(self, record_id: str) -> bool:
        """Delete basic financials record."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return False

        await db_record.delete()
        return True


