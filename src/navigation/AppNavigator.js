import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Menu,
  Bell,
  Home,
  Info,
  Fingerprint,
  Leaf,
  DollarSign,
  IdCardLanyard,
  CalendarClock,
  Settings,
  Palette,
  ChevronLeft,
  Wallet,
  CheckCheck,
  Logs,
} from "lucide-react-native";

import { TouchableOpacity, View, StyleSheet } from "react-native";

// Screens
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ShiftDetailsScreen from "../screens/ShiftDetailsScreen";
import LeavesScreen from "../screens/LeavesScreen";
import SalarySlipScreen from "../screens/SalarySlipScreen";
import NotificationScreen from "../screens/NotificationScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ExpenseClaimScreen from "../screens/ExpenseClaimScreen";
import { createSharedOptions } from "./CreateSharedOptions";
import { NavigationContainer } from "@react-navigation/native";
import AttendanceScreen from "../screens/AttendanceScreen";

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
// Stack for Approval and related screens
function ApprovalStack({
  navigation,
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) {
  const screenOptions = createSharedOptions(onLogout);
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Approvals" options={{ title: "Approvals" }}>
        {(props) => (
          <ProfileScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Stack.Screen>
      {/* Add more screens like ApprovalDetails, RejectionReasons etc. */}
    </Stack.Navigator>
  );
}

// Bottom tabs
function BottomTabs({
  navigation,
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) {
  const insets = useSafeAreaInsets();
  const screenOptions = createSharedOptions(onLogout);
  return (
    <Tab.Navigator initialRouteName="Info" screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      >
        {(props) => (
          <HomeScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Info"
        options={{
          tabBarIcon: ({ color, size }) => (
            <IdCardLanyard size={size} color={color} />
          ),
        }}
      >
        {(props) => (
          <ProfileScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Attendance"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Fingerprint size={size} color={color} />
          ),
        }}
      >
        {(props) => (
          <AttendanceScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Leave"
        options={{
          tabBarIcon: ({ color, size }) => (
            <CalendarClock size={size} color={color} />
          ),
        }}
      >
        {(props) => (
          <LeavesScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Payroll"
        options={{
          tabBarIcon: ({ color, size }) => (
            <DollarSign size={size} color={color} />
          ),
        }}
      >
        {(props) => (
          <SalarySlipScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="More"
        component={View} // dummy component
        options={{
          tabBarIcon: ({ color, size }) => <Logs size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault(); // ⛔ stop default tab behavior
            navigation.navigate("Home"); // ✅ go to Home
          },
        })}
      ></Tab.Screen>
    </Tab.Navigator>
  );
}

// Main app navigator with drawer
export default function AppNavigator({
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {/* MAIN APP */}
      <RootStack.Screen name="Main">
        {() => (
          <Drawer.Navigator screenOptions={{ headerShown: false }}>
            <Drawer.Screen
              name="Close"
              options={{
                drawerIcon: () => <ChevronLeft size={20} color="#000" />,
              }}
            >
              {() => (
                <BottomTabs
                  currentUserEmail={currentUserEmail}
                  currentEmployeeId={currentEmployeeId}
                  onLogout={onLogout}
                />
              )}
            </Drawer.Screen>

            <Drawer.Screen
              name="Notifications"
              options={{ drawerIcon: () => <Bell size={20} color="#000" /> }}
            >
              {(props) => (
                <NotificationScreen
                  {...props}
                  currentUserEmail={currentUserEmail}
                  currentEmployeeId={currentEmployeeId}
                  onLogout={onLogout}
                />
              )}
            </Drawer.Screen>

            <Drawer.Screen
              name="Settings"
              options={{
                drawerIcon: () => <Settings size={20} color="#000" />,
              }}
            >
              {(props) => (
                <SettingsScreen
                  {...props}
                  currentUserEmail={currentUserEmail}
                  currentEmployeeId={currentEmployeeId}
                  onLogout={onLogout}
                />
              )}
            </Drawer.Screen>

            <Drawer.Screen
              name="Theme"
              options={{ drawerIcon: () => <Palette size={20} color="#000" /> }}
            >
              {(props) => (
                <SettingsScreen
                  {...props}
                  currentUserEmail={currentUserEmail}
                  currentEmployeeId={currentEmployeeId}
                  onLogout={onLogout}
                />
              )}
            </Drawer.Screen>

            <Drawer.Screen
              name="Approvals"
              options={{
                drawerIcon: () => <CheckCheck size={20} color="#000" />,
              }}
            >
              {(props) => (
                <ApprovalStack
                  {...props}
                  currentUserEmail={currentUserEmail}
                  currentEmployeeId={currentEmployeeId}
                  onLogout={onLogout}
                />
              )}
            </Drawer.Screen>
          </Drawer.Navigator>
        )}
      </RootStack.Screen>

      {/* 🔥 HIDDEN BUT NAVIGABLE */}
      <RootStack.Screen name="Expense Claim">
        {(props) => (
          <ExpenseClaimScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </RootStack.Screen>

      <RootStack.Screen name="Shift Roaster">
        {(props) => (
          <ShiftDetailsScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </RootStack.Screen>
    </RootStack.Navigator>
  );
}
const styles = StyleSheet.create({
  fabContainer: {
    backgroundColor: "#007bff",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  fabButton: {
    top: -20,
    justifyContent: "center",
    alignItems: "center",
  },
});
