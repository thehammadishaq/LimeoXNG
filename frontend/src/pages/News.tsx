import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { fetchMarketNews, NewsArticle } from '../services/api';
import NewsFilterPanel from '../components/NewsFilterPanel';
import '../styles/Screener.css';
import '../styles/StockTable.css';

const News = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [filters, setFilters] = useState<any>({});
  const [showFilters, setShowFilters] = useState(false);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('general');

  // Fetch news when component mounts or category changes
  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`📰 Loading news for category: ${selectedCategory}`);
        const newsData = await fetchMarketNews(selectedCategory, 0, true);
        if (newsData.length === 0) {
          setError('No news articles found. Please try a different category.');
          setNews([]);
        } else {
          setNews(newsData);
          setError(null);
        }
      } catch (err) {
        console.error('Error loading news:', err);
        setError('Failed to load news. Please try again later.');
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, [selectedCategory]);

  // Filter news based on selected filters
  useEffect(() => {
    let filtered = [...news];

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

    // Filter by ticker
    if (filters.ticker && filters.ticker.trim() !== '') {
      const tickerUpper = filters.ticker.trim().toUpperCase();
      filtered = filtered.filter(news => 
        news.tickers.some((t: string) => t.toUpperCase() === tickerUpper)
      );
    }

    setFilteredNews(filtered);
  }, [filters, news]);

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
            <select 
              className="preset-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="general">General News</option>
              <option value="forex">Forex News</option>
              <option value="crypto">Crypto News</option>
              <option value="merger">Merger News</option>
            </select>
            <span className="separator">|</span>
            <span>Order by</span>
            <select className="order-select">
              <option>Date/Time</option>
              <option>Source</option>
              <option>Category</option>
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
            {loading ? (
              'Loading news...'
            ) : error ? (
              <span style={{ color: 'var(--error-color, #ef4444)' }}>{error}</span>
            ) : (
              `Showing ${filteredNews.length} news article${filteredNews.length !== 1 ? 's' : ''} (${selectedCategory})`
            )}
          </div>
          <div className="results-actions">
            <a 
              href="#" 
              onClick={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError(null);
                try {
                  const newsData = await fetchMarketNews(selectedCategory, 0, true);
                  if (newsData.length === 0) {
                    setError('No news articles found. Please try a different category.');
                    setNews([]);
                  } else {
                    setNews(newsData);
                    setError(null);
                  }
                } catch (err) {
                  console.error('Error refreshing news:', err);
                  setError('Failed to refresh news. Please try again later.');
                } finally {
                  setLoading(false);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              Refresh
            </a>
            <span className="separator">|</span>
            <a href="#">Export</a>
            <span className="separator">|</span>
            <a href="#" style={{ cursor: 'pointer' }}>Cache</a>
          </div>
        </div>
      </div>

      {/* News Table */}
      <div className="table-container scrollbar-custom">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <div>Loading market news...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--error-color, #ef4444)' }}>
            <div>{error}</div>
            <button 
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const newsData = await fetchMarketNews(selectedCategory, 0, true);
                  if (newsData.length === 0) {
                    setError('No news articles found. Please try a different category.');
                    setNews([]);
                  } else {
                    setNews(newsData);
                    setError(null);
                  }
                } catch (err) {
                  console.error('Error retrying news:', err);
                  setError('Failed to load news. Please try again later.');
                } finally {
                  setLoading(false);
                }
              }}
              style={{ 
                marginTop: '10px', 
                padding: '8px 16px', 
                cursor: 'pointer',
                backgroundColor: 'var(--primary-color, #3b82f6)',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <table className="stock-table news-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Headline</th>
                <th>Category</th>
                <th>Source</th>
                <th>Summary</th>
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
                filteredNews.map((newsItem) => (
                <tr key={newsItem.id}>
                  <td>
                    <div className="news-date-cell">
                      <span className="news-date">{newsItem.date}</span>
                      <span className="news-time">{newsItem.time}</span>
                    </div>
                  </td>
                  <td>
                    <a 
                      href={newsItem.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="news-headline-link"
                      title={newsItem.summary || newsItem.headline}
                    >
                      {newsItem.headline}
                    </a>
                  </td>
                  <td>
                    <span style={{ 
                      textTransform: 'capitalize',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-secondary, #f3f4f6)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {newsItem.category || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <a 
                      href={newsItem.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="news-source-link"
                    >
                      {newsItem.source}
                    </a>
                  </td>
                  <td>
                    {newsItem.summary ? (
                      <span style={{ 
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        display: 'block',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={newsItem.summary}>
                        {newsItem.summary}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        )}
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

