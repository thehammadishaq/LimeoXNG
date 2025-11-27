import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  fetchSymbolsFromDb,
  refreshSymbolsCache,
  runProfileCron,
  fetchLatestProfileCronStatus,
  CronProfileStatusResponse,
} from '../services/api';

interface TickerRow {
  ticker: string;
  lastUpdated: string | null;
  status: 'Updated' | 'Failed' | 'Not attempted';
}

const TickerPage: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [rows, setRows] = useState<TickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [waitBetweenSec, setWaitBetweenSec] = useState<number>(1);
  const [tickerLimit, setTickerLimit] = useState<number | ''>(50);

  useEffect(() => {
    const loadSymbols = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await fetchSymbolsFromDb();
        if (!resp || !resp.symbols || resp.symbols.length === 0) {
          setRows([]);
          setError('No symbols available in database cache.');
          return;
        }
        const rawUpdatedAt = resp.updated_at || new Date().toISOString();
        setLastUpdated(rawUpdatedAt);
        const mapped: TickerRow[] = resp.symbols.map((sym) => ({
          ticker: sym,
          lastUpdated: null, // per-ticker last updated comes from cron status
          status: 'Not attempted',
        }));
        setRows(mapped);

        // After loading symbols, try to hydrate status/lastUpdated from latest cron run in DB
        const cronStatus: CronProfileStatusResponse | null =
          await fetchLatestProfileCronStatus();
        if (cronStatus && Array.isArray(cronStatus.tickers)) {
          const statusMap = new Map<
            string,
            { status: 'Updated' | 'Failed'; lastUpdated: string | null }
          >();

          cronStatus.tickers.forEach((t) => {
            const ticker = String(t.ticker || '').toUpperCase();
            if (!ticker) return;
            const ok = Boolean(t.ok);
            const processedAt = t.processed_at;

            const formatted = processedAt
              ? new Date(processedAt).toISOString().replace('T', ' ').substring(0, 16)
              : null;

            statusMap.set(ticker, {
              status: ok ? 'Updated' : 'Failed',
              lastUpdated: formatted,
            });
          });

          setRows((prev) =>
            prev.map((row) => {
              const key = row.ticker.toUpperCase();
              const match = statusMap.get(key);
              if (!match) {
                return {
                  ...row,
                  status: 'Not attempted',
                };
              }
              return {
                ...row,
                status: match.status,
                lastUpdated: match.lastUpdated,
              };
            })
          );
        }
      } catch (e) {
        console.error('❌ Error fetching symbols from DB:', e);
        setError('Failed to load symbols from database.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadSymbols();
  }, []);

  const handleUpdateTickers = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await refreshSymbolsCache();
      if (!resp || !resp.symbols || resp.symbols.length === 0) {
        setRows([]);
        setError('No symbols returned from Finnhub refresh.');
        return;
      }
      const rawUpdatedAt = resp.updated_at || new Date().toISOString();
      setLastUpdated(rawUpdatedAt);
      const mapped: TickerRow[] = resp.symbols.map((sym) => ({
        ticker: sym,
        lastUpdated: null, // will be filled by cron runs
        status: 'Not attempted',
      }));
      setRows(mapped);
    } catch (e) {
      console.error('❌ Error refreshing symbols via Finnhub:', e);
      setError('Failed to update symbols from Finnhub.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCronJob = async () => {
    try {
      console.log('🔁 Manual cron job triggered from Ticker page with config:', {
        waitBetweenSec,
        waitMs: waitBetweenSec * 1000,
        tickerLimit,
      });
      setLoading(true);
      setError(null);
      const limitValue =
        typeof tickerLimit === 'number' && tickerLimit > 0 ? tickerLimit : undefined;
      const result = await runProfileCron(waitBetweenSec, limitValue);

      if (result && Array.isArray(result.tickers)) {
        const statusMap = new Map<
          string,
          { status: 'Updated' | 'Failed'; lastUpdated: string | null }
        >();

        result.tickers.forEach((t: any) => {
          const ticker = String(t.ticker || '').toUpperCase();
          if (!ticker) return;
          const ok = Boolean(t.ok);
          const processedAt: string | null =
            t.processed_at ||
            result.finished_at ||
            new Date().toISOString();

          const formatted =
            processedAt != null
              ? new Date(processedAt).toISOString().replace('T', ' ').substring(0, 16)
              : null;

          statusMap.set(ticker, {
            status: ok ? 'Updated' : 'Failed',
            lastUpdated: formatted,
          });
        });

        setRows((prev) =>
          prev.map((row) => {
            const key = row.ticker.toUpperCase();
            const match = statusMap.get(key);
            if (!match) {
              return {
                ...row,
                status: 'Not attempted',
              };
            }
            return {
              ...row,
              status: match.status,
              lastUpdated: match.lastUpdated,
            };
          })
        );
      }
    } catch (e) {
      console.error('❌ Error running profile cron job:', e);
      setError('Failed to run cron job.');
    } finally {
      setLoading(false);
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

      <div className="container">
        {/* Filter section for ticker watchlist */}
        <div className="statements-panel">
          <h3 className="section-heading">Ticker Watchlist</h3>

          {/* Top Controls (simplified) */}
          <div className="top-controls" style={{ marginBottom: 12 }}>
            <div className="controls-left">
              <span style={{ marginRight: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                Wait (sec) between API calls:
              </span>
              <input
                type="number"
                min={0}
                value={waitBetweenSec}
                onChange={(e) => setWaitBetweenSec(Number(e.target.value) || 0)}
                style={{
                  width: 70,
                  fontSize: 11,
                  padding: '2px 4px',
                  borderRadius: 3,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
              <span
                style={{
                  marginLeft: 8,
                  marginRight: 4,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}
              >
                Tickers to process (from top):
              </span>
              <input
                type="number"
                min={1}
                value={tickerLimit}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : Number(e.target.value);
                  setTickerLimit(v);
                }}
                style={{
                  width: 70,
                  fontSize: 11,
                  padding: '2px 4px',
                  borderRadius: 3,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div className="controls-right">
              {lastUpdated && (
                <span
                  className="results-text"
                  style={{
                    marginRight: 8,
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    fontWeight: 'normal',
                  }}
                >
                  Last updated: {lastUpdated}
                </span>
              )}
              <button
                type="button"
                className="btn-secondary"
                style={{ marginLeft: 8 }}
                onClick={handleRunCronJob}
                disabled={loading}
              >
                Run cron job
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ marginLeft: 8 }}
                onClick={handleUpdateTickers}
                disabled={loading}
              >
                Update tickers
              </button>
            </div>
          </div>

          {/* Results info */}
          <div className="results-info">
            <div className="results-text">
              {loading
                ? 'Loading symbols from database...'
                : error
                ? error
                : `Showing ${rows.length} symbol${rows.length !== 1 ? 's' : ''} from DB cache`}
            </div>
          </div>
        </div>

        {/* Table section (separate card) */}
        <div className="statements-panel" style={{ marginTop: 16 }}>
          <div className="table-container scrollbar-custom">
            <table className="stock-table news-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: 20 }}>
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        textAlign: 'center',
                        padding: '20px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      No symbols available.
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => (
                    <tr key={item.ticker}>
                      <td>
                        <Link
                          to={`/stock/${item.ticker}`}
                          className="ticker-link"
                        >
                          {item.ticker}
                        </Link>
                      </td>
                      <td>
                        <span className="news-date">
                          {item.lastUpdated || '—'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            color:
                              item.status === 'Updated'
                                ? 'var(--positive)'
                                : item.status === 'Failed'
                                ? 'var(--negative)'
                                : 'var(--text-secondary)',
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TickerPage;


