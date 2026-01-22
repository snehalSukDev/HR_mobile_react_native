import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  Button,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getResourceList } from "../utils/frappeApi";
import { Picker } from "@react-native-picker/picker";
import { Wallet, Plus, List as ListIcon } from "lucide-react-native";
import { format, parseISO } from "date-fns";
import DoctypeExpenseModal from "../Components/DoctypeExpenseModal";
import { getCurrentUser, fetchEmployeeDetails } from "../utils/frappeApi";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "dd MMM yy");
  } catch (e) {
    return dateString;
  }
};

const statusToColorMap = {
  Draft: { bg: "#e0f2f1", text: "#00695c" },
  Submitted: { bg: "#fff3e0", text: "#ef6c00" },
  Cancelled: { bg: "#ffebee", text: "#c62828" },
  Paid: { bg: "#e8f5e9", text: "#2e7d32" },
  Approved: { bg: "#e8f5e9", text: "#2e7d32" },
  Rejected: { bg: "#ffebee", text: "#c62828" },
  Unpaid: { bg: "#ffebee", text: "#c62828" },
  Pending: { bg: "#fff3e0", text: "#ef6c00" },
};

const ExpenseClaimScreen = ({ currentEmployeeId }) => {
  const isMountedRef = useRef(true);
  const [myClaims, setMyClaims] = useState([]);
  const [claimsToApprove, setClaimsToApprove] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showNewModal, setShowNewModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("my_claims");
  const [effectiveEmployeeId, setEffectiveEmployeeId] =
    useState(currentEmployeeId);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (currentEmployeeId) {
      setEffectiveEmployeeId(currentEmployeeId);
    } else {
      (async () => {
        try {
          const { email } = await getCurrentUser();
          if (email) {
            const emp = await fetchEmployeeDetails(email, true);
            if (isMountedRef.current && emp?.name) {
              setEffectiveEmployeeId(emp.name);
            }
          }
        } catch (e) {
          console.error("Failed to fetch employee ID", e);
        }
      })();
    }
  }, [currentEmployeeId]);

  const fetchClaims = useCallback(
    async (isRefresh = false) => {
      if (!effectiveEmployeeId) {
        if (!isMountedRef.current) return;
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }

      if (!isMountedRef.current) return;

      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      try {
        // Fetch own claims
        const filters = [["employee", "=", effectiveEmployeeId]];
        if (statusFilter !== "All") {
          filters.push([
            "docstatus",
            "=",
            statusFilter === "Submitted" ? 1 : 0,
          ]);
        }

        const myData = await getResourceList("Expense Claim", {
          filters: JSON.stringify(filters),
          fields: JSON.stringify([
            "name",
            "posting_date",
            "total_claimed_amount",
            "approval_status",
            "employee_name",
          ]),
          order_by: "posting_date desc",
          limit_page_length: 50,
        });

        if (isMountedRef.current) {
          setMyClaims(myData || []);
        }

        // Fetch claims pending for user's approval
        const approvalData = await getResourceList("Expense Claim", {
          filters: JSON.stringify([
            ["expense_approver", "=", effectiveEmployeeId],
            ["approval_status", "=", "Pending"],
          ]),
          fields: JSON.stringify([
            "name",
            "employee_name",
            "posting_date",
            "total_claimed_amount",
            "approval_status",
            "employee_name", // ensure employee_name is fetched for approvals
          ]),
          order_by: "posting_date desc",
          limit_page_length: 50,
        });

        if (isMountedRef.current) {
          setClaimsToApprove(approvalData || []);
        }
      } catch (err) {
        console.error("Error fetching expense claims:", err);
        if (isMountedRef.current) {
          setError("Failed to load expense claims.");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [effectiveEmployeeId, statusFilter],
  );

  useFocusEffect(
    useCallback(() => {
      fetchClaims();
    }, [fetchClaims]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchClaims(true);
  };

  const handleItemPress = (item) => {
    Alert.alert(
      "Claim Details",
      `ID: ${item.name}\nAmount: ₹ ${item.total_claimed_amount}\nStatus: ${item.approval_status}`,
    );
  };

  const renderItem = ({ item }) => {
    const status = item.approval_status || "Draft";
    const statusColor = statusToColorMap[status]?.bg || "#f0f2f5";
    const statusTextColor = statusToColorMap[status]?.text || "#333";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <Wallet size={20} color="#555" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.employeeName}>
              {activeTab === "approvals" ? item.employee_name : item.name}
            </Text>
            <Text style={styles.dateText}>{formatDate(item.posting_date)}</Text>
            <Text style={styles.amountText}>
              ₹ {parseFloat(item.total_claimed_amount || 0).toFixed(2)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusTextColor }]}>
              {status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.toolbar}>
        <View style={styles.viewToggles}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "my_claims" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("my_claims")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "my_claims" && styles.activeTabButtonText,
              ]}
            >
              My Claims
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewModal(true)}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>New Claim</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "my_claims" && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter:</Text>
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>{statusFilter}</Text>
          </View>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={setStatusFilter}
              style={styles.picker}
              mode="dropdown"
              dropdownIconColor="#271085"
              prompt="Status"
            >
              <Picker.Item label="All" value="All" style={styles.pickerItem} />
              <Picker.Item
                label="Draft"
                value="Draft"
                style={styles.pickerItem}
              />
              <Picker.Item
                label="Submitted"
                value="Submitted"
                style={styles.pickerItem}
              />
            </Picker>
          </View>
        </View>
      )}

      <View style={styles.listHeaderBar}>
        <View style={styles.listHeaderLeft}>
          <ListIcon size={18} color="orange" />
          <Text style={styles.listHeaderTitle}>
            {activeTab === "my_claims" ? "My Claims List" : "Pending Approvals"}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {activeTab === "my_claims"
              ? myClaims.length
              : claimsToApprove.length}
          </Text>
        </View>
      </View>
    </View>
  );

  const activeData = activeTab === "my_claims" ? myClaims : claimsToApprove;

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading expense claims...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={() => fetchClaims()} color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activeData}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === "my_claims"
                ? "No expense claims found."
                : "No pending approvals."}
            </Text>
          </View>
        }
      />
      <DoctypeExpenseModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={() => {
          setShowNewModal(false);
          fetchClaims(true);
        }}
        doctype="Expense Claim"
        title="Expense Claim"
        hiddenFields={[
          "total_sanctioned_amount",
          "total_taxes_and_charges",
          "total_advance_amount",
          "reference_doctype",
          "delivery_trip",
          "vehicle_log",
          "task",
          "cost_center",
          "project",
          "mode_of_payment",
          "is_paid",
          "payable_account",
          "clearance_date",
          "total_amount_reimbursed",
          "custom_reference_doctype",
          "cost_center",
          "project",
          "status",
          "grand_total",
          "remark",
        ]}
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
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 10,
  },
  viewToggles: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    flex: 1,
    marginRight: 8,
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#271085",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginLeft: 10,
    marginRight: 10,
  },
  selectedBadge: {
    backgroundColor: "#e9ecef",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  selectedBadgeText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "600",
  },
  pickerWrapper: {
    flex: 1,
  },
  picker: {
    height: 60,
    width: "100%",
  },
  pickerItem: {
    fontSize: 14,
    padding: 2,
  },
  listHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e9ecef",
    padding: 12,
    borderRadius: 8,
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
});

export default ExpenseClaimScreen;
