from pydantic import BaseModel, Field
from typing import List, Optional


class InsiderTransactionItem(BaseModel):
    """Model for a single insider transaction from Finnhub /stock/insider-transactions."""

    name: str = Field(..., description="Insider's name")
    share: int = Field(..., description="Number of shares held after the transaction")
    change: int = Field(
        ...,
        description="Number of share changed from the last period. Positive = BUY, Negative = SELL",
    )
    filingDate: str = Field(..., description="Filing date (YYYY-MM-DD)")
    transactionDate: str = Field(..., description="Transaction date (YYYY-MM-DD)")
    transactionCode: str = Field(..., description="Transaction code (e.g., S, M, P)")
    transactionPrice: float = Field(..., description="Average transaction price")
    symbol: Optional[str] = Field(None, description="Symbol of the company")


class InsiderTransactionsFetchResponse(BaseModel):
    """Response model for insider transactions fetch endpoint."""

    symbol: str = Field(..., description="Company symbol used for the query")
    from_date: Optional[str] = Field(
        None, description="From date (YYYY-MM-DD) if provided"
    )
    to_date: Optional[str] = Field(None, description="To date (YYYY-MM-DD) if provided")
    limit: Optional[int] = Field(None, description="Limit of transactions if provided")
    data: List[InsiderTransactionItem] = Field(
        ..., description="List of insider transactions from Finnhub"
    )
    saved_to_db: bool = Field(
        ...,
        description="Indicates if the transactions were saved to the database",
    )
    total_transactions: int = Field(..., description="Total number of transactions fetched")

