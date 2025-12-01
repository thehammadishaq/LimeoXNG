import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import '../styles/FilterPanel.css';

interface FilterPanelProps {
  filters: any;
  setFilters: (filters: any) => void;
  filterOptions: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const FilterPanel = ({ filters, setFilters, filterOptions, activeTab, setActiveTab }: FilterPanelProps) => {
  const handleFilterChange = (filterName: string, value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      [filterName]: value
    }));
  };

  const renderValuationFilters = () => (
    <div className="filter-grid">
      <div className="filter-item" style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <strong>Valuation Filters (Is the stock expensive or cheap?)</strong>
      </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            P/E (TTM)
            <span
              className="tooltip-icon"
              title={`Price-to-Earnings (TTM) shows how much investors are willing to pay per dollar of the company's earnings over the last 12 months.\nA lower P/E may indicate undervaluation, while a higher P/E can mean growth expectations or overvaluation.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={filters.peMax ?? ''}
          onChange={(e) => handleFilterChange('peMax', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.peOperator ?? 'lte'}
            onChange={(e) => handleFilterChange('peOperator', e.target.value)}
          >
            <option value="lte">Less than or equal (≤)</option>
            <option value="lt">Less than (&lt;)</option>
            <option value="gte">Greater than or equal (≥)</option>
            <option value="gt">Greater than (&gt;)</option>
            <option value="eq">Equal (=)</option>
            <option value="ne">Not equal (≠)</option>
          </select>
          <button
            type="button"
            className="sort-direction-toggle"
            onClick={() => handleFilterChange('peSortDirection', filters.peSortDirection === 'Asc' ? 'Desc' : 'Asc')}
            title={filters.peSortDirection === 'Asc' ? 'Ascending' : 'Descending'}
          >
            {filters.peSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>
      </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Forward P/E
            <span
              className="tooltip-icon"
              title={`Forward Price-to-Earnings uses expected future earnings instead of past earnings.\nIt helps investors understand how the stock is valued based on projected profitability and future growth.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={filters.forwardPeMax ?? ''}
          onChange={(e) => handleFilterChange('forwardPeMax', e.target.value)}
          placeholder="Any"
        />
        <div className="filter-selects-container">
          <select
            className="operator-select"
            value={filters.forwardPeOperator ?? 'lte'}
            onChange={(e) => handleFilterChange('forwardPeOperator', e.target.value)}
          >
            <option value="lte">Less than or equal (≤)</option>
            <option value="lt">Less than (&lt;)</option>
            <option value="gte">Greater than or equal (≥)</option>
            <option value="gt">Greater than (&gt;)</option>
            <option value="eq">Equal (=)</option>
            <option value="ne">Not equal (≠)</option>
          </select>
          <button
            type="button"
            className="sort-direction-toggle"
            onClick={() => handleFilterChange('forwardPeSortDirection', filters.forwardPeSortDirection === 'Asc' ? 'Desc' : 'Asc')}
            title={filters.forwardPeSortDirection === 'Asc' ? 'Ascending' : 'Descending'}
          >
            {filters.forwardPeSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>
      </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            PEG Ratio
            <span
              className="tooltip-icon"
              title={`Price/Earnings-to-Growth (PEG) Ratio adjusts the P/E ratio based on the company's expected earnings growth rate.\nA PEG under about 1.5 often suggests the stock may be undervalued relative to its growth potential.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={filters.pegMax ?? ''}
          onChange={(e) => handleFilterChange('pegMax', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.pegOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('pegOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('pegSortDirection', filters.pegSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.pegSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.pegSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            P/B
            <span
              className="tooltip-icon"
              title={`Price-to-Book (P/B) compares the company's market value to its book value (net assets).\nA lower P/B can signal undervaluation, especially for asset-heavy businesses.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={filters.pbMax ?? ''}
          onChange={(e) => handleFilterChange('pbMax', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.pbOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('pbOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('pbSortDirection', filters.pbSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.pbSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.pbSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            P/S
            <span
              className="tooltip-icon"
              title={`Price-to-Sales (P/S) measures how much investors pay for each dollar of revenue.\nIt is useful for evaluating early-stage or low-profit companies where earnings may be inconsistent.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={filters.psMax ?? ''}
          onChange={(e) => handleFilterChange('psMax', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.psOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('psOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('psSortDirection', filters.psSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.psSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.psSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            EV/EBITDA
            <span
              className="tooltip-icon"
              title={`Enterprise Value to EBITDA shows how the market values the company relative to its operating earnings.\nIt is commonly used to compare companies because it ignores differences in capital structure, taxes, and depreciation.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={filters.evEbitdaMax ?? ''}
          onChange={(e) => handleFilterChange('evEbitdaMax', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.evEbitdaOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('evEbitdaOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('evEbitdaSortDirection', filters.evEbitdaSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.evEbitdaSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.evEbitdaSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>
      </div>
    </div>
  );

  const renderProfitabilityFilters = () => (
    <div className="filter-grid">
      <div className="filter-item" style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <strong>Profitability Filters (How well does the company turn revenue into profit?)</strong>
      </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Net Profit Margin
            <span
              className="tooltip-icon"
              title={`Net Profit Margin shows how much of each dollar of revenue is kept as net income after all expenses.\nHigher margins generally indicate a more profitable, efficient business.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.netMarginMin ?? ''}
          onChange={(e) => handleFilterChange('netMarginMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.netMarginOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('netMarginOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('netMarginSortDirection', filters.netMarginSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.netMarginSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.netMarginSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Operating Margin
            <span
              className="tooltip-icon"
              title={`Operating Margin measures profit after operating expenses but before interest and taxes.\nIt shows how efficiently the core business is run.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.operMarginMin ?? ''}
          onChange={(e) => handleFilterChange('operMarginMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.operMarginOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('operMarginOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('operMarginSortDirection', filters.operMarginSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.operMarginSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.operMarginSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Gross Margin
            <span
              className="tooltip-icon"
              title={`Gross Margin shows profit after direct production or service costs.\nHigher gross margins mean the company has more room to cover overhead and still earn profit.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.grossMarginMin ?? ''}
          onChange={(e) => handleFilterChange('grossMarginMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.grossMarginOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('grossMarginOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('grossMarginSortDirection', filters.grossMarginSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.grossMarginSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.grossMarginSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            ROE
            <span
              className="tooltip-icon"
              title={`Return on Equity (ROE) shows how effectively the company generates profit from shareholders' equity.\nMany investors look for ROE above about 15% as a sign of strong profitability.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.roeMin ?? ''}
          onChange={(e) => handleFilterChange('roeMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.roeOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('roeOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('roeSortDirection', filters.roeSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.roeSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.roeSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            ROA
            <span
              className="tooltip-icon"
              title={`Return on Assets (ROA) shows how efficiently the company uses its assets to generate profit.\nAs a rough guide, ROA above about 8% is often considered healthy for many industries.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.roaMin ?? ''}
          onChange={(e) => handleFilterChange('roaMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.roaOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('roaOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('roaSortDirection', filters.roaSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.roaSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.roaSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            ROI
            <span
              className="tooltip-icon"
              title={`Return on Investment (ROI) captures how much profit the company generates relative to the capital invested.\nHigher ROI indicates better capital allocation and more efficient use of resources.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.roiMin ?? ''}
          onChange={(e) => handleFilterChange('roiMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.roiOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('roiOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('roiSortDirection', filters.roiSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.roiSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.roiSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>
      </div>
    </div>
  );

  const renderGrowthFilters = () => (
    <div className="filter-grid">
      <div className="filter-item" style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <strong>Growth Filters (How strong does the company’s future growth look?)</strong>
      </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Revenue Growth YoY
            <span
              className="tooltip-icon"
              title={`Revenue Growth YoY measures how quickly the company's sales are growing versus the same period a year ago.\nConsistently positive growth suggests the business is expanding rather than shrinking.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.revGrowthYoyMin ?? ''}
          onChange={(e) => handleFilterChange('revGrowthYoyMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.revGrowthYoyOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('revGrowthYoyOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('revGrowthYoySortDirection', filters.revGrowthYoySortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.revGrowthYoySortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.revGrowthYoySortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Revenue Growth 3Y CAGR
            <span
              className="tooltip-icon"
              title={`Revenue Growth 3Y shows the compound annual growth rate of sales over the last three years.\nIt smooths out short-term noise and highlights medium-term growth trends.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.revGrowth3YMin ?? ''}
          onChange={(e) => handleFilterChange('revGrowth3YMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.revGrowth3YOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('revGrowth3YOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('revGrowth3YSortDirection', filters.revGrowth3YSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.revGrowth3YSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.revGrowth3YSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Revenue Growth 5Y CAGR
            <span
              className="tooltip-icon"
              title={`Revenue Growth 5Y shows how fast sales have grown per year on average over the last five years.\nHigher long-term growth can signal a durable, expanding business.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.revGrowth5YMin ?? ''}
          onChange={(e) => handleFilterChange('revGrowth5YMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.revGrowth5YOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('revGrowth5YOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('revGrowth5YSortDirection', filters.revGrowth5YSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.revGrowth5YSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.revGrowth5YSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            EPS Growth YoY
            <span
              className="tooltip-icon"
              title={`EPS Growth YoY tracks how quickly earnings per share are growing compared to last year.\nPositive EPS growth suggests improving profitability for shareholders.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.epsGrowthYoyMin ?? ''}
          onChange={(e) => handleFilterChange('epsGrowthYoyMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.epsGrowthYoyOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('epsGrowthYoyOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('epsGrowthYoySortDirection', filters.epsGrowthYoySortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.epsGrowthYoySortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.epsGrowthYoySortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            EPS Growth 3Y CAGR
            <span
              className="tooltip-icon"
              title={`EPS Growth 3Y shows the compound annual growth rate of earnings per share over three years.\nIt helps you see whether earnings are trending up over a full cycle, not just one year.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.epsGrowth3YMin ?? ''}
          onChange={(e) => handleFilterChange('epsGrowth3YMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.epsGrowth3YOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('epsGrowth3YOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('epsGrowth3YSortDirection', filters.epsGrowth3YSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.epsGrowth3YSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.epsGrowth3YSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            EPS Growth 5Y CAGR
            <span
              className="tooltip-icon"
              title={`EPS Growth 5Y focuses on long-term earnings power.\nCompanies with solid 5-year EPS growth often compound shareholder value over time.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.epsGrowth5YMin ?? ''}
          onChange={(e) => handleFilterChange('epsGrowth5YMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.epsGrowth5YOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('epsGrowth5YOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('epsGrowth5YSortDirection', filters.epsGrowth5YSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.epsGrowth5YSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.epsGrowth5YSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Cash Flow Growth 5Y
            <span
              className="tooltip-icon"
              title={`Cash Flow Growth (often measured via free cash flow CAGR) shows how fast real cash generation is increasing.\nPositive and rising cash flow growth supports dividends, buybacks, and reinvestment.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.cashFlowGrowthMin ?? ''}
          onChange={(e) => handleFilterChange('cashFlowGrowthMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.cashFlowGrowthOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('cashFlowGrowthOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('cashFlowGrowthSortDirection', filters.cashFlowGrowthSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.cashFlowGrowthSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.cashFlowGrowthSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            EBITDA Growth 5Y
            <span
              className="tooltip-icon"
              title={`EBITDA Growth 5Y tracks the long-term growth of operating earnings before interest, taxes, depreciation and amortization.\nStronger EBITDA growth usually points to a business that is scaling successfully.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.ebitdaGrowthMin ?? ''}
          onChange={(e) => handleFilterChange('ebitdaGrowthMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.ebitdaGrowthOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('ebitdaGrowthOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('ebitdaGrowthSortDirection', filters.ebitdaGrowthSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.ebitdaGrowthSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.ebitdaGrowthSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>
      </div>
    </div>
  );

  const renderFinancialHealthFilters = () => (
    <div className="filter-grid">
      <div className="filter-item" style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <strong>Financial Health Filters (Is the company stable or risky?)</strong>
      </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Debt / Equity
            <span
              className="tooltip-icon"
              title={`Debt-to-Equity (D/E) compares total debt to shareholders' equity.\nLower D/E usually means a safer balance sheet; very high D/E can signal higher financial risk.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={filters.deRatioMax ?? ''}
          onChange={(e) => handleFilterChange('deRatioMax', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.deRatioOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('deRatioOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('deRatioSortDirection', filters.deRatioSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.deRatioSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.deRatioSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Interest Coverage
            <span
              className="tooltip-icon"
              title={`Interest Coverage Ratio shows how easily the company can pay interest from operating earnings.\nValues above about 5x are generally considered comfortable, while very low values can be a warning sign.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={filters.interestCoverageMin ?? ''}
          onChange={(e) => handleFilterChange('interestCoverageMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.interestCoverageOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('interestCoverageOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('interestCoverageSortDirection', filters.interestCoverageSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.interestCoverageSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.interestCoverageSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Current Ratio
            <span
              className="tooltip-icon"
              title={`Current Ratio compares current assets to current liabilities.\nValues above about 1.5 are often seen as a sign of comfortable short‑term liquidity (not too tight).`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={filters.currentRatioMin ?? ''}
          onChange={(e) => handleFilterChange('currentRatioMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.currentRatioOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('currentRatioOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('currentRatioSortDirection', filters.currentRatioSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.currentRatioSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.currentRatioSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Quick Ratio
            <span
              className="tooltip-icon"
              title={`Quick Ratio is a stricter liquidity test that excludes inventory.\nA quick ratio above 1 generally means the company can cover short‑term obligations with its most liquid assets.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={filters.quickRatioMin ?? ''}
          onChange={(e) => handleFilterChange('quickRatioMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.quickRatioOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('quickRatioOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('quickRatioSortDirection', filters.quickRatioSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.quickRatioSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.quickRatioSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>
      </div>
    </div>
  );

  const renderCashFlowFilters = () => (
    <div className="filter-grid">
      <div className="filter-item" style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <strong>Cash Flow Filters (How strong is the company’s cash generation?)</strong>
      </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Free Cash Flow Per Share
            <span
              className="tooltip-icon"
              title={`Free Cash Flow Per Share shows how much real cash the business generates for each share.\nHigher FCF per share gives the company more flexibility for dividends, buybacks and reinvestment.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.fcfPerShareMin ?? ''}
          onChange={(e) => handleFilterChange('fcfPerShareMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.fcfPerShareOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('fcfPerShareOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('fcfPerShareSortDirection', filters.fcfPerShareSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.fcfPerShareSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.fcfPerShareSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            EV / Free Cash Flow
            <span
              className="tooltip-icon"
              title={`EV / Free Cash Flow compares the company's enterprise value to the free cash it generates each year.\nLower EV/FCF multiples (for example under 20–25x) can indicate more attractive cash-flow valuation.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.evFcfMax ?? ''}
          onChange={(e) => handleFilterChange('evFcfMax', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.evFcfOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('evFcfOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('evFcfSortDirection', filters.evFcfSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.evFcfSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.evFcfSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            FCF Growth 5Y
            <span
              className="tooltip-icon"
              title={`Free Cash Flow Growth (5Y) shows how fast the company's free cash flow is compounding over time.\nPositive and solid FCF growth supports long‑term value creation.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.cashFlowGrowthMin ?? ''}
          onChange={(e) => handleFilterChange('cashFlowGrowthMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.cashFlowGrowthOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('cashFlowGrowthOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('cashFlowGrowthSortDirection', filters.cashFlowGrowthSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.cashFlowGrowthSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.cashFlowGrowthSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>
      </div>
    </div>
  );

  const renderPriceStrengthFilters = () => (
    <div className="filter-grid">
      <div className="filter-item" style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <strong>Price Strength Filters (What does the stock trend look like?)</strong>
      </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            YTD Return
            <span
              className="tooltip-icon"
              title={`Year-to-Date (YTD) Return shows how much the stock price has moved since the start of the year.\nPositive and higher YTD returns often indicate a strong ongoing trend.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.ytdReturnMin ?? ''}
          onChange={(e) => handleFilterChange('ytdReturnMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.ytdReturnOperator ?? 'gte'}

            onChange={(e) => handleFilterChange('ytdReturnOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('ytdReturnSortDirection', filters.ytdReturnSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.ytdReturnSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.ytdReturnSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            5 Day Return
            <span
              className="tooltip-icon"
              title={`5 Day Return focuses on very short-term momentum.\nUseful for traders looking for stocks that have recently started moving up.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.return5DMin ?? ''}
          onChange={(e) => handleFilterChange('return5DMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.return5DOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('return5DOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('return5DSortDirection', filters.return5DSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.return5DSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.return5DSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            1 Month Return
            <span
              className="tooltip-icon"
              title={`1 Month Return shows the stock's move over the last month.\nHelps identify names in a clear short-term uptrend rather than just a single spike.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.return1MMin ?? ''}
          onChange={(e) => handleFilterChange('return1MMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.return1MOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('return1MOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('return1MSortDirection', filters.return1MSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.return1MSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.return1MSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            3 Month Return
            <span
              className="tooltip-icon"
              title={`3 Month Return focuses on the intermediate trend.\nStocks with strong 3‑month performance are often in sustained uptrends rather than short squeezes.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.return3MMin ?? ''}
          onChange={(e) => handleFilterChange('return3MMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.return3MOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('return3MOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('return3MSortDirection', filters.return3MSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.return3MSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.return3MSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Rel. to S&amp;P 500 (1Y)
            <span
              className="tooltip-icon"
              title={`Price Relative to S&P 500 (1 Year) shows how the stock has performed versus the index.\nPositive values mean the stock has outperformed the S&P 500 over the last year.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.relSp5001YMin ?? ''}
          onChange={(e) => handleFilterChange('relSp5001YMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.relSp5001YOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('relSp5001YOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('relSp5001YSortDirection', filters.relSp5001YSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.relSp5001YSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.relSp5001YSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>
      </div>
    </div>
  );

  const renderLatestCandleFilters = () => (
    <div className="filter-grid">
      <div
        className="filter-item"
        style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--text-secondary)' }}
      >
        <strong>OHLCV Filters</strong>
        <div style={{ marginTop: 4 }}>
          These filters are based on the most recent OHLCV candle saved by the backend cron job
          (intraday price and volume). Once intraday data is exposed to the screener, you can filter
          for things like bullish vs bearish candles, large intraday moves, and volume spikes.
        </div>
      </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Close Price
            <span
              className="tooltip-icon"
              title={`Close price from the latest 1‑minute candle.\nIn future, this will let you keep only stocks trading above a certain intraday price level.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.latestCloseMin ?? ''}
          onChange={(e) => handleFilterChange('latestCloseMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.latestCloseOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('latestCloseOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('latestCloseSortDirection', filters.latestCloseSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.latestCloseSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.latestCloseSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>

        </div>

      <div className="filter-item">
        <label>
          <span className="filter-label-with-tooltip">
            Volume
            <span
              className="tooltip-icon"
              title={`Volume in shares for the latest 1‑minute candle.\nIn future, this will help you find candles with unusually high intraday volume.`}
            >
              ?
            </span>
          </span>
        </label>
        <input
          type="number"
          value={filters.latestVolumeMin ?? ''}
          onChange={(e) => handleFilterChange('latestVolumeMin', e.target.value)}
          placeholder="Any"
        />
                <div className="filter-selects-container">

          <select

                    className="operator-select"
            value={filters.latestVolumeOperator ?? 'lte'}

            onChange={(e) => handleFilterChange('latestVolumeOperator', e.target.value)}

          >

            <option value="lte">Less than or equal (≤)</option>
          <option value="lt">Less than (&lt;)</option>
          <option value="gte">Greater than or equal (≥)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="eq">Equal (=)</option>
          <option value="ne">Not equal (≠)</option>

          </select>

          <button

            type="button"

            className="sort-direction-toggle"

            onClick={() => handleFilterChange('latestVolumeSortDirection', filters.latestVolumeSortDirection === 'Asc' ? 'Desc' : 'Asc')}

            title={filters.latestVolumeSortDirection === 'Asc' ? 'Ascending' : 'Descending'}

          >

            {filters.latestVolumeSortDirection === 'Asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}

          </button>

        </div>
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
          className={activeTab === 'valuation' ? 'tab-active' : ''}
          onClick={() => setActiveTab('valuation')}
        >
          Valuation
        </button>
        <button 
          className={activeTab === 'profitability' ? 'tab-active' : ''}
          onClick={() => setActiveTab('profitability')}
        >
          Profitability
        </button>
        <button 
          className={activeTab === 'growth' ? 'tab-active' : ''}
          onClick={() => setActiveTab('growth')}
        >
          Growth
        </button>
        <button 
          className={activeTab === 'financialHealth' ? 'tab-active' : ''}
          onClick={() => setActiveTab('financialHealth')}
        >
          Financial Health
        </button>
        <button 
          className={activeTab === 'cashflow' ? 'tab-active' : ''}
          onClick={() => setActiveTab('cashflow')}
        >
          Cash Flow
        </button>
        <button 
          className={activeTab === 'priceStrength' ? 'tab-active' : ''}
          onClick={() => setActiveTab('priceStrength')}
        >
          Price Strength
        </button>
        <button 
          className={activeTab === 'latestCandle' ? 'tab-active' : ''}
          onClick={() => setActiveTab('latestCandle')}
        >
          OHLCV
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
        {activeTab === 'valuation' && renderValuationFilters()}
        {activeTab === 'profitability' && renderProfitabilityFilters()}
        {activeTab === 'growth' && renderGrowthFilters()}
        {activeTab === 'financialHealth' && renderFinancialHealthFilters()}
        {activeTab === 'cashflow' && renderCashFlowFilters()}
        {activeTab === 'priceStrength' && renderPriceStrengthFilters()}
        {activeTab === 'latestCandle' && renderLatestCandleFilters()}
        {activeTab === 'all' && (
          <>
            <div className="filter-separator">Valuation Filters</div>
            {renderValuationFilters()}
            <div className="filter-separator">Profitability Filters</div>
            {renderProfitabilityFilters()}
            <div className="filter-separator">Growth Filters</div>
            {renderGrowthFilters()}
            <div className="filter-separator">Financial Health Filters</div>
            {renderFinancialHealthFilters()}
            <div className="filter-separator">Cash Flow Filters</div>
            {renderCashFlowFilters()}
            <div className="filter-separator">Price Strength Filters</div>
            {renderPriceStrengthFilters()}
            <div className="filter-separator">OHLCV</div>
            {renderLatestCandleFilters()}
          </>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;

