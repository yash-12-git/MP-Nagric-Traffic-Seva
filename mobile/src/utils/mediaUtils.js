// Helpers to build a multipart form file part from an expo-camera capture.

export function buildMediaFile(uri, type) {
  const isVideo = type === 'video';
  const name = isVideo ? `evidence_${Date.now()}.mp4` : `evidence_${Date.now()}.jpg`;
  const mime = isVideo ? 'video/mp4' : 'image/jpeg';
  // React Native FormData accepts { uri, name, type }.
  return { uri, name, type: mime };
}

export function shortTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
