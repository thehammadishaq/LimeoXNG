import asyncio
import sys
import time


# Ensure we can import from the backend package when running this file from repo root
sys.path.append("backend")

from controllers.finnhub.stock_candles_controller import (  # type: ignore  # noqa: E402
    fetch_stock_candles_get,
)


async def main() -> None:
    """
    Simple test runner for Finnhub stock candles fetching.

    Run from repo root:
        python test_stock_candles.py

    Adjust ticker / resolution / range below as needed.
    """
    ticker = "AABKF"  # change to any symbol you want to test
    resolution = "M"  # "M" for 1-month candles

    # Last 24 months window for monthly candles
    to_ts = int(time.time())
    from_ts = to_ts - 60 * 60 * 24 * 30 * 24

    print(f"Testing fetch_stock_candles_get for {ticker}")
    print(f"  Resolution: {resolution}")
    print(f"  From: {from_ts}")
    print(f"  To:   {to_ts}")

    try:
        response = await fetch_stock_candles_get(
            ticker=ticker,
            resolution=resolution,
            from_timestamp=from_ts,
            to_timestamp=to_ts,
            save_to_db=False,  # set True if you also want to write into Mongo
        )
    except Exception as exc:  # noqa: BLE001
        print(f"❌ Error while testing stock candles: {exc}")
        return

    print("✅ Controller returned:")
    print(response)


if __name__ == "__main__":
    asyncio.run(main())


