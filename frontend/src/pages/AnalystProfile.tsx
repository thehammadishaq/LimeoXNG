import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Moon, Sun, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ExpertStock {
  name: string;
  ticker: string;
  isTraded: boolean | null;
  ratingsCount: number | null;
  totalRatingsCount: number | null;
  goodRatingsCount: number | null;
  averageReturn: number | null;
  stockTypeId: number | null;
  priceTarget: number | null;
  latestRating: {
    rating: string;
    ratingId: number;
    ratingDate: string;
    link: string;
    actionId: number;
    priceTarget: number | null;
    stockName: string;
    priceTargetCurrencyCode: string | null;
    action: string;
    quoteTitle: string | null;
    siteName: string;
    convertedPriceTarget: number | null;
    convertedPriceTargetCurrencyCode: string | null;
  } | null;
  firstRating: {
    rating: string;
    ratingId: number;
    ratingDate: string;
    link: string;
    actionId: number;
    priceTarget: number | null;
    stockName: string;
    priceTargetCurrencyCode: string | null;
    action: string;
    quoteTitle: string | null;
    siteName: string;
    convertedPriceTarget: number | null;
    convertedPriceTargetCurrencyCode: string | null;
  } | null;
  priceTargetCurrencyCode: string | null;
  convertedPriceTarget: number | null;
  convertedPriceTargetCurrencyCode: string | null;
  priceTargetCurrencyId: number | null;
  marketCountryId: number | null;
  stockCurrencyTypeID: number | null;
}

const AnalystProfile: React.FC = () => {
  const { expertId } = useParams<{ expertId: string }>();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expertStocks, setExpertStocks] = useState<ExpertStock[]>([]);
  const [stocksLoading, setStocksLoading] = useState<boolean>(false);
  const [stocksError, setStocksError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('year');
  const [benchmark, setBenchmark] = useState<string>('none');

  const apiBase =
    (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '') || '';

  // Convert name to URL slug format (e.g., "Heiko Ihle" -> "Heiko-Ihle")
  const nameToSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  useEffect(() => {
    if (!expertId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${apiBase}/api/v1/scraper/tipranks/expert-profile/${expertId}`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setProfile(data);
      } catch (e: any) {
        console.error('Failed to fetch analyst profile:', e);
        setError('Failed to load analyst profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [expertId, apiBase]);

  // Fetch expert stocks when profile is loaded
  useEffect(() => {
    if (!profile || !profile.name) return;

    const fetchExpertStocks = async () => {
      try {
        setStocksLoading(true);
        setStocksError(null);
        
        // Convert expert name to URL slug format
        const expertNameSlug = nameToSlug(profile.name);
        
        const res = await fetch(
          `${apiBase}/api/v1/scraper/tipranks/expert-stocks?name=${encodeURIComponent(expertNameSlug)}&period=${period}&benchmark=${benchmark}&save_to_db=true`,
        );
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.stocks && Array.isArray(data.stocks)) {
          setExpertStocks(data.stocks);
        } else {
          setExpertStocks([]);
        }
      } catch (e: any) {
        console.error('Failed to fetch expert stocks:', e);
        setStocksError('Failed to load expert stocks.');
        setExpertStocks([]);
      } finally {
        setStocksLoading(false);
      }
    };

    fetchExpertStocks();
  }, [profile, period, benchmark, apiBase]);

  const toggleRow = (idx: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="screener-container">
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="screener-container">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {error || 'Analyst profile not found'}
        </div>
      </div>
    );
  }

  const {
    name,
    firm,
    pictureUrl,
    rank: rankObj,
    ranked,
    outOf,
    starRating,
    distribution,
    recommendations,
    averageReturn,
    sectorId,
    geoCoverage,
    ratings = [],
    expertType,
  } = profile;
  
  // Check if this is a blogger profile
  const isBlogger = expertType === 'blogger';

  // Handle rank - it might be an object with {ranked, outOf, sectorRank, starRating} or a number
  const rankValue =
    typeof rankObj === 'object' && rankObj !== null
      ? rankObj.ranked || rankObj.rank || null
      : rankObj || ranked || null;
  const outOfValue =
    typeof rankObj === 'object' && rankObj !== null
      ? rankObj.outOf || outOf
      : outOf;

  const successRate =
    recommendations?.ratio && recommendations?.total
      ? Math.round(recommendations.ratio * 100)
      : 0;
  const successCount = recommendations?.good || 0;
  const totalRatings = recommendations?.total || 0;

  const avgReturnPct = averageReturn ? (averageReturn * 100).toFixed(2) : '0.00';
  
  // Distribution - API might provide counts or percentages
  // Check if values are > 1 (likely counts) or <= 1 (likely percentages)
  const buyRaw = distribution?.buy || 0;
  const holdRaw = distribution?.hold || 0;
  const sellRaw = distribution?.sell || 0;
  
  // Determine if values are counts or percentages
  const isPercentages = buyRaw <= 1 && holdRaw <= 1 && sellRaw <= 1 && (buyRaw + holdRaw + sellRaw) <= 1.1;
  
  let buyPct: number;
  let holdPct: number;
  let sellPct: number;
  let totalRatingsCount: number;
  
  if (isPercentages) {
    // Already percentages (0-1 range)
    buyPct = buyRaw * 100;
    holdPct = holdRaw * 100;
    sellPct = sellRaw * 100;
    totalRatingsCount = totalRatings || 0;
  } else {
    // Counts - calculate percentages
    const totalDistCount = buyRaw + holdRaw + sellRaw;
    buyPct = totalDistCount > 0 ? (buyRaw / totalDistCount) * 100 : 0;
    holdPct = totalDistCount > 0 ? (holdRaw / totalDistCount) * 100 : 0;
    sellPct = totalDistCount > 0 ? (sellRaw / totalDistCount) * 100 : 0;
    totalRatingsCount = totalDistCount || totalRatings || 0;
  }
  
  // Total ratings count for distribution display (in thousands)
  const totalRatingsK = totalRatingsCount >= 1000 ? (totalRatingsCount / 1000).toFixed(1) : totalRatingsCount.toString();

  // Find best rating - highest return
  const bestRating = ratings && ratings.length > 0 
    ? ratings.reduce((best: any, current: any) => {
        const currentReturn = current.return || current.avgReturn || 0;
        const bestReturn = best.return || best.avgReturn || 0;
        return currentReturn > bestReturn ? current : best;
      }, ratings[0])
    : null;

  const pictureUrlFull = pictureUrl
    ? `https://tr-cdn.tipranks.com/expert-pictures/${pictureUrl}_tsqr.jpg`
    : 'https://tr-cdn.tipranks.com/static/v2/static/images/icon/avatar.svg';

  // Handle starRating - it might be an object or a number/string
  const starRatingValue =
    typeof starRating === 'object' && starRating !== null
      ? starRating.value || starRating.rating || 0
      : starRating
      ? parseFloat(String(starRating))
      : 0;
  const starFillPercent = starRatingValue > 0 ? (starRatingValue / 5) * 100 : 0;

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
          <Link to="/" className="nav-link">
            Home
          </Link>
          <Link
            to="/news"
            className={`nav-link ${location.pathname === '/news' ? 'nav-active' : ''}`}
          >
            News
          </Link>
          <Link
            to="/"
            className={`nav-link ${
              location.pathname === '/' || location.pathname === '/screener'
                ? 'nav-active'
                : ''
            }`}
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
          <a href="#" className="nav-link">
            Maps
          </a>
          <a href="#" className="nav-link">
            Groups
          </a>
          <a href="#" className="nav-link">
            Portfolio
          </a>
          <a href="#" className="nav-link">
            Insider
          </a>
          <a href="#" className="nav-link">
            Futures
          </a>
          <a href="#" className="nav-link">
            Forex
          </a>
          <a href="#" className="nav-link">
            Crypto
          </a>
          <a href="#" className="nav-link">
            Calendar
          </a>
          <a href="#" className="nav-link">
            Backtests
          </a>
          <a href="#" className="nav-link">
            Pricing
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '16px',
          gap: '16px',
        }}
      >
        {/* Left Sidebar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '378px',
            marginRight: '20px',
            flex: '0 0 auto',
          }}
        >
          {/* Profile Box */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  fontSize: '11px',
                  paddingTop: '16px',
                }}
              >
                <img
                  src={pictureUrlFull}
                  alt={name}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-secondary)',
                    objectFit: 'cover',
                  }}
                />
                <h2
                  style={{
                    fontWeight: 700,
                    marginTop: '12px',
                    fontSize: '20px',
                    textAlign: 'center',
                  }}
                >
                  {name}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      marginTop: '8px',
                    }}
                  >
                    <span style={{ fontSize: '14px', marginTop: '8px' }}>
                      {firm}
                    </span>
                  </div>
                </h2>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: '1.5',
                    marginTop: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <i
                    className="icon-manWithTie"
                    style={{
                      display: 'inline-flex',
                      marginRight: '12px',
                      marginTop: '4px',
                    }}
                  />
                  <span style={{ marginLeft: '12px', marginTop: '4px' }}>
                    Wall Street Analyst
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {/* Star Rating */}
                  <div
                    title={starRatingValue.toFixed(2)}
                    style={{
                      marginTop: '8px',
                      marginBottom: '8px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '2px',
                          color: '#ddd',
                        }}
                      >
                        {'★★★★★'.split('').map((_, i) => (
                          <span key={i} style={{ fontSize: '16px' }}>
                            ★
                          </span>
                        ))}
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          display: 'flex',
                          gap: '2px',
                          color: '#ffa500',
                          width: `${starFillPercent}%`,
                          overflow: 'hidden',
                        }}
                      >
                        {'★★★★★'.split('').map((_, i) => (
                          <span key={i} style={{ fontSize: '16px' }}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    #{rankValue || 'N/A'} out of {outOfValue?.toLocaleString() || 'N/A'}{' '}
                    <Link
                      to="/experts"
                      style={{
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                      }}
                    >
                      Wall Street Analysts
                    </Link>
                    <br style={{ lineHeight: '1' }} /> #{rankValue || 'N/A'} out of{' '}
                    {outOfValue?.toLocaleString() || 'N/A'}{' '}
                    <Link
                      to="/experts"
                      style={{
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                      }}
                    >
                      experts
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Rate & Average Return */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Success Rate */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '50%',
                  height: '200px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: '1',
                    marginBottom: '12px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                  >
                    Success Rate
                  </h3>
                  <span style={{ marginLeft: '12px' }}>
                    <i
                      className="icon-tooltip"
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        display: 'inline-flex',
                      }}
                    />
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '48px',
                    marginBottom: '12px',
                  }}
                >
                  <svg viewBox="0 0 64 64" style={{ height: '36px', fontSize: '20px' }}>
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="100%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                        <stop offset="20%" stopColor="#eee" />
                        <stop offset="90%" stopColor="#eee" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M32,0 A32,32 0 1,1 ${32 + 32 * Math.cos((2 * Math.PI * successRate) / 100 - Math.PI / 2)},${32 + 32 * Math.sin((2 * Math.PI * successRate) / 100 - Math.PI / 2)} L${32 + 28.8 * Math.cos((2 * Math.PI * successRate) / 100 - Math.PI / 2)},${32 + 28.8 * Math.sin((2 * Math.PI * successRate) / 100 - Math.PI / 2)} A28.8,28.8 0 1,0 32,3.2 Z`}
                      fill="#1ead00"
                      stroke="white"
                      strokeWidth="0"
                    />
                    <path
                      d={`M${32 + 32 * Math.cos((2 * Math.PI * successRate) / 100 - Math.PI / 2)},${32 + 32 * Math.sin((2 * Math.PI * successRate) / 100 - Math.PI / 2)} A32,32 0 0,1 32,0 L32,3.2 A28.8,28.8 0 0,0 ${32 + 28.8 * Math.cos((2 * Math.PI * successRate) / 100 - Math.PI / 2)},${32 + 28.8 * Math.sin((2 * Math.PI * successRate) / 100 - Math.PI / 2)} Z`}
                      fill="#dddddd"
                      stroke="white"
                      strokeWidth="0"
                    />
                    <g>
                      <text
                        x="50%"
                        y="50%"
                        fill="#1ead00"
                        textAnchor="middle"
                        dy="0.28em"
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          fill: '#1ead00',
                        }}
                      >
                        {successRate}%
                      </text>
                    </g>
                  </svg>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    textAlign: 'center',
                    height: 'auto',
                    marginBottom: '12px',
                  }}
                >
                  {successCount} out of {totalRatings} ratings made a profit
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  borderRight: '1px solid var(--border-color)',
                }}
              />

              {/* Average Return */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '50%',
                  height: '200px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: '1',
                    marginBottom: '12px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                  >
                    Average Return
                  </h3>
                  <span style={{ marginLeft: '12px' }}>
                    <i
                      className="icon-tooltip"
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        display: 'inline-flex',
                      }}
                    />
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '48px',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      color: parseFloat(avgReturnPct) >= 0 ? '#1ead00' : '#ea0000',
                      fontSize: '24px',
                      fontWeight: 600,
                    }}
                    data-value={averageReturn}
                  >
                    {parseFloat(avgReturnPct) >= 0 ? '+' : ''}
                    {avgReturnPct}%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    textAlign: 'center',
                    height: 'auto',
                    marginBottom: '12px',
                  }}
                >
                  Average return per rating
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                borderTop: '1px solid var(--border-color)',
                marginTop: '16px',
              }}
            />
          </div>

          {/* Time Frame & Compare To Filters */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  width: '50%',
                  textAlign: 'start',
                }}
              >
                Time Frame
              </span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  width: '50%',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px',
                    height: '35px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      paddingRight: '12px',
                      marginRight: '12px',
                      paddingTop: '8px',
                      fontSize: '11px',
                      fontWeight: 400,
                      color: 'var(--text-primary)',
                      flexGrow: 1,
                      maxWidth: '250px',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        lineHeight: '1.5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <div style={{ display: 'inline', overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title="1 Year">
                          1 Year
                        </span>
                      </div>
                    </div>
                  </div>
                  <i
                    className="icon-arrowDropDown"
                    style={{
                      color: 'var(--link-color)',
                      fontSize: '14px',
                      display: 'inline-flex',
                      paddingTop: '8px',
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  width: '50%',
                  textAlign: 'start',
                }}
              >
                Compare to
              </span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  width: '50%',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px',
                    height: '35px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      paddingRight: '12px',
                      marginRight: '12px',
                      paddingTop: '8px',
                      fontSize: '11px',
                      fontWeight: 400,
                      color: 'var(--text-primary)',
                      flexGrow: 1,
                      maxWidth: '250px',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        lineHeight: '1.5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <div style={{ display: 'inline', overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title="No Benchmark">
                          No Benchmark
                        </span>
                      </div>
                    </div>
                  </div>
                  <i
                    className="icon-arrowDropDown"
                    style={{
                      color: 'var(--link-color)',
                      fontSize: '14px',
                      display: 'inline-flex',
                      paddingTop: '8px',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stock Rating Distribution */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: '18px',
                  display: 'inline-block',
                }}
              >
                Stock Rating Distribution
              </h3>
              <button style={{ fontSize: '12px', lineHeight: '1', paddingTop: 0 }}>
                <i
                  className="icon-tooltip"
                  style={{
                    display: 'inline-flex',
                  }}
                />
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                position: 'relative',
                paddingTop: '16px',
                paddingBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', margin: '0 auto' }}>
                {/* Pie Chart SVG */}
                <div style={{ display: 'flex' }} title="">
                  <svg viewBox="0 0 64 64" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
                    {/* Buy segment */}
                    <path
                      d={`M32,0 A32,32 0 ${buyPct > 50 ? '1' : '0'},1 ${32 + 32 * Math.cos((2 * Math.PI * buyPct) / 100 - Math.PI / 2)},${32 + 32 * Math.sin((2 * Math.PI * buyPct) / 100 - Math.PI / 2)} L${32 + 25.6 * Math.cos((2 * Math.PI * buyPct) / 100 - Math.PI / 2)},${32 + 25.6 * Math.sin((2 * Math.PI * buyPct) / 100 - Math.PI / 2)} A25.6,25.6 0 ${buyPct > 50 ? '1' : '0'},0 32,6.4 Z`}
                      fill="#3aa6b7"
                      stroke="white"
                      strokeWidth="0"
                    />
                    {/* Hold segment */}
                    {holdPct > 0 && (
                      <path
                        d={`M${32 + 32 * Math.cos((2 * Math.PI * buyPct) / 100 - Math.PI / 2)},${32 + 32 * Math.sin((2 * Math.PI * buyPct) / 100 - Math.PI / 2)} A32,32 0 ${holdPct > 50 ? '1' : '0'},1 ${32 + 32 * Math.cos((2 * Math.PI * (buyPct + holdPct)) / 100 - Math.PI / 2)},${32 + 32 * Math.sin((2 * Math.PI * (buyPct + holdPct)) / 100 - Math.PI / 2)} L${32 + 25.6 * Math.cos((2 * Math.PI * (buyPct + holdPct)) / 100 - Math.PI / 2)},${32 + 25.6 * Math.sin((2 * Math.PI * (buyPct + holdPct)) / 100 - Math.PI / 2)} A25.6,25.6 0 ${holdPct > 50 ? '1' : '0'},0 ${32 + 25.6 * Math.cos((2 * Math.PI * buyPct) / 100 - Math.PI / 2)},${32 + 25.6 * Math.sin((2 * Math.PI * buyPct) / 100 - Math.PI / 2)} Z`}
                        fill="#828080"
                        stroke="white"
                        strokeWidth="0"
                      />
                    )}
                    {/* Sell segment */}
                    {sellPct > 0 && (
                      <path
                        d={`M${32 + 32 * Math.cos((2 * Math.PI * (buyPct + holdPct)) / 100 - Math.PI / 2)},${32 + 32 * Math.sin((2 * Math.PI * (buyPct + holdPct)) / 100 - Math.PI / 2)} A32,32 0 ${sellPct > 50 ? '1' : '0'},1 32,0 L32,6.4 A25.6,25.6 0 ${sellPct > 50 ? '1' : '0'},0 ${32 + 25.6 * Math.cos((2 * Math.PI * (buyPct + holdPct)) / 100 - Math.PI / 2)},${32 + 25.6 * Math.sin((2 * Math.PI * (buyPct + holdPct)) / 100 - Math.PI / 2)} Z`}
                        fill="#b51978"
                        stroke="white"
                        strokeWidth="0"
                      />
                    )}
                    <g>
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dy="0.20em"
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {totalRatingsK}K
                      </text>
                      <text
                        x="50%"
                        y="53%"
                        textAnchor="middle"
                        dy="1.55em"
                        style={{
                          fontSize: '14px',
                        }}
                      >
                        Ratings
                      </text>
                    </g>
                  </svg>
                </div>
                <div style={{ display: 'block', marginLeft: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginTop: '16px',
                      marginBottom: '16px',
                      fontSize: '12px',
                      color: '#3aa6b7',
                      fontWeight: 600,
                      marginLeft: '16px',
                    }}
                  >
                    <i
                      className="icon-rect"
                      style={{
                        marginRight: '8px',
                        display: 'inline-flex',
                        height: '12px',
                        color: 'rgb(58, 166, 183)',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', color: '#3aa6b7' }}>
                      <span style={{ marginRight: '8px' }}>{buyPct.toFixed(2)}%</span> Buy
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginTop: '16px',
                      marginBottom: '16px',
                      fontSize: '12px',
                      color: '#828080',
                      fontWeight: 600,
                      marginLeft: '16px',
                    }}
                  >
                    <i
                      className="icon-rect"
                      style={{
                        marginRight: '8px',
                        display: 'inline-flex',
                        height: '12px',
                        color: 'rgb(130, 128, 128)',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', color: '#828080' }}>
                      <span style={{ marginRight: '8px' }}>{holdPct.toFixed(2)}%</span> Hold
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginTop: '16px',
                      marginBottom: '16px',
                      fontSize: '12px',
                      color: '#b51978',
                      fontWeight: 600,
                      marginLeft: '16px',
                    }}
                  >
                    <i
                      className="icon-rect"
                      style={{
                        marginRight: '8px',
                        display: 'inline-flex',
                        height: '12px',
                        color: 'rgb(181, 25, 120)',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', color: '#b51978' }}>
                      <span style={{ marginRight: '8px' }}>{sellPct.toFixed(2)}%</span> Sell
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1', minWidth: '80px' }}>
          {/* Stock Coverage Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: '18px',
                  display: 'inline-block',
                }}
              >
                {name}'s Stock Coverage
              </h3>
              <button style={{ fontSize: '12px', lineHeight: '1', paddingTop: 0 }}>
                <i
                  className="icon-tooltip"
                  style={{
                    display: 'inline-flex',
                  }}
                />
              </button>
            </div>
            
            {/* Loading State */}
            {stocksLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                Loading stocks...
              </div>
            )}
            
            {/* Error State */}
            {stocksError && !stocksLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#ea0000' }}>
                {stocksError}
              </div>
            )}
            
            {/* Stocks Table */}
            {!stocksLoading && !stocksError && (
              <div 
                className="stock-coverage-table-wrapper"
                style={{ 
                  marginTop: 8, 
                  overflow: 'auto', 
                  width: '100%',
                }}
              >
                <table className="stock-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ width: '30px', padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}></th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Company</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Ticker</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Latest Rating</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Latest Date</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>
                        {isBlogger ? 'Position' : 'Price Target'}
                      </th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Ratings Count</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Good Ratings</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Avg. Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expertStocks && expertStocks.length > 0 ? (
                      expertStocks.map((stock: ExpertStock, idx: number) => {
                        const isExpanded = expandedRows.has(idx);
                        const successRate = stock.totalRatingsCount && stock.totalRatingsCount > 0
                          ? (stock.goodRatingsCount || 0) / stock.totalRatingsCount * 100
                          : 0;
                        
                        return (
                          <React.Fragment key={idx}>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ textAlign: 'center', padding: '8px' }}>
                                {stock.latestRating && (
                                  <button
                                    type="button"
                                    onClick={() => toggleRow(idx)}
                                    style={{
                                      all: 'unset',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'var(--text-secondary)',
                                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s',
                                    }}
                                  >
                                    <ChevronRight size={14} />
                                  </button>
                                )}
                              </td>
                              <td style={{ padding: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      color: 'var(--text-primary)',
                                      fontWeight: 600,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '200px',
                                    }}
                                    title={stock.name}
                                  >
                                    {stock.name}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <Link
                                  to={`/stock/${stock.ticker?.toLowerCase().replace(/:/g, '-')}`}
                                  style={{
                                    color: 'var(--link-color)',
                                    textDecoration: 'none',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                  }}
                                >
                                  {stock.ticker}
                                </Link>
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px' }}>
                                {stock.latestRating ? (
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: stock.latestRating.rating === 'Buy' ? '#3aa6b7' : 
                                             stock.latestRating.rating === 'Hold' ? '#828080' : '#b51978',
                                      textTransform: 'uppercase',
                                      fontSize: '12px',
                                    }}
                                  >
                                    {stock.latestRating.rating}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>N/A</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px', fontSize: '12px' }}>
                                {stock.latestRating?.ratingDate
                                  ? new Date(stock.latestRating.ratingDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: '2-digit',
                                      year: 'numeric',
                                    })
                                  : 'N/A'}
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px' }}>
                                {isBlogger ? (
                                  // Show Position (bullish/bearish) for bloggers
                                  stock.latestRating ? (
                                    (() => {
                                      const rating = stock.latestRating.rating?.toLowerCase() || '';
                                      const isBullish = rating === 'buy' || rating === 'strong buy' || rating === 'outperform';
                                      const isBearish = rating === 'sell' || rating === 'strong sell' || rating === 'underperform';
                                      
                                      if (isBullish) {
                                        return (
                                          <span
                                            style={{
                                              color: '#1ead00',
                                              fontWeight: 700,
                                              fontSize: '12px',
                                              textTransform: 'uppercase',
                                            }}
                                          >
                                            Bullish
                                          </span>
                                        );
                                      } else if (isBearish) {
                                        return (
                                          <span
                                            style={{
                                              color: '#ea0000',
                                              fontWeight: 700,
                                              fontSize: '12px',
                                              textTransform: 'uppercase',
                                            }}
                                          >
                                            Bearish
                                          </span>
                                        );
                                      } else {
                                        return (
                                          <span
                                            style={{
                                              color: 'var(--text-secondary)',
                                              fontWeight: 600,
                                              fontSize: '12px',
                                              textTransform: 'uppercase',
                                            }}
                                          >
                                            Neutral
                                          </span>
                                        );
                                      }
                                    })()
                                  ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>N/A</span>
                                  )
                                ) : (
                                  // Show Price Target for non-bloggers
                                  stock.priceTarget !== null && stock.priceTarget !== undefined ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <span
                                        style={{
                                          color: '#3aa6b7',
                                          fontWeight: 700,
                                          fontSize: '12px',
                                        }}
                                      >
                                        {stock.priceTargetCurrencyCode || '$'}
                                        {stock.priceTarget.toFixed(2)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>N/A</span>
                                  )
                                )}
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px' }}>
                                    {stock.ratingsCount || stock.totalRatingsCount || 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px' }}>
                                    {stock.goodRatingsCount || 'N/A'}
                                  </span>
                                  {stock.totalRatingsCount && stock.totalRatingsCount > 0 && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                      ({successRate.toFixed(1)}%)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px' }}>
                                {stock.averageReturn !== null && stock.averageReturn !== undefined ? (
                                  <span
                                    style={{
                                      color: stock.averageReturn >= 0 ? '#1ead00' : '#ea0000',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {stock.averageReturn >= 0 ? '+' : ''}
                                    {(stock.averageReturn * 100).toFixed(2)}%
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>N/A</span>
                                )}
                              </td>
                            </tr>
                            {/* Expanded Row - Show Latest Rating Details */}
                            {isExpanded && stock.latestRating && (
                              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                <td colSpan={9} style={{ padding: '16px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                                      Latest Rating Details
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                                      <div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Action: </span>
                                        <span>{stock.latestRating.action || 'N/A'}</span>
                                      </div>
                                      {isBlogger ? (
                                        <div>
                                          <span style={{ color: 'var(--text-secondary)' }}>Position: </span>
                                          <span>
                                            {(() => {
                                              const rating = stock.latestRating.rating?.toLowerCase() || '';
                                              const isBullish = rating === 'buy' || rating === 'strong buy' || rating === 'outperform';
                                              const isBearish = rating === 'sell' || rating === 'strong sell' || rating === 'underperform';
                                              
                                              if (isBullish) {
                                                return <span style={{ color: '#1ead00', fontWeight: 700 }}>BULLISH</span>;
                                              } else if (isBearish) {
                                                return <span style={{ color: '#ea0000', fontWeight: 700 }}>BEARISH</span>;
                                              } else {
                                                return <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>NEUTRAL</span>;
                                              }
                                            })()}
                                          </span>
                                        </div>
                                      ) : (
                                        <div>
                                          <span style={{ color: 'var(--text-secondary)' }}>Price Target: </span>
                                          <span>
                                            {stock.latestRating.priceTargetCurrencyCode || '$'}
                                            {stock.latestRating.priceTarget?.toFixed(2) || 'N/A'}
                                          </span>
                                        </div>
                                      )}
                                      {stock.latestRating.quoteTitle && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>Title: </span>
                                          <span>{stock.latestRating.quoteTitle}</span>
                                        </div>
                                      )}
                                      {stock.latestRating.link && stock.latestRating.link !== 'http://www.tipranks.com' && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                          <a
                                            href={stock.latestRating.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              color: 'var(--link-color)',
                                              textDecoration: 'none',
                                            }}
                                          >
                                            View Rating →
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    {stock.firstRating && (
                                      <>
                                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '12px', paddingTop: '12px' }}>
                                          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                                            First Rating
                                          </div>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                                            <div>
                                              <span style={{ color: 'var(--text-secondary)' }}>Date: </span>
                                              <span>
                                                {new Date(stock.firstRating.ratingDate).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: '2-digit',
                                                  year: 'numeric',
                                                })}
                                              </span>
                                            </div>
                                            <div>
                                              <span style={{ color: 'var(--text-secondary)' }}>Rating: </span>
                                              <span style={{
                                                fontWeight: 700,
                                                color: stock.firstRating.rating === 'Buy' ? '#3aa6b7' : 
                                                       stock.firstRating.rating === 'Hold' ? '#828080' : '#b51978',
                                              }}>
                                                {stock.firstRating.rating}
                                              </span>
                                            </div>
                                            {isBlogger ? (
                                              <div>
                                                <span style={{ color: 'var(--text-secondary)' }}>Position: </span>
                                                <span>
                                                  {(() => {
                                                    const rating = stock.firstRating.rating?.toLowerCase() || '';
                                                    const isBullish = rating === 'buy' || rating === 'strong buy' || rating === 'outperform';
                                                    const isBearish = rating === 'sell' || rating === 'strong sell' || rating === 'underperform';
                                                    
                                                    if (isBullish) {
                                                      return <span style={{ color: '#1ead00', fontWeight: 700 }}>BULLISH</span>;
                                                    } else if (isBearish) {
                                                      return <span style={{ color: '#ea0000', fontWeight: 700 }}>BEARISH</span>;
                                                    } else {
                                                      return <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>NEUTRAL</span>;
                                                    }
                                                  })()}
                                                </span>
                                              </div>
                                            ) : (
                                              stock.firstRating.priceTarget && (
                                                <div>
                                                  <span style={{ color: 'var(--text-secondary)' }}>Price Target: </span>
                                                  <span>
                                                    {stock.firstRating.priceTargetCurrencyCode || '$'}
                                                    {stock.firstRating.priceTarget.toFixed(2)}
                                                  </span>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
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
                          {stocksLoading ? 'Loading...' : 'No stock coverage data available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: '18px',
                  display: 'inline-block',
                }}
              >
                Additional Information
              </h3>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', width: '100%' }}>
                <span
                  style={{
                    fontWeight: 600,
                    width: '50%',
                    textAlign: 'start',
                  }}
                >
                  Main Sector:
                </span>
                <span style={{ width: '50%', textAlign: 'start' }}>
                  {sectorId
                    ? sectorId
                        .split('-')
                        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')
                    : 'Unknown'}
                </span>
              </div>
              <div style={{ display: 'flex', width: '100%', marginTop: '16px' }}>
                <span
                  style={{
                    fontWeight: 600,
                    width: '50%',
                    textAlign: 'start',
                  }}
                >
                  Geo Coverage:
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    width: '50%',
                    gap: '12px',
                  }}
                >
                  {geoCoverage && Array.isArray(geoCoverage) && geoCoverage.length > 0
                    ? geoCoverage.map((country: string, idx: number) => {
                        const countryCodeMap: Record<string, string> = {
                          US: 'us',
                          'United States': 'us',
                          UK: 'uk',
                          'United Kingdom': 'uk',
                          Canada: 'ca',
                          Australia: 'au',
                          France: 'fr',
                          Germany: 'de',
                          Italy: 'it',
                          Netherlands: 'nl',
                          Switzerland: 'ch',
                          'Hong Kong': 'hk',
                          China: 'cn',
                          Japan: 'jp',
                          Singapore: 'sg',
                        };
                        const code = countryCodeMap[country] || country.toLowerCase().replace(/\s+/g, '-').slice(0, 2);
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              marginRight: '12px',
                              marginBottom: '12px',
                            }}
                            title={country}
                          >
                            <img
                              src={`https://tr-cdn.tipranks.com/static/v2/static/flags/4x3/${code}.svg`}
                              alt={country}
                              style={{
                                width: '16px',
                              }}
                              loading="lazy"
                            />
                          </div>
                        );
                      })
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Best Rating */}
          {bestRating && (
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <h3
                  style={{
                    fontWeight: 700,
                    fontSize: '18px',
                    display: 'inline-block',
                  }}
                >
                  Best Rating
                </h3>
                <button style={{ fontSize: '12px', lineHeight: '1', paddingTop: 0 }}>
                  <i
                    className="icon-tooltip"
                    style={{
                      display: 'inline-flex',
                    }}
                  />
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', width: '100%' }}>
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      width: '40%',
                      textAlign: 'start',
                    }}
                  >
                    Stock:
                  </span>
                  <div style={{ width: '60%', textAlign: 'end' }}>
                    <span>{bestRating.companyName || 'N/A'}</span>
                    <br style={{ lineHeight: '1' }} /> (
                    <a
                      href={`/stocks/${bestRating.ticker?.toLowerCase()}/insider-trading`}
                      style={{
                        color: 'var(--link-color)',
                        textDecoration: 'none',
                      }}
                      title={bestRating.companyName}
                    >
                      {bestRating.ticker}
                    </a>
                    )
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: '16px',
                    marginBottom: '16px',
                  }}
                />
                <div style={{ display: 'flex', width: '100%' }}>
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      width: '40%',
                      textAlign: 'start',
                    }}
                  >
                    Rating:
                  </span>
                  <span
                    style={{
                      color: '#3aa6b7',
                      width: '60%',
                      textAlign: 'end',
                    }}
                  >
                    {bestRating.rating?.toUpperCase() || 'N/A'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: '16px',
                    marginBottom: '16px',
                  }}
                />
                <div style={{ display: 'flex', width: '100%' }}>
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      width: '40%',
                      textAlign: 'start',
                    }}
                  >
                    Date:
                  </span>
                  <span style={{ width: '60%', textAlign: 'end' }}>
                    {bestRating.date
                      ? new Date(bestRating.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                        })
                      : 'N/A'}{' '}
                    -{' '}
                    {bestRating.date
                      ? new Date(
                          new Date(bestRating.date).setFullYear(
                            new Date(bestRating.date).getFullYear() + 1,
                          ),
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: '16px',
                    marginBottom: '16px',
                  }}
                />
                <div style={{ display: 'flex', width: '100%' }}>
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      width: '40%',
                      textAlign: 'start',
                    }}
                  >
                    Return:
                  </span>
                  <span
                    style={{
                      color: '#1ead00',
                      width: '60%',
                      textAlign: 'end',
                    }}
                  >
                    {bestRating && (bestRating.return || bestRating.avgReturn)
                      ? `${(bestRating.return || bestRating.avgReturn) >= 0 ? '+' : ''}${((bestRating.return || bestRating.avgReturn) * 100).toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AnalystProfile;

