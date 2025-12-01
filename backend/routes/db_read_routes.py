"""
Database Read-Only Routes

These endpoints read data ONLY from MongoDB collections:
- finnhub-profile2 (CompanyProfile)
- finnhub-basic-financials (BasicFinancials)

No direct Finnhub API calls are made here.
"""
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional, Set

from schemas.company_profile import (
    CompanyProfileResponse,
    CompanyProfileListResponse,
)
from schemas.basic_financials import (
    BasicFinancialsResponse,
    BasicFinancialsListResponse,
)
from schemas.recommendation import (
    RecommendationResponse,
    RecommendationListResponse,
)
from schemas.earnings import EarningsResponse, EarningsListResponse
from schemas.stock_symbols import StockSymbolsListResponse
from schemas.cron_profile_cache import CronProfileStatusResponse, CronTickerStatus
from services.company_profile_service import CompanyProfileService
from services.basic_financials_service import BasicFinancialsService
from services.recommendation_service import RecommendationService
from services.earnings_service import EarningsService
from services.insider_transactions_service import InsiderTransactionsService
from models.finnhub.insider_transactions import (
    InsiderTransactionItem,
    InsiderTransactionsFetchResponse,
)
from models.news import NewsArticleDocument
from models.finnhub.company_news import (
    CompanyNewsArticle,
    CompanyNewsFetchResponse,
)
from services.symbols_cache_service import SymbolsCacheService
from models.cron_profile_cache import ProfileCacheCronRun
from models.stock_candles import LatestCandle
from models.company_profile import CompanyProfile
from models.basic_financials import BasicFinancials


router = APIRouter(prefix="/db", tags=["Database Read-Only"])


@router.get(
    "/profile/{ticker}",
    response_model=CompanyProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def get_profile_from_db(ticker: str):
    """
    Read-only endpoint to get a single company profile from MongoDB
    (collection: finnhub-profile2) by ticker.
    """
    service = CompanyProfileService()
    doc = await service.get_by_ticker(ticker.upper())

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company profile not found in database for ticker '{ticker.upper()}'.",
        )

    # Manually map Beanie document → Pydantic response to avoid ObjectId issues
    return CompanyProfileResponse(
        id=str(doc.id) if getattr(doc, "id", None) is not None else None,
        ticker=doc.ticker,
        data=doc.data,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.get(
    "/profiles",
    response_model=CompanyProfileListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_profiles_from_db(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(
        50, ge=1, le=500, description="Number of items per page (max 500)"
    ),
):
    """
    Read-only endpoint to list company profiles from MongoDB
    (collection: finnhub-profile2) with simple pagination.
    """
    service = CompanyProfileService()

    skip = (page - 1) * page_size
    items = await service.get_all(skip=skip, limit=page_size)
    total = await service.get_count()

    # Map each document to response model with stringified id
    profiles = [
        CompanyProfileResponse(
            id=str(doc.id) if getattr(doc, "id", None) is not None else None,
            ticker=doc.ticker,
            data=doc.data,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
        )
        for doc in items
    ]

    return CompanyProfileListResponse(
        profiles=profiles,
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------- Screener Symbols (server-side filtering) ----------


class ScreenerSymbolsRequest(BaseModel):
    """
    Request payload for screener symbol filtering.

    The `filters` dict is expected to mirror the frontend Screener filters object,
    e.g. keys like: peMax, forwardPeMax, pegMax, pbMax, psMax, evEbitdaMax,
    netMarginMin, roeMin, ytdReturnMin, latestCloseMin, latestVolumeMin, etc.
    Empty-string values are treated as "no filter".
    """

    filters: Dict[str, Any] = Field(
        default_factory=dict, description="Raw filters object from frontend Screener"
    )
    search: Optional[str] = Field(
        None, description="Search term to filter tickers by ticker symbol or company name"
    )


class ScreenerSymbolsResponse(BaseModel):
    """Response with the list of tickers matching the filters."""

    symbols: List[str]
    total: int


def _parse_float(value: Any) -> Optional[float]:
    """Best-effort conversion of incoming filter value to float."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        s = str(value).strip()
        if not s:
          return None
        # Remove non-numeric characters commonly used in UI (%, commas, spaces)
        import re

        cleaned = re.sub(r"[^0-9.+-]", "", s)
        if not cleaned:
            return None
        return float(cleaned)
    except Exception:
        return None


@router.post(
    "/screener-symbols",
    response_model=ScreenerSymbolsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_screener_symbols(request: ScreenerSymbolsRequest):
    """
    Server-side screener filtering endpoint.

    This endpoint reads from MongoDB only (no Finnhub calls) and returns
    the list of **tickers** that match the provided filters across:

    - Basic Financials metrics (collection: finnhub-basic-financials)
    - Company profiles (collection: finnhub-profile2)
    - Latest 1‑minute candles (collection: finnhub-latest-candles)

    Frontend can then paginate these symbols and fetch per-symbol profile +
    financials via existing DB endpoints.
    """

    filters = request.filters or {}

    # 1) Build BasicFinancials-based filter (valuation, profitability, growth, etc.)
    bf_query: Dict[str, Any] = {}

    def add_bf_lte(metric_key: str, filter_key: str):
        raw = filters.get(filter_key)
        val = _parse_float(raw)
        if val is not None:
            bf_query.setdefault(f"data.metric.{metric_key}", {})
            bf_query[f"data.metric.{metric_key}"]["$lte"] = val

    def add_bf_gte(metric_key: str, filter_key: str, is_percent: bool = False):
        raw = filters.get(filter_key)
        val = _parse_float(raw)
        if val is not None:
            threshold = val / 100.0 if is_percent else val
            bf_query.setdefault(f"data.metric.{metric_key}", {})
            bf_query[f"data.metric.{metric_key}"]["$gte"] = threshold

    # --- Valuation (numeric, not %)
    add_bf_lte("peTTM", "peMax")
    add_bf_lte("forwardPE", "forwardPeMax")
    add_bf_lte("pegTTM", "pegMax")
    add_bf_lte("pb", "pbMax")
    # Prefer psTTM, fall back to psAnnual in frontend; here we use psTTM
    add_bf_lte("psTTM", "psMax")
    add_bf_lte("evEbitdaTTM", "evEbitdaMax")

    # --- Profitability (percent metrics)
    add_bf_gte("netProfitMarginTTM", "netMarginMin", is_percent=True)
    add_bf_gte("operatingMarginTTM", "operMarginMin", is_percent=True)
    add_bf_gte("grossMarginTTM", "grossMarginMin", is_percent=True)
    add_bf_gte("roeTTM", "roeMin", is_percent=True)
    add_bf_gte("roaTTM", "roaMin", is_percent=True)
    add_bf_gte("roicTTM", "roiMin", is_percent=True)

    # --- Growth (percent)
    add_bf_gte("revenueGrowthTTMYoy", "revGrowthYoyMin", is_percent=True)
    add_bf_gte("revenueGrowth3Y", "revGrowth3YMin", is_percent=True)
    add_bf_gte("revenueGrowth5Y", "revGrowth5YMin", is_percent=True)
    add_bf_gte("epsGrowthTTMYoy", "epsGrowthYoyMin", is_percent=True)
    add_bf_gte("epsGrowth3Y", "epsGrowth3YMin", is_percent=True)
    add_bf_gte("epsGrowth5Y", "epsGrowth5YMin", is_percent=True)
    # Cash Flow Growth / EBITDA Growth (5Y CAGR)
    add_bf_gte("focfCagr5Y", "cashFlowGrowthMin", is_percent=True)
    add_bf_gte("ebitdaCagr5Y", "ebitdaGrowthMin", is_percent=True)

    # --- Cash Flow (numeric)
    add_bf_gte("freeCashFlowPerShareTTM", "fcfPerShareMin", is_percent=False)
    add_bf_lte("currentEv/freeCashFlowTTM", "evFcfMax")

    # --- Financial Health
    add_bf_lte("totalDebtToEquity", "deRatioMax")
    add_bf_gte("netInterestCoverageAnnual", "interestCoverageMin")
    add_bf_gte("currentRatioAnnual", "currentRatioMin")
    add_bf_gte("quickRatioAnnual", "quickRatioMin")

    # --- Price Strength (percent)
    add_bf_gte("yearToDatePriceReturnDaily", "ytdReturnMin", is_percent=True)
    add_bf_gte("5DayPriceReturnDaily", "return5DMin", is_percent=True)
    add_bf_gte("monthToDatePriceReturnDaily", "return1MMin", is_percent=True)
    add_bf_gte("13WeekPriceReturnDaily", "return3MMin", is_percent=True)
    add_bf_gte("priceRelativeToS&P50052Week", "relSp5001YMin", is_percent=True)

    # Execute BasicFinancials query (if any)
    ticker_set: Optional[Set[str]] = None
    if bf_query:
        # Beanie projection on single fields can be tricky; fetch full docs and
        # extract tickers in Python for simplicity and robustness.
        bf_docs = await BasicFinancials.find(bf_query).to_list()
        ticker_set = {doc.ticker for doc in bf_docs}

    # 2) Latest 1‑minute candle filters
    latest_close_min = _parse_float(filters.get("latestCloseMin"))
    latest_volume_min = _parse_float(filters.get("latestVolumeMin"))

    if latest_close_min is not None or latest_volume_min is not None:
        lc_query: Dict[str, Any] = {"resolution": "D"}
        if latest_close_min is not None:
            lc_query["close"] = {"$lte": latest_close_min}
        if latest_volume_min is not None:
            lc_query["volume"] = {"$lte": latest_volume_min}

        cursor = LatestCandle.find(lc_query)
        lc_docs = await cursor.to_list()
        lc_tickers = {doc.ticker for doc in lc_docs}

        if ticker_set is None:
            ticker_set = lc_tickers
        else:
            ticker_set &= lc_tickers

    # 3) Sector / industry filters via CompanyProfile
    sector = filters.get("sector")
    industry = filters.get("industry")
    has_sector_filter = sector and sector != "Any"
    has_industry_filter = industry and industry != "Any"

    if has_sector_filter or has_industry_filter:
        cp_query: Dict[str, Any] = {}
        and_clauses: List[Dict[str, Any]] = []

        if has_sector_filter:
            and_clauses.append(
                {
                    "$or": [
                        {"data.gsector": sector},
                        {"data.finnhubIndustry": sector},
                    ]
                }
            )

        if has_industry_filter:
            and_clauses.append(
                {
                    "$or": [
                        {"data.gind": industry},
                        {"data.finnhubIndustry": industry},
                    ]
                }
            )

        if ticker_set is not None:
            and_clauses.append({"ticker": {"$in": list(ticker_set)}})

        if len(and_clauses) == 1:
            cp_query = and_clauses[0]
        else:
            cp_query = {"$and": and_clauses}

        cp_docs = await CompanyProfile.find(cp_query).to_list()
        cp_tickers = {doc.ticker for doc in cp_docs}

        if ticker_set is None:
            ticker_set = cp_tickers
        else:
            ticker_set &= cp_tickers

    # 4) If still no ticker set (no filters at all), default to all profiles tickers
    if ticker_set is None:
        all_profiles = await CompanyProfile.find_all().to_list()
        ticker_set = {doc.ticker for doc in all_profiles}

    # 5) Apply search filter (ticker symbol or company name)
    search_term = request.search
    if search_term and search_term.strip():
        search_upper = search_term.strip().upper()
        
        # Filter by ticker symbol (case-insensitive)
        ticker_matches = {t for t in ticker_set if search_upper in t.upper()}
        
        # Also search by company name from CompanyProfile
        company_name_matches: Set[str] = set()
        if ticker_set:
            # Fetch profiles for tickers in current set
            profile_query = {"ticker": {"$in": list(ticker_set)}}
            matching_profiles = await CompanyProfile.find(profile_query).to_list()
            # Filter by company name (case-insensitive)
            for doc in matching_profiles:
                company_name = (doc.data.get("name") or "").upper()
                if search_upper in company_name:
                    company_name_matches.add(doc.ticker)
        
        # Combine ticker and company name matches
        ticker_set = ticker_matches | company_name_matches

    symbols_sorted = sorted(ticker_set)

    return ScreenerSymbolsResponse(symbols=symbols_sorted, total=len(symbols_sorted))


@router.get(
    "/basic-financials/{ticker}",
    response_model=BasicFinancialsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_basic_financials_from_db(ticker: str):
    """
    Read-only endpoint to get a single basic financials document from MongoDB
    (collection: finnhub-basic-financials) by ticker.
    """
    service = BasicFinancialsService()
    doc = await service.get_by_ticker(ticker.upper())

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Basic financials not found in database for ticker '{ticker.upper()}'.",
        )

    # Manually map Beanie document → Pydantic response to avoid ObjectId issues
    return BasicFinancialsResponse(
        id=str(doc.id) if getattr(doc, "id", None) is not None else None,
        ticker=doc.ticker,
        data=doc.data,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.get(
    "/basic-financials",
    response_model=BasicFinancialsListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_basic_financials_from_db(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(
        50, ge=1, le=500, description="Number of items per page (max 500)"
    ),
):
    """
    Read-only endpoint to list basic financials documents from MongoDB
    (collection: finnhub-basic-financials) with simple pagination.
    """
    service = BasicFinancialsService()

    skip = (page - 1) * page_size
    items = await service.get_all(skip=skip, limit=page_size)
    total = await service.get_count()

    # Map each document to response model with stringified id
    responses = [
        BasicFinancialsResponse(
            id=str(doc.id) if getattr(doc, "id", None) is not None else None,
            ticker=doc.ticker,
            data=doc.data,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
        )
        for doc in items
    ]

    return BasicFinancialsListResponse(
        items=responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/recommendation/{ticker}",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
)
async def get_recommendation_from_db(ticker: str):
    """
    Read-only endpoint to get analyst recommendation trends from MongoDB
    (collection: finnhub-recommendation-trends) by ticker.
    """
    service = RecommendationService()
    doc = await service.get_by_ticker(ticker.upper())

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Recommendation trends not found in database for "
                f"ticker '{ticker.upper()}'."
            ),
        )

    return RecommendationResponse(
        id=str(doc.id) if getattr(doc, "id", None) is not None else None,
        ticker=doc.ticker,
        data=doc.data,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.get(
    "/recommendations",
    response_model=RecommendationListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_recommendations_from_db(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(
        50, ge=1, le=500, description="Number of items per page (max 500)"
    ),
):
    """
    Read-only endpoint to list analyst recommendation trends from MongoDB
    (collection: finnhub-recommendation-trends) with simple pagination.
    """
    service = RecommendationService()

    skip = (page - 1) * page_size
    items = await service.get_all(skip=skip, limit=page_size)
    total = await service.get_count()

    responses = [
        RecommendationResponse(
            id=str(doc.id) if getattr(doc, "id", None) is not None else None,
            ticker=doc.ticker,
            data=doc.data,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
        )
        for doc in items
    ]

    return RecommendationListResponse(
        items=responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/earnings/{ticker}",
    response_model=EarningsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_earnings_from_db(ticker: str):
    """
    Read-only endpoint to get historical earnings surprises from MongoDB
    (collection: finnhub-earnings-history) by ticker.
    """
    service = EarningsService()
    doc = await service.get_by_ticker(ticker.upper())

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Earnings history not found in database for "
                f"ticker '{ticker.upper()}'."
            ),
        )

    return EarningsResponse(
        id=str(doc.id) if getattr(doc, "id", None) is not None else None,
        ticker=doc.ticker,
        data=doc.data,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.get(
    "/earnings",
    response_model=EarningsListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_earnings_from_db(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(
        50, ge=1, le=500, description="Number of items per page (max 500)"
    ),
):
    """
    Read-only endpoint to list earnings history documents from MongoDB
    (collection: finnhub-earnings-history) with simple pagination.
    """
    service = EarningsService()

    skip = (page - 1) * page_size
    items = await service.get_all(skip=skip, limit=page_size)
    total = await service.get_count()

    responses = [
        EarningsResponse(
            id=str(doc.id) if getattr(doc, "id", None) is not None else None,
            ticker=doc.ticker,
            data=doc.data,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
        )
        for doc in items
    ]

    return EarningsListResponse(
        items=responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/insider-transactions/{ticker}",
    response_model=InsiderTransactionsFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def get_insider_transactions_from_db(
    ticker: str,
    limit: int = Query(
        50,
        ge=1,
        le=500,
        description="Max number of insider transactions to return",
    ),
):
    """
    Read-only endpoint to get insider transactions from MongoDB
    (collection: finnhub-Insider-Transactions) by ticker.
    """
    service = InsiderTransactionsService()
    docs = await service.get_by_symbol(ticker.upper(), limit=limit)

    if not docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Insider transactions not found in database for "
                f"ticker '{ticker.upper()}'."
            ),
        )

    items = [
        InsiderTransactionItem(
            name=doc.name,
            share=doc.share,
            change=doc.change,
            filingDate=doc.filingDate,
            transactionDate=doc.transactionDate,
            transactionCode=doc.transactionCode,
            transactionPrice=doc.transactionPrice,
            symbol=doc.symbol,
        )
        for doc in docs
    ]

    return InsiderTransactionsFetchResponse(
        symbol=ticker.upper(),
        from_date=None,
        to_date=None,
        limit=limit,
        data=items,
        saved_to_db=True,
        total_transactions=len(items),
    )


@router.get(
    "/company-news/{ticker}",
    response_model=CompanyNewsFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def get_company_news_from_db(
    ticker: str,
    limit: int = Query(
        50,
        ge=1,
        le=200,
        description="Max number of company news articles to return",
    ),
):
    """
    Read-only endpoint to get company-specific news from MongoDB
    (collection: finnhub-News-Articles, category='company-news') by ticker.
    """
    symbol_upper = ticker.upper().strip()

    # Basic filter: category == 'company-news' and related contains ticker
    # Note: related is a pipe-delimited string from Finnhub
    # Use raw MongoDB regex filter to avoid ExpressionField callable issues.
    regex_pattern = f".*{symbol_upper}.*"
    docs = (
        await NewsArticleDocument.find(
            {
                "category": "company-news",
                "related": {"$regex": regex_pattern},
            }
        )
        .sort(-NewsArticleDocument.published_at)
        .limit(limit)
        .to_list()
    )

    if not docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Company news not found in database for "
                f"ticker '{symbol_upper}'."
            ),
        )

    articles: list[CompanyNewsArticle] = []
    for doc in docs:
        raw = doc.raw or {}
        try:
            articles.append(CompanyNewsArticle(**raw))
        except Exception:
            # Fallback mapping from document fields
            articles.append(
                CompanyNewsArticle(
                    category=raw.get("category", "company-news"),
                    datetime=raw.get(
                        "datetime", int(doc.published_at.timestamp())
                    ),
                    headline=raw.get("headline", doc.headline),
                    id=raw.get("id", doc.finnhub_id),
                    image=raw.get("image", doc.image),
                    related=raw.get("related", doc.related),
                    source=raw.get("source", doc.source),
                    summary=raw.get("summary", doc.summary or ""),
                    url=raw.get("url", doc.url),
                )
            )

    return CompanyNewsFetchResponse(
        symbol=symbol_upper,
        date_from="",
        date_to="",
        data=articles,
        saved_to_db=True,
        total_articles=len(articles),
    )


@router.get(
    "/symbols",
    response_model=StockSymbolsListResponse,
    status_code=status.HTTP_200_OK,
)
async def get_stock_symbols_from_db():
    """
    Read-only endpoint to get the cached list of stock symbols from MongoDB
    (collection: stock_symbols_cache).

    Returns:
        - symbols: List of ticker strings
        - total: Total number of symbols
        - exchanges: Exchanges included in the cache
        - updated_at: Last time the cache was updated
    """
    service = SymbolsCacheService()
    cache = await service.get_cached_symbols()

    if not cache:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock symbols cache not found in database.",
        )

    return StockSymbolsListResponse(
        symbols=cache.symbols,
        total=cache.total_count,
        exchanges=cache.exchanges,
        updated_at=cache.updated_at,
    )


@router.get(
    "/cron/profile-status",
    response_model=CronProfileStatusResponse,
    status_code=status.HTTP_200_OK,
)
async def get_latest_profile_cron_status():
    """
    Read-only endpoint to fetch the latest profile-cache cron job status from MongoDB.

    Returns the most recent run metadata with per-ticker statuses aggregated across ALL runs.
    For each ticker, returns the most recent processed_at timestamp from any cron run.
    """
    # Get most recent cron run by started_at (for metadata)
    latest_list = (
        await ProfileCacheCronRun.find()
        .sort(-ProfileCacheCronRun.started_at)
        .limit(1)
        .to_list()
    )

    if not latest_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile-cache cron runs found in database.",
        )

    latest = latest_list[0]

    # Get all cron runs (sorted by started_at descending) to aggregate ticker data
    # Limit to recent 100 runs to avoid performance issues
    all_runs = (
        await ProfileCacheCronRun.find()
        .sort(-ProfileCacheCronRun.started_at)
        .limit(100)
        .to_list()
    )

    # Aggregate ticker data across all runs
    # Key: ticker (uppercase), Value: {processed_at, ok, errors, run_started_at}
    ticker_map: Dict[str, Dict[str, Any]] = {}

    for run in all_runs:
        for ticker_result in run.tickers:
            ticker_upper = ticker_result.ticker.upper()
            
            # If ticker not seen before, or if this run has a more recent processed_at
            if ticker_upper not in ticker_map:
                ticker_map[ticker_upper] = {
                    "ticker": ticker_result.ticker,
                    "processed_at": ticker_result.processed_at,
                    "ok": ticker_result.ok,
                    "errors": ticker_result.errors,
                    "run_started_at": run.started_at,
                }
            else:
                # Update if this run's processed_at is more recent
                existing = ticker_map[ticker_upper]
                if ticker_result.processed_at > existing["processed_at"]:
                    existing["processed_at"] = ticker_result.processed_at
                    existing["ok"] = ticker_result.ok
                    existing["errors"] = ticker_result.errors
                    existing["run_started_at"] = run.started_at
                # If same processed_at but this run is more recent, prefer its status
                elif (
                    ticker_result.processed_at == existing["processed_at"]
                    and run.started_at > existing["run_started_at"]
                ):
                    existing["ok"] = ticker_result.ok
                    existing["errors"] = ticker_result.errors
                    existing["run_started_at"] = run.started_at

    # Convert to list of CronTickerStatus, sorted by ticker
    ticker_statuses = [
        CronTickerStatus(
            ticker=data["ticker"],
            ok=data["ok"],
            errors=data["errors"],
            processed_at=data["processed_at"],
        )
        for _, data in sorted(ticker_map.items())
    ]

    return CronProfileStatusResponse(
        id=str(latest.id) if getattr(latest, "id", None) is not None else None,
        started_at=latest.started_at,
        finished_at=latest.finished_at,
        wait_sec=latest.wait_sec,
        limit=latest.limit,
        total_cached=latest.total_cached,
        processed=latest.processed,
        success=latest.success,
        failed=latest.failed,
        tickers=ticker_statuses,
    )


@router.get(
    "/cron/profile-status/{job_id}",
    response_model=CronProfileStatusResponse,
    status_code=status.HTTP_200_OK,
)
async def get_profile_cron_status_by_id(job_id: str):
    """
    Get status of a specific profile-cache cron job by job_id.
    Useful for polling real-time updates while job is running.
    """
    from bson import ObjectId

    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid job_id format: {job_id}",
        )

    cron_run = await ProfileCacheCronRun.get(obj_id)

    if not cron_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cron job with id {job_id} not found.",
        )

    # Map document → response model
    ticker_statuses = [
        CronTickerStatus(
            ticker=t.ticker,
            ok=t.ok,
            errors=t.errors,
            processed_at=t.processed_at,
        )
        for t in cron_run.tickers
    ]

    return CronProfileStatusResponse(
        id=str(cron_run.id) if getattr(cron_run, "id", None) is not None else None,
        started_at=cron_run.started_at,
        finished_at=cron_run.finished_at,
        wait_sec=cron_run.wait_sec,
        limit=cron_run.limit,
        total_cached=cron_run.total_cached,
        processed=cron_run.processed,
        success=cron_run.success,
        failed=cron_run.failed,
        tickers=ticker_statuses,
    )


@router.get(
    "/latest-candles",
    status_code=status.HTTP_200_OK,
)
async def list_latest_candles_from_db(
    min_close: float | None = Query(
        None,
        description="Minimum close price for latest 1m candle",
    ),
    min_volume: float | None = Query(
        None,
        description="Minimum volume for latest 1m candle",
    ),
):
    """
    Read-only endpoint to list latest 1-day candles from MongoDB
    (collection: finnhub-latest-candles), optionally filtered by close
    price and volume.
    """
    query: dict = {}
    if min_close is not None:
        query["close"] = {"$gte": min_close}
    if min_volume is not None:
        query["volume"] = {"$gte": min_volume}

    cursor = LatestCandle.find(query) if query else LatestCandle.find()
    docs = await cursor.to_list()

    items = [
        {
            "ticker": doc.ticker,
            "resolution": doc.resolution,
            "open": doc.open,
            "high": doc.high,
            "low": doc.low,
            "close": doc.close,
            "volume": doc.volume,
            "timestamp": doc.timestamp,
        }
        for doc in docs
    ]

    return {
        "items": items,
        "total": len(items),
    }

