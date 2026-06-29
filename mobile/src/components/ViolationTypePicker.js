import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { useLang } from '../i18n';

export const VIOLATION_TYPES = [
  { id: 2, code: 'NO_HELMET', icon: '⛑️', label_en: 'No helmet', label_hi: 'बिना हेलमेट', fine: 500 },
  { id: 1, code: 'SIGNAL_JUMP', icon: '🚦', label_en: 'Signal jump', label_hi: 'रेड सिग्नल', fine: 1000 },
  { id: 3, code: 'TRIPLE_RIDING', icon: '🏍️', label_en: 'Triple riding', label_hi: 'ट्रिपल सवारी', fine: 500 },
  { id: 4, code: 'WRONG_WAY', icon: '↩️', label_en: 'Wrong side', label_hi: 'गलत दिशा', fine: 1000 },
  { id: 5, code: 'MOBILE_USE', icon: '📱', label_en: 'Mobile use', label_hi: 'मोबाइल चलाना', fine: 1000 },
  { id: 6, code: 'NO_SEATBELT', icon: '🪑', label_en: 'No seatbelt', label_hi: 'बिना सीटबेल्ट', fine: 1000 },
  { id: 7, code: 'OVERLOADING', icon: '📦', label_en: 'Overloading', label_hi: 'ओवरलोडिंग', fine: 2000 },
];

export default function ViolationTypePicker({ selectedId, onSelect, variant = 'chips' }) {
  const { lang } = useLang();
  const primary = (v) => (lang === 'hi' ? v.label_hi : v.label_en);
  const secondary = (v) => (lang === 'hi' ? v.label_en : v.label_hi);

  if (variant === 'grid') {
    return (
      <View style={styles.grid}>
        {VIOLATION_TYPES.slice(0, 4).map((v) => {
          const active = v.id === selectedId;
          return (
            <TouchableOpacity key={v.id} onPress={() => onSelect(v)} style={[styles.gridCard, active && styles.gridCardActive]}>
              <Text style={styles.gridIcon}>{v.icon}</Text>
              <Text style={[styles.gridLabel, active && styles.gridLabelActive]}>{primary(v)}</Text>
              <Text style={[styles.gridSub, active && styles.gridSubActive]}>{secondary(v)} · ₹{v.fine}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {VIOLATION_TYPES.map((v) => {
        const active = v.id === selectedId;
        return (
          <TouchableOpacity key={v.id} onPress={() => onSelect(v)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={styles.icon}>{v.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{primary(v)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 8, gap: 8 },
  chip: {
    backgroundColor: 'rgba(28,58,87,0.78)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
    alignItems: 'center', marginRight: 8, minWidth: 86, borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: colors.saffron, borderColor: '#fff' },
  icon: { fontSize: 20 },
  label: { color: '#fff', fontSize: 11, marginTop: 2, fontWeight: '600' },
  labelActive: { color: '#fff' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCard: {
    width: '48%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 11, paddingVertical: 11, paddingHorizontal: 12,
  },
  gridCardActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  gridIcon: { fontSize: 18, marginBottom: 4 },
  gridLabel: { fontSize: 13, fontWeight: '600', color: colors.ink, lineHeight: 16 },
  gridLabelActive: { color: '#fff' },
  gridSub: { fontSize: 10, color: colors.muted2, marginTop: 1 },
  gridSubActive: { color: colors.navySoft },
});
