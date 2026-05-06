import React, { useState, useEffect, useCallback } from "react";
import { 
  View, Text, ScrollView, TouchableOpacity, 
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";

const C = COLORS.lab;

export default function LabEquipment() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal States
  const [activeMachine, setActiveMachine] = useState(null);
  const [useModal, setUseModal] = useState(null);
  const [notifyModal, setNotifyModal] = useState(null); // New state for restocking
  
  const [useAmount, setUseAmount] = useState("1");
  const [notifNote, setNotifNote] = useState("");

  // Collapse States - Main Categories only
  const [machinesOpen, setMachinesOpen] = useState(false);
  const [consumablesOpen, setConsumablesOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/equipment");
      setItems(res.data.items || []);
    } catch (e) {
      console.error("Load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ─── Functionality: Service Request (Machines) ───────────────────────────
  const handleServiceSubmit = async (type) => {
    if (!activeMachine) return;
    setSaving(true);
    try {
      await api.post(`/equipment/${activeMachine._id}/service-request`, {
        requestType: type,
        urgency: "routine",
        notes: "Maintenance request via mobile dashboard."
      });
      Alert.alert("Success", "Admin notified of equipment issue.");
      setActiveMachine(null);
      fetchItems();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to send request.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Functionality: Restock Notification (Consumables) ───────────────────
  const handleNotifyAdmin = async () => {
    if (!notifyModal) return;
    setSaving(true);
    try {
      // Routes notification to Resource Management
      await api.post(`/equipment/${notifyModal._id}/stock-request`, {
        notes: notifNote || `Stock is low for ${notifyModal.name}. Please restock.`
      });
      Alert.alert("Sent", "Restock request sent to Admin.");
      setNotifyModal(null);
      setNotifNote("");
      fetchItems();
    } catch (e) {
      Alert.alert("Error", "Could not send restock notification.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Functionality: Use Stock ───────────────────────────────────────────
  const handleUseStock = async () => {
    if (!useModal) return;
    setSaving(true);
    try {
      await api.put(`/equipment/${useModal._id}/decrement`, { 
        amount: parseInt(useAmount) || 1 
      });
      Alert.alert("Success", "Inventory updated.");
      setUseModal(null);
      setUseAmount("1");
      fetchItems();
    } catch (e) {
      Alert.alert("Error", "Failed to update stock.");
    } finally {
      setSaving(false);
    }
  };

  const machines = items.filter(i => i.category === 'machine');
  const consumables = items.filter(i => i.category === 'consumable');

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.primary} /></View>;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.pageTitle}>Equipment Management</Text>
        <Text style={styles.pageSub}>Track lab resources and maintenance.</Text>

        {/* ── MACHINES SECTION ── */}
        <View style={styles.sectionBox}>
          <TouchableOpacity 
            style={[styles.sectionHeader, { borderLeftColor: '#0284c7' }]} 
            onPress={() => setMachinesOpen(!machinesOpen)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>MACHINES & EQUIPMENT</Text>
              <Text style={styles.sectionCount}>{machines.length} items total</Text>
            </View>
            <Ionicons name={machinesOpen ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
          </TouchableOpacity>

          {machinesOpen && machines.map(m => (
            <View key={m._id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{m.name}</Text>
                <Text style={styles.itemMeta}>📍 {m.location || "General Lab"} {m.serialNumber ? `· SN: ${m.serialNumber}` : ""}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveMachine(m)} style={styles.toolBtn}>
                <Ionicons name="construct-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── CONSUMABLES SECTION ── */}
        <View style={styles.sectionBox}>
          <TouchableOpacity 
            style={[styles.sectionHeader, { borderLeftColor: '#8b5cf6' }]} 
            onPress={() => setConsumablesOpen(!consumablesOpen)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>CONSUMABLES & SINGLE-USE</Text>
              <Text style={styles.sectionCount}>{consumables.length} items total</Text>
            </View>
            <Ionicons name={consumablesOpen ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
          </TouchableOpacity>

          {consumablesOpen && consumables.map(c => {
            const isLow = c.quantity <= c.lowStockThreshold;
            const pct = Math.min(100, (c.quantity / (c.lowStockThreshold * 3)) * 100);
            const alreadyNotified = (c.stockRequests || []).some(r => r.status === "pending");

            return (
              <View key={c._id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.flexRow}>
                    <Text style={styles.itemName}>{c.name}</Text>
                    {isLow && <View style={styles.lowBadge}><Text style={styles.lowText}>LOW</Text></View>}
                  </View>
                  <View style={styles.barRow}>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: isLow ? '#f97316' : '#10B981' }]} />
                    </View>
                    <Text style={styles.qtyText}>{c.quantity} <Text style={styles.unitText}>{c.unit}</Text></Text>
                  </View>
                </View>
                <View style={styles.btnRow}>
                  <TouchableOpacity onPress={() => setUseModal(c)} style={styles.useBtn}>
                    <Text style={styles.useBtnText}>- Use</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setNotifyModal(c)} 
                    disabled={alreadyNotified}
                    style={[styles.notifyBtn, alreadyNotified && { backgroundColor: '#e2e8f0' }]}
                  >
                    <Ionicons name="cube" size={12} color={alreadyNotified ? "#94a3b8" : "#fff"} />
                    <Text style={[styles.notifyText, alreadyNotified && { color: "#94a3b8" }]}>
                      {alreadyNotified ? "Sent" : "Notify"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── MACHINE SERVICE MODAL ── */}
      <Modal visible={!!activeMachine} transparent animationType="fade">
        <View style={styles.overlay}><View style={styles.modal}>
            <Text style={styles.modalTitle}>Service Required</Text>
            <Text style={styles.modalSub}>{activeMachine?.name}</Text>
            {['emergency', 'replacement', 'scheduled_service'].map(type => (
              <TouchableOpacity key={type} style={styles.option} onPress={() => handleServiceSubmit(type)}>
                <Text style={styles.optionText}>{type.replace('_', ' ')}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.primary} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setActiveMachine(null)} style={styles.closeBtn}><Text style={styles.closeText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* ── RESTOCK NOTIFY MODAL ── */}
      <Modal visible={!!notifyModal} transparent animationType="fade">
        <View style={styles.overlay}><View style={styles.modal}>
            <Text style={styles.modalTitle}>Notify Restock</Text>
            <Text style={styles.modalSub}>{notifyModal?.name}</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Add a message for Admin..." 
              value={notifNote} 
              onChangeText={setNotifNote}
            />
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#f97316' }]} onPress={handleNotifyAdmin} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Send to Resource Management</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setNotifyModal(null)} style={styles.closeBtn}><Text style={styles.closeText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* ── USE STOCK MODAL ── */}
      <Modal visible={!!useModal} transparent animationType="fade">
        <View style={styles.overlay}><View style={styles.modal}>
            <Text style={styles.modalTitle}>Use Consumable</Text>
            <Text style={styles.modalSub}>{useModal?.name}</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={useAmount} onChangeText={setUseAmount} />
            <TouchableOpacity style={styles.confirmBtn} onPress={handleUseStock} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Confirm Usage</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setUseModal(null)} style={styles.closeBtn}><Text style={styles.closeText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageTitle: { fontSize: 22, fontWeight: "bold", color: "#1e293b", paddingHorizontal: 16, marginTop: 10 },
  pageSub: { fontSize: 12, color: "#94a3b8", paddingHorizontal: 16, marginBottom: 20 },
  sectionBox: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 16, ...SHADOW.sm, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", padding: 16, borderLeftWidth: 5, alignItems: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#64748b" },
  sectionCount: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  itemRow: { padding: 16, borderTopWidth: 1, borderTopColor: "#f1f5f9", flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 14, fontWeight: "600", color: "#023e6b" },
  itemMeta: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  flexRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  barBg: { flex: 1, height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%' },
  qtyText: { fontSize: 11, fontWeight: '700', color: '#475569', minWidth: 55 },
  unitText: { fontWeight: '400', color: '#94a3b8' },
  lowBadge: { backgroundColor: '#ffedd5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  lowText: { color: '#f97316', fontSize: 10, fontWeight: '800' },
  btnRow: { flexDirection: 'row', gap: 8 },
  useBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  useBtnText: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  notifyBtn: { backgroundColor: '#f97316', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  notifyText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  toolBtn: { padding: 10, backgroundColor: '#fef2f2', borderRadius: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  modalSub: { fontSize: 12, color: '#94a3b8', marginBottom: 20 },
  option: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionText: { fontSize: 14, fontWeight: '600', color: '#475569', textTransform: 'capitalize' },
  closeBtn: { marginTop: 16, alignItems: 'center' },
  closeText: { color: '#94a3b8', fontWeight: '700' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  confirmBtn: { backgroundColor: C.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: 'bold' }
});