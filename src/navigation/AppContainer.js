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

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.warn("Logout error:", error);
    } finally {
      // Clear local state regardless of server logout success
      setIsAuthenticated(false);
      setCurrentUserEmail(null);
      setCurrentEmployeeId(null);
    }
  };

  const handleLoginSuccess = async () => {
    // Re-fetch user details after successful login
    try {
      const user = await getCurrentUser();
      console.log("Login success, user:", user);
      if (user && user.email) {
        setCurrentUserEmail(user.email);
        const emp = await fetchEmployeeDetails(user.email, true);
        if (emp && emp.name) {
          setCurrentEmployeeId(emp.name);
        }
        setIsAuthenticated(true);
      } else {
        // Fallback if getCurrentUser fails or returns guest immediately after login
        // (Shouldn't happen if loginUser set cookies correctly)
        console.warn("Login success but getCurrentUser returned invalid data");
        setIsAuthenticated(true); // Let them in, but they might not have data
      }
    } catch (error) {
      console.error("Error fetching user details after login:", error);
      setIsAuthenticated(true); // Let them in? Or show error? Better to let them in and retry fetching in screens if needed, or handle gracefully.
    }
  };

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
          onLogout={handleLogout}
        />
      ) : (
        <AuthNavigator onLoginSuccess={handleLoginSuccess} />
      )}
    </NavigationContainer>
  );
};

export default AppContainer;
