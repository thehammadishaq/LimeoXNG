import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Screener from "./pages/Screener";
import News from "./pages/News";
import StockProfile from "./pages/StockProfile";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Screener />} />
          <Route path="/news" element={<News />} />
          <Route path="/stock/:ticker" element={<StockProfile />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
