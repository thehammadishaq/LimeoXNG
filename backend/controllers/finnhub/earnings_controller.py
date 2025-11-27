from fastapi import HTTPException, status
from typing import Optional, Dict, Any, List

from services.finnhub.earnings_service import get_earnings_history
from models.finnhub.earnings import EarningsFetchResponse, EarningsItem
from schemas.earnings import EarningsCreate, EarningsUpdate
from services.earnings_service import EarningsService


class EarningsController:
    """Controller for Earnings Surprises operations."""

    async def fetch_earnings_history(
        self, ticker: str, limit: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch earnings surprises history from Finnhub.
        """
        try:
            data = await get_earnings_history(ticker.upper(), limit)
            return data
        except Exception as e:
            print(f"❌ Error fetching earnings history from Finnhub: {e}")
            return None


async def fetch_earnings_get(
    ticker: str, limit: Optional[int] = None, save_to_db: bool = True
):
    """
    GET handler for /finnhub/earnings/{ticker}
    """
    ticker = ticker.upper()

    print(
        f"Received request to fetch earnings surprises for {ticker} from Finnhub (GET), limit={limit}"
    )

    try:
        controller = EarningsController()
        data = await controller.fetch_earnings_history(ticker, limit)

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No earnings surprises data found for {ticker} from Finnhub.",
            )

        record_id: Optional[str] = None
        print(f"💾 save_to_db parameter: {save_to_db}")
        if save_to_db:
            print(
                f"💾 Attempting to save earnings history for {ticker} to database..."
            )
            try:
                # Extract actual earnings data from wrapper:
                # { "earnings": [...], "_metadata": {...} }
                earnings_list: List[Dict[str, Any]] = []
                if isinstance(data, Dict) and "earnings" in data:
                    earnings_list = data["earnings"]  # type: ignore[index]
                elif isinstance(data, Dict):
                    raw = data.get("data")
                    if isinstance(raw, list):
                        earnings_list = raw

                if not earnings_list:
                    print(f"⚠️ No earnings data extracted for {ticker}")
                    earnings_list = []

                print(
                    f"📦 Extracted earnings entries: {len(earnings_list)} for {ticker}"
                )

                earnings_service = EarningsService()
                existing_record = await earnings_service.get_by_ticker(ticker)
                print(
                    f"🔍 Existing earnings history check for {ticker}: "
                    f"{'Found' if existing_record else 'Not found'}"
                )

                if existing_record:
                    print(
                        f"📝 Updating existing earnings history for {ticker} with new data..."
                    )
                    updated_record = await earnings_service.update_record(
                        str(existing_record.id),
                        EarningsUpdate(data=earnings_list),
                    )
                    record_id = str(updated_record.id) if updated_record else None
                    print(
                        f"✅ Updated existing earnings history for {ticker} in DB: {record_id}"
                    )
                else:
                    print(
                        f"📝 Creating new earnings history record for {ticker}..."
                    )
                    new_record = await earnings_service.create_record(
                        EarningsCreate(ticker=ticker, data=earnings_list)
                    )
                    record_id = str(new_record.id) if new_record else None
                    print(
                        f"✅ Created new earnings history record for {ticker} in DB: {record_id}"
                    )
            except Exception as db_error:
                print(
                    f"❌ Error saving earnings history to database for {ticker}: {db_error}"
                )
                print(f"   Error type: {type(db_error).__name__}")
                import traceback

                print(f"   Traceback: {traceback.format_exc()}")
        else:
            print(f"⏭️ Skipping database save for {ticker} (save_to_db=False)")

        # Map raw dicts from Finnhub into EarningsItem models
        earnings_list_raw: List[Dict[str, Any]] = []
        if isinstance(data, Dict) and "earnings" in data:
            earnings_list_raw = data["earnings"]  # type: ignore[index]
        elif isinstance(data, list):
            earnings_list_raw = data  # type: ignore[assignment]

        earnings_models: List[EarningsItem] = [
            EarningsItem(**item) for item in earnings_list_raw
        ]

        # Optional: sort by period descending (latest first)
        earnings_models_sorted = sorted(
            earnings_models,
            key=lambda x: (x.year or 0, x.quarter or 0, x.period or ""),
            reverse=True,
        )

        return EarningsFetchResponse(
            ticker=ticker,
            limit=limit,
            data=earnings_models_sorted,
            saved_to_db=save_to_db,
            record_id=record_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in earnings history controller for {ticker}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching earnings history from Finnhub: {e}",
        )




