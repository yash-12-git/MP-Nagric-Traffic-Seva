import { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import ViolationTypePicker, { VIOLATION_TYPES } from '../components/ViolationTypePicker';
import { getCurrentLocation } from '../services/geoService';
import { useLang } from '../i18n';
import { colors } from '../theme';

const MAX_SECONDS = 30;

export default function CaptureScreen({ navigation }) {
  const { t } = useLang();
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
        <Text style={styles.permText}>{t('cam_required')}</Text>
        <TouchableOpacity style={styles.permBtn} onPress={async () => { await requestCam(); await requestMic(); }}>
          <Text style={styles.permBtnText}>{t('grant_access')}</Text>
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

      {/* Top bar: title + close */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}><Text style={styles.close}>‹</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>{t('report_title')}</Text>
          <Text style={styles.topSub}>{t('step_of')} 2 {t('of')} 3 · {t('evidence_and_type')}</Text>
        </View>
        <View style={styles.steps}>
          <View style={[styles.step, { backgroundColor: colors.greenBright }]} />
          <View style={[styles.step, { backgroundColor: colors.saffron }]} />
          <View style={[styles.step, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
        </View>
      </View>

      {/* framing brackets */}
      <View style={styles.frame} pointerEvents="none">
        <View style={[styles.bracket, styles.btl]} />
        <View style={[styles.bracket, styles.btr]} />
        <View style={[styles.bracket, styles.bbl]} />
        <View style={[styles.bracket, styles.bbr]} />
      </View>

      {recording && (
        <View style={styles.recBadge}>
          <View style={styles.recDot} />
          <Text style={styles.recText}>REC {String(Math.floor(seconds / 60)).padStart(1, '0')}:{String(seconds % 60).padStart(2, '0')}</Text>
        </View>
      )}

      {/* GPS overlay */}
      <View style={styles.gpsOverlay}>
        <Text style={styles.gpsText}>📍 {gps ? `${gps.latitude.toFixed(4)}° N · ${gps.longitude.toFixed(4)}° E` : t('locating')}</Text>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottom}>
        <View style={styles.pickerWrap}>
          <ViolationTypePicker selectedId={violation.id} onSelect={setViolation} variant="chips" />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.modeToggle} onPress={() => setMode(mode === 'video' ? 'photo' : 'video')} disabled={recording}>
            <Text style={styles.modeText}>{mode === 'video' ? `🎥 ${t('mode_video')}` : `📸 ${t('mode_photo')}`}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onShutter} disabled={busy} style={[styles.shutter, recording && styles.shutterRec]}>
            {busy ? <ActivityIndicator color="#fff" /> : <View style={recording ? styles.stopSquare : styles.shutterInner} />}
          </TouchableOpacity>

          <View style={{ width: 80 }} />
        </View>
        <Text style={styles.hint}>{mode === 'video' ? t('hint_video') : t('hint_photo')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#16191c', alignItems: 'center', justifyContent: 'center', padding: 24 },
  permText: { color: '#fff', textAlign: 'center', marginBottom: 16 },
  permBtn: { backgroundColor: colors.saffron, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  permBtnText: { color: '#fff', fontWeight: '700' },
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  close: { color: '#fff', fontSize: 28, lineHeight: 30, marginTop: -2 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  topSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '500' },
  steps: { flexDirection: 'row', gap: 4 },
  step: { width: 20, height: 4, borderRadius: 2 },
  frame: { position: 'absolute', top: '34%', left: 60, right: 60, height: 130 },
  bracket: { position: 'absolute', width: 24, height: 24, borderColor: 'rgba(255,255,255,0.85)' },
  btl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  btr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  bbl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  bbr: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  recBadge: { position: 'absolute', top: 100, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, gap: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0483A' },
  recText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  gpsOverlay: { position: 'absolute', bottom: 220, left: 16, backgroundColor: 'rgba(0,0,0,0.42)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gpsText: { color: '#fff', fontSize: 10.5 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 32, paddingTop: 12 },
  pickerWrap: { marginBottom: 16 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  modeToggle: { width: 80, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterRec: { borderColor: '#E0483A' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  stopSquare: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#E0483A' },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textAlign: 'center', marginTop: 10 },
});
