"""
Supply Chain Controller
Controller for supply chain graph operations
"""
from services.supply_chain_service import (
    fetch_and_generate_supply_chain,
    get_supply_chain_data_from_file,
    get_supply_chain_graph_html,
    generate_supply_chain_graph_async
)
from services.company_profile_service import CompanyProfileService
from schemas.supply_chain import SupplyChainFetchRequest, SupplyChainFetchResponse, SupplyChainData
from schemas.company_profile import CompanyProfileCreate, CompanyProfileUpdate
from fastapi import HTTPException, status
from typing import Optional, Dict, Any, Tuple
import os


class SupplyChainController:
    """Controller for supply chain operations"""
    
    async def fetch_supply_chain_data(self, ticker: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Fetch supply chain data and generate graph
        
        Args:
            ticker: Stock ticker symbol (e.g., TSLA, AAPL)
            
        Returns:
            Tuple of (data_dict, html_file_path) or (None, None) if failed
        """
        try:
            data, html_file = await fetch_and_generate_supply_chain(ticker.upper())
            return data, html_file
        except Exception as e:
            print(f"❌ Error fetching supply chain data: {e}")
            return None, None


# Router functions
async def fetch_supply_chain_post(request: SupplyChainFetchRequest) -> SupplyChainFetchResponse:
    """POST endpoint handler for fetching supply chain data"""
    ticker = request.ticker.upper()
    save_to_db = request.save_to_db
    
    print(f"Received request to fetch supply chain data for {ticker} (POST)")
    
    try:
        controller = SupplyChainController()
        data, html_file = await controller.fetch_supply_chain_data(ticker)
        
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Failed to fetch supply chain data for {ticker}. Make sure you're logged into Gemini and have internet connection."
            )
        
        # Read HTML content if file exists
        html_content = None
        if html_file and os.path.exists(html_file):
            try:
                with open(html_file, "r", encoding="utf-8") as f:
                    html_content = f.read()
            except Exception as e:
                print(f"⚠️ Warning: Could not read HTML file: {e}")
        
        # Convert data to SupplyChainData model
        supply_chain_data = SupplyChainData(
            company=data.get("company", f"{ticker} Corporation"),
            company_logo=data.get("company_logo"),
            suppliers=data.get("suppliers", []),
            customers=data.get("customers", []),
            manufacturing_partners=data.get("manufacturing_partners", []),
            subcontractors=data.get("subcontractors", []),
            investments=data.get("investments", []),
            risk_map=data.get("risk_map"),
            graph_network=data.get("graph_network"),
            sources=data.get("sources")
        )
        
        profile_id = None
        if save_to_db:
            company_profile_service = CompanyProfileService()
            existing_profile = await company_profile_service.get_by_ticker(ticker)
            
            if existing_profile:
                existing_data = existing_profile.data or {}
                updated_data = {
                    **existing_data,
                    "SupplyChain": data  # Save supply chain data
                }
                updated_profile = await company_profile_service.update_profile(
                    str(existing_profile.id),
                    CompanyProfileUpdate(data=updated_data)
                )
                profile_id = str(updated_profile.id) if updated_profile else None
                print(f"Updated existing profile for {ticker} in DB with Supply Chain data: {profile_id}")
            else:
                new_profile = await company_profile_service.create_profile(
                    CompanyProfileCreate(ticker=ticker, data={"SupplyChain": data})
                )
                profile_id = str(new_profile.id) if new_profile else None
                print(f"Created new profile for {ticker} in DB with Supply Chain data: {profile_id}")
        
        return SupplyChainFetchResponse(
            ticker=ticker,
            data=supply_chain_data,
            graph_html=html_content,
            saved_to_db=save_to_db,
            profile_id=profile_id
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching supply chain data: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching supply chain data: {str(e)}"
        )


async def fetch_supply_chain_get(ticker: str, save_to_db: bool = True) -> SupplyChainFetchResponse:
    """GET endpoint handler for fetching supply chain data"""
    ticker = ticker.upper()
    
    print(f"Received request to fetch supply chain data for {ticker} (GET)")
    
    try:
        controller = SupplyChainController()
        data, html_file = await controller.fetch_supply_chain_data(ticker)
        
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Failed to fetch supply chain data for {ticker}. Make sure you're logged into Gemini and have internet connection."
            )
        
        # Read HTML content if file exists
        html_content = None
        if html_file and os.path.exists(html_file):
            try:
                with open(html_file, "r", encoding="utf-8") as f:
                    html_content = f.read()
            except Exception as e:
                print(f"⚠️ Warning: Could not read HTML file: {e}")
        
        # Convert data to SupplyChainData model
        supply_chain_data = SupplyChainData(
            company=data.get("company", f"{ticker} Corporation"),
            company_logo=data.get("company_logo"),
            suppliers=data.get("suppliers", []),
            customers=data.get("customers", []),
            manufacturing_partners=data.get("manufacturing_partners", []),
            subcontractors=data.get("subcontractors", []),
            investments=data.get("investments", []),
            risk_map=data.get("risk_map"),
            graph_network=data.get("graph_network"),
            sources=data.get("sources")
        )
        
        profile_id = None
        if save_to_db:
            company_profile_service = CompanyProfileService()
            existing_profile = await company_profile_service.get_by_ticker(ticker)
            
            if existing_profile:
                existing_data = existing_profile.data or {}
                updated_data = {
                    **existing_data,
                    "SupplyChain": data
                }
                updated_profile = await company_profile_service.update_profile(
                    str(existing_profile.id),
                    CompanyProfileUpdate(data=updated_data)
                )
                profile_id = str(updated_profile.id) if updated_profile else None
                print(f"Updated existing profile for {ticker} in DB with Supply Chain data: {profile_id}")
            else:
                new_profile = await company_profile_service.create_profile(
                    CompanyProfileCreate(ticker=ticker, data={"SupplyChain": data})
                )
                profile_id = str(new_profile.id) if new_profile else None
                print(f"Created new profile for {ticker} in DB with Supply Chain data: {profile_id}")
        
        return SupplyChainFetchResponse(
            ticker=ticker,
            data=supply_chain_data,
            graph_html=html_content,
            saved_to_db=save_to_db,
            profile_id=profile_id
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching supply chain data: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching supply chain data: {str(e)}"
        )

