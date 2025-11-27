"""
Pattern Recognition Scan Service
Service layer for pattern scan business logic (MongoDB)
"""
from typing import List, Optional
from datetime import datetime

from models.pattern import PatternScan
from schemas.pattern import PatternScanCreate, PatternScanUpdate


class PatternScanService:
    """Service for pattern recognition scan operations."""

    async def create_record(
        self, record_data: PatternScanCreate
    ) -> PatternScan:
        """Create a new pattern scan record.

        If a record for (ticker, resolution) already exists, it will be updated instead.
        """
        existing = await self.get_by_ticker_and_resolution(
            record_data.ticker, record_data.resolution
        )
        if existing:
            return await self.update_record(
                str(existing.id), PatternScanUpdate(data=record_data.data)
            )

        db_record = PatternScan(
            ticker=record_data.ticker.upper(),
            resolution=record_data.resolution,
            data=record_data.data,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await db_record.insert()
        return db_record

    async def get_by_id(self, record_id: str) -> Optional[PatternScan]:
        """Get pattern scan record by ID."""
        try:
            return await PatternScan.get(record_id)
        except Exception:
            return None

    async def get_by_ticker_and_resolution(
        self, ticker: str, resolution: str
    ) -> Optional[PatternScan]:
        """Get pattern scan record by ticker and resolution."""
        return await PatternScan.find_one(
            PatternScan.ticker == ticker.upper(),
            PatternScan.resolution == resolution,
        )

    async def get_all(
        self, skip: int = 0, limit: int = 100
    ) -> List[PatternScan]:
        """Get all pattern scan records with pagination."""
        return await PatternScan.find_all().skip(skip).limit(limit).to_list()

    async def get_count(self) -> int:
        """Get total count of pattern scan records."""
        return await PatternScan.find_all().count()

    async def update_record(
        self, record_id: str, record_data: PatternScanUpdate
    ) -> Optional[PatternScan]:
        """Update pattern scan record."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return None

        if record_data.data is not None:
            db_record.data = record_data.data
            db_record.updated_at = datetime.utcnow()
            await db_record.save()

        return db_record

    async def delete_record(self, record_id: str) -> bool:
        """Delete pattern scan record."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return False

        await db_record.delete()
        return True




