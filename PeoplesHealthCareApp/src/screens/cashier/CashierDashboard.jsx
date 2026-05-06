import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const ACCENT = "#01579B";

function fireCashierToast(data) {
  globalThis.__fireCashierToast?.(data);
}

function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

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

export default function CashierDashboard({
  onOpenNotifications,
  unreadNotifications = 0,
}) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [pharmBills, setPharmBills] = useState([]);
  const [labBills, setLabBills] = useState([]);
  const [pharmSummary, setPharmSummary] = useState({});
  const [labSummary, setLabSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const knownPharmIds = useRef(null);
  const knownLabIds = useRef(null);
  const isFirst = useRef(true);

  const fetchAll = useCallback(async (silent = false) => {
    try {
      const tzOffset = -new Date().getTimezoneOffset();
      const [pRes, lRes] = await Promise.all([
        api.get(`/bills?limit=1000&tzOffset=${tzOffset}`),
        api.get("/lab-request-bills?limit=1000"),
      ]);

      const freshPharm = pRes.data?.bills || [];
      const freshLab = lRes.data?.bills || [];

      // Pharmacy notifications
      if (isFirst.current) {
        const toNotify = freshPharm.filter(
          (b) => b.paymentStatus === "unpaid" && (b.lines || []).length > 0,
        );
        toNotify.forEach((b, i) =>
          setTimeout(() => firePharmacyNotif(b), i * 800),
        );
        knownPharmIds.current = new Set(freshPharm.map((b) => b._id));
        const toNotifyLab = freshLab.filter(
          (b) => b.paymentStatus === "unpaid" && (b.labLines || []).length > 0,
        );
        toNotifyLab.forEach((b, i) =>
          setTimeout(() => fireLabNotif(b), i * 800),
        );
        knownLabIds.current = new Set(freshLab.map((b) => b._id));
        isFirst.current = false;
      } else {
        const newPharm = freshPharm.filter(
          (b) =>
            !knownPharmIds.current.has(b._id) && (b.lines || []).length > 0,
        );
        newPharm.forEach((b, i) =>
          setTimeout(() => firePharmacyNotif(b), i * 800),
        );
        newPharm.forEach((b) => knownPharmIds.current.add(b._id));
        const newLab = freshLab.filter(
          (b) =>
            !knownLabIds.current.has(b._id) && (b.labLines || []).length > 0,
        );
        newLab.forEach((b, i) => setTimeout(() => fireLabNotif(b), i * 800));
        newLab.forEach((b) => knownLabIds.current.add(b._id));
      }

      setPharmBills(freshPharm);
      setPharmSummary(pRes.data?.summary || {});
      setLabBills(freshLab);
      setLabSummary(lRes.data?.summary || {});
    } catch {
      /* silent */
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, []);
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 20_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const allBills = [...pharmBills, ...labBills];
  const todayCollected =
    (pharmSummary.todayCollected ?? 0) + (labSummary.todayCollected ?? 0);
  const allUnpaid = allBills.filter((b) => b.paymentStatus === "unpaid");
  const outstandingAmt = allUnpaid.reduce((s, b) => s + b.totalAmount, 0);
  const notedBills = pharmBills.filter(
    (b) => b.hasNote && b.paymentStatus === "unpaid",
  );
  const recentBills = [
    ...pharmBills.map((b) => ({ ...b, _t: "pharm" })),
    ...labBills.map((b) => ({ ...b, _t: "lab" })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const STATS = [
    {
      label: "Today's Collections",
      value: `LKR ${todayCollected.toLocaleString()}`,
      icon: "💸",
      color: ACCENT,
      bg: "#E3F2FD",
    },
    {
      label: "Unpaid Bills",
      value: allUnpaid.length,
      icon: "⏳",
      color: "#B71C1C",
      bg: "#FFEBEE",
    },
    {
      label: "Outstanding Amount",
      value: `LKR ${outstandingAmt.toLocaleString()}`,
      icon: "🧾",
      color: "#1565C0",
      bg: "#E3F2FD",
    },
    {
      label: "Bills with Notes",
      value: notedBills.length,
      icon: "📝",
      color: "#E65100",
      bg: "#FFF3E0",
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
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
        {/* Header */}
        <LinearGradient
          colors={["#0D2137", "#01579B", "#0277BD"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <View style={s.decCircle1} />
          <View style={s.decCircle2} />
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Good day 👋</Text>
              <Text style={s.headerTitle}>Cashier Dashboard</Text>
              {loading ? null : (
                <Text style={s.headerDesc}>
                  <Text style={{ color: "#FCD34D", fontWeight: "700" }}>
                    LKR {todayCollected.toLocaleString()}
                  </Text>{" "}
                  collected today
                </Text>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={onOpenNotifications}
              style={s.notificationBtn}
            >
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              {unreadNotifications > 0 && (
                <View style={s.notificationBadge}>
                  <Text style={s.notificationBadgeText}>
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={s.body}>
          {/* Noted bills alert */}
          {notedBills.length > 0 && (
            <View style={s.alertBox}>
              <View style={s.alertHeader}>
                <Text style={{ fontSize: 18 }}>📝</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.alertTitle}>
                    {notedBills.length} Bill{notedBills.length > 1 ? "s" : ""}{" "}
                    with Pharmacist Notes
                  </Text>
                  <Text style={s.alertSub}>
                    These patients have special notes — please read before
                    collecting payment
                  </Text>
                </View>
              </View>
              {notedBills.map((bill) => (
                <View key={bill._id} style={s.alertRow}>
                  <View style={s.alertAvatar}>
                    <Text style={s.alertAvatarText}>
                      {bill.patientName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertPatient}>
                      {bill.patientName}{" "}
                      <Text style={s.alertBillNo}>{bill.billNumber}</Text>
                    </Text>
                    <View style={s.noteBox}>
                      <Text style={s.noteText}>📝 {bill.noteContent}</Text>
                    </View>
                  </View>
                  <Text style={s.alertAmt}>
                    LKR {bill.totalAmount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Stat cards */}
          <View style={s.statsGrid}>
            {STATS.map((c) => (
              <View key={c.label} style={s.statCard}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{c.icon}</Text>
                  <Text style={s.statLabel} numberOfLines={1}>
                    {c.label}
                  </Text>
                </View>
                <Text style={[s.statValue, { color: c.color }]}>{c.value}</Text>
              </View>
            ))}
          </View>

          {/* Recent Bills */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View>
                <Text style={s.cardTitle}>Recent Bills</Text>
                <Text style={s.cardSub}>
                  Latest bills from pharmacy and lab requests
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate("CashierBilling")}
              >
                <Text style={s.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator
                color={ACCENT}
                style={{ marginVertical: 24 }}
              />
            ) : recentBills.length === 0 ? (
              <Text style={s.emptyText}>No bills yet</Text>
            ) : (
              recentBills.map((bill) => {
                const isLab = bill._t === "lab";
                const isPaid = bill.paymentStatus === "paid";
                return (
                  <View
                    key={bill._id}
                    style={[
                      s.billRow,
                      bill.hasNote && !isPaid && { backgroundColor: "#FFFBEB" },
                    ]}
                  >
                    <View
                      style={[
                        s.billAvatar,
                        { backgroundColor: isPaid ? ACCENT : "#9CA3AF" },
                      ]}
                    >
                      <Text style={s.billAvatarText}>
                        {bill.patientName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <Text style={s.billName}>{bill.patientName}</Text>

                        {!isLab && bill.hasNote && !isPaid && (
                          <View style={s.noteBadge}>
                            <Text style={s.noteBadgeText}>Note</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.billMeta}>
                        {bill.billNumber} ·{" "}
                        {isLab ? bill.labRequestId : bill.prescriptionRef} ·{" "}
                        {timeAgo(bill.createdAt)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text
                        style={[
                          s.billAmt,
                          { color: isPaid ? ACCENT : "#B71C1C" },
                        ]}
                      >
                        LKR {bill.totalAmount.toLocaleString()}
                      </Text>
                      <View
                        style={[
                          s.statusPill,
                          isPaid ? s.statusPaid : s.statusUnpaid,
                        ]}
                      >
                        <Text
                          style={[
                            s.statusText,
                            isPaid
                              ? { color: "#01579B" }
                              : { color: "#B91C1C" },
                          ]}
                        >
                          {isPaid ? "Paid" : "Unpaid"}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Quick Actions */}
          <View style={s.card}>
            <Text style={[s.cardTitle, { marginBottom: 12 }]}>
              Quick Actions
            </Text>
            {[
              { label: "Process Payment", tab: "CashierBilling", icon: "💸" },
              { label: "View Unpaid Bills", tab: "CashierBilling", icon: "⏳" },
              { label: "Billing Turnover", tab: "CashierTurnover", icon: "📊" },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={s.quickRow}
                onPress={() => navigation.navigate(action.tab)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16 }}>{action.icon}</Text>
                <Text style={s.quickLabel}>{action.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 28,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  decCircle1: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  decCircle2: {
    position: "absolute",
    right: 60,
    bottom: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  headerDesc: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  notificationBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  viewBillsBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  viewBillsBtnText: { color: "#01579B", fontWeight: "700", fontSize: 13 },
  body: { padding: 14, gap: 14 },
  alertBox: {
    backgroundColor: "#FFFBEB",
    borderWidth: 2,
    borderColor: "#FDE68A",
    borderRadius: 16,
    overflow: "hidden",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FEF3C7",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  alertSub: { fontSize: 11, color: "#B45309", marginTop: 2 },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
  },
  alertAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FCD34D",
    alignItems: "center",
    justifyContent: "center",
  },
  alertAvatarText: { fontSize: 11, fontWeight: "700", color: "#92400E" },
  alertPatient: { fontSize: 13, fontWeight: "700", color: "#1F2937" },
  alertBillNo: { fontSize: 11, color: "#6B7280", fontWeight: "400" },
  noteBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  noteText: { fontSize: 12, color: "#92400E" },
  alertAmt: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
    flexShrink: 0,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 13, fontWeight: "800", marginBottom: 0 },
  statLabel: { fontSize: 10, color: "#64748B", flex: 1 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  cardSub: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  viewAll: { fontSize: 13, fontWeight: "600", color: ACCENT },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 13,
    paddingVertical: 16,
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  billAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  billAvatarText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  billName: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  billMeta: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  billAmt: { fontSize: 13, fontWeight: "700" },
  labBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  labBadgeText: { fontSize: 9, fontWeight: "700", color: "#1D4ED8" },
  noteBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  noteBadgeText: { fontSize: 9, fontWeight: "700", color: "#92400E" },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusPaid: { backgroundColor: "#DBEAFE", borderColor: "#BFDBFE" },
  statusUnpaid: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  statusText: { fontSize: 10, fontWeight: "700" },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  quickLabel: { flex: 1, fontSize: 12, fontWeight: "500", color: "#374151" },
  outstandingBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    padding: 16,
  },
  outstandingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
    marginBottom: 4,
  },
  outstandingAmt: { fontSize: 28, fontWeight: "900", color: "#B71C1C" },
  outstandingSub: { fontSize: 12, color: "#EF4444", marginTop: 2 },
  collectBtn: {
    marginTop: 12,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  collectBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
