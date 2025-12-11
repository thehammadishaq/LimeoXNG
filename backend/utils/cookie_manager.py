"""
Cookie Manager - Postman-like Cookie Jar Functionality

Automatically manages cookies:
- Extracts cookies from response Set-Cookie headers
- Stores cookies per domain
- Automatically sends cookies in subsequent requests
- Handles cookie expiration
- Updates cookies when new ones arrive
- Persists cookies to file (optional)
"""

import json
import os
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from http.cookies import SimpleCookie
from urllib.parse import urlparse
import asyncio
from pathlib import Path


class CookieManager:
    """
    Postman-like Cookie Manager
    
    Features:
    - Automatic cookie extraction from Set-Cookie headers
    - Domain-based cookie storage
    - Expiration handling
    - Cookie persistence to file
    - Thread-safe operations
    """
    
    def __init__(self, storage_file: Optional[str] = None):
        """
        Initialize Cookie Manager
        
        Args:
            storage_file: Optional file path to persist cookies (JSON format)
        """
        self._cookies: Dict[str, Dict[str, Dict]] = {}  # {domain: {name: {value, expires, ...}}}
        self._lock = asyncio.Lock()
        self._storage_file = storage_file
        
        # Load cookies from file if exists
        if storage_file and os.path.exists(storage_file):
            self._load_from_file()
    
    def _load_from_file(self):
        """Load cookies from JSON file"""
        try:
            with open(self._storage_file, 'r') as f:
                data = json.load(f)
                self._cookies = data
            print(f"✅ Loaded cookies from {self._storage_file}")
        except Exception as e:
            print(f"⚠️ Failed to load cookies from file: {e}")
    
    def _save_to_file(self):
        """Save cookies to JSON file"""
        if not self._storage_file:
            return
        
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self._storage_file) if os.path.dirname(self._storage_file) else '.', exist_ok=True)
            
            with open(self._storage_file, 'w') as f:
                json.dump(self._cookies, f, indent=2)
            print(f"💾 Saved cookies to {self._storage_file}")
        except Exception as e:
            print(f"⚠️ Failed to save cookies to file: {e}")
    
    def _get_domain(self, url: str) -> str:
        """Extract domain from URL"""
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        # Remove port if present
        if ':' in domain:
            domain = domain.split(':')[0]
        return domain
    
    def _parse_cookie_header(self, set_cookie_header: str) -> Dict:
        """
        Parse Set-Cookie header into cookie dict
        
        Example: "session_id=abc123; Path=/; Domain=.example.com; Expires=Wed, 21 Oct 2025 07:28:00 GMT; HttpOnly; Secure"
        """
        cookie = SimpleCookie()
        cookie.load(set_cookie_header)
        
        result = {}
        for key, morsel in cookie.items():
            result[key] = {
                'value': morsel.value,
                'domain': morsel.get('domain', ''),
                'path': morsel.get('path', '/'),
                'expires': morsel.get('expires', None),
                'secure': morsel.get('secure', False),
                'httponly': morsel.get('httponly', False),
                'samesite': morsel.get('samesite', ''),
            }
        return result
    
    def _is_cookie_expired(self, cookie_data: Dict) -> bool:
        """Check if cookie is expired"""
        expires = cookie_data.get('expires')
        if not expires:
            return False  # Session cookie (no expiration)
        
        try:
            # Parse expires date
            if isinstance(expires, str):
                # Try parsing RFC 1123 format: "Wed, 21 Oct 2025 07:28:00 GMT"
                from email.utils import parsedate_to_datetime
                expires_dt = parsedate_to_datetime(expires)
            elif isinstance(expires, (int, float)):
                expires_dt = datetime.fromtimestamp(expires)
            else:
                return False
            
            return datetime.utcnow() > expires_dt
        except:
            return False
    
    async def extract_cookies_from_response(self, url: str, response_headers: Dict[str, str]):
        """
        Extract cookies from response Set-Cookie headers and store them
        
        Args:
            url: Request URL
            response_headers: Response headers dict
        """
        async with self._lock:
            domain = self._get_domain(url)
            
            # Handle multiple Set-Cookie headers
            set_cookie_headers = []
            for key, value in response_headers.items():
                if key.lower() == 'set-cookie':
                    if isinstance(value, list):
                        set_cookie_headers.extend(value)
                    else:
                        set_cookie_headers.append(value)
            
            if not set_cookie_headers:
                return
            
            # Initialize domain dict if not exists
            if domain not in self._cookies:
                self._cookies[domain] = {}
            
            # Parse and store each cookie
            for set_cookie_header in set_cookie_headers:
                try:
                    parsed_cookies = self._parse_cookie_header(set_cookie_header)
                    for name, cookie_data in parsed_cookies.items():
                        # Use cookie's domain if specified, otherwise use request domain
                        cookie_domain = cookie_data.get('domain', '').lstrip('.') or domain
                        
                        if cookie_domain not in self._cookies:
                            self._cookies[cookie_domain] = {}
                        
                        # Store cookie
                        self._cookies[cookie_domain][name] = cookie_data
                        print(f"🍪 Stored cookie: {name} for domain {cookie_domain}")
                except Exception as e:
                    print(f"⚠️ Failed to parse cookie: {set_cookie_header[:50]}... Error: {e}")
            
            # Save to file
            self._save_to_file()
    
    async def get_cookies_for_url(self, url: str) -> Dict[str, str]:
        """
        Get cookies for a specific URL (domain-based)
        
        Args:
            url: Request URL
            
        Returns:
            Dict of cookie name: value pairs
        """
        async with self._lock:
            domain = self._get_domain(url)
            cookies_dict = {}
            
            # Check exact domain match
            if domain in self._cookies:
                for name, cookie_data in self._cookies[domain].items():
                    if not self._is_cookie_expired(cookie_data):
                        cookies_dict[name] = cookie_data['value']
            
            # Check parent domains (e.g., .tipranks.com matches www.tipranks.com)
            parts = domain.split('.')
            for i in range(len(parts)):
                parent_domain = '.'.join(parts[i:])
                if parent_domain in self._cookies:
                    for name, cookie_data in self._cookies[parent_domain].items():
                        cookie_domain = cookie_data.get('domain', '').lstrip('.')
                        # Match if cookie domain matches or is parent domain
                        if not cookie_domain or domain.endswith(cookie_domain) or domain == cookie_domain:
                            if not self._is_cookie_expired(cookie_data):
                                cookies_dict[name] = cookie_data['value']
            
            # Also check for domain with leading dot (e.g., .tipranks.com)
            dot_domain = f".{domain}"
            if dot_domain in self._cookies:
                for name, cookie_data in self._cookies[dot_domain].items():
                    if not self._is_cookie_expired(cookie_data):
                        cookies_dict[name] = cookie_data['value']
            
            return cookies_dict
    
    async def set_cookie(self, url: str, name: str, value: str, **kwargs):
        """
        Manually set a cookie
        
        Args:
            url: Request URL
            name: Cookie name
            value: Cookie value
            **kwargs: Optional cookie attributes (domain, path, expires, secure, httponly)
        """
        async with self._lock:
            domain = self._get_domain(url)
            
            if domain not in self._cookies:
                self._cookies[domain] = {}
            
            self._cookies[domain][name] = {
                'value': value,
                'domain': kwargs.get('domain', ''),
                'path': kwargs.get('path', '/'),
                'expires': kwargs.get('expires'),
                'secure': kwargs.get('secure', False),
                'httponly': kwargs.get('httponly', False),
                'samesite': kwargs.get('samesite', ''),
            }
            
            self._save_to_file()
    
    async def clear_cookies(self, domain: Optional[str] = None):
        """Clear cookies for a domain or all domains"""
        async with self._lock:
            if domain:
                if domain in self._cookies:
                    del self._cookies[domain]
                    print(f"🗑️ Cleared cookies for domain: {domain}")
            else:
                self._cookies.clear()
                print("🗑️ Cleared all cookies")
            
            self._save_to_file()
    
    async def remove_expired_cookies(self):
        """Remove expired cookies"""
        async with self._lock:
            for domain in list(self._cookies.keys()):
                for name in list(self._cookies[domain].keys()):
                    if self._is_cookie_expired(self._cookies[domain][name]):
                        del self._cookies[domain][name]
                        print(f"🗑️ Removed expired cookie: {name} for domain {domain}")
                
                # Remove domain if empty
                if not self._cookies[domain]:
                    del self._cookies[domain]
            
            self._save_to_file()
    
    def get_all_cookies(self) -> Dict[str, Dict[str, Dict]]:
        """Get all stored cookies (for debugging)"""
        return self._cookies.copy()


# Global Cookie Manager instance (singleton pattern)
_cookie_manager: Optional[CookieManager] = None


def get_cookie_manager(storage_file: Optional[str] = None) -> CookieManager:
    """Get or create global Cookie Manager instance"""
    global _cookie_manager
    
    if _cookie_manager is None:
        if storage_file is None:
            # Default storage file
            backend_root = Path(__file__).parent.parent
            storage_file = str(backend_root / "cookies" / "tipranks_cookies.json")
        
        _cookie_manager = CookieManager(storage_file=storage_file)
    
    return _cookie_manager

