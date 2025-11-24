import React, { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import TradingViewChart from '../components/TradingViewChart';
import { CandlestickData } from 'lightweight-charts';
import { fetchStockCandles, fetchStockProfile, StockProfile as ApiStockProfile } from '../services/api';
import '../styles/StockProfile.css';
import '../styles/Screener.css';

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

const StockProfile = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');
  const [statementTab, setStatementTab] = useState('income');
  const [timeframe, setTimeframe] = useState<'intraday' | 'daily' | 'weekly' | 'monthly' | '1year' | '5year' | '10year'>('daily');
  const [intradayResolution, setIntradayResolution] = useState<'1' | '5' | '15' | '30' | '60'>('5');
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

  useEffect(() => {
    fetchStockData();
  }, [ticker]);

  // Load company profile from backend (Finnhub /stock/profile2 via backend)
  useEffect(() => {
    const loadProfile = async () => {
      if (!ticker) return;
      const symbol = ticker.toUpperCase();
      try {
        const backendProfile = await fetchStockProfile(symbol);
        setProfile(backendProfile);
      } catch (e) {
        console.error('❌ Error fetching backend profile for', symbol, e);
        setProfile(null);
      }
    };

    loadProfile();
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
  }, [ticker, timeframe, intradayResolution]);

  const fetchStockData = async () => {
    try {
      // For now, use mock data matching the emergent folder structure
      // Later we can connect to backend API
      const mockData: StockData = {
        symbol: ticker?.toUpperCase() || 'AAPL',
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
          'EPS next Y': '9.08',
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
          'Short Ratio': '2.29',
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
      setLoading(false);
    } catch (e) {
      console.error(e, 'Error fetching stock data');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading stock data...</div>;
  }

  if (!stockData) {
    return <div className="error">Error loading stock data</div>;
  }

  // Prefer backend profile data for header if available
  const headerSymbol = (profile?.ticker || stockData.symbol || '').toUpperCase();
  const headerName = profile?.name || stockData.name;
  const headerWebsite = profile?.weburl || stockData.website;
  const headerSector = profile?.gsector || profile?.finnhubIndustry || stockData.sector;
  const headerIndustry = profile?.gind || profile?.finnhubIndustry || stockData.industry;
  const headerCountry = profile?.country || stockData.country;
  const headerExchange = profile?.exchange || stockData.exchange;

  // Build meta tags (deduplicated to avoid cases like "Media Media")
  const headerMetaTags = Array.from(
    new Set(
      [headerSector, headerIndustry, headerCountry, headerExchange].filter(
        (v): v is string => typeof v === 'string' && v.trim().length > 0
      )
    )
  );

  // Prefer price derived from candles; fallback to mock values
  const headerLastClose = priceInfo?.lastClose ?? stockData.lastClose;
  const headerChange = priceInfo?.change ?? stockData.change;
  const headerChangePercent = priceInfo?.changePercent ?? stockData.changePercent;
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
            className={`nav-link ${location.pathname === '/' ? 'nav-active' : ''}`}
          >
            Screener
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
          </div>
        </div>

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
              symbol={stockData.symbol}
              data={candlesData || undefined}
              chartType={chartType}
              height={400}
              loading={candlesLoading}
            />
          </div>
        </div>

        {/* Peers & Holdings */}
        <div className="peers-holdings" data-testid="peers-section">
          <div className="peers-row">
            <span className="label">Peers:</span>
            {stockData.peers.map((peer) => (
              <Link key={peer} to={`/stock/${peer}`} className="ticker-link" data-testid={`peer-${peer}`}>{peer}</Link>
            ))}
          </div>
          <div className="holdings-row">
            <span className="label">Held by:</span>
            {stockData.heldBy.map((fund) => (
              <Link key={fund} to={`/stock/${fund}`} className="ticker-link" data-testid={`held-${fund}`}>{fund}</Link>
            ))}
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="content-grid">
          {/* Left Column - Fundamentals */}
          <div className="fundamentals-panel" data-testid="fundamentals-table">
            <div className="data-grid">
              {Object.entries(stockData.fundamentalsGrid).map(([label, value], idx) => (
                <div key={idx} className="data-cell">
                  <div className="cell-label">{label}</div>
                  <div className={`cell-value ${getCellClass(label, value)}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Ratings & News */}
          <div className="side-panel">
            {/* Analyst Ratings */}
            <div className="panel-section ratings-panel" data-testid="analyst-ratings">
              <h3 className="panel-title">Analyst Ratings</h3>
              <div className="ratings-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Action</th>
                      <th>Analyst</th>
                      <th>Rating</th>
                      <th>Price Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockData.analystRatings.map((rating, idx) => (
                      <tr key={idx}>
                        <td className="date-cell">{rating.date}</td>
                        <td className={`action-cell ${rating.action.toLowerCase()}`}>{rating.action}</td>
                        <td className="analyst-cell">{rating.analyst}</td>
                        <td className="rating-cell">{rating.ratingChange}</td>
                        <td className="target-cell">{rating.priceTarget}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Latest News */}
            <div className="panel-section news-panel" data-testid="news-section">
              <h3 className="panel-title">Latest News</h3>
              <div className="news-scroll">
                {stockData.news.map((article, idx) => (
                  <div key={idx} className="news-article" data-testid={`news-item-${idx}`}>
                    <div className="news-meta">{article.time}</div>
                    <div className="news-headline">{article.title}</div>
                    <div className="news-source">({article.source})</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sections */}
        <div className="bottom-grid" data-testid="bottom-sections">
          {/* Company Description */}
          <div className="description-panel" data-testid="company-description">
            <h3 className="section-heading">Company Description</h3>
            <p className="description-content">{stockData.description}</p>
          </div>

          {/* Institutional Ownership */}
          <div className="ownership-panel" data-testid="institutional-ownership">
            <h3 className="section-heading">Institutional Ownership</h3>
            <div className="ownership-list">
              {stockData.institutionalOwnership.map((holder, idx) => (
                <div key={idx} className="ownership-row">
                  <span className="institution-name">{holder.name}</span>
                  <span className="ownership-percent">{holder.percentage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Statements */}
        <div className="statements-panel">
          <h3 className="section-heading">Financial Statements</h3>
          <div className="statement-tabs">
            <button 
              className={`statement-tab ${statementTab === 'income' ? 'active' : ''}`}
              onClick={() => setStatementTab('income')}
            >
              Income Statement
            </button>
            <button 
              className={`statement-tab ${statementTab === 'balance' ? 'active' : ''}`}
              onClick={() => setStatementTab('balance')}
            >
              Balance Sheet
            </button>
            <button 
              className={`statement-tab ${statementTab === 'cashflow' ? 'active' : ''}`}
              onClick={() => setStatementTab('cashflow')}
            >
              Cash Flow
            </button>
          </div>
          <div className="statement-content">
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>TTM</th>
                  <th>FY 2024</th>
                  <th>FY 2023</th>
                  <th>FY 2022</th>
                  <th>FY 2021</th>
                </tr>
              </thead>
              <tbody>
                {statementTab === 'income' && (
                  <>
                    <tr><td>Total Revenue</td><td>416.16B</td><td>391.04B</td><td>383.93B</td><td>394.33B</td><td>365.82B</td></tr>
                    <tr><td>Cost of Revenue</td><td>220.96B</td><td>210.35B</td><td>214.14B</td><td>223.55B</td><td>212.98B</td></tr>
                    <tr><td>Gross Profit</td><td>195.20B</td><td>180.68B</td><td>169.79B</td><td>170.78B</td><td>152.84B</td></tr>
                    <tr><td>Operating Income</td><td>133.05B</td><td>123.22B</td><td>114.30B</td><td>119.44B</td><td>108.95B</td></tr>
                    <tr><td>Net Income</td><td>112.01B</td><td>93.74B</td><td>96.99B</td><td>99.80B</td><td>94.68B</td></tr>
                  </>
                )}
                {statementTab === 'balance' && (
                  <>
                    <tr><td>Total Assets</td><td>364.98B</td><td>352.58B</td><td>352.76B</td><td>351.00B</td><td>351.00B</td></tr>
                    <tr><td>Current Assets</td><td>143.57B</td><td>135.41B</td><td>135.40B</td><td>134.84B</td><td>143.71B</td></tr>
                    <tr><td>Total Liabilities</td><td>290.02B</td><td>279.41B</td><td>290.44B</td><td>287.91B</td><td>287.91B</td></tr>
                    <tr><td>Current Liabilities</td><td>161.08B</td><td>153.98B</td><td>153.98B</td><td>125.48B</td><td>125.48B</td></tr>
                    <tr><td>Stockholders Equity</td><td>74.96B</td><td>73.16B</td><td>62.15B</td><td>63.09B</td><td>63.09B</td></tr>
                  </>
                )}
                {statementTab === 'cashflow' && (
                  <>
                    <tr><td>Operating Cash Flow</td><td>118.25B</td><td>110.54B</td><td>110.54B</td><td>122.15B</td><td>104.04B</td></tr>
                    <tr><td>Investing Cash Flow</td><td>-10.07B</td><td>-9.17B</td><td>-9.17B</td><td>-14.55B</td><td>-14.55B</td></tr>
                    <tr><td>Financing Cash Flow</td><td>-108.49B</td><td>-101.45B</td><td>-101.45B</td><td>-110.75B</td><td>-93.35B</td></tr>
                    <tr><td>Free Cash Flow</td><td>107.54B</td><td>99.88B</td><td>99.88B</td><td>111.44B</td><td>92.95B</td></tr>
                    <tr><td>Capital Expenditures</td><td>10.71B</td><td>10.66B</td><td>10.66B</td><td>10.71B</td><td>11.09B</td></tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

function getCellClass(label: string, value: string): string {
  if (typeof value !== 'string') return '';
  
  const negativeLabels = ['Perf Week', 'Insider Trans', 'Inst Trans'];
  if (negativeLabels.includes(label) && value.includes('-')) return 'negative';
  
  if (value.includes('%') && !value.includes('-')) return 'positive';
  if (label.includes('Perf') && !value.includes('-')) return 'positive';
  if (['ROA', 'ROE', 'ROIC', 'Gross Margin', 'Oper. Margin', 'Profit Margin'].includes(label)) return 'positive';
  if (['Short Float', 'Short Ratio', 'Short Interest', 'Target Price', 'Recom'].includes(label)) return 'link';
  if (label.includes('Dividend') || label === 'Earnings') return 'link';
  
  return '';
}

export default StockProfile;