// Helpers to build a multipart form file part from an expo-camera capture.

export function buildMediaFile(uri, type) {
  const isVideo = type === 'video';
  const name = isVideo ? `evidence_${Date.now()}.mp4` : `evidence_${Date.now()}.jpg`;
  const mime = isVideo ? 'video/mp4' : 'image/jpeg';
  // React Native FormData accepts { uri, name, type }.
  return { uri, name, type: mime };
}

// NOTE: we format with the Date's LOCAL getters rather than toLocaleString().
// React Native's Hermes engine has limited Intl support and renders
// toLocaleString() in UTC, which made captured times display ~5.5h early (IST).
// getHours()/getDate()/etc. correctly use the device timezone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

function to12h(h) {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return { hour, ampm };
}

export function shortTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const { hour, ampm } = to12h(d.getHours());
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}, ${pad(hour)}:${pad(d.getMinutes())} ${ampm}`;
}

export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const { hour, ampm } = to12h(d.getHours());
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(hour)}:${pad(d.getMinutes())} ${ampm}`;
}
