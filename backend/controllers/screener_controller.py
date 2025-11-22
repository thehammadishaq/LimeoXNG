"""
Screener Controller
Controller for screener data operations
"""
from typing import Dict, Any
from services.screener_data_service import ScreenerDataService
from services.symbols_cache_service import SymbolsCacheService
from schemas.screener import (
    ScreenerRequest,
    ScreenerResponse,
    SingleStockRequest,
    SingleStockResponse,
    ScreenerStockData
)
import math


class ScreenerController:
    """Controller for screener operations"""
    
    def __init__(self):
        self.service = ScreenerDataService()
        self.symbols_cache = SymbolsCacheService()
    
    async def get_screener_data(
        self,
        request: ScreenerRequest
    ) -> ScreenerResponse:
        """Get screener data for multiple stocks"""
        # If symbols not provided, use pagination
        if not request.symbols or len(request.symbols) == 0:
            page = request.page or 1
            page_size = request.page_size or 20
            
            # Get symbols for current page
            symbols, total_available = await self.symbols_cache.get_symbols_page(
                page=page,
                page_size=page_size,
                force_refresh=request.force_refresh
            )
        else:
            # Use provided symbols
            symbols = request.symbols
            total_available = await self.symbols_cache.get_total_count(request.force_refresh)
            page = request.page or 1
            page_size = request.page_size or 20
        
        # Fetch data for symbols
        result = await self.service.get_multiple_stocks_data(
            symbols=symbols,
            force_refresh=request.force_refresh,
            save_to_db=request.save_to_db
        )
        
        # Convert to response format
        stocks = [
            ScreenerStockData(
                ticker=s["ticker"],
                quote=s.get("quote"),
                profile=s.get("profile"),
                metrics=s.get("metrics"),
                fetched_at=s.get("fetched_at")
            )
            for s in result["stocks"]
        ]
        
        # Calculate total pages
        total_pages = math.ceil(total_available / page_size) if page_size > 0 else 1
        
        return ScreenerResponse(
            stocks=stocks,
            total=result["total"],
            total_available=total_available,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            cached_count=result["cached_count"],
            fresh_count=result["fresh_count"],
            fetched_at=result["fetched_at"],
            source=result["source"]
        )
    
    async def get_single_stock(
        self,
        request: SingleStockRequest
    ) -> SingleStockResponse:
        """Get data for a single stock"""
        result = await self.service.get_single_stock_data(
            ticker=request.ticker,
            force_refresh=request.force_refresh,
            save_to_db=request.save_to_db
        )
        
        return SingleStockResponse(
            ticker=result["ticker"],
            data=result["data"],
            from_cache=result["from_cache"],
            saved_to_db=result["saved_to_db"],
            fetched_at=result["fetched_at"]
        )

