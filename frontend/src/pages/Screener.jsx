import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { mockStocks, filterOptions, signals, orderByOptions } from '../mockData';
import FilterPanel from '../components/FilterPanel';
import StockTable from '../components/StockTableEnhanced';
import { useTheme } from '../context/ThemeContext';
import '../styles/Screener.css';

const Screener = () => {
  const { isDark, toggleTheme } = useTheme();
  const [stocks, setStocks] = useState(mockStocks);
  const [filteredStocks, setFilteredStocks] = useState(mockStocks);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedView, setSelectedView] = useState('overview');
  const [orderBy, setOrderBy] = useState('Ticker');
  const [orderDirection, setOrderDirection] = useState('Asc');
  const [selectedSignal, setSelectedSignal] = useState('None (all stocks)');
  const [filters, setFilters] = useState({});
  const [activeFilterTab, setActiveFilterTab] = useState('descriptive');

  useEffect(() => {
    applyFilters();
  }, [filters, selectedSignal, orderBy, orderDirection]);

  const applyFilters = () => {
    let filtered = [...mockStocks];

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

  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStocks = filteredStocks.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="screener-container">
      {/* Header */}
      <div className="screener-header">
        <div className="header-content">
          <div className="logo">finviz.com</div>
          <div className="header-banner">
            <span className="elite-badge">Elite 50% OFF</span>
            <span>Act now – get top investing tools</span>
            <a href="#" className="register-link">Register Now!</a>
            <button onClick={toggleTheme} className="theme-toggle" title="Toggle theme">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </div>

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
          <button className="btn-filters">Filters</button>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel 
        filters={filters}
        setFilters={setFilters}
        filterOptions={filterOptions}
        activeTab={activeFilterTab}
        setActiveTab={setActiveFilterTab}
      />

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
          onClick={() => setSelectedView('valuation')}
        >
          Valuation
        </button>
        <button 
          className={selectedView === 'financial' ? 'tab-active' : ''}
          onClick={() => setSelectedView('financial')}
        >
          Financial
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
          className={selectedView === 'technical' ? 'tab-active' : ''}
          onClick={() => setSelectedView('technical')}
        >
          Technical
        </button>
        <button 
          className={selectedView === 'etf' ? 'tab-active' : ''}
          onClick={() => setSelectedView('etf')}
        >
          ETF
        </button>
        <button 
          className={selectedView === 'etfperf' ? 'tab-active' : ''}
          onClick={() => setSelectedView('etfperf')}
        >
          ETF Perf
        </button>
        <button 
          className={selectedView === 'custom' ? 'tab-active' : ''}
          onClick={() => setSelectedView('custom')}
        >
          Custom
        </button>
        <button 
          className={selectedView === 'charts' ? 'tab-active' : ''}
          onClick={() => setSelectedView('charts')}
        >
          Charts
        </button>
        <button 
          className={selectedView === 'tickers' ? 'tab-active' : ''}
          onClick={() => setSelectedView('tickers')}
        >
          Tickers
        </button>
        <button 
          className={selectedView === 'basic' ? 'tab-active' : ''}
          onClick={() => setSelectedView('basic')}
        >
          Basic
        </button>
        <button 
          className={selectedView === 'ta' ? 'tab-active' : ''}
          onClick={() => setSelectedView('ta')}
        >
          TA
        </button>
        <button 
          className={selectedView === 'news' ? 'tab-active' : ''}
          onClick={() => setSelectedView('news')}
        >
          News
        </button>
        <button 
          className={selectedView === 'snapshot' ? 'tab-active' : ''}
          onClick={() => setSelectedView('snapshot')}
        >
          Snapshot
        </button>
        <button 
          className={selectedView === 'maps' ? 'tab-active' : ''}
          onClick={() => setSelectedView('maps')}
        >
          Maps
        </button>
        <button 
          className={selectedView === 'stats' ? 'tab-active' : ''}
          onClick={() => setSelectedView('stats')}
        >
          Stats
        </button>
      </div>

      {/* Results Info */}
      <div className="results-info">
        <div className="results-text">
          #{indexOfFirstItem + 1} / {filteredStocks.length} Total
        </div>
        <div className="results-actions">
          <a href="#">save as portfolio</a> | 
          <a href="#"> create alert</a>
          <span className="separator">|</span>
          <span>Refresh: <a href="#">3min</a> | <a href="#">off</a></span>
        </div>
      </div>

      {/* Stock Table */}
      <StockTable 
        stocks={currentStocks}
        view={selectedView}
      />

      {/* Pagination */}
      <div className="pagination">
        {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i + 1).map(number => (
          <button
            key={number}
            className={currentPage === number ? 'page-active' : ''}
            onClick={() => handlePageChange(number)}
          >
            {number === 1 ? `1` : number}
          </button>
        ))}
        {totalPages > 20 && (
          <>
            <span>⋯</span>
            <button onClick={() => handlePageChange(totalPages)}>
              {totalPages}
            </button>
          </>
        )}
      </div>

      {/* Export Button */}
      <div className="export-section">
        <a href="#" className="export-link">export</a>
      </div>

      {/* Bottom Pagination */}
      <div className="bottom-pagination">
        {[1, 2, 3, 4, 5, 6].map(num => (
          <a 
            key={num} 
            href="#" 
            className={currentPage === num ? 'page-bold' : ''}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(num);
            }}
          >
            {num === 1 ? <strong>{num}</strong> : num}
          </a>
        ))}
        <span> ⋯ </span>
        <a href="#">100</a>
        <span> ⋯ </span>
        <a href="#">200</a>
        <span> ⋯ </span>
        <a href="#">{totalPages}</a>
      </div>

      {/* Elite Upgrade Section */}
      <div className="elite-upgrade">
        <h2>Upgrade your FINVIZ experience</h2>
        <p>Join thousands of traders who make more informed decisions with our premium features.</p>
        <p>Real-time quotes, advanced visualizations, backtesting, and much more.</p>
        <a href="#" className="learn-more-link">Learn more about FINVIZ*Elite</a>
      </div>
    </div>
  );
};

export default Screener;