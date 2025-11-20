import React from 'react';
import '../styles/FilterPanel.css';

const FilterPanel = ({ filters, setFilters, filterOptions, activeTab, setActiveTab }) => {
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const renderDescriptiveFilters = () => (
    <div className="filter-grid">
      <div className="filter-item">
        <label>Exchange</label>
        <select 
          value={filters.exchange || 'Any'}
          onChange={(e) => handleFilterChange('exchange', e.target.value)}
        >
          {filterOptions.exchange.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Index</label>
        <select 
          value={filters.index || 'Any'}
          onChange={(e) => handleFilterChange('index', e.target.value)}
        >
          {filterOptions.index.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Sector</label>
        <select 
          value={filters.sector || 'Any'}
          onChange={(e) => handleFilterChange('sector', e.target.value)}
        >
          {filterOptions.sector.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Industry</label>
        <select 
          value={filters.industry || 'Any'}
          onChange={(e) => handleFilterChange('industry', e.target.value)}
        >
          {filterOptions.industry.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Country</label>
        <select 
          value={filters.country || 'Any'}
          onChange={(e) => handleFilterChange('country', e.target.value)}
        >
          {filterOptions.country.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Market Cap.</label>
        <select 
          value={filters.marketCap || 'Any'}
          onChange={(e) => handleFilterChange('marketCap', e.target.value)}
        >
          {filterOptions.marketCap.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Dividend Yield</label>
        <select 
          value={filters.dividendYield || 'Any'}
          onChange={(e) => handleFilterChange('dividendYield', e.target.value)}
        >
          {filterOptions.dividendYield.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Short Float</label>
        <select 
          value={filters.shortFloat || 'Any'}
          onChange={(e) => handleFilterChange('shortFloat', e.target.value)}
        >
          {filterOptions.shortFloat.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Analyst Recom.</label>
        <select 
          value={filters.analystRecom || 'Any'}
          onChange={(e) => handleFilterChange('analystRecom', e.target.value)}
        >
          {filterOptions.analystRecom.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Option/Short</label>
        <select 
          value={filters.optionShort || 'Any'}
          onChange={(e) => handleFilterChange('optionShort', e.target.value)}
        >
          {filterOptions.optionShort.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Earnings Date</label>
        <select 
          value={filters.earningsDate || 'Any'}
          onChange={(e) => handleFilterChange('earningsDate', e.target.value)}
        >
          {filterOptions.earningsDate.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Average Volume</label>
        <select 
          value={filters.averageVolume || 'Any'}
          onChange={(e) => handleFilterChange('averageVolume', e.target.value)}
        >
          {filterOptions.averageVolume.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Relative Volume</label>
        <select 
          value={filters.relativeVolume || 'Any'}
          onChange={(e) => handleFilterChange('relativeVolume', e.target.value)}
        >
          {filterOptions.relativeVolume.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Current Volume</label>
        <select 
          value={filters.currentVolume || 'Any'}
          onChange={(e) => handleFilterChange('currentVolume', e.target.value)}
        >
          {filterOptions.currentVolume.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Price</label>
        <select 
          value={filters.price || 'Any'}
          onChange={(e) => handleFilterChange('price', e.target.value)}
        >
          {filterOptions.price.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Target Price</label>
        <select 
          value={filters.targetPrice || 'Any'}
          onChange={(e) => handleFilterChange('targetPrice', e.target.value)}
        >
          {filterOptions.targetPrice.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>IPO Date</label>
        <select 
          value={filters.ipoDate || 'Any'}
          onChange={(e) => handleFilterChange('ipoDate', e.target.value)}
        >
          {filterOptions.ipoDate.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Shares Outstanding</label>
        <select 
          value={filters.sharesOutstanding || 'Any'}
          onChange={(e) => handleFilterChange('sharesOutstanding', e.target.value)}
        >
          {filterOptions.sharesOutstanding.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Float</label>
        <select 
          value={filters.float || 'Any'}
          onChange={(e) => handleFilterChange('float', e.target.value)}
        >
          {filterOptions.float.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderFundamentalFilters = () => (
    <div className="filter-grid">
      <div className="filter-item">
        <label>P/E</label>
        <select><option>Any</option><option>Low (&lt;15)</option><option>High (&gt;50)</option><option>Under 5</option><option>Under 10</option><option>Under 15</option><option>Under 20</option><option>Under 25</option><option>Under 30</option><option>Over 5</option><option>Over 10</option><option>Over 15</option><option>Over 20</option><option>Over 25</option><option>Over 30</option><option>Over 40</option><option>Over 50</option></select>
      </div>
      <div className="filter-item">
        <label>Forward P/E</label>
        <select><option>Any</option><option>Low (&lt;15)</option><option>High (&gt;50)</option><option>Under 10</option><option>Under 15</option><option>Under 20</option><option>Over 10</option><option>Over 15</option><option>Over 20</option></select>
      </div>
      <div className="filter-item">
        <label>PEG</label>
        <select><option>Any</option><option>Low (&lt;1)</option><option>High (&gt;2)</option><option>Under 1</option><option>Under 2</option><option>Under 3</option><option>Over 1</option><option>Over 2</option><option>Over 3</option></select>
      </div>
      <div className="filter-item">
        <label>P/S</label>
        <select><option>Any</option><option>Low (&lt;1)</option><option>High (&gt;10)</option><option>Under 1</option><option>Under 2</option><option>Under 3</option><option>Under 4</option><option>Under 5</option><option>Over 1</option><option>Over 2</option><option>Over 3</option><option>Over 5</option><option>Over 10</option></select>
      </div>
      <div className="filter-item">
        <label>P/B</label>
        <select><option>Any</option><option>Low (&lt;1)</option><option>High (&gt;5)</option><option>Under 1</option><option>Under 2</option><option>Under 3</option><option>Under 5</option><option>Over 1</option><option>Over 2</option><option>Over 3</option><option>Over 5</option><option>Over 10</option></select>
      </div>
      <div className="filter-item">
        <label>P/C</label>
        <select><option>Any</option><option>Low (&lt;5)</option><option>High (&gt;50)</option><option>Under 5</option><option>Under 10</option><option>Under 15</option><option>Under 20</option><option>Over 5</option><option>Over 10</option><option>Over 20</option><option>Over 50</option></select>
      </div>
      <div className="filter-item">
        <label>P/FCF</label>
        <select><option>Any</option><option>Low (&lt;15)</option><option>High (&gt;50)</option><option>Under 10</option><option>Under 15</option><option>Under 20</option><option>Under 25</option><option>Over 10</option><option>Over 15</option><option>Over 20</option><option>Over 50</option></select>
      </div>
      <div className="filter-item">
        <label>EPS (ttm)</label>
        <select><option>Any</option><option>Positive (&gt;0)</option><option>Negative (&lt;0)</option><option>Positive this Year</option><option>Positive next Year</option><option>Under 0</option><option>Over 0</option><option>Over $1</option><option>Over $2</option><option>Over $5</option></select>
      </div>
      <div className="filter-item">
        <label>EPS Growth This Year</label>
        <select><option>Any</option><option>Positive (&gt;0%)</option><option>Negative (&lt;0%)</option><option>Over 5%</option><option>Over 10%</option><option>Over 15%</option><option>Over 20%</option><option>Over 25%</option><option>Over 30%</option><option>Under -30%</option><option>Under -20%</option><option>Under -10%</option></select>
      </div>
      <div className="filter-item">
        <label>EPS Growth Next Year</label>
        <select><option>Any</option><option>Positive (&gt;0%)</option><option>Negative (&lt;0%)</option><option>Over 5%</option><option>Over 10%</option><option>Over 15%</option><option>Over 20%</option><option>Over 25%</option></select>
      </div>
      <div className="filter-item">
        <label>Sales Growth Past 5 Years</label>
        <select><option>Any</option><option>Positive (&gt;0%)</option><option>Negative (&lt;0%)</option><option>Over 5%</option><option>Over 10%</option><option>Over 15%</option><option>Over 20%</option><option>Over 25%</option></select>
      </div>
      <div className="filter-item">
        <label>Return on Assets</label>
        <select><option>Any</option><option>Positive (&gt;0%)</option><option>Negative (&lt;0%)</option><option>Very Positive (&gt;15%)</option><option>Very Negative (&lt;-15%)</option><option>Over 5%</option><option>Over 10%</option><option>Over 15%</option><option>Over 20%</option><option>Over 25%</option></select>
      </div>
      <div className="filter-item">
        <label>Return on Equity</label>
        <select><option>Any</option><option>Positive (&gt;0%)</option><option>Negative (&lt;0%)</option><option>Very Positive (&gt;15%)</option><option>Very Negative (&lt;-15%)</option><option>Over 5%</option><option>Over 10%</option><option>Over 15%</option><option>Over 20%</option><option>Over 25%</option><option>Over 30%</option></select>
      </div>
      <div className="filter-item">
        <label>Return on Investment</label>
        <select><option>Any</option><option>Positive (&gt;0%)</option><option>Negative (&lt;0%)</option><option>Very Positive (&gt;25%)</option><option>Over 5%</option><option>Over 10%</option><option>Over 15%</option><option>Over 20%</option><option>Over 25%</option></select>
      </div>
      <div className="filter-item">
        <label>Current Ratio</label>
        <select><option>Any</option><option>High (&gt;3)</option><option>Low (&lt;1)</option><option>Under 1</option><option>Over 0.5</option><option>Over 1</option><option>Over 1.5</option><option>Over 2</option><option>Over 3</option></select>
      </div>
      <div className="filter-item">
        <label>Quick Ratio</label>
        <select><option>Any</option><option>High (&gt;3)</option><option>Low (&lt;0.5)</option><option>Under 0.5</option><option>Under 1</option><option>Over 0.5</option><option>Over 1</option><option>Over 2</option><option>Over 3</option></select>
      </div>
      <div className="filter-item">
        <label>LT Debt/Equity</label>
        <select><option>Any</option><option>High (&gt;0.5)</option><option>Low (&lt;0.1)</option><option>Under 0.1</option><option>Under 0.2</option><option>Under 0.3</option><option>Under 0.5</option><option>Under 1</option><option>Over 0.1</option><option>Over 0.2</option><option>Over 0.5</option><option>Over 1</option></select>
      </div>
      <div className="filter-item">
        <label>Debt/Equity</label>
        <select><option>Any</option><option>High (&gt;0.5)</option><option>Low (&lt;0.1)</option><option>Under 0.1</option><option>Under 0.2</option><option>Under 0.3</option><option>Under 0.5</option><option>Under 1</option><option>Over 0.1</option><option>Over 0.5</option><option>Over 1</option></select>
      </div>
      <div className="filter-item">
        <label>Gross Margin</label>
        <select><option>Any</option><option>Positive (&gt;0%)</option><option>Negative (&lt;0%)</option><option>High (&gt;50%)</option><option>Under 0%</option><option>Over 0%</option><option>Over 10%</option><option>Over 20%</option><option>Over 30%</option><option>Over 40%</option><option>Over 50%</option><option>Over 60%</option><option>Over 70%</option><option>Over 80%</option><option>Over 90%</option></select>
      </div>
      <div className="filter-item">
        <label>Operating Margin</label>
        <select><option>Any</option><option>Positive (&gt;0%)</option><option>Negative (&lt;0%)</option><option>Very Positive (&gt;20%)</option><option>Very Negative (&lt;-20%)</option><option>Under 0%</option><option>Over 0%</option><option>Over 5%</option><option>Over 10%</option><option>Over 15%</option><option>Over 20%</option><option>Over 25%</option><option>Over 30%</option></select>
      </div>
      <div className="filter-item">
        <label>Net Profit Margin</label>
        <select><option>Any</option><option>Positive (&gt;0%)</option><option>Negative (&lt;0%)</option><option>Very Positive (&gt;20%)</option><option>Very Negative (&lt;-20%)</option><option>Under 0%</option><option>Over 0%</option><option>Over 5%</option><option>Over 10%</option><option>Over 15%</option><option>Over 20%</option><option>Over 25%</option></select>
      </div>
    </div>
  );

  const renderTechnicalFilters = () => (
    <div className="filter-grid">
      <div className="filter-item">
        <label>Beta</label>
        <select><option>Any</option><option>Under 0</option><option>Under 0.5</option><option>Under 1</option><option>Under 1.5</option><option>Under 2</option><option>Over 0</option><option>Over 0.5</option><option>Over 1</option><option>Over 1.5</option><option>Over 2</option><option>Over 2.5</option><option>Over 3</option><option>Over 4</option><option>0 to 0.5</option><option>0.5 to 1</option><option>1 to 1.5</option><option>1.5 to 2</option><option>2 to 3</option></select>
      </div>
      <div className="filter-item">
        <label>Average True Range</label>
        <select><option>Any</option><option>Over 0.25</option><option>Over 0.5</option><option>Over 0.75</option><option>Over 1</option><option>Over 1.5</option><option>Over 2</option><option>Over 2.5</option><option>Over 3</option><option>Over 4</option><option>Over 5</option><option>Under 0.5</option><option>Under 1</option><option>Under 1.5</option><option>Under 2</option><option>Under 3</option><option>Under 4</option></select>
      </div>
      <div className="filter-item">
        <label>20-Day SMA</label>
        <select><option>Any</option><option>Price above SMA20</option><option>Price below SMA20</option><option>Price crossed SMA20 above</option><option>Price crossed SMA20 below</option><option>SMA20 crossed SMA50 above</option><option>SMA20 crossed SMA50 below</option><option>SMA20 above SMA50</option><option>SMA20 below SMA50</option></select>
      </div>
      <div className="filter-item">
        <label>50-Day SMA</label>
        <select><option>Any</option><option>Price above SMA50</option><option>Price below SMA50</option><option>Price crossed SMA50 above</option><option>Price crossed SMA50 below</option><option>SMA50 crossed SMA100 above</option><option>SMA50 crossed SMA100 below</option><option>SMA50 above SMA100</option><option>SMA50 below SMA100</option><option>SMA50 crossed SMA200 above</option><option>SMA50 crossed SMA200 below</option><option>SMA50 above SMA200</option><option>SMA50 below SMA200</option></select>
      </div>
      <div className="filter-item">
        <label>200-Day SMA</label>
        <select><option>Any</option><option>Price above SMA200</option><option>Price below SMA200</option><option>Price crossed SMA200 above</option><option>Price crossed SMA200 below</option><option>SMA200 crossed SMA50 above</option><option>SMA200 crossed SMA50 below</option><option>SMA200 above SMA50</option><option>SMA200 below SMA50</option></select>
      </div>
      <div className="filter-item">
        <label>52-Week High</label>
        <select><option>Any</option><option>0-3% below High</option><option>0-5% below High</option><option>0-10% below High</option><option>5-10% below High</option><option>10-15% below High</option><option>15-20% below High</option><option>20-30% below High</option><option>30-50% below High</option><option>50-70% below High</option><option>70-100% below High</option><option>New High</option></select>
      </div>
      <div className="filter-item">
        <label>52-Week Low</label>
        <select><option>Any</option><option>0-3% above Low</option><option>0-5% above Low</option><option>0-10% above Low</option><option>5-10% above Low</option><option>10-20% above Low</option><option>20-30% above Low</option><option>30-50% above Low</option><option>50-100% above Low</option><option>100-200% above Low</option><option>200-300% above Low</option><option>300-500% above Low</option><option>New Low</option></select>
      </div>
      <div className="filter-item">
        <label>RSI (14)</label>
        <select><option>Any</option><option>Overbought (90)</option><option>Overbought (80)</option><option>Overbought (70)</option><option>Overbought (60)</option><option>Oversold (40)</option><option>Oversold (30)</option><option>Oversold (20)</option><option>Oversold (10)</option><option>Not Overbought (&lt;60)</option><option>Not Overbought (&lt;50)</option><option>Not Oversold (&gt;50)</option><option>Not Oversold (&gt;40)</option></select>
      </div>
      <div className="filter-item">
        <label>Gap</label>
        <select><option>Any</option><option>Up</option><option>Up 0%</option><option>Up 1%</option><option>Up 2%</option><option>Up 3%</option><option>Up 4%</option><option>Up 5%</option><option>Up 10%</option><option>Up 15%</option><option>Down</option><option>Down 0%</option><option>Down 1%</option><option>Down 2%</option><option>Down 3%</option><option>Down 5%</option><option>Down 10%</option></select>
      </div>
      <div className="filter-item">
        <label>Candlestick</label>
        <select><option>Any</option><option>Long Lower Shadow</option><option>Long Upper Shadow</option><option>Hammer</option><option>Inverted Hammer</option><option>Spinning Top White</option><option>Spinning Top Black</option><option>Doji</option><option>Dragonfly Doji</option><option>Gravestone Doji</option><option>Marubozu White</option><option>Marubozu Black</option></select>
      </div>
      <div className="filter-item">
        <label>Change</label>
        <select><option>Any</option><option>Up</option><option>Up 1%</option><option>Up 2%</option><option>Up 3%</option><option>Up 4%</option><option>Up 5%</option><option>Up 10%</option><option>Up 15%</option><option>Up 20%</option><option>Down</option><option>Down 1%</option><option>Down 2%</option><option>Down 3%</option><option>Down 4%</option><option>Down 5%</option><option>Down 10%</option><option>Down 15%</option><option>Down 20%</option></select>
      </div>
      <div className="filter-item">
        <label>Change from Open</label>
        <select><option>Any</option><option>Up</option><option>Up 1%</option><option>Up 2%</option><option>Up 3%</option><option>Up 4%</option><option>Up 5%</option><option>Down</option><option>Down 1%</option><option>Down 2%</option><option>Down 3%</option><option>Down 5%</option></select>
      </div>
    </div>
  );

  const renderNewsFilters = () => (
    <div className="filter-grid">
      <div className="filter-item">
        <label>Latest News</label>
        <select><option>Any</option><option>In the last hour</option><option>In the last day</option><option>In the last week</option><option>In the last month</option></select>
      </div>
      <div className="filter-item">
        <label>News Sentiment</label>
        <select><option>Any</option><option>Very Positive</option><option>Positive</option><option>Neutral</option><option>Negative</option><option>Very Negative</option></select>
      </div>
    </div>
  );

  const renderETFFilters = () => (
    <div className="filter-grid">
      <div className="filter-item">
        <label>ETF Category</label>
        <select><option>Any</option><option>Large Cap</option><option>Mid Cap</option><option>Small Cap</option><option>Growth</option><option>Value</option><option>Dividend</option><option>International</option><option>Sector</option><option>Bond</option><option>Commodity</option></select>
      </div>
      <div className="filter-item">
        <label>ETF Type</label>
        <select><option>Any</option><option>Equity</option><option>Fixed Income</option><option>Commodity</option><option>Currency</option></select>
      </div>
      <div className="filter-item">
        <label>Assets Under Management</label>
        <select><option>Any</option><option>Over $10M</option><option>Over $50M</option><option>Over $100M</option><option>Over $500M</option><option>Over $1B</option><option>Over $5B</option><option>Over $10B</option></select>
      </div>
      <div className="filter-item">
        <label>Net Expense Ratio</label>
        <select><option>Any</option><option>Under 0.10%</option><option>Under 0.25%</option><option>Under 0.50%</option><option>Under 0.75%</option><option>Under 1.00%</option><option>Over 1.00%</option></select>
      </div>
    </div>
  );

  return (
    <div className="filter-panel">
      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={activeTab === 'descriptive' ? 'tab-active' : ''}
          onClick={() => setActiveTab('descriptive')}
        >
          Descriptive
        </button>
        <button 
          className={activeTab === 'fundamental' ? 'tab-active' : ''}
          onClick={() => setActiveTab('fundamental')}
        >
          Fundamental
        </button>
        <button 
          className={activeTab === 'technical' ? 'tab-active' : ''}
          onClick={() => setActiveTab('technical')}
        >
          Technical
        </button>
        <button 
          className={activeTab === 'news' ? 'tab-active' : ''}
          onClick={() => setActiveTab('news')}
        >
          News
        </button>
        <button 
          className={activeTab === 'etf' ? 'tab-active' : ''}
          onClick={() => setActiveTab('etf')}
        >
          ETF
        </button>
        <button 
          className={activeTab === 'all' ? 'tab-active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
      </div>

      {/* Filter Content */}
      <div className="filter-content">
        {activeTab === 'descriptive' && renderDescriptiveFilters()}
        {activeTab === 'fundamental' && renderFundamentalFilters()}
        {activeTab === 'technical' && renderTechnicalFilters()}
        {activeTab === 'news' && renderNewsFilters()}
        {activeTab === 'etf' && renderETFFilters()}
        {activeTab === 'all' && (
          <>
            {renderDescriptiveFilters()}
            <div className="filter-separator">Fundamental Filters</div>
            {renderFundamentalFilters()}
            <div className="filter-separator">Technical Filters</div>
            {renderTechnicalFilters()}
          </>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;