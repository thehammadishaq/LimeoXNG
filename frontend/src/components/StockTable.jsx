import React from 'react';
import '../styles/StockTable.css';

const StockTable = ({ stocks, view }) => {
  const renderOverviewView = () => (
    <table className="stock-table">
      <thead>
        <tr>
          <th>No.</th>
          <th>Ticker</th>
          <th>Company</th>
          <th>Sector</th>
          <th>Industry</th>
          <th>Country</th>
          <th>Market Cap</th>
          <th>P/E</th>
          <th>Price</th>
          <th>Change</th>
          <th>Volume</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => (
          <tr key={stock.ticker}>
            <td>{stock.no}</td>
            <td><a href="#" className="ticker-link">{stock.ticker}</a></td>
            <td><a href="#" className="company-link">{stock.company}</a></td>
            <td><a href="#" className="sector-link">{stock.sector}</a></td>
            <td><a href="#" className="industry-link">{stock.industry}</a></td>
            <td><a href="#" className="country-link">{stock.country}</a></td>
            <td><a href="#" className="marketcap-link">{stock.marketCap}</a></td>
            <td><a href="#" className="pe-link">{stock.pe}</a></td>
            <td><a href="#" className="price-link">{stock.price}</a></td>
            <td className={parseFloat(stock.change) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.change}</a>
            </td>
            <td><a href="#" className="volume-link">{stock.volume.toLocaleString()}</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderValuationView = () => (
    <table className="stock-table">
      <thead>
        <tr>
          <th>No.</th>
          <th>Ticker</th>
          <th>Market Cap</th>
          <th>P/E</th>
          <th>Fwd P/E</th>
          <th>PEG</th>
          <th>P/S</th>
          <th>P/B</th>
          <th>P/C</th>
          <th>P/FCF</th>
          <th>Dividend</th>
          <th>Payout</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => (
          <tr key={stock.ticker}>
            <td>{stock.no}</td>
            <td><a href="#" className="ticker-link">{stock.ticker}</a></td>
            <td><a href="#">{stock.marketCap}</a></td>
            <td><a href="#">{stock.pe}</a></td>
            <td><a href="#">{stock.forwardPe}</a></td>
            <td><a href="#">{stock.peg}</a></td>
            <td><a href="#">{stock.ps}</a></td>
            <td><a href="#">{stock.pb}</a></td>
            <td><a href="#">{stock.pc}</a></td>
            <td><a href="#">{stock.pfcf}</a></td>
            <td><a href="#">{stock.dividendYield}</a></td>
            <td><a href="#">{stock.payoutRatio}</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderFinancialView = () => (
    <table className="stock-table">
      <thead>
        <tr>
          <th>No.</th>
          <th>Ticker</th>
          <th>Market Cap</th>
          <th>Dividend</th>
          <th>ROA</th>
          <th>ROE</th>
          <th>ROI</th>
          <th>Curr R</th>
          <th>Quick R</th>
          <th>LTDebt/Eq</th>
          <th>Debt/Eq</th>
          <th>Gross M</th>
          <th>Oper M</th>
          <th>Profit M</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => (
          <tr key={stock.ticker}>
            <td>{stock.no}</td>
            <td><a href="#" className="ticker-link">{stock.ticker}</a></td>
            <td><a href="#">{stock.marketCap}</a></td>
            <td><a href="#">{stock.dividendYield}</a></td>
            <td><a href="#">{stock.roa}</a></td>
            <td><a href="#">{stock.roe}</a></td>
            <td><a href="#">{stock.roi}</a></td>
            <td><a href="#">{stock.currRatio}</a></td>
            <td><a href="#">{stock.quickRatio}</a></td>
            <td><a href="#">{stock.ltDebtEq}</a></td>
            <td><a href="#">{stock.debtEq}</a></td>
            <td><a href="#">{stock.grossMargin}</a></td>
            <td><a href="#">{stock.operMargin}</a></td>
            <td><a href="#">{stock.profitMargin}</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderOwnershipView = () => (
    <table className="stock-table">
      <thead>
        <tr>
          <th>No.</th>
          <th>Ticker</th>
          <th>Market Cap</th>
          <th>Outstanding</th>
          <th>Float</th>
          <th>Insider Own</th>
          <th>Insider Trans</th>
          <th>Inst Own</th>
          <th>Inst Trans</th>
          <th>Short Float</th>
          <th>Short Ratio</th>
          <th>Avg Volume</th>
          <th>Price</th>
          <th>Change</th>
          <th>Volume</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => (
          <tr key={stock.ticker}>
            <td>{stock.no}</td>
            <td><a href="#" className="ticker-link">{stock.ticker}</a></td>
            <td><a href="#">{stock.marketCap}</a></td>
            <td><a href="#">-</a></td>
            <td><a href="#">-</a></td>
            <td><a href="#">{stock.insiderOwn}</a></td>
            <td><a href="#">{stock.insiderTrans}</a></td>
            <td><a href="#">{stock.instOwn}</a></td>
            <td><a href="#">{stock.instTrans}</a></td>
            <td><a href="#">{stock.shortFloat}</a></td>
            <td><a href="#">{stock.shortRatio}</a></td>
            <td><a href="#">{stock.avgVolume}</a></td>
            <td><a href="#">{stock.price}</a></td>
            <td className={parseFloat(stock.change) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.change}</a>
            </td>
            <td><a href="#">{stock.volume.toLocaleString()}</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderPerformanceView = () => (
    <table className="stock-table">
      <thead>
        <tr>
          <th>No.</th>
          <th>Ticker</th>
          <th>Perf Week</th>
          <th>Perf Month</th>
          <th>Perf Quart</th>
          <th>Perf Half</th>
          <th>Perf Year</th>
          <th>Perf YTD</th>
          <th>Volatility</th>
          <th>Recom</th>
          <th>Avg Volume</th>
          <th>Rel Volume</th>
          <th>Price</th>
          <th>Change</th>
          <th>Volume</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => (
          <tr key={stock.ticker}>
            <td>{stock.no}</td>
            <td><a href="#" className="ticker-link">{stock.ticker}</a></td>
            <td className={parseFloat(stock.perf1w) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.perf1w}</a>
            </td>
            <td className={parseFloat(stock.perf1m) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.perf1m}</a>
            </td>
            <td className={parseFloat(stock.perf3m) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.perf3m}</a>
            </td>
            <td className={parseFloat(stock.perf6m) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.perf6m}</a>
            </td>
            <td className={parseFloat(stock.perf1y) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.perf1y}</a>
            </td>
            <td className={parseFloat(stock.perfYtd) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.perfYtd}</a>
            </td>
            <td><a href="#">{stock.volatility}</a></td>
            <td><a href="#">{stock.recom}</a></td>
            <td><a href="#">{stock.avgVolume}</a></td>
            <td><a href="#">{stock.relVolume}</a></td>
            <td><a href="#">{stock.price}</a></td>
            <td className={parseFloat(stock.change) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.change}</a>
            </td>
            <td><a href="#">{stock.volume.toLocaleString()}</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderTechnicalView = () => (
    <table className="stock-table">
      <thead>
        <tr>
          <th>No.</th>
          <th>Ticker</th>
          <th>Beta</th>
          <th>ATR</th>
          <th>Volatility</th>
          <th>RSI (14)</th>
          <th>20-D SMA</th>
          <th>50-D SMA</th>
          <th>200-D SMA</th>
          <th>Change</th>
          <th>from Open</th>
          <th>Gap</th>
          <th>Volume</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => (
          <tr key={stock.ticker}>
            <td>{stock.no}</td>
            <td><a href="#" className="ticker-link">{stock.ticker}</a></td>
            <td><a href="#">{stock.beta}</a></td>
            <td><a href="#">{stock.atr}</a></td>
            <td><a href="#">{stock.volatility}</a></td>
            <td><a href="#">{stock.rsi}</a></td>
            <td><a href="#">-</a></td>
            <td><a href="#">-</a></td>
            <td><a href="#">-</a></td>
            <td className={parseFloat(stock.change) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.change}</a>
            </td>
            <td><a href="#">-</a></td>
            <td><a href="#">-</a></td>
            <td><a href="#">{stock.volume.toLocaleString()}</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderChartsView = () => (
    <div className="charts-grid">
      {stocks.map((stock) => (
        <div key={stock.ticker} className="chart-card">
          <div className="chart-header">
            <a href="#" className="ticker-link">{stock.ticker}</a>
            <span className={parseFloat(stock.change) >= 0 ? 'positive-change' : 'negative-change'}>
              {stock.change}
            </span>
          </div>
          <div className="chart-placeholder">
            {/* Placeholder for chart */}
            <div className="chart-mock">
              <svg width="100%" height="100" viewBox="0 0 200 100">
                <polyline
                  fill="none"
                  stroke="#0088cc"
                  strokeWidth="2"
                  points="0,50 40,30 80,60 120,20 160,45 200,25"
                />
              </svg>
            </div>
          </div>
          <div className="chart-info">
            <div>{stock.company}</div>
            <div>Price: ${stock.price}</div>
            <div>Volume: {stock.volume.toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="table-container">
      {view === 'overview' && renderOverviewView()}
      {view === 'valuation' && renderValuationView()}
      {view === 'financial' && renderFinancialView()}
      {view === 'ownership' && renderOwnershipView()}
      {view === 'performance' && renderPerformanceView()}
      {view === 'technical' && renderTechnicalView()}
      {view === 'charts' && renderChartsView()}
      {view === 'etf' && renderOverviewView()}
      {view === 'etfperf' && renderPerformanceView()}
      {view === 'custom' && renderOverviewView()}
    </div>
  );
};

export default StockTable;