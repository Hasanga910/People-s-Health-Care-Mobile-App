import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ── Helpers ───────────────────────────────────────────────────
const getLocalDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatRelativeTime(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 120)  return '1 min ago';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function toMins(hhmm = '00:00') {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmtSessionTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function nowMins() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function getSessionPhase(startHHMM, endHHMM) {
  const now   = nowMins();
  const start = toMins(startHHMM);
  const end   = toMins(endHHMM);
  if (now < start) return 'before';
  if (now < end)   return 'live';
  return 'ended';
}

function detectActiveSession(morningStart, morningEnd, eveningStart, morningHoliday, eveningHoliday) {
  if (morningHoliday) return 'Evening';
  if (eveningHoliday) return 'Morning';
  if (nowMins() < toMins(morningEnd)) return 'Morning';
  return 'Evening';
}

function fmtCountdown(startHHMM) {
  const diff = toMins(startHHMM) - nowMins();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const STATUS_COLOR = {
  Pending:       { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B', border: '#FDE68A' },
  'In Progress': { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6', border: '#BFDBFE' },
  Completed:     { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E', border: '#BBF7D0' },
  Cancelled:     { bg: '#F8FAFC', text: '#64748B', dot: '#94A3B8', border: '#E2E8F0' },
};

const RX_STATUS = {
  pending:     { bg: '#FFF7ED', text: '#C2410C', label: 'Pending'     },
  in_progress: { bg: '#EFF6FF', text: '#1D4ED8', label: 'In Progress' },
  dispensed:   { bg: '#F0FDF4', text: '#15803D', label: 'Dispensed'   },
};

const PHASE_BADGE = {
  before:  { text: 'Upcoming', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  live:    { text: 'Live Now', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  ended:   { text: 'Ended',   bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },
  holiday: { text: 'Holiday', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
};

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <View style={[t.box, type === 'success' ? t.success : t.error]}>
      <Ionicons name={type === 'success' ? 'checkmark-circle' : 'close-circle'} size={16} color={type === 'success' ? '#15803D' : '#B91C1C'} />
      <Text style={[t.msg, { color: type === 'success' ? '#15803D' : '#B91C1C' }]}>{msg}</Text>
    </View>
  );
}
const t = StyleSheet.create({
  box: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, zIndex: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 8 },
  success: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  error:   { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  msg: { fontSize: 13, fontWeight: '500', flex: 1 },
});

// ══════════════════════════════════════════════════════════════
export default function DoctorDashboard({ notifProps }) {
  const { user }   = useAuth();
  const navigation = useNavigation();
  const doctorName = user?.name || 'Doctor';
  const expYears   = parseInt(user?.doctorDetails?.workingExperience, 10);
  const subtitle   = !isNaN(expYears) && expYears > 0 ? `${expYears}+ yrs experience` : 'Doctor';
  const initials   = doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Session config
  const [morningStart, setMorningStart] = useState('07:00');
  const [morningEnd,   setMorningEnd]   = useState('08:00');
  const [eveningStart, setEveningStart] = useState('17:00');
  const [eveningEnd,   setEveningEnd]   = useState('20:00');
  const [morningHoliday, setMorningHoliday]   = useState(false);
  const [eveningHoliday, setEveningHoliday]   = useState(false);
  const [activeSession, setActiveSession]     = useState('Morning');
  const [manualOverride, setManualOverride]   = useState(false);
  const [sessionConfigLoaded, setSessionConfigLoaded] = useState(false);
  const [tick, setTick] = useState(0);

  // Data
  const [appointments, setAppointments] = useState([]);
  const [apptStats, setApptStats]       = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, remaining: 0 });
  const [recentRx, setRecentRx]         = useState([]);
  const [labPending, setLabPending]         = useState(0);
  const [labAlerts, setLabAlerts]           = useState([]);
  const [recentLabResults, setRecentLabResults] = useState([]);
  const [monthlyRxCount, setMonthlyRxCount] = useState(0);

  // UI
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [loadingRx, setLoadingRx]       = useState(true);
  const [startingId, setStartingId]     = useState(null);
  const [earlyStarting, setEarlyStarting] = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [toast, setToast]               = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-switch session tab
  useEffect(() => {
    if (!morningStart || !morningEnd || !eveningStart) return;
    if (manualOverride) return;
    const suggested = detectActiveSession(morningStart, morningEnd, eveningStart, morningHoliday, eveningHoliday);
    setActiveSession(suggested);
  }, [tick, morningStart, morningEnd, eveningStart, morningHoliday, eveningHoliday, manualOverride]);

  const handleTabClick = (key) => {
    setManualOverride(true);
    setActiveSession(key);
    setTimeout(() => setManualOverride(false), 10 * 60 * 1000);
  };

  // ── Fetchers ─────────────────────────────────────────────
  const loadSessionConfig = useCallback(async () => {
    try {
      const today = getLocalDateStr();
      const [mRes, eRes, holRes] = await Promise.allSettled([
        api.get(`/appointments/session-info?date=${today}&session=Morning`),
        api.get(`/appointments/session-info?date=${today}&session=Evening`),
        api.get('/appointments/holidays'),
      ]);
      const holidays  = holRes.status === 'fulfilled' ? (holRes.value.data.holidays ?? []) : [];
      const todayHols = holidays.filter(h => h.date === today);
      setMorningHoliday(todayHols.some(h => h.session === 'Both' || h.session === 'Morning'));
      setEveningHoliday(todayHols.some(h => h.session === 'Both' || h.session === 'Evening'));
      if (mRes.status === 'fulfilled') setMorningStart(mRes.value.data?.data?.startTime || '07:00');
      if (eRes.status === 'fulfilled') setEveningStart(eRes.value.data?.data?.startTime || '17:00');
      setSessionConfigLoaded(true);
    } catch {}
  }, []);

  const loadAppointments = useCallback(async (silent = false) => {
    try {
      const res   = await api.get(`/appointments/today?date=${getLocalDateStr()}`);
      const appts = res.data.appointments || [];
      setAppointments(appts);
      const pending    = appts.filter(a => a.status === 'Pending').length;
      const inProgress = appts.filter(a => a.status === 'In Progress').length;
      const completed  = appts.filter(a => a.status === 'Completed').length;
      setApptStats({ total: appts.length, pending, inProgress, completed, remaining: pending + inProgress });
    } catch {}
    finally { if (!silent) setLoadingAppts(false); }
  }, []);

  const loadRecentRx = useCallback(async (silent = false) => {
    try {
      const res = await api.get('/prescriptions?recent=true&limit=5');
      setRecentRx(res.data.prescriptions || []);
    } catch {}
    finally { if (!silent) setLoadingRx(false); }
  }, []);

  const loadLabStats = useCallback(async () => {
    try {
      const res = await api.get('/lab-requests?status=pending');
      setLabPending(res.data.count || 0);
    } catch {}
  }, []);

  const loadLabAlerts = useCallback(async () => {
    try {
      const res     = await api.get('/lab-results?status=completed&limit=50');
      const results = res.data.results || [];
      const since   = Date.now() - 30 * 60 * 1000;
      setLabAlerts(results.filter(r => new Date(r.completedAt).getTime() > since).map(r => ({
        ...r,
        alertType: r.results?.parameters?.some(p => ['High','Low','Positive','Reactive'].includes(p.flag)) ? 'abnormal' : 'ready',
      })));
      // Recent lab results (last 5, broader window)
      setRecentLabResults(results.slice(0, 5).map(r => ({
        ...r,
        alertType: r.results?.parameters?.some(p => ['High','Low','Positive','Reactive'].includes(p.flag)) ? 'abnormal' : 'ready',
      })));
    } catch {}
  }, []);

  const loadMonthlyRx = useCallback(async () => {
    try {
      const res   = await api.get('/prescriptions?limit=200');
      const now   = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setMonthlyRxCount((res.data.prescriptions || []).filter(rx => new Date(rx.createdAt) >= start).length);
    } catch {}
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    await Promise.all([
      loadSessionConfig(), loadAppointments(silent), loadRecentRx(silent),
      loadLabStats(), loadLabAlerts(), loadMonthlyRx(),
    ]);
    if (!silent) setRefreshing(false);
  }, [loadSessionConfig, loadAppointments, loadRecentRx, loadLabStats, loadLabAlerts, loadMonthlyRx]);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 5_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // ── Actions ───────────────────────────────────────────────
  const handleStart = async (appt) => {
    setStartingId(appt._id);
    try {
      const res     = await api.patch(`/appointments/${appt._id}/start`);
      const updated = res.data.appointment;
      setAppointments(prev => prev.map(a => a._id === updated._id ? updated : a));
      setApptStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), inProgress: prev.inProgress + 1 }));
      showToast(`Started appointment for ${appt.patientName || 'patient'}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start appointment', 'error');
    } finally {
      setStartingId(null);
    }
  };

  const handleContinue = (appt) => {
    showToast(`Continuing with ${appt.patientName || 'patient'}...`);
  };

  const handleEarlyStart = async () => {
    const now   = new Date();
    const hhmm  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const field = activeSession === 'Morning' ? 'morningSessionStart' : 'eveningSessionStart';
    if (activeSession === 'Morning') setMorningStart(hhmm);
    else setEveningStart(hhmm);
    setEarlyStarting(true);
    try {
      await api.patch('/appointments/config', { [field]: hhmm });
      showToast(`${activeSession} session started early at ${fmtSessionTime(hhmm)}`);
    } catch {
      showToast('Started locally — could not save to server');
    } finally {
      setEarlyStarting(false);
    }
  };

  // ── Session filtering ─────────────────────────────────────
  const sessionAppts = activeSession === 'Evening'
    ? appointments.filter(a => a.session === 'Evening' || (a.session === 'Morning' && a.status === 'Pending'))
    : appointments.filter(a => a.session === 'Morning');

  const morningAppts     = appointments.filter(a => a.session === 'Morning');
  const eveningAppts     = appointments.filter(a => a.session === 'Evening');
  const morningRemaining = morningAppts.filter(a => ['Pending','In Progress'].includes(a.status)).length;
  const eveningRemaining = eveningAppts.filter(a => ['Pending','In Progress'].includes(a.status)).length;

  const morningPhase    = getSessionPhase(morningStart, morningEnd);
  const eveningPhase    = getSessionPhase(eveningStart, eveningEnd);
  const morningCountdown = morningPhase === 'before' ? fmtCountdown(morningStart) : null;
  const eveningCountdown = eveningPhase === 'before' ? fmtCountdown(eveningStart) : null;

  const activePhase     = activeSession === 'Morning' ? morningPhase : eveningPhase;
  const activeCountdown = activeSession === 'Morning' ? morningCountdown : eveningCountdown;
  const activeStart     = activeSession === 'Morning' ? morningStart : eveningStart;
  const activeEnd       = activeSession === 'Morning' ? morningEnd   : eveningEnd;
  const activeRemaining = activeSession === 'Morning' ? morningRemaining : eveningRemaining;
  const sessionLocked   = activePhase === 'before';

  const SESSION_TABS = [
    { key: 'Morning', label: 'Morning Session', timeRange: `${fmtSessionTime(morningStart)} – ${fmtSessionTime(morningEnd)}`, phase: morningHoliday ? 'holiday' : morningPhase, countdown: morningCountdown, remaining: morningRemaining, count: morningAppts.length },
    { key: 'Evening', label: 'Evening Session', timeRange: `${fmtSessionTime(eveningStart)} – ${fmtSessionTime(eveningEnd)}`, phase: eveningHoliday ? 'holiday' : eveningPhase, countdown: eveningCountdown, remaining: eveningRemaining, count: eveningAppts.length },
  ];

  const STAT_CARDS = [
    { label: "Today's Appts",      value: loadingAppts ? '—' : apptStats.total,     sub: `${apptStats.remaining} remaining`, icon: 'calendar-outline',       color: '#1565C0', bg: '#E3F2FD', trend: `+${apptStats.completed}`, up: apptStats.completed > 0 },
    { label: 'Prescriptions',      value: monthlyRxCount || '—',                    sub: 'This month',                        icon: 'document-text-outline',  color: '#00897B', bg: '#E0F2F1', trend: `+${recentRx.length}`,    up: recentRx.length > 0 },
    { label: 'Lab Requests',       value: labPending || '—',                        sub: `${labPending} pending`,             icon: 'flask-outline',          color: '#1565C0', bg: '#E3F2FD', trend: `${labPending}`,           up: false },
    { label: 'Patients Seen',      value: loadingAppts ? '—' : apptStats.completed, sub: 'Today',                             icon: 'people-outline',         color: '#E65100', bg: '#FFF3E0', trend: `+${apptStats.completed}`, up: apptStats.completed > 0 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" />}
      >
        {/* ── HEADER ── */}
        <LinearGradient
          colors={['#0D2137', '#1565C0', '#00ACC1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          {/* Decorative circles */}
          <View style={s.decCircle1} />
          <View style={s.decCircle2} />
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>{getGreeting()},</Text>
              <Text style={s.doctorName}>Dr. {doctorName.replace(/^Dr\.?\s*/i, '')} 👋</Text>
              <Text style={s.headerDate}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Notification bell */}
              {notifProps && (
                <TouchableOpacity style={s.bellBtn} onPress={notifProps.onNotifPress} activeOpacity={0.8}>
                  <Ionicons name="notifications-outline" size={22} color="#fff" />
                  {notifProps.unreadCount > 0 && (
                    <View style={[s.bellBadge, notifProps.hasCriticalUnread && s.bellBadgeCritical]}>
                      <Text style={s.bellBadgeText}>
                        {notifProps.unreadCount > 9 ? '9+' : notifProps.unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              <View style={s.avatarCircle}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            </View>
          </View>

          {/* Welcome sub-text */}
          <Text style={s.welcomeSub}>
            {loadingAppts
              ? 'Loading schedule…'
              : `You have ${apptStats.remaining} appointment${apptStats.remaining !== 1 ? 's' : ''} remaining today${labPending > 0 ? ` · ${labPending} pending lab results` : ''}`
            }
          </Text>

          {/* Header action buttons */}
          <View style={s.headerBtns}>
            <TouchableOpacity style={s.headerBtnOutline} activeOpacity={0.8}>
              <Text style={s.headerBtnOutlineText}>View Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtnFill} activeOpacity={0.8}>
              <Text style={s.headerBtnFillText}>+ New Prescription</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* ── STAT CARDS ── */}
          <View style={s.statsGrid}>
            {STAT_CARDS.map(card => (
              <View key={card.label} style={s.statCard}>
                <View style={s.statCardTop}>
                  <View style={[s.statIconBox, { backgroundColor: card.bg }]}>
                    <Ionicons name={card.icon} size={20} color={card.color} />
                  </View>
                  <View style={[s.trendBadge, { backgroundColor: card.up ? '#F0FDF4' : '#FEF2F2' }]}>
                    <Text style={[s.trendText, { color: card.up ? '#15803D' : '#DC2626' }]}>{card.trend}</Text>
                  </View>
                </View>
                <Text style={s.statValue}>{card.value}</Text>
                <Text style={s.statLabel}>{card.label}</Text>
                <Text style={s.statSub}>{card.sub}</Text>
              </View>
            ))}
          </View>

          {/* ── TODAY'S SCHEDULE CARD ── */}
          <View style={s.scheduleCard}>
            <View style={s.scheduleCardHeader}>
              <View>
                <Text style={s.scheduleTitle}>Today's Schedule</Text>
                <Text style={s.scheduleDate}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            </View>

            {/* Session Tabs */}
            <View style={s.sessionTabsRow}>
              {SESSION_TABS.map(tab => {
                const isActive = activeSession === tab.key;
                const badge    = PHASE_BADGE[tab.phase] || PHASE_BADGE.before;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[s.sessionTab, isActive && s.sessionTabActive]}
                    onPress={() => handleTabClick(tab.key)}
                    activeOpacity={0.8}
                  >
                    <View style={s.sessionTabTop}>
                      <Ionicons
                        name={tab.key === 'Morning' ? 'sunny-outline' : 'moon-outline'}
                        size={16}
                        color={isActive ? (tab.key === 'Morning' ? '#F59E0B' : '#6366f1') : '#94A3B8'}
                      />
                      <View style={[s.phaseBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        {tab.phase === 'live' && <View style={s.livePulseDot} />}
                        <Text style={[s.phaseBadgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    </View>
                    <Text style={[s.sessionTabLabel, isActive && s.sessionTabLabelActive]}>{tab.label}</Text>
                    <Text style={[s.sessionTabTime, isActive && { color: '#1D4ED8' }]}>{tab.timeRange}</Text>
                    {tab.remaining > 0 && (
                      <View style={[s.remainingBadge, isActive && { backgroundColor: '#1565C0' }]}>
                        <Text style={[s.remainingText, isActive && { color: '#fff' }]}>{tab.remaining}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Phase banners */}
            {sessionConfigLoaded && activePhase === 'before' && (
              <View style={s.phaseBanner}>
                <Ionicons name="time-outline" size={16} color="#B45309" />
                <Text style={[s.phaseBannerText, { color: '#B45309', flex: 1 }]}>
                  {activeSession} session starts at <Text style={{ fontWeight: '700' }}>{fmtSessionTime(activeStart)}</Text>
                  {activeCountdown ? ` — starts in ${activeCountdown}` : ''}
                </Text>
                <TouchableOpacity
                  style={s.earlyStartBtn}
                  onPress={handleEarlyStart}
                  disabled={earlyStarting}
                  activeOpacity={0.8}
                >
                  {earlyStarting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="play" size={12} color="#fff" /><Text style={s.earlyStartText}>Start Early</Text></>
                  }
                </TouchableOpacity>
              </View>
            )}

            {activePhase === 'ended' && (
              <View style={[s.phaseBanner, { backgroundColor: activeRemaining > 0 ? '#FFFBEB' : '#F8FAFC', borderBottomColor: activeRemaining > 0 ? '#FDE68A' : '#E2E8F0' }]}>
                <Ionicons name="time-outline" size={16} color={activeRemaining > 0 ? '#B45309' : '#94A3B8'} />
                <Text style={[s.phaseBannerText, { color: activeRemaining > 0 ? '#B45309' : '#64748B', flex: 1 }]}>
                  {activeSession} session ended at <Text style={{ fontWeight: '700' }}>{fmtSessionTime(activeEnd)}</Text>
                  {activeRemaining > 0
                    ? <> — <Text style={{ fontWeight: '700' }}>{activeRemaining} patient{activeRemaining !== 1 ? 's' : ''} still in queue</Text></>
                    : '. All patients seen.'}
                </Text>
              </View>
            )}

            {/* Appointment list */}
            {loadingAppts ? (
              <ActivityIndicator color="#1565C0" style={{ marginVertical: 24 }} />
            ) : sessionAppts.length === 0 ? (
              <View style={s.emptyAppts}>
                <Text style={s.emptyApptEmoji}>{activeSession === 'Morning' ? '🌤️' : '🌙'}</Text>
                <Text style={s.emptyApptText}>No {activeSession.toLowerCase()} appointments today</Text>
                <Text style={s.emptyApptSub}>
                  {activeSession === 'Morning'
                    ? `${fmtSessionTime(morningStart)} – ${fmtSessionTime(morningEnd)}`
                    : `${fmtSessionTime(eveningStart)} – ${fmtSessionTime(eveningEnd)}`}
                </Text>
              </View>
            ) : (
              <>
                {/* Mini summary strip */}
                <View style={s.summaryStrip}>
                  {[
                    { color: '#F59E0B', label: `${sessionAppts.filter(a=>a.status==='Pending').length} Pending` },
                    { color: '#3B82F6', label: `${sessionAppts.filter(a=>a.status==='In Progress').length} In Progress` },
                    { color: '#22C55E', label: `${sessionAppts.filter(a=>a.status==='Completed').length} Completed` },
                  ].map(item => (
                    <View key={item.label} style={s.summaryItem}>
                      <View style={[s.summaryDot, { backgroundColor: item.color }]} />
                      <Text style={s.summaryText}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                {sessionAppts.map((appt) => {
                  const st         = STATUS_COLOR[appt.status] || STATUS_COLOR.Pending;
                  const isStarting = startingId === appt._id;
                  const isIP       = appt.status === 'In Progress';
                  const isCarryover = activeSession === 'Evening' && appt.session === 'Morning';

                  return (
                    <View key={appt._id} style={[s.apptRow, isIP && s.apptRowActive]}>
                      <View style={s.apptTime}>
                        <Text style={s.apptTimeText}>{appt.estimatedTime || '—'}</Text>
                      </View>
                      <View style={[s.apptIdBadge, isIP && { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' }]}>
                        <Text style={[s.apptIdText, { color: isIP ? '#1D4ED8' : '#1565C0' }]}>
                          {appt.appointmentId?.split('-').pop() || '—'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={s.apptName} numberOfLines={1}>{appt.patientName || 'Patient'}</Text>
                          {isCarryover && (
                            <View style={s.carryoverBadge}>
                              <Text style={s.carryoverText}>AM carry-over</Text>
                            </View>
                          )}
                        </View>
                        <Text style={s.apptId} numberOfLines={1}>{appt.appointmentId}</Text>
                      </View>
                      <View style={[s.statusPill, { backgroundColor: st.bg, borderColor: st.border }]}>
                        <View style={[s.statusDot, { backgroundColor: st.dot }]} />
                        <Text style={[s.statusText, { color: st.text }]}>{appt.status}</Text>
                      </View>
                      {/* Action button */}
                      {appt.status === 'Pending' && (
                        sessionLocked ? (
                          <View style={s.lockedBtn}>
                            <Ionicons name="lock-closed" size={12} color="#94A3B8" />
                            <Text style={s.lockedText}>Not Yet</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[s.startBtn, (isStarting || startingId !== null) && { opacity: 0.6 }]}
                            onPress={() => handleStart(appt)}
                            disabled={isStarting || startingId !== null}
                            activeOpacity={0.85}
                          >
                            {isStarting
                              ? <ActivityIndicator size="small" color="#fff" />
                              : <Text style={s.startBtnText}>Start</Text>
                            }
                          </TouchableOpacity>
                        )
                      )}
                      {appt.status === 'In Progress' && (
                        <TouchableOpacity style={s.continueBtn} onPress={() => handleContinue(appt)} activeOpacity={0.85}>
                          <Text style={s.continueBtnText}>Continue</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>

          {/* ── LAB ALERTS ── */}
          {labAlerts.length > 0 && (
            <View style={s.sectionCard}>
              <Text style={s.sectionCardTitle}>Recent Lab Results</Text>
              {labAlerts.slice(0, 3).map((alert, i) => (
                <View key={alert._id || i} style={[s.labCard, { borderLeftColor: alert.alertType === 'abnormal' ? '#EF4444' : '#8B5CF6' }]}>
                  <View style={[s.labIconBox, { backgroundColor: alert.alertType === 'abnormal' ? '#FEF2F2' : '#F5F3FF' }]}>
                    <Ionicons name="flask-outline" size={18} color={alert.alertType === 'abnormal' ? '#DC2626' : '#7C3AED'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.labPatient}>{alert.patient?.name || alert.patientName || 'Patient'}</Text>
                    <Text style={s.labMeta}>{alert.testName || 'Lab Test'} · {formatRelativeTime(alert.completedAt)}</Text>
                  </View>
                  <View style={[s.labBadge, { backgroundColor: alert.alertType === 'abnormal' ? '#FEF2F2' : '#F5F3FF' }]}>
                    <Text style={[s.labBadgeText, { color: alert.alertType === 'abnormal' ? '#DC2626' : '#7C3AED' }]}>
                      {alert.alertType === 'abnormal' ? '⚠ Abnormal' : '✓ Ready'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── RECENT LAB RESULTS ── */}
          <View style={s.sectionCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={s.sectionCardTitle}>Recent Lab Results</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {labAlerts.length > 0 && (
                  <View style={s.newBadge}>
                    <View style={s.newBadgeDot} />
                    <Text style={s.newBadgeText}>{labAlerts.length} new</Text>
                  </View>
                )}
              </View>
            </View>
            {recentLabResults.length === 0 ? (
              <View style={s.emptySmall}>
                <Ionicons name="flask-outline" size={32} color="#CBD5E1" />
                <Text style={s.emptySmallText}>No recent lab results</Text>
              </View>
            ) : (
              recentLabResults.map((result, i) => (
                <View key={result._id || i} style={[s.labCard, { borderLeftColor: result.alertType === 'abnormal' ? '#EF4444' : '#8B5CF6' }]}>
                  <View style={[s.labIconBox, { backgroundColor: result.alertType === 'abnormal' ? '#FEF2F2' : '#F5F3FF' }]}>
                    <Ionicons name="flask-outline" size={18} color={result.alertType === 'abnormal' ? '#DC2626' : '#7C3AED'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.labPatient}>{result.patient?.name || result.patientName || 'Patient'}</Text>
                    <Text style={s.labMeta}>
                      {result.testName || 'Lab Test'} · {formatRelativeTime(result.completedAt)}
                    </Text>
                  </View>
                  <View style={[s.labBadge, { backgroundColor: result.alertType === 'abnormal' ? '#FEF2F2' : '#F5F3FF' }]}>
                    <Text style={[s.labBadgeText, { color: result.alertType === 'abnormal' ? '#DC2626' : '#7C3AED' }]}>
                      {result.alertType === 'abnormal' ? '⚠ Abnormal' : '✓ Ready'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ── RECENT PRESCRIPTIONS ── */}
          <View style={s.sectionCard}>
            <Text style={s.sectionCardTitle}>Recent Prescriptions</Text>
            {loadingRx ? (
              <ActivityIndicator color="#1565C0" style={{ marginVertical: 12 }} />
            ) : recentRx.length === 0 ? (
              <View style={s.emptySmall}>
                <Ionicons name="document-text-outline" size={32} color="#CBD5E1" />
                <Text style={s.emptySmallText}>No recent prescriptions</Text>
              </View>
            ) : (
              recentRx.map((rx, i) => {
                const st = RX_STATUS[rx.status] || RX_STATUS.pending;
                return (
                  <View key={rx._id || i} style={s.rxRow}>
                    <View style={s.rxIcon}>
                      <Ionicons name="document-text-outline" size={18} color="#1565C0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rxName}>{rx.patient?.name || rx.patientName || 'Patient'}</Text>
                      <Text style={s.rxMeta}>{formatRelativeTime(rx.createdAt)} · {rx.medicines?.length || 0} medicine{rx.medicines?.length !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={[s.rxBadge, { backgroundColor: st.bg }]}>
                      <Text style={[s.rxBadgeText, { color: st.text }]}>{st.label}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 28, paddingHorizontal: 20, overflow: 'hidden' },
  decCircle1: { position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  decCircle2: { position: 'absolute', right: 60, bottom: -40, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.04)' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  greeting: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  doctorName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  headerDate: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 3 },
  welcomeSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  bellBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  bellBadgeCritical: { backgroundColor: '#EF4444' },
  bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  avatarCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerBtns: { flexDirection: 'row', gap: 10 },
  headerBtnOutline: { flex: 1, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  headerBtnOutlineText: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 13 },
  headerBtnFill: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  headerBtnFillText: { color: '#1D4ED8', fontWeight: '700', fontSize: 13 },

  body: { padding: 14, gap: 14 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  statIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trendBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  trendText: { fontSize: 11, fontWeight: '600' },
  statValue: { fontSize: 26, fontWeight: '900', color: '#0D2137', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#64748B' },
  statSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  scheduleCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  scheduleCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 12 },
  scheduleTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  scheduleDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  sessionTabsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  sessionTab: { flex: 1, borderRadius: 14, padding: 12, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  sessionTabActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  sessionTabTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sessionTabLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  sessionTabLabelActive: { color: '#1D4ED8' },
  sessionTabTime: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  phaseBadgeText: { fontSize: 10, fontWeight: '600' },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  remainingBadge: { backgroundColor: '#E2E8F0', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },
  remainingText: { fontSize: 11, fontWeight: '700', color: '#475569' },

  phaseBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  phaseBannerText: { fontSize: 12 },
  earlyStartBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  earlyStartText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  summaryStrip: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryDot: { width: 6, height: 6, borderRadius: 3 },
  summaryText: { fontSize: 11, color: '#64748B' },

  emptyAppts: { alignItems: 'center', paddingVertical: 28 },
  emptyApptEmoji: { fontSize: 36, marginBottom: 8 },
  emptyApptText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  emptyApptSub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },

  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  apptRowActive: { backgroundColor: '#EFF6FF', borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  apptTime: { width: 44 },
  apptTimeText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  apptIdBadge: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  apptIdText: { fontSize: 10, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  apptName: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  apptId: { fontSize: 11, color: '#94A3B8', marginTop: 1, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  carryoverBadge: { backgroundColor: '#FFFBEB', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FDE68A' },
  carryoverText: { fontSize: 9, fontWeight: '700', color: '#B45309' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontWeight: '600' },
  startBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 56, justifyContent: 'center', backgroundColor: '#1565C0' },
  startBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  continueBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#93C5FD', minWidth: 64, alignItems: 'center' },
  continueBtnText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  lockedBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  lockedText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },

  sectionCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionCardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12 },

  labCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderLeftWidth: 4, backgroundColor: '#F8FAFC', marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  labIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  labPatient: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  labMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  labBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  labBadgeText: { fontSize: 11, fontWeight: '600' },

  rxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  rxIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  rxName: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  rxMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  rxBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  rxBadgeText: { fontSize: 11, fontWeight: '600' },

  newBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F3FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#DDD6FE' },
  newBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8B5CF6' },
  newBadgeText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },

  emptySmall: { alignItems: 'center', paddingVertical: 16 },
  emptySmallText: { color: '#94A3B8', marginTop: 8, fontSize: 13 },
});