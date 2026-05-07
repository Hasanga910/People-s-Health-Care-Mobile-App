import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl,
  Platform, Pressable, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const LAB_TEST_PRICES = {
  'FBC': 2100, 'FBS': 2300, 'ESR': 2500,
  'Liver Profile': 2150, 'Renal Profile': 2250,
  'Thyroid Profile': 2400, 'Serum Vit D Level': 3000, 'Dengue Ag': 3500,
};
const OTHER_PRICE = 4000;
const LAB_TESTS   = Object.keys(LAB_TEST_PRICES);

const REQUEST_STATUS = {
  pending:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', dot: '#F59E0B', label: 'Pending',     icon: '⏳' },
  in_progress: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6', label: 'In Progress', icon: '🔬' },
  completed:   { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', dot: '#22C55E', label: 'Completed',   icon: '✅' },
};

const RESULT_STATUS = {
  payment_pending: { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', dot: '#94A3B8', label: 'Payment Pending' },
  pre_check:       { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', dot: '#8B5CF6', label: 'Pre-Check'       },
  sample_received: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6', label: 'Sample Received' },
  in_progress:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', dot: '#F59E0B', label: 'In Progress'     },
  completed:       { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', dot: '#22C55E', label: 'Completed'        },
};

const SOURCE_CONFIG = {
  standalone:        { bg: '#F8FAFC', text: '#64748B', label: 'Standalone'       },
  from_prescription: { bg: '#EFF6FF', text: '#1D4ED8', label: 'From Prescription' },
};

const TEST_NAMES = ['All', 'FBC', 'ESR', 'FBS', 'Liver Profile', 'Renal Profile', 'Thyroid Profile', 'Serum Vit D Level', 'Dengue Ag'];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
}
function isFlagged(result) {
  return result?.results?.parameters?.some(p => ['High', 'Low', 'Positive', 'Reactive'].includes(p.flag));
}

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <View style={[ts.box, type === 'success' ? ts.success : ts.error]}>
      <Ionicons name={type === 'success' ? 'checkmark-circle' : 'close-circle'} size={16} color={type === 'success' ? '#15803D' : '#B91C1C'} />
      <Text style={[ts.text, { color: type === 'success' ? '#15803D' : '#B91C1C' }]}>{msg}</Text>
    </View>
  );
}
const ts = StyleSheet.create({
  box:     { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 40, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, zIndex: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 8 },
  success: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  error:   { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  text:    { fontSize: 13, fontWeight: '500', flex: 1 },
});

// ─────────────────────────────────────────────────────────────
// PICKER MODAL
// ─────────────────────────────────────────────────────────────
function PickerModal({ visible, title, options, selected, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pk.overlay} onPress={onClose}>
        <View style={pk.sheet} onStartShouldSetResponder={() => true}>
          <View style={pk.header}>
            <Text style={pk.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={20} color="#94A3B8" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {options.map((opt, i) => (
              <TouchableOpacity key={i} style={[pk.item, selected === opt && pk.itemActive]} onPress={() => { onSelect(opt); onClose(); }} activeOpacity={0.7}>
                <Text style={[pk.itemText, selected === opt && pk.itemTextActive]}>{opt}</Text>
                {selected === opt && <Ionicons name="checkmark" size={16} color="#1565C0" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
const pk = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title:   { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  item:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  itemActive: { backgroundColor: '#EFF6FF' },
  itemText:   { fontSize: 13, color: '#374151', flex: 1 },
  itemTextActive: { color: '#1565C0', fontWeight: '600' },
});

function PatientLookup({ value, onChangeText, onSelect, editable = true }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const searchPatients = (text) => {
    onChangeText(text);
    if (!editable || text.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/patients?search=${encodeURIComponent(text.trim())}`);
        setResults((res.data.patients || []).slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const pickPatient = (patient) => {
    onSelect(patient);
    setResults([]);
  };

  return (
    <View style={pl.wrap}>
      <View style={[pl.searchBox, !editable && { opacity: 0.65 }]}>
        <Ionicons name="person-outline" size={16} color="#94A3B8" />
        <TextInput
          style={pl.input}
          placeholder="Search patient by name or ID *"
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={searchPatients}
          editable={editable}
          autoCapitalize="words"
        />
        {loading && <ActivityIndicator size="small" color="#1565C0" />}
      </View>
      {results.length > 0 && (
        <View style={pl.suggestions}>
          {results.map((patient) => {
            const pd = patient.patientDetails || {};
            return (
              <TouchableOpacity key={patient._id || patient.userId} style={pl.suggestion} onPress={() => pickPatient(patient)} activeOpacity={0.75}>
                <View style={pl.patientAvatar}>
                  <Text style={pl.patientAvatarText}>{getInitials(patient.name || '')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pl.patientName}>{patient.name}</Text>
                  <Text style={pl.patientMeta}>{patient.userId || 'Patient'}{pd.gender ? ` · ${pd.gender}` : ''}{pd.bloodGroup ? ` · ${pd.bloodGroup}` : ''}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const pl = StyleSheet.create({
  wrap: { zIndex: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#FAFBFC' },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, color: '#0F172A' },
  suggestions: { marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  patientAvatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  patientAvatarText: { color: '#1565C0', fontSize: 12, fontWeight: '800' },
  patientName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  patientMeta: { fontSize: 11, color: '#64748B', marginTop: 1 },
});

// ─────────────────────────────────────────────────────────────
// LAB REQUEST MODAL
// ─────────────────────────────────────────────────────────────
function LabRequestModal({ visible, onClose, onSaved, existing }) {
  const isEdit = !!existing;

  const [patientName,  setPatientName]  = useState('');
  const [patientId,    setPatientId]    = useState('');
  const [appointmentNumber, setApptNum] = useState('');
  const [checkedTests, setCheckedTests] = useState({});
  const [priorities,   setPriorities]   = useState({});
  const [otherChecked, setOtherChecked] = useState(false);
  const [otherText,    setOtherText]    = useState('');
  const [otherPriority,setOtherPriority]= useState('Routine');
  const [clinicalNotes,setClinical]     = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (!visible) return;
    setPatientName(existing?.patientName || '');
    setPatientId(existing?.patientId || '');
    setApptNum(existing?.appointmentNumber || '');
    setClinical(existing?.clinicalNotes || '');
    setError('');
    if (existing?.tests) {
      const cm = {}, pm = {};
      existing.tests.filter(t => !t.isOther).forEach(t => { cm[t.name] = true; pm[t.name] = t.priority || 'Routine'; });
      setCheckedTests(cm); setPriorities(pm);
      const ot = existing.tests.find(t => t.isOther);
      setOtherChecked(!!ot); setOtherText(ot?.name || ''); setOtherPriority(ot?.priority || 'Routine');
    } else {
      setCheckedTests({}); setPriorities({});
      setOtherChecked(false); setOtherText(''); setOtherPriority('Routine');
    }
  }, [visible]);

  const toggleTest = (t) => {
    setCheckedTests(prev => {
      const next = { ...prev, [t]: !prev[t] };
      if (next[t] && !priorities[t]) setPriorities(p => ({ ...p, [t]: 'Routine' }));
      return next;
    });
  };

  const selectedNames = Object.entries(checkedTests).filter(([, v]) => v).map(([k]) => k);
  const selectedCount = selectedNames.length + (otherChecked && otherText ? 1 : 0);
  const urgentCount   = selectedNames.filter(n => priorities[n] === 'Urgent').length
                      + (otherChecked && otherText && otherPriority === 'Urgent' ? 1 : 0);

  const handleSubmit = async () => {
    setError('');
    if (!patientName.trim()) return setError('Patient name is required.');
    if (selectedCount === 0)  return setError('Select at least one test.');
    if (otherChecked && !otherText.trim()) return setError('Describe the custom test.');

    const tests = [
      ...selectedNames.map(name => ({ name, isOther: false, price: LAB_TEST_PRICES[name] || 0, priority: priorities[name] || 'Routine' })),
      ...(otherChecked && otherText.trim() ? [{ name: otherText.trim(), isOther: true, price: OTHER_PRICE, priority: otherPriority }] : []),
    ];
    const overallPriority = tests.some(t => t.priority === 'Urgent') ? 'Urgent' : 'Routine';

    setSaving(true);
    try {
      const payload = { patientName: patientName.trim(), patientId: patientId || undefined, appointmentNumber: appointmentNumber.trim() || undefined, tests, priority: overallPriority, clinicalNotes };
      const res = isEdit
        ? await api.put(`/lab-requests/${existing._id}`, payload)
        : await api.post('/lab-requests', payload);
      onSaved(res.data.labRequest, isEdit);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save lab request.');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={lm.root}>
        <LinearGradient colors={['#0D2137', '#1565C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={lm.header}>
          <View>
            <Text style={lm.headerTitle}>{isEdit ? 'Edit Lab Request' : 'New Lab Request'}</Text>
            <Text style={lm.headerSub}>People's Health Care · Laboratory</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={lm.closeBtn}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={lm.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {!!error && (
            <View style={lm.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={lm.errorText}>{error}</Text>
            </View>
          )}

          {/* Timestamp */}
          <View style={lm.timestampRow}>
            <Ionicons name="time-outline" size={14} color="#94A3B8" />
            <Text style={lm.timestampText}>Timestamped: <Text style={{ color: '#374151', fontWeight: '600' }}>{formatDateTime(new Date().toISOString())}</Text></Text>
          </View>

          {/* Patient */}
          <Text style={lm.sectionLabel}>Patient Information</Text>
          <PatientLookup
            value={patientName}
            onChangeText={(text) => {
              setPatientName(text);
              setPatientId('');
            }}
            onSelect={(patient) => {
              setPatientName(patient.name || '');
              setPatientId(patient.userId || patient._id || '');
            }}
            editable={!isEdit}
          />
          <TextInput style={[lm.input, { marginTop: 8 }]} placeholder="Appointment Number (optional)" placeholderTextColor="#94A3B8" value={appointmentNumber} onChangeText={setApptNum} autoCapitalize="characters" />

          {/* Tests */}
          <View style={lm.testLabelRow}>
            <Text style={lm.sectionLabel}>Select Tests *</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {urgentCount > 0 && <View style={lm.urgentBadge}><Text style={lm.urgentBadgeText}>🚨 {urgentCount} Urgent</Text></View>}
              {selectedCount > 0 && <View style={lm.selectedBadge}><Text style={lm.selectedBadgeText}>{selectedCount} selected</Text></View>}
            </View>
          </View>

          <View style={lm.testsCard}>
            {LAB_TESTS.map(test => {
              const checked  = !!checkedTests[test];
              const priority = priorities[test] || 'Routine';
              return (
                <View key={test} style={lm.testItem}>
                  <TouchableOpacity style={lm.testRow} onPress={() => toggleTest(test)} activeOpacity={0.7}>
                    <View style={[lm.checkbox, checked && lm.checkboxOn]}>
                      {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[lm.testName, checked && { color: '#1D4ED8', fontWeight: '600' }]}>{test}</Text>
                    </View>
                  </TouchableOpacity>
                  {checked && (
                    <View style={lm.priorityToggle}>
                      {['Routine', 'Urgent'].map(p => (
                        <TouchableOpacity key={p} style={[lm.priorityBtn, priority === p && (p === 'Urgent' ? lm.priorityUrgent : lm.priorityRoutine)]} onPress={() => setPriorities(prev => ({ ...prev, [test]: p }))} activeOpacity={0.8}>
                          <Text style={[lm.priorityBtnText, priority === p && { color: p === 'Urgent' ? '#DC2626' : '#1D4ED8' }]}>{p === 'Urgent' ? '🚨 Urgent' : 'Routine'}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Other */}
            <View style={lm.testItem}>
              <TouchableOpacity style={lm.testRow} onPress={() => setOtherChecked(!otherChecked)} activeOpacity={0.7}>
                <View style={[lm.checkbox, otherChecked && lm.checkboxOn]}>
                  {otherChecked && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={[lm.testName, otherChecked && { color: '#B45309', fontWeight: '600' }]}>Other (Custom)</Text>
              </TouchableOpacity>
              {otherChecked && (
                <View style={{ paddingLeft: 32, paddingTop: 8, gap: 8 }}>
                  <TextInput style={lm.input} placeholder="Describe the custom test…" placeholderTextColor="#94A3B8" value={otherText} onChangeText={setOtherText} />
                  <View style={lm.priorityToggle}>
                    {['Routine', 'Urgent'].map(p => (
                      <TouchableOpacity key={p} style={[lm.priorityBtn, otherPriority === p && (p === 'Urgent' ? lm.priorityUrgent : lm.priorityRoutine)]} onPress={() => setOtherPriority(p)} activeOpacity={0.8}>
                        <Text style={[lm.priorityBtnText, otherPriority === p && { color: p === 'Urgent' ? '#DC2626' : '#1D4ED8' }]}>{p === 'Urgent' ? '🚨 Urgent' : 'Routine'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Clinical notes */}
          <Text style={lm.sectionLabel}>Clinical Notes</Text>
          <TextInput style={[lm.input, { height: 88, textAlignVertical: 'top' }]} placeholder="Additional notes or context…" placeholderTextColor="#94A3B8" value={clinicalNotes} onChangeText={setClinical} multiline />

          {/* Actions */}
          <View style={lm.actions}>
            <TouchableOpacity style={lm.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={lm.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[lm.submitBtn, saving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={lm.submitGrad}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={lm.submitText}>{isEdit ? 'Save Changes' : 'Create Lab Request'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const lm = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 18 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 17 },
  headerSub:   { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { flex: 1, color: '#DC2626', fontSize: 13 },
  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 18 },
  timestampText: { fontSize: 12, color: '#94A3B8' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 18 },
  testLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  urgentBadge:   { backgroundColor: '#FEF2F2', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FECACA' },
  urgentBadgeText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  selectedBadge:   { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#BFDBFE' },
  selectedBadgeText: { fontSize: 10, fontWeight: '700', color: '#1D4ED8' },
  testsCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  testItem:  { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  testRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox:  { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxOn:{ backgroundColor: '#1565C0', borderColor: '#1565C0' },
  testName:  { fontSize: 13, color: '#374151' },
  priorityToggle: { flexDirection: 'row', gap: 6, marginTop: 8, marginLeft: 32 },
  priorityBtn: { flex: 1, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
  priorityRoutine: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  priorityUrgent:  { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  priorityBtnText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 13, color: '#0F172A' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  submitBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  submitGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─────────────────────────────────────────────────────────────
// LAB RESULT DETAIL MODAL
// ─────────────────────────────────────────────────────────────
function ResultDetailModal({ result, onClose }) {
  const navigation = useNavigation();
  if (!result) return null;
  const flagged   = isFlagged(result);
  const statusCfg = RESULT_STATUS[result.status] ?? RESULT_STATUS.completed;
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
      <Pressable style={rd.overlay} onPress={onClose}>
        <View style={rd.sheet} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <LinearGradient colors={['#0D2137', '#1565C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={rd.header}>
            <View>
              <Text style={rd.headerLabel}>Lab Result Report</Text>
              <Text style={rd.headerTitle}>{result.testName}</Text>
              <Text style={rd.headerMono}>{result.testId}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={rd.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Patient strip */}
          <View style={rd.patientStrip}>
            <LinearGradient colors={['#1565C0', '#00ACC1']} style={rd.patientAvatar}>
              <Text style={rd.patientInitials}>{getInitials(result.patientName || result.patientId?.name || '')}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={rd.patientName}>{result.patientName || result.patientId?.name || '—'}</Text>
              {result.appointmentId && <Text style={rd.patientMeta}>Appt: {result.appointmentId}</Text>}
            </View>
            <View style={[rd.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
              <View style={[rd.statusDot, { backgroundColor: statusCfg.dot }]} />
              <Text style={[rd.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
          </View>

          <ScrollView style={rd.body} showsVerticalScrollIndicator={false}>
            {/* Abnormal banner */}
            {flagged && (
              <View style={rd.abnormalBanner}>
                <Text style={{ fontSize: 20 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={rd.abnormalTitle}>Abnormal Values Detected</Text>
                  <Text style={rd.abnormalSub}>
                    {result.results?.parameters?.filter(p => ['High', 'Low', 'Positive', 'Reactive'].includes(p.flag)).map(p => `${p.name} (${p.flag})`).join(' · ')}
                  </Text>
                </View>
              </View>
            )}

            {/* Info grid */}
            <View style={rd.infoGrid}>
              {[
                { label: 'Completed',      value: formatDate(result.completedAt) },
                { label: 'Sample Received', value: formatDate(result.sampleReceivedAt) },
                { label: 'Test Started',    value: formatDate(result.testStartedAt) },
                { label: 'Lab Request',     value: result.labRequestRef || '—' },
              ].map(item => (
                <View key={item.label} style={rd.infoCell}>
                  <Text style={rd.infoCellLabel}>{item.label}</Text>
                  {item.label === 'Lab Request' && result.labRequestRef ? (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        navigation.navigate('DoctorLab', { initialTab: 'requests', openRequestId: result.labRequestRef });
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[rd.infoCellValue, rd.linkValue]} numberOfLines={1}>{item.value}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={rd.infoCellValue} numberOfLines={1}>{item.value}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Parameters table */}
            {result.results?.parameters?.length > 0 && (
              <View style={rd.section}>
                <Text style={rd.sectionTitle}>Test Parameters</Text>
                <View style={rd.tableCard}>
                  {/* Header */}
                  <View style={rd.tableHeader}>
                    {['Parameter', 'Result', 'Ref Range', 'Flag'].map(h => (
                      <Text key={h} style={rd.tableHeaderCell}>{h}</Text>
                    ))}
                  </View>
                  {result.results.parameters.map((p, i) => {
                    const abn = ['High', 'Low', 'Positive', 'Reactive'].includes(p.flag);
                    const fc  = flagColors[p.flag] || { bg: '#F8FAFC', text: '#64748B' };
                    return (
                      <View key={i} style={[rd.tableRow, abn && { backgroundColor: '#FEF2F2' }, i % 2 === 0 && !abn && { backgroundColor: '#F9FAFB' }]}>
                        <Text style={rd.tableCell} numberOfLines={2}>{p.name}</Text>
                        <Text style={[rd.tableCell, { fontWeight: '700', color: abn ? '#DC2626' : '#0F172A' }]}>{p.value || '—'} {p.unit}</Text>
                        <Text style={[rd.tableCell, { color: '#94A3B8' }]}>{p.ref || '—'}</Text>
                        <View style={rd.tableCell}>
                          {p.flag ? (
                            <View style={[rd.flagBadge, { backgroundColor: fc.bg }]}>
                              <Text style={[rd.flagText, { color: fc.text }]}>{p.flag}</Text>
                            </View>
                          ) : <Text style={{ fontSize: 11, color: '#94A3B8' }}>—</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Clinical findings */}
            {result.results?.checkboxFindings?.some(f => f.checked) && (
              <View style={rd.section}>
                <Text style={rd.sectionTitle}>Clinical Findings</Text>
                {result.results.checkboxFindings.filter(f => f.checked).map((f, i) => (
                  <View key={i} style={rd.findingRow}>
                    <Ionicons name="checkmark-circle" size={14} color="#0D9488" />
                    <Text style={rd.findingText}>{f.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Lab notes */}
            {result.results?.labNotes && (
              <View style={rd.section}>
                <Text style={rd.sectionTitle}>Lab Notes</Text>
                <View style={rd.notesBox}>
                  <Text style={rd.notesText}>{result.results.labNotes}</Text>
                </View>
              </View>
            )}

            {/* Close */}
            <TouchableOpacity style={rd.closeFullBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={rd.closeFullBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const rd = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '95%', overflow: 'hidden' },
  header:  { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18, lineHeight: 24 },
  headerMono:  { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', marginTop: 4 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  patientStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  patientAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  patientInitials: { color: '#fff', fontWeight: '700', fontSize: 15 },
  patientName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  patientMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1 },
  statusDot:   { width: 5, height: 5, borderRadius: 2.5 },
  statusText:  { fontSize: 10, fontWeight: '700' },
  body: { padding: 16 },
  abnormalBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 14, marginBottom: 14 },
  abnormalTitle: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  abnormalSub:   { fontSize: 11, color: '#EF4444', marginTop: 3, lineHeight: 16 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  infoCell: { width: '47%', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  infoCellLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  infoCellValue: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  linkValue: { color: '#1D4ED8', textDecorationLine: 'underline' },
  section:      { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  tableCard:   { borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 8 },
  tableHeaderCell: { flex: 1, paddingHorizontal: 8, fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  tableRow:    { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  tableCell:   { flex: 1, paddingHorizontal: 8, fontSize: 11, color: '#374151' },
  flagBadge:   { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  flagText:    { fontSize: 10, fontWeight: '700' },
  findingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  findingText: { fontSize: 13, color: '#374151' },
  notesBox:    { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  notesText:   { fontSize: 13, color: '#374151', lineHeight: 20 },
  closeFullBtn: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  closeFullBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
});

// ─────────────────────────────────────────────────────────────
// LAB REQUESTS TAB
// ─────────────────────────────────────────────────────────────
function LabRequestsTab({ showToast, newRequest, openRequestId }) {
  const [labRequests,  setLabRequests]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [editReq,      setEditReq]      = useState(null);
  const [expandedId,   setExpandedId]   = useState(null);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [cancelling,   setCancelling]   = useState(null);
  const handledNewRequestRef = useRef(false);
  const handledOpenRequestRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/lab-requests');
      setLabRequests(res.data.labRequests || []);
    } catch { showToast('Failed to load lab requests', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => load(true), 5_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (newRequest && !handledNewRequestRef.current) {
      handledNewRequestRef.current = true;
      setShowModal(true);
    }
  }, [newRequest]);

  useEffect(() => {
    if (!openRequestId || labRequests.length === 0) return;
    if (handledOpenRequestRef.current === openRequestId) return;
    const req = labRequests.find(r => r._id === openRequestId || r.labRequestId === openRequestId);
    if (req) {
      handledOpenRequestRef.current = openRequestId;
      setExpandedId(req._id);
    }
  }, [openRequestId, labRequests]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSaved = (lr, isEdit) => {
    if (isEdit) {
      setLabRequests(prev => prev.map(r => r._id === lr._id ? lr : r));
      showToast('Lab request updated');
    } else {
      setLabRequests(prev => [lr, ...prev]);
      showToast(`Lab request ${lr.labRequestId} created`);
    }
  };

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await api.put(`/lab-requests/${id}/cancel`);
      setLabRequests(prev => prev.filter(r => r._id !== id));
      showToast('Lab request cancelled');
    } catch (err) { showToast(err.response?.data?.message || 'Failed to cancel', 'error'); }
    finally { setCancelling(null); }
  };

  const filtered = labRequests.filter(r => {
    const matchSearch = r.patientName?.toLowerCase().includes(search.toLowerCase()) || r.labRequestId?.includes(search);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSource = sourceFilter === 'all' || r.source === sourceFilter;
    return matchSearch && matchStatus && matchSource;
  });

  const stats = {
    total:       labRequests.length,
    pending:     labRequests.filter(r => r.status === 'pending').length,
    in_progress: labRequests.filter(r => r.status === 'in_progress').length,
    completed:   labRequests.filter(r => r.status === 'completed').length,
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" />}>
      <LabRequestModal visible={showModal || !!editReq} onClose={() => { setShowModal(false); setEditReq(null); }} onSaved={handleSaved} existing={editReq} />

      <View style={tab.body}>
        {/* Stats */}
        <View style={tab.statsRow}>
          {[
            { label: 'Total',       value: stats.total,       color: '#1565C0' },
            { label: 'Pending',     value: stats.pending,     color: '#C2410C' },
            { label: 'In Progress', value: stats.in_progress, color: '#1D4ED8' },
            { label: 'Completed',   value: stats.completed,   color: '#15803D' },
          ].map(st => (
            <View key={st.label} style={tab.statCard}>
              <Text style={[tab.statNum, { color: st.color }]}>{st.value}</Text>
              <Text style={tab.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Search + Filters */}
        <View style={tab.filterCard}>
          <View style={tab.searchRow}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput style={tab.searchInput} placeholder="Search patient or LR ID…" placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
            {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#94A3B8" /></TouchableOpacity>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {[['all', 'All'], ['pending', 'Pending'], ['in_progress', 'In Progress'], ['completed', 'Completed']].map(([val, label]) => (
              <TouchableOpacity key={val} style={[tab.filterChip, statusFilter === val && tab.filterChipActive]} onPress={() => setStatusFilter(val)} activeOpacity={0.8}>
                <Text style={[tab.filterChipText, statusFilter === val && tab.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
            <View style={tab.filterDivider} />
            {[['all', 'All Sources'], ['standalone', 'Standalone'], ['from_prescription', 'From Rx']].map(([val, label]) => (
              <TouchableOpacity key={val} style={[tab.filterChip, sourceFilter === val && tab.filterChipAlt]} onPress={() => setSourceFilter(val)} activeOpacity={0.8}>
                <Text style={[tab.filterChipText, sourceFilter === val && { color: '#fff' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* New button */}
        <TouchableOpacity style={tab.newBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <LinearGradient colors={['#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tab.newBtnGrad}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={tab.newBtnText}>New Lab Request</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* List */}
        {loading ? (
          <View style={tab.center}><ActivityIndicator color="#1565C0" size="large" /></View>
        ) : filtered.length === 0 ? (
          <View style={tab.center}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🧪</Text>
            <Text style={tab.emptyTitle}>No lab requests found</Text>
          </View>
        ) : (
          filtered.map(req => {
            const sc       = REQUEST_STATUS[req.status] ?? REQUEST_STATUS.pending;
            const src      = SOURCE_CONFIG[req.source]  ?? SOURCE_CONFIG.standalone;
            const expanded = expandedId === req._id;
            const isCancelling = cancelling === req._id;

            return (
              <View key={req._id} style={[tab.card, expanded && { borderColor: '#BFDBFE' }]}>
                <TouchableOpacity style={tab.cardHeader} onPress={() => setExpandedId(expanded ? null : req._id)} activeOpacity={0.8}>
                  <LinearGradient colors={req.priority === 'Urgent' ? ['#DC2626', '#EF4444'] : ['#1565C0', '#00ACC1']} style={tab.cardAvatar}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{sc.icon}</Text>
                  </LinearGradient>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={tab.cardId}>{req.labRequestId}</Text>
                      <View style={[tab.srcBadge, { backgroundColor: src.bg }]}>
                        <Text style={[tab.srcBadgeText, { color: src.text }]}>{src.label}</Text>
                      </View>
                      {req.priority === 'Urgent' && (
                        <View style={tab.urgentPill}><Text style={tab.urgentPillText}>🚨 Urgent</Text></View>
                      )}
                    </View>
                    <Text style={tab.cardPatient} numberOfLines={1}>{req.patientName}</Text>
                    <Text style={tab.cardMeta}>{req.tests?.length || 0} test{req.tests?.length !== 1 ? 's' : ''} · {formatDate(req.createdAt)}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 5 }}>
                    <View style={[tab.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                      <View style={[tab.statusDot, { backgroundColor: sc.dot }]} />
                      <Text style={[tab.statusText, { color: sc.text }]}>{sc.label}</Text>
                    </View>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color="#94A3B8" />
                  </View>
                </TouchableOpacity>

                {/* Expanded body */}
                {expanded && (
                  <View style={tab.cardBody}>
                    {/* Tests list */}
                    {req.tests?.map((test, i) => (
                      <View key={i} style={tab.testRow}>
                        <View style={tab.testDot} />
                        <Text style={tab.testName} numberOfLines={1}>{test.name}</Text>
                        {test.priority === 'Urgent' && (
                          <View style={tab.urgentPill}><Text style={tab.urgentPillText}>Urgent</Text></View>
                        )}
                      </View>
                    ))}

                    {req.clinicalNotes ? (
                      <View style={tab.notesBox}>
                        <Ionicons name="document-text-outline" size={13} color="#94A3B8" />
                        <Text style={tab.notesText}>{req.clinicalNotes}</Text>
                      </View>
                    ) : null}

                    {req.status === 'pending' && (
                      <View style={tab.cardActions}>
                        <TouchableOpacity style={tab.editBtn} onPress={() => setEditReq(req)} activeOpacity={0.8}>
                          <Ionicons name="pencil-outline" size={14} color="#1565C0" />
                          <Text style={tab.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[tab.cancelBtn, isCancelling && { opacity: 0.5 }]} onPress={() => handleCancel(req._id)} disabled={isCancelling} activeOpacity={0.8}>
                          {isCancelling ? <ActivityIndicator size="small" color="#EF4444" /> : <><Ionicons name="close-circle-outline" size={14} color="#EF4444" /><Text style={tab.cancelBtnText}>Cancel</Text></>}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────
// LAB RESULTS TAB
// ─────────────────────────────────────────────────────────────
function LabResultsTab({ showToast, openResultId }) {
  const [results,        setResults]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [testFilter,     setTestFilter]     = useState('All');
  const [showTestPicker, setShowTestPicker] = useState(false);
  const handledOpenResultRef = useRef(null);

  const fetchResults = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const q   = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const res = await api.get(`/lab-results${q}`);
      setResults(res.data.results || []);
    } catch { showToast('Failed to load lab results', 'error'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchResults(); }, [fetchResults]);
  useEffect(() => {
    const id = setInterval(() => fetchResults(true), 5_000);
    return () => clearInterval(id);
  }, [fetchResults]);

  useEffect(() => {
    if (!openResultId || results.length === 0) return;
    if (handledOpenResultRef.current === openResultId) return;
    const result = results.find(r => r._id === openResultId || r.testId === openResultId);
    if (result) {
      handledOpenResultRef.current = openResultId;
      setSelectedResult(result);
    }
  }, [openResultId, results]);

  const onRefresh = async () => { setRefreshing(true); await fetchResults(); setRefreshing(false); };

  const filtered = results.filter(r => {
    const s = search.toLowerCase();
    const matchSearch = (r.patientName || r.patientId?.name || '').toLowerCase().includes(s)
      || r.testId?.toLowerCase().includes(s)
      || r.appointmentId?.toLowerCase().includes(s);
    const matchTest = testFilter === 'All' || r.testName === testFilter;
    return matchSearch && matchTest;
  });

  const flaggedCount   = results.filter(isFlagged).length;
  const completedCount = results.filter(r => r.status === 'completed').length;
  const pendingCount   = results.filter(r => r.status !== 'completed').length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" />}>
      <ResultDetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />
      <PickerModal visible={showTestPicker} title="Filter by Test" options={TEST_NAMES} selected={testFilter} onSelect={setTestFilter} onClose={() => setShowTestPicker(false)} />

      <View style={tab.body}>
        {/* Abnormal alert */}
        {flaggedCount > 0 && (
          <View style={tab.abnormalAlert}>
            <Text style={{ fontSize: 20 }}>🚨</Text>
            <View>
              <Text style={tab.abnormalAlertTitle}>{flaggedCount} Abnormal Result{flaggedCount > 1 ? 's' : ''}</Text>
              <Text style={tab.abnormalAlertSub}>Require immediate review</Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={tab.statsRow}>
          {[
            { label: 'Total',       value: results.length,  color: '#1565C0', icon: 'flask-outline'       },
            { label: 'Completed',   value: completedCount,  color: '#15803D', icon: 'checkmark-circle-outline' },
            { label: 'In Progress', value: pendingCount,    color: '#C2410C', icon: 'hourglass-outline'   },
            { label: 'Abnormal',    value: flaggedCount,    color: '#B91C1C', icon: 'warning-outline'      },
          ].map(st => (
            <View key={st.label} style={tab.statCard}>
              <Ionicons name={st.icon} size={16} color={st.color} style={{ marginBottom: 2 }} />
              <Text style={[tab.statNum, { color: st.color }]}>{st.value}</Text>
              <Text style={tab.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Search + Filters */}
        <View style={tab.filterCard}>
          <View style={tab.searchRow}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput style={tab.searchInput} placeholder="Search patient, test ID…" placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
            {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#94A3B8" /></TouchableOpacity>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {[['all', 'All'], ['completed', 'Completed'], ['in_progress', 'In Progress'], ['pre_check', 'Pre-Check'], ['sample_received', 'Sample Recv.']].map(([val, label]) => (
              <TouchableOpacity key={val} style={[tab.filterChip, statusFilter === val && tab.filterChipActive]} onPress={() => setStatusFilter(val)} activeOpacity={0.8}>
                <Text style={[tab.filterChipText, statusFilter === val && tab.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
            <View style={tab.filterDivider} />
            <TouchableOpacity style={[tab.filterChip, testFilter !== 'All' && tab.filterChipActive]} onPress={() => setShowTestPicker(true)} activeOpacity={0.8}>
              <Ionicons name="funnel-outline" size={12} color={testFilter !== 'All' ? '#fff' : '#64748B'} />
              <Text style={[tab.filterChipText, testFilter !== 'All' && tab.filterChipTextActive]}>{testFilter}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* List */}
        {loading ? (
          <View style={tab.center}><ActivityIndicator color="#1565C0" size="large" /></View>
        ) : filtered.length === 0 ? (
          <View style={tab.center}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🧪</Text>
            <Text style={tab.emptyTitle}>No results found</Text>
          </View>
        ) : (
          filtered.map(result => {
            const flagged   = isFlagged(result);
            const isComp    = result.status === 'completed';
            const statusCfg = RESULT_STATUS[result.status] ?? RESULT_STATUS.completed;
            const abnParams = result.results?.parameters?.filter(p => ['High', 'Low', 'Positive', 'Reactive'].includes(p.flag)) || [];

            return (
              <TouchableOpacity key={result._id} style={[tab.card, flagged && { borderColor: '#FECACA' }]} onPress={() => setSelectedResult(result)} activeOpacity={0.8}>
                <View style={tab.cardHeader}>
                  <LinearGradient
                    colors={flagged ? ['#DC2626', '#EF4444'] : isComp ? ['#1565C0', '#00ACC1'] : ['#475569', '#64748B']}
                    style={tab.cardAvatar}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                      {getInitials(result.patientName || result.patientId?.name || '')}
                    </Text>
                  </LinearGradient>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                      <Text style={tab.cardPatient} numberOfLines={1}>{result.patientName || result.patientId?.name || 'Unknown'}</Text>
                      {flagged && <View style={tab.abnBadge}><Text style={tab.abnBadgeText}>⚠️ Abnormal</Text></View>}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <View style={tab.testNameBadge}><Text style={tab.testNameBadgeText}>🧪 {result.testName}</Text></View>
                      <Text style={tab.cardMono}>{result.testId}</Text>
                    </View>
                    <Text style={tab.cardMeta}>{isComp ? `Completed: ${formatDate(result.completedAt)}` : `Updated: ${formatDate(result.updatedAt || result.createdAt)}`}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 5 }}>
                    <View style={[tab.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
                      <View style={[tab.statusDot, { backgroundColor: statusCfg.dot }]} />
                      <Text style={[tab.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
                    </View>
                    <Text style={tab.viewDetails}>View →</Text>
                  </View>
                </View>

                {/* Abnormal strip */}
                {flagged && isComp && abnParams.length > 0 && (
                  <View style={tab.abnormalStrip}>
                    {abnParams.slice(0, 3).map((p, i) => (
                      <Text key={i} style={tab.abnormalStripText}>{p.name}: <Text style={{ fontWeight: '700' }}>{p.value} {p.unit}</Text> ({p.flag})</Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

// Shared tab styles
const tab = StyleSheet.create({
  body: { padding: 14, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statNum:   { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 9, color: '#64748B', marginTop: 1, textAlign: 'center' },
  filterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 10 },
  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterChipActive: { backgroundColor: '#1565C0' },
  filterChipAlt:    { backgroundColor: '#475569' },
  filterChipTeal:   { backgroundColor: '#006064' },
  filterChipText:   { fontSize: 11, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#fff' },
  filterDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 4 },
  newBtn:     { borderRadius: 14, overflow: 'hidden' },
  newBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  center:     { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  card:    { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cardAvatar:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardId:      { fontSize: 12, fontWeight: '700', color: '#1D4ED8', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  cardPatient: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  cardMeta:    { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  cardMono:    { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', color: '#94A3B8' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  statusDot:   { width: 5, height: 5, borderRadius: 2.5 },
  statusText:  { fontSize: 10, fontWeight: '700' },
  srcBadge:    { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  srcBadgeText:{ fontSize: 9, fontWeight: '600' },
  urgentPill:  { backgroundColor: '#FEF2F2', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#FECACA' },
  urgentPillText: { fontSize: 9, fontWeight: '700', color: '#DC2626' },
  cardBody:   { borderTopWidth: 1, borderTopColor: '#F8FAFC', padding: 14 },
  testRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  testDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8B5CF6', flexShrink: 0 },
  testName:   { flex: 1, fontSize: 13, color: '#374151' },
  notesBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginTop: 4 },
  notesText:  { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 18 },
  cardActions:{ flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#EFF6FF', borderRadius: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#BFDBFE' },
  editBtnText:{ color: '#1565C0', fontWeight: '600', fontSize: 12 },
  cancelBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#FECACA' },
  cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 12 },
  abnBadge:   { backgroundColor: '#FEF2F2', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#FECACA' },
  abnBadgeText: { fontSize: 9, fontWeight: '700', color: '#DC2626' },
  testNameBadge: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#BFDBFE' },
  testNameBadgeText: { fontSize: 10, fontWeight: '600', color: '#1D4ED8' },
  viewDetails:   { fontSize: 11, color: '#1565C0' },
  abnormalStrip: { borderTopWidth: 1, borderTopColor: '#FECACA', backgroundColor: '#FEF2F2', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  abnormalStripText: { fontSize: 11, color: '#DC2626' },
  abnormalAlert: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 12 },
  abnormalAlertTitle: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  abnormalAlertSub:   { fontSize: 11, color: '#EF4444', marginTop: 1 },
});

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT — DoctorLab with animated toggle
// ─────────────────────────────────────────────────────────────
export default function DoctorLab() {
  const route = useRoute();
  const [activeTab, setActiveTab] = useState(route.params?.initialTab || 'requests'); // 'requests' | 'results'
  const [toast, setToast]         = useState(null);
  const slideAnim = useRef(new Animated.Value(route.params?.initialTab === 'results' ? 1 : 0)).current;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const switchTab = (tab) => {
    Animated.timing(slideAnim, {
      toValue: tab === 'requests' ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
    setActiveTab(tab);
  };

  // Indicator x position
  const indicatorLeft = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] });

  useEffect(() => {
    const nextTab = route.params?.initialTab;
    if (!nextTab || nextTab === activeTab) return;
    switchTab(nextTab);
  }, [route.params?.initialTab]);

  return (
    <View style={ms.root}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Gradient header */}
      <LinearGradient colors={['#0D2137', '#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ms.header}>
        <View>
          <Text style={ms.headerTitle}>Laboratory</Text>
          <Text style={ms.headerSub}>Requests & Results</Text>
        </View>
        <View style={ms.headerIcon}>
          <Ionicons
            name={activeTab === 'requests' ? 'flask-outline' : 'bar-chart-outline'}
            size={22}
            color="#fff"
          />
        </View>
      </LinearGradient>

      {/* Animated toggle pill */}
      <View style={ms.toggleWrapper}>
        <View style={ms.toggleTrack}>
          {/* Sliding indicator */}
          <Animated.View style={[ms.toggleIndicator, { left: indicatorLeft }]} />

          <TouchableOpacity style={ms.toggleBtn} onPress={() => switchTab('requests')} activeOpacity={0.8}>
            <Ionicons name="flask-outline" size={15} color={activeTab === 'requests' ? '#fff' : '#64748B'} />
            <Text style={[ms.toggleBtnText, activeTab === 'requests' && ms.toggleBtnTextActive]}>Lab Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity style={ms.toggleBtn} onPress={() => switchTab('results')} activeOpacity={0.8}>
            <Ionicons name="bar-chart-outline" size={15} color={activeTab === 'results' ? '#fff' : '#64748B'} />
            <Text style={[ms.toggleBtnText, activeTab === 'results' && ms.toggleBtnTextActive]}>Lab Results</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'requests'
          ? <LabRequestsTab showToast={showToast} newRequest={route.params?.newRequest} openRequestId={route.params?.openRequestId} />
          : <LabResultsTab  showToast={showToast} openResultId={route.params?.openResultId} />
        }
      </View>
    </View>
  );
}

const ms = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  headerIcon:  { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Toggle
  toggleWrapper: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  toggleTrack: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, position: 'relative' },
  toggleIndicator: {
    position: 'absolute',
    top: 4,
    width: '50%',
    bottom: 4,
    backgroundColor: '#1565C0',
    borderRadius: 10,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, zIndex: 1 },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  toggleBtnTextActive: { color: '#fff' },
});