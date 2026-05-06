import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet, ActivityIndicator,
  TextInput, Platform,
} from 'react-native';
import { Ionicons }      from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api               from '../../services/api';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const C = COLORS.lab;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Count abnormal parameters in results
function countAbnormal(results) {
  if (!results?.parameters) return 0;
  return results.parameters.filter(p => p.flag && p.flag !== 'Normal' && p.flag !== '').length;
}

function ReportCard({ item, onPress }) {
  const abnormal = countAbnormal(item.results);
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name="document-text-outline" size={22} color={C.primary} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.testName}>{item.testName}</Text>
          {abnormal > 0 && (
            <View style={styles.alertPill}>
              <Ionicons name="warning-outline" size={11} color="#DC2626" />
              <Text style={styles.alertText}>{abnormal} abnormal</Text>
            </View>
          )}
        </View>

        <Text style={styles.patientName} numberOfLines={1}>
          {item.patientName || 'Unknown'}  ·  {item.patientId || '—'}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="receipt-outline" size={12} color="#94a3b8" />
            <Text style={styles.metaText}>{item.testId}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color="#94a3b8" />
            <Text style={styles.metaText}>{fmtDate(item.completedAt)} {fmtTime(item.completedAt)}</Text>
          </View>
        </View>

        {item.results?.performedBy ? (
          <Text style={styles.performedBy}>By: {item.results.performedBy}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  );
}

export default function LabReports() {
  const navigation = useNavigation();
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  const load = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const { data } = await api.get('/lab-results');
      const all = Array.isArray(data.results) ? data.results : [];
      const done = all.filter(r => r.status === 'completed').sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
      setReports(done);
    } catch {/* silent */} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayed = search.trim()
    ? reports.filter(r => {
        const q = search.toLowerCase();
        return (
          r.testName?.toLowerCase().includes(q) ||
          r.patientName?.toLowerCase().includes(q) ||
          r.testId?.toLowerCase().includes(q) ||
          r.patientId?.toLowerCase().includes(q)
        );
      })
    : reports;

  const goToReport = (item) =>
    navigation.navigate('LabUploadResults', {
      resultId: item._id,
      testName: item.testName,
      readOnly: true,
    });

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Completed Reports</Text>
        <Text style={styles.headerSub}>{reports.length} report{reports.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by test, patient, or ID…"
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[C.primary]} />}
          renderItem={({ item }) => <ReportCard item={item} onPress={goToReport} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No completed reports</Text>
              <Text style={styles.emptyText}>Reports will appear here once tests are completed</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },

  header: {
    backgroundColor: C.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 16, marginBottom: 10,
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10,
    ...SHADOW.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 0 },

  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    ...SHADOW.sm,
  },
  cardLeft: {},
  iconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: C.light, justifyContent: 'center', alignItems: 'center',
  },
  cardBody:    { flex: 1, gap: 4 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testName:    { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1 },
  alertPill:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEE2E2', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  alertText:   { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  patientName: { fontSize: 12, color: '#64748b' },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: 11, color: '#94a3b8' },
  performedBy: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },

  empty:      { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptyText:  { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
