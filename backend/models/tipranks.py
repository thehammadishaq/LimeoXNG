from beanie import Document
from datetime import datetime as dt_datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import Field


class TipRanksAnalystDocument(Document):
    """TipRanks Wall Street Analyst stored as its own document.

    De-duplicated primarily by profile_url; also stores core metadata fields.
    """

    profile_url: str = Field(..., description="Full analyst profile URL (unique per analyst)")
    name: str = Field(..., description="Analyst name")
    profile_picture_url: Optional[str] = Field(None, description="Profile picture image URL")
    rank: Optional[int] = Field(None, description="Analyst rank (#)")
    firm: Optional[str] = Field(None, description="Research firm name")
    sector: Optional[str] = Field(None, description="Sector/Industry focus")
    buy_pct: Optional[float] = Field(None, description="Buy percentage")
    hold_pct: Optional[float] = Field(None, description="Hold percentage")
    sell_pct: Optional[float] = Field(None, description="Sell percentage")
    success_rate: Optional[float] = Field(None, description="Success rate percentage")
    avg_return: Optional[float] = Field(None, description="Average return percentage")
    followers: Optional[int] = Field(None, description="Number of followers")
    created_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)
    updated_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)

    class Settings:
        name = "tipranks-analysts"
        indexes = [
            [("profile_url", 1)],  # Unique index on profile_url to prevent duplicates
            "name",
            "firm",
            "sector",
            "rank",
        ]

    def __repr__(self) -> str:
        return f"<TipRanksAnalystDocument(profile_url={self.profile_url}, name={self.name[:40]!r}...)>"

    async def touch(self) -> None:
        """Update updated_at timestamp and save."""
        self.updated_at = dt_datetime.utcnow()
        await self.save()


class TipRanksTopExpertDocument(Document):
    """TipRanks Top Expert from GetTop25Experts API.
    
    Stores complete expert data including distribution, recommendations, rank, ratings, etc.
    De-duplicated by expertId (primary) and uid (fallback).
    """

    expertId: int = Field(..., description="TipRanks expert ID (unique identifier)")
    uid: str = Field(..., description="TipRanks unique identifier (hash)")
    name: str = Field(..., description="Expert name")
    pictureUrl: Optional[str] = Field(None, description="Profile picture identifier")
    firm: Optional[str] = Field(None, description="Research firm name")
    sectorId: Optional[str] = Field(None, description="Sector ID (e.g., 'materials', 'technology')")
    sectorIdEnum: Optional[int] = Field(None, description="Sector ID enum")
    expertType: str = Field(..., description="Expert type (e.g., 'analyst')")
    expertTypeIdEnum: Optional[int] = Field(None, description="Expert type ID enum")
    
    # Distribution data
    distribution: Optional[Dict[str, int]] = Field(None, description="Buy/Hold/Sell distribution")
    
    # Recommendations data
    recommendations: Optional[Dict[str, Any]] = Field(None, description="Recommendations (total, good, ratio)")
    
    # Rank data
    rank: Optional[Dict[str, Any]] = Field(None, description="Rank information (ranked, outOf, sectorRank, starRating)")
    
    # Performance metrics
    averageReturn: Optional[float] = Field(None, description="Average return percentage")
    numUsersSubscribedToExpert: Optional[int] = Field(None, description="Number of subscribers")
    totalCount: Optional[int] = Field(None, description="Total count")
    
    # Ratings array
    ratings: Optional[List[Dict[str, Any]]] = Field(None, description="Recent ratings array")
    
    # Geo coverage
    geoCoverage: Optional[List[str]] = Field(None, description="Geographic coverage countries")
    
    # Optional fields
    insiderPosition: Optional[str] = Field(None, description="Insider position")
    hedgeFundValue: Optional[float] = Field(None, description="Hedge fund value")
    hedgeFundName: Optional[str] = Field(None, description="Hedge fund name")
    insiderCompanyName: Optional[str] = Field(None, description="Insider company name")
    expertPortfolioId: Optional[int] = Field(None, description="Expert portfolio ID")
    portfolioPerformanceScores: Optional[Dict[str, Any]] = Field(None, description="Portfolio performance scores")
    isFollowing: Optional[bool] = Field(None, description="Is following flag")
    portfolioRisk: Optional[Union[float, str]] = Field(None, description="Portfolio risk (can be number or string like 'medium', 'high', 'low')")
    holdingsCount: Optional[int] = Field(None, description="Holdings count")
    hedgeFundPortfolioGain: Optional[float] = Field(None, description="Hedge fund portfolio gain")
    portfolioName: Optional[str] = Field(None, description="Portfolio name")
    followedSince: Optional[str] = Field(None, description="Followed since date")
    expertUrlSuffix: Optional[str] = Field(None, description="Expert URL suffix")
    portfolioRiskEnum: Optional[int] = Field(None, description="Portfolio risk enum")
    portfolioBeta: Optional[float] = Field(None, description="Portfolio beta")
    sharpe: Optional[float] = Field(None, description="Sharpe ratio")
    
    # Timestamps
    created_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)
    updated_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)
    
    # API parameters (for tracking)
    expertType_param: Optional[str] = Field(None, description="API parameter: expertType")
    numExperts_param: Optional[int] = Field(None, description="API parameter: numExperts")
    period_param: Optional[str] = Field(None, description="API parameter: period")
    benchmark_param: Optional[str] = Field(None, description="API parameter: benchmark")
    country_param: Optional[str] = Field(None, description="API parameter: country")

    class Settings:
        name = "tipranks-top-experts"
        indexes = [
            [("expertId", 1)],  # Unique index on expertId to prevent duplicates
            [("uid", 1)],  # Index on uid for lookup
            "name",
            "firm",
            "sectorId",
            "expertType",
            "updated_at",
        ]

    def __repr__(self) -> str:
        return f"<TipRanksTopExpertDocument(expertId={self.expertId}, name={self.name[:40]!r}...)>"

    async def touch(self) -> None:
        """Update updated_at timestamp and save."""
        self.updated_at = dt_datetime.utcnow()
        await self.save()


class TipRanksExpertStockDocument(Document):
    """TipRanks Expert Stock from getStocks API.
    
    Stores stocks/ratings data for a specific expert.
    De-duplicated by expert_name + ticker (composite unique key).
    """

    expert_name: str = Field(..., description="Expert name in URL slug format (e.g., 'Heiko-Ihle')")
    ticker: str = Field(..., description="Stock ticker symbol (e.g., 'TSE:TRX', 'PPTA')")
    
    # Stock basic info
    name: str = Field(..., description="Stock/company name")
    isTraded: Optional[bool] = Field(None, description="Whether stock is traded")
    stockTypeId: Optional[int] = Field(None, description="Stock type ID")
    
    # Ratings counts
    ratingsCount: Optional[int] = Field(None, description="Total ratings count")
    totalRatingsCount: Optional[int] = Field(None, description="Total ratings count (alternative)")
    goodRatingsCount: Optional[int] = Field(None, description="Good ratings count")
    
    # Performance metrics
    averageReturn: Optional[float] = Field(None, description="Average return percentage")
    priceTarget: Optional[float] = Field(None, description="Price target")
    
    # Latest rating
    latestRating: Optional[Dict[str, Any]] = Field(None, description="Latest rating information")
    
    # First rating
    firstRating: Optional[Dict[str, Any]] = Field(None, description="First rating information")
    
    # Currency information
    priceTargetCurrencyCode: Optional[str] = Field(None, description="Price target currency code")
    convertedPriceTarget: Optional[float] = Field(None, description="Converted price target")
    convertedPriceTargetCurrencyCode: Optional[str] = Field(None, description="Converted price target currency code")
    priceTargetCurrencyId: Optional[int] = Field(None, description="Price target currency ID")
    marketCountryId: Optional[int] = Field(None, description="Market country ID")
    stockCurrencyTypeID: Optional[int] = Field(None, description="Stock currency type ID")
    
    # API parameters (for tracking)
    period_param: Optional[str] = Field(None, description="API parameter: period")
    benchmark_param: Optional[str] = Field(None, description="API parameter: benchmark")
    
    # Timestamps
    created_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)
    updated_at: dt_datetime = Field(default_factory=dt_datetime.utcnow)

    class Settings:
        name = "tipranks-expert-stocks"
        indexes = [
            [("expert_name", 1), ("ticker", 1)],  # Composite unique index to prevent duplicates
            "expert_name",
            "ticker",
            "name",
            "updated_at",
        ]

    def __repr__(self) -> str:
        return f"<TipRanksExpertStockDocument(expert_name={self.expert_name}, ticker={self.ticker})>"

    async def touch(self) -> None:
        """Update updated_at timestamp and save."""
        self.updated_at = dt_datetime.utcnow()
        await self.save()

