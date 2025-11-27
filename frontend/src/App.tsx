import { BrowserRouter, Routes, Route } from "react-router-dom";
import Screener from "./pages/Screener";
import News from "./pages/News";
import StockProfile from "./pages/StockProfile";
import TickerPage from "./pages/Ticker";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Screener />} />
          <Route path="/news" element={<News />} />
          <Route path="/ticker" element={<TickerPage />} />
          <Route path="/stock/:ticker" element={<StockProfile />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
