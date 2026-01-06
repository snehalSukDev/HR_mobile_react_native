// src/screens/HomeScreen.js

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Button,
} from "react-native";

import { fetchEmployeeDetails } from "../utils/frappeApi";
import {
  Megaphone,
  CheckCircle2,
  BarChart3,
  User,
  Clock,
  Wallet,
} from "lucide-react-native";
export default function HomeScreen({ navigation, currentUserEmail }) {
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchEmployeeDetails(currentUserEmail, true);
      setEmployeeProfile(profile);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [currentUserEmail]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!employeeProfile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noDataText}>No profile data available.</Text>
        <Button title="Reload" onPress={fetchProfile} color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.greeting}>Hi, {employeeProfile.employee_name}</Text>

      {/* Top cards */}
      <View style={styles.cardRow}>
        <View style={[styles.card, { backgroundColor: "#FDE2E1" }]}>
          <Megaphone size={20} />
          <Text style={styles.cardLabel}>Broadcast</Text>
          <View style={styles.cardBadge}>
            <Text style={styles.badgeText}>1</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: "#EDF4FE" }]}>
          <CheckCircle2 size={20} />
          <Text style={styles.cardLabel}>Approval</Text>
          <View style={styles.cardBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: "#E5F9F2" }]}>
          <BarChart3 size={20} />
          <Text style={styles.cardLabel}>Poll</Text>
          <View style={styles.cardBadge}>
            <Text style={styles.badgeText}>4</Text>
          </View>
        </View>
      </View>

      {/* Hard‑coded Quick Menu */}
      <Text style={styles.quickHeading}>Quick Filter</Text>
      <View style={styles.quickMenuRow}>
        <TouchableOpacity
          style={styles.quickItem}
          onPress={() => navigation.navigate("Info")}
        >
          <User size={20} />
          <Text style={styles.quickLabel}>My Info</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickItem}
          onPress={() => navigation.navigate("Attendance")}
        >
          <Clock size={20} />
          <Text style={styles.quickLabel}>Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickItem}
          onPress={() => navigation.navigate("Expense Claim")}
        >
          <Wallet size={20} />
          <Text style={styles.quickLabel}>Expense Claim</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickItem}
          onPress={() => navigation.navigate("Approvals")}
        >
          <Wallet size={20} />
          <Text style={styles.quickLabel}>Approvals</Text>
        </TouchableOpacity>
      </View>

      {/* ... other sections ... */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  greeting: { fontSize: 22, fontWeight: "600", marginBottom: 16 },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  card: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  cardLabel: { marginTop: 8, fontSize: 14 },
  cardBadge: {
    backgroundColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    top: 8,
    right: 8,
  },
  badgeText: { color: "white", fontSize: 12 },
  quickHeading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  quickMenuRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  quickItem: {
    alignItems: "center",
    width: 80,
  },
  quickLabel: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    color: "#666",
    marginBottom: 10,
  },
});
