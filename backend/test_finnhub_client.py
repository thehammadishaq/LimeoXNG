"""
Test Finnhub API using official Python client
"""
try:
    import finnhub
except ImportError:
    print("❌ finnhub library not installed!")
    print("Please install: pip install finnhub-python")
    exit(1)

from config.settings import settings
import os

# Get API key
api_key = settings.FINNHUB_API_KEY if hasattr(settings, 'FINNHUB_API_KEY') else os.getenv("FINNHUB_API_KEY")

print("=" * 60)
print("FINNHUB API CLIENT TEST")
print("=" * 60)
print(f"\nAPI Key: {api_key[:10]}...{api_key[-10:] if api_key and len(api_key) > 20 else 'N/A'}")
print(f"Length: {len(api_key) if api_key else 0}")

if not api_key:
    print("\n❌ API Key not found!")
    exit(1)

try:
    # Initialize Finnhub client
    print("\n" + "=" * 60)
    print("Initializing Finnhub Client...")
    print("=" * 60)
    finnhub_client = finnhub.Client(api_key=api_key)
    print("✅ Client initialized successfully")
    
    # Test financials endpoint
    print("\n" + "=" * 60)
    print("Testing financials(symbol='AAPL', statement='bs', freq='annual')")
    print("=" * 60)
    try:
        financials = finnhub_client.financials('AAPL', 'bs', 'annual')
        print("✅ SUCCESS: financials endpoint works!")
        print(f"\nFinancials Data Type: {type(financials)}")
        if isinstance(financials, dict):
            print(f"Financials Data Keys: {list(financials.keys())}")
            print(f"\nSample Data (first 10 keys):")
            for i, key in enumerate(list(financials.keys())[:10]):
                value = financials[key]
                if isinstance(value, str) and len(value) > 50:
                    value = value[:50] + "..."
                elif isinstance(value, (list, dict)):
                    value = f"{type(value).__name__} with {len(value)} items"
                print(f"  {key}: {value}")
        else:
            print(f"Financials: {financials}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
    
    # Test company_profile (Premium endpoint) for comparison
    print("\n" + "=" * 60)
    print("Testing company_profile(symbol='AAPL') - Premium Endpoint (for comparison)")
    print("=" * 60)
    try:
        profile = finnhub_client.company_profile(symbol='AAPL')
        print("✅ SUCCESS: API key has Premium access!")
        print(f"\nProfile Data Type: {type(profile)}")
        if isinstance(profile, dict):
            print(f"Profile Data Keys: {list(profile.keys())}")
        else:
            print(f"Profile: {profile}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        print(f"Error type: {type(e).__name__}")
    
    # Test quote (Free endpoint) for comparison
    print("\n" + "=" * 60)
    print("Testing quote(symbol='AAPL') - Free Endpoint (for comparison)")
    print("=" * 60)
    try:
        quote = finnhub_client.quote(symbol='AAPL')
        print("✅ Free endpoint works - API key is valid")
        print(f"Quote: {quote}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

