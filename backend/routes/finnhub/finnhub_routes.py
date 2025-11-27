from fastapi import APIRouter, status, Query, HTTPException
from typing import List
import asyncio
from datetime import datetime, timedelta
from models.finnhub.profile import ProfileFetchResponse
from models.finnhub.basic_financials import BasicFinancialsFetchResponse
from models.finnhub.news import NewsFetchResponse
from models.finnhub.company_news import CompanyNewsFetchResponse
from models.finnhub.stock_candles import StockCandlesFetchResponse
from models.finnhub.quote import QuoteFetchResponse
from models.finnhub.recommendation import RecommendationFetchResponse
from models.finnhub.pattern import PatternScanFetchResponse
from models.finnhub.earnings import EarningsFetchResponse
from schemas.stock_symbols import StockSymbolsListResponse
from models.finnhub.insider_transactions import InsiderTransactionsFetchResponse
from controllers.finnhub.profile_controller import fetch_profile_get
from controllers.finnhub.basic_financials_controller import fetch_basic_financials_get
from controllers.finnhub.news_controller import fetch_market_news_get
from controllers.finnhub.company_news_controller import fetch_company_news_get
from controllers.finnhub.stock_candles_controller import fetch_stock_candles_get
from controllers.finnhub.recommendation_controller import (
    fetch_recommendation_get,
)
from controllers.finnhub.pattern_controller import (
    fetch_pattern_get,
)
from controllers.finnhub.earnings_controller import (
    fetch_earnings_get,
)
from controllers.finnhub.insider_transactions_controller import (
    fetch_insider_transactions_get,
)
from controllers.finnhub.quote_controller import fetch_quote_get
from services.symbols_cache_service import SymbolsCacheService
from models.cron_profile_cache import ProfileCacheCronRun, CronTickerResult


router = APIRouter(prefix="/finnhub", tags=["Finnhub"])


@router.get(
    "/profile/{ticker}",
    response_model=ProfileFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_profile(
    ticker: str,
    save_to_db: bool = Query(
        True, description="Whether to save the fetched profile to the database"
    ),
):
    return await fetch_profile_get(ticker, save_to_db)


@router.get(
    "/quote/{ticker}",
    response_model=QuoteFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_quote(
    ticker: str,
    save_to_db: bool = Query(
        False,
        description=(
            "Whether to save the fetched quote to the database. "
            "Currently not implemented; this endpoint is read-only."
        ),
    ),
):
    """
    Fetch real-time quote data from Finnhub (/quote endpoint) for a ticker.

    Example: /finnhub/quote/AAPL
    """
    return await fetch_quote_get(ticker, save_to_db)


@router.get(
    "/basic-financials/{ticker}",
    response_model=BasicFinancialsFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_basic_financials(
    ticker: str,
    metric: str = Query(
        "all",
        description="Metric type for Finnhub /stock/metric endpoint (e.g. 'all')",
    ),
    save_to_db: bool = Query(
        True,
        description="Whether to save the fetched basic financials to the database",
    ),
):
    """
    Fetch Basic Financials from Finnhub (/stock/metric) for a ticker.
    Example: /finnhub/basic-financials/AAPL?metric=all&save_to_db=true
    """
    return await fetch_basic_financials_get(ticker, metric, save_to_db)


@router.get(
    "/news",
    response_model=NewsFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_market_news(
    category: str = Query(
        ...,
        description="News category. Must be one of: general, forex, crypto, merger",
        example="general"
    ),
    min_id: int = Query(
        0,
        description="Use this field to get only news after this ID. Default to 0",
        example=0
    ),
    save_to_db: bool = Query(
        True,
        description="Whether to save the fetched news to the database",
    ),
):
    """
    Fetch Market News from Finnhub (/news endpoint).
    Example: /finnhub/news?category=general&min_id=0&save_to_db=true
    Example: /finnhub/news?category=forex&min_id=10&save_to_db=true
    """
    return await fetch_market_news_get(category, min_id, save_to_db)


@router.get(
    "/company-news/{ticker}",
    response_model=CompanyNewsFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_company_news(
    ticker: str,
    from_date: str = Query(
        ...,
        alias="from",
        description="From date (YYYY-MM-DD). Free tier: up to 1 year of historical news.",
        example="2025-05-15",
    ),
    to_date: str = Query(
        ...,
        alias="to",
        description="To date (YYYY-MM-DD).",
        example="2025-06-20",
    ),
    save_to_db: bool = Query(
        True,
        description="Whether to save the fetched company news articles to the database",
    ),
):
    """
    Fetch latest company news from Finnhub (/company-news endpoint).

    This endpoint is only available for North American companies.

    Example:
        /finnhub/company-news/AAPL?from=2025-05-15&to=2025-06-20&save_to_db=true
    """
    from datetime import datetime

    # Parse dates safely
    try:
        from_dt = datetime.strptime(from_date, "%Y-%m-%d").date()
        to_dt = datetime.strptime(to_date, "%Y-%m-%d").date()
    except ValueError:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid date format. Use YYYY-MM-DD for 'from' and 'to' parameters.",
        )

    return await fetch_company_news_get(ticker, from_dt, to_dt, save_to_db)


@router.get(
    "/stock-candles/{ticker}",
    response_model=StockCandlesFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_stock_candles(
    ticker: str,
    resolution: str = Query(
        ...,
        description="Supported resolution includes 1, 5, 15, 30, 60, D, W, M",
        example="1"
    ),
    from_timestamp: int = Query(
        ...,
        description="UNIX timestamp for interval initial value",
        example=1738655051,
        alias="from"
    ),
    to_timestamp: int = Query(
        ...,
        description="UNIX timestamp for interval end value",
        example=1738741451,
        alias="to"
    ),
    save_to_db: bool = Query(
        True,
        description="Whether to save the fetched stock candles to the database",
    ),
):
    """
    Fetch Stock Candles (OHLCV) from Finnhub (/stock/candle endpoint - Premium).
    Daily data will be adjusted for Splits. Intraday data will remain unadjusted.
    Only 1 month of intraday will be returned at a time.
    
    Example: /finnhub/stock-candles/AAPL?resolution=1&from=1738655051&to=1738741451&save_to_db=true
    Example: /finnhub/stock-candles/IBM?resolution=D&from=1735976651&to=1738741451&save_to_db=true
    """
    return await fetch_stock_candles_get(ticker, resolution, from_timestamp, to_timestamp, save_to_db)


@router.get(
    "/recommendation/{ticker}",
    response_model=RecommendationFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_recommendation(
    ticker: str,
    save_to_db: bool = Query(
        True,
        description="Whether to save the fetched recommendation trends to the database",
    ),
):
    """
    Fetch latest analyst recommendation trends from Finnhub (/stock/recommendation).

    Example: /finnhub/recommendation/AAPL?save_to_db=true
    """
    return await fetch_recommendation_get(ticker, save_to_db)


@router.get(
    "/pattern/{ticker}",
    response_model=PatternScanFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_pattern(
    ticker: str,
    resolution: str = Query(
        ...,
        description="Supported resolution includes 1, 5, 15, 30, 60, D, W, M",
        example="D",
    ),
    save_to_db: bool = Query(
        True,
        description="Whether to save the fetched pattern scan to the database",
    ),
):
    """
    Fetch pattern recognition scan from Finnhub (/scan/pattern endpoint).

    Example: /finnhub/pattern/AAPL?resolution=D&save_to_db=true
    """
    return await fetch_pattern_get(ticker, resolution, save_to_db)


@router.get(
    "/earnings/{ticker}",
    response_model=EarningsFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_earnings(
    ticker: str,
    limit: int = Query(
        4,
        description="Limit number of periods returned. Default 4 (free tier). Leave blank for full history if subscription allows.",
        ge=1,
    ),
    save_to_db: bool = Query(
        True,
        description="Whether to save the fetched earnings history to the database",
    ),
):
    """
    Fetch historical quarterly earnings surprises from Finnhub (/stock/earnings endpoint).

    Free Tier: Last 4 quarters by default.

    Example: /finnhub/earnings/AAPL?limit=4&save_to_db=true
             /finnhub/earnings/TSLA?limit=8&save_to_db=true
    """
    # Pass None if limit is not positive, but we already enforce ge=1 so it's safe
    return await fetch_earnings_get(ticker, limit, save_to_db)


@router.post(
    "/symbols/refresh",
    response_model=StockSymbolsListResponse,
    status_code=status.HTTP_200_OK,
)
async def refresh_stock_symbols(
    exchanges: List[str] = Query(
        ["US", "NASDAQ", "NYSE"],
        description="List of exchanges to fetch symbols for",
    )
):
    """
    Refresh stock symbols cache from Finnhub /stock/symbol and save to MongoDB.

    This will:
    - Fetch all available symbols from Finnhub for the configured exchanges
    - Upsert them into the stock_symbols_cache collection
    - Return the updated cache metadata
    """
    service = SymbolsCacheService()

    # Always fetch fresh symbols from Finnhub
    symbols = await service.get_all_symbols(force_refresh=True)

    # Save to cache
    cache = await service.save_symbols_to_cache(symbols, exchanges)

    return StockSymbolsListResponse(
        symbols=cache.symbols,
        total=cache.total_count,
        exchanges=cache.exchanges,
        updated_at=cache.updated_at,
    )


@router.post(
    "/cron/profile-cache",
    status_code=status.HTTP_200_OK,
)
async def run_profile_cache_cron(
    wait_sec: float = Query(
        1.0,
        ge=0.0,
        le=60.0,
        description="Delay in seconds between processing each ticker to avoid rate limits.",
    ),
    limit: int | None = Query(
        None,
        ge=1,
        le=5000,
        description="Optional limit on number of tickers to process from cache.",
    ),
):
    """
    Cron-like job to refresh core profile-related data in MongoDB for cached tickers.

    For each ticker stored in `stock_symbols_cache`, this will:
    - Call Finnhub profile endpoint and save to DB
    - Call Finnhub basic financials endpoint and save to DB
    - Call Finnhub stock-candles endpoint (resolution=1) and upsert the
      latest OHLCV candle into the `LatestCandle` collection

    (Previous calls to recommendation trends, earnings, company news and
    insider transactions have been disabled to reduce load and focus
    only on core + latest price data for this cron job.)

    Processing is done **sequentially** (one ticker at a time) with an optional
    `wait_sec` delay between tickers to help respect Finnhub rate limits.
    """
    symbols_service = SymbolsCacheService()
    cache = await symbols_service.get_cached_symbols()

    if not cache or not cache.symbols:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cached stock symbols found in database. Run /finnhub/symbols/refresh first.",
        )

    tickers = cache.symbols
    total_cached = len(tickers)

    if limit is not None:
        tickers = tickers[:limit]

    started_at = datetime.utcnow()
    processed = 0
    success = 0
    failed = 0
    ticker_results: list[dict] = []

    for raw_ticker in tickers:
        ticker = raw_ticker.upper().strip()
        ticker_log: dict = {
            "ticker": ticker,
            "ok": True,
            "errors": [],
        }

        # Track how many endpoint calls succeed vs. fail for this ticker
        successful_calls = 0
        failed_calls = 0

        try:
            # 1) Company profile
            try:
                await fetch_profile_get(ticker, save_to_db=True)
                successful_calls += 1
            except Exception as e:  # noqa: BLE001
                failed_calls += 1
                ticker_log["errors"].append(f"profile: {e}")

            # 2) Basic financials
            try:
                await fetch_basic_financials_get(
                    ticker, metric="all", save_to_db=True
                )
                successful_calls += 1
            except Exception as e:  # noqa: BLE001
                failed_calls += 1
                ticker_log["errors"].append(f"basic_financials: {e}")

            # 3) Latest 1-minute candle -> LatestCandle collection
            try:
                to_ts = int(datetime.utcnow().timestamp())
                # Go back 60 minutes to ensure we get at least one candle
                from_ts = to_ts - 60 * 60
                await fetch_stock_candles_get(
                    ticker=ticker,
                    resolution="1",
                    from_timestamp=from_ts,
                    to_timestamp=to_ts,
                    save_to_db=True,
                )
                successful_calls += 1
            except Exception as e:  # noqa: BLE001
                failed_calls += 1
                ticker_log["errors"].append(f"stock_candles: {e}")

        except Exception as outer_e:  # noqa: BLE001
            failed_calls += 1
            ticker_log["errors"].append(f"unexpected: {outer_e}")

        # Mark ticker as failed ONLY if **all** endpoint calls failed
        ticker_log["ok"] = successful_calls > 0

        ticker_log["processed_at"] = datetime.utcnow()

        processed += 1
        if ticker_log["ok"]:
            success += 1
        else:
            failed += 1

        ticker_results.append(ticker_log)

        # Optional delay between tickers
        if wait_sec > 0 and processed < len(tickers):
            await asyncio.sleep(wait_sec)

    finished_at = datetime.utcnow()

    # Persist this cron run to MongoDB for auditing / UI status
    cron_run = ProfileCacheCronRun(
        started_at=started_at,
        finished_at=finished_at,
        wait_sec=wait_sec,
        limit=limit,
        total_cached=total_cached,
        processed=processed,
        success=success,
        failed=failed,
        tickers=[
            CronTickerResult(
                ticker=tr["ticker"],
                ok=tr["ok"],
                errors=tr.get("errors", []),
                processed_at=tr.get("processed_at", finished_at),
            )
            for tr in ticker_results
        ],
    )
    await cron_run.insert()

    return {
        "job_id": str(cron_run.id),
        "started_at": cron_run.started_at,
        "finished_at": cron_run.finished_at,
        "total_cached": total_cached,
        "processed": processed,
        "success": success,
        "failed": failed,
        "wait_sec": wait_sec,
        "limit": limit,
        "tickers": ticker_results,
    }


@router.get(
    "/insider-transactions",
    response_model=InsiderTransactionsFetchResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_insider_transactions(
    symbol: str = Query(
        None,
        description="Symbol of the company (e.g., AAPL, TSLA). Leave blank to get latest transactions.",
        example="TSLA",
    ),
    from_date: str = Query(
        None,
        alias="from",
        description="From date (YYYY-MM-DD). Optional.",
        example="2020-03-15",
    ),
    to_date: str = Query(
        None,
        alias="to",
        description="To date (YYYY-MM-DD). Optional.",
        example="2020-03-16",
    ),
    limit: int = Query(
        None,
        description="Limit number of transactions returned (max 100). Optional.",
        ge=1,
        le=100,
        example=20,
    ),
    save_to_db: bool = Query(
        True,
        description="Whether to save the fetched insider transactions to the database",
    ),
):
    """
    Fetch insider transactions from Finnhub (/stock/insider-transactions endpoint).
    
    Company insider transactions data sourced from Form 3,4,5, SEDI and relevant companies' filings.
    This endpoint covers US, UK, Canada, Australia, India, and all major EU markets.
    Limit to 100 transactions per API call.
    
    Examples:
        /finnhub/insider-transactions?symbol=TSLA&limit=20
        /finnhub/insider-transactions?symbol=AC.TO
        /finnhub/insider-transactions?symbol=AAPL&from=2020-03-15&to=2020-03-16
    """
    from datetime import datetime

    # Parse dates safely if provided
    from_dt = None
    to_dt = None
    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d").date()
        except ValueError:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid date format for 'from'. Use YYYY-MM-DD.",
            )
    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d").date()
        except ValueError:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid date format for 'to'. Use YYYY-MM-DD.",
            )

    return await fetch_insider_transactions_get(
        symbol, from_dt, to_dt, limit, save_to_db
    )


