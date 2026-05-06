import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons }      from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Print        from 'expo-print';
import * as Sharing      from 'expo-sharing';
import api               from '../../services/api';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const C = COLORS.lab;

// ── Auto-flag helper ──────────────────────────────────────────────────
function autoFlag(value, min, max, positiveThreshold) {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  if (positiveThreshold != null) return num >= positiveThreshold ? 'Positive' : 'Negative';
  if (min === null && max === null) return '';
  if (max === null) return num < min ? 'Low' : 'Normal';
  if (min === null) return num > max ? 'High' : 'Normal';
  if (num < min)    return 'Low';
  if (num > max)    return 'High';
  return 'Normal';
}

const FLAG_COLORS = {
  High:     { bg: '#FEF2F2', text: '#DC2626' },
  Low:      { bg: '#EFF6FF', text: '#2563EB' },
  Positive: { bg: '#FEF2F2', text: '#DC2626' },
  Negative: { bg: '#F0FDF4', text: '#16A34A' },
  Normal:   { bg: '#F0FDF4', text: '#16A34A' },
};

// ── PDF HTML builder ──────────────────────────────────────────────────
function buildPdfHtml(result, checkboxes, params, labNotes, performedBy) {
  const now = new Date().toLocaleString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const completedAt = result.completedAt
    ? new Date(result.completedAt).toLocaleString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : now;

  const flagColor = { High: '#DC2626', Low: '#2563EB', Positive: '#DC2626', Negative: '#16A34A', Normal: '#16A34A', '': '#64748b' };

  const paramRows = params.map(p => {
    const fc = flagColor[p.flag] || '#64748b';
    const flagCell = p.flag
      ? `<span style="background:${fc}18;color:${fc};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid ${fc}40;">${p.flag}</span>`
      : '<span style="color:#94a3b8;">—</span>';
    const isAbnormal = p.flag && p.flag !== 'Normal';
    return `
      <tr style="${isAbnormal ? 'background:#fff8f8;' : ''}">
        <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;font-size:13px;">${p.name}</td>
        <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:12px;">${p.ref || '—'}</td>
        <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1e293b;font-size:13px;">${p.value || '—'} <span style="color:#94a3b8;font-weight:400;font-size:11px;">${p.unit || ''}</span></td>
        <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;text-align:center;">${flagCell}</td>
      </tr>`;
  }).join('');

  const activeFindings = checkboxes.filter(c => c.checked);
  const findingsRows = activeFindings.map(c =>
    `<li style="margin:5px 0;color:#1e293b;font-size:13px;line-height:1.5;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#0284c7;margin-right:8px;vertical-align:middle;"></span>${c.label}
    </li>`
  ).join('') || '<li style="color:#94a3b8;font-size:13px;font-style:italic;">No specific findings recorded.</li>';

  const abnormalCount = params.filter(p => p.flag && p.flag !== 'Normal').length;
  const abnormalBanner = abnormalCount > 0
    ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:10px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">⚠️</span>
        <span style="color:#DC2626;font-weight:700;font-size:13px;">${abnormalCount} abnormal parameter${abnormalCount > 1 ? 's' : ''} detected — clinical review recommended</span>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Lab Report – ${result.testName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; background:#ffffff; color:#1e293b; font-size:13px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { padding:36px 40px; max-width:800px; margin:0 auto; }

    /* ── Header ── */
    .header-bar { background:linear-gradient(135deg,#023e6b 0%,#0284c7 100%); border-radius:14px; padding:24px 28px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; }
    .org-logo   { display:flex; align-items:center; gap:14px; }
    .org-icon   { width:48px; height:48px; background:#ef4444; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px; color:#ffffff; font-weight:bold; }
    .org-name   { color:#ffffff; font-size:20px; font-weight:800; letter-spacing:-0.3px; line-height:1.2; }
    .org-sub    { color:rgba(255,255,255,0.65); font-size:11.5px; margin-top:3px; }
    .report-meta { text-align:right; }
    .report-meta h2 { color:#ffffff; font-size:15px; font-weight:700; }
    .report-meta p  { color:rgba(255,255,255,0.55); font-size:11px; margin-top:4px; }
    .report-id  { background:rgba(255,255,255,0.12); border-radius:8px; padding:5px 12px; margin-top:8px; display:inline-block; color:rgba(255,255,255,0.8); font-size:11px; font-weight:600; font-family:monospace; }

    /* ── Status badge ── */
    .badge-row   { display:flex; align-items:center; gap:10px; margin-bottom:20px; }
    .badge       { display:inline-flex; align-items:center; gap:6px; background:#D1FAE5; color:#065F46; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; border:1px solid #6EE7B7; }
    .badge-dot   { width:8px; height:8px; border-radius:50%; background:#10B981; }

    /* ── Info grid ── */
    .info-grid  { display:grid; grid-template-columns:1fr 1fr; gap:1px; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; margin-bottom:24px; background:#e2e8f0; }
    .info-cell  { background:#ffffff; padding:12px 16px; }
    .info-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:4px; }
    .info-value { font-size:13px; font-weight:600; color:#1e293b; }

    /* ── Section ── */
    .section       { margin-bottom:24px; }
    .section-header { display:flex; align-items:center; gap:8px; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid #e2e8f0; }
    .section-dot    { width:10px; height:10px; border-radius:50%; background:#0284c7; }
    .section-title  { font-size:12px; font-weight:800; color:#0284c7; text-transform:uppercase; letter-spacing:0.8px; }

    /* ── Table ── */
    .param-table { width:100%; border-collapse:collapse; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; }
    .param-table thead tr { background:#f8fafc; }
    .param-table th { padding:11px 16px; text-align:left; font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e2e8f0; }
    .param-table th:last-child { text-align:center; }

    /* ── Findings ── */
    .findings-list { background:#f8fafc; border-radius:10px; padding:14px 16px 14px 14px; border:1px solid #e2e8f0; list-style:none; }

    /* ── Notes ── */
    .notes-box  { background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:14px 16px; color:#78350f; font-size:13px; line-height:1.7; }
    .no-notes   { color:#94a3b8; font-style:italic; }

    /* ── Footer ── */
    .footer      { margin-top:32px; padding-top:16px; border-top:2px solid #e2e8f0; display:flex; justify-content:space-between; align-items:flex-end; }
    .footer-left p   { font-size:11px; color:#94a3b8; line-height:1.7; }
    .footer-left strong { color:#475569; }
    .sig-block   { text-align:center; }
    .sig-name    { font-size:13px; font-weight:700; color:#1e293b; }
    .sig-line    { border-top:1.5px solid #94a3b8; width:180px; margin:32px auto 6px; }
    .sig-label   { font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; }
    .confidential { text-align:center; margin-top:20px; font-size:10px; font-weight:700; color:#ef4444; letter-spacing:1.5px; text-transform:uppercase; padding:6px 0; border-top:1px dashed #fca5a5; }
  </style>
</head>
<body>
<div class="page">

  <div class="header-bar">
    <div class="org-logo">
      <div class="org-icon">&#10010;</div>
      <div>
        <div class="org-name">Peoples Health Care</div>
        <div class="org-sub">Dr. M.T.D Jayaweera (MBBS Sri Lanka, SLMC Reg No - 14508)</div>
        <div class="org-sub">No. 123, Akuressa Road, Isadeen Town, Matara</div>
      </div>
    </div>
    <div class="report-meta">
      <h2>Laboratory Test Report</h2>
      <p>Generated: ${now}</p>
      <div class="report-id">${result.testId || 'N/A'}</div>
    </div>
  </div>

  <div class="badge-row">
    <div class="badge"><span class="badge-dot"></span>Test Completed</div>
  </div>

  ${abnormalBanner}

  <div class="info-grid">
    <div class="info-cell">
      <div class="info-label">Patient Name</div>
      <div class="info-value">${result.patientName || '—'}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Patient ID</div>
      <div class="info-value">${result.patientId || '—'}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Test Name</div>
      <div class="info-value">${result.testName}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Test ID</div>
      <div class="info-value">${result.testId || '—'}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Appointment ID</div>
      <div class="info-value">${result.appointmentId || '—'}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Payment ID</div>
      <div class="info-value">${result.paymentId || '—'}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Completed At</div>
      <div class="info-value">${completedAt}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-dot"></div>
      <span class="section-title">Clinical Findings</span>
    </div>
    <ul class="findings-list">${findingsRows}</ul>
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-dot"></div>
      <span class="section-title">Test Parameters</span>
    </div>
    <table class="param-table">
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Reference Range</th>
          <th>Result</th>
          <th>Flag</th>
        </tr>
      </thead>
      <tbody>${paramRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-dot"></div>
      <span class="section-title">Lab Notes / Remarks</span>
    </div>
    ${labNotes
      ? `<div class="notes-box">${labNotes}</div>`
      : `<div class="notes-box no-notes">No additional notes recorded.</div>`}
  </div>

  <div class="footer">
    <div class="footer-left">
      <p><strong>Performed by:</strong> ${performedBy || '—'}</p>
      <p>This report is generated by the Laboratory Information System.</p>
      <p>For queries, contact the Laboratory Department.</p>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">${performedBy || 'Laboratory Staff'}</div>
      <div class="sig-label">Authorised Signatory</div>
    </div>
  </div>
  <div class="confidential">⚕ Confidential — For Patient &amp; Authorised Personnel Only ⚕</div>

</div>
</body>
</html>`;
}

// ── Checkbox item ─────────────────────────────────────────────────────
function CheckItem({ label, checked, onToggle, readOnly }) {
  return (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={readOnly ? undefined : onToggle}
      activeOpacity={readOnly ? 1 : 0.8}
    >
      <View style={[styles.checkbox, checked && { backgroundColor: C.primary, borderColor: C.primary }]}>
        {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={[styles.checkLabel, checked && { color: '#1e293b' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Parameter row ─────────────────────────────────────────────────────
function ParamRow({ param, value, flag, onChange, readOnly }) {
  const flagMeta = FLAG_COLORS[flag] || null;
  return (
    <View style={styles.paramContainer}>
      <View style={styles.paramHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.paramName}>{param.name}</Text>
          <Text style={styles.paramRef}>Ref: {param.ref}  ·  Unit: {param.unit || '—'}</Text>
        </View>
        {flag && flagMeta && (
          <View style={[styles.flagPill, { backgroundColor: flagMeta.bg }]}>
            <Text style={[styles.flagText, { color: flagMeta.text }]}>{flag}</Text>
          </View>
        )}
      </View>
      {readOnly ? (
        <Text style={styles.paramValueReadOnly}>{value || '—'} {param.unit}</Text>
      ) : (
        <TextInput
          style={[
            styles.paramInput,
            flag === 'High' && styles.inputHigh,
            flag === 'Low'  && styles.inputLow,
          ]}
          placeholder={`Enter value (${param.unit || 'text'})`}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
        />
      )}
    </View>
  );
}

// ── Main ───────────────────────────────────────────────────────────────
export default function LabUploadResults() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { resultId, testName, readOnly: roParam } = route.params || {};

  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pdfBusy,   setPdfBusy]   = useState(false);

  const [checkboxes,  setCheckboxes]  = useState([]);
  const [params,      setParams]      = useState([]);
  const [labNotes,    setLabNotes]    = useState('');
  const [performedBy, setPerformedBy] = useState('');

  const readOnly = roParam || submitted || result?.status === 'completed';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: rd } = await api.get(`/lab-results/${resultId}`);
      const r = rd.result || rd;
      setResult(r);

      if (r.status === 'completed' && r.results) {
        setCheckboxes(r.results.checkboxFindings || []);
        setParams(r.results.parameters?.map(p => ({ ...p })) || []);
        setLabNotes(r.results.labNotes || '');
        setPerformedBy(r.results.performedBy || '');
        setSubmitted(true);
      } else {
        const enc = encodeURIComponent(testName || r.testName);
        const { data: td } = await api.get(`/lab-results/result-fields/${enc}`);
        const t = td.template;
        setCheckboxes(t.checkboxes.map(c => ({ label: c.label, checked: c.defaultChecked || false })));
        setParams(t.parameters.map(p => ({
          name: p.name, unit: p.unit, ref: p.ref,
          min: p.min, max: p.max, positiveThreshold: p.positiveThreshold ?? null,
          value: '', flag: '',
        })));
      }
    } catch {
      Alert.alert('Error', 'Could not load result template.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [resultId, testName]);

  useEffect(() => { load(); }, [load]);

  const toggleCheck = (i) => {
    setCheckboxes(prev => prev.map((c, idx) => idx === i ? { ...c, checked: !c.checked } : c));
  };

  const updateParam = (i, value) => {
    setParams(prev => prev.map((p, idx) => {
      if (idx !== i) return p;
      const flag = autoFlag(value, p.min, p.max, p.positiveThreshold);
      return { ...p, value, flag };
    }));
  };

  const submit = async () => {
    if (!params.some(p => p.value.trim() !== '')) {
      Alert.alert('Required', 'Please enter at least one test parameter result.');
      return;
    }
    if (!performedBy.trim()) {
      Alert.alert('Required', 'Please enter the name of the person who performed the test.');
      return;
    }
    Alert.alert(
      'Upload Results',
      `Upload results for ${result.testName}?\n\nThis will notify the patient and doctor immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload', style: 'default',
          onPress: async () => {
            try {
              setSaving(true);
              await api.put(`/lab-results/${resultId}/upload-results`, {
                checkboxFindings: checkboxes,
                parameters: params.map(p => ({
                  name: p.name, value: p.value, unit: p.unit, ref: p.ref, flag: p.flag,
                })),
                labNotes,
                performedBy,
              });
              setSubmitted(true);
              const { data: rd } = await api.get(`/lab-results/${resultId}`);
              setResult(rd.result || rd);
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Could not upload results.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // ── PDF generation ────────────────────────────────────────────────────
  const downloadPdf = async () => {
    try {
      setPdfBusy(true);
      const html = buildPdfHtml(result, checkboxes, params, labNotes, performedBy);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${result.testName} – ${result.patientName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (err) {
      Alert.alert('Error', 'Could not generate PDF. ' + (err.message || ''));
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading || !result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.topBarTitle}>{readOnly ? 'Test Report' : 'Upload Results'}</Text>
            <Text style={styles.topBarSub}>{result.testName} · {result.patientName || 'Unknown'}</Text>
          </View>
          {readOnly && (
            <TouchableOpacity onPress={downloadPdf} style={styles.pdfBtn} disabled={pdfBusy}>
              {pdfBusy
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Ionicons name="document-text-outline" size={22} color={C.primary} />
              }
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {submitted && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={styles.successText}>Results uploaded — patient and doctor have been notified.</Text>
            </View>
          )}

          {/* Patient info */}
          <View style={styles.infoCard}>
            <InfoRow icon="person-outline"   label="Patient"     value={result.patientName || '—'} />
            <InfoRow icon="card-outline"     label="Patient ID"  value={result.patientId   || '—'} />
            <InfoRow icon="calendar-outline" label="Appointment" value={result.appointmentId}      />
            <InfoRow icon="receipt-outline"  label="Payment ID"  value={result.paymentId   || '—'} />
          </View>

          {/* Checkboxes */}
          <SectionLabel>Clinical Findings</SectionLabel>
          <View style={styles.card}>
            {checkboxes.map((c, i) => (
              <View key={i}>
                <CheckItem label={c.label} checked={c.checked} onToggle={() => toggleCheck(i)} readOnly={readOnly} />
                {i < checkboxes.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          {/* Parameters */}
          <SectionLabel>Test Parameters</SectionLabel>
          <View style={styles.card}>
            {params.map((p, i) => (
              <View key={i}>
                <ParamRow
                  param={p} value={p.value} flag={p.flag}
                  onChange={(v) => updateParam(i, v)}
                  readOnly={readOnly}
                />
                {i < params.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          {/* Performed by */}
          <SectionLabel>Performed By</SectionLabel>
          {readOnly ? (
            <View style={[styles.card, { padding: 14 }]}>
              <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: '600' }}>{performedBy || '—'}</Text>
            </View>
          ) : (
            <TextInput
              style={styles.singleInput}
              placeholder="Full name of lab technician"
              placeholderTextColor="#94a3b8"
              value={performedBy}
              onChangeText={setPerformedBy}
            />
          )}

          {/* Lab notes */}
          <SectionLabel>Lab Notes / Remarks</SectionLabel>
          {readOnly ? (
            <View style={[styles.card, { padding: 14 }]}>
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20 }}>{labNotes || 'No additional notes.'}</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <TextInput
                style={styles.notesInput}
                placeholder="Additional observations or recommendations…"
                placeholderTextColor="#94a3b8"
                value={labNotes}
                onChangeText={setLabNotes}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Flag legend */}
          {!readOnly && (
            <View style={styles.legendRow}>
              {[['Normal','#16A34A'],['High','#DC2626'],['Low','#2563EB'],['Positive','#DC2626'],['Negative','#16A34A']].map(([label,color]) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={[styles.legendText, { color }]}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action buttons */}
          {!readOnly ? (
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              onPress={submit}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Upload &amp; Notify Patient + Doctor</Text>
                  </>
              }
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#DC2626' }, pdfBusy && styles.btnDisabled]}
                onPress={downloadPdf}
                disabled={pdfBusy}
                activeOpacity={0.85}
              >
                {pdfBusy
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="document-text-outline" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Download PDF Report</Text>
                    </>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: C.primary }]}
                onPress={() => navigation.navigate('LabTabs')}
                activeOpacity={0.85}
              >
                <Ionicons name="home-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}
function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color="#64748b" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0', ...SHADOW.sm,
  },
  backBtn:     { padding: 4 },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  topBarSub:   { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  pdfBtn:      { padding: 6 },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#D1FAE5', borderRadius: RADIUS.md, padding: 14, marginBottom: 16,
  },
  successText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 18 },

  infoCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: 16, ...SHADOW.sm },
  infoRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel:{ fontSize: 12, color: '#64748b', width: 90 },
  infoValue:{ flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '600', textAlign: 'right' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 16, marginBottom: 8 },
  card:         { backgroundColor: '#fff', borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.sm },
  divider:      { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 14 },

  checkRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  checkbox:   { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkLabel: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 18 },

  paramContainer: { padding: 14, gap: 8 },
  paramHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  paramName:      { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  paramRef:       { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  paramInput:     { backgroundColor: '#f8fafc', borderRadius: RADIUS.sm, padding: 10, fontSize: 14, color: '#1e293b', borderWidth: 1.5, borderColor: '#e2e8f0' },
  inputHigh:      { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  inputLow:       { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  paramValueReadOnly: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  flagPill:  { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  flagText:  { fontSize: 11, fontWeight: '700' },

  singleInput: {
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 14,
    fontSize: 14, color: '#1e293b', borderWidth: 1.5, borderColor: '#e2e8f0', ...SHADOW.sm,
  },
  notesInput: { padding: 14, fontSize: 13, color: '#1e293b', minHeight: 100 },

  legendRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: RADIUS.md, paddingVertical: 15,
    marginTop: 20, ...SHADOW.md,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled:    { opacity: 0.6 },
});