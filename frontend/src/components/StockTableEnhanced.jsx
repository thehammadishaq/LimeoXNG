import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { mockNews } from '../mockData';
import '../styles/StockTable.css';

const StockTable = ({ stocks, view }) => {
  // Overview view (default)
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

  // Valuation view
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

  // Financial view
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

  // Ownership view
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
            <td className={parseFloat(stock.insiderTrans) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.insiderTrans}</a>
            </td>
            <td><a href="#">{stock.instOwn}</a></td>
            <td className={parseFloat(stock.instTrans) >= 0 ? 'positive-change' : 'negative-change'}>
              <a href="#">{stock.instTrans}</a>
            </td>
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

  // Performance view
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

  // Technical view
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
            <td className={stock.rsi > 70 ? 'negative-change' : stock.rsi < 30 ? 'positive-change' : ''}>
              <a href="#">{stock.rsi}</a>
            </td>
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

  // Charts view with real Recharts
  const renderChartsView = () => (
    <div className="charts-grid">
      {stocks.map((stock) => (
        <div key={stock.ticker} className="chart-card">
          <div className="chart-header">
            <a href="#" className="ticker-link ticker-bold">{stock.ticker}</a>
            <span className={parseFloat(stock.change) >= 0 ? 'positive-change' : 'negative-change'}>
              {stock.change}
            </span>
          </div>
          <div className="chart-container-mini">
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={stock.chartData}>
                <defs>
                  <linearGradient id={`gradient-${stock.ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={parseFloat(stock.change) >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={parseFloat(stock.change) >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke={parseFloat(stock.change) >= 0 ? "#10b981" : "#ef4444"}
                  strokeWidth={2}
                  fill={`url(#gradient-${stock.ticker})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-info">
            <div className="info-row">
              <span className="info-label">Company:</span>
              <span className="info-value">{stock.company}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Price:</span>
              <span className="info-value">${stock.price}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Volume:</span>
              <span className="info-value">{stock.volume.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Tickers view
  const renderTickersView = () => (
    <div className="tickers-container">
      {stocks.map((stock) => (
        <a href="#" key={stock.ticker} className="ticker-badge">
          {stock.ticker}
        </a>
      ))}
    </div>
  );

  // Basic view
  const renderBasicView = () => (
    <table className="stock-table">
      <thead>
        <tr>
          <th>No.</th>
          <th>Ticker</th>
          <th>Company</th>
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
            <td><a href="#">{stock.company}</a></td>
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

  // TA (Technical Analysis) view
  const renderTAView = () => (
    <div className="ta-grid">
      {stocks.map((stock) => (
        <div key={stock.ticker} className="ta-card">
          <div className="ta-header">
            <a href="#" className="ticker-link ticker-bold">{stock.ticker}</a>
            <span className={parseFloat(stock.change) >= 0 ? 'positive-change' : 'negative-change'}>
              ${stock.price} ({stock.change})
            </span>
          </div>
          <div className="ta-chart">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={stock.chartData}>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip 
                  contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '4px', color: '#fff' }}
                  formatter={(value) => [`$${value}`, 'Price']}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke={parseFloat(stock.change) >= 0 ? "#10b981" : "#ef4444"}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="ta-indicators">
            <div className="indicator-item">
              <span className="indicator-label">RSI (14):</span>
              <span className={stock.rsi > 70 ? 'negative-change' : stock.rsi < 30 ? 'positive-change' : ''}>
                {stock.rsi}
              </span>
            </div>
            <div className="indicator-item">
              <span className="indicator-label">Beta:</span>
              <span>{stock.beta}</span>
            </div>
            <div className="indicator-item">
              <span className="indicator-label">ATR:</span>
              <span>{stock.atr}</span>
            </div>
            <div className="indicator-item">
              <span className="indicator-label">Volatility:</span>
              <span>{stock.volatility}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // News view
  const renderNewsView = () => (
    <div className="news-container">
      {mockNews.map((news) => (
        <div key={news.id} className="news-item">
          <div className="news-header">
            <span className="news-date">{news.date} {news.time}</span>
            <span className="news-source">{news.source}</span>
            <span className={`news-sentiment sentiment-${news.sentiment}`}>
              {news.sentiment}
            </span>
          </div>
          <div className="news-headline">
            <a href="#">{news.headline}</a>
          </div>
          <div className="news-tickers">
            {news.tickers.map(ticker => (
              <a href="#" key={ticker} className="news-ticker">{ticker}</a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Snapshot view
  const renderSnapshotView = () => (
    <div className="snapshot-grid">
      {stocks.map((stock) => (
        <div key={stock.ticker} className="snapshot-card">
          <div className="snapshot-header">
            <div>
              <a href="#" className="ticker-link ticker-large">{stock.ticker}</a>
              <div className="company-name-small">{stock.company}</div>
            </div>
            <div className="snapshot-price">
              <div className="price-large">${stock.price}</div>
              <div className={parseFloat(stock.change) >= 0 ? 'positive-change' : 'negative-change'}>
                {stock.change}
              </div>
            </div>
          </div>
          <div className="snapshot-details">
            <div className="detail-row">
              <span>Market Cap:</span>
              <span>{stock.marketCap}</span>
            </div>
            <div className="detail-row">
              <span>P/E:</span>
              <span>{stock.pe}</span>
            </div>
            <div className="detail-row">
              <span>Volume:</span>
              <span>{stock.avgVolume}</span>
            </div>
            <div className="detail-row">
              <span>Sector:</span>
              <span>{stock.sector}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Maps view (Market visualization)
  const renderMapsView = () => (
    <div className="maps-container">
      <div className="maps-header">
        <h3>Market Map - Sector Performance</h3>
      </div>
      <div className="sector-map">
        {['Technology', 'Healthcare', 'Financial', 'Consumer Cyclical', 'Energy', 'Industrials'].map(sector => {
          const sectorStocks = stocks.filter(s => s.sector === sector);
          const avgChange = sectorStocks.length > 0 
            ? (sectorStocks.reduce((sum, s) => sum + parseFloat(s.change), 0) / sectorStocks.length).toFixed(2)
            : 0;
          
          return (
            <div 
              key={sector} 
              className="sector-box"
              style={{
                backgroundColor: avgChange >= 0 
                  ? `rgba(16, 185, 129, ${Math.min(Math.abs(avgChange) / 10, 0.8)})`
                  : `rgba(239, 68, 68, ${Math.min(Math.abs(avgChange) / 10, 0.8)})`
              }}
            >
              <div className="sector-name">{sector}</div>
              <div className="sector-change">{avgChange}%</div>
              <div className="sector-count">{sectorStocks.length} stocks</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Stats view
  const renderStatsView = () => (
    <table className="stock-table stats-table">
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Market Cap</th>
          <th>Income</th>
          <th>Sales</th>
          <th>Book/Share</th>
          <th>Cash/Share</th>
          <th>Dividend</th>
          <th>Employees</th>
          <th>Optionable</th>
          <th>Shortable</th>
          <th>Recom</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => (
          <tr key={stock.ticker}>
            <td><a href="#" className="ticker-link">{stock.ticker}</a></td>
            <td><a href="#">{stock.marketCap}</a></td>
            <td><a href="#">-</a></td>
            <td><a href="#">-</a></td>
            <td><a href="#">-</a></td>
            <td><a href="#">-</a></td>
            <td><a href="#">{stock.dividendYield}</a></td>
            <td><a href="#">-</a></td>
            <td><a href="#">{stock.optionable}</a></td>
            <td><a href="#">{stock.shortable}</a></td>
            <td><a href="#">{stock.recom}</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Render appropriate view
  switch(view) {
    case 'valuation': return renderValuationView();
    case 'financial': return renderFinancialView();
    case 'ownership': return renderOwnershipView();
    case 'performance': return renderPerformanceView();
    case 'technical': return renderTechnicalView();
    case 'charts': return renderChartsView();
    case 'tickers': return renderTickersView();
    case 'basic': return renderBasicView();
    case 'ta': return renderTAView();
    case 'news': return renderNewsView();
    case 'snapshot': return renderSnapshotView();
    case 'maps': return renderMapsView();
    case 'stats': return renderStatsView();
    case 'etf':
    case 'etfperf':
    case 'custom':
      return renderOverviewView();
    default:
      return renderOverviewView();
  }
};

export default StockTable;