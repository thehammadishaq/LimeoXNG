"""
Finnhub Quote Service
Service to fetch real-time quote data using Finnhub API
Uses /quote endpoint
"""
import requests
import asyncio
from typing import Dict, Optional
from datetime import datetime
import os

from config.settings import settings

FINNHUB_API_KEY = (
    settings.FINNHUB_API_KEY
    if hasattr(settings, "FINNHUB_API_KEY")
    else os.getenv("FINNHUB_API_KEY")
)
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
                headers={"User-Agent": "Mozilla/5.0"},
            )

            # Check status code before raising
            if response.status_code != 200:
                error_data = {}
                try:
                    error_data = response.json()
                except Exception:
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
                    print("   1. API key does not have required access")
                    print("   2. API key is not activated")
                    print("   3. Endpoint /quote requires appropriate subscription tier")
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
                print(
                    f"⚠️ Finnhub API timeout (attempt {attempt + 1}/{retries + 1}) "
                    f"for {url.split('?')[0]}, retrying in {wait_time}s..."
                )
                time.sleep(wait_time)
                continue
            else:
                print(
                    f"⚠️ Finnhub API request failed after {retries + 1} attempts "
                    f"for {url.split('?')[0]}: {e}"
                )
                return None
        except requests.exceptions.RequestException as e:
            if attempt < retries and "timeout" in str(e).lower():
                wait_time = (attempt + 1) * 2
                print(
                    f"⚠️ Finnhub API error (attempt {attempt + 1}/{retries + 1}) "
                    f"for {url.split('?')[0]}, retrying in {wait_time}s..."
                )
                time.sleep(wait_time)
                continue
            else:
                print(f"⚠️ Finnhub API request failed for {url.split('?')[0]}: {type(e).__name__}: {e}")
                return None

    return None


async def get_real_time_quote(symbol: str) -> Optional[Dict]:
    """
    Fetch real-time quote data from Finnhub API for a given symbol.
    Uses /quote endpoint.

    Returns raw quote payload under "quote" key plus metadata wrapper.
    """
    if not FINNHUB_API_KEY:
        print("❌ FINNHUB_API_KEY not configured in settings.")
        print("💡 Please add FINNHUB_API_KEY to backend/.env file")
        return None

    print(
        f"🔑 Using API Key: "
        f"{FINNHUB_API_KEY[:5]}..."
        f"{FINNHUB_API_KEY[-5:] if len(FINNHUB_API_KEY) > 10 else '***'}"
    )

    loop = asyncio.get_event_loop()

    def fetch_quote():
        url = f"{BASE_URL}/quote"
        print(f"🌐 Calling Finnhub API: {url}")
        print(f"   Symbol: {symbol}")
        print(f"   Endpoint: /quote")
        return safe_get_sync(
            url,
            params={
                "symbol": symbol,
                "token": FINNHUB_API_KEY,
            },
        )

    print(f"📊 Fetching real-time quote from Finnhub for {symbol}...")
    quote_data = await loop.run_in_executor(None, fetch_quote)

    if not quote_data or isinstance(quote_data, Exception):
        print(f"⚠️ Failed to fetch quote for {symbol}")
        return None

    # Wrap raw payload with metadata
    wrapped = {
        "quote": quote_data,
        "_metadata": {
            "symbol": symbol,
            "fetched_at": datetime.now().isoformat(),
            "api_source": "Finnhub",
            "endpoint": "/quote",
        },
    }

    return wrapped



