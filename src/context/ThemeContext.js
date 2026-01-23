import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

export const ThemeContext = createContext();

export const lightColors = {
  background: "#FFFFFF",
  text: "#000000",
  textSecondary: "#666666",
  card: "#FFFFFF",
  border: "#E0E0E0",
  primary: "#007bff",
  secondary: "#6c757d",
  success: "#28a745",
  danger: "#dc3545",
  error: "#dc3545",
  warning: "#ffc107",
  info: "#17a2b8",
  light: "#f8f9fa",
  dark: "#343a40",
  inputBg: "#F5F7FA",
  overlay: "rgba(0,0,0,0.5)",
  headerCard: "#213465",
};

export const darkColors = {
  background: "#121212",
  text: "#FFFFFF",
  textSecondary: "#AAAAAA",
  card: "#1E1E1E",
  border: "#333333",
  primary: "#007bff", // Keep brand color or adjust slightly
  secondary: "#adb5bd",
  success: "#28a745",
  danger: "#dc3545",
  error: "#cf6679",
  warning: "#ffc107",
  info: "#17a2b8",
  light: "#343a40",
  dark: "#f8f9fa",
  inputBg: "#2C2C2C",
  overlay: "rgba(255,255,255,0.1)",
  headerCard: "#1E1E1E",
};

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState(systemScheme || "light");

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("appTheme");
        if (savedTheme) {
          setTheme(savedTheme);
        } else if (systemScheme) {
          setTheme(systemScheme);
        }
      } catch (e) {
        console.log("Failed to load theme", e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem("appTheme", newTheme);
    } catch (e) {
      console.log("Failed to save theme", e);
    }
  };

  const colors = theme === "light" ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
