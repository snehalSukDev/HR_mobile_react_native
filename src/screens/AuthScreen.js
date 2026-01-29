// src/screens/AuthScreen.js
// Basic login screen for the React Native app.
// Integrates with Frappe's actual login API.

import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginUser } from "../utils/frappeApi";
import CustomLoader from "../Components/CustomLoader";
import Toast from "react-native-toast-message";

const AuthScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Call the actual loginUser function from frappeApi.js
      await loginUser(email, password);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Logged in successfully",
      });
      setTimeout(() => {
        onLoginSuccess(); // Notify App.js that login was successful
      }, 1000);
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2:
          err.message ||
          "Login failed. Please check credentials and Frappe URL/CORS.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <CustomLoader visible={loading} />
      <Text style={styles.title}>Welcome to HR Dashboard</Text>
      <Text style={styles.subtitle}>Please login to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!loading} // Disable input when loading
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading} // Disable input when loading
      />
      <Button
        title={loading ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={loading}
        color="#007bff"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f0f2f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  errorText: {
    color: "red",
    marginBottom: 15,
    textAlign: "center",
  },
  loadingIndicator: {
    marginTop: 10,
  },
});

export default AuthScreen;
