// src/screens/SalarySlipScreen.js
// Displays employee's salary slips.

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Button,
  TouchableOpacity,
  Alert,
} from "react-native";
import { getResourceList } from "../utils/frappeApi";
import { MaterialIcons } from "@expo/vector-icons";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

const SalarySlipScreen = ({
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) => {
  const [salarySlips, setSalarySlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("structure"); // ✅ FIX: Added state for activeTab

  const fetchSalarySlips = useCallback(async () => {
    if (!currentEmployeeId) {
      setLoading(false);
      setError("Employee ID not available to fetch salary slips.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filters = [["employee", "=", currentEmployeeId]];
      const slips = await getResourceList("Salary Slip", {
        filters: JSON.stringify(filters),
        fields: JSON.stringify([
          "name",
          "start_date",
          "end_date",
          "gross_pay",
          "net_pay",
          "status",
          "employee_name",
        ]),
        order_by: "start_date desc",
        limit_page_length: 20,
      });
      setSalarySlips(slips);
    } catch (err) {
      console.error("Error fetching salary slips:", err);
      setError(
        `Failed to load salary slips: ${err.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  }, [currentEmployeeId]);

  useEffect(() => {
    fetchSalarySlips();
  }, [fetchSalarySlips]);

  const handleViewSalarySlip = (slipName) => {
    Alert.alert("View Salary Slip", `Viewing salary slip: ${slipName}`);
    // In a real app, you might navigate to a detail screen or open a webview for the PDF.
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading salary slips...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Reload" onPress={fetchSalarySlips} color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Salary Slips</Text>
      </View>

      {/* ✅ FIX: Proper closing tag */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.leftButton,
            activeTab === "structure" && styles.activeButton,
          ]}
          onPress={() => setActiveTab("structure")}
        >
          <Text style={styles.buttonText}>Payroll Structure</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.rightButton,
            activeTab === "payslip" && styles.activeButton,
          ]}
          onPress={() => setActiveTab("payslip")}
        >
          <Text style={styles.buttonText}>Download Payslip</Text>
        </TouchableOpacity>
      </View>

      {salarySlips.length > 0 ? (
        salarySlips.map((slip) => (
          <View key={slip.name} style={styles.salarySlipItemCard}>
            <View style={styles.slipDetails}>
              <Text style={styles.slipPeriod}>
                Period: {formatDate(slip.start_date)} -{" "}
                {formatDate(slip.end_date)}
              </Text>
              <Text style={styles.slipAmounts}>
                Gross: ₹ {parseFloat(slip.gross_pay || 0).toFixed(2)} | Net: ₹{" "}
                {parseFloat(slip.net_pay || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.slipActions}>
              <View
                style={[
                  styles.slipStatusBadge,
                  styles[`status${slip.status.replace(/\s/g, "")}`],
                ]}
              >
                <Text style={styles.statusText}>{slip.status}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleViewSalarySlip(slip.name)}
                style={styles.iconButton}
              >
                <MaterialIcons name="visibility" size={20} color="#666" />
                <Text style={styles.iconButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>
          No salary slips found for your employee ID.
        </Text>
      )}

      {salarySlips.length > 0 && (
        <TouchableOpacity
          style={styles.viewAllLink}
          onPress={() =>
            Alert.alert("View All", "Navigating to all salary slips")
          }
        >
          <Text style={styles.viewAllLinkText}>View All Salary Slips</Text>
          <MaterialIcons name="arrow-right-alt" size={18} color="#007bff" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    padding: 15,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
  noDataText: {
    color: "#666",
    textAlign: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  salarySlipItemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  slipDetails: {
    flex: 1,
    minWidth: 150,
  },
  slipPeriod: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  slipAmounts: {
    fontSize: 13,
    color: "#666",
  },
  slipActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  slipStatusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#fff",
  },
  statusApproved: { backgroundColor: "#e8f5e9", color: "#43a047" },
  statusPaid: { backgroundColor: "#e0f2f7", color: "#01579b" },
  iconButton: {
    padding: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  iconButtonText: {
    fontSize: 14,
    color: "#666",
  },
  viewAllLink: {
    flexDirection: "row",
    alignSelf: "flex-end",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    marginBottom: 20,
  },
  viewAllLinkText: {
    color: "#007bff",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default SalarySlipScreen;
