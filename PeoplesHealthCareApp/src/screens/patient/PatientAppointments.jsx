import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import api from '../../services/api';
import { COLORS, SHADOW } from '../../constants/theme';

const C = COLORS?.patient || {
  primary: '#0D2137',
  secondary: '#1565C0',
  accent: '#00ACC1',
  light: '#E0F2FE',
};

const FILTERS = ['All', 'Pending', 'In Progress', 'Completed', 'Cancelled'];

const STATUS_STYLES = {
  Pending: {
    bg: '#EFF6FF',
    text: '#1D4ED8',
    border: '#BFDBFE',
    icon: 'time-outline',
  },
  'In Progress': {
    bg: '#FFFBEB',
    text: '#92400E',
    border: '#FDE68A',
    icon: 'pulse-outline',
  },
  Completed: {
    bg: '#F0FDF4',
    text: '#166534',
    border: '#BBF7D0',
    icon: 'checkmark-circle-outline',
  },
  Cancelled: {
    bg: '#F8FAFC',
    text: '#64748B',
    border: '#E2E8F0',
    icon: 'close-circle-outline',
  },
};

function extractAppointments(payload) {
  if (!payload) return [];

  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.appointments)) return data.appointments;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.appointments)) return data.data.appointments;

  return [];
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

function formatDateShort(dateString) {
  if (!dateString) {
    return {
      month: '—',
      day: '—',
    };
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return {
      month: '—',
      day: '—',
    };
  }

  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }),
    day: date.getDate(),
  };
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

function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.Pending;
}

function FilterButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[
        styles.filterButton,
        active && styles.filterButtonActive,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          active && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatMiniCard({ label, value, icon, color, bg }) {
  return (
    <View style={styles.statMiniCard}>
      <View style={[styles.statMiniIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      <Text style={styles.statMiniValue}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

function AppointmentCard({ appointment, onPress }) {
  const status = appointment?.status || 'Pending';
  const statusStyle = getStatusStyle(status);
  const dateParts = formatDateShort(appointment?.date);
  const isMorning = appointment?.session === 'Morning';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.appointmentCard}
    >
      <View style={styles.cardTop}>
        <View style={styles.dateBox}>
          <Text style={styles.dateMonth}>{dateParts.month}</Text>
          <Text style={styles.dateDay}>{dateParts.day}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.appointmentId}>
            {appointment?.appointmentId || 'Appointment'}
          </Text>

          <Text style={styles.patientName} numberOfLines={1}>
            {appointment?.patientName || 'Patient'}
          </Text>

          <View style={styles.sessionRow}>
            <View
              style={[
                styles.sessionIcon,
                {
                  backgroundColor: isMorning ? '#FEF3C7' : '#E0F2FE',
                },
              ]}
            >
              <Ionicons
                name={isMorning ? 'sunny-outline' : 'moon-outline'}
                size={14}
                color={isMorning ? '#D97706' : '#0284C7'}
              />
            </View>

            <Text style={styles.sessionText}>
              {appointment?.session || '—'} Session
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusStyle.bg,
              borderColor: statusStyle.border,
            },
          ]}
        >
          <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {status}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.detailGrid}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={17} color={C.primary} />
          <View>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(appointment?.date)}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={17} color="#7C3AED" />
          <View>
            <Text style={styles.detailLabel}>Estimated</Text>
            <Text style={styles.detailValue}>{formatTime(appointment?.estimatedTime)}</Text>
          </View>
        </View>

        
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.tapText}>Tap to view details</Text>
        <Ionicons name="chevron-forward" size={20} color={C.primary} />
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ filter, onBook }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="calendar-clear-outline" size={42} color={C.primary} />
      </View>

      <Text style={styles.emptyTitle}>No appointments found</Text>

      <Text style={styles.emptyText}>
        {filter === 'All'
          ? 'You have not booked any appointments yet.'
          : `No ${filter.toLowerCase()} appointments are available.`}
      </Text>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onBook}
        style={styles.emptyButton}
      >
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Book Appointment</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PatientAppointments({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAppointments = useCallback(async () => {
    try {
      setErrorMessage('');

      const response = await api.get('/appointments/my');
      const list = extractAppointments(response);

      const sorted = [...list].sort((a, b) => {
        const aTime = new Date(`${a?.date || ''}T${a?.estimatedTime || '00:00'}:00`).getTime();
        const bTime = new Date(`${b?.date || ''}T${b?.estimatedTime || '00:00'}:00`).getTime();

        if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;

        return bTime - aTime;
      });

      setAppointments(sorted);
    } catch (error) {
      const message =
        error?.message ||
        'Unable to load appointments. Please check your connection and try again.';

      setErrorMessage(message);
      console.log('Appointment load error:', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const filteredAppointments = useMemo(() => {
    if (selectedFilter === 'All') return appointments;

    return appointments.filter((appointment) => appointment?.status === selectedFilter);
  }, [appointments, selectedFilter]);

  const stats = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((item) => item?.status === 'Pending').length,
      completed: appointments.filter((item) => item?.status === 'Completed').length,
      cancelled: appointments.filter((item) => item?.status === 'Cancelled').length,
    };
  }, [appointments]);

  const goToBook = () => {
    navigation.navigate('BookAppointment');
  };

  const goToDetails = (appointment) => {
    if (!appointment?._id) {
      Alert.alert(
        'Missing Appointment ID',
        'This appointment cannot be opened because its database ID is missing.'
      );
      return;
    }

    navigation.navigate('AppointmentDetail', {
      appointmentId: appointment._id,
      appointment,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={filteredAppointments}
        keyExtractor={(item, index) => item?._id || item?.appointmentId || String(index)}
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
            onPress={() => goToDetails(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          filteredAppointments.length === 0 && {
            flexGrow: 1,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.heroCard}>
              <View style={styles.heroCircleOne} />
              <View style={styles.heroCircleTwo} />

              <View style={styles.heroIcon}>
                <Ionicons name="calendar-outline" size={30} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroSmall}>Patient Appointments</Text>
                <Text style={styles.heroTitle}>Manage Your Visits</Text>
                <Text style={styles.heroSub}>
                  View, book, cancel and download your appointment records.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={goToBook}
              style={styles.bookButton}
            >
              <Ionicons name="add-circle-outline" size={21} color="#FFFFFF" />
              <Text style={styles.bookButtonText}>Book New Appointment</Text>
            </TouchableOpacity>

            <View style={styles.statsRow}>
              <StatMiniCard
                label="Total"
                value={stats.total}
                icon="calendar-outline"
                color={C.primary}
                bg={C.light}
              />

              <StatMiniCard
                label="Pending"
                value={stats.pending}
                icon="time-outline"
                color="#1D4ED8"
                bg="#DBEAFE"
              />

              <StatMiniCard
                label="Done"
                value={stats.completed}
                icon="checkmark-done-outline"
                color="#059669"
                bg="#DCFCE7"
              />
            </View>

            {!!errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={19} color="#991B1B" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <FlatList
              horizontal
              data={FILTERS}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <FilterButton
                  label={item}
                  active={selectedFilter === item}
                  onPress={() => setSelectedFilter(item)}
                />
              )}
              style={styles.filterList}
            />

            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>
                {selectedFilter === 'All'
                  ? 'All Appointments'
                  : `${selectedFilter} Appointments`}
              </Text>

              <Text style={styles.sectionCount}>
                {filteredAppointments.length}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            filter={selectedFilter}
            onBook={goToBook}
          />
        }
      />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={goToBook}
        style={styles.fab}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  center: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 12,
  },

  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  heroCard: {
    backgroundColor: '#0B2545',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    marginBottom: 12,
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

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  heroSmall: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },

  heroSub: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '600',
  },

  bookButton: {
    backgroundColor: C.primary,
    borderRadius: 17,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    ...SHADOW.md,
  },

  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 13,
  },

  statMiniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOW.sm,
  },

  statMiniIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statMiniValue: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
  },

  statMiniLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 12,
  },

  errorText: {
    color: '#991B1B',
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  filterList: {
    marginBottom: 14,
  },

  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },

  filterButtonActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },

  filterText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  sectionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  sectionCount: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOW.sm,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  dateBox: {
    width: 52,
    height: 58,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateMonth: {
    color: '#DBEAFE',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  dateDay: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 1,
  },

  appointmentId: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  patientName: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },

  sessionIcon: {
    width: 24,
    height: 24,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sessionText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },

  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 13,
  },

  detailGrid: {
    gap: 10,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  detailLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
  },

  detailValue: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 1,
  },

  cardBottom: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  tapText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 22,
  },

  emptyIconBox: {
    width: 84,
    height: 84,
    borderRadius: 29,
    backgroundColor: C.light || '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
  },

  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '600',
  },

  emptyButton: {
    backgroundColor: C.primary,
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  fab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
});