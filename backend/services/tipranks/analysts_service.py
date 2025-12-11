"""
TipRanks Analysts Scraper Service

Scrapes Wall Street Analysts data from:
  https://www.tipranks.com/experts/analysts

Features:
- Playwright with persistent session (to reuse cookies, reduce bot suspicion)
- Human-like behaviour (random waits and mouse moves)
- Extracts: rank, name, profile_picture_url, firm, sector, buy_pct, hold_pct, sell_pct, success_rate, avg_return, followers, profile_url
"""

import os
import random
import re
from typing import List, Dict, Any, Optional
import asyncio
from playwright.async_api import async_playwright, BrowserContext, Page, Playwright
from models.tipranks import TipRanksAnalystDocument


# ---------- CONFIG ----------
# This file lives in backend/services/tipranks/, so backend root is three levels up
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
SESSION_PATH = os.path.join(BACKEND_ROOT, "x_browser_session_tipranks_analysts")
HEADLESS = False  # Set to True for headless mode (required on Linux servers without X server)
CHROME_PATH: Optional[str] = None
MOUSE_STEP_MS = 6
BASE_URL = "https://www.tipranks.com"
ANALYSTS_URL = f"{BASE_URL}/experts/analysts"

# Anti-detection User-Agent (real Chrome browser)
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Enhanced browser args for stealth
STEALTH_ARGS = [
    "--start-maximized",
    "--disable-blink-features=AutomationControlled",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-site-isolation-trials",
    "--disable-infobars",
    "--disable-notifications",
    "--disable-popup-blocking",
    "--disable-translate",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-features=TranslateUI",
    "--disable-ipc-flooding-protection",
    "--window-size=1920,1080",
]
# ----------------------------


# ---------- Long-lived browser/session state ----------
# Single Playwright instance & persistent browser context reused across scrapes
_playwright: Optional[Playwright] = None
_browser_context: Optional[BrowserContext] = None
_page: Optional[Page] = None

# Lock to ensure safe creation of the shared browser/page
_browser_lock: asyncio.Lock = asyncio.Lock()

# Lock to ensure only one scrape uses the shared page at a time
_scrape_lock: asyncio.Lock = asyncio.Lock()


async def _get_or_create_page() -> Page:
    """
    Get the shared Page instance, creating the Playwright instance and
    persistent browser context on first use.

    This gives us true session reuse across multiple API calls.
    """
    global _playwright, _browser_context, _page

    async with _browser_lock:
        if _page is not None:
            return _page

        if _playwright is None:
            _playwright = await async_playwright().start()

        _browser_context = await _playwright.chromium.launch_persistent_context(
            user_data_dir=SESSION_PATH,
            headless=HEADLESS,
            executable_path=CHROME_PATH if CHROME_PATH else None,
            args=STEALTH_ARGS,
            user_agent=USER_AGENT,
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            timezone_id="America/New_York",
            permissions=["geolocation", "notifications"],
            color_scheme="light",
        )

        _page = await _browser_context.new_page()

        # One-time stealth & headers setup for this long-lived session
        await inject_stealth_scripts(_page)
        await _page.set_extra_http_headers(
            {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "DNT": "1",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Cache-Control": "max-age=0",
                "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
            }
        )

        return _page


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


async def simulate_reading_behavior(page) -> None:
    """Simulate human reading behavior with random pauses and mouse movements."""
    # Random mouse movements while "reading"
    for _ in range(random.randint(2, 4)):
        await page.mouse.move(
            rand(200, 1700),
            rand(200, 800)
        )
        await async_human_wait(0.5, 1.5)
    
    # Sometimes scroll a tiny bit (like reading)
    if random.random() < 0.6:
        await page.evaluate(f"window.scrollBy(0, {random.randint(50, 200)})")
        await async_human_wait(0.3, 0.8)


async def simulate_keyboard_activity(page) -> None:
    """Simulate occasional keyboard activity (like tab navigation)."""
    if random.random() < 0.3:  # 30% chance
        await page.keyboard.press("Tab")
        await async_human_wait(0.1, 0.3)
        await page.keyboard.press("Tab")
        await async_human_wait(0.1, 0.3)
        await page.keyboard.press("Shift+Tab")  # Go back
        await async_human_wait(0.1, 0.3)


async def inject_stealth_scripts(page) -> None:
    """Inject JavaScript to hide automation indicators."""
    await page.add_init_script("""
        // Override webdriver property
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
        
        // Override chrome property
        window.chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {}
        };
        
        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
        
        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
        });
        
        // Override languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
        });
        
        // Mock getBattery API
        if (navigator.getBattery) {
            navigator.getBattery = () => Promise.resolve({
                charging: true,
                chargingTime: 0,
                dischargingTime: Infinity,
                level: 1
            });
        }
        
        // Override automation detection
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 8
        });
        
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8
        });
        
        // Override canvas fingerprinting
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type) {
            if (type === 'image/png') {
                const context = this.getContext('2d');
                const imageData = context.getImageData(0, 0, this.width, this.height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i] += Math.floor(Math.random() * 10) - 5;
                }
                context.putImageData(imageData, 0, 0);
            }
            return originalToDataURL.apply(this, arguments);
        };
        
        // Override WebGL fingerprinting
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) {
                return 'Intel Inc.';
            }
            if (parameter === 37446) {
                return 'Intel Iris OpenGL Engine';
            }
            return getParameter.apply(this, arguments);
        };
    """)


def parse_percentage(value_str: Optional[str]) -> Optional[float]:
    """Parse percentage string like '97%' or '+60.90%' to float."""
    if not value_str:
        return None
    # Remove + sign and % symbol, then convert to float
    cleaned = value_str.replace("+", "").replace("%", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_followers(value_str: Optional[str]) -> Optional[int]:
    """Parse followers string like '10,287' to int."""
    if not value_str:
        return None
    # Remove commas and convert to int
    cleaned = value_str.replace(",", "").strip()
    try:
        return int(cleaned)
    except ValueError:
        return None


def parse_rank(value_str: Optional[str]) -> Optional[int]:
    """Parse rank number from text content."""
    if not value_str:
        return None
    # Extract first number found
    match = re.search(r'\d+', value_str)
    if match:
        try:
            return int(match.group())
        except ValueError:
            return None
    return None


async def _upsert_analysts_to_db(analysts: List[Dict[str, Any]]) -> int:
    """Bulk insert or update TipRanks analysts in MongoDB, avoiding duplicates by profile_url."""
    if not analysts:
        return 0

    # Filter out analysts without profile_url
    valid_analysts = [a for a in analysts if a.get("profile_url")]
    if not valid_analysts:
        return 0

    # Get all existing profile_urls in one query (bulk lookup)
    profile_urls = [a["profile_url"] for a in valid_analysts]
    existing_docs = await TipRanksAnalystDocument.find(
        {"profile_url": {"$in": profile_urls}}
    ).to_list()
    existing_urls = {doc.profile_url: doc for doc in existing_docs}

    # Separate into updates and inserts
    to_update_tasks = []
    to_insert = []

    for analyst in valid_analysts:
        profile_url = analyst["profile_url"]
        if profile_url in existing_urls:
            # Update existing (prepare for parallel execution)
            doc = existing_urls[profile_url]
            doc.name = analyst.get("name", doc.name)
            doc.profile_picture_url = analyst.get("profile_picture_url", doc.profile_picture_url)
            doc.rank = analyst.get("rank", doc.rank)
            doc.firm = analyst.get("firm", doc.firm)
            doc.sector = analyst.get("sector", doc.sector)
            doc.buy_pct = analyst.get("buy_pct", doc.buy_pct)
            doc.hold_pct = analyst.get("hold_pct", doc.hold_pct)
            doc.sell_pct = analyst.get("sell_pct", doc.sell_pct)
            doc.success_rate = analyst.get("success_rate", doc.success_rate)
            doc.avg_return = analyst.get("avg_return", doc.avg_return)
            doc.followers = analyst.get("followers", doc.followers)
            to_update_tasks.append(doc.save())
        else:
            # Insert new
            doc = TipRanksAnalystDocument(
                profile_url=profile_url,
                name=analyst.get("name", ""),
                profile_picture_url=analyst.get("profile_picture_url"),
                rank=analyst.get("rank"),
                firm=analyst.get("firm"),
                sector=analyst.get("sector"),
                buy_pct=analyst.get("buy_pct"),
                hold_pct=analyst.get("hold_pct"),
                sell_pct=analyst.get("sell_pct"),
                success_rate=analyst.get("success_rate"),
                avg_return=analyst.get("avg_return"),
                followers=analyst.get("followers"),
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
                    existing = await TipRanksAnalystDocument.find_one(
                        TipRanksAnalystDocument.profile_url == doc.profile_url
                    )
                    if existing:
                        # Update existing document
                        existing.name = doc.name
                        existing.profile_picture_url = doc.profile_picture_url
                        existing.rank = doc.rank
                        existing.firm = doc.firm
                        existing.sector = doc.sector
                        existing.buy_pct = doc.buy_pct
                        existing.hold_pct = doc.hold_pct
                        existing.sell_pct = doc.sell_pct
                        existing.success_rate = doc.success_rate
                        existing.avg_return = doc.avg_return
                        existing.followers = doc.followers
                        await existing.save()
                else:
                    print(f"⚠️ Error inserting analyst {doc.profile_url}: {e}")

    return len(valid_analysts)


# ---------- Core scraper ----------
async def _fetch_analysts_async(save_to_db: bool = True) -> List[Dict[str, Any]]:
    """Internal async function to scrape TipRanks Wall Street Analysts."""
    os.makedirs(SESSION_PATH, exist_ok=True)

    analysts: List[Dict[str, Any]] = []

    # Ensure only one scrape uses the shared page at a time
    async with _scrape_lock:
        page = await _get_or_create_page()

        print("🌐 Opening TipRanks analysts page...")

        # Navigate with referer (more realistic and consistent across calls)
        await page.goto(
            ANALYSTS_URL,
            timeout=60000,
            wait_until="domcontentloaded",
            referer="https://www.google.com/",
        )

        # --- Session-consistent behaviour with mild jitter ---

        # Initial wait before interacting (human-like)
        await async_human_wait(2.0, 3.5)

        # Simulate initial page exploration (fixed number of moves)
        for _ in range(3):
            await page.mouse.move(rand(200, 1700), rand(200, 800))
            await async_human_wait(0.2, 0.6)

        # Simulate reading behavior
        await simulate_reading_behavior(page)

        # Wait for page to fully load
        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        # Additional wait after page load (human reading time)
        await async_human_wait(1.0, 2.0)

        # Simulate keyboard activity (like tab navigation)
        await simulate_keyboard_activity(page)

        # Best-effort cookie/consent dismissal (if present) - with more human behavior
        try:
            # Wait a bit before looking for consent (human reads first)
            await async_human_wait(1.0, 2.0)

            consent_selectors = [
                "button:has-text('Accept')",
                "button:has-text('Accept All')",
                "button:has-text('I Accept')",
                "button:has-text('Accept Cookies')",
                "button:has-text('Agree')",
                "[id*='accept']",
                "[class*='accept']",
                "[class*='cookie'] button",
                "[class*='consent'] button",
            ]

            for selector in consent_selectors:
                try:
                    consent_button = await page.query_selector(selector)
                    if consent_button:
                        # Simulate reading the consent text first
                        await async_human_wait(1.0, 2.0)

                        # Move mouse to button area first (human behavior)
                        box = await consent_button.bounding_box()
                        if box:
                            await page.mouse.move(
                                box["x"] + box["width"] / 2,
                                box["y"] + box["height"] / 2,
                            )
                            await async_human_wait(0.3, 0.6)

                        await human_click(page, consent_button)
                        await async_human_wait(0.8, 1.2)
                        break
                except Exception:
                    continue
        except Exception:
            pass

        # Additional human behavior after consent
        await simulate_reading_behavior(page)

        # Wait for table rows to load
        try:
            await page.wait_for_selector(
                ".rt-tbody .rt-tr-group .rt-tr",
                timeout=30000,
            )
        except Exception:
            print("⚠️ Failed to find analyst table rows on TipRanks.")
            return []

        # Scroll to load more analysts (if pagination/infinite scroll exists)
        # Use a fixed number of scroll cycles for more session-consistent behaviour
        scroll_steps = 4

        for _ in range(scroll_steps):
            # Scroll a medium distance with small jitter
            base_scroll = 400
            jitter = rand(-100, 100)
            scroll_amount = base_scroll + jitter

            # Smooth scroll with multiple small steps
            steps = 4
            step_size = scroll_amount / steps

            for _ in range(steps):
                await page.evaluate(f"window.scrollBy(0, {step_size})")
                await async_human_wait(0.15, 0.3)

            # Short reading pause after each scroll
            await async_human_wait(1.0, 2.0)

            # Small mouse movement during scroll
            await page.mouse.move(rand(300, 1600), rand(300, 800))
            await async_human_wait(0.2, 0.5)

        # Final wait for any lazy-loaded content
        await async_human_wait(1.5, 3.0)

        # One more reading simulation
        await simulate_reading_behavior(page)

        # Extract all analyst data in ONE JavaScript pass (much faster!)
        print("📊 Extracting all analyst data in batch...")
        analysts_data = await page.evaluate(
            """
            () => {
                const BASE_URL = 'https://www.tipranks.com';
                const rows = document.querySelectorAll('.rt-tbody .rt-tr-group .rt-tr');
                const results = [];
                
                for (const row of rows) {
                    try {
                        // Rank (#) - from first td (contains SVG text element)
                        const rankTd = row.querySelector('.rt-td.rt-center');
                        let rank = null;
                        if (rankTd) {
                            // Try to find tspan element first
                            const tspan = rankTd.querySelector('tspan');
                            if (tspan) {
                                rank = parseInt(tspan.textContent.trim(), 10);
                            } else {
                                // Fallback to text content
                                const rankText = rankTd.innerText.trim();
                                const rankMatch = rankText.match(/\\d+/);
                                if (rankMatch) {
                                    rank = parseInt(rankMatch[0], 10);
                                }
                            }
                        }
                        
                        // Name and profile URL - from second td (sticky)
                        const nameTd = row.querySelector('.rt-td.rt-sticky-start');
                        let name = null;
                        let profile_url = null;
                        let profile_picture_url = null;
                        
                        if (nameTd) {
                            const nameLink = nameTd.querySelector('a[data-link="expert"]');
                            if (nameLink) {
                                name = nameLink.getAttribute('title') || nameLink.innerText.trim();
                                const href = nameLink.getAttribute('href');
                                if (href) {
                                    profile_url = href.startsWith('/') ? BASE_URL + href : href;
                                }
                            }
                            
                            // Profile picture
                            const img = nameTd.querySelector('img');
                            if (img) {
                                profile_picture_url = img.getAttribute('src') || img.getAttribute('srcset');
                            }
                        }
                        
                        if (!name) continue; // Skip if no name found
                        
                        // Firm - third td
                        const firmTd = row.querySelectorAll('.rt-td')[2];
                        const firm = firmTd ? firmTd.innerText.trim() : null;
                        
                        // Sector - fourth td
                        const sectorTd = row.querySelectorAll('.rt-td')[3];
                        const sector = sectorTd ? sectorTd.innerText.trim() : null;
                        
                        // Distribution (Buy/Hold/Sell) - fifth td
                        const distTd = row.querySelectorAll('.rt-td')[4];
                        let buy_pct = null;
                        let hold_pct = null;
                        let sell_pct = null;
                        
                        if (distTd) {
                            // Find all divs with flexrcc class that contain Buy/Hold/Sell
                            const distDivs = distTd.querySelectorAll('.flexrcc');
                            for (const div of distDivs) {
                                const text = div.innerText.trim();
                                if (text.includes('Buy')) {
                                    const percentSpan = div.querySelector('.fontWeightsemibold.colorpale');
                                    if (percentSpan) {
                                        buy_pct = parseFloat(percentSpan.innerText.replace('%', '').trim());
                                    }
                                } else if (text.includes('Hold')) {
                                    const percentSpan = div.querySelector('.fontWeightsemibold.colorgray-1');
                                    if (percentSpan) {
                                        hold_pct = parseFloat(percentSpan.innerText.replace('%', '').trim());
                                    }
                                } else if (text.includes('Sell')) {
                                    const percentSpan = div.querySelector('.fontWeightsemibold.colorpurple-dark');
                                    if (percentSpan) {
                                        sell_pct = parseFloat(percentSpan.innerText.replace('%', '').trim());
                                    }
                                }
                            }
                        }
                        
                        // Success Rate - sixth td (SVG with text)
                        const successTd = row.querySelectorAll('.rt-td')[5];
                        let success_rate = null;
                        if (successTd) {
                            const svgText = successTd.querySelector('svg text');
                            if (svgText) {
                                const text = svgText.innerText.trim();
                                success_rate = parseFloat(text.replace('%', '').trim());
                            }
                        }
                        
                        // Average Return - seventh td
                        const avgReturnTd = row.querySelectorAll('.rt-td')[6];
                        let avg_return = null;
                        if (avgReturnTd) {
                            // Look for span with colorgreen class or title attribute
                            const span = avgReturnTd.querySelector('span.colorgreen') || avgReturnTd.querySelector('span');
                            if (span) {
                                const text = span.getAttribute('title') || span.innerText.trim();
                                avg_return = parseFloat(text.replace(/[+%]/g, '').trim());
                            }
                        }
                        
                        // Followers - eighth td
                        const followersTd = row.querySelectorAll('.rt-td')[7];
                        let followers = null;
                        if (followersTd) {
                            const span = followersTd.querySelector('span[data-value]');
                            if (span) {
                                followers = parseInt(span.getAttribute('data-value') || span.innerText.replace(/,/g, '').trim(), 10);
                            } else {
                                const text = followersTd.innerText.trim();
                                followers = parseInt(text.replace(/,/g, '').trim(), 10);
                            }
                        }
                        
                        results.push({
                            rank: rank,
                            name: name,
                            profile_url: profile_url,
                            profile_picture_url: profile_picture_url,
                            firm: firm,
                            sector: sector,
                            buy_pct: buy_pct,
                            hold_pct: hold_pct,
                            sell_pct: sell_pct,
                            success_rate: success_rate,
                            avg_return: avg_return,
                            followers: followers
                        });
                    } catch (e) {
                        console.warn('Error parsing analyst row:', e);
                        continue;
                    }
                }
                
                return results;
            }
            """
        )

        print(f"✅ Extracted {len(analysts_data)} analysts in batch!")
        analysts = analysts_data

        if save_to_db and analysts:
            await _upsert_analysts_to_db(analysts)

        return analysts


async def fetch_analysts(save_to_db: bool = True) -> List[Dict[str, Any]]:
    """
    Public service function used by FastAPI routes.
    Returns a list of analysts with:
    - rank, name, profile_url, profile_picture_url, firm, sector, buy_pct, hold_pct, sell_pct, success_rate, avg_return, followers

    Scrapes ALL available analysts on the page.

    Also upserts them into MongoDB (no duplicates) when save_to_db=True.
    """
    return await _fetch_analysts_async(save_to_db=save_to_db)

