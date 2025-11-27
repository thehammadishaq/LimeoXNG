from fastapi import HTTPException, status
from typing import Optional, Dict, Any, List

from services.finnhub.pattern_service import get_pattern_scan
from models.finnhub.pattern import PatternScanFetchResponse, PatternPoint
from schemas.pattern import PatternScanCreate, PatternScanUpdate
from services.pattern_service import PatternScanService


class PatternScanController:
    """Controller for Pattern Recognition scan operations."""

    async def fetch_pattern_scan(
        self, ticker: str, resolution: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch pattern recognition scan from Finnhub.
        """
        try:
            data = await get_pattern_scan(ticker.upper(), resolution)
            return data
        except Exception as e:
            print(f"❌ Error fetching pattern scan from Finnhub: {e}")
            return None


async def fetch_pattern_get(
    ticker: str, resolution: str, save_to_db: bool = True
):
    """
    GET handler for /finnhub/pattern/{ticker}
    """
    ticker = ticker.upper()

    print(
        f"Received request to fetch pattern recognition scan for {ticker} from Finnhub (GET), resolution={resolution}"
    )

    try:
        controller = PatternScanController()
        data = await controller.fetch_pattern_scan(ticker, resolution)

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No pattern recognition data found for {ticker} from Finnhub.",
            )

        record_id: Optional[str] = None
        print(f"💾 save_to_db parameter: {save_to_db}")
        if save_to_db:
            print(
                f"💾 Attempting to save pattern recognition scan for {ticker} to database..."
            )
            try:
                # Extract actual pattern scan data from wrapper:
                # { "pattern_scan": {...}, "_metadata": {...} }
                scan_data: Dict[str, Any] = {}
                if isinstance(data, dict):
                    if "pattern_scan" in data:
                        scan_data = data["pattern_scan"]
                    else:
                        scan_data = {k: v for k, v in data.items() if k != "_metadata"}

                if not scan_data:
                    print(f"⚠️ No pattern scan data extracted for {ticker}")
                    scan_data = {}

                print(
                    f"📦 Extracted pattern scan data keys: {list(scan_data.keys())[:10]}"
                )

                pattern_service = PatternScanService()
                existing_record = await pattern_service.get_by_ticker_and_resolution(
                    ticker, resolution
                )
                print(
                    f"🔍 Existing pattern scan check for {ticker} ({resolution}): "
                    f"{'Found' if existing_record else 'Not found'}"
                )

                if existing_record:
                    print(
                        f"📝 Updating existing pattern scan for {ticker} ({resolution}) with new data..."
                    )
                    updated_record = await pattern_service.update_record(
                        str(existing_record.id),
                        PatternScanUpdate(data=scan_data),
                    )
                    record_id = str(updated_record.id) if updated_record else None
                    print(
                        f"✅ Updated existing pattern scan for {ticker} in DB: {record_id}"
                    )
                else:
                    print(
                        f"📝 Creating new pattern scan record for {ticker} ({resolution})..."
                    )
                    new_record = await pattern_service.create_record(
                        PatternScanCreate(
                            ticker=ticker, resolution=resolution, data=scan_data
                        )
                    )
                    record_id = str(new_record.id) if new_record else None
                    print(
                        f"✅ Created new pattern scan record for {ticker} in DB: {record_id}"
                    )
            except Exception as db_error:
                print(
                    f"❌ Error saving pattern scan to database for {ticker}: {db_error}"
                )
                print(f"   Error type: {type(db_error).__name__}")
                import traceback

                print(f"   Traceback: {traceback.format_exc()}")
        else:
            print(f"⏭️ Skipping database save for {ticker} (save_to_db=False)")

        # Extract points list and map into PatternPoint models
        points_raw: List[Dict[str, Any]] = []
        if isinstance(data, dict):
            scan_payload = data.get("pattern_scan")
            if isinstance(scan_payload, dict) and isinstance(
                scan_payload.get("points"), list
            ):
                points_raw = scan_payload["points"]

        pattern_points: List[PatternPoint] = [
            PatternPoint(**item) for item in points_raw
        ]

        return PatternScanFetchResponse(
            ticker=ticker,
            resolution=resolution,
            data=pattern_points,
            saved_to_db=save_to_db,
            record_id=record_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in pattern scan controller for {ticker}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching pattern recognition data from Finnhub: {e}",
        )




