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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import api from '../../services/api';
import { COLORS, SHADOW } from '../../constants/theme';

const C = COLORS?.patient || {
  primary: '#0D2137',
  secondary: '#1565C0',
  accent: '#00ACC1',
  light: '#E0F2FE',
};

const CLINIC = {
  name: "People's Health Care",
  doctor: 'Dr. M.T.D Jayaweera',
  qualification: 'MBBS (Sri Lanka)',
  slmc: 'SLMC Reg No - 14508',
  address: 'No. 123, Akuressa Road, Isadeen Town, Matara.',
  tel: 'Tele - 041 2221761',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pre_check', label: 'Pre-Check' },
  { key: 'sample_received', label: 'Sample' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_STYLES = {
  pre_check: {
    label: 'Pre-Check',
    bg: '#FFF7ED',
    text: '#C2410C',
    border: '#FED7AA',
    icon: 'clipboard-outline',
  },
  payment_pending: {
    label: 'Payment Pending',
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#FECACA',
    icon: 'card-outline',
  },
  sample_received: {
    label: 'Sample Received',
    bg: '#EFF6FF',
    text: '#1D4ED8',
    border: '#BFDBFE',
    icon: 'flask-outline',
  },
  in_progress: {
    label: 'In Progress',
    bg: '#EDE9FE',
    text: '#7C3AED',
    border: '#DDD6FE',
    icon: 'sync-outline',
  },
  completed: {
    label: 'Completed',
    bg: '#ECFDF5',
    text: '#047857',
    border: '#A7F3D0',
    icon: 'checkmark-circle-outline',
  },
};

function extractLabResults(payload) {
  if (!payload) return [];

  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.results)) return data.data.results;

  return [];
}

function extractNotifications(payload) {
  if (!payload) return [];

  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.notifications)) return data.data.notifications;

  return [];
}

function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.pre_check;
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

function getFlagStyle(flag) {
  if (['High', 'Positive', 'Reactive'].includes(flag)) {
    return {
      bg: '#FEE2E2',
      text: '#B91C1C',
      border: '#FECACA',
    };
  }

  if (flag === 'Low') {
    return {
      bg: '#FEF3C7',
      text: '#B45309',
      border: '#FDE68A',
    };
  }

  if (flag === 'Negative' || flag === 'Normal') {
    return {
      bg: '#DCFCE7',
      text: '#047857',
      border: '#BBF7D0',
    };
  }

  return {
    bg: '#F1F5F9',
    text: '#64748B',
    border: '#E2E8F0',
  };
}

function mapNotificationById(notifications) {
  const map = {};

  notifications.forEach((item) => {
    if (item?._id) {
      map[item._id] = item;
    }
  });

  return map;
}

function safeText(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function escapeHtml(value) {
  return safeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLabReportHtml(result) {
  const parameters = result?.results?.parameters || [];
  const findings = result?.results?.checkboxFindings || [];
  const completedDate = formatDate(result?.completedAt || result?.updatedAt);
  const generatedDate = formatDate(new Date().toISOString());

  const rows = parameters
    .map((p) => {
      const flag = p?.flag || 'Normal';
      const style = getFlagStyle(flag);

      return `
        <tr>
          <td>${escapeHtml(p?.name)}</td>
          <td class="value">
            ${escapeHtml(p?.value)} ${escapeHtml(p?.unit || '')}
            ${
              flag && flag !== 'Normal'
                ? `<span style="color:${style.text};font-size:11px;">(${escapeHtml(flag)})</span>`
                : ''
            }
          </td>
          <td>${escapeHtml(p?.ref || '')}</td>
        </tr>
      `;
    })
    .join('');

  const findingItems = findings
    .filter((item) => item?.checked)
    .map((item) => `<li>${escapeHtml(item?.label)}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0F172A;
      background: #FFFFFF;
    }

    .page {
      max-width: 760px;
      margin: 0 auto;
      padding-bottom: 40px;
    }

    .header {
      background: linear-gradient(135deg, #0D2137, #1565C0);
      color: white;
      padding: 28px 32px;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }

    .clinic-name {
      font-size: 22px;
      font-weight: 700;
      font-family: Georgia, serif;
    }

    .small {
      font-size: 11px;
      opacity: 0.78;
      margin-top: 4px;
    }

    .report-id {
      text-align: right;
    }

    .report-id .id {
      font-size: 18px;
      font-weight: 700;
      font-family: monospace;
      margin-top: 3px;
    }

    .patient-band {
      background: #E3F2FD;
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #1565C0;
    }

    .label {
      font-size: 11px;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
    }

    .big {
      font-size: 18px;
      font-weight: 700;
      color: #0D2137;
      margin-top: 4px;
    }

    .section {
      padding: 24px 32px 0;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1565C0;
      margin-bottom: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #E0F2F1;
    }

    th {
      padding: 10px 14px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #1565C0;
      background: #E3F2FD;
    }

    td {
      padding: 10px 14px;
      border-bottom: 1px solid #E0F2F1;
      font-size: 13px;
    }

    td.value {
      font-weight: 700;
      color: #00695C;
    }

    .notes {
      background: #FFFDE7;
      border: 1px solid #FFF9C4;
      border-radius: 8px;
      padding: 16px;
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
    }

    ul {
      margin: 0;
      padding: 16px 16px 16px 36px;
      background: #F8FAFC;
      border: 1px solid #E3F2FD;
      border-radius: 8px;
    }

    li {
      margin: 5px 0;
      font-size: 13px;
    }

    .footer {
      margin: 24px 32px 0;
      padding-top: 16px;
      border-top: 1px solid #E3F2FD;
      text-align: center;
      font-size: 11px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-row">
        <div>
          <div class="clinic-name">${escapeHtml(CLINIC.name)}</div>
          <div class="small">${escapeHtml(CLINIC.doctor)}</div>
          <div class="small">${escapeHtml(CLINIC.qualification)} · ${escapeHtml(CLINIC.slmc)}</div>
          <div class="small">${escapeHtml(CLINIC.address)}</div>
          <div class="small">${escapeHtml(CLINIC.tel)}</div>
        </div>

        <div class="report-id">
          <div class="small">Report ID</div>
          <div class="id">${escapeHtml(result?.testId)}</div>
          <div class="small">Completed: ${escapeHtml(completedDate)}</div>
          ${
            result?.labRequestRef
              ? `<div class="small">Ref: ${escapeHtml(result.labRequestRef)}</div>`
              : ''
          }
        </div>
      </div>
    </div>

    <div class="patient-band">
      <div>
        <div class="label">Patient</div>
        <div class="big">${escapeHtml(result?.patientName)}</div>
        <div class="small">ID: ${escapeHtml(result?.patientId)}</div>
      </div>

      <div style="text-align:right;">
        <div class="label">Test</div>
        <div class="big" style="color:#1565C0;">${escapeHtml(result?.testName)}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Test Parameters</div>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Result</th>
            <th>Reference Range</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows ||
            '<tr><td colspan="3" style="padding:16px;text-align:center;color:#94A3B8;">No parameters recorded</td></tr>'
          }
        </tbody>
      </table>
    </div>

    ${
      findingItems
        ? `
          <div class="section">
            <div class="section-title">Clinical Findings</div>
            <ul>${findingItems}</ul>
          </div>
        `
        : ''
    }

    ${
      result?.results?.labNotes
        ? `
          <div class="section">
            <div class="section-title">Lab Notes</div>
            <div class="notes">${escapeHtml(result.results.labNotes)}</div>
          </div>
        `
        : ''
    }

    <div class="footer">
      Generated on ${escapeHtml(generatedDate)} · ${escapeHtml(CLINIC.name)} · ${escapeHtml(CLINIC.tel)}
    </div>
  </div>
</body>
</html>
  `;
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

function ResultParameter({ parameter }) {
  const flag = parameter?.flag || 'Normal';
  const flagStyle = getFlagStyle(flag);

  return (
    <View style={styles.parameterCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.parameterName}>{parameter?.name || 'Parameter'}</Text>

        <Text style={styles.parameterRef}>
          Ref: {parameter?.ref || '—'}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.parameterValue}>
          {safeText(parameter?.value)} {parameter?.unit || ''}
        </Text>

        <View
          style={[
            styles.flagChip,
            {
              backgroundColor: flagStyle.bg,
              borderColor: flagStyle.border,
            },
          ]}
        >
          <Text style={[styles.flagText, { color: flagStyle.text }]}>
            {flag}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PreCheckBox({ result, notification }) {
  const pre = result?.preTestConditions || {};
  const checkboxes = Array.isArray(pre?.checkboxes) ? pre.checkboxes : [];
  const shortAnswers = Array.isArray(pre?.shortAnswers) ? pre.shortAnswers : [];

  const fastingHours = notification?.fastingHours ?? 0;
  const isReady = notification?.isReady ?? true;
  const remainingTime = notification?.remainingTime;

  return (
    <View style={styles.preCheckBox}>
      <View style={styles.preHeader}>
        <Ionicons
          name={isReady ? 'checkmark-circle-outline' : 'time-outline'}
          size={22}
          color={isReady ? '#047857' : '#C2410C'}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.preTitle,
              {
                color: isReady ? '#047857' : '#C2410C',
              },
            ]}
          >
            {isReady ? 'Ready for sample collection' : 'Pre-check waiting period'}
          </Text>

          <Text style={styles.preSub}>
            {fastingHours > 0
              ? `${fastingHours} hour fasting / waiting requirement`
              : 'No special fasting requirement'}
          </Text>
        </View>
      </View>

      {!isReady && !!remainingTime && (
        <Text style={styles.remainingText}>
          Remaining time: {remainingTime}
        </Text>
      )}

      {checkboxes.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.miniTitle}>Pre-Test Conditions</Text>

          {checkboxes.map((item, index) => (
            <View key={`cb-${index}`} style={styles.checkRow}>
              <Ionicons
                name={item?.checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={17}
                color={item?.checked ? '#047857' : '#94A3B8'}
              />

              <Text style={styles.checkText}>
                {item?.label || item?.text || safeText(item)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {shortAnswers.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.miniTitle}>Patient Notes / Answers</Text>

          {shortAnswers.map((item, index) => (
            <View key={`sa-${index}`} style={styles.answerBox}>
              <Text style={styles.answerQuestion}>
                {item?.question || `Question ${index + 1}`}
              </Text>
              <Text style={styles.answerText}>
                {item?.answer || item?.value || '—'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function LabResultCard({
  result,
  expanded,
  onToggle,
  onDownload,
  downloading,
  notification,
}) {
  const status = result?.status || 'pre_check';
  const statusStyle = getStatusStyle(status);
  const parameters = result?.results?.parameters || [];
  const findings = result?.results?.checkboxFindings || [];

  return (
    <View style={styles.resultCard}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onToggle}
        style={styles.cardHeader}
      >
        <View style={styles.resultIcon}>
          <MaterialCommunityIcons name="flask-outline" size={27} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.testName}>{result?.testName || 'Lab Test'}</Text>

          <Text style={styles.testMeta} numberOfLines={2}>
            {result?.testId || '—'} · {formatDate(result?.createdAt)}
          </Text>

          {!!result?.labRequestRef && (
            <View style={styles.refChip}>
              <Ionicons name="link-outline" size={12} color="#64748B" />
              <Text style={styles.refChipText}>
                Ref: {result.labRequestRef}
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
            <Text style={styles.detailLabel}>Patient</Text>
            <Text style={styles.detailValue}>{result?.patientName || '—'}</Text>
          </View>

          <View style={styles.detailLine}>
            <Text style={styles.detailLabel}>Appointment</Text>
            <Text style={styles.detailValue}>{result?.appointmentId || '—'}</Text>
          </View>

          <View style={styles.detailLine}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{formatDateTime(result?.createdAt)}</Text>
          </View>

          {!!result?.completedAt && (
            <View style={styles.detailLine}>
              <Text style={styles.detailLabel}>Completed</Text>
              <Text style={styles.detailValue}>{formatDateTime(result?.completedAt)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {status === 'pre_check' && (
            <PreCheckBox result={result} notification={notification} />
          )}

          {status === 'completed' ? (
            <>
              <Text style={styles.subSectionTitle}>Result Parameters</Text>

              {parameters.length === 0 ? (
                <View style={styles.emptySmallBox}>
                  <Ionicons name="document-text-outline" size={22} color="#94A3B8" />
                  <Text style={styles.emptySmallText}>
                    No result parameters are recorded.
                  </Text>
                </View>
              ) : (
                parameters.map((parameter, index) => (
                  <ResultParameter
                    key={`${result?._id}-param-${index}`}
                    parameter={parameter}
                  />
                ))
              )}

              {findings.filter((item) => item?.checked).length > 0 && (
                <View style={styles.findingBox}>
                  <Text style={styles.subSectionTitle}>Clinical Findings</Text>

                  {findings
                    .filter((item) => item?.checked)
                    .map((item, index) => (
                      <View key={`finding-${index}`} style={styles.findingRow}>
                        <Ionicons name="checkmark-circle" size={17} color="#047857" />
                        <Text style={styles.findingText}>{item?.label}</Text>
                      </View>
                    ))}
                </View>
              )}

              {!!result?.results?.labNotes && (
                <View style={styles.notesBox}>
                  <View style={styles.notesHeader}>
                    <Ionicons name="reader-outline" size={18} color="#92400E" />
                    <Text style={styles.notesTitle}>Lab Notes</Text>
                  </View>

                  <Text style={styles.notesText}>{result.results.labNotes}</Text>
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
                      Download Lab Report PDF
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.pendingBox}>
              <Ionicons name="information-circle-outline" size={21} color="#64748B" />
              <Text style={styles.pendingText}>
                The official result PDF will be available after the lab marks this test as completed.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function EmptyState({ onRefresh }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBox}>
        <MaterialCommunityIcons name="flask-empty-outline" size={42} color={C.primary} />
      </View>

      <Text style={styles.emptyTitle}>No lab results found</Text>

      <Text style={styles.emptyText}>
        Your lab tests and reports will appear here after lab requests are created.
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

export default function PatientLabResults() {
  const [results, setResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadLabResults = useCallback(async () => {
    try {
      setErrorMessage('');

      const [resultResponse, notificationResponse] = await Promise.allSettled([
        api.get('/lab-results'),
        api.get('/lab-results/patient-notifications'),
      ]);

      if (resultResponse.status === 'fulfilled') {
        const list = extractLabResults(resultResponse.value);
        const sorted = [...list].sort((a, b) => {
          const aTime = new Date(a?.createdAt || 0).getTime();
          const bTime = new Date(b?.createdAt || 0).getTime();
          return bTime - aTime;
        });

        setResults(sorted);
      } else {
        throw resultResponse.reason;
      }

      if (notificationResponse.status === 'fulfilled') {
        setNotifications(extractNotifications(notificationResponse.value));
      } else {
        setNotifications([]);
      }
    } catch (error) {
      const message =
        error?.message ||
        'Unable to load lab results. Please try again.';

      setErrorMessage(message);
      console.log('Lab results load error:', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLabResults();
  }, [loadLabResults]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLabResults();
  };

  const notificationMap = useMemo(() => {
    return mapNotificationById(notifications);
  }, [notifications]);

  const filteredResults = useMemo(() => {
    if (selectedFilter === 'all') return results;

    return results.filter((item) => item?.status === selectedFilter);
  }, [results, selectedFilter]);

  const stats = useMemo(() => {
    return {
      total: results.length,
      preCheck: results.filter((item) => item?.status === 'pre_check').length,
      inProgress: results.filter((item) => item?.status === 'in_progress').length,
      completed: results.filter((item) => item?.status === 'completed').length,
    };
  }, [results]);

  const toggleExpanded = (result) => {
    const id = result?._id || result?.testId;

    setExpandedId((current) => (current === id ? null : id));
  };

  const handleDownloadPdf = async (result) => {
    if (result?.status !== 'completed') {
      Alert.alert(
        'Report Not Ready',
        'The lab report PDF is available only after the test is completed.'
      );
      return;
    }

    try {
      setDownloadingId(result?._id);

      const html = buildLabReportHtml(result);
      const pdf = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(pdf.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Lab Report PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'PDF Generated',
          `The lab report PDF was saved to:\n${pdf.uri}`
        );
      }
    } catch (error) {
      const message =
        error?.message ||
        'Unable to generate lab report PDF. Please try again.';

      Alert.alert('PDF Failed', message);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading lab results...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={filteredResults}
        keyExtractor={(item, index) => item?._id || item?.testId || String(index)}
        renderItem={({ item }) => {
          const id = item?._id || item?.testId;

          return (
            <LabResultCard
              result={item}
              expanded={expandedId === id}
              onToggle={() => toggleExpanded(item)}
              onDownload={() => handleDownloadPdf(item)}
              downloading={downloadingId === item?._id}
              notification={notificationMap[item?._id]}
            />
          );
        }}
        contentContainerStyle={[
          styles.listContent,
          filteredResults.length === 0 && {
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
                <MaterialCommunityIcons name="flask-outline" size={31} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroSmall}>Patient Lab Results</Text>
                <Text style={styles.heroTitle}>My Lab Reports</Text>
                <Text style={styles.heroSub}>
                  View lab test progress, pre-check instructions, and completed reports.
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatCard
                label="Total"
                value={stats.total}
                icon="flask-outline"
                color={C.primary}
                bg={C.light || '#E0F2FE'}
              />

              <StatCard
                label="Pre-Check"
                value={stats.preCheck}
                icon="clipboard-outline"
                color="#C2410C"
                bg="#FFF7ED"
              />

              <StatCard
                label="Completed"
                value={stats.completed}
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
                  ? 'All Lab Results'
                  : `${FILTERS.find((item) => item.key === selectedFilter)?.label} Results`}
              </Text>

              <Text style={styles.sectionCount}>
                {filteredResults.length}
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

  resultCard: {
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

  resultIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  testName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  testMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
    lineHeight: 17,
  },

  refChip: {
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

  refChipText: {
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

  preCheckBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    padding: 13,
  },

  preHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  preTitle: {
    fontSize: 13,
    fontWeight: '900',
  },

  preSub: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  remainingText: {
    marginTop: 10,
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '900',
  },

  miniTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 7,
  },

  checkText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  answerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 8,
  },

  answerQuestion: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '900',
  },

  answerText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  subSectionTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  parameterCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },

  parameterName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },

  parameterRef: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  parameterValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  flagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },

  flagText: {
    fontSize: 10,
    fontWeight: '900',
  },

  findingBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 13,
    gap: 8,
  },

  findingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  findingText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
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

  pendingBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    gap: 9,
  },

  pendingText: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
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

  emptySmallBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  emptySmallText: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
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
});