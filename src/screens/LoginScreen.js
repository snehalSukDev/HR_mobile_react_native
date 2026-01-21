import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  ImageBackground,
  Animated,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import {
  getFrappeBaseUrl,
  loginUser,
  setFrappeBaseUrl,
} from "../utils/frappeApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Background image import
const bgImage = require("../assests/login/bg3.png");

const LoginScreen = ({ onLoginSuccess }) => {
  const [frappeUrl, setFrappeUrl] = useState(getFrappeBaseUrl());
  const [siteName, setSiteName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Animation ref (ONLY for background)
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ✅ Zoom In / Zoom Out loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const normalizeSite = (s) =>
    (s || "")
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .trim();

  useEffect(() => {
    setSiteName(normalizeSite(frappeUrl));
  }, [frappeUrl]);

  const handleLogin = async () => {
    if (!siteName) {
      Alert.alert("Validation Error", "Please enter site name.");
      return;
    }
    if (!email || !password) {
      Alert.alert("Validation Error", "Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      const fullUrl = `https://${normalizeSite(siteName)}`;
      setFrappeBaseUrl(fullUrl);
      await AsyncStorage.setItem("frappeBaseUrl", fullUrl);
      const res = await loginUser(email, password);

      if (!isMountedRef.current) return;

      if (res?.message === "Logged In") {
        await AsyncStorage.setItem("currentUserEmail", email);
        if (isMountedRef.current) {
          onLoginSuccess();
        }
      } else {
        if (isMountedRef.current) {
          Alert.alert("Login Failed", "Invalid credentials");
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert("Error", error.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 🔥 Animated Background ONLY */}
      <Animated.View
        style={[
          styles.animatedBg,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <ImageBackground source={bgImage} style={styles.bg} />
      </Animated.View>

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Content (NOT animated) */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.appTitle}>Techbird HR</Text>
              <Text style={styles.loginTitle}>Login to Your Account</Text>

              <View style={styles.urlRow}>
                <View style={styles.urlPrefix}>
                  <Text style={styles.urlPrefixText}>https://</Text>
                </View>
                <TextInput
                  style={styles.urlInput}
                  placeholder="yourdomain.com"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="url"
                  value={siteName}
                  onChangeText={(t) => setSiteName(normalizeSite(t))}
                  editable={!loading}
                />
              </View>

              {/* Email */}
              <TextInput
                style={styles.input}
                placeholder="Email or Username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />

              {/* Password */}
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />

                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#666" />
                  ) : (
                    <Eye size={20} color="#666" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, loading && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;
const styles = StyleSheet.create({
  animatedBg: {
    ...StyleSheet.absoluteFillObject,
  },

  bg: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    padding: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 16,
    overflow: "hidden",
  },
  urlPrefix: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "#f5f7fa",
    borderRightWidth: 1,
    borderRightColor: "#eee",
  },
  urlPrefixText: {
    color: "#333",
    fontWeight: "600",
  },
  urlInput: {
    flex: 1,
    padding: 14,
  },

  appTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: "#2b6cb0",
    marginBottom: 6,
  },

  loginTitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    marginBottom: 24,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 16,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 20,
  },

  passwordInput: {
    flex: 1,
    padding: 14,
  },

  eyeIcon: {
    paddingHorizontal: 12,
  },

  loginButton: {
    backgroundColor: "#2b6cb0",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  loginButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
