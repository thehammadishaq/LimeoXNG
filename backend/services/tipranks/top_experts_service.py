"""
TipRanks Top Experts Service

Fetches data from TipRanks GetTop25Experts API and stores/updates in MongoDB.
Prevents duplicates by using expertId as unique identifier.

Uses cloudscraper to bypass Cloudflare protection (same approach as expert_stocks_service.py).
"""

import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import traceback
import asyncio

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    import requests
    HAS_CLOUDSCRAPER = False
    print("⚠️  'cloudscraper' not installed. Installing it will help bypass Cloudflare protection.")
    print("   Run: pip install cloudscraper")

from models.tipranks import TipRanksTopExpertDocument
from services.tipranks.tipranks_auth_service import (
    load_cookies_from_file,
    ensure_authenticated_session,
)

try:
    from beanie.odm.fields import PydanticObjectId
except ImportError:
    # Fallback if PydanticObjectId is not available
    PydanticObjectId = type(None)


def _serialize_object_ids(data: Any) -> Any:
    """
    Recursively convert PydanticObjectId and ObjectId to strings.
    Handles dicts, lists, and nested structures.
    """
    if isinstance(data, PydanticObjectId):
        return str(data)
    elif hasattr(data, '__class__') and 'ObjectId' in str(type(data)):
        # Handle bson ObjectId as well
        return str(data)
    elif isinstance(data, dict):
        return {key: _serialize_object_ids(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [_serialize_object_ids(item) for item in data]
    else:
        return data


TIPRANKS_API_URL = "https://www.tipranks.com/api/experts/GetTop25Experts/"
TIPRANKS_BASE_URL = "https://www.tipranks.com"

# Headers to mimic browser request - updated for API calls (same as expert_stocks_service.py)
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

# Cookies will be loaded dynamically when needed


async def fetch_top_experts_from_api(
    expert_type: str = "analyst",
    num_experts: int = 1000,
    period: str = "year",
    benchmark: str = "none",
    country: str = "us",
    ensure_auth: bool = True,
) -> List[Dict[str, Any]]:
    """
    Fetch top experts from TipRanks API using cloudscraper.
    Uses cloudscraper to bypass Cloudflare protection (same approach as expert_stocks_service.py).
    Ensures authenticated session before making API call.
    
    Args:
        expert_type: Expert type (analyst, blogger, insider, etc.)
        num_experts: Number of experts to fetch
        period: Time period (year, month, etc.)
        benchmark: Benchmark type
        country: Country code (us, etc.)
        ensure_auth: Whether to ensure authenticated session before API call
    
    Returns:
        List of expert dictionaries from API
    """
    print(f"🌐 Fetching data from TipRanks API...")
    print(f"   URL: {TIPRANKS_API_URL}")
    
    params = {
        'expertType': expert_type,
        'numExperts': num_experts,
        'period': period,
        'benchmark': benchmark,
        'country': country,
    }
    print(f"   Parameters: {params}")
    print("-" * 70)
    
    # Ensure authenticated session if requested
    cookies = {}
    if ensure_auth:
        print("   Step 0: Ensuring authenticated session...")
        cookies = await ensure_authenticated_session()
        if not cookies:
            print("⚠️  Warning: No authenticated cookies available. API call may fail.")
    
    # Run synchronous cloudscraper in executor (since it's sync but we're in async context)
    def _fetch_sync():
        # Use cloudscraper if available (bypasses Cloudflare), otherwise use requests
        if HAS_CLOUDSCRAPER:
            print("   Using cloudscraper to bypass Cloudflare protection...")
            session = cloudscraper.create_scraper()
        else:
            print("   Using requests (may fail with Cloudflare protection)...")
            import requests
            session = requests.Session()
        
        session.headers.update(HEADERS)
        
        # Add cookies if provided
        if cookies:
            session.cookies.update(cookies)
            print(f"   Using {len(cookies)} authenticated cookie(s)")
        
        # First, visit the main page to get cookies (helps with Cloudflare)
        print("   Step 1: Getting session cookies...")
        session.get(TIPRANKS_BASE_URL + '/', timeout=15)
        
        # Now make the API request
        print("   Step 2: Making API request...")
        response = session.get(TIPRANKS_API_URL, params=params, timeout=15)
        
        return response
    
    try:
        # Run sync function in executor
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, _fetch_sync)
        
        # Check response
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 403:
            print("⚠️  Got 403 Forbidden. Cloudflare is still blocking the request.")
            if not HAS_CLOUDSCRAPER:
                print("\n💡 Try installing cloudscraper:")
                print("   pip install cloudscraper")
            else:
                print("\n💡 Cloudflare protection is active. You may need to:")
                print("   1. Copy cookies from your browser/Postman and add them to the COOKIES dict")
                print("   2. Wait a moment and try again (Cloudflare may need time)")
            raise Exception(f"HTTP 403: Cloudflare is blocking the request")
        
        response.raise_for_status()
        
        # Parse JSON response
        data = response.json()
        
        if not isinstance(data, list):
            print(f"⚠️ Unexpected response format: {type(data)}")
            return []
        
        print(f"✅ Successfully fetched {len(data)} experts!")
        print(f"   Response Size: {len(response.content)} bytes")
        print("-" * 70)
        
        return data
        
    except Exception as e:
        error_type = type(e).__name__
        print(f"❌ ERROR ({error_type}): {e}")
        
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Status Code: {e.response.status_code}")
            print(f"   Response preview: {e.response.text[:500]}")
        
        if not HAS_CLOUDSCRAPER:
            print("\n💡 Tip: Install cloudscraper to bypass Cloudflare:")
            print("   pip install cloudscraper")
        
        print(f"   Traceback: {traceback.format_exc()}")
        raise


async def save_or_update_experts_to_db(
    experts: List[Dict[str, Any]],
    expert_type: str = "analyst",
    num_experts: int = 1000,
    period: str = "year",
    benchmark: str = "none",
    country: str = "us",
) -> Dict[str, int]:
    """
    Save or update experts in MongoDB.
    Prevents duplicates by using expertId as unique identifier.
    
    Args:
        experts: List of expert dictionaries from API
        expert_type: API parameter for tracking
        num_experts: API parameter for tracking
        period: API parameter for tracking
        benchmark: API parameter for tracking
        country: API parameter for tracking
    
    Returns:
        Dictionary with counts: created, updated, errors
    """
    stats = {"created": 0, "updated": 0, "errors": 0}
    
    if not experts:
        print("⚠️ No experts to save")
        return stats
    
    print(f"💾 Saving/updating {len(experts)} experts to MongoDB...")
    
    for expert_data in experts:
        try:
            # Extract expertId and uid (required fields)
            expert_id = expert_data.get("expertId")
            uid = expert_data.get("uid")
            
            if not expert_id:
                print(f"⚠️ Skipping expert without expertId: {expert_data.get('name', 'Unknown')}")
                stats["errors"] += 1
                continue
            
            if not uid:
                print(f"⚠️ Skipping expert without uid: {expert_data.get('name', 'Unknown')}")
                stats["errors"] += 1
                continue
            
            # Check if expert already exists
            existing_expert = await TipRanksTopExpertDocument.find_one(
                TipRanksTopExpertDocument.expertId == expert_id
            )
            
            # Normalize data - handle None values and type mismatches
            # Convert None to appropriate defaults
            normalized_data = {}
            for key, value in expert_data.items():
                if value is None:
                    # Handle None values based on expected type
                    if key == "name":
                        # Use "Unknown" as fallback for missing name
                        normalized_data[key] = "Unknown"
                    elif key == "distribution":
                        normalized_data[key] = {}
                    elif key == "recommendations":
                        normalized_data[key] = {}
                    elif key == "rank":
                        normalized_data[key] = {}
                    elif key == "ratings":
                        normalized_data[key] = []
                    elif key == "geoCoverage":
                        normalized_data[key] = []
                    else:
                        # Keep None for optional fields
                        normalized_data[key] = None
                elif key == "portfolioRisk" and isinstance(value, str):
                    # Keep portfolioRisk as string if it's a string (e.g., 'medium', 'high', 'low')
                    # Don't try to convert to float
                    normalized_data[key] = value
                else:
                    normalized_data[key] = value
            
            # Prepare document data
            doc_data = {
                **normalized_data,  # Use normalized data
                "expertType_param": expert_type,
                "numExperts_param": num_experts,
                "period_param": period,
                "benchmark_param": benchmark,
                "country_param": country,
            }
            
            if existing_expert:
                # Update existing expert
                for key, value in doc_data.items():
                    if key not in ["expertId", "uid", "created_at"]:  # Don't overwrite these
                        # Normalize None values for specific fields
                        if value is None:
                            if key == "name":
                                # Use "Unknown" as fallback for missing name
                                setattr(existing_expert, key, "Unknown")
                            elif key == "distribution":
                                setattr(existing_expert, key, {})
                            elif key == "recommendations":
                                setattr(existing_expert, key, {})
                            elif key == "rank":
                                setattr(existing_expert, key, {})
                            elif key == "ratings":
                                setattr(existing_expert, key, [])
                            elif key == "geoCoverage":
                                setattr(existing_expert, key, [])
                            else:
                                setattr(existing_expert, key, None)
                        else:
                            setattr(existing_expert, key, value)
                
                existing_expert.updated_at = datetime.utcnow()
                await existing_expert.save()
                stats["updated"] += 1
                
                if stats["updated"] % 50 == 0:
                    print(f"   Updated {stats['updated']} experts...")
            else:
                # Create new expert
                new_expert = TipRanksTopExpertDocument(**doc_data)
                await new_expert.insert()
                stats["created"] += 1
                
                if stats["created"] % 50 == 0:
                    print(f"   Created {stats['created']} experts...")
                    
        except Exception as e:
            print(f"❌ Error saving expert {expert_data.get('name', 'Unknown')} (expertId: {expert_data.get('expertId')}): {e}")
            print(f"   Traceback: {traceback.format_exc()}")
            stats["errors"] += 1
            continue
    
    print(f"✅ Saved experts to MongoDB: {stats['created']} created, {stats['updated']} updated, {stats['errors']} errors")
    return stats


async def fetch_and_save_top_experts(
    expert_type: str = "analyst",
    num_experts: int = 1000,
    period: str = "year",
    benchmark: str = "none",
    country: str = "us",
    save_to_db: bool = True,
) -> Dict[str, Any]:
    """
    Fetch top experts from TipRanks API and save/update in MongoDB.
    
    Args:
        expert_type: Expert type (analyst, blogger, insider, etc.)
        num_experts: Number of experts to fetch
        period: Time period (year, month, etc.)
        benchmark: Benchmark type
        country: Country code (us, etc.)
        save_to_db: Whether to save to database
    
    Returns:
        Dictionary with experts data and save stats
    """
    # Fetch from API
    experts = await fetch_top_experts_from_api(
        expert_type=expert_type,
        num_experts=num_experts,
        period=period,
        benchmark=benchmark,
        country=country,
    )
    
    # Save to database if requested
    save_stats = None
    if save_to_db and experts:
        save_stats = await save_or_update_experts_to_db(
            experts=experts,
            expert_type=expert_type,
            num_experts=num_experts,
            period=period,
            benchmark=benchmark,
            country=country,
        )
    
    return {
        "experts": experts,
        "count": len(experts),
        "save_stats": save_stats,
        "parameters": {
            "expert_type": expert_type,
            "num_experts": num_experts,
            "period": period,
            "benchmark": benchmark,
            "country": country,
        },
    }


async def get_top_experts_from_db(
    expert_type: Optional[str] = None,
    limit: Optional[int] = None,
    skip: int = 0,
) -> List[Dict[str, Any]]:
    """
    Get top experts from MongoDB.
    
    Args:
        expert_type: Filter by expert type (optional)
        limit: Maximum number of results (optional)
        skip: Number of results to skip (for pagination)
    
    Returns:
        List of expert dictionaries
    """
    try:
        query = {}
        if expert_type:
            query["expertType"] = expert_type
            print(f"🔍 Querying MongoDB for expert_type='{expert_type}'")
        else:
            print(f"🔍 Querying MongoDB for all expert types")
        
        # Build query
        experts_query = TipRanksTopExpertDocument.find(query)
        
        # Count total matching documents before pagination
        total_count = await experts_query.count()
        print(f"📊 Found {total_count} total experts matching query in MongoDB")
        
        # Apply sorting (by rank.ranked if available, ascending)
        # Beanie supports nested field sorting with dot notation
        # Sort by rank.ranked ascending (lower rank number = better)
        # Use try-except to handle cases where rank.ranked might not exist
        try:
            experts_query = experts_query.sort("+rank.ranked")
        except Exception as sort_error:
            print(f"⚠️  Could not sort by rank.ranked: {sort_error}. Sorting by expertId instead.")
            experts_query = experts_query.sort("+expertId")
        
        # Apply pagination
        if skip > 0:
            experts_query = experts_query.skip(skip)
        if limit:
            experts_query = experts_query.limit(limit)
        
        # Execute query
        experts = await experts_query.to_list()
        
        # Convert to dictionaries and serialize ObjectId fields
        experts_list = []
        for expert in experts:
            expert_dict = expert.dict()
            # Recursively convert all ObjectId/PydanticObjectId to strings
            expert_dict = _serialize_object_ids(expert_dict)
            experts_list.append(expert_dict)
        
        print(f"✅ Retrieved {len(experts_list)} experts from MongoDB")
        return experts_list
        
    except Exception as e:
        print(f"❌ Error retrieving experts from MongoDB: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        raise


async def get_expert_profile_from_db(expert_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a single expert profile from MongoDB by expertId or uid.
    
    Args:
        expert_id: Expert ID (expertId or uid)
    
    Returns:
        Expert dictionary or None if not found
    """
    try:
        # Try to find by expertId first
        expert = await TipRanksTopExpertDocument.find_one(
            TipRanksTopExpertDocument.expertId == int(expert_id) if expert_id.isdigit() else None
        )
        
        # If not found by expertId, try by uid
        if not expert:
            expert = await TipRanksTopExpertDocument.find_one(
                TipRanksTopExpertDocument.uid == expert_id
            )
        
        if expert:
            expert_dict = expert.dict()
            # Recursively convert all ObjectId/PydanticObjectId to strings
            expert_dict = _serialize_object_ids(expert_dict)
            return expert_dict
        
        return None
        
    except Exception as e:
        print(f"❌ Error retrieving expert profile from MongoDB: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        raise

