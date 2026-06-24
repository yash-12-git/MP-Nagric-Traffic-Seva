import { View, Text, StyleSheet } from 'react-native';

export default function PointsCounter({ points = 0, compact }) {
  if (compact) {
    return (
      <View style={styles.chip}>
        <Text style={styles.chipText}>⭐ {points}</Text>
      </View>
    );
  }
  return (
    <View style={styles.box}>
      <Text style={styles.big}>⭐ {points}</Text>
      <Text style={styles.label}>Road Guardian Points</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { color: '#fff', fontWeight: '700' },
  box: { backgroundColor: '#fff7e6', borderRadius: 14, padding: 18, alignItems: 'center' },
  big: { fontSize: 34, fontWeight: '800', color: '#b5651d' },
  label: { color: '#8a5a00', marginTop: 4, fontWeight: '600' },
});
