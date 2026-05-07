import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#1A237E";

const INITIAL_SECTIONS = [
  {
    id: "clinic",
    label: "Clinic Information",
    icon: "business",
    fields: [
      {
        label: "Clinic Name",
        key: "clinicName",
        type: "text",
        value: "People's Health Care",
      },
      {
        label: "Registration No.",
        key: "regNo",
        type: "text",
        value: "MOH-LK-2019-0482",
      },
      { label: "Phone", key: "phone", type: "phone", value: "0777 883 343" },
      {
        label: "Email",
        key: "email",
        type: "email",
        value: "info@peopleshealthcare.lk",
      },
      {
        label: "Address",
        key: "address",
        type: "text",
        value: "Galle Road, Matara, Sri Lanka",
      },
    ],
  },
  {
    id: "schedule",
    label: "Operating Hours",
    icon: "time",
    fields: [
      {
        label: "Monday – Friday",
        key: "weekdays",
        type: "text",
        value: "08:00 AM – 06:00 PM",
      },
      {
        label: "Saturday",
        key: "saturday",
        type: "text",
        value: "08:00 AM – 02:00 PM",
      },
      { label: "Sunday", key: "sunday", type: "text", value: "Closed" },
      {
        label: "Public Holidays",
        key: "holidays",
        type: "text",
        value: "Emergency only (09:00 AM – 12:00 PM)",
      },
    ],
  },
  {
    id: "billing",
    label: "Billing Configuration",
    icon: "cash",
    fields: [
      {
        label: "Consultation Fee (LKR)",
        key: "consultFee",
        type: "number",
        value: "1200",
      },
      {
        label: "Lab Processing Fee",
        key: "labFee",
        type: "number",
        value: "250",
      },
      {
        label: "Currency",
        key: "currency",
        type: "text",
        value: "LKR – Sri Lankan Rupee",
      },
      { label: "Tax Rate (%)", key: "taxRate", type: "number", value: "0" },
    ],
  },
];

const INITIAL_TOGGLES = [
  {
    label: "Email Notifications",
    desc: "Send appointment reminders by email",
    on: true,
  },
  {
    label: "SMS Notifications",
    desc: "Send SMS for lab results & appointments",
    on: true,
  },
  {
    label: "Auto-Invoice Generation",
    desc: "Generate invoice after each consultation",
    on: true,
  },
  {
    label: "Lab Result Auto-Notify",
    desc: "Notify doctor when results uploaded",
    on: true,
  },
  {
    label: "Pharmacy Stock Alerts",
    desc: "Alert when stock falls below reorder",
    on: true,
  },
  {
    label: "Maintenance Mode",
    desc: "Restrict portal access for maintenance",
    on: false,
  },
];

export default function AdminSettings() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [toggles, setToggles] = useState(INITIAL_TOGGLES);
  const [activeSection, setActiveSection] = useState("clinic");
  const [saved, setSaved] = useState(false);

  const updateField = (sectionId, key, value) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.key === key ? { ...f, value } : f,
              ),
            }
          : s,
      ),
    );
  };

  const toggleSwitch = (idx) => {
    setToggles((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, on: !t.on } : t)),
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const current = sections.find((s) => s.id === activeSection);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
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
            <Text style={hdr.title}>System Settings</Text>
            <Text style={hdr.sub}>Configure clinic preferences</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tab.row}
          >
            {sections.map((s) => {
              const active = activeSection === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setActiveSection(s.id)}
                  style={[tab.pill, active && tab.pillActive]}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={s.icon}
                    size={14}
                    color={active ? "#fff" : "#64748B"}
                  />
                  <Text style={[tab.pillTxt, active && tab.pillTxtActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active section fields */}
          {current && (
            <View style={{ paddingHorizontal: 16 }}>
              <View style={card.wrap}>
                <View style={card.headerRow}>
                  <View style={card.iconBox}>
                    <Ionicons name={current.icon} size={18} color={ACCENT} />
                  </View>
                  <Text style={card.title}>{current.label}</Text>
                </View>

                {current.fields.map((f) => (
                  <View key={f.key} style={field.wrap}>
                    <Text style={field.label}>{f.label}</Text>
                    <TextInput
                      value={f.value}
                      onChangeText={(v) => updateField(current.id, f.key, v)}
                      style={field.input}
                      placeholderTextColor="#94A3B8"
                      keyboardType={
                        f.type === "number"
                          ? "numeric"
                          : f.type === "phone"
                            ? "phone-pad"
                            : f.type === "email"
                              ? "email-address"
                              : "default"
                      }
                      autoCapitalize={f.type === "email" ? "none" : "sentences"}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Toggles section */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <View style={card.wrap}>
              <View style={card.headerRow}>
                <View style={card.iconBox}>
                  <Ionicons name="notifications" size={18} color={ACCENT} />
                </View>
                <Text style={card.title}>Notifications & System</Text>
              </View>

              {toggles.map((t, i) => (
                <View key={t.label} style={tog.row}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={tog.label}>{t.label}</Text>
                    <Text style={tog.desc}>{t.desc}</Text>
                  </View>
                  <Switch
                    value={t.on}
                    onValueChange={() => toggleSwitch(i)}
                    trackColor={{ false: "#E2E8F0", true: "#A5B4FC" }}
                    thumbColor={t.on ? ACCENT : "#fff"}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Save button */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity
              onPress={handleSave}
              style={save.btn}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#1A237E", "#283593"]} style={save.grad}>
                <Ionicons
                  name={saved ? "checkmark-circle" : "save"}
                  size={16}
                  color="#fff"
                />
                <Text style={save.txt}>
                  {saved ? "Saved!" : "Save Settings"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {saved && (
            <View style={save.toast}>
              <Ionicons name="checkmark-circle" size={14} color="#15803D" />
              <Text style={save.toastTxt}>Settings updated successfully</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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

const tab = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E8EAF6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
});

const field = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
});

const tog = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  label: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  desc: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
});

const save = StyleSheet.create({
  btn: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#1A237E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  grad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  txt: { color: "#fff", fontSize: 14, fontWeight: "700" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 10,
  },
  toastTxt: { fontSize: 12, color: "#15803D", fontWeight: "600" },
});
