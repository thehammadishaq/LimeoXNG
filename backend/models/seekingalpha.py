from beanie import Document
from datetime import datetime as dt_datetime
from typing import List, Optional
from pydantic import Field


class SeekingAlphaArticleDocument(Document):
    """Single Seeking Alpha ANALYSIS article stored as its own document.

    De-duplicated primarily by URL; also stores core metadata fields.
    """

    url: str = Field(..., description="Full article URL (unique per article)")
    title: str = Field(..., description="Article title")
    signal: Optional[str] = Field(None, description="Quant signal / rating badge text")
    time: Optional[str] = Field(None, description="Published time text as shown on site")
    published_date: Optional[dt_datetime] = Field(None, description="Actual published date (parsed from time field)")
    tickers: List[str] = Field(default_factory=list, description="Associated tickers")
    author: Optional[str] = Field(None, description="Author display name")
    summary: str = Field(..., description="Article summary from list page")
    created_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)
    updated_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)

    class Settings:
        name = "seekingalpha-analysis-articles"
        indexes = [
            [("url", 1)],  # Unique index on URL to prevent duplicates
            "author",
            "time",
            "published_date",
        ]

    def __repr__(self) -> str:
        return f"<SeekingAlphaArticleDocument(url={self.url}, title={self.title[:40]!r}...)>"

    async def touch(self) -> None:
        """Update updated_at timestamp and save."""
        self.updated_at = dt_datetime.utcnow()
        await self.save()


