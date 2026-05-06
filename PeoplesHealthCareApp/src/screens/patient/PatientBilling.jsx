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
  { key: 'paid', label: 'Paid' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'pending', label: 'Pending' },
];

const STATUS_STYLES = {
  paid: {
    label: 'Paid',
    bg: '#ECFDF5',
    text: '#047857',
    border: '#A7F3D0',
    icon: 'checkmark-circle-outline',
  },
  unpaid: {
    label: 'Unpaid',
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#FECACA',
    icon: 'close-circle-outline',
  },
  pending: {
    label: 'Pending',
    bg: '#FFF7ED',
    text: '#C2410C',
    border: '#FED7AA',
    icon: 'time-outline',
  },
  partially_paid: {
    label: 'Partially Paid',
    bg: '#EFF6FF',
    text: '#1D4ED8',
    border: '#BFDBFE',
    icon: 'card-outline',
  },
};

function normalizeStatus(value) {
  const raw = String(value || 'pending').toLowerCase().trim();

  if (raw === 'paid' || raw === 'completed') return 'paid';
  if (raw === 'unpaid' || raw === 'not paid') return 'unpaid';
  if (raw === 'partially paid' || raw === 'partial' || raw === 'partially_paid') {
    return 'partially_paid';
  }

  return 'pending';
}

function getStatusStyle(status) {
  return STATUS_STYLES[normalizeStatus(status)] || STATUS_STYLES.pending;
}

function extractBills(payload) {
  if (!payload) return [];

  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.bills)) return data.bills;
  if (Array.isArray(data?.billings)) return data.billings;
  if (Array.isArray(data?.payments)) return data.payments;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.bills)) return data.data.bills;
  if (Array.isArray(data?.data?.billings)) return data.data.billings;

  return [];
}

function formatMoney(value) {
  const num = Number(value || 0);

  if (Number.isNaN(num)) return 'LKR 0.00';

  return `LKR ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function numberValue(value) {
  const num = Number(value || 0);
  return Number.isNaN(num) ? 0 : num;
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

function getBillId(bill) {
  return bill?.billId || bill?.billingId || bill?.invoiceId || bill?._id || 'Bill';
}

function getBillDate(bill) {
  return bill?.billDate || bill?.date || bill?.createdAt || bill?.updatedAt;
}

function getConsultationFee(bill) {
  return numberValue(
    bill?.doctorConsultationFee ||
      bill?.consultationFee ||
      bill?.doctorFee ||
      bill?.charges?.consultationFee ||
      bill?.charges?.doctorFee
  );
}

function getMedicineItems(bill) {
  const items =
    bill?.medicineDetails ||
    bill?.medicines ||
    bill?.medicineItems ||
    bill?.pharmacyItems ||
    bill?.charges?.medicines ||
    [];

  return Array.isArray(items) ? items : [];
}

function getLabItems(bill) {
  const items =
    bill?.laboratoryTestDetails ||
    bill?.labTestDetails ||
    bill?.labTests ||
    bill?.labItems ||
    bill?.charges?.labTests ||
    [];

  return Array.isArray(items) ? items : [];
}

function getItemName(item) {
  return item?.name || item?.medicineName || item?.testName || item?.label || item?.title || 'Item';
}

function getItemQty(item) {
  return numberValue(item?.quantity || item?.qty || 1);
}

function getItemUnitPrice(item) {
  return numberValue(item?.price || item?.cost || item?.unitPrice || item?.fee || item?.amount);
}

function getItemTotal(item) {
  const explicitTotal = item?.total || item?.totalPrice || item?.lineTotal || item?.amount;

  if (explicitTotal !== undefined && explicitTotal !== null) {
    return numberValue(explicitTotal);
  }

  return getItemQty(item) * getItemUnitPrice(item);
}

function getMedicineTotal(bill) {
  return getMedicineItems(bill).reduce((sum, item) => sum + getItemTotal(item), 0);
}

function getLabTotal(bill) {
  return getLabItems(bill).reduce((sum, item) => sum + getItemTotal(item), 0);
}

function getBillTotal(bill) {
  const direct =
    bill?.totalAmount ||
    bill?.grandTotal ||
    bill?.netTotal ||
    bill?.amount ||
    bill?.total ||
    bill?.charges?.totalAmount;

  if (direct !== undefined && direct !== null) {
    return numberValue(direct);
  }

  return getConsultationFee(bill) + getMedicineTotal(bill) + getLabTotal(bill);
}

function buildBillHtml(bill) {
  const billId = getBillId(bill);
  const consultationFee = getConsultationFee(bill);
  const medicineItems = getMedicineItems(bill);
  const labItems = getLabItems(bill);
  const medicineTotal = getMedicineTotal(bill);
  const labTotal = getLabTotal(bill);
  const totalAmount = getBillTotal(bill);
  const statusStyle = getStatusStyle(bill?.paymentStatus || bill?.status);

  const medicineRows = medicineItems
    .map((item) => {
      const qty = getItemQty(item);
      const unitPrice = getItemUnitPrice(item);
      const total = getItemTotal(item);

      return `
        <tr>
          <td>${escapeHtml(getItemName(item))}</td>
          <td>${escapeHtml(qty)}</td>
          <td>${escapeHtml(formatMoney(unitPrice))}</td>
          <td class="amount">${escapeHtml(formatMoney(total))}</td>
        </tr>
      `;
    })
    .join('');

  const labRows = labItems
    .map((item) => {
      const total = getItemTotal(item);

      return `
        <tr>
          <td>${escapeHtml(getItemName(item))}</td>
          <td>1</td>
          <td>${escapeHtml(formatMoney(total))}</td>
          <td class="amount">${escapeHtml(formatMoney(total))}</td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #0F172A;
      margin: 0;
      padding: 0;
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

    .invoice {
      text-align: right;
    }

    .invoice .id {
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

    .status {
      display: inline-block;
      padding: 7px 12px;
      border-radius: 999px;
      border: 1px solid ${statusStyle.border};
      background: ${statusStyle.bg};
      color: ${statusStyle.text};
      font-size: 12px;
      font-weight: 700;
      margin-top: 8px;
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
      border: 1px solid #E3F2FD;
      margin-bottom: 14px;
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
      border-bottom: 1px solid #E3F2FD;
      font-size: 13px;
    }

    td.amount {
      font-weight: 700;
      color: #0D2137;
      text-align: right;
    }

    .summary {
      margin: 24px 32px 0 auto;
      width: 320px;
      border: 1px solid #E3F2FD;
      border-radius: 10px;
      overflow: hidden;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #E3F2FD;
      font-size: 13px;
    }

    .summary-row.total {
      background: #0D2137;
      color: white;
      font-size: 16px;
      font-weight: 700;
      border-bottom: 0;
    }

    .note {
      margin: 24px 32px 0;
      padding: 14px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      color: #475569;
      font-size: 12px;
      line-height: 1.5;
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

        <div class="invoice">
          <div class="small">Invoice / Bill ID</div>
          <div class="id">${escapeHtml(billId)}</div>
          <div class="small">Bill Date: ${escapeHtml(formatDate(getBillDate(bill)))}</div>
          <div class="status">${escapeHtml(statusStyle.label)}</div>
        </div>
      </div>
    </div>

    <div class="patient-band">
      <div>
        <div class="label">Patient</div>
        <div class="big">${escapeHtml(bill?.patientName)}</div>
        <div class="small">ID: ${escapeHtml(bill?.patientId)}</div>
      </div>

      <div style="text-align:right;">
        <div class="label">Appointment</div>
        <div class="big" style="color:#1565C0;">${escapeHtml(bill?.appointmentId)}</div>
        ${
          bill?.prescriptionId
            ? `<div class="small">Prescription: ${escapeHtml(bill.prescriptionId)}</div>`
            : ''
        }
      </div>
    </div>

    <div class="section">
      <div class="section-title">Consultation Charge</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Fee</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Doctor Consultation Fee</td>
            <td>1</td>
            <td>${escapeHtml(formatMoney(consultationFee))}</td>
            <td class="amount">${escapeHtml(formatMoney(consultationFee))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Medicine Details</div>
      <table>
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            medicineRows ||
            '<tr><td colspan="4" style="text-align:center;color:#94A3B8;">No medicine charges</td></tr>'
          }
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Laboratory Test Details</div>
      <table>
        <thead>
          <tr>
            <th>Lab Test</th>
            <th>Qty</th>
            <th>Fee</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            labRows ||
            '<tr><td colspan="4" style="text-align:center;color:#94A3B8;">No laboratory charges</td></tr>'
          }
        </tbody>
      </table>
    </div>

    <div class="summary">
      <div class="summary-row">
        <span>Consultation</span>
        <strong>${escapeHtml(formatMoney(consultationFee))}</strong>
      </div>
      <div class="summary-row">
        <span>Medicines</span>
        <strong>${escapeHtml(formatMoney(medicineTotal))}</strong>
      </div>
      <div class="summary-row">
        <span>Lab Tests</span>
        <strong>${escapeHtml(formatMoney(labTotal))}</strong>
      </div>
      <div class="summary-row total">
        <span>Total Amount</span>
        <span>${escapeHtml(formatMoney(totalAmount))}</span>
      </div>
    </div>

    <div class="note">
      Payment method: Physical cash at the medical center cashier/pharmacy counter. Payment status is updated manually by authorized staff after successful payment.
    </div>

    <div class="footer">
      Generated on ${escapeHtml(formatDateTime(new Date().toISOString()))} · ${escapeHtml(CLINIC.name)} · ${escapeHtml(CLINIC.tel)}
    </div>
  </div>
</body>
</html>
  `;
}

async function fetchBillsFromPossibleEndpoints() {
  const endpoints = [
    '/bills/my',
    '/bills/patient',
    '/bills',
    '/billing/my',
    '/billing',
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      const list = extractBills(response);

      if (Array.isArray(list)) {
        return list;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load bills.');
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

function ChargeRow({ icon, title, subtitle, amount, iconColor, iconBg }) {
  return (
    <View style={styles.chargeRow}>
      <View style={[styles.chargeIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.chargeTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.chargeSubtitle}>{subtitle}</Text>}
      </View>

      <Text style={styles.chargeAmount}>{formatMoney(amount)}</Text>
    </View>
  );
}

function MedicineItem({ item }) {
  const qty = getItemQty(item);
  const unitPrice = getItemUnitPrice(item);
  const total = getItemTotal(item);

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemIcon}>
        <MaterialCommunityIcons name="pill" size={20} color={C.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{getItemName(item)}</Text>
        <Text style={styles.itemMeta}>
          Qty {qty} · {formatMoney(unitPrice)} each
        </Text>
      </View>

      <Text style={styles.itemAmount}>{formatMoney(total)}</Text>
    </View>
  );
}

function LabItem({ item }) {
  const total = getItemTotal(item);

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemIcon}>
        <MaterialCommunityIcons name="flask-outline" size={20} color={C.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{getItemName(item)}</Text>
        <Text style={styles.itemMeta}>Laboratory test fee</Text>
      </View>

      <Text style={styles.itemAmount}>{formatMoney(total)}</Text>
    </View>
  );
}

function BillCard({
  bill,
  expanded,
  onToggle,
  onDownload,
  downloading,
}) {
  const billId = getBillId(bill);
  const status = normalizeStatus(bill?.paymentStatus || bill?.status);
  const statusStyle = getStatusStyle(status);
  const consultationFee = getConsultationFee(bill);
  const medicines = getMedicineItems(bill);
  const labs = getLabItems(bill);
  const medicineTotal = getMedicineTotal(bill);
  const labTotal = getLabTotal(bill);
  const totalAmount = getBillTotal(bill);

  return (
    <View style={styles.billCard}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onToggle}
        style={styles.cardHeader}
      >
        <View style={styles.billIcon}>
          <Ionicons name="receipt-outline" size={27} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.billId}>{billId}</Text>

          <Text style={styles.billMeta} numberOfLines={2}>
            {formatDate(getBillDate(bill))} · {bill?.patientName || 'Patient'}
          </Text>

          {!!bill?.appointmentId && (
            <View style={styles.refChip}>
              <Ionicons name="calendar-outline" size={12} color="#64748B" />
              <Text style={styles.refChipText}>{bill.appointmentId}</Text>
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

          <Text style={styles.headerTotal}>{formatMoney(totalAmount)}</Text>

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
            <Text style={styles.detailLabel}>Bill Date</Text>
            <Text style={styles.detailValue}>{formatDateTime(getBillDate(bill))}</Text>
          </View>

          <View style={styles.detailLine}>
            <Text style={styles.detailLabel}>Patient ID</Text>
            <Text style={styles.detailValue}>{bill?.patientId || '—'}</Text>
          </View>

          <View style={styles.detailLine}>
            <Text style={styles.detailLabel}>Prescription</Text>
            <Text style={styles.detailValue}>{bill?.prescriptionId || '—'}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.subSectionTitle}>Charge Breakdown</Text>

          <ChargeRow
            icon="medical-outline"
            title="Doctor Consultation Fee"
            subtitle="Consultation charge"
            amount={consultationFee}
            iconColor="#2563EB"
            iconBg="#DBEAFE"
          />

          <ChargeRow
            icon="medkit-outline"
            title="Medicine Charges"
            subtitle={`${medicines.length} medicine item(s)`}
            amount={medicineTotal}
            iconColor="#7C3AED"
            iconBg="#EDE9FE"
          />

          <ChargeRow
            icon="flask-outline"
            title="Laboratory Charges"
            subtitle={`${labs.length} lab test item(s)`}
            amount={labTotal}
            iconColor="#047857"
            iconBg="#ECFDF5"
          />

          {medicines.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subSectionTitle}>Medicine Details</Text>

              {medicines.map((item, index) => (
                <MedicineItem
                  key={`${billId}-medicine-${index}`}
                  item={item}
                />
              ))}
            </>
          )}

          {labs.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subSectionTitle}>Lab Test Details</Text>

              {labs.map((item, index) => (
                <LabItem
                  key={`${billId}-lab-${index}`}
                  item={item}
                />
              ))}
            </>
          )}

          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{formatMoney(totalAmount)}</Text>
            </View>
          </View>

          <View
            style={[
              styles.paymentNote,
              status === 'paid' ? styles.paymentNotePaid : styles.paymentNotePending,
            ]}
          >
            <Ionicons
              name={status === 'paid' ? 'checkmark-circle-outline' : 'information-circle-outline'}
              size={20}
              color={status === 'paid' ? '#047857' : '#C2410C'}
            />
            <Text
              style={[
                styles.paymentNoteText,
                { color: status === 'paid' ? '#047857' : '#C2410C' },
              ]}
            >
              {status === 'paid'
                ? 'This bill is marked as paid.'
                : 'Please pay this bill using physical cash at the medical center counter. Staff will update the payment status after payment.'}
            </Text>
          </View>

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
                <Text style={styles.downloadButtonText}>Download Bill PDF</Text>
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
        <Ionicons name="receipt-outline" size={42} color={C.primary} />
      </View>

      <Text style={styles.emptyTitle}>No bills found</Text>

      <Text style={styles.emptyText}>
        Your consultation, medicine, and laboratory bills will appear here once generated by staff.
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

export default function PatientBilling() {
  const [bills, setBills] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadBills = useCallback(async () => {
    try {
      setErrorMessage('');

      const list = await fetchBillsFromPossibleEndpoints();

      const sorted = [...list].sort((a, b) => {
        const aTime = new Date(getBillDate(a) || 0).getTime();
        const bTime = new Date(getBillDate(b) || 0).getTime();
        return bTime - aTime;
      });

      setBills(sorted);
    } catch (error) {
      const message =
        error?.message ||
        'Unable to load billing records. Please try again.';

      setErrorMessage(message);
      console.log('Billing load error:', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBills();
  };

  const filteredBills = useMemo(() => {
    if (selectedFilter === 'all') return bills;

    return bills.filter((bill) => {
      const status = normalizeStatus(bill?.paymentStatus || bill?.status);
      return status === selectedFilter;
    });
  }, [bills, selectedFilter]);

  const stats = useMemo(() => {
    const totalValue = bills.reduce((sum, bill) => sum + getBillTotal(bill), 0);
    const paidBills = bills.filter(
      (bill) => normalizeStatus(bill?.paymentStatus || bill?.status) === 'paid'
    );
    const unpaidBills = bills.filter(
      (bill) => normalizeStatus(bill?.paymentStatus || bill?.status) !== 'paid'
    );

    const unpaidValue = unpaidBills.reduce((sum, bill) => sum + getBillTotal(bill), 0);

    return {
      count: bills.length,
      totalValue,
      paidCount: paidBills.length,
      unpaidCount: unpaidBills.length,
      unpaidValue,
    };
  }, [bills]);

  const toggleExpanded = (bill) => {
    const id = bill?._id || getBillId(bill);

    setExpandedId((current) => (current === id ? null : id));
  };

  const handleDownloadPdf = async (bill) => {
    try {
      const id = bill?._id || getBillId(bill);
      setDownloadingId(id);

      const html = buildBillHtml(bill);
      const pdf = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(pdf.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Bill PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'PDF Generated',
          `The bill PDF was saved to:\n${pdf.uri}`
        );
      }
    } catch (error) {
      const message =
        error?.message ||
        'Unable to generate bill PDF. Please try again.';

      Alert.alert('PDF Failed', message);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading bills...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={filteredBills}
        keyExtractor={(item, index) => item?._id || getBillId(item) || String(index)}
        renderItem={({ item }) => {
          const id = item?._id || getBillId(item);

          return (
            <BillCard
              bill={item}
              expanded={expandedId === id}
              onToggle={() => toggleExpanded(item)}
              onDownload={() => handleDownloadPdf(item)}
              downloading={downloadingId === id}
            />
          );
        }}
        contentContainerStyle={[
          styles.listContent,
          filteredBills.length === 0 && {
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
                <Ionicons name="receipt-outline" size={31} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroSmall}>Patient Billing</Text>
                <Text style={styles.heroTitle}>My Bills</Text>
                <Text style={styles.heroSub}>
                  View medical center bills, payment status, and download bill PDFs.
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                label="Bills"
                value={stats.count}
                icon="receipt-outline"
                color={C.primary}
                bg={C.light || '#E0F2FE'}
              />

              <StatCard
                label="Paid"
                value={stats.paidCount}
                icon="checkmark-done-outline"
                color="#047857"
                bg="#ECFDF5"
              />

              <StatCard
                label="Unpaid"
                value={stats.unpaidCount}
                icon="time-outline"
                color="#C2410C"
                bg="#FFF7ED"
              />
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name="cash-outline" size={24} color={C.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Outstanding Amount</Text>
                <Text style={styles.summaryValue}>{formatMoney(stats.unpaidValue)}</Text>
                <Text style={styles.summarySub}>
                  Pay pending bills using cash at the medical center counter.
                </Text>
              </View>
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
                  ? 'All Bills'
                  : `${FILTERS.find((item) => item.key === selectedFilter)?.label} Bills`}
              </Text>

              <Text style={styles.sectionCount}>
                {filteredBills.length}
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

  statsGrid: {
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

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 13,
    ...SHADOW.sm,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.light || '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },

  summaryValue: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },

  summarySub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 16,
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

  billCard: {
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

  billIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  billId: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  billMeta: {
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
    gap: 6,
  },

  headerTotal: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
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

  chargeRow: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  chargeIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chargeTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },

  chargeSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  chargeAmount: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },

  itemCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },

  itemMeta: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  itemAmount: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },

  totalBox: {
    backgroundColor: '#0B2545',
    borderRadius: 17,
    padding: 15,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    color: '#DBEAFE',
    fontSize: 14,
    fontWeight: '900',
  },

  totalValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  paymentNote: {
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    gap: 9,
    borderWidth: 1,
  },

  paymentNotePaid: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },

  paymentNotePending: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },

  paymentNoteText: {
    flex: 1,
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