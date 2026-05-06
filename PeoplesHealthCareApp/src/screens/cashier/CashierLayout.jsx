import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Animated, Platform, Pressable, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

import CashierDashboard    from './CashierDashboard';
import CashierBilling      from './CashierBilling';
import CashierTurnover     from './CashierTurnover';

const Tab = createBottomTabNavigator();
const { width: SCREEN_W } = Dimensions.get('window');
const ACCENT = '#01579B';

// ─── Toast ────────────────────────────────────────────────────────────────────
function CashierToast({ toast, onDismiss }) {
  const slideX   = useRef(new Animated.Value(SCREEN_W)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const dismissed = useRef(false);
  const isLab = toast.type === 'lab_request';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideX, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    Animated.timing(progress, { toValue: 0, duration: 6000, useNativeDriver: false }).start();
    const t = setTimeout(() => dismiss(), 6000);
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
    <Animated.View style={[ts.container, { transform: [{ translateX: slideX }], opacity }]}>
      <View style={ts.shimmer} pointerEvents="none" />
      <View style={ts.row1}>
        <View style={ts.iconCircle}>
          <Text style={{ fontSize: 14 }}>{isLab ? '🧪' : '💊'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ts.typeLabel} numberOfLines={1}>{isLab ? '🔬 Lab Request' : '💬 Pharmacy'}</Text>
          <Text style={ts.name} numberOfLines={1}>{toast.patientName || 'Patient'}</Text>
        </View>
        <TouchableOpacity onPress={dismiss} style={ts.closeBtn}>
          <Ionicons name="close" size={13} color="#555" />
        </TouchableOpacity>
      </View>
      <View style={ts.pillsRow}>
        <View style={ts.pill}><Text style={ts.pillText}>📋 {toast.rx}</Text></View>
        {isLab && toast.priority === 'Urgent' && (
          <View style={[ts.pill, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)' }]}>
            <Text style={[ts.pillText, { color: '#dc2626' }]}>🚨 Urgent</Text>
          </View>
        )}
      </View>
      <View style={ts.progressTrack}>
        <Animated.View style={[ts.progressBar, { width: progressWidth }]} />
      </View>
    </Animated.View>
  );
}

function ToastStack({ toasts, onDismiss }) {
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View style={[ts.stack, { top: (insets.top || 44) + 8 }]} pointerEvents="box-none">
      {toasts.map((t, index) => (
        <CashierToast key={`${t.id}-${t.time || index}`} toast={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

const ts = StyleSheet.create({
  stack: { position: 'absolute', right: 10, zIndex: 9999, gap: 6 },
  container: {
    width: SCREEN_W * 0.72, borderRadius: 14, paddingHorizontal: 11,
    paddingTop: 9, paddingBottom: 11, overflow: 'hidden',
    borderWidth: 1.5, backgroundColor: 'rgba(186,225,255,0.92)',
    borderColor: 'rgba(147,197,253,0.7)',
    shadowColor: 'rgba(1,87,155,0.3)', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 14, elevation: 10, marginBottom: 6,
  },
  shimmer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.28)' },
  row1: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  iconCircle: {
    width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(1,87,155,0.15)', borderWidth: 1, borderColor: 'rgba(1,87,155,0.25)',
  },
  typeLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(1,87,155,0.85)', letterSpacing: 0.4, marginBottom: 1 },
  name: { fontSize: 12, fontWeight: '700', color: '#0D2137' },
  closeBtn: { padding: 3, opacity: 0.5 },
  pillsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 6 },
  pill: { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(1,87,155,0.1)', borderWidth: 1, borderColor: 'rgba(1,87,155,0.2)' },
  pillText: { fontSize: 9, fontWeight: '700', color: '#01579B' },
  progressTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.08)' },
  progressBar: { height: '100%', backgroundColor: '#01579B', borderBottomLeftRadius: 14 },
});

// ─── Notification Panel ───────────────────────────────────────────────────────
function NotifModal({ visible, onClose, notifs, onMarkAllRead, onClearAll }) {
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }).start(() => onClose());
  };

  if (!visible) return null;
  const unreadCount = notifs.filter(n => !n.read).length;

  const timeAgo = (iso) => {
    if (!iso) return '';
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={nm.overlay} onPress={handleClose}>
        <Animated.View
          style={[nm.sheet, { paddingBottom: insets.bottom + 8, transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <LinearGradient colors={['#0D2137', '#01579B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={nm.headerGrad}>
            <View style={nm.handle} />
            <View style={nm.headerRow}>
              <View>
                <Text style={nm.headerTitle}>🔔 Cashier Notifications</Text>
                <Text style={nm.headerSub}>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity style={nm.markBtn} onPress={onMarkAllRead}>
                    <Text style={nm.markBtnText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                {notifs.length > 0 && (
                  <TouchableOpacity style={[nm.markBtn, { backgroundColor: 'rgba(239,68,68,0.25)' }]} onPress={onClearAll}>
                    <Text style={[nm.markBtnText, { color: '#fca5a5' }]}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LinearGradient>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {notifs.length === 0 ? (
              <View style={nm.empty}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🔔</Text>
                <Text style={nm.emptyTitle}>No notifications yet</Text>
                <Text style={nm.emptySub}>Pharmacy dispatches and lab requests will appear here</Text>
              </View>
            ) : notifs.map((n, idx) => {
              const isLab = n.type === 'lab_request';
              const items = isLab
                ? (Array.isArray(n.tests) ? n.tests : [])
                : (Array.isArray(n.medicines) ? n.medicines : typeof n.medicines === 'string' ? n.medicines.split(',').map(m => m.trim()) : []);
              return (
                <View key={`${n.id}-${n.time || idx}`} style={[nm.notifCard, !n.read && { backgroundColor: 'rgba(1,87,155,0.04)' }, idx < notifs.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }]}>
                  {!n.read && <View style={nm.unreadDot} />}
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={nm.notifIcon}><Text style={{ fontSize: 17 }}>{isLab ? '🧪' : '💊'}</Text></View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={nm.notifName} numberOfLines={1}>{n.patientName || 'Patient'}</Text>
                        <Text style={nm.notifTime}>{timeAgo(n.time)}</Text>
                      </View>
                      <Text style={nm.notifMsg}>
                        {isLab ? `Lab request submitted${n.doctorName ? ` by Dr. ${n.doctorName}` : ''} — ready for billing` : 'Medicines received & ready for billing'}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        <View style={nm.pill}><Text style={nm.pillText}>📋 {n.rx}</Text></View>
                        {isLab && n.priority === 'Urgent' && (
                          <View style={[nm.pill, { backgroundColor: 'rgba(239,68,68,0.1)' }]}><Text style={[nm.pillText, { color: '#dc2626' }]}>🚨 Urgent</Text></View>
                        )}
                      </View>
                      {items.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {items.map((m, i) => (
                            <View key={i} style={nm.itemChip}><Text style={nm.itemText}>{m}</Text></View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const nm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'rgba(219,234,254,0.97)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    minHeight: '55%', maxHeight: '90%', borderWidth: 1.5, borderColor: 'rgba(147,197,253,0.4)', overflow: 'hidden',
  },
  headerGrad: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 4 },
  handle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  markBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  markBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#475569' },
  emptySub: { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  notifCard: { padding: 14, position: 'relative' },
  unreadDot: { position: 'absolute', top: 18, right: 16, width: 8, height: 8, borderRadius: 4, backgroundColor: '#01579B' },
  notifIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(1,87,155,0.15)', alignItems: 'center', justifyContent: 'center' },
  notifName: { fontSize: 13, fontWeight: '700', color: '#0D2137', flex: 1 },
  notifTime: { fontSize: 10, color: '#9CA3AF', flexShrink: 0 },
  notifMsg: { fontSize: 12, color: '#4B5563', marginTop: 3, lineHeight: 17 },
  pill: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: 'rgba(1,87,155,0.1)', borderWidth: 1, borderColor: 'rgba(1,87,155,0.18)' },
  pillText: { fontSize: 10, fontWeight: '700', color: '#01579B' },
  itemChip: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  itemText: { fontSize: 10, color: '#065f46', fontWeight: '500' },
});

// ─── More Sheet ───────────────────────────────────────────────────────────────
function MoreSheet({ visible, onClose, user, logout }) {
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: 500, duration: 220, useNativeDriver: true }).start(() => onClose());
  };

  if (!visible) return null;
  const name     = user?.name || 'Cashier';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <Pressable style={ms.overlay} onPress={handleClose}>
        <Animated.View style={[ms.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] }]} onStartShouldSetResponder={() => true}>
          <View style={ms.handle} />
          <View style={ms.userRow}>
            <LinearGradient colors={['#01579B', '#0277BD']} style={ms.avatar}>
              <Text style={ms.avatarText}>{initials}</Text>
            </LinearGradient>
            <View>
              <Text style={ms.userName}>{name}</Text>
              <Text style={ms.userRole}>Cashier Staff · People's Health Care</Text>
            </View>
          </View>
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
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  userName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  userRole: { fontSize: 12, color: '#64748B', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
function CashierTabBar({ state, navigation, onMorePress }) {
  const insets = useSafeAreaInsets();
  const TABS = [
    { name: 'CashierDashboard', label: 'Dashboard',  icon: 'grid-outline',         iconActive: 'grid' },
    { name: 'CashierBilling',   label: 'Billing',     icon: 'card-outline',         iconActive: 'card' },
    { name: 'CashierTurnover',  label: 'Turnover',    icon: 'stats-chart-outline',  iconActive: 'stats-chart' },
    { name: '__more__',         label: 'More',        icon: 'ellipsis-horizontal-outline', iconActive: 'ellipsis-horizontal' },
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
  iconWrap: { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  iconWrapActive: { backgroundColor: 'rgba(1,87,155,0.1)' },
  label: { fontSize: 10, fontWeight: '500', color: '#94A3B8' },
  labelActive: { color: ACCENT, fontWeight: '700' },
});

// ─── Cashier notification store ───────────────────────────────────────────────
const NOTIF_STORE_KEY = 'cashier_notifications';
let _notifStore = [];
const _notifListeners = new Set();

function uniqueNotifId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNotif(notif, index = 0) {
  const fallback = `${notif?.type || 'notif'}-${notif?.billId || notif?.rx || index}-${notif?.time || Date.now()}`;
  return {
    ...notif,
    id: notif?.id ? String(notif.id) : fallback,
    time: notif?.time || new Date().toISOString(),
    read: Boolean(notif?.read),
  };
}

function notifIdentity(notif) {
  return [
    notif?.type || 'notif',
    notif?.billId || '',
    notif?.rx || '',
    notif?.patientId || '',
    notif?.patientName || '',
  ].join('|');
}

function publishNotifications(next) {
  const byIdentity = new Map();

  next.map(normalizeNotif).forEach((notif) => {
    const identity = notifIdentity(notif);
    const existing = byIdentity.get(identity);

    if (!existing) {
      byIdentity.set(identity, notif);
      return;
    }

    byIdentity.set(identity, {
      ...existing,
      ...notif,
      id: existing.id,
      time: existing.time && notif.time
        ? new Date(existing.time) > new Date(notif.time) ? existing.time : notif.time
        : existing.time || notif.time,
      read: existing.read && notif.read,
    });
  });

  _notifStore = Array.from(byIdentity.values()).slice(0, 50);
  SecureStore.setItemAsync(NOTIF_STORE_KEY, JSON.stringify(_notifStore)).catch(() => {});
  _notifListeners.forEach((fn) => fn([..._notifStore]));
}

function addNotification(notif) {
  const entry = normalizeNotif({ id: uniqueNotifId(), ...notif });
  publishNotifications([entry, ..._notifStore]);
  return entry;
}

function useCashierNotifications() {
  const [notifs, setNotifs] = useState([..._notifStore]);

  useEffect(() => {
    _notifListeners.add(setNotifs);
    SecureStore.getItemAsync(NOTIF_STORE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) publishNotifications(saved);
      })
      .catch(() => {});
    return () => _notifListeners.delete(setNotifs);
  }, []);

  return notifs;
}

function setToastTrigger(fn) {
  globalThis.__fireCashierToast = fn || null;
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function CashierLayout() {
  const { user, logout } = useAuth();
  const [moreVisible,  setMoreVisible]  = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [toasts,       setToasts]       = useState([]);
  const [activeTab,    setActiveTab]    = useState('CashierDashboard');
  const notifs = useCashierNotifications();
  const unreadCount = notifs.filter(n => !n.read).length;

  // Register toast trigger
  useEffect(() => {
    setToastTrigger((data) => {
      const notifEntry = addNotification({ ...data, read: false });
      if (activeTab === 'CashierDashboard') {
        setToasts(prev => [...prev.slice(-3), notifEntry]);
      }
    });
    return () => setToastTrigger(null);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'CashierDashboard') setToasts([]);
  }, [activeTab]);

  const markAllRead = () => {
    publishNotifications(_notifStore.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    publishNotifications([]);
  };

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => (
          <CashierTabBar {...props} onMorePress={() => setMoreVisible(true)} />
        )}
        screenOptions={{ headerShown: false }}
        screenListeners={{
          state: (event) => {
            const state = event.data.state;
            const route = state.routes[state.index];
            setActiveTab(route.name);
          },
        }}
      >
        <Tab.Screen name="CashierDashboard" options={{ title: 'Dashboard' }}>
          {(props) => (
            <CashierDashboard
              {...props}
              unreadNotifications={unreadCount}
              onOpenNotifications={() => setNotifVisible(true)}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="CashierBilling"   component={CashierBilling}   options={{ title: 'Billing' }} />
        <Tab.Screen name="CashierTurnover"  component={CashierTurnover}  options={{ title: 'Turnover' }} />
      </Tab.Navigator>

      {activeTab === 'CashierDashboard' && (
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      )}

      <NotifModal
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        notifs={notifs}
        onMarkAllRead={markAllRead}
        onClearAll={clearAll}
      />

      <MoreSheet
        visible={moreVisible}
        onClose={() => setMoreVisible(false)}
        user={user}
        logout={logout}
      />
    </>
  );
}
