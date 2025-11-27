"""
Database Read-Only Routes

These endpoints read data ONLY from MongoDB collections:
- finnhub-profile2 (CompanyProfile)
- finnhub-basic-financials (BasicFinancials)

No direct Finnhub API calls are made here.
"""
from fastapi import APIRouter, HTTPException, Query, status

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

    Returns the most recent run from `cron_profile_cache_runs` with per-ticker statuses.
    """
    # Get most recent cron run by started_at
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

    # Map document → response model
    ticker_statuses = [
        CronTickerStatus(
            ticker=t.ticker,
            ok=t.ok,
            errors=t.errors,
            processed_at=t.processed_at,
        )
        for t in latest.tickers
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

