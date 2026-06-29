import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useLang } from '../i18n';
import { colors, serif } from '../theme';
import TricolorStrip from '../components/TricolorStrip';
import CaseStatusBadge from '../components/CaseStatusBadge';
import PlateTag from '../components/PlateTag';
import { shortTime } from '../utils/mediaUtils';

export default function MyCasesScreen() {
  const { t } = useLang();
  const [cases, setCases] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.myCases();
      setCases(r.data.data);
    } catch { /* ignore */ } finally { setLoaded(true); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TricolorStrip />
        <View style={styles.headerInner}>
          <Text style={styles.headerText}>{t('my_reports')}</Text>
          <Text style={styles.headerSub}>{t('my_reports_en')}</Text>
        </View>
      </View>
      <FlatList
        data={cases}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={loaded ? <Text style={styles.empty}>{t('no_reports')}</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.topLine}>
                <Text style={styles.caseNo}>{item.case_number}</Text>
                <CaseStatusBadge status={item.status} />
              </View>
              <View style={styles.midLine}>
                {item.plate_number ? <PlateTag plate={item.plate_number} size="sm" /> : null}
                <Text style={styles.violation}>{item.violation_label}</Text>
              </View>
              <Text style={styles.time}>{shortTime(item.submitted_at)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: { backgroundColor: colors.navy },
  headerInner: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 },
  headerText: { fontFamily: serif, color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: colors.navySoft, fontSize: 11, marginTop: 1 },
  empty: { color: colors.muted2, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, marginBottom: 10 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  caseNo: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  midLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  violation: { color: colors.body, fontWeight: '500', fontSize: 12.5 },
  time: { color: colors.faint, fontSize: 11, marginTop: 6 },
});
