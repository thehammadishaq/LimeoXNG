"""
TipRanks Routes (Main Router)

This is the main router that includes both library-based and scraper-based routes.
For better organization, routes are now separated into:
- tipranks_library_routes.py: Official TipRanks library-based APIs
- tipranks_scraper_routes.py: Direct web scraping APIs with MongoDB support

This file maintains backward compatibility by including both routers.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status, Body
from pydantic import BaseModel

from services.tipranks.analysts_service import fetch_analysts
from services.tipranks.top_experts_service import (
    get_expert_profile_from_db,
    fetch_top_experts_from_api,
)
from services.tipranks.expert_stocks_service import (
    fetch_and_save_expert_stocks,
    get_expert_stocks_from_db,
)
from services.tipranks.tipranks_auth_service import ensure_authenticated_session

# Import separated routers
from .tipranks_library_routes import router as library_router
from .tipranks_scraper_routes import router as scraper_router

# Main router that includes both sub-routers
router = APIRouter(prefix="/scraper/tipranks", tags=["TipRanks"])

# Include separated routers
router.include_router(library_router)
router.include_router(scraper_router)


# ---------- Legacy/Additional Endpoints ----------

@router.get("/analysts", response_model=List[Dict[str, Any]])
async def get_tipranks_analysts() -> List[Dict[str, Any]]:
    """
    Scrape TipRanks Wall Street Analysts data from:
    https://www.tipranks.com/experts/analysts

    Returns a list of analysts with:
    - rank, name, profile_url, profile_picture_url, firm, sector,
      buy_pct, hold_pct, sell_pct, success_rate, avg_return, followers

    Also saves the data to MongoDB (no duplicates).
    """
    try:
        analysts = await fetch_analysts(save_to_db=True)
        if not analysts:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No analysts data found on TipRanks.",
            )
        return analysts
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        print(f"❌ Error in get_tipranks_analysts endpoint: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error while fetching TipRanks analysts data: {str(e)}",
        )


@router.get("/expert-profile/{expert_id}", response_model=Any)
async def tipranks_expert_profile(
    expert_id: str,
    use_db: bool = Query(
        True,
        description="Whether to return data from MongoDB instead of fetching from API",
    ),
):
    """
    Get detailed profile for a specific expert/analyst by expertId or uid.
    
    This endpoint is available at the main router level for backward compatibility.
    It delegates to the scraper-based implementation.
    
    Parameters:
    - expert_id: Expert ID (expertId or uid)
    - use_db: Whether to return data from MongoDB instead of fetching from API (default: True)
    
    Returns:
    - If use_db=True: Returns expert profile from MongoDB
    - If use_db=False: Fetches from API and returns expert profile
    
    Example:
    - GET /api/v1/scraper/tipranks/expert-profile/1544
    - GET /api/v1/scraper/tipranks/expert-profile/1544?use_db=false
    """
    try:
        if use_db:
            # Return data from MongoDB
            expert = await get_expert_profile_from_db(expert_id=expert_id)
            
            if not expert:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Expert profile not found in database for ID: {expert_id}. "
                           f"Try calling the endpoint with use_db=False first to fetch from API.",
                )
            
            return {
                **expert,
                "source": "database",
            }
        else:
            # Fetch from API - try different expert types to find the expert
            expert_types = ["analyst", "blogger", "insider", "institutional", "user"]
            expert = None
            
            # Ensure authenticated session
            await ensure_authenticated_session()
            
            for expert_type in expert_types:
                try:
                    experts = await fetch_top_experts_from_api(
                        expert_type=expert_type,
                        num_experts=1000,
                        period="year",
                        benchmark="none",
                        country="us",
                        ensure_auth=True,
                    )
                    
                    # Search for expert by expertId or uid
                    for exp in experts:
                        if (str(exp.get("expertId")) == str(expert_id) or 
                            str(exp.get("uid")) == str(expert_id)):
                            expert = exp
                            break
                    
                    if expert:
                        break
                except Exception as e:
                    print(f"⚠️  Error fetching experts for type {expert_type}: {e}")
                    continue
            
            if not expert:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Expert profile not found from TipRanks API for ID: {expert_id}",
                )
            
            return {
                **expert,
                "source": "api",
            }
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        
        print(f"❌ Error in tipranks_expert_profile endpoint: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching expert profile for {expert_id}: {str(e)}",
        )


@router.get("/expert-stocks", response_model=Any)
async def tipranks_expert_stocks(
    name: str = Query(
        ...,
        description="Expert name in URL slug format (e.g., 'Heiko-Ihle', 'Atif-Malik')",
    ),
    period: str = Query(
        "year",
        description="Time period: year, month, quarter, etc.",
    ),
    benchmark: str = Query(
        "none",
        description="Benchmark type: none, sp500, etc.",
    ),
    save_to_db: bool = Query(
        True,
        description="Whether to save/update data in MongoDB",
    ),
    use_db: bool = Query(
        False,
        description="Whether to return data from MongoDB instead of fetching from API",
    ),
    limit: int = Query(
        None,
        description="Limit number of results when using use_db=True",
        ge=1,
    ),
    skip: int = Query(
        0,
        description="Skip number of results when using use_db=True (for pagination)",
        ge=0,
    ),
):
    """
    TipRanks Expert Stocks API endpoint.
    
    Fetches stocks/ratings for a specific expert from TipRanks getStocks API
    using direct web scraping (cloudscraper) and stores/updates in MongoDB.
    Prevents duplicates by using expert_name + ticker as composite unique identifier.
    
    This endpoint is available at the main router level for backward compatibility.
    It delegates to the scraper-based implementation.
    
    Parameters:
    - name: Expert name in URL slug format (e.g., "Heiko-Ihle", "Atif-Malik")
    - period: Time period (year, month, quarter, etc.) - default: "year"
    - benchmark: Benchmark type (none, sp500, etc.) - default: "none"
    - save_to_db: Whether to save/update data in MongoDB (default: True)
    - use_db: Whether to return data from MongoDB instead of fetching from API (default: False)
    - limit: Limit number of results when use_db=True (optional)
    - skip: Skip number of results when use_db=True for pagination (default: 0)
    
    Returns:
    - If use_db=False: Fetches from API, saves to DB, returns API data
    - If use_db=True: Returns data from MongoDB (no API call)
    
    Example:
    - GET /api/v1/scraper/tipranks/expert-stocks?name=Heiko-Ihle&period=year&benchmark=none
    """
    try:
        if not name or not name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expert name parameter is required.",
            )
        
        # Normalize name (trim whitespace)
        expert_name = name.strip()
        
        if use_db:
            # Return data from MongoDB
            stocks = await get_expert_stocks_from_db(
                expert_name=expert_name,
                limit=limit,
                skip=skip,
            )
            
            if not stocks:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No stocks found in database for expert '{expert_name}'. "
                           f"Try calling the endpoint with use_db=False first to fetch and save data.",
                )
            
            return {
                "stocks": stocks,
                "count": len(stocks),
                "expert_name": expert_name,
                "source": "database",
                "parameters": {
                    "limit": limit,
                    "skip": skip,
                },
            }
        else:
            # Fetch from API and save to DB
            result = await fetch_and_save_expert_stocks(
                expert_name=expert_name,
                period=period,
                benchmark=benchmark,
                save_to_db=save_to_db,
            )
            
            if not result.get("stocks"):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No stocks found from TipRanks API for expert '{expert_name}'.",
                )
            
            return {
                "stocks": result["stocks"],
                "count": result["count"],
                "expert_name": result["expert_name"],
                "save_stats": result.get("save_stats"),
                "source": "api",
                "parameters": result["parameters"],
            }
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        
        print(f"❌ Error in tipranks_expert_stocks endpoint: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching/saving TipRanks expert stocks: {str(e)}",
        )



