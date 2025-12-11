"""
TipRanks API Service (official client wrapper)

Provides thin async wrappers around the `tipranks` library so that
the FastAPI routes can expose separate endpoints for each method.
"""

from typing import Any, Optional
import asyncio

from tipranks import TipRanks  # type: ignore

from config.settings import settings


_client: Optional[TipRanks] = None
_client_lock: asyncio.Lock = asyncio.Lock()


async def _get_client() -> TipRanks:
    """
    Get a singleton TipRanks client instance initialised with credentials
    from settings (.env). This ensures session reuse on the HTTP layer.
    """
    global _client

    async with _client_lock:
        if _client is not None:
            return _client

        if not settings.TIPRANKS_EMAIL or not settings.TIPRANKS_PASSWORD:
            raise RuntimeError(
                "TipRanks credentials are not configured. "
                "Set TIPRANKS_EMAIL and TIPRANKS_PASSWORD in backend/.env."
            )

        _client = TipRanks(
            email=settings.TIPRANKS_EMAIL,
            password=settings.TIPRANKS_PASSWORD,
        )
        return _client


async def _run_sync(method_name: str, *args: Any, **kwargs: Any) -> Any:
    """
    Run a synchronous TipRanks client method in a worker thread.
    """
    try:
        client = await _get_client()
        method = getattr(client, method_name)
        return await asyncio.to_thread(method, *args, **kwargs)
    except AttributeError as e:
        import traceback
        error_msg = f"TipRanks client method '{method_name}' not found. Available methods: {dir(client)}"
        print(f"❌ {error_msg}")
        print(f"Traceback: {traceback.format_exc()}")
        raise ValueError(error_msg) from e
    except (ValueError, TypeError) as e:
        # JSON decode errors or type errors - often means invalid response
        import traceback
        error_str = str(e)
        if "Expecting value" in error_str or "JSON" in error_str or "json" in error_str.lower():
            error_msg = (
                f"TipRanks API returned invalid/empty response for method '{method_name}' "
                f"with kwargs={kwargs}. This usually means the expert_type value is not supported "
                f"or the API returned an error page instead of JSON. "
                f"Original error: {error_str}"
            )
        else:
            error_msg = f"Error calling TipRanks method '{method_name}' with args={args}, kwargs={kwargs}: {error_str}"
        print(f"❌ {error_msg}")
        print(f"Exception type: {type(e).__name__}")
        print(f"Traceback: {traceback.format_exc()}")
        raise ValueError(error_msg) from e
    except Exception as e:
        import traceback
        error_msg = f"Error calling TipRanks method '{method_name}' with args={args}, kwargs={kwargs}: {str(e)}"
        print(f"❌ {error_msg}")
        print(f"Exception type: {type(e).__name__}")
        print(f"Traceback: {traceback.format_exc()}")
        raise RuntimeError(error_msg) from e


async def get_top_analyst_stocks() -> Any:
    return await _run_sync("top_analyst_stocks")


async def get_top_smart_score_stocks() -> Any:
    return await _run_sync("top_smart_score_stocks")


async def get_top_insider_stocks() -> Any:
    return await _run_sync("top_insider_stocks")


async def get_stock_screener() -> Any:
    return await _run_sync("stock_screener")


async def get_top_online_growth_stocks() -> Any:
    return await _run_sync("top_online_growth_stocks")


async def get_trending_stocks() -> Any:
    return await _run_sync("trending_stocks")


async def get_top_experts_analyst() -> Any:
    # Mirror your example: expert_type="analyst"
    return await _run_sync("top_experts", expert_type="analyst")


async def get_top_experts(expert_type: str = "analyst") -> Any:
    """
    Get top experts from TipRanks with specified expert_type.
    
    Valid TipRanks expert_type values (as per library):
    - analyst
    - blogger
    - insider
    - institutional
    - user
    """
    try:
        print(f"🔍 Calling TipRanks top_experts with expert_type='{expert_type}'")
        result = await _run_sync("top_experts", expert_type=expert_type)
        
        # Handle empty or None results gracefully
        if result is None:
            print(f"⚠️ TipRanks returned None for expert_type='{expert_type}' - returning empty list")
            return []
        
        if isinstance(result, list):
            print(f"✅ Successfully fetched {len(result)} results for expert_type='{expert_type}'")
            return result
        else:
            print(f"⚠️ TipRanks returned non-list result for expert_type='{expert_type}' - returning empty list")
            return []
    except (ValueError, TypeError) as e:
        # JSON decode errors or empty responses - return empty list instead of error
        error_str = str(e)
        if "Expecting value" in error_str or "JSON" in error_str or "json" in error_str.lower():
            print(f"⚠️ TipRanks API returned empty/invalid response for expert_type='{expert_type}' - returning empty list")
            print(f"   This usually means no data is available for this expert type")
            return []
        # Re-raise other ValueError/TypeError
        raise
    except Exception as e:
        import traceback
        error_msg = f"Failed to get top experts with expert_type='{expert_type}': {str(e)}"
        print(f"❌ {error_msg}")
        print(f"Exception type: {type(e).__name__}")
        print(f"Traceback: {traceback.format_exc()}")
        raise


async def get_analyst_projection(ticker: str) -> Any:
    # Your snippet used `anaylst_projection` – keep that name to match the lib
    return await _run_sync("anaylst_projection", ticker=ticker)


async def get_news_sentiment(ticker: str) -> Any:
    return await _run_sync("news_sentiment", ticker=ticker)


async def get_expert_profile(expert_id: str) -> Any:
    """
    Get detailed profile for a specific expert/analyst.
    Note: This may need to be implemented based on TipRanks library capabilities.
    For now, we'll try to fetch from top_experts and filter by expertId.
    """
    # Try to get expert details from top_experts list
    experts = await _run_sync("top_experts", expert_type="analyst")
    if isinstance(experts, list):
        for expert in experts:
            if str(expert.get("expertId")) == str(expert_id) or expert.get("uid") == expert_id:
                return expert
    return None


