from pydantic import BaseModel, Field
from typing import List, Optional


class CompanyNewsArticle(BaseModel):
    """Model for a single company news article from Finnhub /company-news."""

    category: str = Field(..., description="News category")
    datetime: int = Field(..., description="Published time in UNIX timestamp")
    headline: str = Field(..., description="News headline")
    id: int = Field(..., description="News ID")
    image: Optional[str] = Field(None, description="Thumbnail image URL")
    related: Optional[str] = Field(
        None, description="Related stocks and companies mentioned in the article"
    )
    source: str = Field(..., description="News source")
    summary: str = Field(..., description="News summary")
    url: str = Field(..., description="URL of the original article")


class CompanyNewsFetchResponse(BaseModel):
    """Response model for company news fetch endpoint."""

    symbol: str = Field(..., description="Company symbol used for the query")
    date_from: str = Field(..., description="From date (YYYY-MM-DD)")
    date_to: str = Field(..., description="To date (YYYY-MM-DD)")
    data: List[CompanyNewsArticle] = Field(
        ..., description="List of company news articles from Finnhub"
    )
    saved_to_db: bool = Field(
        ..., description="Indicates if the articles were saved to the database"
    )
    total_articles: int = Field(..., description="Total number of articles fetched")


