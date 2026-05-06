import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../services/api";

const ACCENT = "#1A237E";

// ── Constants ────────────────────────────────────────────────
const LAB_LOCATIONS = ["Lab A", "Lab B", "Lab C", "Lab D"];

const MACHINE_SUBCATEGORIES = [
  "Diagnostic & Testing Machines",
  "Sample Processing Equipment",
  "Storage Equipment",
  "Safety & Laboratory Infrastructure",
  "Digital & Power Equipment",
];
const CONSUMABLE_SUBCATEGORIES = [
  "Sample Collection Materials",
  "Blood Collection Tubes",
  "Testing Consumables",
  "Reagents & Testing Kits",
  "Patient Safety & Infection Control Items",
  "Waste Management Materials",
  "General Laboratory Use Items",
];
const MACHINE_NAMES = {
  "Diagnostic & Testing Machines": [
    "Hematology Analyzer", "ESR Analyzer", "Fully Automated Biochemistry Analyzer",
    "Semi-Auto Biochemistry Analyzer", "Electrolyte Analyzer",
    "Immunoassay Analyzer (CLIA / ELISA)", "ELISA Reader", "ELISA Washer",
  ],
  "Sample Processing Equipment": [
    "Laboratory Centrifuge", "Blood Tube Mixer / Roller Mixer", "Vortex Mixer",
    "Laboratory Incubator", "Water Bath", "Automated Pipetting System",
  ],
  "Storage Equipment": [
    "Laboratory Refrigerator (2–8°C)", "Reagent Refrigerator",
    "Deep Freezer (-20°C)", "Deep Freezer (-80°C)", "Sample Storage Freezer",
  ],
  "Safety & Laboratory Infrastructure": [
    "Biosafety Cabinet", "Laminar Air Flow Cabinet",
    "Laboratory Exhaust / Ventilation System", "Air Conditioning System", "Hand Washing Sink Unit",
  ],
  "Digital & Power Equipment": [
    "Laboratory Computer Systems", "Laboratory Information System (LIS) Server",
    "Barcode Scanner", "Label Printer", "Report Printer",
    "UPS (Uninterruptible Power Supply)", "Power Backup Generator", "Voltage Stabilizer",
  ],
};
const CONSUMABLE_NAMES = {
  "Sample Collection Materials": ["Disposable Syringes", "Vacutainer Needles", "Blood Collection Sets", "Tourniquets", "Lancets"],
  "Blood Collection Tubes": ["EDTA Tubes (Purple cap)", "Sodium Citrate Tubes (Black cap)", "Fluoride Oxalate Tubes (Grey cap)", "Plain Tubes (Red cap)", "Serum Separator Tubes – SST (Yellow cap)", "ESR Tubes", "Micro Collection Tubes"],
  "Testing Consumables": ["Micropipette Tips", "Sample Cups", "Reaction Cuvettes", "Test Tubes", "Glass Slides", "Cover Slips", "ELISA Plates", "Test Cartridges", "Rapid Test Cassettes / Strips", "Dropper Pipettes"],
  "Reagents & Testing Kits": ["Biochemistry Reagent Kits", "Liver Profile Reagents", "Renal Profile Reagents", "Thyroid Profile Reagents", "Vitamin D Test Kits", "Dengue NS1 Antigen Test Kits", "Electrolyte Reagents", "Calibration Solutions", "Quality Control Materials", "Buffer Solutions"],
  "Patient Safety & Infection Control Items": ["Cotton Packs", "Alcohol Swabs", "Gauze Pieces", "Adhesive Plasters", "Disposable Gloves", "Face Masks", "Surgical Masks", "Protective Gowns", "Shoe Covers", "Disposable Caps"],
  "Waste Management Materials": ["Biohazard Waste Bags", "Sharps Disposal Containers", "Specimen Disposal Bags", "Chemical Waste Containers"],
  "General Laboratory Use Items": ["Tissue Paper / Wipes", "Distilled Water", "Cleaning Disinfectants", "Surface Sanitizers", "Hand Sanitizer"],
};
const MACHINE_STATUSES = ["operational", "service_due", "under_repair", "decommissioned"];
const CONSUMABLE_UNITS = ["boxes", "packs", "pairs", "tubes", "bottles", "bags", "rolls", "units", "pieces", "sets"];
const TESTS = ["FBC", "ESR", "FBS", "Liver Profile", "Renal Profile", "Thyroid Profile", "Serum Vit D Level", "Dengue Ag", "General", "All Tests"];

// ── Helpers ──────────────────────────────────────────────────
const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

const daysUntil = (d) =>
  d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

// ── Picker Sheet (bottom sheet replacement for <select>) ──────
function PickerSheet({ title, options, value, onSelect, onClose, visible }) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: 600, duration: 200, useNativeDriver: true,
    }).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={close}>
      <TouchableOpacity style={ps.overlay} onPress={close} activeOpacity={1}>
        <Animated.View
          style={[ps.sheet, { paddingBottom: insets.bottom + 8, transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={ps.handle} />
          <Text style={ps.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            {options.map((opt) => {
              const isSelected = opt === value;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[ps.option, isSelected && ps.optionSelected]}
                  onPress={() => { onSelect(opt); close(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[ps.optionText, isSelected && ps.optionTextSelected]}>
                    {opt}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={ACCENT} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const ps = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 13, fontWeight: "700", color: "#64748B", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  option: { paddingVertical: 13, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  optionSelected: { backgroundColor: "#E8EAF6", borderRadius: 10, paddingHorizontal: 10, marginHorizontal: -4 },
  optionText: { fontSize: 14, color: "#334155" },
  optionTextSelected: { color: ACCENT, fontWeight: "700" },
});

// ── FormField helper ─────────────────────────────────────────
function FieldLabel({ children, required }) {
  return (
    <Text style={ff.label}>
      {children}{required && <Text style={{ color: "#EF4444" }}> *</Text>}
    </Text>
  );
}

function PickerField({ label, value, onPress, required, error, placeholder = "— Select —" }) {
  return (
    <View style={ff.wrap}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <TouchableOpacity
        style={[ff.picker, error && ff.pickerError]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[ff.pickerText, !value && ff.pickerPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#94A3B8" />
      </TouchableOpacity>
      {error ? <Text style={ff.error}>{error}</Text> : null}
    </View>
  );
}

function InputField({ label, value, onChangeText, required, error, placeholder, keyboardType = "default", multiline }) {
  return (
    <View style={ff.wrap}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <TextInput
        style={[ff.input, error && ff.inputError, multiline && { height: 72, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        keyboardType={keyboardType}
        multiline={multiline}
      />
      {error ? <Text style={ff.error}>{error}</Text> : null}
    </View>
  );
}

const ff = StyleSheet.create({
  wrap: { marginBottom: 2 },
  label: { fontSize: 11, fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#1E293B", backgroundColor: "#FAFAFA" },
  inputError: { borderColor: "#FCA5A5", backgroundColor: "#FFF1F1" },
  picker: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: "#FAFAFA", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerError: { borderColor: "#FCA5A5", backgroundColor: "#FFF1F1" },
  pickerText: { fontSize: 14, color: "#1E293B", flex: 1, marginRight: 8 },
  pickerPlaceholder: { color: "#CBD5E1" },
  error: { fontSize: 11, color: "#EF4444", marginTop: 4, marginLeft: 2 },
});

// ── Add Machine Modal ────────────────────────────────────────
function AddMachineModal({ existingMachines, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const blank = () => ({
    subCategory: "Diagnostic & Testing Machines",
    name: "", serialNumber: "", testFor: "", location: "",
    machineStatus: "operational",
    installedDate: "", expiryDate: "", nextServiceDate: "",
  });

  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [picker, setPicker] = useState(null); // { field, options, title }

  const up = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const needsSerial =
    form.name &&
    form.location &&
    existingMachines.some(
      (m) => m.name === form.name && m.location === form.location
    );

  const validate = () => {
    const e = {};
    if (!form.name) e.name = "Select a machine name";
    if (!form.location) e.location = "Select a location";
    if (needsSerial && !form.serialNumber?.trim())
      e.serialNumber = "Serial number required — duplicate in this location";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await api.post("/equipment", { ...form, category: "machine" });
      onSave();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message);
      setSaving(false);
    }
  };

  const openPicker = (field, options, title) => setPicker({ field, options, title });

  const machineOptions = MACHINE_NAMES[form.subCategory] || [];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={[m.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={m.header}>
              <View>
                <Text style={m.title}>Add Machine</Text>
                <Text style={m.subtitle}>Lab equipment inventory</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={m.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 14 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PickerField
                    label="Sub-Category"
                    value={form.subCategory}
                    onPress={() => openPicker("subCategory", MACHINE_SUBCATEGORIES, "Sub-Category")}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PickerField
                    label="Machine Name"
                    value={form.name}
                    onPress={() => openPicker("name", machineOptions, "Machine Name")}
                    required
                    error={errors.name}
                    placeholder="— Select machine —"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PickerField
                    label="Location"
                    value={form.location}
                    onPress={() => openPicker("location", LAB_LOCATIONS, "Location")}
                    required
                    error={errors.location}
                    placeholder="— Select room —"
                  />
                </View>
              </View>

              {needsSerial ? (
                <InputField
                  label="Serial Number"
                  value={form.serialNumber}
                  onChangeText={(v) => up("serialNumber", v)}
                  required
                  error={errors.serialNumber}
                  placeholder="e.g. SN-002"
                />
              ) : (
                form.name && form.location && (
                  <View style={m.infoBox}>
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    <Text style={m.infoText}>First unit in this location — no serial number needed</Text>
                  </View>
                )
              )}

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PickerField
                    label="Test For"
                    value={form.testFor}
                    onPress={() => openPicker("testFor", TESTS, "Used For Test")}
                    placeholder="— Select test —"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PickerField
                    label="Status"
                    value={form.machineStatus}
                    onPress={() => openPicker("machineStatus", MACHINE_STATUSES, "Status")}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                {[
                  { label: "Installed Date", k: "installedDate" },
                  { label: "Expiry Date", k: "expiryDate" },
                  { label: "Next Service", k: "nextServiceDate" },
                ].map(({ label, k }) => (
                  <View style={{ flex: 1 }} key={k}>
                    <InputField
                      label={label}
                      value={form[k]}
                      onChangeText={(v) => up(k, v)}
                      placeholder="YYYY-MM-DD"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={m.footer}>
              <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <LinearGradient colors={["#0D47A1", "#1565C0"]} style={m.saveBtnGrad}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={m.saveText}>Add Machine</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {picker && (
        <PickerSheet
          visible
          title={picker.title}
          options={picker.options}
          value={form[picker.field]}
          onSelect={(v) => up(picker.field, v)}
          onClose={() => setPicker(null)}
        />
      )}
    </Modal>
  );
}

// ── Add Consumable Modal ─────────────────────────────────────
function AddConsumableModal({ existingConsumableNames, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    subCategory: "Sample Collection Materials",
    name: "", quantity: "", unit: "boxes",
    lowStockThreshold: "10", consumableExpiry: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [picker, setPicker] = useState(null);

  const up = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const consumableOptions = CONSUMABLE_NAMES[form.subCategory] || [];
  const alreadyAdded = existingConsumableNames.includes(form.name);
  const qty = parseInt(form.quantity) || 0;
  const threshold = parseInt(form.lowStockThreshold) || 10;
  const qtyError = qty > 0 && qty <= threshold;

  const handleSave = async () => {
    if (!form.name) return setError("Please select an item name.");
    if (alreadyAdded) return setError(`"${form.name}" is already in the consumables list.`);
    if (qtyError) return setError(`Initial quantity (${qty}) must be greater than the alert threshold (${threshold}).`);
    setSaving(true); setError(null);
    try {
      await api.post("/equipment", { ...form, quantity: qty, lowStockThreshold: threshold, category: "consumable" });
      onSave();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={[m.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={m.header}>
              <View>
                <Text style={m.title}>Add Consumable</Text>
                <Text style={m.subtitle}>Each type tracked as one item</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={m.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 14 }}>
              <PickerField
                label="Sub-Category"
                value={form.subCategory}
                onPress={() => setPicker({ field: "subCategory", options: CONSUMABLE_SUBCATEGORIES, title: "Sub-Category" })}
              />
              <PickerField
                label="Item Name"
                value={form.name}
                onPress={() => setPicker({ field: "name", options: consumableOptions, title: "Item Name" })}
                required
                error={alreadyAdded ? `"${form.name}" is already added` : undefined}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Initial Qty"
                    value={form.quantity}
                    onChangeText={(v) => up("quantity", v)}
                    placeholder="0"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PickerField
                    label="Unit"
                    value={form.unit}
                    onPress={() => setPicker({ field: "unit", options: CONSUMABLE_UNITS, title: "Unit" })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Alert ≤"
                    value={form.lowStockThreshold}
                    onChangeText={(v) => up("lowStockThreshold", v)}
                    placeholder="10"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {qtyError && (
                <View style={m.warnBox}>
                  <Ionicons name="warning" size={14} color="#B45309" />
                  <Text style={m.warnText}>
                    Initial quantity must exceed the alert threshold.
                  </Text>
                </View>
              )}

              <InputField
                label="Expiry Date"
                value={form.consumableExpiry}
                onChangeText={(v) => up("consumableExpiry", v)}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
              />

              {error && (
                <View style={m.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#B91C1C" />
                  <Text style={m.errorText}>{error}</Text>
                </View>
              )}
            </ScrollView>

            <View style={m.footer}>
              <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.saveBtn, (saving || alreadyAdded) && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving || alreadyAdded}
              >
                <LinearGradient colors={["#0D47A1", "#1565C0"]} style={m.saveBtnGrad}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={m.saveText}>Add Consumable</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {picker && (
        <PickerSheet
          visible
          title={picker.title}
          options={picker.options}
          value={form[picker.field]}
          onSelect={(v) => up(picker.field, v)}
          onClose={() => setPicker(null)}
        />
      )}
    </Modal>
  );
}

// ── Edit Machine Modal ────────────────────────────────────────
function EditMachineModal({ item, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    subCategory: item.subCategory || MACHINE_SUBCATEGORIES[0],
    name: item.name || "", serialNumber: item.serialNumber || "",
    testFor: item.testFor || "", location: item.location || "",
    machineStatus: item.machineStatus || "operational",
    installedDate: item.installedDate ? item.installedDate.slice(0, 10) : "",
    expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "",
    nextServiceDate: item.nextServiceDate ? item.nextServiceDate.slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [picker, setPicker] = useState(null);

  const up = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await api.put(`/equipment/${item._id}`, { ...form, category: "machine" });
      onSave();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={[m.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={m.header}>
              <Text style={m.title}>Edit Machine</Text>
              <TouchableOpacity onPress={onClose} style={m.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 14 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PickerField label="Sub-Category" value={form.subCategory}
                    onPress={() => setPicker({ field: "subCategory", options: MACHINE_SUBCATEGORIES, title: "Sub-Category" })} />
                </View>
                <View style={{ flex: 1 }}>
                  <PickerField label="Machine Name" value={form.name}
                    onPress={() => setPicker({ field: "name", options: MACHINE_NAMES[form.subCategory] || [], title: "Machine Name" })} />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PickerField label="Location" value={form.location}
                    onPress={() => setPicker({ field: "location", options: LAB_LOCATIONS, title: "Location" })} />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField label="Serial Number" value={form.serialNumber}
                    onChangeText={(v) => up("serialNumber", v)} placeholder="e.g. SN-001" />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PickerField label="Test For" value={form.testFor}
                    onPress={() => setPicker({ field: "testFor", options: TESTS, title: "Test For" })} />
                </View>
                <View style={{ flex: 1 }}>
                  <PickerField label="Status" value={form.machineStatus}
                    onPress={() => setPicker({ field: "machineStatus", options: MACHINE_STATUSES, title: "Status" })} />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[["Installed", "installedDate"], ["Expiry", "expiryDate"], ["Next Service", "nextServiceDate"]].map(([l, k]) => (
                  <View style={{ flex: 1 }} key={k}>
                    <InputField label={l} value={form[k]} onChangeText={(v) => up(k, v)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
                  </View>
                ))}
              </View>
              {error && (
                <View style={m.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#B91C1C" />
                  <Text style={m.errorText}>{error}</Text>
                </View>
              )}
            </ScrollView>
            <View style={m.footer}>
              <TouchableOpacity style={m.cancelBtn} onPress={onClose}><Text style={m.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[m.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <LinearGradient colors={["#0D47A1", "#1565C0"]} style={m.saveBtnGrad}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.saveText}>Save Changes</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
      {picker && (
        <PickerSheet visible title={picker.title} options={picker.options} value={form[picker.field]}
          onSelect={(v) => up(picker.field, v)} onClose={() => setPicker(null)} />
      )}
    </Modal>
  );
}

// ── Edit Consumable Modal ────────────────────────────────────
function EditConsumableModal({ item, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    subCategory: item.subCategory || CONSUMABLE_SUBCATEGORIES[0],
    name: item.name || "", quantity: String(item.quantity ?? 0),
    unit: item.unit || "boxes", lowStockThreshold: String(item.lowStockThreshold ?? 10),
    consumableExpiry: item.consumableExpiry ? item.consumableExpiry.slice(0, 10) : "",
  });
  const [restock, setRestock] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [picker, setPicker] = useState(null);

  const up = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await api.put(`/equipment/${item._id}`, {
        ...form, quantity: parseInt(form.quantity) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
        category: "consumable",
      });
      if (restock && parseInt(restock) > 0) {
        await api.put(`/equipment/${item._id}/restock`, { amount: parseInt(restock) });
      }
      onSave();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      setSaving(false);
    }
  };

  const currentQty = parseInt(form.quantity) || 0;
  const restockQty = parseInt(restock) || 0;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={[m.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={m.header}>
              <Text style={m.title}>Edit Consumable</Text>
              <TouchableOpacity onPress={onClose} style={m.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 14 }}>
              <PickerField label="Sub-Category" value={form.subCategory}
                onPress={() => setPicker({ field: "subCategory", options: CONSUMABLE_SUBCATEGORIES, title: "Sub-Category" })} />
              <PickerField label="Item Name" value={form.name}
                onPress={() => setPicker({ field: "name", options: CONSUMABLE_NAMES[form.subCategory] || [], title: "Item Name" })} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <InputField label="Quantity" value={form.quantity} onChangeText={(v) => up("quantity", v)} placeholder="0" keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <PickerField label="Unit" value={form.unit} onPress={() => setPicker({ field: "unit", options: CONSUMABLE_UNITS, title: "Unit" })} />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField label="Alert ≤" value={form.lowStockThreshold} onChangeText={(v) => up("lowStockThreshold", v)} placeholder="10" keyboardType="number-pad" />
                </View>
              </View>
              <InputField label="Expiry Date" value={form.consumableExpiry} onChangeText={(v) => up("consumableExpiry", v)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

              {/* Restock box */}
              <View style={m.restockBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ionicons name="archive" size={14} color="#15803D" />
                  <Text style={m.restockTitle}>Restock (add to current {currentQty} {form.unit})</Text>
                </View>
                <TextInput
                  style={m.restockInput}
                  value={restock}
                  onChangeText={setRestock}
                  placeholder="e.g. 20"
                  placeholderTextColor="#6EE7B7"
                  keyboardType="number-pad"
                />
                {restockQty > 0 && (
                  <Text style={m.restockCalc}>
                    New total: {currentQty + restockQty} {form.unit}
                  </Text>
                )}
              </View>

              {error && (
                <View style={m.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#B91C1C" />
                  <Text style={m.errorText}>{error}</Text>
                </View>
              )}
            </ScrollView>
            <View style={m.footer}>
              <TouchableOpacity style={m.cancelBtn} onPress={onClose}><Text style={m.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[m.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <LinearGradient colors={["#0D47A1", "#1565C0"]} style={m.saveBtnGrad}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.saveText}>Save & Restock</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
      {picker && (
        <PickerSheet visible title={picker.title} options={picker.options} value={form[picker.field]}
          onSelect={(v) => up(picker.field, v)} onClose={() => setPicker(null)} />
      )}
    </Modal>
  );
}

// ── Modal shared styles ───────────────────────────────────────
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  title: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 11, color: "#94A3B8", marginTop: 3 },
  closeBtn: { padding: 6, borderRadius: 10, backgroundColor: "#F1F5F9" },
  footer: { flexDirection: "row", gap: 10, padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  saveBtn: { flex: 2, borderRadius: 12, overflow: "hidden" },
  saveBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13 },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", borderWidth: 1, borderRadius: 10, padding: 10 },
  infoText: { fontSize: 11, color: "#15803D", flex: 1 },
  warnBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderWidth: 1, borderRadius: 10, padding: 10 },
  warnText: { fontSize: 11, color: "#B45309", flex: 1 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF1F2", borderColor: "#FECDD3", borderWidth: 1, borderRadius: 10, padding: 10 },
  errorText: { fontSize: 11, color: "#B91C1C", flex: 1 },
  restockBox: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", borderWidth: 1, borderRadius: 12, padding: 14 },
  restockTitle: { fontSize: 12, fontWeight: "700", color: "#15803D" },
  restockInput: { borderWidth: 1, borderColor: "#86EFAC", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: "700", color: "#14532D", backgroundColor: "#fff", textAlign: "center" },
  restockCalc: { fontSize: 11, color: "#15803D", fontWeight: "700", textAlign: "center", marginTop: 6 },
});

// ── Equipment Tree ────────────────────────────────────────────
function EquipmentTree({ machines, consumables, onEdit, onDelete }) {
  const [openSubs, setOpenSubs] = useState({});
  const [openNames, setOpenNames] = useState({});

  const toggleSub = (k) => setOpenSubs((p) => ({ ...p, [k]: !p[k] }));
  const toggleName = (k) => setOpenNames((p) => ({ ...p, [k]: !p[k] }));

  const machinesByName = {};
  machines.forEach((m) => {
    if (!machinesByName[m.name]) machinesByName[m.name] = [];
    machinesByName[m.name].push(m);
  });
  const consumablesByName = {};
  consumables.forEach((c) => { consumablesByName[c.name] = c; });

  const confirmDelete = (item) => {
    Alert.alert(
      "Delete Equipment",
      `Delete "${item.name}"${item.serialNumber ? ` (SN: ${item.serialNumber})` : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(item._id) },
      ]
    );
  };

  const MachineUnit = ({ machine: ma }) => {
    const d = daysUntil(ma.nextServiceDate);
    const urgent = d !== null && d <= 5;
    return (
      <View style={tr.machineUnit}>
        <View style={[tr.dot, { backgroundColor: urgent ? "#EF4444" : "#22C55E" }]} />
        <View style={{ flex: 1 }}>
          <Text style={tr.unitName}>
            {ma.serialNumber ? `SN: ${ma.serialNumber}` : "Unit"}
          </Text>
          <Text style={tr.unitSub}>
            {ma.location || "—"}{ma.testFor ? ` · ${ma.testFor}` : ""}
            {urgent ? (d <= 0 ? " · ⛔ OVERDUE" : ` · ⚠️ ${d}d`) : ""}
          </Text>
        </View>
        <TouchableOpacity style={tr.editBtn} onPress={() => onEdit(ma)}>
          <Ionicons name="pencil" size={12} color="#B45309" />
        </TouchableOpacity>
        <TouchableOpacity style={tr.deleteBtn} onPress={() => confirmDelete(ma)}>
          <Ionicons name="trash" size={12} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const MachineNameRow = ({ machineName, sub }) => {
    const units = machinesByName[machineName] || [];
    const nameKey = `${sub}::${machineName}`;
    const isOpen = openNames[nameKey] !== false;
    const anyUrgent = units.some((u) => { const d = daysUntil(u.nextServiceDate); return d !== null && d <= 5; });

    return (
      <View>
        <TouchableOpacity style={tr.nameRow} onPress={() => units.length && toggleName(nameKey)} activeOpacity={0.7}>
          <View style={[tr.nameDot, { backgroundColor: units.length ? "#22C55E" : "#E2E8F0" }]} />
          <Text style={[tr.nameTxt, !units.length && { color: "#94A3B8" }]} numberOfLines={1}>
            {machineName}
          </Text>
          {anyUrgent && <Text style={tr.urgentTag}>⚠️</Text>}
          <View style={[tr.countBadge, !units.length && tr.countBadgeEmpty]}>
            <Text style={[tr.countTxt, !units.length && { color: "#CBD5E1" }]}>
              {units.length ? `${units.length}u` : "—"}
            </Text>
          </View>
          {units.length > 0 && (
            <Ionicons
              name={isOpen ? "chevron-down" : "chevron-forward"}
              size={12} color="#94A3B8" style={{ marginLeft: 2 }}
            />
          )}
        </TouchableOpacity>
        {units.length > 0 && isOpen && (
          <View style={tr.nameUnitsWrap}>
            {units.map((u) => <MachineUnit key={u._id} machine={u} />)}
          </View>
        )}
      </View>
    );
  };

  const ConsumableRow = ({ c }) => {
    if (!c) return null;
    const isLow = c.quantity <= c.lowStockThreshold;
    const isOut = c.quantity === 0;
    return (
      <View style={tr.consumRow}>
        <View style={[tr.dot, { backgroundColor: isOut ? "#EF4444" : isLow ? "#F59E0B" : "#22C55E" }]} />
        <Text style={tr.consumName} numberOfLines={1}>{c.name}</Text>
        <Text style={[tr.consumQty, isOut ? { color: "#EF4444" } : isLow ? { color: "#F59E0B" } : { color: "#16A34A" }]}>
          {c.quantity} {c.unit}
        </Text>
        {isOut && <View style={tr.outBadge}><Text style={tr.outTxt}>OUT</Text></View>}
        {!isOut && isLow && <View style={tr.lowBadge}><Text style={tr.lowTxt}>LOW</Text></View>}
        <TouchableOpacity style={tr.editBtn} onPress={() => onEdit(c)}>
          <Ionicons name="pencil" size={12} color="#B45309" />
        </TouchableOpacity>
        <TouchableOpacity style={tr.deleteBtn} onPress={() => confirmDelete(c)}>
          <Ionicons name="trash" size={12} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const SubGroup = ({ sub, allNames, isMachine }) => {
    const key = `${isMachine ? "M" : "C"}:${sub}`;
    const isOpen = !!openSubs[key];
    const addedCount = isMachine
      ? (machinesByName ? allNames.filter((n) => (machinesByName[n] || []).length > 0).length : 0)
      : allNames.filter((n) => !!consumablesByName[n]).length;

    return (
      <View style={tr.subGroup}>
        <TouchableOpacity style={tr.subHeader} onPress={() => toggleSub(key)} activeOpacity={0.7}>
          <Ionicons name={isOpen ? "chevron-down" : "chevron-forward"} size={13} color="#94A3B8" />
          <Text style={tr.subTxt} numberOfLines={1}>{sub}</Text>
          <Text style={tr.subCount}>
            {addedCount}/{allNames.length}
          </Text>
        </TouchableOpacity>
        {isOpen && (
          <View style={tr.subItems}>
            {allNames.map((name) =>
              isMachine ? (
                <MachineNameRow key={name} machineName={name} sub={sub} />
              ) : consumablesByName[name] ? (
                <ConsumableRow key={name} c={consumablesByName[name]} />
              ) : (
                <View key={name} style={tr.notAdded}>
                  <View style={[tr.dot, { backgroundColor: "#E2E8F0" }]} />
                  <Text style={tr.notAddedTxt} numberOfLines={1}>{name}</Text>
                  <Text style={tr.notAddedBadge}>Not Added</Text>
                </View>
              )
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Machines */}
      <View style={tr.section}>
        <View style={tr.sectionHeader}>
          <Text style={tr.sectionTitle}>🖥️ Machines ({machines.length})</Text>
        </View>
        {MACHINE_SUBCATEGORIES.map((sub) => (
          <SubGroup key={sub} sub={sub} allNames={MACHINE_NAMES[sub] || []} isMachine />
        ))}
      </View>

      {/* Consumables */}
      <View style={tr.section}>
        <View style={tr.sectionHeader}>
          <Text style={tr.sectionTitle}>🧫 Consumables ({consumables.length})</Text>
        </View>
        {CONSUMABLE_SUBCATEGORIES.map((sub) => (
          <SubGroup key={sub} sub={sub} allNames={CONSUMABLE_NAMES[sub] || []} isMachine={false} />
        ))}
      </View>
    </View>
  );
}

const tr = StyleSheet.create({
  section: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#F1F5F9", overflow: "hidden" },
  sectionHeader: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#FFFBEB", borderBottomWidth: 1, borderBottomColor: "#FDE68A" },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#92400E" },
  subGroup: { borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  subHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  subTxt: { flex: 1, fontSize: 12, fontWeight: "600", color: "#475569" },
  subCount: { fontSize: 11, color: "#94A3B8" },
  subItems: { paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: "#F1F5F9", marginLeft: 14, marginBottom: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 9 },
  nameDot: { width: 7, height: 7, borderRadius: 4 },
  nameTxt: { flex: 1, fontSize: 12, fontWeight: "600", color: "#334155" },
  urgentTag: { fontSize: 11 },
  countBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  countBadgeEmpty: { backgroundColor: "#F8FAFC" },
  countTxt: { fontSize: 10, fontWeight: "700", color: "#B45309" },
  nameUnitsWrap: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: "#E2E8F0", borderStyle: "dashed", marginLeft: 10, marginBottom: 4 },
  machineUnit: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingVertical: 8 },
  unitName: { fontSize: 12, fontWeight: "600", color: "#475569" },
  unitSub: { fontSize: 10, color: "#94A3B8", marginTop: 1 },
  consumRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  consumName: { flex: 1, fontSize: 12, fontWeight: "600", color: "#334155" },
  consumQty: { fontSize: 11, fontWeight: "700" },
  outBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  outTxt: { fontSize: 10, fontWeight: "800", color: "#B91C1C" },
  lowBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  lowTxt: { fontSize: 10, fontWeight: "800", color: "#B45309" },
  notAdded: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8, opacity: 0.5 },
  notAddedTxt: { flex: 1, fontSize: 12, color: "#94A3B8" },
  notAddedBadge: { fontSize: 10, color: "#CBD5E1" },
  editBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  deleteBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: "#FECDD3", backgroundColor: "#FFF1F2" },
});

// ── Requests Panel ────────────────────────────────────────────
function RequestsPanel({ requests, onAck, onResolve, onRestock, acting }) {
  if (!requests.length) {
    return (
      <View style={rp.empty}>
        <Text style={rp.emptyIcon}>✅</Text>
        <Text style={rp.emptyTxt}>No pending requests</Text>
      </View>
    );
  }

  const URGENCY = {
    emergency: { bg: "#FEE2E2", text: "#B91C1C", icon: "🚨" },
    "1_day_warning": { bg: "#FEE2E2", text: "#DC2626", icon: "⛔" },
    "5_day_warning": { bg: "#FFEDD5", text: "#C2410C", icon: "⚠️" },
    routine: { bg: "#EFF6FF", text: "#1D4ED8", icon: "📋" },
  };
  const STATUS = {
    pending: { bg: "#FEE2E2", text: "#B91C1C" },
    acknowledged: { bg: "#FEF3C7", text: "#B45309" },
    resolved: { bg: "#DCFCE7", text: "#15803D" },
  };

  return (
    <View style={{ gap: 10 }}>
      {requests.map((req) => {
        const isCons = req.category === "consumable";
        const urg = isCons
          ? { bg: "#FFEDD5", text: "#C2410C", icon: "📦" }
          : URGENCY[req.urgency] || URGENCY.routine;
        const st = STATUS[req.status] || { bg: "#F1F5F9", text: "#64748B" };

        return (
          <View key={String(req._id)} style={rp.card}>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
              <View style={[rp.iconBox, { backgroundColor: urg.bg }]}>
                <Text style={{ fontSize: 20 }}>{urg.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={rp.name} numberOfLines={1}>{req.equipmentName}</Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <View style={[rp.badge, { backgroundColor: urg.bg }]}>
                    <Text style={[rp.badgeTxt, { color: urg.text }]}>
                      {isCons ? "Low Stock" : (req.urgency?.replace(/_/g, " ") || "routine")}
                    </Text>
                  </View>
                  <View style={[rp.badge, { backgroundColor: st.bg }]}>
                    <Text style={[rp.badgeTxt, { color: st.text }]}>{req.status}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={rp.meta}>
              {req.subCategory}
              {!isCons && req.location ? ` · 📍 ${req.location}` : ""}
              {isCons
                ? `\nStock: ${req.quantityAtTime} ${req.unit} · Threshold: ${req.threshold}`
                : req.nextServiceDate ? `\nService: ${fmt(req.nextServiceDate)}` : ""}
            </Text>
            {req.notes ? (
              <View style={rp.noteBox}>
                <Text style={rp.noteTxt}>📝 {req.notes}</Text>
              </View>
            ) : null}
            <Text style={rp.time}>Sent: {req.sentAt ? new Date(req.sentAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</Text>

            <View style={rp.actions}>
              {!isCons && req.status === "pending" && (
                <TouchableOpacity
                  style={rp.ackBtn}
                  onPress={() => onAck(req)}
                  disabled={!!acting[req._id]}
                >
                  <Text style={rp.ackTxt}>{acting[req._id] ? "…" : "👁 Acknowledge"}</Text>
                </TouchableOpacity>
              )}
              {!isCons && (req.status === "pending" || req.status === "acknowledged") && (
                <TouchableOpacity
                  style={rp.resolveBtn}
                  onPress={() => onResolve(req)}
                  disabled={!!acting[String(req._id) + "r"]}
                >
                  <LinearGradient colors={["#14532D", "#166534"]} style={rp.resolveBtnGrad}>
                    <Text style={rp.resolveTxt}>{acting[String(req._id) + "r"] ? "…" : "✅ Resolve"}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {isCons && (req.status === "pending" || req.status === "acknowledged") && (
                <TouchableOpacity
                  style={rp.resolveBtn}
                  onPress={() => onRestock(req)}
                >
                  <LinearGradient colors={["#14532D", "#166534"]} style={rp.resolveBtnGrad}>
                    <Text style={rp.resolveTxt}>📥 Add Stock</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Restock Dialog ────────────────────────────────────────────
function RestockDialog({ req, onClose, onDone }) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleRestock = async () => {
    const qty = parseInt(amount);
    if (!qty || qty < 1) return setError("Enter a valid quantity.");
    setSaving(true); setError(null);
    try {
      await api.put(`/equipment/${req.equipmentId}/restock`, { amount: qty });
      await api.post("/equipment/resolve", { equipmentId: req.equipmentId, requestId: req._id, category: "consumable" });
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      setSaving(false);
    }
  };

  const restockQty = parseInt(amount) || 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 20, overflow: "hidden" }}>
          <LinearGradient colors={["#14532D", "#166534"]} style={{ padding: 18 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>📥 Restock Consumable</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 3 }}>{req.equipmentName}</Text>
          </LinearGradient>
          <View style={{ padding: 18, gap: 14 }}>
            <View style={{ backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderWidth: 1, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#C2410C" }}>📦 Low Stock Alert</Text>
              <Text style={{ fontSize: 11, color: "#9A3412", marginTop: 4 }}>
                Stock at alert: {req.quantityAtTime} {req.unit} · Threshold: {req.threshold}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>
                Quantity to Add ({req.unit})
              </Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: "#86EFAC", borderRadius: 12, paddingVertical: 12, fontSize: 20, fontWeight: "800", textAlign: "center", color: "#14532D" }}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 50"
                placeholderTextColor="#86EFAC"
                keyboardType="number-pad"
              />
              {restockQty > 0 && (
                <Text style={{ fontSize: 12, color: "#15803D", fontWeight: "700", textAlign: "center", marginTop: 6 }}>
                  New total: {(req.currentQty || 0) + restockQty} {req.unit}
                </Text>
              )}
            </View>
            {error && (
              <View style={m.errorBox}>
                <Ionicons name="alert-circle" size={14} color="#B91C1C" />
                <Text style={m.errorText}>{error}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={[m.cancelBtn, { flex: 1 }]} onPress={onClose}>
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, borderRadius: 12, overflow: "hidden", opacity: saving || !restockQty ? 0.6 : 1 }}
                onPress={handleRestock}
                disabled={saving || !restockQty}
              >
                <LinearGradient colors={["#14532D", "#166534"]} style={m.saveBtnGrad}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.saveText}>✅ Add Stock & Resolve</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const rp = StyleSheet.create({
  empty: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#F1F5F9", padding: 32, alignItems: "center" },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTxt: { fontSize: 14, fontWeight: "600", color: "#94A3B8" },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#F1F5F9", padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  name: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { fontSize: 10, fontWeight: "700" },
  meta: { fontSize: 11, color: "#64748B", marginBottom: 6, lineHeight: 17 },
  noteBox: { backgroundColor: "#F8FAFC", borderRadius: 8, padding: 8, marginBottom: 6 },
  noteTxt: { fontSize: 11, color: "#475569" },
  time: { fontSize: 10, color: "#94A3B8", marginBottom: 10 },
  actions: { flexDirection: "row", gap: 8 },
  ackBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB", alignItems: "center" },
  ackTxt: { fontSize: 12, fontWeight: "600", color: "#B45309" },
  resolveBtn: { flex: 1, borderRadius: 10, overflow: "hidden" },
  resolveBtnGrad: { paddingVertical: 9, alignItems: "center" },
  resolveTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

// ── Main Screen ───────────────────────────────────────────────
export default function AdminEquipment() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("list"); // "list" | "requests"
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addMachineVisible, setAddMachineVisible] = useState(false);
  const [addConsumeVisible, setAddConsumeVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [acting, setActing] = useState({});
  const [restockReq, setRestockReq] = useState(null);

  const machines = items.filter((i) => i.category === "machine");
  const consumables = items.filter((i) => i.category === "consumable");
  const existingConsumableNames = consumables.map((i) => i.name);

  const fetchAll = useCallback(async () => {
    try {
      const [mr, cr, rr] = await Promise.all([
        api.get("/equipment?category=machine"),
        api.get("/equipment?category=consumable"),
        api.get("/equipment/pending-requests"),
      ]);
      setItems([...(mr.data?.items || []), ...(cr.data?.items || [])]);
      setRequests(rr.data?.requests || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const done = useCallback(() => {
    setAddMachineVisible(false);
    setAddConsumeVisible(false);
    setEditItem(null);
    setRestockReq(null);
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async (id) => {
    try { await api.delete(`/equipment/${id}`); fetchAll(); }
    catch (e) { Alert.alert("Error", e.response?.data?.message || e.message); }
  };

  const handleAck = async (req) => {
    setActing((p) => ({ ...p, [req._id]: true }));
    try {
      await api.post("/equipment/acknowledge", { equipmentId: req.equipmentId, requestId: req._id, category: req.category });
      const r = await api.get("/equipment/pending-requests");
      setRequests(r.data?.requests || []);
    } catch (e) { Alert.alert("Error", e.response?.data?.message || e.message); }
    finally { setActing((p) => ({ ...p, [req._id]: false })); }
  };

  const handleResolve = async (req) => {
    setActing((p) => ({ ...p, [String(req._id) + "r"]: true }));
    try {
      await api.post("/equipment/resolve", { equipmentId: req.equipmentId, requestId: req._id, category: req.category });
      const r = await api.get("/equipment/pending-requests");
      setRequests(r.data?.requests || []);
      fetchAll();
    } catch (e) { Alert.alert("Error", e.response?.data?.message || e.message); }
    finally { setActing((p) => ({ ...p, [String(req._id) + "r"]: false })); }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const lowCount = consumables.filter((c) => (c.quantity ?? 0) <= (c.lowStockThreshold ?? 10)).length;
  const serviceCount = machines.filter(
    (m) => m.serviceRequests?.some((r) => r.status === "pending") ||
           m.machineStatus === "service_due" || m.machineStatus === "under_repair"
  ).length;

  const KPI_DATA = [
    { label: "Machines", value: machines.length, icon: "desktop-outline", color: "#1A237E", bg: "#E8EAF6" },
    { label: "Consumables", value: consumables.length, icon: "flask-outline", color: "#0F766E", bg: "#CCFBF1" },
    { label: "Low Stock", value: lowCount, icon: "warning-outline", color: lowCount > 0 ? "#C2410C" : "#64748B", bg: lowCount > 0 ? "#FFEDD5" : "#F8FAFC" },
    { label: "Service Due", value: serviceCount, icon: "construct-outline", color: serviceCount > 0 ? "#B91C1C" : "#64748B", bg: serviceCount > 0 ? "#FEE2E2" : "#F8FAFC" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* Modals */}
      {addMachineVisible && (
        <AddMachineModal existingMachines={machines} onClose={() => setAddMachineVisible(false)} onSave={done} />
      )}
      {addConsumeVisible && (
        <AddConsumableModal existingConsumableNames={existingConsumableNames} onClose={() => setAddConsumeVisible(false)} onSave={done} />
      )}
      {editItem?.category === "machine" && (
        <EditMachineModal item={editItem} onClose={() => setEditItem(null)} onSave={done} />
      )}
      {editItem?.category === "consumable" && (
        <EditConsumableModal item={editItem} onClose={() => setEditItem(null)} onSave={done} />
      )}
      {restockReq && (
        <RestockDialog req={restockReq} onClose={() => setRestockReq(null)} onDone={done} />
      )}

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={["#0D2137", "#1A237E", "#283593"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={sc.headerBanner}
        >
          <View>
            <Text style={sc.headerTitle}>⚙️ Equipment</Text>
            <Text style={sc.headerSub}>Lab machines & consumables</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={sc.headerBtn} onPress={() => setAddMachineVisible(true)}>
              <Ionicons name="add" size={14} color="#1A237E" />
              <Text style={sc.headerBtnTxt}>Machine</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sc.headerBtnOutline} onPress={() => setAddConsumeVisible(true)}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={sc.headerBtnOutlineTxt}>Consumable</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* KPI Row */}
        <View style={sc.kpiRow}>
          {KPI_DATA.map((k) => (
            <View key={k.label} style={[sc.kpiCard, { backgroundColor: k.bg }]}>
              <View style={[sc.kpiIcon, { backgroundColor: "rgba(255,255,255,0.5)" }]}>
                <Ionicons name={k.icon} size={16} color={k.color} />
              </View>
              <Text style={[sc.kpiVal, { color: k.color }]}>{k.value}</Text>
              <Text style={[sc.kpiLbl, { color: k.color }]}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Tab toggle */}
        <View style={sc.tabRow}>
          {[
            { key: "list", label: "📋 Equipment" },
            { key: "requests", label: `🔔 Requests${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[sc.tabBtn, tab === t.key && sc.tabBtnActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[sc.tabTxt, tab === t.key && sc.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={{ marginTop: 12, fontSize: 13, color: "#94A3B8" }}>Loading equipment…</Text>
          </View>
        ) : tab === "requests" ? (
          <RequestsPanel
            requests={requests}
            onAck={handleAck}
            onResolve={handleResolve}
            onRestock={setRestockReq}
            acting={acting}
          />
        ) : (
          <EquipmentTree
            machines={machines}
            consumables={consumables}
            onEdit={setEditItem}
            onDelete={handleDelete}
          />
        )}
      </ScrollView>
    </View>
  );
}

const sc = StyleSheet.create({
  headerBanner: { borderRadius: 20, padding: 18, marginBottom: 14, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 },
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  headerBtnTxt: { color: "#1A237E", fontSize: 12, fontWeight: "700" },
  headerBtnOutline: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  headerBtnOutlineTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpiCard: { flex: 1, borderRadius: 14, padding: 10, alignItems: "center" },
  kpiIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  kpiVal: { fontSize: 18, fontWeight: "800" },
  kpiLbl: { fontSize: 9, fontWeight: "700", marginTop: 2, textAlign: "center" },
  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, padding: 4, borderWidth: 1, borderColor: "#F1F5F9", marginBottom: 14, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabBtnActive: { backgroundColor: ACCENT },
  tabTxt: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  tabTxtActive: { color: "#fff" },
});
