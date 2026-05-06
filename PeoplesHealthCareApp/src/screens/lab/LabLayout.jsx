import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Animated, Platform, Pressable, Dimensions,
  PanResponder, Alert,
} from 'react-native';
import { Ionicons }             from '@expo/vector-icons';
import { LinearGradient }       from 'expo-linear-gradient';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { useSafeAreaInsets }    from 'react-native-safe-area-context';
import { useAuth }              from '../../context/AuthContext';
import api                      from '../../services/api';
import { COLORS }               from '../../constants/theme';

import LabDashboard    from './LabDashboard';
import LabRequests     from './LabRequests';
import LabUploadResults from './LabUploadResults';
import LabTestDetail   from './LabTestDetail';
import LabReports      from './LabReports';
import LabEquipment    from './LabEquipment';

const Tab    = createBottomTabNavigator();
const Stack  = createStackNavigator();
const { width: SCREEN_W } = Dimensions.get('window');
const ACCENT = COLORS.lab.primary;   // '#0284c7'

// ── Toast config ─────────────────────────────────────────────────────────────
const TOAST_CFG = {
  lab_request: { accent: '#8b5cf6', label: 'New Lab Request',     badge: 'NEW',    badgeBg: '#8b5cf6' },
  payment:     { accent: '#10B981', label: 'Payment Confirmed',   badge: 'PAID',   badgeBg: '#10B981' },
  completed:   { accent: '#10B981', label: 'Test Completed',      badge: 'DONE',   badgeBg: '#10B981' },
  pdf_upload:  { accent: '#0284c7', label: 'Report Uploaded',     badge: 'PDF',    badgeBg: '#0284c7' },
  equipment:   { accent: '#ef4444', label: 'Maintenance Notice',  badge: 'ALERT',  badgeBg: '#ef4444' },
  stock_low:   { accent: '#f59e0b', label: 'Stock Level Low',     badge: 'WARN',   badgeBg: '#f59e0b' },
  critical:    { accent: '#ef4444', label: 'Critical Alert',      badge: 'URGENT', badgeBg: '#ef4444' },
  info:        { accent: '#64748b', label: 'Notice',              badge: null,     badgeBg: null      },
};

const NOTIF_ICON = {
  lab_request: 'flask',
  payment:     'card',
  completed:   'checkmark-circle',
  pdf_upload:  'document-text',
  equipment:   'construct',
  stock_low:   'cube',
  critical:    'warning',
  info:        'information-circle',
};

// ─────────────────────────────────────────────────────────────────────────────
// Liquid Glass Toast
// ─────────────────────────────────────────────────────────────────────────────
function LiquidToast({ toast, onDismiss }) {
  const cfg       = TOAST_CFG[toast.type] ?? TOAST_CFG.info;
  const isCrit    = toast.type === 'critical';
  const duration  = toast.duration ?? 5200;

  const slideX  = useRef(new Animated.Value(SCREEN_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress= useRef(new Animated.Value(1)).current;
  const pulsAnim= useRef(new Animated.Value(1)).current;
  const dismissed = useRef(false);

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
    Animated.parallel([
      Animated.spring(slideX, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    Animated.timing(progress, { toValue: 0, duration, useNativeDriver: false }).start();
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
      <View style={tst.shimmer} pointerEvents="none" />
      <View style={tst.row1}>
        <View style={[tst.iconCircle, { backgroundColor: cfg.accent + '28', borderColor: cfg.accent + '55' }]}>
          <Ionicons name={NOTIF_ICON[toast.type] || 'information-circle'} size={16} color={cfg.accent} />
          {isCrit && (
            <Animated.View
              style={[tst.criticalPulse, { backgroundColor: cfg.accent, transform: [{ scale: pulsAnim }] }]}
              pointerEvents="none"
            />
          )}
        </View>
        <Text style={[tst.typeLabel, { color: cfg.accent }]}>{cfg.label}</Text>
        {cfg.badge && (
          <View style={[tst.badge, { backgroundColor: cfg.badgeBg }]}>
            <Text style={tst.badgeText}>{cfg.badge}</Text>
          </View>
        )}
        <TouchableOpacity onPress={dismiss} style={tst.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={14} color="rgba(0,0,0,0.4)" />
        </TouchableOpacity>
      </View>
      <Text style={tst.title} numberOfLines={2}>{toast.title}</Text>
      {!!toast.subtitle && (
        <Text style={[tst.subtitle, isCrit && { color: '#dc2626', fontWeight: '600' }]} numberOfLines={2}>
          {toast.subtitle}
        </Text>
      )}
      <View style={tst.progressTrack}>
        <Animated.View style={[tst.progressBar, { width: progressWidth, backgroundColor: cfg.accent }]} />
      </View>
    </Animated.View>
  );
}

function ToastStack({ toasts, onDismiss }) {
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View style={[tst.stack, { top: (insets.top || 44) + 8 }]} pointerEvents="box-none">
      {toasts.map(t => <LiquidToast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </View>
  );
}

const tst = StyleSheet.create({
  stack: { position: 'absolute', right: 12, zIndex: 9999, gap: 8, pointerEvents: 'box-none' },
  container: {
    width: SCREEN_W * 0.86, borderRadius: 18, paddingHorizontal: 14,
    paddingTop: 12, paddingBottom: 14, overflow: 'hidden', borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20,
    elevation: 12, marginBottom: 8,
  },
  containerNormal:   { backgroundColor: 'rgba(186,225,255,0.82)', borderColor: 'rgba(147,197,253,0.65)', shadowColor: 'rgba(59,130,246,0.3)' },
  containerCritical: { backgroundColor: 'rgba(254,202,202,0.88)', borderColor: 'rgba(252,165,165,0.7)',  shadowColor: 'rgba(239,68,68,0.3)'   },
  shimmer:    { position: 'absolute', inset: 0, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.28)' },
  row1:       { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  iconCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, flexShrink: 0 },
  criticalPulse: { position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' },
  typeLabel:  { fontSize: 9.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9, flex: 1 },
  badge:      { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:  { color: '#fff', fontSize: 8.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  closeBtn:   { padding: 3, opacity: 0.45 },
  title:      { fontSize: 13, fontWeight: '700', color: '#1e293b', lineHeight: 18, marginBottom: 3 },
  subtitle:   { fontSize: 11.5, color: 'rgba(100,116,139,0.9)', lineHeight: 16 },
  progressTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.08)' },
  progressBar:   { height: '100%', borderBottomLeftRadius: 18 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification Builders
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return 'Just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function isRecent(iso) {
  if (!iso) return false;
  const now  = new Date();
  const then = new Date(iso);
  return (now - then) < 86400000 * 2; // 2 days
}

function buildLabNotifications(labResults = [], unreadIds = new Set()) {
  const list = [];

  // New Lab Request
  labResults
    .filter(r => r.status === 'payment_pending' && isRecent(r.createdAt))
    .forEach(r => list.push({
      id:       `req-${r._id}`,
      type:     'lab_request',
      title:    `New Lab Request — ${r.patientName || 'Patient'}`,
      subtitle: r.testName,
      idLabel:  r.testId || null,
      time:     r.createdAt,
    }));

  // Payment Confirmed
  labResults
    .filter(r => r.paymentConfirmed && r.status !== 'completed' && isRecent(r.updatedAt))
    .forEach(r => list.push({
      id:       `pay-${r._id}`,
      type:     'payment',
      title:    `Payment Confirmed — ${r.patientName || 'Patient'}`,
      subtitle: `${r.testName} · ${r.paymentId || ''}`,
      idLabel:  r.testId || null,
      time:     r.updatedAt,
    }));

  // Test Completed
  labResults
    .filter(r => r.status === 'completed' && isRecent(r.completedAt))
    .forEach(r => list.push({
      id:       `done-${r._id}`,
      type:     'completed',
      title:    `Test Completed — ${r.patientName || 'Patient'}`,
      subtitle: r.testName,
      idLabel:  r.testId || null,
      time:     r.completedAt,
    }));

  // Test Results Uploaded
  labResults
    .filter(r => r.status === 'completed' && r.results && isRecent(r.updatedAt))
    .forEach(r => list.push({
      id:       `pdf-${r._id}`,
      type:     'pdf_upload',
      title:    `Results Uploaded — ${r.patientName || 'Patient'}`,
      subtitle: `${r.testName} Report Generated`,
      idLabel:  r.testId || null,
      time:     r.updatedAt,
    }));

  return list.sort((a, b) => new Date(b.time) - new Date(a.time));
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ROW
// ─────────────────────────────────────────────────────────────────────────────
function NotifRow({ n, isUnread }) {
  const cfg    = TOAST_CFG[n.type] ?? TOAST_CFG.info;
  return (
    <View style={[nr.card, nr.cardNormal, isUnread && { shadowColor: cfg.accent, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 }]}>
      <View style={nr.shimmer} pointerEvents="none" />
      <View style={nr.row1}>
        <View style={[nr.iconCircle, { backgroundColor: cfg.accent + '28', borderColor: cfg.accent + '50' }]}>
          <Ionicons name={NOTIF_ICON[n.type] || 'information-circle'} size={14} color={cfg.accent} />
        </View>
        <Text style={[nr.typeLabel, { color: cfg.accent }]}>{cfg.label}</Text>
        {cfg.badge && (
          <View style={[nr.badge, { backgroundColor: cfg.badgeBg }]}>
            <Text style={nr.badgeText}>{cfg.badge}</Text>
          </View>
        )}
        <Text style={nr.time}>{timeAgo(n.time)}</Text>
        {isUnread && <View style={[nr.unreadDot, { backgroundColor: cfg.accent }]} />}
      </View>
      <Text style={nr.title}>{n.title}</Text>
      {!!n.subtitle && <Text style={nr.subtitle}>{n.subtitle}</Text>}
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
  card:       { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, marginHorizontal: 12, marginVertical: 5, borderWidth: 1, overflow: 'hidden', shadowOffset: { width: 0, height: 1 }, shadowRadius: 4 },
  cardNormal: { backgroundColor: 'rgba(186,225,255,0.48)', borderColor: 'rgba(147,197,253,0.50)' },
  shimmer:    { position: 'absolute', inset: 0, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)' },
  row1:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  iconCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, flexShrink: 0 },
  typeLabel:  { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
  badge:      { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText:  { color: '#fff', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  time:       { fontSize: 9.5, color: 'rgba(100,116,139,0.8)', fontWeight: '500', flexShrink: 0 },
  unreadDot:  { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  title:      { fontSize: 12.5, fontWeight: '700', color: '#1e293b', lineHeight: 17, marginBottom: 3 },
  subtitle:   { fontSize: 11, color: 'rgba(100,116,139,0.9)', lineHeight: 15, marginBottom: 3 },
  idPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, marginTop: 4 },
  idPillText: { fontSize: 10, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION MODAL
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => g.dy > 5,
      onPanResponderMove:   (_, g) => { if (g.dy > 0) dragY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.6) {
          Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }).start(() => { dragY.setValue(0); onClose(); });
        } else {
          Animated.spring(dragY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;
  const unreadCount = unreadIds.size;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={nm.overlay} onPress={handleClose}>
        <Animated.View
          style={[nm.sheet, { paddingBottom: insets.bottom + 8, transform: [{ translateY: Animated.add(slideAnim, dragY) }] }]}
          onStartShouldSetResponder={() => true}
        >
          <LinearGradient colors={['#023e6b', ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={nm.headerGradient}>
            <View {...panResponder.panHandlers} style={nm.handleTouchable}>
              <View style={nm.handle} />
            </View>
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

          <ScrollView style={nm.scroll} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {notifs.length > 0
              ? notifs.map(n => <NotifRow key={n.id} n={n} isUnread={unreadIds.has(n.id)} />)
              : !loadingN && (
                <View style={nm.empty}>
                  <View style={nm.emptyIconBox}>
                    <Ionicons name="notifications-off-outline" size={28} color="#94A3B8" />
                  </View>
                  <Text style={nm.emptyTitle}>All clear</Text>
                  <Text style={nm.emptySub}>No new notifications right now</Text>
                </View>
              )
            }
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const nm = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: 'rgba(219,234,254,0.97)', borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: '55%', maxHeight: '90%', borderWidth: 1.5, borderColor: 'rgba(147,197,253,0.4)', overflow: 'hidden', shadowColor: 'rgba(59,130,246,0.2)', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 20 },
  handleTouchable: { paddingVertical: 10, alignItems: 'center' },
  handle:        { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2 },
  headerGradient:{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 4 },
  header:        { paddingHorizontal: 18, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:   { color: '#fff', fontWeight: '600', fontSize: 14 },
  headerSub:     { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  markAllBtn:    { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  markAllText:   { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '500' },
  scroll:        { flexGrow: 1, flexShrink: 1 },
  empty:         { alignItems: 'center', paddingVertical: 48 },
  emptyIconBox:  { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(148,163,184,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle:    { fontSize: 14, fontWeight: '600', color: '#475569' },
  emptySub:      { fontSize: 12, color: '#94A3B8', marginTop: 4 },
});

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM BOTTOM TAB BAR
// ─────────────────────────────────────────────────────────────────────────────
const LAB_TABS = [
  { name: 'LabDashboard', label: 'Dashboard', icon: 'home-outline',           iconActive: 'home' },
  { name: 'LabRequests',  label: 'Requests',  icon: 'list-outline',           iconActive: 'list' },
  { name: 'LabReports',   label: 'Reports',   icon: 'bar-chart-outline',      iconActive: 'bar-chart' },
  { name: 'LabEquipment', label: 'Equipment', icon: 'hardware-chip-outline',  iconActive: 'hardware-chip' },
];

function LabTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[tb.bar, { paddingBottom: insets.bottom || 8 }]}>
      {LAB_TABS.map(tab => {
        const route   = state.routes.find(r => r.name === tab.name);
        const focused = route ? state.index === state.routes.indexOf(route) : false;
        const onPress = () => {
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
  bar:          { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10 },
  item:         { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap:     { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: '#E0F2FE' },
  label:        { fontSize: 10, fontWeight: '500', color: '#94A3B8' },
  labelActive:  { color: ACCENT, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Profile / Sign-out Sheet
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSheet({ visible, onClose, user, logout }) {
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

  const handleLogout = () => {
    handleClose();
    setTimeout(() => {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Out',
            style: 'destructive',
            onPress: async () => { await logout(); },
          },
        ]
      );
    }, 260);
  };

  if (!visible) return null;

  const name     = user?.name || 'Lab Staff';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <Pressable style={ps.overlay} onPress={handleClose}>
        <Animated.View
          style={[ps.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={ps.handle} />
          <View style={ps.staffRow}>
            <View style={[ps.avatar, { backgroundColor: ACCENT }]}>
              <Text style={ps.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={ps.staffName}>{name}</Text>
              <Text style={ps.staffSub}>Laboratory Staff · People's Health Care</Text>
            </View>
          </View>
          <View style={ps.divider} />
          <TouchableOpacity style={ps.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={ps.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const ps = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 20, maxHeight: '60%' },
  handle:     { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  staffRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar:     { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  staffName:  { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  staffSub:   { fontSize: 12, color: '#64748B', marginTop: 2 },
  divider:    { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});

// ─────────────────────────────────────────────────────────────────────────────
// LAB LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
export default function LabLayout() {
  const { user, logout } = useAuth();

  const [profileVisible, setProfileVisible] = useState(false);
  const [notifVisible,   setNotifVisible]   = useState(false);
  const [notifs,         setNotifs]         = useState([]);
  const [unreadIds,      setUnreadIds]      = useState(new Set());
  const [loadingN,       setLoadingN]       = useState(false);
  const [toasts,         setToasts]         = useState([]);

  const prevIdsRef   = useRef(new Set());
  const unreadIdsRef = useRef(new Set());
  const toastIdRef   = useRef(0);

  const fetchNotifs = useCallback(async (showToasts = false) => {
    if (!showToasts) setLoadingN(true);
    try {
      const { data } = await api.get('/lab-results?limit=50');
      const labResults = Array.isArray(data.results) ? data.results : [];
      const built      = buildLabNotifications(labResults, unreadIdsRef.current);

      try {
        const eqRes = await api.get('/equipment');
        const eqList = Array.isArray(eqRes.data.items) ? eqRes.data.items : [];
        
        eqList.forEach(item => {
          if (item.category === 'consumable' && item.quantity <= item.lowStockThreshold) {
            built.push({
              id:       `stock-${item._id}`,
              type:     'stock_low',
              title:    `Low Stock — ${item.name}`,
              subtitle: `Quantity remaining: ${item.quantity} ${item.unit}`,
              time:     new Date().toISOString(),
            });
          } else if (item.category === 'machine' && item.status === 'service_required') {
            built.push({
              id:       `eq-${item._id}`,
              type:     'equipment',
              title:    `Equipment Maintenance Required`,
              subtitle: item.name,
              time:     new Date().toISOString(),
            });
          }
        });
      } catch (e) {
        // silent error
      }

      const builtIds = new Set(built.map(n => n.id));
      setNotifs(built);

      if (showToasts) {
        const newItems = built.filter(n => !prevIdsRef.current.has(n.id));
        newItems.slice(0, 3).forEach(n => {
          const id = ++toastIdRef.current;
          setToasts(prev => [...prev.slice(-3), { ...n, id, duration: 5200 }]);
        });
        setUnreadIds(prev => {
          const pruned = new Set([...prev].filter(id => builtIds.has(id)));
          newItems.forEach(n => pruned.add(n.id));
          unreadIdsRef.current = pruned;
          return pruned;
        });
      } else {
        unreadIdsRef.current = new Set(builtIds);
        setUnreadIds(new Set(builtIds));
      }
      prevIdsRef.current = builtIds;
    } catch (e) {
      console.error('[LabLayout] Notification fetch failed:', e);
    } finally {
      setLoadingN(false);
    }
  }, []);

  useEffect(() => {
    let dead = false;
    fetchNotifs(false);
    const phase2   = setTimeout(() => { if (!dead) fetchNotifs(true); }, 500);
    const interval = setInterval(() => { if (!dead) fetchNotifs(true); }, 180_000); // 3-minute refresh rate
    return () => { dead = true; clearTimeout(phase2); clearInterval(interval); };
  }, [fetchNotifs]);

  const markAllRead  = () => { unreadIdsRef.current = new Set(); setUnreadIds(new Set()); };
  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const unreadCount       = unreadIds.size;
  const hasCriticalUnread = notifs.some(n => n.type === 'critical' && unreadIds.has(n.id));

  const notifProps = {
    unreadCount,
    hasCriticalUnread,
    onNotifPress: () => { setNotifVisible(true); markAllRead(); },
    onProfilePress: () => setProfileVisible(true),
  };

  function LabTabs() {
    return (
      <Tab.Navigator
        tabBar={(props) => (
          <LabTabBar
            {...props}
            unreadCount={unreadCount}
            hasCriticalUnread={hasCriticalUnread}
            onNotifPress={() => { setNotifVisible(true); markAllRead(); }}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="LabDashboard" children={() => <LabDashboard notifProps={notifProps} />} />
        <Tab.Screen name="LabRequests"  component={LabRequests}  options={{ title: 'Requests'  }} />
        <Tab.Screen name="LabReports"   component={LabReports}   options={{ title: 'Reports'   }} />
        <Tab.Screen name="LabEquipment" component={LabEquipment} options={{ title: 'Equipment' }} />
      </Tab.Navigator>
    );
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LabTabs"          component={LabTabs} />
        <Stack.Screen name="LabTestDetail"    component={LabTestDetail} />
        <Stack.Screen name="LabUploadResults" component={LabUploadResults} />
      </Stack.Navigator>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <NotifModal
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        notifs={notifs}
        loadingN={loadingN}
        unreadIds={unreadIds}
        onMarkAllRead={markAllRead}
      />

      <ProfileSheet
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        user={user}
        logout={logout}
      />
    </>
  );
}