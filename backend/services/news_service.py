"""
Market News Service
Service layer for market news business logic (MongoDB)
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from models.news import MarketNews, NewsArticleDocument
from schemas.news import NewsCreate, NewsUpdate


class NewsService:
    """Service for market news operations.

    - Keeps an aggregated snapshot in `MarketNews` per (category, min_id)
    - Stores each news as its own document in `NewsArticleDocument`
    - Appends new news on updates and avoids duplicates by Finnhub `id`
    """

    async def _upsert_articles(self, category: str, articles: List[Dict[str, Any]]) -> None:
        """Insert or update individual NewsArticleDocument for each Finnhub news article."""
        category_lower = category.lower()

        for article in articles:
            finnhub_id = article.get("id")
            if finnhub_id is None:
                continue

            ts = article.get("datetime", 0)
            try:
                published_at = datetime.utcfromtimestamp(ts) if ts else datetime.utcnow()
            except Exception:
                published_at = datetime.utcnow()

            existing = await NewsArticleDocument.find_one(
                NewsArticleDocument.category == category_lower,
                NewsArticleDocument.finnhub_id == finnhub_id,
            )

            if existing:
                existing.headline = article.get("headline", existing.headline)
                existing.source = article.get("source", existing.source)
                existing.summary = article.get("summary", existing.summary)
                existing.url = article.get("url", existing.url)
                existing.image = article.get("image", existing.image)
                existing.related = article.get("related", existing.related)
                existing.published_at = published_at
                existing.raw = article
                await existing.touch()
            else:
                doc = NewsArticleDocument(
                    category=category_lower,
                    finnhub_id=finnhub_id,
                    published_at=published_at,
                    headline=article.get("headline", ""),
                    source=article.get("source", ""),
                    summary=article.get("summary"),
                    url=article.get("url", ""),
                    image=article.get("image"),
                    related=article.get("related"),
                    raw=article,
                )
                await doc.insert()

    async def save_articles_only(self, category: str, articles: List[Dict[str, Any]]) -> int:
        """Public helper to only persist per-article documents (no category snapshot).

        Returns the number of articles processed.
        """
        await self._upsert_articles(category, articles)
        return len(articles)

    async def create_record(self, record_data: NewsCreate) -> MarketNews:
        """Create a new market news record.

        If a record for the category and min_id already exists, it will be updated instead.
        Also appends/upserts individual article documents.
        """
        # Always upsert per-article documents
        await self._upsert_articles(record_data.category, record_data.data)

        existing = await self.get_by_category_and_min_id(record_data.category, record_data.min_id)
        if existing:
            return await self.update_record(
                str(existing.id),
                NewsUpdate(data=record_data.data, min_id=record_data.min_id),
            )

        db_record = MarketNews(
            category=record_data.category.lower(),
            min_id=record_data.min_id,
            data=record_data.data,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await db_record.insert()
        return db_record

    async def get_by_id(self, record_id: str) -> Optional[MarketNews]:
        """Get market news record by ID."""
        try:
            return await MarketNews.get(record_id)
        except Exception:
            return None

    async def get_by_category_and_min_id(self, category: str, min_id: int = 0) -> Optional[MarketNews]:
        """Get market news record by category and min_id."""
        return await MarketNews.find_one(
            MarketNews.category == category.lower(),
            MarketNews.min_id == min_id
        )

    async def get_by_category(self, category: str, skip: int = 0, limit: int = 100) -> List[MarketNews]:
        """Get all market news records for a category with pagination."""
        return await MarketNews.find(
            MarketNews.category == category.lower()
        ).skip(skip).limit(limit).to_list()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[MarketNews]:
        """Get all market news records with pagination."""
        return await MarketNews.find_all().skip(skip).limit(limit).to_list()

    async def get_count(self) -> int:
        """Get total count of market news records."""
        return await MarketNews.find_all().count()

    async def get_count_by_category(self, category: str) -> int:
        """Get count of market news records for a category."""
        return await MarketNews.find(
            MarketNews.category == category.lower()
        ).count()

    async def update_record(
        self,
        record_id: str,
        record_data: NewsUpdate,
    ) -> Optional[MarketNews]:
        """Update market news record.

        - Appends new news into aggregated `data` array.
        - Removes duplicates based on Finnhub `id` field.
        - Upserts each article into `NewsArticleDocument`.
        """
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return None

        if record_data.data is not None:
            # Upsert per-article docs
            await self._upsert_articles(db_record.category, record_data.data)

            # Append with de-duplication by id
            existing_articles = db_record.data or []
            combined_by_id: Dict[Any, Dict[str, Any]] = {}

            for article in existing_articles:
                article_id = article.get("id")
                combined_by_id[article_id] = article

            for article in record_data.data:
                article_id = article.get("id")
                combined_by_id[article_id] = article

            db_record.data = list(combined_by_id.values())

        if record_data.min_id is not None:
            db_record.min_id = record_data.min_id

        db_record.updated_at = datetime.utcnow()
        await db_record.save()

        return db_record

    async def delete_record(self, record_id: str) -> bool:
        """Delete market news record."""
        db_record = await self.get_by_id(record_id)
        if not db_record:
            return False

        await db_record.delete()
        return True


