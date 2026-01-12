import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  Button,
} from "react-native";
import { getResourceList } from "../utils/frappeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { List as ListIcon, DollarSign } from "lucide-react-native";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

const statusToColorMap = {
  Draft: { bg: "#e0f2f1", text: "#00695c" },
  Submitted: { bg: "#fff3e0", text: "#ef6c00" },
  Cancelled: { bg: "#ffebee", text: "#c62828" },
  Paid: { bg: "#e8f5e9", text: "#2e7d32" },
  Unpaid: { bg: "#ffebee", text: "#c62828" },
  Overdue: { bg: "#fce4ec", text: "#880e4f" },
};

const SalarySlipScreen = ({
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) => {
  const [salarySlips, setSalarySlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("structure");
  const [refreshing, setRefreshing] = useState(false);

  const fetchSalarySlips = useCallback(
    async (isRefresh = false) => {
      if (!currentEmployeeId) {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
        setError("Employee ID not available to fetch salary slips.");
        return;
      }

      if (!isRefresh) setLoading(true);
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
        setSalarySlips(slips || []);
      } catch (err) {
        console.error("Error fetching salary slips:", err);
        setError(
          `Failed to load salary slips: ${err.message || "Unknown error"}`
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentEmployeeId]
  );

  useEffect(() => {
    fetchSalarySlips();
  }, [fetchSalarySlips]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSalarySlips(true);
  };

  const handleViewSalarySlip = (slipName) => {
    Alert.alert("View Salary Slip", `Viewing salary slip: ${slipName}`);
  };

  const renderItem = ({ item }) => {
    const statusColor = statusToColorMap[item.status]?.bg || "#f0f2f5";
    const statusTextColor = statusToColorMap[item.status]?.text || "#333";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleViewSalarySlip(item.name)}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <DollarSign size={20} color="#555" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.employeeName}>{item.employee_name}</Text>
            <Text style={styles.dateText}>
              {formatDate(item.start_date)} - {formatDate(item.end_date)}
            </Text>
            <Text style={styles.amountText}>
              Net: ₹ {parseFloat(item.net_pay || 0).toFixed(2)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusTextColor }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "structure" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("structure")}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "structure" && styles.activeTabButtonText,
            ]}
          >
            Payroll Structure
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "payslip" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("payslip")}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "payslip" && styles.activeTabButtonText,
            ]}
          >
            Download Payslip
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeaderBar}>
        <View style={styles.listHeaderLeft}>
          <ListIcon size={18} color="orange" />
          <Text style={styles.listHeaderTitle}>Salary Slips List</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{salarySlips.length}</Text>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
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
        <Button
          title="Reload"
          onPress={() => fetchSalarySlips()}
          color="#007bff"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={salarySlips}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No salary slips found.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa", // Match AttendanceScreen
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  headerContainer: {
    marginBottom: 10,
  },
  listHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e9ecef",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  listHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listHeaderTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: "#333",
  },
  badge: {
    backgroundColor: "#271085",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  cardContent: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  dateText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  amountText: {
    fontSize: 12,
    color: "#333",
    marginTop: 2,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#777",
    fontStyle: "italic",
  },
  // Tab buttons
  buttonContainer: {
    flexDirection: "row",
    marginBottom: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: "#271085",
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  activeTabButtonText: {
    color: "#fff",
  },
});

export default SalarySlipScreen;
