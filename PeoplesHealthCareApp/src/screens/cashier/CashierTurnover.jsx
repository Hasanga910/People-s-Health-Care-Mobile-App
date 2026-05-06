import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../../services/api";

const ACCENT = "#01579B";

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <View
      style={[
        ts.toast,
        { backgroundColor: type === "success" ? "#059669" : "#DC2626" },
      ]}
    >
      <Text style={ts.toastText}>
        {type === "success" ? "✅" : "❌"} {msg}
      </Text>
    </View>
  );
}
const ts = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 999,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});

// ─── Report Detail Modal ──────────────────────────────────────────────────────
function ReportModal({ report, onClose }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={rm.overlay}>
        <Pressable style={rm.backdrop} onPress={onClose} />
        <View style={rm.sheet}>
          <LinearGradient
            colors={["#0D2137", "#01579B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={rm.header}
          >
            <View style={{ flex: 1 }}>
              <Text style={rm.headerSub}>Billing Turnover Report</Text>
              <Text style={rm.headerTitle}>{report.reportNumber}</Text>
              <Text style={rm.headerDate}>
                Submitted {new Date(report.createdAt).toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={rm.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {/* Summary */}
            <View style={rm.summaryGrid}>
              {[
                {
                  label: "Total Collected",
                  value: `LKR ${(report.totalCollected || 0).toLocaleString()}`,
                  color: ACCENT,
                  bg: "#E3F2FD",
                },
                {
                  label: "Outstanding",
                  value: `LKR ${(report.totalOutstanding || 0).toLocaleString()}`,
                  color: "#B71C1C",
                  bg: "#FFEBEE",
                },
                {
                  label: "Total Bills",
                  value: report.totalBills,
                  color: "#37474F",
                  bg: "#ECEFF1",
                },
                {
                  label: "Paid Bills",
                  value: report.paidBills,
                  color: ACCENT,
                  bg: "#E3F2FD",
                },
                {
                  label: "Unpaid Bills",
                  value: report.unpaidBills,
                  color: "#B71C1C",
                  bg: "#FFEBEE",
                },
              ].map((c) => (
                <View
                  key={c.label}
                  style={[rm.summaryCard, { backgroundColor: c.bg }]}
                >
                  <Text style={rm.summaryLbl}>{c.label}</Text>
                  <Text style={[rm.summaryVal, { color: c.color }]}>
                    {c.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Cashier note */}
            {!!report.note && (
              <View style={rm.noteBox}>
                <Text style={rm.noteLbl}>Cashier Note</Text>
                <Text style={rm.noteText}>{report.note}</Text>
              </View>
            )}

            {/* Bill snapshot */}
            {(report.billSnapshot || []).length > 0 && (
              <View style={rm.tableSection}>
                <Text style={rm.tableTitle}>
                  Bill Snapshot ({report.billSnapshot.length})
                </Text>
                <View style={rm.tableBox}>
                  <View style={rm.tableHead}>
                    <Text style={[rm.th, rm.billNoCol]}>Bill Number</Text>
                    <Text style={[rm.th, rm.amountCol]}>Amount</Text>
                    <Text style={[rm.th, rm.statusCol]}>Status</Text>
                  </View>
                  {report.billSnapshot.map((b, i) => (
                    <View
                      key={i}
                      style={[
                        rm.tableRow,
                        i < report.billSnapshot.length - 1 && rm.tableRowBorder,
                      ]}
                    >
                      <Text style={[rm.td, rm.billNoCol]} numberOfLines={1}>
                        {b.billNumber}
                      </Text>
                      <Text
                        style={[rm.td, rm.amountCol, { fontWeight: "700" }]}
                      >
                        LKR {(b.totalAmount || 0).toLocaleString()}
                      </Text>
                      <View style={rm.statusCol}>
                        <View
                          style={[
                            rm.statusPill,
                            b.paymentStatus === "paid"
                              ? rm.paidPill
                              : rm.unpaidPill,
                          ]}
                        >
                          <Text
                            style={[
                              rm.statusText,
                              {
                                color:
                                  b.paymentStatus === "paid"
                                    ? "#1D4ED8"
                                    : "#B45309",
                              },
                            ]}
                          >
                            {b.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={rm.closeFooter}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={rm.closeFooterText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "92%",
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 18, marginTop: 2 },
  headerDate: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 18 },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    minWidth: "44%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  summaryLbl: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  summaryVal: { fontSize: 15, fontWeight: "800" },
  noteBox: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  noteLbl: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  noteText: { fontSize: 13, color: "#78350F" },
  tableSection: { marginBottom: 16 },
  tableTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tableBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  th: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: "#F9FAFB" },
  td: { fontSize: 12, color: "#1F2937" },
  billNoCol: {
    flex: 1.35,
    paddingRight: 6,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  amountCol: { flex: 0.9, textAlign: "right", paddingRight: 8 },
  statusCol: { flex: 0.72, alignItems: "flex-end", textAlign: "right" },
  statusPill: {
    minWidth: 64,
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  paidPill: { backgroundColor: "#DBEAFE", borderColor: "#BFDBFE" },
  unpaidPill: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  statusText: { fontSize: 10, fontWeight: "800" },
  closeFooter: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    marginBottom: 8,
  },
  closeFooterText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
});

// ─── Send Report Modal ────────────────────────────────────────────────────────
function SendReportModal({ preview, onClose, onSent }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/turnover-reports", {
        note,
        reportDate: preview.reportDate,
      });
      if (!res.data.success) throw new Error(res.data.message);
      onSent(res.data.report);
    } catch (e) {
      setError(
        e.response?.data?.message || e.message || "Failed to send report",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sm.overlay} onPress={onClose}>
        <View style={sm.sheet} onStartShouldSetResponder={() => true}>
          <LinearGradient
            colors={["#0D2137", "#01579B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={sm.header}
          >
            <View style={{ flex: 1 }}>
              <Text style={sm.headerSub}>Send to Admin</Text>
              <Text style={sm.headerTitle}>Daily Turnover Report</Text>
              <Text style={sm.headerDate}>{preview.reportDate}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sm.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!!error && (
              <View style={sm.errorBox}>
                <Text style={sm.errorText}>❌ {error}</Text>
              </View>
            )}

            {/* Key figures */}
            <View style={sm.statsGrid}>
              {[
                {
                  label: "Total Collected",
                  value: `LKR ${preview.totalCollected.toLocaleString()}`,
                  color: ACCENT,
                  bg: "#E3F2FD",
                },
                {
                  label: "Outstanding",
                  value: `LKR ${preview.totalOutstanding.toLocaleString()}`,
                  color: "#B71C1C",
                  bg: "#FFEBEE",
                },
                {
                  label: "Bills Today",
                  value: preview.paidBills,
                  color: "#1565C0",
                  bg: "#E3F2FD",
                },
                {
                  label: "Unpaid Bills",
                  value: preview.unpaidBills,
                  color: "#E65100",
                  bg: "#FFF3E0",
                },
              ].map((c) => (
                <View
                  key={c.label}
                  style={[sm.statCard, { backgroundColor: c.bg }]}
                >
                  <Text style={sm.statLbl}>{c.label}</Text>
                  <Text style={[sm.statVal, { color: c.color }]}>
                    {c.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Bills preview table */}
            {preview.bills.length > 0 && (
              <View style={sm.tableSection}>
                <Text style={sm.tableTitle}>
                  Bills Included ({preview.bills.length})
                </Text>
                <View style={sm.billList}>
                  {preview.bills.slice(0, 10).map((b, i) => (
                    <View
                      key={`${b.billNumber || b._id || i}-${i}`}
                      style={sm.billRow}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={sm.billNo} numberOfLines={1}>
                          {b.billNumber}
                        </Text>
                      </View>
                      <View style={sm.billRight}>
                        <Text style={sm.billAmount}>
                          LKR {b.totalAmount.toLocaleString()}
                        </Text>
                        <View
                          style={[
                            sm.billStatus,
                            b.paymentStatus === "paid"
                              ? sm.billStatusPaid
                              : sm.billStatusUnpaid,
                          ]}
                        >
                          <Text
                            style={[
                              sm.billStatusText,
                              {
                                color:
                                  b.paymentStatus === "paid"
                                    ? "#047857"
                                    : "#B45309",
                              },
                            ]}
                          >
                            {b.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  {preview.bills.length > 10 && (
                    <View style={sm.moreRow}>
                      <Text style={sm.moreText}>
                        + {preview.bills.length - 10} more bills included in
                        report
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Note input */}
            <View style={sm.noteSection}>
              <Text style={sm.noteLbl}>Optional Note to Admin</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                placeholder="Add any notes, discrepancies, or comments for the admin…"
                placeholderTextColor="#9CA3AF"
                style={sm.noteInput}
                textAlignVertical="top"
              />
            </View>

            {/* Action buttons */}
            <View style={sm.btnRow}>
              <TouchableOpacity
                style={sm.cancelBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={sm.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sm.sendBtn, loading && { opacity: 0.6 }]}
                onPress={handleSend}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={sm.sendBtnText}>📤 Send Turnover Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const sm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "92%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 18, marginTop: 2 },
  headerDate: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 18 },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: "#B91C1C", fontSize: 13 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    minHeight: 82,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    justifyContent: "space-between",
  },
  statLbl: { fontSize: 11, color: "#6B7280" },
  statVal: { fontSize: 14, fontWeight: "800" },
  tableSection: { marginBottom: 14 },
  tableTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  billList: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  billNo: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  billRight: { alignItems: "flex-end", flexShrink: 0, gap: 5 },
  billAmount: { fontSize: 12, fontWeight: "900", color: "#0F172A" },
  billStatus: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  billStatusPaid: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  billStatusUnpaid: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  billStatusText: { fontSize: 10, fontWeight: "900" },
  moreRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  moreText: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
    textAlign: "center",
  },
  noteSection: { marginBottom: 14 },
  noteLbl: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: "#0F172A",
    minHeight: 100,
    backgroundColor: "#FAFAFA",
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  warnText: { fontSize: 12, color: "#92400E", flex: 1 },
  btnRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  sendBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

// ─── Main Turnover Screen ─────────────────────────────────────────────────────
export default function CashierTurnover() {
  const [reports, setReports] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [loadingRep, setLoadingRep] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);
  const [toast, setToast] = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const showToast = (msg, type = "success") => setToast({ msg, type });

  const fetchReports = useCallback(async () => {
    setLoadingRep(true);
    try {
      const res = await api.get("/turnover-reports");
      if (res.data.success) setReports(res.data.reports || []);
    } catch {
      showToast("Cannot connect to server", "error");
    } finally {
      setLoadingRep(false);
    }
  }, []);

  const fetchPreview = useCallback(async () => {
    setLoadingPrev(true);
    try {
      const res = await api.get(`/turnover-reports/preview?date=${today}`);
      if (res.data.success) setPreview(res.data.preview);
    } catch {
      showToast("Cannot load billing preview", "error");
    } finally {
      setLoadingPrev(false);
    }
  }, [today]);

  useEffect(() => {
    fetchPreview();
    fetchReports();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchPreview(), fetchReports()]).finally(() =>
      setRefreshing(false),
    );
  };

  const handleSent = (report) => {
    setShowSend(false);
    setReports((prev) => [report, ...prev]);
    showToast(`Report ${report.reportNumber} sent to admin successfully!`);
    fetchPreview();
  };

  const alreadySentToday = reports.some((r) => r.reportDate === today);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {showSend && preview && (
        <SendReportModal
          preview={preview}
          onClose={() => setShowSend(false)}
          onSent={handleSent}
        />
      )}
      {selectedRep && (
        <ReportModal
          report={selectedRep}
          onClose={() => setSelectedRep(null)}
        />
      )}

      {/* Header */}
      <LinearGradient
        colors={["#0D2137", "#01579B", "#0277BD"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={to.header}
      >
        <View>
          <Text style={to.headerTitle}>Billing Turnover</Text>
          <Text style={to.headerSub}>Billing summary</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
          />
        }
      >
        <View style={to.body}>
          {/* Today's snapshot card */}
          <View style={to.snapshotCard}>
            <View style={to.snapshotHeader}>
              <LinearGradient colors={[ACCENT, "#0277BD"]} style={to.calIcon}>
                <Ionicons name="calendar" size={18} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={to.snapshotTitle}>Today's Billing Summary</Text>
                <Text style={to.snapshotDate}>{today}</Text>
              </View>
            </View>

            {loadingPrev ? (
              <View style={to.loadingBox}>
                <ActivityIndicator color={ACCENT} size="large" />
                <Text style={to.loadingText}>Loading today's data…</Text>
              </View>
            ) : preview ? (
              <View style={to.snapshotBody}>
                {/* Summary grid */}
                <View style={to.statsGrid}>
                  {[
                    {
                      label: "Total Collected",
                      value: `LKR ${preview.totalCollected.toLocaleString()}`,
                      icon: "💸",
                      color: ACCENT,
                      bg: "#E3F2FD",
                    },
                    {
                      label: "Outstanding",
                      value: `LKR ${preview.totalOutstanding.toLocaleString()}`,
                      icon: "⏳",
                      color: "#B71C1C",
                      bg: "#FFEBEE",
                    },
                    {
                      label: "Bills Today",
                      value: preview.paidBills,
                      icon: "🧾",
                      color: "#1565C0",
                      bg: "#E3F2FD",
                    },
                    {
                      label: "Unpaid Bills",
                      value: preview.unpaidBills,
                      icon: "📋",
                      color: "#E65100",
                      bg: "#FFF3E0",
                    },
                  ].map((s) => (
                    <View
                      key={s.label}
                      style={[to.statCard, { backgroundColor: s.bg }]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 6,
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>{s.icon}</Text>
                        <Text style={to.statLbl}>{s.label}</Text>
                      </View>
                      <Text style={[to.statVal, { color: s.color }]}>
                        {s.value}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Send button */}
                <TouchableOpacity
                  style={[
                    to.sendBtn,
                    preview.totalBills === 0 && { opacity: 0.4 },
                  ]}
                  onPress={() => setShowSend(true)}
                  disabled={preview.totalBills === 0}
                  activeOpacity={0.85}
                >
                  <Ionicons name="send" size={15} color="#fff" />
                  <Text style={to.sendBtnText} numberOfLines={1}>
                    {alreadySentToday
                      ? "Send Updated Turnover Report"
                      : "Send Turnover Report to Admin"}
                  </Text>
                </TouchableOpacity>

                {preview.totalBills === 0 && (
                  <Text style={to.noDataText}>
                    No bills found for today — nothing to report yet.
                  </Text>
                )}
              </View>
            ) : (
              <View style={to.loadingBox}>
                <Text style={to.loadingText}>
                  Could not load today's billing data.
                </Text>
              </View>
            )}
          </View>

          {/* Past reports */}
          <View>
            <Text style={to.sectionTitle}>Sent Reports</Text>

            {loadingRep ? (
              <View style={to.emptyCard}>
                <ActivityIndicator color={ACCENT} size="large" />
                <Text style={to.emptyText}>Loading reports…</Text>
              </View>
            ) : reports.length === 0 ? (
              <View style={to.emptyCard}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
                <Text style={to.emptyTitle}>No turnover reports yet</Text>
                <Text style={to.emptyText}>
                  Reports you send will appear here.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {reports.map((rep) => (
                  <View key={rep._id} style={to.repCard}>
                    <LinearGradient
                      colors={[ACCENT, "#0277BD"]}
                      style={to.repIcon}
                    >
                      <Text style={{ fontSize: 20 }}>📊</Text>
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <Text style={to.repNumber}>{rep.reportNumber}</Text>
                        <Text style={to.repDate}>{rep.reportDate}</Text>
                        {rep.readByAdmin && (
                          <View style={to.viewedBadge}>
                            <Text style={to.viewedText}>Viewed</Text>
                          </View>
                        )}
                      </View>
                      <Text style={to.repMeta}>
                        {rep.paidBills} paid · {rep.unpaidBills} unpaid ·{" "}
                        <Text style={to.repCollected}>
                          LKR {(rep.totalCollected || 0).toLocaleString()}{" "}
                          collected
                        </Text>
                      </Text>
                      <Text style={to.repTime}>
                        Sent {new Date(rep.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Text style={to.repTotal}>
                        LKR {(rep.totalCollected || 0).toLocaleString()}
                      </Text>
                      <Text style={to.repTotalSub}>{rep.totalBills} bills</Text>
                      <TouchableOpacity onPress={() => setSelectedRep(rep)}>
                        <Text style={to.viewLink}>View →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const to = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 3 },
  body: { padding: 14, gap: 14 },
  snapshotCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  calIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  snapshotTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  snapshotDate: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  sentTodayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#DBEAFE",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  sentTodayText: { fontSize: 11, fontWeight: "700", color: "#1D4ED8" },
  loadingBox: { padding: 32, alignItems: "center", gap: 10 },
  loadingText: { fontSize: 13, color: "#94A3B8", marginTop: 4 },
  snapshotBody: { padding: 16, gap: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1,
    minWidth: "44%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  statLbl: { fontSize: 10, color: "#6B7280", fontWeight: "500", flexShrink: 1 },
  statVal: { fontSize: 13, fontWeight: "800" },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 300,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    flexShrink: 1,
  },
  noDataText: { textAlign: "center", fontSize: 12, color: "#94A3B8" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
  repCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  repIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  repNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  repDate: { fontSize: 12, color: "#64748B" },
  viewedBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  viewedText: { fontSize: 10, fontWeight: "600", color: "#1D4ED8" },
  repMeta: { fontSize: 12, color: "#64748B", marginTop: 3 },
  repCollected: { color: ACCENT, fontWeight: "700" },
  repTime: { fontSize: 11, color: "#94A3B8", marginTop: 3 },
  repTotal: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  repTotalSub: { fontSize: 11, color: "#94A3B8" },
  viewLink: { fontSize: 12, fontWeight: "700", color: ACCENT },
});
