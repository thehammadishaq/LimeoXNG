"""
Finnhub Service
Service to fetch company profile data using Finnhub API
Only uses /stock/profile2 endpoint
"""
import requests
import asyncio
from typing import Dict, Optional, Any
from datetime import datetime
from config.settings import settings
import os

FINNHUB_API_KEY = settings.FINNHUB_API_KEY if hasattr(settings, 'FINNHUB_API_KEY') else os.getenv("FINNHUB_API_KEY")
BASE_URL = "https://finnhub.io/api/v1"


def safe_get_sync(url: str, params: Optional[Dict] = None, retries: int = 2) -> Optional[Dict]:
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
            response.raise_for_status()
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
        except requests.exceptions.RequestException as e:
            if attempt < retries and "timeout" in str(e).lower():
                wait_time = (attempt + 1) * 2
                print(f"⚠️ Finnhub API error (attempt {attempt + 1}/{retries + 1}) for {url.split('?')[0]}, retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                print(f"⚠️ Finnhub API request failed for {url.split('?')[0]}: {type(e).__name__}")
                return None
    
    return None


async def get_all_finnhub_data(symbol: str) -> Optional[Dict]:
    """
    Fetch Company Profile data from Finnhub API for a given symbol.
    Only uses /stock/profile2 endpoint.
    Returns data with "Company Profile" key for compatibility.
    """
    if not FINNHUB_API_KEY:
        print("❌ FINNHUB_API_KEY not configured in settings.")
        return None

    loop = asyncio.get_event_loop()
    all_data = {}

    # Only fetch Company Profile using /stock/profile2 endpoint
    def fetch_company_profile():
        url = f"{BASE_URL}/stock/profile2"
        return safe_get_sync(url, params={"symbol": symbol, "token": FINNHUB_API_KEY})

    # Fetch Company Profile
    print(f"📊 Fetching Company Profile from Finnhub for {symbol}...")
    company_profile = await loop.run_in_executor(None, fetch_company_profile)

    # Store profile data
    if company_profile and not isinstance(company_profile, Exception):
        all_data["Company Profile"] = company_profile
    else:
        print(f"⚠️ Failed to fetch Company Profile for {symbol}")
        return None

    # Add metadata
    all_data["_metadata"] = {
        "symbol": symbol,
        "fetched_at": datetime.now().isoformat(),
        "data_sections": ["Company Profile"],
        "api_source": "Finnhub",
        "endpoint": "/stock/profile2"
    }

    return all_data if all_data else None


