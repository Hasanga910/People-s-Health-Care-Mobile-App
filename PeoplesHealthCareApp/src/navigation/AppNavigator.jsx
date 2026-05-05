import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer }      from '@react-navigation/native';
import { createStackNavigator }     from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons }                 from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { COLORS }  from '../constants/theme';

// ── Public screens ────────────────────────────────────────────
import IndexScreen    from '../screens/IndexScreen';
import LoginScreen    from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// ── Doctor ────────────────────────────────────────────────────
import DoctorLayout   from '../screens/doctor/DoctorLayout';

// ── Placeholder (other roles) ─────────────────────────────────
import PlaceholderScreen from '../screens/PlaceholderScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Public stack ───────────────────────────────────────────────
function PublicStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Index"    component={IndexScreen} />
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── Patient Tabs ──────────────────────────────────────────────
function PatientTabs() {
  const C = COLORS.patient;
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: C.primary,
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0', paddingBottom: 6, height: 60 },
      tabBarIcon: ({ color, size }) => {
        const icons = { Dashboard: 'home-outline', Appointments: 'calendar-outline', Prescriptions: 'document-text-outline', 'Lab Results': 'flask-outline', Billing: 'card-outline' };
        return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
      },
    })}>
      <Tab.Screen name="Dashboard"     component={PlaceholderScreen} />
      <Tab.Screen name="Appointments"  component={PlaceholderScreen} />
      <Tab.Screen name="Prescriptions" component={PlaceholderScreen} />
      <Tab.Screen name="Lab Results"   component={PlaceholderScreen} />
      <Tab.Screen name="Billing"       component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}

// ── Lab Tabs ──────────────────────────────────────────────────
function LabTabs() {
  const C = COLORS.lab;
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: C.primary,
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0', paddingBottom: 6, height: 60 },
      tabBarIcon: ({ color, size }) => {
        const icons = { Dashboard: 'home-outline', Requests: 'list-outline', Upload: 'cloud-upload-outline', Reports: 'bar-chart-outline' };
        return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
      },
    })}>
      <Tab.Screen name="Dashboard" component={PlaceholderScreen} />
      <Tab.Screen name="Requests"  component={PlaceholderScreen} />
      <Tab.Screen name="Upload"    component={PlaceholderScreen} />
      <Tab.Screen name="Reports"   component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}

// ── Pharmacy Tabs ─────────────────────────────────────────────
function PharmacyTabs() {
  const C = COLORS.pharmacy;
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: C.primary,
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0', paddingBottom: 6, height: 60 },
      tabBarIcon: ({ color, size }) => {
        const icons = { Dashboard: 'home-outline', Queue: 'list-outline', Inventory: 'cube-outline' };
        return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
      },
    })}>
      <Tab.Screen name="Dashboard" component={PlaceholderScreen} />
      <Tab.Screen name="Queue"     component={PlaceholderScreen} />
      <Tab.Screen name="Inventory" component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}

// ── Cashier Tabs ──────────────────────────────────────────────
function CashierTabs() {
  const C = COLORS.cashier;
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: C.primary,
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0', paddingBottom: 6, height: 60 },
      tabBarIcon: ({ color, size }) => {
        const icons = { Dashboard: 'home-outline', Billing: 'receipt-outline', Turnover: 'bar-chart-outline' };
        return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
      },
    })}>
      <Tab.Screen name="Dashboard" component={PlaceholderScreen} />
      <Tab.Screen name="Billing"   component={PlaceholderScreen} />
      <Tab.Screen name="Turnover"  component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}

// ── Admin Tabs ────────────────────────────────────────────────
function AdminTabs() {
  const C = COLORS.admin;
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: C.primary,
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0', paddingBottom: 6, height: 60 },
      tabBarIcon: ({ color, size }) => {
        const icons = { Dashboard: 'home-outline', Staff: 'people-outline', Appointments: 'calendar-outline', Finance: 'cash-outline', Settings: 'settings-outline' };
        return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
      },
    })}>
      <Tab.Screen name="Dashboard"    component={PlaceholderScreen} />
      <Tab.Screen name="Staff"        component={PlaceholderScreen} />
      <Tab.Screen name="Appointments" component={PlaceholderScreen} />
      <Tab.Screen name="Finance"      component={PlaceholderScreen} />
      <Tab.Screen name="Settings"     component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}

// ── Role → component map ──────────────────────────────────────
const ROLE_MAP = {
  doctor:   DoctorLayout,
  patient:  PatientTabs,
  lab:      LabTabs,
  pharmacy: PharmacyTabs,
  cashier:  CashierTabs,
  admin:    AdminTabs,
};

// ── Root navigator ────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.default.primary} />
      </View>
    );
  }

  const RoleComponent = user ? ROLE_MAP[user.role] : null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Public" component={PublicStack} />
        ) : (
          <Stack.Screen name="App" component={RoleComponent || PublicStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}