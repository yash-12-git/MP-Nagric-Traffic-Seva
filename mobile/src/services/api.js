// API client for the citizen mobile app.
//
// IMPORTANT (DEMO): set API_BASE_URL to a host the phone can reach.
//  - Web preview (press 'w' in Expo): http://localhost:3001 works.
//  - Real device via Expo Go: use your computer's LAN IP, e.g. http://192.168.1.5:3001
//    (run `ipconfig getifaddr en0` on macOS to find it), and ensure the phone is
//    on the same Wi-Fi. With an Expo tunnel you still need the LAN IP for the API.

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'http://10.176.20.46:3001'; // DEMO ONLY — LAN IP so Expo Go on a phone can reach the backend. Use 'http://localhost:3001' for the web preview.

const TOKEN_KEY = 'mp_citizen_token';

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function setToken(t) {
  if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

const client = axios.create({ baseURL: `${API_BASE_URL}/api`, timeout: 60000 });

client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const api = {
  sendOtp: (phone) => client.post('/auth/citizen/send-otp', { phone }),
  verifyOtp: (phone, otp, full_name) => client.post('/auth/citizen/verify-otp', { phone, otp, full_name }),
  me: () => client.get('/auth/me'),
  violationTypes: () => client.get('/violation-types'),
  myCases: () => client.get('/cases/my'),
  caseDetail: (id) => client.get(`/cases/${id}`),
  submitCase: (formData, onUploadProgress) =>
    client.post('/cases', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
};

export function thumbUrl(caseId, token) {
  return `${API_BASE_URL}/api/media/thumbnail/${caseId}?token=${token || ''}`;
}

export default client;
