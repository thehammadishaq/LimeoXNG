"""
Institution Ownership Service

This service provides functions to fetch institutional ownership data
from a PostgreSQL database, mirroring the standalone institution_ownership_api.py
but adapted to the existing backend structure.
"""
from __future__ import annotations

from typing import List, Optional, Dict, Any, Generator
from datetime import date
from calendar import monthrange

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    BigInteger,
    Float,
    Text,
    Date,
    ForeignKey,
    func,
    desc,
    select,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

from config.settings import settings
import os


def _resolve_database_url() -> str:
    """
    Resolve Postgres connection string.

    Priority:
    1) backend/.env -> psql (backward compatible with your existing env)
    2) backend/.env -> POSTGRES_URL (new, explicit setting)
    """
    env_psql = os.getenv("psql")
    if env_psql:
        return env_psql

    if settings.POSTGRES_URL:
        return settings.POSTGRES_URL

    raise RuntimeError(
        "Postgres DATABASE_URL is not configured. "
        "Set 'psql' or 'POSTGRES_URL' in backend/.env, e.g. "
        "psql=postgresql://user:password@host:5432/sec_db"
    )


DATABASE_URL = _resolve_database_url()

engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()


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
    form_type = Column(String(20), nullable=True)
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
    security_type = Column(Text, nullable=True)
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


def get_db() -> Generator[Session, None, None]:
    """
    Dependency-style generator for getting a DB session.
    Routes can either use this directly with Depends or call SessionLocal().
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_ticker_details_cached(
    db: Session, ticker: str, quarter: Optional[str] = None, force_refresh: bool = False
) -> Optional[Dict[str, Any]]:
    """
    Get ticker details from ticker_details table.
    Mirrors the standalone implementation.
    """
    ticker_upper = ticker.upper()

    ticker_query = select(TickerDetails).where(TickerDetails.ticker == ticker_upper)
    ticker_details = db.execute(ticker_query).scalar_one_or_none()

    if ticker_details:
        weighted_shares_outstanding: Optional[int] = None
        if ticker_details.share_outstanding:
            weighted_shares_outstanding = int(ticker_details.share_outstanding * 1_000_000)

        return {
            "ticker": ticker_details.ticker,
            "name": ticker_details.name,
            "weighted_shares_outstanding": weighted_shares_outstanding,
        }

    return None


async def get_institution_ownership_by_ticker(
    db: Session,
    ticker: str,
    current_date: Optional[date] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Get all institutions holding a ticker from past 5 months with ownership calculation.
    Ported from the standalone institution_ownership_api, but kept as a pure service
    function that returns a simple list of dicts.
    """
    if current_date is None:
        current_date = date.today()

    # Calculate date range: past 5 months
    year = current_date.year
    month = current_date.month
    target_month = month - 5
    target_year = year

    if target_month <= 0:
        target_month += 12
        target_year -= 1

    try:
        start_date = date(target_year, target_month, current_date.day)
    except ValueError:
        last_day = monthrange(target_year, target_month)[1]
        start_date = date(target_year, target_month, last_day)

    end_date = current_date
    ticker_upper = ticker.upper()

    # Step 1: Find all companies with this ticker
    companies_query = select(Company).where(func.upper(Company.ticker) == ticker_upper)
    companies = db.execute(companies_query).scalars().all()

    # If not found by ticker, try matching by name via ticker_details
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
                    " corporation",
                    " corp.",
                    " corp",
                    " incorporated",
                    " inc.",
                    " inc",
                    " company",
                    " co.",
                    " co",
                    ", class a",
                    " class a",
                    ", class b",
                    " class b",
                ]:
                    if n.endswith(suffix):
                        n = n[: -len(suffix)]
                return n.strip()

            base_norm = normalize_name(raw_name)
            like_pattern = f"%{base_norm}%"
            companies = (
                db.execute(select(Company).where(func.lower(Company.name).ilike(like_pattern)))
                .scalars()
                .all()
            )

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
    weighted_shares_outstanding: Optional[int] = None
    if ticker_details:
        weighted_shares_outstanding = ticker_details.get("weighted_shares_outstanding")

    # Step 4: Process results - calculate ownership only for 13F-HR forms
    filer_map: Dict[int, Dict[str, Any]] = {}

    for position, filing, filer, company in results:
        filer_id = filer.filer_id

        # Skip if we already have this filer with a later or same date
        if filer_id in filer_map:
            existing_date = filer_map[filer_id].get("date")
            current_period = filing.period_of_report or filing.filing_date
            current_date_str = current_period.isoformat() if current_period else None

            if existing_date and current_date_str and existing_date >= current_date_str:
                continue

        # Limit to `limit` unique institutions
        if len(filer_map) >= limit and filer_id not in filer_map:
            continue

        shares = float(position.shares) if position.shares else None
        value_usd = float(position.value_usd) if position.value_usd else None  # noqa: F841

        ownership_percent: Optional[float] = None
        if filing.form_type in ["13F-HR", "13F-HR/A"]:
            if weighted_shares_outstanding and shares:
                ownership_percent = (shares / weighted_shares_outstanding) * 100
                ownership_percent = round(ownership_percent, 4)
        else:
            if position.ownership_percent is not None:
                ownership_percent = round(float(position.ownership_percent), 4)

        report_date = filing.period_of_report.isoformat() if filing.period_of_report else None
        if not report_date and filing.filing_date:
            report_date = filing.filing_date.isoformat()

        holder_data: Dict[str, Any] = {
            "name": filer.name,
            "ownership": ownership_percent,
            "date": report_date,
            "form_type": filing.form_type,
        }

        filer_map[filer_id] = holder_data

    holders: List[Dict[str, Any]] = list(filer_map.values())

    holders.sort(
        key=lambda x: (
            x.get("date") or "",
            -(x.get("ownership") or 0),
        ),
        reverse=True,
    )

    # Apply limit at the end as well (defensive)
    return holders[:limit]


