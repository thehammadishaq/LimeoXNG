"""
TipRanks Library-Based Routes

FastAPI router for endpoints that use the official TipRanks Python library.
These endpoints use the authenticated TipRanks client library for API access.
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from services.tipranks.api_service import (
    get_top_analyst_stocks,
    get_top_smart_score_stocks,
    get_top_insider_stocks,
    get_stock_screener,
    get_top_online_growth_stocks,
    get_trending_stocks,
    get_top_experts_analyst,
    get_top_experts,
    get_analyst_projection,
    get_news_sentiment,
    get_expert_profile,
)

# Router with separate prefix and tag for library-based APIs
router = APIRouter(
    prefix="/library",
    tags=["TipRanks Library API"],
)


@router.get("/top-analyst-stocks", response_model=Any)
async def tipranks_top_analyst_stocks():
    """
    TipRanks `top_analyst_stocks` (Library-based).
    
    Uses official TipRanks Python library to fetch top analyst stocks.
    Requires TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env.
    """
    try:
        return await get_top_analyst_stocks()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching top analyst stocks: {e}",
        )


@router.get("/top-smart-score-stocks", response_model=Any)
async def tipranks_top_smart_score_stocks():
    """
    TipRanks `top_smart_score_stocks` (Library-based).
    
    Uses official TipRanks Python library to fetch top smart score stocks.
    Requires TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env.
    """
    try:
        return await get_top_smart_score_stocks()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching top smart score stocks: {e}",
        )


@router.get("/top-insider-stocks", response_model=Any)
async def tipranks_top_insider_stocks():
    """
    TipRanks `top_insider_stocks` (Library-based).
    
    Uses official TipRanks Python library to fetch top insider stocks.
    Requires TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env.
    """
    try:
        return await get_top_insider_stocks()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching top insider stocks: {e}",
        )


@router.get("/stock-screener", response_model=Any)
async def tipranks_stock_screener():
    """
    TipRanks `stock_screener` (Library-based).
    
    Uses official TipRanks Python library to fetch stock screener data.
    Requires TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env.
    """
    try:
        return await get_stock_screener()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching stock screener data: {e}",
        )


@router.get("/top-online-growth-stocks", response_model=Any)
async def tipranks_top_online_growth_stocks():
    """
    TipRanks `top_online_growth_stocks` (Library-based).
    
    Uses official TipRanks Python library to fetch top online growth stocks.
    Requires TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env.
    """
    try:
        return await get_top_online_growth_stocks()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching top online growth stocks: {e}",
        )


@router.get("/trending-stocks", response_model=Any)
async def tipranks_trending_stocks():
    """
    TipRanks `trending_stocks` (Library-based).
    
    Uses official TipRanks Python library to fetch trending stocks.
    Requires TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env.
    """
    try:
        return await get_trending_stocks()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching trending stocks: {e}",
        )


@router.get("/top-experts-analyst", response_model=Any)
async def tipranks_top_experts_analyst(
    expert_type: str = Query(
        "analyst",
        description="Expert type: analyst, blogger, insider, institutional, user",
    )
):
    """
    TipRanks `top_experts` with configurable expert_type (Library-based).
    
    Uses official TipRanks Python library to fetch top experts.
    Requires TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env.
    
    Valid TipRanks expert_type values:
    - analyst (default) - Wall Street Analysts
    - blogger - Financial Bloggers
    - insider - Corporate Insiders
    - institutional - Institutional Investors (Hedge Funds, Research Firms, etc.)
    - user - Individual Investors
    """
    try:
        return await get_top_experts(expert_type=expert_type)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = (
            f"Error fetching top experts with expert_type='{expert_type}'. "
            f"Exception: {type(e).__name__}: {str(e)}. "
            f"Check server logs for full traceback."
        )
        print(f"❌ Route error for expert_type='{expert_type}':")
        print(f"   Exception: {type(e).__name__}: {str(e)}")
        print(f"   Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail,
        )


@router.get("/analyst-projection", response_model=Any)
async def tipranks_analyst_projection(
    ticker: str = Query(..., description="Ticker symbol, e.g. TSLA")
):
    """
    TipRanks `analyst_projection` for a given ticker (Library-based).
    
    Uses official TipRanks Python library to fetch analyst projections.
    Requires TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env.
    """
    try:
        return await get_analyst_projection(ticker=ticker)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching analyst projection for {ticker}: {e}",
        )


@router.get("/news-sentiment", response_model=Any)
async def tipranks_news_sentiment(
    ticker: str = Query(..., description="Ticker symbol, e.g. TSLA")
):
    """
    TipRanks `news_sentiment` for a given ticker (Library-based).
    
    Uses official TipRanks Python library to fetch news sentiment.
    Requires TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env.
    """
    try:
        return await get_news_sentiment(ticker=ticker)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching news sentiment for {ticker}: {e}",
        )


@router.get("/expert-profile/{expert_id}", response_model=Any)
async def tipranks_expert_profile(expert_id: str):
    """
    Get detailed profile for a specific expert/analyst by expertId or uid (Library-based).
    
    Uses official TipRanks Python library to fetch expert profile.
    Requires TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env.
    """
    try:
        profile = await get_expert_profile(expert_id=expert_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Expert profile not found for ID: {expert_id}",
            )
        return profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching expert profile for {expert_id}: {e}",
        )

