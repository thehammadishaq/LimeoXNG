"""
TipRanks Direct Scraper Routes

FastAPI router for endpoints that use direct web scraping (cloudscraper) to access TipRanks.
These endpoints bypass the official library and scrape data directly from TipRanks website.
Includes MongoDB storage and session management.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status, Body
from pydantic import BaseModel

from services.tipranks.top_experts_service import (
    fetch_and_save_top_experts,
    get_top_experts_from_db,
    get_expert_profile_from_db,
    fetch_top_experts_from_api,
)
from services.tipranks.expert_stocks_service import (
    fetch_and_save_expert_stocks,
    get_expert_stocks_from_db,
)
from services.tipranks.tipranks_auth_service import (
    login_to_tipranks,
    ensure_authenticated_session,
    load_cookies_from_file,
)

# Router with separate prefix and tag for scraper-based APIs
router = APIRouter(
    prefix="/scraper",
    tags=["TipRanks Scraper API"],
)


# Request/Response models for signin
class TipRanksSignInRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    save_session: bool = True


class TipRanksSignInResponse(BaseModel):
    success: bool
    message: str
    cookies_count: int
    cookies: Optional[Dict[str, str]] = None
    response_data: Optional[Dict[str, Any]] = None


@router.get("/top-experts", response_model=Any)
async def tipranks_top_experts(
    expert_type: str = Query(
        "analyst",
        description="Expert type: analyst, blogger, insider, institutional, user",
    ),
    num_experts: int = Query(
        1000,
        description="Number of experts to fetch",
        ge=1,
        le=10000,
    ),
    period: str = Query(
        "year",
        description="Time period: year, month, quarter, etc.",
    ),
    benchmark: str = Query(
        "none",
        description="Benchmark type: none, sp500, etc.",
    ),
    country: str = Query(
        "us",
        description="Country code: us, ca, etc.",
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
    TipRanks GetTop25Experts API endpoint (Direct Scraper).
    
    Fetches top experts from TipRanks API using direct web scraping (cloudscraper)
    and stores/updates in MongoDB. Prevents duplicates by using expertId as unique identifier.
    
    This endpoint uses direct scraping instead of the official TipRanks library.
    Requires authenticated session (call /signin first if needed).
    
    Parameters:
    - expert_type: Expert type (analyst, blogger, insider, institutional, user)
    - num_experts: Number of experts to fetch (1-10000)
    - period: Time period (year, month, quarter, etc.)
    - benchmark: Benchmark type (none, sp500, etc.)
    - country: Country code (us, ca, etc.)
    - save_to_db: Whether to save/update data in MongoDB (default: True)
    - use_db: Whether to return data from MongoDB instead of fetching from API (default: False)
    - limit: Limit number of results when use_db=True (optional)
    - skip: Skip number of results when use_db=True for pagination (default: 0)
    
    Returns:
    - If use_db=False: Fetches from API, saves to DB, returns API data
    - If use_db=True: Returns data from MongoDB (no API call)
    """
    try:
        if use_db:
            # Return data from MongoDB
            experts = await get_top_experts_from_db(
                expert_type=expert_type,
                limit=limit,
                skip=skip,
            )
            
            if not experts:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No experts found in database for expert_type='{expert_type}'. "
                           f"Try calling the endpoint with use_db=False first to fetch and save data.",
                )
            
            return {
                "experts": experts,
                "count": len(experts),
                "source": "database",
                "parameters": {
                    "expert_type": expert_type,
                    "limit": limit,
                    "skip": skip,
                },
            }
        else:
            # Fetch from API and save to DB
            result = await fetch_and_save_top_experts(
                expert_type=expert_type,
                num_experts=num_experts,
                period=period,
                benchmark=benchmark,
                country=country,
                save_to_db=save_to_db,
            )
            
            if not result.get("experts"):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No experts found from TipRanks API for expert_type='{expert_type}'.",
                )
            
            return {
                "experts": result["experts"],
                "count": result["count"],
                "save_stats": result.get("save_stats"),
                "source": "api",
                "parameters": result["parameters"],
            }
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        
        print(f"❌ Error in tipranks_top_experts endpoint: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching/saving TipRanks top experts: {str(e)}",
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
    TipRanks Expert Stocks API endpoint (Direct Scraper).
    
    Fetches stocks/ratings for a specific expert from TipRanks getStocks API
    using direct web scraping (cloudscraper) and stores/updates in MongoDB.
    Prevents duplicates by using expert_name + ticker as composite unique identifier.
    
    This endpoint uses direct scraping instead of the official TipRanks library.
    Requires authenticated session (call /signin first if needed).
    
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
    - GET /api/v1/scraper/tipranks/scraper/expert-stocks?name=Heiko-Ihle&period=year&benchmark=none
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


@router.post("/signin", response_model=TipRanksSignInResponse)
async def tipranks_signin(
    request: TipRanksSignInRequest = Body(
        default=TipRanksSignInRequest(),
        description="Sign in request with email and password (optional, uses .env if not provided)",
    ),
):
    """
    TipRanks Sign In API endpoint (Direct Scraper).
    
    Logs in to TipRanks using email and password via direct web scraping,
    and saves session cookies. This is required before calling authenticated APIs.
    
    Parameters:
    - email: TipRanks email (optional, uses TIPRANKS_EMAIL from .env if not provided)
    - password: TipRanks password (optional, uses TIPRANKS_PASSWORD from .env if not provided)
    - save_session: Whether to save session cookies to file (default: True)
    
    Returns:
    - success: bool - Whether login was successful
    - message: str - Status message
    - cookies_count: int - Number of cookies received
    - response_data: dict - API response data (if successful)
    
    Example:
    - POST /api/v1/scraper/tipranks/scraper/signin
    - POST /api/v1/scraper/tipranks/scraper/signin?email=user@example.com&password=pass123
    """
    try:
        result = await login_to_tipranks(
            email=request.email,
            password=request.password,
            save_session=request.save_session,
        )
        
        if result["success"]:
            return TipRanksSignInResponse(
                success=True,
                message=result["message"],
                cookies_count=len(result["cookies"]),
                cookies=result["cookies"],
                response_data=result.get("response_data"),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result["message"],
            )
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        
        print(f"❌ Error in tipranks_signin endpoint: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error signing in to TipRanks: {str(e)}",
        )


@router.get("/session-status", response_model=Any)
async def tipranks_session_status():
    """
    Check TipRanks session status (Direct Scraper).
    
    Returns information about current session cookies stored from previous signin.
    
    Returns:
    - has_session: bool - Whether session cookies exist
    - cookies_count: int - Number of cookies
    - cookie_names: list - Cookie names (values hidden for security)
    """
    try:
        cookies = load_cookies_from_file()
        
        return {
            "has_session": len(cookies) > 0,
            "cookies_count": len(cookies),
            "cookie_names": list(cookies.keys()) if cookies else [],
        }
        
    except Exception as e:
        import traceback
        
        print(f"❌ Error in tipranks_session_status endpoint: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking session status: {str(e)}",
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
    Get detailed profile for a specific expert/analyst by expertId or uid (Direct Scraper).
    
    Fetches expert profile from MongoDB or TipRanks API using direct web scraping.
    Requires authenticated session (call /signin first if needed) when use_db=False.
    
    Parameters:
    - expert_id: Expert ID (expertId or uid)
    - use_db: Whether to return data from MongoDB instead of fetching from API (default: True)
    
    Returns:
    - If use_db=True: Returns expert profile from MongoDB
    - If use_db=False: Fetches from API and returns expert profile
    
    Example:
    - GET /api/v1/scraper/tipranks/scraper/expert-profile/1544
    - GET /api/v1/scraper/tipranks/scraper/expert-profile/1544?use_db=false
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

