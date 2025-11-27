"""
Pydantic Schemas for Pattern Recognition Scans
Request and Response models for DB-facing API endpoints (if needed)
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class PatternScanCreate(BaseModel):
  """
  Schema for creating/uploading pattern scan document.
  """

  ticker: str = Field(..., description="Stock ticker symbol", example="AAPL")
  resolution: str = Field(
      ...,
      description="Resolution used for pattern scan (1,5,15,30,60,D,W,M)",
      example="D",
  )
  data: Dict[str, Any] = Field(
      ..., description="Raw pattern scan payload from Finnhub /scan/pattern"
  )


class PatternScanResponse(BaseModel):
  """
  Schema for pattern scan response (single document).
  """

  id: Optional[str] = Field(None, alias="_id")  # MongoDB uses _id
  ticker: str
  resolution: str
  data: Dict[str, Any]
  created_at: Optional[datetime] = None
  updated_at: Optional[datetime] = None

  class Config:
      from_attributes = True
      populate_by_name = True


class PatternScanUpdate(BaseModel):
  """
  Schema for updating pattern scan (replace raw data).
  """

  data: Optional[Dict[str, Any]] = None




