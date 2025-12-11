"""
TipRanks Expert Stocks Service

Fetches stocks/ratings data for a specific expert from TipRanks getStocks API
and stores/updates in MongoDB. Prevents duplicates by using expert_name + ticker
as composite unique identifier.

Uses cloudscraper to bypass Cloudflare protection (same approach as cloudscrape.py).
"""

import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import traceback

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    import requests
    HAS_CLOUDSCRAPER = False
    print("⚠️  'cloudscraper' not installed. Installing it will help bypass Cloudflare protection.")
    print("   Run: pip install cloudscraper")

from models.tipranks import TipRanksExpertStockDocument

try:
    from beanie.odm.fields import PydanticObjectId
except ImportError:
    # Fallback if PydanticObjectId is not available
    PydanticObjectId = type(None)


def _serialize_object_ids(data: Any) -> Any:
    """
    Recursively convert PydanticObjectId and ObjectId to strings.
    Handles dicts, lists, and nested structures.
    """
    if isinstance(data, PydanticObjectId):
        return str(data)
    elif hasattr(data, '__class__') and 'ObjectId' in str(type(data)):
        # Handle bson ObjectId as well
        return str(data)
    elif isinstance(data, dict):
        return {key: _serialize_object_ids(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [_serialize_object_ids(item) for item in data]
    else:
        return data


TIPRANKS_API_URL = "https://www.tipranks.com/api/experts/getStocks"
TIPRANKS_BASE_URL = "https://www.tipranks.com"

# Headers to mimic browser request - updated for API calls (same as cloudscrape.py)
HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Origin': 'https://www.tipranks.com',
    'Referer': 'https://www.tipranks.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Optional: Add cookies from Postman/browser if needed
# To get cookies from Postman:
#   1. In Postman, go to the request that works
#   2. Click on "Cookies" link below the address bar
#   3. Copy the cookie values and add them here
COOKIES = {}


async def fetch_expert_stocks_from_api(
    expert_name: str,
    period: str = "year",
    benchmark: str = "none",
) -> List[Dict[str, Any]]:
    """
    Fetches stocks/ratings for a specific expert from TipRanks API using cloudscraper.
    Uses cloudscraper to bypass Cloudflare protection (same approach as cloudscrape.py).
    
    Args:
        expert_name: Expert name in URL slug format (e.g., "Heiko-Ihle")
        period: Time period (year, month, quarter, etc.)
        benchmark: Benchmark type (none, sp500, etc.)
    
    Returns:
        List of stock dictionaries from API
    """
    import asyncio
    
    print(f"🌐 Fetching data from TipRanks API...")
    print(f"   URL: {TIPRANKS_API_URL}")
    
    params = {
        'benchmark': benchmark,
        'period': period,
        'name': expert_name,
    }
    print(f"   Parameters: {params}")
    print("-" * 70)
    
    # Run synchronous cloudscraper in executor (since it's sync but we're in async context)
    def _fetch_sync():
        # Use cloudscraper if available (bypasses Cloudflare), otherwise use requests
        if HAS_CLOUDSCRAPER:
            print("   Using cloudscraper to bypass Cloudflare protection...")
            session = cloudscraper.create_scraper()
        else:
            print("   Using requests (may fail with Cloudflare protection)...")
            import requests
            session = requests.Session()
        
        session.headers.update(HEADERS)
        
        # Add cookies if provided
        if COOKIES:
            session.cookies.update(COOKIES)
            print(f"   Using {len(COOKIES)} custom cookie(s)")
        
        # First, visit the main page to get cookies (helps with Cloudflare)
        print("   Step 1: Getting session cookies...")
        session.get(TIPRANKS_BASE_URL + '/', timeout=15)
        
        # Now make the API request
        print("   Step 2: Making API request...")
        response = session.get(TIPRANKS_API_URL, params=params, timeout=15)
        
        return response
    
    try:
        # Run sync function in executor
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, _fetch_sync)
        
        # Check response
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 403:
            print("⚠️  Got 403 Forbidden. Cloudflare is still blocking the request.")
            if not HAS_CLOUDSCRAPER:
                print("\n💡 Try installing cloudscraper:")
                print("   pip install cloudscraper")
            else:
                print("\n💡 Cloudflare protection is active. You may need to:")
                print("   1. Copy cookies from your browser/Postman and add them to the COOKIES dict")
                print("   2. Wait a moment and try again (Cloudflare may need time)")
            raise Exception(f"HTTP 403: Cloudflare is blocking the request")
        
        response.raise_for_status()
        
        # Parse JSON response
        data = response.json()
        
        if not isinstance(data, list):
            print(f"⚠️ Unexpected response format: {type(data)}")
            return []
        
        print(f"✅ Successfully fetched {len(data)} stocks!")
        print(f"   Response Size: {len(response.content)} bytes")
        print("-" * 70)
        
        return data
        
    except Exception as e:
        error_type = type(e).__name__
        print(f"❌ ERROR ({error_type}): {e}")
        
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Status Code: {e.response.status_code}")
            print(f"   Response preview: {e.response.text[:500]}")
        
        if not HAS_CLOUDSCRAPER:
            print("\n💡 Tip: Install cloudscraper to bypass Cloudflare:")
            print("   pip install cloudscraper")
        
        print(f"   Traceback: {traceback.format_exc()}")
        raise


async def save_or_update_expert_stocks_to_db(
    stocks: List[Dict[str, Any]],
    expert_name: str,
    period: str = "year",
    benchmark: str = "none",
) -> Dict[str, int]:
    """
    Save or update expert stocks in MongoDB.
    Prevents duplicates by using expert_name + ticker as composite unique identifier.
    
    Args:
        stocks: List of stock dictionaries from API
        expert_name: Expert name in URL slug format
        period: API parameter for tracking
        benchmark: API parameter for tracking
    
    Returns:
        Dictionary with counts: created, updated, errors
    """
    stats = {"created": 0, "updated": 0, "errors": 0}
    
    if not stocks:
        print("⚠️ No stocks to save")
        return stats
    
    print(f"💾 Saving/updating {len(stocks)} stocks for expert '{expert_name}' to MongoDB...")
    
    for stock_data in stocks:
        try:
            # Extract ticker (required field)
            ticker = stock_data.get("ticker")
            
            if not ticker:
                print(f"⚠️ Skipping stock without ticker: {stock_data.get('name', 'Unknown')}")
                stats["errors"] += 1
                continue
            
            # Check if stock already exists for this expert
            existing_stock = await TipRanksExpertStockDocument.find_one(
                TipRanksExpertStockDocument.expert_name == expert_name,
                TipRanksExpertStockDocument.ticker == ticker,
            )
            
            # Prepare document data
            doc_data = {
                **stock_data,  # Include all fields from API
                "expert_name": expert_name,  # Add expert_name to data
                "period_param": period,
                "benchmark_param": benchmark,
            }
            
            if existing_stock:
                # Update existing stock
                for key, value in doc_data.items():
                    if key not in ["expert_name", "ticker", "created_at"]:  # Don't overwrite these
                        setattr(existing_stock, key, value)
                
                existing_stock.updated_at = datetime.utcnow()
                await existing_stock.save()
                stats["updated"] += 1
                
                if stats["updated"] % 20 == 0:
                    print(f"   Updated {stats['updated']} stocks...")
            else:
                # Create new stock
                new_stock = TipRanksExpertStockDocument(**doc_data)
                await new_stock.insert()
                stats["created"] += 1
                
                if stats["created"] % 20 == 0:
                    print(f"   Created {stats['created']} stocks...")
                    
        except Exception as e:
            print(f"❌ Error saving stock {stock_data.get('name', 'Unknown')} (ticker: {stock_data.get('ticker')}): {e}")
            print(f"   Traceback: {traceback.format_exc()}")
            stats["errors"] += 1
            continue
    
    print(f"✅ Saved stocks to MongoDB: {stats['created']} created, {stats['updated']} updated, {stats['errors']} errors")
    return stats


async def fetch_and_save_expert_stocks(
    expert_name: str,
    period: str = "year",
    benchmark: str = "none",
    save_to_db: bool = True,
) -> Dict[str, Any]:
    """
    Fetch expert stocks from TipRanks API and save/update in MongoDB.
    
    Args:
        expert_name: Expert name in URL slug format (e.g., "Heiko-Ihle")
        period: Time period (year, month, quarter, etc.)
        benchmark: Benchmark type (none, sp500, etc.)
        save_to_db: Whether to save to database
    
    Returns:
        Dictionary with stocks data and save stats
    """
    # Fetch from API
    stocks = await fetch_expert_stocks_from_api(
        expert_name=expert_name,
        period=period,
        benchmark=benchmark,
    )
    
    # Save to database if requested
    save_stats = None
    if save_to_db and stocks:
        save_stats = await save_or_update_expert_stocks_to_db(
            stocks=stocks,
            expert_name=expert_name,
            period=period,
            benchmark=benchmark,
        )
    
    return {
        "stocks": stocks,
        "count": len(stocks),
        "expert_name": expert_name,
        "save_stats": save_stats,
        "parameters": {
            "period": period,
            "benchmark": benchmark,
        },
    }


async def get_expert_stocks_from_db(
    expert_name: str,
    period_param: Optional[str] = None,
    benchmark_param: Optional[str] = None,
    limit: Optional[int] = None,
    skip: int = 0,
) -> List[Dict[str, Any]]:
    """
    Get expert stocks from MongoDB.
    
    Args:
        expert_name: Expert name in URL slug format
        period_param: Optional filter by period parameter
        benchmark_param: Optional filter by benchmark parameter
        limit: Maximum number of results (optional)
        skip: Number of results to skip (for pagination)
    
    Returns:
        List of stock dictionaries
    """
    try:
        # Build query
        query = TipRanksExpertStockDocument.expert_name == expert_name
        
        if period_param:
            query = query & (TipRanksExpertStockDocument.period_param == period_param)
        if benchmark_param:
            query = query & (TipRanksExpertStockDocument.benchmark_param == benchmark_param)
        
        stocks_query = TipRanksExpertStockDocument.find(query)
        
        # Apply sorting (by updated_at descending - most recent first)
        stocks_query = stocks_query.sort("-updated_at")
        
        # Apply pagination
        if skip > 0:
            stocks_query = stocks_query.skip(skip)
        if limit:
            stocks_query = stocks_query.limit(limit)
        
        # Execute query
        stocks = await stocks_query.to_list()
        
        # Convert to dictionaries and serialize ObjectId fields
        stocks_list = []
        for stock in stocks:
            stock_dict = stock.dict()
            # Recursively convert all ObjectId/PydanticObjectId to strings
            stock_dict = _serialize_object_ids(stock_dict)
            stocks_list.append(stock_dict)
        
        print(f"✅ Retrieved {len(stocks_list)} stocks for expert '{expert_name}' from MongoDB")
        return stocks_list
        
    except Exception as e:
        print(f"❌ Error retrieving expert stocks from MongoDB: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        raise
