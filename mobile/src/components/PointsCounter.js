import { View, Text, StyleSheet } from 'react-native';
import { colors, serif } from '../theme';

// Small star chip (used in headers) and a full civic-points card.
export default function PointsCounter({ points = 0, compact }) {
  if (compact) {
    return (
      <View style={styles.chip}>
        <Text style={styles.chipText}>★ {points}</Text>
      </View>
    );
  }
  return (
    <View style={styles.box}>
      <Star />
      <Text style={styles.big}>{Number(points).toLocaleString('en-IN')}</Text>
      <Text style={styles.label}>नागरिक अंक · Civic points</Text>
    </View>
  );
}

function Star() {
  return (
    <View style={styles.starWrap}>
      <Text style={styles.star}>★</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  box: { backgroundColor: colors.amberCard, borderWidth: 1, borderColor: colors.amberBorder, borderRadius: 14, padding: 18, alignItems: 'center' },
  starWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  star: { color: colors.saffron, fontSize: 24 },
  big: { fontFamily: serif, fontSize: 32, fontWeight: '700', color: colors.navy },
  label: { color: colors.amberFg, marginTop: 2, fontWeight: '600', fontSize: 12 },
});
