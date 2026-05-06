import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
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

function fireCashierToast(data) {
  globalThis.__fireCashierToast?.(data);
}

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

// ─── Bill Modal ───────────────────────────────────────────────────────────────
function BillModal({ bill, isLab, onClose, onPaid, onSent, onLabNotified }) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [error, setError] = useState("");

  const isPaid = bill.paymentStatus === "paid";
  const isSent = bill.sentToPatient === true;
  const isLabNotified = bill.labNotified === true;
  const DOCTOR_CHARGE = bill.doctorCharge ?? 1000;
  const drugTotal = (bill.lines || []).reduce((s, l) => s + l.lineTotal, 0);
  const labTotal = (bill.labLines || []).reduce((s, l) => s + l.price, 0);
  const grandTotal = isLab
    ? labTotal + DOCTOR_CHARGE
    : drugTotal + labTotal + DOCTOR_CHARGE;
  const hasLabs = isLab
    ? (bill.labLines || []).length > 0
    : bill.hasLabTests && (bill.labLines || []).length > 0;

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = isLab
        ? `/lab-request-bills/${bill._id}/pay`
        : `/bills/${bill._id}/pay`;
      const res = await api.patch(endpoint, { paymentMethod: "Cash" });
      onPaid(res.data.bill);
    } catch (e) {
      setError(e.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const endpoint = isLab
        ? `/lab-request-bills/${bill._id}/send-to-patient`
        : `/bills/${bill._id}/send-to-patient`;
      const res = await api.patch(endpoint);
      onSent(res.data.bill);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleNotifyLab = async () => {
    setNotifying(true);
    setError("");
    try {
      const endpoint = isLab
        ? `/lab-request-bills/${bill._id}/notify-lab`
        : `/bills/${bill._id}/notify-lab`;
      const res = await api.patch(endpoint);
      onLabNotified(res.data.bill);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to notify lab");
    } finally {
      setNotifying(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={bm.overlay}>
        <Pressable style={bm.backdrop} onPress={onClose} />
        <View style={bm.sheet}>
          <LinearGradient
            colors={["#0D2137", "#01579B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={bm.header}
          >
            <View style={{ flex: 1 }}>
              <Text style={bm.headerSub}>
                {isLab ? "🔬 " : ""}
                {isPaid ? "Receipt" : "Collect Payment"}
              </Text>
              <Text style={bm.headerTitle}>{bill.billNumber}</Text>
              <Text style={bm.headerDate}>
                {new Date(bill.createdAt).toLocaleDateString()}{" "}
                {isLab ? `· Lab: ${bill.labRequestId}` : ""}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={bm.closeBtn}>
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
            {!!error && (
              <View style={bm.errorBox}>
                <Text style={bm.errorText}>❌ {error}</Text>
              </View>
            )}

            {/* Unavailable drugs */}
            {!isLab &&
              bill.hasUnavailable &&
              (bill.unavailableLines || []).length > 0 && (
                <View style={bm.unavailBox}>
                  <View style={bm.unavailHeader}>
                    <Text style={{ fontSize: 16 }}>❌</Text>
                    <View>
                      <Text style={bm.unavailTitle}>Drugs Not Dispensed</Text>
                      <Text style={bm.unavailSub}>
                        Inform patient — these medications were not available
                      </Text>
                    </View>
                  </View>
                  {bill.unavailableLines.map((l, i) => (
                    <View key={i} style={bm.unavailRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={bm.unavailDrug}>{l.medicationName}</Text>
                        {(l.dosage || l.duration) && (
                          <Text style={bm.unavailInfo}>
                            {l.dosage}
                            {l.dosage && l.duration ? " · " : ""}
                            {l.duration}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          bm.availBadge,
                          l.availability === "out_of_stock"
                            ? bm.oosBadge
                            : bm.nifBadge,
                        ]}
                      >
                        <Text
                          style={[
                            bm.availBadgeText,
                            {
                              color:
                                l.availability === "out_of_stock"
                                  ? "#7F1D1D"
                                  : "#7C3AED",
                            },
                          ]}
                        >
                          {l.availability === "out_of_stock"
                            ? "Out of Stock"
                            : "Not in Formulary"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

            {/* Note */}
            {!isLab && bill.hasNote && bill.noteContent && (
              <View style={bm.noteBox}>
                <Text style={{ fontSize: 18, flexShrink: 0 }}>📝</Text>
                <View>
                  <Text style={bm.noteLabel}>Pharmacist Note</Text>
                  <Text style={bm.noteText}>{bill.noteContent}</Text>
                </View>
              </View>
            )}

            {/* Clinic header */}
            <View style={bm.clinicHeader}>
              <Text style={bm.clinicName}>People's Health Care</Text>
              <Text style={bm.clinicAddr}>
                Galle Road, Matara · 0777 883 343
              </Text>
            </View>

            {/* Patient info */}
            <View style={bm.patientRow}>
              <View style={{ flex: 1 }}>
                <Text style={bm.patientLbl}>Bill To</Text>
                <Text style={bm.patientName}>{bill.patientName}</Text>
                {bill.patientId && (
                  <Text style={bm.patientId}>{bill.patientId}</Text>
                )}
                {bill.channelingNo && (
                  <Text style={bm.patientMeta}>Ch. #{bill.channelingNo}</Text>
                )}
                {isLab ? (
                  <Text style={bm.patientMeta}>
                    Lab Req: {bill.labRequestId}
                  </Text>
                ) : (
                  <Text style={bm.patientMeta}>{bill.prescriptionRef}</Text>
                )}
                <Text style={bm.patientMeta}>Dr. {bill.doctorName}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={bm.patientLbl}>Bill No.</Text>
                <Text style={bm.billNo}>{bill.billNumber}</Text>
                <View
                  style={[
                    bm.statusBadge,
                    isPaid ? bm.paidBadge : bm.unpaidBadge,
                  ]}
                >
                  <Text
                    style={[
                      bm.statusText,
                      { color: isPaid ? "#1D4ED8" : "#B91C1C" },
                    ]}
                  >
                    {isPaid ? "PAID" : "UNPAID"}
                  </Text>
                </View>
                {isPaid && isSent && (
                  <Text style={bm.sentLabel}>Sent to Patient</Text>
                )}
                {isPaid && isLabNotified && (
                  <Text style={bm.labNotifiedLabel}>Lab Notified</Text>
                )}
              </View>
            </View>

            {/* Medications table */}
            {!isLab && (bill.lines || []).length > 0 && (
              <View style={bm.tableSection}>
                <Text style={bm.tableTitle}>Dispensed Medications</Text>
                <View style={bm.tableBox}>
                  <View style={bm.tableHead}>
                    <Text style={[bm.th, { flex: 2 }]}>Medication</Text>
                    <Text style={[bm.th, { width: 40, textAlign: "center" }]}>
                      Qty
                    </Text>
                    <Text style={[bm.th, { width: 70, textAlign: "right" }]}>
                      Total
                    </Text>
                  </View>
                  {bill.lines.map((item, i) => (
                    <View
                      key={i}
                      style={[
                        bm.tableRow,
                        i < bill.lines.length - 1 && bm.tableRowBorder,
                      ]}
                    >
                      <Text style={[bm.td, { flex: 2 }]} numberOfLines={2}>
                        {item.medicationName}
                      </Text>
                      <Text style={[bm.td, { width: 40, textAlign: "center" }]}>
                        {item.qtyDispensed}
                      </Text>
                      <Text
                        style={[
                          bm.td,
                          { width: 70, textAlign: "right", fontWeight: "600" },
                        ]}
                      >
                        LKR {item.lineTotal.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Lab tests table */}
            {(bill.labLines || []).length > 0 && (
              <View style={bm.tableSection}>
                <Text style={bm.tableTitle}>Lab Tests</Text>
                <View style={[bm.tableBox, { borderColor: "#BFDBFE" }]}>
                  <View style={[bm.tableHead, { backgroundColor: "#EFF6FF" }]}>
                    <Text style={[bm.th, { flex: 1, color: "#93C5FD" }]}>
                      Test
                    </Text>
                    <Text
                      style={[
                        bm.th,
                        { width: 80, textAlign: "right", color: "#93C5FD" },
                      ]}
                    >
                      Price
                    </Text>
                  </View>
                  {bill.labLines.map((lab, i) => (
                    <View
                      key={i}
                      style={[
                        bm.tableRow,
                        i < bill.labLines.length - 1 && bm.tableRowBorder,
                      ]}
                    >
                      <Text style={[bm.td, { flex: 1 }]}>{lab.testName}</Text>
                      <Text
                        style={[
                          bm.td,
                          { width: 80, textAlign: "right", fontWeight: "600" },
                        ]}
                      >
                        LKR {lab.price.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Totals */}
            <View style={bm.totalsBox}>
              {!isLab && drugTotal > 0 && (
                <View style={bm.totalRow}>
                  <Text style={bm.totalLbl}>Medications Subtotal</Text>
                  <Text style={bm.totalVal}>
                    LKR {drugTotal.toLocaleString()}
                  </Text>
                </View>
              )}
              {labTotal > 0 && (
                <View style={bm.totalRow}>
                  <Text style={bm.totalLbl}>Lab Tests Subtotal</Text>
                  <Text style={bm.totalVal}>
                    LKR {labTotal.toLocaleString()}
                  </Text>
                </View>
              )}
              <View style={bm.totalRow}>
                <Text style={bm.totalLbl}>Doctor Consultation Fee</Text>
                <Text style={bm.totalVal}>
                  LKR {DOCTOR_CHARGE.toLocaleString()}
                </Text>
              </View>
              <View style={[bm.totalRow, bm.grandTotalRow]}>
                <Text style={bm.grandLbl}>Total</Text>
                <Text style={[bm.grandVal, { color: ACCENT }]}>
                  LKR {grandTotal.toLocaleString()}
                </Text>
              </View>
              {isPaid && (
                <Text style={bm.paidAt}>
                  Cash · {new Date(bill.paidAt).toLocaleString()}
                </Text>
              )}
            </View>

            {/* Pay button */}
            {!isPaid && (
              <View style={{ gap: 12, marginBottom: 16 }}>
                <View style={bm.cashRow}>
                  <Text style={bm.cashText}>Cash Payment</Text>
                </View>
                <TouchableOpacity
                  style={[bm.payBtn, loading && { opacity: 0.6 }]}
                  onPress={handlePay}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={bm.payBtnText}>
                      Collect LKR {grandTotal.toLocaleString()}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Send to patient */}
            {isPaid && (
              <View
                style={[
                  bm.actionCard,
                  isSent ? bm.actionCardSent : bm.actionCardDefault,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={bm.actionTitle}>
                    {isSent ? "Bill Sent to Patient" : "Send Bill to Patient"}
                  </Text>
                  <Text style={bm.actionSub}>
                    {isSent
                      ? "Patient can view this receipt in their portal"
                      : "Make this paid receipt visible in the patient portal"}
                  </Text>
                </View>
                {!isSent ? (
                  <TouchableOpacity
                    style={bm.actionBtn}
                    onPress={handleSend}
                    disabled={sending}
                    activeOpacity={0.85}
                  >
                    {sending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={bm.actionBtnText}>Send →</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={bm.doneBadge}>
                    <Text style={bm.doneBadgeText}>✓ Sent</Text>
                  </View>
                )}
              </View>
            )}

            {/* Notify lab */}
            {isPaid && hasLabs && (
              <View
                style={[
                  bm.actionCard,
                  isLabNotified
                    ? bm.actionCardSent
                    : { borderColor: "#99F6E4", backgroundColor: "#F0FDFA" },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={bm.actionTitle}>
                    {isLabNotified
                      ? "Laboratory Notified"
                      : "Notify Laboratory"}
                  </Text>
                  <Text style={bm.actionSub}>
                    {isLabNotified
                      ? `Lab notified at ${bill.labNotifiedAt ? new Date(bill.labNotifiedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}`
                      : `Confirm payment for ${(bill.labLines || []).length} lab test${(bill.labLines || []).length !== 1 ? "s" : ""}`}
                  </Text>
                </View>
                {!isLabNotified ? (
                  <TouchableOpacity
                    style={[bm.actionBtn, { backgroundColor: "#0D9488" }]}
                    onPress={handleNotifyLab}
                    disabled={notifying}
                    activeOpacity={0.85}
                  >
                    {notifying ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={bm.actionBtnText}>🔔 Notify Lab</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={bm.doneBadge}>
                    <Text style={bm.doneBadgeText}>✓ Done</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={bm.closeFooterBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={bm.closeFooterBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const bm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "93%",
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
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 2 },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 18 },
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
  unavailBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FECACA",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
  },
  unavailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FEE2E2",
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  unavailTitle: { fontSize: 13, fontWeight: "700", color: "#7F1D1D" },
  unavailSub: { fontSize: 11, color: "#B91C1C", marginTop: 2 },
  unavailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#FEE2E2",
  },
  unavailDrug: { fontSize: 13, fontWeight: "700", color: "#7F1D1D" },
  unavailInfo: { fontSize: 11, color: "#B91C1C", marginTop: 2 },
  availBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  oosBadge: { backgroundColor: "#FEE2E2" },
  nifBadge: { backgroundColor: "#EDE9FE" },
  availBadgeText: { fontSize: 10, fontWeight: "700" },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 2,
    borderColor: "#FDE68A",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  noteLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  noteText: { fontSize: 13, color: "#78350F" },
  clinicHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderStyle: "dashed",
    paddingBottom: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  clinicName: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  clinicAddr: { fontSize: 11, color: "#6B7280", marginTop: 3 },
  patientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  patientLbl: { fontSize: 10, color: "#9CA3AF", marginBottom: 3 },
  patientName: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  patientId: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    marginTop: 2,
  },
  patientMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  billNo: {
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    color: "#374151",
    marginBottom: 6,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  paidBadge: { backgroundColor: "#DBEAFE", borderColor: "#BFDBFE" },
  unpaidBadge: { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
  statusText: { fontSize: 10, fontWeight: "700" },
  sentLabel: {
    fontSize: 11,
    color: "#1D4ED8",
    fontWeight: "600",
    marginTop: 4,
  },
  labNotifiedLabel: {
    fontSize: 11,
    color: "#0D9488",
    fontWeight: "600",
    marginTop: 3,
  },
  tableSection: { marginBottom: 14 },
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
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  th: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: "#F9FAFB" },
  td: { fontSize: 13, color: "#1F2937" },
  totalsBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    gap: 8,
    marginBottom: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLbl: { fontSize: 13, color: "#6B7280" },
  totalVal: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
    marginTop: 4,
  },
  grandLbl: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  grandVal: { fontSize: 16, fontWeight: "800" },
  paidAt: { fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: 4 },
  cashRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cashText: { fontSize: 14, fontWeight: "600", color: "#1E40AF" },
  payBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    marginBottom: 12,
  },
  actionCardDefault: { borderColor: "#C7D2FE", backgroundColor: "#EEF2FF" },
  actionCardSent: { borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" },
  actionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A5F",
    marginBottom: 2,
  },
  actionSub: { fontSize: 11, color: "#4B5563" },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    flexShrink: 0,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  doneBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#1D4ED8",
  },
  doneBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  closeFooterBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    marginBottom: 8,
  },
  closeFooterBtnText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
});

// ─── Main Billing Screen ──────────────────────────────────────────────────────
function firePharmacyNotif(bill) {
  const meds = (bill.lines || []).map((l) => l.medicationName).filter(Boolean);
  fireCashierToast({
    type: "pharmacy",
    billId: bill._id,
    rx: bill.prescriptionRef || bill.billNumber,
    patientId: bill.patientId || "—",
    patientName: bill.patientName || "Patient",
    medicines: meds,
  });
}
function fireLabNotif(bill) {
  const tests = (bill.labLines || []).map((l) => l.testName).filter(Boolean);
  fireCashierToast({
    type: "lab_request",
    billId: bill._id,
    rx: bill.labRequestId || bill.billNumber,
    patientId: bill.patientId || "—",
    patientName: bill.patientName || "Patient",
    doctorName: bill.doctorName || "",
    priority: bill.priority || "",
    tests,
  });
}

export default function CashierBilling() {
  const [pharmBills, setPharmBills] = useState([]);
  const [labBills, setLabBills] = useState([]);
  const [pharmSummary, setPharmSummary] = useState({});
  const [labSummary, setLabSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const knownPharmIds = useRef(null);
  const knownLabIds = useRef(null);
  const isFirstPharm = useRef(true);
  const isFirstLab = useRef(true);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const fetchAll = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const tzOffset = -new Date().getTimezoneOffset();
        const [pRes, lRes] = await Promise.all([
          api.get(
            `/bills?limit=500&tzOffset=${tzOffset}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
          ),
          api.get("/lab-request-bills?limit=500"),
        ]);

        const freshPharm = pRes.data?.bills || [];
        if (isFirstPharm.current) {
          isFirstPharm.current = false;
          const toNotify = freshPharm.filter(
            (b) => b.paymentStatus === "unpaid" && (b.lines || []).length > 0,
          );
          toNotify.forEach((b, i) =>
            setTimeout(() => firePharmacyNotif(b), i * 800),
          );
          knownPharmIds.current = new Set(freshPharm.map((b) => b._id));
        } else {
          const newBills = freshPharm.filter(
            (b) =>
              !knownPharmIds.current.has(b._id) && (b.lines || []).length > 0,
          );
          newBills.forEach((b, i) =>
            setTimeout(() => firePharmacyNotif(b), i * 800),
          );
          newBills.forEach((b) => knownPharmIds.current.add(b._id));
        }
        setPharmBills(freshPharm);
        setPharmSummary(pRes.data?.summary || {});

        const freshLab = lRes.data?.bills || [];
        if (isFirstLab.current) {
          isFirstLab.current = false;
          const toNotify = freshLab.filter(
            (b) =>
              b.paymentStatus === "unpaid" && (b.labLines || []).length > 0,
          );
          toNotify.forEach((b, i) =>
            setTimeout(() => fireLabNotif(b), i * 800),
          );
          knownLabIds.current = new Set(freshLab.map((b) => b._id));
        } else {
          const newBills = freshLab.filter(
            (b) =>
              !knownLabIds.current.has(b._id) && (b.labLines || []).length > 0,
          );
          newBills.forEach((b, i) =>
            setTimeout(() => fireLabNotif(b), i * 800),
          );
          newBills.forEach((b) => knownLabIds.current.add(b._id));
        }
        setLabBills(freshLab);
        setLabSummary(lRes.data?.summary || {});
      } catch {
        if (!silent) showToast("Cannot connect to server", "error");
      } finally {
        if (!silent) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [search],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 20_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const taggedPharm = pharmBills.map((b) => ({ ...b, _billType: "pharm" }));
  const taggedLab = labBills.map((b) => ({ ...b, _billType: "lab" }));
  const allBills = [...taggedPharm, ...taggedLab].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  const todayCollected =
    (pharmSummary.todayCollected ?? 0) + (labSummary.todayCollected ?? 0);
  const totalOutstanding = allBills
    .filter((b) => b.paymentStatus === "unpaid")
    .reduce((s, b) => s + b.totalAmount, 0);
  const totalUnpaid = allBills.filter(
    (b) => b.paymentStatus === "unpaid",
  ).length;

  const filtered = allBills.filter((b) => {
    const matchFilter = (() => {
      if (filter === "unpaid") return b.paymentStatus === "unpaid";
      if (filter === "paid") return b.paymentStatus === "paid";
      if (filter === "lab") return b._billType === "lab";
      if (filter === "sent") return b.sentToPatient === true;
      if (filter === "unavailable") return b.hasUnavailable;
      if (filter === "noted")
        return (b.hasNote && b.noteContent) || b.hasUnavailable;
      return true;
    })();
    const matchSearch =
      !search ||
      [b.patientName, b.billNumber, b.prescriptionRef, b.labRequestId].some(
        (v) => v?.toLowerCase().includes(search.toLowerCase()),
      );
    return matchFilter && matchSearch;
  });

  const handlePharmPaid = (updated) => {
    setPharmBills((prev) =>
      prev.map((b) => (b._id === updated._id ? updated : b)),
    );
    setSelected({ bill: { ...updated, _billType: "pharm" }, isLab: false });
    showToast(
      `Payment collected — LKR ${updated.totalAmount.toLocaleString()}`,
    );
  };
  const handlePharmSent = (updated) => {
    setPharmBills((prev) =>
      prev.map((b) => (b._id === updated._id ? updated : b)),
    );
    setSelected({ bill: { ...updated, _billType: "pharm" }, isLab: false });
    showToast("Bill sent to patient portal");
  };
  const handlePharmLabNotif = (updated) => {
    setPharmBills((prev) =>
      prev.map((b) => (b._id === updated._id ? updated : b)),
    );
    setSelected({ bill: { ...updated, _billType: "pharm" }, isLab: false });
    showToast(
      `Lab notified — ${(updated.labLines || []).length} test${(updated.labLines || []).length !== 1 ? "s" : ""}`,
    );
  };
  const handleLabPaid = (updated) => {
    setLabBills((prev) =>
      prev.map((b) => (b._id === updated._id ? updated : b)),
    );
    setSelected({ bill: { ...updated, _billType: "lab" }, isLab: true });
    showToast(
      `Payment collected — LKR ${updated.totalAmount.toLocaleString()}`,
    );
  };
  const handleLabSent = (updated) => {
    setLabBills((prev) =>
      prev.map((b) => (b._id === updated._id ? updated : b)),
    );
    setSelected({ bill: { ...updated, _billType: "lab" }, isLab: true });
    showToast("Bill sent to patient portal");
  };
  const handleLabNotif = (updated) => {
    setLabBills((prev) =>
      prev.map((b) => (b._id === updated._id ? updated : b)),
    );
    setSelected({ bill: { ...updated, _billType: "lab" }, isLab: true });
    showToast(`🧪 Lab notified`);
  };

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "unpaid", label: "⏳ Unpaid" },
    { key: "paid", label: "✅ Paid" },
    { key: "lab", label: "🔬 Lab" },
    { key: "noted", label: "📝 Notes" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {selected && (
        <BillModal
          bill={selected.bill}
          isLab={selected.isLab}
          onClose={() => setSelected(null)}
          onPaid={selected.isLab ? handleLabPaid : handlePharmPaid}
          onSent={selected.isLab ? handleLabSent : handlePharmSent}
          onLabNotified={selected.isLab ? handleLabNotif : handlePharmLabNotif}
        />
      )}

      {/* Header */}
      <LinearGradient
        colors={["#0D2137", "#01579B", "#0277BD"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={bi.header}
      >
        <View>
          <Text style={bi.headerTitle}>Sales & Billing</Text>
          <Text style={bi.headerSub}>Collect payments</Text>
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
        <View style={bi.body}>
          {/* Stats */}
          <View style={bi.statsRow}>
            {[
              {
                label: "Today's Collections",
                value: `LKR ${todayCollected.toLocaleString()}`,
                icon: "💸",
                color: ACCENT,
                bg: "#E3F2FD",
              },
              {
                label: "Outstanding",
                value: `LKR ${totalOutstanding.toLocaleString()}`,
                icon: "⏳",
                color: "#B71C1C",
                bg: "#FFEBEE",
              },
              {
                label: "Bills Today",
                value:
                  (pharmSummary.todayPaidCount ?? 0) +
                  (labSummary.todayPaidCount ?? 0),
                icon: "📋",
                color: "#1565C0",
                bg: "#E3F2FD",
              },
              {
                label: "Unpaid Bills",
                value: totalUnpaid,
                icon: "📋",
                color: "#B71C1C",
                bg: "#FFEBEE",
              },
            ].map((s) => (
              <View key={s.label} style={bi.statCard}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 5,
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{s.icon}</Text>
                  <Text style={bi.statLbl} numberOfLines={1}>
                    {s.label}
                  </Text>
                </View>
                <Text style={[bi.statVal, { color: s.color }]}>{s.value}</Text>
              </View>
            ))}
          </View>

          {/* Search */}
          <View style={bi.searchBar}>
            <Ionicons
              name="search"
              size={16}
              color="#94A3B8"
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search patient, bill no., Rx…"
              placeholderTextColor="#94A3B8"
              style={bi.searchInput}
            />
          </View>

          {/* Filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 4 }}
          >
            <View
              style={{ flexDirection: "row", gap: 8, paddingHorizontal: 2 }}
            >
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[bi.filterTab, filter === f.key && bi.filterTabActive]}
                  onPress={() => setFilter(f.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      bi.filterTabText,
                      filter === f.key && bi.filterTabTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Bill list */}
          {loading ? (
            <View style={bi.emptyBox}>
              <ActivityIndicator color={ACCENT} size="large" />
              <Text style={bi.emptyText}>Loading bills…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={bi.emptyBox}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🧾</Text>
              <Text style={bi.emptyTitle}>No bills found</Text>
              <Text style={bi.emptyText}>
                Bills appear here from pharmacy dispensing and lab requests
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filtered.map((bill) => {
                const isLab = bill._billType === "lab";
                const isPaid = bill.paymentStatus === "paid";
                return (
                  <View
                    key={bill._id}
                    style={[
                      bi.billCard,
                      !isLab &&
                        bill.hasUnavailable &&
                        !isPaid &&
                        bi.billCardUnavail,
                      !isLab &&
                        bill.hasNote &&
                        !isPaid &&
                        !bill.hasUnavailable &&
                        bi.billCardNoted,
                    ]}
                  >
                    {!isLab && bill.hasUnavailable && !isPaid && (
                      <View style={bi.unavailBar}>
                        <Text style={{ fontSize: 13 }}>❌</Text>
                        <Text style={bi.unavailBarText}>
                          Drugs not dispensed:{" "}
                        </Text>
                        {(bill.unavailableLines || [])
                          .slice(0, 2)
                          .map((l, i) => (
                            <View key={i} style={bi.unavailChip}>
                              <Text style={bi.unavailChipText}>
                                {l.medicationName}
                              </Text>
                            </View>
                          ))}
                      </View>
                    )}
                    {!isLab &&
                      bill.hasNote &&
                      bill.noteContent &&
                      !isPaid &&
                      !bill.hasUnavailable && (
                        <View style={bi.noteBar}>
                          <Text>📝</Text>
                          <Text style={bi.noteBarText} numberOfLines={1}>
                            Note: {bill.noteContent}
                          </Text>
                        </View>
                      )}
                    {bill.sentToPatient && isPaid && (
                      <View style={bi.sentBar}>
                        <Text style={bi.sentBarText}>
                          Sent to patient portal
                        </Text>
                      </View>
                    )}
                    {isPaid && bill.labNotified && (
                      <View style={bi.sentBar}>
                        <Text style={bi.sentBarText}>Laboratory notified</Text>
                      </View>
                    )}

                    <View style={bi.billMain}>
                      <View
                        style={[
                          bi.billAvatar,
                          { backgroundColor: isPaid ? ACCENT : "#9CA3AF" },
                        ]}
                      >
                        <Text style={bi.billAvatarText}>
                          {bill.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={bi.billName} numberOfLines={1}>
                          {bill.patientName}
                        </Text>
                        <Text style={bi.billMeta} numberOfLines={1}>
                          {bill.billNumber} ·{" "}
                          {isLab ? bill.labRequestId : bill.prescriptionRef}
                        </Text>
                        <Text style={bi.billTime}>
                          {new Date(bill.createdAt).toLocaleString([], {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}{" "}
                          ·{" "}
                          {isLab
                            ? `${(bill.labLines || []).length} test(s)`
                            : `${(bill.lines || []).length} drug(s)`}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <Text
                          style={[
                            bi.billAmt,
                            { color: isPaid ? ACCENT : "#B71C1C" },
                          ]}
                        >
                          LKR {bill.totalAmount.toLocaleString()}
                        </Text>
                        <View
                          style={[
                            bi.statusPill,
                            isPaid ? bi.paidPill : bi.unpaidPill,
                          ]}
                        >
                          <Text
                            style={[
                              bi.statusText,
                              { color: isPaid ? "#1D4ED8" : "#B45309" },
                            ]}
                          >
                            {isPaid ? "Paid" : "Unpaid"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setSelected({ bill, isLab })}
                        >
                          <Text style={bi.openLink}>
                            {isPaid ? "View Receipt →" : "Open →"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Medicines/tests tags */}
                    <View style={bi.tagsBar}>
                      {!isLab &&
                        (bill.lines || []).slice(0, 3).map((item, i) => (
                          <View key={i} style={bi.medChip}>
                            <Text style={bi.medChipText}>
                              {item.medicationName} × {item.qtyDispensed}
                            </Text>
                          </View>
                        ))}
                      {(bill.labLines || []).slice(0, 3).map((lab, i) => (
                        <View key={`l${i}`} style={bi.labChip}>
                          <Text style={bi.labChipText}>🔬 {lab.testName}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const bi = StyleSheet.create({
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
  body: { padding: 14, gap: 12 },
  statsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statCard: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statVal: { fontSize: 13, fontWeight: "800" },
  statLbl: { fontSize: 10, color: "#64748B", flex: 1 },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 12,
  },
  warningTitle: { fontSize: 13, fontWeight: "600", color: "#92400E" },
  warningSub: { fontSize: 12, color: "#B45309", marginTop: 2 },
  filterBtn: {
    backgroundColor: "#B45309",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
  },
  filterBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 28,
    alignSelf: "center",
    width: "86%",
    maxWidth: 340,
  },
  searchInput: { flex: 1, fontSize: 11, color: "#0F172A", paddingVertical: 0 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  filterTabActive: { backgroundColor: ACCENT },
  filterTabText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  filterTabTextActive: { color: "#fff" },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
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
    marginTop: 4,
    textAlign: "center",
  },
  billCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  billCardUnavail: { borderColor: "#FECACA" },
  billCardNoted: { borderColor: "#FDE68A" },
  labBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  labBarText: { fontSize: 11, fontWeight: "700", color: "#1E40AF" },
  labBarRef: {
    fontSize: 11,
    color: "#60A5FA",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    marginLeft: 4,
  },
  unavailBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  unavailBarText: { fontSize: 11, fontWeight: "700", color: "#7F1D1D" },
  unavailChip: {
    backgroundColor: "#FEE2E2",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  unavailChipText: { fontSize: 10, fontWeight: "600", color: "#B91C1C" },
  noteBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FFFBEB",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  noteBarText: { fontSize: 11, fontWeight: "500", color: "#92400E", flex: 1 },
  sentBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderBottomWidth: 1,
    borderBottomColor: "#DBEAFE",
  },
  sentBarText: { fontSize: 11, fontWeight: "600", color: "#1D4ED8" },
  billMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  billAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  billAvatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  billName: { fontSize: 13, fontWeight: "700", color: "#1F2937" },
  billMeta: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  billTime: { fontSize: 10, color: "#CBD5E1", marginTop: 2 },
  billAmt: { fontSize: 14, fontWeight: "800" },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  paidPill: { backgroundColor: "#DBEAFE", borderColor: "#BFDBFE" },
  unpaidPill: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  statusText: { fontSize: 10, fontWeight: "700" },
  openLink: { fontSize: 11, fontWeight: "700", color: ACCENT },
  tagsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  medChip: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  medChipText: { fontSize: 10, color: "#065F46", fontWeight: "500" },
  labChip: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  labChipText: { fontSize: 10, color: "#1D4ED8", fontWeight: "500" },
});
