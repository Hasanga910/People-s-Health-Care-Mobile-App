import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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

const PATIENTS = [
  {
    id: "PHC-2026-0012",
    name: "Kamal Perera",
    age: 54,
    gender: "Male",
    blood: "B+",
    phone: "0712 345 678",
    registered: "05 Jan 2026",
    lastVisit: "15 Feb 2026",
    visits: 5,
    conditions: ["Type 2 Diabetes", "Hypertension"],
  },
  {
    id: "PHC-2026-0019",
    name: "Sumudu Silva",
    age: 29,
    gender: "Female",
    blood: "O+",
    phone: "0765 234 567",
    registered: "10 Jan 2026",
    lastVisit: "15 Feb 2026",
    visits: 2,
    conditions: ["Upper Respiratory Infection"],
  },
  {
    id: "PHC-2026-0031",
    name: "Ruwan Fernando",
    age: 47,
    gender: "Male",
    blood: "A+",
    phone: "0777 543 210",
    registered: "15 Jan 2026",
    lastVisit: "15 Feb 2026",
    visits: 3,
    conditions: ["Hyperlipidaemia", "Hypertension"],
  },
  {
    id: "PHC-2026-0044",
    name: "Dilani Bandara",
    age: 38,
    gender: "Female",
    blood: "AB+",
    phone: "0712 678 901",
    registered: "20 Jan 2026",
    lastVisit: "15 Feb 2026",
    visits: 2,
    conditions: ["Suspected Diabetes"],
  },
  {
    id: "PHC-2026-0051",
    name: "Suresh Jayasinghe",
    age: 52,
    gender: "Male",
    blood: "B+",
    phone: "0712 890 123",
    registered: "08 Feb 2026",
    lastVisit: "15 Feb 2026",
    visits: 2,
    conditions: ["GERD"],
  },
  {
    id: "PHC-2026-0062",
    name: "Nimesha Silva",
    age: 29,
    gender: "Female",
    blood: "O-",
    phone: "0765 012 345",
    registered: "12 Feb 2026",
    lastVisit: "15 Feb 2026",
    visits: 1,
    conditions: ["Upper Respiratory Infection"],
  },
  {
    id: "PHC-2026-0071",
    name: "Anura Dissanayake",
    age: 61,
    gender: "Male",
    blood: "A-",
    phone: "0712 111 222",
    registered: "18 Jan 2026",
    lastVisit: "14 Feb 2026",
    visits: 4,
    conditions: ["Type 2 Diabetes"],
  },
  {
    id: "PHC-2026-0082",
    name: "Priya Gamage",
    age: 42,
    gender: "Female",
    blood: "B-",
    phone: "0765 333 444",
    registered: "22 Jan 2026",
    lastVisit: "13 Feb 2026",
    visits: 2,
    conditions: ["Hypertension"],
  },
];

function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

export default function AdminPatients() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [genderFilter, setGender] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = PATIENTS.filter((p) => {
    const matchS =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchG = genderFilter === "All" || p.gender === genderFilter;
    return matchS && matchG;
  });

  const stats = {
    total: PATIENTS.length,
    active: PATIENTS.filter((p) => p.lastVisit.includes("Feb")).length,
    male: PATIENTS.filter((p) => p.gender === "Male").length,
    female: PATIENTS.filter((p) => p.gender === "Female").length,
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* Header with back button (since this is reached from More menu) */}
      <LinearGradient
        colors={["#0D2137", "#1A237E"]}
        style={[hdr.wrap, { paddingTop: insets.top + 12 }]}
      >
        <View style={hdr.topRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={hdr.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={hdr.title}>Patient Overview</Text>
            <Text style={hdr.sub}>All registered patients · {stats.total}</Text>
          </View>
        </View>
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
              label: "Total Patients",
              value: stats.total,
              color: "#1A237E",
              bg: "#E8EAF6",
            },
            {
              label: "Active This Month",
              value: stats.active,
              color: "#1565C0",
              bg: "#DBEAFE",
            },
            {
              label: "Female",
              value: stats.female,
              color: "#DB2777",
              bg: "#FCE7F3",
            },
            {
              label: "Male",
              value: stats.male,
              color: "#0F766E",
              bg: "#CCFBF1",
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
            placeholder="Search by name or patient ID…"
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

        {/* Gender filter */}
        <View style={filterSt.row}>
          {["All", "Male", "Female"].map((g) => {
            const active = genderFilter === g;
            return (
              <TouchableOpacity
                key={g}
                onPress={() => setGender(g)}
                style={[filterSt.pill, active && filterSt.pillActive]}
                activeOpacity={0.85}
              >
                <Text
                  style={[filterSt.pillTxt, active && filterSt.pillTxtActive]}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Patient cards */}
        {filtered.length === 0 ? (
          <View style={empty.wrap}>
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={empty.title}>No patients found</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {filtered.map((p) => (
              <View key={p.id} style={card.wrap}>
                <View style={card.topRow}>
                  <LinearGradient
                    colors={["#1A237E", "#283593"]}
                    style={card.avatar}
                  >
                    <Text style={card.avatarTxt}>{getInitials(p.name)}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={card.name}>{p.name}</Text>
                    <Text style={card.phone}>{p.phone}</Text>
                  </View>
                  <View style={card.bloodPill}>
                    <Text style={card.bloodTxt}>{p.blood}</Text>
                  </View>
                </View>

                <View style={card.metaRow}>
                  <View style={card.cell}>
                    <Ionicons name="person-outline" size={11} color="#94A3B8" />
                    <Text style={card.cellTxt}>
                      {p.age} · {p.gender}
                    </Text>
                  </View>
                  <View style={card.cell}>
                    <Ionicons name="card-outline" size={11} color="#94A3B8" />
                    <Text style={card.cellTxt} numberOfLines={1}>
                      {p.id}
                    </Text>
                  </View>
                </View>

                <View style={card.metaRow}>
                  <View style={card.cell}>
                    <Ionicons
                      name="calendar-outline"
                      size={11}
                      color="#94A3B8"
                    />
                    <Text style={card.cellTxt}>Last: {p.lastVisit}</Text>
                  </View>
                  <View style={card.cell}>
                    <Ionicons name="repeat-outline" size={11} color="#94A3B8" />
                    <Text style={card.cellTxt}>{p.visits} visits</Text>
                  </View>
                </View>

                {p.conditions?.length > 0 && (
                  <View style={card.condRow}>
                    {p.conditions.map((c) => (
                      <View key={c} style={card.condPill}>
                        <Text style={card.condTxt}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={card.footer}>
                  <View style={card.activeBadge}>
                    <Text style={card.activeBadgeTxt}>● Active</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const hdr = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 16 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
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
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
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
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  name: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  phone: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  bloodPill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bloodTxt: { fontSize: 11, fontWeight: "800", color: "#B91C1C" },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  cell: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  cellTxt: { fontSize: 11, color: "#475569" },
  condRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  condPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  condTxt: { fontSize: 10, color: "#64748B" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
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

const empty = StyleSheet.create({
  wrap: { paddingVertical: 60, alignItems: "center" },
  title: { fontSize: 15, fontWeight: "700", color: "#475569", marginTop: 12 },
});
