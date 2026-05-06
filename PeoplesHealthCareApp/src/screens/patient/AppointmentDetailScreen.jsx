import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import api, { BASE_URL } from '../../services/api';
import authService from '../../services/authService';
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

function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.Pending;
}

function normalizeAppointment(payload) {
  if (!payload) return null;

  const data = payload?.data || payload;

  return (
    data?.appointment ||
    data?.data?.appointment ||
    data?.data ||
    data ||
    null
  );
}

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
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

function formatShortDate(dateString) {
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

function formatCreatedAt(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailRow({
  icon,
  label,
  value,
  iconColor = C.primary,
  iconBg = C.light || '#E0F2FE',
  multiline = false,
}) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text
          style={[
            styles.detailValue,
            multiline && {
              lineHeight: 21,
            },
          ]}
          numberOfLines={multiline ? 5 : 2}
        >
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

function SectionCard({ title, subtitle, icon, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <Ionicons name={icon} size={20} color={C.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.sectionBody}>{children}</View>
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

export default function AppointmentDetailScreen({ route, navigation }) {
  const routeAppointment = route?.params?.appointment || null;
  const appointmentId = route?.params?.appointmentId || routeAppointment?._id;

  const [appointment, setAppointment] = useState(routeAppointment);
  const [loading, setLoading] = useState(!routeAppointment);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const status = appointment?.status || 'Pending';
  const statusStyle = getStatusStyle(status);
  const dateParts = formatShortDate(appointment?.date);

  const canCancel = useMemo(() => {
    return status === 'Pending' && !!appointment?._id;
  }, [status, appointment?._id]);

  const loadAppointment = useCallback(async () => {
    if (!appointmentId) {
      setLoading(false);
      setRefreshing(false);
      setErrorMessage('Appointment ID is missing.');
      return;
    }

    try {
      setErrorMessage('');

      const allResponse = await api.get('/appointments/my');
      const list = extractAppointments(allResponse);
      const matched = list.find((item) => item?._id === appointmentId);

      if (matched) {
        setAppointment(matched);
      } else if (!routeAppointment) {
        setErrorMessage('Unable to find this appointment in your account.');
      }
    } catch (error) {
      const message =
        error?.message ||
        'Unable to load appointment details. Please try again.';

      setErrorMessage(message);
      console.log('Appointment detail load error:', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appointmentId, routeAppointment]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointment();
  };

  const handleCancel = () => {
    if (!canCancel) {
      Alert.alert(
        'Cannot Cancel',
        'Only pending appointments can be cancelled.'
      );
      return;
    }

    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This action cannot be undone.',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: submitCancellation,
        },
      ]
    );
  };

  const submitCancellation = async () => {
    try {
      setCancelling(true);
      setErrorMessage('');

      const response = await api.patch(`/appointments/${appointment._id}/cancel`);
      const updated = normalizeAppointment(response);

      if (updated && updated?._id) {
        setAppointment(updated);
      } else {
        setAppointment((prev) => ({
          ...prev,
          status: 'Cancelled',
        }));
      }

      Alert.alert(
        'Appointment Cancelled',
        'Your appointment has been cancelled successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const message =
        error?.message ||
        'Unable to cancel this appointment. Please try again.';

      setErrorMessage(message);
      Alert.alert('Cancellation Failed', message);
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!appointment?._id) {
      Alert.alert('Missing ID', 'Cannot download PDF because appointment ID is missing.');
      return;
    }

    try {
      setDownloading(true);

      const token = await authService.getToken();

      if (!token) {
        Alert.alert('Login Required', 'Please login again to download the appointment PDF.');
        return;
      }

      const safeAppointmentId =
        appointment?.appointmentId ||
        appointment?._id ||
        `appointment-${Date.now()}`;

      const fileName = `appointment-${safeAppointmentId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const downloadUrl = `${BASE_URL}/appointments/${appointment._id}/pdf`;

      const result = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (result?.status && result.status >= 400) {
        throw new Error(`PDF download failed with status ${result.status}`);
      }

      const info = await FileSystem.getInfoAsync(result.uri);

      if (!info.exists || info.size === 0) {
        throw new Error('PDF file was not created correctly.');
      }

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Appointment PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'PDF Downloaded',
          `The appointment PDF was saved to:\n${result.uri}`
        );
      }
    } catch (error) {
      const message =
        error?.message ||
        'Unable to download appointment PDF. Please try again.';

      Alert.alert('Download Failed', message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading appointment details...</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="calendar-clear-outline" size={42} color={C.primary} />
        </View>

        <Text style={styles.emptyTitle}>Appointment Not Found</Text>
        <Text style={styles.emptyText}>
          {errorMessage || 'This appointment could not be loaded.'}
        </Text>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
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

        <View style={styles.dateBox}>
          <Text style={styles.dateMonth}>{dateParts.month}</Text>
          <Text style={styles.dateDay}>{dateParts.day}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.heroSmall}>Appointment Details</Text>
          <Text style={styles.heroTitle}>
            {appointment?.appointmentId || 'Appointment'}
          </Text>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusStyle.bg,
                borderColor: statusStyle.border,
              },
            ]}
          >
            <Ionicons name={statusStyle.icon} size={13} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {status}
            </Text>
          </View>
        </View>
      </View>

      {!!errorMessage && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={19} color="#991B1B" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <DoctorCard />

      <SectionCard
        title="Appointment Information"
        subtitle="Main details about this appointment"
        icon="calendar-outline"
      >
        <DetailRow
          icon="finger-print-outline"
          label="Appointment ID"
          value={appointment?.appointmentId}
          iconColor="#7C3AED"
          iconBg="#EDE9FE"
        />

        <DetailRow
          icon="calendar-outline"
          label="Appointment Date"
          value={formatDate(appointment?.date)}
          iconColor={C.primary}
          iconBg={C.light || '#E0F2FE'}
        />

        <DetailRow
          icon={appointment?.session === 'Morning' ? 'sunny-outline' : 'moon-outline'}
          label="Session"
          value={`${appointment?.session || '—'} Session`}
          iconColor={appointment?.session === 'Morning' ? '#D97706' : '#0284C7'}
          iconBg={appointment?.session === 'Morning' ? '#FEF3C7' : '#E0F2FE'}
        />

        <DetailRow
          icon="time-outline"
          label="Estimated Time"
          value={formatTime(appointment?.estimatedTime)}
          iconColor="#059669"
          iconBg="#DCFCE7"
        />

       

        <DetailRow
          icon="pulse-outline"
          label="Status"
          value={status}
          iconColor={statusStyle.text}
          iconBg={statusStyle.bg}
        />
      </SectionCard>

      <SectionCard
        title="Patient Information"
        subtitle="Patient details linked with this appointment"
        icon="person-outline"
      >
        <DetailRow
          icon="person-outline"
          label="Patient Name"
          value={appointment?.patientName}
        />

        <DetailRow
          icon="card-outline"
          label="Patient ID"
          value={appointment?.patientId}
          iconColor="#2563EB"
          iconBg="#DBEAFE"
        />

        <DetailRow
          icon="calendar-number-outline"
          label="Booked On"
          value={formatCreatedAt(appointment?.createdAt)}
          iconColor="#64748B"
          iconBg="#F1F5F9"
        />
      </SectionCard>

      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Actions</Text>
        <Text style={styles.actionSubtitle}>
          Download your appointment record or cancel pending appointments.
        </Text>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.pdfButton,
            downloading && {
              opacity: 0.75,
            },
          ]}
          onPress={handleDownloadPdf}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.pdfButtonText}>Download Appointment PDF</Text>
            </>
          )}
        </TouchableOpacity>

        {canCancel ? (
          <TouchableOpacity
            activeOpacity={0.88}
            style={[
              styles.cancelAppointmentButton,
              cancelling && {
                opacity: 0.75,
              },
            ]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.cancelAppointmentButtonText}>
                  Cancel Appointment
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.disabledCancelBox}>
            <Ionicons name="information-circle-outline" size={19} color="#64748B" />
            <Text style={styles.disabledCancelText}>
              This appointment cannot be cancelled because its current status is {status}.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.backButtonOutline}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back-outline" size={19} color={C.primary} />
        <Text style={styles.backButtonOutlineText}>Back to Appointments</Text>
      </TouchableOpacity>

      <View style={styles.noteCard}>
        <Ionicons name="shield-checkmark-outline" size={22} color={C.primary} />
        <Text style={styles.noteText}>
          Appointment PDFs are generated by the backend using the official appointment record.
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

  center: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
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
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    fontWeight: '600',
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

  dateBox: {
    width: 64,
    height: 68,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  dateMonth: {
    color: '#DBEAFE',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  dateDay: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 1,
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

  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '900',
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

  sectionBody: {
    gap: 12,
  },

  detailRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  detailIconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
  },

  detailValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },

  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOW.sm,
  },

  actionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  actionSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 3,
    marginBottom: 14,
  },

  pdfButton: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOW.sm,
  },

  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  cancelAppointmentButton: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    ...SHADOW.sm,
  },

  cancelAppointmentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  disabledCancelBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
    flexDirection: 'row',
    gap: 9,
    marginTop: 10,
  },

  disabledCancelText: {
    color: '#64748B',
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  backButton: {
    backgroundColor: C.primary,
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginTop: 18,
  },

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  backButtonOutline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 14,
  },

  backButtonOutlineText: {
    color: C.primary,
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
  },

  noteText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '600',
  },
});