"""
Finnhub Peers Service
Service to fetch company peers data using Finnhub API
Uses /stock/peers endpoint
"""
import requests
import asyncio
from typing import List, Optional, Dict
from datetime import datetime
from config.settings import settings
import os

FINNHUB_API_KEY = settings.FINNHUB_API_KEY if hasattr(settings, 'FINNHUB_API_KEY') else os.getenv("FINNHUB_API_KEY")
BASE_URL = "https://finnhub.io/api/v1"


def safe_get_sync(url: str, params: Optional[Dict] = None, retries: int = 2) -> Optional[List]:
    """Synchronously make an API request with retry logic and return JSON, or None on error."""
    import time
    
    for attempt in range(retries + 1):
        try:
            # Increase timeout to 60 seconds and add connection timeout
            response = requests.get(
                url, 
                params=params, 
                timeout=(10, 60),  # (connect_timeout, read_timeout)
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            
            # Check status code before raising
            if response.status_code != 200:
                error_data = {}
                try:
                    error_data = response.json()
                except:
                    error_data = {"error": response.text}
                
                print(f"❌ Finnhub API returned status {response.status_code}")
                print(f"   URL: {url.split('?')[0]}")
                print(f"   Error response: {error_data}")
                
                # Check for specific error types
                if response.status_code == 401:
                    print("💡 Status 401: Invalid API key or authentication failed")
                    print("   Please check your FINNHUB_API_KEY in backend/.env file")
                elif response.status_code == 403:
                    print("💡 Status 403: Forbidden - Access denied")
                elif response.status_code == 429:
                    print("💡 Status 429: Rate limit exceeded")
                    print("   Please wait and try again later")
                elif response.status_code == 404:
                    print("💡 Status 404: Endpoint not found or invalid symbol")
                
                # Don't retry for 4xx errors (client errors)
                if 400 <= response.status_code < 500:
                    return None
                
                # Retry for 5xx errors (server errors)
                if attempt < retries:
                    wait_time = (attempt + 1) * 2
                    print(f"⚠️ Retrying in {wait_time}s... (attempt {attempt + 1}/{retries + 1})")
                    time.sleep(wait_time)
                    continue
                else:
                    return None
            
            return response.json()
            
        except requests.exceptions.Timeout as e:
            if attempt < retries:
                wait_time = (attempt + 1) * 2  # Exponential backoff: 2s, 4s
                print(f"⚠️ Finnhub API timeout (attempt {attempt + 1}/{retries + 1}) for {url.split('?')[0]}, retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                print(f"⚠️ Finnhub API request failed after {retries + 1} attempts for {url.split('?')[0]}: {e}")
                return None
        except requests.exceptions.HTTPError as e:
            print(f"❌ HTTP Error: {e}")
            print(f"   Response status: {e.response.status_code if hasattr(e, 'response') else 'Unknown'}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    print(f"   Error details: {error_data}")
                except:
                    print(f"   Error text: {e.response.text[:200]}")
            return None
        except requests.exceptions.RequestException as e:
            if attempt < retries and "timeout" in str(e).lower():
                wait_time = (attempt + 1) * 2
                print(f"⚠️ Finnhub API error (attempt {attempt + 1}/{retries + 1}) for {url.split('?')[0]}, retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                print(f"⚠️ Finnhub API request failed for {url.split('?')[0]}: {type(e).__name__}: {e}")
                return None
    
    return None


async def get_company_peers(symbol: str, grouping: str = "subIndustry") -> Optional[List[str]]:
    """
    Fetch Company Peers from Finnhub API for a given symbol.
    Uses /stock/peers endpoint.
    
    Args:
        symbol: Stock ticker symbol (e.g., "AAPL")
        grouping: Grouping criteria for choosing peers. Supported values: sector, industry, subIndustry. Default: subIndustry.
    
    Returns:
        List of peer ticker symbols, or None on error.
    """
    if not FINNHUB_API_KEY:
        print("❌ FINNHUB_API_KEY not configured in settings.")
        print("💡 Please add FINNHUB_API_KEY to backend/.env file")
        return None

    print(f"🔑 Using API Key: {FINNHUB_API_KEY[:5]}...{FINNHUB_API_KEY[-5:] if len(FINNHUB_API_KEY) > 10 else '***'}")

    # Validate grouping parameter
    valid_groupings = ["sector", "industry", "subIndustry"]
    if grouping not in valid_groupings:
        print(f"⚠️ Invalid grouping '{grouping}'. Using default 'subIndustry'")
        grouping = "subIndustry"

    loop = asyncio.get_event_loop()

    def fetch_peers():
        url = f"{BASE_URL}/stock/peers"
        print(f"🌐 Calling Finnhub API: {url}")
        print(f"   Symbol: {symbol}")
        print(f"   Grouping: {grouping}")
        return safe_get_sync(
            url,
            params={
                "symbol": symbol,
                "grouping": grouping,
                "token": FINNHUB_API_KEY,
            },
        )

    print(f"📊 Fetching Company Peers from Finnhub for {symbol} (grouping={grouping})...")
    peers_data = await loop.run_in_executor(None, fetch_peers)

    if not peers_data or isinstance(peers_data, Exception):
        print(f"⚠️ Failed to fetch Company Peers for {symbol}")
        return None

    # Check if response has error status
    if isinstance(peers_data, dict) and "error" in peers_data:
        print(f"❌ Finnhub API error for {symbol}: {peers_data.get('error')}")
        return None

    # Validate that peers_data is a list
    if not isinstance(peers_data, list):
        print(f"⚠️ Unexpected response format for peers: expected list, got {type(peers_data)}")
        return None

    print(f"✅ Successfully fetched {len(peers_data)} peers for {symbol}")
    return peers_data

