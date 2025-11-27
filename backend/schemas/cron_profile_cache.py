from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class CronTickerStatus(BaseModel):
  ticker: str = Field(..., description="Ticker symbol")
  ok: bool = Field(..., description="Whether all profile-related calls succeeded")
  errors: List[str] = Field(default_factory=list)
  processed_at: datetime


class CronProfileStatusResponse(BaseModel):
  id: Optional[str] = Field(None, description="Cron run ID")
  started_at: datetime
  finished_at: datetime
  wait_sec: float
  limit: Optional[int] = None
  total_cached: int
  processed: int
  success: int
  failed: int
  tickers: List[CronTickerStatus]



