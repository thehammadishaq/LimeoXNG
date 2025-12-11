"""
Seeking Alpha Analysis Scraper Service

Scrapes latest ANALYSIS articles from:
  https://seekingalpha.com/latest-articles

Features:
- Playwright with persistent session (to reuse cookies, reduce bot suspicion)
- Simple human-like behaviour (random waits and mouse moves)
- Extracts: title, signal, time, tickers, author, summary, full article URL
"""

import os
import random
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import re

import asyncio
from playwright.async_api import async_playwright
from models.seekingalpha import SeekingAlphaArticleDocument


# ---------- CONFIG ----------
# This file lives in backend/services/seekingalpha/, so backend root is three levels up
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
SESSION_PATH = os.path.join(BACKEND_ROOT, "x_browser_session_seekingalpha_analysis")
HEADLESS = True  # Enabled for faster performance. Set False for debugging.
CHROME_PATH: Optional[str] = None
MOUSE_STEP_MS = 6
BASE_URL = "https://seekingalpha.com"
LATEST_ANALYSIS_URL = f"{BASE_URL}/latest-articles"
# ----------------------------


# ---------- Human-like behavior ----------
def rand(a: float, b: float) -> float:
    return random.uniform(a, b)


async def async_human_wait(a: float = 0.3, b: float = 1.2) -> None:
    await asyncio.sleep(rand(a, b))


def bezier_interp(p0, p1, p2, p3, t: float):
    x = ((1 - t) ** 3) * p0[0] + 3 * ((1 - t) ** 2) * t * p1[0] + 3 * (1 - t) * (t ** 2) * p2[0] + (t ** 3) * p3[0]
    y = ((1 - t) ** 3) * p0[1] + 3 * ((1 - t) ** 2) * t * p1[1] + 3 * (1 - t) * (t ** 2) * p2[1] + (t ** 3) * p3[1]
    return x, y


async def human_move_mouse(mouse, start, end, steps: int = 30) -> None:
    """Smooth curved mouse movement using Bézier interpolation."""
    dx, dy = end[0] - start[0], end[1] - start[1]
    p0 = start
    p1 = (
        start[0] + dx * rand(0.2, 0.4) + rand(-50, 50),
        start[1] + dy * rand(0.2, 0.4) + rand(-50, 50),
    )
    p2 = (
        start[0] + dx * rand(0.6, 0.8) + rand(-50, 50),
        start[1] + dy * rand(0.6, 0.8) + rand(-50, 50),
    )
    p3 = end

    for i in range(steps):
        t = i / float(steps - 1)
        x, y = bezier_interp(p0, p1, p2, p3, t)
        await mouse.move(x + rand(-1.2, 1.2), y + rand(-1.2, 1.2))
        await async_human_wait(MOUSE_STEP_MS / 1000.0, MOUSE_STEP_MS / 1000.0)


async def human_click(page, el) -> None:
    """Perform a realistic mouse click on an element."""
    try:
        await el.scroll_into_view_if_needed(timeout=4000)
    except Exception:
        pass
    box = await el.bounding_box()
    if not box:
        return
    start = (rand(100, 400), rand(100, 400))
    target = (
        box["x"] + rand(5, max(6.0, box["width"] - 5)),
        box["y"] + rand(5, max(6.0, box["height"] - 5)),
    )
    await human_move_mouse(page.mouse, start, target, steps=random.randint(25, 45))
    await async_human_wait(0.05, 0.3)
    await page.mouse.down()
    await async_human_wait(0.02, 0.08)
    await page.mouse.up()


def parse_published_date(time_str: Optional[str]) -> Optional[datetime]:
    """
    Parse time string from Seeking Alpha and convert to actual datetime.
    Handles formats like:
    - "Today, 12:13 AM" -> current date with that time
    - "Yesterday, 11:48 PM" -> previous date with that time
    - "Jan 15, 2025, 10:30 AM" -> parsed date
    """
    if not time_str:
        return None
    
    time_str = time_str.strip()
    now = datetime.now()
    
    # Handle "Today, HH:MM AM/PM"
    if time_str.lower().startswith("today"):
        time_match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM)', time_str, re.IGNORECASE)
        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2))
            am_pm = time_match.group(3).upper()
            
            if am_pm == "PM" and hour != 12:
                hour += 12
            elif am_pm == "AM" and hour == 12:
                hour = 0
            
            return now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    # Handle "Yesterday, HH:MM AM/PM"
    elif time_str.lower().startswith("yesterday"):
        time_match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM)', time_str, re.IGNORECASE)
        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2))
            am_pm = time_match.group(3).upper()
            
            if am_pm == "PM" and hour != 12:
                hour += 12
            elif am_pm == "AM" and hour == 12:
                hour = 0
            
            yesterday = now - timedelta(days=1)
            return yesterday.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    # Handle date formats like "Jan 15, 2025, 10:30 AM"
    # Try to parse common date formats
    date_formats = [
        "%b %d, %Y, %I:%M %p",  # "Jan 15, 2025, 10:30 AM"
        "%B %d, %Y, %I:%M %p",  # "January 15, 2025, 10:30 AM"
        "%m/%d/%Y, %I:%M %p",   # "01/15/2025, 10:30 AM"
        "%Y-%m-%d %I:%M %p",    # "2025-01-15 10:30 AM"
    ]
    
    for fmt in date_formats:
        try:
            return datetime.strptime(time_str, fmt)
        except ValueError:
            continue
    
    # If no format matches, return None
    return None


async def _upsert_articles_to_db(articles: List[Dict[str, Any]]) -> int:
    """Bulk insert or update Seeking Alpha articles in MongoDB, avoiding duplicates by URL."""
    if not articles:
        return 0

    # Filter out articles without URLs
    valid_articles = [a for a in articles if a.get("url")]
    if not valid_articles:
        return 0

    # Get all existing URLs in one query (bulk lookup)
    urls = [a["url"] for a in valid_articles]
    # Use MongoDB $in operator with dictionary query syntax
    existing_docs = await SeekingAlphaArticleDocument.find(
        {"url": {"$in": urls}}
    ).to_list()
    existing_urls = {doc.url: doc for doc in existing_docs}

    # Separate into updates and inserts
    to_update_tasks = []
    to_insert = []

    for article in valid_articles:
        url = article["url"]
        if url in existing_urls:
            # Update existing (prepare for parallel execution)
            doc = existing_urls[url]
            doc.title = article.get("title", doc.title)
            doc.signal = article.get("signal", doc.signal)
            time_str = article.get("time", doc.time)
            doc.time = time_str
            # Parse and update published_date if time changed
            if time_str:
                doc.published_date = parse_published_date(time_str)
            doc.tickers = article.get("tickers", doc.tickers or [])
            doc.author = article.get("author", doc.author)
            doc.summary = article.get("summary", doc.summary)
            # Use save() to persist all changes, not just touch()
            to_update_tasks.append(doc.save())
        else:
            # Insert new
            time_str = article.get("time")
            published_date = parse_published_date(time_str)
            doc = SeekingAlphaArticleDocument(
                url=url,
                title=article.get("title", ""),
                signal=article.get("signal"),
                time=time_str,
                published_date=published_date,
                tickers=article.get("tickers") or [],
                author=article.get("author"),
                summary=article.get("summary", ""),
            )
            to_insert.append(doc)

    # Bulk operations: parallel updates + bulk insert
    if to_update_tasks:
        await asyncio.gather(*to_update_tasks)
    if to_insert:
        # Insert one by one to handle potential duplicate key errors gracefully
        for doc in to_insert:
            try:
                await doc.insert()
            except Exception as e:
                # If duplicate key error, try to update instead
                if "duplicate" in str(e).lower() or "E11000" in str(e):
                    existing = await SeekingAlphaArticleDocument.find_one(
                        SeekingAlphaArticleDocument.url == doc.url
                    )
                    if existing:
                        # Update existing document
                        existing.title = doc.title
                        existing.signal = doc.signal
                        existing.time = doc.time
                        existing.published_date = doc.published_date
                        existing.tickers = doc.tickers
                        existing.author = doc.author
                        existing.summary = doc.summary
                        await existing.save()
                else:
                    print(f"⚠️ Error inserting article {doc.url}: {e}")

    return len(valid_articles)


# ---------- Core scraper ----------
async def _fetch_latest_analysis_async(save_to_db: bool = True) -> List[Dict[str, Any]]:
    """Internal async function to scrape Seeking Alpha latest analysis articles."""
    os.makedirs(SESSION_PATH, exist_ok=True)

    articles: List[Dict[str, Any]] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=SESSION_PATH,
            headless=HEADLESS,
            executable_path=CHROME_PATH if CHROME_PATH else None,
            args=["--start-maximized", "--disable-blink-features=AutomationControlled"],
        )
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1366, "height": 768})

        print("🌐 Opening Seeking Alpha latest articles...")
        await page.goto(LATEST_ANALYSIS_URL, timeout=60000, wait_until="networkidle")
        
        # Minimal wait for page to stabilize
        await asyncio.sleep(0.5)

        # Best-effort cookie/consent dismissal (if present) - simplified
        try:
            consent_button = await page.query_selector("button:has-text('Accept')")  # type: ignore[arg-type]
            if consent_button:
                await consent_button.click(timeout=5000)
                await asyncio.sleep(0.3)
        except Exception:
            pass

        # Wait for article list
        try:
            await page.wait_for_selector(
                "section[data-test-id='cards-container'] [data-test-id='post-list-item']",
                timeout=30000,
            )
        except Exception:
            print("⚠️ Failed to find analysis cards on Seeking Alpha.")
            await browser.close()
            return []

        # Extract all article data in ONE JavaScript pass (much faster!)
        print("📊 Extracting all article data in batch...")
        articles_data = await page.evaluate(
            """
            () => {
                const BASE_URL = 'https://seekingalpha.com';
                const nodes = document.querySelectorAll(
                    "section[data-test-id='cards-container'] [data-test-id='post-list-item']"
                );
                const results = [];
                
                for (const node of nodes) {
                    try {
                        // Title and link
                        const titleEl = node.querySelector("a[data-test-id='item-title']");
                        const title = titleEl ? titleEl.innerText.trim() : '';
                        if (!title) continue;
                        
                        const href = titleEl ? titleEl.getAttribute('href') : null;
                        const url = href && href.startsWith('/') 
                            ? BASE_URL + href 
                            : (href || '');
                        
                        // Signal / quant badge
                        const signalEl = node.querySelector("[data-test-id='quant-badge']");
                        const signal = signalEl ? signalEl.innerText.trim() : null;
                        
                        // Time
                        const timeEl = node.querySelector("span[data-test-id='post-list-date']");
                        const publishedTime = timeEl ? timeEl.innerText.trim() : null;
                        
                        // Tickers (can be multiple)
                        const tickerEls = node.querySelectorAll("a[data-test-id='ticker-link']");
                        const tickers = [];
                        for (const tEl of tickerEls) {
                            const txt = tEl.innerText.trim();
                            if (txt) tickers.push(txt);
                        }
                        
                        // Author
                        const authorEl = node.querySelector("a[data-test-id='author-nick']");
                        const author = authorEl ? authorEl.innerText.trim() : null;
                        
                        // Summary (AI generated)
                        const summaryEl = node.querySelector("ul[data-test-id='item-content'] li");
                        const summary = summaryEl ? summaryEl.innerText.trim() : '';
                        
                        results.push({
                            title: title,
                            signal: signal,
                            time: publishedTime,
                            tickers: tickers,
                            author: author,
                            summary: summary,
                            url: url
                        });
                    } catch (e) {
                        console.warn('Error parsing article card:', e);
                        continue;
                    }
                }
                
                return results;
            }
            """
        )

        print(f"✅ Extracted {len(articles_data)} articles in batch!")
        articles = articles_data

        await browser.close()

        if save_to_db and articles:
            await _upsert_articles_to_db(articles)

        return articles


async def fetch_latest_analysis_articles(save_to_db: bool = True) -> List[Dict[str, Any]]:
    """
    Public service function used by FastAPI routes.
    Returns a list of articles with:
    - title, signal, time, tickers, author, summary, url

    Scrapes ALL available articles on the page (no limit).

    Also upserts them into MongoDB (no duplicates) when save_to_db=True.
    """
    return await _fetch_latest_analysis_async(save_to_db=save_to_db)


