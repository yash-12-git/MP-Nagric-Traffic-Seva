import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../App';
import PointsCounter from '../components/PointsCounter';

function badgeForPoints(points) {
  if (points >= 100) return '🏆 Road Guardian Elite';
  if (points >= 40) return '🛡️ Road Guardian';
  if (points >= 20) return '⛑️ Helmet Hero';
  return '🌱 New Reporter';
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const stats = [
    { label: 'Total Reports', value: user?.total_reports ?? 0 },
    { label: 'Accepted', value: user?.accepted_reports ?? 0 },
    { label: 'Rejected', value: Math.max(0, (user?.total_reports ?? 0) - (user?.accepted_reports ?? 0)) },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.full_name || 'C')[0]}</Text></View>
        <Text style={styles.name}>{user?.full_name || 'Citizen'}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <Text style={styles.badge}>{badgeForPoints(user?.points ?? 0)}</Text>
      </View>

      <View style={styles.body}>
        <PointsCounter points={user?.points ?? 0} />

        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.demoNote}>DEMO build · MP Nagrik Traffic Seva (Phase 0)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fa' },
  header: { backgroundColor: '#0b3d91', alignItems: 'center', paddingTop: 56, paddingBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ff6b00', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 10 },
  phone: { color: '#bcd', marginTop: 2 },
  badge: { color: '#ffd24d', marginTop: 8, fontWeight: '700' },
  body: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0b3d91' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 4, textAlign: 'center' },
  signOut: { borderWidth: 1, borderColor: '#C62828', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  signOutText: { color: '#C62828', fontWeight: '700' },
  demoNote: { color: '#aaa', fontSize: 11, textAlign: 'center', marginTop: 24 },
});
