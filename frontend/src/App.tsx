import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Screener from "./pages/Screener";
import News from "./pages/News";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Screener />} />
          <Route path="/news" element={<News />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
