import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#1A237E";

const APPOINTMENTS = [
  {
    id: "APT-0101",
    patient: "Kamal Perera",
    age: 54,
    channeling: "012",
    time: "08:20 AM",
    type: "General Consultation",
    doctor: "Dr. Jayaweera",
    status: "Completed",
    paid: true,
  },
  {
    id: "APT-0102",
    patient: "Sumudu Silva",
    age: 29,
    channeling: "002",
    time: "09:15 AM",
    type: "General Consultation",
    doctor: "Dr. Jayaweera",
    status: "Completed",
    paid: true,
  },
  {
    id: "APT-0103",
    patient: "Ruwan Fernando",
    age: 47,
    channeling: "017",
    time: "09:35 AM",
    type: "Follow-up",
    doctor: "Dr. Jayaweera",
    status: "Completed",
    paid: true,
  },
  {
    id: "APT-0104",
    patient: "Dilani Bandara",
    age: 38,
    channeling: "016",
    time: "10:05 AM",
    type: "General Consultation",
    doctor: "Dr. Jayaweera",
    status: "In Progress",
    paid: false,
  },
  {
    id: "APT-0105",
    patient: "Suresh Jayasinghe",
    age: 52,
    channeling: "015",
    time: "10:30 AM",
    type: "General Consultation",
    doctor: "Dr. Jayaweera",
    status: "Waiting",
    paid: false,
  },
  {
    id: "APT-0106",
    patient: "Nimesha Silva",
    age: 29,
    channeling: "019",
    time: "10:55 AM",
    type: "General Consultation",
    doctor: "Dr. Jayaweera",
    status: "Waiting",
    paid: false,
  },
  {
    id: "APT-0107",
    patient: "Anura Dissanayake",
    age: 61,
    channeling: "011",
    time: "11:20 AM",
    type: "Follow-up",
    doctor: "Dr. Jayaweera",
    status: "Scheduled",
    paid: false,
  },
  {
    id: "APT-0108",
    patient: "Priya Gamage",
    age: 42,
    channeling: "013",
    time: "11:45 AM",
    type: "Annual Check",
    doctor: "Dr. Jayaweera",
    status: "Scheduled",
    paid: false,
  },
];

const STATUS_STYLE = {
  Completed: { bg: "#DCFCE7", text: "#15803D", dot: "#22C55E" },
  "In Progress": { bg: "#DBEAFE", text: "#1D4ED8", dot: "#3B82F6" },
  Waiting: { bg: "#E0E7FF", text: "#4338CA", dot: "#818CF8" },
  Scheduled: { bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8" },
};

function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

export default function AdminAppointments() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = APPOINTMENTS.filter((a) => {
    const matchFilter = filter === "All" || a.status === filter;
    const matchSearch =
      a.patient.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    Total: APPOINTMENTS.length,
    Completed: APPOINTMENTS.filter((a) => a.status === "Completed").length,
    "In Progress": APPOINTMENTS.filter((a) => a.status === "In Progress")
      .length,
    Waiting: APPOINTMENTS.filter((a) => a.status === "Waiting").length,
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <LinearGradient
        colors={["#0D2137", "#1A237E"]}
        style={[hdr.wrap, { paddingTop: insets.top + 12 }]}
      >
        <Text style={hdr.title}>Appointments</Text>
        <Text style={hdr.sub}>
          All consultations ·{" "}
          {new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </Text>
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
        {/* Stats */}
        <View style={kpi.row}>
          {[
            {
              label: "Total Today",
              value: counts.Total,
              color: "#1A237E",
              bg: "#E8EAF6",
            },
            {
              label: "Completed",
              value: counts.Completed,
              color: "#15803D",
              bg: "#DCFCE7",
            },
            {
              label: "In Progress",
              value: counts["In Progress"],
              color: "#1D4ED8",
              bg: "#DBEAFE",
            },
            {
              label: "Waiting",
              value: counts.Waiting,
              color: "#B45309",
              bg: "#FEF3C7",
            },
          ].map((s) => (
            <View key={s.label} style={[kpi.tile, { backgroundColor: s.bg }]}>
              <Text style={[kpi.val, { color: s.color }]}>{s.value}</Text>
              <Text style={[kpi.lbl, { color: s.color }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        <View style={searchSt.wrap}>
          <Ionicons
            name="search"
            size={16}
            color="#94A3B8"
            style={{ marginLeft: 12 }}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search patient or ID…"
            placeholderTextColor="#94A3B8"
            style={searchSt.input}
          />
          {search ? (
            <TouchableOpacity
              onPress={() => setSearch("")}
              style={{ paddingHorizontal: 10 }}
            >
              <Ionicons name="close-circle" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={filterSt.row}
        >
          {["All", "Completed", "In Progress", "Waiting", "Scheduled"].map(
            (f) => {
              const active = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[filterSt.pill, active && filterSt.pillActive]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[filterSt.pillTxt, active && filterSt.pillTxtActive]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </ScrollView>

        {/* Appointment cards */}
        {filtered.length === 0 ? (
          <View style={empty.wrap}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text style={empty.title}>No appointments found</Text>
            <Text style={empty.sub}>Try a different filter</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {filtered.map((a) => {
              const st = STATUS_STYLE[a.status];
              return (
                <View key={a.id} style={card.wrap}>
                  <View style={card.topRow}>
                    <View style={card.channelingPill}>
                      <Text style={card.channelingTxt}>#{a.channeling}</Text>
                    </View>
                    <View style={[card.statusPill, { backgroundColor: st.bg }]}>
                      <View
                        style={[card.statusDot, { backgroundColor: st.dot }]}
                      />
                      <Text style={[card.statusTxt, { color: st.text }]}>
                        {a.status}
                      </Text>
                    </View>
                  </View>

                  <View style={card.midRow}>
                    <LinearGradient
                      colors={["#1A237E", "#283593"]}
                      style={card.avatar}
                    >
                      <Text style={card.avatarTxt}>
                        {getInitials(a.patient)}
                      </Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={card.name}>{a.patient}</Text>
                      <Text style={card.metaTxt}>
                        Age {a.age} · {a.id}
                      </Text>
                    </View>
                  </View>

                  <View style={card.bottomGrid}>
                    <View style={card.cell}>
                      <Ionicons name="time-outline" size={12} color="#94A3B8" />
                      <Text style={card.cellTxt}>{a.time}</Text>
                    </View>
                    <View style={card.cell}>
                      <Ionicons
                        name="medkit-outline"
                        size={12}
                        color="#94A3B8"
                      />
                      <Text style={card.cellTxt} numberOfLines={1}>
                        {a.doctor}
                      </Text>
                    </View>
                  </View>

                  <Text style={card.typeText}>{a.type}</Text>

                  <View style={card.footer}>
                    <View
                      style={[
                        card.payPill,
                        { backgroundColor: a.paid ? "#DCFCE7" : "#F3F4F6" },
                      ]}
                    >
                      <Ionicons
                        name={a.paid ? "checkmark-circle" : "time"}
                        size={11}
                        color={a.paid ? "#15803D" : "#94A3B8"}
                      />
                      <Text
                        style={[
                          card.payTxt,
                          { color: a.paid ? "#15803D" : "#94A3B8" },
                        ]}
                      >
                        {a.paid ? "Paid" : "Pending"}
                      </Text>
                    </View>
                    <TouchableOpacity style={card.viewBtn} activeOpacity={0.85}>
                      <Text style={card.viewBtnTxt}>View</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={12}
                        color={ACCENT}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
  tile: { width: "48%", marginHorizontal: "1%", borderRadius: 12, padding: 12 },
  val: { fontSize: 22, fontWeight: "800" },
  lbl: { fontSize: 11, marginTop: 2, opacity: 0.85 },
});

const searchSt = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    color: "#0F172A",
  },
});

const filterSt = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  pillTxt: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  pillTxtActive: { color: "#fff" },
});

const card = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  channelingPill: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  channelingTxt: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4338CA",
    fontFamily: "monospace",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 10, fontWeight: "700" },
  midRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  name: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  metaTxt: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  bottomGrid: { flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 6 },
  cell: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  cellTxt: { fontSize: 11, color: "#475569", flex: 1 },
  typeText: { fontSize: 12, color: "#64748B", marginBottom: 8 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  payPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  payTxt: { fontSize: 10, fontWeight: "700" },
  viewBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewBtnTxt: { fontSize: 12, fontWeight: "700", color: ACCENT },
});

const empty = StyleSheet.create({
  wrap: { paddingVertical: 60, alignItems: "center" },
  title: { fontSize: 15, fontWeight: "700", color: "#475569", marginTop: 12 },
  sub: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
});
