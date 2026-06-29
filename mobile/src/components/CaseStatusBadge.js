import { View, Text, StyleSheet } from 'react-native';
import { STATUS } from '../theme';
import { useLang } from '../i18n';

export default function CaseStatusBadge({ status }) {
  const { t } = useLang();
  const cfg = STATUS[status] || STATUS.PENDING;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.fg }]}>{t(`status_${status}`) || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  text: { fontSize: 10, fontWeight: '600' },
});
