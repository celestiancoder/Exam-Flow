import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { normalizeCourseCode } from '@/lib/courseCode';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PrintJob = {
  id: string;
  course_code: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  strength: number;
  pdf_path?: string | null;
  pdf_name?: string | null;
};

export default function QueueScreen() {
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { sparePercent } = useLocalSearchParams<{ sparePercent?: string }>();
  const spare = Number(sparePercent);
  const spareMultiplier = 1 + (Number.isFinite(spare) ? spare : 10) / 100;

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*');
    if (error) {
      Alert.alert('Could not load queue', error.message);
    } else {
      const roomCourses = new Map<string, Set<string>>();
      for (const job of (data ?? []) as PrintJob[]) {
        const courses = roomCourses.get(job.room) ?? new Set<string>();
        courses.add(normalizeCourseCode(job.course_code));
        roomCourses.set(job.room, courses);
      }

      const sorted = ((data ?? []) as PrintJob[]).sort((a, b) => {
        const roomCountDifference =
          (roomCourses.get(b.room)?.size ?? 0) - (roomCourses.get(a.room)?.size ?? 0);
        if (roomCountDifference !== 0) return roomCountDifference;

        const roomComparison = a.room.localeCompare(b.room, undefined, { numeric: true });
        if (roomComparison !== 0) return roomComparison;

        const dateComparison = a.date.localeCompare(b.date);
        if (dateComparison !== 0) return dateComparison;

        const timeComparison = a.start_time.localeCompare(b.start_time);
        if (timeComparison !== 0) return timeComparison;

        return a.course_code.localeCompare(b.course_code);
      });
      setJobs(sorted);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchJobs().finally(() => setLoading(false));
    }, [])
  );

  const refresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const renderJob = ({ item, index }: { item: PrintJob; index: number }) => {
    const copies = Math.ceil(Number(item.strength) * spareMultiplier);
    return (
      <View style={styles.card}>
        <View style={styles.sequence}>
          <Text style={styles.sequenceText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.course}>{item.course_code}</Text>
            <Text style={styles.room}>ROOM {item.room}</Text>
          </View>
          <Text style={styles.date}>{item.date}</Text>
          <View style={styles.footer}>
            <Text style={styles.time}>{item.start_time} – {item.end_time}</Text>
            <View style={styles.copiesBadge}>
              <Text style={styles.copiesText}>{copies} copies</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.eyebrow}>EXAM CELL</Text>
          <Text style={styles.title}>Print Queue</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.homeButton} onPress={() => router.push('/')}>
            <Text style={styles.homeText}>Home</Text>
          </Pressable>
          <Pressable style={styles.backButton} onPress={() => router.push('/upload')}>
            <Text style={styles.backText}>Upload</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No print jobs yet</Text>
              <Text style={styles.emptyText}>Upload an Excel schedule to generate the queue.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#090909' },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#090909', borderBottomWidth: 1, borderBottomColor: '#292929' },
  eyebrow: { color: '#777777', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  homeButton: { paddingHorizontal: 14, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#303030', alignItems: 'center', justifyContent: 'center' },
  homeText: { color: '#FFFFFF', fontWeight: '800' },
  backButton: { paddingHorizontal: 14, height: 40, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#090909', fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 620, alignSelf: 'center' },
  card: { flexDirection: 'row', backgroundColor: '#111111', borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#292929', overflow: 'hidden' },
  sequence: { width: 52, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  sequenceText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  course: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', flexShrink: 1 },
  room: { color: '#FFFFFF', backgroundColor: '#2A2A2A', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, fontSize: 11, fontWeight: '900' },
  date: { color: '#929292', marginTop: 8, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  time: { color: '#CCCCCC', fontWeight: '800' },
  copiesBadge: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  copiesText: { color: '#090909', fontWeight: '900', fontSize: 12 },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  emptyText: { color: '#929292', textAlign: 'center', marginTop: 8 },
});
