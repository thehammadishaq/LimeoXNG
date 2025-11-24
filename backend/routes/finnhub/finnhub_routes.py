from fastapi import APIRouter, status, Query
from models.finnhub.profile import ProfileFetchResponse
from models.finnhub.basic_financials import BasicFinancialsFetchResponse
from models.finnhub.news import NewsFetchResponse
from models.finnhub.stock_candles import StockCandlesFetchResponse
from controllers.finnhub.profile_controller import fetch_profile_get
from controllers.finnhub.basic_financials_controller import fetch_basic_financials_get
from controllers.finnhub.news_controller import fetch_market_news_get
from controllers.finnhub.stock_candles_controller import fetch_stock_candles_get


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


