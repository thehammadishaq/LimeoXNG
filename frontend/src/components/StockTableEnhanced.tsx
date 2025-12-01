import React from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { mockNews } from '../mockData';
import { cn } from '../lib/utils';
import type { LatestCandleDbItem } from '../services/api';

// Centralized metric tooltips for financial columns (used by table headers / UI help)
const metricTooltips: Record<string, string> = {
  // ---- Common valuation & balance sheet metrics ----
  bookValue: "Book Value: shareholders’ equity per share. Rising book value supports long-term value and can put a floor under the stock when P/B is low.",
  tangibleBookValue: "Tangible Book Value: equity minus intangibles and goodwill per share. Important in distress; low price vs TBV can signal deep value or balance sheet risk.",
  pb: "P/B (Price to Book): share price divided by book value per share. High P/B implies strong profitability/growth expectations; low P/B can mean value or structural problems.",
  ptbv: "P/TBV (Price to Tangible Book): price vs tangible book value per share. Very low P/TBV often signals either distress or a potential deep-value rerating case.",
  ev: "Enterprise Value (EV): market value of equity plus net debt. Used as total firm value; changes reflect both stock moves and leverage decisions.",
  ps: "P/S (Price to Sales): market cap ÷ revenue. High P/S relies on strong future growth or margin expansion; if growth slows, the multiple often compresses and stock can fall.",
  psTTM: "P/S TTM: price to sales based on trailing 12-month revenue. Sensitive to recent revenue trends; slowdown usually pressures this multiple and the stock.",
  pe: "P/E (Price to Earnings): price ÷ EPS. High P/E means investors pay more for each dollar of earnings; earnings disappointments can trigger sharp price drops via multiple compression.",
  peTTM: "P/E TTM: price to earnings based on last 12 months’ EPS. Reacts quickly to recent earnings changes and guidance surprises.",
  pfcf: "P/FCF (Price to Free Cash Flow): price vs free cash flow. Lower P/FCF suggests cash-flow value; higher ratios require confidence that FCF will grow.",
  pfcfTTM: "P/FCF TTM: valuation vs trailing 12-month free cash flow. Sensitive to recent capex and working capital swings that affect investor sentiment.",
  totalRatio: "Total Ratio: composite balance-sheet/coverage metric from the data provider. Weakening signals rising financial risk, which usually weighs on the stock.",

  // ---- Liquidity & working capital ----
  cashRatio: "Cash Ratio: cash & equivalents ÷ current liabilities. Very low levels raise liquidity concerns; very high levels show safety but may imply idle cash.",
  currentRatio: "Current Ratio: current assets ÷ current liabilities. Too low can signal near-term financing risk; healthy levels reduce default fears and support valuations.",
  quickRatio: "Quick Ratio: (cash + near-cash + receivables) ÷ current liabilities. Focuses on most liquid assets; low quick ratio can spook investors in stress periods.",
  cashRatioTTM: "Cash Ratio (TTM): same as cash ratio, viewed over the last year’s balance snapshots. Persistent weakness can pressure the stock on liquidity worries.",
  currentRatioTTM: "Current Ratio (TTM): trailing view of short-term liquidity. Trend deterioration is usually viewed negatively.",
  quickRatioTTM: "Quick Ratio (TTM): trailing view of highly liquid coverage. Sustained declines can hurt confidence, especially in highly leveraged firms.",

  // ---- Profitability (margins & earnings) ----
  ebitPerShare: "EBIT Per Share: operating profit per share. Growth indicates stronger core earnings power and often supports stock outperformance.",
  eps: "EPS (Earnings Per Share): net income per share. One of the main stock drivers; consistent EPS beats and growth usually push the stock higher.",
  ebitPerShareTTM: "EBIT Per Share TTM: last 12 months’ operating profit per share. Captures recent profit cycles that can move the stock quickly.",
  epsTTM: "EPS TTM: trailing 12-month earnings per share. Often used in valuation; negative turns or sharp drops typically hit the share price.",
  grossMargin: "Gross Margin: gross profit ÷ revenue. Rising margins suggest good pricing power or lower input costs and are typically bullish for the stock.",
  operatingMargin: "Operating Margin: operating income ÷ revenue. Key metric of core profitability; expanding margins usually lead to higher valuations.",
  netMargin: "Net Margin: net income ÷ revenue. Summarizes overall profitability; shrinking net margin can lead to multiple compression and price weakness.",
  pretaxMargin: "Pretax Margin: earnings before tax ÷ revenue. Shows underlying profitability before tax effects; declines are an early warning for earnings.",
  fcfMargin: "FCF Margin: free cash flow ÷ revenue. High and rising FCF margins support higher valuations as investors favor cash-generative businesses.",
  grossMarginTTM: "Gross Margin TTM: trailing 12-month gross margin. Markets react strongly to sustained margin trend changes.",
  operatingMarginTTM: "Operating Margin TTM: last 12-month operating margin. Trend improvement supports re-rating; deterioration often hurts the stock.",
  netMarginTTM: "Net Margin TTM: trailing net margin. Persistent compression tends to weigh on sentiment.",
  pretaxMarginTTM: "Pretax Margin TTM: trailing 12-month pretax profitability. Deterioration can foreshadow weaker EPS and stock performance.",
  fcfMarginTTM: "FCF Margin TTM: trailing free cash flow as a percent of sales. Strong trends attract long-term, quality-focused investors.",

  // ---- Cash flow per share ----
  fcfPerShareTTM: "FCF Per Share TTM: trailing 12-month free cash flow per share. Rising FCF per share is often rewarded with a higher stock multiple.",

  // ---- Valuation vs fundamentals (EV multiples) ----
  evEbitda: "EV/EBITDA: enterprise value ÷ EBITDA. Core valuation multiple; high values require strong growth, while low values can signal value or risk.",
  evRevenue: "EV/Revenue: enterprise value ÷ revenue. Used when earnings are weak or volatile; sensitive to revenue growth expectations.",
  evEbitdaTTM: "EV/EBITDA TTM: valuation vs trailing 12-month EBITDA. Moves as either EV or EBITDA change; big shifts often drive stock re-rating.",
  evRevenueTTM: "EV/Revenue TTM: valuation vs trailing 12-month revenue. Revenue surprises typically change this multiple and influence the price.",

  // ---- Capital structure & leverage ----
  longtermDebtTotalAsset: "Long-Term Debt / Total Assets: share of assets financed by long-term debt. Higher ratios increase financial risk and can pressure valuation.",
  longtermDebtTotalCapital: "Long-Term Debt / Total Capital: long-term debt ÷ (debt + equity). Rising leverage boosts risk and can make the stock more volatile.",
  longtermDebtTotalEquity: "Long-Term Debt / Equity: long-term debt relative to shareholders’ equity. High values mean aggressive leverage, which magnifies both gains and losses.",
  netDebtToTotalCapital: "Net Debt / Total Capital: (debt − cash) ÷ total capital. Lower or negative values (net cash) generally support higher valuations.",
  netDebtToTotalEquity: "Net Debt / Equity: net debt relative to equity. High values make the stock sensitive to credit conditions and downturns.",
  totalDebtToEquity: "Total Debt / Equity: all debt relative to equity. High leverage can lead to sharp sell-offs if earnings weaken or rates rise.",
  totalDebtToTotalAsset: "Total Debt / Total Assets: total debt as a share of assets. Higher levels increase financial risk, often limiting valuation upside.",
  totalDebtToTotalCapital: "Total Debt / Total Capital: total debt ÷ (debt + equity). Markets tend to penalize very high ratios, especially in cyclical businesses.",
  longtermDebtTotalAssetTTM: "Long-Term Debt / Assets (TTM): trailing view of structural leverage. Trend increases are usually seen as risky.",
  longtermDebtTotalCapitalTTM: "Long-Term Debt / Capital (TTM): trailing leverage mix. Persistent rise can cap valuation multiples.",
  longtermDebtTotalEquityTTM: "Long-Term Debt / Equity (TTM): trailing view of structural leverage. Deleveraging trends are often a positive catalyst.",
  netDebtToTotalCapitalTTM: "Net Debt / Capital (TTM): trailing net leverage. Moving toward net cash typically supports the stock.",
  netDebtToTotalEquityTTM: "Net Debt / Equity (TTM): trailing net leverage vs equity. High and rising numbers can weigh heavily on sentiment.",
  totalDebtToEquityTTM: "Total Debt / Equity (TTM): trailing leverage profile. Markets reward credible deleveraging plans.",
  totalDebtToTotalAssetTTM: "Total Debt / Assets (TTM): trailing use of debt in the balance sheet. Rising ratios increase perceived risk.",
  totalDebtToTotalCapitalTTM: "Total Debt / Capital (TTM): trailing leverage mix. High levels can restrain how high the stock’s multiple can go.",
  totalRatioTTM: "Total Ratio (TTM): trailing composite risk/coverage measure. Improving trends support confidence in solvency.",

  // ---- Returns & efficiency ----
  assetTurnoverTTM: "Asset Turnover TTM: trailing revenue ÷ average assets. Higher turnover means more efficient use of assets and supports stronger ROA/ROE.",
  inventoryTurnover: "Inventory Turnover: cost of goods sold ÷ average inventory. Higher turnover means efficient inventory management; very low levels hint at weak demand.",
  inventoryTurnoverTTM: "Inventory Turnover TTM: trailing inventory efficiency. Sudden drops can signal demand issues that may hit the stock.",
  receivablesTurnover: "Receivables Turnover: net credit sales ÷ average receivables. Higher turnover suggests faster collection and healthy customers.",
  receivablesTurnoverTTM: "Receivables Turnover TTM: trailing collection efficiency. Deterioration can flag credit or demand problems before earnings show it.",
  roa: "ROA (Return on Assets): net income ÷ total assets. Higher ROA indicates efficient asset use and is associated with better long-term stock performance.",
  roe: "ROE (Return on Equity): net income ÷ equity. Sustained high ROE, without excessive leverage, is strongly linked to premium valuations.",
  roic: "ROIC (Return on Invested Capital): after-tax operating profit ÷ invested capital. ROIC above the cost of capital creates value and usually supports strong stock performance.",
  rotc: "ROTC (Return on Total Capital): earnings vs total capital (debt + equity). Higher values indicate efficient use of financing and tend to be rewarded by the market.",
  roaTTM: "ROA TTM: trailing 12-month ROA. Rising ROA is a quality signal and often coincides with stock re-rating.",
  roeTTM: "ROE TTM: trailing return on equity. Investors closely track ROE trends when assigning valuation multiples.",
  roicTTM: "ROIC TTM: trailing return on invested capital. Improvements vs cost of capital are typically bullish.",
  rotcTTM: "ROTC TTM: trailing return on total capital. Declines can indicate weaker capital efficiency and weigh on the stock.",

  // ---- Revenue, sales & SG&A ----
  salesPerShare: "Sales Per Share: revenue ÷ shares. Growth in sales per share underpins future earnings and cash flow; stagnation can cap the stock.",
  salesPerShareTTM: "Sales Per Share TTM: trailing 12-month revenue per share. Useful for tracking recent demand trends that drive sentiment.",
  sgaToSale: "SG&A to Sales: selling, general & admin expenses ÷ revenue. Falling ratio suggests better cost control; rising ratio can hurt margins and valuation.",
  sgaToSaleTTM: "SG&A to Sales TTM: trailing overhead burden. Persistent increases without revenue payoff are viewed negatively.",

  // ---- Dividends / payouts ----
  payoutRatio: "Payout Ratio: dividends ÷ earnings. Moderate ratios are seen as sustainable; very high ratios can signal risk of a dividend cut, which often hits the stock.",
  payoutRatioTTM: "Payout Ratio TTM: trailing 12-month dividend share of earnings. Rising to unsustainable levels often precedes dividend cuts and negative reactions.",

  // ---- Book values (quarterly) ----
  bookValueTTM: "Book Value (Quarterly): most recent equity per share reading. Sudden drops can indicate write-downs or losses and may pressure the stock.",
  tangibleBookValueTTM: "Tangible Book Value (Quarterly): most recent tangible equity per share. Important for downside protection in stressed situations.",
};

// Simple Skeleton component
const Skeleton = ({ className = '', style, ...props }: { className?: string; style?: React.CSSProperties; [key: string]: any }) => {
  return (
    <div
      className={cn("skeleton-box", className)}
      style={style}
      {...props}
    />
  );
};

interface StockTableProps {
  stocks: any[];
  view: string;
  loading?: boolean;
  latestCandlesByTicker?: Record<string, LatestCandleDbItem>;
}

const StockTable = ({ stocks, view, loading = false, latestCandlesByTicker }: StockTableProps) => {
  // Debug: Log loading state
  React.useEffect(() => {
    console.log('StockTable render - loading:', loading, 'stocks.length:', stocks.length);
  }, [loading, stocks.length]);

  // Skeleton box component for individual cells
  const SkeletonBox = ({ width = '60px', height = '14px' }: { width?: string; height?: string }) => (
    <Skeleton style={{ width, height, minWidth: width, minHeight: height }} />
  );
  
  // Show skeleton if loading OR if no stocks
  const showSkeleton = loading || stocks.length === 0;

  // Overview view (default) - Shows profile data
  const renderOverviewView = () => {
    if (showSkeleton) {
      console.log('StockTable renderOverviewView -> rendering SKELETON rows');
    } else {
      console.log('StockTable renderOverviewView -> rendering DATA rows, count:', stocks.length);
    }

    return (
      <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>Company</th>
            <th>Industry</th>
            <th>Country</th>
              <th>Currency</th>
            <th>Exchange</th>
            <th>Market Cap</th>
              <th>Beta</th>
              <th>52W High</th>
              <th>52W Low</th>
              <th>YTD Return</th>
              <th>Monthly Return</th>
              <th>Weekly Return</th>
            <th>Shares Outstanding</th>
            <th>IPO Date</th>
          </tr>
        </thead>
        <tbody>
          {showSkeleton ? (
            Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="skeleton-row">
                  <td><SkeletonBox width="30px" height="16px" /></td>
                  <td><SkeletonBox width="60px" height="16px" /></td>
                  <td><SkeletonBox width="180px" height="16px" /></td>
                  <td><SkeletonBox width="180px" height="16px" /></td>
                  <td><SkeletonBox width="50px" height="16px" /></td>
                  <td><SkeletonBox width="60px" height="16px" /></td>
                  <td><SkeletonBox width="120px" height="16px" /></td>
                  <td><SkeletonBox width="100px" height="16px" /></td>
                  <td><SkeletonBox width="50px" height="16px" /></td>
                  <td><SkeletonBox width="80px" height="16px" /></td>
                  <td><SkeletonBox width="80px" height="16px" /></td>
                  <td><SkeletonBox width="80px" height="16px" /></td>
                  <td><SkeletonBox width="80px" height="16px" /></td>
                  <td><SkeletonBox width="80px" height="16px" /></td>
                  <td><SkeletonBox width="120px" height="16px" /></td>
                  <td><SkeletonBox width="100px" height="16px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#" className="company-link">{stock.company}</a></td>
                <td><a href="#" className="industry-link">{stock.industry}</a></td>
                <td><a href="#" className="country-link">{stock.country}</a></td>
                  <td><a href="#">{stock.currency}</a></td>
                <td><a href="#">{stock.exchange}</a></td>
                <td><a href="#" className="marketcap-link">{stock.marketCap}</a></td>
                  <td><a href="#">{stock.beta}</a></td>
                  <td><a href="#">{stock.high52w}</a></td>
                  <td><a href="#">{stock.low52w}</a></td>
                  <td><a href="#">{stock.ytdReturn}</a></td>
                  <td><a href="#">{stock.monthlyReturn}</a></td>
                  <td><a href="#">{stock.weeklyReturn}</a></td>
                <td><a href="#">{stock.shares}</a></td>
                <td><a href="#">{stock.ipoDate}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
  };

  // Margins view
  const renderMarginsView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>Gross Margin 5Y</th>
            <th>Gross Margin Annual</th>
            <th>Gross Margin TTM</th>
            <th>Operating Margin 5Y</th>
            <th>Operating Margin Annual</th>
            <th>Operating Margin TTM</th>
            <th>Net Profit Margin 5Y</th>
            <th>Net Profit Margin Annual</th>
            <th>Net Profit Margin TTM</th>
            <th>Pretax Margin 5Y</th>
            <th>Pretax Margin Annual</th>
            <th>Pretax Margin TTM</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-margins-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="140px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="150px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="110px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="110px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.grossMargin5Y}</a></td>
                <td><a href="#">{stock.grossMarginAnnual}</a></td>
                <td><a href="#">{stock.grossMarginTTM}</a></td>
                <td><a href="#">{stock.operatingMargin5Y}</a></td>
                <td><a href="#">{stock.operatingMarginAnnual}</a></td>
                <td><a href="#">{stock.operatingMarginTTM}</a></td>
                <td><a href="#">{stock.netProfitMargin5Y}</a></td>
                <td><a href="#">{stock.netProfitMarginAnnual}</a></td>
                <td><a href="#">{stock.netProfitMarginTTM}</a></td>
                <td><a href="#">{stock.pretaxMargin5Y}</a></td>
                <td><a href="#">{stock.pretaxMarginAnnual}</a></td>
                <td><a href="#">{stock.pretaxMarginTTM}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Dividends view
  const renderDividendsView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>Current Dividend Yield TTM</th>
            <th>Dividend/Share Annual</th>
            <th>Dividend/Share TTM</th>
            <th>Dividend Indicated Annual</th>
            <th>Dividend Yield Indicated Annual</th>
            <th>Dividend Growth Rate 5Y</th>
            <th>Payout Ratio Annual</th>
            <th>Payout Ratio TTM</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-dividends-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="160px" /></td>
                <td><SkeletonBox width="140px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="160px" /></td>
                <td><SkeletonBox width="180px" /></td>
                <td><SkeletonBox width="150px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="120px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.currentDividendYieldTTM}</a></td>
                <td><a href="#">{stock.dividendPerShareAnnual}</a></td>
                <td><a href="#">{stock.dividendPerShareTTM}</a></td>
                <td><a href="#">{stock.dividendIndicatedAnnual}</a></td>
                <td><a href="#">{stock.dividendYieldIndicatedAnnual}</a></td>
                <td><a href="#">{stock.dividendGrowthRate5Y}</a></td>
                <td><a href="#">{stock.payoutRatioAnnual}</a></td>
                <td><a href="#">{stock.payoutRatioTTM}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Operational Metrics view
  const renderOperationalMetricsView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>Revenue/Share Annual</th>
            <th>Revenue/Share TTM</th>
            <th>Net Income/Employee Annual</th>
            <th>Net Income/Employee TTM</th>
            <th>Revenue/Employee Annual</th>
            <th>Revenue/Employee TTM</th>
            <th>Net Interest Coverage Annual</th>
            <th>Net Interest Coverage TTM</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-operational-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="160px" /></td>
                <td><SkeletonBox width="150px" /></td>
                <td><SkeletonBox width="150px" /></td>
                <td><SkeletonBox width="140px" /></td>
                <td><SkeletonBox width="170px" /></td>
                <td><SkeletonBox width="160px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.revenuePerShareAnnual}</a></td>
                <td><a href="#">{stock.revenuePerShareTTM}</a></td>
                <td><a href="#">{stock.netIncomeEmployeeAnnual}</a></td>
                <td><a href="#">{stock.netIncomeEmployeeTTM}</a></td>
                <td><a href="#">{stock.revenueEmployeeAnnual}</a></td>
                <td><a href="#">{stock.revenueEmployeeTTM}</a></td>
                <td><a href="#">{stock.netInterestCoverageAnnual}</a></td>
                <td><a href="#">{stock.netInterestCoverageTTM}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Efficiency view
  const renderEfficiencyView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>Asset Turnover Annual</th>
            <th>Asset Turnover TTM</th>
            <th>Inventory Turnover Annual</th>
            <th>Inventory Turnover TTM</th>
            <th>Receivables Turnover Annual</th>
            <th>Receivables Turnover TTM</th>
            <th>ROI 5Y</th>
            <th>ROI Annual</th>
            <th>ROI TTM</th>
            <th>ROA 5Y</th>
            <th>ROA RFY</th>
            <th>ROA TTM</th>
            <th>ROE 5Y</th>
            <th>ROE RFY</th>
            <th>ROE TTM</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-efficiency-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="150px" /></td>
                <td><SkeletonBox width="140px" /></td>
                <td><SkeletonBox width="160px" /></td>
                <td><SkeletonBox width="150px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="70px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="70px" /></td>
                <td><SkeletonBox width="70px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="70px" /></td>
                <td><SkeletonBox width="70px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.assetTurnoverAnnual}</a></td>
                <td><a href="#">{stock.assetTurnoverTTM}</a></td>
                <td><a href="#">{stock.inventoryTurnoverAnnual}</a></td>
                <td><a href="#">{stock.inventoryTurnoverTTM}</a></td>
                <td><a href="#">{stock.receivablesTurnoverAnnual}</a></td>
                <td><a href="#">{stock.receivablesTurnoverTTM}</a></td>
                <td><a href="#">{stock.roi5Y}</a></td>
                <td><a href="#">{stock.roiAnnual}</a></td>
                <td><a href="#">{stock.roiTTM}</a></td>
                <td><a href="#">{stock.roa5Y}</a></td>
                <td><a href="#">{stock.roaRfy}</a></td>
                <td><a href="#">{stock.roaTTM}</a></td>
                <td><a href="#">{stock.roe5Y}</a></td>
                <td><a href="#">{stock.roeRfy}</a></td>
                <td><a href="#">{stock.roeTTM}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Liquidity view
  const renderLiquidityView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>Current Ratio Annual</th>
            <th>Current Ratio Quarterly</th>
            <th>Quick Ratio Annual</th>
            <th>Quick Ratio Quarterly</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-liquidity-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="150px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="150px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.currentRatioAnnual}</a></td>
                <td><a href="#">{stock.currentRatioQuarterly}</a></td>
                <td><a href="#">{stock.quickRatioAnnual}</a></td>
                <td><a href="#">{stock.quickRatioQuarterly}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // BS Strength view
  const renderBSStrengthView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>Total Debt/Equity Annual</th>
            <th>Total Debt/Equity Quarterly</th>
            <th>Long-term Debt/Equity Annual</th>
            <th>Long-term Debt/Equity Quarterly</th>
            <th>Book Value/Share Annual</th>
            <th>Book Value/Share Quarterly</th>
            <th>Tangible Book Value/Share Annual</th>
            <th>Tangible Book Value/Share Quarterly</th>
            <th>Cash/Share Annual</th>
            <th>Cash/Share Quarterly</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-bs-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="140px" /></td>
                <td><SkeletonBox width="160px" /></td>
                <td><SkeletonBox width="160px" /></td>
                <td><SkeletonBox width="180px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="150px" /></td>
                <td><SkeletonBox width="180px" /></td>
                <td><SkeletonBox width="200px" /></td>
                <td><SkeletonBox width="110px" /></td>
                <td><SkeletonBox width="130px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.totalDebtTotalEquityAnnual}</a></td>
                <td><a href="#">{stock.totalDebtTotalEquityQuarterly}</a></td>
                <td><a href="#">{stock.longTermDebtEquityAnnual}</a></td>
                <td><a href="#">{stock.longTermDebtEquityQuarterly}</a></td>
                <td><a href="#">{stock.bookValuePerShareAnnual}</a></td>
                <td><a href="#">{stock.bookValuePerShareQuarterly}</a></td>
                <td><a href="#">{stock.tangibleBookValuePerShareAnnual}</a></td>
                <td><a href="#">{stock.tangibleBookValuePerShareQuarterly}</a></td>
                <td><a href="#">{stock.cashPerShare}</a></td>
                <td><a href="#">{stock.cashPerSharePerShareQuarterly}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Profitability view
  const renderProfitabilityView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>EPS Annual</th>
            <th>EPS TTM</th>
            <th>EPS Basic Excl Extra Items Annual</th>
            <th>EPS Basic Excl Extra Items TTM</th>
            <th>EPS Excl Extra Items Annual</th>
            <th>EPS Excl Extra Items TTM</th>
            <th>EPS Incl Extra Items Annual</th>
            <th>EPS Incl Extra Items TTM</th>
            <th>EPS Normalized Annual</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-profitability-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="70px" /></td>
                <td><SkeletonBox width="180px" /></td>
                <td><SkeletonBox width="180px" /></td>
                <td><SkeletonBox width="160px" /></td>
                <td><SkeletonBox width="160px" /></td>
                <td><SkeletonBox width="160px" /></td>
                <td><SkeletonBox width="160px" /></td>
                <td><SkeletonBox width="140px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.epsAnnual}</a></td>
                <td><a href="#">{stock.epsTTM}</a></td>
                <td><a href="#">{stock.epsBasicExclExtraItemsAnnual}</a></td>
                <td><a href="#">{stock.epsBasicExclExtraItemsTTM}</a></td>
                <td><a href="#">{stock.epsExclExtraItemsAnnual}</a></td>
                <td><a href="#">{stock.epsExclExtraItemsTTM}</a></td>
                <td><a href="#">{stock.epsInclExtraItemsAnnual}</a></td>
                <td><a href="#">{stock.epsInclExtraItemsTTM}</a></td>
                <td><a href="#">{stock.epsNormalizedAnnual}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Valuation view
  const renderValuationView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>P/E TTM</th>
            <th>P/E Annual</th>
            <th>Forward P/E</th>
            <th>P/E Basic Excl Extra TTM</th>
            <th>P/E Excl Extra Annual</th>
            <th>P/E Excl Extra TTM</th>
            <th>P/E Incl Extra TTM</th>
            <th>P/E Normalized Annual</th>
            <th>PEG TTM</th>
            <th>P/S Annual</th>
            <th>P/S TTM</th>
            <th>P/B</th>
            <th>P/B Annual</th>
            <th>P/B Quarterly</th>
            <th>P/TBV Annual</th>
            <th>P/TBV Quarterly</th>
            <th>EV/EBITDA TTM</th>
            <th>EV/Revenue TTM</th>
            <th>P/FCF Share Annual</th>
            <th>P/FCF Share TTM</th>
            <th>P/CF Share Annual</th>
            <th>P/CF Share TTM</th>
            <th>EV/FCF Annual</th>
            <th>EV/FCF TTM</th>
            <th>Enterprise Value</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-val-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="100px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.peTTM}</a></td>
                <td><a href="#">{stock.peAnnual}</a></td>
                <td><a href="#">{stock.forwardPe}</a></td>
                <td><a href="#">{stock.peBasicExclExtraTTM}</a></td>
                <td><a href="#">{stock.peExclExtraAnnual}</a></td>
                <td><a href="#">{stock.peExclExtraTTM}</a></td>
                <td><a href="#">{stock.peInclExtraTTM}</a></td>
                <td><a href="#">{stock.peNormalizedAnnual}</a></td>
                <td><a href="#">{stock.pegTTM}</a></td>
                <td><a href="#">{stock.psAnnual}</a></td>
                <td><a href="#">{stock.psTTM}</a></td>
                <td><a href="#">{stock.pb}</a></td>
                <td><a href="#">{stock.pbAnnual}</a></td>
                <td><a href="#">{stock.pbQuarterly}</a></td>
                <td><a href="#">{stock.ptbvAnnual}</a></td>
                <td><a href="#">{stock.ptbvQuarterly}</a></td>
                <td><a href="#">{stock.evEbitdaTTM}</a></td>
                <td><a href="#">{stock.evRevenueTTM}</a></td>
                <td><a href="#">{stock.pfcfShareAnnual}</a></td>
                <td><a href="#">{stock.pfcfShareTTM}</a></td>
                <td><a href="#">{stock.pcfShareAnnual}</a></td>
                <td><a href="#">{stock.pcfShareTTM}</a></td>
                <td><a href="#">{stock.evFcfAnnual}</a></td>
                <td><a href="#">{stock.evFcfTTM}</a></td>
                <td><a href="#">{stock.enterpriseValue}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Ownership view
  const renderOwnershipView = () => (
    <div className="table-container scrollbar-custom">
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
              <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
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
    </div>
  );

  // Performance view
  const renderPerformanceView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>13W Price Return</th>
            <th>26W Price Return</th>
            <th>52W Price Return</th>
            <th>5D Price Return</th>
            <th>MTD Price Return</th>
            <th>YTD Price Return</th>
            <th>vs S&P500 4W</th>
            <th>vs S&P500 13W</th>
            <th>vs S&P500 26W</th>
            <th>vs S&P500 52W</th>
            <th>vs S&P500 YTD</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-perf-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
            <tr key={stock.ticker}>
              <td>{stock.no}</td>
              <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.priceReturn13Week}</a></td>
                <td><a href="#">{stock.priceReturn26Week}</a></td>
                <td><a href="#">{stock.priceReturn52Week}</a></td>
                <td><a href="#">{stock.priceReturn5Day}</a></td>
                <td><a href="#">{stock.priceReturnMonthToDate}</a></td>
                <td><a href="#">{stock.priceReturnYearToDate}</a></td>
                <td><a href="#">{stock.priceRelativeToSP5004Week}</a></td>
                <td><a href="#">{stock.priceRelativeToSP50013Week}</a></td>
                <td><a href="#">{stock.priceRelativeToSP50026Week}</a></td>
                <td><a href="#">{stock.priceRelativeToSP50052Week}</a></td>
                <td><a href="#">{stock.priceRelativeToSP500Ytd}</a></td>
            </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Cash Flow view
  const renderCashFlowView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>Cash Flow/Share Annual</th>
            <th>Cash Flow/Share Quarterly</th>
            <th>Cash Flow/Share TTM</th>
            <th>P/FCF Share Annual</th>
            <th>P/FCF Share TTM</th>
            <th>P/CF Share Annual</th>
            <th>P/CF Share TTM</th>
            <th>EV/FCF Annual</th>
            <th>EV/FCF TTM</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-cf-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="140px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.cashFlowPerShareAnnual}</a></td>
                <td><a href="#">{stock.cashFlowPerShareQuarterly}</a></td>
                <td><a href="#">{stock.cashFlowPerShareTTM}</a></td>
                <td><a href="#">{stock.pfcfShareAnnual}</a></td>
                <td><a href="#">{stock.pfcfShareTTM}</a></td>
                <td><a href="#">{stock.pcfShareAnnual}</a></td>
                <td><a href="#">{stock.pcfShareTTM}</a></td>
                <td><a href="#">{stock.evFcfAnnual}</a></td>
                <td><a href="#">{stock.evFcfTTM}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Growth view
  const renderGrowthView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>Revenue Growth 3Y</th>
            <th>Revenue Growth 5Y</th>
            <th>Revenue Growth Quarterly YoY</th>
            <th>Revenue Growth TTM YoY</th>
            <th>Revenue Share Growth 5Y</th>
            <th>EPS Growth 3Y</th>
            <th>EPS Growth 5Y</th>
            <th>EPS Growth Quarterly YoY</th>
            <th>EPS Growth TTM YoY</th>
            <th>Capex CAGR 5Y</th>
            <th>EBITDA CAGR 5Y</th>
            <th>EBITDA Interim CAGR 5Y</th>
            <th>FOCF CAGR 5Y</th>
            <th>TBV CAGR 5Y</th>
            <th>Book Value Share Growth 5Y</th>
            <th>Net Margin Growth 5Y</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-growth-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="140px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="140px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="130px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="150px" /></td>
                <td><SkeletonBox width="120px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.no}</td>
                <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.revenueGrowth3Y}</a></td>
                <td><a href="#">{stock.revenueGrowth5Y}</a></td>
                <td><a href="#">{stock.revenueGrowthQuarterlyYoy}</a></td>
                <td><a href="#">{stock.revenueGrowthTTMYoy}</a></td>
                <td><a href="#">{stock.revenueShareGrowth5Y}</a></td>
                <td><a href="#">{stock.epsGrowth3Y}</a></td>
                <td><a href="#">{stock.epsGrowth5Y}</a></td>
                <td><a href="#">{stock.epsGrowthQuarterlyYoy}</a></td>
                <td><a href="#">{stock.epsGrowthTTMYoy}</a></td>
                <td><a href="#">{stock.capexCagr5Y}</a></td>
                <td><a href="#">{stock.ebitdaCagr5Y}</a></td>
                <td><a href="#">{stock.ebitdaInterimCagr5Y}</a></td>
                <td><a href="#">{stock.fcfCagr}</a></td>
                <td><a href="#">{stock.tbvCagr5Y}</a></td>
                <td><a href="#">{stock.bvGrowth}</a></td>
                <td><a href="#">{stock.netMarginGrowth5Y}</a></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Technical view
  const renderTechnicalView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>10D Avg Trading Volume</th>
            <th>3M Avg Trading Volume</th>
            <th>3M AD Return Std</th>
            <th>52W High</th>
            <th>52W High Date</th>
            <th>52W Low</th>
            <th>52W Low Date</th>
            <th>Beta</th>
            <th>Market Cap</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-tech-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="120px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="100px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => (
            <tr key={stock.ticker}>
              <td>{stock.no}</td>
              <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                <td><a href="#">{stock.avgTradingVolume10Day}</a></td>
                <td><a href="#">{stock.avgTradingVolume3Month}</a></td>
                <td><a href="#">{stock.adReturnStd3Month}</a></td>
                <td><a href="#">{stock.high52Week}</a></td>
                <td><a href="#">{stock.high52WeekDate}</a></td>
                <td><a href="#">{stock.low52Week}</a></td>
                <td><a href="#">{stock.low52WeekDate}</a></td>
                <td><a href="#">{stock.betaValue}</a></td>
                <td><a href="#">{stock.marketCapFromMetric}</a></td>
            </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // OHLCV view (latest candle from DB)
  const renderOhlcvView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Ticker</th>
            <th>Resolution</th>
            <th>Open</th>
            <th>High</th>
            <th>Low</th>
            <th>Close</th>
            <th>Volume</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <tr key={`skeleton-ohlcv-${index}`}>
                <td><SkeletonBox width="20px" /></td>
                <td><SkeletonBox width="50px" /></td>
                <td><SkeletonBox width="60px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="80px" /></td>
                <td><SkeletonBox width="100px" /></td>
                <td><SkeletonBox width="140px" /></td>
              </tr>
            ))
          ) : (
            stocks.map((stock) => {
              const candle = latestCandlesByTicker?.[stock.ticker];

              const formatNumber = (value: number | undefined) =>
                value !== undefined && !isNaN(value) ? value.toFixed(2) : 'N/A';

              let timestampDisplay = 'N/A';
              if (candle?.timestamp !== undefined && candle?.timestamp !== null) {
                if (typeof candle.timestamp === 'number') {
                  timestampDisplay = new Date(candle.timestamp * 1000).toLocaleString();
                } else {
                  const d = new Date(candle.timestamp);
                  if (!isNaN(d.getTime())) {
                    timestampDisplay = d.toLocaleString();
                  }
                }
              }

              return (
                <tr key={stock.ticker}>
                  <td>{stock.no}</td>
                  <td><Link to={`/stock/${stock.ticker}`} className="ticker-link">{stock.ticker}</Link></td>
                  <td>{candle?.resolution ?? 'N/A'}</td>
                  <td>{formatNumber(candle?.open as number | undefined)}</td>
                  <td>{formatNumber(candle?.high as number | undefined)}</td>
                  <td>{formatNumber(candle?.low as number | undefined)}</td>
                  <td>{formatNumber(candle?.close as number | undefined)}</td>
                  <td>{candle?.volume !== undefined ? candle.volume.toLocaleString() : 'N/A'}</td>
                  <td>{timestampDisplay}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  // News view
  const renderNewsView = () => (
    <div className="table-container scrollbar-custom">
      <table className="stock-table news-table">
        <thead>
          <tr>
            <th>Date/Time</th>
            <th>Source</th>
            <th>Sentiment</th>
            <th>Headline</th>
            <th>Ticker</th>
          </tr>
        </thead>
        <tbody>
          {mockNews.map((news) => (
            <tr key={news.id}>
              <td>
                <div className="news-date-cell">
                  <span className="news-date">{news.date}</span>
                  <span className="news-time">{news.time}</span>
                </div>
              </td>
              <td>
                <a href="#" className="news-source-link">{news.source}</a>
              </td>
              <td>
                <span className={`news-sentiment sentiment-${news.sentiment}`}>
                  {news.sentiment}
                </span>
              </td>
              <td>
                <a href="#" className="news-headline-link">{news.headline}</a>
              </td>
              <td>
                {news.tickers.map((ticker, index) => (
                  <React.Fragment key={ticker}>
                    <Link to={`/stock/${ticker}`} className="ticker-link">{ticker}</Link>
                    {index < news.tickers.length - 1 && ', '}
                  </React.Fragment>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render appropriate view
  switch(view) {
    case 'valuation': return renderValuationView();
    case 'margins': return renderMarginsView();
    case 'profitability': return renderProfitabilityView();
    case 'bsstrength': return renderBSStrengthView();
    case 'liquidity': return renderLiquidityView();
    case 'efficiency': return renderEfficiencyView();
    case 'operational': return renderOperationalMetricsView();
    case 'dividends': return renderDividendsView();
    case 'ownership': return renderOwnershipView();
    case 'performance': return renderPerformanceView();
    case 'cashflow': return renderCashFlowView();
    case 'growth': return renderGrowthView();
    case 'ohlcv': return renderOhlcvView();
    case 'technical': return renderTechnicalView();
    case 'news': return renderNewsView();
      return renderOverviewView();
    default:
      return renderOverviewView();
  }
};

export default StockTable;

