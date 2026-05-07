import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOW } from '../../constants/theme';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const TABS = ['Profile', 'Professional', 'Security'];

const PW_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

function passwordStrength(pw) {
  const passed = PW_RULES.filter((r) => r.test(pw)).length;
  if (passed <= 1) return { score: 1, label: 'Very Weak', color: '#EF4444' };
  if (passed === 2) return { score: 2, label: 'Weak', color: '#F59E0B' };
  if (passed === 3) return { score: 3, label: 'Fair', color: '#EAB308' };
  if (passed === 4) return { score: 4, label: 'Good', color: '#3B82F6' };
  return { score: 5, label: 'Strong', color: '#10B981' };
}

function formatPhotoSize(bytes = 0) {
  if (!bytes) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(bytes / 1024)}KB`;
}

export default function DoctorSettings({ onProfileUpdated }) {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('Profile');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile
  const [profile, setProfile] = useState({ telephone: '', photo: '' });

  // Professional
  const [professional, setProfessional] = useState({ experienceYears: '', certifications: '' });
  const [originalProfessional, setOriginalProfessional] = useState({ experienceYears: '', certifications: '' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Security
  const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // Load user data
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      const u = res.data?.user || res.data?.data || res.data;

      setUser(u);
      setProfile({
        telephone: u?.telephone || '',
        photo: u?.photo || '',
      });

      const d = u?.doctorDetails || {};
      const prof = {
        experienceYears: d.workingExperience || '',
        certifications: Array.isArray(d.certifications) ? d.certifications.join(', ') : d.certifications || '',
      };
      setProfessional(prof);
      setOriginalProfessional(prof);
      onProfileUpdated?.(u);
      return u;
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load profile');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant gallery access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_PHOTO_SIZE) {
        return Alert.alert('Error', `Image must be under 2MB. Selected image is ${formatPhotoSize(asset.fileSize)}.`);
      }
      if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
        return Alert.alert('Error', 'Please select an image file.');
      }
      const base64 = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
      setProfile((p) => ({ ...p, photo: base64 }));
    }
  };

  // Profile Save
  const saveProfile = async () => {
    const phone = profile.telephone.trim();
    if (phone && !/^\+?[0-9\s()-]{7,15}$/.test(phone)) {
      return Alert.alert('Error', 'Enter a valid telephone number');
    }

    setSaving(true);
    try {
      await api.put('/auth/me', {
        telephone: phone,
        photo: profile.photo || null,
      });
      Alert.alert('Success', 'Profile updated successfully');
      await loadProfile();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Professional Save
  const handleProfessionalSave = async () => {
    setShowConfirmModal(false);
    const years = parseInt(professional.experienceYears, 10);
    if (professional.experienceYears && (isNaN(years) || years < 0)) {
      return Alert.alert('Error', 'Experience must be a valid number of years');
    }
    if (years > 60) {
      return Alert.alert('Error', 'Experience cannot be more than 60 years');
    }

    setSaving(true);
    try {
      const certArr = professional.certifications
        ? professional.certifications.split(',').map((c) => c.trim()).filter(Boolean)
        : [];

      await api.put('/auth/me', {
        doctorDetails: {
          workingExperience: professional.experienceYears ? String(years) : '',
          certifications: certArr,
        },
      });

      Alert.alert('Success', 'Professional details updated');
      await loadProfile();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  // Password Save
  const savePassword = async () => {
    if (!security.currentPassword) {
      return Alert.alert('Error', 'Enter your current password');
    }
    if (!security.newPassword) {
      return Alert.alert('Error', 'Enter a new password');
    }
    if (!security.confirmPassword) {
      return Alert.alert('Error', 'Confirm your new password');
    }
    const failedRule = PW_RULES.find((rule) => !rule.test(security.newPassword));
    if (failedRule) {
      return Alert.alert('Error', `Password: ${failedRule.label}`);
    }
    if (security.newPassword !== security.confirmPassword) {
      return Alert.alert('Error', 'Passwords do not match');
    }

    setSaving(true);
    try {
      await api.put('/auth/me', {
        currentPassword: security.currentPassword,
        newPassword: security.newPassword,
      });
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Alert.alert('Success', 'Password changed successfully');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  const pwStrength = security.newPassword ? passwordStrength(security.newPassword) : null;
  const professionalChanged =
    professional.experienceYears.trim() !== originalProfessional.experienceYears.trim() ||
    professional.certifications.trim() !== originalProfessional.certifications.trim();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProfile} tintColor="#1565C0" />}
      >
        {/* Header Banner */}
        <LinearGradient
          colors={['#0D2137', '#1565C0', '#00ACC1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />
          <View style={styles.headerRow}>
            <View style={styles.avatarContainer}>
              {profile.photo ? (
                <Image source={{ uri: profile.photo }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={['#1565C0', '#00ACC1']} style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'DR'}
                  </Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.headerKicker}>Doctor Settings</Text>
              <Text style={styles.userName}>Dr. {(user?.name || 'Doctor').replace(/^Dr\.?\s*/i, '')}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>Manage your profile, credentials, and account security.</Text>
          {!!user?.userId && (
            <View style={styles.idBadge}>
              <Ionicons name="id-card-outline" size={14} color="#E0F2FE" />
              <Text style={styles.userId}>{user.userId}</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {/* Tabs */}
          <View style={styles.tabContainer}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* PROFILE TAB */}
          {activeTab === 'Profile' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Profile Information</Text>

              <TouchableOpacity style={styles.photoUpload} onPress={handlePhotoUpload} activeOpacity={0.85}>
                {profile.photo ? (
                  <Image source={{ uri: profile.photo }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#1565C0" />
                  </View>
                )}
                <Text style={styles.uploadText}>Change Photo</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Telephone</Text>
              <TextInput
                style={styles.input}
                value={profile.telephone}
                onChangeText={(text) => setProfile({ ...profile, telephone: text })}
                placeholder="0712345678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving} activeOpacity={0.85}>
                <LinearGradient colors={['#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Profile</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* PROFESSIONAL TAB */}
          {activeTab === 'Professional' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Professional Details</Text>

              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                value={professional.experienceYears}
                onChangeText={(text) => setProfessional({ ...professional, experienceYears: text.replace(/[^0-9]/g, '') })}
                placeholder="8"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={2}
              />
              {!!professional.experienceYears && !isNaN(parseInt(professional.experienceYears, 10)) && (
                <Text style={styles.inputHint}>
                  Displayed as {parseInt(professional.experienceYears, 10)}+ years experience
                </Text>
              )}

              <Text style={styles.label}>Certifications (comma separated)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={professional.certifications}
                onChangeText={(text) => setProfessional({ ...professional, certifications: text })}
                placeholder="MBBS, MD, Fellowship in Cardiology"
                placeholderTextColor="#94A3B8"
                multiline
              />

              {!!professional.certifications && (
                <View style={styles.certChipWrap}>
                  {professional.certifications.split(',').map((c) => c.trim()).filter(Boolean).map((cert, index) => (
                    <View key={`${cert}-${index}`} style={styles.certChip}>
                      <Ionicons name="checkmark" size={12} color="#1D4ED8" />
                      <Text style={styles.certChipText}>{cert}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>Why this matters</Text>
                <Text style={styles.infoBoxText}>Your experience and certifications are visible to patients and administrators.</Text>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, !professionalChanged && styles.disabledButton]}
                onPress={() => (professionalChanged ? setShowConfirmModal(true) : null)}
                disabled={saving || !professionalChanged}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Professional Info</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'Security' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Change Password</Text>

              <Text style={styles.label}>Current Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={security.currentPassword}
                  onChangeText={(text) => setSecurity({ ...security, currentPassword: text })}
                  secureTextEntry={!showPasswords.current}
                  placeholder="Current password"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}>
                  <Ionicons name={showPasswords.current ? 'eye-off' : 'eye'} size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={security.newPassword}
                  onChangeText={(text) => setSecurity({ ...security, newPassword: text })}
                  secureTextEntry={!showPasswords.new}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}>
                  <Ionicons name={showPasswords.new ? 'eye-off' : 'eye'} size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {pwStrength && (
                <View style={styles.passwordFeedback}>
                  <View style={styles.strengthHeader}>
                    <Text style={styles.strengthTitle}>Password strength</Text>
                    <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
                  </View>
                  <View style={styles.strengthBar}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <View
                        key={i}
                        style={[styles.strengthSegment, { backgroundColor: i <= pwStrength.score ? pwStrength.color : '#E2E8F0' }]}
                      />
                    ))}
                  </View>

                  <View style={styles.requirementsBox}>
                    <Text style={styles.requirementsTitle}>Password requirements</Text>
                    {PW_RULES.map((rule) => {
                      const passed = rule.test(security.newPassword);
                      return (
                        <View key={rule.label} style={styles.requirementRow}>
                          <Ionicons
                            name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                            size={14}
                            color={passed ? '#10B981' : '#CBD5E1'}
                          />
                          <Text style={[styles.requirementText, passed && styles.requirementTextPassed]}>{rule.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={security.confirmPassword}
                  onChangeText={(text) => setSecurity({ ...security, confirmPassword: text })}
                  secureTextEntry={!showPasswords.confirm}
                  placeholder="Repeat new password"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}>
                  <Ionicons name={showPasswords.confirm ? 'eye-off' : 'eye'} size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {!!security.newPassword && !!security.confirmPassword && security.newPassword !== security.confirmPassword && (
                <Text style={styles.passwordMismatch}>Passwords do not match</Text>
              )}

              <View style={styles.securityReminder}>
                <Text style={styles.securityReminderTitle}>Security reminder</Text>
                <Text style={styles.securityReminderText}>Never share your password. The system will never ask for it by email or phone.</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!security.currentPassword || !security.newPassword || !security.confirmPassword) && styles.disabledButton,
                ]}
                onPress={savePassword}
                disabled={saving || !security.currentPassword || !security.newPassword || !security.confirmPassword}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#1565C0', '#00ACC1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Update Password</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

      {/* Confirm Modal for Professional */}
      {showConfirmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Update Professional Details?</Text>
            <Text style={styles.modalText}>This change will be visible to patients and administrators.</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleProfessionalSave}>
                <Text style={styles.modalConfirmText}>Yes, Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 40 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  decCircle1: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decCircle2: {
    position: 'absolute',
    right: 60,
    bottom: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: { marginRight: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '900' },

  userInfo: { flex: 1 },
  headerKicker: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  userName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  userEmail: { color: 'rgba(255,255,255,0.72)', fontSize: 13, marginTop: 3 },
  headerSub: { color: 'rgba(255,255,255,0.68)', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  idBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  userId: { color: '#E0F2FE', fontSize: 12, fontWeight: '700' },

  body: { padding: 14, gap: 14 },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: { backgroundColor: '#fff', ...SHADOW.sm },
  tabText: { fontWeight: '700', color: '#64748B', fontSize: 12 },
  tabTextActive: { color: '#1D4ED8' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 16 },

  photoUpload: { alignItems: 'center', marginBottom: 20 },
  photoPreview: { width: 100, height: 100, borderRadius: 22, marginBottom: 8 },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  uploadText: { color: '#1D4ED8', fontWeight: '700', fontSize: 13 },

  label: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputHint: { color: '#1D4ED8', fontSize: 12, fontWeight: '700', marginTop: 6 },
  certChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  certChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  certChipText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  infoBox: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  infoBoxTitle: { color: '#1D4ED8', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  infoBoxText: { color: '#2563EB', fontSize: 12, lineHeight: 17 },

  passwordFeedback: { marginTop: 10, gap: 10 },
  strengthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  strengthTitle: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  strengthBar: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  strengthSegment: { flex: 1, height: 6, borderRadius: 999 },
  strengthLabel: { fontWeight: '700', fontSize: 12 },
  requirementsBox: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    gap: 7,
  },
  requirementsTitle: { color: '#475569', fontSize: 12, fontWeight: '900', marginBottom: 2 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requirementText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  requirementTextPassed: { color: '#047857' },
  passwordMismatch: { color: '#EF4444', fontSize: 12, fontWeight: '700', marginTop: 8 },
  securityReminder: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  securityReminderTitle: { color: '#92400E', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  securityReminderText: { color: '#B45309', fontSize: 12, lineHeight: 17 },

  saveButton: {
    borderRadius: 16,
    marginTop: 24,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  saveGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '700' },

  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 24,
    width: '88%',
    ...SHADOW.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  modalText: { textAlign: 'center', color: '#64748B', lineHeight: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  modalCancelText: { fontWeight: '700', color: '#64748B' },
  modalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1565C0',
    alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontWeight: '900' },
});
