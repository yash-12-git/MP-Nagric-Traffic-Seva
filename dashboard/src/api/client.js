// Axios client for the officer dashboard. Talks to the backend via the Vite
// proxy (/api -> http://localhost:3001).

import axios from 'axios';

const TOKEN_KEY = 'mp_officer_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      setToken(null);
      if (!window.location.pathname.endsWith('/login')) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Build an authenticated media/thumbnail URL (token in query for <img>/<video>).
export function mediaUrl(filename) {
  return `/api/media/${encodeURIComponent(filename)}?token=${getToken() || ''}`;
}
export function thumbnailUrl(caseId) {
  return `/api/media/thumbnail/${caseId}?token=${getToken() || ''}`;
}
export function challanPdfUrl(challanNumber) {
  return `/api/challans/${encodeURIComponent(challanNumber)}/pdf?token=${getToken() || ''}`;
}

// --- API calls ---
export const api = {
  login: (badge_number, password) => client.post('/auth/officer/login', { badge_number, password }),
  me: () => client.get('/auth/me'),
  violationTypes: () => client.get('/violation-types'),
  cases: (params) => client.get('/officer/cases', { params }),
  caseDetail: (id) => client.get(`/officer/cases/${id}`),
  approve: (id, body) => client.patch(`/officer/cases/${id}/approve`, body),
  reject: (id, body) => client.patch(`/officer/cases/${id}/reject`, body),
  overview: () => client.get('/analytics/overview'),
  violations: () => client.get('/analytics/violations'),
  hotspots: () => client.get('/analytics/hotspots'),
  timeseries: () => client.get('/analytics/timeseries'),
  challan: (num) => client.get(`/challans/${num}`),
};

export default client;
