import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

export const VIOLATION_TYPES = [
  { id: 1, code: 'SIGNAL_JUMP', icon: '🚦', label_en: 'Signal Jump', label_hi: 'सिग्नल तोड़ना' },
  { id: 2, code: 'NO_HELMET', icon: '⛑️', label_en: 'No Helmet', label_hi: 'बिना हेलमेट' },
  { id: 3, code: 'TRIPLE_RIDING', icon: '🏍️', label_en: 'Triple Riding', label_hi: 'ट्रिपल राइडिंग' },
  { id: 4, code: 'WRONG_WAY', icon: '↩️', label_en: 'Wrong Way', label_hi: 'गलत दिशा' },
  { id: 5, code: 'MOBILE_USE', icon: '📱', label_en: 'Mobile Use', label_hi: 'मोबाइल चलाना' },
  { id: 6, code: 'NO_SEATBELT', icon: '🪑', label_en: 'No Seatbelt', label_hi: 'बिना सीटबेल्ट' },
  { id: 7, code: 'OVERLOADING', icon: '📦', label_en: 'Overloading', label_hi: 'ओवरलोडिंग' },
];

export default function ViolationTypePicker({ selectedId, onSelect, horizontal = true }) {
  return (
    <ScrollView
      horizontal={horizontal}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {VIOLATION_TYPES.map((v) => {
        const active = v.id === selectedId;
        return (
          <TouchableOpacity
            key={v.id}
            onPress={() => onSelect(v)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={styles.icon}>{v.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{v.label_en}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 8, gap: 8 },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
    alignItems: 'center', marginRight: 8, minWidth: 84, borderWidth: 2, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#ff6b00', borderColor: '#fff' },
  icon: { fontSize: 22 },
  label: { color: '#fff', fontSize: 11, marginTop: 2, fontWeight: '600' },
  labelActive: { color: '#fff' },
});
