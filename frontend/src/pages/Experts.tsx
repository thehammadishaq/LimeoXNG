import React, { useState, useMemo, useEffect } from 'react';
import { Moon, Sun, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { filterOptions, signals, orderByOptions } from '../mockData';
import FilterPanel from '../components/FilterPanel';
import { useTheme } from '../context/ThemeContext';

type Expert = {
  id: number; // row index (1..100)
  name: string;
  expertId?: string | null; // TipRanks expertId or uid for profile link
  profileUrl?: string | null; // External TipRanks URL (fallback)
  pictureUrl?: string | null; // Profile picture identifier from TipRanks
  firm: string;
  sector: string;
  rank: number; // e.g. 2 for "Rank 2"
  buyPct: number;
  holdPct: number;
  sellPct: number;
  successScore: number; // e.g. 73 (%)
  avgReturn: number; // e.g. 60.90 (%)
  followers: number;
};

const Experts: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState('top_analysts');
  const [orderBy, setOrderBy] = useState('Ticker');
  const [orderDirection, setOrderDirection] = useState<'Asc' | 'Desc'>('Asc');
  const [selectedSignal, setSelectedSignal] = useState('None (all stocks)');
  const [filters, setFilters] = useState<any>({});
  const [activeFilterTab, setActiveFilterTab] = useState('valuation');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  // API Parameters state
  const [apiParams, setApiParams] = useState({
    num_experts: 1000,
    period: 'year',
    benchmark: 'none',
    country: 'us',
    save_to_db: false, // Default: false (don't save to DB)
    use_db: true, // Default: true (read from MongoDB)
    limit: undefined as number | undefined,
    skip: 0,
  });

  const apiBase =
    (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '') || '';

  // Map selectedView to TipRanks expert_type
  // Valid TipRanks expert_type values: analyst, blogger, insider, institutional, user
  // Note: institutional gives Hedge Fund Managers data, not Research Firms
  // Research Firms might be part of 'analyst' type (firms with analysts)
  const getExpertType = (view: string): string | null => {
    const mapping: Record<string, string> = {
      top_analysts: 'analyst',
      bloggers: 'blogger',
      insiders: 'insider',
      hedge_funds: 'institutional', // institutional gives Hedge Fund Managers
      research_firms: null, // Research Firms - no direct TipRanks expert_type available
      individuals: 'user', // Using 'user' for individual investors
    };
    return mapping[view] || null;
  };

  // Get expert type label for display
  const getExpertTypeLabel = (view: string): string => {
    const mapping: Record<string, string> = {
      top_analysts: 'Wall Street Analyst',
      bloggers: 'Financial Blogger',
      insiders: 'Corporate Insider',
      hedge_funds: 'Hedge Fund Manager',
      research_firms: 'Research Firm',
      individuals: 'Individual Investor',
    };
    return mapping[view] || 'Expert';
  };

  // Fetch TipRanks Top Experts based on selected tab
  useEffect(() => {
    const expertType = getExpertType(selectedView);
    if (!expertType) {
      // For tabs that don't have a direct TipRanks expert_type (like research_firms)
      // Clear experts and show message
      if (selectedView === 'research_firms') {
        setExperts([]);
        setError('Research Firms data is not available via TipRanks API. TipRanks does not provide a separate expert_type for Research Firms.');
      } else {
        setExperts([]);
      }
      setLoading(false);
      return;
    }

    const fetchExperts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use scraper endpoint with expert_type query parameter
        // Scraper endpoint: /api/v1/scraper/tipranks/scraper/top-experts
        const params = new URLSearchParams({
          expert_type: expertType,
          num_experts: apiParams.num_experts.toString(),
          period: apiParams.period,
          benchmark: apiParams.benchmark,
          country: apiParams.country,
          save_to_db: apiParams.save_to_db.toString(),
          use_db: apiParams.use_db.toString(),
          skip: apiParams.skip.toString(),
        });
        
        // Add limit only if use_db is true and limit is set
        if (apiParams.use_db && apiParams.limit) {
          params.append('limit', apiParams.limit.toString());
        }
        
        const endpoint = `/api/v1/scraper/tipranks/scraper/top-experts?${params.toString()}`;

        const res = await fetch(`${apiBase}${endpoint}`);
        if (!res.ok) {
          // Try to get detailed error message from response
          let errorMessage = `HTTP ${res.status}`;
          try {
            const errorData = await res.json();
            if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else if (typeof errorData === 'string') {
              errorMessage = errorData;
            }
          } catch (e) {
            // If response is not JSON, use status text
            errorMessage = `HTTP ${res.status}: ${res.statusText || 'Unknown error'}`;
          }
          console.error(`❌ API Error for ${selectedView} (expert_type=${expertType}):`, errorMessage);
          throw new Error(errorMessage);
        }

        const data = await res.json();
        console.log(`✅ TipRanks ${selectedView} (expert_type=${expertType}) raw response:`, data);
        console.log(`📊 Response structure:`, {
          isArray: Array.isArray(data),
          hasData: !!(data as any)?.data,
          hasExperts: !!(data as any)?.experts,
          dataKeys: Object.keys(data || {}),
          expertsCount: Array.isArray((data as any)?.experts) ? (data as any).experts.length : 'N/A',
        });

        // Scraper API returns: { experts: [...], count: number, source: string, ... }
        // Normalise to an array
        const rawList = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
          ? (data as any).data
          : Array.isArray((data as any)?.experts)
          ? (data as any).experts
          : [];
        
        console.log(`📋 Extracted rawList length:`, rawList.length);
        if (rawList.length > 0) {
          console.log(`📋 First item sample:`, rawList[0]);
        }

        // Map TipRanks API response to Expert[]
        console.log(`🔄 Starting to map ${rawList.length} experts...`);
        const mapped: Expert[] = rawList.map((item: any, idx: number) => {
              const name =
                item.name ||
                item.expertName ||
                item.fullName ||
                'Unknown Analyst';
              const firm =
                item.firm ||
                item.company ||
                item.analystFirm ||
                item.firmName ||
                'Unknown Firm';
              const sectorRaw =
                item.sector ||
                item.industry ||
                item.primarySector ||
                item.sectorId || // e.g. "financial"
                'general';
              const sector =
                typeof sectorRaw === 'string'
                  ? sectorRaw.charAt(0).toUpperCase() + sectorRaw.slice(1)
                  : 'General';

              const buyPctRaw =
                item.distribution?.buy ??
                item.buy_pct ??
                item.buyPercent ??
                item.buy_percentage ??
                item.buyRate ??
                0;
              const holdPctRaw =
                item.distribution?.hold ??
                item.hold_pct ??
                item.holdPercent ??
                item.hold_percentage ??
                item.holdRate ??
                0;
              const sellPctRaw =
                item.distribution?.sell ??
                item.sell_pct ??
                item.sellPercent ??
                item.sell_percentage ??
                item.sellRate ??
                0;

              const successRaw =
                item.success_rate ??
                item.successRate ??
                item.successScore ??
                0;

              const avgReturnRaw =
                item.avg_return ??
                item.averageReturn ??
                item.avgReturn ??
                0;

              const followersRaw =
                item.followers ??
                item.followerCount ??
                item.numFollowers ??
                0;

              // Try to build a clickable profile URL if available in response
              let profileUrl: string | null = null;
              if (item.profile_url) {
                profileUrl = item.profile_url;
              } else if (item.expertUrlSuffix) {
                profileUrl = `https://www.tipranks.com/experts/analysts/${item.expertUrlSuffix}`;
              } else if (item.uid) {
                // Fallback based on uid if no explicit suffix is provided
                profileUrl = `https://www.tipranks.com/experts/analysts/${item.uid}`;
              }

              // Handle rank field - MongoDB returns rank as object with ranked property
              const rankRaw =
                (typeof item.rank === 'object' && item.rank !== null && item.rank.ranked !== undefined)
                  ? item.rank.ranked
                  : (typeof item.rank === 'number' ? item.rank : null) ??
                item.rating ??
                item.position ??
                idx + 1;

              // Use expertId or uid for internal profile link
              const expertId = item.expertId || item.uid || null;

              // Extract pictureUrl from various possible field names
              const pictureUrl =
                item.pictureUrl ||
                item.picture_url ||
                item.profilePictureUrl ||
                item.profile_picture_url ||
                null;

              return {
                id: idx + 1,
                name,
                expertId,
                profileUrl,
                pictureUrl,
                firm,
                sector,
                rank: Number(rankRaw) || idx + 1,
                buyPct: Number(buyPctRaw) || 0,
                holdPct: Number(holdPctRaw) || 0,
                sellPct: Number(sellPctRaw) || 0,
                successScore: Number(successRaw) || 0,
                avgReturn: Number(avgReturnRaw) || 0,
                followers: Number(followersRaw) || 0,
              };
        });
        
        console.log(`✅ Mapped ${mapped.length} experts successfully`);
        if (mapped.length > 0) {
          console.log(`📋 First mapped expert sample:`, mapped[0]);
        }
        
        setExperts(mapped);
        // Reset to page 1 when new data is loaded
        setCurrentPage(1);
      } catch (e: any) {
        const errorMessage = e?.message || e?.toString() || 'Unknown error';
        console.error(`❌ Failed to fetch TipRanks top experts (${selectedView}, expert_type=${expertType}):`, e);
        console.error(`   Error details:`, errorMessage);
        // Show detailed error message to user
        setError(`Failed to load ${getExpertTypeLabel(selectedView)} data: ${errorMessage}`);
        // Clear data on error (no mock data)
        setExperts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExperts();
  }, [selectedView, apiBase, apiParams]);

  const handleSearchSubmit = () => {
    setSearchTerm(searchInput.trim());
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: number) => {
    const safeValue = Number.isNaN(value) || value <= 0 ? 5 : value;
    setItemsPerPage(safeValue);
    setCurrentPage(1);
  };

  const filteredExperts = useMemo(() => {
    let data = [...experts];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(
        (e) =>
          e.name.toLowerCase().includes(lower) ||
          e.firm.toLowerCase().includes(lower) ||
          e.sector.toLowerCase().includes(lower),
      );
    }

    return data;
  }, [searchTerm, experts]);

  const sortedExperts = useMemo(() => {
    const data = [...filteredExperts];

    const sortKey = (exp: Expert): number | string => {
      switch (orderBy) {
        case 'Ticker':
        case 'Company':
          return exp.name;
        case 'Market Cap':
        return exp.followers;
        case 'Performance':
        return exp.avgReturn;
        case 'Dividend Yield':
        return exp.successScore;
        default:
          return exp.name;
      }
    };

    data.sort((a, b) => {
      const av = sortKey(a);
      const bv = sortKey(b);

      if (typeof av === 'number' && typeof bv === 'number') {
        return av - bv;
      }
      return String(av).localeCompare(String(bv));
    });

    if (orderDirection === 'Desc') {
      data.reverse();
    }

    return data;
  }, [filteredExperts, orderBy, orderDirection]);

  const totalExperts = sortedExperts.length;
  const totalPages = totalExperts > 0 ? Math.ceil(totalExperts / itemsPerPage) : 1;
  
  // Ensure currentPage is valid - reset if out of range
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);
  
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const currentExperts = sortedExperts.slice(
    indexOfFirstItem,
    indexOfFirstItem + itemsPerPage
  );
  
  // Debug logging
  useEffect(() => {
    if (totalExperts > 0 && currentExperts.length === 0) {
      console.warn(`⚠️ Pagination issue:`, {
        totalExperts,
        currentPage,
        totalPages,
        itemsPerPage,
        indexOfFirstItem,
        sortedExpertsLength: sortedExperts.length,
      });
    }
  }, [totalExperts, currentExperts.length, currentPage, totalPages, itemsPerPage, indexOfFirstItem, sortedExperts.length]);

  const handlePageChange = (pageNumber: number) => {
    const safePage = Math.max(1, Math.min(pageNumber, totalPages || 1));
    setCurrentPage(safePage);
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

      {/* Filter Section with Border */}
      <div className="filter-section-wrapper">
        {/* Top Controls */}
        <div className="top-controls">
          <div className="controls-left">
            <input
              type="text"
              placeholder="Search experts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
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
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--link-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            />
            <button
              type="button"
              onClick={handleSearchSubmit}
              style={{
                marginLeft: 6,
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '3px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Search
            </button>
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
              {orderByOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="direction-select"
              value={orderDirection}
              onChange={(e) =>
                setOrderDirection(e.target.value === 'Desc' ? 'Desc' : 'Asc')
              }
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
              {signals.map((signal) => (
                <option key={signal} value={signal}>
                  {signal}
                </option>
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
            apiParams={apiParams}
            setApiParams={setApiParams}
            showApiParams={true}
          />
        )}

        {/* View Tabs – specialized for experts segments */}
        <div className="view-tabs">
          <button
            className={selectedView === 'top_analysts' ? 'tab-active' : ''}
            onClick={() => setSelectedView('top_analysts')}
          >
            Wall Street Analysts
          </button>
          <button
            className={selectedView === 'bloggers' ? 'tab-active' : ''}
            onClick={() => setSelectedView('bloggers')}
          >
            Financial Bloggers
          </button>
          <button
            className={selectedView === 'research_firms' ? 'tab-active' : ''}
            onClick={() => setSelectedView('research_firms')}
          >
            Research Firms
          </button>
          <button
            className={selectedView === 'insiders' ? 'tab-active' : ''}
            onClick={() => setSelectedView('insiders')}
          >
            Corporate Insiders
          </button>
          <button
            className={selectedView === 'hedge_funds' ? 'tab-active' : ''}
            onClick={() => setSelectedView('hedge_funds')}
          >
            Hedge Fund Managers
          </button>
          <button
            className={selectedView === 'individuals' ? 'tab-active' : ''}
            onClick={() => setSelectedView('individuals')}
          >
            Individual Investors
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div className="results-info">
        <div className="results-text">
          {totalExperts > 0 && currentExperts.length > 0
            ? `Showing ${indexOfFirstItem + 1}-${indexOfFirstItem + currentExperts.length} of ${totalExperts} experts${
                searchTerm.trim() ? ` matching "${searchTerm}"` : ''
              }`
            : totalExperts > 0
            ? `Showing 0 of ${totalExperts} experts${
                searchTerm.trim() ? ` matching "${searchTerm}"` : ''
              }`
            : searchTerm.trim()
            ? `No experts found matching "${searchTerm}"`
            : 'No experts to display'}
        </div>
        <div className="results-actions">
          <span style={{ fontSize: '11px', marginRight: 8 }}>
            Rows per page:{' '}
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              style={{
                fontSize: '11px',
                padding: '2px 4px',
                borderRadius: 3,
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </span>
        </div>
      </div>

      {/* Experts Table – use same container/table classes as screener for identical width */}
        <div className="table-container scrollbar-custom experts-table-wrapper" style={{ marginTop: 8 }}>
          <table className="stock-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Analyst</th>
              <th>{selectedView === 'bloggers' ? 'Blog' : 'Firm'}</th>
              <th>Sector</th>
              <th style={{ width: 140 }}>Distribution</th>
              <th>Avg Return</th>
            </tr>
          </thead>
          <tbody>
            {currentExperts.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    textAlign: 'center',
                    padding: '16px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}
                >
                  No experts to display.
                </td>
              </tr>
            ) : (
              currentExperts.map((expert, idx) => {
                const rowNumber = indexOfFirstItem + idx + 1;

                return (
                  <tr key={expert.id}>
                    <td>{rowNumber}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          if (expert.expertId) {
                            navigate(`/experts/analysts/${expert.expertId}`);
                          } else if (expert.profileUrl) {
                            window.open(expert.profileUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        style={{
                          all: 'unset',
                          cursor: expert.expertId || expert.profileUrl ? 'pointer' : 'default',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img
                            src={
                              expert.pictureUrl
                                ? `https://tr-cdn.tipranks.com/expert-pictures/${expert.pictureUrl}_tsqr.jpg`
                                : 'https://tr-cdn.tipranks.com/static/v2/static/images/icon/avatar.svg'
                            }
                            alt={expert.name}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid var(--border-color, #e5e7eb)',
                            }}
                            onError={(e) => {
                              // Fallback to default avatar if image fails to load
                              const target = e.currentTarget;
                              // Only update if not already the default avatar to prevent infinite loop
                              if (!target.src.includes('avatar.svg')) {
                                target.src = 'https://tr-cdn.tipranks.com/static/v2/static/images/icon/avatar.svg';
                              }
                              // Suppress error event to prevent console clutter
                              e.preventDefault();
                            }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span
                              style={{
                                fontWeight: 600,
                                color: 'var(--link-color)',
                                textDecoration: 'none',
                              }}
                            >
                              {expert.name}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              {getExpertTypeLabel(selectedView)}, Rank {expert.rank}
                            </span>
                          </div>
                        </div>
                      </button>
                    </td>
                    <td>{expert.firm}</td>
                    <td>{expert.sector}</td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        {/* Top row: Buy / Hold / Sell with percentages */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            justifyContent: 'space-between',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>Buy</span>
                            <span
                              style={{
                                fontWeight: 600,
                                color: 'var(--link-color)',
                              }}
                            >
                              {expert.buyPct.toFixed(0)}%
                            </span>
                          </div>
                          <div
                            style={{
                              width: 1,
                              height: 10,
                              backgroundColor: 'var(--border-color)',
                            }}
                          />
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>Hold</span>
                            <span
                              style={{
                                fontWeight: 600,
                                color: 'var(--accent-purple, #8b5cf6)',
                              }}
                            >
                              {expert.holdPct.toFixed(0)}%
                            </span>
                          </div>
                          <div
                            style={{
                              width: 1,
                              height: 10,
                              backgroundColor: 'var(--border-color)',
                            }}
                          />
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>Sell</span>
                            <span
                              style={{
                                fontWeight: 600,
                                color: 'var(--accent-red, #ef4444)',
                              }}
                            >
                              {expert.sellPct.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Bottom row: stacked bar visual (Buy / Hold / Sell segments) */}
                        <div
                          style={{
                            display: 'flex',
                            width: '100%',
                            height: 4,
                            borderRadius: 3,
                            overflow: 'hidden',
                            backgroundColor: 'var(--bg-secondary)',
                          }}
                        >
                          {(() => {
                            const total =
                              expert.buyPct +
                                expert.holdPct +
                                expert.sellPct || 1;
                            const buyWidth = (expert.buyPct / total) * 100;
                            const holdWidth = (expert.holdPct / total) * 100;
                            const sellWidth = (expert.sellPct / total) * 100;

                            return (
                              <>
                                {/* Buy segment */}
                                <div
                                  style={{
                                    width: `${buyWidth}%`,
                                    backgroundColor:
                                      'var(--link-color)',
                                  }}
                                />
                                {/* Hold segment */}
                                <div
                                  style={{
                                    width: `${holdWidth}%`,
                                    backgroundColor:
                                      'var(--accent-purple, #8b5cf6)',
                                  }}
                                />
                                {/* Sell segment */}
                                <div
                                  style={{
                                    width: `${sellWidth}%`,
                                    backgroundColor:
                                      'var(--accent-red, #ef4444)',
                                  }}
                                />
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          color:
                            expert.avgReturn > 0
                              ? 'var(--accent-green, #22c55e)'
                              : expert.avgReturn < 0
                              ? 'var(--accent-red, #ef4444)'
                              : 'var(--text-secondary)',
                          fontWeight: 700,
                        }}
                      >
                        {expert.avgReturn > 0
                          ? `+${expert.avgReturn.toFixed(2)}%`
                          : `${expert.avgReturn.toFixed(2)}%`}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalExperts > itemsPerPage && (
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
            style={{
              padding: '2px 8px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={14} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Page</span>
            <select
              value={currentPage}
              onChange={(e) => handlePageChange(Number(e.target.value))}
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
            style={{
              padding: '2px 8px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Experts;


