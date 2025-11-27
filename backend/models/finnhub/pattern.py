from pydantic import BaseModel, Field
from typing import List, Optional


class PatternPoint(BaseModel):
    """Single pattern recognition point from Finnhub /scan/pattern."""

    aprice: Optional[float] = Field(None, description="Price at point A")
    atime: Optional[int] = Field(None, description="Timestamp at point A (UNIX)")
    bprice: Optional[float] = Field(None, description="Price at point B")
    btime: Optional[int] = Field(None, description="Timestamp at point B (UNIX)")
    cprice: Optional[float] = Field(None, description="Price at point C")
    ctime: Optional[int] = Field(None, description="Timestamp at point C (UNIX)")
    dprice: Optional[float] = Field(None, description="Price at point D")
    dtime: Optional[int] = Field(None, description="Timestamp at point D (UNIX)")
    eprice: Optional[float] = Field(None, description="Price at point E")
    etime: Optional[int] = Field(None, description="Timestamp at point E (UNIX)")

    start_price: Optional[float] = Field(
        None, description="Pattern start price (e.g. neckline price)"
    )
    start_time: Optional[int] = Field(
        None, description="Pattern start time (UNIX timestamp)"
    )
    end_price: Optional[float] = Field(
        None, description="Pattern end price (e.g. neckline price)"
    )
    end_time: Optional[int] = Field(
        None, description="Pattern end time (UNIX timestamp)"
    )

    entry: Optional[float] = Field(None, description="Suggested entry price")
    stoploss: Optional[float] = Field(None, description="Suggested stop loss")
    profit1: Optional[float] = Field(None, description="First profit target")
    profit2: Optional[float] = Field(None, description="Second profit target")

    przmax: Optional[float] = Field(
        None, description="Maximum price of potential reversal zone (PRZ)"
    )
    przmin: Optional[float] = Field(
        None, description="Minimum price of potential reversal zone (PRZ)"
    )
    rrratio: Optional[float] = Field(
        None, description="Reward/risk ratio of the pattern"
    )

    patternname: Optional[str] = Field(
        None, description="Name of the pattern (e.g. Double Bottom, Bat)"
    )
    patterntype: Optional[str] = Field(
        None, description="Pattern type: bullish or bearish"
    )
    status: Optional[str] = Field(
        None, description="Pattern status (e.g. complete, incomplete)"
    )
    mature: Optional[int] = Field(
        None, description="Whether the pattern is mature (1) or not (0)"
    )
    terminal: Optional[int] = Field(
        None, description="Terminal flag used by pattern engine"
    )
    symbol: Optional[str] = Field(
        None, description="Symbol for which the pattern was detected"
    )

    sortTime: Optional[int] = Field(
        None, description="Sort time used by Finnhub for ordering (UNIX timestamp)"
    )

    xprice: Optional[float] = Field(None, description="Price at point X (harmonic)")
    xtime: Optional[int] = Field(None, description="Timestamp at point X (UNIX)")


class PatternScanFetchResponse(BaseModel):
    """Response model for pattern recognition fetch endpoint."""

    ticker: str = Field(..., description="Stock ticker symbol")
    resolution: str = Field(..., description="Resolution used for pattern scan")
    data: List[PatternPoint] = Field(
        ..., description="List of pattern recognition points from Finnhub"
    )
    saved_to_db: bool = Field(
        ..., description="Indicates if the data was saved to the database"
    )
    record_id: Optional[str] = Field(
        None, description="ID of the saved record if saved to DB"
    )




