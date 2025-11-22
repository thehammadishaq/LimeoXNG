from fastapi import HTTPException, status
from typing import Optional, Dict

from services.finnhub.basic_financials_service import get_basic_financials
from models.finnhub.basic_financials import BasicFinancialsFetchRequest, BasicFinancialsFetchResponse
from schemas.basic_financials import BasicFinancialsCreate, BasicFinancialsUpdate
from services.basic_financials_service import BasicFinancialsService


class BasicFinancialsController:
    """Controller for Basic Financials operations."""

    async def fetch_basic_financials(self, ticker: str, metric: str = "all") -> Optional[Dict]:
        """
        Fetch basic financials from Finnhub.
        """
        try:
            data = await get_basic_financials(ticker.upper(), metric)
            return data
        except Exception as e:
            print(f"❌ Error fetching basic financials from Finnhub: {e}")
            return None


async def fetch_basic_financials_get(ticker: str, metric: str = "all", save_to_db: bool = True):
    ticker = ticker.upper()

    print(f"Received request to fetch basic financials for {ticker} from Finnhub (GET), metric={metric}")

    try:
        controller = BasicFinancialsController()
        data = await controller.fetch_basic_financials(ticker, metric)

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No basic financials data found for {ticker} from Finnhub.",
            )

        record_id = None
        print(f"💾 save_to_db parameter: {save_to_db}")
        if save_to_db:
            print(f"💾 Attempting to save basic financials for {ticker} to database...")
            try:
                # Extract actual basic financials data from wrapper structure:
                # { "basic_financials": {...}, "_metadata": {...} }
                financials_data = {}
                if isinstance(data, dict):
                    if "basic_financials" in data:
                        financials_data = data["basic_financials"]
                    else:
                        financials_data = {k: v for k, v in data.items() if k != "_metadata"}

                if not financials_data:
                    print(f"⚠️ No basic financials data extracted for {ticker}")
                    financials_data = {}

                print(f"📦 Extracted basic financials data keys: {list(financials_data.keys())[:10]}")

                basic_financials_service = BasicFinancialsService()
                existing_record = await basic_financials_service.get_by_ticker(ticker)
                print(f"🔍 Existing basic financials check for {ticker}: {'Found' if existing_record else 'Not found'}")

                if existing_record:
                    print(f"📝 Updating existing basic financials for {ticker} with new data...")
                    updated_record = await basic_financials_service.update_record(
                        str(existing_record.id),
                        BasicFinancialsUpdate(data=financials_data),
                    )
                    record_id = str(updated_record.id) if updated_record else None
                    print(f"✅ Updated existing basic financials for {ticker} in DB: {record_id}")
                else:
                    print(f"📝 Creating new basic financials record for {ticker}...")
                    new_record = await basic_financials_service.create_record(
                        BasicFinancialsCreate(ticker=ticker, data=financials_data)
                    )
                    record_id = str(new_record.id) if new_record else None
                    print(f"✅ Created new basic financials record for {ticker} in DB: {record_id}")
            except Exception as db_error:
                print(f"❌ Error saving basic financials to database for {ticker}: {db_error}")
                print(f"   Error type: {type(db_error).__name__}")
                import traceback

                print(f"   Traceback: {traceback.format_exc()}")
        else:
            print(f"⏭️ Skipping database save for {ticker} (save_to_db=False)")

        return BasicFinancialsFetchResponse(
            ticker=ticker,
            metric=metric,
            data=data,
            saved_to_db=save_to_db,
            record_id=record_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in basic financials controller for {ticker}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching basic financials from Finnhub: {e}",
        )


