from fastapi import APIRouter, status, Query
from models.finnhub.profile import ProfileFetchResponse
from models.finnhub.basic_financials import BasicFinancialsFetchResponse
from controllers.finnhub.profile_controller import fetch_profile_get
from controllers.finnhub.basic_financials_controller import fetch_basic_financials_get


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


