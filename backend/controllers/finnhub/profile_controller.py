from fastapi import HTTPException, status
from typing import Optional, Dict, Any
from services.finnhub.profile_service import get_company_profile
from models.finnhub.profile import ProfileFetchRequest, ProfileFetchResponse
from schemas.company_profile import CompanyProfileCreate, CompanyProfileUpdate
from services.company_profile_service import CompanyProfileService


class ProfileController:
    """Controller for Company Profile operations"""

    async def fetch_profile(self, ticker: str) -> Optional[Dict]:
        """
        Fetch company profile from Finnhub
        """
        try:
            data = await get_company_profile(ticker.upper())
            return data
        except Exception as e:
            print(f"❌ Error fetching profile from Finnhub: {e}")
            return None


async def fetch_profile_get(ticker: str, save_to_db: bool = True):
    ticker = ticker.upper()

    print(f"Received request to fetch profile for {ticker} from Finnhub (GET)")

    try:
        controller = ProfileController()
        data = await controller.fetch_profile(ticker)

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No profile data found for {ticker} from Finnhub."
            )

        profile_id = None
        print(f"💾 save_to_db parameter: {save_to_db}")
        if save_to_db:
            print(f"💾 Attempting to save profile for {ticker} to database...")
            try:
                # Extract actual profile data from nested structure
                # data structure: {"Company Profile": {...}, "_metadata": {...}}
                profile_data = {}
                if isinstance(data, dict):
                    # Get the actual profile data from "Company Profile" key
                    if "Company Profile" in data:
                        profile_data = data["Company Profile"]
                    elif isinstance(data, dict) and "ticker" in data:
                        # If data is already flat, use it directly
                        profile_data = data
                
                # If profile_data is empty, try to use data directly
                if not profile_data and isinstance(data, dict):
                    # Remove metadata and use rest as profile data
                    profile_data = {k: v for k, v in data.items() if k != "_metadata"}
                
                if not profile_data:
                    print(f"⚠️ No profile data extracted for {ticker}")
                    profile_data = {}
                
                print(f"📦 Extracted profile data keys: {list(profile_data.keys())[:10]}")
                
                company_profile_service = CompanyProfileService()
                existing_profile = await company_profile_service.get_by_ticker(ticker)
                print(f"🔍 Existing profile check for {ticker}: {'Found' if existing_profile else 'Not found'}")

                if existing_profile:
                    # Update existing profile - directly save profile fields
                    print(f"📝 Updating existing profile for {ticker} with profile data...")
                    updated_profile = await company_profile_service.update_profile(
                        str(existing_profile.id),
                        CompanyProfileUpdate(data=profile_data)
                    )
                    profile_id = str(updated_profile.id) if updated_profile else None
                    print(f"✅ Updated existing profile for {ticker} in DB: {profile_id}")
                else:
                    # Create new profile with direct profile data
                    print(f"📝 Creating new profile for {ticker} with profile data...")
                    new_profile = await company_profile_service.create_profile(
                        CompanyProfileCreate(ticker=ticker, data=profile_data)
                    )
                    profile_id = str(new_profile.id) if new_profile else None
                    print(f"✅ Created new profile for {ticker} in DB: {profile_id}")
            except Exception as db_error:
                print(f"❌ Error saving to database for {ticker}: {db_error}")
                print(f"   Error type: {type(db_error).__name__}")
                import traceback
                print(f"   Traceback: {traceback.format_exc()}")
        else:
            print(f"⏭️ Skipping database save for {ticker} (save_to_db=False)")

        return ProfileFetchResponse(
            ticker=ticker,
            data=data,
            saved_to_db=save_to_db,
            profile_id=profile_id
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching profile from Finnhub: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching profile from Finnhub: {e}"
        )

