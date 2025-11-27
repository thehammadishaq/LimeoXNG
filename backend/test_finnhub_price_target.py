"""
Test Finnhub Price Target API using direct HTTP requests (no library)
Focused test for Premium endpoint: /stock/price-target
"""
import requests
import json
from datetime import datetime

# NOTE:
# For this direct test we hard‑code the Finnhub API key here,
# similar to test_finnhub_direct_api.py, and we do NOT import from settings.
FINNHUB_API_KEY = "d4gjo9hr01qm5b35u86gd4gjo9hr01qm5b35u870"

BASE_URL = "https://finnhub.io/api/v1"

print("=" * 80)
print("FINNHUB PRICE TARGET API DIRECT TEST (Premium)")
print("=" * 80)
print(f"\nAPI Key: {FINNHUB_API_KEY[:10]}...{FINNHUB_API_KEY[-10:]}")
print(f"Length: {len(FINNHUB_API_KEY)}")
print(f"Base URL: {BASE_URL}")


def test_endpoint(endpoint_name: str, endpoint_path: str, params=None, is_premium: bool = True):
    """
    Test a Finnhub API endpoint (single call helper)
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
                    print(f"\nSample Data:")
                    sample = {}
                    for key in [
                        "symbol",
                        "lastUpdated",
                        "numberAnalysts",
                        "targetHigh",
                        "targetLow",
                        "targetMean",
                        "targetMedian",
                    ]:
                        if key in data:
                            sample[key] = data[key]
                    print(json.dumps(sample, indent=2))
                else:
                    print(f"Response: {str(data)[:400]}")
            except Exception:
                print(f"Response (text): {response.text[:500]}")
        else:
            print("❌ FAILED!")
            try:
                error_data = response.json()
                print(f"Error Response: {json.dumps(error_data, indent=2)}")
            except Exception:
                print(f"Error Response (text): {response.text[:500]}")

            if response.status_code == 401:
                print("\n💡 Status 401: Invalid API key or authentication failed")
            elif response.status_code == 403:
                print("\n💡 Status 403: Forbidden - Access denied")
                if is_premium:
                    print("   This endpoint requires Premium subscription")
                    print("   Your API key may not have Premium access for /stock/price-target")
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


print("\n\n" + "=" * 80)
print("PRICE TARGET PREMIUM ENDPOINT")
print("=" * 80)

# Example tests for a couple of symbols (adjust as needed)
test_endpoint(
    "Price Target Consensus - AAPL",
    "/stock/price-target",
    params={"symbol": "AAPL"},
    is_premium=True,
)

test_endpoint(
    "Price Target Consensus - NFLX",
    "/stock/price-target",
    params={"symbol": "NFLX"},
    is_premium=True,
)

test_endpoint(
    "Price Target Consensus - DIS",
    "/stock/price-target",
    params={"symbol": "DIS"},
    is_premium=True,
)

print("\n\n" + "=" * 80)
print("PRICE TARGET TEST SUMMARY")
print("=" * 80)
print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("\nNote: /stock/price-target is a Premium endpoint.")
print("If you see 403 errors, your API key may need Premium access for this endpoint.")



