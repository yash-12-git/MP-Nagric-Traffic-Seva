import { View, Text, StyleSheet } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emblem}>🛡️</Text>
      <Text style={styles.title}>MP Nagrik Traffic Seva</Text>
      <Text style={styles.subtitle}>मध्य प्रदेश यातायात सेवा</Text>
      <Text style={styles.tag}>Citizen Reporting · DEMO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b3d91', alignItems: 'center', justifyContent: 'center' },
  emblem: { fontSize: 72, marginBottom: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#bcd', fontSize: 16, marginTop: 4 },
  tag: { color: '#9ab', fontSize: 12, marginTop: 24 },
});
