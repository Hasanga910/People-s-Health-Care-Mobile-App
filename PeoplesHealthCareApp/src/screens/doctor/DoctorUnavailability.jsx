import { useCallback, useEffect, useMemo, useState } from 'react';
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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

import api from '../../services/api';

const SESSIONS = [
  {
    value: 'Both',
    label: 'Full Day',
    subtitle: 'Morning and evening will be blocked',
    icon: 'calendar-clear-outline',
    bg: '#FEE2E2',
    color: '#DC2626',
  },
  {
    value: 'Morning',
    label: 'Morning',
    subtitle: 'Only morning session will be blocked',
    icon: 'sunny-outline',
    bg: '#FEF3C7',
    color: '#D97706',
  },
  {
    value: 'Evening',
    label: 'Evening',
    subtitle: 'Only evening session will be blocked',
    icon: 'moon-outline',
    bg: '#E0F2FE',
    color: '#0284C7',
  },
];

const REASON_SUGGESTIONS = [
  'Medical conference',
  'Urgent personal matter',
  'Emergency leave',
  'Clinic maintenance',
  'Special public holiday',
  'Poya day',
];

function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function parseDateString(value) {
  if (!value) return new Date();

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return new Date();

  return parsed;
}

function formatPrettyDate(dateString) {
  if (!dateString) return '—';

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isSunday(dateString) {
  return new Date(`${dateString}T00:00:00`).getDay() === 0;
}

function isPastDate(dateString) {
  const selected = new Date(`${dateString}T00:00:00`);
  const today = new Date();

  selected.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return selected < today;
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

function getHolidayIcon(item) {
  const reason = String(item?.reason || '').toLowerCase();

  if (reason.includes('poya')) return '🌕';
  if (item?.type === 'holiday') return '🔴';

  return '⚠️';
}

function SessionOption({ item, active, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.sessionOption, active && styles.sessionOptionActive]}
    >
      <View style={[styles.sessionIconBox, { backgroundColor: item.bg }]}>
        <Ionicons name={item.icon} size={23} color={item.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.sessionTitle}>{item.label}</Text>
        <Text style={styles.sessionSubtitle}>{item.subtitle}</Text>
      </View>

      <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
        {active && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

function BlockedEntry({ item }) {
  const sessionMeta =
    SESSIONS.find((session) => session.value === item?.session) || SESSIONS[0];

  return (
    <View style={styles.blockedEntry}>
      <View style={[styles.blockedIcon, { backgroundColor: sessionMeta.bg }]}>
        <Text style={styles.blockedEmoji}>{getHolidayIcon(item)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.blockedDate}>{formatPrettyDate(item?.date)}</Text>
        <Text style={styles.blockedReason} numberOfLines={2}>
          {item?.reason || 'Doctor unavailable'}
        </Text>

        <View style={styles.blockedMetaRow}>
          <View style={styles.blockedChip}>
            <Text style={styles.blockedChipText}>
              {item?.session === 'Both' ? 'Full Day' : `${item?.session} Session`}
            </Text>
          </View>

          <View style={styles.blockedTypeChip}>
            <Text style={styles.blockedTypeText}>
              {item?.type === 'holiday' ? 'Holiday' : 'Unavailable'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function DoctorUnavailability({ route, navigation }) {
  const initialDate = route?.params?.initialDate || getLocalDateStr();

  const [selectedDate, setSelectedDate] = useState(parseDateString(initialDate));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [session, setSession] = useState('Both');
  const [reason, setReason] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const date = useMemo(() => getLocalDateStr(selectedDate), [selectedDate]);

  const validation = useMemo(() => {
    if (!date) {
      return {
        ok: false,
        message: 'Please select a date.',
      };
    }

    if (isPastDate(date)) {
      return {
        ok: false,
        message: 'Past dates cannot be marked as unavailable.',
      };
    }

    if (isSunday(date)) {
      return {
        ok: false,
        message: 'Sunday is already closed. No need to mark it unavailable.',
      };
    }

    if (!reason.trim()) {
      return {
        ok: false,
        message: 'Please enter a reason.',
      };
    }

    const alreadyBlocked = holidays.some((item) => {
      const sameDate = item?.date === date;
      const sameSession = item?.session === session;

      return sameDate && sameSession;
    });

    if (alreadyBlocked) {
      return {
        ok: false,
        message:
          session === 'Both'
            ? 'This date is already marked as a full-day unavailability.'
            : `The ${session} session is already marked as unavailable on this date.`,
      };
    }

    return {
      ok: true,
      message: '',
    };
  }, [date, session, reason, holidays]);

  const selectedDateEntries = useMemo(() => {
    return holidays
      .filter((item) => item?.date === date)
      .sort((a, b) => {
        const order = { Both: 0, Morning: 1, Evening: 2 };
        return (order[a?.session] ?? 9) - (order[b?.session] ?? 9);
      });
  }, [holidays, date]);

  const upcomingBlockedEntries = useMemo(() => {
    const today = getLocalDateStr();

    return holidays
      .filter((item) => item?.date >= today)
      .sort((a, b) => {
        if (a?.date === b?.date) {
          const order = { Both: 0, Morning: 1, Evening: 2 };
          return (order[a?.session] ?? 9) - (order[b?.session] ?? 9);
        }

        return String(a?.date).localeCompare(String(b?.date));
      })
      .slice(0, 8);
  }, [holidays]);

  const fetchHolidays = useCallback(async () => {
    try {
      setErrorMessage('');

      const response = await api.get('/appointments/holidays');
      const list = extractArray(response, ['holidays', 'data']);

      setHolidays(list);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to load unavailable dates.';

      setErrorMessage(message);
      setHolidays([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHolidays();
  };

  const handleDateChange = (event, pickedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event?.type === 'dismissed') return;

    if (pickedDate) {
      const normalized = new Date(pickedDate);
      normalized.setHours(0, 0, 0, 0);
      setSelectedDate(normalized);
    }
  };

  const submitUnavailability = async () => {
    if (!validation.ok) {
      Alert.alert('Check Details', validation.message);
      return;
    }

    Alert.alert(
      'Confirm Unavailability',
      session === 'Both'
        ? `Mark ${formatPrettyDate(date)} as a full-day unavailable date? Existing pending appointments on this day will be cancelled.`
        : `Mark the ${session} session on ${formatPrettyDate(date)} as unavailable? Existing pending appointments in this session will be cancelled.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              setErrorMessage('');

              await api.post('/appointments/holidays', {
                date,
                session,
                reason: reason.trim(),
                type: 'unavailable',
              });

              Alert.alert(
                'Unavailability Marked',
                'The selected date/session has been marked unavailable. Affected pending appointments are cancelled by the system and patients will see the cancellation in their notification center.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setReason('');
                      setSession('Both');
                      fetchHolidays();
                    },
                  },
                ]
              );
            } catch (error) {
              const message =
                error?.response?.data?.message ||
                error?.message ||
                'Failed to mark unavailability.';

              setErrorMessage(message);
              Alert.alert('Failed', message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Loading unavailability manager...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1565C0"
            colors={['#1565C0']}
          />
        }
      >
        <LinearGradient
          colors={['#0D2137', '#1565C0', '#00ACC1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="calendar-clear-outline" size={30} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroSmall}>Doctor Schedule</Text>
            <Text style={styles.heroTitle}>Manage Unavailability</Text>
            <Text style={styles.heroSub}>
              Block a full day or one session when the doctor is unavailable.
            </Text>
          </View>
        </LinearGradient>

        {!!errorMessage && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Ionicons name="calendar-outline" size={20} color="#1565C0" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <Text style={styles.sectionSubtitle}>
                Choose the date that should be blocked.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.dateSelector, showDatePicker && { borderColor: '#1565C0' }]}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.dateIconBox}>
              <Ionicons name="calendar-outline" size={22} color="#1565C0" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>Selected Date</Text>
              <Text style={styles.dateValue}>{formatPrettyDate(date)}</Text>
              <Text style={styles.dateSub}>{date}</Text>
            </View>

            <Ionicons name="chevron-down-outline" size={21} color="#64748B" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.doneDateButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.doneDateText}>Done Selecting Date</Text>
            </TouchableOpacity>
          )}

          {selectedDateEntries.length > 0 && (
            <View style={styles.selectedEntriesBox}>
              <Text style={styles.selectedEntriesTitle}>Already blocked on this date</Text>

              {selectedDateEntries.map((item) => (
                <View key={`${item.date}-${item.session}`} style={styles.selectedEntryRow}>
                  <Text style={styles.selectedEntryText}>
                    {getHolidayIcon(item)} {item.session === 'Both' ? 'Full Day' : item.session}
                  </Text>
                  <Text style={styles.selectedEntryReason} numberOfLines={1}>
                    {item.reason || 'Doctor unavailable'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Ionicons name="time-outline" size={20} color="#1565C0" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Select Session</Text>
              <Text style={styles.sectionSubtitle}>
                Choose whether to block the full day or only one session.
              </Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {SESSIONS.map((item) => (
              <SessionOption
                key={item.value}
                item={item}
                active={session === item.value}
                onPress={() => setSession(item.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Ionicons name="document-text-outline" size={20} color="#1565C0" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Reason</Text>
              <Text style={styles.sectionSubtitle}>
                This reason will be used in the patient cancellation notification.
              </Text>
            </View>
          </View>

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Example: Medical conference, urgent matter..."
            placeholderTextColor="#94A3B8"
            style={styles.reasonInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.suggestionWrap}>
            {REASON_SUGGESTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                activeOpacity={0.85}
                style={styles.suggestionChip}
                onPress={() => setReason(item)}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!validation.ok && (
          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={19} color="#C2410C" />
            <Text style={styles.warningText}>{validation.message}</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.88}
          disabled={saving || !validation.ok}
          style={[styles.saveButton, (saving || !validation.ok) && { opacity: 0.55 }]}
          onPress={submitUnavailability}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={21} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Mark as Unavailable</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          disabled={saving}
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Back to Schedule</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Ionicons name="list-outline" size={20} color="#1565C0" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Upcoming Blocked Dates</Text>
              <Text style={styles.sectionSubtitle}>
                Existing unavailable sessions from the backend.
              </Text>
            </View>
          </View>

          {upcomingBlockedEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={34} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No blocked dates found</Text>
              <Text style={styles.emptySub}>
                Mark a date/session unavailable to see it here.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {upcomingBlockedEntries.map((item) => (
                <BlockedEntry
                  key={`${item.date}-${item.session}-${item._id || item.reason}`}
                  item={item}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="shield-checkmark-outline" size={21} color="#1565C0" />
          <Text style={styles.noteText}>
            When a session or full day is marked unavailable, future bookings for that period are blocked. Existing pending appointments for that date/session are cancelled by the backend and shown in the patient notification center.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 14,
    paddingBottom: 36,
  },

  center: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  heroCard: {
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroSmall: {
    color: '#BFDBFE',
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
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
    backgroundColor: '#EFF6FF',
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
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 2,
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

  dateIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },

  dateValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },

  dateSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  doneDateButton: {
    backgroundColor: '#1565C0',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },

  doneDateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  selectedEntriesBox: {
    marginTop: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 15,
    padding: 12,
  },

  selectedEntriesTitle: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },

  selectedEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },

  selectedEntryText: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '900',
  },

  selectedEntryReason: {
    flex: 1,
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },

  sessionOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 17,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  sessionOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1565C0',
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
    fontSize: 14,
    fontWeight: '900',
  },

  sessionSubtitle: {
    color: '#64748B',
    fontSize: 12,
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

  radioOuterActive: {
    borderColor: '#1565C0',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1565C0',
  },

  reasonInput: {
    minHeight: 96,
    borderWidth: 1.4,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },

  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  suggestionChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  suggestionText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
  },

  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  warningBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
  },

  warningText: {
    flex: 1,
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  saveButton: {
    backgroundColor: '#1565C0',
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    shadowColor: '#1565C0',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },

  saveButtonText: {
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
    marginBottom: 14,
  },

  cancelButtonText: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '900',
  },

  blockedEntry: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 12,
  },

  blockedIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  blockedEmoji: {
    fontSize: 20,
  },

  blockedDate: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },

  blockedReason: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },

  blockedMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },

  blockedChip: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  blockedChipText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '900',
  },

  blockedTypeChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  blockedTypeText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  emptyTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
  },

  emptySub: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },

  noteCard: {
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 11,
  },

  noteText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '600',
  },
});