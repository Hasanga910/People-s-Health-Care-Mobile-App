import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, RefreshControl, Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

// ── Constants ─────────────────────────────────────────────────
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS = {
  Completed:    { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', bar: '#22C55E' },
  'In Progress':{ bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', bar: '#3B82F6' },
  Pending:      { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', bar: '#F59E0B' },
  Cancelled:    { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', bar: '#EF4444' },
};

const getLocalDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function normalise(appt) {
  return {
    id:      appt._id,
    apptId:  appt.appointmentId || appt._id,
    patient: appt.patientName ?? 'Unknown',
    date:    appt.date,
    time:    appt.estimatedTime ?? '—',
    session: appt.session,
    status:  appt.status,
    patientId: appt.patientId,
  };
}

function getHolidayIcon(h) {
  const r = (h?.reason || h?.label || '').toLowerCase();
  if (r.includes('poya')) return '🌕';
  if (h?.type === 'holiday') return '🔴';
  return '⚠️';
}

function toMins(hhmm = '00:00') {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// ── Appointment Detail Modal ──────────────────────────────────
function AppointmentDetailModal({ appt, onClose, onStatusChange }) {
  if (!appt) return null;

  const [loading, setLoading]           = useState(false);
  const [prescription, setPrescription] = useState(null);
  const [labRequest, setLabRequest]     = useState(null);
  const [loadingRx, setLoadingRx]       = useState(false);

  const st = STATUS[appt.status] ?? STATUS.Pending;

  useEffect(() => {
    if (!appt.apptId) return;
    setLoadingRx(true);
    Promise.all([
      api.get(`/prescriptions?appointmentId=${appt.apptId}&limit=1`).catch(() => null),
      api.get(`/prescriptions?appointmentId=${appt.id}&limit=1`).catch(() => null),
      api.get(`/lab-requests?appointmentNumber=${appt.apptId}&limit=1`).catch(() => null),
    ]).then(async ([rx1, rx2, lrRes]) => {
      const rx = rx1?.data?.prescriptions?.[0] ?? rx2?.data?.prescriptions?.[0] ?? null;
      setPrescription(rx);
      if (rx?.labRequestRef) {
        try {
          const r = await api.get(`/lab-requests/${rx.labRequestRef}`);
          setLabRequest(r?.data?.labRequest ?? null);
        } catch { setLabRequest(null); }
      } else {
        setLabRequest(lrRes?.data?.labRequests?.[0] ?? null);
      }
    }).finally(() => setLoadingRx(false));
  }, [appt.apptId]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await api.patch(`/appointments/${appt.id}/start`);
      onStatusChange(appt.id, 'In Progress');
      onClose();
    } catch (err) {
      console.log('Start failed:', err.message);
    } finally { setLoading(false); }
  };

  const RX_STATUS = {
    pending:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: 'Pending' },
    in_progress: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'In Progress' },
    dispensed:   { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Dispensed' },
    cancelled:   { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', label: 'Cancelled' },
  };
  const LR_STATUS = {
    pending:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: 'Pending' },
    in_progress: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'In Progress' },
    completed:   { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Completed' },
  };

  const isPending = appt.status === 'Pending';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={dm.overlay} onPress={onClose}>
        <View style={dm.sheet} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <LinearGradient colors={['#0D2137', '#1565C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={dm.header}>
            <View>
              <Text style={dm.headerSub}>Appointment Details</Text>
              <Text style={dm.headerTitle}>#{appt.apptId}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={dm.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={dm.body} showsVerticalScrollIndicator={false}>

            {/* Patient card */}
            <View style={dm.patientCard}>
              <LinearGradient colors={['#1565C0', '#00ACC1']} style={dm.patientAvatar}>
                <Text style={dm.patientInitials}>{getInitials(appt.patient)}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={dm.patientName}>{appt.patient}</Text>
                <Text style={dm.patientSub}>{appt.session} Session</Text>
              </View>
              <View style={[dm.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                <Text style={[dm.statusText, { color: st.text }]}>{appt.status}</Text>
              </View>
            </View>

            {/* Info grid */}
            <View style={dm.infoGrid}>
              {[
                { label: 'Date',           value: appt.date,    icon: 'calendar-outline' },
                { label: 'Est. Time',      value: appt.time,    icon: 'time-outline' },
                { label: 'Session',        value: appt.session, icon: 'document-text-outline' },
                { label: 'Appointment ID', value: appt.apptId,  icon: 'id-card-outline' },
              ].map(item => (
                <View key={item.label} style={dm.infoCell}>
                  <View style={dm.infoCellTop}>
                    <Ionicons name={item.icon} size={13} color="#3B82F6" />
                    <Text style={dm.infoCellLabel}>{item.label}</Text>
                  </View>
                  <Text style={dm.infoCellValue} numberOfLines={1}>{item.value}</Text>
                </View>
              ))}
            </View>

            {/* Medical Records */}
            <View style={dm.medSection}>
              <View style={dm.medHeader}>
                <Ionicons name="document-text-outline" size={16} color="#2563EB" />
                <Text style={dm.medHeaderText}>Medical Records</Text>
                {loadingRx && <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 'auto' }} />}
              </View>

              {/* Prescription */}
              <View style={dm.medRow}>
                <View style={dm.medIconBox}>
                  <Ionicons name="document-text-outline" size={16} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dm.medRowLabel}>Prescription</Text>
                  {isPending ? (
                    <View style={[dm.medPill, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                      <View style={[dm.medPillDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={[dm.medPillText, { color: '#B45309' }]}>Pending — not yet issued</Text>
                    </View>
                  ) : loadingRx ? (
                    <View style={dm.skeleton} />
                  ) : prescription ? (
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={dm.medMono}>{prescription.prescriptionId}</Text>
                      {(() => {
                        const ps = RX_STATUS[prescription.pharmacyStatus] ?? RX_STATUS.pending;
                        return (
                          <View style={[dm.medPill, { backgroundColor: ps.bg, borderColor: ps.border }]}>
                            <Text style={[dm.medPillText, { color: ps.text }]}>{ps.label}</Text>
                          </View>
                        );
                      })()}
                    </View>
                  ) : (
                    <Text style={dm.medEmpty}>No prescription issued</Text>
                  )}
                </View>
              </View>

              {/* Lab Request */}
              <View style={[dm.medRow, { borderBottomWidth: 0 }]}>
                <View style={[dm.medIconBox, { backgroundColor: '#F0FDFA' }]}>
                  <Ionicons name="flask-outline" size={16} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dm.medRowLabel}>Lab Request</Text>
                  {isPending ? (
                    <View style={[dm.medPill, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                      <View style={[dm.medPillDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={[dm.medPillText, { color: '#B45309' }]}>Pending — not yet requested</Text>
                    </View>
                  ) : loadingRx ? (
                    <View style={dm.skeleton} />
                  ) : labRequest ? (
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={[dm.medMono, { color: '#0D9488' }]}>{labRequest.labRequestId}</Text>
                      {(() => {
                        const ls = LR_STATUS[labRequest.status] ?? LR_STATUS.pending;
                        return (
                          <View style={[dm.medPill, { backgroundColor: ls.bg, borderColor: ls.border }]}>
                            <Text style={[dm.medPillText, { color: ls.text }]}>{ls.label}</Text>
                          </View>
                        );
                      })()}
                    </View>
                  ) : (
                    <Text style={dm.medEmpty}>No lab tests requested</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <View style={dm.actions}>
              {appt.status === 'Pending' && (
                <TouchableOpacity
                  style={[dm.actionBtnPrimary, loading && { opacity: 0.6 }]}
                  onPress={handleStart}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={['#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={dm.actionBtnGrad}>
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={dm.actionBtnText}>Start Consultation</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {appt.status === 'In Progress' && (
                <TouchableOpacity style={dm.actionBtnPrimary} activeOpacity={0.85}>
                  <LinearGradient colors={['#0D47A1', '#1976D2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={dm.actionBtnGrad}>
                    <Ionicons name="pencil-outline" size={16} color="#fff" />
                    <Text style={dm.actionBtnText}>Continue Treatment</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={dm.actionBtnSecondary} onPress={onClose} activeOpacity={0.8}>
                <Text style={dm.actionBtnSecondaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 2 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  patientCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F8FAFC', borderRadius: 18, padding: 14, marginBottom: 16 },
  patientAvatar: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  patientInitials: { color: '#fff', fontWeight: '700', fontSize: 18 },
  patientName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  patientSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  infoCell: { flex: 1, minWidth: '44%', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12 },
  infoCellTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  infoCellLabel: { fontSize: 11, color: '#94A3B8' },
  infoCellValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  medSection: { borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  medHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  medHeaderText: { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.8 },
  medRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  medIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  medRowLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 5 },
  medPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  medPillDot: { width: 5, height: 5, borderRadius: 2.5 },
  medPillText: { fontSize: 11, fontWeight: '600' },
  medMono: { fontSize: 13, fontWeight: '700', color: '#1D4ED8', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  medEmpty: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  skeleton: { height: 14, width: 100, backgroundColor: '#F1F5F9', borderRadius: 6 },
  actions: { flexDirection: 'row', gap: 10, paddingBottom: 8 },
  actionBtnPrimary: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  actionBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionBtnSecondary: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  actionBtnSecondaryText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
});

// ── Main Component ────────────────────────────────────────────
export default function DoctorAppointments() {
  const today = getLocalDateStr();

  const [appointments, setAppointments]   = useState([]);
  const [holidays, setHolidays]           = useState([]);
  const [loadingAppts, setLoadingAppts]   = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState(null);
  const [selectedAppt, setSelectedAppt]   = useState(null);

  const [morningStart, setMorningStart] = useState('07:00');
  const [morningEnd,   setMorningEnd]   = useState('08:00');
  const [eveningStart, setEveningStart] = useState('17:00');
  const [eveningEnd,   setEveningEnd]   = useState('20:00');

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [scheduleFilter, setScheduleFilter] = useState('All');

  const fetchAppointments = useCallback(async (date, silent = false) => {
    if (!silent) { setLoadingAppts(true); setError(null); }
    try {
      const res = await api.get(`/appointments/today?date=${date}`);
      setAppointments((res.data.appointments ?? []).map(normalise));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load appointments.');
    } finally { setLoadingAppts(false); }
  }, []);

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await api.get('/appointments/holidays');
      setHolidays(res.data.holidays ?? []);
    } catch {}
  }, []);

  const fetchSessionConfig = useCallback(async () => {
    try {
      const dateStr = getLocalDateStr();
      const [mRes, eRes] = await Promise.allSettled([
        api.get(`/appointments/session-info?date=${dateStr}&session=Morning`),
        api.get(`/appointments/session-info?date=${dateStr}&session=Evening`),
      ]);
      if (mRes.status === 'fulfilled') {
        const d = mRes.value.data?.data;
        if (d?.startTime) setMorningStart(d.startTime);
        if (d?.endTime)   setMorningEnd(d.endTime);
      }
      if (eRes.status === 'fulfilled') {
        const d = eRes.value.data?.data;
        if (d?.startTime) setEveningStart(d.startTime);
        if (d?.endTime)   setEveningEnd(d.endTime);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchAppointments(selectedDate); }, [selectedDate]);
  useEffect(() => { fetchHolidays(); fetchSessionConfig(); }, []);
  useEffect(() => {
    const id = setInterval(() => { fetchAppointments(selectedDate, true); fetchSessionConfig(); }, 5_000);
    return () => clearInterval(id);
  }, [selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments(selectedDate);
    setRefreshing(false);
  };

  const handleStatusChange = (id, newStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
  };

  // Calendar helpers
  const year        = currentDate.getFullYear();
  const month       = currentDate.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const formatDate  = (d) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const isSunday    = (ds) => new Date(ds + 'T00:00:00').getDay() === 0;
  const getDayHols  = (ds) => holidays.filter(h => h.date === ds);
  const isFullyBlocked = (ds) => isSunday(ds) || holidays.some(h => h.date === ds && h.session === 'Both');
  const isPartBlocked  = (ds) => !isFullyBlocked(ds) && getDayHols(ds).length > 0;
  const getDayAppts = (ds) => appointments.filter(a => a.date === ds);

  // Current session detection
  const currentSession = (() => {
    const now = new Date().getHours() * 60 + new Date().getMinutes();
    if (now >= toMins(morningStart) && now < toMins(morningEnd)) return 'Morning';
    if (now >= toMins(eveningStart) && now < toMins(eveningEnd)) return 'Evening';
    if (now < toMins(morningStart)) return 'Morning';
    return 'Evening';
  })();

  const selectedFullyBlocked = isFullyBlocked(selectedDate);
  const selectedDayHols      = getDayHols(selectedDate);

  // Filtered appointments
  const allAppts = appointments;
  const sessionAppts = selectedFullyBlocked ? [] : allAppts.filter(a =>
    a.session === currentSession || a.status === 'In Progress'
  );
  const filteredAppts = scheduleFilter === 'All'
    ? allAppts.filter(a => a.status !== 'Cancelled')
    : allAppts.filter(a => a.status !== 'Cancelled' && a.session === scheduleFilter);

  const completed  = sessionAppts.filter(a => a.status === 'Completed').length;
  const inProgress = sessionAppts.filter(a => a.status === 'In Progress').length;
  const pending    = sessionAppts.filter(a => a.status === 'Pending').length;
  const cancelled  = allAppts.filter(a => a.status === 'Cancelled').length;
  const totalActive = sessionAppts.filter(a => a.status !== 'Cancelled').length;

  return (
    <View style={s.root}>
      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        appt={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onStatusChange={handleStatusChange}
      />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" />}
      >
        {/* ── HEADER ── */}
        <LinearGradient colors={['#0D2137', '#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
          <View>
            <Text style={s.headerTitle}>Appointment Schedule</Text>
            <Text style={s.headerSub}>Manage your daily appointment sessions</Text>
          </View>
          <View style={s.headerDate}>
            <Text style={s.headerDateText}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* Error banner */}
          {!!error && (
            <View style={s.errorBanner}>
              <Ionicons name="warning-outline" size={16} color="#DC2626" />
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => fetchAppointments(selectedDate)}>
                <Text style={s.errorRetry}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STAT CARDS ── */}
          <View style={s.statsRow}>
            {[
              { label: 'Total',     value: loadingAppts ? '…' : totalActive, color: '#1565C0', bg: '#E3F2FD' },
              { label: 'Done',      value: loadingAppts ? '…' : completed,   color: '#00897B', bg: '#E0F2F1' },
              { label: 'Pending',   value: loadingAppts ? '…' : pending,     color: '#7B1FA2', bg: '#F3E5F5' },
              { label: 'Cancelled', value: loadingAppts ? '…' : cancelled,   color: '#B71C1C', bg: '#FFEBEE' },
            ].map(stat => (
              <View key={stat.label} style={s.statCard}>
                <Text style={[s.statNum, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* ── CALENDAR ── */}
          <View style={s.card}>
            {/* Month nav */}
            <View style={s.calNav}>
              <TouchableOpacity style={s.calNavBtn} onPress={() => setCurrentDate(new Date(year, month - 1, 1))} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={16} color="#374151" />
              </TouchableOpacity>
              <Text style={s.calMonthLabel}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity style={s.calNavBtn} onPress={() => setCurrentDate(new Date(year, month + 1, 1))} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={16} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={s.calDayHeaders}>
              {DAYS.map(d => (
                <Text key={d} style={[s.calDayHeader, d === 'Sun' && { color: '#EF4444' }]}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={s.calGrid}>
              {Array(firstDay).fill(null).map((_, i) => <View key={`e${i}`} style={s.calCell} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const ds        = formatDate(day);
                const isSelected = ds === selectedDate;
                const isToday   = ds === today;
                const sunday    = isSunday(ds);
                const dayHols   = getDayHols(ds);
                const fullyBlocked = sunday || dayHols.some(h => h.session === 'Both');
                const partBlocked  = !fullyBlocked && dayHols.length > 0;
                const dayAppts  = getDayAppts(ds);

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      s.calCell,
                      isSelected && s.calCellSelected,
                      isToday && !isSelected && s.calCellToday,
                      fullyBlocked && (sunday ? s.calCellSunday : s.calCellBlocked),
                    ]}
                    onPress={() => !fullyBlocked && setSelectedDate(ds)}
                    activeOpacity={fullyBlocked ? 1 : 0.7}
                  >
                    {isSelected ? (
                      <LinearGradient colors={['#1565C0', '#00ACC1']} style={s.calCellGrad}>
                        <Text style={s.calDaySelected}>{day}</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={[
                        s.calDayText,
                        sunday && { color: '#FCA5A5' },
                        fullyBlocked && !sunday && { color: '#FDBA74' },
                        isToday && { color: '#1D4ED8', fontWeight: '700' },
                      ]}>{day}</Text>
                    )}
                    {dayAppts.length > 0 && !fullyBlocked && (
                      <View style={[s.calDot, isSelected && { backgroundColor: '#fff' }]} />
                    )}
                    {partBlocked && <Text style={s.calPartBlocked}>⚠️</Text>}
                    {sunday && <Text style={s.calSundayX}>✕</Text>}
                    {!sunday && fullyBlocked && dayHols.length > 0 && (
                      <Text style={s.calHolIcon}>{getHolidayIcon(dayHols.find(h => h.session === 'Both'))}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={s.calLegend}>
              {[
                { icon: '🌅', text: `Morning: ${morningStart.replace(':','h')} – ${morningEnd.replace(':','h')}` },
                { icon: '🌆', text: `Evening: ${eveningStart.replace(':','h')} – ${eveningEnd.replace(':','h')}` },
                { icon: '✅', text: 'Mon – Sat' },
                { icon: '❌', text: 'Sunday: Closed' },
              ].map(item => (
                <View key={item.text} style={s.calLegendRow}>
                  <Text style={s.calLegendIcon}>{item.icon}</Text>
                  <Text style={s.calLegendText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── SELECTED DATE APPOINTMENTS ── */}
          <View style={s.card}>
            {/* Card header */}
            <View style={s.listHeader}>
              <View>
                <Text style={s.listHeaderTitle}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                <Text style={s.listHeaderSub}>
                  {isSunday(selectedDate)
                    ? 'Sunday – Not Available'
                    : selectedFullyBlocked
                      ? `${selectedDayHols.find(h => h.session === 'Both')?.reason || 'Unavailable'} – Fully Blocked`
                      : `${sessionAppts.length} appointment${sessionAppts.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              {!isSunday(selectedDate) && !selectedFullyBlocked && (
                <View style={s.sessionChip}>
                  <Text style={s.sessionChipText}>
                    {currentSession === 'Morning' ? '🌤️' : '🌙'} {currentSession}
                  </Text>
                </View>
              )}
            </View>

            {/* Content */}
            {isSunday(selectedDate) ? (
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>🚫</Text>
                <Text style={[s.emptyTitle, { color: '#EF4444' }]}>Sunday – Clinic Closed</Text>
                <Text style={s.emptySub}>No appointments are accepted on Sundays.</Text>
              </View>
            ) : selectedFullyBlocked ? (
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>{getHolidayIcon(selectedDayHols.find(h => h.session === 'Both') || {})}</Text>
                <Text style={[s.emptyTitle, { color: '#EA580C' }]}>
                  {selectedDayHols.find(h => h.session === 'Both')?.reason || 'Fully Unavailable'}
                </Text>
                <Text style={s.emptySub}>No appointments available on this day.</Text>
              </View>
            ) : loadingAppts ? (
              <View style={s.emptyState}>
                <ActivityIndicator color="#1565C0" size="large" />
                <Text style={[s.emptySub, { marginTop: 12 }]}>Loading appointments…</Text>
              </View>
            ) : sessionAppts.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>{currentSession === 'Morning' ? '🌤️' : '🌙'}</Text>
                <Text style={s.emptyTitle}>No {currentSession.toLowerCase()} appointments</Text>
                <Text style={s.emptySub}>No patients booked for the {currentSession.toLowerCase()} session.</Text>
              </View>
            ) : (
              sessionAppts.map(appt => {
                const st = STATUS[appt.status] ?? STATUS.Pending;
                const isCarryover = currentSession === 'Evening' && appt.session === 'Morning';
                return (
                  <TouchableOpacity
                    key={appt.id}
                    style={s.apptRow}
                    onPress={() => setSelectedAppt(appt)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.apptTime}>{appt.time}</Text>
                    <View style={[s.apptBar, { backgroundColor: st.bar }]} />
                    <LinearGradient colors={['#1565C0', '#00ACC1']} style={s.apptAvatar}>
                      <Text style={s.apptInitials}>{getInitials(appt.patient)}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.apptName} numberOfLines={1}>{appt.patient}</Text>
                        {isCarryover && (
                          <View style={s.carryoverBadge}>
                            <Text style={s.carryoverText}>AM carry-over</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.apptMeta} numberOfLines={1}>ID: {appt.apptId} · {appt.session}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                      <Text style={[s.statusText, { color: st.text }]}>{appt.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ── FULL SCHEDULE TABLE ── */}
          <View style={s.card}>
            {/* Header */}
            <View style={s.scheduleHeader}>
              <View>
                <Text style={s.listHeaderTitle}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} — Schedule
                </Text>
              </View>
              <TouchableOpacity style={s.refreshBtn} onPress={() => fetchAppointments(selectedDate)} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={14} color="#374151" />
                <Text style={s.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {/* Filter tabs */}
            <View style={s.filterTabs}>
              {['All', 'Morning', 'Evening'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterTab, scheduleFilter === f && s.filterTabActive]}
                  onPress={() => setScheduleFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.filterTabText, scheduleFilter === f && s.filterTabTextActive]}>
                    {f === 'Morning' ? '🌤️ ' : f === 'Evening' ? '🌙 ' : ''}{f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* List */}
            {loadingAppts ? (
              <View style={[s.emptyState, { paddingVertical: 24 }]}>
                <ActivityIndicator color="#1565C0" />
              </View>
            ) : filteredAppts.length === 0 ? (
              <View style={[s.emptyState, { paddingVertical: 24 }]}>
                <Text style={s.emptySub}>
                  {scheduleFilter === 'All' ? 'No appointments on this date.' : `No ${scheduleFilter.toLowerCase()} appointments.`}
                </Text>
              </View>
            ) : (
              filteredAppts.map(appt => {
                const st = STATUS[appt.status] ?? STATUS.Pending;
                return (
                  <TouchableOpacity
                    key={appt.id}
                    style={s.scheduleRow}
                    onPress={() => setSelectedAppt(appt)}
                    activeOpacity={0.7}
                  >
                    {/* Appt ID */}
                    <View style={s.scheduleIdBox}>
                      <Text style={s.scheduleId}>{appt.apptId?.split('-').pop() || '—'}</Text>
                    </View>
                    {/* Patient + meta */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.scheduleName} numberOfLines={1}>{appt.patient}</Text>
                      <Text style={s.scheduleMeta}>
                        {appt.session === 'Morning' ? '🌤️' : '🌙'} {appt.session} · {appt.time}
                      </Text>
                    </View>
                    {/* Status */}
                    <View style={[s.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                      <Text style={[s.statusText, { color: st.text }]}>{appt.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={13} color="#CBD5E1" />
                  </TouchableOpacity>
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
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },

  // Header
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3 },
  headerDate: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  headerDateText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  body: { padding: 14, gap: 14 },

  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12 },
  errorText: { flex: 1, color: '#DC2626', fontSize: 13 },
  errorRetry: { color: '#DC2626', fontWeight: '700', fontSize: 12 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: '#64748B', marginTop: 2, textAlign: 'center' },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },

  // Calendar
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 12 },
  calNavBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  calMonthLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  calDayHeaders: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 6 },
  calDayHeader: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 12 },
  calCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, position: 'relative' },
  calCellSelected: { overflow: 'hidden' },
  calCellToday: { borderWidth: 2, borderColor: '#3B82F6' },
  calCellSunday: { backgroundColor: '#FEF2F2' },
  calCellBlocked: { backgroundColor: '#FFF7ED' },
  calCellGrad: { width: '100%', height: '100%', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calDayText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  calDaySelected: { fontSize: 12, fontWeight: '700', color: '#fff' },
  calDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: '#3B82F6' },
  calPartBlocked: { position: 'absolute', top: 0, right: 1, fontSize: 7 },
  calSundayX: { position: 'absolute', top: 1, right: 2, fontSize: 7, color: '#FCA5A5' },
  calHolIcon: { position: 'absolute', top: 0, right: 1, fontSize: 7 },
  calLegend: { borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 14, gap: 6 },
  calLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calLegendIcon: { fontSize: 13 },
  calLegendText: { fontSize: 11, color: '#64748B' },

  // List header
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  listHeaderTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  listHeaderSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  sessionChip: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#BFDBFE' },
  sessionChipText: { fontSize: 11, fontWeight: '600', color: '#1D4ED8' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 36 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center' },

  // Appointment rows
  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  apptTime: { fontSize: 11, fontWeight: '600', color: '#64748B', width: 40, flexShrink: 0 },
  apptBar: { width: 3, height: 38, borderRadius: 2, flexShrink: 0 },
  apptAvatar: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  apptInitials: { color: '#fff', fontWeight: '700', fontSize: 13 },
  apptName: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  apptMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  carryoverBadge: { backgroundColor: '#FFFBEB', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FDE68A' },
  carryoverText: { fontSize: 9, fontWeight: '700', color: '#B45309' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },

  // Schedule section
  scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  refreshText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  filterTabs: { flexDirection: 'row', margin: 12, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, gap: 3 },
  filterTab: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center' },
  filterTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  filterTabText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  filterTabTextActive: { color: '#0F172A' },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  scheduleIdBox: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, flexShrink: 0 },
  scheduleId: { fontSize: 10, fontWeight: '700', color: '#1D4ED8', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  scheduleName: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  scheduleMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});