import React from 'react';
import '../styles/FilterPanel.css';

interface NewsFilterPanelProps {
  filters: any;
  setFilters: (filters: any) => void;
}

const NewsFilterPanel = ({ filters, setFilters }: NewsFilterPanelProps) => {
  const handleFilterChange = (filterName: string, value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      [filterName]: value
    }));
  };

  const dateOptions = [
    'Any',
    'Today',
    'Last 7 Days',
    'Last 30 Days',
    'Last 90 Days',
    'This Week',
    'This Month',
    'This Year'
  ];

  const sourceOptions = [
    'Any',
    'Reuters',
    'Bloomberg',
    'CNBC',
    'Wall Street Journal',
    'MarketWatch',
    'Financial Times',
    'Yahoo Finance',
    'Seeking Alpha',
    'Benzinga'
  ];

  return (
    <div className="filter-panel">
      <div className="filter-content">
        <div className="filter-grid">
          <div className="filter-item">
            <label>Date Range</label>
            <select 
              value={filters.dateRange || 'Any'}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              {dateOptions.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Source</label>
            <select 
              value={filters.source || 'Any'}
              onChange={(e) => handleFilterChange('source', e.target.value)}
            >
              {sourceOptions.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Ticker</label>
            <input
              type="text"
              placeholder="e.g., AAPL, TSLA"
              value={filters.ticker || ''}
              onChange={(e) => handleFilterChange('ticker', e.target.value)}
              style={{
                padding: '3px 6px',
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '11px',
                width: '150px'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsFilterPanel;

