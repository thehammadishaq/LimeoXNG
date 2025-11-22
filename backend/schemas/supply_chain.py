"""
Supply Chain Graph Schemas
Pydantic models for supply chain graph API requests and responses
"""
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List


class SupplyChainFetchRequest(BaseModel):
    """Request model for fetching supply chain data"""
    ticker: str = Field(..., description="Stock ticker symbol to fetch supply chain data for", example="TSLA")
    save_to_db: bool = Field(True, description="Whether to save the fetched data to the database")


class SupplyChainEntity(BaseModel):
    """Model for a supply chain entity (supplier, customer, etc.)"""
    name: str = Field(..., description="Entity name")
    type: Optional[str] = Field(None, description="Type of entity")
    region: Optional[str] = Field(None, description="Region/Country")
    notes: Optional[str] = Field(None, description="Detailed notes about the relationship")
    source: Optional[str] = Field(None, description="URL or reference for this information")
    logo: Optional[str] = Field(None, description="Logo URL")


class SupplyChainRisk(BaseModel):
    """Model for supply chain risk"""
    risk: str = Field(..., description="Risk description")
    impact: str = Field(..., description="Risk impact (High/Medium/Low)")
    notes: Optional[str] = Field(None, description="Risk details")


class SupplyChainData(BaseModel):
    """Model for complete supply chain data"""
    company: str = Field(..., description="Company name")
    company_logo: Optional[str] = Field(None, description="Company logo URL")
    suppliers: List[SupplyChainEntity] = Field(default_factory=list, description="List of suppliers")
    customers: List[SupplyChainEntity] = Field(default_factory=list, description="List of customers")
    manufacturing_partners: List[SupplyChainEntity] = Field(default_factory=list, description="List of manufacturing partners")
    subcontractors: List[SupplyChainEntity] = Field(default_factory=list, description="List of subcontractors")
    investments: List[SupplyChainEntity] = Field(default_factory=list, description="List of investments")
    risk_map: Optional[Dict[str, List[SupplyChainRisk]]] = Field(None, description="Risk analysis map")
    graph_network: Optional[Dict[str, Any]] = Field(None, description="Graph network structure")
    sources: Optional[Dict[str, List[str]]] = Field(None, description="Sources and references")


class SupplyChainFetchResponse(BaseModel):
    """Response model for supply chain data fetch"""
    ticker: str = Field(..., description="Stock ticker symbol")
    data: SupplyChainData = Field(..., description="Supply chain data")
    graph_html: Optional[str] = Field(None, description="Generated HTML graph content")
    saved_to_db: bool = Field(..., description="Indicates if the data was saved to the database")
    profile_id: Optional[str] = Field(None, description="ID of the saved profile if saved to DB")


class SupplyChainGraphRequest(BaseModel):
    """Request model for generating graph from existing data"""
    ticker: str = Field(..., description="Stock ticker symbol")
    data_file: Optional[str] = Field(None, description="Path to existing data file (optional)")

