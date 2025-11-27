"""
Database Models for Insider Transactions
Beanie ODM models for MongoDB
"""
from beanie import Document
from typing import Optional
from datetime import datetime as dt_datetime
from pydantic import Field


class InsiderTransactionDocument(Document):
    """Single insider transaction stored as its own document.

    Each transaction from Finnhub is stored as a separate document.
    This allows:
    - Efficient querying/filtering by symbol, name, date, etc.
    - De-duplicating by unique transaction identifiers
    - Tracking individual transactions over time
    """

    symbol: str = Field(..., description="Company symbol (e.g., TSLA, AAPL)")
    name: str = Field(..., description="Insider's name")
    # Some Finnhub records return `share: null`, so allow Optional[int] with a safe default.
    share: Optional[int] = Field(
        default=0, description="Number of shares held after the transaction"
    )
    change: int = Field(
        ...,
        description="Number of share changed from the last period. Positive = BUY, Negative = SELL",
    )
    filingDate: str = Field(..., description="Filing date (YYYY-MM-DD)")
    transactionDate: str = Field(..., description="Transaction date (YYYY-MM-DD)")
    transactionCode: str = Field(..., description="Transaction code (e.g., S, M, P)")
    transactionPrice: float = Field(..., description="Average transaction price")
    created_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)
    updated_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)

    class Settings:
        name = "finnhub-Insider-Transactions"  # Collection name
        indexes = [
            "symbol",
            "name",
            "transactionDate",
            "filingDate",
            # Compound index for unique transactions
            [("symbol", 1), ("name", 1), ("transactionDate", 1), ("change", 1)],
        ]

    def __repr__(self):
        return f"<InsiderTransactionDocument(symbol={self.symbol}, name={self.name}, change={self.change})>"

    async def touch(self):
        """Update the updated_at timestamp and save."""
        self.updated_at = dt_datetime.utcnow()
        await self.save()

