import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import CaseStatusBadge from '../components/CaseStatusBadge';
import { shortTime } from '../utils/mediaUtils';

export default function MyCasesScreen() {
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
      <View style={styles.header}><Text style={styles.headerText}>My Reports</Text></View>
      <FlatList
        data={cases}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loaded ? <Text style={styles.empty}>No reports yet. Be a Road Guardian!</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.caseNo}>{item.case_number}</Text>
              <Text style={styles.violation}>{item.violation_label}</Text>
              {item.plate_number ? <Text style={styles.plate}>{item.plate_number}</Text> : null}
              <Text style={styles.time}>{shortTime(item.submitted_at)}</Text>
            </View>
            <CaseStatusBadge status={item.status} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fa' },
  header: { backgroundColor: '#0b3d91', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16 },
  headerText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  caseNo: { fontWeight: '700', color: '#222' },
  violation: { color: '#555', marginTop: 2 },
  plate: { fontFamily: 'monospace', marginTop: 4, fontWeight: '700', color: '#0b3d91' },
  time: { color: '#999', fontSize: 12, marginTop: 4 },
});
