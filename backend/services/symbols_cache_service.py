"""
Symbols Cache Service
Service to manage cached stock symbols list
"""
import asyncio
from typing import List, Optional
from datetime import datetime, timedelta
from models.stock_symbols import StockSymbolsCache
from services.stock_symbols_service import get_all_available_symbols, SYMBOLS_CACHE_DURATION_HOURS


class SymbolsCacheService:
    """Service for managing stock symbols cache"""
    
    async def get_cached_symbols(self) -> Optional[StockSymbolsCache]:
        """Get cached symbols list from database"""
        try:
            cache = await StockSymbolsCache.find_one(
                StockSymbolsCache.cache_key == "all_symbols"
            )
            return cache
        except Exception as e:
            print(f"⚠️ Error fetching cached symbols: {e}")
            return None
    
    async def is_cache_valid(self, cache: StockSymbolsCache) -> bool:
        """Check if cache is still valid"""
        if not cache:
            return False
        
        age = datetime.utcnow() - cache.updated_at
        return age < timedelta(hours=SYMBOLS_CACHE_DURATION_HOURS)
    
    async def save_symbols_to_cache(self, symbols: List[str], exchanges: List[str] = ["US"]) -> StockSymbolsCache:
        """Save symbols list to cache"""
        try:
            existing = await StockSymbolsCache.find_one(
                StockSymbolsCache.cache_key == "all_symbols"
            )
            
            if existing:
                existing.symbols = symbols
                existing.total_count = len(symbols)
                existing.exchanges = exchanges
                existing.updated_at = datetime.utcnow()
                await existing.save()
                return existing
            else:
                new_cache = StockSymbolsCache(
                    cache_key="all_symbols",
                    symbols=symbols,
                    total_count=len(symbols),
                    exchanges=exchanges,
                    cached_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                await new_cache.insert()
                return new_cache
        except Exception as e:
            print(f"⚠️ Error saving symbols to cache: {e}")
            raise
    
    async def get_all_symbols(self, force_refresh: bool = True) -> List[str]:
        """
        Get all available stock symbols - NO CACHING, always fresh
        - Always fetches from Finnhub (no cache check)
        - Returns list of ticker symbols
        """
        # Always fetch fresh from Finnhub (no cache)
        print("🔄 Fetching fresh symbols list from Finnhub (no cache)...")
        try:
            symbols = await get_all_available_symbols()
            
            # NO CACHE SAVING - disabled
            # asyncio.create_task(
            #     self.save_symbols_to_cache(symbols, ["US", "NASDAQ", "NYSE"])
            # )
            
            return symbols
        except Exception as e:
            print(f"❌ Error fetching symbols from Finnhub: {e}")
            raise Exception(f"Failed to fetch symbols: {str(e)}")
    
    async def get_total_count(self, force_refresh: bool = False) -> int:
        """Get total count of available symbols"""
        symbols = await self.get_all_symbols(force_refresh)
        return len(symbols)
    
    async def get_symbols_page(
        self,
        page: int = 1,
        page_size: int = 20,
        force_refresh: bool = False
    ) -> tuple[List[str], int]:
        """
        Get paginated symbols list
        Returns: (symbols_for_page, total_count)
        """
        all_symbols = await self.get_all_symbols(force_refresh)
        total = len(all_symbols)
        
        # Calculate pagination
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        
        page_symbols = all_symbols[start_index:end_index]
        
        return page_symbols, total

import asyncio

