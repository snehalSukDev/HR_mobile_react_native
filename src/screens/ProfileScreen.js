// src/screens/ProfileScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Button,
  Alert,
} from "react-native";
import {
  getResourceList,
  fetchEmployeeDetails,
  callFrappeMethod,
  getGeolocation,
} from "../utils/frappeApi";
import { format } from "date-fns";
import ProfileAvatar from "../Components/ProfileAvatar";

const ProfileScreen = ({ currentUserEmail, onLogout }) => {
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchEmployeeDetails(currentUserEmail, true);
      setEmployeeProfile(profile);
      console.log("Employee profile:", profile);
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

  const [checkins, setCheckins] = useState([]);
  const fetchCheckins = useCallback(async () => {
    try {
      const data = await getResourceList("Employee Checkin", {
        filters: JSON.stringify([["time", "Timespan", "today"]]),
        fields: JSON.stringify(["log_type"]),
        order_by: "time asc",
        limit_page_length: 50,
      });
      setCheckins(data || []);
    } catch (e) {
      console.error("Error fetching checkins:", e);
    }
  }, []);
  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  console.log("Checkins:", checkins);

  const lastLog = checkins?.[checkins.length - 1];
  const shouldShowCheckIn = !lastLog || lastLog.log_type === "OUT";

  const handleLogoutPress = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: onLogout, style: "destructive" },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Reload" onPress={fetchProfile} color="#007bff" />
      </View>
    );
  }

  if (!employeeProfile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noDataText}>No profile data available.</Text>
        <Button title="Reload" onPress={fetchProfile} color="#007bff" />
      </View>
    );
  }

  const handleCheck = async (logType) => {
    try {
      const { latitude, longitude } = await getGeolocation();
      const doc = {
        doctype: "Employee Checkin",
        employee: employeeProfile?.name,
        log_type: logType,
        time: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        latitude,
        longitude,
      };
      const response = await callFrappeMethod(
        "frappe.desk.form.save.savedocs",
        {
          doc: JSON.stringify(doc),
          action: "Save",
        }
      );
      console.log("Frappe method call response:", response);
      Alert.alert(
        "Success",
        `Checked ${logType === "IN" ? "in" : "out"} successfully`
      );
      fetchCheckins();
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to record check-in/out");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <ProfileAvatar
            imagePath={employeeProfile.image}
            employeeName={employeeProfile.employee_name}
            size={120}
          />
          <Text style={styles.employeeName}>
            {employeeProfile.employee_name}
          </Text>
          <Text style={styles.employeeDesignation}>
            {employeeProfile.designation}
          </Text>
          <Text style={styles.employeeId}>{employeeProfile.name}</Text>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>
              {employeeProfile.user_id || "N/A"}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>
              {employeeProfile.mobile_no || "N/A"}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Department</Text>
            <Text style={styles.detailValue}>
              {employeeProfile.department || "N/A"}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date of Joining</Text>
            <Text style={styles.detailValue}>
              {employeeProfile.date_of_joining
                ? new Date(employeeProfile.date_of_joining).toDateString()
                : "N/A"}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>
              {employeeProfile.gender || "N/A"}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Blood Group</Text>
            <Text style={styles.detailValue}>
              {employeeProfile.blood_group || "N/A"}
            </Text>
          </View>
          {/* Add more fields as needed based on your Frappe Employee DocType */}
        </View>

        <View style={styles.logoutButtonContainer}>
          <Button title="Logout" onPress={handleLogoutPress} color="#dc3545" />
        </View>

        <View style={styles.logoutButtonContainer}>
          <Button
            title={shouldShowCheckIn ? "Check In" : "Check Out"}
            onPress={() => handleCheck(shouldShowCheckIn ? "IN" : "OUT")}
            color="#007bff"
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: "#f0f2f5" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10 },
  errorText: { color: "red", marginBottom: 10 },
  noDataText: { color: "#666", marginBottom: 10 },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    // elevation: 5,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#007bff",
    marginBottom: 10,
  },
  employeeName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  employeeDesignation: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  employeeId: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  detailItem: {
    width: "48%", // Approx half width for two columns
    marginBottom: 15,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  logoutButtonContainer: {
    marginTop: 20,
    alignSelf: "center",
    width: "80%",
  },
});

export default ProfileScreen;
