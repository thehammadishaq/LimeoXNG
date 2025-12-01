import React, { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { filterOptions, signals, orderByOptions } from '../mockData';
import FilterPanel from '../components/FilterPanel';
import StockTable from '../components/StockTableEnhanced';
import { useTheme } from '../context/ThemeContext';
import {
  fetchScreenerData,
  fetchScreenerSymbols,
  transformStockData,
  fetchLatestCandlesFromDb,
  type LatestCandleDbItem,
} from '../services/api';

const Screener = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [stocks, setStocks] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalStocks, setTotalStocks] = useState(0);
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [selectedView, setSelectedView] = useState('overview');
  const [orderBy, setOrderBy] = useState('Ticker');
  const [orderDirection, setOrderDirection] = useState('Asc');
  const [selectedSignal, setSelectedSignal] = useState('None (all stocks)');
  const [filters, setFilters] = useState<any>({});
  const [activeFilterTab, setActiveFilterTab] = useState('valuation');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true); // Start with true to show skeleton initially
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [financialsLoaded, setFinancialsLoaded] = useState(false);
  const [portfolioMessage, setPortfolioMessage] = useState<string | null>(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioName, setPortfolioName] = useState('');
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [latestCandles, setLatestCandles] = useState<Record<string, LatestCandleDbItem>>({});
  const [latestCandlesLoaded, setLatestCandlesLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLatestCandles = useCallback(async () => {
    if (latestCandlesLoaded) return;

    try {
      console.log('🔄 Fetching latest OHLCV candles from DB for OHLCV view...');
      const resp = await fetchLatestCandlesFromDb();
      const map: Record<string, LatestCandleDbItem> = {};
      (resp.items || []).forEach((item) => {
        if (item.ticker) {
          map[item.ticker.toUpperCase()] = item;
        }
      });
      console.log('✅ Loaded latest candles for tickers:', Object.keys(map).length);
      setLatestCandles(map);
      setLatestCandlesLoaded(true);
    } catch (error) {
      console.error('❌ Error loading latest candles from DB:', error);
      setLatestCandlesLoaded(true);
    }
  }, [latestCandlesLoaded]);

  // Fetch data from API
  const fetchData = async (
    forceRefresh: boolean = false,
    pageNum: number = currentPage,
    symbols?: string[],
    includeFinancials: boolean = false
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching screener data from DB...', {
        forceRefresh,
        pageNum,
        itemsPerPage,
        symbols,
        includeFinancials,
      });
      
      // If symbols are provided, pass them; otherwise fetch all from DB for the current page
      const response = await fetchScreenerData(
        pageNum,
        itemsPerPage,
        forceRefresh,
        symbols,
        includeFinancials
      );
      
      console.log('📦 API Response:', response);
      console.log('📊 Stocks received:', response.stocks?.length || 0);
      
      // Check if response has stocks
      if (!response || !response.stocks || response.stocks.length === 0) {
        console.error('❌ No stocks in response');
        console.error('📦 Full response:', response);
        console.error('💡 Possible issues:');
        console.error('   1. API key not loaded - restart dev server after creating .env file');
        console.error('   2. Premium subscription required for /stock/profile endpoint');
        console.error('   3. Network/CORS issues');
        console.error('   4. Invalid API key');
        setError('No stocks data available. Please check browser console for detailed error messages.');
        setStocks([]);
        setTotalStocks(0);
        setLoading(false);
        return;
      }
      
      // Transform API data to frontend format
      const transformedStocks = response.stocks
        .map(apiStock => {
          try {
            // Check if API data has valid profile
            if (!apiStock.profile || !apiStock.profile.name) {
              console.warn('Stock has no valid profile data:', apiStock.ticker);
              return null;
            }
            
            const transformed = transformStockData(apiStock);
            
            // Check if transformed data has actual values (at least company name should be different from ticker)
            const hasActualData = transformed && transformed.company && transformed.company !== transformed.ticker;
            
            if (!hasActualData) {
              console.warn('Transformed stock has no actual data:', apiStock.ticker, transformed);
              return null;
            }
            
            transformed.fromCache = false;
            return transformed;
          } catch (transformError) {
            console.error('Error transforming stock data:', transformError, apiStock);
            return null;
          }
        })
        .filter((stock): stock is any => stock !== null); // Remove null values
      
      if (transformedStocks.length === 0) {
        console.error('❌ No valid stocks after transformation');
        console.error('📦 Original API response:', response);
        console.error('📊 Original stocks array:', response.stocks);
        console.error('💡 Check the console logs above for API call details');
        setError('Failed to process stock data. Please check browser console for detailed error messages.');
        setStocks([]);
        setLoading(false);
        return;
      }
      
      // Add numbering based on page
      const startNumber = (pageNum - 1) * itemsPerPage + 1;
      const numberedStocks = transformedStocks.map((stock, index) => ({
        ...stock,
        no: startNumber + index
      }));
      
      setStocks(numberedStocks);
      // Only update totalStocks when we are using backend pagination mode
      // (no explicit symbols provided). In symbol mode, totalStocks comes
      // from the screener-symbols backend endpoint.
      if (!symbols || symbols.length === 0) {
        setTotalStocks(response.total ?? numberedStocks.length);
      }
      setCurrentPage(pageNum);
      setLastRefresh(new Date());
      
      console.log(`✅ Fetched ${response.fresh_count} fresh stocks, ${response.cached_count} from cache`);
      console.log(`📈 Transformed ${transformedStocks.length} stocks`);
    } catch (err: any) {
      console.error('❌ Error in fetchData:', err);
      console.error('Error type:', err?.constructor?.name);
      console.error('Error message:', err?.message);
      console.error('Error stack:', err?.stack);
      console.error('Full error object:', err);
      
      const errorMessage = err?.message || 'Failed to fetch data. Please check browser console for details.';
      setError(errorMessage);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  const getPageSymbols = (symbols: string[], pageNum: number): string[] => {
    if (!symbols || symbols.length === 0) return [];
    const start = (pageNum - 1) * itemsPerPage;
    return symbols.slice(start, start + itemsPerPage);
  };

  // Load full symbol universe matching current filters (server-side),
  // then fetch data for the requested page from DB.
  const loadSymbolsAndPage = async (pageNum: number = 1, forceRefresh: boolean = false) => {
    try {
      console.log('🔍 Loading screener symbols from backend with filters:', filters, 'search:', searchTerm);
      const symbolsResp = await fetchScreenerSymbols(filters, searchTerm.trim() || undefined);

      if (!symbolsResp || !symbolsResp.symbols || symbolsResp.symbols.length === 0) {
        console.warn('⚠️ No symbols returned for current filters');
        setAllSymbols([]);
        setTotalStocks(0);
        setStocks([]);
        setCurrentPage(1);
        setError('No stocks match current filters.');
        return;
      }

      const symbols = symbolsResp.symbols;
      const total = symbolsResp.total ?? symbols.length;

      setAllSymbols(symbols);
      setTotalStocks(total);

      const safePage = Math.max(1, Math.min(pageNum, Math.ceil(total / itemsPerPage) || 1));
      const pageSymbols = getPageSymbols(symbols, safePage);

      if (pageSymbols.length === 0) {
        setStocks([]);
        setCurrentPage(safePage);
        return;
      }

      // Fetch DB profile + financials for page symbols
      await fetchData(forceRefresh, safePage, pageSymbols, true);
      setFinancialsLoaded(true);
    } catch (e: any) {
      console.error('❌ Error loading screener symbols/page:', e);
      setAllSymbols([]);
      setTotalStocks(0);
      setStocks([]);
      setCurrentPage(1);
      setError(e?.message || 'Failed to load screener data. Please check browser console.');
    }
  };

  // When filters or search term change, refresh full symbol list and reset to first page
  useEffect(() => {
    loadSymbolsAndPage(1, false);
  }, [filters, searchTerm]);

  
  // Use stocks directly (no client-side filtering - backend handles search)
  const currentStocks = stocks;
  const totalPages = totalStocks > 0 ? Math.ceil(totalStocks / itemsPerPage) : 1;
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  
  const handlePageChange = (pageNumber: number) => {
    const pageSymbols = getPageSymbols(allSymbols, pageNumber);
    setCurrentPage(pageNumber);

    if (pageSymbols.length === 0) {
      setStocks([]);
      return;
    }

    // If financials were already loaded once, keep including them for new pages
    fetchData(false, pageNumber, pageSymbols, financialsLoaded);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open portfolio modal pre-populated with current filtered stocks
  const handleOpenPortfolioModal = () => {
    try {
      if (!stocks || stocks.length === 0) {
        setPortfolioMessage('No stocks to save. Adjust filters or load data first.');
        return;
      }

      const defaultName = `Portfolio ${new Date().toLocaleDateString()}`;
      setPortfolioName(defaultName);
      setSelectedTickers(stocks.map((s) => s.ticker));
      setShowPortfolioModal(true);
      setPortfolioMessage(null);
    } catch (e) {
      console.error('❌ Error preparing portfolio modal:', e);
      setPortfolioMessage('Failed to open portfolio modal. Check console for details.');
    }
  };

  const handleToggleTicker = (ticker: string) => {
    setSelectedTickers((prev) =>
      prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker]
    );
  };

  const handleSelectAllTickers = () => {
    setSelectedTickers(stocks.map((s) => s.ticker));
  };

  const handleClearAllTickers = () => {
    setSelectedTickers([]);
  };

  // Save portfolio to localStorage from modal selection
  const handleSavePortfolio = () => {
    try {
      if (!stocks || stocks.length === 0) {
        setPortfolioMessage('No stocks to save. Adjust filters or load data first.');
        setShowPortfolioModal(false);
        return;
      }

      const trimmedName = portfolioName.trim() || `Portfolio ${new Date().toLocaleDateString()}`;
      const selectedStocks = stocks.filter((s) => selectedTickers.includes(s.ticker));

      if (selectedStocks.length === 0) {
        setPortfolioMessage('Select at least one company to create a portfolio.');
        return;
      }

      const symbols = selectedStocks.map((s) => s.ticker);
      const portfolio = {
        id: Date.now(),
        name: trimmedName,
        createdAt: new Date().toISOString(),
        symbols,
        stocks: selectedStocks,
      };

      const existingRaw = localStorage.getItem('limeo_portfolios');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push(portfolio);
      localStorage.setItem('limeo_portfolios', JSON.stringify(existing));

      setPortfolioMessage(`Portfolio "${trimmedName}" created with ${symbols.length} stocks.`);
      setShowPortfolioModal(false);
      // Auto-clear message after a few seconds
      setTimeout(() => setPortfolioMessage(null), 5000);
    } catch (e) {
      console.error('❌ Error creating portfolio:', e);
      setPortfolioMessage('Failed to create portfolio. Check console for details.');
    }
  };

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

      {/* Filter Section with Border */}
      <div className="filter-section-wrapper">
        {/* Top Controls */}
        <div className="top-controls">
          <div className="controls-left">
            <input
              type="text"
              placeholder="Search tickers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{
                padding: '3px 6px',
                fontSize: '11px',
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '200px',
                cursor: 'text',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--link-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            />
            <span className="separator">|</span>
            <select className="preset-select">
              <option>My Presets</option>
              <option>-Save Screen-</option>
              <option>-Edit Screens-</option>
            </select>
            <span className="separator">|</span>
            <span>Order by</span>
            <select 
              className="order-select" 
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
            >
              {orderByOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select 
              className="direction-select"
              value={orderDirection}
              onChange={(e) => setOrderDirection(e.target.value)}
            >
              <option>Asc</option>
              <option>Desc</option>
            </select>
            <span className="separator">|</span>
            <span>Signal</span>
            <select 
              className="signal-select"
              value={selectedSignal}
              onChange={(e) => setSelectedSignal(e.target.value)}
            >
              {signals.map(signal => (
                <option key={signal} value={signal}>{signal}</option>
              ))}
            </select>
          </div>
          <div className="controls-right">
            <button 
              className={`btn-filters ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
        {/* Filter Panel */}
        {showFilters && (
          <FilterPanel 
            filters={filters}
            setFilters={setFilters}
            filterOptions={filterOptions}
            activeTab={activeFilterTab}
            setActiveTab={setActiveFilterTab}
          />
        )}

        {/* View Tabs */}
        <div className="view-tabs">
        <button 
          className={selectedView === 'overview' ? 'tab-active' : ''}
          onClick={() => setSelectedView('overview')}
        >
          Overview
        </button>
        <button 
          className={selectedView === 'valuation' ? 'tab-active' : ''}
          onClick={() => {
            setSelectedView('valuation');
            // Financials are already loaded on page load, just switch view
          }}
        >
          Valuation
        </button>
        <button 
          className={selectedView === 'margins' ? 'tab-active' : ''}
          onClick={() => setSelectedView('margins')}
        >
          Margins
        </button>
        <button 
          className={selectedView === 'profitability' ? 'tab-active' : ''}
          onClick={() => setSelectedView('profitability')}
        >
          Profitability
        </button>
        <button 
          className={selectedView === 'bsstrength' ? 'tab-active' : ''}
          onClick={() => setSelectedView('bsstrength')}
        >
          BS Strength
        </button>
        <button 
          className={selectedView === 'liquidity' ? 'tab-active' : ''}
          onClick={() => setSelectedView('liquidity')}
        >
          Liquidity
        </button>
        <button 
          className={selectedView === 'efficiency' ? 'tab-active' : ''}
          onClick={() => setSelectedView('efficiency')}
        >
          Efficiency
        </button>
        <button 
          className={selectedView === 'operational' ? 'tab-active' : ''}
          onClick={() => setSelectedView('operational')}
        >
          Operational Metrics
        </button>
        <button 
          className={selectedView === 'dividends' ? 'tab-active' : ''}
          onClick={() => setSelectedView('dividends')}
        >
          Dividends
        </button>
        <button 
          className={selectedView === 'ownership' ? 'tab-active' : ''}
          onClick={() => setSelectedView('ownership')}
        >
          Ownership
        </button>
          <button
            className={selectedView === 'performance' ? 'tab-active' : ''}
            onClick={() => setSelectedView('performance')}
          >
            Performance
          </button>
          <button
            className={selectedView === 'cashflow' ? 'tab-active' : ''}
            onClick={() => setSelectedView('cashflow')}
          >
            Cash Flow
          </button>
          <button
            className={selectedView === 'growth' ? 'tab-active' : ''}
            onClick={() => setSelectedView('growth')}
          >
            Growth
          </button>
          <button
            className={selectedView === 'ohlcv' ? 'tab-active' : ''}
            onClick={() => {
              setSelectedView('ohlcv');
              if (!latestCandlesLoaded) {
                loadLatestCandles();
              }
            }}
          >
            OHLCV
          </button>
          <button
            className={selectedView === 'technical' ? 'tab-active' : ''}
            onClick={() => setSelectedView('technical')}
          >
          Technical
        </button>
        </div>
      </div>

      {/* Results Info */}
      <div className="results-info">
        <div className="results-text">
          {totalStocks > 0 && currentStocks.length > 0
            ? `Showing ${indexOfFirstItem + 1}-${indexOfFirstItem + currentStocks.length} of ${totalStocks} stocks${searchTerm.trim() ? ` matching "${searchTerm}"` : ''}`
            : totalStocks > 0
            ? `Showing 0 of ${totalStocks} stocks${searchTerm.trim() ? ` matching "${searchTerm}"` : ''}`
            : searchTerm.trim()
            ? `No stocks found matching "${searchTerm}"`
            : 'No stocks to display'}
          {loading && <span style={{ marginLeft: '10px', color: 'var(--link-color)' }}>Loading...</span>}
          {error && <span style={{ marginLeft: '10px', color: 'var(--negative)' }}>{error}</span>}
          {portfolioMessage && (
            <span style={{ marginLeft: '10px', color: 'var(--link-color)' }}>{portfolioMessage}</span>
          )}
          {lastRefresh && !loading && (
            <span style={{ marginLeft: '10px', fontSize: '10px', color: 'var(--text-secondary)' }}>
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="results-actions">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleOpenPortfolioModal();
            }}
          >
            Create portfolio
          </a> | 
          <a href="#"> create alert</a>
          <span className="separator">|</span>
          <span>
            Refresh: 
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                const pageSymbols = getPageSymbols(allSymbols, currentPage);
                if (pageSymbols.length === 0) {
                  return;
                }
                // Respect whether financials were loaded before, but refresh DB data
                fetchData(true, currentPage, pageSymbols, financialsLoaded);
              }}
              style={{ marginLeft: '4px', cursor: 'pointer' }}
            >
              Now
            </a>
            {' | '}
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                const pageSymbols = getPageSymbols(allSymbols, currentPage);
                if (pageSymbols.length === 0) {
                  return;
                }
                // Respect whether financials were loaded before, use cached DB data
                fetchData(false, currentPage, pageSymbols, financialsLoaded);
              }}
              style={{ cursor: 'pointer' }}
            >
              Cache
            </a>
          </span>
        </div>
      </div>

      {/* Stock Table */}
      <StockTable 
        stocks={currentStocks}
        view={selectedView}
        loading={loading}
        latestCandlesByTicker={latestCandles}
      />
      {!loading && currentStocks.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {error ? (
            <div>
              <p>{error}</p>
              <button 
                onClick={() => loadSymbolsAndPage(1, false)}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--link-color)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <p>No stocks available. Please check your connection and try again.</p>
          )}
        </div>
      )}

      {/* Pagination controls for screener table */}
      {!loading && totalStocks > itemsPerPage && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 8,
            padding: '0 16px 8px',
            gap: 12,
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
        >
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
              {Array.from({ length: totalPages }, (_, idx) => {
                const page = idx + 1;
                return (
                  <option key={page} value={page}>
                    {page}
                  </option>
                );
              })}
            </select>
            <span>of {totalPages}</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '2px 8px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Create Portfolio Modal */}
      {showPortfolioModal && (
        <div className="modal-overlay" onClick={() => setShowPortfolioModal(false)}>
          <div
            className="portfolio-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portfolio-modal-header">
              <h3>Create Portfolio</h3>
              <button
                className="portfolio-modal-close"
                onClick={() => setShowPortfolioModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="portfolio-modal-body">
              <div className="portfolio-name-row">
                <label htmlFor="portfolio-name">Name</label>
                <input
                  id="portfolio-name"
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder="My Portfolio"
                />
              </div>
              <div className="portfolio-summary-row">
                <span>
                  Selected {selectedTickers.length} of {stocks.length} companies
                </span>
                <div className="portfolio-summary-actions">
                  <button onClick={handleSelectAllTickers}>Select all</button>
                  <button onClick={handleClearAllTickers}>Clear</button>
                </div>
              </div>
              <div className="portfolio-list">
                {stocks.map((stock) => (
                  <label
                    key={stock.ticker}
                    className="portfolio-row"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTickers.includes(stock.ticker)}
                      onChange={() => handleToggleTicker(stock.ticker)}
                    />
                    <span className="portfolio-ticker">{stock.ticker}</span>
                    <span className="portfolio-company">{stock.company}</span>
                    <span className="portfolio-sector">{stock.sector}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="portfolio-modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowPortfolioModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSavePortfolio}
              >
                Save portfolio
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Footer */}
      <footer className="screener-footer">
        <div className="footer-content">
          <div className="footer-left">
            <p>&copy; {new Date().getFullYear()} LimeoXNG. All rights reserved.</p>
          </div>
          <div className="footer-right">
            <a href="#" className="footer-link">About</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">Contact</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">Privacy</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Screener;

