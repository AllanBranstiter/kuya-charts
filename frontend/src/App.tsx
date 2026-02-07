import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ChartPage from './components/ChartPage';
import Screener from './components/Screener';
import Watchlist from './components/Watchlist';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ChartPage />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/watchlist" element={<Watchlist />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
