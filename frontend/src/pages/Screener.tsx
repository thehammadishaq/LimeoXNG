import React, { useState, useEffect } from 'react';
import { Moon, Sun, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { filterOptions, signals, orderByOptions } from '../mockData';
import FilterPanel from '../components/FilterPanel';
import StockTable from '../components/StockTableEnhanced';
import { useTheme } from '../context/ThemeContext';
import { fetchScreenerData, transformStockData } from '../services/api';
import '../styles/Screener.css';

// Default stock symbols to fetch (only 5)
const DEFAULT_STOCK_SYMBOLS = [
  'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN'
];

const Screener = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [stocks, setStocks] = useState<any[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedView, setSelectedView] = useState('overview');
  const [orderBy, setOrderBy] = useState('Ticker');
  const [orderDirection, setOrderDirection] = useState('Asc');
  const [selectedSignal, setSelectedSignal] = useState('None (all stocks)');
  const [filters, setFilters] = useState<any>({});
  const [activeFilterTab, setActiveFilterTab] = useState('descriptive');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true); // Start with true to show skeleton initially
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [financialsLoaded, setFinancialsLoaded] = useState(false);

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
      // Use provided symbols or default symbols
      const symbolsToFetch = symbols || DEFAULT_STOCK_SYMBOLS;
      console.log('🔄 Fetching data for symbols:', symbolsToFetch);
      
      const response = await fetchScreenerData(pageNum, itemsPerPage, forceRefresh, symbolsToFetch, includeFinancials);
      
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
        setFilteredStocks([]);
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
        setFilteredStocks([]);
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
      setFilteredStocks(numberedStocks);
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
      setFilteredStocks([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load - fetch default symbols (profiles only, no financials)
  useEffect(() => {
    // Fetch both profile and financials data on page load
    console.log('🔄 Initial page load - fetching profile and financials data...');
    fetchData(false, 1, DEFAULT_STOCK_SYMBOLS, true);
    setFinancialsLoaded(true); // Mark as loaded since we're fetching it initially
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, selectedSignal, orderBy, orderDirection, stocks]);

  const applyFilters = () => {
    // Only apply filters if we have stocks from API
    if (stocks.length === 0) {
      setFilteredStocks([]);
      return;
    }
    
    let filtered = [...stocks];

    // Apply sector filter
    if (filters.sector && filters.sector !== 'Any') {
      filtered = filtered.filter(stock => stock.sector === filters.sector);
    }

    // Apply industry filter
    if (filters.industry && filters.industry !== 'Any') {
      filtered = filtered.filter(stock => stock.industry === filters.industry);
    }

    // Apply market cap filter
    if (filters.marketCap && filters.marketCap !== 'Any') {
      // Simple implementation - you can make this more sophisticated
      filtered = filtered.filter(stock => {
        const capValue = parseFloat(stock.marketCap.replace('B', ''));
        if (filters.marketCap === 'Mega ($200bln and more)') return capValue >= 200;
        if (filters.marketCap === 'Large ($10bln to $200bln)') return capValue >= 10 && capValue < 200;
        if (filters.marketCap === 'Mid ($2bln to $10bln)') return capValue >= 2 && capValue < 10;
        return true;
      });
    }

    // Apply signal filter
    if (selectedSignal !== 'None (all stocks)') {
      if (selectedSignal === 'Top Gainers') {
        filtered.sort((a, b) => parseFloat(b.change) - parseFloat(a.change));
        filtered = filtered.slice(0, 20);
      } else if (selectedSignal === 'Top Losers') {
        filtered.sort((a, b) => parseFloat(a.change) - parseFloat(b.change));
        filtered = filtered.slice(0, 20);
      } else if (selectedSignal === 'Most Active') {
        filtered.sort((a, b) => b.volume - a.volume);
      } else if (selectedSignal === 'Overbought') {
        filtered = filtered.filter(stock => stock.rsi > 70);
      } else if (selectedSignal === 'Oversold') {
        filtered = filtered.filter(stock => stock.rsi < 30);
      }
    }

    // Apply sorting
    if (orderBy !== 'Ticker') {
      filtered.sort((a, b) => {
        let aVal, bVal;
        switch (orderBy) {
          case 'Company':
            aVal = a.company;
            bVal = b.company;
            break;
          case 'Sector':
            aVal = a.sector;
            bVal = b.sector;
            break;
          case 'Market Cap.':
            aVal = parseFloat(a.marketCap.replace('B', ''));
            bVal = parseFloat(b.marketCap.replace('B', ''));
            break;
          case 'P/E':
            aVal = a.pe;
            bVal = b.pe;
            break;
          case 'Price':
            aVal = a.price;
            bVal = b.price;
            break;
          case 'Change':
            aVal = parseFloat(a.change);
            bVal = parseFloat(b.change);
            break;
          case 'Volume':
            aVal = a.volume;
            bVal = b.volume;
            break;
          default:
            aVal = a.ticker;
            bVal = b.ticker;
        }

        if (orderDirection === 'Asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    setFilteredStocks(filtered);
    setCurrentPage(1);
  };

  
  // Use stocks directly (already paginated from API)
  const currentStocks = stocks;
  
  // Calculate index for display
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // If financials were already loaded once, keep including them for new pages
    fetchData(false, pageNumber, DEFAULT_STOCK_SYMBOLS, financialsLoaded);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      {/* Filter Section with Border */}
      <div className="filter-section-wrapper">
        {/* Top Controls */}
        <div className="top-controls">
          <div className="controls-left">
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
          {filteredStocks.length > 0 ? `Showing ${filteredStocks.length} stocks` : 'No stocks to display'}
          {loading && <span style={{ marginLeft: '10px', color: 'var(--link-color)' }}>Loading...</span>}
          {error && <span style={{ marginLeft: '10px', color: 'var(--negative)' }}>{error}</span>}
          {lastRefresh && !loading && (
            <span style={{ marginLeft: '10px', fontSize: '10px', color: 'var(--text-secondary)' }}>
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="results-actions">
          <a href="#">save as portfolio</a> | 
          <a href="#"> create alert</a>
          <span className="separator">|</span>
          <span>
            Refresh: 
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                // Respect whether financials were loaded before
                fetchData(true, currentPage, DEFAULT_STOCK_SYMBOLS, financialsLoaded);
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
                // Respect whether financials were loaded before
                fetchData(false, currentPage, DEFAULT_STOCK_SYMBOLS, financialsLoaded);
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
      />
      {!loading && currentStocks.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {error ? (
            <div>
              <p>{error}</p>
              <button 
                onClick={() => fetchData(false, 1, DEFAULT_STOCK_SYMBOLS)}
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

