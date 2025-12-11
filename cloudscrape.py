try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    import requests
    HAS_CLOUDSCRAPER = False
    print("⚠️  'cloudscraper' not installed. Installing it will help bypass Cloudflare protection.")
    print("   Run: pip install cloudscraper")
import json

# TipRanks API endpoint
TIPRANKS_API_URL = "https://www.tipranks.com/api/experts/getStocks"

# Headers to mimic browser request - updated for API calls
HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Origin': 'https://www.tipranks.com',
    'Referer': 'https://www.tipranks.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Query parameters
PARAMS = {
    'benchmark': 'none',
    'period': 'year',
    'name': 'heiko-ihle'
}

# Optional: Add cookies from Postman/browser if needed
# To get cookies from Postman:
#   1. In Postman, go to the request that works
#   2. Click on "Cookies" link below the address bar
#   3. Copy the cookie values and add them here
# Format: 'cookie_name': 'cookie_value'
# Example: {'session_id': 'abc123', 'auth_token': 'xyz789'}
COOKIES = {}


def fetch_tipranks_data():
    """
    Fetches JSON data from TipRanks API endpoint.
    Uses cloudscraper to bypass Cloudflare protection if available.
    Returns the JSON response as a dictionary, or None if error occurs.
    """
    print(f"-> Fetching data from TipRanks API...")
    print(f"-> URL: {TIPRANKS_API_URL}")
    print(f"-> Parameters: {PARAMS}")
    print("-" * 70)
    
    # Use cloudscraper if available (bypasses Cloudflare), otherwise use requests
    if HAS_CLOUDSCRAPER:
        print("-> Using cloudscraper to bypass Cloudflare protection...")
        session = cloudscraper.create_scraper()
    else:
        print("-> Using requests (may fail with Cloudflare protection)...")
        session = requests.Session()
    
    session.headers.update(HEADERS)
    
    # Add cookies if provided
    if COOKIES:
        session.cookies.update(COOKIES)
        print(f"-> Using {len(COOKIES)} custom cookie(s)")
    
    try:
        # First, visit the main page to get cookies (helps with Cloudflare)
        print("-> Step 1: Getting session cookies...")
        session.get('https://www.tipranks.com/', timeout=15)
        
        # Now make the API request
        print("-> Step 2: Making API request...")
        response = session.get(TIPRANKS_API_URL, params=PARAMS, timeout=15)
        
        # Check response
        print(f"-> Status Code: {response.status_code}")
        
        if response.status_code == 403:
            print("⚠️  Got 403 Forbidden. Cloudflare is still blocking the request.")
            if not HAS_CLOUDSCRAPER:
                print("\n💡 Try installing cloudscraper:")
                print("   pip install cloudscraper")
            else:
                print("\n💡 Cloudflare protection is active. You may need to:")
                print("   1. Copy cookies from your browser/Postman and add them to the COOKIES dict")
                print("   2. Wait a moment and try again (Cloudflare may need time)")
            return None
        
        response.raise_for_status()
        
        # Parse JSON response
        data = response.json()
        
        print(f"✅ Successfully fetched data!")
        print(f"-> Response Size: {len(response.content)} bytes")
        print("-" * 70)
        
        return data
        
    except Exception as e:
        error_type = type(e).__name__
        print(f"❌ ERROR ({error_type}): {e}")
        
        if hasattr(e, 'response') and e.response is not None:
            print(f"-> Status Code: {e.response.status_code}")
            print(f"-> Response preview: {e.response.text[:500]}")
        
        if not HAS_CLOUDSCRAPER:
            print("\n💡 Tip: Install cloudscraper to bypass Cloudflare:")
            print("   pip install cloudscraper")
        
        return None


def display_data(data):
    """
    Displays the fetched JSON data in a readable format.
    """
    if data is None:
        print("No data to display.")
        return
    
    print("\n" + "#" * 70)
    print("  📊 TIPRANKS API RESPONSE DATA")
    print("#" * 70)
    
    # Pretty print the JSON
    print(json.dumps(data, indent=2, ensure_ascii=False))
    
    print("\n" + "#" * 70)


def main():
    """
    Main function to fetch and display TipRanks data.
    """
    data = fetch_tipranks_data()
    display_data(data)
    
    # Optionally save to file
    if data:
        output_file = 'tipranks_data.json'
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Data saved to: {output_file}")
        except Exception as e:
            print(f"\n⚠️  Could not save to file: {e}")


if __name__ == "__main__":
    main()