import { View, Text, StyleSheet } from 'react-native';

// Indian number-plate tag: blue "IND" block + white plate field.
export default function PlateTag({ plate, size = 'md' }) {
  if (!plate) return null;
  const s = SIZES[size] || SIZES.md;
  return (
    <View style={[styles.wrap, { borderRadius: s.radius }]}>
      <View style={[styles.ind, { paddingHorizontal: s.indPad }]}>
        <Text style={[styles.indText, { fontSize: s.indFont }]}>IND</Text>
      </View>
      <Text style={[styles.plate, { fontSize: s.plateFont, letterSpacing: s.spacing, paddingHorizontal: s.platePad, paddingVertical: s.plateVPad }]}>
        {plate}
      </Text>
    </View>
  );
}

const SIZES = {
  sm: { radius: 3, indPad: 3, indFont: 7, plateFont: 11, spacing: 1, platePad: 6, plateVPad: 2 },
  md: { radius: 5, indPad: 5, indFont: 9, plateFont: 15, spacing: 1.5, platePad: 9, plateVPad: 3 },
  lg: { radius: 5, indPad: 6, indFont: 10, plateFont: 19, spacing: 2, platePad: 11, plateVPad: 5 },
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1.5, borderColor: '#1a1a1a', overflow: 'hidden', alignSelf: 'flex-start' },
  ind: { backgroundColor: '#1B4DA0', alignItems: 'center', justifyContent: 'center' },
  indText: { color: '#fff', fontWeight: '700' },
  plate: { backgroundColor: '#fff', color: '#111', fontWeight: '700' },
});
