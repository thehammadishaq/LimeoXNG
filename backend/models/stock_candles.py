"""
Database model for latest OHLCV candles
Beanie document storing the most recent candle per ticker and resolution.
"""
from beanie import Document
from datetime import datetime
from pydantic import Field


class LatestCandle(Document):
    """
    Stores the latest OHLCV candle for a given ticker and resolution.

    Intended to be updated (upsert) on each Finnhub /stock/candle fetch,
    so there is always a single latest record per (ticker, resolution).
    """

    ticker: str = Field(..., description="Stock ticker symbol", max_length=10)
    resolution: str = Field(
        ..., description="Resolution of the candle (e.g. 1, 5, 15, 30, 60, D, W, M)"
    )

    open: float = Field(..., description="Open price for the latest candle")
    high: float = Field(..., description="High price for the latest candle")
    low: float = Field(..., description="Low price for the latest candle")
    close: float = Field(..., description="Close price for the latest candle")
    volume: float = Field(..., description="Volume for the latest candle")

    timestamp: int = Field(
        ..., description="UNIX timestamp (seconds) of the latest candle (Finnhub t value)"
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "finnhub-latest-candles"
        indexes = [
            "ticker",
            "resolution",
        ]

    def __repr__(self) -> str:  # pragma: no cover - repr utility
        return f"<LatestCandle(ticker={self.ticker}, resolution={self.resolution}, t={self.timestamp})>"

    async def touch(self) -> None:
        """Update the updated_at timestamp and save."""
        self.updated_at = datetime.utcnow()
        await self.save()



