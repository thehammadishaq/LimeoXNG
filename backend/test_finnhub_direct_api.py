"""
Test Finnhub API using direct HTTP requests (no library)
Tests both Premium and Free tier endpoints
"""
import requests
import json
from datetime import datetime

# API Key 
USER_API_KEY = "d4g9r7hr01qm5b34jp00d4g9r7hr01qm5b34jp0g"
FINNHUB_API_KEY = USER_API_KEY

if not FINNHUB_API_KEY:
    print("❌ ERROR: No API key provided!")
    exit(1)

BASE_URL = "https://finnhub.io/api/v1"

print("=" * 80)
print("FINNHUB API DIRECT TEST (No Library)")
print("=" * 80)
print(f"\nAPI Key: {FINNHUB_API_KEY[:10]}...{FINNHUB_API_KEY[-10:]}")
print(f"Length: {len(FINNHUB_API_KEY)}")
print(f"Base URL: {BASE_URL}")

def test_endpoint(endpoint_name, endpoint_path, params=None, is_premium=False):
    """
    Test a Finnhub API endpoint
    """
    url = f"{BASE_URL}{endpoint_path}"
    if params is None:
        params = {}
    params["token"] = FINNHUB_API_KEY
    
    print("\n" + "=" * 80)
    print(f"Testing: {endpoint_name}")
    print(f"Endpoint: {endpoint_path}")
    print(f"Type: {'PREMIUM' if is_premium else 'FREE'}")
    print("=" * 80)
    print(f"URL: {url}")
    print(f"Params: {json.dumps({k: v for k, v in params.items() if k != 'token'}, indent=2)}")
    
    try:
        response = requests.get(url, params=params, timeout=10)
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Status Text: {response.reason}")
        
        if response.status_code == 200:
            print("✅ SUCCESS!")
            try:
                data = response.json()
                print(f"Response Type: {type(data)}")
                
                if isinstance(data, dict):
                    print(f"Response Keys: {list(data.keys())[:10]}")
                    print(f"\nSample Data (first 5 keys):")
                    for i, key in enumerate(list(data.keys())[:5]):
                        value = data[key]
                        if isinstance(value, str) and len(value) > 60:
                            value = value[:60] + "..."
                        elif isinstance(value, (list, dict)):
                            value = f"{type(value).__name__} with {len(value)} items"
                        print(f"  {key}: {value}")
                elif isinstance(data, list):
                    print(f"Response: List with {len(data)} items")
                    if len(data) > 0:
                        print(f"First item: {data[0]}")
                else:
                    print(f"Response: {str(data)[:200]}")
            except:
                print(f"Response (text): {response.text[:500]}")
        else:
            print("❌ FAILED!")
            try:
                error_data = response.json()
                print(f"Error Response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error Response (text): {response.text[:500]}")
            
            if response.status_code == 401:
                print("\n💡 Status 401: Invalid API key or authentication failed")
            elif response.status_code == 403:
                print("\n💡 Status 403: Forbidden - Access denied")
                if is_premium:
                    print("   This endpoint requires Premium subscription")
                    print("   Your API key does not have Premium access")
            elif response.status_code == 429:
                print("\n💡 Status 429: Rate limit exceeded")
            elif response.status_code == 404:
                print("\n💡 Status 404: Endpoint not found or invalid symbol")
        
        return response.status_code == 200, response
        
    except requests.exceptions.Timeout:
        print("❌ ERROR: Request timeout")
        return False, None
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: {e}")
        return False, None
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
        return False, None

# Test FREE Tier Endpoints
print("\n\n" + "=" * 80)
print("FREE TIER ENDPOINTS")
print("=" * 80)

# 1. Quote (Free)
test_endpoint(
    "Quote - Real-time quote",
    "/quote",
    params={"symbol": "AAPL"},
    is_premium=False
)

# 2. Company News (Free)
test_endpoint(
    "Company News",
    "/company-news",
    params={"symbol": "AAPL", "from": "2025-01-01", "to": "2025-01-20"},
    is_premium=False
)

# 3. Stock Candle (Free)
test_endpoint(
    "Stock Candle",
    "/stock/candle",
    params={"symbol": "AAPL", "resolution": "D", "from": 1735689600, "to": 1735776000},
    is_premium=False
)

# 4. Stock Recommendation (Free)
test_endpoint(
    "Stock Recommendation",
    "/stock/recommendation",
    params={"symbol": "AAPL"},
    is_premium=False
)

# 5. Stock Peers (Free)
test_endpoint(
    "Stock Peers",
    "/stock/peers",
    params={"symbol": "AAPL"},
    is_premium=False
)

# 6. Basic Financials (Free - limited)
test_endpoint(
    "Basic Financials",
    "/stock/metric",
    params={"symbol": "AAPL", "metric": "all"},
    is_premium=False
)

# Test PREMIUM Tier Endpoints
print("\n\n" + "=" * 80)
print("PREMIUM TIER ENDPOINTS")
print("=" * 80)

# 1. Company Profile (Premium)
test_endpoint(
    "Company Profile",
    "/stock/profile2",
    params={"symbol": "AAPL"},
    is_premium=True
)

# 2. Financials (Premium)
test_endpoint(
    "Financials - Balance Sheet",
    "/stock/financials",
    params={"symbol": "AAPL", "statement": "bs", "freq": "annual"},
    is_premium=True
)

# 3. Company Profile 2 (Premium - alternative)
test_endpoint(
    "Company Profile 2",
    "/stock/profile2",
    params={"symbol": "AAPL"},
    is_premium=True
)

# Summary
print("\n\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("\nNote: Premium endpoints require a Premium subscription.")
print("If you see 403 errors for Premium endpoints, your API key needs Premium access.")

