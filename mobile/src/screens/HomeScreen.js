import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useAuth } from '../App';
import { useLang } from '../i18n';
import { colors, serif, STATUS, shadow } from '../theme';
import TricolorStrip from '../components/TricolorStrip';
import CaseStatusBadge from '../components/CaseStatusBadge';
import { shortTime } from '../utils/mediaUtils';

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { t, lang, toggle } = useLang();
  const [recent, setRecent] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await refreshUser();
    try {
      const r = await api.myCases();
      setRecent(r.data.data.slice(0, 3));
    } catch { /* ignore */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const points = user?.points ?? 0;
  const rank = Math.max(1, 500 - points);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TricolorStrip />
        <View style={styles.headerRow}>
          <View style={styles.logoDot}><Text style={{ fontSize: 18 }}>🛡️</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>{t('appName')}</Text>
            <Text style={styles.brandSub}>{t('appNameSub')}</Text>
          </View>
          <TouchableOpacity style={styles.langChip} onPress={toggle}>
            <Text style={styles.langChipText}>{lang === 'hi' ? 'EN' : 'हि'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.greetBlock}>
          <Text style={styles.greeting}>{t('hello')}</Text>
          <Text style={styles.name}>{user?.full_name || 'Citizen'}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Civic points card */}
        <View style={[styles.pointsCard, shadow.card]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pointsLabel}>{t('civic_points')} · {t('civic_points_en')}</Text>
            <Text style={styles.pointsValue}>{Number(points).toLocaleString('en-IN')}</Text>
            <Text style={styles.pointsMeta}>{t('rank_in')} #{rank} · {user?.total_reports ?? 0} {t('contributions')}</Text>
          </View>
          <View style={styles.starCircle}><Text style={styles.starIcon}>★</Text></View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={[styles.cta, shadow.card]} onPress={() => navigation.navigate('Capture')}>
          <View style={styles.ctaIcon}><Text style={{ fontSize: 24 }}>📷</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>{t('report_violation')}</Text>
            <Text style={styles.ctaSub}>{t('report_violation_sub')}</Text>
          </View>
          <Text style={styles.ctaChev}>›</Text>
        </TouchableOpacity>

        {/* My reports */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('my_reports')} <Text style={styles.sectionTitleSub}>· {t('my_reports_en')}</Text></Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyCasesTab')}>
            <Text style={styles.viewAll}>{t('view_all')}</Text>
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <Text style={styles.empty}>{t('no_reports')}</Text>
        ) : (
          recent.map((c) => {
            const cfg = STATUS[c.status] || STATUS.PENDING;
            return (
              <View key={c.id} style={styles.reportItem}>
                <View style={[styles.reportIcon, { backgroundColor: cfg.card }]}>
                  <Text style={{ fontSize: 16, color: cfg.fg }}>
                    {c.status === 'CHALLAN_ISSUED' ? '✓' : c.status === 'REJECTED' ? '✕' : c.status === 'UNDER_REVIEW' ? '⌕' : '◷'}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.reportNo}>{c.case_number}</Text>
                  <Text style={styles.reportMeta} numberOfLines={1}>
                    {c.violation_label}{c.plate_number ? ` · ${c.plate_number}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <CaseStatusBadge status={c.status} />
                  <Text style={styles.reportTime}>{shortTime(c.submitted_at)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: { backgroundColor: colors.navy, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 20, paddingTop: 50 },
  logoDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: serif, color: '#fff', fontSize: 16, fontWeight: '700' },
  brandSub: { color: colors.navySoft, fontSize: 10.5, fontWeight: '500' },
  langChip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 16, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  langChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  greetBlock: { paddingHorizontal: 20, paddingTop: 14 },
  greeting: { color: colors.navySoft, fontSize: 13 },
  name: { fontFamily: serif, color: '#fff', fontSize: 22, fontWeight: '700' },

  body: { padding: 16 },
  pointsCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  pointsLabel: { fontSize: 11, fontWeight: '600', color: colors.muted2, textTransform: 'uppercase', letterSpacing: 0.4 },
  pointsValue: { fontFamily: serif, fontSize: 32, fontWeight: '700', color: colors.navy, marginTop: 2 },
  pointsMeta: { fontSize: 12, color: colors.muted },
  starCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.amberCard, borderWidth: 1, borderColor: colors.amberBorder, alignItems: 'center', justifyContent: 'center' },
  starIcon: { color: colors.saffron, fontSize: 24 },

  cta: { backgroundColor: colors.saffron, borderRadius: 16, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 },
  ctaIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontFamily: serif, color: '#fff', fontSize: 17, fontWeight: '700' },
  ctaSub: { color: colors.saffronSoft, fontSize: 11.5, fontWeight: '500', marginTop: 1 },
  ctaChev: { color: '#fff', fontSize: 26, fontWeight: '300' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  sectionTitleSub: { color: colors.muted2, fontWeight: '500' },
  viewAll: { fontSize: 12, color: colors.navy, fontWeight: '600' },
  empty: { color: colors.muted2, marginTop: 8, marginBottom: 20 },

  reportItem: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 9 },
  reportIcon: { width: 42, height: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  reportNo: { fontSize: 12.5, fontWeight: '700', color: colors.ink, letterSpacing: 0.2 },
  reportMeta: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  reportTime: { fontSize: 10, color: colors.faint, marginTop: 4 },
});
