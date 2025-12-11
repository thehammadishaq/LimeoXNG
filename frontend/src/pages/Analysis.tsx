import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { fetchSeekingAlphaAnalysisFromDb, fetchSeekingAlphaAnalysisLatest, SeekingAlphaArticle } from '../services/api';

interface TipRanksStock {
  ticker: string;
  name: string;
  market: string;
  price: number;
  priceChange: string;
  priceChangePercent: string;
  priceTarget: number;
  rating: number;
  lastRating: string;
  score?: number;
  sector?: string;
  popularity?: number;
  sentiment?: number;
  reason?: {
    templateID: number;
    rating: string;
    analystsCount: number;
  };
}

interface TipRanksInsiderStock {
  ticker: string;
  companyName: string;
  strength: number;
  insiderSignal: number;
  relevantDate: string;
  marketCap: number;
  market: string;
  events: Array<{
    reason: string;
    rating: number;
    strength: number;
    operations: Array<{
      insiderName: string;
      officerTitle: string;
      numberOfShares: number;
      value: number;
      date: string;
      rating: number;
    }>;
  }>;
}

const Analysis = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [articles, setArticles] = useState<SeekingAlphaArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalArticles, setTotalArticles] = useState(0);
  
  // TipRanks Top Analyst Stocks state
  const [topStocks, setTopStocks] = useState<TipRanksStock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [stocksError, setStocksError] = useState<string | null>(null);

  // TipRanks Top Smart Score Stocks state
  const [smartScoreStocks, setSmartScoreStocks] = useState<TipRanksStock[]>([]);
  const [smartScoreLoading, setSmartScoreLoading] = useState(false);
  const [smartScoreError, setSmartScoreError] = useState<string | null>(null);

  // TipRanks Top Insider Stocks state
  const [insiderStocks, setInsiderStocks] = useState<TipRanksInsiderStock[]>([]);
  const [insiderLoading, setInsiderLoading] = useState(false);
  const [insiderError, setInsiderError] = useState<string | null>(null);

  // TipRanks Stock Screener state
  const [screenerStocks, setScreenerStocks] = useState<TipRanksStock[]>([]);
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [screenerError, setScreenerError] = useState<string | null>(null);

  // TipRanks Trending Stocks state
  const [trendingStocks, setTrendingStocks] = useState<TipRanksStock[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  // Fetch Seeking Alpha articles from database with pagination
  const loadArticlesFromDb = async (page: number = currentPage, pageSize: number = itemsPerPage) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📊 Loading Seeking Alpha analysis articles from database (page ${page}, size ${pageSize})...`);
      const response = await fetchSeekingAlphaAnalysisFromDb(page, pageSize);
      if (response.items.length === 0) {
        setError('No analysis articles found in database.');
        setArticles([]);
      } else {
        setArticles(response.items);
        setTotalArticles(response.total);
        setError(null);
      }
    } catch (err) {
      console.error('Error loading analysis articles:', err);
      setError('Failed to load analysis articles. Please try again later.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh: Fetch latest from scraper API
  const refreshLatest = async () => {
    setRefreshing(true);
    setRefreshError(null); // Clear previous refresh error
    try {
      console.log('🔄 Fetching latest Seeking Alpha analysis articles...');
      const articlesData = await fetchSeekingAlphaAnalysisLatest();
      if (articlesData.length === 0) {
        setRefreshError('No new analysis articles found.');
      } else {
        // Reload from database after scraping (reset to page 1)
        setCurrentPage(1);
        await loadArticlesFromDb(1, itemsPerPage);
        setRefreshError(null); // Clear error on success
      }
    } catch (err) {
      console.error('Error refreshing analysis articles:', err);
      setRefreshError('Failed to refresh. Click "Try Again" to retry.');
      // Don't set main error - keep showing database articles
    } finally {
      setRefreshing(false);
    }
  };

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    loadArticlesFromDb(pageNumber, itemsPerPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: number) => {
    const safeValue = Number.isNaN(value) || value <= 0 ? 50 : value;
    setItemsPerPage(safeValue);
    setCurrentPage(1);
    loadArticlesFromDb(1, safeValue);
  };

  // Format published_date for display - always show actual date, never "Today" or "Yesterday"
  const formatPublishedDate = (article: SeekingAlphaArticle): string => {
    // First try to use published_date from database
    if (article.published_date) {
      try {
        const date = new Date(article.published_date);
        // Format as: "MMM DD, YYYY, HH:MM AM/PM"
        const dateStr = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
        });
        const timeStr = date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        return `${dateStr}, ${timeStr}`;
      } catch (e) {
        console.error('Error parsing published_date:', e);
      }
    }
    
    // If no published_date, try to parse time string to convert "Today"/"Yesterday" to actual dates
    if (article.time) {
      try {
        const timeStr = article.time.trim();
        const now = new Date();
        
        // Parse "Today, HH:MM AM/PM"
        if (timeStr.toLowerCase().startsWith('today')) {
          const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            const amPm = timeMatch[3].toUpperCase();
            
            if (amPm === 'PM' && hour !== 12) hour += 12;
            if (amPm === 'AM' && hour === 12) hour = 0;
            
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
            const dateStr = date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric',
            });
            const timeStrFormatted = date.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            return `${dateStr}, ${timeStrFormatted}`;
          }
        }
        
        // Parse "Yesterday, HH:MM AM/PM"
        if (timeStr.toLowerCase().startsWith('yesterday')) {
          const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            const amPm = timeMatch[3].toUpperCase();
            
            if (amPm === 'PM' && hour !== 12) hour += 12;
            if (amPm === 'AM' && hour === 12) hour = 0;
            
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const date = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), hour, minute);
            const dateStr = date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric',
            });
            const timeStrFormatted = date.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            return `${dateStr}, ${timeStrFormatted}`;
          }
        }
        
        // If time string is already a date format, try to parse it
        const parsedDate = new Date(timeStr);
        if (!isNaN(parsedDate.getTime())) {
          const dateStr = parsedDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
          });
          const timeStrFormatted = parsedDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });
          return `${dateStr}, ${timeStrFormatted}`;
        }
      } catch (e) {
        console.error('Error parsing time string:', e);
      }
    }
    
    // Final fallback
    return article.time || '—';
  };

  // Fetch TipRanks Top Analyst Stocks
  const loadTopAnalystStocks = async () => {
    setStocksLoading(true);
    setStocksError(null);
    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '') || '';
      const response = await fetch(`${apiBase}/api/v1/scraper/tipranks/library/top-analyst-stocks`);
      
      if (!response.ok) {
        const errorBody = await response.json();
        const detail = errorBody?.detail || `HTTP ${response.status}`;
        throw new Error(detail);
      }
      
      const data = await response.json();
      console.log('✅ TipRanks Top Analyst Stocks response:', data);
      
      // Extract stocks array from response
      const stocks = Array.isArray(data.stocks) ? data.stocks : [];
      
      // Map API response to TipRanksStock format
      const mappedStocks: TipRanksStock[] = stocks.map((stock: any) => ({
        ticker: stock.ticker || '',
        name: stock.name || '',
        market: stock.market || '',
        price: Number(stock.price) || 0,
        priceChange: stock.priceChange || '',
        priceChangePercent: stock.priceChangePercent || '',
        priceTarget: Number(stock.priceTarget) || 0,
        rating: Number(stock.rating) || 0,
        lastRating: stock.lastRating || '',
        score: stock.score ? Number(stock.score) : undefined,
        reason: stock.reason,
      }));
      
      setTopStocks(mappedStocks);
    } catch (err: any) {
      console.error('❌ Error fetching TipRanks Top Analyst Stocks:', err);
      setStocksError(`Failed to fetch TipRanks Top Analyst Stocks: ${err.message}`);
      setTopStocks([]);
    } finally {
      setStocksLoading(false);
    }
  };

  // Fetch TipRanks Top Smart Score Stocks
  const loadTopSmartScoreStocks = async () => {
    setSmartScoreLoading(true);
    setSmartScoreError(null);
    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '') || '';
      const response = await fetch(`${apiBase}/api/v1/scraper/tipranks/library/top-smart-score-stocks`);
      
      if (!response.ok) {
        const errorBody = await response.json();
        const detail = errorBody?.detail || `HTTP ${response.status}`;
        throw new Error(detail);
      }
      
      const data = await response.json();
      console.log('✅ TipRanks Top Smart Score Stocks RAW response:', data);
      
      // Extract stocks array from response
      // Response structure: { data: [...] }
      let stocks: any[] = [];
      if (Array.isArray(data)) {
        stocks = data;
      } else if (data.data && Array.isArray(data.data)) {
        stocks = data.data;
      } else if (Array.isArray(data.stocks)) {
        stocks = data.stocks;
      }
      
      console.log('✅ Parsed stocks array length:', stocks.length);
      if (stocks.length > 0) {
        console.log('✅ First stock sample:', stocks[0]);
      }
      
      // Map API response to TipRanksStock format
      // Based on actual API response structure:
      // - ticker, companyName, priceTarget, bestPriceTarget
      // - analystConsensus: { consensus, rawConsensus, distribution: { buy, hold, sell } }
      // - landmarkPrices: { threeMonthsAgo: { p: price }, yearAgo: { p: price } }
      // - sectorId, marketCountryId
      // - newsSentiment (1-5 scale)
      // - hedgeFundSentimentData: { rating, score }
      // - bloggerSentimentData: { rating, bearishCount, bullishCount }
      const mappedStocks: TipRanksStock[] = stocks.map((stock: any) => {
        // Extract ticker
        const ticker = stock.ticker || '';
        
        // Extract company name
        const name = stock.companyName || stock.companyFullName || stock.name || '';
        
        // Extract market - use marketCountryId to determine market
        // marketCountryId: 1 = US, 2 = Canada, etc.
        let market = '';
        if (stock.marketCountryId === 1) {
          market = 'US';
        } else if (stock.marketCountryId === 2) {
          market = 'CA';
        } else if (stock.sectorId) {
          market = stock.sectorId.toUpperCase();
        }
        
        // Extract current price - try multiple sources
        // Note: The API response might not include current price directly
        // Use the most recent landmark price as fallback
        const price = stock.currentPrice || 
                     stock.price || 
                     stock.latestPrice ||
                     stock.landmarkPrices?.threeMonthsAgo?.p || 
                     stock.landmarkPrices?.yearToDate?.p || 
                     stock.landmarkPrices?.yearAgo?.p || 
                     0;
        
        // Calculate price change - compare most recent to previous period
        // Store as numbers, the display code will add the "+" sign
        let priceChange = '';
        let priceChangePercent = '';
        if (stock.landmarkPrices?.threeMonthsAgo?.p && stock.landmarkPrices?.yearAgo?.p) {
          const current = stock.landmarkPrices.threeMonthsAgo.p;
          const previous = stock.landmarkPrices.yearAgo.p;
          const change = current - previous;
          const changePercent = previous > 0 ? (change / previous) * 100 : 0;
          priceChange = change.toFixed(2);
          priceChangePercent = changePercent.toFixed(2);
        } else if (stock.landmarkPrices?.yearToDate?.p && stock.landmarkPrices?.yearAgo?.p) {
          const current = stock.landmarkPrices.yearToDate.p;
          const previous = stock.landmarkPrices.yearAgo.p;
          const change = current - previous;
          const changePercent = previous > 0 ? (change / previous) * 100 : 0;
          priceChange = change.toFixed(2);
          priceChangePercent = changePercent.toFixed(2);
        }
        
        // Extract price target
        const priceTarget = stock.priceTarget || stock.bestPriceTarget || 0;
        
        // Extract smart score - first try to find it directly in the response
        // If not found, calculate from sentiment data
        let score: number | undefined = undefined;
        
        // Try to find smartScore directly in the stock object or nested objects
        if (stock.smartScore !== undefined && stock.smartScore !== null) {
          score = Number(stock.smartScore);
        } else if (stock.nextDividendDate?.smartScore !== undefined && stock.nextDividendDate?.smartScore !== null) {
          score = Number(stock.nextDividendDate.smartScore);
        } else if (stock.lastReportedEps?.smartScore !== undefined && stock.lastReportedEps?.smartScore !== null) {
          score = Number(stock.lastReportedEps.smartScore);
        } else {
          // Calculate smart score from sentiment data if direct score not available
          // newsSentiment is 1-5 scale, hedgeFundSentimentData.score is 0-1
          // Combine them to create a smart score (0-10 scale)
          if (stock.newsSentiment !== undefined && stock.newsSentiment !== null) {
            // newsSentiment is 1-5, convert to 0-10 scale
            const newsScore = (stock.newsSentiment / 5) * 10;
            
            // Add hedge fund sentiment if available (0-1 scale, convert to 0-5)
            const hedgeScore = stock.hedgeFundSentimentData?.score 
              ? stock.hedgeFundSentimentData.score * 5 
              : 0;
            
            // Add blogger sentiment if available
            const bloggerScore = stock.bloggerSentimentData?.rating 
              ? (stock.bloggerSentimentData.rating / 5) * 5 
              : 0;
            
            // Average the scores (weighted: news 40%, hedge 30%, blogger 30%)
            score = (newsScore * 0.4) + (hedgeScore * 0.3) + (bloggerScore * 0.3);
          }
        }
        
        // Extract rating from analystConsensus
        const consensus = stock.analystConsensus?.consensus || stock.bestAnalystConsensus?.consensus || 'buy';
        const ratingText = consensus === 'strongbuy' ? 'Strong Buy' :
                          consensus === 'buy' ? 'Buy' :
                          consensus === 'hold' ? 'Hold' :
                          consensus === 'sell' ? 'Sell' :
                          consensus === 'strongsell' ? 'Strong Sell' : 'Buy';
        
        // Extract analyst counts
        const distribution = stock.analystConsensus?.distribution || stock.bestAnalystConsensus?.distribution || {};
        const analystsCount = (distribution.buy || 0) + (distribution.hold || 0) + (distribution.sell || 0);
        
        // Extract last rating date - use lastReportedEps date or nextEarningsReport date
        const lastRatingDate = stock.lastReportedEps?.date || 
                              stock.nextEarningsReport?.date || 
                              stock.nextDividendDate?.exDate || 
                              '';
        
        // Format date if it exists
        let lastRating = '';
        if (lastRatingDate) {
          try {
            const date = new Date(lastRatingDate);
            if (!isNaN(date.getTime())) {
              lastRating = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              });
            } else {
              lastRating = lastRatingDate;
            }
          } catch (e) {
            lastRating = lastRatingDate;
          }
        }
        
        return {
          ticker: ticker || '',
          name: name || '',
          market: market || '',
          price: Number(price) || 0,
          priceChange: priceChange || '',
          priceChangePercent: priceChangePercent || '',
          priceTarget: Number(priceTarget) || 0,
          rating: stock.analystConsensus?.rawConsensus || stock.bestAnalystConsensus?.rawConsensus || 1,
          lastRating,
          score: score !== undefined && !isNaN(score) ? Number(score.toFixed(1)) : undefined,
          reason: {
            templateID: 0,
            rating: ratingText,
            analystsCount: analystsCount || 0,
          },
        };
      });
      
      setSmartScoreStocks(mappedStocks);
    } catch (err: any) {
      console.error('❌ Error fetching TipRanks Top Smart Score Stocks:', err);
      setSmartScoreError(`Failed to fetch TipRanks Top Smart Score Stocks: ${err.message}`);
      setSmartScoreStocks([]);
    } finally {
      setSmartScoreLoading(false);
    }
  };

  // Fetch TipRanks Top Insider Stocks
  const loadTopInsiderStocks = async () => {
    setInsiderLoading(true);
    setInsiderError(null);
    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '') || '';
      const response = await fetch(`${apiBase}/api/v1/scraper/tipranks/library/top-insider-stocks`);
      
      if (!response.ok) {
        const errorBody = await response.json();
        const detail = errorBody?.detail || `HTTP ${response.status}`;
        throw new Error(detail);
      }
      
      const data = await response.json();
      console.log('✅ TipRanks Top Insider Stocks RAW response:', data);
      
      // Extract stocks array from response
      let stocks: any[] = [];
      if (Array.isArray(data)) {
        stocks = data;
      } else if (data.stocks && Array.isArray(data.stocks)) {
        stocks = data.stocks;
      } else if (data.data && Array.isArray(data.data)) {
        stocks = data.data;
      }
      
      console.log('✅ Parsed insider stocks array length:', stocks.length);
      if (stocks.length > 0) {
        console.log('✅ First insider stock sample:', stocks[0]);
      }
      
      // Map API response to TipRanksInsiderStock format
      const mappedStocks: TipRanksInsiderStock[] = stocks.map((stock: any) => {
        // Extract market from marketCountryId
        let market = '';
        if (stock.marketCountryId === 1) {
          market = 'US';
        } else if (stock.marketCountryId === 2) {
          market = 'CA';
        }
        
        // Format relevant date
        let relevantDate = '';
        if (stock.relevantDate) {
          try {
            const date = new Date(stock.relevantDate);
            if (!isNaN(date.getTime())) {
              relevantDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              });
            } else {
              relevantDate = stock.relevantDate;
            }
          } catch (e) {
            relevantDate = stock.relevantDate;
          }
        }
        
        return {
          ticker: stock.ticker || '',
          companyName: stock.companyName || '',
          strength: Number(stock.strength) || 0,
          insiderSignal: Number(stock.insiderSignal) || 0,
          relevantDate: relevantDate || stock.relevantDate || '',
          marketCap: Number(stock.marketCap) || 0,
          market: market || '',
          events: Array.isArray(stock.events) ? stock.events.map((event: any) => ({
            reason: event.reason || '',
            rating: Number(event.rating) || 0,
            strength: Number(event.strength) || 0,
            operations: Array.isArray(event.operations) ? event.operations.map((op: any) => ({
              insiderName: op.insiderName || '',
              officerTitle: op.officerTitle || '',
              numberOfShares: Number(op.numberOfShares) || 0,
              value: Number(op.value) || 0,
              date: op.date || '',
              rating: Number(op.rating) || 0,
            })) : [],
          })) : [],
        };
      });
      
      setInsiderStocks(mappedStocks);
    } catch (err: any) {
      console.error('❌ Error fetching TipRanks Top Insider Stocks:', err);
      setInsiderError(`Failed to fetch TipRanks Top Insider Stocks: ${err.message}`);
      setInsiderStocks([]);
    } finally {
      setInsiderLoading(false);
    }
  };

  // Fetch TipRanks Stock Screener
  const loadStockScreener = async () => {
    setScreenerLoading(true);
    setScreenerError(null);
    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '') || '';
      const response = await fetch(`${apiBase}/api/v1/scraper/tipranks/library/stock-screener`);
      
      if (!response.ok) {
        const errorBody = await response.json();
        const detail = errorBody?.detail || `HTTP ${response.status}`;
        throw new Error(detail);
      }
      
      const data = await response.json();
      console.log('✅ TipRanks Stock Screener RAW response:', data);
      
      // Extract stocks array from response
      // Response structure: { data: [...] }
      let stocks: any[] = [];
      if (Array.isArray(data)) {
        stocks = data;
      } else if (data.data && Array.isArray(data.data)) {
        stocks = data.data;
      } else if (data.stocks && Array.isArray(data.stocks)) {
        stocks = data.stocks;
      }
      
      console.log('✅ Parsed screener stocks array length:', stocks.length);
      if (stocks.length > 0) {
        console.log('✅ First screener stock sample:', stocks[0]);
      }
      
      // Map API response to TipRanksStock format
      // Same structure as top-smart-score-stocks
      const mappedStocks: TipRanksStock[] = stocks.map((stock: any) => {
        // Extract ticker
        const ticker = stock.ticker || '';
        
        // Extract company name
        const name = stock.companyName || stock.companyFullName || stock.name || '';
        
        // Extract market - use marketCountryId to determine market
        let market = '';
        if (stock.marketCountryId === 1) {
          market = 'US';
        } else if (stock.marketCountryId === 2) {
          market = 'CA';
        } else if (stock.sectorId) {
          market = stock.sectorId.toUpperCase();
        }
        
        // Extract current price from landmarkPrices (use threeMonthsAgo as reference)
        const price = stock.landmarkPrices?.threeMonthsAgo?.p || 
                     stock.landmarkPrices?.yearToDate?.p || 
                     stock.landmarkPrices?.yearAgo?.p || 
                     0;
        
        // Calculate price change - compare most recent to previous period
        let priceChange = '';
        let priceChangePercent = '';
        if (stock.landmarkPrices?.threeMonthsAgo?.p && stock.landmarkPrices?.yearAgo?.p) {
          const current = stock.landmarkPrices.threeMonthsAgo.p;
          const previous = stock.landmarkPrices.yearAgo.p;
          const change = current - previous;
          const changePercent = previous > 0 ? (change / previous) * 100 : 0;
          priceChange = change.toFixed(2);
          priceChangePercent = changePercent.toFixed(2);
        } else if (stock.landmarkPrices?.yearToDate?.p && stock.landmarkPrices?.yearAgo?.p) {
          const current = stock.landmarkPrices.yearToDate.p;
          const previous = stock.landmarkPrices.yearAgo.p;
          const change = current - previous;
          const changePercent = previous > 0 ? (change / previous) * 100 : 0;
          priceChange = change.toFixed(2);
          priceChangePercent = changePercent.toFixed(2);
        }
        
        // Extract price target
        const priceTarget = stock.priceTarget || stock.bestPriceTarget || 0;
        
        // Extract smart score - calculate from newsSentiment and other sentiment data
        let score: number | undefined = undefined;
        
        // Try to find smartScore directly
        if (stock.smartScore !== undefined && stock.smartScore !== null) {
          score = Number(stock.smartScore);
        } else {
          // Calculate from sentiment data
          if (stock.newsSentiment !== undefined && stock.newsSentiment !== null) {
            const newsScore = (stock.newsSentiment / 5) * 10;
            const hedgeScore = stock.hedgeFundSentimentData?.score 
              ? stock.hedgeFundSentimentData.score * 5 
              : 0;
            const bloggerScore = stock.bloggerSentimentData?.rating 
              ? (stock.bloggerSentimentData.rating / 5) * 5 
              : 0;
            score = (newsScore * 0.4) + (hedgeScore * 0.3) + (bloggerScore * 0.3);
          }
        }
        
        // Extract rating from analystConsensus
        const consensus = stock.analystConsensus?.consensus || stock.bestAnalystConsensus?.consensus || 'buy';
        const ratingText = consensus === 'strongbuy' ? 'Strong Buy' :
                          consensus === 'buy' ? 'Buy' :
                          consensus === 'hold' ? 'Hold' :
                          consensus === 'sell' ? 'Sell' :
                          consensus === 'strongsell' ? 'Strong Sell' : 'Buy';
        
        // Extract analyst counts
        const distribution = stock.analystConsensus?.distribution || stock.bestAnalystConsensus?.distribution || {};
        const analystsCount = (distribution.buy || 0) + (distribution.hold || 0) + (distribution.sell || 0);
        
        // Extract last rating date - use lastReportedEps date or nextEarningsReport date
        const lastRatingDate = stock.lastReportedEps?.date || 
                              stock.nextEarningsReport?.date || 
                              stock.nextDividendDate?.exDate || 
                              '';
        
        // Format date if it exists
        let lastRating = '';
        if (lastRatingDate) {
          try {
            const date = new Date(lastRatingDate);
            if (!isNaN(date.getTime())) {
              lastRating = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              });
            } else {
              lastRating = lastRatingDate;
            }
          } catch (e) {
            lastRating = lastRatingDate;
          }
        }
        
        return {
          ticker: ticker || '',
          name: name || '',
          market: market || '',
          price: Number(price) || 0,
          priceChange: priceChange || '',
          priceChangePercent: priceChangePercent || '',
          priceTarget: Number(priceTarget) || 0,
          rating: stock.analystConsensus?.rawConsensus || stock.bestAnalystConsensus?.rawConsensus || 1,
          lastRating,
          score: score !== undefined && !isNaN(score) ? Number(score.toFixed(1)) : undefined,
          reason: {
            templateID: 0,
            rating: ratingText,
            analystsCount: analystsCount || 0,
          },
        };
      });
      
      setScreenerStocks(mappedStocks);
    } catch (err: any) {
      console.error('❌ Error fetching TipRanks Stock Screener:', err);
      setScreenerError(`Failed to fetch TipRanks Stock Screener: ${err.message}`);
      setScreenerStocks([]);
    } finally {
      setScreenerLoading(false);
    }
  };

  // Fetch TipRanks Trending Stocks
  const loadTrendingStocks = async () => {
    setTrendingLoading(true);
    setTrendingError(null);
    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '') || '';
      const response = await fetch(`${apiBase}/api/v1/scraper/tipranks/library/trending-stocks`);
      
      if (!response.ok) {
        const errorBody = await response.json();
        const detail = errorBody?.detail || `HTTP ${response.status}`;
        throw new Error(detail);
      }
      
      const data = await response.json();
      console.log('✅ TipRanks Trending Stocks RAW response:', data);
      
      // Extract stocks array from response
      // Response structure: direct array [...]
      let stocks: any[] = [];
      if (Array.isArray(data)) {
        stocks = data;
      } else if (data.data && Array.isArray(data.data)) {
        stocks = data.data;
      } else if (data.stocks && Array.isArray(data.stocks)) {
        stocks = data.stocks;
      }
      
      console.log('✅ Parsed trending stocks array length:', stocks.length);
      if (stocks.length > 0) {
        console.log('✅ First trending stock sample:', stocks[0]);
      }
      
      // Map API response to TipRanksStock format
      const mappedStocks: TipRanksStock[] = stocks.map((stock: any) => {
        // Extract ticker
        const ticker = stock.ticker || '';
        
        // Extract company name
        const name = stock.companyName || stock.name || '';
        
        // Extract market
        const market = stock.market || '';
        
        // Price is not directly available in trending stocks response
        // We'll show "—" for price
        const price = 0;
        
        // Price change is not available
        const priceChange = '';
        const priceChangePercent = '';
        
        // Extract price target
        const priceTarget = stock.priceTarget || 0;
        
        // Extract rating (1-5 scale, where 5 = Strong Buy, 1 = Strong Sell)
        const rating = Number(stock.rating) || 0;
        
        // Convert rating number to text
        const ratingText = rating === 5 ? 'Strong Buy' :
                          rating === 4 ? 'Buy' :
                          rating === 3 ? 'Hold' :
                          rating === 2 ? 'Sell' :
                          rating === 1 ? 'Strong Sell' : 'Buy';
        
        // Extract analyst counts
        const analystsCount = (stock.buy || 0) + (stock.hold || 0) + (stock.sell || 0);
        
        // Extract last rating date
        const lastRatingDate = stock.lastRatingDate || '';
        
        // Format date if it exists
        let lastRating = '';
        if (lastRatingDate) {
          try {
            const date = new Date(lastRatingDate);
            if (!isNaN(date.getTime())) {
              lastRating = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              });
            } else {
              lastRating = lastRatingDate;
            }
          } catch (e) {
            lastRating = lastRatingDate;
          }
        }
        
        // Calculate smart score from popularity and sentiment
        // popularity and sentiment are positive numbers, consensusScore is lower = better
        // We can create a score from these metrics
        let score: number | undefined = undefined;
        if (stock.popularity !== undefined && stock.sentiment !== undefined) {
          // popularity and sentiment are positive indicators
          // consensusScore lower is better (1 = best, higher = worse)
          // Create a score out of 10
          const popularityScore = Math.min((stock.popularity / 33) * 5, 5); // Max 5 points
          const sentimentScore = Math.min((stock.sentiment / 33) * 3, 3); // Max 3 points
          const consensusScore = stock.consensusScore ? Math.max(0, 2 - (stock.consensusScore - 1)) : 0; // Max 2 points
          score = popularityScore + sentimentScore + consensusScore;
        }
        
        return {
          ticker: ticker || '',
          name: name || '',
          market: market || '',
          price: price,
          priceChange: priceChange || '',
          priceChangePercent: priceChangePercent || '',
          priceTarget: Number(priceTarget) || 0,
          rating: rating,
          lastRating,
          score: score !== undefined && !isNaN(score) ? Number(score.toFixed(1)) : undefined,
          sector: stock.sector || '',
          popularity: stock.popularity !== undefined ? Number(stock.popularity) : undefined,
          sentiment: stock.sentiment !== undefined ? Number(stock.sentiment) : undefined,
          reason: {
            templateID: 0,
            rating: ratingText,
            analystsCount: analystsCount || 0,
          },
        };
      });
      
      setTrendingStocks(mappedStocks);
    } catch (err: any) {
      console.error('❌ Error fetching TipRanks Trending Stocks:', err);
      setTrendingError(`Failed to fetch TipRanks Trending Stocks: ${err.message}`);
      setTrendingStocks([]);
    } finally {
      setTrendingLoading(false);
    }
  };

  useEffect(() => {
    loadArticlesFromDb(1, 50);
    loadTopAnalystStocks();
    loadTopSmartScoreStocks();
    loadTopInsiderStocks();
    loadStockScreener();
    loadTrendingStocks();
  }, []);

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
            to="/analysis"
            className={`nav-link ${location.pathname === '/analysis' ? 'nav-active' : ''}`}
          >
            Analysis
          </Link>
          <Link 
            to="/experts"
            className={`nav-link ${location.pathname === '/experts' ? 'nav-active' : ''}`}
          >
            Experts
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

      {/* Content */}
      <div className="container">
        <div className="content-grid">
          <div className="fundamentals-panel" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="panel-title" style={{ margin: 0 }}>Latest Analysis Articles</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {refreshError && (
                  <button
                    onClick={refreshLatest}
                    disabled={refreshing || loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#ffffff',
                      backgroundColor: 'var(--negative, #ef4444)',
                      border: '1px solid var(--negative, #ef4444)',
                      borderRadius: '4px',
                      cursor: refreshing || loading ? 'not-allowed' : 'pointer',
                      opacity: refreshing || loading ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                    title="Retry fetching latest articles"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={refreshLatest}
                  disabled={refreshing || loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    cursor: refreshing || loading ? 'not-allowed' : 'pointer',
                    opacity: refreshing || loading ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                  title="Fetch latest articles from Seeking Alpha"
                >
                  <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
            {refreshError && (
              <div style={{ 
                marginBottom: '12px', 
                padding: '8px 12px', 
                fontSize: '12px', 
                color: 'var(--negative, #ef4444)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--negative, #ef4444)'
              }}>
                {refreshError}
              </div>
            )}
            <div className="metrics-table-scroll chart-block">
              {loading && (
                <div className="chart-loading-overlay">
                  <div className="chart-loading-spinner" />
                  <div className="chart-loading-text">Loading analysis articles...</div>
                </div>
              )}
              <table className="data-table news-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Title</th>
                    <th>Tickers</th>
                    <th>Author</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? null : error ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--negative)',
                        }}
                      >
                        {error}
                      </td>
                    </tr>
                  ) : articles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        No analysis articles available.
                      </td>
                    </tr>
                  ) : (
                    articles.map((article, idx) => (
                      <tr key={article.url || idx}>
                        <td>
                          <div className="news-date-cell">
                            <span className="news-time">{formatPublishedDate(article)}</span>
                          </div>
                        </td>
                        <td>
                          {article.url ? (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="news-headline-link"
                              title={article.summary}
                            >
                              {article.title}
                            </a>
                          ) : (
                            <span className="news-headline-link">{article.title}</span>
                          )}
                        </td>
                        <td>
                          {article.tickers && article.tickers.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {article.tickers.map((ticker, tickerIdx) => (
                                <Link
                                  key={tickerIdx}
                                  to={`/stock/${ticker}`}
                                  className="ticker-link"
                                  style={{ fontSize: '11px' }}
                                >
                                  {ticker}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="news-source-link">{article.author || '—'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {!loading && !error && articles.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '16px',
                  padding: '0 16px 8px',
                  gap: 12,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Rows per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    disabled={loading}
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                  <span style={{ marginLeft: 8 }}>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalArticles)} of {totalArticles}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '2px 8px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Page</span>
                    <select
                      value={currentPage}
                      onChange={(e) => handlePageChange(Number(e.target.value))}
                      disabled={loading}
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {Array.from({ length: Math.ceil(totalArticles / itemsPerPage) }, (_, idx) => {
                        const page = idx + 1;
                        return (
                          <option key={page} value={page}>
                            {page}
                          </option>
                        );
                      })}
                    </select>
                    <span>of {Math.ceil(totalArticles / itemsPerPage)}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '2px 8px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalArticles / itemsPerPage) || loading}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* TipRanks Top Analyst Stocks Section */}
          <div className="fundamentals-panel" style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="panel-title" style={{ margin: 0 }}>TipRanks Top Analyst Stocks</h3>
              <button
                onClick={loadTopAnalystStocks}
                disabled={stocksLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: stocksLoading ? 'not-allowed' : 'pointer',
                  opacity: stocksLoading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                title="Refresh TipRanks Top Analyst Stocks"
              >
                <RefreshCw size={14} style={{ animation: stocksLoading ? 'spin 1s linear infinite' : 'none' }} />
                {stocksLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {stocksError && (
              <div style={{ 
                marginBottom: '12px', 
                padding: '8px 12px', 
                fontSize: '12px', 
                color: 'var(--negative, #ef4444)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--negative, #ef4444)'
              }}>
                {stocksError}
              </div>
            )}
            
            <div className="metrics-table-scroll chart-block">
              {stocksLoading && (
                <div className="chart-loading-overlay">
                  <div className="chart-loading-spinner" />
                  <div className="chart-loading-text">Loading TipRanks Top Analyst Stocks...</div>
                </div>
              )}
              <table className="data-table news-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Name</th>
                    <th>Market</th>
                    <th>Price</th>
                    <th>Change</th>
                    <th>Price Target</th>
                    <th>Rating</th>
                    <th>Last Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {stocksLoading ? null : stocksError ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--negative)',
                        }}
                      >
                        {stocksError}
                      </td>
                    </tr>
                  ) : topStocks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        No stocks available.
                      </td>
                    </tr>
                  ) : (
                    topStocks.map((stock, idx) => {
                      const priceChangeNum = parseFloat(stock.priceChange) || 0;
                      const priceChangePercentNum = parseFloat(stock.priceChangePercent) || 0;
                      const isPositive = priceChangeNum >= 0;
                      
                      return (
                        <tr key={`${stock.ticker}-${idx}`}>
                          <td>
                            <Link
                              to={`/stock/${stock.ticker}`}
                              className="ticker-link"
                              style={{ fontSize: '12px', fontWeight: '600' }}
                            >
                              {stock.ticker}
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px' }}>{stock.name}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.market}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', fontWeight: '500' }}>
                              ${stock.price.toFixed(2)}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                color: isPositive
                                  ? 'var(--accent-green, #22c55e)'
                                  : 'var(--accent-red, #ef4444)',
                              }}
                            >
                              {isPositive ? '+' : ''}
                              {stock.priceChange}
                              {stock.priceChangePercent && ` (${isPositive ? '+' : ''}${stock.priceChangePercent}%)`}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px' }}>
                              ${stock.priceTarget.toFixed(2)}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'var(--link-color)',
                                textTransform: 'uppercase',
                              }}
                            >
                              {stock.reason?.rating || 'BUY'}
                            </span>
                            {stock.reason?.analystsCount && stock.reason.analystsCount > 0 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                                ({stock.reason.analystsCount})
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.lastRating}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TipRanks Top Smart Score Stocks Section */}
          <div className="fundamentals-panel" style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="panel-title" style={{ margin: 0 }}>TipRanks Top Smart Score Stocks</h3>
              <button
                onClick={loadTopSmartScoreStocks}
                disabled={smartScoreLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: smartScoreLoading ? 'not-allowed' : 'pointer',
                  opacity: smartScoreLoading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                title="Refresh TipRanks Top Smart Score Stocks"
              >
                <RefreshCw size={14} style={{ animation: smartScoreLoading ? 'spin 1s linear infinite' : 'none' }} />
                {smartScoreLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {smartScoreError && (
              <div style={{ 
                marginBottom: '12px', 
                padding: '8px 12px', 
                fontSize: '12px', 
                color: 'var(--negative, #ef4444)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--negative, #ef4444)'
              }}>
                {smartScoreError}
              </div>
            )}
            
            <div className="metrics-table-scroll chart-block">
              {smartScoreLoading && (
                <div className="chart-loading-overlay">
                  <div className="chart-loading-spinner" />
                  <div className="chart-loading-text">Loading TipRanks Top Smart Score Stocks...</div>
                </div>
              )}
              <table className="data-table news-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Name</th>
                    <th>Market</th>
                    <th>Price</th>
                    <th>Change</th>
                    <th>Price Target</th>
                    <th>Smart Score</th>
                    <th>Rating</th>
                    <th>Last Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {smartScoreLoading ? null : smartScoreError ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--negative)',
                        }}
                      >
                        {smartScoreError}
                      </td>
                    </tr>
                  ) : smartScoreStocks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        No stocks available.
                      </td>
                    </tr>
                  ) : (
                    smartScoreStocks.map((stock, idx) => {
                      const priceChangeNum = parseFloat(stock.priceChange) || 0;
                      const priceChangePercentNum = parseFloat(stock.priceChangePercent) || 0;
                      const hasPriceChange = stock.priceChange && stock.priceChange.trim() !== '';
                      const isPositive = priceChangeNum >= 0;
                      const hasPrice = stock.price > 0;
                      
                      return (
                        <tr key={`${stock.ticker}-${idx}`}>
                          <td>
                            <Link
                              to={`/stock/${stock.ticker}`}
                              className="ticker-link"
                              style={{ fontSize: '12px', fontWeight: '600' }}
                            >
                              {stock.ticker}
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px' }}>{stock.name}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.market || '—'}
                            </span>
                          </td>
                          <td>
                            {hasPrice ? (
                              <span style={{ fontSize: '12px', fontWeight: '500' }}>
                                ${stock.price.toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {hasPriceChange ? (
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  color: isPositive
                                    ? 'var(--accent-green, #22c55e)'
                                    : 'var(--accent-red, #ef4444)',
                                }}
                              >
                                {isPositive ? '+' : ''}
                                {stock.priceChange}
                                {stock.priceChangePercent && ` (${isPositive ? '+' : ''}${stock.priceChangePercent}%)`}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {stock.priceTarget > 0 ? (
                              <span style={{ fontSize: '12px' }}>
                                ${stock.priceTarget.toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {stock.score !== undefined && stock.score !== null ? (
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: stock.score >= 8 
                                    ? 'var(--accent-green, #22c55e)' 
                                    : stock.score >= 5 
                                    ? 'var(--text-primary)' 
                                    : 'var(--accent-red, #ef4444)',
                                }}
                              >
                                {stock.score.toFixed(1)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'var(--link-color)',
                                textTransform: 'uppercase',
                              }}
                            >
                              {stock.reason?.rating || 'BUY'}
                            </span>
                            {stock.reason?.analystsCount && stock.reason.analystsCount > 0 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                                ({stock.reason.analystsCount})
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.lastRating || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TipRanks Top Insider Stocks Section */}
          <div className="fundamentals-panel" style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="panel-title" style={{ margin: 0 }}>TipRanks Top Insider Stocks</h3>
              <button
                onClick={loadTopInsiderStocks}
                disabled={insiderLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: insiderLoading ? 'not-allowed' : 'pointer',
                  opacity: insiderLoading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                title="Refresh TipRanks Top Insider Stocks"
              >
                <RefreshCw size={14} style={{ animation: insiderLoading ? 'spin 1s linear infinite' : 'none' }} />
                {insiderLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {insiderError && (
              <div style={{ 
                marginBottom: '12px', 
                padding: '8px 12px', 
                fontSize: '12px', 
                color: 'var(--negative, #ef4444)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--negative, #ef4444)'
              }}>
                {insiderError}
              </div>
            )}
            
            <div className="metrics-table-scroll chart-block">
              {insiderLoading && (
                <div className="chart-loading-overlay">
                  <div className="chart-loading-spinner" />
                  <div className="chart-loading-text">Loading TipRanks Top Insider Stocks...</div>
                </div>
              )}
              <table className="data-table news-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Company</th>
                    <th>Market</th>
                    <th>Strength</th>
                    <th>Insider Signal</th>
                    <th>Market Cap</th>
                    <th>Relevant Date</th>
                    <th>Events</th>
                  </tr>
                </thead>
                <tbody>
                  {insiderLoading ? null : insiderError ? (
                    <tr>
                      <td
                        colSpan={8}
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
                  ) : insiderStocks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        No insider stocks available.
                      </td>
                    </tr>
                  ) : (
                    insiderStocks.map((stock, idx) => {
                      // Format market cap
                      const marketCap = stock.marketCap;
                      let marketCapFormatted = '';
                      if (marketCap >= 1e12) {
                        marketCapFormatted = `$${(marketCap / 1e12).toFixed(2)}T`;
                      } else if (marketCap >= 1e9) {
                        marketCapFormatted = `$${(marketCap / 1e9).toFixed(2)}B`;
                      } else if (marketCap >= 1e6) {
                        marketCapFormatted = `$${(marketCap / 1e6).toFixed(2)}M`;
                      } else if (marketCap >= 1e3) {
                        marketCapFormatted = `$${(marketCap / 1e3).toFixed(2)}K`;
                      } else {
                        marketCapFormatted = `$${marketCap.toFixed(2)}`;
                      }
                      
                      // Get first event reason or count of events
                      const eventCount = stock.events.length;
                      const firstEventReason = stock.events.length > 0 ? stock.events[0].reason : '';
                      
                      return (
                        <tr key={`${stock.ticker}-${idx}`}>
                          <td>
                            <Link
                              to={`/stock/${stock.ticker}`}
                              className="ticker-link"
                              style={{ fontSize: '12px', fontWeight: '600' }}
                            >
                              {stock.ticker}
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px' }}>{stock.companyName}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.market || '—'}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: stock.strength >= 80 
                                  ? 'var(--accent-green, #22c55e)' 
                                  : stock.strength >= 60 
                                  ? 'var(--text-primary)' 
                                  : 'var(--accent-red, #ef4444)',
                              }}
                            >
                              {stock.strength}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                color: stock.insiderSignal >= 0.8 
                                  ? 'var(--accent-green, #22c55e)' 
                                  : stock.insiderSignal >= 0.5 
                                  ? 'var(--text-primary)' 
                                  : 'var(--accent-red, #ef4444)',
                              }}
                            >
                              {(stock.insiderSignal * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {marketCapFormatted}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.relevantDate || '—'}
                            </span>
                          </td>
                          <td>
                            {eventCount > 0 ? (
                              <div style={{ fontSize: '11px' }}>
                                <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                                  {eventCount} event{eventCount !== 1 ? 's' : ''}
                                </div>
                                {firstEventReason && (
                                  <div style={{ 
                                    color: 'var(--text-secondary)', 
                                    fontSize: '10px',
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }} title={firstEventReason}>
                                    {firstEventReason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TipRanks Stock Screener Section */}
          <div className="fundamentals-panel" style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="panel-title" style={{ margin: 0 }}>TipRanks Stock Screener</h3>
              <button
                onClick={loadStockScreener}
                disabled={screenerLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: screenerLoading ? 'not-allowed' : 'pointer',
                  opacity: screenerLoading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                title="Refresh TipRanks Stock Screener"
              >
                <RefreshCw size={14} style={{ animation: screenerLoading ? 'spin 1s linear infinite' : 'none' }} />
                {screenerLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {screenerError && (
              <div style={{ 
                marginBottom: '12px', 
                padding: '8px 12px', 
                fontSize: '12px', 
                color: 'var(--negative, #ef4444)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--negative, #ef4444)'
              }}>
                {screenerError}
              </div>
            )}
            
            <div className="metrics-table-scroll chart-block">
              {screenerLoading && (
                <div className="chart-loading-overlay">
                  <div className="chart-loading-spinner" />
                  <div className="chart-loading-text">Loading TipRanks Stock Screener...</div>
                </div>
              )}
              <table className="data-table news-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Name</th>
                    <th>Market</th>
                    <th>Price</th>
                    <th>Change</th>
                    <th>Price Target</th>
                    <th>Smart Score</th>
                    <th>Rating</th>
                    <th>Last Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {screenerLoading ? null : screenerError ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--negative)',
                        }}
                      >
                        {screenerError}
                      </td>
                    </tr>
                  ) : screenerStocks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        No stocks available.
                      </td>
                    </tr>
                  ) : (
                    screenerStocks.map((stock, idx) => {
                      const priceChangeNum = parseFloat(stock.priceChange) || 0;
                      const priceChangePercentNum = parseFloat(stock.priceChangePercent) || 0;
                      const hasPriceChange = stock.priceChange && stock.priceChange.trim() !== '';
                      const isPositive = priceChangeNum >= 0;
                      const hasPrice = stock.price > 0;
                      
                      return (
                        <tr key={`${stock.ticker}-${idx}`}>
                          <td>
                            <Link
                              to={`/stock/${stock.ticker}`}
                              className="ticker-link"
                              style={{ fontSize: '12px', fontWeight: '600' }}
                            >
                              {stock.ticker}
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px' }}>{stock.name}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.market || '—'}
                            </span>
                          </td>
                          <td>
                            {hasPrice ? (
                              <span style={{ fontSize: '12px', fontWeight: '500' }}>
                                ${stock.price.toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {hasPriceChange ? (
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  color: isPositive
                                    ? 'var(--accent-green, #22c55e)'
                                    : 'var(--accent-red, #ef4444)',
                                }}
                              >
                                {isPositive ? '+' : ''}
                                {stock.priceChange}
                                {stock.priceChangePercent && ` (${isPositive ? '+' : ''}${stock.priceChangePercent}%)`}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {stock.priceTarget > 0 ? (
                              <span style={{ fontSize: '12px' }}>
                                ${stock.priceTarget.toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {stock.score !== undefined && stock.score !== null ? (
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: stock.score >= 8 
                                    ? 'var(--accent-green, #22c55e)' 
                                    : stock.score >= 5 
                                    ? 'var(--text-primary)' 
                                    : 'var(--accent-red, #ef4444)',
                                }}
                              >
                                {stock.score.toFixed(1)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'var(--link-color)',
                                textTransform: 'uppercase',
                              }}
                            >
                              {stock.reason?.rating || 'BUY'}
                            </span>
                            {stock.reason?.analystsCount && stock.reason.analystsCount > 0 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                                ({stock.reason.analystsCount})
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.lastRating || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TipRanks Trending Stocks Section */}
          <div className="fundamentals-panel" style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="panel-title" style={{ margin: 0 }}>TipRanks Trending Stocks</h3>
              <button
                onClick={loadTrendingStocks}
                disabled={trendingLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: trendingLoading ? 'not-allowed' : 'pointer',
                  opacity: trendingLoading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                title="Refresh TipRanks Trending Stocks"
              >
                <RefreshCw size={14} style={{ animation: trendingLoading ? 'spin 1s linear infinite' : 'none' }} />
                {trendingLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {trendingError && (
              <div style={{ 
                marginBottom: '12px', 
                padding: '8px 12px', 
                fontSize: '12px', 
                color: 'var(--negative, #ef4444)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--negative, #ef4444)'
              }}>
                {trendingError}
              </div>
            )}
            
            <div className="metrics-table-scroll chart-block">
              {trendingLoading && (
                <div className="chart-loading-overlay">
                  <div className="chart-loading-spinner" />
                  <div className="chart-loading-text">Loading TipRanks Trending Stocks...</div>
                </div>
              )}
              <table className="data-table news-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Name</th>
                    <th>Market</th>
                    <th>Sector</th>
                    <th>Popularity</th>
                    <th>Sentiment</th>
                    <th>Price Target</th>
                    <th>Rating</th>
                    <th>Last Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {trendingLoading ? null : trendingError ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--negative)',
                        }}
                      >
                        {trendingError}
                      </td>
                    </tr>
                  ) : trendingStocks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        No trending stocks available.
                      </td>
                    </tr>
                  ) : (
                    trendingStocks.map((stock, idx) => {
                      return (
                        <tr key={`${stock.ticker}-${idx}`}>
                          <td>
                            <Link
                              to={`/stock/${stock.ticker}`}
                              className="ticker-link"
                              style={{ fontSize: '12px', fontWeight: '600' }}
                            >
                              {stock.ticker}
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px' }}>{stock.name}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.market || '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.sector || '—'}
                            </span>
                          </td>
                          <td>
                            {stock.popularity !== undefined ? (
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  color: stock.popularity >= 25 
                                    ? 'var(--accent-green, #22c55e)' 
                                    : stock.popularity >= 15 
                                    ? 'var(--text-primary)' 
                                    : 'var(--text-secondary)',
                                }}
                              >
                                {stock.popularity}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {stock.sentiment !== undefined ? (
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  color: stock.sentiment >= 20 
                                    ? 'var(--accent-green, #22c55e)' 
                                    : stock.sentiment >= 10 
                                    ? 'var(--text-primary)' 
                                    : stock.sentiment >= 0
                                    ? 'var(--text-secondary)'
                                    : 'var(--accent-red, #ef4444)',
                                }}
                              >
                                {stock.sentiment >= 0 ? '+' : ''}{stock.sentiment}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {stock.priceTarget > 0 ? (
                              <span style={{ fontSize: '12px' }}>
                                ${stock.priceTarget.toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'var(--link-color)',
                                textTransform: 'uppercase',
                              }}
                            >
                              {stock.reason?.rating || 'BUY'}
                            </span>
                            {stock.reason?.analystsCount && stock.reason.analystsCount > 0 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                                ({stock.reason.analystsCount})
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {stock.lastRating || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;

