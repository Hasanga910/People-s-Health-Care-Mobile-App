import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#1A237E";

const MONTHLY = [
  { month: "Sep", revenue: 284000, expenses: 168000 },
  { month: "Oct", revenue: 312000, expenses: 181000 },
  { month: "Nov", revenue: 298000, expenses: 172000 },
  { month: "Dec", revenue: 275000, expenses: 158000 },
  { month: "Jan", revenue: 341000, expenses: 195000 },
  { month: "Feb", revenue: 389000, expenses: 217000 },
];

const TRANSACTIONS = [
  {
    id: "INV-2026-0089",
    patient: "Kamal Perera",
    date: "15 Feb 2026",
    time: "08:45 AM",
    description: "Consultation + Pharmacy",
    amount: 2200,
    paid: true,
  },
  {
    id: "INV-2026-0088",
    patient: "Sumudu Silva",
    date: "15 Feb 2026",
    time: "09:20 AM",
    description: "Consultation + Pharmacy",
    amount: 1540,
    paid: true,
  },
  {
    id: "INV-2026-0087",
    patient: "Ruwan Fernando",
    date: "15 Feb 2026",
    time: "10:00 AM",
    description: "Consultation + Lab Tests",
    amount: 4800,
    paid: true,
  },
  {
    id: "INV-2026-0086",
    patient: "Dilani Bandara",
    date: "15 Feb 2026",
    time: "10:30 AM",
    description: "Consultation + Pharmacy",
    amount: 3200,
    paid: false,
  },
  {
    id: "INV-2026-0085",
    patient: "Suresh Jayasinghe",
    date: "15 Feb 2026",
    time: "11:00 AM",
    description: "Consultation only",
    amount: 1200,
    paid: true,
  },
  {
    id: "INV-2026-0084",
    patient: "Nimesha Silva",
    date: "15 Feb 2026",
    time: "11:30 AM",
    description: "Consultation + Lab + Pharm",
    amount: 5640,
    paid: false,
  },
];

const REVENUE_SPLIT = [
  { label: "Consultations", value: 189000, pct: 49, color: "#1A237E" },
  { label: "Pharmacy Sales", value: 113000, pct: 29, color: "#1565C0" },
  { label: "Lab Tests", value: 62000, pct: 16, color: "#00897B" },
  { label: "Other", value: 25000, pct: 6, color: "#9CA3AF" },
];

function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

export default function AdminFinance() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const maxRev = Math.max(...MONTHLY.map((m) => m.revenue));
  const thisMonth = MONTHLY[MONTHLY.length - 1];
  const profit = thisMonth.revenue - thisMonth.expenses;
  const margin = Math.round((profit / thisMonth.revenue) * 100);

  const filtered = TRANSACTIONS.filter(
    (t) => filter === "All" || (filter === "Paid" ? t.paid : !t.paid),
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <LinearGradient
        colors={["#0D2137", "#1A237E"]}
        style={[hdr.wrap, { paddingTop: insets.top + 12 }]}
      >
        <Text style={hdr.title}>Finance & Billing</Text>
        <Text style={hdr.sub}>Revenue overview · February 2026</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
          />
        }
      >
        {/* KPI Cards */}
        <View style={kpi.row}>
          {[
            {
              label: "Feb Revenue",
              value: `LKR ${(thisMonth.revenue / 1000).toFixed(0)}k`,
              sub: "↑ 14% vs Jan",
              color: "#1A237E",
              bg: "#E8EAF6",
              icon: "cash",
            },
            {
              label: "Feb Expenses",
              value: `LKR ${(thisMonth.expenses / 1000).toFixed(0)}k`,
              sub: "Operating costs",
              color: "#E65100",
              bg: "#FFF3E0",
              icon: "wallet",
            },
            {
              label: "Net Profit",
              value: `LKR ${(profit / 1000).toFixed(0)}k`,
              sub: `${margin}% margin`,
              color: "#15803D",
              bg: "#DCFCE7",
              icon: "trending-up",
            },
            {
              label: "Outstanding",
              value: "LKR 8.8k",
              sub: "2 unpaid invoices",
              color: "#7B1FA2",
              bg: "#F3E5F5",
              icon: "alert-circle",
            },
          ].map((c) => (
            <View key={c.label} style={kpi.card}>
              <View style={[kpi.iconBox, { backgroundColor: c.bg }]}>
                <Ionicons name={c.icon} size={16} color={c.color} />
              </View>
              <Text style={[kpi.val, { color: c.color }]} numberOfLines={1}>
                {c.value}
              </Text>
              <Text style={kpi.lbl}>{c.label}</Text>
              <Text style={kpi.sub}>{c.sub}</Text>
            </View>
          ))}
        </View>

        {/* Revenue vs Expenses chart */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={card.wrap}>
            <View style={card.header}>
              <View>
                <Text style={card.title}>Revenue vs Expenses</Text>
                <Text style={card.sub}>Last 6 months</Text>
              </View>
              <View style={chart.legendRow}>
                <View style={chart.legendItem}>
                  <View
                    style={[chart.legendBox, { backgroundColor: "#283593" }]}
                  />
                  <Text style={chart.legendTxt}>Rev</Text>
                </View>
                <View style={chart.legendItem}>
                  <View
                    style={[chart.legendBox, { backgroundColor: "#E2E8F0" }]}
                  />
                  <Text style={chart.legendTxt}>Exp</Text>
                </View>
              </View>
            </View>
            <View style={chart.bars}>
              {MONTHLY.map((m, i) => {
                const isLatest = i === MONTHLY.length - 1;
                const revH = (m.revenue / maxRev) * 130;
                const expH = (m.expenses / maxRev) * 130;
                return (
                  <View key={m.month} style={chart.col}>
                    <View style={chart.barGroup}>
                      <View
                        style={[
                          chart.bar,
                          {
                            height: Math.max(revH, 6),
                            backgroundColor: isLatest
                              ? "#1A237E"
                              : "rgba(26,35,126,0.4)",
                          },
                        ]}
                      />
                      <View
                        style={[
                          chart.bar,
                          {
                            height: Math.max(expH, 6),
                            backgroundColor: "#CBD5E1",
                          },
                        ]}
                      />
                    </View>
                    <Text style={chart.colLabel}>{m.month}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Revenue split (donut alternative — bar list) */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={card.wrap}>
            <Text style={[card.title, { marginBottom: 12 }]}>
              Revenue Breakdown
            </Text>
            {REVENUE_SPLIT.map((r) => (
              <View key={r.label} style={split.row}>
                <View style={split.headerRow}>
                  <View style={split.labelRow}>
                    <View
                      style={[split.colorDot, { backgroundColor: r.color }]}
                    />
                    <Text style={split.label}>{r.label}</Text>
                  </View>
                  <Text style={split.value}>
                    LKR {(r.value / 1000).toFixed(0)}k · {r.pct}%
                  </Text>
                </View>
                <View style={split.track}>
                  <View
                    style={[
                      split.fill,
                      { width: `${r.pct}%`, backgroundColor: r.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Transaction filter */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={[card.wrap, { padding: 0, overflow: "hidden" }]}>
            <View style={tx.headerWrap}>
              <Text style={tx.title}>Recent Transactions</Text>
              <View style={tx.filterRow}>
                {["All", "Paid", "Pending"].map((f) => {
                  const active = filter === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFilter(f)}
                      style={[tx.pill, active && tx.pillActive]}
                      activeOpacity={0.85}
                    >
                      <Text style={[tx.pillTxt, active && tx.pillTxtActive]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {filtered.map((t, i) => (
              <View
                key={t.id}
                style={[
                  tx.row,
                  i === filtered.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <LinearGradient
                  colors={["#1A237E", "#283593"]}
                  style={tx.avatar}
                >
                  <Text style={tx.avatarTxt}>{getInitials(t.patient)}</Text>
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={tx.patientName} numberOfLines={1}>
                    {t.patient}
                  </Text>
                  <Text style={tx.desc} numberOfLines={1}>
                    {t.description}
                  </Text>
                  <Text style={tx.invId}>
                    {t.id} · {t.time}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={tx.amount}>LKR {t.amount.toLocaleString()}</Text>
                  <View
                    style={[
                      tx.statusPill,
                      { backgroundColor: t.paid ? "#DCFCE7" : "#FEF3C7" },
                    ]}
                  >
                    <Text
                      style={[
                        tx.statusTxt,
                        { color: t.paid ? "#15803D" : "#B45309" },
                      ]}
                    >
                      {t.paid ? "● Paid" : "⏳ Pending"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {filtered.length === 0 && (
              <View style={{ paddingVertical: 30, alignItems: "center" }}>
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>
                  No transactions found
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const hdr = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 16 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },
});

const kpi = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  card: {
    width: "48%",
    marginHorizontal: "1%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  val: { fontSize: 16, fontWeight: "800" },
  lbl: { fontSize: 11, color: "#64748B", marginTop: 2 },
  sub: { fontSize: 10, color: "#15803D", fontWeight: "700", marginTop: 2 },
});

const card = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  sub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
});

const chart = StyleSheet.create({
  legendRow: { flexDirection: "row", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendBox: { width: 12, height: 8, borderRadius: 2 },
  legendTxt: { fontSize: 10, color: "#64748B" },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 160, gap: 6 },
  col: { flex: 1, alignItems: "center", gap: 4 },
  barGroup: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 130,
  },
  bar: {
    width: 9,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 6,
  },
  colLabel: { fontSize: 10, color: "#94A3B8" },
});

const split = StyleSheet.create({
  row: { marginBottom: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 12, fontWeight: "600", color: "#334155" },
  value: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  track: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4 },
});

const tx = StyleSheet.create({
  headerWrap: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  filterRow: { flexDirection: "row", gap: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  pillActive: { backgroundColor: ACCENT },
  pillTxt: { fontSize: 11, fontWeight: "600", color: "#64748B" },
  pillTxtActive: { color: "#fff" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  patientName: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  desc: { fontSize: 11, color: "#64748B", marginTop: 2 },
  invId: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 2,
    fontFamily: "monospace",
  },
  amount: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusTxt: { fontSize: 9, fontWeight: "700" },
});
