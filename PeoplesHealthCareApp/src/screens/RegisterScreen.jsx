import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StatusBar, KeyboardAvoidingView,
  Platform, Image, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const LOGO = require('../../assets/Logo.png');

const STEPS = ['Account', 'Personal Info', 'Medical Info'];

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function StepIndicator({ current }) {
  return (
    <View style={si.row}>
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <View key={step} style={si.stepWrap}>
            <View style={si.stepInner}>
              <View style={[si.circle, done && si.circleDone, active && si.circleActive]}>
                <Text style={[si.circleText, (done || active) && { color: '#fff' }]}>
                  {done ? '✓' : `${i + 1}`}
                </Text>
              </View>
              <Text style={[si.label, active && si.labelActive, done && si.labelDone]}>{step}</Text>
            </View>
            {i < STEPS.length - 1 && <View style={[si.line, done && si.lineDone]} />}
          </View>
        );
      })}
    </View>
  );
}

function InputField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, hint, required = true, multiline }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label} {required && <Text style={{ color: '#F87171' }}>*</Text>}</Text>
      <TextInput
        style={[f.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {!!hint && <Text style={f.hint}>{hint}</Text>}
    </View>
  );
}

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateString(value) {
  if (!value) return new Date(2000, 0, 1);

  const parsed = new Date(`${value}T00:00:00`);
  if (isNaN(parsed.getTime())) return new Date(2000, 0, 1);

  return parsed;
}

function getMaxBirthDate() {
  const today = new Date();
  today.setDate(today.getDate() - 1);
  today.setHours(0, 0, 0, 0);
  return today;
}

function DateOfBirthField({ label, value, onChange, hint, required = true }) {
  const [showPicker, setShowPicker] = useState(false);

  const selectedDate = parseDateString(value);
  const maxDate = getMaxBirthDate();

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event?.type === 'dismissed') return;

    if (date) {
      const picked = new Date(date);
      picked.setHours(0, 0, 0, 0);
      onChange(formatDateForInput(picked));
    }
  };

  return (
    <View style={f.wrap}>
      <Text style={f.label}>
        {label} {required && <Text style={{ color: '#F87171' }}>*</Text>}
      </Text>

      <TouchableOpacity
        style={[f.select, showPicker && { borderColor: '#3B82F6' }]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? f.selectVal : f.selectPh}>
          {value || 'Select date of birth…'}
        </Text>
        <Text style={{ color: '#94A3B8', fontSize: 12 }}>📅</Text>
      </TouchableOpacity>

      {!!hint && <Text style={f.hint}>{hint}</Text>}

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
          maximumDate={maxDate}
          onChange={handleDateChange}
        />
      )}

      {Platform.OS === 'ios' && showPicker && (
        <TouchableOpacity
          style={f.dateDoneBtn}
          onPress={() => setShowPicker(false)}
          activeOpacity={0.85}
        >
          <Text style={f.dateDoneText}>Done Selecting Birthday</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SelectField({ label, options, value, onSelect, required = true }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label} {required && <Text style={{ color: '#F87171' }}>*</Text>}</Text>
      <TouchableOpacity
        style={[f.select, open && { borderColor: '#3B82F6' }]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <Text style={value ? f.selectVal : f.selectPh}>{value || 'Select…'}</Text>
        <Text style={{ color: '#94A3B8', fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={f.dropdown}>
          {options.map(o => (
            <TouchableOpacity
              key={o}
              style={[f.dropItem, value === o && f.dropItemActive]}
              onPress={() => { onSelect(o); setOpen(false); }}
            >
              <Text style={[f.dropText, value === o && f.dropTextActive]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function RegisterScreen() {
  const navigation    = useNavigation();
  const { login }     = useAuth();
  const [step, setStep]       = useState(0);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed]   = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    telephone: '', gender: '', dateOfBirth: '',
    emergencyContactName: '', emergencyContactNumber: '',
    address: '', bloodGroup: '', allergies: '',
    chronicConditions: '', currentMedications: '',
  });

  const set = k => v => setFormData(p => ({ ...p, [k]: v }));
  const age     = calcAge(formData.dateOfBirth);
  const isMinor = age !== null && age < 18;

  const validateStep = () => {
    setError('');
    if (step === 0) {
      if (!formData.name.trim())      return setError('Full name is required.') || false;
      if (!formData.email.trim())     return setError('Email address is required.') || false;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return setError('Please enter a valid email address.') || false;
      if (!formData.telephone.trim()) return setError('Telephone number is required.') || false;
      if (!/^\d{10}$/.test(formData.telephone.trim())) return setError('Telephone must be exactly 10 digits (e.g. 0712345678).') || false;
      if (!formData.password)         return setError('Password is required.') || false;
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(formData.password))
        return setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.') || false;
      if (!formData.confirmPassword)  return setError('Please confirm your password.') || false;
      if (formData.password !== formData.confirmPassword) return setError('Passwords do not match. Please re-enter.') || false;
    }
    if (step === 1) {
      if (!formData.gender)      return setError('Please select your gender.') || false;
      if (!formData.dateOfBirth) return setError('Date of birth is required. Use format YYYY-MM-DD.') || false;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(formData.dateOfBirth) >= today) return setError('Date of birth must be before today.') || false;
      if (isMinor) {
        if (!formData.emergencyContactName.trim())   return setError('Emergency contact name is required for patients under 18.') || false;
        if (!formData.emergencyContactNumber.trim()) return setError('Emergency contact number is required for patients under 18.') || false;
      }
      if (formData.emergencyContactNumber.trim() && !/^\d{10}$/.test(formData.emergencyContactNumber.trim()))
        return setError('Emergency contact number must be exactly 10 digits.') || false;
    }
    if (step === 2 && !agreed) return setError('You must agree to the Terms of Service and Privacy Policy.') || false;
    return true;
  };

  const handleNext   = () => { if (validateStep()) setStep(s => s + 1); };
  const handleBack   = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true); setError('');
    try {
      const result = await authService.register({ ...formData });
      if (result.success) {
        await login(formData.email, formData.password);
      } else {
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={s.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Top Panel ── */}
        <LinearGradient
          colors={['#0D2137', '#1565C0', '#00ACC1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.topPanel}
        >
          {/* Logo row */}
          <TouchableOpacity style={s.logoRow} onPress={() => navigation.navigate('Index')}>
            <View style={s.logoBox}>
              <Image source={LOGO} style={s.logoImg} resizeMode="contain" />
            </View>
            <View>
              <Text style={s.brandName}>People's Health Care</Text>
              <Text style={s.brandSub}>Medical Center Management</Text>
            </View>
          </TouchableOpacity>

          <Text style={s.heroTitle}>Join our{'\n'}<Text style={s.heroAccent}>health community.</Text></Text>
          <Text style={s.heroSub}>Create your patient account to manage appointments, prescriptions, and health records.</Text>

          <View style={s.benefitsList}>
            {[
              { icon: '✅', text: 'Book appointments online in seconds' },
              { icon: '💊', text: 'Receive digital prescriptions instantly' },
              { icon: '🧪', text: 'View lab results from anywhere' },
              { icon: '🔒', text: 'Your data is private and encrypted' },
            ].map(b => (
              <View key={b.text} style={s.benefitRow}>
                <Text style={s.benefitIcon}>{b.icon}</Text>
                <Text style={s.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Form Panel ── */}
        <View style={s.formPanel}>
          <View style={s.formHeader}>
            <Text style={s.formTitle}>Create Account</Text>
            <Text style={s.stepCount}>Step {step + 1} of {STEPS.length}</Text>
          </View>
          <Text style={s.formSub}>Register as a patient to access your health portal</Text>

          <StepIndicator current={step} />

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* Step 0 */}
          {step === 0 && (
            <View>
              <InputField label="Full Name"        value={formData.name}            onChangeText={set('name')}            placeholder="e.g. Kamal Perera" />
              <InputField label="Email Address"    value={formData.email}           onChangeText={set('email')}           placeholder="you@example.com" keyboardType="email-address" />
              <InputField label="Telephone Number" value={formData.telephone}       onChangeText={set('telephone')}       placeholder="e.g. 0712345678" keyboardType="phone-pad" hint="Must be exactly 10 digits" />
              <InputField label="Password"         value={formData.password}        onChangeText={set('password')}        placeholder="Min. 8 characters" secureTextEntry hint="Uppercase, lowercase, number & symbol required" />
              <InputField label="Confirm Password" value={formData.confirmPassword} onChangeText={set('confirmPassword')} placeholder="Re-enter password" secureTextEntry />
            </View>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <View>
              <SelectField label="Gender" options={['Male', 'Female', 'Other']} value={formData.gender} onSelect={set('gender')} />
              <DateOfBirthField
  label="Date of Birth"
  value={formData.dateOfBirth}
  onChange={set('dateOfBirth')}
  hint="Select your date of birth from the calendar"
/>
              {isMinor && (
                <View style={s.minorBanner}>
                  <Text style={s.minorText}>ⓘ Patient is under 18 ({age} years old). Emergency contact is required.</Text>
                </View>
              )}
              <InputField label="Emergency Contact Name"   value={formData.emergencyContactName}   onChangeText={set('emergencyContactName')}   placeholder="e.g. Kamali Perera" required={isMinor} hint={isMinor ? 'Required for patients under 18' : 'Optional for patients 18 or older'} />
              <InputField label="Emergency Contact Number" value={formData.emergencyContactNumber} onChangeText={set('emergencyContactNumber')} placeholder="e.g. 0771234567" keyboardType="phone-pad" required={isMinor} hint={isMinor ? 'Required — must be 10 digits' : 'Optional — must be 10 digits if provided'} />
              <InputField label="Home Address" value={formData.address} onChangeText={set('address')} placeholder="No., Street, City" required={false} multiline />
            </View>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <View>
              <View style={s.amberBanner}>
                <Text style={s.amberText}>ⓘ Blood group cannot be changed after registration. Please select carefully.</Text>
              </View>
              <SelectField label="Blood Group" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']} value={formData.bloodGroup} onSelect={set('bloodGroup')} required={false} />
              <InputField label="Known Allergies"     value={formData.allergies}           onChangeText={set('allergies')}           placeholder="List drug/food allergies, or type 'None'" required={false} multiline />
              <InputField label="Chronic Conditions"  value={formData.chronicConditions}   onChangeText={set('chronicConditions')}   placeholder="e.g. Diabetes, Hypertension (or 'None')" required={false} multiline />
              <InputField label="Current Medications" value={formData.currentMedications}  onChangeText={set('currentMedications')}  placeholder="List current medications (or 'None')" required={false} multiline />

              <TouchableOpacity style={s.checkRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
                <View style={[s.checkbox, agreed && s.checkboxOn]}>
                  {agreed && <Text style={s.checkMark}>✓</Text>}
                </View>
                <Text style={s.checkText}>
                  I agree to the <Text style={s.checkLink}>Terms of Service</Text> and <Text style={s.checkLink}>Privacy Policy</Text> of People's Health Care.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Nav buttons */}
          <View style={s.navRow}>
            {step > 0 && (
              <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.85}>
                <Text style={s.backBtnText}>← Back</Text>
              </TouchableOpacity>
            )}
            {step < STEPS.length - 1 ? (
              <TouchableOpacity style={[s.nextBtn, step > 0 && { flex: 1 }]} onPress={handleNext} activeOpacity={0.85}>
                <Text style={s.nextBtnText}>Continue →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.submitBtn, loading && { opacity: 0.7 }, step > 0 && { flex: 1 }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.submitBtnText}>✓ Create My Account</Text>
                }
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={{ alignItems: 'center', marginTop: 20 }} onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: '#64748B', fontSize: 13 }}>
              Already have an account? <Text style={{ color: '#1565C0', fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
          <Text style={s.footerNote}>© {new Date().getFullYear()} People's Health Care — Matara, Sri Lanka</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  topPanel: { paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingHorizontal: 24, paddingBottom: 28 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  logoBox: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  logoImg: { width: 44, height: 44 },
  brandName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  brandSub: { color: '#67E8F9', fontSize: 11, marginTop: 1 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', lineHeight: 34, marginBottom: 10 },
  heroAccent: { color: '#67E8F9' },
  heroSub: { color: 'rgba(186,219,254,0.85)', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  benefitsList: { gap: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIcon: { fontSize: 16 },
  benefitText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  formPanel: { padding: 24, paddingBottom: 48 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  formTitle: { fontSize: 20, fontWeight: '900', color: '#1E3A5F' },
  stepCount: { fontSize: 12, color: '#94A3B8' },
  formSub: { color: '#64748B', fontSize: 13, marginBottom: 20 },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: '#B91C1C', fontSize: 13 },
  minorBanner: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 12, marginBottom: 12 },
  minorText: { fontSize: 12, color: '#1E40AF', lineHeight: 18 },
  amberBanner: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12, marginBottom: 12 },
  amberText: { fontSize: 12, color: '#92400E' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  checkboxOn: { backgroundColor: '#1565C0', borderColor: '#1565C0' },  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  checkText: { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 18 },
  checkLink: { color: '#1565C0', fontWeight: '600' },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  backBtn: { flex: 1, borderWidth: 2, borderColor: '#1565C0', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  backBtnText: { color: '#1565C0', fontWeight: '700', fontSize: 14 },
  nextBtn: { flex: 1, backgroundColor: '#1565C0', borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: '#1565C0', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  submitBtn: { flex: 1, backgroundColor: '#00ACC1', borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: '#00ACC1', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  footerNote: { textAlign: 'center', color: '#CBD5E1', fontSize: 11, marginTop: 10, marginBottom: 24 },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: '#0F172A' },
  hint: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  select: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectVal: { fontSize: 14, color: '#0F172A' },
  selectPh: { fontSize: 14, color: '#94A3B8' },
  dropdown: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, marginTop: 4, overflow: 'hidden' },
  dropItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropItemActive: { backgroundColor: '#EFF6FF' },
  dropText: { fontSize: 14, color: '#0F172A' },
  dropTextActive: { color: '#1565C0', fontWeight: '600' },
  dateDoneBtn: {
  backgroundColor: '#1565C0',
  borderRadius: 12,
  paddingVertical: 11,
  alignItems: 'center',
  marginTop: 8,
},
dateDoneText: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '700',
},
});

const si = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  circleDone: { backgroundColor: '#10B981' },
  circleActive: { backgroundColor: '#1E3A5F' },
  circleText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  label: { fontSize: 11, fontWeight: '500', color: '#64748B' },
  labelActive: { color: '#1E3A5F', fontWeight: '700' },
  labelDone: { color: '#10B981' },
  line: { flex: 1, height: 1, backgroundColor: '#E2E8F0', marginHorizontal: 6 },
  lineDone: { backgroundColor: '#10B981' },
});