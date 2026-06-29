import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../App';
import { useLang } from '../i18n';
import { colors, serif } from '../theme';
import TricolorStrip from '../components/TricolorStrip';
import PointsCounter from '../components/PointsCounter';

const TIERS = [
  { min: 100, icon: '🏆', hi: 'एलीट सड़क प्रहरी', en: 'Road Guardian Elite' },
  { min: 40, icon: '🛡️', hi: 'सड़क प्रहरी', en: 'Road Guardian' },
  { min: 20, icon: '⛑️', hi: 'हेलमेट हीरो', en: 'Helmet Hero' },
  { min: 0, icon: '🌱', hi: 'नया प्रहरी', en: 'New Reporter' },
];

function tierFor(points, lang) {
  const tier = TIERS.find((x) => points >= x.min) || TIERS[TIERS.length - 1];
  return `${tier.icon} ${lang === 'hi' ? tier.hi : tier.en}`;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { t, lang, setLang } = useLang();
  const stats = [
    { label: t('total_reports'), value: user?.total_reports ?? 0 },
    { label: t('accepted'), value: user?.accepted_reports ?? 0 },
    { label: t('rejected'), value: Math.max(0, (user?.total_reports ?? 0) - (user?.accepted_reports ?? 0)) },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TricolorStrip />
        <View style={styles.headerInner}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.full_name || 'C')[0]}</Text></View>
          <Text style={styles.name}>{user?.full_name || 'Citizen'}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          <Text style={styles.badge}>{tierFor(user?.points ?? 0, lang)}</Text>
        </View>
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

        {/* Language switcher */}
        <Text style={styles.sectionLabel}>{t('language')}</Text>
        <View style={styles.langRow}>
          <TouchableOpacity
            style={[styles.langOption, lang === 'hi' && styles.langOptionActive]}
            onPress={() => setLang('hi')}
          >
            <Text style={[styles.langOptionText, lang === 'hi' && styles.langOptionTextActive]}>हिंदी</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langOption, lang === 'en' && styles.langOptionActive]}
            onPress={() => setLang('en')}
          >
            <Text style={[styles.langOptionText, lang === 'en' && styles.langOptionTextActive]}>English</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>{t('sign_out')}</Text>
        </TouchableOpacity>

        <Text style={styles.demoNote}>{t('demo_note')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: { backgroundColor: colors.navy },
  headerInner: { alignItems: 'center', paddingTop: 40, paddingBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.saffron, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { fontFamily: serif, color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 10 },
  phone: { color: colors.navySoft, marginTop: 2 },
  badge: { color: '#FFD9A8', marginTop: 8, fontWeight: '700' },
  body: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontFamily: serif, fontSize: 24, fontWeight: '700', color: colors.navy },
  statLabel: { color: colors.muted2, fontSize: 12, marginTop: 4, textAlign: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 24, marginBottom: 8 },
  langRow: { flexDirection: 'row', gap: 10 },
  langOption: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: '#fff' },
  langOptionActive: { borderColor: colors.navy, backgroundColor: colors.blueCard },
  langOptionText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  langOptionTextActive: { color: colors.navy },
  signOut: { borderWidth: 1.5, borderColor: colors.red, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  signOutText: { color: colors.red, fontWeight: '700' },
  demoNote: { color: colors.faint, fontSize: 11, textAlign: 'center', marginTop: 24 },
});
