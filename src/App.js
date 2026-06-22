import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import LogItemPage from './pages/LogItemPage';
import FindItemPage from './pages/FindItemPage';
import HistoryPage from './pages/HistoryPage';
import useReminders from './hooks/useReminders';
import './index.css';
import useFcmToken from './hooks/useFcmToken';

// ── PrivateRoute: uses localStorage token (matches your useSession) ───────
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// ── Inner app: hooks must be inside a component ───────────────────────────
function AppRoutes() {
  useReminders();
  useFcmToken(); 

  return (
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
  );
}

// ── Root App ──────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;