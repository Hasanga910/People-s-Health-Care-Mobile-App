import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl,
  Platform, Pressable, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const LAB_TEST_PRICES = {
  'FBC': 2100, 'FBS': 2300, 'ESR': 2500,
  'Liver Profile': 2150, 'Renal Profile': 2250,
  'Thyroid Profile': 2400, 'Serum Vit D Level': 3000, 'Dengue Ag': 3500,
};
const OTHER_PRICE = 4000;
const LAB_TESTS   = Object.keys(LAB_TEST_PRICES);

const DOSAGE_BY_TYPE = {
  syrup: [
    '5ml (1 tsp) once daily',
    '5ml (1 tsp) twice daily (morning & night)',
    '5ml (1 tsp) three times daily (morning, noon & night)',
    '5ml (1 tsp) after meals, twice daily',
    '10ml (2 tsp) twice daily',
    '5ml (1 tsp) at bedtime',
    'Shake well before use — 5ml twice daily',
    'Shake well before use — 5ml three times daily',
  ],
  tablet: [
    '1 tablet once daily in the morning',
    '1 tablet once daily at bedtime',
    '1 tablet twice daily (morning & night)',
    '1 tablet three times daily (morning, noon & night)',
    '1 tablet four times daily (every 6 hours)',
    '½ tablet once daily in the morning',
    '½ tablet twice daily (morning & night)',
    '1 tablet before breakfast',
    '1 tablet after breakfast',
    '1 tablet after meals, three times daily',
    '1 tablet every 8 hours',
    '1 tablet every 12 hours',
    '1 tablet when needed (max 3 per day)',
    '2 tablets once daily in the morning',
    '1 tablet daily — do not crush or chew',
  ],
  capsule: [
    '1 capsule once daily in the morning',
    '1 capsule once daily at bedtime',
    '1 capsule twice daily (morning & night)',
    '1 capsule three times daily (morning, noon & night)',
    '1 capsule before meals',
    '1 capsule after meals',
    '1 capsule with food to avoid nausea',
    '2 capsules once daily',
    '1 capsule every 8 hours',
    '1 capsule every 12 hours',
  ],
  topical: [
    'Apply a thin layer to affected area once daily',
    'Apply a thin layer to affected area twice daily',
    'Apply and gently massage into skin twice daily',
    'Apply after cleaning the area, twice daily',
  ],
  general: [
    'Once daily', 'Twice daily (morning & night)',
    'Three times daily (morning, noon & night)',
    'At bedtime', 'Before meals', 'After meals', 'As needed',
  ],
};

const DURATION_OPTIONS = [
  '3 days','5 days','1 week','2 weeks','3 weeks',
  '1 month','2 months','3 months','6 months','Ongoing (until review)',
];

const MED_TYPE_COLORS = {
  syrup:   { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  tablet:  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  capsule: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  topical: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  general: { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' },
};

const PHARMACY_STATUS = {
  pending:     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', dot: '#F97316', label: 'Pending'     },
  in_progress: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6', label: 'In Progress' },
  dispensed:   { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', dot: '#22C55E', label: 'Dispensed'   },
  cancelled:   { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', dot: '#94A3B8', label: 'Cancelled'   },
};

const LAB_STATUS = {
  pending:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: 'Pending'     },
  in_progress: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'In Progress' },
  completed:   { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Completed'   },
};

function detectMedType(name = '', form = '') {
  const f = form.toLowerCase();
  if (['syrup','suspension','solution','drops','elixir'].includes(f)) return 'syrup';
  if (f === 'capsule') return 'capsule';
  if (f === 'tablet')  return 'tablet';
  if (['cream','ointment','gel','lotion'].includes(f)) return 'topical';
  const n = name.toLowerCase();
  if (/syrup|suspension|oral liquid|mixture|linctus|elixir|solution|drops|syr\b/.test(n)) return 'syrup';
  if (/capsule|cap\b/.test(n)) return 'capsule';
  if (/tablet|tab\b/.test(n)) return 'tablet';
  if (/cream|ointment|gel|lotion|topical|paste/.test(n)) return 'topical';
  return 'general';
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

// ─────────────────────────────────────────────────────────────
// PICKER MODAL — shared bottom sheet for selecting an option
// ─────────────────────────────────────────────────────────────
function PickerModal({ visible, title, options, selected, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pk.overlay} onPress={onClose}>
        <View style={pk.sheet} onStartShouldSetResponder={() => true}>
          <View style={pk.header}>
            <Text style={pk.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={20} color="#94A3B8" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {options.map((opt, i) => (
              <TouchableOpacity
                key={i} style={[pk.item, selected === opt && pk.itemActive]}
                onPress={() => { onSelect(opt); onClose(); }} activeOpacity={0.7}
              >
                <Text style={[pk.itemText, selected === opt && pk.itemTextActive]}>{opt}</Text>
                {selected === opt && <Ionicons name="checkmark" size={16} color="#1565C0" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
const pk = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title:   { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  item:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  itemActive:     { backgroundColor: '#EFF6FF' },
  itemText:       { fontSize: 13, color: '#374151', flex: 1, paddingRight: 8 },
  itemTextActive: { color: '#1565C0', fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────
// MEDICINE ROW — single medication entry in the form
// ─────────────────────────────────────────────────────────────
function PatientLookup({ value, onChangeText, onSelect, editable = true }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const searchPatients = (text) => {
    onChangeText(text);
    if (!editable || text.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/patients?search=${encodeURIComponent(text.trim())}`);
        setResults((res.data.patients || []).slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const pickPatient = (patient) => {
    onSelect(patient);
    setResults([]);
  };

  return (
    <View style={pl.wrap}>
      <View style={[pl.searchBox, !editable && { opacity: 0.65 }]}>
        <Ionicons name="person-outline" size={16} color="#94A3B8" />
        <TextInput
          style={pl.input}
          placeholder="Search patient by name or ID *"
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={searchPatients}
          editable={editable}
          autoCapitalize="words"
        />
        {loading && <ActivityIndicator size="small" color="#1565C0" />}
      </View>
      {results.length > 0 && (
        <View style={pl.suggestions}>
          {results.map((patient) => {
            const pd = patient.patientDetails || {};
            return (
              <TouchableOpacity key={patient._id || patient.userId} style={pl.suggestion} onPress={() => pickPatient(patient)} activeOpacity={0.75}>
                <View style={pl.patientAvatar}>
                  <Text style={pl.patientAvatarText}>{getInitials(patient.name || '')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pl.patientName}>{patient.name}</Text>
                  <Text style={pl.patientMeta}>{patient.userId || 'Patient'}{pd.gender ? ` · ${pd.gender}` : ''}{pd.bloodGroup ? ` · ${pd.bloodGroup}` : ''}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const pl = StyleSheet.create({
  wrap: { zIndex: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#FAFBFC' },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, color: '#0F172A' },
  suggestions: { marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  patientAvatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  patientAvatarText: { color: '#1565C0', fontSize: 12, fontWeight: '800' },
  patientName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  patientMeta: { fontSize: 11, color: '#64748B', marginTop: 1 },
});

function MedRow({ med, idx, onChange, onRemove, isLast }) {
  const [drugSearch,  setDrugSearch]  = useState(med.name || '');
  const [drugResults, setDrugResults] = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [showDosage,  setShowDosage]  = useState(false);
  const [showDuration,setShowDuration]= useState(false);
  const debounceRef = useRef(null);

  const medType    = detectMedType(med.name, med.form);
  const dosages    = DOSAGE_BY_TYPE[medType] || DOSAGE_BY_TYPE.general;
  const typeColors = MED_TYPE_COLORS[medType];
  const isTrailingEmpty = !med.name.trim() && isLast;

  useEffect(() => {
    setDrugSearch(med.name || '');
  }, [med.name]);

  const stockBadge = (drug) => {
    const stock = Number(drug.totalStock ?? drug.stock ?? drug.quantity ?? 0);
    const reorderLevel = Number(drug.reorderLevel ?? 10);
    if (stock === 0) return { label: 'Out', style: mr.stockOut, text: mr.stockOutText };
    if (stock <= reorderLevel) return { label: `Low ${stock}`, style: mr.stockLow, text: mr.stockLowText };
    return { label: `${stock} units`, style: mr.stockOk, text: mr.stockOkText };
  };

  const formIconName = (form = '') => {
    const f = form.toLowerCase();
    if (f.includes('syrup') || f.includes('solution') || f.includes('drops')) return 'water-outline';
    if (f.includes('cream') || f.includes('ointment') || f.includes('gel')) return 'color-fill-outline';
    if (f.includes('injection')) return 'medical-outline';
    return 'medkit-outline';
  };

  const searchDrugs = (q) => {
    setDrugSearch(q);
    onChange(idx, 'name', q);
    setSearched(false);
    
    if (!q.trim()) {
      onChange(idx, 'drugId', '');
      onChange(idx, 'form', '');
      setDrugResults([]);
      setSearched(false);
      return;
    }
    
    if (q.trim().length < 2) {
      setDrugResults([]);
      return;
    }
    
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/drugs/search?q=${encodeURIComponent(q)}&limit=8`);
        if (res.data.success) {
          const drugs = res.data.drugs || [];
          setDrugResults(drugs);
        } else {
          setDrugResults([]);
        }
      } catch (err) {
        console.error('Medicine search error:', err);
        setDrugResults([]);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 300);
  };

  const selectDrug = (drug) => {
    const drugName = drug.name || '';
    const drugStrength = drug.strength || '';
    const fullName = drugStrength ? `${drugName} ${drugStrength}` : drugName;
    
    onChange(idx, 'name',   fullName);
    onChange(idx, 'drugId', drug._id || drug.drugId || '');
    onChange(idx, 'form',   drug.form || drug.type || '');
    setDrugSearch(fullName);
    setDrugResults([]);
    setSearched(false);
  };

  const clearDrug = () => {
    setDrugSearch('');
    setDrugResults([]);
    setSearched(false);
    onChange(idx, 'name', '');
    onChange(idx, 'drugId', '');
    onChange(idx, 'form', '');
  };

  return (
    <View style={[mr.wrap, isTrailingEmpty ? mr.wrapEmpty : mr.wrapFilled, drugResults.length > 0 && { zIndex: 100 }]}>
      {/* Row header */}
      <View style={mr.rowHeader}>
        {isTrailingEmpty ? (
          <View style={mr.addHint}>
            <Ionicons name="add-circle" size={15} color="#93C5FD" />
            <Text style={mr.addHintText}>Add another medicine...</Text>
          </View>
        ) : (
          <View style={mr.headerLeft}>
            <View style={mr.rowNumber}>
              <Text style={mr.rowNumberText}>{idx + 1}</Text>
            </View>
            <View style={[mr.typeBadge, { backgroundColor: typeColors.bg, borderColor: typeColors.border }]}>
              <Text style={[mr.typeBadgeText, { color: typeColors.text }]}>
                {medType.charAt(0).toUpperCase() + medType.slice(1)}
              </Text>
            </View>
          </View>
        )}
        {!isTrailingEmpty && (
          <TouchableOpacity onPress={() => onRemove(idx)} style={mr.removeBtn}>
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Drug search */}
      <Text style={mr.label}>Medicine Name & Strength</Text>
      <View style={mr.searchBox}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" />
        <TextInput
          style={mr.searchInput}
          placeholder="Search pharmacy catalog or type name..."
          placeholderTextColor="#94A3B8"
          value={drugSearch}
          onChangeText={searchDrugs}
          autoCapitalize="words"
        />
        {searching && <ActivityIndicator size="small" color="#1565C0" />}
        {!!drugSearch && !searching && (
          <TouchableOpacity onPress={clearDrug} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </View>

      {/* Drug suggestions */}
      {drugResults.length > 0 && (
        <ScrollView style={mr.suggestions} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
          <View style={mr.suggestionHeader}>
            <Text style={mr.suggestionHeaderText}>{drugResults.length} drug{drugResults.length !== 1 ? 's' : ''} found</Text>
            <Text style={mr.suggestionHeaderHint}>Select to link inventory</Text>
          </View>
          {drugResults.map((drug, i) => {
            const badge = stockBadge(drug);
            const name = drug.name || drug.medicineName || 'Medicine';
            const strength = drug.strength || '';
            const form = drug.form || drug.type || '';
            return (
              <TouchableOpacity key={drug._id || drug.drugId || i} style={mr.suggestion} onPress={() => selectDrug(drug)} activeOpacity={0.7}>
                <View style={mr.formIcon}>
                  <Ionicons name={formIconName(form)} size={17} color="#1565C0" />
                </View>
                <View style={mr.suggestionBody}>
                  <Text style={mr.suggestionName}>
                    {name}{!!strength && <Text style={mr.suggestionStrength}> {strength}</Text>}
                  </Text>
                  <View style={mr.suggestionMetaRow}>
                    {!!(drug.drugId || drug._id) && <Text style={mr.suggestionCode}>{drug.drugId || drug._id}</Text>}
                    {!!form && <Text style={mr.suggestionMeta}>{form}</Text>}
                    {!!drug.brand && <Text style={mr.suggestionMeta}>· {drug.brand}</Text>}
                  </View>
                </View>
                <View style={[mr.stockBadge, badge.style]}>
                  <Text style={[mr.stockBadgeText, badge.text]}>{badge.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={mr.suggestionFooter}>
            <Text style={mr.suggestionFooterText}>Can't find it? Type the name freely and continue.</Text>
          </View>
        </ScrollView>
      )}

      {searched && !searching && drugSearch.trim().length >= 2 && drugResults.length === 0 && (
        <View style={mr.noResults}>
          <Text style={mr.noResultsText}>No drugs found for "{drugSearch}".</Text>
          <Text style={mr.noResultsSub}>You can still type the name and continue.</Text>
        </View>
      )}

      {!isTrailingEmpty && (
        <>
      {/* Dosage */}
      <Text style={[mr.label, { marginTop: 10 }]}>Dosage Instructions</Text>
      <TouchableOpacity
        style={[mr.selectBtn, med.dosage && mr.selectBtnFilled]}
        onPress={() => setShowDosage(true)} activeOpacity={0.8}
      >
        <Text style={[mr.selectBtnText, !med.dosage && { color: '#94A3B8' }]} numberOfLines={1}>
          {med.dosage || 'Select dosage…'}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#94A3B8" />
      </TouchableOpacity>

      {/* Duration */}
      <Text style={[mr.label, { marginTop: 10 }]}>Duration</Text>
      <TouchableOpacity
        style={[mr.selectBtn, med.duration && mr.selectBtnFilled]}
        onPress={() => setShowDuration(true)} activeOpacity={0.8}
      >
        <Text style={[mr.selectBtnText, !med.duration && { color: '#94A3B8' }]}>
          {med.duration || 'Select duration…'}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#94A3B8" />
      </TouchableOpacity>

      <PickerModal visible={showDosage}  title="Dosage Instructions" options={dosages}          selected={med.dosage}   onSelect={v => onChange(idx,'dosage',v)}   onClose={() => setShowDosage(false)} />
      <PickerModal visible={showDuration} title="Duration"           options={DURATION_OPTIONS} selected={med.duration} onSelect={v => onChange(idx,'duration',v)} onClose={() => setShowDuration(false)} />
        </>
      )}
    </View>
  );
}

const mr = StyleSheet.create({
  wrap:        { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  wrapFilled:  { backgroundColor: '#EFF6FF66', borderColor: '#BFDBFE' },
  wrapEmpty:   { backgroundColor: '#EFF6FF22', borderColor: '#BFDBFE', borderStyle: 'dashed' },
  rowHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowNumber:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  rowNumberText: { color: '#1565C0', fontSize: 10, fontWeight: '900' },
  addHint:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addHintText: { color: '#93C5FD', fontSize: 11, fontWeight: '700' },
  typeBadge:   { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  removeBtn:   { padding: 4 },
  label:       { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  suggestions: { 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#F1F5F9', 
    borderRadius: 16, 
    marginTop: 6,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  suggestionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  suggestionHeaderText: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  suggestionHeaderHint: { fontSize: 10, color: '#CBD5E1', fontWeight: '600' },
  suggestion:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  formIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  suggestionBody: { flex: 1, minWidth: 0 },
  suggestionName: { fontSize: 13, color: '#0F172A', fontWeight: '800' },
  suggestionStrength: { color: '#64748B', fontWeight: '500' },
  suggestionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 },
  suggestionCode: { fontSize: 10.5, color: '#1D4ED8', fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  suggestionMeta: { fontSize: 10.5, color: '#94A3B8', fontWeight: '600' },
  stockBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 4, flexShrink: 0 },
  stockBadgeText: { fontSize: 10, fontWeight: '900' },
  stockOut: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  stockOutText: { color: '#DC2626' },
  stockLow: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  stockLowText: { color: '#B45309' },
  stockOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  stockOkText: { color: '#15803D' },
  suggestionFooter: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  suggestionFooterText: { color: '#94A3B8', fontSize: 11, lineHeight: 15 },
  noResults: { marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  noResultsText: { color: '#64748B', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  noResultsSub: { color: '#94A3B8', fontSize: 11, marginTop: 3, textAlign: 'center' },
  selectBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  selectBtnFilled: { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  selectBtnText: { fontSize: 13, color: '#0F172A', flex: 1, paddingRight: 6 },
});

// ─────────────────────────────────────────────────────────────
// PRESCRIPTION MODAL
// ─────────────────────────────────────────────────────────────
function PrescriptionModal({ visible, onClose, onSaved, doctorName, existing, prefill }) {
  const isEdit    = !!existing;
  const isPrefill = !!prefill && !isEdit;
  const EMPTY_MED = () => ({ name: '', drugId: '', form: '', dosage: '', duration: '' });

  const [patientName,   setPatientName]   = useState('');
  const [patientId,     setPatientId]     = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [medications,   setMedications]   = useState([EMPTY_MED()]);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [checkedTests,  setCheckedTests]  = useState({});
  const [testPriorities,setTestPriorities]= useState({});
  const [otherChecked,  setOtherChecked]  = useState(false);
  const [otherText,     setOtherText]     = useState('');
  const [otherPriority, setOtherPriority] = useState('Routine');
  const [labNotes,      setLabNotes]      = useState('');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [showLabOnly,   setShowLabOnly]   = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (!visible) return;
    setPatientName(existing?.patientName || prefill?.patientName || '');
    setPatientId(existing?.patientId || prefill?.patientId || '');
    setAppointmentId(existing?.appointmentId || prefill?.appointmentId || '');
    setClinicalNotes(existing?.clinicalNotes || '');
    setError('');
    setCheckedTests({}); setTestPriorities({});
    setOtherChecked(false); setOtherText(''); setOtherPriority('Routine'); setLabNotes('');
    setMedications(
      existing?.medications?.length
        ? [...existing.medications.map(m => ({ ...m, form: m.form || '' })), EMPTY_MED()]
        : [EMPTY_MED()]
    );
  }, [visible]);

  const normalizeMeds = (list) => {
    const filled = list.filter(m => m.name.trim());
    return filled.length === 0 ? [EMPTY_MED()] : [...filled, EMPTY_MED()];
  };

  const updateMed = (i, field, val) => {
    setMedications(prev => {
      const updated = prev.map((m, idx) => {
        if (idx !== i) return m;
        const next = { ...m, [field]: val };
        if (field === 'name') {
          const oldType = detectMedType(m.name, m.form || '');
          const nextType = detectMedType(val, next.form || '');
          next.drugId = val.trim() ? next.drugId : '';
          next.form = val.trim() ? next.form : '';
          if (oldType !== nextType) next.dosage = '';
        }
        if (field === 'form') {
          const oldType = detectMedType(m.name, m.form || '');
          const nextType = detectMedType(next.name, val || '');
          if (oldType !== nextType) next.dosage = '';
        }
        return next;
      });
      return field === 'name' ? normalizeMeds(updated) : updated;
    });
  };
  const removeMed = (i) => setMedications(prev => normalizeMeds(prev.filter((_, idx) => idx !== i)));

  const toggleTest = (t) => {
    const nowChecked = !checkedTests[t];
    setCheckedTests(prev => ({ ...prev, [t]: nowChecked }));
    if (nowChecked) setTestPriorities(prev => ({ ...prev, [t]: prev[t] || 'Routine' }));
  };

  const selectedTests = Object.entries(checkedTests).filter(([, v]) => v).map(([k]) => k);
  const anyLabSelected = selectedTests.length > 0 || (otherChecked && otherText.trim());
  const urgentCount    = selectedTests.filter(n => testPriorities[n] === 'Urgent').length
                       + (otherChecked && otherText.trim() && otherPriority === 'Urgent' ? 1 : 0);

  const handleSubmit = async () => {
    setError('');
    if (!patientName.trim()) return setError('Patient name is required.');
    const filledMeds = medications.filter(m => m.name.trim());
    if (filledMeds.some(m => !m.dosage))    return setError('Please fill in dosage for all medications.');
    if (filledMeds.some(m => !m.duration))  return setError('Please fill in duration for all medications.');
    if (!isEdit && !filledMeds.length && !anyLabSelected) return setError('Add at least one medication or select a lab test.');
    if (!isEdit && otherChecked && !otherText.trim()) return setError('Please describe the custom lab test.');
    if (!isEdit && !filledMeds.length && anyLabSelected) { setShowLabOnly(true); return; }
    await doSave(filledMeds);
  };

  const doSave = async (filledMeds) => {
    const labTests = isEdit ? undefined : [
      ...selectedTests.map(n => ({ name: n, isOther: false, price: LAB_TEST_PRICES[n] || 0, priority: testPriorities[n] || 'Routine' })),
      ...(otherChecked && otherText.trim() ? [{ name: otherText.trim(), isOther: true, price: OTHER_PRICE, priority: otherPriority }] : []),
    ];
    const overallPriority = labTests?.some(t => t.priority === 'Urgent') ? 'Urgent' : 'Routine';
    setSaving(true);
    try {
      const payload = {
        patientName: patientName.trim(), patientId: patientId || undefined,
        appointmentId: appointmentId.trim() || undefined,
        medications: filledMeds, clinicalNotes: clinicalNotes.trim(),
        ...(!isEdit && { labTests, labPriority: labTests?.length > 0 ? overallPriority : undefined, labNotes: labTests?.length > 0 ? labNotes.trim() : undefined }),
      };
      const res = isEdit
        ? await api.put(`/prescriptions/${existing._id}`, payload)
        : await api.post('/prescriptions', payload);
      onSaved(res.data.prescription, isEdit);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || (isEdit ? 'Failed to update.' : 'Failed to issue prescription.'));
    } finally { setSaving(false); }
  };

  const handleLabOnlyConfirm = async () => {
    setShowLabOnly(false);
    const labTests = [
      ...selectedTests.map(n => ({ name: n, isOther: false, price: LAB_TEST_PRICES[n] || 0, priority: testPriorities[n] || 'Routine' })),
      ...(otherChecked && otherText.trim() ? [{ name: otherText.trim(), isOther: true, price: OTHER_PRICE, priority: otherPriority }] : []),
    ];
    const priority = labTests.some(t => t.priority === 'Urgent') ? 'Urgent' : 'Routine';
    setSaving(true);
    try {
      await api.post('/lab-requests', {
        patientName: patientName.trim(), patientId: patientId || undefined,
        appointmentNumber: appointmentId.trim() || undefined,
        tests: labTests, priority, clinicalNotes: clinicalNotes.trim() || labNotes.trim(),
      });
      onSaved(null, false);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lab request.');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Lab-only confirm */}
      {showLabOnly && (
        <Modal visible transparent animationType="fade">
          <View style={pm.labOnlyOverlay}>
            <View style={pm.labOnlySheet}>
              <View style={pm.labOnlyIcon}><Text style={{ fontSize: 26 }}>⚠️</Text></View>
              <Text style={pm.labOnlyTitle}>No Medicines Added</Text>
              <Text style={pm.labOnlyDesc}>
                No medications added for <Text style={{ fontWeight: '700' }}>{patientName || 'this patient'}</Text>. This will create a <Text style={{ fontWeight: '700' }}>standalone lab request</Text> — no prescription will be issued.
              </Text>
              <View style={pm.labTestPreview}>
                {selectedTests.map((t, i) => (
                  <View key={i} style={pm.labTestRow}>
                    <Text style={pm.labTestName}>{t}</Text>
                    <View style={[pm.priorityBadge, testPriorities[t] === 'Urgent' && pm.priorityBadgeUrgent]}>
                      <Text style={[pm.priorityText, testPriorities[t] === 'Urgent' && { color: '#DC2626' }]}>{testPriorities[t] || 'Routine'}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={pm.labOnlyBtns}>
                <TouchableOpacity style={pm.labOnlyBtnCancel} onPress={() => setShowLabOnly(false)}>
                  <Text style={pm.labOnlyBtnCancelText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pm.labOnlyBtnConfirm} onPress={handleLabOnlyConfirm}>
                  <Text style={pm.labOnlyBtnConfirmText}>Send to Lab</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <View style={pm.root}>
        {/* Header */}
        <LinearGradient colors={['#0D2137', '#1565C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pm.header}>
          <View>
            <Text style={pm.headerTitle}>{isEdit ? 'Edit Prescription' : 'Issue New Prescription'}</Text>
            <Text style={pm.headerSub}>People's Health Care · {doctorName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={pm.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Error */}
          {!!error && (
            <View style={pm.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={pm.errorText}>{error}</Text>
            </View>
          )}

          {/* Prefill banner */}
          {isPrefill && (
            <View style={pm.prefillBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#1565C0" />
              <View>
                <Text style={pm.prefillTitle}>Auto-filled from appointment</Text>
                <Text style={pm.prefillSub}>Patient details have been pre-populated</Text>
              </View>
            </View>
          )}

          {/* Timestamp */}
          <View style={pm.timestampRow}>
            <Ionicons name="time-outline" size={14} color="#94A3B8" />
            <Text style={pm.timestampText}>Timestamped: <Text style={{ color: '#374151', fontWeight: '600' }}>{formatDateTime(new Date().toISOString())}</Text></Text>
          </View>

          {/* Patient Info */}
          <Text style={pm.sectionLabel}>Patient Information</Text>
          <PatientLookup
            value={patientName}
            onChangeText={(text) => {
              setPatientName(text);
              setPatientId('');
            }}
            onSelect={(patient) => {
              setPatientName(patient.name || '');
              setPatientId(patient.userId || patient._id || '');
            }}
            editable={!isEdit}
          />
          <TextInput style={[pm.input, { marginTop: 8 }]} placeholder="Appointment ID (optional)" placeholderTextColor="#94A3B8" value={appointmentId} onChangeText={setAppointmentId} autoCapitalize="characters" />

          {/* Medications */}
          <Text style={pm.sectionLabel}>Medications</Text>
          {medications.map((med, i) => (
            <MedRow
              key={i} med={med} idx={i}
              onChange={updateMed}
              onRemove={removeMed}
              isLast={i === medications.length - 1}
            />
          ))}

          {/* Lab Tests (new only) */}
          {!isEdit && (
            <>
              <Text style={pm.sectionLabel}>Lab Tests (Optional)</Text>
              <View style={pm.labTestsCard}>
                {LAB_TESTS.map(test => {
                  const checked = !!checkedTests[test];
                  const priority = testPriorities[test] || 'Routine';
                  return (
                    <View key={test} style={pm.labTestItem}>
                      <TouchableOpacity style={pm.labTestCheck} onPress={() => toggleTest(test)} activeOpacity={0.7}>
                        <View style={[pm.checkbox, checked && pm.checkboxOn]}>
                          {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <View>
                          <Text style={pm.labTestName}>{test}</Text>
                        </View>
                      </TouchableOpacity>
                      {checked && (
                        <View style={pm.priorityToggle}>
                          {['Routine', 'Urgent'].map(p => (
                            <TouchableOpacity
                              key={p}
                              style={[pm.priorityBtn, priority === p && (p === 'Urgent' ? pm.priorityBtnUrgent : pm.priorityBtnRoutine)]}
                              onPress={() => setTestPriorities(prev => ({ ...prev, [test]: p }))}
                              activeOpacity={0.8}
                            >
                              <Text style={[pm.priorityBtnText, priority === p && { color: p === 'Urgent' ? '#DC2626' : '#1D4ED8' }]}>{p}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Other test */}
                <View style={pm.labTestItem}>
                  <TouchableOpacity style={pm.labTestCheck} onPress={() => setOtherChecked(!otherChecked)} activeOpacity={0.7}>
                    <View style={[pm.checkbox, otherChecked && pm.checkboxOn]}>
                      {otherChecked && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={pm.labTestName}>Other (Custom)</Text>
                  </TouchableOpacity>
                </View>
                {otherChecked && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
                    <TextInput style={pm.input} placeholder="Describe the test…" placeholderTextColor="#94A3B8" value={otherText} onChangeText={setOtherText} />
                    <View style={pm.priorityToggle}>
                      {['Routine', 'Urgent'].map(p => (
                        <TouchableOpacity key={p} style={[pm.priorityBtn, otherPriority === p && (p === 'Urgent' ? pm.priorityBtnUrgent : pm.priorityBtnRoutine)]} onPress={() => setOtherPriority(p)} activeOpacity={0.8}>
                          <Text style={[pm.priorityBtnText, otherPriority === p && { color: p === 'Urgent' ? '#DC2626' : '#1D4ED8' }]}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
              {urgentCount > 0 && (
                <View style={pm.urgentBanner}>
                  <Text style={pm.urgentText}>🚨 {urgentCount} urgent test{urgentCount > 1 ? 's' : ''} — lab will be notified immediately</Text>
                </View>
              )}
            </>
          )}

          {/* Clinical Notes */}
          <Text style={pm.sectionLabel}>Clinical Notes</Text>
          <TextInput
            style={[pm.input, { height: 88, textAlignVertical: 'top' }]}
            placeholder="Additional instructions, dietary advice, follow-up schedule…"
            placeholderTextColor="#94A3B8"
            value={clinicalNotes} onChangeText={setClinicalNotes}
            multiline
          />

          {/* Routing summary */}
          <View style={pm.routingCard}>
            <View style={pm.routingRow}>
              <Text style={{ fontSize: 18 }}>💊</Text>
              <Text style={pm.routingText}><Text style={{ fontWeight: '700' }}>Pharmacy</Text> — receives medications list automatically</Text>
            </View>
            {!isEdit && anyLabSelected && (
              <View style={[pm.routingRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                <Text style={{ fontSize: 18 }}>🧪</Text>
                <Text style={pm.routingText}>
                  <Text style={{ fontWeight: '700' }}>Lab</Text> — receives lab request automatically{urgentCount > 0 ? ' 🚨 Urgent' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={pm.actions}>
            <TouchableOpacity style={pm.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={pm.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[pm.submitBtn, saving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pm.submitGrad}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={pm.submitText}>{isEdit ? 'Save Changes' : 'Issue Prescription'}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 18 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 17 },
  headerSub:   { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 12, marginBottom: 14 },
  errorText: { flex: 1, color: '#DC2626', fontSize: 13 },
  prefillBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 14, padding: 12, marginBottom: 14 },
  prefillTitle: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
  prefillSub:   { fontSize: 11, color: '#3B82F6', marginTop: 1 },
  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 18 },
  timestampText: { fontSize: 12, color: '#94A3B8' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 18 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 13, color: '#0F172A' },
  labTestsCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  labTestItem:  { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  labTestCheck: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox:    { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxOn:  { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  labTestName:  { fontSize: 13, fontWeight: '500', color: '#0F172A' },
  priorityToggle: { flexDirection: 'row', gap: 6, marginTop: 8, marginLeft: 32 },
  priorityBtn: { flex: 1, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
  priorityBtnRoutine: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  priorityBtnUrgent:  { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  priorityBtnText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  priorityBadge: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  priorityBadgeUrgent: { backgroundColor: '#FEF2F2' },
  priorityText: { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },
  urgentBanner: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#FECACA' },
  urgentText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  routingCard: { backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', marginTop: 4 },
  routingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  routingText: { fontSize: 12, color: '#374151', flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  submitBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  submitGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Lab-only confirm
  labOnlyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  labOnlySheet: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%' },
  labOnlyIcon:  { width: 52, height: 52, borderRadius: 14, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  labOnlyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  labOnlyDesc:  { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 16 },
  labTestPreview: { backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', overflow: 'hidden', marginBottom: 12 },
  labTestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#FEF9C3' },
  labOnlyBtns: { flexDirection: 'row', gap: 10 },
  labOnlyBtnCancel:  { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  labOnlyBtnCancelText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  labOnlyBtnConfirm: { flex: 1, backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  labOnlyBtnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────
// CANCEL MODAL
// ─────────────────────────────────────────────────────────────
function CancelModal({ rx, labRequest, onConfirm, onClose }) {
  const [cancelLab, setCancelLab] = useState(false);
  const hasLab     = !!rx.labRequestRef;
  const labLocked  = labRequest && labRequest !== 'loading' && labRequest?.status !== 'pending';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={cm.overlay}>
        <View style={cm.sheet}>
          <View style={cm.iconBox}><Ionicons name="trash-outline" size={24} color="#EF4444" /></View>
          <Text style={cm.title}>Cancel Prescription?</Text>
          <Text style={cm.desc}>
            <Text style={cm.mono}>{rx.prescriptionId}</Text> for <Text style={{ fontWeight: '700' }}>{rx.patientName}</Text> will be permanently deleted.
          </Text>

          {hasLab && (
            <View style={{ marginVertical: 12 }}>
              {labLocked ? (
                <View style={cm.labLocked}>
                  <Text style={{ fontSize: 18 }}>🧪</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={cm.labLockedTitle}>Lab request cannot be cancelled</Text>
                    <Text style={cm.labLockedSub}>{rx.labRequestRef} is already {labRequest?.status?.replace('_', ' ')} — lab staff are working on it.</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[cm.labCheckRow, cancelLab && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }]}
                  onPress={() => setCancelLab(!cancelLab)} activeOpacity={0.8}
                >
                  <View style={[cm.checkbox, cancelLab && { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}>
                    {cancelLab && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <View>
                    <Text style={cm.labCheckTitle}>Also cancel the linked lab request</Text>
                    <Text style={cm.labCheckMono}>{rx.labRequestRef}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={cm.btns}>
            <TouchableOpacity style={cm.keepBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={cm.keepText}>Keep</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cm.deleteBtn} onPress={() => onConfirm(cancelLab && !labLocked)} activeOpacity={0.85}>
              <Text style={cm.deleteText}>{cancelLab && !labLocked ? 'Cancel Both' : 'Cancel Prescription'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%' },
  iconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title:   { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  desc:    { fontSize: 13, color: '#64748B', lineHeight: 20 },
  mono:    { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', color: '#1D4ED8', fontWeight: '700' },
  labLocked: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' },
  labLockedTitle: { fontSize: 12, fontWeight: '700', color: '#B45309' },
  labLockedSub:   { fontSize: 11, color: '#D97706', marginTop: 2 },
  labCheckRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  labCheckTitle: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  labCheckMono:  { fontSize: 11, color: '#94A3B8', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', marginTop: 2 },
  btns:    { flexDirection: 'row', gap: 10, marginTop: 18 },
  keepBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  keepText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  deleteBtn: { flex: 1, backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  deleteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─────────────────────────────────────────────────────────────
// PRESCRIPTION CARD — expandable
// ─────────────────────────────────────────────────────────────
function PrescriptionCard({ rx, expanded, onToggle, onEdit, onCancel, labData, labResults, onOpenLab }) {
  const ps = PHARMACY_STATUS[rx.pharmacyStatus] ?? PHARMACY_STATUS.pending;
  const ls = rx.labRequestRef ? (LAB_STATUS[labData?.status] ?? LAB_STATUS.pending) : null;
  const isCancelling = false;

  return (
    <View style={pc.card}>
      {/* Card header — always visible */}
      <TouchableOpacity style={pc.header} onPress={onToggle} activeOpacity={0.8}>
        <LinearGradient colors={['#1565C0', '#00ACC1']} style={pc.avatar}>
          <Text style={pc.avatarText}>{getInitials(rx.patientName)}</Text>
        </LinearGradient>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={onToggle} activeOpacity={0.75}>
              <Text style={pc.rxId} numberOfLines={1}>{rx.prescriptionId}</Text>
            </TouchableOpacity>
            {rx.labRequestRef && (
              <View style={pc.labBadge}>
                <Text style={pc.labBadgeText}>🧪 Lab</Text>
              </View>
            )}
          </View>
          <Text style={pc.patientName} numberOfLines={1}>{rx.patientName}</Text>
          <Text style={pc.timestamp}>{formatDateTime(rx.createdAt)}</Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={[pc.statusBadge, { backgroundColor: ps.bg, borderColor: ps.border }]}>
            <View style={[pc.statusDot, { backgroundColor: ps.dot }]} />
            <Text style={[pc.statusText, { color: ps.text }]}>{ps.label}</Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>

      {/* Expanded detail */}
      {expanded && (
        <View style={pc.body}>
          {/* Medications */}
          {rx.medications?.filter(m => m.name).length > 0 && (
            <View style={pc.section}>
              <Text style={pc.sectionTitle}>💊 Medications</Text>
              {rx.medications.filter(m => m.name).map((med, i) => {
                const mt = detectMedType(med.name, med.form);
                const tc = MED_TYPE_COLORS[mt];
                return (
                  <View key={i} style={pc.medRow}>
                    <View style={[pc.medTypePill, { backgroundColor: tc.bg, borderColor: tc.border }]}>
                      <Text style={[pc.medTypePillText, { color: tc.text }]}>{mt}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={pc.medName}>{med.name}</Text>
                      <Text style={pc.medDetail}>{med.dosage}</Text>
                      <Text style={pc.medDetail}>Duration: {med.duration}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Lab Request */}
          {rx.labRequestRef && (
            <View style={pc.section}>
              <Text style={pc.sectionTitle}>🧪 Lab Request</Text>
              {labData === 'loading' ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : labData ? (
                <View style={pc.labCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <TouchableOpacity onPress={() => onOpenLab(labData.labRequestId || rx.labRequestRef)} activeOpacity={0.75}>
                      <Text style={pc.labId}>{labData.labRequestId}</Text>
                    </TouchableOpacity>
                    {ls && (
                      <View style={[pc.statusBadge, { backgroundColor: ls.bg, borderColor: ls.border }]}>
                        <Text style={[pc.statusText, { color: ls.text }]}>{ls.label}</Text>
                      </View>
                    )}
                  </View>
                  {labData.tests?.map((test, i) => (
                    <View key={i} style={pc.labTest}>
                      <View style={pc.labTestDot} />
                      <Text style={pc.labTestName}>{test.name || test.testName}</Text>
                      {test.priority === 'Urgent' && (
                        <View style={pc.urgentBadge}><Text style={pc.urgentBadgeText}>Urgent</Text></View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={pc.labMissing}>Lab request not found</Text>
              )}
            </View>
          )}

          {/* Clinical Notes */}
          {!!rx.clinicalNotes && (
            <View style={pc.section}>
              <Text style={pc.sectionTitle}>📋 Clinical Notes</Text>
              <Text style={pc.notesText}>{rx.clinicalNotes}</Text>
            </View>
          )}

          {/* Actions */}
          {rx.pharmacyStatus !== 'cancelled' && (
            <View style={pc.actions}>
              <TouchableOpacity
                style={pc.editBtn}
                onPress={() => onEdit(rx)}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil-outline" size={14} color="#1565C0" />
                <Text style={pc.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[pc.cancelBtn, rx.pharmacyStatus !== 'pending' && { opacity: 0.4 }]}
                onPress={() => rx.pharmacyStatus === 'pending' && onCancel(rx)}
                activeOpacity={rx.pharmacyStatus === 'pending' ? 0.8 : 1}
              >
                <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                <Text style={pc.cancelBtnText}>
                  {rx.pharmacyStatus === 'pending' ? 'Cancel Rx' : 'Cannot Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const pc = StyleSheet.create({
  card:   { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rxId:   { fontSize: 13, fontWeight: '700', color: '#1D4ED8', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  labBadge: { backgroundColor: '#F5F3FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#DDD6FE' },
  labBadgeText: { fontSize: 10, fontWeight: '600', color: '#6D28D9' },
  patientName: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginTop: 1 },
  timestamp: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontWeight: '700' },
  body: { borderTopWidth: 1, borderTopColor: '#F8FAFC', padding: 16 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  medRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  medTypePill: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0, marginTop: 2 },
  medTypePillText: { fontSize: 10, fontWeight: '700' },
  medName:   { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  medDetail: { fontSize: 11, color: '#64748B', marginTop: 1 },
  labCard: { backgroundColor: '#F5F3FF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#DDD6FE' },
  labId:   { fontSize: 12, fontWeight: '700', color: '#6D28D9', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  labTest: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  labTestDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8B5CF6', flexShrink: 0 },
  labTestName: { fontSize: 12, color: '#374151', flex: 1 },
  urgentBadge: { backgroundColor: '#FEF2F2', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#FECACA' },
  urgentBadgeText: { fontSize: 9, fontWeight: '700', color: '#DC2626' },
  labMissing: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  notesText: { fontSize: 13, color: '#374151', lineHeight: 20, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  editBtnText: { color: '#1565C0', fontWeight: '600', fontSize: 13 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#FECACA' },
  cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <View style={[ts.box, type === 'success' ? ts.success : ts.error]}>
      <Ionicons name={type === 'success' ? 'checkmark-circle' : 'close-circle'} size={16} color={type === 'success' ? '#15803D' : '#B91C1C'} />
      <Text style={[ts.text, { color: type === 'success' ? '#15803D' : '#B91C1C' }]}>{msg}</Text>
    </View>
  );
}
const ts = StyleSheet.create({
  box:     { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 40, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, zIndex: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 8 },
  success: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  error:   { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  text:    { fontSize: 13, fontWeight: '500', flex: 1 },
});

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function DoctorPrescriptions() {
  const navigation = useNavigation();
  const route = useRoute();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [editRx,        setEditRx]        = useState(null);
  const [expandedId,    setExpandedId]    = useState(null);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [cancelTarget,  setCancelTarget]  = useState(null);
  const [toast,         setToast]         = useState(null);
  const [labCache,      setLabCache]      = useState({});
  const [prefillData,   setPrefillData]   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPrescriptions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/prescriptions');
      setPrescriptions(res.data.prescriptions || []);
    } catch { showToast('Failed to load prescriptions', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPrescriptions(); }, []);
  useEffect(() => {
    const id = setInterval(() => loadPrescriptions(true), 5_000);
    return () => clearInterval(id);
  }, [loadPrescriptions]);

  useEffect(() => {
    const params = route.params || {};
    if (params.prefill) {
      setPrefillData(params.prefill);
      setEditRx(null);
      setShowModal(true);
      navigation.setParams({ prefill: undefined });
    }
    if (params.newPrescription) {
      setPrefillData(null);
      setEditRx(null);
      setShowModal(true);
      navigation.setParams({ newPrescription: undefined });
    }
  }, [route.params?.prefill, route.params?.newPrescription, navigation]);

  useEffect(() => {
    const openId = route.params?.openId;
    if (!openId || prescriptions.length === 0) return;
    const rx = prescriptions.find(p => p._id === openId || p.prescriptionId === openId);
    if (rx) {
      setExpandedId(rx._id);
      navigation.setParams({ openId: undefined });
    }
  }, [route.params?.openId, prescriptions, navigation]);

  // Auto-fetch lab when card expands
  useEffect(() => {
    if (!expandedId) return;
    const rx = prescriptions.find(p => p._id === expandedId);
    if (!rx?.labRequestRef || labCache[expandedId]) return;
    setLabCache(prev => ({ ...prev, [expandedId]: 'loading' }));
    api.get(`/lab-requests/${rx.labRequestId || rx.labRequestRef}`)
      .then(res => setLabCache(prev => ({ ...prev, [expandedId]: res.data.labRequest || res.data })))
      .catch(() => setLabCache(prev => ({ ...prev, [expandedId]: null })));
  }, [expandedId, prescriptions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions(true);
    setRefreshing(false);
  };

  const handleSaved = (rx, isEdit) => {
    if (!rx) { showToast('Lab request created successfully'); return; }
    if (isEdit) {
      setPrescriptions(prev => prev.map(p => p._id === rx._id ? rx : p));
      showToast('Prescription updated successfully');
    } else {
      setPrescriptions(prev => [rx, ...prev]);
      showToast(`Prescription ${rx.prescriptionId} issued successfully`);
    }
  };

  const handleConfirmCancel = async (cancelLabToo) => {
    const rx = cancelTarget;
    setCancelTarget(null);
    try {
      await api.delete(`/prescriptions/${rx._id}/cancel`, { data: { cancelLabToo } });
      setPrescriptions(prev => prev.filter(p => p._id !== rx._id));
      if (cancelLabToo) setLabCache(prev => { const n = { ...prev }; delete n[rx._id]; return n; });
      showToast(cancelLabToo ? 'Prescription and lab request removed' : 'Prescription removed');
    } catch (err) { showToast(err.response?.data?.message || 'Failed to cancel', 'error'); }
  };

  const filtered = prescriptions.filter(rx => {
    const searchLower = search.toLowerCase();
    const matchPatient = rx.patientName?.toLowerCase().includes(searchLower);
    const matchRxId = rx.prescriptionId?.includes(search);
    const matchApptId = rx.appointmentId?.includes(search);
    
    // Search in medications array - check if any medicine name matches
    const matchMedicine = rx.medications?.some(med => 
      med.name?.toLowerCase().includes(searchLower)
    );
    
    const matchSearch = matchPatient || matchRxId || matchApptId || matchMedicine;
    const matchStatus = statusFilter === 'all' || rx.pharmacyStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const total      = prescriptions.length;
  const pending    = prescriptions.filter(p => p.pharmacyStatus === 'pending').length;
  const dispensed  = prescriptions.filter(p => p.pharmacyStatus === 'dispensed').length;
  const cancelled  = prescriptions.filter(p => p.pharmacyStatus === 'cancelled').length;
  const activeTotal = total - cancelled;

  return (
    <View style={s.root}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Cancel Modal */}
      {cancelTarget && (
        <CancelModal
          rx={cancelTarget}
          labRequest={labCache[cancelTarget._id]}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {/* Prescription Modal */}
      <PrescriptionModal
        visible={showModal || !!editRx}
        onClose={() => { setShowModal(false); setEditRx(null); setPrefillData(null); }}
        onSaved={handleSaved}
        doctorName="Doctor"
        existing={editRx}
        prefill={showModal && !editRx ? prefillData : null}
      />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" />}
      >
        {/* Header */}
        <LinearGradient colors={['#0D2137', '#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
          <View>
            <Text style={s.headerTitle}>Prescription Management</Text>
            <Text style={s.headerSub}>Issue and manage patient prescriptions</Text>
          </View>
          <TouchableOpacity style={s.issueBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#1565C0" />
            <Text style={s.issueBtnText}>Issue Rx</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={s.body}>
          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Total',    value: activeTotal, color: '#1565C0' },
              { label: 'Pending',  value: pending,     color: '#C2410C' },
              { label: 'Dispensed',value: dispensed,   color: '#15803D' },
              { label: 'Cancelled',value: cancelled,   color: '#64748B' },
            ].map(st => (
              <View key={st.label} style={s.statCard}>
                <Text style={[s.statNum, { color: st.color }]}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Search + Filters */}
          <View style={s.filterCard}>
            <View style={s.searchRow}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" />
              <TextInput
                style={s.searchInput}
                placeholder="Search patient, RX ID, appointment…"
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <View style={s.filterTabs}>
              {[['all','All'], ['pending','Pending'], ['in_progress','In Progress'], ['dispensed','Dispensed']].map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  style={[s.filterTab, statusFilter === val && s.filterTabActive]}
                  onPress={() => setStatusFilter(val)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.filterTabText, statusFilter === val && s.filterTabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* List */}
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator color="#1565C0" size="large" />
              <Text style={s.loadingText}>Loading prescriptions…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>💊</Text>
              <Text style={s.emptyTitle}>No prescriptions found</Text>
              <Text style={s.emptySub}>{search ? 'Try a different search term.' : 'Issue a prescription to get started.'}</Text>
            </View>
          ) : (
            filtered.map(rx => (
              <PrescriptionCard
                key={rx._id}
                rx={rx}
                expanded={expandedId === rx._id}
                onToggle={() => setExpandedId(expandedId === rx._id ? null : rx._id)}
                onEdit={(r) => { setEditRx(r); }}
                onCancel={(r) => setCancelTarget(r)}
                labData={labCache[rx._id]}
                labResults={[]}
                onOpenLab={(id) => navigation.navigate('DoctorLab', { initialTab: 'requests', openRequestId: id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3 },
  issueBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 5, paddingVertical: 5 },
  issueBtnText: { color: '#1565C0', fontWeight: '700', fontSize: 12 },
  body: { padding: 14, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statNum:  { fontSize: 22, fontWeight: '900' },
  statLabel:{ fontSize: 10, color: '#64748B', marginTop: 2 },
  filterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9', gap: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  filterTabs: { flexDirection: 'row', gap: 6 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' },
  filterTabActive: { backgroundColor: '#1565C0' },
  filterTabText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  filterTabTextActive: { color: '#fff' },
  loadingBox: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { color: '#94A3B8', fontSize: 13, marginTop: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
});
