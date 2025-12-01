import asyncio
import sys
from typing import Any, Dict

import httpx

# Ensure we can import from the backend package when running this file from repo root
sys.path.append("backend")

from config.settings import settings  # type: ignore  # noqa: E402


FINNHUB_BASE_URL = "https://finnhub.io/api/v1"


async def symbol_lookup(
    q: str,
    exchange: str | None = None,
) -> Dict[str, Any]:
    """
    Call Finnhub's Symbol Lookup endpoint:

        GET /search?q={query}&exchange={exchange}

    Docs summary:
    - q (required): symbol, name, ISIN, or CUSIP
    - exchange (optional): exchange filter, e.g. 'US'

    Response:
    - count: number of results
    - result: list of matches, each with:
        - description
        - displaySymbol
        - symbol
        - type
    """

    api_key = settings.FINNHUB_API_KEY
    if not api_key:
        raise RuntimeError("FINNHUB_API_KEY is not configured (backend/config/.env or environment).")

    params: Dict[str, Any] = {"q": q, "token": api_key}
    if exchange:
        params["exchange"] = exchange

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{FINNHUB_BASE_URL}/search", params=params)
        resp.raise_for_status()
        return resp.json()


async def main() -> None:
    """
    Simple test runner for Finnhub Symbol Lookup (/search) endpoint.

    Run from repo root:
        python test_symbol_lookup.py

    You can tweak the default query / exchange below as needed.
    """

    # Default test queries (you can change these or add CLI parsing later)
    query = "paramount skydance inc"  # e.g. 'apple', 'AAPL', 'US5949181045' (ISIN)
    exchange = "US"  # or None to search across all exchanges

    print("🔍 Testing Finnhub Symbol Lookup (/search)")
    print(f"  Query   : {query}")
    print(f"  Exchange: {exchange or '(all)'}")

    try:
        data = await symbol_lookup(query, exchange)
    except Exception as exc:  # noqa: BLE001
        print(f"❌ Error during symbol lookup: {exc}")
        return

    count = data.get("count", 0)
    results = data.get("result") or []

    print(f"\n✅ API call succeeded. count={count}, results={len(results)}")

    if not results:
        print("No results returned.")
        return

    print("\nTop matches:")
    for item in results[:10]:
        desc = item.get("description", "")
        display_symbol = item.get("displaySymbol", "")
        symbol = item.get("symbol", "")
        sec_type = item.get("type", "")
        print(f"  - {display_symbol:10s} ({symbol:10s}) [{sec_type}]  {desc}")


if __name__ == "__main__":
    asyncio.run(main())


