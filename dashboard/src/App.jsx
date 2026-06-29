import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './api/client';
import { useLang } from './i18n.jsx';
import TricolorStrip from './components/TricolorStrip';
import Login from './pages/Login';
import CaseQueue from './pages/CaseQueue';
import CaseDetail from './pages/CaseDetail';
import Analytics from './pages/Analytics';
import ChallanView from './pages/ChallanView';

function Emblem({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function Shell({ officer, onLogout, children }) {
  const loc = useLocation();
  const { t, lang, toggle } = useLang();
  const initial = (officer?.full_name || 'अ').trim()[0];

  const nav = (to, label) => {
    const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={`text-[12.5px] font-medium px-3.5 py-1.5 rounded-md transition ${
          active ? 'bg-white text-navy font-semibold' : 'text-navy-soft hover:bg-white/10'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="bg-navy text-white">
        <TricolorStrip />
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white text-navy flex items-center justify-center">
                <Emblem className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="font-serif font-semibold text-[15px]">{t('appName')}</div>
                <div className="text-navy-soft text-[10px]">{t('officer_dashboard')}</div>
              </div>
            </div>
            <nav className="flex gap-1">
              {nav('/', t('nav_queue'))}
              {nav('/analytics', t('nav_analytics'))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="text-[12px] font-semibold text-navy-soft border border-white/30 rounded-md px-2.5 py-1 hover:bg-white/10"
              title="Switch language"
            >
              {lang === 'hi' ? 'EN' : 'हि'}
            </button>
            <div className="text-right">
              <div className="text-white text-[12.5px] font-semibold">{officer?.full_name}</div>
              <div className="text-navy-soft text-[10px]">{officer?.badge_number} · {officer?.jurisdiction}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-saffron text-white flex items-center justify-center font-bold text-sm">
              {initial}
            </div>
            <button onClick={onLogout} className="text-[12px] text-navy-soft border border-white/30 rounded-md px-2.5 py-1 hover:bg-white/10">
              {t('sign_out')}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-5 py-6">{children}</main>
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
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
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
