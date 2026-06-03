import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import LogItemPage from './pages/LogItemPage';
import FindItemPage from './pages/FindItemPage';
import HistoryPage from './pages/HistoryPage';
import './index.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/log" element={
          <PrivateRoute><LogItemPage /></PrivateRoute>
        } />
        <Route path="/find" element={
          <PrivateRoute><FindItemPage /></PrivateRoute>
        } />
        <Route path="/history" element={
          <PrivateRoute><HistoryPage /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;