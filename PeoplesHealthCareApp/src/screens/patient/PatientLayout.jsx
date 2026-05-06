import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
    Alert,
    Platform,
    StyleSheet,
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
import PatientFeedback from './PatientFeedback';
import { ChatBot } from '../IndexScreen';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

const C = COLORS?.patient || {
  primary: '#0D2137',
  secondary: '#1565C0',
  accent: '#00ACC1',
  light: '#E0F2FE',
};

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
      <Tab.Screen
        name="PatientFeedback"
        component={PatientFeedback}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}

export default function PatientLayout() {
  return (
    <View style={styles.layoutRoot}>
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
        name="PatientFeedback"
        component={PatientFeedback}
        options={stackOptions('Feedback & Ratings')}
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
     <ChatBot fabBottom={86} />
      </View>
  );
}

const styles = StyleSheet.create({
   layoutRoot: {
    flex: 1,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
