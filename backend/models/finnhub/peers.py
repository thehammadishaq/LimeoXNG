from pydantic import BaseModel, Field
from typing import List, Optional

class PeersFetchRequest(BaseModel):
    symbol: str = Field(..., description="Stock ticker symbol to fetch peers for", example="AAPL")
    grouping: Optional[str] = Field(
        "subIndustry",
        description="Grouping criteria for choosing peers. Supported values: sector, industry, subIndustry. Default: subIndustry.",
        example="industry"
    )

class PeersFetchResponse(BaseModel):
    symbol: str = Field(..., description="Stock ticker symbol")
    peers: List[str] = Field(..., description="List of peer ticker symbols")
    grouping: str = Field(..., description="Grouping criteria used for selecting peers")
    count: int = Field(..., description="Number of peers returned")

