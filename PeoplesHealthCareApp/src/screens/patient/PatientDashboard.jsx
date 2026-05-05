import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const C = COLORS.patient;

export default function PatientDashboard() {
  const { user, logout }          = useAuth();
  const [appointments, setAppts]  = useState([]);
  const [prescriptions, setRx]    = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [apptRes, rxRes] = await Promise.all([
        api.get('/appointments/my').catch(() => ({ data: [] })),
        api.get('/prescriptions/my').catch(() => ({ data: [] })),
      ]);
      setAppts((apptRes.data?.appointments || apptRes.data || []).slice(0, 3));
      setRx((rxRes.data?.prescriptions || rxRes.data || []).slice(0, 3));
    } catch (err) {
      console.log('Patient dashboard error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.primary }]}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{user?.name || user?.username}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {QUICK_ITEMS.map(item => (
            <View key={item.label} style={[styles.quickCard, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={26} color={item.color} />
              <Text style={[styles.quickLabel, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Upcoming Appointments */}
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {appointments.length === 0 ? (
          <EmptyState icon="calendar-outline" text="No upcoming appointments" />
        ) : (
          appointments.map((appt, i) => (
            <View key={appt._id || i} style={styles.card}>
              <Ionicons name="calendar-outline" size={20} color={C.primary} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>
                  {appt.doctor?.name ? `Dr. ${appt.doctor.name}` : 'Doctor Appointment'}
                </Text>
                <Text style={styles.cardSub}>
                  {appt.appointmentDate
                    ? new Date(appt.appointmentDate).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })
                    : appt.date || '—'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: C.light }]}>
                <Text style={[styles.badgeText, { color: C.dark }]}>{appt.status || 'scheduled'}</Text>
              </View>
            </View>
          ))
        )}

        {/* Recent Prescriptions */}
        <Text style={styles.sectionTitle}>Recent Prescriptions</Text>
        {prescriptions.length === 0 ? (
          <EmptyState icon="document-text-outline" text="No prescriptions yet" />
        ) : (
          prescriptions.map((rx, i) => (
            <View key={rx._id || i} style={styles.card}>
              <Ionicons name="document-text-outline" size={20} color="#7c3aed" />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>
                  {rx.doctor?.name ? `Dr. ${rx.doctor.name}` : 'Prescription'}
                </Text>
                <Text style={styles.cardSub}>
                  {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : '—'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function EmptyState({ icon, text }) {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name={icon} size={36} color="#cbd5e1" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const QUICK_ITEMS = [
  { label: 'Appointments',  icon: 'calendar-outline',      color: '#0d9488', bg: '#ccfbf1' },
  { label: 'Prescriptions', icon: 'document-text-outline', color: '#7c3aed', bg: '#ede9fe' },
  { label: 'Lab Results',   icon: 'flask-outline',         color: '#0284c7', bg: '#e0f2fe' },
  { label: 'Billing',       icon: 'card-outline',          color: '#2563eb', bg: '#dbeafe' },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0fdfa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 24, paddingTop: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  name: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 8 },
  body: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 20, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: '47%', borderRadius: RADIUS.md, padding: 16,
    alignItems: 'center', gap: 8, ...SHADOW.sm,
  },
  quickLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 10, ...SHADOW.sm,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: '#94a3b8', marginTop: 8, fontSize: 13 },
});
