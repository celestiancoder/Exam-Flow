import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const features = [
  ['01', 'Smart matching', 'Reads Excel schedules and matches every text-based question paper by course code.'],
  ['02', 'Room-first queue', 'Prioritizes rooms containing multiple courses, then sorts by room, date and time.'],
  ['03', 'Exact copy counts', 'Calculates student strength with an adjustable spare-copy percentage.'],
];

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <View style={styles.brandMark}>
          <Text style={styles.brand}>EXAM FLOW</Text>
        </View>
        <View style={styles.navActions}>
          <Pressable onPress={() => router.push('/queue')} style={styles.navSecondary}>
            <Text style={styles.navSecondaryText}>Print queue</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/upload')} style={styles.navPrimary}>
            <Text style={styles.navPrimaryText}>Start processing</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.statusPill}>
          
          <Text style={styles.statusText}>EXAM OPERATIONS, AUTOMATED</Text>
        </View>
        <Text style={styles.heroTitle}>From schedules to</Text>
        <Text style={[styles.heroTitle, styles.heroTitleMuted]}>print-ready queues.</Text>
        <Text style={styles.heroCopy}>
          Match question papers to an exam schedule, organize every room, and generate a precise printing sequence in minutes.
        </Text>
        <View style={styles.heroActions}>
          <Pressable onPress={() => router.push('/upload')} style={styles.heroPrimary}>
            <Text style={styles.heroPrimaryText}>Upload exam files</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/queue')} style={styles.heroSecondary}>
            <Text style={styles.heroSecondaryText}>View print queue</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.featureGrid}>
        {features.map(([number, title, copy]) => (
          <View key={number} style={styles.featureCard}>
            <Text style={styles.featureNumber}>{number}</Text>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureCopy}>{copy}</Text>
          </View>
        ))}
      </View>

      <View style={styles.workflow}>
        <Text style={styles.workflowLabel}>WORKFLOW</Text>
        <View style={styles.workflowRow}>
          {['Upload Excel', 'Upload PDFs', 'Match course codes', 'Print in order'].map((step, index) => (
            <View key={step} style={styles.workflowStep}>
              <View style={styles.workflowIndex}>
                <Text style={styles.workflowIndexText}>{index + 1}</Text>
              </View>
              <Text style={styles.workflowText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#090909' },
  container: { minHeight: '100%' as never, paddingHorizontal: Platform.OS === 'web' ? 48 : 20, paddingBottom: 64 },
  nav: { height: 84, width: '100%', maxWidth: 1180, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#252525' },
  brandMark: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  brand: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navSecondary: { height: 42, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
  navSecondaryText: { color: '#B7B7B7', fontWeight: '800', fontSize: 13 },
  navPrimary: { height: 42, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFFFFF' },
  navPrimaryText: { color: '#090909', fontWeight: '900', fontSize: 13 },
  hero: { width: '100%', maxWidth: 1180, alignSelf: 'center', alignItems: 'center', paddingTop: 82, paddingBottom: 70 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#303030', paddingHorizontal: 12, marginBottom: 24 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  statusText: { color: '#AFAFAF', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { color: '#FFFFFF', fontSize: Platform.OS === 'web' ? 76 : 43, lineHeight: Platform.OS === 'web' ? 82 : 49, fontWeight: '900', textAlign: 'center', letterSpacing: Platform.OS === 'web' ? -4 : -2 },
  heroTitleMuted: { color: '#777777' },
  heroCopy: { width: '100%', maxWidth: 650, color: '#A5A5A5', fontSize: 17, lineHeight: 26, textAlign: 'center', marginTop: 24 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 34, flexWrap: 'wrap', justifyContent: 'center' },
  heroPrimary: { height: 52, minWidth: 170, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  heroPrimaryText: { color: '#090909', fontWeight: '900' },
  heroSecondary: { height: 52, minWidth: 150, borderRadius: 12, borderWidth: 1, borderColor: '#343434', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  heroSecondaryText: { color: '#FFFFFF', fontWeight: '800' },
  featureGrid: { width: '100%', maxWidth: 1180, alignSelf: 'center', flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  featureCard: { flexGrow: 1, flexBasis: Platform.OS === 'web' ? 300 : '100%', minHeight: 210, borderRadius: 16, borderWidth: 1, borderColor: '#292929', backgroundColor: '#111111', padding: 24 },
  featureNumber: { color: '#666666', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  featureTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 48 },
  featureCopy: { color: '#9A9A9A', lineHeight: 21, marginTop: 10 },
  workflow: { width: '100%', maxWidth: 1180, alignSelf: 'center', marginTop: 64 },
  workflowLabel: { color: '#777777', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 18 },
  workflowRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#292929', paddingTop: 20, flexWrap: 'wrap', gap: 12 },
  workflowStep: { flexDirection: 'row', alignItems: 'center', gap: 9, flexGrow: 1, flexBasis: Platform.OS === 'web' ? 220 : '45%' },
  workflowIndex: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#454545', alignItems: 'center', justifyContent: 'center' },
  workflowIndexText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  workflowText: { color: '#CCCCCC', fontWeight: '800' },
});
