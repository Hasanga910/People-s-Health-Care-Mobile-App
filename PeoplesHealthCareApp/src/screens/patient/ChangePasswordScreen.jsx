import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import api from '../../services/api';
import { COLORS, SHADOW } from '../../constants/theme';

const C = COLORS?.patient || {
  primary: '#0D2137',
  secondary: '#1565C0',
  accent: '#00ACC1',
  light: '#E0F2FE',
};

function checkPasswordRules(password) {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function PasswordRule({ passed, text }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={passed ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={passed ? '#059669' : '#94A3B8'}
      />
      <Text
        style={[
          styles.ruleText,
          passed && {
            color: '#059669',
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function PasswordInput({
  label,
  value,
  onChangeText,
  placeholder,
  visible,
  onToggleVisible,
  error,
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View
        style={[
          styles.inputBox,
          !!error && styles.inputError,
        ]}
      >
        <View style={styles.inputIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={error ? '#EF4444' : C.primary}
          />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.textInput}
        />

        <TouchableOpacity
          onPress={onToggleVisible}
          activeOpacity={0.8}
          style={styles.eyeButton}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#64748B"
          />
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

export default function ChangePasswordScreen({ navigation }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [visible, setVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const rules = useMemo(
    () => checkPasswordRules(form.newPassword),
    [form.newPassword]
  );

  const allRulesPassed = Object.values(rules).every(Boolean);

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

  const toggleVisible = (field) => {
    setVisible((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.currentPassword.trim()) {
      nextErrors.currentPassword = 'Current password is required.';
    }

    if (!form.newPassword.trim()) {
      nextErrors.newPassword = 'New password is required.';
    } else if (!allRulesPassed) {
      nextErrors.newPassword =
        'New password must follow all password strength rules.';
    }

    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Please confirm your new password.';
    } else if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Confirm password does not match.';
    }

    if (
      form.currentPassword &&
      form.newPassword &&
      form.currentPassword === form.newPassword
    ) {
      nextErrors.newPassword =
        'New password must be different from current password.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      Alert.alert(
        'Check Password',
        'Please fix the highlighted fields before submitting.'
      );
      return;
    }

    try {
      setSaving(true);

      await api.put('/auth/me', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully.',
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
        'Unable to change password. Please check your current password and try again.';

      setErrors((prev) => ({
        ...prev,
        general: message,
      }));

      Alert.alert('Update Failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="lock-closed-outline" size={28} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroSmall}>Security Settings</Text>
            <Text style={styles.heroTitle}>Change Password</Text>
            <Text style={styles.heroSub}>
              Use a strong password to keep your patient account secure.
            </Text>
          </View>
        </View>

        {!!errors.general && (
          <View style={styles.generalError}>
            <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
            <Text style={styles.generalErrorText}>{errors.general}</Text>
          </View>
        )}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <MaterialCommunityIcons
                name="shield-key-outline"
                size={21}
                color={C.primary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Password Details</Text>
              <Text style={styles.sectionSubtitle}>
                Enter your current password and choose a new one.
              </Text>
            </View>
          </View>

          <PasswordInput
            label="Current Password"
            value={form.currentPassword}
            onChangeText={(value) => updateField('currentPassword', value)}
            placeholder="Enter current password"
            visible={visible.currentPassword}
            onToggleVisible={() => toggleVisible('currentPassword')}
            error={errors.currentPassword}
          />

          <PasswordInput
            label="New Password"
            value={form.newPassword}
            onChangeText={(value) => updateField('newPassword', value)}
            placeholder="Enter new password"
            visible={visible.newPassword}
            onToggleVisible={() => toggleVisible('newPassword')}
            error={errors.newPassword}
          />

          <View style={styles.rulesBox}>
            <Text style={styles.rulesTitle}>Password must include:</Text>

            <PasswordRule passed={rules.minLength} text="At least 8 characters" />
            <PasswordRule passed={rules.uppercase} text="One uppercase letter" />
            <PasswordRule passed={rules.lowercase} text="One lowercase letter" />
            <PasswordRule passed={rules.number} text="One number" />
            <PasswordRule passed={rules.special} text="One special character" />
          </View>

          <PasswordInput
            label="Confirm New Password"
            value={form.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            placeholder="Re-enter new password"
            visible={visible.confirmPassword}
            onToggleVisible={() => toggleVisible('confirmPassword')}
            error={errors.confirmPassword}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.saveButton,
            saving && {
              opacity: 0.75,
            },
          ]}
          onPress={handleChangePassword}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Update Password</Text>
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

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={22} color={C.primary} />
          <Text style={styles.noteText}>
            After changing your password, use the new password for your next login.
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

  fieldWrap: {
    marginBottom: 14,
  },

  inputLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 7,
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

  eyeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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

  rulesBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
  },

  rulesTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 9,
  },

  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },

  ruleText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
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

  noteCard: {
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 11,
    marginTop: 14,
  },

  noteText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '600',
  },
});