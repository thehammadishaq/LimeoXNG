"""
TipRanks Authentication Service

Handles TipRanks login and session management.
- Login with email/password from .env
- Save session cookies to file
- Load session cookies for authenticated requests
"""

import os
import json
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import traceback

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    import requests
    HAS_CLOUDSCRAPER = False
    print("⚠️  'cloudscraper' not installed. Installing it will help bypass Cloudflare protection.")
    print("   Run: pip install cloudscraper")

from config.settings import settings


TIPRANKS_SIGNIN_URL = "https://www.tipranks.com/api/users/signin"
TIPRANKS_BASE_URL = "https://www.tipranks.com"

# Headers for signin request
SIGNIN_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'Origin': 'https://www.tipranks.com',
    'Referer': 'https://www.tipranks.com/sign-in',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Cookies file path
COOKIES_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
    "cookies", 
    "tipranks_cookies.json"
)


def save_cookies_to_file(cookies_dict: Dict[str, Any], domain: str = "www.tipranks.com"):
    """
    Save cookies to JSON file in nested structure.
    
    Args:
        cookies_dict: Dictionary of cookie name: value pairs
        domain: Domain name for cookies
    """
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(COOKIES_FILE), exist_ok=True)
        
        # Load existing cookies if file exists
        cookies_data = {}
        if os.path.exists(COOKIES_FILE):
            try:
                with open(COOKIES_FILE, 'r') as f:
                    cookies_data = json.load(f)
            except:
                cookies_data = {}
        
        # Initialize domain if not exists
        if domain not in cookies_data:
            cookies_data[domain] = {}
        
        # Update cookies for domain
        for cookie_name, cookie_value in cookies_dict.items():
            cookies_data[domain][cookie_name] = {
                "value": cookie_value,
                "domain": "",
                "path": "/",
                "expires": None,
                "secure": False,
                "httponly": False,
                "samesite": ""
            }
        
        # Save to file
        with open(COOKIES_FILE, 'w') as f:
            json.dump(cookies_data, f, indent=2)
        
        print(f"✅ Saved {len(cookies_dict)} cookies to {COOKIES_FILE}")
        return True
        
    except Exception as e:
        print(f"⚠️  Error saving cookies to file: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False


def load_cookies_from_file() -> Dict[str, str]:
    """
    Load cookies from JSON file.
    
    Returns:
        Dictionary of cookie name: value pairs
    """
    cookies_dict = {}
    try:
        if os.path.exists(COOKIES_FILE):
            with open(COOKIES_FILE, 'r') as f:
                cookies_data = json.load(f)
                # Extract cookies from nested structure
                for domain, domain_cookies in cookies_data.items():
                    if isinstance(domain_cookies, dict):
                        for cookie_name, cookie_data in domain_cookies.items():
                            if isinstance(cookie_data, dict) and "value" in cookie_data:
                                cookies_dict[cookie_name] = cookie_data["value"]
            
            if cookies_dict:
                print(f"✅ Loaded {len(cookies_dict)} cookies from {COOKIES_FILE}")
            else:
                print(f"⚠️  No cookies found in {COOKIES_FILE}")
        else:
            print(f"⚠️  Cookies file not found: {COOKIES_FILE}")
    except Exception as e:
        print(f"⚠️  Error loading cookies from file: {e}")
    
    return cookies_dict


async def login_to_tipranks(
    email: Optional[str] = None,
    password: Optional[str] = None,
    save_session: bool = True,
) -> Dict[str, Any]:
    """
    Login to TipRanks and get session cookies.
    
    Args:
        email: TipRanks email (if None, uses TIPRANKS_EMAIL from .env)
        password: TipRanks password (if None, uses TIPRANKS_PASSWORD from .env)
        save_session: Whether to save cookies to file
    
    Returns:
        Dictionary with:
        - success: bool
        - message: str
        - cookies: Dict of cookies
        - response_data: API response data (if successful)
    """
    # Get credentials from parameters or .env
    login_email = email or settings.TIPRANKS_EMAIL
    login_password = password or settings.TIPRANKS_PASSWORD
    
    if not login_email or not login_password:
        return {
            "success": False,
            "message": "Email and password are required. Set TIPRANKS_EMAIL and TIPRANKS_PASSWORD in .env file.",
            "cookies": {},
            "response_data": None,
        }
    
    print(f"🔐 Attempting to login to TipRanks...")
    print(f"   Email: {login_email}")
    print(f"   URL: {TIPRANKS_SIGNIN_URL}")
    print("-" * 70)
    
    # Run synchronous cloudscraper in executor
    def _login_sync():
        # Use cloudscraper if available
        if HAS_CLOUDSCRAPER:
            print("   Using cloudscraper to bypass Cloudflare protection...")
            session = cloudscraper.create_scraper()
        else:
            print("   Using requests (may fail with Cloudflare protection)...")
            import requests
            session = requests.Session()
        
        session.headers.update(SIGNIN_HEADERS)
        
        # First, visit the sign-in page to get initial cookies
        print("   Step 1: Getting initial session cookies...")
        session.get("https://www.tipranks.com/sign-in", timeout=15)
        
        # Prepare login payload
        login_payload = {
            "email": login_email,
            "password": login_password,
        }
        
        # Make login request
        print("   Step 2: Making login request...")
        response = session.post(
            TIPRANKS_SIGNIN_URL,
            json=login_payload,
            timeout=15,
        )
        
        return response, session
    
    try:
        # Run sync function in executor
        loop = asyncio.get_event_loop()
        response, session = await loop.run_in_executor(None, _login_sync)
        
        # Check response
        print(f"   Status Code: {response.status_code}")
        
        # Extract cookies from session
        cookies_dict = {}
        for cookie in session.cookies:
            cookies_dict[cookie.name] = cookie.value
        
        if response.status_code == 200:
            # Login successful
            try:
                response_data = response.json()
            except:
                response_data = {"message": "Login successful"}
            
            print(f"✅ Login successful!")
            print(f"   Received {len(cookies_dict)} cookies")
            
            # Save cookies to file if requested
            if save_session and cookies_dict:
                save_cookies_to_file(cookies_dict)
            
            return {
                "success": True,
                "message": "Login successful",
                "cookies": cookies_dict,
                "response_data": response_data,
            }
        
        elif response.status_code == 401:
            # Unauthorized - invalid credentials
            print(f"❌ Login failed: Invalid email or password")
            try:
                error_data = response.json()
                error_msg = error_data.get("message", "Invalid email or password")
            except:
                error_msg = "Invalid email or password"
            
            return {
                "success": False,
                "message": f"Login failed: {error_msg}",
                "cookies": {},
                "response_data": None,
            }
        
        elif response.status_code == 403:
            # Forbidden - Cloudflare blocking
            print(f"⚠️  Got 403 Forbidden. Cloudflare is blocking the request.")
            return {
                "success": False,
                "message": "Cloudflare is blocking the request. Try again later or check your network.",
                "cookies": {},
                "response_data": None,
            }
        
        else:
            # Other error
            print(f"❌ Login failed with status {response.status_code}")
            try:
                error_data = response.json()
                error_msg = error_data.get("message", f"HTTP {response.status_code}")
            except:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
            
            return {
                "success": False,
                "message": f"Login failed: {error_msg}",
                "cookies": cookies_dict,  # Still return cookies even on error
                "response_data": None,
            }
    
    except Exception as e:
        error_type = type(e).__name__
        print(f"❌ ERROR ({error_type}): {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        
        return {
            "success": False,
            "message": f"Login error: {str(e)}",
            "cookies": {},
            "response_data": None,
        }


async def ensure_authenticated_session() -> Dict[str, str]:
    """
    Ensure we have a valid authenticated session.
    If cookies are expired or missing, attempt to login.
    
    Returns:
        Dictionary of cookies to use for authenticated requests
    """
    # Load existing cookies
    cookies = load_cookies_from_file()
    
    # Check if we have authentication cookies
    # TipRanks typically uses cookies like: session_id, auth_token, etc.
    # For now, we'll check if we have any cookies and try to login if we don't
    
    if not cookies:
        print("⚠️  No cookies found. Attempting to login...")
        login_result = await login_to_tipranks(save_session=True)
        if login_result["success"]:
            return login_result["cookies"]
        else:
            print(f"❌ Failed to login: {login_result['message']}")
            return {}
    
    # Return existing cookies (they might still be valid)
    return cookies


