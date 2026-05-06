import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, ActivityIndicator,
  Platform, Modal
} from 'react-native';
import { Ionicons }      from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth }       from '../../context/AuthContext';
import api               from '../../services/api';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const C = COLORS.lab;

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_META = {
  payment_pending: { label: 'Payment Pending', color: '#F59E0B', bg: '#FFFBEB', icon: 'card-outline'             },
  pre_check:       { label: 'Pre-Check',       color: '#0284c7', bg: '#e0f2fe', icon: 'clipboard-outline'        },
  sample_received: { label: 'Sample Received', color: '#8B5CF6', bg: '#EDE9FE', icon: 'flask-outline'            },
  in_progress:     { label: 'In Progress',     color: '#0EA5E9', bg: '#E0F9FF', icon: 'pulse-outline'            },
  completed:       { label: 'Completed',       color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle-outline' },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ meta, count, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: meta.bg }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={meta.icon} size={22} color={meta.color} />
      <Text style={[styles.statCount, { color: meta.color }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: meta.color }]}>{meta.label}</Text>
    </TouchableOpacity>
  );
}

// ── Recent row ────────────────────────────────────────────────────────────
function RecentRow({ item, onPress }) {
  const meta = STATUS_META[item.status] || STATUS_META.pre_check;
  return (
    <TouchableOpacity style={styles.recentRow} onPress={() => onPress(item)} activeOpacity={0.8}>
      <View style={[styles.recentDot, { backgroundColor: meta.color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.recentTest}>{item.testName}</Text>
        <Text style={styles.recentPatient} numberOfLines={1}>
          {item.patientName || 'Unknown'} · {item.testId}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.recentStatus, { color: meta.color }]}>{meta.label}</Text>
        <Text style={styles.recentTime}>{fmtTime(item.updatedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function LabDashboard({ notifProps = {} }) {
  const navigation       = useNavigation();
  const { user, logout } = useAuth();

  const userName = 'Lab Staff';

  const { unreadCount = 0, hasCriticalUnread = false, onNotifPress } = notifProps;

  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError,   setApiError]   = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setApiError(null);
      const { data } = await api.get('/lab-results');
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load';
      setApiError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Use only a single mount-effect to prevent background intervals
  useEffect(() => { 
    load(); 
  }, [load]);

  // ── Derived data ─────────────────────────────────────────────────────
  const counts = Object.keys(STATUS_META).reduce((acc, s) => {
    acc[s] = results.filter(r => r.status === s).length;
    return acc;
  }, {});

  const recent = [...results]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 8);

  const goToDetail   = (item) => navigation.navigate('LabRequests');
  const goToRequests = () => navigation.navigate('LabRequests');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          colors={[C.primary]}
          tintColor={C.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.role}>Laboratory Department</Text>
            <Text style={styles.doctorName}>Referring Doctor: Dr. M.T.D Jayaweera</Text>
          </View>

          {/* Right icons — notification bell + profile/logout */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onNotifPress} activeOpacity={0.8}>
              <Ionicons
                name={hasCriticalUnread ? 'notifications' : 'notifications-outline'}
                size={22}
                color="#fff"
              />
              {unreadCount > 0 && (
                <View style={[styles.badge, hasCriticalUnread && { backgroundColor: '#ef4444' }]}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => setProfileVisible(true)} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.strip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripVal}>{results.length}</Text>
            <Text style={styles.stripKey}>Total Tests</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripVal}>{counts.in_progress}</Text>
            <Text style={styles.stripKey}>In Progress</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripVal}>{counts.completed}</Text>
            <Text style={styles.stripKey}>Completed</Text>
          </View>
        </View>
      </View>

      {/* ── API ERROR BANNER ─────────────────────────────────────────── */}
      {apiError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color="#DC2626" />
          <Text style={styles.errorText}>{apiError}</Text>
          <TouchableOpacity onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── STAT CARDS ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Queue</Text>
        <View style={styles.statGrid}>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <StatCard
              key={key}
              meta={meta}
              count={counts[key] || 0}
              onPress={goToRequests}
            />
          ))}
        </View>
      </View>

      {/* ── RECENT ACTIVITY ──────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={goToRequests}>
            <Text style={[styles.seeAll, { color: C.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {results.length === 0 && !apiError ? (
          <View style={styles.empty}>
            <Ionicons name="flask-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No tests yet</Text>
            <Text style={styles.emptyText}>
              Test requests will appear here after the cashier confirms payment.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {recent.map((item, i) => (
              <View key={item._id || i}>
                <RecentRow item={item} onPress={goToDetail} />
                {i < recent.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}
      </View>

      <Modal transparent visible={profileVisible} animationType="fade" onRequestClose={() => setProfileVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalText}>Are you sure you want to sign out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setProfileVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => { setProfileVisible(false); logout(); }}>
                <Text style={styles.confirmBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f1f5f9' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  loadingText: { fontSize: 14, color: '#94a3b8' },

  header: {
    backgroundColor: C.primary,
    paddingTop:      Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20,
    paddingBottom:   24,
    borderBottomLeftRadius:  RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  greeting:      { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  userName:      { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  role:          { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  doctorName:    { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontStyle: 'italic', marginTop: 6 },

  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingTop: 4 },
  actionBtn: {
    width: 40, height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#f97316',
    borderRadius: 8, minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  strip:        { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.md, padding: 14 },
  stripItem:    { flex: 1, alignItems: 'center' },
  stripVal:     { color: '#fff', fontSize: 22, fontWeight: '800' },
  stripKey:     { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5',
    borderRadius: RADIUS.md, margin: 16, marginBottom: 0, padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626' },
  retryText: { fontSize: 13, color: C.primary, fontWeight: '700' },

  section:      { marginTop: 20, paddingHorizontal: 16 },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  seeAll:       { fontSize: 13, fontWeight: '600' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%', borderRadius: RADIUS.md, padding: 14,
    alignItems: 'center', gap: 4, ...SHADOW.sm,
  },
  statCount: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  card:    { backgroundColor: '#fff', borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.sm },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },

  recentRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  recentDot:     { width: 8, height: 8, borderRadius: 4 },
  recentTest:    { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  recentPatient: { fontSize: 12, color: '#64748b', marginTop: 2 },
  recentStatus:  { fontSize: 11, fontWeight: '600' },
  recentTime:    { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  empty:      { alignItems: 'center', paddingVertical: 40, gap: 10, backgroundColor: '#fff', borderRadius: RADIUS.md, ...SHADOW.sm },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptyText:  { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 22, borderRadius: 20, width: '80%', alignItems: 'center' },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  modalText:    { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn:    { flex: 1, paddingVertical: 10, borderColor: '#e2e8f0', borderWidth: 1.5, borderRadius: RADIUS.md, alignItems: 'center' },
  cancelBtnText:{ fontSize: 13, fontWeight: '700', color: '#64748b' },
  confirmBtn:   { flex: 1, paddingVertical: 10, backgroundColor: '#EF4444', borderRadius: RADIUS.md, alignItems: 'center' },
  confirmBtnText:{ fontSize: 13, fontWeight: '700', color: '#fff' },
});