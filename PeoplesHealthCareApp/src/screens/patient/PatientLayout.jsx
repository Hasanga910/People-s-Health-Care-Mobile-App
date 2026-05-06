import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { COLORS, SHADOW } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

import ChangePasswordScreen from './ChangePasswordScreen';
import EditProfileScreen from './EditProfileScreen';
import NotificationScreen from './NotificationScreen';
import PatientAppointments from './PatientAppointments';
import PatientDashboard from './PatientDashboard';
import PatientProfile from './PatientProfile';
import BookAppointmentScreen from './BookAppointmentScreen';
import AppointmentDetailScreen from './AppointmentDetailScreen';
import PatientPrescriptions from './PatientPrescriptions';
import PatientLabResults from './PatientLabResults';
import PatientBilling from './PatientBilling';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

const C = COLORS?.patient || {
  primary: '#0D2137',
  secondary: '#1565C0',
  accent: '#00ACC1',
  light: '#E0F2FE',
};

const BASE = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
};

function PlaceholderScreen({ title, subtitle, icon }) {
  return (
    <View style={styles.placeholderRoot}>
      <View style={styles.placeholderIconBox}>
        <Ionicons name={icon || 'construct-outline'} size={36} color={C.primary} />
      </View>

      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderSubtitle}>
        {subtitle || 'This screen will be connected soon.'}
      </Text>
    </View>
  );
}

function AppointmentsPlaceholder() {
  return (
    <PlaceholderScreen
      title="Appointments"
      subtitle="Appointment list, booking, cancellation, and PDF download will be added here."
      icon="calendar-outline"
    />
  );
}

function PrescriptionsPlaceholder() {
  return (
    <PlaceholderScreen
      title="Prescriptions"
      subtitle="Patient prescriptions and prescription PDF download will be added here."
      icon="document-text-outline"
    />
  );
}

function LabResultsPlaceholder() {
  return (
    <PlaceholderScreen
      title="Lab Results"
      subtitle="Patient lab results and report viewing will be added here."
      icon="flask-outline"
    />
  );
}

function BillingPlaceholder() {
  return (
    <PlaceholderScreen
      title="Billing"
      subtitle="Billing and payment details can be connected here."
      icon="card-outline"
    />
  );
}

function PatientProfilePlaceholder() {
  return (
    <PlaceholderScreen
      title="My Profile"
      subtitle="Patient profile viewing and maintenance will be added here."
      icon="person-outline"
    />
  );
}

function EditProfilePlaceholder() {
  return (
    <PlaceholderScreen
      title="Edit Profile"
      subtitle="Profile editing will be added here."
      icon="create-outline"
    />
  );
}

function ChangePasswordPlaceholder() {
  return (
    <PlaceholderScreen
      title="Change Password"
      subtitle="Password changing will be added here."
      icon="lock-closed-outline"
    />
  );
}

function HeaderLogoutButton() {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from your patient account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      activeOpacity={0.85}
      style={styles.headerIconButton}
    >
      <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

function stackOptions(title) {
  return {
    headerShown: true,
    headerTitle: title,
    headerTitleAlign: 'center',
    headerStyle: {
      backgroundColor: C.primary,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {
      fontSize: 16,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    headerRight: () => <HeaderLogoutButton />,
    headerRightContainerStyle: {
      paddingRight: 12,
    },
  };
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: Platform.OS === 'ios' ? 86 : 66,
          paddingTop: 5,
          paddingBottom: Platform.OS === 'ios' ? 20 : 7,
          ...SHADOW?.sm,
        },
        tabBarLabelStyle: {
          fontSize: 9.5,
          fontWeight: '800',
          marginTop: 1,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Dashboard') {
            return (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={size}
                color={color}
              />
            );
          }

          if (route.name === 'Appointments') {
            return (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={size}
                color={color}
              />
            );
          }

          if (route.name === 'Prescriptions') {
            return (
              <Ionicons
                name={focused ? 'document-text' : 'document-text-outline'}
                size={size}
                color={color}
              />
            );
          }

          if (route.name === 'Lab Results') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'flask' : 'flask-outline'}
                size={size + 1}
                color={color}
              />
            );
          }

          if (route.name === 'Billing') {
            return (
              <Ionicons
                name={focused ? 'card' : 'card-outline'}
                size={size}
                color={color}
              />
            );
          }

          return <Ionicons name="ellipse-outline" size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={PatientDashboard} />
      <Tab.Screen name="Appointments" component={PatientAppointments} />
      <Tab.Screen name="Prescriptions" component={PatientPrescriptions} />
      <Tab.Screen name="Lab Results" component={PatientLabResults} />
      <Tab.Screen name="Billing" component={PatientBilling} />
    </Tab.Navigator>
  );
}

export default function PatientLayout() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      
      <RootStack.Screen
    name="BookAppointment"
    component={BookAppointmentScreen}
    options={stackOptions('Book Appointment')}
  />

  <RootStack.Screen
  name="AppointmentDetail"
  component={AppointmentDetailScreen}
  options={stackOptions('Appointment Details')}
/>


      <RootStack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={stackOptions('Notifications')}
      />

      <RootStack.Screen
  name="PatientProfile"
  component={PatientProfile}
  options={stackOptions('My Profile')}
/>

      <RootStack.Screen
  name="EditProfile"
  component={EditProfileScreen}
  options={stackOptions('Edit Profile')}
/>

      <RootStack.Screen
  name="ChangePassword"
  component={ChangePasswordScreen}
  options={stackOptions('Change Password')}
/>


    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderRoot: {
    flex: 1,
    backgroundColor: BASE.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  placeholderIconBox: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: C.light || '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },

  placeholderTitle: {
    color: BASE.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },

  placeholderSubtitle: {
    color: BASE.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
    maxWidth: 320,
  },
});