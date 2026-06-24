import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useAuth } from '../App';
import PointsCounter from '../components/PointsCounter';
import CaseStatusBadge from '../components/CaseStatusBadge';
import { shortTime } from '../utils/mediaUtils';

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>नमस्ते,</Text>
          <Text style={styles.name}>{user?.full_name || 'Citizen'}</Text>
        </View>
        <PointsCounter points={user?.points ?? 0} compact />
      </View>

      <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('Capture')}>
        <Text style={styles.reportIcon}>📷</Text>
        <Text style={styles.reportText}>Report Violation</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.shortcut} onPress={() => navigation.navigate('MyCasesTab')}>
        <Text style={styles.shortcutIcon}>📋</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.shortcutTitle}>My Reports</Text>
          <Text style={styles.shortcutSub}>Track the status of your submissions</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {recent.length === 0 ? (
        <Text style={styles.empty}>No reports yet. Be a Road Guardian!</Text>
      ) : (
        recent.map((c) => (
          <View key={c.id} style={styles.caseCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.caseNo}>{c.case_number}</Text>
              <Text style={styles.caseViolation}>{c.violation_label}</Text>
              <Text style={styles.caseTime}>{shortTime(c.submitted_at)}</Text>
            </View>
            <CaseStatusBadge status={c.status} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fa' },
  header: {
    backgroundColor: '#0b3d91', padding: 20, paddingTop: 56, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { color: '#bcd', fontSize: 14 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800' },
  reportBtn: {
    backgroundColor: '#ff6b00', margin: 16, borderRadius: 16, paddingVertical: 24,
    alignItems: 'center', elevation: 3,
  },
  reportIcon: { fontSize: 40 },
  reportText: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 6 },
  shortcut: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  shortcutIcon: { fontSize: 26 },
  shortcutTitle: { fontWeight: '700', fontSize: 15, color: '#222' },
  shortcutSub: { color: '#888', fontSize: 12 },
  chev: { fontSize: 28, color: '#ccc' },
  sectionTitle: { fontWeight: '700', fontSize: 16, color: '#333', marginHorizontal: 16, marginTop: 24, marginBottom: 8 },
  empty: { color: '#999', marginHorizontal: 16, marginBottom: 24 },
  caseCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  caseNo: { fontWeight: '700', color: '#222' },
  caseViolation: { color: '#555', marginTop: 2 },
  caseTime: { color: '#999', fontSize: 12, marginTop: 2 },
});
