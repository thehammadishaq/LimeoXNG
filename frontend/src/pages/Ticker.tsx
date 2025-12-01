import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  fetchSymbolsFromDb,
  refreshSymbolsCache,
  runProfileCron,
  resumeProfileCron,
  cancelProfileCron,
  fetchLatestProfileCronStatus,
  fetchProfileCronStatusById,
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(100);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [remainingCount, setRemainingCount] = useState<number>(0);
  const [totalCached, setTotalCached] = useState<number>(0);

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
        setCurrentPage(1);

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

          // Set counts from latest cron status
          // Count unique processed tickers from all cron runs (already aggregated by backend)
          const uniqueProcessedTickers = new Set<string>();
          if (cronStatus.tickers && Array.isArray(cronStatus.tickers)) {
            cronStatus.tickers.forEach((t) => {
              if (t.ticker) {
                uniqueProcessedTickers.add(t.ticker.toUpperCase());
              }
            });
          }
          const total = resp.symbols.length; // Total cached tickers
          const processed = uniqueProcessedTickers.size; // Unique processed tickers across all runs
          const remaining = Math.max(0, total - processed);
          
          setTotalCached(total);
          setProcessedCount(processed);
          setRemainingCount(remaining);
          console.log('📊 Initial counts from DB:', { total, processed, remaining, uniqueProcessed: uniqueProcessedTickers.size });
        } else {
          // If no cron status, set initial counts from symbols
          const total = resp.symbols.length;
          setTotalCached(total);
          setProcessedCount(0);
          setRemainingCount(total);
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
      setCurrentPage(1);
    } catch (e) {
      console.error('❌ Error refreshing symbols via Finnhub:', e);
      setError('Failed to update symbols from Finnhub.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to update rows from cron status
  const updateRowsFromCronStatus = (cronStatus: CronProfileStatusResponse) => {
    const statusMap = new Map<
      string,
      { status: 'Updated' | 'Failed'; lastUpdated: string | null }
    >();

    if (cronStatus.tickers && Array.isArray(cronStatus.tickers)) {
      cronStatus.tickers.forEach((t) => {
        const ticker = String(t.ticker || '').toUpperCase();
        if (!ticker) return;
        const ok = Boolean(t.ok);
        const processedAt = t.processed_at;

        const formatted =
          processedAt != null
            ? new Date(processedAt).toISOString().replace('T', ' ').substring(0, 16)
            : null;

        statusMap.set(ticker, {
          status: ok ? 'Updated' : 'Failed',
          lastUpdated: formatted,
        });
      });
    }

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
  };

  const handleRunCronJob = async () => {
    try {
      console.log('🔁 Manual cron job triggered from Ticker page with config:', {
        waitBetweenSec,
        waitMs: waitBetweenSec * 1000,
        tickerLimit,
      });
      
      // Stop any existing polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      // Don't set loading=true if rows already exist (we want to show rows during cron job)
      // Only set loading if this is the initial load
      if (rows.length === 0) {
        setLoading(true);
      }
      setError(null);
      const limitValue =
        typeof tickerLimit === 'number' && tickerLimit > 0 ? tickerLimit : undefined;
      
      // Start cron job (this returns immediately with job_id)
      const result = await runProfileCron(waitBetweenSec, limitValue);

      if (result && result.job_id) {
        const jobId = result.job_id;
        setCurrentJobId(jobId);
        console.log('📋 Cron job started with job_id:', jobId);

        // Update with initial result if available
        if (result.tickers && Array.isArray(result.tickers)) {
          const tempStatus: CronProfileStatusResponse = {
            id: jobId,
            started_at: result.started_at || new Date().toISOString(),
            finished_at: result.finished_at || new Date().toISOString(),
            wait_sec: result.wait_sec || waitBetweenSec,
            limit: result.limit || limitValue || null,
            total_cached: result.total_cached || 0,
            processed: result.processed || 0,
            success: result.success || 0,
            failed: result.failed || 0,
            tickers: result.tickers.map((t: any) => ({
              ticker: t.ticker,
              ok: t.ok,
              errors: t.errors || [],
              processed_at: t.processed_at || new Date().toISOString(),
            })),
          };
          updateRowsFromCronStatus(tempStatus);
        }
        
        // Update counts - fetch latest aggregated status to get total unique processed from all runs
        const latestStatus = await fetchLatestProfileCronStatus();
        if (latestStatus && latestStatus.tickers) {
          const uniqueProcessedTickers = new Set<string>();
          latestStatus.tickers.forEach((t) => {
            if (t.ticker) {
              uniqueProcessedTickers.add(t.ticker.toUpperCase());
            }
          });
          const total = result.total_cached || latestStatus.total_cached || totalCached || 0;
          const processed = uniqueProcessedTickers.size;
          const remaining = Math.max(0, total - processed);
          
          setTotalCached(total);
          setProcessedCount(processed);
          setRemainingCount(remaining);
          console.log('📊 Initial counts set (from all runs):', { total, processed, remaining });
        } else {
          // Fallback: use current job result
          const total = result.total_cached || 0;
          const processed = result.processed || 0;
          const limit = result.limit || limitValue;
          const expectedTotal = limit ? Math.min(limit, total) : total;
          setTotalCached(total);
          setProcessedCount(processed);
          setRemainingCount(Math.max(0, expectedTotal - processed));
        }
        
        // Set loading to false after starting job (rows will update in real-time via polling)
        setLoading(false);

        // Start polling for real-time updates
        const interval = setInterval(async () => {
          const status = await fetchProfileCronStatusById(jobId);
          if (status) {
            updateRowsFromCronStatus(status);
            
            // Fetch latest aggregated status to get total unique processed tickers from all runs
            const latestStatus = await fetchLatestProfileCronStatus();
            if (latestStatus && latestStatus.tickers) {
              // Count unique processed tickers from all cron runs
              const uniqueProcessedTickers = new Set<string>();
              latestStatus.tickers.forEach((t) => {
                if (t.ticker) {
                  uniqueProcessedTickers.add(t.ticker.toUpperCase());
                }
              });
              
              const total = totalCached || latestStatus.total_cached || 0;
              const processed = uniqueProcessedTickers.size;
              const remaining = Math.max(0, total - processed);
              
              setProcessedCount(processed);
              setRemainingCount(remaining);
              console.log('📊 Polling counts update (from all runs):', { processed, remaining, total });
            } else {
              // Fallback: use current job status
              const limit = status.limit;
              const total = status.total_cached || 0;
              const processed = status.processed || 0;
              const expectedTotal = limit ? Math.min(limit, total) : total;
              const remaining = Math.max(0, expectedTotal - processed);
              setProcessedCount(processed);
              setRemainingCount(remaining);
            }
            
            // Check if job is finished:
            // finished_at should be different from started_at (we initialize it to started_at, then update when done)
            const startedTime = new Date(status.started_at).getTime();
            const finishedTime = new Date(status.finished_at).getTime();
            const isFinished = finishedTime > startedTime + 500; // At least 500ms difference (job has actually finished)
            
            if (isFinished) {
              console.log('✅ Cron job finished');
              clearInterval(interval);
              setPollingInterval(null);
              setCurrentJobId(null);
              setLoading(false);
            }
          }
        }, 1000); // Poll every 1 second

        setPollingInterval(interval);
      } else {
        // Fallback: if no job_id, use old behavior
        if (result && Array.isArray(result.tickers)) {
          const tempStatus: CronProfileStatusResponse = {
            id: null,
            started_at: result.started_at || new Date().toISOString(),
            finished_at: result.finished_at || new Date().toISOString(),
            wait_sec: result.wait_sec || waitBetweenSec,
            limit: result.limit || limitValue || null,
            total_cached: result.total_cached || 0,
            processed: result.processed || 0,
            success: result.success || 0,
            failed: result.failed || 0,
            tickers: result.tickers.map((t: any) => ({
              ticker: t.ticker,
              ok: t.ok,
              errors: t.errors || [],
              processed_at: t.processed_at || new Date().toISOString(),
            })),
          };
          updateRowsFromCronStatus(tempStatus);
        }
        setLoading(false);
      }
    } catch (e) {
      console.error('❌ Error running profile cron job:', e);
      setError('Failed to run cron job.');
      setLoading(false);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setCurrentJobId(null);
    }
  };

  const handleResumeCronJob = async () => {
    try {
      console.log('🔁 Resume cron job triggered from Ticker page with config:', {
        waitBetweenSec,
        waitMs: waitBetweenSec * 1000,
        tickerLimit,
      });
      
      // Stop any existing polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      // Don't set loading=true if rows already exist (we want to show rows during cron job)
      // Only set loading if this is the initial load
      if (rows.length === 0) {
        setLoading(true);
      }
      setError(null);
      const limitValue =
        typeof tickerLimit === 'number' && tickerLimit > 0 ? tickerLimit : undefined;
      
      // Start resume cron job (this returns immediately with job_id)
      const result = await resumeProfileCron(waitBetweenSec, limitValue, true);

      if (result && result.job_id) {
        const jobId = result.job_id;
        setCurrentJobId(jobId);
        console.log('📋 Resume cron job started with job_id:', jobId);
        if (result.message) {
          console.log('📝 Resume message:', result.message);
        }

        // Update with initial result if available
        if (result.tickers && Array.isArray(result.tickers)) {
          const tempStatus: CronProfileStatusResponse = {
            id: jobId,
            started_at: result.started_at || new Date().toISOString(),
            finished_at: result.finished_at || new Date().toISOString(),
            wait_sec: result.wait_sec || waitBetweenSec,
            limit: result.limit || limitValue || null,
            total_cached: result.total_cached || 0,
            processed: result.processed || 0,
            success: result.success || 0,
            failed: result.failed || 0,
            tickers: result.tickers.map((t: any) => ({
              ticker: t.ticker,
              ok: t.ok,
              errors: t.errors || [],
              processed_at: t.processed_at || new Date().toISOString(),
            })),
          };
          updateRowsFromCronStatus(tempStatus);
        }
        
        // Update counts for resume job - fetch latest aggregated status to get total unique processed
        const latestStatus = await fetchLatestProfileCronStatus();
        if (latestStatus && latestStatus.tickers) {
          const uniqueProcessedTickers = new Set<string>();
          latestStatus.tickers.forEach((t) => {
            if (t.ticker) {
              uniqueProcessedTickers.add(t.ticker.toUpperCase());
            }
          });
          const total = result.total_cached || latestStatus.total_cached || totalCached || 0;
          const processed = uniqueProcessedTickers.size;
          const remaining = Math.max(0, total - processed);
          
          setTotalCached(total);
          setProcessedCount(processed);
          setRemainingCount(remaining);
          console.log('📊 Resume counts set (from all runs):', { total, processed, remaining });
        } else {
          // Fallback: use resume result
          const total = result.total_cached || 0;
          const remaining = result.remaining || 0;
          setTotalCached(total);
          setProcessedCount(0);
          setRemainingCount(remaining);
        }
        
        // Set loading to false after starting job (rows will update in real-time via polling)
        setLoading(false);

        // Start polling for real-time updates
        const interval = setInterval(async () => {
          const status = await fetchProfileCronStatusById(jobId);
          if (status) {
            updateRowsFromCronStatus(status);
            
            // Fetch latest aggregated status to get total unique processed tickers from all runs
            const latestStatus = await fetchLatestProfileCronStatus();
            if (latestStatus && latestStatus.tickers) {
              // Count unique processed tickers from all cron runs
              const uniqueProcessedTickers = new Set<string>();
              latestStatus.tickers.forEach((t) => {
                if (t.ticker) {
                  uniqueProcessedTickers.add(t.ticker.toUpperCase());
                }
              });
              
              const total = totalCached || latestStatus.total_cached || 0;
              const processed = uniqueProcessedTickers.size;
              const remaining = Math.max(0, total - processed);
              
              setProcessedCount(processed);
              setRemainingCount(remaining);
              console.log('📊 Polling counts update (from all runs):', { processed, remaining, total });
            } else {
              // Fallback: use current job status
              const limit = status.limit;
              const total = status.total_cached || 0;
              const processed = status.processed || 0;
              const expectedTotal = limit ? Math.min(limit, total) : total;
              const remaining = Math.max(0, expectedTotal - processed);
              setProcessedCount(processed);
              setRemainingCount(remaining);
            }
            
            // Check if job is finished:
            // finished_at should be different from started_at (we initialize it to started_at, then update when done)
            const startedTime = new Date(status.started_at).getTime();
            const finishedTime = new Date(status.finished_at).getTime();
            const isFinished = finishedTime > startedTime + 500; // At least 500ms difference (job has actually finished)
            
            if (isFinished) {
              console.log('✅ Resume cron job finished');
              clearInterval(interval);
              setPollingInterval(null);
              setCurrentJobId(null);
              setLoading(false);
            }
          }
        }, 1000); // Poll every 1 second

        setPollingInterval(interval);
      } else {
        // Handle case where all tickers are already processed
        if (result && result.message) {
          console.log('ℹ️ Resume result:', result.message);
          setError(result.message);
        }
        // Fallback: if no job_id, use old behavior
        if (result && Array.isArray(result.tickers) && result.tickers.length > 0) {
          const tempStatus: CronProfileStatusResponse = {
            id: null,
            started_at: result.started_at || new Date().toISOString(),
            finished_at: result.finished_at || new Date().toISOString(),
            wait_sec: result.wait_sec || waitBetweenSec,
            limit: result.limit || limitValue || null,
            total_cached: result.total_cached || 0,
            processed: result.processed || 0,
            success: result.success || 0,
            failed: result.failed || 0,
            tickers: result.tickers.map((t: any) => ({
              ticker: t.ticker,
              ok: t.ok,
              errors: t.errors || [],
              processed_at: t.processed_at || new Date().toISOString(),
            })),
          };
          updateRowsFromCronStatus(tempStatus);
        }
        setLoading(false);
      }
    } catch (e) {
      console.error('❌ Error resuming profile cron job:', e);
      setError('Failed to resume cron job.');
      setLoading(false);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setCurrentJobId(null);
    }
  };

  const handleStopCronJob = async () => {
    if (!currentJobId) {
      console.warn('⚠️ No active job to stop');
      setError('No active job to stop.');
      return;
    }

    try {
      console.log('🛑 Stopping cron job:', currentJobId);
      const result = await cancelProfileCron(currentJobId);

      if (result && result.cancelled) {
        console.log('✅ Cancellation requested:', result.message);
        setError(result.message || 'Job cancellation requested.');

        // Save job_id before clearing it
        const jobIdToCheck = currentJobId;

        // Stop polling immediately
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setCurrentJobId(null);
        setLoading(false);

        // Optionally, do one final status check to get final state
        if (jobIdToCheck) {
          const finalStatus = await fetchProfileCronStatusById(jobIdToCheck);
          if (finalStatus) {
            updateRowsFromCronStatus(finalStatus);
            // Update final counts
            const limit = finalStatus.limit;
            const total = finalStatus.total_cached || 0;
            const processed = finalStatus.processed || 0;
            const expectedTotal = limit ? Math.min(limit, total) : total;
            setProcessedCount(processed);
            setRemainingCount(Math.max(0, expectedTotal - processed));
          }
        }
      } else if (result && result.message) {
        setError(result.message);
      }
    } catch (e) {
      console.error('❌ Error stopping cron job:', e);
      setError('Failed to stop cron job.');
    }
  };

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const paginatedRows = rows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
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
                className="btn-secondary"
                style={{ marginLeft: 8 }}
                onClick={handleResumeCronJob}
                disabled={loading}
              >
                Resume
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ 
                  marginLeft: 8,
                  backgroundColor: currentJobId ? 'var(--negative)' : undefined,
                  color: currentJobId ? 'white' : undefined,
                }}
                onClick={handleStopCronJob}
                disabled={!currentJobId || loading}
              >
                Stop
              </button>
            </div>
            <div className="controls-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleUpdateTickers}
                disabled={loading}
              >
                Update tickers
              </button>
              {lastUpdated && (
                <span
                  className="results-text"
                  style={{
                    fontSize: 9,
                    color: 'var(--text-secondary)',
                    fontWeight: 'normal',
                  }}
                >
                  Last updated: {lastUpdated}
                </span>
              )}
            </div>
          </div>

          {/* Results info */}
          <div className="results-info">
            <div className="results-text">
              {loading && rows.length === 0
                ? 'Loading symbols from database...'
                : error
                ? error
                : (
                    <>
                      {`Showing ${rows.length} symbol${rows.length !== 1 ? 's' : ''} from DB cache`}
                      <span style={{ marginLeft: 12, color: 'var(--link-color)' }}>
                        | Processed: <strong>{processedCount}</strong> | Remaining: <strong>{remainingCount}</strong>
                      </span>
                    </>
                  )}
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
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: 20 }}>
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
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
                  paginatedRows.map((item) => (
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

          {/* Pagination controls */}
          {rows.length > itemsPerPage && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginRight: 4, padding: '2px 8px', fontSize: 11 }}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TickerPage;


