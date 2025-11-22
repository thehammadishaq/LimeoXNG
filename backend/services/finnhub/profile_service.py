"""
Finnhub Profile Service
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
                    print("   Possible reasons:")
                    print("   1. API key does not have Premium access")
                    print("   2. API key is not activated for Premium features")
                    print("   3. Endpoint /stock/profile2 requires Premium subscription")
                    print("   Please verify your API key has Premium access in Finnhub dashboard")
                    print("   Premium endpoint: /stock/profile2")
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


async def get_company_profile(symbol: str) -> Optional[Dict]:
    """
    Fetch Company Profile data from Finnhub API for a given symbol.
    Uses /stock/profile2 endpoint (Premium).
    Returns data with "Company Profile" key for compatibility.
    """
    if not FINNHUB_API_KEY:
        print("❌ FINNHUB_API_KEY not configured in settings.")
        print("💡 Please add FINNHUB_API_KEY to backend/.env file")
        return None

    print(f"🔑 Using API Key: {FINNHUB_API_KEY[:5]}...{FINNHUB_API_KEY[-5:] if len(FINNHUB_API_KEY) > 10 else '***'}")

    loop = asyncio.get_event_loop()
    all_data = {}

    # Only fetch Company Profile using /stock/profile2 endpoint (Premium)
    def fetch_company_profile():
        url = f"{BASE_URL}/stock/profile2"
        print(f"🌐 Calling Finnhub API: {url}")
        print(f"   Symbol: {symbol}")
        print(f"   Using Premium endpoint: /stock/profile2")
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

