import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

import AdminAppointments from "./AdminAppointments";
import AdminDashboard from "./AdminDashboard";
import AdminEquipment from "./AdminEquipment";
import AdminFinance from "./AdminFinance";
import AdminPatients from "./AdminPatients";
import AdminSettings from "./AdminSettings";
import AdminStaff from "./AdminStaff";

const Tab = createBottomTabNavigator();
const ACCENT = "#1A237E";

// ─────────────────────────────────────────────────────────────
// "More" menu items (extra screens reachable from the More sheet)
// ─────────────────────────────────────────────────────────────
const MORE_ITEMS = [
  {
    label: "Equipment Management",
    icon: "construct-outline",
    screen: "AdminEquipment",
  },
  {
    label: "Patient Overview",
    icon: "people-outline",
    screen: "AdminPatients",
  },
  { label: "Settings", icon: "settings-outline", screen: "AdminSettings" },
];

// ─────────────────────────────────────────────────────────────
// Custom bottom tab bar
// ─────────────────────────────────────────────────────────────
function AdminTabBar({ state, navigation, onMorePress }) {
  const insets = useSafeAreaInsets();
  const TABS = [
    {
      name: "AdminDashboard",
      label: "Dashboard",
      icon: "grid-outline",
      iconActive: "grid",
    },
    {
      name: "AdminStaff",
      label: "Staff",
      icon: "people-outline",
      iconActive: "people",
    },
    {
      name: "AdminAppointments",
      label: "Appointments",
      icon: "calendar-outline",
      iconActive: "calendar",
    },
    {
      name: "AdminFinance",
      label: "Finance",
      icon: "cash-outline",
      iconActive: "cash",
    },
    {
      name: "__more__",
      label: "More",
      icon: "ellipsis-horizontal-outline",
      iconActive: "ellipsis-horizontal",
    },
  ];

  return (
    <View style={[tb.bar, { paddingBottom: insets.bottom || 8 }]}>
      {TABS.map((tab) => {
        const route = state.routes.find((r) => r.name === tab.name);
        const focused = route
          ? state.index === state.routes.indexOf(route)
          : false;
        const isMore = tab.name === "__more__";
        const onPress = () => {
          if (isMore) {
            onMorePress();
            return;
          }
          const ev = navigation.emit({
            type: "tabPress",
            target: route?.key,
            canPreventDefault: true,
          });
          if (!focused && !ev.defaultPrevented) navigation.navigate(tab.name);
        };
        return (
          <TouchableOpacity
            key={tab.name}
            style={tb.item}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <View style={[tb.iconWrap, focused && tb.iconWrapActive]}>
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={22}
                color={focused ? ACCENT : "#94A3B8"}
              />
            </View>
            <Text style={[tb.label, focused && tb.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  item: { flex: 1, alignItems: "center", gap: 3 },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: "#E8EAF6" },
  label: { fontSize: 10, fontWeight: "500", color: "#94A3B8" },
  labelActive: { color: ACCENT, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────
// More bottom sheet (shows extra pages + sign out)
// ─────────────────────────────────────────────────────────────
function MoreSheet({ visible, onClose, onNavigate, user, logout }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 500,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  if (!visible) return null;

  const name = user?.name || "Admin";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={handleClose}
    >
      <Pressable style={ms.overlay} onPress={handleClose}>
        <Animated.View
          style={[
            ms.sheet,
            {
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={ms.handle} />
          <View style={ms.userRow}>
            <View style={ms.avatar}>
              <Text style={ms.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={ms.userName}>{name}</Text>
              <Text style={ms.userSub}>
                System Administrator · People's Health Care
              </Text>
            </View>
          </View>
          <View style={ms.divider} />
          {MORE_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={ms.menuItem}
              onPress={() => {
                handleClose();
                setTimeout(() => onNavigate(item.screen), 250);
              }}
              activeOpacity={0.7}
            >
              <View style={ms.menuIconBox}>
                <Ionicons name={item.icon} size={20} color={ACCENT} />
              </View>
              <Text style={ms.menuLabel}>{item.label}</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="#CBD5E1"
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>
          ))}
          <View style={ms.divider} />
          <TouchableOpacity
            style={ms.logoutBtn}
            onPress={() => {
              handleClose();
              setTimeout(logout, 250);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={ms.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  userName: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  userSub: { fontSize: 11, color: "#64748B", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8EAF6",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 15, fontWeight: "500", color: "#1E293B", flex: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },
});

// ─────────────────────────────────────────────────────────────
// Admin Layout — main export
// ─────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [moreVisible, setMoreVisible] = useState(false);
  const navRef = useRef(null);

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => {
          // Capture navigation for use by More sheet
          navRef.current = props.navigation;
          return (
            <AdminTabBar {...props} onMorePress={() => setMoreVisible(true)} />
          );
        }}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen
          name="AdminDashboard"
          component={AdminDashboard}
          options={{ title: "Dashboard" }}
        />
        <Tab.Screen
          name="AdminStaff"
          component={AdminStaff}
          options={{ title: "Staff" }}
        />
        <Tab.Screen
          name="AdminAppointments"
          component={AdminAppointments}
          options={{ title: "Appointments" }}
        />
        <Tab.Screen
          name="AdminFinance"
          component={AdminFinance}
          options={{ title: "Finance" }}
        />
        <Tab.Screen
          name="AdminPatients"
          component={AdminPatients}
          options={{ title: "Patients", tabBarButton: () => null }}
        />
        <Tab.Screen
          name="AdminEquipment"
          component={AdminEquipment}
          options={{ title: "Equipment", tabBarButton: () => null }}
        />
        <Tab.Screen
          name="AdminSettings"
          component={AdminSettings}
          options={{ title: "Settings", tabBarButton: () => null }}
        />
      </Tab.Navigator>

      <MoreSheet
        visible={moreVisible}
        onClose={() => setMoreVisible(false)}
        onNavigate={(screen) => navRef.current?.navigate(screen)}
        user={user}
        logout={logout}
      />
    </>
  );
}
