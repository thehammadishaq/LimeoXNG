"""
Standalone Institution Ownership API

This file provides a complete API endpoint for getting institution ownership data.
It includes database connection, models, service function, and FastAPI endpoint.

Usage:
1. Configure your database connection string in DATABASE_URL
2. Import this file or run the FastAPI app directly
3. Access the endpoint at: GET /ticker/{ticker}/institution-ownership?current_date=YYYY-MM-DD

Example:
    GET /ticker/AAPL/institution-ownership
    GET /ticker/AAPL/institution-ownership?current_date=2025-01-15
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime
from calendar import monthrange

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import create_engine, Column, Integer, String, BigInteger, Float, Text, Date, ForeignKey, func, desc, select
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from pydantic import BaseModel, field_validator

# ==================== DATABASE CONNECTION SETUP ====================

# Configure your database URL here
# Format: postgresql://user:password@host:port/database
DATABASE_URL = "postgresql://talha:talha1122@192.168.1.10:5432/sec_db"

# Create engine and session
engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()


# ==================== DATABASE MODELS ====================

class Company(Base):
    __tablename__ = "companies"
    
    company_id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, nullable=True)
    ticker = Column(String(20), nullable=True)
    cusip = Column(String(20), nullable=True)
    sector = Column(Text, nullable=True)
    industry = Column(Text, nullable=True)
    
    positions = relationship("Position", back_populates="company")


class Filer(Base):
    __tablename__ = "filers"
    
    filer_id = Column(Integer, primary_key=True, index=True)
    cik = Column(String(20), nullable=False)
    name = Column(Text, nullable=False)
    
    filings = relationship("Filing", back_populates="filer")


class Filing(Base):
    __tablename__ = "filings"
    
    filing_id = Column(Integer, primary_key=True, index=True)
    filer_id = Column(Integer, ForeignKey("filers.filer_id"), nullable=False)
    cik = Column(String(50), nullable=True)
    form_type = Column(String(20), nullable=True)  # 13F-HR, 13G, 13G/A, 13D, 13D/A
    filing_date = Column(Date, nullable=True)
    period_of_report = Column(Date, nullable=True)
    sec_url = Column(Text, nullable=True)
    
    filer = relationship("Filer", back_populates="filings")
    positions = relationship("Position", back_populates="filing")


class Position(Base):
    __tablename__ = "positions"
    
    position_id = Column(Integer, primary_key=True, index=True)
    filing_id = Column(Integer, ForeignKey("filings.filing_id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=True)
    shares = Column(BigInteger, nullable=True)
    value_usd = Column(BigInteger, nullable=True)
    security_type = Column(Text, nullable=True)  # SH, PRN
    percentage_in_portfolio = Column(Float, nullable=True)
    ownership_percent = Column(Float, nullable=True)
    qtr_end_price = Column(Float, nullable=True)
    
    filing = relationship("Filing", back_populates="positions")
    company = relationship("Company", back_populates="positions")


class TickerDetails(Base):
    __tablename__ = "ticker_details"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    name = Column(Text, nullable=True)
    share_outstanding = Column(Float, nullable=True)  # In millions
    market_capitalization = Column(Float, nullable=True)
    sector = Column(Text, nullable=True)
    industry = Column(Text, nullable=True)
    logo = Column(Text, nullable=True)
    weburl = Column(Text, nullable=True)
    ipo = Column(Date, nullable=True)
    country = Column(String(50), nullable=True)
    exchange = Column(String(50), nullable=True)
    currency = Column(String(10), nullable=True)
    updated_at = Column(Date, nullable=True)


# ==================== PYDANTIC SCHEMAS ====================

class InstitutionOwnershipResponse(BaseModel):
    """Simplified response model for institution ownership - only name, ownership, date, and form_type"""
    name: str
    ownership: Optional[float] = None
    date: Optional[str] = None
    form_type: Optional[str] = None
    
    @field_validator("ownership", mode="before")
    @classmethod
    def convert_nan(cls, value: Optional[float]) -> Optional[float]:
        if isinstance(value, float) and value != value:
            return None
        return value


# ==================== DATABASE DEPENDENCY ====================

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==================== SERVICE FUNCTIONS ====================

async def get_ticker_details_cached(db: Session, ticker: str, quarter: Optional[str] = None, force_refresh: bool = False) -> Optional[Dict[str, Any]]:
    """
    Get ticker details from ticker_details table.
    
    Args:
        db: Database session
        ticker: Stock ticker symbol (e.g., "AAPL")
        quarter: Quarter string (not used, kept for compatibility)
        force_refresh: Not used, kept for compatibility
    
    Returns:
        Dictionary containing ticker details including weighted_shares_outstanding,
        or None if the ticker is not found.
    """
    ticker_upper = ticker.upper()
    
    # Query ticker_details table
    ticker_query = select(TickerDetails).where(
        TickerDetails.ticker == ticker_upper
    )
    
    ticker_details = db.execute(ticker_query).scalar_one_or_none()
        
    if ticker_details:
        # Convert share_outstanding from millions to actual shares
        weighted_shares_outstanding = None
        if ticker_details.share_outstanding:
            weighted_shares_outstanding = int(ticker_details.share_outstanding * 1_000_000)
        
        return {
            "ticker": ticker_details.ticker,
            "name": ticker_details.name,
            "weighted_shares_outstanding": weighted_shares_outstanding,
        }
    else:
        return None


async def get_institution_ownership_by_ticker(
    db: Session,
    ticker: str,
    current_date: Optional[date] = None
) -> List[dict]:
    """
    Get all institutions holding a ticker from past 5 months with ownership calculation.
    Only includes 13F-HR forms for ownership calculation. Returns top 100 unique by date (latest).
    
    Args:
        db: Database session
        ticker: Stock ticker symbol (e.g., "AAPL")
        current_date: Current date (defaults to today). Data will be fetched from (current_date - 5 months) to current_date.
    
    Returns:
        List of dictionaries containing institution ownership information:
        - name: Institution name
        - ownership: Ownership percentage
        - date: Date of the filing
        - form_type: Form type (13F-HR, 13G, 13D, etc.)
    """
    # Use current date if not provided
    if current_date is None:
        current_date = date.today()
    
    # Calculate date range: past 5 months
    # Subtract 5 months, handling year boundary
    year = current_date.year
    month = current_date.month
    
    # Calculate target month and year
    target_month = month - 5
    target_year = year
    
    if target_month <= 0:
        target_month += 12
        target_year -= 1
    
    # Use the same day if possible, otherwise use last day of month
    try:
        start_date = date(target_year, target_month, current_date.day)
    except ValueError:
        # Day doesn't exist in target month (e.g., Feb 30), use last day of month
        last_day = monthrange(target_year, target_month)[1]
        start_date = date(target_year, target_month, last_day)
    
    end_date = current_date
    
    ticker_upper = ticker.upper()
    
    # Step 1: Find all companies with this ticker
    companies_query = (
        select(Company)
        .where(func.upper(Company.ticker) == ticker_upper)
    )
    companies = db.execute(companies_query).scalars().all()
    
    # If we didn't find any companies by ticker, try to match by name using ticker_details
    if not companies:
        ticker_details = db.execute(
            select(TickerDetails).where(func.upper(TickerDetails.ticker) == ticker_upper)
        ).scalar_one_or_none()

        if ticker_details and ticker_details.name:
            raw_name = ticker_details.name.strip()

            def normalize_name(name: str) -> str:
                n = name.lower()
                n = n.replace(".", " ").replace(",", " ")
                n = " ".join(n.split())
                for suffix in [
                    " corporation", " corp.", " corp", " incorporated", " inc.", " inc",
                    " company", " co.", " co", ", class a", " class a", ", class b", " class b"
                ]:
                    if n.endswith(suffix):
                        n = n[: -len(suffix)]
                return n.strip()

            base_norm = normalize_name(raw_name)
            like_pattern = f"%{base_norm}%"
            companies = db.execute(
                select(Company).where(func.lower(Company.name).ilike(like_pattern))
            ).scalars().all()
    
    if not companies:
        return []
    
    company_ids = [c.company_id for c in companies]
    
    # Step 2: Get all positions from past 5 months (all form types)
    positions_query = (
        select(Position, Filing, Filer, Company)
        .join(Filing, Position.filing_id == Filing.filing_id)
        .join(Filer, Filing.filer_id == Filer.filer_id)
        .join(Company, Position.company_id == Company.company_id)
        .where(Position.company_id.in_(company_ids))
        .where(Filing.period_of_report >= start_date)
        .where(Filing.period_of_report <= end_date)
        .where(Filing.period_of_report.isnot(None))
        .order_by(desc(Filing.period_of_report), desc(Position.value_usd))
    )
    
    results = db.execute(positions_query).all()
    
    # Step 3: Get ticker details for ownership calculation (only needed for 13F-HR)
    ticker_details = await get_ticker_details_cached(db, ticker, quarter=None, force_refresh=False)
    weighted_shares_outstanding = None
    if ticker_details:
        weighted_shares_outstanding = ticker_details.get("weighted_shares_outstanding")
    
    # Step 4: Process results - calculate ownership only for 13F-HR forms
    # Track unique filers - keep only latest filing per institution (top 100 unique)
    filer_map = {}  # filer_id -> holder data with latest period_of_report
    
    for position, filing, filer, company in results:
        filer_id = filer.filer_id
        
        # Skip if we already have this filer with a later or same date
        if filer_id in filer_map:
            existing_date = filer_map[filer_id].get("date")
            current_period = filing.period_of_report if filing.period_of_report else filing.filing_date
            current_date_str = current_period.isoformat() if current_period else None
            
            # Keep existing if it's later or same, skip current
            if existing_date and current_date_str and existing_date >= current_date_str:
                continue
        
        # Stop if we already have 100 unique institutions
        if len(filer_map) >= 100 and filer_id not in filer_map:
            continue
        
        # Get shares and value
        shares = float(position.shares) if position.shares else None
        value_usd = float(position.value_usd) if position.value_usd else None
        
        # Get ownership percent:
        # - For 13F-HR forms: Calculate from shares and weighted_shares_outstanding
        # - For other forms (13G, 13D, etc.): Use existing ownership_percent from position entry
        ownership_percent = None
        if filing.form_type in ["13F-HR", "13F-HR/A"]:
            # Calculate ownership for 13F-HR forms
            if weighted_shares_outstanding and shares:
                ownership_percent = (shares / weighted_shares_outstanding) * 100
                ownership_percent = round(ownership_percent, 4)
        else:
            # For other forms, use the ownership_percent already stored in the position
            if position.ownership_percent is not None:
                ownership_percent = float(position.ownership_percent)
                ownership_percent = round(ownership_percent, 4)
        
        # Use period_of_report as the date, fallback to filing_date
        report_date = filing.period_of_report.isoformat() if filing.period_of_report else None
        if not report_date and filing.filing_date:
            report_date = filing.filing_date.isoformat()
        
        holder_data = {
            "name": filer.name,
            "ownership": ownership_percent,
            "date": report_date,
            "form_type": filing.form_type,
        }
        
        # Store in map (will keep latest by period_of_report due to ordering)
        filer_map[filer_id] = holder_data
    
    # Convert map to list
    holders = list(filer_map.values())
    
    # Sort by date descending (latest first), then by ownership descending
    holders.sort(
        key=lambda x: (
            x.get("date") or "",
            -(x.get("ownership") or 0)
        ),
        reverse=True
    )
    
    # Limit to top 100
    holders = holders[:100]
    
    return holders


# ==================== FASTAPI ROUTER ====================

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("/ticker/{ticker}/institution-ownership", response_model=List[InstitutionOwnershipResponse])
async def get_institution_ownership_by_ticker_endpoint(
    ticker: str,
    current_date: Optional[str] = Query(None, description="Current date in YYYY-MM-DD format. If not provided, uses today's date."),
    db: Session = Depends(get_db)
) -> List[InstitutionOwnershipResponse]:
    """
    Get all institutions holding a ticker from past 5 months with ownership calculation.
    
    This endpoint:
    1. Takes ticker and current_date (defaults to today)
    2. Gets data from past 5 months (from current_date - 5 months to current_date)
    3. Gets all institutions holding this ticker
    4. Only calculates ownership for 13F-HR forms (not other forms like 13G, 13D)
    5. Returns top 100 unique institutions by date (latest first)
    
    For non-13F forms (like 13G, 13D), uses the ownership_percent already stored in the database.
    
    Args:
        ticker: Stock ticker symbol (e.g., "AAPL", "TSLA")
        current_date: Current date in YYYY-MM-DD format. If not provided, uses today's date.
        db: Database session
    
    Returns:
        List of simplified institutional ownership information with:
        - name: Institution name
        - ownership: Ownership percentage (only for 13F-HR forms, None for others)
        - date: Date of the filing (period_of_report or filing_date)
        - form_type: Form type (13F-HR, 13G, 13D, etc.)
    
    Example:
        GET /ticker/AAPL/institution-ownership
        GET /ticker/AAPL/institution-ownership?current_date=2025-01-15
    """
    # Parse current_date if provided
    parsed_current_date = None
    if current_date:
        try:
            parsed_current_date = datetime.strptime(current_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format for current_date: '{current_date}'. Expected format: YYYY-MM-DD"
            )
    
    try:
        holders = await get_institution_ownership_by_ticker(db, ticker, parsed_current_date)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        import traceback
        print(f"❌ Error in get_institution_ownership_by_ticker endpoint: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )
    
    if not holders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No institutional ownership data found for ticker '{ticker}' in the past 5 months or ticker does not exist",
        )
    
    return [InstitutionOwnershipResponse.model_validate(holder) for holder in holders]


# ==================== FASTAPI APP SETUP ====================

def create_app() -> FastAPI:
    """Create and configure FastAPI app"""
    app = FastAPI(
        title="Institution Ownership API",
        description="API for getting institution ownership data for tickers",
        version="1.0.0",
    )
    
    app.include_router(router)
    
    return app


# ==================== MAIN ENTRY POINT ====================

if __name__ == "__main__":
    import uvicorn
    
    app = create_app()
    
    print("=" * 60)
    print("Institution Ownership API")
    print("=" * 60)
    print(f"Database URL: {DATABASE_URL}")
    print("Starting server on http://localhost:8000")
    print("API docs available at http://localhost:8000/docs")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

