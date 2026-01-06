import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import AppNavigator from "./AppNavigator"; // Main dashboard for logged-in users
import AuthNavigator from "./AuthNavigator"; // Login/Register flow
import { getCurrentUser, fetchEmployeeDetails } from "../utils/frappeApi";

const AppContainer = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading, false = not logged in
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const user = await getCurrentUser();

        console.log("Current user:", user);
        if (user && user.email && user.email !== "Guest") {
          setCurrentUserEmail(user.email);
          // ✅ FETCH EMPLOYEE DETAILS BY EMAIL
          const emp = await fetchEmployeeDetails(user.email, true);
          console.log("Fetched employee from email:", emp);

          if (emp && emp.name) {
            setCurrentEmployeeId(emp.name); // 🔐 This is what LeavesScreen needs
            setIsAuthenticated(true);
          } else {
            console.warn("Employee details not found");
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.warn("[Auth Check] Not logged in:", error);
        setIsAuthenticated(false);
      }
    };

    checkLoginStatus();
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <AppNavigator
          currentUserEmail={currentUserEmail}
          currentEmployeeId={currentEmployeeId}
          onLogout={() => setIsAuthenticated(false)}
        />
      ) : (
        <AuthNavigator onLoginSuccess={() => setIsAuthenticated(true)} />
      )}
    </NavigationContainer>
  );
};

export default AppContainer;
