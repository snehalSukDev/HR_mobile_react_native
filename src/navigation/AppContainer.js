import React, { useEffect, useState, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { View } from "react-native";
import AppNavigator from "./AppNavigator"; // Main dashboard for logged-in users
import AuthNavigator from "./AuthNavigator"; // Login/Register flow
import CustomLoader from "../Components/CustomLoader";
import {
  getCurrentUser,
  fetchEmployeeDetails,
  getFrappeBaseUrl,
  setFrappeBaseUrl,
  logoutUser,
} from "../utils/frappeApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AppContainer = () => {
  const isMountedRef = useRef(true);
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading, false = not logged in
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const storedBase = await AsyncStorage.getItem("frappeBaseUrl");
        if (storedBase) {
          setFrappeBaseUrl(storedBase);
        }
        const base = getFrappeBaseUrl();
        if (!base) {
          if (isMountedRef.current) {
            setIsAuthenticated(false);
          }
          return;
        }
        const user = await getCurrentUser();

        if (user && user.email && user.email !== "Guest") {
          if (isMountedRef.current) {
            setCurrentUserEmail(user.email);
          }
          // ✅ FETCH EMPLOYEE DETAILS BY EMAIL
          let emp;
          try {
            emp = await fetchEmployeeDetails(user.email, true);
          } catch (err) {
            console.warn("Failed to fetch employee details:", err);
          }

          if (emp && emp.name) {
            if (isMountedRef.current) {
              setCurrentEmployeeId(emp.name);
              setIsAuthenticated(true);
            }
          } else {
            console.warn("Employee details not found");
            if (isMountedRef.current) {
              setIsAuthenticated(false);
            }
          }
        } else {
          if (isMountedRef.current) {
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.warn("[Auth Check] Not logged in:", error);
        if (isMountedRef.current) {
          setIsAuthenticated(false);
        }
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      await AsyncStorage.multiRemove([
        "frappeBaseUrl",
        "currentUserEmail",
        "currentEmployeeId",
      ]);
    } catch (error) {
      console.warn("Logout error:", error);
    } finally {
      // Clear local state regardless of server logout success
      if (isMountedRef.current) {
        setIsAuthenticated(false);
        setCurrentUserEmail(null);
        setCurrentEmployeeId(null);
      }
    }
  };

  const handleLoginSuccess = async () => {
    // Re-fetch user details after successful login
    try {
      const user = await getCurrentUser();

      if (user && user.email) {
        if (isMountedRef.current) {
          setCurrentUserEmail(user.email);
        }
        const emp = await fetchEmployeeDetails(user.email, true);
        if (isMountedRef.current) {
          if (emp && emp.name) {
            setCurrentEmployeeId(emp.name);
          }
          setIsAuthenticated(true);
        }
      } else {
        // Fallback if getCurrentUser fails or returns guest immediately after login
        // (Shouldn't happen if loginUser set cookies correctly)
        console.warn("Login success but getCurrentUser returned invalid data");
        if (isMountedRef.current) {
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      // console.error("Error fetching user details after login:", error);
      if (isMountedRef.current) {
        setIsAuthenticated(true);
      }
    }
  };

  if (isAuthenticated === null) {
    return <CustomLoader visible={true} />;
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
