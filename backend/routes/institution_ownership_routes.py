"""
Institution Ownership Routes

FastAPI router that exposes an API endpoint for institutional ownership,
mirroring the standalone institution_ownership_api but integrated into the
existing backend structure and using PostgreSQL as the data source.
"""
from __future__ import annotations

from typing import List, Optional
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from services.institution_ownership_service import (
    get_institution_ownership_by_ticker,
    get_db,
)


router = APIRouter(prefix="/companies", tags=["Companies - Ownership"])


class InstitutionOwnershipResponse(BaseModel):
    """Simplified response model for institution ownership - only name, ownership, date, and form_type"""

    name: str
    ownership: Optional[float] = None
    date: Optional[str] = None
    form_type: Optional[str] = None

    @field_validator("ownership", mode="before")
    @classmethod
    def convert_nan(cls, value):
        if isinstance(value, float) and value != value:  # NaN check
            return None
        return value


@router.get(
    "/ticker/{ticker}/institution-ownership",
    response_model=List[InstitutionOwnershipResponse],
)
async def get_institution_ownership_by_ticker_endpoint(
    ticker: str,
    current_date: Optional[str] = Query(
        None,
        description="Current date in YYYY-MM-DD format. If not provided, uses today's date.",
    ),
    limit: int = Query(
        100,
        ge=1,
        le=1000,
        description="Maximum number of institutions to return (default 100).",
    ),
    db: Session = Depends(get_db),
) -> List[InstitutionOwnershipResponse]:
    """
    Get all institutions holding a ticker from past 5 months with ownership calculation.

    - Uses PostgreSQL SEC database (companies, filers, filings, positions, ticker_details).
    - For 13F-HR forms, ownership is calculated from shares and weighted_shares_outstanding.
    - For other forms (13G, 13D, etc.), uses ownership_percent stored in DB.
    - Returns up to `limit` unique institutions (latest filings first, default 100).
    """
    parsed_current_date: Optional[date] = None
    if current_date:
        try:
            parsed_current_date = datetime.strptime(current_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format for current_date: '{current_date}'. Expected format: YYYY-MM-DD",
            )

    try:
        holders = await get_institution_ownership_by_ticker(
            db=db,
            ticker=ticker,
            current_date=parsed_current_date,
            limit=limit,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Log and hide internal details from client
        import traceback

        print(f"❌ Error in get_institution_ownership_by_ticker endpoint: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while fetching institutional ownership data.",
        )

    if not holders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No institutional ownership data found for ticker '{ticker}' "
                "in the past 5 months or ticker does not exist"
            ),
        )

    return [InstitutionOwnershipResponse.model_validate(holder) for holder in holders]


