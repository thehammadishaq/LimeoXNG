"""
Screener Data Service
Service layer for screener data business logic with caching
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from models.screener import ScreenerData
from services.screener_service import (
    fetch_stock_quote,
    fetch_stock_profile,
    fetch_stock_metrics,
    fetch_screener_data,
    is_cache_valid,
    CACHE_DURATION_MINUTES
)
import asyncio


class ScreenerDataService:
    """Service for screener data operations with caching"""
    
    async def get_cached_data(self, ticker: str) -> Optional[ScreenerData]:
        """Get cached screener data from database"""
        try:
            screener_data = await ScreenerData.find_one(
                ScreenerData.ticker == ticker.upper()
            )
            return screener_data
        except Exception as e:
            print(f"⚠️ Error fetching cached data for {ticker}: {e}")
            return None
    
    async def save_to_db(
        self,
        ticker: str,
        data: Dict[str, Any],
        source: str = "finnhub"
    ) -> Optional[ScreenerData]:
        """Save screener data to database (async/non-blocking)"""
        try:
            ticker_upper = ticker.upper()
            existing = await ScreenerData.find_one(
                ScreenerData.ticker == ticker_upper
            )
            
            if existing:
                # Update existing record
                existing.data = data
                existing.updated_at = datetime.utcnow()
                existing.source = source
                await existing.save()
                return existing
            else:
                # Create new record
                new_data = ScreenerData(
                    ticker=ticker_upper,
                    data=data,
                    source=source,
                    fetched_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                await new_data.insert()
                return new_data
        except Exception as e:
            print(f"⚠️ Error saving screener data to DB for {ticker}: {e}")
            return None
    
    async def get_single_stock_data(
        self,
        ticker: str,
        force_refresh: bool = False,
        save_to_db: bool = False  # Changed default to False - no DB saving
    ) -> Dict[str, Any]:
        """
        Get single stock data - NO CACHING, direct from Finnhub
        Returns: {
            "ticker": str,
            "data": dict,
            "from_cache": bool,
            "saved_to_db": bool,
            "fetched_at": str
        }
        """
        ticker_upper = ticker.upper()
        
        # Always fetch fresh data from Finnhub (no cache check)
        print(f"🔄 Fetching fresh data from Finnhub for {ticker_upper} (no cache)...")
        try:
            # Fetch all data in parallel
            quote_task = fetch_stock_quote(ticker_upper)
            profile_task = fetch_stock_profile(ticker_upper)
            metrics_task = fetch_stock_metrics(ticker_upper)
            
            quote, profile, metrics = await asyncio.gather(
                quote_task, profile_task, metrics_task, return_exceptions=True
            )
            
            # Log any exceptions from individual fetches
            if isinstance(quote, Exception):
                print(f"   ⚠️ Quote fetch failed for {ticker_upper}: {type(quote).__name__} - {str(quote)}")
            if isinstance(profile, Exception):
                print(f"   ⚠️ Profile fetch failed for {ticker_upper}: {type(profile).__name__} - {str(profile)}")
            if isinstance(metrics, Exception):
                print(f"   ⚠️ Metrics fetch failed for {ticker_upper}: {type(metrics).__name__} - {str(metrics)}")
            
            # Combine data
            stock_data = {
                "quote": quote if not isinstance(quote, Exception) else None,
                "profile": profile if not isinstance(profile, Exception) else None,
                "metrics": metrics if not isinstance(metrics, Exception) else None,
                "fetched_at": datetime.now().isoformat()
            }
            
            # Check if we got at least some data
            if not stock_data["quote"] and not stock_data["profile"] and not stock_data["metrics"]:
                print(f"   ⚠️ No data received for {ticker_upper} from any endpoint")
                raise Exception(f"No data received for {ticker_upper}")
            
            # NO DB SAVING - cache disabled
            # if save_to_db:
            #     asyncio.create_task(
            #         self.save_to_db(ticker_upper, stock_data, "finnhub")
            #     )
            
            return {
                "ticker": ticker_upper,
                "data": stock_data,
                "from_cache": False,
                "saved_to_db": False,  # Always False - no DB saving
                "fetched_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"❌ Error fetching data from Finnhub for {ticker_upper}")
            print(f"   Error Type: {error_type}")
            print(f"   Error Message: {error_msg}")
            
            # Check for specific error types
            if "HTTPError" in error_type or "HTTP" in error_msg:
                print(f"   ⚠️ HTTP Error - Possible causes:")
                print(f"      - Invalid API key or expired")
                print(f"      - Rate limit exceeded")
                print(f"      - Invalid ticker symbol: {ticker_upper}")
                print(f"      - Finnhub API service issue")
            elif "Timeout" in error_type or "timeout" in error_msg.lower():
                print(f"   ⚠️ Timeout Error - Possible causes:")
                print(f"      - Slow network connection")
                print(f"      - Finnhub API is slow or down")
            elif "Connection" in error_type or "connection" in error_msg.lower():
                print(f"   ⚠️ Connection Error - Possible causes:")
                print(f"      - No internet connection")
                print(f"      - Finnhub API is unreachable")
            
            # Fallback to cached data if available
            cached = await self.get_cached_data(ticker_upper)
            if cached:
                print(f"✅ Using cached data as fallback for {ticker_upper} (age: {(datetime.utcnow() - cached.updated_at).total_seconds():.0f}s)")
                return {
                    "ticker": ticker_upper,
                    "data": cached.data,
                    "from_cache": True,
                    "saved_to_db": False,
                    "fetched_at": cached.updated_at.isoformat()
                }
            
            # No cache available, return error with details
            raise Exception(f"Failed to fetch data for {ticker_upper}: {error_type} - {error_msg}. No cached data available.")
    
    async def get_multiple_stocks_data(
        self,
        symbols: List[str],
        force_refresh: bool = False,
        save_to_db: bool = False  # Changed default to False - no DB saving
    ) -> Dict[str, Any]:
        """
        Get multiple stocks data with caching logic
        Returns screener response with cached and fresh counts
        """
        results = []
        fresh_count = 0
        
        # Process each symbol - NO CACHING, always fresh
        for symbol in symbols:
            symbol_upper = symbol.upper()
            
            try:
                stock_result = await self.get_single_stock_data(
                    symbol_upper,
                    force_refresh=True,  # Always force refresh - no cache
                    save_to_db=False  # No DB saving
                )
                
                results.append({
                    "ticker": stock_result["ticker"],
                    "quote": stock_result["data"].get("quote"),
                    "profile": stock_result["data"].get("profile"),
                    "metrics": stock_result["data"].get("metrics"),
                    "fetched_at": stock_result["fetched_at"]
                })
                
                fresh_count += 1
                    
            except Exception as e:
                error_type = type(e).__name__
                error_msg = str(e)
                print(f"⚠️ Error processing {symbol_upper}: {error_type} - {error_msg}")
                
                # Log specific error details
                if "HTTPError" in error_type:
                    print(f"   ⚠️ HTTP Error for {symbol_upper} - Check API key, rate limits, or ticker validity")
                elif "Failed to fetch" in error_msg or "No data" in error_msg:
                    print(f"   ⚠️ No data available for {symbol_upper} - Ticker may be invalid or delisted")
                
                # Continue with other symbols even if one fails
                continue
        
        return {
            "stocks": results,
            "total": len(results),
            "cached_count": 0,  # Always 0 - no cache
            "fresh_count": fresh_count,
            "fetched_at": datetime.now().isoformat(),
            "source": "finnhub"
        }

