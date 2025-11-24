from fastapi import HTTPException, status
from typing import Optional, List, Dict

from services.finnhub.news_service import get_market_news
from models.finnhub.news import NewsFetchRequest, NewsFetchResponse, NewsArticle
from schemas.news import NewsCreate, NewsUpdate
from services.news_service import NewsService


class NewsController:
    """Controller for Market News operations."""

    async def fetch_market_news(self, category: str, min_id: int = 0) -> Optional[List[Dict]]:
        """
        Fetch market news from Finnhub.
        """
        try:
            data = await get_market_news(category.lower(), min_id)
            return data
        except Exception as e:
            print(f"❌ Error fetching market news from Finnhub: {e}")
            return None


async def fetch_market_news_get(category: str, min_id: int = 0, save_to_db: bool = True):
    category_lower = category.lower()
    
    print(f"Received request to fetch market news from Finnhub (GET), category={category_lower}, min_id={min_id}")

    try:
        controller = NewsController()
        news_data = await controller.fetch_market_news(category_lower, min_id)

        if not news_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No market news found for category '{category_lower}' from Finnhub.",
            )

        record_id = None
        print(f"💾 save_to_db parameter: {save_to_db}")
        if save_to_db:
            print(f"💾 Attempting to save market news for category {category_lower} to database...")
            try:
                # Extract actual news data (it's already a list)
                articles_data = news_data if isinstance(news_data, list) else []

                if not articles_data:
                    print(f"⚠️ No news articles extracted for category {category_lower}")
                    articles_data = []

                print(f"📦 Extracted {len(articles_data)} news articles")

                news_service = NewsService()
                existing_record = await news_service.get_by_category_and_min_id(category_lower, min_id)
                print(f"🔍 Existing news check for category {category_lower}, min_id={min_id}: {'Found' if existing_record else 'Not found'}")

                if existing_record:
                    print(f"📝 Updating existing news for category {category_lower} with new data...")
                    updated_record = await news_service.update_record(
                        str(existing_record.id),
                        NewsUpdate(data=articles_data, min_id=min_id),
                    )
                    record_id = str(updated_record.id) if updated_record else None
                    print(f"✅ Updated existing news for category {category_lower} in DB: {record_id}")
                else:
                    print(f"📝 Creating new news record for category {category_lower}...")
                    new_record = await news_service.create_record(
                        NewsCreate(category=category_lower, min_id=min_id, data=articles_data)
                    )
                    record_id = str(new_record.id) if new_record else None
                    print(f"✅ Created new news record for category {category_lower} in DB: {record_id}")
            except Exception as db_error:
                print(f"❌ Error saving market news to database for category {category_lower}: {db_error}")
                print(f"   Error type: {type(db_error).__name__}")
                import traceback

                print(f"   Traceback: {traceback.format_exc()}")
        else:
            print(f"⏭️ Skipping database save for category {category_lower} (save_to_db=False)")

        # Convert to NewsArticle models for response
        news_articles = []
        for article in news_data:
            try:
                news_articles.append(NewsArticle(**article))
            except Exception as e:
                print(f"⚠️ Error parsing article: {e}")
                # Include article even if parsing fails
                news_articles.append(NewsArticle(
                    category=article.get("category", category_lower),
                    datetime=article.get("datetime", 0),
                    headline=article.get("headline", ""),
                    id=article.get("id", 0),
                    image=article.get("image"),
                    related=article.get("related"),
                    source=article.get("source", ""),
                    summary=article.get("summary", ""),
                    url=article.get("url", "")
                ))

        return NewsFetchResponse(
            category=category_lower,
            min_id=min_id,
            data=news_articles,
            saved_to_db=save_to_db,
            record_id=record_id,
            total_articles=len(news_articles),
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in market news controller for category {category_lower}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching market news from Finnhub: {e}",
        )


