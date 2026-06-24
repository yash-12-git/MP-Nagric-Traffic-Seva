import { View, Text, StyleSheet } from 'react-native';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending Review', color: '#888888', bg: '#F5F5F5' },
  UNDER_REVIEW: { label: 'Under Review', color: '#1565C0', bg: '#E3F2FD' },
  CHALLAN_ISSUED: { label: 'Challan Issued', color: '#2E7D32', bg: '#E8F5E9' },
  REJECTED: { label: 'Rejected', color: '#C62828', bg: '#FFEBEE' },
};

export default function CaseStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
});
