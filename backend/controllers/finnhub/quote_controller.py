from fastapi import HTTPException, status
from typing import Optional, Dict, Any

from services.finnhub.quote_service import get_real_time_quote
from models.finnhub.quote import QuoteFetchResponse


class QuoteController:
    """Controller for real-time quote operations."""

    async def fetch_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Fetch real-time quote from Finnhub."""
        try:
            data = await get_real_time_quote(ticker.upper())
            return data
        except Exception as e:  # noqa: BLE001
            print(f"❌ Error fetching quote from Finnhub: {e}")
            return None


async def fetch_quote_get(ticker: str, save_to_db: bool = False):
    """
    GET handler used by FastAPI route to fetch a real-time quote for a ticker.

    Currently this endpoint does NOT persist quotes to MongoDB; it is read-only.
    """
    ticker = ticker.upper()

    print(f"Received request to fetch real-time quote for {ticker} from Finnhub (GET)")

    try:
        controller = QuoteController()
        data = await controller.fetch_quote(ticker)

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No quote data found for {ticker} from Finnhub.",
            )

        record_id = None

        # For future use: we keep save_to_db flag but do not persist yet
        if save_to_db:
            print(
                "💡 save_to_db=True requested for quote endpoint, "
                "but quote persistence is not implemented yet. Skipping DB save."
            )

        return QuoteFetchResponse(
            ticker=ticker,
            data=data,
            saved_to_db=save_to_db,
            record_id=record_id,
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        print(f"❌ Error in quote controller for {ticker}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching real-time quote from Finnhub: {e}",
        )



