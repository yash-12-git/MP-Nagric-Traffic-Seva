import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api/client';

export default function Login({ onLogin }) {
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
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gov-blue/5 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gov-blue text-white px-6 py-5">
          <h1 className="text-xl font-bold">MP Nagrik Traffic Seva</h1>
          <p className="text-blue-200 text-sm">Officer Dashboard · Madhya Pradesh Traffic Police</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Badge Number</label>
            <input
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-gov-blue outline-none"
              placeholder="BHO-TC-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-gov-blue outline-none"
            />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}
          <button
            disabled={busy}
            className="w-full bg-gov-blue text-white font-medium py-2.5 rounded-md hover:bg-blue-800 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
          <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 border border-dashed">
            <strong>Demo credentials:</strong> Badge <code>BHO-TC-001</code> · Password <code>officer123</code>
          </div>
        </form>
      </div>
    </div>
  );
}
