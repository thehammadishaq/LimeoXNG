/**
 * API Service
 * Service for making API calls through Backend (Backend → Finnhub)
 * Backend handles all Finnhub API calls securely
 */

// Backend API configuration
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000/api/v1';

// Debug: Log backend configuration
if (typeof window !== 'undefined') {
  console.log('🌐 Backend API Base URL:', BACKEND_API_BASE_URL);
  console.log('📝 Environment variables:', {
    VITE_BACKEND_API_URL: import.meta.env.VITE_BACKEND_API_URL || 'Using default: http://localhost:8000/api/v1',
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD
  });
}

export interface StockProfile {
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  cusip?: string;
  sedol?: string;
  description?: string;
  employeeTotal?: string;
  exchange?: string;
  ggroup?: string;
  gind?: string;
  gsector?: string;
  gsubind?: string;
  ipo?: string;
  isin?: string;
  marketCapitalization?: number;
  naics?: string;
  naicsNationalIndustry?: string;
  naicsSector?: string;
  naicsSubsector?: string;
  name?: string;
  phone?: string;
  shareOutstanding?: number;
  state?: string;
  ticker?: string;
  weburl?: string;
  logo?: string;
  finnhubIndustry?: string;
}

export interface StockData {
  ticker: string;
  profile?: StockProfile;
  // New: basic financials from Finnhub /stock/metric
  financials?: StockFinancials | null;
  fetched_at?: string;
}

// Basic Financials types (simplified for what we need on frontend)
export interface StockFinancialsSeriesEntry {
  period: string;
  v: number;
}

export interface StockFinancialsSeries {
  annual?: {
    currentRatio?: StockFinancialsSeriesEntry[];
    quickRatio?: StockFinancialsSeriesEntry[];
    netMargin?: StockFinancialsSeriesEntry[];
    grossMargin?: StockFinancialsSeriesEntry[];
    operatingMargin?: StockFinancialsSeriesEntry[];
  };
  // We don't use quarterly right now, but keep it for completeness
  quarterly?: Record<string, StockFinancialsSeriesEntry[]>;
}

export interface StockFinancials {
  series?: StockFinancialsSeries;
  metric?: Record<string, number | null>;
  metricType?: string;
  symbol?: string;
}

export interface RecommendationTrend {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

export interface RecommendationFetchResponse {
  ticker: string;
  data: RecommendationTrend[];
  saved_to_db: boolean;
  record_id?: string;
}

export interface RecommendationDbResponse {
  id?: string;
  ticker: string;
  data: any[]; // raw array from RecommendationTrends.data
  created_at?: string;
  updated_at?: string;
}

// Earnings surprises
export interface EarningsItem {
  actual: number | null;
  estimate: number | null;
  period: string;
  quarter: number;
  surprise: number | null;
  surprisePercent: number | null;
  symbol: string;
  year: number;
}

export interface EarningsFetchResponse {
  ticker: string;
  limit?: number;
  data: EarningsItem[];
  saved_to_db: boolean;
  record_id?: string;
}

export interface EarningsDbResponse {
  id?: string;
  ticker: string;
  data: any[];
  created_at?: string;
  updated_at?: string;
}


// Stock candles (OHLCV) type for chart integration
export interface StockCandle {
  // UNIX timestamp in seconds (Finnhub format, compatible with lightweight-charts UTCTimestamp)
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ScreenerResponse {
  stocks: StockData[];
  total: number;
  cached_count: number;
  fresh_count: number;
  fetched_at: string;
  source: string;
}

export interface SingleStockResponse {
  ticker: string;
  data: {
    quote?: any;
    profile?: any;
    metrics?: any;
    fetched_at?: string;
  };
  from_cache: boolean;
  saved_to_db: boolean;
  fetched_at: string;
}

// Company news (per symbol)
export interface CompanyNewsArticle {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image?: string;
  related?: string;
  source: string;
  summary: string;
  url: string;
}

export interface CompanyNewsFetchResponse {
  symbol: string;
  date_from: string;
  date_to: string;
  data: CompanyNewsArticle[];
  saved_to_db: boolean;
  total_articles: number;
}

// Stock symbols (from DB cache)
export interface StockSymbolsListResponse {
  symbols: string[];
  total: number;
  exchanges: string[];
  updated_at?: string;
}

// Insider transactions
export interface InsiderTransaction {
  name: string;
  share: number;
  change: number;
  filingDate: string;
  transactionDate: string;
  transactionCode: string;
  transactionPrice: number;
  symbol: string;
}

export interface InsiderTransactionsFetchResponse {
  symbol: string;
  from_date?: string | null;
  to_date?: string | null;
  limit?: number | null;
  data: InsiderTransaction[];
  saved_to_db: boolean;
  total_transactions: number;
}


/**
 * Fetch stock profile from Backend API (Backend → Finnhub)
 */
export async function fetchStockProfile(ticker: string): Promise<StockProfile | null> {
  try {
    const url = `${BACKEND_API_BASE_URL}/finnhub/profile/${ticker}?save_to_db=true`;
    console.log(`🌐 Fetching profile for ${ticker} via Backend API`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📡 Backend response status for ${ticker}:`, response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend API failed for ${ticker}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      
      if (response.status === 404) {
        console.error('💡 Status 404: Stock data not found');
      } else if (response.status === 500) {
        console.error('💡 Status 500: Backend server error - check backend logs');
      } else if (response.status === 503) {
        console.error('💡 Status 503: Backend service unavailable');
      }
      
      return null;
    }
    
    const backendResponse = await response.json();
    console.log(`📦 Backend response for ${ticker}:`, backendResponse);
    
    // Backend returns: { ticker, data: { "Company Profile": {...}, ... }, saved_to_db, profile_id }
    // Extract the Company Profile from the data object
    const allData = backendResponse.data || {};
    const profile = allData["Company Profile"] || allData["company_profile"] || allData;
    
    if (!profile) {
      console.warn(`⚠️ No Company Profile found in backend response for ${ticker}`);
      console.warn(`   Available keys:`, Object.keys(allData));
      return null;
    }
    
    // Check if we got valid profile data
    if (!profile.name && !profile.ticker) {
      console.warn(`⚠️ Invalid profile data for ${ticker} - missing name and ticker:`, profile);
      return null;
    }
    
    // If name is missing but ticker exists, use ticker as name
    if (!profile.name && profile.ticker) {
      console.warn(`⚠️ Name missing for ${ticker}, using ticker as name`);
      profile.name = profile.ticker;
    }
    
    console.log(`✅ Valid profile data for ${ticker}`);
    return profile as StockProfile;
  } catch (error) {
    console.error(`❌ Error fetching profile for ${ticker} from backend:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('💡 Network error - make sure backend server is running on', BACKEND_API_BASE_URL);
    }
    return null;
  }
}


/**
 * Fetch stock profile from Database only (read-only).
 * Uses backend DB read-only endpoint: /db/profile/{ticker}
 */
export async function fetchStockProfileFromDb(ticker: string): Promise<StockProfile | null> {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    const url = `${BACKEND_API_BASE_URL}/db/profile/${tickerUpper}`;
    console.log(`🌐 Fetching profile from DB for ${tickerUpper}`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ DB profile API failed for ${tickerUpper}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    // DB response shape: { id, ticker, data, created_at, updated_at }
    const dbResponse: {
      ticker: string;
      data: any;
      created_at?: string;
      updated_at?: string;
    } = await response.json();

    const profile = dbResponse.data || {};

    if (!profile) {
      console.warn(`⚠️ No profile data in DB document for ${tickerUpper}`);
      return null;
    }

    // If name is missing but ticker exists, use ticker as name (same behavior as live profile)
    if (!profile.name && dbResponse.ticker) {
      profile.name = dbResponse.ticker;
    }

    return profile as StockProfile;
  } catch (error) {
    console.error(`❌ Error fetching profile for ${ticker} from DB:`, error);
    return null;
  }
}

/**
 * Fetch basic financials (metrics) from Backend API (Backend → Finnhub /stock/metric)
 * Exported so that screens can decide when to call it (e.g. only on Financial tab).
 */
export async function fetchStockFinancials(ticker: string): Promise<StockFinancials | null> {
  try {
    const url = `${BACKEND_API_BASE_URL}/finnhub/basic-financials/${ticker}?metric=all&save_to_db=true`;
    console.log(`🌐 Fetching basic financials for ${ticker} via Backend API`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Backend basic-financials response status for ${ticker}:`, response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend basic-financials API failed for ${ticker}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const backendResponse = await response.json();
    console.log(`📦 Backend basic-financials response for ${ticker}:`, backendResponse);

    // Backend returns: { ticker, metric, data: { basic_financials: {...}, _metadata: {...} }, saved_to_db, record_id }
    const allData = backendResponse.data || {};
    const financials = allData.basic_financials || allData;

    if (!financials) {
      console.warn(`⚠️ No basic_financials found in backend response for ${ticker}`);
      console.warn(`   Available keys:`, Object.keys(allData));
      return null;
    }

    console.log(`✅ Valid basic financials for ${ticker}`);
    return financials as StockFinancials;
  } catch (error) {
    console.error(`❌ Error fetching basic financials for ${ticker} from backend:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('💡 Network error - make sure backend server is running on', BACKEND_API_BASE_URL);
    }
    return null;
  }
}


/**
 * Fetch basic financials from Database only (read-only).
 * Uses backend DB read-only endpoint: /db/basic-financials/{ticker}
 */
export async function fetchStockFinancialsFromDb(
  ticker: string
): Promise<StockFinancials | null> {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    const url = `${BACKEND_API_BASE_URL}/db/basic-financials/${tickerUpper}`;
    console.log(`🌐 Fetching basic financials from DB for ${tickerUpper}`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ DB basic-financials API failed for ${tickerUpper}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    // DB response shape: { id, ticker, data, created_at, updated_at }
    const dbResponse: {
      ticker: string;
      data: any;
      created_at?: string;
      updated_at?: string;
    } = await response.json();

    const financialsData = dbResponse.data || {};

    if (!financialsData || typeof financialsData !== 'object') {
      console.warn(`⚠️ No basic financials data in DB document for ${tickerUpper}`);
      return null;
    }

    return financialsData as StockFinancials;
  } catch (error) {
    console.error(`❌ Error fetching basic financials for ${ticker} from DB:`, error);
    return null;
  }
}

/**
 * Fetch stock candles (OHLCV) from Backend API (Backend → Finnhub /stock/candle)
 * Used by the profile page chart.
 */
export async function fetchStockCandles(
  ticker: string,
  resolution: string,
  from: number,
  to: number,
  saveToDb: boolean = true
): Promise<StockCandle[]> {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    const url =
      `${BACKEND_API_BASE_URL}/finnhub/stock-candles/${tickerUpper}` +
      `?resolution=${encodeURIComponent(resolution)}` +
      `&from=${from}` +
      `&to=${to}` +
      `&save_to_db=${saveToDb}`;

    console.log(`🌐 Fetching stock candles for ${tickerUpper} via Backend API`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(
      `📡 Backend stock-candles response status for ${tickerUpper}:`,
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend stock-candles API failed for ${tickerUpper}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return [];
    }

    const backendResponse: any = await response.json();
    console.log(`📦 Backend stock-candles raw response for ${tickerUpper}:`, backendResponse);

    // Backend returns: { ticker, resolution, from, to, data: { stock_candles: {...}, _metadata: {...} }, ... }
    const allData = backendResponse.data || {};
    const candlesPayload: any = allData.stock_candles || allData;

    if (!candlesPayload || typeof candlesPayload !== 'object') {
      console.warn(`⚠️ No stock_candles payload found in backend response for ${tickerUpper}`);
      console.warn('   Available keys on data:', Object.keys(allData || {}));
      return [];
    }

    if (candlesPayload.s && candlesPayload.s !== 'ok') {
      console.warn(
        `⚠️ Finnhub returned non-ok status for ${tickerUpper} candles:`,
        candlesPayload.s
      );
      return [];
    }

    const c: number[] = candlesPayload.c || [];
    const h: number[] = candlesPayload.h || [];
    const l: number[] = candlesPayload.l || [];
    const o: number[] = candlesPayload.o || [];
    const t: number[] = candlesPayload.t || [];
    const v: number[] = candlesPayload.v || [];

    if (!Array.isArray(t) || t.length === 0) {
      console.warn(`⚠️ Empty candles array for ${tickerUpper}`);
      return [];
    }

    const len = t.length;
    const candles: StockCandle[] = [];

    for (let i = 0; i < len; i++) {
      const open = o[i];
      const high = h[i];
      const low = l[i];
      const close = c[i];
      const time = t[i];

      if (
        open === undefined ||
        high === undefined ||
        low === undefined ||
        close === undefined ||
        time === undefined
      ) {
        continue;
      }

      candles.push({
        time,
        open,
        high,
        low,
        close,
        volume: Array.isArray(v) && v[i] !== undefined ? v[i] : 0,
      });
    }

    console.log(`✅ Parsed ${candles.length} candles for ${tickerUpper}`);
    return candles;
  } catch (error) {
    console.error(`❌ Error fetching stock candles for ${ticker} from backend:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('💡 Network error - make sure backend server is running on', BACKEND_API_BASE_URL);
    }
    return [];
  }
}

/**
 * Fetch recommendation trends for a ticker via Backend API (Finnhub /stock/recommendation)
 */
export async function fetchRecommendationTrends(
  ticker: string,
  saveToDb: boolean = true
): Promise<RecommendationFetchResponse | null> {
  try {
    const url = `${BACKEND_API_BASE_URL}/finnhub/recommendation/${ticker}?save_to_db=${saveToDb}`;
    console.log(`🌐 Fetching recommendation trends for ${ticker} via Backend API`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(
      `📡 Backend recommendation response status for ${ticker}:`,
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend recommendation API failed for ${ticker}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const backendResponse = (await response.json()) as RecommendationFetchResponse;
    console.log(`📦 Backend recommendation response for ${ticker}:`, backendResponse);
    return backendResponse;
  } catch (error) {
    console.error(`❌ Error fetching recommendation trends for ${ticker} from backend:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('💡 Network error - make sure backend server is running on', BACKEND_API_BASE_URL);
    }
    return null;
  }
}

/**
 * Fetch recommendation trends from Database only (read-only).
 * Uses backend DB read-only endpoint: /db/recommendation/{ticker}
 */
export async function fetchRecommendationTrendsFromDb(
  ticker: string
): Promise<RecommendationTrend[] | null> {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    const url = `${BACKEND_API_BASE_URL}/db/recommendation/${tickerUpper}`;
    console.log(`🌐 Fetching recommendation trends from DB for ${tickerUpper}`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ DB recommendation API failed for ${tickerUpper}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const dbResponse: RecommendationDbResponse = await response.json();
    const raw = dbResponse.data || [];

    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn(`⚠️ No recommendation trends data in DB for ${tickerUpper}`);
      return null;
    }

    // Map raw Finnhub-style objects into RecommendationTrend shape
    const mapped: RecommendationTrend[] = raw.map((item: any) => ({
      buy: item.buy ?? 0,
      hold: item.hold ?? 0,
      sell: item.sell ?? 0,
      strongBuy: item.strongBuy ?? item.strong_buy ?? 0,
      strongSell: item.strongSell ?? item.strong_sell ?? 0,
      period: item.period ?? '',
      symbol: item.symbol ?? tickerUpper,
    }));

    return mapped;
  } catch (error) {
    console.error(`❌ Error fetching recommendation trends for ${ticker} from DB:`, error);
    return null;
  }
}

/**
 * Fetch historical earnings surprises for a ticker via Backend API (Finnhub /stock/earnings)
 */
export async function fetchEarningsHistory(
  ticker: string,
  limit: number = 5,
  saveToDb: boolean = true
): Promise<EarningsFetchResponse | null> {
  try {
    const url = `${BACKEND_API_BASE_URL}/finnhub/earnings/${ticker}?limit=${limit}&save_to_db=${saveToDb}`;
    console.log(`🌐 Fetching earnings history for ${ticker} via Backend API`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(
      `📡 Backend earnings response status for ${ticker}:`,
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend earnings API failed for ${ticker}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const backendResponse = (await response.json()) as EarningsFetchResponse;
    console.log(`📦 Backend earnings response for ${ticker}:`, backendResponse);
    return backendResponse;
  } catch (error) {
    console.error(`❌ Error fetching earnings history for ${ticker} from backend:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('💡 Network error - make sure backend server is running on', BACKEND_API_BASE_URL);
    }
    return null;
  }
}

/**
 * Fetch historical earnings surprises from Database only (read-only).
 * Uses backend DB read-only endpoint: /db/earnings/{ticker}
 */
export async function fetchEarningsHistoryFromDb(
  ticker: string
): Promise<EarningsItem[] | null> {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    const url = `${BACKEND_API_BASE_URL}/db/earnings/${tickerUpper}`;
    console.log(`🌐 Fetch earnings history from DB for ${tickerUpper}`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ DB earnings API failed for ${tickerUpper}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const dbResponse: EarningsDbResponse = await response.json();
    const raw = dbResponse.data || [];

    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn(`⚠️ No earnings history data in DB for ${tickerUpper}`);
      return null;
    }

    const mapped: EarningsItem[] = raw.map((e: any) => ({
      actual: e.actual ?? null,
      estimate: e.estimate ?? null,
      period: e.period ?? '',
      quarter: e.quarter ?? 0,
      surprise: e.surprise ?? null,
      surprisePercent: e.surprisePercent ?? null,
      symbol: e.symbol ?? tickerUpper,
      year: e.year ?? 0,
    }));

    return mapped;
  } catch (error) {
    console.error(`❌ Error fetching earnings history for ${ticker} from DB:`, error);
    return null;
  }
}

/**
 * Fetch company-specific news for a ticker via Backend API (Finnhub /company-news)
 */
export async function fetchCompanyNews(
  ticker: string,
  from: string,
  to: string,
  saveToDb: boolean = true
): Promise<CompanyNewsFetchResponse | null> {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    const url =
      `${BACKEND_API_BASE_URL}/finnhub/company-news/${tickerUpper}` +
      `?from=${encodeURIComponent(from)}` +
      `&to=${encodeURIComponent(to)}` +
      `&save_to_db=${saveToDb}`;
    console.log(`🌐 Fetching company news for ${tickerUpper} via Backend API`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(
      `📡 Backend company-news response status for ${tickerUpper}:`,
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend company-news API failed for ${tickerUpper}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const backendResponse = (await response.json()) as CompanyNewsFetchResponse;
    console.log(`📦 Backend company-news response for ${tickerUpper}:`, backendResponse);
    return backendResponse;
  } catch (error) {
    console.error(`❌ Error fetching company news for ${ticker} from backend:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(
        '💡 Network error - make sure backend server is running on',
        BACKEND_API_BASE_URL
      );
    }
    return null;
  }
}

/**
 * Fetch company-specific news from Database only (read-only).
 * Uses backend DB read-only endpoint: /db/company-news/{ticker}
 */
export async function fetchCompanyNewsFromDb(
  ticker: string,
  limit: number = 50
): Promise<CompanyNewsFetchResponse | null> {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    const url = `${BACKEND_API_BASE_URL}/db/company-news/${tickerUpper}?limit=${limit}`;
    console.log(`🌐 Fetching company news from DB for ${tickerUpper}`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ DB company-news API failed for ${tickerUpper}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const dbResponse = (await response.json()) as CompanyNewsFetchResponse;
    console.log(`📦 DB company-news response for ${tickerUpper}:`, dbResponse);
    return dbResponse;
  } catch (error) {
    console.error(`❌ Error fetching company news for ${ticker} from DB:`, error);
    return null;
  }
}

/**
 * Fetch insider transactions for a ticker via Backend API (Finnhub /stock/insider-transactions)
 */
export async function fetchInsiderTransactions(
  ticker: string,
  limit: number = 20,
  saveToDb: boolean = true
): Promise<InsiderTransactionsFetchResponse | null> {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    const params = new URLSearchParams({
      symbol: tickerUpper,
      limit: String(limit),
      save_to_db: String(saveToDb),
    });
    const url = `${BACKEND_API_BASE_URL}/finnhub/insider-transactions?${params.toString()}`;
    console.log(`🌐 Fetching insider transactions for ${tickerUpper} via Backend API`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(
      `📡 Backend insider-transactions response status for ${tickerUpper}:`,
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend insider-transactions API failed for ${tickerUpper}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const backendResponse = (await response.json()) as InsiderTransactionsFetchResponse;
    console.log(`📦 Backend insider-transactions response for ${tickerUpper}:`, backendResponse);
    return backendResponse;
  } catch (error) {
    console.error(`❌ Error fetching insider transactions for ${ticker} from backend:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(
        '💡 Network error - make sure backend server is running on',
        BACKEND_API_BASE_URL
      );
    }
    return null;
  }
}

/**
 * Fetch insider transactions from Database only (read-only).
 * Uses backend DB read-only endpoint: /db/insider-transactions/{ticker}
 */
export async function fetchInsiderTransactionsFromDb(
  ticker: string,
  limit: number = 25
): Promise<InsiderTransaction[] | null> {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    const url = `${BACKEND_API_BASE_URL}/db/insider-transactions/${tickerUpper}?limit=${limit}`;
    console.log(`🌐 Fetching insider transactions from DB for ${tickerUpper}`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ DB insider-transactions API failed for ${tickerUpper}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const backendResponse = (await response.json()) as InsiderTransactionsFetchResponse;
    console.log(`📦 DB insider-transactions response for ${tickerUpper}:`, backendResponse);
    return backendResponse.data ?? null;
  } catch (error) {
    console.error(`❌ Error fetching insider transactions for ${ticker} from DB:`, error);
    return null;
  }
}

/**
 * Fetch list of available stock symbols from Database (cache).
 * Uses backend DB read-only endpoint: /db/symbols
 */
export async function fetchSymbolsFromDb(): Promise<StockSymbolsListResponse | null> {
  try {
    const url = `${BACKEND_API_BASE_URL}/db/symbols`;
    console.log('🌐 Fetching stock symbols from DB');
    console.log('   URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DB symbols API failed:');
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const dbResponse = (await response.json()) as StockSymbolsListResponse;
    console.log('📦 DB symbols response:', dbResponse);
    return dbResponse;
  } catch (error) {
    console.error('❌ Error fetching stock symbols from DB:', error);
    return null;
  }
}

/**
 * Refresh stock symbols cache via Backend API (Finnhub /stock/symbol).
 * Uses backend endpoint: POST /finnhub/symbols/refresh
 */
export async function refreshSymbolsCache(): Promise<StockSymbolsListResponse | null> {
  try {
    const url = `${BACKEND_API_BASE_URL}/finnhub/symbols/refresh`;
    console.log('🌐 Refreshing stock symbols cache via Finnhub');
    console.log('   URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Symbols refresh API failed:');
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const backendResponse = (await response.json()) as StockSymbolsListResponse;
    console.log('📦 Symbols refresh response:', backendResponse);
    return backendResponse;
  } catch (error) {
    console.error('❌ Error refreshing stock symbols cache via backend:', error);
    return null;
  }
}

/**
 * Run backend cron job to refresh profile-related caches for tickers.
 * Backend endpoint: POST /finnhub/cron/profile-cache
 */
export async function runProfileCron(
  waitBetweenSec: number = 1,
  limit?: number
): Promise<any | null> {
  try {
    const params = new URLSearchParams({
      wait_sec: String(waitBetweenSec),
    });
    if (typeof limit === 'number' && limit > 0) {
      params.set('limit', String(limit));
    }
    const url = `${BACKEND_API_BASE_URL}/finnhub/cron/profile-cache?${params.toString()}`;
    console.log('🌐 Running profile cache cron via backend');
    console.log('   URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Profile cron API failed:');
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const result = await response.json();
    console.log('📦 Profile cron result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error running profile cron via backend:', error);
    return null;
  }
}

// ---- Cron job DB status ----

export interface CronTickerStatus {
  ticker: string;
  ok: boolean;
  errors: string[];
  processed_at: string;
}

export interface CronProfileStatusResponse {
  id?: string | null;
  started_at: string;
  finished_at: string;
  wait_sec: number;
  limit?: number | null;
  total_cached: number;
  processed: number;
  success: number;
  failed: number;
  tickers: CronTickerStatus[];
}

/**
 * Fetch latest profile-cache cron status from DB-only endpoint.
 * Backend endpoint: GET /db/cron/profile-status
 */
export async function fetchLatestProfileCronStatus(): Promise<CronProfileStatusResponse | null> {
  try {
    const url = `${BACKEND_API_BASE_URL}/db/cron/profile-status`;
    console.log('🌐 Fetching latest profile cron status from DB');
    console.log('   URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Profile cron status API failed:');
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return null;
    }

    const result = (await response.json()) as CronProfileStatusResponse;
    console.log('📦 Latest profile cron status:', result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching profile cron status from DB:', error);
    return null;
  }
}

// (Pattern recognition frontend helpers removed as per latest requirements)

/**
 * Fetch screener data for multiple stocks.
 * By default this ONLY fetches profile data.
 * If includeFinancials=true, it will also fetch basic financials (/stock/metric).
 */
export async function fetchScreenerData(
  page: number = 1,
  pageSize: number = 20,
  forceRefresh: boolean = false,
  symbols?: string[],
  includeFinancials: boolean = false
): Promise<ScreenerResponse> {
  try {
    console.log('🚀 fetchScreenerData called with:', { page, pageSize, forceRefresh, symbols, includeFinancials });
    console.log('🌐 Using Backend API:', BACKEND_API_BASE_URL);

    // If specific symbols are provided, fetch just those from DB
    if (symbols && symbols.length > 0) {
      const symbolList = symbols.map((s) => s.toUpperCase().trim());
      console.log(
        `📊 Fetching profile/basic-financials for ${symbolList.length} symbols via Backend DB (per-symbol mode):`,
        symbolList
      );

      const stockPromises = symbolList.map(async (ticker) => {
        try {
          console.log(`🔄 Starting backend DB fetch for ${ticker}...`);
          const profile = await fetchStockProfileFromDb(ticker);
          const financials = includeFinancials ? await fetchStockFinancialsFromDb(ticker) : null;

          if (!profile || !profile.name) {
            console.warn(`⚠️ No valid DB profile data for ${ticker} - skipping`);
            return null;
          }

          console.log(`✅ Successfully fetched profile for ${ticker} from DB`);
          if (!financials && includeFinancials) {
            console.warn(`⚠️ No DB basic financials for ${ticker} - continuing with profile only`);
          }

          return {
            ticker,
            profile,
            financials: financials || null,
            fetched_at: new Date().toISOString(),
          };
        } catch (error) {
          console.error(`❌ Error fetching data for ${ticker} from backend:`, error);
          return null;
        }
      });

      console.log('⏳ Waiting for all backend DB calls (per-symbol) to complete...');
      const stockResults = await Promise.all(stockPromises);
      const validStocks = stockResults.filter((stock) => stock !== null) as StockData[];

      console.log(`📈 Results: ${validStocks.length} valid stocks out of ${symbolList.length} requested`);
      console.log('📋 Valid stocks:', validStocks.map((s) => s.ticker));

      return {
        stocks: validStocks,
        total: validStocks.length,
        cached_count: 0,
        fresh_count: validStocks.length,
        fetched_at: new Date().toISOString(),
        source: 'backend-db',
      };
    }

    // If no symbols provided, fetch ALL profiles from DB for the requested page
    const listUrl = `${BACKEND_API_BASE_URL}/db/profiles?page=${page}&page_size=${pageSize}`;
    console.log('🌐 Fetching paginated profiles list from DB:', listUrl);

    type DbProfilesResponse = {
      profiles: {
        ticker: string;
        data: any;
        created_at?: string;
        updated_at?: string;
      }[];
      total: number;
      page: number;
      page_size: number;
    };

    const listResponse = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('❌ DB profiles list API failed:');
      console.error(`   Status: ${listResponse.status} ${listResponse.statusText}`);
      console.error(`   Error: ${errorText}`);
      return {
        stocks: [],
        total: 0,
        cached_count: 0,
        fresh_count: 0,
        fetched_at: new Date().toISOString(),
        source: 'backend-db',
      };
    }

    const dbProfiles: DbProfilesResponse = await listResponse.json();
    console.log(
      `📦 DB profiles list: page=${dbProfiles.page}, page_size=${dbProfiles.page_size}, total=${dbProfiles.total}`
    );

    if (!dbProfiles.profiles || dbProfiles.profiles.length === 0) {
      console.warn('⚠️ No profiles found in DB for current page');
      return {
        stocks: [],
        total: dbProfiles.total || 0,
        cached_count: 0,
        fresh_count: 0,
        fetched_at: new Date().toISOString(),
        source: 'backend-db',
      };
    }

    // Optionally fetch financials for each profile (if requested)
    const stockResults = await Promise.all(
      dbProfiles.profiles.map(async (p) => {
        try {
          const ticker = p.ticker.toUpperCase().trim();
          const profile = p.data || {};
          if (!profile || (!profile.name && !ticker)) {
            console.warn(`⚠️ Skipping DB profile with invalid data for ${ticker}`);
            return null;
          }

          const financials = includeFinancials ? await fetchStockFinancialsFromDb(ticker) : null;

          return {
            ticker,
            profile,
            financials: financials || null,
            fetched_at: p.updated_at || p.created_at || new Date().toISOString(),
          };
        } catch (error) {
          console.error('❌ Error building stock record from DB profile:', error);
          return null;
        }
      })
    );

    const validStocks = stockResults.filter((s) => s !== null) as StockData[];
    console.log(`📈 Built ${validStocks.length} valid stocks from DB profiles`);

    return {
      stocks: validStocks,
      total: dbProfiles.total,
      cached_count: 0,
      fresh_count: validStocks.length,
      fetched_at: new Date().toISOString(),
      source: 'backend-db',
    };
  } catch (error) {
    console.error('❌ Error fetching screener data from backend:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Fetch data for a single stock via Backend API
 */
export async function fetchSingleStock(
  ticker: string,
  forceRefresh: boolean = false
): Promise<SingleStockResponse> {
  try {
    const tickerUpper = ticker.toUpperCase().trim();
    console.log(`🔄 Fetching single stock ${tickerUpper} via backend...`);
    const profile = await fetchStockProfile(tickerUpper);
    
    return {
      ticker: tickerUpper,
      data: {
        profile: profile || null,
        fetched_at: new Date().toISOString()
      },
      from_cache: false,
      saved_to_db: false,
      fetched_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error fetching single stock data from backend:', error);
    throw error;
  }
}

/**
 * News Article interface
 */
export interface NewsArticle {
  id: number;
  date: string;
  time: string;
  source: string;
  headline: string;
  tickers: string[];
  related?: string;
  summary?: string;
  url?: string;
  image?: string;
  category?: string;
}

/**
 * Market News Response interface
 */
export interface MarketNewsResponse {
  category: string;
  min_id: number;
  data: Array<{
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image?: string;
    related?: string;
    source: string;
    summary: string;
    url: string;
  }>;
  saved_to_db: boolean;
  record_id?: string;
  total_articles: number;
}

/**
 * Fetch market news from Backend API (Backend → Finnhub)
 */
export async function fetchMarketNews(
  category: string = 'general',
  minId: number = 0,
  saveToDb: boolean = true
): Promise<NewsArticle[]> {
  try {
    const url = `${BACKEND_API_BASE_URL}/finnhub/news?category=${category}&min_id=${minId}&save_to_db=${saveToDb}`;
    console.log(`🌐 Fetching market news via Backend API`);
    console.log(`   URL: ${url}`);
    console.log(`   Category: ${category}, Min ID: ${minId}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📡 Backend news response status:`, response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend news API failed:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      
      if (response.status === 404) {
        console.error('💡 Status 404: No news found for this category');
      } else if (response.status === 500) {
        console.error('💡 Status 500: Backend server error - check backend logs');
      }
      
      return [];
    }
    
    const backendResponse: MarketNewsResponse = await response.json();
    console.log(`📦 Backend news response:`, backendResponse);
    console.log(`   Total articles: ${backendResponse.total_articles}`);
    
    // Transform API response to frontend format
    const transformedNews: NewsArticle[] = backendResponse.data.map((article) => {
      // Convert UNIX timestamp to date and time
      const dateObj = new Date(article.datetime * 1000);
      const date = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
      const time = dateObj.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }); // HH:MM AM/PM
      
      // Extract tickers from related field (if available)
      let tickers: string[] = [];
      if (article.related && article.related.trim() !== '') {
        // Related field might contain ticker symbols separated by commas or spaces
        tickers = article.related
          .split(/[,\s]+/)
          .map(t => t.trim().toUpperCase())
          .filter(t => t.length > 0 && t.length <= 5); // Filter valid ticker symbols
      }
      
      return {
        id: article.id,
        date,
        time,
        source: article.source,
        headline: article.headline,
        tickers,
        related: article.related,
        summary: article.summary,
        url: article.url,
        image: article.image,
        category: article.category
      };
    });
    
    console.log(`✅ Transformed ${transformedNews.length} news articles`);
    return transformedNews;
  } catch (error) {
    console.error(`❌ Error fetching market news from backend:`, error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('💡 Network error - make sure backend server is running on', BACKEND_API_BASE_URL);
    }
    return [];
  }
}

/**
 * Transform API response to frontend format
 * Uses /stock/profile endpoint data
 */
export function transformStockData(apiStock: StockData): any {
  // Handle case where apiStock might be null or undefined
  if (!apiStock || !apiStock.ticker) {
    console.warn('Invalid stock data:', apiStock);
    return null;
  }
  
  const profile = apiStock.profile || {};
  const financials = apiStock.financials || undefined;

  const metric = financials?.metric || {};
  const seriesAnnual = financials?.series?.annual || {};

  // Helper to get latest value from Finnhub series.annual
  const latestFromSeries = (key: keyof typeof seriesAnnual): number | undefined => {
    const arr = (seriesAnnual as any)?.[key] as StockFinancialsSeriesEntry[] | undefined;
    if (arr && arr.length > 0 && typeof arr[0].v === 'number') {
      return arr[0].v;
    }
    return undefined;
  };

  const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return value.toFixed(decimals);
  };

  const formatPercent = (value: number | null | undefined, decimals: number = 1): string => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    // Finnhub series values like netMargin are in ratio (e.g. 0.21), convert to %
    return (value * 100).toFixed(decimals) + '%';
  };

  // Format market cap
  let marketCapFormatted = 'N/A';
  if (profile.marketCapitalization) {
    const marketCap = profile.marketCapitalization;
    if (marketCap >= 1e12) {
      marketCapFormatted = `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      marketCapFormatted = `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      marketCapFormatted = `$${(marketCap / 1e6).toFixed(2)}M`;
    } else {
      marketCapFormatted = `$${marketCap.toFixed(0)}`;
    }
  }

  // Format shares outstanding
  const shares = profile.shareOutstanding || 0;
  const sharesFormatted = shares > 0 ? shares.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'N/A';

  // --- Basic Financial metrics from /stock/metric ---
  // Field names match actual Finnhub API response
  const peTTM = (metric as any).peTTM as number | undefined;
  const peAnnual = (metric as any).peAnnual as number | undefined;
  const forwardPe = (metric as any).forwardPE as number | undefined;
  const peBasicExclExtraTTM = (metric as any).peBasicExclExtraTTM as number | undefined;
  const peExclExtraAnnual = (metric as any).peExclExtraAnnual as number | undefined;
  const peExclExtraTTM = (metric as any).peExclExtraTTM as number | undefined;
  const peInclExtraTTM = (metric as any).peInclExtraTTM as number | undefined;
  const peNormalizedAnnual = (metric as any).peNormalizedAnnual as number | undefined;
  const pegTTM = (metric as any).pegTTM as number | undefined;
  const psAnnual = (metric as any).psAnnual as number | undefined;
  const psTTM = (metric as any).psTTM as number | undefined;
  const pb = (metric as any).pb as number | undefined;
  const pbAnnual = (metric as any).pbAnnual as number | undefined;
  const pbQuarterly = (metric as any).pbQuarterly as number | undefined;
  const ptbvAnnual = (metric as any).ptbvAnnual as number | undefined;
  const ptbvQuarterly = (metric as any).ptbvQuarterly as number | undefined;
  const evEbitdaTTM = (metric as any).evEbitdaTTM as number | undefined;
  // EV/Revenue field name in Finnhub API - try multiple variations
  const evRevenueTTM = (metric as any).evRevenueTTM as number | undefined;
  const evRevenueBracket = (metric as any)['evRevenueTTM'] as number | undefined;
  const pfcfShareAnnual = (metric as any).pfcfShareAnnual as number | undefined;
  const pfcfShareTTM = (metric as any).pfcfShareTTM as number | undefined;
  const pcfShareAnnual = (metric as any).pcfShareAnnual as number | undefined;
  const pcfShareTTM = (metric as any).pcfShareTTM as number | undefined;
  const evFcfAnnual = (metric as any)['currentEv/freeCashFlowAnnual'] as number | undefined; // Field name has slash
  const evFcfTTM = (metric as any)['currentEv/freeCashFlowTTM'] as number | undefined; // Field name has slash
  const enterpriseValue = (metric as any).enterpriseValue as number | undefined;
  const epsGrowth3Y = (metric as any).epsGrowth3Y as number | undefined;
  const epsGrowth5Y = (metric as any).epsGrowth5Y as number | undefined;
  const epsGrowthQuarterlyYoy = (metric as any).epsGrowthQuarterlyYoy as number | undefined;
  const epsGrowthTTMYoy = (metric as any).epsGrowthTTMYoy as number | undefined;
  const revenueGrowth3Y = (metric as any).revenueGrowth3Y as number | undefined;
  const revenueGrowth5Y = (metric as any).revenueGrowth5Y as number | undefined;
  const revenueGrowthQuarterlyYoy = (metric as any).revenueGrowthQuarterlyYoy as number | undefined; // lowercase 'y'
  const revenueGrowthTTMYoy = (metric as any).revenueGrowthTTMYoy as number | undefined;
  const revenueShareGrowth5Y = (metric as any).revenueShareGrowth5Y as number | undefined;
  
  const dividendYield = (metric as any).dividendYieldIndicatedAnnual as number | undefined;
  
  // Dividends fields
  const currentDividendYieldTTM = (metric as any).currentDividendYieldTTM as number | undefined;
  const dividendPerShareAnnual = (metric as any).dividendPerShareAnnual as number | undefined;
  const dividendPerShareTTM = (metric as any).dividendPerShareTTM as number | undefined;
  const dividendIndicatedAnnual = (metric as any).dividendIndicatedAnnual as number | undefined;
  const dividendYieldIndicatedAnnual = (metric as any).dividendYieldIndicatedAnnual as number | undefined;
  const dividendGrowthRate5Y = (metric as any).dividendGrowthRate5Y as number | undefined;
  const payoutRatioAnnual = (metric as any).payoutRatioAnnual as number | undefined;
  const payoutRatioTTM = (metric as any).payoutRatioTTM as number | undefined;
  const roaTTM = (metric as any).roaTTM as number | undefined;
  const roeTTM = (metric as any).roeTTM as number | undefined;
  const roicTTM = (metric as any).roicTTM as number | undefined;
  
  // Efficiency fields
  const assetTurnoverAnnual = (metric as any).assetTurnoverAnnual as number | undefined;
  const assetTurnoverTTM = (metric as any).assetTurnoverTTM as number | undefined;
  const inventoryTurnoverAnnual = (metric as any).inventoryTurnoverAnnual as number | undefined;
  const inventoryTurnoverTTM = (metric as any).inventoryTurnoverTTM as number | undefined;
  const receivablesTurnoverAnnual = (metric as any).receivablesTurnoverAnnual as number | undefined;
  const receivablesTurnoverTTM = (metric as any).receivablesTurnoverTTM as number | undefined;
  const roi5Y = (metric as any).roi5Y as number | undefined;
  const roiAnnual = (metric as any).roiAnnual as number | undefined;
  const roiTTM = (metric as any).roiTTM as number | undefined;
  const roa5Y = (metric as any).roa5Y as number | undefined;
  const roaRfy = (metric as any).roaRfy as number | undefined;
  const roe5Y = (metric as any).roe5Y as number | undefined;
  const roeRfy = (metric as any).roeRfy as number | undefined;
  
  // Operational Metrics fields
  const revenuePerShareAnnual = (metric as any).revenuePerShareAnnual as number | undefined;
  const revenuePerShareTTM = (metric as any).revenuePerShareTTM as number | undefined;
  const netIncomeEmployeeAnnual = (metric as any).netIncomeEmployeeAnnual as number | undefined;
  const netIncomeEmployeeTTM = (metric as any).netIncomeEmployeeTTM as number | undefined;
  const revenueEmployeeAnnual = (metric as any).revenueEmployeeAnnual as number | undefined;
  const revenueEmployeeTTM = (metric as any).revenueEmployeeTTM as number | undefined;
  const netInterestCoverageAnnual = (metric as any).netInterestCoverageAnnual as number | undefined;
  const netInterestCoverageTTM = (metric as any).netInterestCoverageTTM as number | undefined;
  const ltDebtEq = (metric as any).ltDebtEquity as number | undefined;
  const debtEq = (metric as any).totalDebtToEquity as number | undefined;
  
  // BS Strength fields
  const totalDebtTotalEquityAnnual = (metric as any)['totalDebt/totalEquityAnnual'] as number | undefined;
  const totalDebtTotalEquityQuarterly = (metric as any)['totalDebt/totalEquityQuarterly'] as number | undefined;
  const longTermDebtEquityAnnual = (metric as any)['longTermDebt/equityAnnual'] as number | undefined;
  const longTermDebtEquityQuarterly = (metric as any)['longTermDebt/equityQuarterly'] as number | undefined;

  const currentRatio = latestFromSeries('currentRatio');
  const quickRatio = latestFromSeries('quickRatio');
  
  // Liquidity fields (Annual and Quarterly from metric)
  const currentRatioAnnual = (metric as any).currentRatioAnnual as number | undefined;
  const currentRatioQuarterly = (metric as any).currentRatioQuarterly as number | undefined;
  const quickRatioAnnual = (metric as any).quickRatioAnnual as number | undefined;
  const quickRatioQuarterly = (metric as any).quickRatioQuarterly as number | undefined;
  const grossMarginSeries = latestFromSeries('grossMargin');
  const operMarginSeries = latestFromSeries('operatingMargin');
  const netMarginSeries = latestFromSeries('netMargin');

  // Fallbacks from metric object if series is missing
  const grossMargin = grossMarginSeries ?? ((metric as any).grossMarginTTM as number | undefined);
  const operMargin = operMarginSeries ?? ((metric as any).operatingMarginTTM as number | undefined);
  const profitMargin = netMarginSeries ?? ((metric as any).netMarginTTM as number | undefined);
  
  // Pretax Margin
  const pretaxMargin = (metric as any).pretaxMarginTTM as number | undefined;
  
  // Cash Flow per Share
  const cashFlowPerShareAnnual = (metric as any).cashFlowPerShareAnnual as number | undefined;
  const cashFlowPerShareQuarterly = (metric as any).cashFlowPerShareQuarterly as number | undefined;
  const cashFlowPerShareTTM = (metric as any).cashFlowPerShareTTM as number | undefined;
  
  // FCF per Share - check for freeCashFlowPerShare or similar
  const fcfPerShare = (metric as any).freeCashFlowPerShareTTM as number | undefined;
  
  // FCF CAGR (5 Year)
  const fcfCagr = (metric as any).focfCagr5Y as number | undefined;
  
  // Cash per Share
  const cashPerShare = (metric as any).cashPerSharePerShareAnnual as number | undefined;
  
  // Book Value per Share
  const bookValuePerShareAnnual = (metric as any).bookValuePerShareAnnual as number | undefined;
  const bookValuePerShareQuarterly = (metric as any).bookValuePerShareQuarterly as number | undefined;
  
  // Tangible Book Value per Share
  const tangibleBookValuePerShareAnnual = (metric as any).tangibleBookValuePerShareAnnual as number | undefined;
  const tangibleBookValuePerShareQuarterly = (metric as any).tangibleBookValuePerShareQuarterly as number | undefined;
  
  // Cash per Share (Quarterly)
  const cashPerSharePerShareQuarterly = (metric as any).cashPerSharePerShareQuarterly as number | undefined;
  
  // BV Growth (5 Year)
  const bvGrowth = (metric as any).bookValueShareGrowth5Y as number | undefined;
  
  // Additional Growth fields
  const capexCagr5Y = (metric as any).capexCagr5Y as number | undefined;
  const ebitdaCagr5Y = (metric as any).ebitdaCagr5Y as number | undefined;
  const ebitdaInterimCagr5Y = (metric as any).ebitdaInterimCagr5Y as number | undefined;
  const tbvCagr5Y = (metric as any).tbvCagr5Y as number | undefined;
  const netMarginGrowth5Y = (metric as any).netMarginGrowth5Y as number | undefined;
  
  // Margin fields (5Y, Annual, TTM)
  const grossMargin5Y = (metric as any).grossMargin5Y as number | undefined;
  const grossMarginAnnual = (metric as any).grossMarginAnnual as number | undefined;
  const grossMarginTTM = (metric as any).grossMarginTTM as number | undefined;
  
  const operatingMargin5Y = (metric as any).operatingMargin5Y as number | undefined;
  const operatingMarginAnnual = (metric as any).operatingMarginAnnual as number | undefined;
  const operatingMarginTTM = (metric as any).operatingMarginTTM as number | undefined;
  
  const netProfitMargin5Y = (metric as any).netProfitMargin5Y as number | undefined;
  const netProfitMarginAnnual = (metric as any).netProfitMarginAnnual as number | undefined;
  const netProfitMarginTTM = (metric as any).netProfitMarginTTM as number | undefined;
  
  const pretaxMargin5Y = (metric as any).pretaxMargin5Y as number | undefined;
  const pretaxMarginAnnual = (metric as any).pretaxMarginAnnual as number | undefined;
  const pretaxMarginTTM = (metric as any).pretaxMarginTTM as number | undefined;
  
  // EPS fields
  const epsAnnual = (metric as any).epsAnnual as number | undefined;
  const epsTTM = (metric as any).epsTTM as number | undefined;
  const epsBasicExclExtraItemsAnnual = (metric as any).epsBasicExclExtraItemsAnnual as number | undefined;
  const epsBasicExclExtraItemsTTM = (metric as any).epsBasicExclExtraItemsTTM as number | undefined;
  const epsExclExtraItemsAnnual = (metric as any).epsExclExtraItemsAnnual as number | undefined;
  const epsExclExtraItemsTTM = (metric as any).epsExclExtraItemsTTM as number | undefined;
  const epsInclExtraItemsAnnual = (metric as any).epsInclExtraItemsAnnual as number | undefined;
  const epsInclExtraItemsTTM = (metric as any).epsInclExtraItemsTTM as number | undefined;
  const epsNormalizedAnnual = (metric as any).epsNormalizedAnnual as number | undefined;
  
  // Performance fields
  const avgTradingVolume10Day = (metric as any)['10DayAverageTradingVolume'] as number | undefined;
  const priceReturn13Week = (metric as any)['13WeekPriceReturnDaily'] as number | undefined;
  const priceReturn26Week = (metric as any)['26WeekPriceReturnDaily'] as number | undefined;
  const adReturnStd3Month = (metric as any)['3MonthADReturnStd'] as number | undefined;
  const avgTradingVolume3Month = (metric as any)['3MonthAverageTradingVolume'] as number | undefined;
  const high52Week = (metric as any)['52WeekHigh'] as number | undefined;
  const high52WeekDate = (metric as any)['52WeekHighDate'] as string | undefined;
  const low52Week = (metric as any)['52WeekLow'] as number | undefined;
  const low52WeekDate = (metric as any)['52WeekLowDate'] as string | undefined;
  const priceReturn52Week = (metric as any)['52WeekPriceReturnDaily'] as number | undefined;
  const priceReturn5Day = (metric as any)['5DayPriceReturnDaily'] as number | undefined;
  const priceReturnMonthToDate = (metric as any).monthToDatePriceReturnDaily as number | undefined;
  const priceReturnYearToDate = (metric as any).yearToDatePriceReturnDaily as number | undefined;
  const priceRelativeToSP5004Week = (metric as any)['priceRelativeToS&P5004Week'] as number | undefined;
  const priceRelativeToSP50013Week = (metric as any)['priceRelativeToS&P50013Week'] as number | undefined;
  const priceRelativeToSP50026Week = (metric as any)['priceRelativeToS&P50026Week'] as number | undefined;
  const priceRelativeToSP50052Week = (metric as any)['priceRelativeToS&P50052Week'] as number | undefined;
  const priceRelativeToSP500Ytd = (metric as any)['priceRelativeToS&P500Ytd'] as number | undefined;
  const betaValue = (metric as any).beta as number | undefined;
  const marketCapFromMetric = (metric as any).marketCapitalization as number | undefined;
  
  return {
    ticker: apiStock.ticker || profile.ticker || 'N/A',
    company: profile.name || apiStock.ticker || 'N/A',
    sector: profile.gsector || profile.finnhubIndustry || 'N/A',
    industry: profile.gind || profile.finnhubIndustry || 'N/A',
    country: profile.country || 'US',
    exchange: profile.exchange || 'N/A',
    marketCap: marketCapFormatted,
    shares: sharesFormatted,
    employees: profile.employeeTotal || 'N/A',
    ipoDate: profile.ipo || 'N/A',
    website: profile.weburl || 'N/A',
    description: profile.description || 'N/A',
    address: profile.address || 'N/A',
    city: profile.city || 'N/A',
    state: profile.state || 'N/A',
    phone: profile.phone || 'N/A',
    currency: profile.currency || 'N/A',
    // Valuation metrics (from /stock/metric)
    peTTM: peTTM !== undefined ? formatNumber(peTTM, 2) : 'N/A',
    peAnnual: peAnnual !== undefined ? formatNumber(peAnnual, 2) : 'N/A',
    forwardPe: forwardPe !== undefined ? formatNumber(forwardPe, 2) : 'N/A',
    peBasicExclExtraTTM: peBasicExclExtraTTM !== undefined ? formatNumber(peBasicExclExtraTTM, 2) : 'N/A',
    peExclExtraAnnual: peExclExtraAnnual !== undefined ? formatNumber(peExclExtraAnnual, 2) : 'N/A',
    peExclExtraTTM: peExclExtraTTM !== undefined ? formatNumber(peExclExtraTTM, 2) : 'N/A',
    peInclExtraTTM: peInclExtraTTM !== undefined ? formatNumber(peInclExtraTTM, 2) : 'N/A',
    peNormalizedAnnual: peNormalizedAnnual !== undefined ? formatNumber(peNormalizedAnnual, 2) : 'N/A',
    pegTTM: pegTTM !== undefined ? formatNumber(pegTTM, 2) : 'N/A',
    psAnnual: psAnnual !== undefined ? formatNumber(psAnnual, 2) : 'N/A',
    psTTM: psTTM !== undefined ? formatNumber(psTTM, 2) : 'N/A',
    pb: pb !== undefined ? formatNumber(pb, 2) : 'N/A',
    pbAnnual: pbAnnual !== undefined ? formatNumber(pbAnnual, 2) : 'N/A',
    pbQuarterly: pbQuarterly !== undefined ? formatNumber(pbQuarterly, 2) : 'N/A',
    ptbvAnnual: ptbvAnnual !== undefined ? formatNumber(ptbvAnnual, 2) : 'N/A',
    ptbvQuarterly: ptbvQuarterly !== undefined ? formatNumber(ptbvQuarterly, 2) : 'N/A',
    evEbitdaTTM: evEbitdaTTM !== undefined ? formatNumber(evEbitdaTTM, 2) : 'N/A',
    evRevenueTTM: (evRevenueTTM !== undefined ? formatNumber(evRevenueTTM, 2) : evRevenueBracket !== undefined ? formatNumber(evRevenueBracket, 2) : 'N/A'),
    pfcfShareAnnual: pfcfShareAnnual !== undefined ? formatNumber(pfcfShareAnnual, 2) : 'N/A',
    pfcfShareTTM: pfcfShareTTM !== undefined ? formatNumber(pfcfShareTTM, 2) : 'N/A',
    pcfShareAnnual: pcfShareAnnual !== undefined ? formatNumber(pcfShareAnnual, 2) : 'N/A',
    pcfShareTTM: pcfShareTTM !== undefined ? formatNumber(pcfShareTTM, 2) : 'N/A',
    evFcfAnnual: evFcfAnnual !== undefined ? formatNumber(evFcfAnnual, 2) : 'N/A',
    evFcfTTM: evFcfTTM !== undefined ? formatNumber(evFcfTTM, 2) : 'N/A',
    enterpriseValue: enterpriseValue !== undefined ? formatNumber(enterpriseValue, 2) : 'N/A',
    epsGrowth3Y: epsGrowth3Y !== undefined ? formatPercent(epsGrowth3Y) : 'N/A',
    epsGrowth5Y: epsGrowth5Y !== undefined ? formatPercent(epsGrowth5Y) : 'N/A',
    epsGrowthQuarterlyYoy: epsGrowthQuarterlyYoy !== undefined ? formatPercent(epsGrowthQuarterlyYoy) : 'N/A',
    epsGrowthTTMYoy: epsGrowthTTMYoy !== undefined ? formatPercent(epsGrowthTTMYoy) : 'N/A',
    revenueGrowth3Y: revenueGrowth3Y !== undefined ? formatPercent(revenueGrowth3Y) : 'N/A',
    revenueGrowth5Y: revenueGrowth5Y !== undefined ? formatPercent(revenueGrowth5Y) : 'N/A',
    revenueGrowthQuarterlyYoy: revenueGrowthQuarterlyYoy !== undefined ? formatPercent(revenueGrowthQuarterlyYoy) : 'N/A',
    revenueGrowthTTMYoy: revenueGrowthTTMYoy !== undefined ? formatPercent(revenueGrowthTTMYoy) : 'N/A',
    revenueShareGrowth5Y: revenueShareGrowth5Y !== undefined ? formatPercent(revenueShareGrowth5Y) : 'N/A',
    capexCagr5Y: capexCagr5Y !== undefined ? formatPercent(capexCagr5Y) : 'N/A',
    ebitdaCagr5Y: ebitdaCagr5Y !== undefined ? formatPercent(ebitdaCagr5Y) : 'N/A',
    ebitdaInterimCagr5Y: ebitdaInterimCagr5Y !== undefined ? formatPercent(ebitdaInterimCagr5Y) : 'N/A',
    tbvCagr5Y: tbvCagr5Y !== undefined ? formatPercent(tbvCagr5Y) : 'N/A',
    netMarginGrowth5Y: netMarginGrowth5Y !== undefined ? formatPercent(netMarginGrowth5Y) : 'N/A',
    
    // Legacy fields for backward compatibility
    pe: peTTM !== undefined ? formatNumber(peTTM, 2) : 'N/A',
    price: 'N/A',
    change: 'N/A',
    changePercent: 'N/A',
    volume: 0,
    avgVolume: 0,
    // 52 Week High/Low
    high52w: (metric as any)['52WeekHigh'] !== undefined ? formatNumber((metric as any)['52WeekHigh'] as number, 2) : 'N/A',
    low52w: (metric as any)['52WeekLow'] !== undefined ? formatNumber((metric as any)['52WeekLow'] as number, 2) : 'N/A',
    // Year-to-date return
    ytdReturn: (metric as any).yearToDatePriceReturnDaily !== undefined ? formatPercent((metric as any).yearToDatePriceReturnDaily as number) : 'N/A',
    // Monthly return (4 week)
    monthlyReturn: (metric as any)['priceRelativeToS&P5004Week'] !== undefined ? formatPercent((metric as any)['priceRelativeToS&P5004Week'] as number) : 'N/A',
    // Weekly return (13 week)
    weeklyReturn: (metric as any)['priceRelativeToS&P50013Week'] !== undefined ? formatPercent((metric as any)['priceRelativeToS&P50013Week'] as number) : 'N/A',
    beta: (metric as any).beta !== undefined ? formatNumber((metric as any).beta as number, 2) : 'N/A',
    dividend: dividendYield !== undefined ? formatNumber(dividendYield, 2) : 'N/A',
    yield: 'N/A',
    float: 'N/A',
    insiderOwn: 'N/A',
    instOwn: 'N/A',
    roe: roeTTM !== undefined ? formatPercent(roeTTM) : 'N/A',
    roi: roicTTM !== undefined ? formatPercent(roicTTM) : 'N/A',
    // Efficiency fields
    assetTurnoverAnnual: assetTurnoverAnnual !== undefined ? formatNumber(assetTurnoverAnnual, 2) : 'N/A',
    assetTurnoverTTM: assetTurnoverTTM !== undefined ? formatNumber(assetTurnoverTTM, 2) : 'N/A',
    inventoryTurnoverAnnual: inventoryTurnoverAnnual !== undefined ? formatNumber(inventoryTurnoverAnnual, 2) : 'N/A',
    inventoryTurnoverTTM: inventoryTurnoverTTM !== undefined ? formatNumber(inventoryTurnoverTTM, 2) : 'N/A',
    receivablesTurnoverAnnual: receivablesTurnoverAnnual !== undefined ? formatNumber(receivablesTurnoverAnnual, 2) : 'N/A',
    receivablesTurnoverTTM: receivablesTurnoverTTM !== undefined ? formatNumber(receivablesTurnoverTTM, 2) : 'N/A',
    roi5Y: roi5Y !== undefined ? formatPercent(roi5Y) : 'N/A',
    roiAnnual: roiAnnual !== undefined ? formatPercent(roiAnnual) : 'N/A',
    roiTTM: roiTTM !== undefined ? formatPercent(roiTTM) : 'N/A',
    roa5Y: roa5Y !== undefined ? formatPercent(roa5Y) : 'N/A',
    roaRfy: roaRfy !== undefined ? formatPercent(roaRfy) : 'N/A',
    roaTTM: roaTTM !== undefined ? formatPercent(roaTTM) : 'N/A',
    roe5Y: roe5Y !== undefined ? formatPercent(roe5Y) : 'N/A',
    roeRfy: roeRfy !== undefined ? formatPercent(roeRfy) : 'N/A',
    roeTTM: roeTTM !== undefined ? formatPercent(roeTTM) : 'N/A',
    // Operational Metrics fields
    revenuePerShareAnnual: revenuePerShareAnnual !== undefined ? formatNumber(revenuePerShareAnnual, 2) : 'N/A',
    revenuePerShareTTM: revenuePerShareTTM !== undefined ? formatNumber(revenuePerShareTTM, 2) : 'N/A',
    netIncomeEmployeeAnnual: netIncomeEmployeeAnnual !== undefined ? formatNumber(netIncomeEmployeeAnnual, 2) : 'N/A',
    netIncomeEmployeeTTM: netIncomeEmployeeTTM !== undefined ? formatNumber(netIncomeEmployeeTTM, 2) : 'N/A',
    revenueEmployeeAnnual: revenueEmployeeAnnual !== undefined ? formatNumber(revenueEmployeeAnnual, 2) : 'N/A',
    revenueEmployeeTTM: revenueEmployeeTTM !== undefined ? formatNumber(revenueEmployeeTTM, 2) : 'N/A',
    netInterestCoverageAnnual: netInterestCoverageAnnual !== undefined ? formatNumber(netInterestCoverageAnnual, 2) : 'N/A',
    netInterestCoverageTTM: netInterestCoverageTTM !== undefined ? formatNumber(netInterestCoverageTTM, 2) : 'N/A',
    // Dividends fields
    currentDividendYieldTTM: currentDividendYieldTTM !== undefined ? formatPercent(currentDividendYieldTTM) : 'N/A',
    dividendPerShareAnnual: dividendPerShareAnnual !== undefined ? formatNumber(dividendPerShareAnnual, 2) : 'N/A',
    dividendPerShareTTM: dividendPerShareTTM !== undefined ? formatNumber(dividendPerShareTTM, 2) : 'N/A',
    dividendIndicatedAnnual: dividendIndicatedAnnual !== undefined ? formatNumber(dividendIndicatedAnnual, 2) : 'N/A',
    dividendYieldIndicatedAnnual: dividendYieldIndicatedAnnual !== undefined ? formatPercent(dividendYieldIndicatedAnnual) : 'N/A',
    dividendGrowthRate5Y: dividendGrowthRate5Y !== undefined ? formatPercent(dividendGrowthRate5Y) : 'N/A',
    payoutRatioAnnual: payoutRatioAnnual !== undefined ? formatPercent(payoutRatioAnnual) : 'N/A',
    payoutRatioTTM: payoutRatioTTM !== undefined ? formatPercent(payoutRatioTTM) : 'N/A',
    debtEq: debtEq !== undefined ? formatNumber(debtEq, 2) : 'N/A',
    eps: 'N/A',
    earnings: 'N/A',
    sales: 'N/A',
    book: 'N/A',
    cash: 'N/A',
    tgtPrice: 'N/A',
    recommendation: 'N/A',
    shortFloat: 'N/A',
    shortRatio: 'N/A',
    earningsDate: 'N/A',
    // Financial view specific fields
    dividendYield: dividendYield !== undefined ? formatNumber(dividendYield, 2) : 'N/A',
    roa: roaTTM !== undefined ? formatPercent(roaTTM) : 'N/A',
    currRatio: currentRatio !== undefined ? formatNumber(currentRatio, 2) : 'N/A',
    quickRatio: quickRatio !== undefined ? formatNumber(quickRatio, 2) : 'N/A',
    currentRatioAnnual: currentRatioAnnual !== undefined ? formatNumber(currentRatioAnnual, 2) : 'N/A',
    currentRatioQuarterly: currentRatioQuarterly !== undefined ? formatNumber(currentRatioQuarterly, 2) : 'N/A',
    quickRatioAnnual: quickRatioAnnual !== undefined ? formatNumber(quickRatioAnnual, 2) : 'N/A',
    quickRatioQuarterly: quickRatioQuarterly !== undefined ? formatNumber(quickRatioQuarterly, 2) : 'N/A',
    ltDebtEq: ltDebtEq !== undefined ? formatNumber(ltDebtEq, 2) : 'N/A',
    grossMargin: grossMargin !== undefined ? formatPercent(grossMargin) : 'N/A',
    operMargin: operMargin !== undefined ? formatPercent(operMargin) : 'N/A',
    profitMargin: profitMargin !== undefined ? formatPercent(profitMargin) : 'N/A',
    // Additional Financial fields
    pretaxMargin: pretaxMargin !== undefined ? formatPercent(pretaxMargin) : 'N/A',
    cashFlowPerShareAnnual: cashFlowPerShareAnnual !== undefined ? formatNumber(cashFlowPerShareAnnual, 2) : 'N/A',
    cashFlowPerShareQuarterly: cashFlowPerShareQuarterly !== undefined ? formatNumber(cashFlowPerShareQuarterly, 2) : 'N/A',
    cashFlowPerShareTTM: cashFlowPerShareTTM !== undefined ? formatNumber(cashFlowPerShareTTM, 2) : 'N/A',
    fcfPerShare: fcfPerShare !== undefined ? formatNumber(fcfPerShare, 2) : 'N/A',
    fcfCagr: fcfCagr !== undefined ? formatPercent(fcfCagr) : 'N/A',
    cashPerShare: cashPerShare !== undefined ? formatNumber(cashPerShare, 2) : 'N/A',
    cashPerSharePerShareQuarterly: cashPerSharePerShareQuarterly !== undefined ? formatNumber(cashPerSharePerShareQuarterly, 2) : 'N/A',
    bookValuePerShare: bookValuePerShareAnnual !== undefined ? formatNumber(bookValuePerShareAnnual, 2) : 'N/A',
    bookValuePerShareAnnual: bookValuePerShareAnnual !== undefined ? formatNumber(bookValuePerShareAnnual, 2) : 'N/A',
    bookValuePerShareQuarterly: bookValuePerShareQuarterly !== undefined ? formatNumber(bookValuePerShareQuarterly, 2) : 'N/A',
    tangibleBookValuePerShare: tangibleBookValuePerShareAnnual !== undefined ? formatNumber(tangibleBookValuePerShareAnnual, 2) : 'N/A',
    tangibleBookValuePerShareAnnual: tangibleBookValuePerShareAnnual !== undefined ? formatNumber(tangibleBookValuePerShareAnnual, 2) : 'N/A',
    tangibleBookValuePerShareQuarterly: tangibleBookValuePerShareQuarterly !== undefined ? formatNumber(tangibleBookValuePerShareQuarterly, 2) : 'N/A',
    totalDebtTotalEquityAnnual: totalDebtTotalEquityAnnual !== undefined ? formatNumber(totalDebtTotalEquityAnnual, 2) : 'N/A',
    totalDebtTotalEquityQuarterly: totalDebtTotalEquityQuarterly !== undefined ? formatNumber(totalDebtTotalEquityQuarterly, 2) : 'N/A',
    longTermDebtEquityAnnual: longTermDebtEquityAnnual !== undefined ? formatNumber(longTermDebtEquityAnnual, 2) : 'N/A',
    longTermDebtEquityQuarterly: longTermDebtEquityQuarterly !== undefined ? formatNumber(longTermDebtEquityQuarterly, 2) : 'N/A',
    bvGrowth: bvGrowth !== undefined ? formatPercent(bvGrowth) : 'N/A',
    // Margin fields (5Y, Annual, TTM)
    grossMargin5Y: grossMargin5Y !== undefined ? formatPercent(grossMargin5Y) : 'N/A',
    grossMarginAnnual: grossMarginAnnual !== undefined ? formatPercent(grossMarginAnnual) : 'N/A',
    grossMarginTTM: grossMarginTTM !== undefined ? formatPercent(grossMarginTTM) : 'N/A',
    operatingMargin5Y: operatingMargin5Y !== undefined ? formatPercent(operatingMargin5Y) : 'N/A',
    operatingMarginAnnual: operatingMarginAnnual !== undefined ? formatPercent(operatingMarginAnnual) : 'N/A',
    operatingMarginTTM: operatingMarginTTM !== undefined ? formatPercent(operatingMarginTTM) : 'N/A',
    netProfitMargin5Y: netProfitMargin5Y !== undefined ? formatPercent(netProfitMargin5Y) : 'N/A',
    netProfitMarginAnnual: netProfitMarginAnnual !== undefined ? formatPercent(netProfitMarginAnnual) : 'N/A',
    netProfitMarginTTM: netProfitMarginTTM !== undefined ? formatPercent(netProfitMarginTTM) : 'N/A',
    pretaxMargin5Y: pretaxMargin5Y !== undefined ? formatPercent(pretaxMargin5Y) : 'N/A',
    pretaxMarginAnnual: pretaxMarginAnnual !== undefined ? formatPercent(pretaxMarginAnnual) : 'N/A',
    pretaxMarginTTM: pretaxMarginTTM !== undefined ? formatPercent(pretaxMarginTTM) : 'N/A',
    // EPS fields
    epsAnnual: epsAnnual !== undefined ? formatNumber(epsAnnual, 2) : 'N/A',
    epsTTM: epsTTM !== undefined ? formatNumber(epsTTM, 2) : 'N/A',
    epsBasicExclExtraItemsAnnual: epsBasicExclExtraItemsAnnual !== undefined ? formatNumber(epsBasicExclExtraItemsAnnual, 2) : 'N/A',
    epsBasicExclExtraItemsTTM: epsBasicExclExtraItemsTTM !== undefined ? formatNumber(epsBasicExclExtraItemsTTM, 2) : 'N/A',
    epsExclExtraItemsAnnual: epsExclExtraItemsAnnual !== undefined ? formatNumber(epsExclExtraItemsAnnual, 2) : 'N/A',
    epsExclExtraItemsTTM: epsExclExtraItemsTTM !== undefined ? formatNumber(epsExclExtraItemsTTM, 2) : 'N/A',
    epsInclExtraItemsAnnual: epsInclExtraItemsAnnual !== undefined ? formatNumber(epsInclExtraItemsAnnual, 2) : 'N/A',
    epsInclExtraItemsTTM: epsInclExtraItemsTTM !== undefined ? formatNumber(epsInclExtraItemsTTM, 2) : 'N/A',
    epsNormalizedAnnual: epsNormalizedAnnual !== undefined ? formatNumber(epsNormalizedAnnual, 2) : 'N/A',
    // Performance fields
    avgTradingVolume10Day: avgTradingVolume10Day !== undefined ? formatNumber(avgTradingVolume10Day, 2) : 'N/A',
    priceReturn13Week: priceReturn13Week !== undefined ? formatPercent(priceReturn13Week) : 'N/A',
    priceReturn26Week: priceReturn26Week !== undefined ? formatPercent(priceReturn26Week) : 'N/A',
    adReturnStd3Month: adReturnStd3Month !== undefined ? formatNumber(adReturnStd3Month, 2) : 'N/A',
    avgTradingVolume3Month: avgTradingVolume3Month !== undefined ? formatNumber(avgTradingVolume3Month, 2) : 'N/A',
    high52Week: high52Week !== undefined ? formatNumber(high52Week, 2) : 'N/A',
    high52WeekDate: high52WeekDate || 'N/A',
    low52Week: low52Week !== undefined ? formatNumber(low52Week, 2) : 'N/A',
    low52WeekDate: low52WeekDate || 'N/A',
    priceReturn52Week: priceReturn52Week !== undefined ? formatPercent(priceReturn52Week) : 'N/A',
    priceReturn5Day: priceReturn5Day !== undefined ? formatPercent(priceReturn5Day) : 'N/A',
    priceReturnMonthToDate: priceReturnMonthToDate !== undefined ? formatPercent(priceReturnMonthToDate) : 'N/A',
    priceReturnYearToDate: priceReturnYearToDate !== undefined ? formatPercent(priceReturnYearToDate) : 'N/A',
    priceRelativeToSP5004Week: priceRelativeToSP5004Week !== undefined ? formatPercent(priceRelativeToSP5004Week) : 'N/A',
    priceRelativeToSP50013Week: priceRelativeToSP50013Week !== undefined ? formatPercent(priceRelativeToSP50013Week) : 'N/A',
    priceRelativeToSP50026Week: priceRelativeToSP50026Week !== undefined ? formatPercent(priceRelativeToSP50026Week) : 'N/A',
    priceRelativeToSP50052Week: priceRelativeToSP50052Week !== undefined ? formatPercent(priceRelativeToSP50052Week) : 'N/A',
    priceRelativeToSP500Ytd: priceRelativeToSP500Ytd !== undefined ? formatPercent(priceRelativeToSP500Ytd) : 'N/A',
    betaValue: betaValue !== undefined ? formatNumber(betaValue, 2) : 'N/A',
    marketCapFromMetric: marketCapFromMetric !== undefined ? formatNumber(marketCapFromMetric, 2) : 'N/A',
    fromCache: false,
    fetchedAt: apiStock.fetched_at || new Date().toISOString()
  };
}
