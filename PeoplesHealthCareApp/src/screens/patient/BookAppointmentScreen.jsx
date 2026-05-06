import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import api from '../../services/api';
import { COLORS, SHADOW } from '../../constants/theme';

const C = COLORS?.patient || {
  primary: '#0D2137',
  secondary: '#1565C0',
  accent: '#00ACC1',
  light: '#E0F2FE',
};

const DOCTOR = {
  name: 'Dr. M.T.D Jayaweera',
  qualification: 'MBBS (Sri Lanka)',
  slmc: 'SLMC Reg No - 14508',
  clinic: "People's Health Care",
};

const SESSIONS = [
  {
    label: 'Morning',
    icon: 'sunny-outline',
    time: '07:00 AM - 07:45 AM',
    closedAfter: '07:45 AM',
    color: '#D97706',
    bg: '#FEF3C7',
  },
  {
    label: 'Evening',
    icon: 'moon-outline',
    time: '04:30 PM - 08:00 PM',
    closedAfter: '08:00 PM',
    color: '#0284C7',
    bg: '#E0F2FE',
  },
];

function formatDateForAPI(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getInitialBookingDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function getDateObject(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function isPastDate(dateString) {
  const selected = getDateObject(dateString);
  const today = new Date();

  selected.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return selected < today;
}

function isToday(dateString) {
  return dateString === formatDateForAPI(new Date());
}

function isSunday(dateString) {
  return getDateObject(dateString).getDay() === 0;
}

function isSessionClosedToday(session) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (session === 'Morning') {
    return currentMinutes >= 7 * 60 + 45;
  }

  if (session === 'Evening') {
    return currentMinutes >= 20 * 60;
  }

  return false;
}

function formatPrettyDate(dateString) {
  if (!dateString) return '—';

  const date = getDateObject(dateString);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
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

function extractArray(payload, keys = []) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }

  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function normalizeSessionInfo(payload) {
  const data = payload?.data || payload;

  return (
    data?.sessionInfo ||
    data?.data?.sessionInfo ||
    data?.data ||
    data ||
    null
  );
}

function checkHolidayStatus(holidays, date, session) {
  if (!Array.isArray(holidays)) return null;

  return holidays.find((item) => {
    const itemDate = item?.date || item?.holidayDate;
    const itemSession = item?.session;

    if (!itemDate) return false;

    const sameDate = String(itemDate).slice(0, 10) === date;
    const fullDay = !itemSession || itemSession === 'Full Day' || itemSession === 'All';
    const sameSession = itemSession === session;

    return sameDate && (fullDay || sameSession);
  });
}

function SessionButton({ item, active, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.sessionCard,
        active && {
          borderColor: C.primary,
          backgroundColor: C.light || '#E0F2FE',
        },
      ]}
    >
      <View style={[styles.sessionIconBox, { backgroundColor: item.bg }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.sessionTitle}>{item.label}</Text>
        <Text style={styles.sessionTime}>{item.time}</Text>
        <Text style={styles.sessionNote}>Closes after {item.closedAfter}</Text>
      </View>

      <View
        style={[
          styles.radioOuter,
          active && {
            borderColor: C.primary,
          },
        ]}
      >
        {active && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

function InfoCard({ icon, title, value, color, bg }) {
  return (
    <View style={styles.infoCard}>
      <View style={[styles.infoIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function DoctorCard() {
  return (
    <View style={styles.doctorCard}>
      <View style={styles.doctorAvatar}>
        <Ionicons name="person-circle-outline" size={42} color="#FFFFFF" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.doctorLabel}>Consulting Doctor</Text>
        <Text style={styles.doctorName}>{DOCTOR.name}</Text>

        <View style={styles.doctorMetaRow}>
          <View style={styles.doctorChip}>
            <Ionicons name="school-outline" size={13} color="#DBEAFE" />
            <Text style={styles.doctorChipText}>{DOCTOR.qualification}</Text>
          </View>

          <View style={styles.doctorChip}>
            <MaterialCommunityIcons name="certificate-outline" size={13} color="#DBEAFE" />
            <Text style={styles.doctorChipText}>{DOCTOR.slmc}</Text>
          </View>
        </View>

        <Text style={styles.doctorClinic}>{DOCTOR.clinic}</Text>
      </View>
    </View>
  );
}

export default function BookAppointmentScreen({ navigation }) {
  const initialDate = getInitialBookingDate();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [session, setSession] = useState('Morning');
  const [holidays, setHolidays] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  const [booking, setBooking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const date = useMemo(() => formatDateForAPI(selectedDate), [selectedDate]);

  const selectedSessionMeta = useMemo(
    () => SESSIONS.find((item) => item.label === session),
    [session]
  );

  const minDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  const validation = useMemo(() => {
    if (isPastDate(date)) {
      return {
        ok: false,
        message: 'Past dates are not allowed.',
      };
    }

    if (isSunday(date)) {
      return {
        ok: false,
        message: 'Appointments cannot be booked on Sundays.',
      };
    }

    if (isToday(date) && isSessionClosedToday(session)) {
      return {
        ok: false,
        message: `${session} session is already closed for today.`,
      };
    }

    const holiday = checkHolidayStatus(holidays, date, session);

    if (holiday) {
      return {
        ok: false,
        message:
          holiday?.reason ||
          `The selected ${session} session is unavailable on ${formatPrettyDate(date)}.`,
      };
    }

    return {
      ok: true,
      message: '',
    };
  }, [date, session, holidays]);

  const loadHolidays = useCallback(async () => {
    try {
      const response = await api.get('/appointments/holidays');
      const list = extractArray(response, ['holidays', 'data']);
      setHolidays(list);
    } catch (error) {
      console.log('Holiday load error:', error?.message);
      setHolidays([]);
    }
  }, []);

  const loadSessionInfo = useCallback(async () => {
    if (!validation.ok) {
      setSessionInfo(null);
      setErrorMessage(validation.message);
      return;
    }

    try {
      setChecking(true);
      setErrorMessage('');

      const endpoint = `/appointments/session-info?date=${encodeURIComponent(
        date
      )}&session=${encodeURIComponent(session)}`;

      const response = await api.get(endpoint);
      const info = normalizeSessionInfo(response);

      setSessionInfo(info);
    } catch (error) {
      const message =
        error?.message ||
        'Unable to check session information. Please try another date or session.';

      setSessionInfo(null);
      setErrorMessage(message);
    } finally {
      setChecking(false);
      setRefreshing(false);
    }
  }, [date, session, validation.ok, validation.message]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadSessionInfo();
    }, 350);

    return () => clearTimeout(timeout);
  }, [loadSessionInfo]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHolidays();
    await loadSessionInfo();
  };

  const handleDateChange = (event, pickedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event?.type === 'dismissed') {
      return;
    }

    if (pickedDate) {
      const normalized = new Date(pickedDate);
      normalized.setHours(0, 0, 0, 0);
      setSelectedDate(normalized);
    }
  };

  const setQuickDate = (offset) => {
    const quickDate = new Date();
    quickDate.setDate(quickDate.getDate() + offset);
    quickDate.setHours(0, 0, 0, 0);

    if (quickDate.getDay() === 0) {
      quickDate.setDate(quickDate.getDate() + 1);
    }

    setSelectedDate(quickDate);
  };

  const handleBookAppointment = async () => {
    if (!validation.ok) {
      Alert.alert('Invalid Selection', validation.message);
      return;
    }

    Alert.alert(
      'Confirm Appointment',
      `Book a ${session} appointment with ${DOCTOR.name} on ${formatPrettyDate(date)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Book',
          onPress: submitBooking,
        },
      ]
    );
  };

  const submitBooking = async () => {
    try {
      setBooking(true);
      setErrorMessage('');

      await api.post('/appointments/book', {
        date,
        session,
      });

      Alert.alert(
        'Appointment Booked',
        'Your appointment has been booked successfully.',
        [
          {
            text: 'View Appointments',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const message =
        error?.message ||
        'Unable to book appointment. Please try again.';

      setErrorMessage(message);
      Alert.alert('Booking Failed', message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.primary}
          colors={[C.primary]}
        />
      }
    >
      <View style={styles.heroCard}>
        <View style={styles.heroCircleOne} />
        <View style={styles.heroCircleTwo} />

        <View style={styles.heroIcon}>
          <Ionicons name="add-circle-outline" size={31} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.heroSmall}>New Appointment</Text>
          <Text style={styles.heroTitle}>Book a Visit</Text>
          <Text style={styles.heroSub}>
            Choose a doctor session and appointment date using the calendar.
          </Text>
        </View>
      </View>

      <DoctorCard />

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconBox}>
            <Ionicons name="calendar-outline" size={20} color={C.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Appointment Date</Text>
            <Text style={styles.sectionSubtitle}>
              Select an available date from the calendar.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setShowDatePicker(true)}
          style={[
            styles.dateSelector,
            !validation.ok && styles.dateSelectorError,
          ]}
        >
          <View style={styles.dateIconBox}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={!validation.ok ? '#EF4444' : C.primary}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.dateSelectorLabel}>Selected Date</Text>
            <Text style={styles.dateSelectorValue}>{formatPrettyDate(date)}</Text>
            <Text style={styles.dateSelectorSub}>{date}</Text>
          </View>

          <Ionicons name="chevron-down-outline" size={22} color="#64748B" />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
            minimumDate={minDate}
            onChange={handleDateChange}
          />
        )}

        {Platform.OS === 'ios' && showDatePicker && (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setShowDatePicker(false)}
            style={styles.doneDateButton}
          >
            <Text style={styles.doneDateButtonText}>Done Selecting Date</Text>
          </TouchableOpacity>
        )}

        <View style={styles.quickDateRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setQuickDate(0)}
            style={styles.quickDateButton}
          >
            <Text style={styles.quickDateText}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setQuickDate(1)}
            style={styles.quickDateButton}
          >
            <Text style={styles.quickDateText}>Tomorrow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setQuickDate(2)}
            style={styles.quickDateButton}
          >
            <Text style={styles.quickDateText}>+2 Days</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconBox}>
            <Ionicons name="time-outline" size={20} color={C.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Select Session</Text>
            <Text style={styles.sectionSubtitle}>
              Choose the doctor channeling session.
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          {SESSIONS.map((item) => (
            <SessionButton
              key={item.label}
              item={item}
              active={session === item.label}
              onPress={() => setSession(item.label)}
            />
          ))}
        </View>
      </View>

      {!!errorMessage && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={19} color="#991B1B" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconBox}>
            <Ionicons name="information-circle-outline" size={20} color={C.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Session Availability</Text>
            <Text style={styles.sectionSubtitle}>
              Estimated time is calculated by backend based on existing bookings.
            </Text>
          </View>
        </View>

        {checking ? (
          <View style={styles.checkingBox}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.checkingText}>Checking session information...</Text>
          </View>
        ) : sessionInfo ? (
          <View style={{ gap: 10 }}>
            <InfoCard
              icon="person-outline"
              title="Doctor"
              value={`${DOCTOR.name} · ${DOCTOR.qualification}`}
              color={C.primary}
              bg={C.light || '#E0F2FE'}
            />

            <InfoCard
              icon="calendar-outline"
              title="Date"
              value={formatPrettyDate(date)}
              color={C.primary}
              bg={C.light || '#E0F2FE'}
            />

            <InfoCard
              icon={selectedSessionMeta?.icon || 'time-outline'}
              title="Session"
              value={`${session} Session`}
              color={selectedSessionMeta?.color || C.primary}
              bg={selectedSessionMeta?.bg || C.light}
            />

            <InfoCard
              icon="people-outline"
              title="Existing Active Bookings"
              value={String(
                sessionInfo?.activeCount ??
                  sessionInfo?.count ??
                  sessionInfo?.totalAppointments ??
                  0
              )}
              color="#7C3AED"
              bg="#EDE9FE"
            />

            <InfoCard
              icon="alarm-outline"
              title="Estimated Time"
              value={formatTime(
                sessionInfo?.estimatedTime ||
                  sessionInfo?.nextEstimatedTime ||
                  sessionInfo?.time
              )}
              color="#059669"
              bg="#DCFCE7"
            />
          </View>
        ) : (
          <View style={styles.unavailableBox}>
            <Ionicons name="warning-outline" size={24} color="#D97706" />
            <Text style={styles.unavailableTitle}>Session information unavailable</Text>
            <Text style={styles.unavailableText}>
              Please check your selected date and session.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleBookAppointment}
        disabled={booking || checking || !validation.ok}
        style={[
          styles.bookButton,
          (booking || checking || !validation.ok) && styles.bookButtonDisabled,
        ]}
      >
        {booking ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={21} color="#FFFFFF" />
            <Text style={styles.bookButtonText}>Confirm Booking</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.goBack()}
        disabled={booking}
        style={styles.cancelButton}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <View style={styles.noteCard}>
        <Ionicons name="shield-checkmark-outline" size={22} color={C.primary} />
        <Text style={styles.noteText}>
          The backend generates the appointment ID, appointment order, estimated time, and final appointment record after successful booking.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 16,
    paddingBottom: 34,
  },

  heroCard: {
    backgroundColor: '#0B2545',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    marginBottom: 14,
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

  doctorCard: {
    backgroundColor: '#0B2545',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOW.md,
  },

  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 19,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  doctorLabel: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  doctorName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },

  doctorMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 9,
  },

  doctorChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  doctorChipText: {
    color: '#DBEAFE',
    fontSize: 10,
    fontWeight: '900',
  },

  doctorClinic: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOW.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  sectionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.light || '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
    lineHeight: 17,
  },

  dateSelector: {
    minHeight: 72,
    borderWidth: 1.4,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },

  dateSelectorError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },

  dateIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: C.light || '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateSelectorLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },

  dateSelectorValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },

  dateSelectorSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  doneDateButton: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },

  doneDateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  quickDateButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    alignItems: 'center',
  },

  quickDateText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 17,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  sessionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sessionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  sessionTime: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  sessionNote: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  errorText: {
    color: '#991B1B',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  checkingBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  checkingText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },

  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },

  infoValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },

  unavailableBox: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 18,
  },

  unavailableTitle: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
  },

  unavailableText: {
    color: '#A16207',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '600',
  },

  bookButton: {
    backgroundColor: C.primary,
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOW.md,
  },

  bookButtonDisabled: {
    opacity: 0.55,
  },

  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 10,
  },

  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '900',
  },

  noteCard: {
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 11,
    marginTop: 14,
  },

  noteText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '600',
  },
});