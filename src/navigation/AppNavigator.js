import React, { useState } from "react";
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
  Briefcase,
  Layers,
} from "lucide-react-native";

import {
  TouchableOpacity,
  View,
  StyleSheet,
  Modal,
  Text,
  Image,
} from "react-native";

// Screens
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ShiftDetailsScreen from "../screens/ShiftDetailsScreen";
import LeavesScreen from "../screens/LeavesScreen";
import SalarySlipScreen from "../screens/SalarySlipScreen";
import NotificationScreen from "../screens/NotificationScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ExpenseClaimScreen from "../screens/ExpenseClaimScreen";
import AnnouncementScreen from "../screens/AnnouncementScreen";
import ApprovalScreen from "../screens/ApprovalScreen";
import { createSharedOptions } from "./CreateSharedOptions";
import { NavigationContainer } from "@react-navigation/native";
import AttendanceScreen from "../screens/AttendanceScreen";
const techbirdLogo = require("../assests/techbirdicon.png");

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function RedirectApprovals({ navigation }) {
  React.useEffect(() => {
    navigation.navigate("Close", {
      screen: "Home",
      params: { screen: "Approvals" },
    });
  }, [navigation]);
  return null;
}

// Stack for Home tab (includes Expense Claim, Shift Roaster, etc.)
function HomeStack({
  navigation,
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) {
  const screenOptions = createSharedOptions(onLogout, currentUserEmail);
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="HomeMain" options={{ title: "Home" }}>
        {(props) => (
          <HomeScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Approvals"
        options={({ navigation }) => ({
          title: "Approvals",
          headerLeft: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ paddingHorizontal: 4, paddingVertical: 4 }}
              >
                <ChevronLeft size={28} color="#000" />
              </TouchableOpacity>
              <Image
                source={techbirdLogo}
                style={{
                  width: 28,
                  height: 28,
                  marginLeft: 6,
                  borderRadius: 4,
                }}
                resizeMode="contain"
              />
            </View>
          ),
        })}
      >
        {(props) => (
          <ApprovalScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Expense Claim"
        options={({ navigation }) => ({
          title: "Expense Claim",
          headerLeft: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ paddingHorizontal: 4, paddingVertical: 4 }}
              >
                <ChevronLeft size={28} color="#000" />
              </TouchableOpacity>
              <Image
                source={techbirdLogo}
                style={{
                  width: 28,
                  height: 28,
                  marginLeft: 6,
                  borderRadius: 4,
                }}
                resizeMode="contain"
              />
            </View>
          ),
        })}
        >
          {(props) => (
            <ExpenseClaimScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Announcement"
        options={({ navigation }) => ({
          title: "Announcement",
          headerLeft: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ paddingHorizontal: 4, paddingVertical: 4 }}
              >
                <ChevronLeft size={28} color="#000" />
              </TouchableOpacity>
              <Image
                source={techbirdLogo}
                style={{
                  width: 28,
                  height: 28,
                  marginLeft: 6,
                  borderRadius: 4,
                }}
                resizeMode="contain"
              />
            </View>
          ),
        })}
      >
        {(props) => (
          <AnnouncementScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Shift Roaster"
        options={({ navigation }) => ({
          title: "Shift Roaster",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 16 }}
            >
              <ChevronLeft size={28} color="#000" />
            </TouchableOpacity>
          ),
        })}
      >
        {(props) => (
          <ShiftDetailsScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Info"
        options={({ navigation }) => ({
          title: "Info",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 16 }}
            >
              <ChevronLeft size={28} color="#000" />
            </TouchableOpacity>
          ),
        })}
      >
        {(props) => (
          <ProfileScreen
            {...props}
            currentUserEmail={currentUserEmail}
            currentEmployeeId={currentEmployeeId}
            onLogout={onLogout}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// Stack for Approval and related screens
function ApprovalStack({
  navigation,
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) {
  const screenOptions = createSharedOptions(onLogout, currentUserEmail);
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Approvals" options={{ title: "Approvals" }}>
        {(props) => (
          <ApprovalScreen
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
  initialTab,
}) {
  const insets = useSafeAreaInsets();
  const screenOptions = createSharedOptions(onLogout, currentUserEmail);
  const [showMoreModal, setShowMoreModal] = useState(false);
  return (
    <>
      <Modal
        visible={showMoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select an option</Text>
            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowMoreModal(false);
                  navigation.navigate("Close", {
                    screen: "Home",
                    params: { screen: "Approvals" },
                  });
                }}
              >
                <View style={styles.optionIconWrap}>
                  <CheckCheck size={20} color="#271085" />
                </View>
                <Text style={styles.optionText}>Approval</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowMoreModal(false);
                  navigation.navigate("Close", {
                    screen: "Home",
                    params: { screen: "Expense Claim" },
                  });
                }}
              >
                <View style={styles.optionIconWrap}>
                  <DollarSign size={20} color="#271085" />
                </View>
                <Text style={styles.optionText}>Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Tab.Navigator
        initialRouteName={initialTab || "Home"}
        screenOptions={screenOptions}
      >
        <Tab.Screen
          name="Home"
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        >
          {(props) => (
            <HomeStack
              {...props}
              currentUserEmail={currentUserEmail}
              currentEmployeeId={currentEmployeeId}
              onLogout={onLogout}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Shift"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Layers size={size} color={color} />
            ),
          }}
        >
          {(props) => (
            <ShiftDetailsScreen
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
          name="Salary"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Wallet size={size} color={color} />
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
              e.preventDefault();
              setShowMoreModal(true);
            },
          })}
        ></Tab.Screen>
      </Tab.Navigator>
    </>
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
              {(props) => (
                <BottomTabs
                  {...props}
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
              {(props) => <RedirectApprovals {...props} />}
            </Drawer.Screen>
          </Drawer.Navigator>
        )}
      </RootStack.Screen>

      {/* 🔥 HIDDEN BUT NAVIGABLE */}
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  modalOptions: {
    flexDirection: "row",
    gap: 12,
  },
  modalOption: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e9ecef",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#d9d9d9",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#271085",
  },
});
