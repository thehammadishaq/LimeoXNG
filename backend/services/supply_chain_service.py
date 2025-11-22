"""
Supply Chain Service
Service to fetch and generate supply chain graphs using SCgraphs module
"""
import sys
import os
import asyncio
import json
from typing import Dict, Optional, Any, Tuple
from pathlib import Path

# Add SCgraphs directory to path
backend_dir = Path(__file__).parent.parent
project_root = backend_dir.parent
scgraphs_dir = project_root / "SCgraphs"

if str(scgraphs_dir) not in sys.path:
    sys.path.insert(0, str(scgraphs_dir))

try:
    from supply_chain_fetcher import fetch_and_save_supply_chain, convert_to_graph_format, parse_supply_chain_json, fetch_supply_chain_data
    from generate_graph import generate_supply_chain_graph
except ImportError as e:
    print(f"⚠️ Warning: Could not import SCgraphs modules: {e}")
    print(f"   SCgraphs directory: {scgraphs_dir}")
    print(f"   Make sure SCgraphs module is accessible")


async def fetch_supply_chain_data_async(ticker: str) -> Optional[Dict]:
    """
    Fetch supply chain data from Gemini AI asynchronously
    
    Args:
        ticker: Stock ticker symbol (e.g., TSLA, AAPL)
        
    Returns:
        Dict containing supply chain data or None if failed
    """
    try:
        # Run in executor since SCgraphs uses synchronous Playwright
        loop = asyncio.get_event_loop()
        
        def fetch_data():
            # Use a temporary file in a temp directory
            temp_dir = backend_dir / "temp" / "supply_chain"
            temp_dir.mkdir(parents=True, exist_ok=True)
            output_file = temp_dir / f"{ticker.lower()}_data.json"
            
            # Fetch and save supply chain data
            data = fetch_and_save_supply_chain(ticker, str(output_file))
            return data, str(output_file)
        
        result = await loop.run_in_executor(None, fetch_data)
        return result
        
    except Exception as e:
        print(f"❌ Error fetching supply chain data: {e}")
        import traceback
        traceback.print_exc()
        return None


async def generate_supply_chain_graph_async(data_file: str, ticker: str, company_name: Optional[str] = None) -> Optional[str]:
    """
    Generate supply chain graph HTML asynchronously
    
    Args:
        data_file: Path to JSON data file
        ticker: Stock ticker symbol
        company_name: Optional company name for the graph
        
    Returns:
        Path to generated HTML file or None if failed
    """
    try:
        loop = asyncio.get_event_loop()
        
        def generate_graph():
            temp_dir = backend_dir / "temp" / "supply_chain"
            temp_dir.mkdir(parents=True, exist_ok=True)
            output_file = temp_dir / f"{ticker.lower()}_supply_chain.html"
            
            # Generate graph
            generate_supply_chain_graph(data_file, str(output_file), company_name)
            return str(output_file)
        
        result = await loop.run_in_executor(None, generate_graph)
        return result
        
    except Exception as e:
        print(f"❌ Error generating supply chain graph: {e}")
        import traceback
        traceback.print_exc()
        return None


async def get_supply_chain_data_from_file(ticker: str) -> Optional[Dict]:
    """
    Get supply chain data from existing file if available
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        Dict containing supply chain data or None if file not found
    """
    try:
        # Check in SCgraphs directory first
        scgraphs_data_file = scgraphs_dir / f"{ticker.lower()}_data.json"
        if scgraphs_data_file.exists():
            with open(scgraphs_data_file, "r", encoding="utf-8") as f:
                return json.load(f)
        
        # Check in temp directory
        temp_data_file = backend_dir / "temp" / "supply_chain" / f"{ticker.lower()}_data.json"
        if temp_data_file.exists():
            with open(temp_data_file, "r", encoding="utf-8") as f:
                return json.load(f)
        
        return None
        
    except Exception as e:
        print(f"❌ Error reading supply chain data file: {e}")
        return None


async def get_supply_chain_graph_html(ticker: str) -> Optional[str]:
    """
    Get supply chain graph HTML from existing file if available
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        HTML content as string or None if file not found
    """
    try:
        # Check in SCgraphs directory first
        scgraphs_html_file = scgraphs_dir / f"{ticker.lower()}_supply_chain.html"
        if scgraphs_html_file.exists():
            with open(scgraphs_html_file, "r", encoding="utf-8") as f:
                return f.read()
        
        # Check in temp directory
        temp_html_file = backend_dir / "temp" / "supply_chain" / f"{ticker.lower()}_supply_chain.html"
        if temp_html_file.exists():
            with open(temp_html_file, "r", encoding="utf-8") as f:
                return f.read()
        
        return None
        
    except Exception as e:
        print(f"❌ Error reading supply chain graph HTML: {e}")
        return None


async def fetch_and_generate_supply_chain(ticker: str) -> Tuple[Optional[Dict], Optional[str]]:
    """
    Complete pipeline: Fetch supply chain data and generate graph
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        Tuple of (data_dict, html_file_path) or (None, None) if failed
    """
    try:
        # Step 1: Fetch data
        result = await fetch_supply_chain_data_async(ticker)
        if not result:
            return None, None
        
        data, data_file = result
        
        if not data:
            return None, None
        
        # Step 2: Generate graph
        company_name = data.get("company", f"{ticker} Corporation")
        html_file = await generate_supply_chain_graph_async(data_file, ticker, company_name)
        
        return data, html_file
        
    except Exception as e:
        print(f"❌ Error in fetch_and_generate_supply_chain: {e}")
        import traceback
        traceback.print_exc()
        return None, None

