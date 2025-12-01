import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import TradingViewChart from '../components/TradingViewChart';
import { CandlestickData } from 'lightweight-charts';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  fetchStockCandles,
  fetchStockProfile,
  fetchStockProfileFromDb,
  fetchStockFinancials,
  fetchStockFinancialsFromDb,
  fetchRecommendationTrends,
  fetchRecommendationTrendsFromDb,
  fetchEarningsHistory,
  fetchEarningsHistoryFromDb,
  fetchCompanyNews,
  fetchCompanyNewsFromDb,
  fetchInsiderTransactions,
  fetchInsiderTransactionsFromDb,
  StockProfile as ApiStockProfile,
  StockFinancials,
  StockFinancialsSeriesEntry,
  RecommendationTrend,
  EarningsItem,
  CompanyNewsArticle,
  InsiderTransaction,
  transformStockData,
} from '../services/api';

interface StockData {
  symbol: string;
  name: string;
  website: string;
  lastClose: number;
  change: number;
  changePercent: number;
  prevClose: number;
  sector: string;
  industry: string;
  country: string;
  exchange: string;
  fundamentalsGrid: Record<string, string>;
  peers: string[];
  heldBy: string[];
  analystRatings: Array<{
    date: string;
    action: string;
    analyst: string;
    ratingChange: string;
    priceTarget: string;
  }>;
  news: Array<{
    time: string;
    title: string;
    source: string;
  }>;
  description: string;
  institutionalOwnership: Array<{
    name: string;
    percentage: string;
  }>;
}

interface CompanyNewsItem {
  id: number;
  date: string;
  time: string;
  source: string;
  headline: string;
  related?: string;
  summary?: string;
  url?: string;
}

const StockProfile = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');
  const [statementTab, setStatementTab] = useState('income');
  const [timeframe, setTimeframe] = useState<
    | 'intraday'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | '1year'
    | '5year'
    | '10year'
    | '20year'
    | '30year'
    | '40year'
    | '50year'
  >('intraday');
  const [intradayResolution, setIntradayResolution] = useState<'1' | '5' | '15' | '30' | '60'>('1');
  const [candlesData, setCandlesData] = useState<CandlestickData[] | null>(null);
  const [candlesLoading, setCandlesLoading] = useState(false);
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [profile, setProfile] = useState<ApiStockProfile | null>(null);
  const [priceInfo, setPriceInfo] = useState<{
    lastClose: number;
    prevClose: number;
    change: number;
    changePercent: number;
    lastTime: number;
  } | null>(null);
  const [financials, setFinancials] = useState<StockFinancials | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricModal, setMetricModal] = useState<{
    label: string;
    data: StockFinancialsSeriesEntry[];
  } | null>(null);
  const [metricsView, setMetricsView] = useState<'annual' | 'quarterly'>('annual');
  const [metricsFullViewOpen, setMetricsFullViewOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationTrend[] | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [earnings, setEarnings] = useState<EarningsItem[] | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [companyNews, setCompanyNews] = useState<CompanyNewsItem[]>([]);
  const [companyNewsLoading, setCompanyNewsLoading] = useState(false);
  const [companyNewsError, setCompanyNewsError] = useState<string | null>(null);
  const [insiderTransactions, setInsiderTransactions] = useState<InsiderTransaction[]>([]);
  const [insiderLoading, setInsiderLoading] = useState(false);
  const [insiderError, setInsiderError] = useState<string | null>(null);

  // Load company profile from database (read-only /db/profile/{ticker}) on initial load / ticker change
  useEffect(() => {
    const loadProfile = async () => {
      if (!ticker) return;
      const symbol = ticker.toUpperCase();
      try {
        setLoading(true);
        const dbProfile = await fetchStockProfileFromDb(symbol);
        setProfile(dbProfile);
      } catch (e) {
        console.error('❌ Error fetching DB profile for', symbol, e);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [ticker]);

  // Load basic financials (metrics) from database (read-only /db/basic-financials/{ticker}) on initial load / ticker change
  useEffect(() => {
    if (!ticker) return;
    const symbol = ticker.toUpperCase();

    const loadFinancials = async () => {
      try {
        setMetricsLoading(true);
        const dbFinancials = await fetchStockFinancialsFromDb(symbol);
        setFinancials(dbFinancials);
      } catch (e) {
        console.error('❌ Error fetching DB basic financials for', symbol, e);
        setFinancials(null);
      } finally {
        setMetricsLoading(false);
      }
    };

    loadFinancials();
  }, [ticker]);

  // On refresh, fetch latest profile & financials from Finnhub proxies (which also update DB),
  // and update UI with the fresh data.
  useEffect(() => {
    if (!ticker || refreshCounter === 0) return;
    const symbol = ticker.toUpperCase();

    const refreshProfileAndFinancials = async () => {
      try {
        const [liveProfile, liveFinancials] = await Promise.all([
          fetchStockProfile(symbol),
          fetchStockFinancials(symbol),
        ]);

        if (liveProfile) {
          setProfile(liveProfile);
        }
        if (liveFinancials) {
          setFinancials(liveFinancials);
        }
      } catch (e) {
        console.error('❌ Error refreshing live profile/financials for', symbol, e);
      }
    };

    refreshProfileAndFinancials();
  }, [ticker, refreshCounter]);

  const formatMetricKey = (key: string): string =>
    key
      .replace(/TTM$/i, ' TTM')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase());

  const metricDescriptions: Record<
    string,
    {
      acronym: string;
      description: string;
    }
  > = {
    // Asset Turnover TTM (Quarterly / Annual base key: "assetTurnover")
    assetTurnover: {
      acronym: 'Asset Turnover',
      description:
        'Asset Turnover TTM: trailing 12‑month revenue divided by average assets. Higher turnover means more efficient use of assets and supports stronger ROA/ROE and often better stock performance; sharp drops can flag deteriorating efficiency before earnings fully reflect it.',
    },
    // Book Value (Annual)
    // series key: "bookValue"
    bookValue: {
      acronym: 'BVPS',
      description:
        'Book Value: shareholders’ equity on the balance sheet (assets minus liabilities) on a per‑share basis. Higher or steadily growing book value per share can support the stock price over the long term, especially for value investors who compare it to market cap via P/B multiples.',
    },

    // Cash Ratio (Annual)
    cashRatio: {
      acronym: 'Cash Ratio',
      description:
        'Cash Ratio: cash and cash equivalents divided by current liabilities, showing the company’s ability to cover short‑term obligations with just cash. Very low levels can raise liquidity concerns and pressure the stock, while very high levels may suggest a strong safety buffer but also potentially underused cash.',
    },

    // Current Ratio (Annual)
    currentRatio: {
      acronym: 'Current Ratio',
      description:
        'Current Ratio: current assets divided by current liabilities, a broad measure of short‑term liquidity. Too low can signal financial stress and downside risk for the stock; too high may indicate idle working capital, but generally a healthy ratio reduces bankruptcy risk and can support valuations.',
    },

    // EBIT Per Share (Annual)
    ebitPerShare: {
      acronym: 'EBIT/Share',
      description:
        'EBIT Per Share: operating profit (Earnings Before Interest and Taxes) allocated to each share. Rising EBIT per share usually signals improving core profitability and often supports stock price appreciation; persistent declines can lead to multiple compression and underperformance.',
    },

    // EPS – Earnings Per Share (Annual)
    eps: {
      acronym: 'EPS',
      description:
        'Earnings Per Share (EPS): net profit attributable to each share. Sustained EPS growth is one of the strongest drivers of long‑term stock returns; earnings disappointments versus expectations often trigger sharp short‑term price drops.',
    },

    // EV – Enterprise Value (Annual) - series key: "ev"
    ev: {
      acronym: 'EV',
      description:
        'Enterprise Value (EV): market value of equity plus net debt; a measure of the company’s total value to all capital providers. Changes in EV reflect both stock price moves and capital structure; investors compare EV to EBITDA, sales, etc. to judge whether the stock is cheap or expensive.',
    },

    // EV / EBITDA (Annual) - series key: "evEbitda"
    evEbitda: {
      acronym: 'EV/EBITDA',
      description:
        'EV / EBITDA: enterprise value divided by EBITDA, a common valuation multiple. Lower EV/EBITDA vs. peers can support stock upside if fundamentals are stable (undervaluation), while a very high multiple only holds if the market expects strong growth; if growth disappoints, the stock often de‑rates.',
    },

    // EV / Revenue (Annual) - series key: "evRevenue"
    evRevenue: {
      acronym: 'EV/Revenue',
      description:
        'EV / Revenue: enterprise value divided by revenue. Used mostly when earnings are volatile or negative; higher multiples imply higher growth/quality expectations. If sales growth or margins deteriorate, this multiple tends to compress and can drag the stock down.',
    },

    // FCF Margin (Annual) - series key: "fcfMargin"
    fcfMargin: {
      acronym: 'FCF Margin',
      description:
        'Free Cash Flow (FCF) Margin: free cash flow as a percentage of revenue. Higher and improving FCF margins usually support higher valuations because they show the company converts sales into real cash; sustained deterioration can undermine confidence and pressure the stock.',
    },
    // FCF Per Share TTM (Quarterly / Annual base key: "fcfPerShare")
    fcfPerShare: {
      acronym: 'FCF/Share',
      description:
        'FCF Per Share TTM: trailing 12‑month free cash flow allocated to each share. Rising FCF per share is a powerful signal of improving cash generation and is often rewarded with a higher valuation multiple; persistent declines can lead to de‑rating and weaker stock performance.',
    },

    // Gross Margin (Annual)
    grossMargin: {
      acronym: 'Gross Margin',
      description:
        'Gross Margin: gross profit as a percentage of revenue. Rising gross margins often signal better pricing power or cost control and are typically positive for the stock; shrinking margins can indicate competitive pressure or rising input costs and may weigh on valuation.',
    },

    // Inventory Turnover (Annual)
    inventoryTurnover: {
      acronym: 'Inv. Turnover',
      description:
        'Inventory Turnover: cost of goods sold divided by average inventory, measuring how quickly inventory is sold. Higher turnover usually means efficient operations and lower risk of markdowns, supportive for profitability and the stock; very low turnover can hint at weak demand or obsolete inventory.',
    },

    // Long-Term Debt / Total Assets (Annual) - series key: "longtermDebtTotalAsset"
    longtermDebtTotalAsset: {
      acronym: 'LT Debt / Assets',
      description:
        'Long‑Term Debt to Total Assets: long‑term debt as a share of total assets. Higher ratios mean more leverage and financial risk; in downturns this can amplify stock price declines, while moderate leverage can enhance returns when business conditions are strong.',
    },

    // Long-Term Debt / Total Capital (Annual) - series key: "longtermDebtTotalCapital"
    longtermDebtTotalCapital: {
      acronym: 'LT Debt / Capital',
      description:
        'Long‑Term Debt to Total Capital: long‑term debt divided by total capital (debt + equity). A rising ratio indicates the firm is relying more on debt financing, which can boost EPS but also increases risk and can lead to a valuation discount if investors worry about solvency.',
    },

    // Long-Term Debt / Total Equity (Annual) - series key: "longtermDebtTotalEquity"
    longtermDebtTotalEquity: {
      acronym: 'LT Debt / Equity',
      description:
        'Long‑Term Debt to Equity: long‑term debt compared to shareholders’ equity. High or rapidly rising leverage often makes the stock more sensitive to interest rates and downturns; investors may demand a lower valuation multiple as compensation for this risk.',
    },

    // Net Debt / Total Capital (Annual)
    netDebtToTotalCapital: {
      acronym: 'Net Debt / Capital',
      description:
        'Net Debt to Total Capital: net debt (debt minus cash) as a percentage of total capital. Lower ratios (or net cash) typically support higher valuations by reducing default risk; highly levered companies can see outsized stock moves both up (when things improve) and down (if conditions worsen).',
    },

    // Net Debt / Total Equity (Annual) - series key: "netDebtToTotalEquity"
    netDebtToTotalEquity: {
      acronym: 'Net Debt / Equity',
      description:
        'Net Debt to Total Equity: net debt relative to equity. Similar to debt/equity but nets out cash; high values point to aggressive leverage. In stressed periods this can lead to sharp stock declines; deleveraging trends often act as a positive catalyst.',
    },

    // Net Margin (Annual)
    netMargin: {
      acronym: 'Net Margin',
      description:
        'Net Margin: net income as a percentage of revenue. Higher and stable net margins usually support premium valuations; margin compression often signals competitive or cost pressures and can trigger multiple contraction and stock underperformance.',
    },

    // Operating Margin (Annual)
    operatingMargin: {
      acronym: 'Op Margin',
      description:
        'Operating Margin: operating income as a percentage of revenue. Rising operating margins indicate more profitable core operations and often coincide with stock outperformance; falling margins are a warning sign the market closely watches.',
    },

    // Payout Ratio (Annual) - series key: "payoutRatio"
    payoutRatio: {
      acronym: 'Payout Ratio',
      description:
        'Payout Ratio: dividends as a share of earnings. Moderate payout ratios can be attractive to income investors and support the stock; very high or unsustainably rising ratios may signal that dividends are at risk, which can hurt sentiment if a cut occurs.',
    },

    // P/B – Price to Book (Annual) - series key: "pb"
    pb: {
      acronym: 'P/B',
      description:
        'P/B (Price to Book): share price divided by book value per share. Low P/B can suggest the stock is undervalued or the market is pricing in structural problems; rising P/B over time usually reflects improved profitability or investor confidence.',
    },

    // P/E – Price to Earnings (Annual) - series key: "pe"
    pe: {
      acronym: 'P/E',
      description:
        'P/E (Price to Earnings): share price divided by EPS. A higher P/E indicates the market is paying more for each dollar of earnings (growth or quality expectations); if earnings disappoint or growth slows, high‑P/E stocks often fall more as the multiple compresses.',
    },

    // P/FCF – Price to Free Cash Flow (Annual) - series key: "pfcf"
    pfcf: {
      acronym: 'P/FCF',
      description:
        'P/FCF (Price to Free Cash Flow): market cap divided by free cash flow. Lower P/FCF suggests cash‑flow‑based undervaluation; rising valuations (higher P/FCF) typically require confidence in durable FCF growth to be sustained.',
    },

    // Pretax Margin (Annual)
    pretaxMargin: {
      acronym: 'Pretax Margin',
      description:
        'Pretax Margin: earnings before tax as a percentage of revenue. It reflects underlying profitability before tax effects; improving pretax margins often lead to better earnings and can support stock gains, while persistent compression is viewed negatively.',
    },

    // P/S – Price to Sales (Annual) - series key: "ps"
    ps: {
      acronym: 'P/S',
      description:
        'P/S (Price to Sales): market cap divided by annual revenue. High P/S usually implies strong growth expectations; if revenue growth slows or margins stay weak, P/S tends to fall and can drag the stock lower.',
    },

    // P/TBV – Price to Tangible Book (Annual) - series key: "ptbv"
    ptbv: {
      acronym: 'P/TBV',
      description:
        'P/TBV (Price to Tangible Book): share price divided by tangible book value per share (excludes intangibles like goodwill). Low P/TBV can indicate deep value or distress; when fundamentals stabilize, re‑rating from low P/TBV levels can drive strong stock rebounds.',
    },

    // Quick Ratio (Annual)
    quickRatio: {
      acronym: 'Quick Ratio',
      description:
        'Quick Ratio: (cash + marketable securities + receivables) divided by current liabilities. Focuses on the most liquid assets; higher quick ratios reduce short‑term liquidity risk and can support investor confidence, while very low levels can raise default concerns.',
    },

    // Receivables Turnover (Annual)
    receivablesTurnover: {
      acronym: 'Recv. Turnover',
      description:
        'Receivables Turnover: net credit sales divided by average receivables, showing how quickly customers pay. Higher turnover suggests good credit quality and cash collection, supportive for cash flows; deteriorating turnover can be an early warning sign of stress and may weigh on the stock.',
    },

    // ROA – Return on Assets (Annual)
    roa: {
      acronym: 'ROA',
      description:
        'ROA (Return on Assets): net income divided by total assets, showing how efficiently assets generate profit. Higher ROA is associated with higher quality and often better stock performance over time; declining ROA can lead investors to assign lower valuation multiples.',
    },

    // ROE – Return on Equity (Annual)
    roe: {
      acronym: 'ROE',
      description:
        'ROE (Return on Equity): net income divided by shareholders’ equity. Sustained high ROE, especially without excessive leverage, is strongly linked to higher valuations and long‑run stock outperformance; falling or volatile ROE often hurts investor confidence.',
    },

    // ROIC – Return on Invested Capital (Annual)
    roic: {
      acronym: 'ROIC',
      description:
        'ROIC (Return on Invested Capital): after‑tax operating profit divided by invested capital. When ROIC consistently exceeds the cost of capital, value is being created and the market often rewards the stock; ROIC below the cost of capital signals value destruction and can justify a valuation discount.',
    },

    // ROTC – Return on Total Capital (Annual) - series key: "rotc"
    rotc: {
      acronym: 'ROTC',
      description:
        'ROTC (Return on Total Capital): earnings relative to total capital (debt + equity). Similar to ROIC but sometimes broader; higher ROTC indicates efficient use of financing and tends to support higher valuations, while falling ROTC can pressure the stock.',
    },

    // Sales Per Share (Annual)
    salesPerShare: {
      acronym: 'Sales/Share',
      description:
        'Sales Per Share: revenue divided by shares outstanding. Steady growth in sales per share supports the earnings and cash flow story behind a stock; stagnation or decline can signal maturing or shrinking demand and weigh on price.',
    },

    // SG&A to Sales (Annual) - series key: "sgaToSale"
    sgaToSale: {
      acronym: 'SG&A / Sales',
      description:
        'SG&A to Sales: selling, general & administrative expenses as a percentage of revenue. Falling SG&A as a share of sales implies better cost efficiency and can boost margins and valuation; rising SG&A burden without revenue payoff can lead investors to question management effectiveness.',
    },

    // Tangible Book Value (Annual) - series key: "tangibleBookValue"
    tangibleBookValue: {
      acronym: 'TBVPS',
      description:
        'Tangible Book Value: shareholders’ equity minus intangible assets and goodwill, on a per‑share basis. It represents the net value of tangible assets; for distressed or highly leveraged companies, tangible book value can act as a rough downside reference for valuation.',
    },

    // Total Debt / Equity (Annual)
    totalDebtToEquity: {
      acronym: 'Debt / Equity',
      description:
        'Total Debt to Equity: total debt relative to shareholders’ equity. Higher leverage can magnify returns when times are good but also increases financial risk; highly levered firms usually trade at lower multiples and their stocks swing more with credit conditions.',
    },

    // Total Debt / Total Assets (Annual) - series key: "totalDebtToTotalAsset"
    totalDebtToTotalAsset: {
      acronym: 'Debt / Assets',
      description:
        'Total Debt to Total Assets: total debt as a percentage of total assets. Shows how much of the asset base is financed by debt; rising ratios increase vulnerability to downturns and may pressure the stock if investors fear balance‑sheet risk.',
    },

    // Total Debt / Total Capital (Annual)
    totalDebtToTotalCapital: {
      acronym: 'Debt / Capital',
      description:
        'Total Debt to Total Capital: total debt divided by total capital (debt + equity). A key leverage indicator; moderate levels are normal, but very high levels can lead to higher required returns from investors and a lower equity valuation.',
    },

    // Total Ratio (Annual)
    totalRatio: {
      acronym: 'Total Ratio',
      description:
        'Total Ratio: composite leverage/coverage indicator from Finnhub basic financials. Deterioration in this ratio (pointing to higher overall risk) tends to be viewed negatively by the market; improvement generally supports stronger confidence in the balance sheet and can help the stock.',
    },
  };

  const getMetricInfo = (rawKey: string) => {
    const baseKey = rawKey.replace(/TTM$/i, '');
    const info = metricDescriptions[baseKey];
    if (info) return info;
    const acronym = baseKey.toUpperCase();
    return {
      acronym,
      description: `${formatMetricKey(baseKey)}: time‑series metric from Finnhub basic financials.`,
    };
  };

  const formatInsiderChange = (value: number) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString(undefined, {
      maximumFractionDigits: absValue < 1 ? 4 : 0,
    });
    return `${value >= 0 ? '+' : '-'}${formatted}`;
  };

  const formatShares = (value: number) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return value.toLocaleString();
  };

  const formatPrice = (value: number) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Annual metric series (dynamic from financials.series.annual)
  const annualMetricCharts = useMemo(() => {
    if (!financials?.series?.annual) return [];
    const annual = financials.series.annual as Record<string, StockFinancialsSeriesEntry[]>;

    return Object.entries(annual)
      .filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
      .map(([metricKey, arr]) => ({
        key: `annual-${metricKey}`,
        metricKey,
        label: `${formatMetricKey(metricKey)} (Annual)`,
        // Oldest on the left, latest on the right
        data: [...arr].sort(
          (a, b) => new Date(a.period).getTime() - new Date(b.period).getTime()
        ),
      }));
  }, [financials]);

  // Quarterly metric series (dynamic from financials.series.quarterly)
  const quarterlyMetricCharts = useMemo(() => {
    if (!financials?.series?.quarterly) return [];
    const quarterly = financials.series.quarterly as Record<string, StockFinancialsSeriesEntry[]>;

    return Object.entries(quarterly)
      .filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
      .map(([metricKey, arr]) => ({
        key: `quarterly-${metricKey}`,
        metricKey,
        label: `${formatMetricKey(metricKey)} (Quarterly)`,
        // Oldest on the left, latest on the right
        data: [...arr].sort(
          (a, b) => new Date(a.period).getTime() - new Date(b.period).getTime()
        ),
      }));
  }, [financials]);

  // Transform profile + financials into a flattened metrics object (re‑use existing transformer)
  const transformedFinancials = useMemo(() => {
    if (!profile && !financials) return null;
    const symbol = (profile?.ticker || ticker?.toUpperCase() || '').toUpperCase();
    try {
      const apiLikeStock = {
        ticker: symbol,
        profile: profile || undefined,
        financials: financials || undefined,
        fetched_at: new Date().toISOString(),
      } as any;
      return transformStockData(apiLikeStock);
    } catch (e) {
      console.error('❌ Error transforming financials for fundamentals grid', e);
      return null;
    }
  }, [profile, financials, ticker]);

  // Build a flat table of ALL raw metric fields from /basic-financials.metric
  const allMetricRows = useMemo(() => {
    if (!financials?.metric) return [];
    return Object.entries(financials.metric)
      .filter(([, v]) => v !== null && v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [financials]);

  // Load recommendation trends:
  // - Initial load: from DB-only endpoint /db/recommendation/{ticker}
  // - On refresh: from live Finnhub proxy (which also updates DB)
  useEffect(() => {
    if (!ticker) return;
    const symbol = ticker.toUpperCase();

    const loadRecommendations = async () => {
      try {
        setRecommendationsLoading(true);
        if (refreshCounter === 0) {
          // First load: read from DB cache only
          const fromDb = await fetchRecommendationTrendsFromDb(symbol);
          setRecommendations(fromDb);
        } else {
          // On refresh: hit Finnhub proxy + save_to_db=true
          const response = await fetchRecommendationTrends(symbol, true);
          setRecommendations(response?.data ?? null);
        }
      } catch (e) {
        console.error('❌ Error fetching recommendation trends for', symbol, e);
        setRecommendations(null);
      } finally {
        setRecommendationsLoading(false);
      }
    };

    loadRecommendations();
  }, [ticker, refreshCounter]);

  const recommendationChartData = useMemo(() => {
    if (!recommendations) return [];
    return [...recommendations]
      .sort((a, b) => {
        const dateA = new Date(a.period).getTime();
        const dateB = new Date(b.period).getTime();
        return dateA - dateB; // oldest left, latest right
      })
      .map((entry) => ({
        ...entry,
        periodLabel: entry.period,
      }));
  }, [recommendations]);

  // Load earnings surprises from backend
  useEffect(() => {
    if (!ticker) return;
    const symbol = ticker.toUpperCase();

    const loadEarnings = async () => {
      try {
        setEarningsLoading(true);
        if (refreshCounter === 0) {
          // First load: read from DB cache only
          const fromDb = await fetchEarningsHistoryFromDb(symbol);
          setEarnings(fromDb);
        } else {
          // On refresh: hit Finnhub proxy + save_to_db=true
          const response = await fetchEarningsHistory(symbol, 5, true);
          setEarnings(response?.data ?? null);
        }
      } catch (e) {
        console.error('❌ Error fetching earnings history for', symbol, e);
        setEarnings(null);
      } finally {
        setEarningsLoading(false);
      }
    };

    loadEarnings();
  }, [ticker, refreshCounter]);

  // Load company-specific news from backend (Finnhub /company-news via backend)
  useEffect(() => {
    if (!ticker) return;
    const symbol = ticker.toUpperCase();

    const loadCompanyNews = async () => {
      try {
        setCompanyNewsLoading(true);
        setCompanyNewsError(null);

        const today = new Date();
        const toStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 30); // last 30 days
        const fromStr = fromDate.toISOString().split('T')[0];

        let articles: CompanyNewsArticle[] = [];

        if (refreshCounter === 0) {
          // First load: try DB-only endpoint
          const dbResp = await fetchCompanyNewsFromDb(symbol, 100);
          articles = dbResp?.data ?? [];
        } else {
          // On refresh: hit Finnhub proxy + save_to_db=true
          const resp = await fetchCompanyNews(symbol, fromStr, toStr, true);
          articles = resp?.data ?? [];
        }

        const mapped: CompanyNewsItem[] = articles.map((a) => {
          const dt = new Date(a.datetime * 1000);
          const date = dt.toISOString().split('T')[0];
          const time = dt.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          });
          return {
            id: a.id,
            date,
            time,
            source: a.source,
            headline: a.headline,
            related: a.related,
            summary: a.summary,
            url: a.url,
          };
        });

        setCompanyNews(mapped);
      } catch (e) {
        console.error('❌ Error fetching company news for', symbol, e);
        setCompanyNews([]);
        setCompanyNewsError('Failed to load company news.');
      } finally {
        setCompanyNewsLoading(false);
      }
    };

    loadCompanyNews();
  }, [ticker, refreshCounter]);

  // Load insider transactions (Finnhub /stock/insider-transactions via backend)
  useEffect(() => {
    if (!ticker) return;
    const symbol = ticker.toUpperCase();

    const loadInsiderTransactions = async () => {
      try {
        setInsiderLoading(true);
        setInsiderError(null);

        if (refreshCounter === 0) {
          // First load: read from DB cache only
          const fromDb = await fetchInsiderTransactionsFromDb(symbol, 25);
          setInsiderTransactions(fromDb ?? []);
        } else {
          // On refresh: hit Finnhub proxy + save_to_db=true
          const resp = await fetchInsiderTransactions(symbol, 25, true);
          setInsiderTransactions(resp?.data ?? []);
        }
      } catch (e) {
        console.error('❌ Error fetching insider transactions for', symbol, e);
        setInsiderTransactions([]);
        setInsiderError('Failed to load insider transactions.');
      } finally {
        setInsiderLoading(false);
      }
    };

    loadInsiderTransactions();
  }, [ticker, refreshCounter]);

  // Transform earnings API data into EPS surprises points for chart
  const epsPoints = useMemo(() => {
    if (!earnings || earnings.length === 0) return [];
    return [...earnings]
      .filter((e) => e.actual != null && e.estimate != null)
      .sort((a, b) => {
        const da = new Date(a.period).getTime();
        const db = new Date(b.period).getTime();
        return da - db; // oldest left, latest right
      })
      .map((e) => {
        const actual = e.actual ?? 0;
        const estimate = e.estimate ?? 0;
        const surprise = actual - estimate;
        const diff = Math.abs(surprise);
        let surpriseLabel: string;
        if (diff === 0) {
          surpriseLabel = 'Beat: 0';
        } else if (surprise > 0) {
          surpriseLabel = `Beat: ${diff.toFixed(2)}`;
        } else {
          surpriseLabel = `Missed: ${diff.toFixed(2)}`;
        }
        return {
          period: e.period,
          actual,
          estimate,
          surprise,
          surpriseLabel,
        };
      });
  }, [earnings]);

  // Unique X-axis tick labels (one per period, in the same order as points)
  const epsXTicks = useMemo(() => {
    const seen = new Set<string>();
    const ticks: string[] = [];
    for (const p of epsPoints) {
      if (!seen.has(p.period)) {
        seen.add(p.period);
        ticks.push(p.period);
      }
    }
    return ticks;
  }, [epsPoints]);

  // Auto-computed Y-axis domain and ticks for EPS chart based on actual/estimate
  const epsYAxis = useMemo(() => {
    if (!epsPoints.length) return null;
    const values: number[] = [];
    epsPoints.forEach((p) => {
      values.push(p.actual, p.estimate);
    });
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    if (!isFinite(rawMin) || !isFinite(rawMax)) return null;
    const range = rawMax - rawMin || 0.2;
    const padding = range * 0.2;
    const min = rawMin - padding;
    const max = rawMax + padding;
    const step = (max - min) / 4;
    const ticks = Array.from({ length: 5 }, (_, i) =>
      Number((min + step * i).toFixed(2))
    );
    return {
      domain: [min, max] as [number, number],
      ticks,
    };
  }, [epsPoints]);

  // Custom tick component for EPS surprises X-axis (date + Beat/Missed line)
  const EPSAxisTick: React.FC<any> = ({ x, y, payload }) => {
    const dateLabel: string = payload?.value ?? '';
    const point = epsPoints.find((p) => p.period === dateLabel);
    const surpriseLabel = point?.surpriseLabel || '';
    const surpriseValue = typeof point?.surprise === 'number' ? point.surprise : 0;
    const surpriseColor =
      surpriseValue < 0 ? 'var(--negative)' : 'var(--positive)';

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={0}
          textAnchor="middle"
          style={{ fontSize: '0.8em', fill: 'var(--text-secondary)' }}
        >
          {dateLabel}
        </text>
        {surpriseLabel && (
          <text
            x={0}
            y={0}
            dy={15}
            textAnchor="middle"
            style={{ fontSize: '0.8em', fill: surpriseColor }}
          >
            {surpriseLabel}
          </text>
        )}
      </g>
    );
  };

  // Static mock data for detail tables (peers, ratings, description, ownership, statements)
  useEffect(() => {
    if (!ticker) return;
    try {
      const mockData: StockData = {
        symbol: ticker.toUpperCase(),
        name: 'Apple Inc',
        website: 'http://www.apple.com/',
        lastClose: 271.49,
        change: 5.24,
        changePercent: 1.97,
        prevClose: 266.25,
        sector: 'Technology',
        industry: 'Consumer Electronics',
        country: 'USA',
        exchange: 'NASD',
        fundamentalsGrid: {
          'Index': 'DJIA, NDX, S&P 500',
          'P/E': '36.40',
          'EPS (ttm)': '7.46',
          'Insider Own': '0.12%',
          'Shs Outstand': '14.77B',
          'Perf Week': '-0.34%',
          'Market Cap': '4011.63B',
          'Forward P/E': '29.89',
          'Insider Trans': '-1.95%',
          'Shs Float': '14.76B',
          'Perf Month': '4.59%',
          'Enterprise Value': '4069.31B',
          'PEG': '3.66',
          'EPS next Q': '2.67',
          'Inst Own': '64.84%',
          'Short Float': '0.78%',
          'Perf Quarter': '19.51%',
          'Income': '112.01B',
          'P/S': '9.64',
          'EPS this Y': '10.39%',
          'Inst Trans': '-0.13%',
          'Short Ratio': '2.29%',
          'Perf Half Y': '39.03%',
          'Sales': '416.16B',
          'P/B': '54.40',
          'EPS next Y': '10.29%',
          'ROA': '30.93%',
          'Short Interest': '115.56M',
          'Perf YTD': '8.41%',
          'Book/sh': '4.99',
          'P/C': '73.34',
          'EPS next 5Y': '9.95%',
          'ROE': '171.42%',
          '52W High': '277.32 -2.10%',
          'Perf Year': '18.93%',
          'Cash/sh': '3.70',
          'P/FCF': '40.62',
          'EPS past 5Y': '6.89% / 17.91%',
          'ROIC': '68.44%',
          '52W Low': '169.21 60.45%',
          'Perf 3Y': '82.47%',
          'Dividend Est.': '1.07 (0.39%)',
          'EV/EBITDA': '28.11',
          'Sales past 5Y': '1.81% / 8.71%',
          'Gross Margin': '46.91%',
          'Volatility': '2.56% 2.05%',
          'Perf 5Y': '125.68%',
          'Dividend TTM': '1.03 (0.38%)',
          'EV/Sales': '9.78',
          'EPS Y/Y TTM': '22.85%',
          'Oper. Margin': '31.97%',
          'ATR (14)': '5.88',
          'Perf 10Y': '866.67%',
          'Dividend Ex-Date': 'Nov 10, 2025',
          'Quick Ratio': '0.86',
          'Sales Y/Y TTM': '6.43%',
          'Profit Margin': '26.92%',
          'RSI (14)': '59.68',
          'Recom': '2.06',
          'Dividend Gr 3/5Y': '4.26% / 4.98%',
          'Current Ratio': '0.89',
          'EPS Q/Q': '91.14%',
          'SMA20': '0.52%',
          'Beta': '1.09',
          'Target Price': '285.54',
          'Payout': '13.66%',
          'Debt/Eq': '1.52',
          'Sales Q/Q': '7.94%',
          'SMA50': '4.63%',
          'Rel Volume': '1.16',
          'Prev Close': '266.25',
          'Employees': '166000',
          'LT Debt/Eq': '1.22',
          'Earnings': 'Oct 30 AMC',
          'SMA200': '19.99%',
          'Avg Volume': '50.50M',
          'Price': '271.49',
          'IPO': 'Dec 12, 1980',
          'Option/Short': 'Yes / Yes',
          'EPS/Sales Surpr.': '4.10% / 0.23%',
          'Trades': '',
          'Volume': '58,735,354',
          'Change': '1.97%',
        },
        peers: ['MSFT', 'SONY', 'DELL', 'GOOGL', 'HPQ', 'AMZN', 'NVDA', 'IBM', 'META', 'NFLX'],
        heldBy: ['VTI', 'VOO', 'IVV', 'SPY', 'VUG', 'QQQ', 'VGT', 'IWF', 'XLK', 'SPLG'],
        analystRatings: [
          { date: 'Nov-04-25', action: 'Upgrade', analyst: 'DZ Bank', ratingChange: 'Hold → Buy', priceTarget: '$300' },
          { date: 'Nov-03-25', action: 'Reiterated', analyst: 'Barclays', ratingChange: 'Underweight', priceTarget: '$180 → $230' },
          { date: 'Oct-31-25', action: 'Upgrade', analyst: 'Jefferies', ratingChange: 'Underperform → Hold', priceTarget: '$246.99' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'Wells Fargo', ratingChange: 'Overweight', priceTarget: '$290 → $300' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'UBS', ratingChange: 'Neutral', priceTarget: '$220 → $280' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'TD Cowen', ratingChange: 'Buy', priceTarget: '$275 → $325' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'Robert W. Baird', ratingChange: 'Outperform', priceTarget: '$280 → $300' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'Morgan Stanley', ratingChange: 'Overweight', priceTarget: '$298 → $305' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'Monness Crespi', ratingChange: 'Buy', priceTarget: '$270 → $300' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'Melius', ratingChange: 'Buy', priceTarget: '$290 → $345' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'JP Morgan', ratingChange: 'Overweight', priceTarget: '$290 → $305' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'Goldman', ratingChange: 'Buy', priceTarget: '$279 → $320' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'Evercore ISI', ratingChange: 'Outperform', priceTarget: '$290 → $300' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'DA Davidson', ratingChange: 'Neutral', priceTarget: '$250 → $270' },
          { date: 'Oct-31-25', action: 'Reiterated', analyst: 'Citigroup', ratingChange: 'Buy', priceTarget: '$245 → $315' },
          { date: 'Oct-29-25', action: 'Reiterated', analyst: 'BofA Securities', ratingChange: 'Buy', priceTarget: '$270 → $320' },
          { date: 'Oct-28-25', action: 'Reiterated', analyst: 'Robert W. Baird', ratingChange: 'Outperform', priceTarget: '$230 → $280' },
          { date: 'Oct-21-25', action: 'Reiterated', analyst: 'Wells Fargo', ratingChange: 'Overweight', priceTarget: '$245 → $290' },
        ],
        news: [
          { time: 'Today 05:13AM', title: '8 of the best earbuds right now', source: 'Quartz' },
          { time: '12:53AM', title: 'Jim Cramer Believes Apple\'s (AAPL) User Base Is Very Important For AI', source: 'Insider Monkey' },
          { time: 'Nov-22-25 01:30PM', title: 'Where Will Apple Stock Be in 5 Years?', source: 'Motley Fool' },
          { time: '12:26PM', title: 'Meta wants to get into the electricity trading business', source: 'TechCrunch' },
          { time: '10:34AM', title: 'Apple\'s presumptive future CEO, John Ternus, has a tough act to follow', source: 'Yahoo Finance' },
          { time: '08:32AM', title: 'Stock Market Week Ahead: A Trillion-Dollar Shopping Season', source: 'Investor\'s Business Daily' },
          { time: '07:30AM', title: 'These two \'Magnificent Seven\' stocks could be the strongest survivors of an AI apocalypse', source: 'MarketWatch' },
          { time: '06:00AM', title: 'Apple\'s skinny iPhone falls flat with disappointing early sales', source: 'Financial Times' },
          { time: '01:55AM', title: 'Alphabet Overtakes Microsoft in Stunning $3.62 Trillion Market-Cap Upset', source: 'GuruFocus.com' },
          { time: 'Nov-21-25 08:18PM', title: 'Investors Are Acting Like the \'OpenAI Bubble\' Is Popping As SoftBank Slide Continues', source: 'TheStreet' },
          { time: '05:15PM', title: 'Heard on the Street Recap: Stocks Gain, Bitcoin Pain', source: 'The Wall Street Journal' },
          { time: '04:51PM', title: 'Lilly\'s Sharp Rally Brings Market Cap to $1 Trillion', source: 'The Wall Street Journal' },
          { time: '04:47PM', title: 'Eli Lilly Becomes First Pharma To Join $1 Trillion Club', source: 'Investor\'s Business Daily' },
          { time: '04:18PM', title: 'Google Surpasses Microsoft in Market Value. Why Alphabet Stock Is Winning', source: 'Barrons.com' },
          { time: '03:43PM', title: 'The Bulls Wild Ride: What We Have Here Is A Worrywart Market', source: 'Barrons.com' },
        ],
        description: 'Apple, Inc. engages in the design, manufacture, and sale of smartphones, personal computers, tablets, wearables and accessories, and other varieties of related services. It operates through the following geographical segments: Americas, Europe, Greater China, Japan, and Rest of Asia Pacific. The Americas segment includes North and South America. The Europe segment consists of European countries, as well as India, the Middle East, and Africa. The Greater China segment comprises China, Hong Kong, and Taiwan. The Rest of Asia Pacific segment includes Australia and Asian countries. Its products and services include iPhone, Mac, iPad, AirPods, Apple TV, Apple Watch, Beats products, AppleCare, iCloud, digital content stores, streaming, and licensing services. The company was founded by Steven Paul Jobs, Ronald Gerald Wayne, and Stephen G. Wozniak in April 1976 and is headquartered in Cupertino, CA.',
        institutionalOwnership: [
          { name: 'VANGUARD GROUP INC', percentage: '9.43%' },
          { name: 'BlackRock, Inc.', percentage: '7.72%' },
          { name: 'STATE STREET CORP', percentage: '4.03%' },
          { name: 'GEODE CAPITAL MANAGEMENT, LLC', percentage: '2.40%' },
          { name: 'FMR LLC', percentage: '2.04%' },
          { name: 'BERKSHIRE HATHAWAY INC', percentage: '1.61%' },
          { name: 'JPMORGAN CHASE & CO', percentage: '1.59%' },
          { name: 'MORGAN STANLEY', percentage: '1.54%' },
          { name: 'PRICE T ROWE ASSOCIATES INC /MD/', percentage: '1.43%' },
          { name: 'NORTHERN TRUST CORP', percentage: '1.11%' },
        ],
      };

      setStockData(mockData);
    } catch (e) {
      console.error(e, 'Error setting mock stock data');
    }
  }, [ticker]);

  // Fetch real candles data for the chart from backend (Finnhub /stock/candle)
  useEffect(() => {
    const symbol = ticker?.toUpperCase();
    if (!symbol) return;

    const nowSec = Math.floor(Date.now() / 1000);
    let resolution: string;
    let fromSec: number;

    switch (timeframe) {
      case 'intraday':
        // Intraday resolutions: 1, 5, 15, 30, 60 minutes
        resolution = intradayResolution;
        // Finnhub intraday only returns candles when market was open.
        // Use last 7 days window so we always overlap recent trading sessions,
        // and still stay well within the 1‑month intraday limit.
        fromSec = nowSec - 60 * 60 * 24 * 7; // last 7 days
        break;
      case 'daily':
        resolution = 'D'; // Daily candles
        fromSec = nowSec - 60 * 60 * 24 * 365; // ~1 year
        break;
      case 'weekly':
        resolution = 'W'; // Weekly candles
        fromSec = nowSec - 60 * 60 * 24 * 365 * 3; // ~3 years
        break;
      case 'monthly':
        resolution = 'M'; // Monthly candles
        fromSec = nowSec - 60 * 60 * 24 * 365 * 5; // ~5 years
        break;
      case '1year':
        resolution = 'D'; // Daily candles for 1 year
        fromSec = nowSec - 60 * 60 * 24 * 365; // 1 year
        break;
      case '5year':
        resolution = 'W'; // Weekly candles for 5 years
        fromSec = nowSec - 60 * 60 * 24 * 365 * 5; // 5 years
        break;
      case '10year':
        resolution = 'M'; // Monthly candles for 10 years
        fromSec = nowSec - 60 * 60 * 24 * 365 * 10; // 10 years
        break;
      case '20year':
        resolution = 'M'; // Monthly candles for 20 years
        fromSec = nowSec - 60 * 60 * 24 * 365 * 20; // 20 years
        break;
      case '30year':
        resolution = 'M'; // Monthly candles for 30 years
        fromSec = nowSec - 60 * 60 * 24 * 365 * 30; // 30 years
        break;
      case '40year':
        resolution = 'M'; // Monthly candles for 40 years
        fromSec = nowSec - 60 * 60 * 24 * 365 * 40; // 40 years
        break;
      case '50year':
        resolution = 'M'; // Monthly candles for 50 years
        fromSec = nowSec - 60 * 60 * 24 * 365 * 50; // 50 years
        break;
      default:
        resolution = 'D';
        fromSec = nowSec - 60 * 60 * 24 * 365; // ~1 year
        break;
    }

    const loadCandles = async () => {
      try {
        setCandlesLoading(true);
        console.log('📊 Loading candles for chart', {
          symbol,
          timeframe,
          resolution,
          fromSec,
          nowSec,
        });

        const candles = await fetchStockCandles(symbol, resolution, fromSec, nowSec);

        if (!candles || candles.length === 0) {
          console.warn(`⚠️ No candles returned for ${symbol}`);
          setCandlesData(null);
          return;
        }

        const chartCandles: CandlestickData[] = candles.map((bar) => ({
          // Finnhub timestamps are UNIX seconds, compatible with lightweight-charts UTCTimestamp
          time: bar.time as any,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        }));

        if (chartCandles.length > 0) {
          console.log(`✅ Successfully loaded ${chartCandles.length} candles for ${symbol} (${timeframe}, ${resolution})`);
          setCandlesData(chartCandles);

          // Derive price info from last two candles
          const last = chartCandles[chartCandles.length - 1];
          const prev = chartCandles.length > 1 ? chartCandles[chartCandles.length - 2] : last;
          const lastClose = last.close;
          const prevClose = prev.close;
          const change = lastClose - prevClose;
          const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
          const lastTime =
            typeof (last as any).time === 'number'
              ? (last as any).time
              : Math.floor(Date.now() / 1000);

          setPriceInfo({
            lastClose,
            prevClose,
            change,
            changePercent,
            lastTime,
          });
        } else {
          console.warn(`⚠️ No valid candles data after processing for ${symbol}`);
          setCandlesData(null);
          setPriceInfo(null);
        }
      } catch (e) {
        console.error('❌ Error loading candles for chart', e);
        setCandlesData(null);
        setPriceInfo(null);
      } finally {
        setCandlesLoading(false);
      }
    };

    loadCandles();
  }, [ticker, timeframe, intradayResolution, refreshCounter]);


  const handleRefresh = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  // Prefer backend profile data for header; fall back to route ticker
  const headerSymbol = (profile?.ticker || ticker?.toUpperCase() || '').toUpperCase();
  const headerName = profile?.name || stockData?.name || '';
  const headerWebsite = profile?.weburl || stockData?.website || '#';
  const headerSector = profile?.gsector || profile?.finnhubIndustry || stockData?.sector;
  const headerIndustry = profile?.gind || profile?.finnhubIndustry || stockData?.industry;
  const headerCountry = profile?.country || stockData?.country;
  const headerExchange = profile?.exchange || stockData?.exchange;

  // Build meta tags (deduplicated to avoid cases like "Media Media")
  const headerMetaTags = Array.from(
    new Set(
      [headerSector, headerIndustry, headerCountry, headerExchange].filter(
        (v): v is string => typeof v === 'string' && v.trim().length > 0
      )
    )
  );

  // Prefer price derived from candles only (no mock fallback to avoid dummy header flash)
  const headerLastClose = priceInfo?.lastClose ?? 0;
  const headerChange = priceInfo?.change ?? 0;
  const headerChangePercent = priceInfo?.changePercent ?? 0;
  const isPositive = headerChange >= 0;

  // Last candle date/time label
  let lastCandleLabel = 'Last candle close';
  if (priceInfo?.lastTime) {
    const d = new Date(priceInfo.lastTime * 1000);
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    lastCandleLabel = `${dateStr} • ${timeStr}`;
  }

  return (
    <div className="screener-container">
      {/* Header */}
      <div className="screener-header">
        <div className="header-content">
          <div className="logo">LimeoXNG</div>
          <div className="header-banner">
            <button 
              onClick={toggleTheme} 
              className={`theme-toggle ${isDark ? 'dark' : 'light'}`} 
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <div className="toggle-slider">
                <div className="toggle-icon">
                  {isDark ? <Sun size={14} /> : <Moon size={14} />}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="navigation-bar">
        <div className="nav-content">
          <Link to="/" className="nav-link">Home</Link>
          <Link 
            to="/news" 
            className={`nav-link ${location.pathname === '/news' ? 'nav-active' : ''}`}
          >
            News
          </Link>
          <Link 
            to="/" 
            className={`nav-link ${(location.pathname === '/' || location.pathname === '/screener') ? 'nav-active' : ''}`}
          >
            Screener
          </Link>
          <Link 
            to="/ticker"
            className={`nav-link ${location.pathname === '/ticker' ? 'nav-active' : ''}`}
          >
            Ticker
          </Link>
          <a href="#" className="nav-link">Maps</a>
          <a href="#" className="nav-link">Groups</a>
          <a href="#" className="nav-link">Portfolio</a>
          <a href="#" className="nav-link">Insider</a>
          <a href="#" className="nav-link">Futures</a>
          <a href="#" className="nav-link">Forex</a>
          <a href="#" className="nav-link">Crypto</a>
          <a href="#" className="nav-link">Calendar</a>
          <a href="#" className="nav-link">Backtests</a>
          <a href="#" className="nav-link">Pricing</a>
        </div>
      </div>

      <div className="container">
        {/* Header */}
        {loading ? (
          <div className="stock-header" data-testid="stock-header-skeleton">
            <div className="header-content">
              <div className="header-left">
                <div className="symbol-section">
                  <div className="skeleton-box" style={{ width: 80, height: 28 }}></div>
                  <div className="skeleton-box" style={{ width: 200, height: 18 }}></div>
                </div>
                <div className="meta-tags">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <span
                      key={idx}
                      className="skeleton-box"
                      style={{ width: 80, height: 14 }}
                    ></span>
                  ))}
                </div>
              </div>
              <div className="price-section">
                <div className="price-top">
                  <div className="price-label">
                    <span className="skeleton-box" style={{ width: 70, height: 8 }}></span>
                  </div>
                  <div className="price-date" style={{ marginTop: 3 }}>
                    <span className="skeleton-box" style={{ width: 140, height: 10 }}></span>
                  </div>
                  <div className="price-value" style={{ marginTop: 4 }}>
                    <span className="skeleton-box" style={{ width: 80, height: 22 }}></span>
                  </div>
                </div>
                <div className="price-change" style={{ marginTop: 4 }}>
                  <span className="change-value">
                    <span className="skeleton-box" style={{ width: 55, height: 12, marginRight: 6 }}></span>
                  </span>
                  <span className="change-percent">
                    <span className="skeleton-box" style={{ width: 60, height: 12 }}></span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="stock-header" data-testid="stock-header">
          <div className="header-content">
            <div className="header-left">
              <div className="symbol-section">
                  <h1 className="symbol" data-testid="stock-symbol">{headerSymbol}</h1>
                  <a href={headerWebsite} className="company-name" target="_blank" rel="noopener noreferrer" data-testid="company-name">
                    {headerName}
                </a>
              </div>
              <div className="meta-tags" data-testid="header-meta">
                  {headerMetaTags.map((tag, idx) => (
                    <span key={idx} className="meta-tag">
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
            
            <div className="header-right">
            <div className="price-section" data-testid="price-info">
              <div className="price-top">
                <div className="price-label">Last Close</div>
                    <div className="price-date">{lastCandleLabel}</div>
                    <div className="price-value" data-testid="stock-price">{headerLastClose.toFixed(2)}</div>
              </div>
              <div className={`price-change ${isPositive ? 'positive' : 'negative'}`} data-testid="stock-change">
                    <span className="change-value">{isPositive ? '+' : ''}{headerChange.toFixed(2)}</span>
                    <span className="change-percent">{isPositive ? '+' : ''}{headerChangePercent.toFixed(2)}%</span>
              </div>
            </div>
              <button
                type="button"
                className="header-refresh-btn"
                onClick={handleRefresh}
              >
                ⟳ Refresh
              </button>
          </div>
        </div>
        </div>
        )}

        {/* Navigation Tabs */}
        <div className="view-tabs" data-testid="nav-tabs">
          <button 
            className={activeTab === 'chart' ? 'tab-active' : ''} 
            onClick={() => setActiveTab('chart')}
            data-testid="chart-tab"
          >
            Chart
          </button>
          <button 
            className={activeTab === 'compare' ? 'tab-active' : ''}
            onClick={() => setActiveTab('compare')}
            data-testid="compare-tab"
          >
            Compare
          </button>
          <button 
            className={activeTab === 'short-interest' ? 'tab-active' : ''}
            onClick={() => setActiveTab('short-interest')}
            data-testid="short-interest-tab"
          >
            Short Interest
          </button>
          <button 
            className={activeTab === 'financials' ? 'tab-active' : ''}
            onClick={() => setActiveTab('financials')}
            data-testid="financials-tab"
          >
            Financials
          </button>
          <button 
            className={activeTab === 'options' ? 'tab-active' : ''}
            onClick={() => setActiveTab('options')}
            data-testid="options-tab"
          >
            Options
          </button>
          <button 
            className={activeTab === 'filings' ? 'tab-active' : ''}
            onClick={() => setActiveTab('filings')}
            data-testid="filings-tab"
          >
            Filings
          </button>
          <button 
            className={activeTab === 'portfolio' ? 'tab-active' : ''}
            onClick={() => setActiveTab('portfolio')}
            data-testid="portfolio-tab"
          >
            Add to Portfolio
          </button>
          <button 
            className={activeTab === 'alert' ? 'tab-active' : ''}
            onClick={() => setActiveTab('alert')}
            data-testid="alert-tab"
          >
            Set Alert
          </button>
        </div>

        {/* Chart Section */}
        <div className="chart-section" data-testid="chart-container">
          <div className="chart-controls" data-testid="chart-controls">
            <div className="chart-type-tabs">
              <button
                className={`chart-type-tab ${chartType === 'candlestick' ? 'tab-active' : ''}`}
                onClick={() => setChartType('candlestick')}
              >
                Candlestick
              </button>
              <button
                className={`chart-type-tab ${chartType === 'line' ? 'tab-active' : ''}`}
                onClick={() => setChartType('line')}
              >
                Line
              </button>
              <button
                className={`chart-type-tab ${chartType === 'area' ? 'tab-active' : ''}`}
                onClick={() => setChartType('area')}
              >
                Area
              </button>
            </div>
            <div className="timeframe-tabs">
              <button
                className={`timeframe-tab ${timeframe === 'intraday' ? 'tab-active' : ''}`}
                data-testid="intraday-btn"
                onClick={() => setTimeframe('intraday')}
              >
                Intraday
              </button>
              <button
                className={`timeframe-tab ${timeframe === 'daily' ? 'tab-active' : ''}`}
                data-testid="daily-btn"
                onClick={() => setTimeframe('daily')}
              >
                Daily
              </button>
              <button
                className={`timeframe-tab ${timeframe === 'weekly' ? 'tab-active' : ''}`}
                data-testid="weekly-btn"
                onClick={() => setTimeframe('weekly')}
              >
                Weekly
              </button>
              <button
                className={`timeframe-tab ${timeframe === 'monthly' ? 'tab-active' : ''}`}
                data-testid="monthly-btn"
                onClick={() => setTimeframe('monthly')}
              >
                Monthly
              </button>
              <button
                className={`timeframe-tab ${timeframe === '1year' ? 'tab-active' : ''}`}
                data-testid="1year-btn"
                onClick={() => setTimeframe('1year')}
              >
                1 Year
              </button>
              <button
                className={`timeframe-tab ${timeframe === '5year' ? 'tab-active' : ''}`}
                data-testid="5year-btn"
                onClick={() => setTimeframe('5year')}
              >
                5 Year
              </button>
              <button
                className={`timeframe-tab ${timeframe === '10year' ? 'tab-active' : ''}`}
                data-testid="10year-btn"
                onClick={() => setTimeframe('10year')}
              >
                10 Year
              </button>
              <button
                className={`timeframe-tab ${timeframe === '20year' ? 'tab-active' : ''}`}
                data-testid="20year-btn"
                onClick={() => setTimeframe('20year')}
              >
                20 Year
              </button>
              <button
                className={`timeframe-tab ${timeframe === '30year' ? 'tab-active' : ''}`}
                data-testid="30year-btn"
                onClick={() => setTimeframe('30year')}
              >
                30 Year
              </button>
              <button
                className={`timeframe-tab ${timeframe === '40year' ? 'tab-active' : ''}`}
                data-testid="40year-btn"
                onClick={() => setTimeframe('40year')}
              >
                40 Year
              </button>
              <button
                className={`timeframe-tab ${timeframe === '50year' ? 'tab-active' : ''}`}
                data-testid="50year-btn"
                onClick={() => setTimeframe('50year')}
              >
                50 Year
              </button>
            </div>
            {timeframe === 'intraday' && (
              <div className="intraday-tabs">
                <button
                  className={`intraday-tab ${intradayResolution === '1' ? 'tab-active' : ''}`}
                  onClick={() => setIntradayResolution('1')}
                >
                  1m
                </button>
                <button
                  className={`intraday-tab ${intradayResolution === '5' ? 'tab-active' : ''}`}
                  onClick={() => setIntradayResolution('5')}
                >
                  5m
                </button>
                <button
                  className={`intraday-tab ${intradayResolution === '15' ? 'tab-active' : ''}`}
                  onClick={() => setIntradayResolution('15')}
                >
                  15m
                </button>
                <button
                  className={`intraday-tab ${intradayResolution === '30' ? 'tab-active' : ''}`}
                  onClick={() => setIntradayResolution('30')}
                >
                  30m
                </button>
                <button
                  className={`intraday-tab ${intradayResolution === '60' ? 'tab-active' : ''}`}
                  onClick={() => setIntradayResolution('60')}
                >
                  60m
                </button>
              </div>
            )}
          </div>
          
          <div className="chart-wrapper">
            <TradingViewChart
              symbol={stockData?.symbol || ticker?.toUpperCase() || ''}
              data={candlesData || undefined}
              chartType={chartType}
              height={400}
              loading={candlesLoading}
            />
          </div>
        </div>

        {/* Financial Metrics (Annual / Quarterly via tab bar) */}
        <div className="statements-panel" style={{ marginTop: 0, marginBottom: 16 }}>
          <div className="metrics-header-row">
            <h3 className="section-heading">Financial Metrics</h3>
            <div className="metrics-header-controls">
              <div className="metric-tabs chart-type-tabs">
                <button
                  className={`chart-type-tab ${metricsView === 'annual' ? 'tab-active' : ''}`}
                  type="button"
                  onClick={() => setMetricsView('annual')}
                >
                  Annual
                </button>
                <button
                  className={`chart-type-tab ${metricsView === 'quarterly' ? 'tab-active' : ''}`}
                  type="button"
                  onClick={() => setMetricsView('quarterly')}
                >
                  Quarterly
                </button>
              </div>
              <button
                type="button"
                className="chart-fullview-btn metrics-fullview-btn"
                onClick={() => {
                  setMetricModal(null);
                  setMetricsFullViewOpen(true);
                }}
              >
                ⛶
              </button>
            </div>
          </div>

          <div className="metrics-content-scroll chart-block">
            {metricsLoading && (
              <div className="chart-loading-overlay">
                <div className="chart-loading-spinner" />
                <div className="chart-loading-text">
                  Loading {metricsView} financial metrics...
                </div>
              </div>
            )}

            {!metricsLoading &&
              (metricsView === 'annual' ? annualMetricCharts.length === 0 : quarterlyMetricCharts.length === 0) && (
                <div style={{ padding: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                  No {metricsView} metric series available for this symbol.
                </div>
              )}

            {(metricsView === 'annual' ? annualMetricCharts : quarterlyMetricCharts).length > 0 && (
              <div className="mini-charts-grid">
                {(metricsView === 'annual' ? annualMetricCharts : quarterlyMetricCharts).map((mini) => {
                  const metricInfo = getMetricInfo(mini.metricKey);
                  return (
                    <div
                      key={mini.key}
                      className="chart-card"
                      onClick={() => setMetricModal({ label: mini.label, data: mini.data })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="chart-header">
                        <div>
                          <span className="ticker-bold">{headerSymbol}</span>
                          <span className="company-name-small"> • {mini.label}</span>
                        </div>
                        <button
                          className="chart-fullview-btn"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMetricModal({ label: mini.label, data: mini.data });
                          }}
                        >
                          ⛶
                        </button>
                      </div>
                      <div className="chart-container-mini">
                        <ResponsiveContainer width="100%" height={90}>
                          <LineChart data={mini.data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                            <XAxis
                              dataKey="period"
                              tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
                              tickMargin={4}
                            />
                            <YAxis
                              tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
                              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                              width={36}
                            />
                            <Tooltip
                              contentStyle={{
                                fontSize: 10,
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                              }}
                              labelStyle={{ fontWeight: 600 }}
                              formatter={(value: any) => [value, mini.label]}
                            />
                            <Line
                              type="monotone"
                              dataKey="v"
                              stroke="var(--link-color)"
                              strokeWidth={1.6}
                              dot={false}
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="chart-footer">
                        <div className="chart-footer-desc">{metricInfo.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Full-view single Metric Chart Modal */}
        {metricModal && (
          <div className="modal-overlay" onClick={() => setMetricModal(null)}>
            <div
              className="metric-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="metric-modal-header">
                <h3>{headerSymbol} • {metricModal.label}</h3>
                <button
                  className="metric-modal-close"
                  type="button"
                  onClick={() => setMetricModal(null)}
                >
                  ✕
                </button>
              </div>
              <div className="metric-modal-body">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricModal.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      tickMargin={6}
                    >
                    </XAxis>
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      width={56}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                      }}
                      labelStyle={{ fontWeight: 600 }}
                      formatter={(value: any) => [value, metricModal.label]}
                    />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke="var(--link-color)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Full-view ALL Metrics Modal (current tab) */}
        {metricsFullViewOpen && (
          <div className="modal-overlay" onClick={() => setMetricsFullViewOpen(false)}>
            <div
              className="metric-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="metric-modal-header">
                <h3>
                  {headerSymbol} • Financial Metrics (
                  {metricsView === 'annual' ? 'Annual' : 'Quarterly'}
                  )
                </h3>
                <button
                  className="metric-modal-close"
                  type="button"
                  onClick={() => setMetricsFullViewOpen(false)}
                >
                  ✕
                </button>
              </div>
              <div className="metric-modal-body">
                {(metricsView === 'annual' ? annualMetricCharts : quarterlyMetricCharts).length > 0 ? (
                  <div className="mini-charts-grid">
                    {(metricsView === 'annual' ? annualMetricCharts : quarterlyMetricCharts).map((mini) => {
                      const metricInfo = getMetricInfo(mini.metricKey);
                      return (
                        <div
                          key={mini.key}
                          className="chart-card"
                          onClick={() => setMetricModal({ label: mini.label, data: mini.data })}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="chart-header">
                            <div>
                              <span className="ticker-bold">{headerSymbol}</span>
                              <span className="company-name-small"> • {mini.label}</span>
                            </div>
                            <button
                              className="chart-fullview-btn"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMetricModal({ label: mini.label, data: mini.data });
                              }}
                            >
                              ⛶
                            </button>
                          </div>
                          <div className="chart-container-mini">
                            <ResponsiveContainer width="100%" height={90}>
                              <LineChart data={mini.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                <XAxis
                                  dataKey="period"
                                  tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
                                  tickMargin={4}
                                />
                                <YAxis
                                  tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
                                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                  width={36}
                                />
                                <Tooltip
                                  contentStyle={{
                                    fontSize: 10,
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                  }}
                                  labelStyle={{ fontWeight: 600 }}
                                  formatter={(value: any) => [value, mini.label]}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="v"
                                  stroke="var(--link-color)"
                                  strokeWidth={1.6}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="chart-footer">
                            <div className="chart-footer-desc">{metricInfo.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                    No {metricsView} metric series available for this symbol.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recommendation Trends + EPS Surprises side-by-side (moved just below Financial Metrics) */}
        <div className="charts-row">
          {/* Recommendation Trends Bar Chart */}
          <div className="statements-panel charts-row-item chart-block">
            <h3 className="section-heading">Analyst Recommendation Trends</h3>
            {recommendationsLoading && (
              <div className="chart-loading-overlay">
                <div className="chart-loading-spinner" />
                <div className="chart-loading-text">Loading recommendation trends...</div>
              </div>
            )}
            {recommendationChartData.length > 0 ? (
              <div className="recommendation-chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={recommendationChartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                    barSize={18}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis
                      dataKey="periodLabel"
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      tickMargin={6}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      tickMargin={4}
                      label={{
                        value: '# Analysts',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: 11, fill: 'var(--text-tertiary)' },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                      }}
                    />
                    {/* Bottom -> Top: Strong Sell, Sell, Hold, Buy, Strong Buy */}
                    <Bar
                      dataKey="strongSell"
                      name="Strong Sell"
                      stackId="rec"
                      fill="#813131"
                    />
                    <Bar
                      dataKey="sell"
                      name="Sell"
                      stackId="rec"
                      fill="#f45b5b"
                    />
                    <Bar
                      dataKey="hold"
                      name="Hold"
                      stackId="rec"
                      fill="#b98b1d"
                    />
                    <Bar
                      dataKey="buy"
                      name="Buy"
                      stackId="rec"
                      fill="#1db954"
                    />
                    <Bar
                      dataKey="strongBuy"
                      name="Strong Buy"
                      stackId="rec"
                      fill="#176f37"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : !recommendationsLoading ? (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                No recommendation trends available for this symbol.
              </div>
            ) : null}
          </div>

          {/* Historical EPS Surprises */}
          <div className="charts-row-item statements-panel eps-surprises-panel">
            <h3 className="section-heading">
              {headerSymbol || 'AAPL'} - Historical EPS Surprises
            </h3>
            <div className="eps-chart-container">
              <div className="eps-legend">
                <div className="eps-legend-item">
                  <svg width="16" height="16" style={{ marginRight: '5px' }}>
                    <circle cx="8" cy="8" r="6" fill="#01d54c" fillOpacity="0.5" stroke="#333" strokeWidth="1"/>
                  </svg>
                  <span>Actual</span>
                </div>
                <div className="eps-legend-item">
                  <svg width="16" height="16" style={{ marginRight: '5px' }}>
                    <circle cx="8" cy="8" r="6" fill="#098def" fillOpacity="0.5" stroke="#333" strokeWidth="1"/>
                  </svg>
                  <span>Estimate</span>
                </div>
              </div>
              <div className="eps-chart-area chart-block">
                {earningsLoading && (
                  <div className="chart-loading-overlay">
                    <div className="chart-loading-spinner" />
                    <div className="chart-loading-text">Loading EPS surprises...</div>
                  </div>
                )}
                {epsPoints.length === 0 && !earningsLoading ? (
                  <div style={{ padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                    No EPS surprises data available.
                  </div>
                ) : epsPoints.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 10, right: 20, bottom: 50, left: 55 }}
                    >
                      <defs>
                        <filter id="eps-drop-shadow">
                          <feDropShadow dx="1" dy="1" floodColor="#000000" floodOpacity="0.75" stdDeviation="2.5"/>
                        </filter>
                      </defs>
                      <CartesianGrid
                        stroke="var(--border-light)"
                        strokeDasharray="0"
                        strokeWidth={1}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="period"
                        type="category"
                        scale="point"
                        allowDuplicatedCategory={false}
                        padding={{ left: 20, right: 20 }}
                        tick={<EPSAxisTick />}
                        ticks={epsXTicks}
                        tickMargin={20}
                        axisLine={{ stroke: '#707073', strokeWidth: 1 }}
                        tickLine={false}
                      />
                      <YAxis
                        type="number"
                        tick={{ fontSize: '0.8em', fill: 'var(--text-secondary)' }}
                        tickMargin={8}
                        label={{
                          value: 'Quarterly EPS',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 20,
                          style: { 
                            fontSize: '0.8em', 
                            fill: 'var(--text-tertiary)',
                            textAnchor: 'middle'
                          },
                        }}
                        domain={epsYAxis ? epsYAxis.domain : ['auto', 'auto']}
                        ticks={epsYAxis ? epsYAxis.ticks : undefined}
                        axisLine={false}
                        tickLine={{ stroke: 'var(--border-light)', strokeWidth: 1, transform: 'translate(-10, 0)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: '0.8em',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '3px',
                          padding: '8px 12px',
                          filter: 'url(#eps-drop-shadow)',
                          color: 'var(--text-primary)'
                        }}
                        labelStyle={{ 
                          fontWeight: 600, 
                          color: 'var(--text-primary)',
                          marginBottom: '4px'
                        }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        formatter={(value: any, name: any) => {
                          if (typeof value === 'number') {
                            return [`${value.toFixed(2)}`, name];
                          }
                          return [value, name];
                        }}
                      />
                      <Scatter
                        name="Actual"
                        data={epsPoints}
                        dataKey="actual"
                        fill="#01d54c"
                        shape={(props: any) => {
                          const { cx, cy, fill } = props;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={15.5}
                              fill={fill}
                              fillOpacity={0.5}
                              stroke="#333"
                              strokeWidth={1}
                            />
                          );
                        }}
                      />
                      <Scatter
                        name="Estimate"
                        data={epsPoints}
                        dataKey="estimate"
                        fill="#098def"
                        shape={(props: any) => {
                          const { cx, cy, fill } = props;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={15.5}
                              fill={fill}
                              fillOpacity={0.5}
                              stroke="#333"
                              strokeWidth={1}
                            />
                          );
                        }}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Peers & Holdings */}
        <div className="peers-holdings" data-testid="peers-section">
          <div className="peers-row">
            <span className="label">Peers:</span>
            {(stockData?.peers ?? []).map((peer) => (
              <Link key={peer} to={`/stock/${peer}`} className="ticker-link" data-testid={`peer-${peer}`}>{peer}</Link>
            ))}
          </div>
          <div className="holdings-row">
            <span className="label">Held by:</span>
            {(stockData?.heldBy ?? []).map((fund) => (
              <Link key={fund} to={`/stock/${fund}`} className="ticker-link" data-testid={`held-${fund}`}>{fund}</Link>
            ))}
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="content-grid">
          {/* All Finnhub raw metrics from /basic-financials.metric (full width) */}
          <div className="fundamentals-panel" data-testid="fundamentals-table">
            <h3 className="panel-title">All Finnhub Metrics</h3>
            {allMetricRows.length > 0 ? (
              <div className="metrics-table-scroll chart-block">
                {metricsLoading && (
                  <div className="chart-loading-overlay">
                    <div className="chart-loading-spinner" />
                    <div className="chart-loading-text">Loading Finnhub metrics...</div>
                </div>
                )}
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Value</th>
                      <th>Key</th>
                      <th>Value</th>
                      <th>Key</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows: React.ReactElement[] = [];
                      for (let i = 0; i < allMetricRows.length; i += 3) {
                        const [k1, v1] = allMetricRows[i];
                        const second = allMetricRows[i + 1];
                        const third = allMetricRows[i + 2];
                        const k2 = second ? second[0] : '';
                        const v2 = second ? second[1] : '';
                        const k3 = third ? third[0] : '';
                        const v3 = third ? third[1] : '';
                        rows.push(
                          <tr key={k1}>
                            <td>{formatMetricKey(k1 as string)}</td>
                            <td>{typeof v1 === 'number' ? v1 : String(v1)}</td>
                            <td>{k2 ? formatMetricKey(k2 as string) : ''}</td>
                            <td>
                              {k2
                                ? typeof v2 === 'number'
                                  ? v2
                                  : String(v2)
                                : ''}
                            </td>
                            <td>{k3 ? formatMetricKey(k3 as string) : ''}</td>
                            <td>
                              {k3
                                ? typeof v3 === 'number'
                                  ? v3
                                  : String(v3)
                                : ''}
                            </td>
                      </tr>
                        );
                      }
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                No raw metric fields available for this symbol.
              </div>
            )}
            </div>
          </div>

        {/* Latest News - full-width panel reusing All Finnhub Metrics layout */}
        <div className="content-grid">
          <div className="fundamentals-panel" data-testid="news-section">
              <h3 className="panel-title">Latest News</h3>
            <div className="metrics-table-scroll chart-block">
              {companyNewsLoading && (
                <div className="chart-loading-overlay">
                  <div className="chart-loading-spinner" />
                  <div className="chart-loading-text">Loading company news...</div>
                </div>
              )}
              <table className="data-table news-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Headline</th>
                    <th>Related</th>
                    <th>Source</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {companyNewsLoading ? null : companyNewsError ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: 'center',
                            padding: '16px',
                            fontSize: 12,
                            color: 'var(--negative)',
                          }}
                        >
                          {companyNewsError}
                        </td>
                      </tr>
                  ) : companyNews.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: 'center',
                            padding: '16px',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          No recent news available for this symbol.
                        </td>
                      </tr>
                  ) : (
                      companyNews.map((article, idx) => (
                        <tr key={article.id ?? idx} data-testid={`news-item-${idx}`}>
                          <td>
                            <div className="news-date-cell">
                              <span className="news-date">{article.date}</span>
                              <span className="news-time">{article.time}</span>
                  </div>
                          </td>
                          <td>
                            {article.url ? (
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="news-headline-link"
                              >
                                {article.headline}
                              </a>
                            ) : (
                              <span className="news-headline-link">{article.headline}</span>
                            )}
                          </td>
                          <td>
                            <span className="news-source-link">
                              {article.related || '—'}
                            </span>
                          </td>
                          <td>
                            <span className="news-source-link">{article.source}</span>
                          </td>
                          <td>
                            {article.summary ? (
                              <button
                                type="button"
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--link-color)',
                                  cursor: 'pointer',
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  textDecoration: 'underline',
                                }}
                                title={article.summary}
                              >
                                Read
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
            </div>
              </div>
            </div>

        {/* Insider Transactions - full-width panel reusing All Finnhub Metrics layout */}
        <div className="content-grid">
          <div className="fundamentals-panel" data-testid="insider-transactions-top">
              <h3 className="panel-title">Insider Transactions</h3>
            <div className="metrics-table-scroll chart-block">
              {insiderLoading && (
                <div className="chart-loading-overlay">
                  <div className="chart-loading-spinner" />
                  <div className="chart-loading-text">Loading insider transactions...</div>
                </div>
              )}
              <table className="data-table news-table">
                  <thead>
                    <tr>
                      <th>Transaction / Filing</th>
                      <th>Insider</th>
                      <th>Code</th>
                      <th>Change</th>
                      <th>Shares Held</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                <tbody>
                  {insiderLoading ? null : insiderError ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: 'center',
                            padding: '16px',
                            fontSize: 12,
                            color: 'var(--negative)',
                          }}
                        >
                          {insiderError}
                        </td>
                      </tr>
                    ) : insiderTransactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: 'center',
                            padding: '16px',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          No insider transactions available for this symbol.
                        </td>
                      </tr>
                    ) : (
                      insiderTransactions.map((tx, idx) => (
                        <tr
                          key={`${tx.name}-${tx.transactionDate}-${idx}-top`}
                          data-testid={`insider-item-top-${idx}`}
                        >
                          <td>
                            <div className="news-date-cell">
                              <span className="news-date">{tx.transactionDate || '—'}</span>
                              <span className="news-time">
                                {tx.filingDate ? `Filed ${tx.filingDate}` : '—'}
                              </span>
                  </div>
                          </td>
                          <td>
                            <span className="insider-name">{tx.name || '—'}</span>
                          </td>
                          <td>
                            <span className="insider-code">{tx.transactionCode || '—'}</span>
                          </td>
                          <td>
                            <span
                              className={`insider-change ${
                                (tx.change ?? 0) >= 0 ? 'positive' : 'negative'
                              }`}
                            >
                              {formatInsiderChange(tx.change)}
                            </span>
                          </td>
                          <td>
                            <span className="insider-share">{formatShares(tx.share)}</span>
                          </td>
                          <td>
                            <span className="insider-price">{formatPrice(tx.transactionPrice)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* Institutional Ownership - full-width panel like All Finnhub Metrics / Latest News */}
        <div className="content-grid">
          <div className="fundamentals-panel" data-testid="institutional-ownership">
              <h3 className="panel-title">Institutional Ownership</h3>
            <div className="metrics-table-scroll chart-block">
              <table className="data-table ownership-table">
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Ownership</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stockData?.institutionalOwnership ?? []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          style={{
                            textAlign: 'center',
                            padding: '16px',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          No institutional ownership data available.
                        </td>
                      </tr>
                    ) : (
                      (stockData?.institutionalOwnership ?? []).map((holder, idx) => (
                        <tr key={idx}>
                          <td>
                  <span className="institution-name">{holder.name}</span>
                          </td>
                          <td>
                  <span className="ownership-percent">{holder.percentage}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
            </div>
          </div>

        {/* Bottom Sections */}
        <div className="bottom-grid" data-testid="bottom-sections">
          {/* Company Description */}
          <div className="description-panel" data-testid="company-description">
            <h3 className="section-heading">Company Description</h3>
            <p className="description-content">
              {profile?.description || 'No description available.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockProfile;