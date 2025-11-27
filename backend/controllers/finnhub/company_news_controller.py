from datetime import date
from fastapi import HTTPException, status
from typing import Optional, List, Dict

from services.finnhub.company_news_service import get_company_news
from models.finnhub.company_news import (
    CompanyNewsFetchResponse,
    CompanyNewsArticle,
)
from services.news_service import NewsService


class CompanyNewsController:
    """Controller for Company News operations."""

    async def fetch_company_news(
        self, symbol: str, from_date: date, to_date: date
    ):  # -> Optional[List[Dict]]
        """
        Fetch company news from Finnhub /company-news.
        """
        try:
            data = await get_company_news(symbol, from_date, to_date)
            return data
        except Exception as e:
            print(f"❌ Error fetching company news from Finnhub: {e}")
            return None


async def fetch_company_news_get(
    symbol: str, from_date: date, to_date: date, save_to_db: bool = True
) -> CompanyNewsFetchResponse:
    symbol_upper = symbol.upper().strip()

    print(
        f"Received request to fetch company news from Finnhub (GET), symbol={symbol_upper}, from={from_date}, to={to_date}"
    )

    try:
        controller = CompanyNewsController()
        news_data = await controller.fetch_company_news(symbol_upper, from_date, to_date)

        if not news_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No company news found for symbol '{symbol_upper}' "
                    f"between {from_date.isoformat()} and {to_date.isoformat()} from Finnhub."
                ),
            )

        print(f"💾 save_to_db parameter: {save_to_db}")
        if save_to_db:
            print(
                f"💾 Attempting to save company news for {symbol_upper} to database (per-article, category='company-news')..."
            )
            try:
                # Use NewsService to upsert articles into NewsArticleDocument with category 'company-news'
                news_service = NewsService()
                saved_count = await news_service.save_articles_only(
                    "company-news", news_data
                )
                print(
                    f"✅ Upserted {saved_count} company news articles into NewsArticleDocument collection for symbol {symbol_upper}"
                )
            except Exception as db_error:
                print(
                    f"❌ Error saving company news to database for {symbol_upper}: {db_error}"
                )
                print(f"   Error type: {type(db_error).__name__}")
                import traceback

                print(f"   Traceback: {traceback.format_exc()}")
        else:
            print(
                f"⏭️ Skipping database save for company news of {symbol_upper} (save_to_db=False)"
            )

        # Convert to CompanyNewsArticle models for response
        articles: List[CompanyNewsArticle] = []
        for article in news_data:
            try:
                articles.append(CompanyNewsArticle(**article))
            except Exception as e:
                print(f"⚠️ Error parsing company news article: {e}")
                # Fallback: map fields manually with safe defaults
                articles.append(
                    CompanyNewsArticle(
                        category=article.get("category", "company news"),
                        datetime=article.get("datetime", 0),
                        headline=article.get("headline", ""),
                        id=article.get("id", 0),
                        image=article.get("image"),
                        related=article.get("related"),
                        source=article.get("source", ""),
                        summary=article.get("summary", ""),
                        url=article.get("url", ""),
                    )
                )

        return CompanyNewsFetchResponse(
            symbol=symbol_upper,
            date_from=from_date.isoformat(),
            date_to=to_date.isoformat(),
            data=articles,
            saved_to_db=save_to_db,
            total_articles=len(articles),
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in company news controller for symbol {symbol_upper}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching company news from Finnhub: {e}",
        )



