import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert,
} from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../App';
import { useLang } from '../i18n';
import { colors, serif, shadow } from '../theme';
import { buildMediaFile, formatDateTime } from '../utils/mediaUtils';
import ViolationTypePicker from '../components/ViolationTypePicker';
import PlateTag from '../components/PlateTag';
import TricolorStrip from '../components/TricolorStrip';

export default function SubmitScreen({ route, navigation }) {
  const { mediaUri, mediaType, violation: initialViolation, gps, incidentTime } = route.params;
  const { refreshUser } = useAuth();
  const { t } = useLang();
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
      Alert.alert(t('submit_failed'), e.response?.data?.error || t('submit_failed_msg'));
    } finally {
      setBusy(false);
    }
  };

  if (result) return <SuccessView result={result} navigation={navigation} t={t} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {mediaType === 'video' ? (
        <View style={styles.videoThumb}><Text style={styles.videoThumbText}>🎥 {t('video_ready')}</Text></View>
      ) : (
        <Image source={{ uri: mediaUri }} style={styles.thumb} />
      )}

      <Text style={styles.label}>{t('location')}</Text>
      <View style={styles.locCard}>
        <Text style={styles.locText}>📍 {gps ? `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}` : t('not_available')}</Text>
        <View style={styles.autoPill}><Text style={styles.autoPillText}>✓ {t('auto')}</Text></View>
      </View>

      <Text style={styles.label}>{t('date_time')}</Text>
      <Text style={styles.value}>{formatDateTime(incidentTime)}</Text>

      <Text style={styles.label}>{t('violation_type')} <Text style={styles.labelSub}>· {t('violation_type_en')}</Text></Text>
      <ViolationTypePicker selectedId={violation.id} onSelect={setViolation} variant="grid" />

      <Text style={styles.label}>{t('note_optional')}</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder={t('note_placeholder')}
        placeholderTextColor={colors.faint}
        multiline
      />

      {busy && (
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
          <Text style={styles.progressText}>{t('uploading')} {progress}%</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.submitBtn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        <Text style={styles.submitText}>{busy ? t('submitting') : t('submit_report')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SuccessView({ result, navigation, t }) {
  const pct = Math.round((result.plate_confidence || 0) * 100);
  return (
    <ScrollView style={styles.container}>
      {/* hero */}
      <View style={styles.hero}>
        <TricolorStrip height={3} style={styles.heroStrip} />
        <View style={styles.checkOuter}>
          <View style={styles.checkInner}><Text style={styles.checkMark}>✓</Text></View>
        </View>
        <Text style={styles.heroTitle}>{t('report_submitted')}</Text>
        <Text style={styles.heroSub}>{t('report_submitted_en')}</Text>
        <View style={styles.caseChip}>
          <Text style={styles.caseChipLabel}>{t('case_number')}</Text>
          <Text style={styles.caseChipNo}>{result.case_number}</Text>
        </View>
      </View>

      <View style={{ padding: 18 }}>
        {/* AI detection */}
        <View style={[styles.card, shadow.card]}>
          {result.plate_number ? (
            <>
              <Text style={styles.cardHeading}>✦ {t('plate_auto_detected')}</Text>
              <View style={styles.plateRow}>
                <PlateTag plate={result.plate_number} size="lg" />
                <View style={{ flex: 1 }}>
                  <View style={styles.confTrack}><View style={[styles.confFill, { width: `${pct}%` }]} /></View>
                  <Text style={styles.confText}>{t('ocr_confidence')} · {pct}%</Text>
                </View>
              </View>
              {(result.owner_name || result.vehicle_type) && (
                <View style={styles.ownerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ownerLabel}>{t('vehicle_owner_vahan')}</Text>
                    <Text style={styles.ownerValue}>{result.owner_name || '—'}</Text>
                  </View>
                  {result.vehicle_type ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.ownerLabel}>{t('vehicle')}</Text>
                      <Text style={styles.ownerValue}>{result.vehicle_type}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.noPlate}>{t('no_plate_detected')}</Text>
          )}
        </View>

        {/* timeline */}
        <Text style={styles.timelineHeading}>{t('what_next')} <Text style={styles.labelSub}>· {t('what_next_en')}</Text></Text>
        <View style={styles.timeline}>
          <TimelineStep done title={t('step_evidence_secured')} sub={t('step_evidence_secured_sub')} />
          <TimelineStep active title={t('step_officer_review')} sub={t('step_officer_review_sub')} />
          <TimelineStep title={t('step_challan_issued')} sub={t('step_challan_issued_sub')} last />
        </View>

        {/* points */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsStar}>★</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.pointsTitle}>{t('points_on_approval')}</Text>
            <Text style={styles.pointsSub}>{t('points_on_approval_sub')}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.outlineBtnText}>{t('view_status')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.solidBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.solidBtnText}>{t('done')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function TimelineStep({ title, sub, done, active, last }) {
  return (
    <View style={[styles.tlStep, !last && { marginBottom: 14 }]}>
      <View style={[styles.tlDot, done ? styles.tlDotDone : active ? styles.tlDotActive : styles.tlDotPending]}>
        {done && <Text style={styles.tlCheck}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.tlTitle, !done && !active && { color: colors.faint }]}>{title}</Text>
        <Text style={styles.tlSub}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  thumb: { width: '100%', height: 200, borderRadius: 16, backgroundColor: '#000' },
  videoThumb: { width: '100%', height: 120, borderRadius: 16, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  videoThumbText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontWeight: '700', color: colors.ink, marginTop: 16, marginBottom: 6, fontSize: 13 },
  labelSub: { color: colors.muted2, fontWeight: '500' },
  value: { color: colors.ink, fontSize: 15 },
  locCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  locText: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '600' },
  autoPill: { backgroundColor: colors.greenBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  autoPillText: { color: colors.greenFg, fontSize: 10, fontWeight: '600' },
  noteInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, padding: 12, minHeight: 70, textAlignVertical: 'top', color: colors.ink },
  progressWrap: { marginTop: 20, backgroundColor: colors.border, borderRadius: 999, height: 22, overflow: 'hidden', justifyContent: 'center' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.green },
  progressText: { textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: '700' },
  submitBtn: { backgroundColor: colors.green, borderRadius: 13, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16, fontFamily: serif },

  // success
  hero: { backgroundColor: colors.green, paddingTop: 56, paddingBottom: 24, alignItems: 'center' },
  heroStrip: { width: 64, marginBottom: 16 },
  checkOuter: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  checkInner: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: colors.green, fontSize: 24, fontWeight: '800' },
  heroTitle: { fontFamily: serif, color: '#fff', fontSize: 21, fontWeight: '700' },
  heroSub: { color: '#BFE0CD', fontSize: 12.5, marginTop: 2 },
  caseChip: { marginTop: 14, backgroundColor: 'rgba(0,0,0,0.16)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  caseChipLabel: { fontSize: 10, color: '#BFE0CD', textTransform: 'uppercase', letterSpacing: 0.6 },
  caseChipNo: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 15, marginBottom: 16 },
  cardHeading: { fontSize: 12, fontWeight: '600', color: colors.ink, marginBottom: 12 },
  plateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 13 },
  confTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  confFill: { height: '100%', backgroundColor: colors.green },
  confText: { fontSize: 10.5, color: colors.muted, marginTop: 4 },
  ownerRow: { borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between' },
  ownerLabel: { fontSize: 10, color: colors.muted2, textTransform: 'uppercase', letterSpacing: 0.4 },
  ownerValue: { fontSize: 13, fontWeight: '600', color: colors.ink },
  noPlate: { color: colors.amberFg, fontSize: 13 },

  timelineHeading: { fontSize: 12, fontWeight: '700', color: colors.ink, marginBottom: 11 },
  timeline: { paddingLeft: 8, marginBottom: 18 },
  tlStep: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  tlDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tlDotDone: { backgroundColor: colors.green },
  tlDotActive: { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.navy },
  tlDotPending: { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.border },
  tlCheck: { color: '#fff', fontSize: 10, fontWeight: '800' },
  tlTitle: { fontSize: 12.5, fontWeight: '600', color: colors.ink },
  tlSub: { fontSize: 11, color: colors.muted2 },

  pointsCard: { backgroundColor: colors.amberCard, borderWidth: 1, borderColor: colors.amberBorder, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 16 },
  pointsStar: { color: colors.saffron, fontSize: 22 },
  pointsTitle: { fontSize: 12.5, fontWeight: '600', color: colors.ink },
  pointsSub: { fontSize: 11, color: colors.amberFg },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 40 },
  outlineBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.navy, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  outlineBtnText: { color: colors.navy, fontWeight: '600', fontSize: 13 },
  solidBtn: { flex: 1, backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  solidBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
