import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Button,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
// import Icon from 'react-native-vector-icons/MaterialIcons';
import { MaterialIcons } from "@expo/vector-icons";
import { getResourceList } from "../utils/frappeApi";
import { Picker } from "@react-native-picker/picker";
import DoctypeFormModal from "../Components/DoctypeFormModal";

const ExpenseClaimScreen = ({ currentEmployeeId }) => {
  const { width } = useWindowDimensions();
  const isSmall = width < 400;

  const [myClaims, setMyClaims] = useState([]);
  const [claimsToApprove, setClaimsToApprove] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchClaims = useCallback(async () => {
    if (!currentEmployeeId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch own claims
      const filters = [["employee", "=", currentEmployeeId]];
      if (statusFilter !== "All") {
        filters.push(["docstatus", "=", statusFilter === "Submitted" ? 1 : 0]);
      }

      const myData = await getResourceList("Expense Claim", {
        filters: JSON.stringify(filters),
        fields: JSON.stringify([
          "name",
          "posting_date",
          "total_claimed_amount",
          "approval_status",
        ]),
        order_by: "posting_date desc",
        limit_page_length: 50,
      });

      setMyClaims(myData);

      // Fetch claims pending for user's approval
      const approvalData = await getResourceList("Expense Claim", {
        filters: JSON.stringify([
          ["expense_approver", "=", currentEmployeeId],
          ["approval_status", "=", "Pending"],
        ]),
        fields: JSON.stringify([
          "name",
          "employee_name",
          "posting_date",
          "total_claimed_amount",
          "approval_status",
        ]),
        order_by: "posting_date desc",
        limit_page_length: 50,
      });

      setClaimsToApprove(approvalData);
    } catch (err) {
      console.error("Error fetching expense claims:", err);
      setError("Failed to load expense claims.");
    } finally {
      setLoading(false);
    }
  }, [currentEmployeeId, statusFilter]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  if (loading) {
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
        <Button title="Retry" onPress={fetchClaims} />
      </View>
    );
  }

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={styles.colDate}>Date</Text>
      <Text style={styles.colAmount}>Amount</Text>
      <Text style={styles.colStatus}>Status</Text>
    </View>
  );

  const renderClaimRows = (claims, isForApproval = false) => {
    return claims.map((claim) => (
      <View key={claim.name} style={styles.row}>
        <Text style={styles.colDate}>
          {new Date(claim.posting_date).toLocaleDateString()}
        </Text>
        <Text style={styles.colAmount}>
          ₹ {claim.total_claimed_amount.toFixed(2)}
        </Text>
        <Text style={styles.colStatus}>
          {isForApproval ? `${claim.employee_name}` : claim.approval_status}
        </Text>
      </View>
    ));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Expense Claims</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => setShowNewModal(true)}>
          <MaterialIcons name="add" size={20} color="#fff" />

          <Text style={styles.newButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Filter My Claims:</Text>
        <Picker
          selectedValue={statusFilter}
          onValueChange={setStatusFilter}
          style={[styles.statusPicker, isSmall && { width: 180 }]}
        >
          <Picker.Item label="All" value="All" />
          <Picker.Item label="Draft" value="Draft" />
          <Picker.Item label="Submitted" value="Submitted" />
        </Picker>
      </View>

      <Text style={styles.subTitle}>My Expense Claims</Text>
      {myClaims.length === 0 ? (
        <Text style={styles.noData}>No claims found.</Text>
      ) : (
        <>
          {renderTableHeader()}
          {renderClaimRows(myClaims)}
        </>
      )}

      <Text style={styles.subTitle}>Claims Pending for My Approval</Text>
      {claimsToApprove.length === 0 ? (
        <Text style={styles.noData}>No pending approvals.</Text>
      ) : (
        <>
          {renderTableHeader()}
          {renderClaimRows(claimsToApprove, true)}
        </>
      )}
      <DoctypeFormModal visible={showNewModal} onClose={() => setShowNewModal(false)} doctype="Expense Claim" title="Expense Claim" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5", padding: 15 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#333" },
  errorText: { color: "red", marginBottom: 10 },
  noData: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    color: "#888",
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  newButtonText: { color: "#fff", marginLeft: 5, fontWeight: "bold" },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  filterLabel: { fontSize: 16, marginRight: 10 },
  statusPicker: {
    flex: 1,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 6,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#444",
    marginTop: 25,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#dee2e6",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    borderRadius: 6,
    marginBottom: 5,
  },
  colDate: { flex: 1, fontSize: 14, color: "#333" },
  colAmount: { flex: 1, fontSize: 14, color: "#444", textAlign: "center" },
  colStatus: { flex: 1, fontSize: 14, color: "#007bff", textAlign: "right" },
});

export default ExpenseClaimScreen;
