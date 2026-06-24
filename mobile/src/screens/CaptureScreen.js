import { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import ViolationTypePicker, { VIOLATION_TYPES } from '../components/ViolationTypePicker';
import { getCurrentLocation } from '../services/geoService';

const MAX_SECONDS = 30;

export default function CaptureScreen({ navigation }) {
  const cameraRef = useRef(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [mode, setMode] = useState('video'); // 'video' | 'photo'
  const [violation, setViolation] = useState(VIOLATION_TYPES[0]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [gps, setGps] = useState(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    getCurrentLocation().then(setGps);
    return () => clearInterval(timerRef.current);
  }, []);

  if (!camPerm) return <View style={styles.center}><ActivityIndicator color="#fff" /></View>;
  if (!camPerm.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is required to capture evidence.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={async () => { await requestCam(); await requestMic(); }}>
          <Text style={styles.permBtnText}>Grant Camera & Mic Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const goToSubmit = (uri, type) => {
    navigation.navigate('Submit', {
      mediaUri: uri,
      mediaType: type,
      violation,
      gps,
      incidentTime: new Date().toISOString(),
    });
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    if (!micPerm?.granted) await requestMic();
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stopRecording();
        return s + 1;
      });
    }, 1000);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_SECONDS });
      if (video?.uri) goToSubmit(video.uri, 'video');
    } catch (e) {
      console.warn('[capture] record error:', e.message);
    } finally {
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (cameraRef.current && recording) cameraRef.current.stopRecording();
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) goToSubmit(photo.uri, 'photo');
    } catch (e) {
      console.warn('[capture] photo error:', e.message);
    } finally { setBusy(false); }
  };

  const onShutter = () => {
    if (mode === 'photo') takePhoto();
    else if (recording) stopRecording();
    else startRecording();
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mode={mode === 'photo' ? 'picture' : 'video'} />

      {/* Top bar: GPS + close */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.close}>✕</Text></TouchableOpacity>
        <View style={styles.gpsChip}>
          <Text style={styles.gpsText}>{gps ? '📍 GPS locked' : '📍 locating…'}</Text>
        </View>
      </View>

      {recording && (
        <View style={styles.recBadge}>
          <Text style={styles.recDot}>●</Text>
          <Text style={styles.recText}>{String(seconds).padStart(2, '0')}s / {MAX_SECONDS}s</Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottom}>
        <View style={styles.pickerWrap}>
          <ViolationTypePicker selectedId={violation.id} onSelect={setViolation} />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.modeToggle} onPress={() => setMode(mode === 'video' ? 'photo' : 'video')} disabled={recording}>
            <Text style={styles.modeText}>{mode === 'video' ? '🎥 Video' : '📸 Photo'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onShutter} disabled={busy} style={[styles.shutter, recording && styles.shutterRec]}>
            {busy ? <ActivityIndicator color="#fff" /> : <View style={recording ? styles.stopSquare : styles.shutterInner} />}
          </TouchableOpacity>

          <View style={{ width: 80 }} />
        </View>
        <Text style={styles.hint}>{mode === 'video' ? 'Tap to start/stop recording (max 30s)' : 'Tap to capture photo'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  permText: { color: '#fff', textAlign: 'center', marginBottom: 16 },
  permBtn: { backgroundColor: '#ff6b00', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  permBtnText: { color: '#fff', fontWeight: '700' },
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { color: '#fff', fontSize: 26 },
  gpsChip: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  gpsText: { color: '#9fe', fontSize: 12, fontWeight: '600' },
  recBadge: { position: 'absolute', top: 100, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, gap: 6 },
  recDot: { color: 'red', fontSize: 14 },
  recText: { color: '#fff', fontWeight: '700' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 32, paddingTop: 12 },
  pickerWrap: { marginBottom: 16 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  modeToggle: { width: 80, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterRec: { borderColor: 'red' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  stopSquare: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'red' },
  hint: { color: '#ccc', fontSize: 12, textAlign: 'center', marginTop: 10 },
});
