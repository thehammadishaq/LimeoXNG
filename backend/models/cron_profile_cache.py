"""
Cron Profile Cache Models

Store detailed information about each profile-cache cron job run.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class CronTickerResult(BaseModel):
    """Per-ticker result for a profile-cache cron job."""

    ticker: str = Field(..., description="Ticker symbol (e.g. AAPL)")
    ok: bool = Field(..., description="Whether all profile-related calls succeeded")
    errors: List[str] = Field(
        default_factory=list,
        description="List of error messages (empty if ok=True)",
    )
    processed_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when this ticker was processed in this job",
    )


class ProfileCacheCronRun(Document):
    """Document representing a single run of the profile-cache cron job."""

    started_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the cron job started",
    )
    finished_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the cron job finished",
    )
    wait_sec: float = Field(
        ...,
        description="Delay in seconds between processing each ticker",
    )
    limit: Optional[int] = Field(
        default=None,
        description="Optional limit on number of tickers processed from cache",
    )
    total_cached: int = Field(
        ...,
        description="Total number of tickers available in cache at run time",
    )
    processed: int = Field(
        ...,
        description="Number of tickers actually processed in this run",
    )
    success: int = Field(
        ...,
        description="Number of tickers processed successfully",
    )
    failed: int = Field(
        ...,
        description="Number of tickers that failed for at least one API",
    )
    tickers: List[CronTickerResult] = Field(
        default_factory=list,
        description="Per-ticker results for this cron run",
    )
    cancelled: bool = Field(
        default=False,
        description="Whether this cron job was cancelled by user",
    )

    class Settings:
        name = "cron_profile_cache_runs"



