import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../App';
import { useLang } from '../i18n';
import { colors, serif, shadow } from '../theme';
import TricolorStrip from '../components/TricolorStrip';

// Civic-rewards screen (new feature from the redesign's "इनाम / Rewards" tab):
// tiers, current rank, and progress to the next tier — all from existing user data.
const TIERS = [
  { min: 0, icon: '🌱', hi: 'नया प्रहरी', en: 'New Reporter' },
  { min: 20, icon: '⛑️', hi: 'हेलमेट हीरो', en: 'Helmet Hero' },
  { min: 40, icon: '🛡️', hi: 'सड़क प्रहरी', en: 'Road Guardian' },
  { min: 100, icon: '🏆', hi: 'एलीट प्रहरी', en: 'Road Guardian Elite' },
];

function tierFor(points) {
  let idx = 0;
  TIERS.forEach((tier, i) => { if (points >= tier.min) idx = i; });
  return idx;
}

export default function RewardsScreen() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const points = user?.points ?? 0;
  const idx = tierFor(points);
  const current = TIERS[idx];
  const next = TIERS[idx + 1];
  const rank = Math.max(1, 500 - points);
  const toNext = next ? next.min - points : 0;
  const pct = next ? Math.min(100, Math.round(((points - current.min) / (next.min - current.min)) * 100)) : 100;
  const name = (tier) => (lang === 'hi' ? tier.hi : tier.en);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TricolorStrip />
        <View style={styles.headerInner}>
          <Text style={styles.headerText}>{t('rewards_title')}</Text>
          <Text style={styles.headerSub}>{t('rewards_sub')}</Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* current tier */}
        <View style={[styles.tierCard, shadow.card]}>
          <Text style={styles.tierIcon}>{current.icon}</Text>
          <Text style={styles.tierLabel}>{t('your_tier')}</Text>
          <Text style={styles.tierName}>{name(current)}</Text>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{Number(points).toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>{t('civic_points')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>#{rank}</Text>
              <Text style={styles.statLabel}>{t('rank_label')}</Text>
            </View>
          </View>
          {next && (
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
              <Text style={styles.progressText}>{t('next_tier_in')} {name(next)}: {toNext} {t('points_needed')}</Text>
            </View>
          )}
        </View>

        {/* tiers list */}
        <Text style={styles.section}>{t('tiers')}</Text>
        {TIERS.map((tier, i) => (
          <View key={tier.en} style={[styles.tierRow, i === idx && styles.tierRowActive]}>
            <Text style={styles.tierRowIcon}>{tier.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tierRowName}>{name(tier)}</Text>
              <Text style={styles.tierRowReq}>{tier.min}+ {t('civic_points')}</Text>
            </View>
            {i === idx && <View style={styles.currentPill}><Text style={styles.currentPillText}>●</Text></View>}
          </View>
        ))}

        {/* how points work */}
        <Text style={styles.section}>{t('how_points_work')}</Text>
        <View style={styles.howCard}>
          {[t('how_points_1'), t('how_points_2'), t('how_points_3')].map((line) => (
            <View key={line} style={styles.howRow}>
              <Text style={styles.howStar}>★</Text>
              <Text style={styles.howText}>{line}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: { backgroundColor: colors.navy },
  headerInner: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 },
  headerText: { fontFamily: serif, color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: colors.navySoft, fontSize: 11, marginTop: 1 },

  tierCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 18 },
  tierIcon: { fontSize: 44 },
  tierLabel: { fontSize: 11, color: colors.muted2, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  tierName: { fontFamily: serif, fontSize: 22, fontWeight: '700', color: colors.navy, marginTop: 2 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: serif, fontSize: 24, fontWeight: '700', color: colors.ink },
  statLabel: { fontSize: 11, color: colors.muted2, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },
  progressBlock: { alignSelf: 'stretch', marginTop: 18 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.saffron },
  progressText: { fontSize: 11, color: colors.muted, marginTop: 6, textAlign: 'center' },

  section: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 10, marginTop: 4 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  tierRowActive: { borderColor: colors.saffron, backgroundColor: colors.amberCard },
  tierRowIcon: { fontSize: 24 },
  tierRowName: { fontSize: 14, fontWeight: '600', color: colors.ink },
  tierRowReq: { fontSize: 11, color: colors.muted2, marginTop: 1 },
  currentPill: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.saffron, alignItems: 'center', justifyContent: 'center' },
  currentPillText: { color: '#fff', fontSize: 8 },

  howCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 40 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  howStar: { color: colors.saffron, fontSize: 16 },
  howText: { flex: 1, fontSize: 13, color: colors.body },
});
