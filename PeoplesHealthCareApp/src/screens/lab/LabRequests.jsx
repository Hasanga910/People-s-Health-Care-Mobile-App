import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet, ActivityIndicator,
  TextInput, Platform, ScrollView,
} from 'react-native';
import { Ionicons }      from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api               from '../../services/api';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const C = COLORS.lab;

const STATUS_META = {
  payment_pending: { label: 'Payment Pending', short: 'Payment',   color: '#F59E0B', bg: '#FFFBEB', icon: 'card-outline',             urgency: 0 },
  pre_check:       { label: 'Pre-Check',       short: 'Pre-Check', color: '#0284c7', bg: '#e0f2fe', icon: 'clipboard-outline',         urgency: 1 },
  sample_received: { label: 'Sample Received', short: 'Sample',    color: '#8B5CF6', bg: '#EDE9FE', icon: 'flask-outline',              urgency: 2 },
  in_progress:     { label: 'In Progress',     short: 'Running',   color: '#0EA5E9', bg: '#E0F9FF', icon: 'pulse-outline',              urgency: 3 },
  completed:       { label: 'Completed',       short: 'Done',      color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle-outline',    urgency: 4 },
};

const FILTERS = ['All', 'payment_pending', 'pre_check', 'sample_received', 'in_progress', 'completed'];

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Filter chip — plain View inside a horizontal ScrollView (no nested FlatList) ──
function FilterChip({ label, active, onPress, count }) {
  const meta         = STATUS_META[label];
  const displayLabel = meta ? meta.short : 'All';
  const activeColor  = meta?.color || C.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.chip,
        active && { backgroundColor: activeColor, borderColor: activeColor },
      ]}
    >
      <Text
        style={[styles.chipText, active && { color: '#fff' }]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
      {count > 0 && (
        <View style={[
          styles.chipBadge,
          { backgroundColor: active ? 'rgba(255,255,255,0.3)' : '#e2e8f0' },
        ]}>
          <Text style={[styles.chipBadgeText, active && { color: '#fff' }]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Request card ─────────────────────────────────────────────────────────
function RequestCard({ item, onPress }) {
  const meta = STATUS_META[item.status] || STATUS_META.pre_check;
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={[styles.stripe, { backgroundColor: meta.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.testName}>{item.testName}</Text>
            <Text style={styles.testId}>{item.testId}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={13} color="#64748b" />
            <Text style={styles.infoText} numberOfLines={1}>{item.patientName || 'Unknown'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={13} color="#64748b" />
            <Text style={styles.infoText} numberOfLines={1}>Appt: {item.appointmentId}</Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.timestamp}>{fmtDate(item.createdAt)} {fmtTime(item.createdAt)}</Text>
          {item.paymentId && (
            <View style={styles.payTag}>
              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
              <Text style={styles.payTagText}>Payment: {item.paymentId}</Text>
            </View>
          )}
          <View style={styles.arrowWrap}>
            <Ionicons name="chevron-forward" size={16} color={meta.color} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function LabRequests() {
  const navigation = useNavigation();
  const route      = useRoute();
  const initFilter = route?.params?.filterStatus || 'All';

  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState(initFilter);

  const load = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const { data } = await api.get('/lab-results');
      const raw = Array.isArray(data.results) ? data.results : [];
      raw.sort((a, b) => {
        const ua = STATUS_META[a.status]?.urgency ?? 99;
        const ub = STATUS_META[b.status]?.urgency ?? 99;
        if (ua !== ub) return ua - ub;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      setResults(raw);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (route?.params?.filterStatus) setFilter(route.params.filterStatus);
  }, [route?.params?.filterStatus]);

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'All' ? results.length : results.filter(r => r.status === f).length;
    return acc;
  }, {});

  const displayed = results
    .filter(r => filter === 'All' || r.status === filter)
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.testName?.toLowerCase().includes(q) ||
        r.patientName?.toLowerCase().includes(q) ||
        r.testId?.toLowerCase().includes(q) ||
        r.appointmentId?.toLowerCase().includes(q)
      );
    });

  const goToDetail = (item) => navigation.navigate('LabTestDetail', { resultId: item._id });

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lab Test Requests</Text>
        <Text style={styles.headerSub}>
          {counts.All} total · {
            (counts.payment_pending || 0) +
            (counts.pre_check || 0) +
            (counts.sample_received || 0) +
            (counts.in_progress || 0)
          } active
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search test, patient, appointment…"
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

      {/* ── Filter chips — horizontal ScrollView (reliable on all RN versions) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {FILTERS.map(f => (
          <FilterChip
            key={f}
            label={f}
            active={filter === f}
            count={counts[f] || 0}
            onPress={() => setFilter(f)}
          />
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              colors={[C.primary]}
              tintColor={C.primary}
            />
          }
          renderItem={({ item }) => <RequestCard item={item} onPress={goToDetail} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flask-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No tests found</Text>
              <Text style={styles.emptyText}>Try adjusting your filter or search</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },

  header: {
    backgroundColor: C.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 16, marginBottom: 8,
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10,
    ...SHADOW.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 0 },

  // ── Chips ── ScrollView instead of FlatList avoids nested-scroll issues ──
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chipRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  chipText:      { fontSize: 12, fontWeight: '700', color: '#475569' },
  chipBadge:     { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  chipBadgeText: { fontSize: 10, fontWeight: '800', color: '#475569' },

  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    flexDirection: 'row', overflow: 'hidden', ...SHADOW.sm,
  },
  stripe:   { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 8 },

  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  testName:   { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  testId:     { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },

  infoRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoItem:  { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  infoText:  { fontSize: 12, color: '#64748b', flexShrink: 1 },

  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  timestamp:  { fontSize: 11, color: '#94a3b8', flex: 1 },
  payTag:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  payTagText: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  arrowWrap:  { marginLeft: 'auto' },

  empty:      { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptyText:  { fontSize: 13, color: '#94a3b8' },
});
