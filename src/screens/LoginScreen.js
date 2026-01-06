import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { loginUser } from "../utils/frappeApi";

const LoginScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Validation Error", "Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await loginUser(email, password);
      if (res && res.message === "Logged In") {
        Alert.alert("Success", "You are now logged in");
        onLoginSuccess();
      } else {
        Alert.alert("Login Failed", "Invalid credentials");
      }
    } catch (error) {
      Alert.alert("Error", "Login request failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* <Image
        source={require("../assets/logo.png")} // 👈 place your logo image in `assets/logo.png`
        style={styles.logo}
        resizeMode="contain"
      /> */}
      <Text style={styles.appTitle}>Techbird HR</Text>
      <Text style={styles.loginTitle}>Login to Your Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email or Username"
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
        onChangeText={setPassword}
        value={password}
      />

      <TouchableOpacity
        style={[styles.loginButton, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f9f9f9",
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: "#2b6cb0",
    marginBottom: 4,
  },
  loginTitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 16,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  loginButton: {
    backgroundColor: "#2b6cb0",
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
