"""
Screener Service
Service to fetch stock screener data from Finnhub API with caching
"""
import requests
import asyncio
from typing import Dict, Optional, List, Any
from datetime import datetime, timedelta
from config.settings import settings
import os

FINNHUB_API_KEY = settings.FINNHUB_API_KEY if hasattr(settings, 'FINNHUB_API_KEY') else os.getenv("FINNHUB_API_KEY")
BASE_URL = "https://finnhub.io/api/v1"
CACHE_DURATION_MINUTES = 3


def safe_get_sync(url: str, params: Optional[Dict] = None, retries: int = 2) -> Optional[Dict]:
    """Synchronously make an API request with retry logic and return JSON, or None on error."""
    import time
    
    # Extract endpoint name for logging
    endpoint_name = url.split('/')[-1] if '/' in url else url
    
    for attempt in range(retries + 1):
        try:
            response = requests.get(
                url, 
                params=params, 
                timeout=(10, 60),
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout as e:
            if attempt < retries:
                wait_time = (attempt + 1) * 2
                print(f"⚠️ Finnhub API timeout for {endpoint_name} (attempt {attempt + 1}/{retries + 1}), retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                print(f"❌ Finnhub API timeout after {retries + 1} attempts for {endpoint_name}")
                print(f"   Error: {str(e)}")
                print(f"   Possible causes: Slow network, Finnhub API is slow or down")
                return None
        except requests.exceptions.HTTPError as e:
            # Handle HTTP errors (4xx, 5xx)
            status_code = e.response.status_code if hasattr(e, 'response') and e.response else 'Unknown'
            error_detail = ''
            try:
                if hasattr(e, 'response') and e.response:
                    error_detail = e.response.text[:200]  # First 200 chars
            except:
                pass
            
            print(f"❌ Finnhub API HTTP Error for {endpoint_name}: Status {status_code}")
            print(f"   URL: {url.split('?')[0]}")
            print(f"   Error: {str(e)}")
            
            # Provide specific error messages based on status code
            if status_code == 401:
                print(f"   ⚠️ Authentication Error (401): Invalid or expired API key")
                print(f"   Solution: Check FINNHUB_API_KEY in .env file")
            elif status_code == 403:
                print(f"   ⚠️ Forbidden (403): API key doesn't have access to this endpoint")
                print(f"   Solution: Check API key permissions or upgrade plan")
            elif status_code == 429:
                print(f"   ⚠️ Rate Limit Exceeded (429): Too many requests")
                print(f"   Solution: Wait a few minutes or upgrade to higher tier")
            elif status_code == 404:
                print(f"   ⚠️ Not Found (404): Invalid endpoint or symbol")
                if params and 'symbol' in params:
                    print(f"   Symbol: {params.get('symbol')}")
            elif 500 <= status_code < 600:
                print(f"   ⚠️ Server Error ({status_code}): Finnhub API server issue")
                print(f"   Solution: Wait and retry later")
            
            if error_detail:
                print(f"   Response: {error_detail}")
            
            # Don't retry on 4xx errors (client errors)
            if status_code and isinstance(status_code, int) and 400 <= status_code < 500:
                print(f"   ⚠️ Client error ({status_code}), not retrying")
                return None
            
            # Retry on 5xx errors (server errors)
            if attempt < retries:
                wait_time = (attempt + 1) * 2
                print(f"   Retrying in {wait_time}s... (attempt {attempt + 1}/{retries + 1})")
                time.sleep(wait_time)
                continue
            else:
                return None
        except requests.exceptions.ConnectionError as e:
            print(f"❌ Finnhub API Connection Error for {endpoint_name}")
            print(f"   Error: {str(e)}")
            print(f"   Possible causes: No internet, DNS issue, or Finnhub API is unreachable")
            if attempt < retries:
                wait_time = (attempt + 1) * 2
                print(f"   Retrying in {wait_time}s... (attempt {attempt + 1}/{retries + 1})")
                time.sleep(wait_time)
                continue
            else:
                return None
        except requests.exceptions.RequestException as e:
            error_type = type(e).__name__
            print(f"❌ Finnhub API Request Error for {endpoint_name}: {error_type}")
            print(f"   Error: {str(e)}")
            
            if attempt < retries and ("timeout" in str(e).lower() or "connection" in str(e).lower()):
                wait_time = (attempt + 1) * 2
                print(f"   Retrying in {wait_time}s... (attempt {attempt + 1}/{retries + 1})")
                time.sleep(wait_time)
                continue
            else:
                return None
        except Exception as e:
            print(f"❌ Unexpected error in Finnhub API request for {endpoint_name}: {type(e).__name__}")
            print(f"   Error: {str(e)}")
            return None
    
    return None


async def fetch_stock_quote(symbol: str) -> Optional[Dict]:
    """Fetch real-time quote for a single stock"""
    if not FINNHUB_API_KEY:
        print("❌ FINNHUB_API_KEY not configured in settings.")
        print("   Please set FINNHUB_API_KEY in your .env file")
        return None
    
    url = f"{BASE_URL}/quote"
    params = {"symbol": symbol, "token": FINNHUB_API_KEY}
    
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, safe_get_sync, url, params)
        
        if data:
            data['symbol'] = symbol
            data['fetched_at'] = datetime.now().isoformat()
        else:
            print(f"⚠️ No quote data returned for {symbol}")
        
        return data
    except Exception as e:
        print(f"❌ Exception in fetch_stock_quote for {symbol}: {type(e).__name__} - {str(e)}")
        return None


async def fetch_stock_profile(symbol: str) -> Optional[Dict]:
    """Fetch company profile for a single stock"""
    if not FINNHUB_API_KEY:
        print("❌ FINNHUB_API_KEY not configured in settings.")
        print("   Please set FINNHUB_API_KEY in your .env file")
        return None
    
    url = f"{BASE_URL}/stock/profile2"
    params = {"symbol": symbol, "token": FINNHUB_API_KEY}
    
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, safe_get_sync, url, params)
        
        if not data:
            print(f"⚠️ No profile data returned for {symbol}")
        
        return data
    except Exception as e:
        print(f"❌ Exception in fetch_stock_profile for {symbol}: {type(e).__name__} - {str(e)}")
        return None


async def fetch_stock_metrics(symbol: str) -> Optional[Dict]:
    """Fetch stock metrics (P/E, etc.) for a single stock"""
    if not FINNHUB_API_KEY:
        print("❌ FINNHUB_API_KEY not configured in settings.")
        print("   Please set FINNHUB_API_KEY in your .env file")
        return None
    
    url = f"{BASE_URL}/stock/metric"
    params = {"symbol": symbol, "metric": "all", "token": FINNHUB_API_KEY}
    
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, safe_get_sync, url, params)
        
        if not data:
            print(f"⚠️ No metrics data returned for {symbol}")
        
        return data
    except Exception as e:
        print(f"❌ Exception in fetch_stock_metrics for {symbol}: {type(e).__name__} - {str(e)}")
        return None


async def fetch_screener_data(
    symbols: List[str],
    use_cache: bool = True
) -> Dict[str, Any]:
    """
    Fetch screener data for multiple stocks
    Returns data in format suitable for frontend table
    """
    if not FINNHUB_API_KEY:
        return {"error": "FINNHUB_API_KEY not configured"}
    
    results = []
    loop = asyncio.get_event_loop()
    
    # Fetch data for all symbols in parallel batches
    async def fetch_stock_data(symbol: str):
        """Fetch all data for a single stock"""
        quote_task = loop.run_in_executor(None, lambda: safe_get_sync(
            f"{BASE_URL}/quote",
            {"symbol": symbol, "token": FINNHUB_API_KEY}
        ))
        profile_task = loop.run_in_executor(None, lambda: safe_get_sync(
            f"{BASE_URL}/stock/profile2",
            {"symbol": symbol, "token": FINNHUB_API_KEY}
        ))
        metrics_task = loop.run_in_executor(None, lambda: safe_get_sync(
            f"{BASE_URL}/stock/metric",
            {"symbol": symbol, "metric": "all", "token": FINNHUB_API_KEY}
        ))
        
        # Add small delay to avoid rate limiting
        await asyncio.sleep(0.1)
        
        quote, profile, metrics = await asyncio.gather(
            quote_task, profile_task, metrics_task, return_exceptions=True
        )
        
        # Combine data
        stock_data = {
            "ticker": symbol,
            "quote": quote if not isinstance(quote, Exception) else None,
            "profile": profile if not isinstance(profile, Exception) else None,
            "metrics": metrics if not isinstance(metrics, Exception) else None,
            "fetched_at": datetime.now().isoformat()
        }
        
        return stock_data
    
    # Fetch in batches to avoid overwhelming the API
    batch_size = 10
    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i + batch_size]
        batch_results = await asyncio.gather(
            *[fetch_stock_data(symbol) for symbol in batch],
            return_exceptions=True
        )
        results.extend([r for r in batch_results if not isinstance(r, Exception)])
        
        # Delay between batches
        if i + batch_size < len(symbols):
            await asyncio.sleep(0.5)
    
    return {
        "stocks": results,
        "total": len(results),
        "fetched_at": datetime.now().isoformat()
    }


def is_cache_valid(updated_at: datetime, cache_duration_minutes: int = CACHE_DURATION_MINUTES) -> bool:
    """Check if cached data is still valid"""
    if not updated_at:
        return False
    
    age = datetime.utcnow() - updated_at
    return age < timedelta(minutes=cache_duration_minutes)

