import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../services/api";

const ACCENT = "#1A237E";

const ROLE_CONFIG = {
  doctor: { label: "Doctor", bg: "#DBEAFE", text: "#1D4ED8", icon: "medkit" },
  lab: { label: "Lab", bg: "#CCFBF1", text: "#0F766E", icon: "flask" },
  pharmacy: {
    label: "Pharmacy",
    bg: "#DCFCE7",
    text: "#15803D",
    icon: "medical",
  },
  cashier: { label: "Cashier", bg: "#E0E7FF", text: "#4338CA", icon: "cash" },
  admin: {
    label: "Admin",
    bg: "#FEE2E2",
    text: "#B91C1C",
    icon: "shield-checkmark",
  },
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// Add Staff Modal
// ─────────────────────────────────────────────────────────────
function AddStaffModal({ visible, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState("doctor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [telephone, setTelephone] = useState("");
  const [slmc, setSlmc] = useState("");
  const [experience, setExperience] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setRole("doctor");
    setName("");
    setEmail("");
    setPassword("");
    setTelephone("");
    setSlmc("");
    setExperience("");
    setError("");
    setShowPass(false);
  };

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  // Password strength
  const passRules = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Lowercase letter", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passStrength = passRules.filter((r) => r.ok).length;
  const strengthColor =
    passStrength <= 1 ? "#F87171" : passStrength <= 3 ? "#818CF8" : "#22C55E";
  const strengthLabel =
    passStrength <= 1
      ? "Weak"
      : passStrength <= 3
        ? "Fair"
        : passStrength === 4
          ? "Good"
          : "Strong";

  const handleSubmit = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password || !telephone.trim()) {
      return setError("Name, email, password and telephone are required.");
    }
    if (passStrength < 3) {
      return setError("Password is too weak — meet at least 3 of the 5 rules.");
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        telephone: telephone.trim(),
        role,
      };
      if (role === "doctor") {
        payload.slmcRegisterNumber = slmc.trim();
        payload.workingExperience = experience.trim();
      }
      const res = await api.post("/users/staff", payload);
      onSaved(res.data.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create staff member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={modalSt.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={[modalSt.sheet, { paddingBottom: insets.bottom }]}>
            {/* Header */}
            <LinearGradient
              colors={["#0D2137", "#1A237E"]}
              style={modalSt.header}
            >
              <View style={{ flex: 1 }}>
                <Text style={modalSt.headerSub}>Staff Management</Text>
                <Text style={modalSt.headerTitle}>Add New Staff Member</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={modalSt.closeBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView
              contentContainerStyle={{ padding: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {error ? (
                <View style={modalSt.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#B91C1C" />
                  <Text style={modalSt.errorTxt}>{error}</Text>
                </View>
              ) : null}

              {/* Role selector */}
              <Text style={modalSt.label}>ROLE *</Text>
              <View style={modalSt.roleGrid}>
                {Object.entries(ROLE_CONFIG)
                  .filter(([r]) => r !== "admin")
                  .map(([r, cfg]) => {
                    const active = role === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setRole(r)}
                        style={[
                          modalSt.roleBtn,
                          active && {
                            backgroundColor: cfg.bg,
                            borderColor: cfg.text,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={cfg.icon}
                          size={18}
                          color={active ? cfg.text : "#94A3B8"}
                        />
                        <Text
                          style={[
                            modalSt.roleBtnTxt,
                            active && { color: cfg.text, fontWeight: "700" },
                          ]}
                        >
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>

              <Text style={modalSt.label}>FULL NAME *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={modalSt.input}
                placeholder={
                  role === "doctor" ? "Dr. M.T.D. Jayaweera" : "John Doe"
                }
                placeholderTextColor="#94A3B8"
              />

              <Text style={modalSt.label}>EMAIL *</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={modalSt.input}
                placeholder="email@example.com"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={modalSt.label}>TELEPHONE *</Text>
              <TextInput
                value={telephone}
                onChangeText={setTelephone}
                style={modalSt.input}
                placeholder="0712345678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={modalSt.label}>PASSWORD *</Text>
              <View style={modalSt.passWrap}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  style={[modalSt.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity
                  onPress={() => setShowPass((p) => !p)}
                  style={modalSt.eyeBtn}
                >
                  <Ionicons
                    name={showPass ? "eye-off" : "eye"}
                    size={18}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* Strength bar */}
              {password.length > 0 && (
                <View style={modalSt.strengthWrap}>
                  <View style={modalSt.strengthTrack}>
                    <View
                      style={[
                        modalSt.strengthFill,
                        {
                          width: `${(passStrength / 5) * 100}%`,
                          backgroundColor: strengthColor,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[modalSt.strengthLabel, { color: strengthColor }]}
                  >
                    {strengthLabel}
                  </Text>
                </View>
              )}

              {/* Pass rules */}
              <View style={modalSt.rulesRow}>
                {passRules.map((r) => (
                  <View key={r.label} style={modalSt.rulePill}>
                    <Ionicons
                      name={r.ok ? "checkmark-circle" : "ellipse-outline"}
                      size={11}
                      color={r.ok ? "#22C55E" : "#CBD5E1"}
                    />
                    <Text
                      style={[modalSt.ruleTxt, r.ok && { color: "#15803D" }]}
                    >
                      {r.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Doctor-specific fields */}
              {role === "doctor" && (
                <>
                  <Text style={modalSt.label}>SLMC REGISTRATION NO.</Text>
                  <TextInput
                    value={slmc}
                    onChangeText={setSlmc}
                    style={modalSt.input}
                    placeholder="SLMC/12345"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={modalSt.label}>WORKING EXPERIENCE (YEARS)</Text>
                  <TextInput
                    value={experience}
                    onChangeText={setExperience}
                    style={modalSt.input}
                    placeholder="10"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </>
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={saving}
                style={[modalSt.submit, saving && { opacity: 0.6 }]}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#1A237E", "#283593"]}
                  style={modalSt.submitGrad}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={16} color="#fff" />
                      <Text style={modalSt.submitTxt}>
                        Create Staff Account
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// View / Edit Staff Modal
// ─────────────────────────────────────────────────────────────
function ViewStaffModal({ staff, visible, onClose, onUpdated }) {
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [slmc, setSlmc] = useState("");
  const [experience, setExperience] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (staff) {
      setName(staff.name || "");
      setEmail(staff.email || "");
      setTelephone(staff.telephone || "");
      setSlmc(staff.doctorDetails?.slmcRegisterNumber || "");
      setExperience(String(staff.doctorDetails?.workingExperience || ""));
      setEditing(false);
      setError("");
    }
  }, [staff]);

  if (!staff) return null;

  const cfg = ROLE_CONFIG[staff.role] || ROLE_CONFIG.admin;

  const handleSave = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !telephone.trim()) {
      return setError("Name, email and telephone are required.");
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
      };
      if (staff.role === "doctor") {
        payload.slmcRegisterNumber = slmc.trim();
        payload.workingExperience = experience.trim();
      }
      const res = await api.put(`/users/${staff._id}`, payload);
      onUpdated(res.data.user);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={modalSt.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={[modalSt.sheet, { paddingBottom: insets.bottom }]}>
            <LinearGradient
              colors={["#0D2137", "#1A237E"]}
              style={modalSt.header}
            >
              <View style={{ flex: 1 }}>
                <Text style={modalSt.headerSub}>{cfg.label}</Text>
                <Text style={modalSt.headerTitle} numberOfLines={1}>
                  {staff.name}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={modalSt.closeBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView
              contentContainerStyle={{ padding: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Avatar / status banner */}
              <View style={view.banner}>
                <View style={[view.avatar, { backgroundColor: cfg.bg }]}>
                  <Text style={[view.avatarTxt, { color: cfg.text }]}>
                    {getInitials(staff.name)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={view.bannerName}>{staff.name}</Text>
                  <View style={[view.rolePill, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={11} color={cfg.text} />
                    <Text style={[view.roleTxt, { color: cfg.text }]}>
                      {cfg.label}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    view.statusBadge,
                    staff.isActive ? view.activeStatus : view.inactiveStatus,
                  ]}
                >
                  <Text
                    style={[
                      view.statusTxt,
                      { color: staff.isActive ? "#15803D" : "#9CA3AF" },
                    ]}
                  >
                    ● {staff.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>

              {error ? (
                <View style={modalSt.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#B91C1C" />
                  <Text style={modalSt.errorTxt}>{error}</Text>
                </View>
              ) : null}

              <Text style={modalSt.label}>USER ID</Text>
              <Text style={view.readOnlyVal}>{staff.userId || "—"}</Text>

              <Text style={modalSt.label}>FULL NAME</Text>
              {editing ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={modalSt.input}
                />
              ) : (
                <Text style={view.readOnlyVal}>{staff.name}</Text>
              )}

              <Text style={modalSt.label}>EMAIL</Text>
              {editing ? (
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={modalSt.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              ) : (
                <Text style={view.readOnlyVal}>{staff.email}</Text>
              )}

              <Text style={modalSt.label}>TELEPHONE</Text>
              {editing ? (
                <TextInput
                  value={telephone}
                  onChangeText={setTelephone}
                  style={modalSt.input}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={view.readOnlyVal}>{staff.telephone || "—"}</Text>
              )}

              {staff.role === "doctor" && (
                <>
                  <Text style={modalSt.label}>SLMC REGISTRATION</Text>
                  {editing ? (
                    <TextInput
                      value={slmc}
                      onChangeText={setSlmc}
                      style={modalSt.input}
                    />
                  ) : (
                    <Text style={view.readOnlyVal}>
                      {staff.doctorDetails?.slmcRegisterNumber || "—"}
                    </Text>
                  )}

                  <Text style={modalSt.label}>WORKING EXPERIENCE</Text>
                  {editing ? (
                    <TextInput
                      value={experience}
                      onChangeText={setExperience}
                      style={modalSt.input}
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text style={view.readOnlyVal}>
                      {staff.doctorDetails?.workingExperience
                        ? `${staff.doctorDetails.workingExperience} years`
                        : "—"}
                    </Text>
                  )}
                </>
              )}

              <Text style={modalSt.label}>JOINED</Text>
              <Text style={view.readOnlyVal}>
                {formatDate(staff.createdAt)}
              </Text>

              {/* Action buttons */}
              <View style={view.actions}>
                {editing ? (
                  <>
                    <TouchableOpacity
                      onPress={() => setEditing(false)}
                      style={view.btnCancel}
                      activeOpacity={0.85}
                    >
                      <Text style={view.btnCancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSave}
                      disabled={saving}
                      style={[view.btnSave, saving && { opacity: 0.6 }]}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={["#1A237E", "#283593"]}
                        style={view.btnSaveGrad}
                      >
                        {saving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={view.btnSaveTxt}>Save Changes</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={() => setEditing(true)}
                    style={view.btnEdit}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create-outline" size={16} color={ACCENT} />
                    <Text style={view.btnEditTxt}>Edit Account</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function AdminStaff() {
  const insets = useSafeAreaInsets();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [viewStaff, setView] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(
    async (rf = roleFilter) => {
      try {
        const path = rf === "all" ? "/users" : `/users?role=${rf}`;
        const res = await api.get(path);
        setStaff((res.data.users || []).filter((u) => u.role !== "patient"));
      } catch {
        showToast("Failed to load staff", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [roleFilter],
  );

  useEffect(() => {
    load(roleFilter);
  }, [roleFilter, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(roleFilter);
  };

  const handleSaved = (newUser) => {
    setStaff((prev) => [newUser, ...prev]);
    showToast(`${newUser.name} added successfully`);
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await api.put(`/users/${id}`, { isActive });
      setStaff((prev) =>
        prev.map((s) => (s._id === id ? { ...s, isActive } : s)),
      );
      showToast(isActive ? "Account activated" : "Account deactivated");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update", "error");
    }
  };

  const handleStaffUpdated = (updated) => {
    setStaff((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    setView(updated);
    showToast("Staff account updated");
  };

  const filtered = staff.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.userId?.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    total: staff.length,
    active: staff.filter((s) => s.isActive).length,
    inactive: staff.filter((s) => !s.isActive).length,
    doctors: staff.filter((s) => s.role === "doctor").length,
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <LinearGradient
        colors={["#0D2137", "#1A237E"]}
        style={[hdr.wrap, { paddingTop: insets.top + 12 }]}
      >
        <Text style={hdr.title}>Staff Management</Text>
        <Text style={hdr.sub}>
          Manage user accounts · {stats.total} members
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
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
              label: "Total",
              value: stats.total,
              color: "#1A237E",
              bg: "#E8EAF6",
            },
            {
              label: "Active",
              value: stats.active,
              color: "#15803D",
              bg: "#DCFCE7",
            },
            {
              label: "Inactive",
              value: stats.inactive,
              color: "#9CA3AF",
              bg: "#F3F4F6",
            },
            {
              label: "Doctors",
              value: stats.doctors,
              color: "#1565C0",
              bg: "#DBEAFE",
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
            placeholder="Search by name, email or ID…"
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

        {/* Role filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={filterSt.row}
        >
          {[
            { id: "all", label: "All" },
            { id: "doctor", label: "Doctors" },
            { id: "lab", label: "Lab" },
            { id: "pharmacy", label: "Pharmacy" },
            { id: "cashier", label: "Cashier" },
            { id: "admin", label: "Admin" },
          ].map((f) => {
            const active = roleFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setRoleFilter(f.id)}
                style={[filterSt.pill, active && filterSt.pillActive]}
                activeOpacity={0.85}
              >
                <Text
                  style={[filterSt.pillTxt, active && filterSt.pillTxtActive]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading / Empty / List */}
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={empty.wrap}>
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={empty.title}>No staff found</Text>
            <Text style={empty.sub}>Try adjusting your filters</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {filtered.map((st) => {
              const cfg = ROLE_CONFIG[st.role] || ROLE_CONFIG.admin;
              return (
                <TouchableOpacity
                  key={st._id}
                  style={card.wrap}
                  onPress={() => setView(st)}
                  activeOpacity={0.85}
                >
                  <View style={[card.avatar, { backgroundColor: cfg.bg }]}>
                    <Text style={[card.avatarTxt, { color: cfg.text }]}>
                      {getInitials(st.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={card.name} numberOfLines={1}>
                      {st.name}
                    </Text>
                    <Text style={card.email} numberOfLines={1}>
                      {st.email}
                    </Text>
                    <View style={card.metaRow}>
                      <View
                        style={[card.rolePill, { backgroundColor: cfg.bg }]}
                      >
                        <Ionicons name={cfg.icon} size={9} color={cfg.text} />
                        <Text style={[card.roleTxt, { color: cfg.text }]}>
                          {cfg.label}
                        </Text>
                      </View>
                      {st.userId && (
                        <Text style={card.userId}>{st.userId}</Text>
                      )}
                    </View>
                  </View>
                  <View style={card.actionCol}>
                    <Switch
                      value={!!st.isActive}
                      onValueChange={(v) => handleToggleActive(st._id, v)}
                      trackColor={{ false: "#E2E8F0", true: "#A5B4FC" }}
                      thumbColor={st.isActive ? "#1A237E" : "#fff"}
                    />
                    <Text
                      style={[
                        card.statusTxt,
                        { color: st.isActive ? "#15803D" : "#94A3B8" },
                      ]}
                    >
                      {st.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating add button */}
      <TouchableOpacity
        style={[fab.btn, { bottom: insets.bottom + 80 }]}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.85}
      >
        <LinearGradient colors={["#1A237E", "#283593"]} style={fab.grad}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Toast */}
      {toast && (
        <View
          style={[
            toastSt.wrap,
            {
              top: insets.top + 70,
              backgroundColor: toast.type === "error" ? "#FEE2E2" : "#DCFCE7",
              borderColor: toast.type === "error" ? "#FECACA" : "#BBF7D0",
            },
          ]}
        >
          <Ionicons
            name={toast.type === "error" ? "alert-circle" : "checkmark-circle"}
            size={16}
            color={toast.type === "error" ? "#B91C1C" : "#15803D"}
          />
          <Text
            style={[
              toastSt.txt,
              { color: toast.type === "error" ? "#B91C1C" : "#15803D" },
            ]}
          >
            {toast.msg}
          </Text>
        </View>
      )}

      <AddStaffModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={handleSaved}
      />

      <ViewStaffModal
        staff={viewStaff}
        visible={!!viewStaff}
        onClose={() => setView(null)}
        onUpdated={handleStaffUpdated}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
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
  pillActive: { backgroundColor: "#1A237E", borderColor: "#1A237E" },
  pillTxt: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  pillTxtActive: { color: "#fff" },
});

const card = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 14, fontWeight: "800" },
  name: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  email: { fontSize: 11, color: "#64748B", marginTop: 2 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleTxt: { fontSize: 9, fontWeight: "700" },
  userId: { fontSize: 9, color: "#94A3B8", fontFamily: "monospace" },
  actionCol: { alignItems: "center", gap: 4 },
  statusTxt: { fontSize: 9, fontWeight: "700" },
});

const empty = StyleSheet.create({
  wrap: { paddingVertical: 60, alignItems: "center" },
  title: { fontSize: 15, fontWeight: "700", color: "#475569", marginTop: 12 },
  sub: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
});

const fab = StyleSheet.create({
  btn: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: "#1A237E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  grad: {
    flex: 1,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});

const toastSt = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  txt: { fontSize: 13, fontWeight: "600", flex: 1 },
});

const modalSt = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorTxt: { color: "#B91C1C", fontSize: 12, flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 4,
  },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  roleBtnTxt: { fontSize: 12, color: "#64748B" },
  passWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  eyeBtn: { padding: 8 },
  strengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: { height: "100%", borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: "700" },
  rulesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  rulePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ruleTxt: { fontSize: 10, color: "#94A3B8" },
  submit: { marginTop: 18, borderRadius: 12, overflow: "hidden" },
  submitGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  submitTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

const view = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 16, fontWeight: "800" },
  bannerName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  roleTxt: { fontSize: 10, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  activeStatus: { backgroundColor: "#DCFCE7" },
  inactiveStatus: { backgroundColor: "#F3F4F6" },
  statusTxt: { fontSize: 10, fontWeight: "700" },
  readOnlyVal: {
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 24 },
  btnEdit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#E8EAF6",
  },
  btnEditTxt: { color: ACCENT, fontWeight: "700", fontSize: 13 },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  btnCancelTxt: { color: "#64748B", fontWeight: "700", fontSize: 13 },
  btnSave: { flex: 1, borderRadius: 12, overflow: "hidden" },
  btnSaveGrad: { paddingVertical: 12, alignItems: "center" },
  btnSaveTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
