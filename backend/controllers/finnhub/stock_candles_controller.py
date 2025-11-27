from fastapi import HTTPException, status
from typing import Optional, Dict
from datetime import datetime

from services.finnhub.stock_candles_service import get_stock_candles
from models.finnhub.stock_candles import StockCandlesFetchResponse
from models.stock_candles import LatestCandle


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
    ticker: str,
    resolution: str,
    from_timestamp: int,
    to_timestamp: int,
    save_to_db: bool = True,
):
    """
    Fetch candles and, if save_to_db=True, persist ONLY the latest OHLCV
    candle (e.g. last 1-minute bar) into MongoDB by upserting a single
    document per (ticker, resolution).
    """
    ticker = ticker.upper()

    print(
        f"Received request to fetch stock candles for {ticker} from Finnhub (GET), "
        f"resolution={resolution}, from={from_timestamp}, to={to_timestamp}"
    )

    try:
        controller = StockCandlesController()
        data = await controller.fetch_stock_candles(
            ticker, resolution, from_timestamp, to_timestamp
        )

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No stock candles data found for {ticker} from Finnhub.",
            )

        record_id: Optional[str] = None
        print(f"💾 save_to_db parameter: {save_to_db}")
        if save_to_db:
            print(f"💾 Attempting to save latest candle for {ticker} to database...")
            try:
                # Extract actual candles data from wrapper structure:
                # { "stock_candles": {...}, "_metadata": {...} }
                candles_data: Dict = {}
                if isinstance(data, dict):
                    if "stock_candles" in data:
                        candles_data = data["stock_candles"]
                    else:
                        candles_data = {
                            k: v for k, v in data.items() if k != "_metadata"
                        }

                if not candles_data:
                    print(f"⚠️ No stock candles data extracted for {ticker}")
                else:
                    print(
                        f"📦 Extracted stock candles data keys: "
                        f"{list(candles_data.keys())[:10]}"
                    )

                    closes = candles_data.get("c") or []
                    highs = candles_data.get("h") or []
                    lows = candles_data.get("l") or []
                    opens = candles_data.get("o") or []
                    volumes = candles_data.get("v") or []
                    timestamps = candles_data.get("t") or []

                    if not timestamps or not closes:
                        print(
                            f"⚠️ Missing timestamp/close arrays in candles data for {ticker}"
                        )
                    else:
                        # Use the last index as the "latest" candle
                        idx = len(timestamps) - 1

                        try:
                            latest_open = float(opens[idx]) if len(opens) > idx else 0.0
                            latest_high = float(highs[idx]) if len(highs) > idx else 0.0
                            latest_low = float(lows[idx]) if len(lows) > idx else 0.0
                            latest_close = float(closes[idx])
                            latest_volume = (
                                float(volumes[idx]) if len(volumes) > idx else 0.0
                            )
                            latest_ts = int(timestamps[idx])
                        except (ValueError, TypeError, IndexError) as parse_err:
                            print(
                                f"❌ Error parsing latest candle values for {ticker}: {parse_err}"
                            )
                        else:
                            # Upsert single LatestCandle document per (ticker, resolution)
                            existing = await LatestCandle.find_one(
                                LatestCandle.ticker == ticker,
                                LatestCandle.resolution == resolution,
                            )

                            if existing:
                                print(
                                    f"🔄 Updating existing LatestCandle for {ticker} "
                                    f"(resolution={resolution})"
                                )
                                existing.open = latest_open
                                existing.high = latest_high
                                existing.low = latest_low
                                existing.close = latest_close
                                existing.volume = latest_volume
                                existing.timestamp = latest_ts
                                existing.updated_at = datetime.utcnow()
                                await existing.save()
                                record_id = str(existing.id)
                            else:
                                print(
                                    f"🆕 Creating new LatestCandle for {ticker} "
                                    f"(resolution={resolution})"
                                )
                                doc = LatestCandle(
                                    ticker=ticker,
                                    resolution=resolution,
                                    open=latest_open,
                                    high=latest_high,
                                    low=latest_low,
                                    close=latest_close,
                                    volume=latest_volume,
                                    timestamp=latest_ts,
                                )
                                await doc.insert()
                                record_id = str(doc.id)

                            print(
                                f"✅ Saved latest candle for {ticker} at t={latest_ts} "
                                f"(open={latest_open}, high={latest_high}, "
                                f"low={latest_low}, close={latest_close}, "
                                f"volume={latest_volume})"
                            )

            except Exception as db_error:  # noqa: BLE001
                print(
                    f"❌ Error saving stock candles to database for {ticker}: {db_error}"
                )
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
    except Exception as e:  # noqa: BLE001
        print(f"❌ Error in stock candles controller for {ticker}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching stock candles from Finnhub: {e}",
        )

