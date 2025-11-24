from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class NewsFetchRequest(BaseModel):
    """Request model for fetching market news from Finnhub."""

    category: str = Field(
        ..., 
        description="News category. Must be one of: general, forex, crypto, merger", 
        example="general"
    )
    min_id: Optional[int] = Field(
        default=0, 
        description="Use this field to get only news after this ID. Default to 0", 
        example=0
    )
    save_to_db: bool = Field(
        True, 
        description="Whether to save the fetched news to the database"
    )


class NewsArticle(BaseModel):
    """Model for a single news article."""

    category: str = Field(..., description="News category")
    datetime: int = Field(..., description="Published time in UNIX timestamp")
    headline: str = Field(..., description="News headline")
    id: int = Field(..., description="News ID")
    image: Optional[str] = Field(None, description="Thumbnail image URL")
    related: Optional[str] = Field(None, description="Related stocks and companies")
    source: str = Field(..., description="News source")
    summary: str = Field(..., description="News summary")
    url: str = Field(..., description="URL of the original article")


class NewsFetchResponse(BaseModel):
    """Response model for news fetch endpoint."""

    category: str = Field(..., description="News category requested")
    min_id: int = Field(..., description="Minimum news ID used")
    data: List[NewsArticle] = Field(..., description="List of news articles from Finnhub")
    saved_to_db: bool = Field(..., description="Indicates if the data was saved to the database")
    record_id: Optional[str] = Field(None, description="ID of the saved record if saved to DB")
    total_articles: int = Field(..., description="Total number of articles fetched")


