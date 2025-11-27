"""
Finnhub Insider Transactions Service
Service to fetch insider transactions data using Finnhub API
Uses /stock/insider-transactions endpoint
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
) -> Optional[Dict]:
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


async def get_insider_transactions(
    symbol: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: Optional[int] = None,
) -> Optional[Dict]:
    """
    Fetch Insider Transactions data from Finnhub API.
    Uses /stock/insider-transactions endpoint.

    Args:
        symbol: Company symbol (e.g., AAPL, TSLA). If None, returns latest transactions.
        from_date: From date (datetime.date), optional
        to_date: To date (datetime.date), optional
        limit: Limit number of transactions (max 100), optional

    Returns:
        Dictionary with 'data' and 'symbol' keys, or None if failed
    """
    if not FINNHUB_API_KEY:
        print("❌ FINNHUB_API_KEY not configured in settings.")
        print("💡 Please add FINNHUB_API_KEY to backend/.env file")
        return None

    symbol_upper = symbol.upper().strip() if symbol else None
    from_str = from_date.isoformat() if from_date else None
    to_str = to_date.isoformat() if to_date else None

    print(
        f"🔑 Using API Key: {FINNHUB_API_KEY[:5]}...{FINNHUB_API_KEY[-5:] if len(FINNHUB_API_KEY) > 10 else '***'}"
    )

    loop = asyncio.get_event_loop()

    def fetch_transactions():
        url = f"{BASE_URL}/stock/insider-transactions"
        print(f"🌐 Calling Finnhub API: {url}")
        if symbol_upper:
            print(f"   Symbol: {symbol_upper}")
        if from_str:
            print(f"   From: {from_str}")
        if to_str:
            print(f"   To: {to_str}")
        if limit:
            print(f"   Limit: {limit}")

        params = {"token": FINNHUB_API_KEY}
        if symbol_upper:
            params["symbol"] = symbol_upper
        if from_str:
            params["from"] = from_str
        if to_str:
            params["to"] = to_str
        if limit:
            params["limit"] = limit

        return safe_get_sync(url, params=params)

    query_desc = f"symbol={symbol_upper}" if symbol_upper else "latest transactions"
    print(
        f"📊 Fetching Insider Transactions from Finnhub ({query_desc})..."
    )
    transactions_data = await loop.run_in_executor(None, fetch_transactions)

    if not transactions_data or isinstance(transactions_data, Exception):
        print(f"⚠️ Failed to fetch Insider Transactions for {query_desc}")
        return None

    # Ensure it's a dict with 'data' key
    if not isinstance(transactions_data, dict):
        print(f"⚠️ Unexpected response format: expected dict, got {type(transactions_data)}")
        return None

    if "data" not in transactions_data:
        print(f"⚠️ Response missing 'data' key: {transactions_data}")
        return None

    data_list = transactions_data.get("data", [])
    if not isinstance(data_list, list):
        print(f"⚠️ 'data' is not a list: {type(data_list)}")
        return None

    print(
        f"✅ Fetched {len(data_list)} insider transactions for {query_desc}"
    )
    return transactions_data

