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

// ── Role Layouts (fully implemented) ─────────────────────────
import DoctorLayout   from '../screens/doctor/DoctorLayout';
import CashierLayout  from '../screens/cashier/CashierLayout';
import PatientLayout  from '../screens/patient/PatientLayout';
import AdminLayout    from '../screens/admin/AdminLayout';
import PharmacyLayout from '../screens/pharmacy/PharmacyLayout';
import LabLayout      from '../screens/lab/LabLayout';
// ── Placeholder (roles not yet implemented) ───────────────────
import PlaceholderScreen from '../screens/PlaceholderScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Public stack ──────────────────────────────────────────────
function PublicStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Index"    component={IndexScreen} />
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
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

// ── Role → component map ──────────────────────────────────────
// Prefer real Layout components over placeholder tabs
const ROLE_MAP = {
  doctor:   DoctorLayout,   // ✅ real layout (v1)
  patient:  PatientLayout,  // ✅ real layout (v1)
  cashier:  CashierLayout,  // ✅ real layout (v1)
  admin:    AdminLayout,    // ✅ real layout (v1)
  pharmacy: PharmacyLayout, // ✅ real layout (v3)
  lab:      LabLayout,        // 🔲 placeholder tabs until LabLayout is built
};

// ── Root navigator ────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color={COLORS.default?.primary ?? '#01579B'} />
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