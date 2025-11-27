"""
Finnhub Company News Service
Service to fetch company-specific news data using Finnhub API
Uses /company-news endpoint
"""
import requests
import asyncio
from typing import List, Dict, Optional
from datetime import date
import os

from config.settings import settings


FINNHUB_API_KEY = (
    settings.FINNHUB_API_KEY
    if hasattr(settings, "FINNHUB_API_KEY")
    else os.getenv("FINNHUB_API_KEY")
)
BASE_URL = "https://finnhub.io/api/v1"


def safe_get_sync(
    url: str, params: Optional[Dict] = None, retries: int = 2
) -> Optional[List[Dict]]:
    """Synchronously make an API request with retry logic and return JSON, or None on error."""
    import time

    for attempt in range(retries + 1):
        try:
            response = requests.get(
                url,
                params=params,
                timeout=(10, 60),  # (connect_timeout, read_timeout)
                headers={"User-Agent": "Mozilla/5.0"},
            )

            if response.status_code != 200:
                error_data = {}
                try:
                    error_data = response.json()
                except Exception:
                    error_data = {"error": response.text}

                print(f"❌ Finnhub API returned status {response.status_code}")
                print(f"   URL: {url.split('?')[0]}")
                print(f"   Error response: {error_data}")

                if response.status_code == 401:
                    print("💡 Status 401: Invalid API key or authentication failed")
                    print("   Please check your FINNHUB_API_KEY in backend/.env file")
                elif response.status_code == 403:
                    print("💡 Status 403: Forbidden - Access denied")
                    print("   Possible reasons:")
                    print("   1. API key does not have required access")
                    print("   2. API key is not activated for this endpoint")
                elif response.status_code == 429:
                    print("💡 Status 429: Rate limit exceeded")
                    print("   Please wait and try again later")
                elif response.status_code == 404:
                    print("💡 Status 404: Endpoint not found or invalid symbol/date range")

                # Don't retry for 4xx errors (client errors)
                if 400 <= response.status_code < 500:
                    return None

                # Retry for 5xx errors (server errors)
                if attempt < retries:
                    wait_time = (attempt + 1) * 2
                    print(
                        f"⚠️ Retrying in {wait_time}s... (attempt {attempt + 1}/{retries + 1})"
                    )
                    time.sleep(wait_time)
                    continue
                else:
                    return None

            return response.json()

        except requests.exceptions.Timeout as e:
            if attempt < retries:
                wait_time = (attempt + 1) * 2
                print(
                    f"⚠️ Finnhub API timeout (attempt {attempt + 1}/{retries + 1}) "
                    f"for {url.split('?')[0]}, retrying in {wait_time}s..."
                )
                time.sleep(wait_time)
                continue
            else:
                print(
                    f"⚠️ Finnhub API request failed after {retries + 1} attempts for {url.split('?')[0]}: {e}"
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
                print(
                    f"⚠️ Finnhub API request failed for {url.split('?')[0]}: {type(e).__name__}: {e}"
                )
                return None

    return None


async def get_company_news(
    symbol: str, from_date: date, to_date: date
) -> Optional[List[Dict]]:
    """
    Fetch Company News data from Finnhub API for a given symbol and date range.
    Uses /company-news endpoint.

    Args:
        symbol: Company symbol (e.g., AAPL)
        from_date: From date (datetime.date)
        to_date: To date (datetime.date)

    Returns:
        List of news articles or None if failed
    """
    if not FINNHUB_API_KEY:
        print("❌ FINNHUB_API_KEY not configured in settings.")
        print("💡 Please add FINNHUB_API_KEY to backend/.env file")
        return None

    symbol_upper = symbol.upper().strip()
    from_str = from_date.isoformat()
    to_str = to_date.isoformat()

    print(
        f"🔑 Using API Key: {FINNHUB_API_KEY[:5]}...{FINNHUB_API_KEY[-5:] if len(FINNHUB_API_KEY) > 10 else '***'}"
    )

    loop = asyncio.get_event_loop()

    def fetch_news():
        url = f"{BASE_URL}/company-news"
        print(f"🌐 Calling Finnhub API: {url}")
        print(f"   Symbol: {symbol_upper}")
        print(f"   From: {from_str}")
        print(f"   To: {to_str}")
        params = {
            "symbol": symbol_upper,
            "from": from_str,
            "to": to_str,
            "token": FINNHUB_API_KEY,
        }
        return safe_get_sync(url, params=params)

    print(
        f"📰 Fetching Company News from Finnhub (symbol={symbol_upper}, from={from_str}, to={to_str})..."
    )
    news_data = await loop.run_in_executor(None, fetch_news)

    if not news_data or isinstance(news_data, Exception):
        print(f"⚠️ Failed to fetch Company News for {symbol_upper}")
        return None

    # Ensure it's a list
    if not isinstance(news_data, list):
        print(f"⚠️ Unexpected response format: expected list, got {type(news_data)}")
        return None

    print(f"✅ Fetched {len(news_data)} company news articles for {symbol_upper}")
    return news_data


