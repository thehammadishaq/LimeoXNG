"""
Quick script to check MongoDB data for finnhub-profile2
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.company_profile import CompanyProfile
from config.settings import settings
import json

async def check_mongodb_data():
    """Check MongoDB for saved profile data"""
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000
        )
        
        # Initialize Beanie
        await init_beanie(
            database=client[settings.DATABASE_NAME],
            document_models=[CompanyProfile]
        )
        
        print("=" * 80)
        print("MONGODB DATA CHECK")
        print("=" * 80)
        print(f"\nDatabase: {settings.DATABASE_NAME}")
        print(f"Collection: finnhub-profile2")
        print(f"Connection: {settings.MONGODB_URL}")
        
        # Get all profiles
        all_profiles = await CompanyProfile.find_all().to_list()
        
        print(f"\n📊 Total documents found: {len(all_profiles)}")
        
        if len(all_profiles) == 0:
            print("\n⚠️ No documents found in collection!")
            print("\n💡 Check:")
            print("   1. Is MongoDB running?")
            print("   2. Is the database name correct?")
            print("   3. Is the collection name 'company_profiles'?")
            return
        
        # Check for profile data (direct fields)
        print("\n" + "=" * 80)
        print("CHECKING PROFILE DATA")
        print("=" * 80)
        
        for profile in all_profiles:
            print(f"\n✅ Found profile data for: {profile.ticker}")
            print(f"   Document ID: {profile.id}")
            print(f"   Created: {profile.created_at}")
            print(f"   Updated: {profile.updated_at}")
            if profile.data:
                print(f"   Data keys: {list(profile.data.keys())[:15]}")
                # Show sample fields
                if "name" in profile.data:
                    print(f"   Name: {profile.data.get('name', 'N/A')}")
                if "ticker" in profile.data:
                    print(f"   Ticker: {profile.data.get('ticker', 'N/A')}")
                if "country" in profile.data:
                    print(f"   Country: {profile.data.get('country', 'N/A')}")
                if "currency" in profile.data:
                    print(f"   Currency: {profile.data.get('currency', 'N/A')}")
                if "exchange" in profile.data:
                    print(f"   Exchange: {profile.data.get('exchange', 'N/A')}")
        
        print(f"\n📈 Summary:")
        print(f"   Total profiles: {len(all_profiles)}")
        
        # Show all tickers
        print(f"\n📋 All tickers in database:")
        for profile in all_profiles:
            if profile.data:
                sample_keys = list(profile.data.keys())[:10]
                print(f"   {profile.ticker}: {len(profile.data)} fields - {sample_keys}")
            else:
                print(f"   {profile.ticker}: No data")
        
        # Check specific tickers
        test_tickers = ["AAPL", "GOOGL", "MSFT", "NVDA", "AMZN"]
        print(f"\n" + "=" * 80)
        print("CHECKING SPECIFIC TICKERS")
        print("=" * 80)
        
        for ticker in test_tickers:
            profile = await CompanyProfile.find_one(CompanyProfile.ticker == ticker.upper())
            if profile:
                has_data = profile.data and len(profile.data) > 0
                print(f"   {ticker}: {'✅ Has data' if has_data else '❌ No data'}")
                if profile.data:
                    print(f"      Fields: {list(profile.data.keys())[:10]}")
                    if "name" in profile.data:
                        print(f"      Name: {profile.data.get('name')}")
            else:
                print(f"   {ticker}: ❌ Not found")
        
        client.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_mongodb_data())

