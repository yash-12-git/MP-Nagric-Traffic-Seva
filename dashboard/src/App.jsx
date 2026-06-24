import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './api/client';
import Login from './pages/Login';
import CaseQueue from './pages/CaseQueue';
import CaseDetail from './pages/CaseDetail';
import Analytics from './pages/Analytics';
import ChallanView from './pages/ChallanView';

function Shell({ officer, onLogout, children }) {
  const loc = useLocation();
  const nav = (to, label) => {
    const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={`px-4 py-2 rounded-md text-sm font-medium ${
          active ? 'bg-white text-gov-blue' : 'text-blue-100 hover:bg-blue-800'
        }`}
      >
        {label}
      </Link>
    );
  };
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gov-blue text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="font-bold text-lg leading-tight">
              MP Nagrik Traffic Seva
              <div className="text-[11px] font-normal text-blue-200">Officer Dashboard · DEMO</div>
            </div>
            <nav className="flex gap-1 ml-6">
              {nav('/', 'Case Queue')}
              {nav('/analytics', 'Analytics')}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="font-medium">{officer?.full_name}</div>
              <div className="text-[11px] text-blue-200">{officer?.badge_number} · {officer?.jurisdiction}</div>
            </div>
            <button onClick={onLogout} className="px-3 py-1.5 rounded bg-blue-800 hover:bg-blue-700">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default function App() {
  const [officer, setOfficer] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.me()
      .then((r) => setOfficer(r.data.data))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (off) => setOfficer(off);
  const handleLogout = () => { setToken(null); setOfficer(null); navigate('/login'); };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  }

  if (!officer) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Shell officer={officer} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<CaseQueue />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/challan/:num" element={<ChallanView />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
