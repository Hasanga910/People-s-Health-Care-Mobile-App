import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Animated, Platform, Pressable, Dimensions,
  PanResponder, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

import DoctorDashboard        from './DoctorDashboard';
import DoctorAppointments     from './DoctorAppointments';
import DoctorPrescriptions    from './DoctorPrescriptions';
import DoctorLab              from './DoctorLab';
import DoctorPatients         from './DoctorPatients';
import DoctorMedicineAnalysis from './DoctorMedicineAnalysis';
import DoctorSettings         from './DoctorSettings';
import DoctorUnavailability   from './DoctorUnavailability';

const Tab = createBottomTabNavigator();
const { width: SCREEN_W } = Dimensions.get('window');
const ACCENT = '#1565C0';

// ─────────────────────────────────────────────────────────────────────────────
// TOAST CONFIG — matches web exactly
// ─────────────────────────────────────────────────────────────────────────────
const TOAST_CFG = {
  critical:    { accent: '#ef4444', label: 'Critical Alert',         badge: 'URGENT',    badgeBg: '#ef4444' },
  lab:         { accent: '#8b5cf6', label: 'Lab Result Ready',       badge: 'NEW',       badgeBg: '#8b5cf6' },
  appointment: { accent: '#3b82f6', label: 'New Appointment',        badge: 'IMPORTANT', badgeBg: '#f97316' },
  prescription:{ accent: '#14b8a6', label: 'Prescription Dispensed', badge: null,        badgeBg: null      },
  info:        { accent: '#64748b', label: 'Notice',                 badge: null,        badgeBg: null      },
};

// Icon map (Ionicons names matching the web SVGs)
const NOTIF_ICON = {
  critical:    'warning',
  lab:         'flask',
  appointment: 'calendar',
  prescription:'document-text',
  info:        'information-circle',
};

// ─────────────────────────────────────────────────────────────────────────────
// LIQUID GLASS TOAST — React Native port
// Slide in from right, glass background, shrinking progress bar, auto-dismiss
// ─────────────────────────────────────────────────────────────────────────────
function LiquidToast({ toast, onDismiss }) {
  const cfg        = TOAST_CFG[toast.type] ?? TOAST_CFG.info;
  const isCrit     = toast.type === 'critical';
  const duration   = toast.duration ?? 5200;

  const slideX     = useRef(new Animated.Value(SCREEN_W)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const progress   = useRef(new Animated.Value(1)).current;  // 1 → 0 over duration
  const pulsAnim   = useRef(new Animated.Value(1)).current;
  const dismissed  = useRef(false);

  // Pulse for critical dot
  useEffect(() => {
    if (!isCrit) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsAnim, { toValue: 1.8, duration: 700, useNativeDriver: true }),
        Animated.timing(pulsAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    // Slide in + fade in
    Animated.parallel([
      Animated.spring(slideX, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    // Progress bar shrink
    Animated.timing(progress, {
      toValue: 0,
      duration,
      useNativeDriver: false, // width interpolation
    }).start();

    // Auto-dismiss
    const t = setTimeout(() => dismiss(), duration);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.parallel([
      Animated.timing(slideX, { toValue: SCREEN_W, duration: 320, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  };

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View
      style={[
        tst.container,
        { transform: [{ translateX: slideX }], opacity },
        isCrit ? tst.containerCritical : tst.containerNormal,
      ]}
    >
      {/* Glass shimmer overlay */}
      <View style={tst.shimmer} pointerEvents="none" />

      {/* Row 1: icon · label · badge · close */}
      <View style={tst.row1}>
        {/* Circular icon with accent ring */}
        <View style={[tst.iconCircle, { backgroundColor: cfg.accent + '28', borderColor: cfg.accent + '55' }]}>
          <Ionicons name={NOTIF_ICON[toast.type] || 'information-circle'} size={16} color={cfg.accent} />
          {isCrit && (
            <Animated.View
              style={[tst.criticalPulse, { backgroundColor: cfg.accent, transform: [{ scale: pulsAnim }] }]}
              pointerEvents="none"
            />
          )}
        </View>

        {/* Type label */}
        <Text style={[tst.typeLabel, { color: cfg.accent }]}>{cfg.label}</Text>

        {/* Priority badge */}
        {cfg.badge && (
          <View style={[tst.badge, { backgroundColor: cfg.badgeBg }]}>
            <Text style={tst.badgeText}>{cfg.badge}</Text>
          </View>
        )}

        {/* Close button */}
        <TouchableOpacity onPress={dismiss} style={tst.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={14} color="rgba(0,0,0,0.4)" />
        </TouchableOpacity>
      </View>

      {/* Row 2: title */}
      <Text style={tst.title} numberOfLines={2}>{toast.title}</Text>

      {/* Row 3: subtitle */}
      {!!toast.subtitle && (
        <Text style={[tst.subtitle, isCrit && { color: '#dc2626', fontWeight: '600' }]} numberOfLines={2}>
          {toast.subtitle}
        </Text>
      )}

      {/* Progress bar */}
      <View style={tst.progressTrack}>
        <Animated.View
          style={[tst.progressBar, { width: progressWidth, backgroundColor: cfg.accent }]}
        />
      </View>
    </Animated.View>
  );
}

// Toast stack — fixed at top-right, stacks multiple toasts
function ToastStack({ toasts, onDismiss }) {
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View
      style={[tst.stack, { top: (insets.top || 44) + 8 }]}
      pointerEvents="box-none"
    >
      {toasts.map(t => (
        <LiquidToast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

const tst = StyleSheet.create({
  stack: {
    position: 'absolute',
    right: 12,
    zIndex: 9999,
    gap: 8,
    pointerEvents: 'box-none',
  },
  container: {
    width: SCREEN_W * 0.86,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 8,
  },
  containerNormal: {
    backgroundColor: 'rgba(186,225,255,0.82)',
    borderColor: 'rgba(147,197,253,0.65)',
    shadowColor: 'rgba(59,130,246,0.3)',
  },
  containerCritical: {
    backgroundColor: 'rgba(254,202,202,0.88)',
    borderColor: 'rgba(252,165,165,0.7)',
    shadowColor: 'rgba(239,68,68,0.3)',
  },
  shimmer: {
    position: 'absolute',
    inset: 0,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 7,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexShrink: 0,
  },
  criticalPulse: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  typeLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    flex: 1,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 3,
    opacity: 0.45,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 11.5,
    color: 'rgba(100,116,139,0.9)',
    lineHeight: 16,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  progressBar: {
    height: '100%',
    borderBottomLeftRadius: 18,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION HELPERS — ported directly from web
// ─────────────────────────────────────────────────────────────────────────────
const getLocalDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return 'Just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function hasCriticalFlag(result) {
  return (result?.results?.parameters ?? []).some(p =>
    ['High', 'Low', 'Positive', 'Reactive'].includes(p?.flag)
  );
}

function getCriticalSummary(result) {
  return (result?.results?.parameters ?? [])
    .filter(p => ['High', 'Low', 'Positive', 'Reactive'].includes(p?.flag))
    .map(p => `${p.name}: ${p.flag}`)
    .slice(0, 2).join(' · ');
}

function isNotifRelevant(isoTime, type, id, unreadIds) {
  if (!isoTime) return false;
  const t            = new Date(isoTime);
  const now          = new Date();
  const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart - 86_400_000);
  if (type === 'critical') return t >= yesterdayStart;
  if (t >= todayStart)     return true;
  if (t >= yesterdayStart) return unreadIds.has(id);
  return false;
}

function buildNotifications(labResults = [], appointments = [], prescriptions = [], unreadIds = new Set()) {
  const list = [];

  labResults
    .filter(r => hasCriticalFlag(r) && isNotifRelevant(r.updatedAt || r.createdAt, 'critical', `crit-${r._id}`, unreadIds))
    .forEach(r => list.push({
      id: `crit-${r._id}`, type: 'critical',
      title: `Critical Result — ${r.patientName || 'Patient'}`,
      subtitle: getCriticalSummary(r),
      idLabel: r.labRequestRef || null,
      time: r.updatedAt || r.createdAt,
    }));

  labResults
    .filter(r => !hasCriticalFlag(r) && r.status === 'completed' && isNotifRelevant(r.updatedAt || r.createdAt, 'lab', `lab-${r._id}`, unreadIds))
    .forEach(r => list.push({
      id: `lab-${r._id}`, type: 'lab',
      title: `Lab Results Ready — ${r.patientName || 'Patient'}`,
      subtitle: r.testName,
      idLabel: r.labRequestRef || null,
      time: r.updatedAt || r.createdAt,
    }));

  appointments
    .filter(a => a.status === 'Pending')
    .slice(0, 10)
    .forEach(a => list.push({
      id: `apt-${a._id}`, type: 'appointment',
      title: `New Appointment — ${a.patientName || 'Patient'}`,
      subtitle: `${a.session || ''} Session${a.estimatedTime ? ' · ' + a.estimatedTime : ''}`,
      idLabel: a.appointmentId || null,
      time: a.createdAt,
    }));

  prescriptions
    .filter(p => {
      const iso = p.dispensedAt || p.updatedAt || p.createdAt;
      return p.pharmacyStatus === 'dispensed' && isNotifRelevant(iso, 'prescription', `rx-${p._id}`, unreadIds);
    })
    .slice(0, 10)
    .forEach(p => list.push({
      id: `rx-${p._id}`, type: 'prescription',
      title: `Prescription Dispensed — ${p.patientName || 'Patient'}`,
      subtitle: null,
      idLabel: p.prescriptionId,
      time: p.dispensedAt || p.updatedAt || p.createdAt,
    }));

  return list.sort((a, b) => {
    if (a.type === 'critical' && b.type !== 'critical') return -1;
    if (b.type === 'critical' && a.type !== 'critical') return  1;
    return new Date(b.time) - new Date(a.time);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ROW — liquid glass card matching web NotifRow
// ─────────────────────────────────────────────────────────────────────────────
function NotifRow({ n, isUnread }) {
  const cfg    = TOAST_CFG[n.type] ?? TOAST_CFG.info;
  const isCrit = n.type === 'critical';

  return (
    <View style={[
      nr.card,
      isCrit ? nr.cardCritical : nr.cardNormal,
      isUnread && { shadowColor: cfg.accent, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
    ]}>
      {/* Glass shimmer */}
      <View style={nr.shimmer} pointerEvents="none" />

      {/* Row 1: icon · type label · badge · time · unread dot */}
      <View style={nr.row1}>
        <View style={[nr.iconCircle, { backgroundColor: cfg.accent + '28', borderColor: cfg.accent + '50' }]}>
          <Ionicons name={NOTIF_ICON[n.type] || 'information-circle'} size={14} color={cfg.accent} />
        </View>
        <Text style={[nr.typeLabel, { color: cfg.accent }]}>{cfg.label}</Text>
        {cfg.badge && (isCrit || n.type === 'appointment') && (
          <View style={[nr.badge, { backgroundColor: isCrit ? '#ef4444' : '#f97316' }]}>
            <Text style={nr.badgeText}>{cfg.badge}</Text>
          </View>
        )}
        <Text style={nr.time}>{timeAgo(n.time)}</Text>
        {isUnread && <View style={[nr.unreadDot, { backgroundColor: cfg.accent }]} />}
      </View>

      {/* Row 2: title */}
      <Text style={nr.title}>{n.title}</Text>

      {/* Row 3: subtitle */}
      {!!n.subtitle && (
        <Text style={[nr.subtitle, isCrit && { color: '#dc2626', fontWeight: '600' }]}>
          {n.subtitle}
        </Text>
      )}

      {/* ID label */}
      {!!n.idLabel && (
        <View style={[nr.idPill, { borderColor: cfg.accent + '40', backgroundColor: cfg.accent + '12' }]}>
          <Ionicons name="arrow-forward" size={9} color={cfg.accent} />
          <Text style={[nr.idPillText, { color: cfg.accent }]}>{n.idLabel}</Text>
        </View>
      )}
    </View>
  );
}

const nr = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginHorizontal: 12,
    marginVertical: 5,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  cardNormal: {
    backgroundColor: 'rgba(186,225,255,0.48)',
    borderColor: 'rgba(147,197,253,0.50)',
  },
  cardCritical: {
    backgroundColor: 'rgba(254,202,202,0.55)',
    borderColor: 'rgba(252,165,165,0.60)',
  },
  shimmer: {
    position: 'absolute',
    inset: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexShrink: 0,
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 9.5,
    color: 'rgba(100,116,139,0.8)',
    fontWeight: '500',
    flexShrink: 0,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 17,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(100,116,139,0.9)',
    lineHeight: 15,
    marginBottom: 3,
  },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 4,
  },
  idPillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION MODAL — full-panel bottom sheet
// ─────────────────────────────────────────────────────────────────────────────
function NotifModal({ visible, onClose, notifs, loadingN, unreadIds, onMarkAllRead }) {
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const dragY     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }).start(() => onClose());
  };

  // PanResponder — drag down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);   // only allow dragging down
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.6) {
          // Fling down → close
          Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }).start(() => {
            dragY.setValue(0);
            onClose();
          });
        } else {
          // Snap back
          Animated.spring(dragY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const criticals   = notifs.filter(n => n.type === 'critical');
  const others      = notifs.filter(n => n.type !== 'critical');
  const unreadCount = unreadIds.size;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={nm.overlay} onPress={handleClose}>
        <Animated.View
          style={[
            nm.sheet,
            {
              paddingBottom: insets.bottom + 8,
              transform: [
                { translateY: Animated.add(slideAnim, dragY) },
              ],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle + header gradient — drag zone */}
          <LinearGradient
            colors={['#0D2137', '#1565C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={nm.headerGradient}
          >
            {/* Draggable handle */}
            <View {...panResponder.panHandlers} style={nm.handleTouchable}>
              <View style={nm.handle} />
            </View>

            {/* Header content */}
            <View style={nm.header}>
              <View>
                <Text style={nm.headerTitle}>Today's Notifications</Text>
                <Text style={nm.headerSub}>
                  {loadingN ? 'Refreshing…' : `${notifs.length} today · ${unreadCount} unread`}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity style={nm.markAllBtn} onPress={onMarkAllRead}>
                    <Text style={nm.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                {loadingN && <Ionicons name="sync" size={16} color="rgba(255,255,255,0.6)" />}
              </View>
            </View>
          </LinearGradient>

          {/* Notification list */}
          <ScrollView
            style={nm.scroll}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {criticals.length > 0 && (
              <>
                <View style={nm.sectionHeader}>
                  <View style={nm.sectionDot} />
                  <Text style={nm.sectionLabelCritical}>⚡ Critical Alerts</Text>
                </View>
                {criticals.map(n => <NotifRow key={n.id} n={n} isUnread={unreadIds.has(n.id)} />)}
              </>
            )}
            {others.length > 0 && (
              <>
                {criticals.length > 0 && (
                  <View style={nm.sectionHeader}>
                    <Text style={nm.sectionLabel}>Recent Activity</Text>
                  </View>
                )}
                {others.map(n => <NotifRow key={n.id} n={n} isUnread={unreadIds.has(n.id)} />)}
              </>
            )}
            {notifs.length === 0 && !loadingN && (
              <View style={nm.empty}>
                <View style={nm.emptyIconBox}>
                  <Ionicons name="notifications-off-outline" size={28} color="#94A3B8" />
                </View>
                <Text style={nm.emptyTitle}>All clear</Text>
                <Text style={nm.emptySub}>No new notifications right now</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const nm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(219,234,254,0.97)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '55%',
    maxHeight: '90%',
    borderWidth: 1.5,
    borderColor: 'rgba(147,197,253,0.4)',
    overflow: 'hidden',
    shadowColor: 'rgba(59,130,246,0.2)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  handleTouchable: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
  },
  headerGradient: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 4,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '600', fontSize: 14 },
  headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  markAllText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '500' },
  scroll: { flexGrow: 1, flexShrink: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginTop: 4,
  },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  sectionLabelCritical: { fontSize: 10, fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(148,163,184,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#475569' },
  emptySub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MORE MENU ITEMS
// ─────────────────────────────────────────────────────────────────────────────
const MORE_ITEMS = [
  { label: 'Patient Records',   icon: 'people-outline',   screen: 'DoctorPatients' },
  { label: 'Medicine Analysis', icon: 'medkit-outline',   screen: 'DoctorMedicine' },
  { label: 'Settings',          icon: 'settings-outline', screen: 'DoctorSettings' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM BOTTOM TAB BAR
// ─────────────────────────────────────────────────────────────────────────────
function DoctorTabBar({ state, descriptors, navigation, onMorePress }) {
  const insets = useSafeAreaInsets();
  const TABS = [
    { name: 'DoctorDashboard', label: 'Dashboard',     icon: 'grid-outline',          iconActive: 'grid' },
    { name: 'DoctorSchedule',  label: 'Schedule',      icon: 'calendar-outline',      iconActive: 'calendar' },
    { name: 'DoctorRx',        label: 'Prescriptions', icon: 'document-text-outline', iconActive: 'document-text' },
    { name: 'DoctorLab',       label: 'Lab',           icon: 'flask-outline',         iconActive: 'flask' },
    { name: '__more__',        label: 'More',          icon: 'ellipsis-horizontal-outline', iconActive: 'ellipsis-horizontal' },
  ];

  return (
    <View style={[tb.bar, { paddingBottom: insets.bottom || 8 }]}>
      {TABS.map(tab => {
        const route   = state.routes.find(r => r.name === tab.name);
        const focused = route ? state.index === state.routes.indexOf(route) : false;
        const isMore  = tab.name === '__more__';
        const onPress = () => {
          if (isMore) { onMorePress(); return; }
          const ev = navigation.emit({ type: 'tabPress', target: route?.key, canPreventDefault: true });
          if (!focused && !ev.defaultPrevented) navigation.navigate(tab.name);
        };
        return (
          <TouchableOpacity key={tab.name} style={tb.item} onPress={onPress} activeOpacity={0.7}>
            <View style={[tb.iconWrap, focused && tb.iconWrapActive]}>
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={22} color={focused ? ACCENT : '#94A3B8'} />
            </View>
            <Text style={[tb.label, focused && tb.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10 },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: '#EFF6FF' },
  label: { fontSize: 10, fontWeight: '500', color: '#94A3B8' },
  labelActive: { color: ACCENT, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────
// MORE BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────
function MoreSheet({ visible, onClose, onNavigate, user, doctorProfile, logout }) {
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: 500, duration: 220, useNativeDriver: true }).start(() => onClose());
  };

  const MORE_ITEMS = [
    { screen: 'DoctorPatients',  label: 'Patient Records',      icon: 'people-outline' },
    { screen: 'DoctorMedicine',  label: 'Medicine Analysis',    icon: 'analytics-outline' },
    { screen: 'DoctorSettings',  label: 'Account Settings',     icon: 'settings-outline' },
  ];

  if (!visible) return null;

  const profile = doctorProfile || user;
  const name = profile?.name || 'Doctor';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const profilePhotoUrl = profile?.photo || profile?.profilePhoto || profile?.doctorDetails?.profilePhoto || null;
  const workingExperience = profile?.doctorDetails?.workingExperience || profile?.workingExperience;
  const expYears = parseInt(workingExperience, 10);
  const subtitle = !isNaN(expYears) && expYears > 0 ? `${expYears}+ yrs experience` : 'Physician';

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <Pressable style={ms.overlay} onPress={handleClose}>
        <Animated.View
          style={[ms.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={ms.handle} />
          <View style={ms.doctorRow}>
            {profilePhotoUrl ? (
              <Image 
                source={{ uri: profilePhotoUrl }} 
                style={ms.avatarImage}
              />
            ) : (
              <View style={ms.avatar}><Text style={ms.avatarText}>{initials}</Text></View>
            )}
            <View>
              <Text style={ms.doctorName}>Dr. {name.replace(/^Dr\.?\s*/i, '')}</Text>
              <Text style={ms.doctorSub}>{subtitle} · People's Health Care</Text>
            </View>
          </View>
          <View style={ms.divider} />
          {MORE_ITEMS.map(item => (
            <TouchableOpacity
              key={item.screen}
              style={ms.menuItem}
              onPress={() => { handleClose(); setTimeout(() => onNavigate(item.screen), 250); }}
              activeOpacity={0.7}
            >
              <View style={ms.menuIconBox}>
                <Ionicons name={item.icon} size={20} color={ACCENT} />
              </View>
              <Text style={ms.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ))}
          <View style={ms.divider} />
          <TouchableOpacity style={ms.logoutBtn} onPress={() => { handleClose(); setTimeout(logout, 250); }} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={ms.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 20, maxHeight: '80%' },
  handle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E2E8F0' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  doctorSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 4 },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '500', color: '#1E293B', flex: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR LAYOUT — main export
// ─────────────────────────────────────────────────────────────────────────────
export default function DoctorLayout() {
  const { user, logout } = useAuth();
  const tabNavRef = useRef(null);
  const [moreVisible,  setMoreVisible]  = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifs,       setNotifs]       = useState([]);
  const [unreadIds,    setUnreadIds]    = useState(new Set());
  const [loadingN,     setLoadingN]     = useState(false);
  const [toasts,       setToasts]       = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);

  const prevIdsRef    = useRef(new Set());
  const unreadIdsRef  = useRef(new Set());
  const toastIdRef    = useRef(0);

  // ── Fetch doctor profile from database ────────────────────────
  const fetchDoctorProfile = useCallback(async () => {
    if (!user) {
      setDoctorProfile(null);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      const freshUser = response.data?.user || response.data?.data || response.data;
      setDoctorProfile(freshUser || null);
    } catch (error) {
      const unauthorized = error?.response?.status === 401 || String(error?.message || '').includes('Not authorized');
      if (!unauthorized) {
        console.error('Failed to fetch doctor profile:', error);
      }
      setDoctorProfile(null);
    }
  }, [user]);

  // Fetch doctor profile on mount and when user changes
  useEffect(() => {
    fetchDoctorProfile();
  }, [fetchDoctorProfile, user]);

  // ── Fetch notifications ────────────────────────────────────
  const fetchNotifs = useCallback(async (showToasts = false) => {
    if (!user) {
      setLoadingN(false);
      setNotifs([]);
      unreadIdsRef.current = new Set();
      setUnreadIds(new Set());
      return;
    }

    if (!showToasts) setLoadingN(true);
    try {
      const todayStr = getLocalDateStr();
      const [lrRes, aptRes, rxRes] = await Promise.allSettled([
        api.get('/lab-results?status=completed&limit=50'),
        api.get(`/appointments/today?date=${todayStr}`),
        api.get('/prescriptions?limit=50'),
      ]);

      const labResults    = lrRes.status  === 'fulfilled' ? (lrRes.value.data.results       ?? []) : [];
      const appointments  = aptRes.status === 'fulfilled' ? (aptRes.value.data.appointments  ?? []) : [];
      const prescriptions = rxRes.status  === 'fulfilled' ? (rxRes.value.data.prescriptions  ?? []) : [];

      const built    = buildNotifications(labResults, appointments, prescriptions, unreadIdsRef.current);
      const builtIds = new Set(built.map(n => n.id));
      setNotifs(built);

      if (showToasts) {
        const newItems = built.filter(n => !prevIdsRef.current.has(n.id));
        const critNew  = newItems.filter(n => n.type === 'critical');
        const otherNew = newItems.filter(n => n.type !== 'critical').slice(0, 2);

        [...critNew, ...otherNew].forEach(n => {
          const id = ++toastIdRef.current;
          setToasts(prev => [...prev.slice(-3), { ...n, id, duration: n.type === 'critical' ? 8000 : 5200 }]);
        });

        setUnreadIds(prev => {
          const pruned = new Set([...prev].filter(id => builtIds.has(id)));
          newItems.forEach(n => pruned.add(n.id));
          unreadIdsRef.current = pruned;
          return pruned;
        });
      } else {
        // First load — all current notifications are unread
        unreadIdsRef.current = new Set(builtIds);
        setUnreadIds(new Set(builtIds));
      }
      prevIdsRef.current = builtIds;
    } catch (e) {
      const unauthorized = e?.response?.status === 401 || String(e?.message || '').includes('Not authorized');
      if (!unauthorized) {
        console.error('Notification fetch failed:', e);
      }
    } finally {
      setLoadingN(false);
    }
  }, [user]);

  // Phase 1: baseline (no toasts), Phase 2: toasts, then poll every 10s
  useEffect(() => {
    let dead = false;
    fetchNotifs(false);
    const phase2   = setTimeout(() => { if (!dead) fetchNotifs(true); }, 500);
    const interval = setInterval(() => { if (!dead) fetchNotifs(true); }, 10_000);
    return () => { dead = true; clearTimeout(phase2); clearInterval(interval); };
  }, [fetchNotifs]);

  const markAllRead = () => {
    unreadIdsRef.current = new Set();
    setUnreadIds(new Set());
  };

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const unreadCount       = unreadIds.size;
  const hasCriticalUnread = notifs.some(n => n.type === 'critical' && unreadIds.has(n.id));

  const notifProps = {
    unreadCount,
    hasCriticalUnread,
    onNotifPress: () => { setNotifVisible(true); markAllRead(); },
  };

  const openMoreSheet = () => {
    setMoreVisible(true);
    fetchDoctorProfile();
  };

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => {
            tabNavRef.current = props.navigation;
            return <DoctorTabBar {...props} onMorePress={openMoreSheet} />;
          }}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="DoctorDashboard" children={() => <DoctorDashboard notifProps={notifProps} doctorProfile={doctorProfile} />} />
        <Tab.Screen name="DoctorSchedule"  children={() => <DoctorAppointments />} options={{ title: 'My Schedule' }} />
        <Tab.Screen name="DoctorRx"        children={() => <DoctorPrescriptions />} options={{ title: 'Prescriptions' }} />
        <Tab.Screen name="DoctorLab"       children={() => <DoctorLab />} options={{ title: 'Lab' }} />
        <Tab.Screen name="DoctorPatients"  children={() => <DoctorPatients />} options={{ title: 'Patient Records', tabBarButton: () => null }} />
        <Tab.Screen name="DoctorMedicine"  children={() => <DoctorMedicineAnalysis />} options={{ title: 'Medicine Analysis', tabBarButton: () => null }} />
        <Tab.Screen name="DoctorSettings"  children={(props) => <DoctorSettings {...props} onProfileUpdated={setDoctorProfile} />} options={{ title: 'Settings', tabBarButton: () => null }} />
        <Tab.Screen name="DoctorUnavailability" children={(props) => <DoctorUnavailability {...props} />} options={{ title: 'Manage Availability', tabBarButton: () => null }} />
      </Tab.Navigator>

      {/* Liquid glass toasts — overlay on top of everything */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <NotifModal
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        notifs={notifs}
        loadingN={loadingN}
        unreadIds={unreadIds}
        onMarkAllRead={markAllRead}
      />

      <MoreSheet
        visible={moreVisible}
        onClose={() => setMoreVisible(false)}
        onNavigate={(screen) => tabNavRef.current?.navigate(screen)}
        user={user}
        doctorProfile={doctorProfile}
        logout={logout}
      />
    </>
  );
}
