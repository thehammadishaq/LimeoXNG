import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Render without React.StrictMode so that effects (data fetching) are not run twice in development.
root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
