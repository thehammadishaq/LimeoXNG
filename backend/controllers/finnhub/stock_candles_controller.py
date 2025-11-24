from fastapi import HTTPException, status
from typing import Optional, Dict

from services.finnhub.stock_candles_service import get_stock_candles
from models.finnhub.stock_candles import StockCandlesFetchResponse


class StockCandlesController:
    """Controller for Stock Candles operations."""

    async def fetch_stock_candles(
        self, ticker: str, resolution: str, from_timestamp: int, to_timestamp: int
    ) -> Optional[Dict]:
        """
        Fetch stock candles from Finnhub.
        """
        try:
            data = await get_stock_candles(ticker.upper(), resolution, from_timestamp, to_timestamp)
            return data
        except Exception as e:
            print(f"❌ Error fetching stock candles from Finnhub: {e}")
            return None


async def fetch_stock_candles_get(
    ticker: str, resolution: str, from_timestamp: int, to_timestamp: int, save_to_db: bool = True
):
    ticker = ticker.upper()

    print(
        f"Received request to fetch stock candles for {ticker} from Finnhub (GET), "
        f"resolution={resolution}, from={from_timestamp}, to={to_timestamp}"
    )

    try:
        controller = StockCandlesController()
        data = await controller.fetch_stock_candles(ticker, resolution, from_timestamp, to_timestamp)

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No stock candles data found for {ticker} from Finnhub.",
            )

        record_id = None
        print(f"💾 save_to_db parameter: {save_to_db}")
        if save_to_db:
            print(f"💾 Attempting to save stock candles for {ticker} to database...")
            try:
                # Extract actual candles data from wrapper structure:
                # { "stock_candles": {...}, "_metadata": {...} }
                candles_data = {}
                if isinstance(data, dict):
                    if "stock_candles" in data:
                        candles_data = data["stock_candles"]
                    else:
                        candles_data = {k: v for k, v in data.items() if k != "_metadata"}

                if not candles_data:
                    print(f"⚠️ No stock candles data extracted for {ticker}")
                    candles_data = {}

                print(f"📦 Extracted stock candles data keys: {list(candles_data.keys())[:10]}")

                # Note: Database saving can be implemented later if needed
                # For now, we'll just log that save_to_db was requested
                print(f"💡 Database saving for stock candles not yet implemented")
                print(f"   Data structure: {list(candles_data.keys())}")
            except Exception as db_error:
                print(f"❌ Error saving stock candles to database for {ticker}: {db_error}")
                print(f"   Error type: {type(db_error).__name__}")
                import traceback

                print(f"   Traceback: {traceback.format_exc()}")
        else:
            print(f"⏭️ Skipping database save for {ticker} (save_to_db=False)")

        return StockCandlesFetchResponse(
            ticker=ticker,
            resolution=resolution,
            from_timestamp=from_timestamp,
            to_timestamp=to_timestamp,
            data=data,
            saved_to_db=save_to_db,
            record_id=record_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in stock candles controller for {ticker}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching stock candles from Finnhub: {e}",
        )

