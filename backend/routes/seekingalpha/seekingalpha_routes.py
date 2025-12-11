from typing import List, Optional

from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel, Field

from services.seekingalpha.analysis_service import fetch_latest_analysis_articles


router = APIRouter(prefix="/scraper", tags=["Scraper - SeekingAlpha"])


class SeekingAlphaArticle(BaseModel):
  title: str = Field(..., description="Article title")
  signal: Optional[str] = Field(None, description="Quant signal / rating badge text, e.g. 'Buy', 'Hold'")
  time: Optional[str] = Field(None, description="Published time text, e.g. 'Today, 4:47 AM'")
  tickers: List[str] = Field(default_factory=list, description="List of associated tickers")
  author: Optional[str] = Field(None, description="Author display name")
  summary: str = Field(..., description="Article summary text from the card")
  url: str = Field(..., description="Full article URL")


@router.get(
  "/seekingalpha/latest-analysis",
  response_model=List[SeekingAlphaArticle],
  status_code=status.HTTP_200_OK,
)
async def get_seekingalpha_latest_analysis() -> List[SeekingAlphaArticle]:
  """
  Scrape ALL available ANALYSIS articles from Seeking Alpha's `latest-articles` page
  and upsert them into MongoDB (de-duplicated by URL).

  Returns for each article:
  - title
  - signal (quant badge like Strong Buy / Buy / Hold / Sell, if present)
  - time (e.g. 'Today, 4:47 AM')
  - tickers (list of symbols linked in the card)
  - author (display name)
  - summary (AI-generated article summary)
  - url (full URL to the article)
  """
  try:
    items = await fetch_latest_analysis_articles(save_to_db=True)
  except Exception as e:
    print(f"❌ Error scraping Seeking Alpha analysis: {e}")
    raise HTTPException(
      status_code=status.HTTP_502_BAD_GATEWAY,
      detail="Failed to scrape Seeking Alpha analysis data. Check backend logs.",
    )

  if not items:
    raise HTTPException(
      status_code=status.HTTP_502_BAD_GATEWAY,
      detail="No analysis articles could be scraped from Seeking Alpha.",
    )

  return [SeekingAlphaArticle(**item) for item in items]



