import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const ACCENT = "#1A237E";

// ── Static data (parity with web AdminDashboard) ─────────────
const PORTAL_ACTIVITY = [
  {
    portal: "Doctor Portal",
    active: 1,
    total: 1,
    icon: "medkit",
    color: "#1565C0",
    bg: "#E3F2FD",
  },
  {
    portal: "Patient Portal",
    active: 6,
    total: 62,
    icon: "person",
    color: "#00897B",
    bg: "#E0F2F1",
  },
  {
    portal: "Lab Portal",
    active: 1,
    total: 1,
    icon: "flask",
    color: "#006064",
    bg: "#E0F2F1",
  },
  {
    portal: "Pharmacy Portal",
    active: 1,
    total: 1,
    icon: "medical",
    color: "#2E7D32",
    bg: "#E8F5E9",
  },
];

const RECENT_ACTIVITY = [
  {
    time: "09:45 AM",
    action: "New appointment booked",
    actor: "Kamal Perera",
    icon: "calendar",
  },
  {
    time: "09:38 AM",
    action: "Lab result uploaded",
    actor: "Lab Technician",
    icon: "flask",
  },
  {
    time: "09:22 AM",
    action: "Prescription dispensed",
    actor: "Pharmacy Staff",
    icon: "medical",
  },
  {
    time: "09:10 AM",
    action: "New patient registered",
    actor: "Nimesha Silva",
    icon: "person-add",
  },
  {
    time: "08:55 AM",
    action: "Consultation completed",
    actor: "Dr. Jayaweera",
    icon: "checkmark-circle",
  },
  {
    time: "08:40 AM",
    action: "Invoice generated",
    actor: "Billing System",
    icon: "cash",
  },
];

const REVENUE_MONTHS = [
  { month: "Sep", revenue: 284000 },
  { month: "Oct", revenue: 312000 },
  { month: "Nov", revenue: 298000 },
  { month: "Dec", revenue: 275000 },
  { month: "Jan", revenue: 341000 },
  { month: "Feb", revenue: 389000 },
];

const STAFF_PREVIEW = [
  {
    name: "Dr. M.T.D. Jayaweera",
    role: "Chief Physician",
    dept: "Consultation",
    avatar: "DJ",
  },
  {
    name: "Lab Technician",
    role: "Lab Staff",
    dept: "Laboratory",
    avatar: "LT",
  },
  {
    name: "Pharmacist",
    role: "Pharmacy Staff",
    dept: "Pharmacy",
    avatar: "PH",
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatTodayDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────
// Equipment summary widget (live data from API)
// ─────────────────────────────────────────────────────────────
function EquipmentSummary({ navigation }) {
  const [stats, setStats] = useState(null);
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [sRes, eqRes] = await Promise.all([
        api.get("/equipment/stats"),
        api.get("/equipment?status=Needs Attention"),
      ]);
      setStats(sRes.data?.data || sRes.data || {});
      setFlagged(eqRes.data?.data || eqRes.data || []);
    } catch {
      // Silently fail — non-critical widget
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <View
        style={[
          s.card,
          {
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 32,
          },
        ]}
      >
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    );
  }
  if (!stats) return null;

  const tiles = [
    {
      label: "Total",
      value: stats.total || 0,
      color: "#1A237E",
      bg: "#E8EAF6",
    },
    {
      label: "Available",
      value: stats.available || 0,
      color: "#2E7D32",
      bg: "#E8F5E9",
    },
    {
      label: "In Use",
      value: stats.inUse || 0,
      color: "#1565C0",
      bg: "#E3F2FD",
    },
    {
      label: "Needs Attention",
      value: stats.needsAttention || 0,
      color: "#E65100",
      bg: "#FFF3E0",
    },
    {
      label: "Under Maint.",
      value: stats.underMaintenance || 0,
      color: "#B45309",
      bg: "#FEF3C7",
    },
    {
      label: "Replace Alerts",
      value: stats.replacementAlerts || 0,
      color: "#C62828",
      bg: "#FFEBEE",
    },
  ];

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View>
          <Text style={s.cardTitle}>⚙️ Equipment Status</Text>
          <Text style={s.cardSub}>Live · auto-refresh 30s</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("AdminEquipment")}>
          <Text style={s.linkText}>Manage →</Text>
        </TouchableOpacity>
      </View>

      <View style={eq.grid}>
        {tiles.map((t) => (
          <View key={t.label} style={[eq.tile, { backgroundColor: t.bg }]}>
            <Text style={[eq.tileVal, { color: t.color }]}>{t.value}</Text>
            <Text style={[eq.tileLbl, { color: t.color }]}>{t.label}</Text>
          </View>
        ))}
      </View>

      {flagged.length > 0 ? (
        <View style={eq.alertBox}>
          <Text style={eq.alertTitle}>
            ⚠️ Needs Attention ({flagged.length})
          </Text>
          {flagged.slice(0, 3).map((e) => (
            <View key={e._id} style={eq.alertRow}>
              <Text style={eq.alertName} numberOfLines={1}>
                {e.name}
              </Text>
              <Text style={eq.alertId}>{e.equipment_id}</Text>
            </View>
          ))}
          {flagged.length > 3 && (
            <Text style={eq.alertMore}>+{flagged.length - 3} more…</Text>
          )}
        </View>
      ) : (
        (stats.underMaintenance || 0) === 0 && (
          <View style={eq.okBox}>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={eq.okText}>All equipment in good condition</Text>
          </View>
        )
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const maxRev = Math.max(...REVENUE_MONTHS.map((m) => m.revenue));
  const thisMonth = REVENUE_MONTHS[REVENUE_MONTHS.length - 1];

  const kpiCards = [
    {
      label: "Total Patients",
      value: "62",
      sub: "+8 this month",
      icon: "people",
      color: "#1565C0",
      bg: "#E3F2FD",
    },
    {
      label: "Consultations Today",
      value: "19",
      sub: "84 this month",
      icon: "document",
      color: "#00897B",
      bg: "#E0F2F1",
    },
    {
      label: "Today's Revenue",
      value: "LKR 48,200",
      sub: "+12% vs yesterday",
      icon: "cash",
      color: "#1A237E",
      bg: "#E8EAF6",
    },
    {
      label: "Active Staff",
      value: String(STAFF_PREVIEW.length),
      sub: "All departments",
      icon: "person",
      color: "#7B1FA2",
      bg: "#F3E5F5",
    },
  ];

  const quickActions = [
    {
      label: "Add Staff Member",
      screen: "AdminStaff",
      icon: "person-add",
      color: "#1A237E",
      bg: "#E8EAF6",
    },
    {
      label: "Equipment Management",
      screen: "AdminEquipment",
      icon: "construct",
      color: "#B45309",
      bg: "#FEF3C7",
    },
    {
      label: "View All Appointments",
      screen: "AdminAppointments",
      icon: "calendar",
      color: "#1565C0",
      bg: "#E3F2FD",
    },
    {
      label: "Finance Reports",
      screen: "AdminFinance",
      icon: "bar-chart",
      color: "#00897B",
      bg: "#E0F2F1",
    },
    {
      label: "System Settings",
      screen: "AdminSettings",
      icon: "settings",
      color: "#37474F",
      bg: "#ECEFF1",
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
          />
        }
      >
        {/* Welcome banner */}
        <View style={{ paddingHorizontal: 16 }}>
          <LinearGradient
            colors={["#0D2137", "#1A237E", "#283593"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={banner.wrap}
          >
            <Text style={banner.greeting}>{getGreeting()} 👋</Text>
            <Text style={banner.title}>People's Health Care</Text>
            <Text style={banner.sub}>
              <Text style={{ color: "#C7D2FE", fontWeight: "700" }}>
                System running normally
              </Text>{" "}
              · {formatTodayDate()}
            </Text>
            <View style={banner.btnRow}>
              <TouchableOpacity
                style={banner.btnPri}
                onPress={() => navigation.navigate("AdminStaff")}
                activeOpacity={0.85}
              >
                <Ionicons name="people" size={14} color="#1A237E" />
                <Text style={banner.btnPriText}>Manage Staff</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={banner.btnSec}
                onPress={() => navigation.navigate("AdminFinance")}
                activeOpacity={0.85}
              >
                <Ionicons name="bar-chart" size={14} color="#fff" />
                <Text style={banner.btnSecText}>View Reports</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* KPI Strip */}
        <View style={kpi.row}>
          {kpiCards.map((c) => (
            <View key={c.label} style={kpi.card}>
              <View style={kpi.cardTop}>
                <View style={[kpi.iconBox, { backgroundColor: c.bg }]}>
                  <Ionicons name={c.icon} size={16} color={c.color} />
                </View>
                <View style={kpi.badge}>
                  <Text style={kpi.badgeText}>{c.sub}</Text>
                </View>
              </View>
              <Text style={[kpi.value, { color: c.color }]} numberOfLines={1}>
                {c.value}
              </Text>
              <Text style={kpi.label}>{c.label}</Text>
            </View>
          ))}
        </View>

        {/* Monthly Revenue Chart */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View>
                <Text style={s.cardTitle}>Monthly Revenue</Text>
                <Text style={s.cardSub}>Last 6 months</Text>
              </View>
              <View style={chart.upBadge}>
                <Text style={chart.upBadgeText}>↑ 14%</Text>
              </View>
            </View>
            <View style={chart.bars}>
              {REVENUE_MONTHS.map((m, i) => {
                const isLatest = i === REVENUE_MONTHS.length - 1;
                const pct = (m.revenue / maxRev) * 100;
                return (
                  <View key={m.month} style={chart.col}>
                    <Text
                      style={[chart.colVal, isLatest && { color: "#0F172A" }]}
                    >
                      {Math.round(m.revenue / 1000)}k
                    </Text>
                    <View
                      style={[
                        chart.bar,
                        {
                          height: Math.max(pct * 1.1, 8),
                          backgroundColor: isLatest
                            ? "#1A237E"
                            : "rgba(26,35,126,0.2)",
                        },
                      ]}
                    />
                    <Text style={chart.colMonth}>{m.month}</Text>
                  </View>
                );
              })}
            </View>
            <View style={chart.statsRow}>
              {[
                { label: "Feb Rev", val: "LKR 389k" },
                { label: "Avg/Month", val: "LKR 316k" },
                { label: "YTD", val: "LKR 1.9M" },
              ].map((x) => (
                <View key={x.label} style={chart.statBox}>
                  <Text style={chart.statVal}>{x.val}</Text>
                  <Text style={chart.statLbl}>{x.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Portal Activity */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={s.card}>
            <Text style={[s.cardTitle, { marginBottom: 12 }]}>
              Portal Activity
            </Text>
            {PORTAL_ACTIVITY.map((p) => (
              <View key={p.portal} style={portal.row}>
                <View style={[portal.iconBox, { backgroundColor: p.bg }]}>
                  <Ionicons name={p.icon} size={18} color={p.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={portal.name}>{p.portal}</Text>
                  <Text style={portal.sub}>
                    {p.active} active session{p.active > 1 ? "s" : ""}
                  </Text>
                </View>
                <View style={portal.statusRow}>
                  <View style={portal.dot} />
                  <Text style={portal.statusTxt}>Online</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={s.card}>
            <Text style={[s.cardTitle, { marginBottom: 12 }]}>
              Quick Actions
            </Text>
            {quickActions.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={qa.row}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.7}
              >
                <View style={[qa.iconBox, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={16} color={a.color} />
                </View>
                <Text style={qa.label}>{a.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Equipment summary widget */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <EquipmentSummary navigation={navigation} />
        </View>

        {/* Staff Overview */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Staff Overview</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("AdminStaff")}
              >
                <Text style={s.linkText}>Manage →</Text>
              </TouchableOpacity>
            </View>
            {STAFF_PREVIEW.map((st) => (
              <View key={st.name} style={staff.row}>
                <LinearGradient
                  colors={["#1A237E", "#283593"]}
                  style={staff.avatar}
                >
                  <Text style={staff.avatarTxt}>{st.avatar}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={staff.name}>{st.name}</Text>
                  <Text style={staff.sub}>
                    {st.role} · {st.dept}
                  </Text>
                </View>
                <View style={staff.activeBadge}>
                  <Text style={staff.activeBadgeTxt}>● Active</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Recent Activity</Text>
              <Text style={s.cardSub}>Today</Text>
            </View>
            {RECENT_ACTIVITY.map((a, i) => (
              <View key={i} style={act.row}>
                <View style={act.iconBox}>
                  <Ionicons name={a.icon} size={14} color="#64748B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={act.action}>{a.action}</Text>
                  <Text style={act.actor}>{a.actor}</Text>
                </View>
                <Text style={act.time}>{a.time}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Shared / card styles ────────────────────────────────────
const s = StyleSheet.create({
  card: {
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  cardSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  linkText: { fontSize: 12, color: ACCENT, fontWeight: "600" },
});

const banner = StyleSheet.create({
  wrap: { borderRadius: 20, padding: 18, overflow: "hidden" },
  greeting: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 },
  sub: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  btnPri: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnPriText: { color: "#1A237E", fontSize: 12, fontWeight: "700" },
  btnSec: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnSecText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});

const kpi = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginTop: 16,
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
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    maxWidth: 100,
  },
  badgeText: { color: "#15803D", fontSize: 9, fontWeight: "700" },
  value: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  label: { fontSize: 11, color: "#64748B", marginTop: 2 },
});

const chart = StyleSheet.create({
  upBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upBadgeText: { color: "#15803D", fontSize: 11, fontWeight: "700" },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 150,
    gap: 8,
    paddingTop: 8,
  },
  col: { flex: 1, alignItems: "center", gap: 4 },
  colVal: { fontSize: 10, fontWeight: "700", color: "#94A3B8" },
  bar: {
    width: "100%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 8,
  },
  colMonth: { fontSize: 10, color: "#94A3B8" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  statVal: { fontSize: 12, fontWeight: "800", color: ACCENT },
  statLbl: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
});

const portal = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  sub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" },
  statusTxt: { fontSize: 11, color: "#16A34A", fontWeight: "700" },
});

const qa = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1, fontSize: 13, fontWeight: "500", color: "#334155" },
});

const eq = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  tile: { width: "31%", borderRadius: 12, padding: 10, alignItems: "center" },
  tileVal: { fontSize: 18, fontWeight: "800" },
  tileLbl: { fontSize: 10, marginTop: 2, opacity: 0.85 },
  alertBox: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  alertTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 6,
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  alertName: { fontSize: 11, fontWeight: "700", color: "#78350F", flex: 1 },
  alertId: { fontSize: 10, color: "#92400E", fontFamily: "monospace" },
  alertMore: { fontSize: 10, color: "#92400E", marginTop: 4 },
  okBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  okText: { fontSize: 11, fontWeight: "700", color: "#15803D" },
});

const staff = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  name: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  sub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  activeBadge: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeTxt: { fontSize: 10, fontWeight: "700", color: "#15803D" },
});

const act = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  action: { fontSize: 12, color: "#334155" },
  actor: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  time: { fontSize: 10, color: "#94A3B8" },
});
