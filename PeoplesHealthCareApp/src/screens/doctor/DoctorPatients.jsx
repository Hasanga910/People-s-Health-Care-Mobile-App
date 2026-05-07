import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl,
  Platform, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}
function calcAge(birthday) {
  if (!birthday) return null;
  return Math.floor((Date.now() - new Date(birthday)) / (365.25 * 24 * 60 * 60 * 1000));
}
function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const RX_STATUS = {
  pending:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: 'Pending'     },
  in_progress: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'In Progress' },
  dispensed:   { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Dispensed'   },
  cancelled:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', label: 'Cancelled'   },
};

const LR_STATUS = {
  pending:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: 'Pending'        },
  in_progress: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'In Progress'    },
  completed:   { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Completed'      },
  cancelled:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', label: 'Cancelled'      },
};

const LAB_RESULT_STATUS = {
  payment_pending: { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', label: 'Payment Pending' },
  pre_check:       { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', label: 'Pre-Check'       },
  sample_received: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'Sample Received' },
  in_progress:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: 'In Progress'     },
  completed:       { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Completed'        },
};

const LAB_DESCRIPTIONS = {
  'FBC':               'Full Blood Count — red/white cells, platelets',
  'ESR':               'Erythrocyte Sedimentation Rate — inflammation marker',
  'FBS':               'Fasting Blood Sugar — diabetes & glucose screening',
  'Liver Profile':     'Liver function enzymes and bilirubin panel',
  'Renal Profile':     'Kidney function and electrolytes panel',
  'Thyroid Profile':   'TSH, fT3, fT4 thyroid hormone levels',
  'Serum Vit D Level': 'Vitamin D concentration in blood',
  'Dengue Ag':         'Dengue NS1 antigen and IgM/IgG antibodies',
};

// ─────────────────────────────────────────────────────────────
// LAB REQUEST DETAIL MODAL
// ─────────────────────────────────────────────────────────────
function LabRequestDetailModal({ lrId, onClose }) {
  const navigation = useNavigation();
  const [lr, setLr]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get(`/lab-requests/${lrId}`)
      .then(res => setLr(res.data.labRequest))
      .catch(() => setError('Could not load lab request.'))
      .finally(() => setLoading(false));
  }, [lrId]);

  const sc = LR_STATUS[lr?.status] ?? LR_STATUS.pending;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sub.overlay} onPress={onClose}>
        <View style={sub.sheet} onStartShouldSetResponder={() => true}>
          <LinearGradient colors={['#6D28D9', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sub.header}>
            <View>
              <Text style={sub.headerLabel}>Lab Request</Text>
              <Text style={sub.headerMono}>{lrId}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sub.closeBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={sub.body} showsVerticalScrollIndicator={false}>
            {loading && <View style={sub.center}><ActivityIndicator color="#6D28D9" /><Text style={sub.loadingText}>Loading…</Text></View>}
            {!!error && <View style={sub.errorBox}><Text style={sub.errorText}>{error}</Text></View>}
            {lr && (
              <>
                <View style={sub.patientRow}>
                  <View>
                    <Text style={sub.metaLabel}>Patient</Text>
                    <Text style={sub.metaValue}>{lr.patientName}</Text>
                  </View>
                  <View style={[sub.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <Text style={[sub.statusText, { color: sc.text }]}>{sc.label}</Text>
                  </View>
                </View>

                <View style={sub.infoGrid}>
                  <View style={sub.infoCell}>
                    <Text style={sub.infoCellLabel}>Requested</Text>
                    <Text style={sub.infoCellValue}>{fmt(lr.createdAt)}</Text>
                  </View>
                  <View style={[sub.infoCell, { backgroundColor: lr.priority === 'Urgent' ? '#FEF2F2' : '#F0FDF4' }]}>
                    <Text style={sub.infoCellLabel}>Priority</Text>
                    <Text style={[sub.infoCellValue, { color: lr.priority === 'Urgent' ? '#DC2626' : '#15803D', fontWeight: '700' }]}>
                      {lr.priority === 'Urgent' ? '🔴 Urgent' : '🟢 Routine'}
                    </Text>
                  </View>
                </View>

                {lr.tests?.length > 0 && (
                  <View style={sub.section}>
                    <Text style={sub.sectionTitle}>🧪 Tests Requested</Text>
                    <View style={[sub.sectionCard, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {lr.tests.map((t, i) => (
                          <View key={i} style={[sub.testChip, t.isOther && { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                            <Text style={[sub.testChipText, t.isOther && { color: '#B45309' }]}>
                              {t.isOther ? `★ ${t.name}` : t.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {lr.clinicalNotes && (
                  <View style={sub.section}>
                    <Text style={sub.sectionTitle}>Clinical Notes</Text>
                    <View style={sub.notesBox}>
                      <Text style={sub.notesText}>{lr.clinicalNotes}</Text>
                    </View>
                  </View>
                )}

                {lr.prescriptionRef && (
                  <TouchableOpacity
                    style={sub.linkedRow}
                    onPress={() => {
                      onClose();
                      navigation.navigate('DoctorRx', { openId: lr.prescriptionRef });
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="document-text-outline" size={14} color="#1D4ED8" />
                    <Text style={sub.linkedLabel}>Linked Prescription:</Text>
                    <Text style={sub.linkedMono}>{lr.prescriptionRef}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// PRESCRIPTION DETAIL MODAL
// ─────────────────────────────────────────────────────────────
function PrescriptionDetailModal({ rxId, onClose }) {
  const navigation = useNavigation();
  const [rx, setRx]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get(`/prescriptions/${rxId}`)
      .then(res => setRx(res.data.prescription))
      .catch(() => setError('Could not load prescription.'))
      .finally(() => setLoading(false));
  }, [rxId]);

  const sc = RX_STATUS[rx?.pharmacyStatus] ?? RX_STATUS.pending;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sub.overlay} onPress={onClose}>
        <View style={sub.sheet} onStartShouldSetResponder={() => true}>
          <LinearGradient colors={['#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sub.header}>
            <View>
              <Text style={sub.headerLabel}>Prescription</Text>
              <Text style={sub.headerMono}>{rxId}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sub.closeBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={sub.body} showsVerticalScrollIndicator={false}>
            {loading && <View style={sub.center}><ActivityIndicator color="#1565C0" /><Text style={sub.loadingText}>Loading…</Text></View>}
            {!!error && <View style={sub.errorBox}><Text style={sub.errorText}>{error}</Text></View>}
            {rx && (
              <>
                <View style={sub.patientRow}>
                  <View>
                    <Text style={sub.metaLabel}>Patient</Text>
                    <Text style={sub.metaValue}>{rx.patientName}</Text>
                  </View>
                  <View style={[sub.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <Text style={[sub.statusText, { color: sc.text }]}>{sc.label}</Text>
                  </View>
                </View>

                <View style={sub.infoGrid}>
                  <View style={sub.infoCell}>
                    <Text style={sub.infoCellLabel}>Issued</Text>
                    <Text style={sub.infoCellValue}>{fmt(rx.createdAt)}</Text>
                  </View>
                  {rx.dispensedAt && (
                    <View style={[sub.infoCell, { backgroundColor: '#F0FDF4' }]}>
                      <Text style={[sub.infoCellLabel, { color: '#15803D' }]}>Dispensed</Text>
                      <Text style={[sub.infoCellValue, { color: '#15803D' }]}>{fmt(rx.dispensedAt)}</Text>
                    </View>
                  )}
                </View>

                {rx.medications?.length > 0 && (
                  <View style={sub.section}>
                    <Text style={sub.sectionTitle}>💊 Medications</Text>
                    <View style={[sub.sectionCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                      {rx.medications.map((med, i) => (
                        <View key={i} style={[sub.medRow, i < rx.medications.length - 1 && sub.medRowBorder]}>
                          <View style={sub.medNum}>
                            <Text style={sub.medNumText}>{i + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={sub.medName}>{med.name} <Text style={sub.medDosage}>{med.dosage}</Text></Text>
                            <Text style={sub.medDetail}>{med.frequency} · {med.duration}</Text>
                            {med.instructions && <Text style={sub.medInstructions}>{med.instructions}</Text>}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {rx.clinicalNotes && (
                  <View style={sub.section}>
                    <Text style={sub.sectionTitle}>Clinical Notes</Text>
                    <View style={sub.notesBox}>
                      <Text style={sub.notesText}>{rx.clinicalNotes}</Text>
                    </View>
                  </View>
                )}

                {rx.labRequestRef && (
                  <TouchableOpacity
                    style={sub.linkedRow}
                    onPress={() => {
                      onClose();
                      navigation.navigate('DoctorLab', { initialTab: 'requests', openRequestId: rx.labRequestRef });
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="flask-outline" size={14} color="#6D28D9" />
                    <Text style={[sub.linkedLabel, { color: '#6D28D9' }]}>Linked Lab Request:</Text>
                    <Text style={[sub.linkedMono, { color: '#6D28D9' }]}>{rx.labRequestRef}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// Shared sub-modal styles
const sub = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', overflow: 'hidden' },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },
  headerLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  headerMono:  { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18 },
  center: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  loadingText: { color: '#94A3B8', fontSize: 13 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14 },
  errorText: { color: '#DC2626', fontSize: 13 },
  patientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  metaLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8 },
  metaValue: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  statusText:  { fontSize: 11, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  infoCell: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  infoCellLabel: { fontSize: 10, color: '#94A3B8', marginBottom: 3 },
  infoCellValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  section:      { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  sectionCard:  { borderRadius: 14, borderWidth: 1, padding: 12 },
  testChip: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#DDD6FE', paddingHorizontal: 10, paddingVertical: 5 },
  testChipText: { fontSize: 12, fontWeight: '500', color: '#6D28D9' },
  notesBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  notesText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  linkedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  linkedLabel: { fontSize: 12, fontWeight: '500', color: '#1D4ED8' },
  linkedMono:  { fontSize: 12, fontWeight: '700', color: '#1D4ED8', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  medRow:   { flexDirection: 'row', gap: 10, paddingVertical: 10, alignItems: 'flex-start' },
  medRowBorder: { borderBottomWidth: 1, borderBottomColor: '#BFDBFE' },
  medNum:   { width: 26, height: 26, borderRadius: 8, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  medNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  medName:   { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  medDosage: { fontWeight: '400', color: '#64748B' },
  medDetail: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  medInstructions: { fontSize: 11, color: '#1565C0', marginTop: 2, fontStyle: 'italic' },
});

// ─────────────────────────────────────────────────────────────
// PATIENT MODAL — 4-tab full detail view
// ─────────────────────────────────────────────────────────────
function PatientModal({ patient, onClose }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab]         = useState('overview');
  const [prescriptions, setPrescriptions] = useState([]);
  const [labResults,    setLabResults]    = useState([]);
  const [loadingRx,  setLoadingRx]        = useState(false);
  const [loadingLab, setLoadingLab]       = useState(false);
  const [selectedRx, setSelectedRx]       = useState(null);
  const [selectedLr, setSelectedLr]       = useState(null);
  const [selectedLabResult, setSelectedLabResult] = useState(null);

  const pd  = patient.patientDetails || {};
  const age = calcAge(pd.birthday);

  useEffect(() => {
    if (activeTab === 'prescriptions') {
      setLoadingRx(true);
      api.get(`/prescriptions?patientId=${patient.userId}`)
        .then(res => setPrescriptions(res.data.prescriptions || []))
        .catch(() => setPrescriptions([]))
        .finally(() => setLoadingRx(false));
    }
    if (activeTab === 'labresults') {
      setLoadingLab(true);
      api.get(`/lab-results?patientId=${patient.userId}`)
        .then(res => setLabResults(res.data.results || []))
        .catch(() => setLabResults([]))
        .finally(() => setLoadingLab(false));
    }
  }, [activeTab, patient.userId]);

  const TABS = [
    { id: 'overview',      label: 'Overview',       icon: 'person-outline' },
    { id: 'prescriptions', label: 'Prescriptions',  icon: 'document-text-outline' },
    { id: 'labresults',    label: 'Lab Results',    icon: 'flask-outline' },
    { id: 'vitals',        label: 'Vitals',         icon: 'heart-outline' },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      {selectedRx        && <PrescriptionDetailModal rxId={selectedRx}                onClose={() => setSelectedRx(null)} />}
      {selectedLr        && <LabRequestDetailModal   lrId={selectedLr}                onClose={() => setSelectedLr(null)} />}
      {selectedLabResult && <LabResultQuickView result={selectedLabResult}             onClose={() => setSelectedLabResult(null)} patientName={patient.name} />}

      <Pressable style={pm.overlay} onPress={onClose}>
        <View style={[pm.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]} onStartShouldSetResponder={() => true}>

          {/* Header with gradient */}
          <LinearGradient colors={['#0D2137', '#1565C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pm.header}>
            <View style={pm.headerTop}>
              <LinearGradient colors={['#1565C0', '#00ACC1']} style={pm.avatarCircle}>
                <Text style={pm.avatarText}>{getInitials(patient.name)}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={pm.patientName}>{patient.name}</Text>
                <Text style={pm.patientMeta}>
                  {patient.userId}{age ? ` · Age ${age}` : ''}{pd.gender ? ` · ${pd.gender}` : ''}{pd.bloodGroup ? ` · ${pd.bloodGroup}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Tab bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pm.tabBar}>
              {TABS.map(tab => (
                <TouchableOpacity key={tab.id} style={pm.tabBtn} onPress={() => setActiveTab(tab.id)} activeOpacity={0.8}>
                  <Ionicons name={tab.icon} size={14} color={activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.45)'} />
                  <Text style={[pm.tabBtnText, activeTab === tab.id && pm.tabBtnTextActive]}>{tab.label}</Text>
                  {activeTab === tab.id && <View style={pm.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </LinearGradient>

          <ScrollView style={pm.body} showsVerticalScrollIndicator={false} contentContainerStyle={pm.bodyContent}>

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <>
                <View style={pm.overviewGrid}>
                  {/* Personal info */}
                  <View style={pm.infoCard}>
                    <Text style={pm.infoCardTitle}>Personal Info</Text>
                    {[
                      { label: 'Phone',      val: patient.telephone || '—' },
                      { label: 'Email',      val: patient.email || '—' },
                      { label: 'DOB',        val: pd.birthday ? fmt(pd.birthday) : '—' },
                      { label: 'Address',    val: pd.address || '—' },
                      { label: 'Registered', val: fmt(patient.createdAt) },
                    ].map(item => (
                      <View key={item.label} style={pm.infoRow}>
                        <Text style={pm.infoRowLabel}>{item.label}</Text>
                        <Text style={pm.infoRowVal} numberOfLines={1}>{item.val}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Conditions + Allergies */}
                  <View style={{ gap: 10 }}>
                    <View style={pm.conditionsCard}>
                      <Text style={pm.conditionsTitle}>Active Conditions</Text>
                      {pd.chronicConditions
                        ? pd.chronicConditions.split(',').map(c => (
                            <View key={c} style={pm.conditionRow}>
                              <View style={pm.conditionDot} />
                              <Text style={pm.conditionText}>{c.trim()}</Text>
                            </View>
                          ))
                        : <Text style={pm.noneText}>None recorded</Text>
                      }
                    </View>

                    <View style={pm.allergiesCard}>
                      <Text style={pm.allergiesTitle}>Allergies</Text>
                      {pd.allergies?.length > 0
                        ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                            {pd.allergies.map(a => (
                              <View key={a} style={pm.allergyChip}>
                                <Text style={pm.allergyChipText}>⚠️ {a}</Text>
                              </View>
                            ))}
                          </View>
                        )
                        : <Text style={pm.noneText}>None known</Text>
                      }
                    </View>
                  </View>
                </View>

                {pd.currentMedications && (
                  <View style={pm.currentMedsCard}>
                    <Text style={pm.currentMedsTitle}>Current Medications</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {pd.currentMedications.split(',').map(m => (
                        <View key={m} style={pm.medChip}>
                          <Text style={pm.medChipText}>💊 {m.trim()}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {pd.emergencyContactName && (
                  <View style={pm.emergencyCard}>
                    <Ionicons name="call-outline" size={14} color="#475569" />
                    <View>
                      <Text style={pm.emergencyName}>{pd.emergencyContactName}</Text>
                      {pd.emergencyContactNumber && <Text style={pm.emergencyNum}>{pd.emergencyContactNumber}</Text>}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* ── PRESCRIPTIONS ── */}
            {activeTab === 'prescriptions' && (
              loadingRx ? (
                <View style={pm.center}><ActivityIndicator color="#1565C0" /><Text style={pm.loadingText}>Loading prescriptions…</Text></View>
              ) : prescriptions.length === 0 ? (
                <View style={pm.center}>
                  <Ionicons name="document-text-outline" size={40} color="#CBD5E1" />
                  <Text style={pm.emptyTitle}>No prescriptions found</Text>
                  <Text style={pm.emptySub}>No prescriptions have been issued for this patient yet.</Text>
                </View>
              ) : (
                prescriptions.map(rx => {
                  const sc = RX_STATUS[rx.pharmacyStatus] ?? RX_STATUS.pending;
                  const d  = new Date(rx.createdAt);
                  return (
                    <View key={rx._id} style={pm.rxCard}>
                      <LinearGradient colors={['#1565C0', '#00ACC1']} style={pm.rxDateBox}>
                        <Text style={pm.rxDateMon}>{d.toLocaleDateString('en-GB', { month: 'short' })}</Text>
                        <Text style={pm.rxDateDay}>{d.getDate()}</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <View style={pm.rxTopRow}>
                          <TouchableOpacity
                            onPress={() => {
                              onClose();
                              navigation.navigate('DoctorRx', { openId: rx.prescriptionId || rx._id });
                            }}
                          >
                            <Text style={pm.rxId}>{rx.prescriptionId} →</Text>
                          </TouchableOpacity>
                          <View style={[pm.rxStatusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                            <Text style={[pm.rxStatusText, { color: sc.text }]}>{sc.label}</Text>
                          </View>
                        </View>
                        {rx.medications?.length > 0 && (
                          <Text style={pm.rxMeds} numberOfLines={2}>
                            💊 {rx.medications.map(m => `${m.name} ${m.dosage}`).join(', ')}
                          </Text>
                        )}
                        {rx.clinicalNotes && <Text style={pm.rxNotes} numberOfLines={1}>{rx.clinicalNotes}</Text>}
                        {rx.labRequestRef && (
                          <TouchableOpacity
                            onPress={() => {
                              onClose();
                              navigation.navigate('DoctorLab', { initialTab: 'requests', openRequestId: rx.labRequestRef });
                            }}
                          >
                            <Text style={pm.rxLabLink}>🧪 {rx.labRequestRef} →</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )
            )}

            {/* ── LAB RESULTS ── */}
            {activeTab === 'labresults' && (
              loadingLab ? (
                <View style={pm.center}><ActivityIndicator color="#1565C0" /><Text style={pm.loadingText}>Loading lab results…</Text></View>
              ) : labResults.length === 0 ? (
                <View style={pm.center}>
                  <Ionicons name="flask-outline" size={40} color="#CBD5E1" />
                  <Text style={pm.emptyTitle}>No lab results found</Text>
                  <Text style={pm.emptySub}>No lab tests on record for this patient.</Text>
                </View>
              ) : (
                labResults.map(lr => {
                  const sc        = LAB_RESULT_STATUS[lr.status] ?? LAB_RESULT_STATUS.in_progress;
                  const isComp    = lr.status === 'completed';
                  const flagged   = lr.results?.parameters?.some(p => ['High','Low','Positive','Reactive'].includes(p.flag));
                  const abnParams = lr.results?.parameters?.filter(p => ['High','Low','Positive','Reactive'].includes(p.flag)) || [];
                  const desc      = LAB_DESCRIPTIONS[lr.testName] || 'Laboratory diagnostic test';
                  const d         = lr.completedAt ? new Date(lr.completedAt) : null;

                  return (
                    <View key={lr._id} style={[pm.labCard, flagged && { borderColor: '#FECACA' }]}>
                      <View style={pm.labCardTop}>
                        <LinearGradient
                          colors={flagged ? ['#DC2626', '#EF4444'] : isComp ? ['#1565C0', '#00ACC1'] : ['#475569', '#64748B']}
                          style={pm.labDateBox}
                        >
                          <Text style={pm.labDateMon}>{d ? d.toLocaleDateString('en-GB', { month: 'short' }) : '—'}</Text>
                          <Text style={pm.labDateDay}>{d ? d.getDate() : '·'}</Text>
                        </LinearGradient>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={pm.labTestName}>🧪 {lr.testName}</Text>
                            {flagged && <View style={pm.abnBadge}><Text style={pm.abnBadgeText}>⚠️ Abnormal</Text></View>}
                          </View>
                          <Text style={pm.labDesc}>{desc}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            <View style={pm.testIdChip}><Text style={pm.testIdText}>{lr.testId}</Text></View>
                            {lr.labRequestRef && (
                              <TouchableOpacity
                                onPress={() => {
                                  onClose();
                                  navigation.navigate('DoctorLab', { initialTab: 'requests', openRequestId: lr.labRequestRef });
                                }}
                              >
                                <Text style={pm.labRefText}>{lr.labRequestRef} →</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          {flagged && abnParams.slice(0, 2).map((p, i) => (
                            <Text key={i} style={pm.abnParam}>{p.name}: {p.value} {p.unit} ({p.flag})</Text>
                          ))}
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <View style={[pm.labStatusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                            <Text style={[pm.labStatusText, { color: sc.text }]}>{sc.label}</Text>
                          </View>
                          {isComp && (
                            <TouchableOpacity style={pm.viewBtn} onPress={() => setSelectedLabResult(lr)} activeOpacity={0.8}>
                              <Text style={pm.viewBtnText}>View →</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )
            )}

            {/* ── VITALS ── */}
            {activeTab === 'vitals' && (
              <View style={pm.vitalsGrid}>
                {[
                  { label: 'Blood Group',   val: pd.bloodGroup || '—',                icon: 'water-outline',    color: '#DC2626', bg: '#FEF2F2' },
                  { label: 'Age',           val: age ? `${age} yrs` : '—',            icon: 'calendar-outline', color: '#1565C0', bg: '#EFF6FF' },
                  { label: 'Gender',        val: pd.gender || '—',                    icon: 'person-outline',   color: '#7C3AED', bg: '#F5F3FF' },
                  { label: 'Emergency Tel', val: pd.emergencyContactNumber || '—',    icon: 'call-outline',     color: '#15803D', bg: '#F0FDF4' },
                ].map(v => (
                  <View key={v.label} style={pm.vitalCard}>
                    <View style={[pm.vitalIcon, { backgroundColor: v.bg }]}>
                      <Ionicons name={v.icon} size={18} color={v.color} />
                    </View>
                    <Text style={pm.vitalLabel}>{v.label}</Text>
                    <Text style={[pm.vitalVal, { color: v.color }]}>{v.val}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── ACTION BUTTONS ── */}
            <View style={pm.actions}>
              <TouchableOpacity
                style={pm.actionPrimary}
                onPress={() => {
                  onClose();
                  navigation.navigate('DoctorRx', {
                    prefill: {
                      patientName: patient.name || '',
                      patientId: patient.userId || '',
                      appointmentId: '',
                    },
                  });
                }}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pm.actionGrad}>
                  <Ionicons name="document-text-outline" size={16} color="#fff" />
                  <Text style={pm.actionPrimaryText}>New Prescription</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={pm.actionSecondary}
                onPress={() => {
                  onClose();
                  navigation.navigate('DoctorLab', { initialTab: 'requests', newRequest: true });
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="flask-outline" size={16} color="#1565C0" />
                <Text style={pm.actionSecondaryText}>Request Lab Test</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// LAB RESULT QUICK VIEW (inline in patient modal)
// ─────────────────────────────────────────────────────────────
function LabResultQuickView({ result, onClose, patientName }) {
  const navigation = useNavigation();
  const flagColors = {
    High:     { bg: '#FEF2F2', text: '#DC2626' },
    Low:      { bg: '#EFF6FF', text: '#1D4ED8' },
    Positive: { bg: '#FEF2F2', text: '#DC2626' },
    Reactive: { bg: '#FFF7ED', text: '#C2410C' },
    Normal:   { bg: '#F0FDF4', text: '#15803D' },
    Negative: { bg: '#F0FDF4', text: '#15803D' },
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={lrv.overlay} onPress={onClose}>
        <View style={lrv.sheet} onStartShouldSetResponder={() => true}>
          <LinearGradient colors={['#0D2137', '#1565C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={lrv.header}>
            <View>
              <Text style={lrv.headerLabel}>Lab Result</Text>
              <Text style={lrv.headerTitle}>{result.testName}</Text>
              <Text style={lrv.headerMono}>{result.testId}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={lrv.closeBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            <View style={lrv.infoGrid}>
              <View style={lrv.infoCell}>
                <Text style={lrv.infoCellLabel}>Lab Request</Text>
                {result.labRequestRef ? (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      navigation.navigate('DoctorLab', { initialTab: 'requests', openRequestId: result.labRequestRef });
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[lrv.infoCellMono, { color: '#1D4ED8', textDecorationLine: 'underline' }]}>{result.labRequestRef}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={lrv.infoCellMono}>—</Text>
                )}
              </View>
              <View style={lrv.infoCell}>
                <Text style={lrv.infoCellLabel}>Completed</Text>
                <Text style={lrv.infoCellValue}>{result.completedAt ? new Date(result.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</Text>
              </View>
            </View>

            {result.results?.parameters?.length > 0 && (
              <>
                <Text style={lrv.sectionTitle}>Parameters</Text>
                <View style={lrv.tableCard}>
                  <View style={lrv.tableHeader}>
                    {['Parameter', 'Result', 'Flag'].map(h => (
                      <Text key={h} style={lrv.tableHeaderCell}>{h}</Text>
                    ))}
                  </View>
                  {result.results.parameters.map((p, i) => {
                    const abn = ['High','Low','Positive','Reactive'].includes(p.flag);
                    const fc  = flagColors[p.flag] || { bg: '#F8FAFC', text: '#64748B' };
                    return (
                      <View key={i} style={[lrv.tableRow, abn && { backgroundColor: '#FEF2F2' }, i % 2 === 0 && !abn && { backgroundColor: '#F9FAFB' }]}>
                        <Text style={lrv.tableCell}>{p.name}</Text>
                        <Text style={[lrv.tableCell, { fontWeight: '700', color: abn ? '#DC2626' : '#0F172A' }]}>{p.value || '—'} {p.unit}</Text>
                        <View style={lrv.tableCell}>
                          {p.flag ? (
                            <View style={[lrv.flagBadge, { backgroundColor: fc.bg }]}>
                              <Text style={[lrv.flagText, { color: fc.text }]}>{p.flag}</Text>
                            </View>
                          ) : <Text style={{ fontSize: 11, color: '#94A3B8' }}>—</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {result.results?.labNotes && (
              <View style={lrv.notesBox}>
                <Text style={lrv.notesText}>{result.results.labNotes}</Text>
              </View>
            )}

            <TouchableOpacity style={lrv.closeFullBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={lrv.closeFullBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const lrv = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', overflow: 'hidden' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 18 },
  headerLabel:{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 },
  headerTitle:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  headerMono: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', marginTop: 3 },
  closeBtn:   { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  infoGrid:   { flexDirection: 'row', gap: 8, marginBottom: 14 },
  infoCell:   { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  infoCellLabel: { fontSize: 10, color: '#94A3B8', marginBottom: 3 },
  infoCellValue: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  infoCellMono:  { fontSize: 12, fontWeight: '600', color: '#0F172A', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  tableCard:     { borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', marginBottom: 12 },
  tableHeader:   { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 8 },
  tableHeaderCell: { flex: 1, paddingHorizontal: 8, fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  tableRow:      { flexDirection: 'row', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  tableCell:     { flex: 1, paddingHorizontal: 8, fontSize: 11, color: '#374151' },
  flagBadge:     { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  flagText:      { fontSize: 10, fontWeight: '700' },
  notesBox:      { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 12 },
  notesText:     { fontSize: 12, color: '#374151', lineHeight: 18 },
  closeFullBtn:  { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 16 },
  closeFullBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { height: '88%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  header:  {},
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 },
  avatarCircle: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  patientName: { color: '#fff', fontSize: 17, fontWeight: '800' },
  patientMeta: { color: 'rgba(255,255,255,0.62)', fontSize: 11, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tabBar:  { paddingHorizontal: 14, paddingBottom: 0, gap: 2 },
  tabBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 11, position: 'relative' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.52)' },
  tabBtnTextActive: { color: '#fff', fontWeight: '700' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 14, right: 14, height: 2, backgroundColor: '#67E8F9', borderRadius: 1 },
  body: { flex: 1, backgroundColor: '#fff' },
  bodyContent: { padding: 16, paddingBottom: 28 },

  // Overview
  overviewGrid:    { gap: 10, marginBottom: 12 },
  infoCard:        { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  infoCardTitle:   { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  infoRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  infoRowLabel:    { fontSize: 11, color: '#94A3B8', flexShrink: 0 },
  infoRowVal:      { fontSize: 11, fontWeight: '600', color: '#374151', flex: 1, textAlign: 'right' },
  conditionsCard:  { flex: 1, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  conditionsTitle: { fontSize: 10, fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  conditionRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  conditionDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', flexShrink: 0 },
  conditionText:   { fontSize: 12, color: '#991B1B' },
  noneText:        { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  allergiesCard:   { flex: 1, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  allergiesTitle:  { fontSize: 10, fontWeight: '700', color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.8 },
  allergyChip:     { backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FDE68A' },
  allergyChipText: { fontSize: 11, color: '#92400E', fontWeight: '500' },
  currentMedsCard: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 10 },
  currentMedsTitle:{ fontSize: 10, fontWeight: '700', color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: 0.8 },
  medChip:         { backgroundColor: '#DBEAFE', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  medChipText:     { fontSize: 11, color: '#1D4ED8' },
  emergencyCard:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 10 },
  emergencyName:   { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  emergencyNum:    { fontSize: 12, color: '#64748B', marginTop: 2 },

  // Prescriptions
  center:      { alignItems: 'center', paddingVertical: 40, gap: 8 },
  loadingText: { color: '#94A3B8', fontSize: 13 },
  emptyTitle:  { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 },
  emptySub:    { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
  rxCard:      { flexDirection: 'row', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 10 },
  rxDateBox:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rxDateMon:   { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 12 },
  rxDateDay:   { color: '#fff', fontSize: 16, fontWeight: '800', lineHeight: 20 },
  rxTopRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  rxId:        { fontSize: 12, fontWeight: '700', color: '#1D4ED8', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  rxStatusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  rxStatusText:  { fontSize: 10, fontWeight: '700' },
  rxMeds:      { fontSize: 12, color: '#374151', lineHeight: 18 },
  rxNotes:     { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginTop: 2 },
  rxLabLink:   { fontSize: 11, fontWeight: '700', color: '#7C3AED', marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },

  // Lab results
  labCard:       { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  labCardTop:    { flexDirection: 'row', gap: 12, padding: 12 },
  labDateBox:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  labDateMon:    { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 12 },
  labDateDay:    { color: '#fff', fontSize: 16, fontWeight: '800', lineHeight: 20 },
  labTestName:   { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  labDesc:       { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  testIdChip:    { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  testIdText:    { fontSize: 10, color: '#64748B', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  labRefText:    { fontSize: 10, color: '#7C3AED', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  abnBadge:      { backgroundColor: '#FEF2F2', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FECACA' },
  abnBadgeText:  { fontSize: 9, fontWeight: '700', color: '#DC2626' },
  abnParam:      { fontSize: 11, color: '#DC2626', marginTop: 3 },
  labStatusBadge:{ borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  labStatusText: { fontSize: 10, fontWeight: '700' },
  viewBtn:       { backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  viewBtnText:   { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },

  // Vitals
  vitalsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  vitalCard:   { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  vitalIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  vitalLabel:  { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  vitalVal:    { fontSize: 18, fontWeight: '800' },

  // Actions
  actions:         { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionPrimary:   { flex: 1, borderRadius: 14, overflow: 'hidden' },
  actionGrad:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  actionPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 14, paddingVertical: 14 },
  actionSecondaryText: { color: '#1565C0', fontWeight: '700', fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function DoctorPatients() {
  const [patients,   setPatients]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);

  const fetchPatients = useCallback(async (silent = false) => {
    try {
      const res = await api.get(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setPatients(res.data.patients || []);
    } catch { setPatients([]); }
    finally { if (!silent) setLoading(false); }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => fetchPatients(false), 300);
    return () => clearTimeout(t);
  }, [fetchPatients]);

  useEffect(() => {
    const id = setInterval(() => fetchPatients(true), 5_000);
    return () => clearInterval(id);
  }, [fetchPatients]);

  const onRefresh = async () => { setRefreshing(true); await fetchPatients(); setRefreshing(false); };

  const now = new Date();
  const stats = {
    total:        patients.length,
    conditions:   patients.filter(p => p.patientDetails?.chronicConditions).length,
    allergies:    patients.filter(p => p.patientDetails?.allergies?.length > 0).length,
    newThisMonth: patients.filter(p => {
      const d = new Date(p.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  return (
    <View style={s.root}>
      {selected && <PatientModal patient={selected} onClose={() => setSelected(null)} />}

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" />}
      >
        {/* Header */}
        <LinearGradient colors={['#0D2137', '#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
          <View>
            <Text style={s.headerTitle}>Patient Records</Text>
            <Text style={s.headerSub}>All registered patients</Text>
          </View>
          <View style={s.headerIcon}>
            <Ionicons name="people-outline" size={22} color="#fff" />
          </View>
        </LinearGradient>

        <View style={s.body}>
          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Total',       value: stats.total,        color: '#1565C0' },
              { label: 'Conditions',  value: stats.conditions,   color: '#C2410C' },
              { label: 'Allergies',   value: stats.allergies,    color: '#7C3AED' },
              { label: 'New Month',   value: stats.newThisMonth, color: '#15803D' },
            ].map(st => (
              <View key={st.label} style={s.statCard}>
                <Text style={[s.statNum, { color: st.color }]}>{loading ? '—' : st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Search */}
          <View style={s.searchCard}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput
              style={s.searchInput}
              placeholder="Search by name, patient ID, or phone…"
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Patient list */}
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator color="#1565C0" size="large" />
              <Text style={s.loadingText}>Loading patients…</Text>
            </View>
          ) : patients.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={s.emptyTitle}>No patients found</Text>
              <Text style={s.emptySub}>{search ? `No results for "${search}"` : 'No patients registered yet.'}</Text>
            </View>
          ) : (
            patients.map(patient => {
              const pd  = patient.patientDetails || {};
              const age = calcAge(pd.birthday);
              return (
                <TouchableOpacity
                  key={patient._id}
                  style={s.patientCard}
                  onPress={() => setSelected(patient)}
                  activeOpacity={0.8}
                >
                  {/* Card top */}
                  <View style={s.cardTop}>
                    <LinearGradient colors={['#1565C0', '#00ACC1']} style={s.cardAvatar}>
                      <Text style={s.cardAvatarText}>{getInitials(patient.name)}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.cardName} numberOfLines={1}>{patient.name}</Text>
                      <Text style={s.cardMeta}>
                        {patient.userId}{age ? ` · Age ${age}` : ''}{pd.gender ? ` · ${pd.gender}` : ''}
                      </Text>
                    </View>
                    {pd.bloodGroup && (
                      <View style={s.bloodGroupBadge}>
                        <Text style={s.bloodGroupText}>{pd.bloodGroup}</Text>
                      </View>
                    )}
                  </View>

                  {/* Conditions */}
                  {pd.chronicConditions ? (
                    <View style={s.cardConditions}>
                      {pd.chronicConditions.split(',').map(c => (
                        <View key={c} style={s.conditionChip}>
                          <Text style={s.conditionChipText}>{c.trim()}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={s.noConditions}>No active conditions</Text>
                  )}

                  {/* Allergies */}
                  {pd.allergies?.length > 0 && (
                    <View style={s.allergiesRow}>
                      <Ionicons name="warning-outline" size={12} color="#B45309" />
                      <Text style={s.allergiesText} numberOfLines={1}>{pd.allergies.join(', ')}</Text>
                    </View>
                  )}

                  {/* Footer */}
                  <View style={s.cardFooter}>
                    <Text style={s.cardFooterLeft}>{patient.telephone}</Text>
                    <Text style={s.cardFooterRight}>View Records →</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  headerIcon:  { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 14, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statNum:  { fontSize: 20, fontWeight: '900' },
  statLabel:{ fontSize: 9, color: '#64748B', marginTop: 1, textAlign: 'center' },
  searchCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  loadingBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  loadingText: { color: '#94A3B8', fontSize: 13 },
  emptyBox:  { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle:{ fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySub:  { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  patientCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingBottom: 10 },
  cardAvatar: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cardMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  bloodGroupBadge: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: '#BFDBFE' },
  bloodGroupText:  { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },
  cardConditions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingHorizontal: 14, paddingBottom: 6 },
  conditionChip:  { backgroundColor: '#FEF2F2', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: '#FECACA' },
  conditionChipText: { fontSize: 11, color: '#DC2626' },
  noConditions: { fontSize: 12, color: '#94A3B8', paddingHorizontal: 14, paddingBottom: 6 },
  allergiesRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingBottom: 8 },
  allergiesText: { fontSize: 12, color: '#B45309', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cardFooterLeft:  { fontSize: 11, color: '#94A3B8' },
  cardFooterRight: { fontSize: 11, fontWeight: '700', color: '#1565C0' },
});
