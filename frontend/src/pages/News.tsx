import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { mockNews } from '../mockData';
import NewsFilterPanel from '../components/NewsFilterPanel';
import '../styles/Screener.css';
import '../styles/StockTable.css';

const News = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [filters, setFilters] = useState<any>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filteredNews, setFilteredNews] = useState(mockNews);

  // Filter news based on selected filters
  useEffect(() => {
    let filtered = [...mockNews];

    // Filter by date range
    if (filters.dateRange && filters.dateRange !== 'Any') {
      const today = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'Today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(news => {
            const newsDate = new Date(news.date);
            return newsDate >= filterDate;
          });
          break;
        case 'Last 7 Days':
          filterDate.setDate(filterDate.getDate() - 7);
          filtered = filtered.filter(news => {
            const newsDate = new Date(news.date);
            return newsDate >= filterDate;
          });
          break;
        case 'Last 30 Days':
          filterDate.setDate(filterDate.getDate() - 30);
          filtered = filtered.filter(news => {
            const newsDate = new Date(news.date);
            return newsDate >= filterDate;
          });
          break;
        case 'Last 90 Days':
          filterDate.setDate(filterDate.getDate() - 90);
          filtered = filtered.filter(news => {
            const newsDate = new Date(news.date);
            return newsDate >= filterDate;
          });
          break;
        case 'This Week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          weekStart.setHours(0, 0, 0, 0);
          filtered = filtered.filter(news => {
            const newsDate = new Date(news.date);
            return newsDate >= weekStart;
          });
          break;
        case 'This Month':
          filterDate.setDate(1);
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(news => {
            const newsDate = new Date(news.date);
            return newsDate >= filterDate;
          });
          break;
        case 'This Year':
          filterDate.setMonth(0, 1);
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(news => {
            const newsDate = new Date(news.date);
            return newsDate >= filterDate;
          });
          break;
      }
    }

    // Filter by source
    if (filters.source && filters.source !== 'Any') {
      filtered = filtered.filter(news => news.source === filters.source);
    }

    // Filter by sentiment
    if (filters.sentiment && filters.sentiment !== 'Any') {
      if (filters.sentiment === 'Very Positive') {
        // For now, treat as positive since we don't have very positive in mock data
        filtered = filtered.filter(news => news.sentiment === 'positive');
      } else if (filters.sentiment === 'Very Negative') {
        // For now, treat as negative since we don't have very negative in mock data
        filtered = filtered.filter(news => news.sentiment === 'negative');
      } else {
        filtered = filtered.filter(news => 
          news.sentiment.toLowerCase() === filters.sentiment.toLowerCase()
        );
      }
    }

    // Filter by ticker
    if (filters.ticker && filters.ticker.trim() !== '') {
      const tickerUpper = filters.ticker.trim().toUpperCase();
      filtered = filtered.filter(news => 
        news.tickers.some((t: string) => t.toUpperCase() === tickerUpper)
      );
    }

    setFilteredNews(filtered);
  }, [filters]);

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
            <select className="order-select">
              <option>Date/Time</option>
              <option>Source</option>
              <option>Sentiment</option>
              <option>Headline</option>
              <option>Ticker</option>
            </select>
            <select className="direction-select">
              <option>Desc</option>
              <option>Asc</option>
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
          <NewsFilterPanel 
            filters={filters}
            setFilters={setFilters}
          />
        )}

        {/* Results Info */}
        <div className="results-info">
          <div className="results-text">
            Showing {filteredNews.length} news article{filteredNews.length !== 1 ? 's' : ''}
          </div>
          <div className="results-actions">
            <a href="#">Refresh</a>
            <span className="separator">|</span>
            <a href="#">Export</a>
            <span className="separator">|</span>
            <a href="#" style={{ cursor: 'pointer' }}>Cache</a>
          </div>
        </div>
      </div>

      {/* News Table */}
      <div className="table-container scrollbar-custom">
        <table className="stock-table news-table">
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Source</th>
              <th>Sentiment</th>
              <th>Headline</th>
              <th>Ticker</th>
            </tr>
          </thead>
          <tbody>
            {filteredNews.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                  No news articles found matching the selected filters.
                </td>
              </tr>
            ) : (
              filteredNews.map((news) => (
              <tr key={news.id}>
                <td>
                  <div className="news-date-cell">
                    <span className="news-date">{news.date}</span>
                    <span className="news-time">{news.time}</span>
                  </div>
                </td>
                <td>
                  <a href="#" className="news-source-link">{news.source}</a>
                </td>
                <td>
                  <span className={`news-sentiment sentiment-${news.sentiment}`}>
                    {news.sentiment}
                  </span>
                </td>
                <td>
                  <a href="#" className="news-headline-link">{news.headline}</a>
                </td>
                <td>
                  {news.tickers.map((ticker, index) => (
                    <React.Fragment key={ticker}>
                      <a href="#" className="ticker-link">{ticker}</a>
                      {index < news.tickers.length - 1 && ', '}
                    </React.Fragment>
                  ))}
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <footer className="screener-footer">
        <div className="footer-content">
          <div className="footer-left">
            <p>&copy; {new Date().getFullYear()} LimeoXNG. All rights reserved.</p>
          </div>
          <div className="footer-right">
            <a href="#" className="footer-link">About</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">Terms</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">Privacy</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default News;

