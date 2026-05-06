import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SHADOW } from '../../constants/theme';

const C = COLORS.patient;

function getInitials(name) {
  if (!name) return 'PT';

  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate(dateString) {
  if (!dateString) return '—';

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(dateString);
    if (Number.isNaN(fallback.getTime())) return dateString;

    return fallback.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(time) {
  if (!time) return '—';

  const [hourValue, minuteValue] = String(time).split(':').map(Number);

  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
    return time;
  }

  const suffix = hourValue >= 12 ? 'PM' : 'AM';
  const hour12 = hourValue === 0 ? 12 : hourValue > 12 ? hourValue - 12 : hourValue;

  return `${hour12}:${String(minuteValue).padStart(2, '0')} ${suffix}`;
}

function calculateAge(birthday) {
  if (!birthday) return '—';

  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return '—';

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return `${age} yrs`;
}

function extractArray(payload, keys = []) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }

  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}

function getAllergyCount(allergies) {
  if (Array.isArray(allergies)) {
    return allergies.filter(Boolean).length;
  }

  if (typeof allergies === 'string') {
    if (!allergies.trim()) return 0;
    return allergies
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean).length;
  }

  return 0;
}

function InfoPill({ label, value }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue}>{value || '—'}</Text>
    </View>
  );
}

function StatCard({ icon, value, label, color, background }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: background }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, subtitle, onViewAll }) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>

      {!!onViewAll && (
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.8}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AppointmentCard({ appointment }) {
  return (
    <View style={styles.appointmentCard}>
      <View style={styles.dateBox}>
        <Text style={styles.dateMonth}>
          {appointment?.date
            ? new Date(`${appointment.date}T00:00:00`).toLocaleDateString(undefined, {
                month: 'short',
              })
            : '—'}
        </Text>
        <Text style={styles.dateDay}>
          {appointment?.date
            ? new Date(`${appointment.date}T00:00:00`).getDate()
            : '—'}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.appointmentTitle}>
          {appointment?.session || 'Doctor'} Session
        </Text>

        <Text style={styles.appointmentMeta}>
          {formatDate(appointment?.date)} · {formatTime(appointment?.estimatedTime)}
        </Text>
      </View>

      <View
        style={[
          styles.statusBadge,
          appointment?.status === 'Completed'
            ? styles.completedBadge
            : appointment?.status === 'Cancelled'
            ? styles.cancelledBadge
            : styles.pendingBadge,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            appointment?.status === 'Completed'
              ? styles.completedText
              : appointment?.status === 'Cancelled'
              ? styles.cancelledText
              : styles.pendingText,
          ]}
        >
          {appointment?.status || 'Pending'}
        </Text>
      </View>
    </View>
  );
}

function PrescriptionCard({ prescription }) {
  return (
    <View style={styles.simpleCard}>
      <View style={[styles.simpleIcon, { backgroundColor: '#ede9fe' }]}>
        <Ionicons name="document-text-outline" size={20} color="#7c3aed" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.simpleTitle}>
          {prescription?.appointmentId || prescription?.prescriptionId || 'Prescription'}
        </Text>

        <Text style={styles.simpleSub}>
          {prescription?.createdAt
            ? new Date(prescription.createdAt).toLocaleDateString()
            : 'Recently issued'}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={34} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
    </View>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function QuickAction({ icon, title, subtitle, color, bg, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.quickCard} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

export default function PatientDashboard({ navigation }) {
  const { user, logout } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [freshUser, setFreshUser] = useState(user);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const profile = freshUser?.patientDetails || {};
  const displayName = freshUser?.name || freshUser?.username || 'Patient';
  const initials = getInitials(displayName);

  const openNotifications = () => {
    navigation.getParent()?.navigate('Notifications');
  };

  const openProfile = () => {
    navigation.getParent()?.navigate('PatientProfile');
  };

  const openFeedback = () => {
    const parent = navigation.getParent();
    const routeNames = parent?.getState?.()?.routeNames || [];

    if (routeNames.includes('PatientFeedback')) {
      parent.navigate('PatientFeedback');
    } else {
      Alert.alert(
        'Feedback & Ratings',
        'Feedback page route is not connected yet. Please ask the feedback module member to create a screen with route name "PatientFeedback".'
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from your patient account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const fetchData = async () => {
    try {
      const [
        meResult,
        appointmentResult,
        prescriptionResult,
        holidayNotificationsResult,
        precheckNotificationsResult,
      ] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/appointments/my'),
        api.get('/prescriptions/my'),
        api.get('/appointments/holiday-cancellations'),
        api.get('/lab-results/patient-notifications'),
      ]);

      if (meResult.status === 'fulfilled') {
        const userData =
          meResult.value?.data?.user ||
          meResult.value?.data?.data ||
          meResult.value?.data;

        if (userData) setFreshUser(userData);
      }

      if (appointmentResult.status === 'fulfilled') {
        const appointmentList = extractArray(appointmentResult.value?.data, [
          'appointments',
          'data',
        ]);
        setAppointments(appointmentList);
      }

      if (prescriptionResult.status === 'fulfilled') {
        const prescriptionList = extractArray(prescriptionResult.value?.data, [
          'prescriptions',
          'data',
        ]);
        setPrescriptions(prescriptionList);
      }

      let unreadTotal = 0;

      if (holidayNotificationsResult.status === 'fulfilled') {
        const holidayList = extractArray(holidayNotificationsResult.value?.data, [
          'cancellations',
          'notifications',
          'data',
        ]);
        unreadTotal += holidayList.length;
      }

      if (precheckNotificationsResult.status === 'fulfilled') {
        const precheckList = extractArray(precheckNotificationsResult.value?.data, [
          'notifications',
          'prechecks',
          'data',
        ]);
        unreadTotal += precheckList.length;
      }

      setNotificationCount(unreadTotal);
    } catch (error) {
      console.log('Patient dashboard error:', error?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const stats = useMemo(() => {
    const pending = appointments.filter((item) => item.status === 'Pending').length;
    const completed = appointments.filter((item) => item.status === 'Completed').length;
    const cancelled = appointments.filter((item) => item.status === 'Cancelled').length;

    return {
      pending,
      completed,
      cancelled,
      total: appointments.length,
    };
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((item) => item.status === 'Pending' || item.status === 'In Progress')
      .sort((a, b) => {
        const aTime = new Date(`${a.date || ''}T${a.estimatedTime || '00:00'}:00`).getTime();
        const bTime = new Date(`${b.date || ''}T${b.estimatedTime || '00:00'}:00`).getTime();

        if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;

        return aTime - bTime;
      })
      .slice(0, 3);
  }, [appointments]);

  const nextAppointment = upcomingAppointments[0];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading patient dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
      }
    >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.portalText}>Patient Portal</Text>
          <Text style={styles.pageTitle}>My Dashboard</Text>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            onPress={openNotifications}
            activeOpacity={0.85}
            style={styles.topIconButton}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openProfile}
            activeOpacity={0.85}
            style={styles.topIconButton}
          >
            <Ionicons name="person-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            style={styles.topIconButton}
          >
            <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroCircleOne} />
        <View style={styles.heroCircleTwo} />

        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>{getGreeting()} 👋</Text>
          <Text style={styles.heroName} numberOfLines={1}>
            {displayName}
          </Text>

          <View style={styles.pillRow}>
            <InfoPill label="ID" value={freshUser?.userId} />
            <InfoPill label="Blood" value={profile?.bloodGroup} />
            <InfoPill label="Age" value={calculateAge(profile?.birthday)} />
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.primaryAction}
          onPress={() => navigation.navigate('Appointments')}
        >
          <Ionicons name="add-circle-outline" size={20} color={C.primary} />
          <Text style={styles.primaryActionText}>Book Appointment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.secondaryAction}
          onPress={openProfile}
        >
          <Ionicons name="person-outline" size={20} color="#ffffff" />
          <Text style={styles.secondaryActionText}>My Profile</Text>
        </TouchableOpacity>
      </View>

     <TouchableOpacity
  activeOpacity={0.88}
  style={styles.feedbackBanner}
  onPress={openFeedback}
>
  <View style={styles.feedbackIcon}>
    <Ionicons name="chatbubble-ellipses-outline" size={21} color={C.primary} />
  </View>

  <Text style={styles.feedbackTitle}>Feedback & Ratings</Text>

  <Ionicons name="chevron-forward" size={20} color="#64748B" />
</TouchableOpacity>

      <View style={styles.statsGrid}>
        <StatCard
          icon="calendar-outline"
          value={stats.pending}
          label="Upcoming Appointments"
          color="#0284c7"
          background="#e0f2fe"
        />

        <StatCard
          icon="checkmark-done-outline"
          value={stats.completed}
          label="Completed Visits"
          color="#059669"
          background="#dcfce7"
        />

        <StatCard
          icon="warning-outline"
          value={getAllergyCount(profile?.allergies)}
          label="Known Allergies"
          color="#d97706"
          background="#fef3c7"
        />

        <StatCard
          icon="medical-outline"
          value={stats.total}
          label="Total Appointments"
          color="#b45309"
          background="#ffedd5"
        />
      </View>

      <View style={styles.sectionCard}>
        <SectionHeader
          title="Upcoming Appointments"
          subtitle="Your pending bookings"
          onViewAll={() => navigation.navigate('Appointments')}
        />

        {upcomingAppointments.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title="No upcoming appointments"
            subtitle="Book a new appointment to see it here."
          />
        ) : (
          upcomingAppointments.map((appointment, index) => (
            <AppointmentCard
              key={appointment?._id || appointment?.appointmentId || index}
              appointment={appointment}
            />
          ))
        )}

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.bookFullButton}
          onPress={() => navigation.navigate('Appointments')}
        >
          <Text style={styles.bookFullButtonText}>+ Book New Appointment</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <SectionHeader
          title="Recent Prescriptions"
          subtitle="Your latest prescription records"
          onViewAll={() => navigation.navigate('Prescriptions')}
        />

        {prescriptions.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No prescriptions yet"
            subtitle="Your prescriptions will appear here after consultation."
          />
        ) : (
          prescriptions.slice(0, 3).map((prescription, index) => (
            <PrescriptionCard
              key={prescription?._id || index}
              prescription={prescription}
            />
          ))
        )}
      </View>

      <View style={styles.healthSummary}>
        <Text style={styles.summaryTitle}>Health Summary</Text>
        <Text style={styles.summarySubtitle}>From your profile</Text>

        <SummaryRow label="Blood Group" value={profile?.bloodGroup || '—'} />
        <SummaryRow label="Age" value={calculateAge(profile?.birthday)} />
        <SummaryRow label="Chronic Conditions" value={profile?.chronicConditions || 'None'} />
        <SummaryRow
          label="Known Allergies"
          value={
            Array.isArray(profile?.allergies)
              ? profile.allergies.join(', ') || 'None'
              : profile?.allergies || 'None'
          }
        />
        <SummaryRow label="Emergency Contact" value={profile?.emergencyContactName || '—'} />
        <SummaryRow
          label="Next Appointment"
          value={
            nextAppointment
              ? `${formatDate(nextAppointment.date)} · ${nextAppointment.session}`
              : 'Not scheduled'
          }
        />

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.profileButton}
          onPress={openProfile}
        >
          <Text style={styles.profileButtonText}>View Full Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <SectionHeader title="Quick Actions" subtitle="Move to important patient sections" />

        <View style={styles.quickGrid}>
          <QuickAction
            icon="calendar-outline"
            title="Appointments"
            subtitle="View, book or cancel"
            color={C.primary}
            bg={C.light}
            onPress={() => navigation.navigate('Appointments')}
          />

          <QuickAction
            icon="document-text-outline"
            title="Prescriptions"
            subtitle="View medical prescriptions"
            color="#7c3aed"
            bg="#ede9fe"
            onPress={() => navigation.navigate('Prescriptions')}
          />

          <QuickAction
            icon="flask-outline"
            title="Lab Results"
            subtitle="View test reports"
            color="#0284c7"
            bg="#e0f2fe"
            onPress={() => navigation.navigate('Lab Results')}
          />

          <QuickAction
            icon="person-outline"
            title="My Profile"
            subtitle="Update personal details"
            color="#0f766e"
            bg="#ccfbf1"
            onPress={openProfile}
          />

          <QuickAction
            icon="chatbubble-ellipses-outline"
            title="Feedback & Ratings"
            subtitle="Share your experience"
            color="#2563eb"
            bg="#dbeafe"
            onPress={openFeedback}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  content: {
    padding: 16,
    paddingBottom: 28,
  },

  center: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontWeight: '700',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  portalText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },

  pageTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },

  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  topIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  heroCard: {
    backgroundColor: '#0b2545',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    ...SHADOW.md,
  },

  heroCircleOne: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
    right: -42,
    top: -44,
  },

  heroCircleTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(21,101,192,0.35)',
    right: 12,
    bottom: -64,
  },

  avatarBox: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },

  welcomeText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800',
  },

  heroName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 3,
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },

  infoPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  infoPillLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
  },

  infoPillValue: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  },

  primaryAction: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#dbeafe',
    ...SHADOW.sm,
  },

  primaryActionText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '900',
  },

  secondaryAction: {
    flex: 1,
    backgroundColor: C.secondary || '#1565C0',
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    ...SHADOW.sm,
  },

  secondaryActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },

  feedbackBanner: {
  backgroundColor: '#EFF6FF',
  borderRadius: 16,
  padding: 13,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 11,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#BFDBFE',
  ...SHADOW.sm,
},

feedbackIcon: {
  width: 38,
  height: 38,
  borderRadius: 13,
  backgroundColor: '#DBEAFE',
  alignItems: 'center',
  justifyContent: 'center',
},

feedbackTitle: {
  flex: 1,
  color: '#0F172A',
  fontSize: 14,
  fontWeight: '900',
},

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...SHADOW.sm,
  },

  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  statValue: {
    color: '#111827',
    fontSize: 25,
    fontWeight: '900',
  },

  statLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 16,
  },

  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...SHADOW.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },

  viewAllText: {
    color: C.secondary || '#1565C0',
    fontSize: 12,
    fontWeight: '900',
  },

  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  dateBox: {
    width: 48,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateMonth: {
    color: '#dbeafe',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  dateDay: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },

  appointmentTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
  },

  appointmentMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  pendingBadge: {
    backgroundColor: '#eff6ff',
  },

  completedBadge: {
    backgroundColor: '#f0fdf4',
  },

  cancelledBadge: {
    backgroundColor: '#f8fafc',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },

  pendingText: {
    color: '#1d4ed8',
  },

  completedText: {
    color: '#15803d',
  },

  cancelledText: {
    color: '#64748b',
  },

  bookFullButton: {
    marginTop: 12,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },

  bookFullButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },

  simpleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
  },

  simpleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  simpleTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
  },

  simpleSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },

  healthSummary: {
    backgroundColor: '#0b2545',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    ...SHADOW.md,
  },

  summaryTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },

  summarySubtitle: {
    color: '#93c5fd',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },

  summaryRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  summaryLabel: {
    color: '#bfdbfe',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  summaryValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },

  profileButton: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  profileButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },

  quickGrid: {
    gap: 10,
  },

  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
  },

  quickSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  emptyTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
  },

  emptySub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});