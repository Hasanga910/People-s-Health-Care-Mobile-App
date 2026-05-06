import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Platform, Animated,
  KeyboardAvoidingView, RefreshControl,
} from 'react-native';
import { Ionicons }      from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api               from '../../services/api';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const C = COLORS.lab;

// ── Status pipeline config ─────────────────────────────────────────────
const STEPS = [
  { key: 'payment_pending', label: 'Payment',  icon: 'card-outline'           },
  { key: 'pre_check',       label: 'Pre-Check', icon: 'clipboard-outline'     },
  { key: 'sample_received', label: 'Sample',   icon: 'flask-outline'          },
  { key: 'in_progress',     label: 'Testing',  icon: 'pulse-outline'          },
  { key: 'completed',       label: 'Done',     icon: 'checkmark-circle-outline'},
];
const STEP_INDEX = STEPS.reduce((acc, s, i) => { acc[s.key] = i; return acc; }, {});

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Pipeline progress bar ─────────────────────────────────────────────
function Pipeline({ status }) {
  const current = STEP_INDEX[status] ?? 0;
  return (
    <View style={styles.pipeline}>
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <View key={step.key} style={styles.pipelineItem}>
            <View style={[
              styles.pipelineDot,
              done   && { backgroundColor: C.primary, borderColor: C.primary },
              active && { borderColor: C.primary, backgroundColor: '#fff' },
            ]}>
              {done
                ? <Ionicons name="checkmark" size={10} color="#fff" />
                : <Ionicons name={step.icon} size={10} color={active ? C.primary : '#cbd5e1'} />
              }
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.pipelineLine, done && { backgroundColor: C.primary }]} />
            )}
            <Text style={[styles.pipelineLabel, active && { color: C.primary, fontWeight: '700' }]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Section header ─────────────────────────────────────────────────────
function SectionHeader({ icon, title, color = C.primary }) {
  return (
    <View style={styles.secHeader}>
      <View style={[styles.secIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.secTitle, { color }]}>{title}</Text>
    </View>
  );
}

// ── Checkbox item ──────────────────────────────────────────────────────
function CheckItem({ label, checked, onToggle }) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.8}>
      <View style={[styles.checkbox, checked && { backgroundColor: C.primary, borderColor: C.primary }]}>
        {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={[styles.checkLabel, checked && { color: '#1e293b' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Short answer item ──────────────────────────────────────────────────
function ShortAnswer({ question, placeholder, value, onChange }) {
  return (
    <View style={styles.qaWrap}>
      <Text style={styles.qaQuestion}>{question}</Text>
      <TextInput
        style={styles.qaInput}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChange}
        multiline
      />
    </View>
  );
}

// ── STAGE 1 — Payment verification ────────────────────────────────────
function StagePayment({ result, onConfirmed }) {
  const [paymentId, setPaymentId] = useState(result.paymentId || '');
  const [saving,    setSaving]    = useState(false);

  const confirm = async () => {
    if (!paymentId.trim()) {
      Alert.alert('Required', 'Please enter the Payment ID from the pharmacy.');
      return;
    }
    try {
      setSaving(true);
      // POST to cashier-confirm endpoint with paymentId + labRequestRef
      await api.post('/lab-results/cashier-confirm', {
        labRequestRef: result.labRequestRef,
        paymentId: paymentId.trim(),
      });
      onConfirmed();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not confirm payment. Please check the Payment ID.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.stage}>
      <SectionHeader icon="card-outline" title="Payment Verification" color="#F59E0B" />
      <Text style={styles.stageInfo}>
        Before proceeding, confirm that the pharmacy has received payment for this lab test.
        Enter the Payment ID provided by the pharmacy below.
      </Text>

      {/* Request summary */}
      <View style={styles.summaryCard}>
        <Row label="Test"        value={result.testName} />
        <Row label="Patient"     value={result.patientName || '—'} />
        <Row label="Patient ID"  value={result.patientId  || '—'} />
        <Row label="Appointment" value={result.appointmentId} />
        <Row label="Test ID"     value={result.testId} />
        <Row label="Requested"   value={fmtDateTime(result.createdAt)} />
      </View>

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>Payment ID (from Pharmacy) *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. PAY-2026-0123"
          placeholderTextColor="#94a3b8"
          value={paymentId}
          onChangeText={setPaymentId}
          autoCapitalize="characters"
        />
        <Text style={styles.inputHint}>
          Send a message to the pharmacy and ask for the patient's payment confirmation ID.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: '#F59E0B' }, saving && styles.btnDisabled]}
        onPress={confirm}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Confirm Payment & Continue</Text>
            </>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── STAGE 2 — Pre-conditions ──────────────────────────────────────────
function StagePreConditions({ result, onSaved }) {
  const [template,   setTemplate]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [checkboxes, setCheckboxes] = useState([]);
  const [answers,    setAnswers]    = useState([]);
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const enc = encodeURIComponent(result.testName);
        const { data } = await api.get(`/lab-results/pre-conditions/${enc}`);
        const t = data.template;
        setTemplate(t);
        setCheckboxes(t.checkboxes.map(label => ({ label, checked: false })));
        setAnswers(t.shortAnswers.map(q => ({ question: q.question, placeholder: q.placeholder, answer: '' })));
      } catch {
        Alert.alert('Error', 'Could not load pre-condition template.');
      } finally {
        setLoading(false);
      }
    })();
  }, [result.testName]);

  const toggleCheck = (i) => {
    setCheckboxes(prev => prev.map((c, idx) => idx === i ? { ...c, checked: !c.checked } : c));
  };

  const setAnswer = (i, text) => {
    setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: text } : a));
  };

  const save = async () => {
    try {
      setSaving(true);
      await api.put(`/lab-results/${result._id}/pre-conditions`, {
        checkboxes,
        shortAnswers: answers,
        notes,
      });
      onSaved();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save pre-conditions.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;

  return (
    <View style={styles.stage}>
      <SectionHeader icon="clipboard-outline" title="Pre-Test Conditions" color={C.primary} />
      <Text style={styles.stageInfo}>
        Verify and document the following conditions for <Text style={{ fontWeight: '700' }}>{result.testName}</Text> before collecting the sample.
        Send these conditions to the patient and confirm compliance.
      </Text>

      {/* Patient strip */}
      <View style={[styles.summaryCard, { marginBottom: 16 }]}>
        <Row label="Patient"     value={result.patientName || '—'} />
        <Row label="Payment ID"  value={result.paymentId   || '—'} />
      </View>

      {/* Checkboxes */}
      <Text style={styles.subTitle}>Conditions to Verify</Text>
      <View style={styles.card}>
        {checkboxes.map((c, i) => (
          <View key={i}>
            <CheckItem label={c.label} checked={c.checked} onToggle={() => toggleCheck(i)} />
            {i < checkboxes.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* Short answers */}
      {answers.length > 0 && (
        <>
          <Text style={[styles.subTitle, { marginTop: 16 }]}>Clinical Questions</Text>
          <View style={styles.card}>
            {answers.map((a, i) => (
              <View key={i}>
                <ShortAnswer
                  question={a.question}
                  placeholder={a.placeholder}
                  value={a.answer}
                  onChange={(t) => setAnswer(i, t)}
                />
                {i < answers.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Notes */}
      <Text style={[styles.subTitle, { marginTop: 16 }]}>Additional Notes</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any additional pre-test observations, special instructions, or remarks…"
          placeholderTextColor="#94a3b8"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, saving && styles.btnDisabled]}
        onPress={save}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Save & Mark Sample Collected</Text>
            </>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── STAGE 3 — Sample received ─────────────────────────────────────────
function StageSampleReceived({ result, onStartTest }) {
  const [saving, setSaving] = useState(false);

  const startTest = async () => {
    Alert.alert(
      'Start Lab Test',
      `Are you ready to begin processing the ${result.testName} sample for ${result.patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Test', style: 'default',
          onPress: async () => {
            try {
              setSaving(true);
              await api.put(`/lab-results/${result._id}/start`, {});
              onStartTest();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Could not start the test.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.stage}>
      <SectionHeader icon="flask-outline" title="Sample Received" color="#8B5CF6" />
      <Text style={styles.stageInfo}>
        The sample has been collected and pre-conditions have been verified.
        You may now start processing the lab test.
      </Text>

      <View style={styles.summaryCard}>
        <Row label="Test"         value={result.testName} />
        <Row label="Patient"      value={result.patientName || '—'} />
        <Row label="Sample Time"  value={fmtDateTime(result.sampleReceivedAt)} />
        <Row label="Payment ID"   value={result.paymentId  || '—'} />
      </View>

      {/* Pre-conditions summary */}
      {result.preTestConditions?.checkboxes?.length > 0 && (
        <>
          <Text style={[styles.subTitle, { marginTop: 16 }]}>Pre-Condition Summary</Text>
          <View style={styles.card}>
            {result.preTestConditions.checkboxes.map((c, i) => (
              <View key={i}>
                <View style={styles.checkRow}>
                  <Ionicons
                    name={c.checked ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={c.checked ? '#10B981' : '#ef4444'}
                  />
                  <Text style={[styles.checkLabel, { color: c.checked ? '#1e293b' : '#ef4444' }]}>{c.label}</Text>
                </View>
                {i < result.preTestConditions.checkboxes.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: '#8B5CF6' }, saving && styles.btnDisabled]}
        onPress={startTest}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="play-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Start Lab Test</Text>
            </>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── STAGE 4 — In Progress: go to upload screen ─────────────────────────
function StageInProgress({ result }) {
  const navigation = useNavigation();
  return (
    <View style={styles.stage}>
      <SectionHeader icon="pulse-outline" title="Test In Progress" color="#10B981" />
      <Text style={styles.stageInfo}>
        The test has been started. When you have completed the analysis, tap below to upload the results.
      </Text>

      <View style={styles.summaryCard}>
        <Row label="Test"       value={result.testName} />
        <Row label="Patient"    value={result.patientName || '—'} />
        <Row label="Started At" value={fmtDateTime(result.testStartedAt)} />
        <Row label="Test ID"    value={result.testId} />
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: '#10B981' }]}
        onPress={() => navigation.navigate('LabUploadResults', { resultId: result._id, testName: result.testName })}
        activeOpacity={0.85}
      >
        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Upload Test Results</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── STAGE 5 — Completed: summary view ─────────────────────────────────
function StageCompleted({ result }) {
  const navigation = useNavigation();
  return (
    <View style={styles.stage}>
      <View style={styles.completedBanner}>
        <Ionicons name="checkmark-circle" size={40} color="#10B981" />
        <Text style={styles.completedTitle}>Test Completed</Text>
        <Text style={styles.completedSub}>Results have been uploaded to the patient and doctor.</Text>
      </View>

      <View style={styles.summaryCard}>
        <Row label="Test"         value={result.testName} />
        <Row label="Patient"      value={result.patientName || '—'} />
        <Row label="Test ID"      value={result.testId} />
        <Row label="Started"      value={fmtDateTime(result.testStartedAt)} />
        <Row label="Completed"    value={fmtDateTime(result.completedAt)} />
        <Row label="Performed By" value={result.results?.performedBy || '—'} />
        <Row label="Payment ID"   value={result.paymentId || '—'} />
      </View>

      {/* Result parameters */}
      {result.results?.parameters?.length > 0 && (
        <>
          <Text style={[styles.subTitle, { marginTop: 16 }]}>Results Summary</Text>
          <View style={styles.card}>
            {result.results.parameters.map((p, i) => {
              const flagColor = p.flag === 'High' ? '#ef4444' : p.flag === 'Low' ? '#3B82F6' : p.flag === 'Positive' ? '#ef4444' : '#10B981';
              return (
                <View key={i}>
                  <View style={styles.paramRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paramName}>{p.name}</Text>
                      <Text style={styles.paramRef}>Ref: {p.ref}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.paramValue}>{p.value} {p.unit}</Text>
                      {p.flag && p.flag !== '' && (
                        <View style={[styles.flagPill, { backgroundColor: flagColor + '20' }]}>
                          <Text style={[styles.flagText, { color: flagColor }]}>{p.flag}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {i < result.results.parameters.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        </>
      )}

      {result.results?.labNotes ? (
        <>
          <Text style={[styles.subTitle, { marginTop: 16 }]}>Lab Notes</Text>
          <View style={styles.card}>
            <Text style={{ padding: 14, color: '#475569', lineHeight: 20 }}>{result.results.labNotes}</Text>
          </View>
        </>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: C.primary, marginTop: 24 }]}
        onPress={() => navigation.navigate('LabUploadResults', { resultId: result._id, testName: result.testName, readOnly: true })}
        activeOpacity={0.85}
      >
        <Ionicons name="document-text-outline" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>View / Download PDF Report</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────
function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// ── Root screen ────────────────────────────────────────────────────────
export default function LabTestDetail() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { resultId } = route.params || {};

  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const { data } = await api.get(`/lab-results/${resultId}`);
      setResult(data.result || data);
    } catch (err) {
      Alert.alert('Error', 'Could not load test details.');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resultId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const renderStage = () => {
    switch (result.status) {
      case 'payment_pending': return <StagePayment         result={result} onConfirmed={() => load()} />;
      case 'pre_check':       return <StagePreConditions   result={result} onSaved={() => load()} />;
      case 'sample_received': return <StageSampleReceived  result={result} onStartTest={() => load()} />;
      case 'in_progress':     return <StageInProgress      result={result} />;
      case 'completed':       return <StageCompleted        result={result} />;
      default: return <Text style={{ padding: 20, color: '#64748b' }}>Unknown status: {result.status}</Text>;
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.topBarTitle} numberOfLines={1}>{result.testName}</Text>
            <Text style={styles.topBarSub}>{result.testId} · {result.patientName || 'Unknown'}</Text>
          </View>
        </View>

        {/* Pipeline */}
        <View style={styles.pipelineWrap}>
          <Pipeline status={result.status} />
        </View>

        {/* Stage content */}
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[C.primary]} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {renderStage()}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0', ...SHADOW.sm,
  },
  backBtn:    { padding: 4 },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  topBarSub:   { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  pipelineWrap: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  pipeline:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pipelineItem: { alignItems: 'center', flex: 1 },
  pipelineDot:  { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  pipelineLine: { position: 'absolute', top: 12, left: '50%', right: '-50%', height: 2, backgroundColor: '#e2e8f0' },
  pipelineLabel:{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 4 },

  stage:        { gap: 0 },
  stageInfo:    { fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 16, marginTop: 4 },

  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  secIcon:   { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  secTitle:  { fontSize: 16, fontWeight: '700' },

  summaryCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: 4, ...SHADOW.sm },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLabel:    { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  rowValue:    { fontSize: 13, color: '#1e293b', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  subTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 4 },
  card:     { backgroundColor: '#fff', borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.sm },
  divider:  { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 14 },

  checkRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  checkbox:   { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkLabel: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 18 },

  qaWrap:     { padding: 14, gap: 6 },
  qaQuestion: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  qaInput:    { backgroundColor: '#f8fafc', borderRadius: RADIUS.sm, padding: 10, fontSize: 13, color: '#1e293b', minHeight: 60, borderWidth: 1, borderColor: '#e2e8f0' },

  notesInput: { padding: 14, fontSize: 13, color: '#1e293b', minHeight: 90 },

  inputWrap:  { gap: 6, marginBottom: 4 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  textInput:  { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 14, fontSize: 14, color: '#1e293b', borderWidth: 1.5, borderColor: '#e2e8f0', ...SHADOW.sm },
  inputHint:  { fontSize: 12, color: '#94a3b8', lineHeight: 16 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: RADIUS.md, paddingVertical: 15,
    marginTop: 20, ...SHADOW.md,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled:    { opacity: 0.6 },

  completedBanner: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  completedTitle:  { fontSize: 20, fontWeight: '800', color: '#10B981' },
  completedSub:    { fontSize: 13, color: '#64748b', textAlign: 'center' },

  paramRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
  paramName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  paramRef:  { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  paramValue:{ fontSize: 14, fontWeight: '700', color: '#1e293b' },
  flagPill:  { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3 },
  flagText:  { fontSize: 10, fontWeight: '700' },
});
