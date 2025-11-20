import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Screener from "./pages/Screener";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Screener />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
