"""
Stock Symbols Service
Service to fetch and cache all available stock symbols from Finnhub
"""
import requests
import asyncio
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from config.settings import settings
import os

FINNHUB_API_KEY = settings.FINNHUB_API_KEY if hasattr(settings, 'FINNHUB_API_KEY') else os.getenv("FINNHUB_API_KEY")
BASE_URL = "https://finnhub.io/api/v1"

# Cache duration for symbols list (24 hours)
SYMBOLS_CACHE_DURATION_HOURS = 24


def safe_get_sync(url: str, params: Optional[Dict] = None, retries: int = 2) -> Optional[List]:
    """Synchronously make an API request with retry logic"""
    import time
    
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
                print(f"⚠️ Finnhub API timeout (attempt {attempt + 1}/{retries + 1}), retrying...")
                time.sleep(wait_time)
                continue
            else:
                print(f"⚠️ Finnhub API request failed after {retries + 1} attempts: {e}")
                return None
        except requests.exceptions.RequestException as e:
            if attempt < retries and "timeout" in str(e).lower():
                wait_time = (attempt + 1) * 2
                time.sleep(wait_time)
                continue
            else:
                print(f"⚠️ Finnhub API request failed: {type(e).__name__}")
                return None
    
    return None


async def fetch_all_stock_symbols(exchange: str = "US") -> List[Dict]:
    """
    Fetch all stock symbols from Finnhub for a given exchange
    Returns list of symbols with metadata
    """
    if not FINNHUB_API_KEY:
        print("❌ FINNHUB_API_KEY not configured in settings.")
        return []
    
    url = f"{BASE_URL}/stock/symbol"
    params = {
        "exchange": exchange,
        "token": FINNHUB_API_KEY
    }
    
    loop = asyncio.get_event_loop()
    symbols = await loop.run_in_executor(None, safe_get_sync, url, params)
    
    if not symbols:
        return []
    
    # Filter only common stocks (exclude ETFs, warrants, etc.)
    # Common stock types: Common Stock, Common Shares
    filtered_symbols = [
        s for s in symbols 
        if s.get("type") in ["Common Stock", "Common Shares", "EQS", "SH"]
    ]
    
    return filtered_symbols


async def get_all_available_symbols() -> List[str]:
    """
    Get list of all available stock ticker symbols
    Fetches from multiple exchanges and combines
    """
    exchanges = ["US", "NASDAQ", "NYSE"]  # Major US exchanges
    
    all_symbols = []
    seen = set()
    
    for exchange in exchanges:
        try:
            symbols = await fetch_all_stock_symbols(exchange)
            for symbol in symbols:
                ticker = symbol.get("symbol", "").upper()
                if ticker and ticker not in seen:
                    seen.add(ticker)
                    all_symbols.append(ticker)
        except Exception as e:
            print(f"⚠️ Error fetching symbols from {exchange}: {e}")
            continue
    
    # Remove duplicates and sort
    unique_symbols = sorted(list(set(all_symbols)))
    
    print(f"✅ Fetched {len(unique_symbols)} unique stock symbols")
    return unique_symbols


