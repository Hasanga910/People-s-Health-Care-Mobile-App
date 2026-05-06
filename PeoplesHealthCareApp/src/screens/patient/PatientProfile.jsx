import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { COLORS, SHADOW } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const C = COLORS?.patient || {
  primary: '#0D2137',
  secondary: '#1565C0',
  accent: '#00ACC1',
  light: '#E0F2FE',
};

function getInitials(name) {
  if (!name) return 'PT';

  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function calculateAge(birthday) {
  if (!birthday) return '—';

  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return '—';

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return `${age} years`;
}

function formatDate(dateString) {
  if (!dateString) return '—';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatArrayValue(value) {
  if (!value) return 'None';

  if (Array.isArray(value)) {
    const cleaned = value.filter(Boolean);
    return cleaned.length ? cleaned.join(', ') : 'None';
  }

  if (typeof value === 'string') {
    return value.trim() ? value : 'None';
  }

  return 'None';
}

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

function InfoRow({
  icon,
  label,
  value,
  locked = false,
  multiline = false,
  iconColor = C.primary,
  iconBg = C.light || '#E0F2FE',
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowLabelWrap}>
          <Text style={styles.rowLabel}>{label}</Text>

          {locked && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed-outline" size={10} color="#64748B" />
              <Text style={styles.lockText}>Read-only</Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.rowValue,
            multiline && {
              lineHeight: 21,
            },
          ]}
          numberOfLines={multiline ? 5 : 2}
        >
          {value || '—'}
        </Text>
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

export default function PatientProfile({ navigation }) {
  const { user } = useAuth();

  const [profileUser, setProfileUser] = useState(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const freshUser = normalizeUserResponse(response);

      if (freshUser) {
        setProfileUser(freshUser);
      }
    } catch (error) {
      console.log('Patient profile load error:', error?.message);
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

  const patientDetails = profileUser?.patientDetails || {};
  const displayName = profileUser?.name || profileUser?.username || 'Patient';
  const initials = getInitials(displayName);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
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
        <View style={styles.heroCircleOne} />
        <View style={styles.heroCircleTwo} />

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.heroSmall}>Patient Profile</Text>
          <Text style={styles.heroName} numberOfLines={1}>
            {displayName}
          </Text>

          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>ID</Text>
              <Text style={styles.pillValue}>{profileUser?.userId || '—'}</Text>
            </View>

            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Blood</Text>
              <Text style={styles.pillValue}>
                {patientDetails?.bloodGroup || '—'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.primaryAction}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="create-outline" size={19} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.secondaryAction}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <Ionicons name="lock-closed-outline" size={19} color={C.primary} />
          <Text style={styles.secondaryActionText}>Password</Text>
        </TouchableOpacity>
      </View>

      <SectionCard
        title="Personal Information"
        subtitle="Basic account and contact details"
        icon="person-outline"
      >
        <InfoRow
          icon="person-outline"
          label="Full Name"
          value={profileUser?.name}
          locked
        />

        <InfoRow
          icon="finger-print-outline"
          label="Patient ID"
          value={profileUser?.userId}
          locked
          iconColor="#7C3AED"
          iconBg="#EDE9FE"
        />

        <InfoRow
          icon="mail-outline"
          label="Email"
          value={profileUser?.email || profileUser?.username || '—'}
          locked={!!profileUser?.email}
          iconColor="#2563EB"
          iconBg="#DBEAFE"
        />

        <InfoRow
          icon="call-outline"
          label="Telephone"
          value={profileUser?.telephone}
          iconColor="#059669"
          iconBg="#DCFCE7"
        />
      </SectionCard>

      <SectionCard
        title="Medical Information"
        subtitle="Health details used during consultations"
        icon="medical-outline"
      >
        <InfoRow
          icon="male-female-outline"
          label="Gender"
          value={patientDetails?.gender}
        />

        <InfoRow
          icon="calendar-outline"
          label="Birthday"
          value={formatDate(patientDetails?.birthday)}
          iconColor="#0284C7"
          iconBg="#E0F2FE"
        />

        <InfoRow
          icon="hourglass-outline"
          label="Age"
          value={calculateAge(patientDetails?.birthday)}
          iconColor="#9333EA"
          iconBg="#F3E8FF"
        />

        <InfoRow
          icon="water-outline"
          label="Blood Group"
          value={patientDetails?.bloodGroup}
          locked
          iconColor="#DC2626"
          iconBg="#FEE2E2"
        />

        <InfoRow
          icon="warning-outline"
          label="Allergies"
          value={formatArrayValue(patientDetails?.allergies)}
          multiline
          iconColor="#D97706"
          iconBg="#FEF3C7"
        />

        <InfoRow
          icon="pulse-outline"
          label="Chronic Conditions"
          value={patientDetails?.chronicConditions || 'None'}
          multiline
          iconColor="#BE123C"
          iconBg="#FFE4E6"
        />

        <InfoRow
          icon="medkit-outline"
          label="Current Medications"
          value={patientDetails?.currentMedications || 'None'}
          multiline
          iconColor="#0F766E"
          iconBg="#CCFBF1"
        />
      </SectionCard>

      <SectionCard
        title="Emergency Contact"
        subtitle="Contact person for urgent situations"
        icon="alert-circle-outline"
      >
        <InfoRow
          icon="person-circle-outline"
          label="Emergency Contact Name"
          value={patientDetails?.emergencyContactName}
          iconColor="#EA580C"
          iconBg="#FFEDD5"
        />

        <InfoRow
          icon="call-outline"
          label="Emergency Contact Number"
          value={patientDetails?.emergencyContactNumber}
          iconColor="#EA580C"
          iconBg="#FFEDD5"
        />

        <InfoRow
          icon="location-outline"
          label="Address"
          value={patientDetails?.address}
          multiline
          iconColor="#475569"
          iconBg="#F1F5F9"
        />
      </SectionCard>

      <View style={styles.noteCard}>
        <View style={styles.noteIcon}>
          <MaterialCommunityIcons name="shield-check-outline" size={22} color={C.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.noteTitle}>Protected Profile Fields</Text>
          <Text style={styles.noteText}>
            Name, Patient ID, Blood Group, and already-set Email are treated as read-only fields for safety and record accuracy.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  center: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
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
    overflow: 'hidden',
    ...SHADOW.md,
  },

  heroCircleOne: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
    right: -42,
    top: -44,
  },

  heroCircleTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(13,148,136,0.35)',
    right: 12,
    bottom: -64,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  heroSmall: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '800',
  },

  heroName: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 4,
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },

  pill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },

  pillLabel: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
  },

  pillValue: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },

  primaryAction: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    ...SHADOW.sm,
  },

  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },

  secondaryAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    ...SHADOW.sm,
  },

  secondaryActionText: {
    color: C.primary,
    fontWeight: '900',
    fontSize: 13,
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
    gap: 12,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  rowIconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowContent: {
    flex: 1,
  },

  rowLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },

  rowLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },

  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  lockText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '900',
  },

  rowValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },

  noteCard: {
    backgroundColor: '#ECFEFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#A5F3FC',
    flexDirection: 'row',
    gap: 12,
    ...SHADOW.sm,
  },

  noteIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#CFFAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  noteTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  noteText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 3,
    fontWeight: '600',
  },
});