import { View, Text, StyleSheet } from 'react-native';
import { colors, serif } from '../theme';
import TricolorStrip from '../components/TricolorStrip';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <TricolorStrip height={4} style={styles.topStrip} />
      <View style={styles.emblem}>
        <Text style={styles.emblemIcon}>🛡️</Text>
      </View>
      <Text style={styles.title}>नागरिक ट्रैफिक सेवा</Text>
      <Text style={styles.subtitle}>MP Nagrik Traffic Seva</Text>
      <View style={styles.divider} />
      <Text style={styles.tag}>नागरिक रिपोर्टिंग · DEMO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  topStrip: { position: 'absolute', top: 0, left: 0, right: 0 },
  emblem: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emblemIcon: { fontSize: 48 },
  title: { fontFamily: serif, color: '#fff', fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.navySoft, fontSize: 14, marginTop: 4, fontWeight: '500' },
  divider: { width: 48, height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 20 },
  tag: { color: colors.navySoft, fontSize: 12, marginTop: 16 },
});
