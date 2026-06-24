import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert,
} from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../App';
import { buildMediaFile } from '../utils/mediaUtils';
import ViolationTypePicker from '../components/ViolationTypePicker';

export default function SubmitScreen({ route, navigation }) {
  const { mediaUri, mediaType, violation: initialViolation, gps, incidentTime } = route.params;
  const { refreshUser } = useAuth();
  const [violation, setViolation] = useState(initialViolation);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    setBusy(true);
    setProgress(0);
    try {
      const form = new FormData();
      form.append('media', buildMediaFile(mediaUri, mediaType));
      form.append('violation_type_id', String(violation.id));
      if (gps) {
        form.append('latitude', String(gps.latitude));
        form.append('longitude', String(gps.longitude));
      }
      form.append('incident_time', incidentTime);
      if (note) form.append('reporter_note', note);

      const r = await api.submitCase(form, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      await refreshUser();
      setResult(r.data.data);
    } catch (e) {
      Alert.alert('Submission failed', e.response?.data?.error || 'Could not submit. Is the backend running?');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <View style={styles.successWrap}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Report Submitted!</Text>
        <Text style={styles.caseNo}>{result.case_number}</Text>
        <View style={styles.resultCard}>
          {result.plate_number ? (
            <>
              <Text style={styles.resultLabel}>Plate detected by AI</Text>
              <Text style={styles.plate}>{result.plate_number}</Text>
              <Text style={styles.conf}>Confidence {Math.round((result.plate_confidence || 0) * 100)}%</Text>
              {result.owner_name && <Text style={styles.owner}>Registered to: {result.owner_name}</Text>}
            </>
          ) : (
            <Text style={styles.resultLabel}>No plate detected — an officer will review manually.</Text>
          )}
        </View>
        <Text style={styles.points}>⭐ Points will be added once an officer accepts your report.</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {mediaType === 'video' ? (
        <View style={styles.videoThumb}><Text style={styles.videoThumbText}>🎥 Video evidence ready</Text></View>
      ) : (
        <Image source={{ uri: mediaUri }} style={styles.thumb} />
      )}

      <Text style={styles.label}>Location</Text>
      <Text style={styles.value}>📍 {gps ? `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}` : 'Not available'}</Text>

      <Text style={styles.label}>Date & Time</Text>
      <Text style={styles.value}>{new Date(incidentTime).toLocaleString('en-IN')}</Text>

      <Text style={styles.label}>Violation Type</Text>
      <View style={styles.pickerBox}>
        <ViolationTypePicker selectedId={violation.id} onSelect={setViolation} />
      </View>

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder="Add any details to help the officer…"
        multiline
      />

      {busy && (
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
          <Text style={styles.progressText}>Uploading… {progress}%</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.submitBtn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        <Text style={styles.submitText}>{busy ? 'Submitting…' : 'Submit Report'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fa' },
  thumb: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#000' },
  videoThumb: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#0b3d91', alignItems: 'center', justifyContent: 'center' },
  videoThumbText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontWeight: '700', color: '#444', marginTop: 16, marginBottom: 4 },
  value: { color: '#222', fontSize: 15 },
  pickerBox: { backgroundColor: '#0b3d91', borderRadius: 12, paddingVertical: 10 },
  noteInput: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', padding: 12, minHeight: 70, textAlignVertical: 'top' },
  progressWrap: { marginTop: 20, backgroundColor: '#e0e0e0', borderRadius: 999, height: 22, overflow: 'hidden', justifyContent: 'center' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#2e7d32' },
  progressText: { textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: '700' },
  submitBtn: { backgroundColor: '#ff6b00', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  successWrap: { flex: 1, backgroundColor: '#f4f6fa', alignItems: 'center', justifyContent: 'center', padding: 24 },
  successIcon: { fontSize: 64 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#2e7d32', marginTop: 8 },
  caseNo: { fontWeight: '700', color: '#0b3d91', marginTop: 4, fontSize: 16 },
  resultCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', marginTop: 20, alignSelf: 'stretch' },
  resultLabel: { color: '#666', fontSize: 13 },
  plate: { fontSize: 28, fontWeight: '800', letterSpacing: 2, marginTop: 6, borderWidth: 2, borderColor: '#222', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 4 },
  conf: { color: '#888', marginTop: 6 },
  owner: { color: '#333', marginTop: 8, fontWeight: '600' },
  points: { color: '#8a5a00', marginTop: 20, textAlign: 'center' },
  doneBtn: { backgroundColor: '#0b3d91', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48, marginTop: 24 },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
