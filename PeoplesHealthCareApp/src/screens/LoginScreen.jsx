import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StatusBar, KeyboardAvoidingView,
  Platform, Image, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const LOGO = require('../../assets/Logo.png');

export default function LoginScreen() {
  const navigation            = useNavigation();
  const { login }             = useAuth();
  const [identifier, setId]   = useState('');
  const [password, setPass]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!identifier.trim()) return setError('Please enter your email.');
    if (!password)          return setError('Please enter your password.');
    setLoading(true);
    try {
      const result = await login(identifier.trim(), password);
      if (!result.success)
        setError(result.message || 'Login failed. Please check your credentials.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={s.root} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Left/Top Panel ── */}
        <LinearGradient
          colors={['#0D2137', '#1565C0', '#00ACC1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.leftPanel}
        >
          {/* Blurred circles */}
          <View style={s.blur1} />
          <View style={s.blur2} />

          {/* Logo row — top */}
          <TouchableOpacity style={s.logoRow} onPress={() => navigation.navigate('Index')}>
            <View style={s.logoBox}>
              <Image source={LOGO} style={s.logoImg} resizeMode="contain" />
            </View>
            <View>
              <Text style={s.brandName}>People's Health Care</Text>
              <Text style={s.brandSub}>Medical Center Management</Text>
            </View>
          </TouchableOpacity>

          {/* Hero text */}
          <View style={s.heroBlock}>
            <Text style={s.heroTitle}>Your health,{'\n'}<Text style={s.heroAccent}>our priority.</Text></Text>
            <Text style={s.heroSub}>
              Access your personalized healthcare portal. Manage appointments, prescriptions, and lab results seamlessly.
            </Text>

            {/* Feature grid */}
            <View style={s.featGrid}>
              {[
                { icon: '📅', title: 'Easy Booking',  sub: 'Schedule appointments online'   },
                { icon: '💊', title: 'Digital Rx',    sub: 'Prescriptions sent instantly'   },
                { icon: '🧪', title: 'Lab Reports',   sub: 'Results at your fingertips'     },
                { icon: '🔒', title: 'Secure',        sub: 'Private & encrypted records'    },
              ].map(f => (
                <View key={f.title} style={s.featCard}>
                  <Text style={s.featIcon}>{f.icon}</Text>
                  <Text style={s.featTitle}>{f.title}</Text>
                  <Text style={s.featSub}>{f.sub}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Quote */}
          <View style={s.quoteBlock}>
            <Text style={s.quoteText}>"Compassionate care backed by intelligent technology."</Text>
            <Text style={s.quoteAuthor}>— Dr. M.T.D. Jayaweera, Medical Director</Text>
          </View>
        </LinearGradient>

        {/* ── Form Panel ── */}
        <View style={s.formPanel}>
          <Text style={s.formTitle}>Welcome back</Text>
          <Text style={s.formSub}>Sign in with your email address</Text>

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>⚠ {error}</Text>
              <TouchableOpacity onPress={() => setError('')}>
                <Text style={s.errorClose}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={s.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={s.input}
            value={identifier}
            onChangeText={setId}
            placeholder="you@example.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[s.label, { marginTop: 16 }]}>PASSWORD</Text>
          <View style={s.pwRow}>
            <TextInput
              style={s.pwInput}
              value={password}
              onChangeText={setPass}
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.submitText}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divLabel}>New patient?</Text>
            <View style={s.divLine} />
          </View>

          <TouchableOpacity style={s.registerBtn} onPress={() => navigation.navigate('Register')} activeOpacity={0.85}>
            <Text style={s.registerText}>Create Patient Account</Text>
          </TouchableOpacity>

          <Text style={s.staffNote}>Staff members: Contact administrator for account access</Text>
          <Text style={s.footerNote}>© {new Date().getFullYear()} People's Health Care — Matara, Sri Lanka</Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  // Left/Top panel
  leftPanel: { paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingHorizontal: 24, paddingBottom: 32, overflow: 'hidden' },
  blur1: { position: 'absolute', top: '25%', left: '20%', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(0,172,193,0.12)' },
  blur2: { position: 'absolute', bottom: '15%', right: '10%', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(21,101,192,0.12)' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoBox: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  logoImg: { width: 44, height: 44 },
  brandName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  brandSub: { color: '#67E8F9', fontSize: 11, marginTop: 1 },
  heroBlock: { marginBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 36, marginBottom: 12 },
  heroAccent: { color: '#67E8F9' },
  heroSub: { color: 'rgba(186,219,254,0.85)', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featCard: { width: '47%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  featIcon: { fontSize: 18, marginBottom: 4 },
  featTitle: { color: '#fff', fontWeight: '700', fontSize: 12 },
  featSub: { color: '#93C5FD', fontSize: 11, marginTop: 2 },
  quoteBlock: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 16 },
  quoteText: { color: 'rgba(186,219,254,0.8)', fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  quoteAuthor: { color: '#93C5FD', fontSize: 11, marginTop: 4 },

  // Form panel
  formPanel: { backgroundColor: '#F8FAFC', padding: 28, paddingBottom: 48 },
  formTitle: { fontSize: 22, fontWeight: '900', color: '#1E3A5F', marginBottom: 4 },
  formSub: { color: '#64748B', fontSize: 13, marginBottom: 24 },
  errorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { flex: 1, color: '#B91C1C', fontSize: 13 },
  errorClose: { color: '#EF4444', fontSize: 16, paddingLeft: 8 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#0F172A', marginBottom: 4 },
  pwRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingRight: 4, marginBottom: 4 },
  pwInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#0F172A' },
  eyeBtn: { padding: 10 },
  submitBtn: { backgroundColor: '#1565C0', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20, shadowColor: '#00ACC1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  divLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  registerBtn: { borderWidth: 2, borderColor: '#1565C0', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  registerText: { color: '#1565C0', fontWeight: '700', fontSize: 14 },
  staffNote: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 16 },
  footerNote: { textAlign: 'center', color: '#CBD5E1', fontSize: 11, marginTop: 6 },
});