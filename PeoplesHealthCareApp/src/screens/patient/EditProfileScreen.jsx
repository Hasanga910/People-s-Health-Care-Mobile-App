import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { COLORS, SHADOW } from '../../constants/theme';
import api from '../../services/api';

const C = COLORS?.patient || {
  primary: '#0D2137',
  secondary: '#1565C0',
  accent: '#00ACC1',
  light: '#E0F2FE',
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

function normalizeUserResponse(response) {
  const payload = response?.data || response;

  return (
    payload?.user ||
    payload?.data?.user ||
    payload?.data ||
    payload ||
    null
  );
}

function formatDateForInput(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isValidDateString(value) {
  if (!value) return true;

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function isBeforeToday(value) {
  if (!value) return true;

  const selected = new Date(`${value}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return selected < today;
}

function isTenDigitPhone(value) {
  return /^\d{10}$/.test(String(value || '').trim());
}

function allergiesToString(value) {
  if (!value) return '';

  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
}

function stringToAllergyArray(value) {
  if (!value || !value.trim()) return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function ReadOnlyField({ label, value, icon, note }) {
  return (
    <View style={styles.readOnlyBox}>
      <View style={styles.readOnlyIcon}>
        <Ionicons name={icon} size={18} color={C.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.labelRow}>
          <Text style={styles.inputLabel}>{label}</Text>

          <View style={styles.lockChip}>
            <Ionicons name="lock-closed-outline" size={10} color="#64748B" />
            <Text style={styles.lockChipText}>Read-only</Text>
          </View>
        </View>

        <Text style={styles.readOnlyValue}>{value || '—'}</Text>

        {!!note && <Text style={styles.readOnlyNote}>{note}</Text>}
      </View>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = 'default',
  multiline = false,
  error,
  helper,
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View
        style={[
          styles.inputBox,
          multiline && styles.textAreaBox,
          !!error && styles.inputError,
        ]}
      >
        <View style={styles.inputIcon}>
          <Ionicons name={icon} size={18} color={!!error ? '#EF4444' : C.primary} />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[
            styles.textInput,
            multiline && styles.textAreaInput,
          ]}
        />
      </View>

      {!!helper && !error && <Text style={styles.helperText}>{helper}</Text>}

      {!!error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function GenderSelector({ value, onChange }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>Gender</Text>

      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((option) => {
          const active = value === option;

          return (
            <TouchableOpacity
              key={option}
              activeOpacity={0.85}
              onPress={() => onChange(option)}
              style={[
                styles.genderButton,
                active && styles.genderButtonActive,
              ]}
            >
              <Ionicons
                name={
                  option === 'Male'
                    ? 'male-outline'
                    : option === 'Female'
                    ? 'female-outline'
                    : 'person-outline'
                }
                size={17}
                color={active ? '#FFFFFF' : C.primary}
              />

              <Text
                style={[
                  styles.genderText,
                  active && styles.genderTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SectionCard({ title, subtitle, icon, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <Ionicons name={icon} size={20} color={C.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function EditProfileScreen({ navigation }) {
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    telephone: '',
    email: '',
    gender: '',
    birthday: '',
    allergies: '',
    chronicConditions: '',
    currentMedications: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    address: '',
  });

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: '',
      general: '',
    }));
  };

  const fillFormFromUser = (user) => {
    const details = user?.patientDetails || {};

    setForm({
      telephone: user?.telephone || '',
      email: user?.email || '',
      gender: details?.gender || '',
      birthday: formatDateForInput(details?.birthday),
      allergies: allergiesToString(details?.allergies),
      chronicConditions: details?.chronicConditions || '',
      currentMedications: details?.currentMedications || '',
      emergencyContactName: details?.emergencyContactName || '',
      emergencyContactNumber: details?.emergencyContactNumber || '',
      address: details?.address || '',
    });
  };

  const loadProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const freshUser = normalizeUserResponse(response);

      if (freshUser) {
        setProfileUser(freshUser);
        fillFormFromUser(freshUser);
      }
    } catch (error) {
      console.log('Edit profile load error:', error?.message);
      setErrors((prev) => ({
        ...prev,
        general: 'Unable to load profile details. Please try again.',
      }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.telephone.trim()) {
      nextErrors.telephone = 'Telephone number is required.';
    } else if (!isTenDigitPhone(form.telephone)) {
      nextErrors.telephone = 'Telephone number must contain exactly 10 digits.';
    }

    if (form.emergencyContactNumber.trim()) {
      if (!isTenDigitPhone(form.emergencyContactNumber)) {
        nextErrors.emergencyContactNumber =
          'Emergency contact number must contain exactly 10 digits.';
      }
    }

    if (form.birthday.trim()) {
      if (!isValidDateString(form.birthday)) {
        nextErrors.birthday = 'Birthday must use YYYY-MM-DD format.';
      } else if (!isBeforeToday(form.birthday)) {
        nextErrors.birthday = 'Birthday must be before today.';
      }
    }

    if (!form.gender.trim()) {
      nextErrors.gender = 'Please select gender.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => {
    const patientDetails = {
      gender: form.gender.trim(),
      birthday: form.birthday.trim() || undefined,
      allergies: stringToAllergyArray(form.allergies),
      chronicConditions: form.chronicConditions.trim(),
      currentMedications: form.currentMedications.trim(),
      emergencyContactName: form.emergencyContactName.trim(),
      emergencyContactNumber: form.emergencyContactNumber.trim(),
      address: form.address.trim(),
    };

    const payload = {
      telephone: form.telephone.trim(),
      patientDetails,
    };

    if (!profileUser?.email && form.email.trim()) {
      payload.email = form.email.trim();
    }

    return payload;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Check details', 'Please fix the highlighted fields before saving.');
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload();
      const response = await api.put('/auth/me', payload);
      const updatedUser = normalizeUserResponse(response);

      if (updatedUser) {
        setProfileUser(updatedUser);
        fillFormFromUser(updatedUser);
      }

      Alert.alert(
        'Profile Updated',
        'Your profile details were updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const message =
        error?.message ||
        'Unable to update profile. Please check your details and try again.';

      setErrors((prev) => ({
        ...prev,
        general: message,
      }));

      Alert.alert('Update Failed', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading edit profile...</Text>
      </View>
    );
  }

  const patientDetails = profileUser?.patientDetails || {};
  const emailAlreadySet = !!profileUser?.email;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="create-outline" size={28} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroSmall}>Profile Maintenance</Text>
            <Text style={styles.heroTitle}>Edit Patient Profile</Text>
            <Text style={styles.heroSub}>
              Update your contact and medical information carefully.
            </Text>
          </View>
        </View>

        {!!errors.general && (
          <View style={styles.generalError}>
            <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
            <Text style={styles.generalErrorText}>{errors.general}</Text>
          </View>
        )}

        <SectionCard
          title="Read-Only Information"
          subtitle="These fields are protected for record accuracy"
          icon="shield-checkmark-outline"
        >
          <ReadOnlyField
            icon="person-outline"
            label="Full Name"
            value={profileUser?.name || profileUser?.username}
            note="Name cannot be changed from the patient mobile app."
          />

          <ReadOnlyField
            icon="finger-print-outline"
            label="Patient ID"
            value={profileUser?.userId}
            note="Patient ID is generated by the system."
          />

          <ReadOnlyField
            icon="water-outline"
            label="Blood Group"
            value={patientDetails?.bloodGroup}
            note="Blood group cannot be changed after registration."
          />

          {emailAlreadySet ? (
            <ReadOnlyField
              icon="mail-outline"
              label="Email"
              value={profileUser?.email}
              note="Already-set email is protected."
            />
          ) : (
            <InputField
              label="Email"
              icon="mail-outline"
              value={form.email}
              onChangeText={(value) => updateField('email', value)}
              placeholder="Enter email address"
              keyboardType="email-address"
              helper="Email can be added only if your account does not already have one."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Contact Information"
          subtitle="Used for medical center communication"
          icon="call-outline"
        >
          <InputField
            label="Telephone"
            icon="call-outline"
            value={form.telephone}
            onChangeText={(value) => updateField('telephone', value.replace(/\D/g, ''))}
            placeholder="0712345678"
            keyboardType="number-pad"
            error={errors.telephone}
            helper="Must contain exactly 10 digits."
          />

          <InputField
            label="Address"
            icon="location-outline"
            value={form.address}
            onChangeText={(value) => updateField('address', value)}
            placeholder="Enter your address"
            multiline
          />
        </SectionCard>

        <SectionCard
          title="Medical Information"
          subtitle="Used by doctors during consultations"
          icon="medical-outline"
        >
          <GenderSelector
            value={form.gender}
            onChange={(value) => updateField('gender', value)}
          />

          {!!errors.gender && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{errors.gender}</Text>
            </View>
          )}

          <InputField
            label="Birthday"
            icon="calendar-outline"
            value={form.birthday}
            onChangeText={(value) => updateField('birthday', value)}
            placeholder="YYYY-MM-DD"
            error={errors.birthday}
            helper="Use YYYY-MM-DD format. Example: 2002-05-18"
          />

          <InputField
            label="Allergies"
            icon="warning-outline"
            value={form.allergies}
            onChangeText={(value) => updateField('allergies', value)}
            placeholder="Example: Penicillin, Dust"
            multiline
            helper="Separate multiple allergies using commas."
          />

          <InputField
            label="Chronic Conditions"
            icon="pulse-outline"
            value={form.chronicConditions}
            onChangeText={(value) => updateField('chronicConditions', value)}
            placeholder="Example: Diabetes, Asthma, None"
            multiline
          />

          <InputField
            label="Current Medications"
            icon="medkit-outline"
            value={form.currentMedications}
            onChangeText={(value) => updateField('currentMedications', value)}
            placeholder="Example: Metformin, None"
            multiline
          />
        </SectionCard>

        <SectionCard
          title="Emergency Contact"
          subtitle="Used during urgent medical situations"
          icon="alert-circle-outline"
        >
          <InputField
            label="Emergency Contact Name"
            icon="person-circle-outline"
            value={form.emergencyContactName}
            onChangeText={(value) => updateField('emergencyContactName', value)}
            placeholder="Enter contact person name"
          />

          <InputField
            label="Emergency Contact Number"
            icon="call-outline"
            value={form.emergencyContactNumber}
            onChangeText={(value) =>
              updateField('emergencyContactNumber', value.replace(/\D/g, ''))
            }
            placeholder="0771234567"
            keyboardType="number-pad"
            error={errors.emergencyContactNumber}
            helper="Optional, but must contain exactly 10 digits if provided."
          />
        </SectionCard>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.saveButton,
            saving && {
              opacity: 0.75,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Profile Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.bottomNote}>
          <MaterialCommunityIcons name="shield-lock-outline" size={22} color={C.primary} />
          <Text style={styles.bottomNoteText}>
            Your medical profile should be accurate because doctors may use this information during consultations.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 16,
    paddingBottom: 34,
  },

  center: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  heroCard: {
    backgroundColor: '#0B2545',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    ...SHADOW.md,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  heroSmall: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },

  heroSub: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '600',
  },

  generalError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  generalErrorText: {
    color: '#991B1B',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOW.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  sectionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.light || '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },

  sectionBody: {
    gap: 13,
  },

  readOnlyBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  readOnlyIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: C.light || '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },

  inputLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 7,
  },

  readOnlyValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 1,
  },

  readOnlyNote: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    lineHeight: 16,
  },

  lockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  lockChipText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '900',
  },

  fieldWrap: {
    gap: 0,
  },

  inputBox: {
    minHeight: 52,
    borderWidth: 1.4,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  textAreaBox: {
    minHeight: 104,
    alignItems: 'flex-start',
    paddingTop: 13,
  },

  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },

  inputIcon: {
    width: 30,
    alignItems: 'center',
    marginRight: 6,
  },

  textInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 10,
  },

  textAreaInput: {
    minHeight: 76,
    paddingTop: 0,
  },

  helperText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
    lineHeight: 16,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },

  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },

  genderRow: {
    flexDirection: 'row',
    gap: 9,
  },

  genderButton: {
    flex: 1,
    borderWidth: 1.4,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  genderButtonActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },

  genderText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  genderTextActive: {
    color: '#FFFFFF',
  },

  saveButton: {
    backgroundColor: C.primary,
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOW.md,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 10,
  },

  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '900',
  },

  bottomNote: {
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 11,
    marginTop: 14,
  },

  bottomNoteText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '600',
  },
});