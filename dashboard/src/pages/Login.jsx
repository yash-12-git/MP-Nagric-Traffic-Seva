import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api/client';
import { useLang } from '../i18n.jsx';
import TricolorStrip from '../components/TricolorStrip';

export default function Login({ onLogin }) {
  const { t, lang, toggle } = useLang();
  const [badge, setBadge] = useState('BHO-TC-001');
  const [password, setPassword] = useState('officer123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api.login(badge.trim(), password);
      setToken(r.data.data.token);
      onLogin(r.data.data.officer);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('login_failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4 relative">
      <button onClick={toggle} className="absolute top-5 right-5 text-sm text-navy border border-line rounded-md px-3 py-1.5 bg-white hover:bg-paper-light">
        {lang === 'hi' ? 'English' : 'हिंदी'}
      </button>
      <div className="w-full max-w-md bg-paper-light rounded-xl shadow-lg overflow-hidden border border-line">
        <TricolorStrip height={4} />
        <div className="bg-navy text-white px-6 py-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white text-navy flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z" /><path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-serif font-semibold leading-tight">नागरिक ट्रैफिक सेवा</h1>
            <p className="text-navy-soft text-[11px]">{t('login_sub')}</p>
          </div>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">{t('badge_number')}</label>
            <input
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              className="w-full bg-white border border-line-input rounded-md px-3 py-2 focus:ring-2 focus:ring-navy outline-none"
              placeholder="BHO-TC-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-line-input rounded-md px-3 py-2 focus:ring-2 focus:ring-navy outline-none"
            />
          </div>
          {error && <div className="text-sm text-brick bg-brick/10 rounded px-3 py-2">{error}</div>}
          <button
            disabled={busy}
            className="w-full bg-navy text-white font-medium py-2.5 rounded-md hover:opacity-90 disabled:opacity-60"
          >
            {busy ? t('signing_in') : t('sign_in')}
          </button>
          <div className="text-xs text-muted bg-white rounded px-3 py-2 border border-dashed border-line-input">
            <strong>{t('demo_credentials')}:</strong> Badge <code>BHO-TC-001</code> · Password <code>officer123</code>
          </div>
        </form>
      </div>
    </div>
  );
}
