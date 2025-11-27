from fastapi import HTTPException, status
from typing import Optional, Dict, Any, List

from services.finnhub.recommendation_service import get_recommendation_trends
from models.finnhub.recommendation import (
    RecommendationFetchResponse,
    RecommendationTrend,
)
from schemas.recommendation import RecommendationCreate, RecommendationUpdate
from services.recommendation_service import RecommendationService


class RecommendationController:
    """Controller for Recommendation Trends operations."""

    async def fetch_recommendation_trends(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Fetch recommendation trends from Finnhub.
        """
        try:
            data = await get_recommendation_trends(ticker.upper())
            return data
        except Exception as e:
            print(f"❌ Error fetching recommendation trends from Finnhub: {e}")
            return None


async def fetch_recommendation_get(ticker: str, save_to_db: bool = True):
    """
    GET handler for /finnhub/recommendation/{ticker}
    """
    ticker = ticker.upper()

    print(
        f"Received request to fetch recommendation trends for {ticker} from Finnhub (GET)"
    )

    try:
        controller = RecommendationController()
        data = await controller.fetch_recommendation_trends(ticker)

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No recommendation trends data found for {ticker} from Finnhub.",
            )

        record_id: Optional[str] = None
        print(f"💾 save_to_db parameter: {save_to_db}")
        if save_to_db:
            print(
                f"💾 Attempting to save recommendation trends for {ticker} to database..."
            )
            try:
                # Extract actual recommendation data from wrapper:
                # { "recommendation_trends": [...], "_metadata": {...} }
                rec_data: List[Dict[str, Any]] = []
                if isinstance(data, dict):
                    if "recommendation_trends" in data:
                        rec_data = data["recommendation_trends"]
                    else:
                        # Fallback: if wrapper key missing, treat rest as raw list
                        raw = data.get("data")
                        if isinstance(raw, list):
                            rec_data = raw

                if not rec_data:
                    print(f"⚠️ No recommendation trends data extracted for {ticker}")
                    rec_data = []

                print(
                    f"📦 Extracted recommendation trends entries: {len(rec_data)} for {ticker}"
                )

                rec_service = RecommendationService()
                existing_record = await rec_service.get_by_ticker(ticker)
                print(
                    f"🔍 Existing recommendation trends check for {ticker}: {'Found' if existing_record else 'Not found'}"
                )

                if existing_record:
                    print(
                        f"📝 Updating existing recommendation trends for {ticker} with new data..."
                    )
                    updated_record = await rec_service.update_record(
                        str(existing_record.id),
                        RecommendationUpdate(data=rec_data),
                    )
                    record_id = str(updated_record.id) if updated_record else None
                    print(
                        f"✅ Updated existing recommendation trends for {ticker} in DB: {record_id}"
                    )
                else:
                    print(
                        f"📝 Creating new recommendation trends record for {ticker}..."
                    )
                    new_record = await rec_service.create_record(
                        RecommendationCreate(ticker=ticker, data=rec_data)
                    )
                    record_id = str(new_record.id) if new_record else None
                    print(
                        f"✅ Created new recommendation trends record for {ticker} in DB: {record_id}"
                    )
            except Exception as db_error:
                print(
                    f"❌ Error saving recommendation trends to database for {ticker}: {db_error}"
                )
                print(f"   Error type: {type(db_error).__name__}")
                import traceback

                print(f"   Traceback: {traceback.format_exc()}")
        else:
            print(f"⏭️ Skipping database save for {ticker} (save_to_db=False)")

        # Map raw dicts from Finnhub into RecommendationTrend models
        rec_list_raw: List[Dict[str, Any]] = []
        if isinstance(data, dict) and "recommendation_trends" in data:
            rec_list_raw = data["recommendation_trends"]
        elif isinstance(data, list):
            rec_list_raw = data

        rec_models: List[RecommendationTrend] = [
            RecommendationTrend(**item) for item in rec_list_raw
        ]

        return RecommendationFetchResponse(
            ticker=ticker,
            data=rec_models,
            saved_to_db=save_to_db,
            record_id=record_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in recommendation trends controller for {ticker}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recommendation trends from Finnhub: {e}",
        )




