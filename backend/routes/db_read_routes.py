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

    # Map operator strings to MongoDB operators
    def get_mongo_operator(op: str) -> str:
        operator_map = {
            "lte": "$lte",
            "lt": "$lt",
            "gte": "$gte",
            "gt": "$gt",
            "eq": "$eq",
            "ne": "$ne"
        }
        return operator_map.get(op, "$gte")  # Default to gte if invalid

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

    def add_bf_with_operator(metric_key: str, filter_key: str, operator_key: str, is_percent: bool = False, default_operator: str = "gte"):
        raw = filters.get(filter_key)
        val = _parse_float(raw)
        if val is not None:
            threshold = val / 100.0 if is_percent else val
            operator = filters.get(operator_key, default_operator)
            mongo_op = get_mongo_operator(operator)
            bf_query.setdefault(f"data.metric.{metric_key}", {})
            bf_query[f"data.metric.{metric_key}"][mongo_op] = threshold

    # --- Valuation (numeric, not %) - with operators
    add_bf_with_operator("peTTM", "peMax", "peOperator", is_percent=False, default_operator="lte")
    add_bf_with_operator("forwardPE", "forwardPeMax", "forwardPeOperator", is_percent=False, default_operator="lte")
    add_bf_with_operator("pegTTM", "pegMax", "pegOperator", is_percent=False, default_operator="lte")
    add_bf_with_operator("pb", "pbMax", "pbOperator", is_percent=False, default_operator="lte")
    # Prefer psTTM, fall back to psAnnual in frontend; here we use psTTM
    add_bf_with_operator("psTTM", "psMax", "psOperator", is_percent=False, default_operator="lte")
    add_bf_with_operator("evEbitdaTTM", "evEbitdaMax", "evEbitdaOperator", is_percent=False, default_operator="lte")

    # --- Profitability (percent metrics) - with operators
    add_bf_with_operator("netProfitMarginTTM", "netMarginMin", "netMarginOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("operatingMarginTTM", "operMarginMin", "operMarginOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("grossMarginTTM", "grossMarginMin", "grossMarginOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("roeTTM", "roeMin", "roeOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("roaTTM", "roaMin", "roaOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("roicTTM", "roiMin", "roiOperator", is_percent=True, default_operator="gte")

    # --- Growth (percent) - with operators
    add_bf_with_operator("revenueGrowthTTMYoy", "revGrowthYoyMin", "revGrowthYoyOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("revenueGrowth3Y", "revGrowth3YMin", "revGrowth3YOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("revenueGrowth5Y", "revGrowth5YMin", "revGrowth5YOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("epsGrowthTTMYoy", "epsGrowthYoyMin", "epsGrowthYoyOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("epsGrowth3Y", "epsGrowth3YMin", "epsGrowth3YOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("epsGrowth5Y", "epsGrowth5YMin", "epsGrowth5YOperator", is_percent=True, default_operator="gte")
    # Cash Flow Growth / EBITDA Growth (5Y CAGR) - with operators
    add_bf_with_operator("focfCagr5Y", "cashFlowGrowthMin", "cashFlowGrowthOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("ebitdaCagr5Y", "ebitdaGrowthMin", "ebitdaGrowthOperator", is_percent=True, default_operator="gte")

    # --- Cash Flow (numeric) - with operators
    add_bf_with_operator("freeCashFlowPerShareTTM", "fcfPerShareMin", "fcfPerShareOperator", is_percent=False, default_operator="gte")
    add_bf_with_operator("currentEv/freeCashFlowTTM", "evFcfMax", "evFcfOperator", is_percent=False, default_operator="lte")

    # --- Financial Health - with operators
    add_bf_with_operator("totalDebtToEquity", "deRatioMax", "deRatioOperator", is_percent=False, default_operator="lte")
    add_bf_with_operator("netInterestCoverageAnnual", "interestCoverageMin", "interestCoverageOperator", is_percent=False, default_operator="gte")
    add_bf_with_operator("currentRatioAnnual", "currentRatioMin", "currentRatioOperator", is_percent=False, default_operator="gte")
    add_bf_with_operator("quickRatioAnnual", "quickRatioMin", "quickRatioOperator", is_percent=False, default_operator="gte")

    # --- Price Strength (percent) - with operators
    add_bf_with_operator("yearToDatePriceReturnDaily", "ytdReturnMin", "ytdReturnOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("5DayPriceReturnDaily", "return5DMin", "return5DOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("monthToDatePriceReturnDaily", "return1MMin", "return1MOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("13WeekPriceReturnDaily", "return3MMin", "return3MOperator", is_percent=True, default_operator="gte")
    add_bf_with_operator("priceRelativeToS&P50052Week", "relSp5001YMin", "relSp5001YOperator", is_percent=True, default_operator="gte")

    # Execute BasicFinancials query (if any)
    ticker_set: Optional[Set[str]] = None
    if bf_query:
        # Beanie projection on single fields can be tricky; fetch full docs and
        # extract tickers in Python for simplicity and robustness.
        bf_docs = await BasicFinancials.find(bf_query).to_list()
        ticker_set = {doc.ticker for doc in bf_docs}

    # 2) Latest 1‑minute candle filters
    latest_close_value = _parse_float(filters.get("latestCloseMin"))
    latest_volume_value = _parse_float(filters.get("latestVolumeMin"))
    latest_close_operator = filters.get("latestCloseOperator", "lte")
    latest_volume_operator = filters.get("latestVolumeOperator", "lte")

    if latest_close_value is not None or latest_volume_value is not None:
        lc_query: Dict[str, Any] = {"resolution": "D"}
        if latest_close_value is not None:
            mongo_op = get_mongo_operator(latest_close_operator)
            lc_query["close"] = {mongo_op: latest_close_value}
        if latest_volume_value is not None:
            mongo_op = get_mongo_operator(latest_volume_operator)
            lc_query["volume"] = {mongo_op: latest_volume_value}

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

    # 6) Apply sorting based on sort direction if specified
    symbols_sorted: List[str] = []
    
    # Mapping from sort direction filter keys to metric keys in BasicFinancials
    sort_metric_mapping: Dict[str, str] = {
        # Valuation
        "peSortDirection": "peTTM",
        "forwardPeSortDirection": "forwardPE",
        "pegSortDirection": "pegTTM",
        "pbSortDirection": "pb",
        "psSortDirection": "psTTM",
        "evEbitdaSortDirection": "evEbitdaTTM",
        # Profitability
        "netMarginSortDirection": "netProfitMarginTTM",
        "operMarginSortDirection": "operatingMarginTTM",
        "grossMarginSortDirection": "grossMarginTTM",
        "roeSortDirection": "roeTTM",
        "roaSortDirection": "roaTTM",
        "roiSortDirection": "roicTTM",
        # Growth
        "revGrowthYoySortDirection": "revenueGrowthTTMYoy",
        "revGrowth3YSortDirection": "revenueGrowth3Y",
        "revGrowth5YSortDirection": "revenueGrowth5Y",
        "epsGrowthYoySortDirection": "epsGrowthTTMYoy",
        "epsGrowth3YSortDirection": "epsGrowth3Y",
        "epsGrowth5YSortDirection": "epsGrowth5Y",
        "cashFlowGrowthSortDirection": "focfCagr5Y",
        "ebitdaGrowthSortDirection": "ebitdaCagr5Y",
        # Financial Health
        "deRatioSortDirection": "totalDebtToEquity",
        "interestCoverageSortDirection": "netInterestCoverageAnnual",
        "currentRatioSortDirection": "currentRatioAnnual",
        "quickRatioSortDirection": "quickRatioAnnual",
        # Cash Flow
        "fcfPerShareSortDirection": "freeCashFlowPerShareTTM",
        "evFcfSortDirection": "currentEv/freeCashFlowTTM",
        # Price Strength
        "ytdReturnSortDirection": "yearToDatePriceReturnDaily",
        "return5DSortDirection": "5DayPriceReturnDaily",
        "return1MSortDirection": "monthToDatePriceReturnDaily",
        "return3MSortDirection": "13WeekPriceReturnDaily",
        "relSp5001YSortDirection": "priceRelativeToS&P50052Week",
        # OHLCV
        "latestCloseSortDirection": "close",  # From LatestCandle
        "latestVolumeSortDirection": "volume",  # From LatestCandle
    }
    
    # Find which sort direction is set (priority: first non-empty one found)
    sort_direction_key: Optional[str] = None
    sort_direction: Optional[str] = None
    sort_metric_key: Optional[str] = None
    
    for key, metric_key in sort_metric_mapping.items():
        sort_dir = filters.get(key)
        if sort_dir and sort_dir in ("Asc", "Desc"):
            sort_direction_key = key
            sort_direction = sort_dir
            sort_metric_key = metric_key
            break
    
    if sort_direction and sort_metric_key and ticker_set:
        # Fetch BasicFinancials or LatestCandle documents for sorting
        ticker_list = list(ticker_set)
        
        # Handle OHLCV sorting separately (uses LatestCandle collection)
        if sort_metric_key in ("close", "volume"):
            lc_docs = await LatestCandle.find(
                {"ticker": {"$in": ticker_list}, "resolution": "D"}
            ).to_list()
            
            # Create a map of ticker -> metric value
            ticker_metric_map: Dict[str, Optional[float]] = {}
            for doc in lc_docs:
                value = getattr(doc, sort_metric_key, None)
                try:
                    ticker_metric_map[doc.ticker] = float(value) if value is not None else None
                except (ValueError, TypeError):
                    ticker_metric_map[doc.ticker] = None
            
            # Sort tickers by metric value
            def sort_key(ticker: str) -> tuple:
                value = ticker_metric_map.get(ticker)
                is_missing = value is None
                # For missing values, use a neutral numeric value (0.0); the
                # primary sort key (is_missing) ensures they're grouped at the
                # start/end, and we fall back to ticker symbol for stability.
                numeric_value = 0.0 if is_missing else float(value)
                signed_value = numeric_value if sort_direction == "Asc" else -numeric_value
                return (1 if is_missing and sort_direction == "Asc" else 0 if is_missing else 0,
                        signed_value,
                        ticker)
            
            symbols_sorted = sorted(ticker_list, key=sort_key)
            
            # Add any tickers that weren't found in LatestCandle (handle gracefully)
            found_tickers = set(ticker_metric_map.keys())
            missing_tickers = ticker_set - found_tickers
            if missing_tickers:
                # Append missing tickers at the end (sorted alphabetically)
                symbols_sorted.extend(sorted(missing_tickers))
        else:
            # Handle BasicFinancials sorting
            bf_docs = await BasicFinancials.find(
                {"ticker": {"$in": ticker_list}}
            ).to_list()
            
            # Create a map of ticker -> metric value
            ticker_metric_map: Dict[str, Optional[float]] = {}
            for doc in bf_docs:
                metric_data = doc.data.get("metric", {}) if doc.data else {}
                value = metric_data.get(sort_metric_key)
                try:
                    ticker_metric_map[doc.ticker] = float(value) if value is not None else None
                except (ValueError, TypeError):
                    ticker_metric_map[doc.ticker] = None
            
            # Sort tickers by metric value
            def sort_key(ticker: str) -> tuple:
                value = ticker_metric_map.get(ticker)
                is_missing = value is None
                # Use neutral numeric value for missing metrics; is_missing flag
                # controls whether they appear at start/end. Ticker is used as
                # a final tie‑breaker to keep ordering stable.
                numeric_value = 0.0 if is_missing else float(value)
                signed_value = numeric_value if sort_direction == "Asc" else -numeric_value
                return (1 if is_missing and sort_direction == "Asc" else 0 if is_missing else 0,
                        signed_value,
                        ticker)
            
            symbols_sorted = sorted(ticker_list, key=sort_key)
            
            # Add any tickers that weren't found in BasicFinancials (handle gracefully)
            found_tickers = set(ticker_metric_map.keys())
            missing_tickers = ticker_set - found_tickers
            if missing_tickers:
                # Append missing tickers at the end (sorted alphabetically)
                symbols_sorted.extend(sorted(missing_tickers))
    else:
        # No sort direction specified, default to alphabetical
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

