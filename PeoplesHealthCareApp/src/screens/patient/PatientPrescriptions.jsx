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

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'dispensed', label: 'Dispensed' },
];

const STATUS_STYLES = {
  pending: {
    label: 'Pending',
    bg: '#FFF7ED',
    text: '#C2410C',
    border: '#FED7AA',
    icon: 'time-outline',
  },
  in_progress: {
    label: 'In Progress',
    bg: '#EFF6FF',
    text: '#1D4ED8',
    border: '#BFDBFE',
    icon: 'construct-outline',
  },
  dispensed: {
    label: 'Dispensed',
    bg: '#ECFDF5',
    text: '#047857',
    border: '#A7F3D0',
    icon: 'checkmark-circle-outline',
  },
  cancelled: {
    label: 'Cancelled',
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#FECACA',
    icon: 'close-circle-outline',
  },
};

function extractPrescriptions(payload) {
  if (!payload) return [];

  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.prescriptions)) return data.prescriptions;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.prescriptions)) return data.data.prescriptions;

  return [];
}

function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.pending;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value) {
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

function StatCard({ label, value, icon, color, bg }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MedicationCard({ medication, index }) {
  return (
    <View style={styles.medCard}>
      <View style={styles.medNumber}>
        <Text style={styles.medNumberText}>{index + 1}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.medName}>
          {medication?.name || medication?.drugName || 'Medication'}
        </Text>

        <View style={styles.medMetaWrap}>
          {!!medication?.dosage && (
            <View style={styles.medChip}>
              <Text style={styles.medChipText}>Dosage: {medication.dosage}</Text>
            </View>
          )}

          {!!medication?.frequency && (
            <View style={styles.medChip}>
              <Text style={styles.medChipText}>Frequency: {medication.frequency}</Text>
            </View>
          )}

          {!!medication?.duration && (
            <View style={styles.medChip}>
              <Text style={styles.medChipText}>Duration: {medication.duration}</Text>
            </View>
          )}
        </View>

        {!!medication?.instructions && (
          <Text style={styles.medInstructions}>
            Note: {medication.instructions}
          </Text>
        )}
      </View>
    </View>
  );
}

function PrescriptionCard({
  prescription,
  expanded,
  onToggle,
  onDownload,
  downloading,
}) {
  const status = prescription?.pharmacyStatus || 'pending';
  const statusStyle = getStatusStyle(status);
  const medications = Array.isArray(prescription?.medications)
    ? prescription.medications
    : [];

  return (
    <View style={styles.prescriptionCard}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onToggle}
        style={styles.cardHeader}
      >
        <View style={styles.rxIcon}>
          <MaterialCommunityIcons name="pill" size={26} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.rxId}>
            {prescription?.prescriptionId || 'Prescription'}
          </Text>

          <Text style={styles.rxMeta} numberOfLines={2}>
            {formatDate(prescription?.createdAt)} · {prescription?.doctorName || 'Doctor'} · {medications.length} medication(s)
          </Text>

          {!!prescription?.appointmentId && (
            <View style={styles.appointmentChip}>
              <Ionicons name="calendar-outline" size={12} color="#64748B" />
              <Text style={styles.appointmentChipText}>
                {prescription.appointmentId}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
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
              {statusStyle.label}
            </Text>
          </View>

          <Ionicons
            name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={22}
            color="#94A3B8"
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.detailLine}>
            <Text style={styles.detailLabel}>Issued On</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(prescription?.createdAt)}
            </Text>
          </View>

          <View style={styles.detailLine}>
            <Text style={styles.detailLabel}>Doctor</Text>
            <Text style={styles.detailValue}>
              {prescription?.doctorName || '—'}
            </Text>
          </View>

          <View style={styles.detailLine}>
            <Text style={styles.detailLabel}>Patient</Text>
            <Text style={styles.detailValue}>
              {prescription?.patientName || '—'}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.subSectionTitle}>Medications</Text>

          {medications.length === 0 ? (
            <View style={styles.emptySmallBox}>
              <Ionicons name="medkit-outline" size={22} color="#94A3B8" />
              <Text style={styles.emptySmallText}>
                No medication items are available in this prescription.
              </Text>
            </View>
          ) : (
            medications.map((medication, index) => (
              <MedicationCard
                key={`${prescription?._id || prescription?.prescriptionId}-med-${index}`}
                medication={medication}
                index={index}
              />
            ))
          )}

          {!!prescription?.clinicalNotes && (
            <View style={styles.notesBox}>
              <View style={styles.notesHeader}>
                <Ionicons name="reader-outline" size={18} color="#92400E" />
                <Text style={styles.notesTitle}>Doctor&apos;s Notes</Text>
              </View>

              <Text style={styles.notesText}>{prescription.clinicalNotes}</Text>
            </View>
          )}

          {!!prescription?.labRequestRef && (
            <View style={styles.labBox}>
              <View style={styles.labIcon}>
                <MaterialCommunityIcons name="flask-outline" size={21} color="#047857" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.labTitle}>Lab Tests Requested</Text>
                <Text style={styles.labText}>
                  Lab Request Ref: {prescription.labRequestRef}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.88}
            style={[
              styles.downloadButton,
              downloading && {
                opacity: 0.75,
              },
            ]}
            onPress={onDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.downloadButtonText}>
                  Download Prescription PDF
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function EmptyState({ onRefresh }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBox}>
        <MaterialCommunityIcons name="pill-off" size={42} color={C.primary} />
      </View>

      <Text style={styles.emptyTitle}>No prescriptions found</Text>

      <Text style={styles.emptyText}>
        Your prescriptions will appear here after the doctor issues them.
      </Text>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onRefresh}
        style={styles.emptyButton}
      >
        <Ionicons name="refresh-outline" size={19} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPrescriptions = useCallback(async () => {
    try {
      setErrorMessage('');

      const response = await api.get('/prescriptions');
      const list = extractPrescriptions(response);

      const sorted = [...list].sort((a, b) => {
        const aTime = new Date(a?.createdAt || 0).getTime();
        const bTime = new Date(b?.createdAt || 0).getTime();
        return bTime - aTime;
      });

      setPrescriptions(sorted);
    } catch (error) {
      const message =
        error?.message ||
        'Unable to load prescriptions. Please try again.';

      setErrorMessage(message);
      console.log('Prescription load error:', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPrescriptions();
  };

  const filteredPrescriptions = useMemo(() => {
    if (selectedFilter === 'all') return prescriptions;

    return prescriptions.filter(
      (prescription) => prescription?.pharmacyStatus === selectedFilter
    );
  }, [prescriptions, selectedFilter]);

  const stats = useMemo(() => {
    return {
      total: prescriptions.length,
      pending: prescriptions.filter((item) => item?.pharmacyStatus === 'pending').length,
      inProgress: prescriptions.filter((item) => item?.pharmacyStatus === 'in_progress').length,
      dispensed: prescriptions.filter((item) => item?.pharmacyStatus === 'dispensed').length,
    };
  }, [prescriptions]);

  const handleDownloadPdf = async (prescription) => {
    const id = prescription?._id;

    if (!id) {
      Alert.alert('Missing ID', 'Cannot download PDF because prescription ID is missing.');
      return;
    }

    try {
      setDownloadingId(id);

      const token = await authService.getToken();

      if (!token) {
        Alert.alert('Login Required', 'Please login again to download the prescription PDF.');
        return;
      }

      const safePrescriptionId =
        prescription?.prescriptionId ||
        prescription?._id ||
        `prescription-${Date.now()}`;

      const fileName = `prescription-${safePrescriptionId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const downloadUrl = `${BASE_URL}/prescriptions/${id}/pdf`;

      const result = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (result?.status && result.status >= 400) {
        throw new Error(`PDF download failed with status ${result.status}`);
      }

      const fileInfo = await FileSystem.getInfoAsync(result.uri);

      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('PDF file was not created correctly.');
      }

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Prescription PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'PDF Downloaded',
          `The prescription PDF was saved to:\n${result.uri}`
        );
      }
    } catch (error) {
      const message =
        error?.message ||
        'Unable to download prescription PDF. Please try again.';

      Alert.alert('Download Failed', message);
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleExpanded = (prescription) => {
    const id = prescription?._id || prescription?.prescriptionId;

    setExpandedId((current) => (current === id ? null : id));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading prescriptions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={filteredPrescriptions}
        keyExtractor={(item, index) => item?._id || item?.prescriptionId || String(index)}
        renderItem={({ item }) => {
          const id = item?._id || item?.prescriptionId;

          return (
            <PrescriptionCard
              prescription={item}
              expanded={expandedId === id}
              onToggle={() => toggleExpanded(item)}
              onDownload={() => handleDownloadPdf(item)}
              downloading={downloadingId === item?._id}
            />
          );
        }}
        contentContainerStyle={[
          styles.listContent,
          filteredPrescriptions.length === 0 && {
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
                <MaterialCommunityIcons name="pill" size={31} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroSmall}>Patient Prescriptions</Text>
                <Text style={styles.heroTitle}>My Prescriptions</Text>
                <Text style={styles.heroSub}>
                  View prescriptions issued by your doctor and download official PDFs.
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatCard
                label="Total"
                value={stats.total}
                icon="documents-outline"
                color={C.primary}
                bg={C.light || '#E0F2FE'}
              />

              <StatCard
                label="Pending"
                value={stats.pending}
                icon="time-outline"
                color="#C2410C"
                bg="#FFF7ED"
              />

              <StatCard
                label="Dispensed"
                value={stats.dispensed}
                icon="checkmark-done-outline"
                color="#047857"
                bg="#ECFDF5"
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
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <FilterButton
                  label={item.label}
                  active={selectedFilter === item.key}
                  onPress={() => setSelectedFilter(item.key)}
                />
              )}
              style={styles.filterList}
            />

            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>
                {selectedFilter === 'all'
                  ? 'All Prescriptions'
                  : `${FILTERS.find((item) => item.key === selectedFilter)?.label} Prescriptions`}
              </Text>

              <Text style={styles.sectionCount}>
                {filteredPrescriptions.length}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState onRefresh={onRefresh} />}
      />
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

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 13,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOW.sm,
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statValue: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
  },

  statLabel: {
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

  prescriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    ...SHADOW.sm,
  },

  cardHeader: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  rxIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rxId: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  rxMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
    lineHeight: 17,
  },

  appointmentChip: {
    alignSelf: 'flex-start',
    marginTop: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  appointmentChipText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
  },

  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
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

  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 15,
    gap: 12,
  },

  detailLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  detailLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },

  detailValue: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },

  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },

  subSectionTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  medCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    gap: 12,
  },

  medNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  medNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  medName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  medMetaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },

  medChip: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  medChipText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '900',
  },

  medInstructions: {
    color: '#1D4ED8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 8,
  },

  notesBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 13,
  },

  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },

  notesTitle: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '900',
  },

  notesText: {
    color: '#78350F',
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '600',
  },

  labBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  labIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  labTitle: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '900',
  },

  labText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  downloadButton: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOW.sm,
  },

  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
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
});