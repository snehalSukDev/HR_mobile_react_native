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
  TextInput,
  Modal,
} from "react-native";
import { InteractionManager } from "react-native";
import { getResourceList, saveDoc } from "../utils/frappeApi";
import { Wallet, Plus, List as ListIcon } from "lucide-react-native";
import { format, parseISO } from "date-fns";
import DoctypeExpenseModal from "../Components/DoctypeExpenseModal";

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

const ApprovalScreen = ({ currentEmployeeId, currentUserEmail }) => {
  const [myClaims, setMyClaims] = useState([]);
  const [claimsToApprove, setClaimsToApprove] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showNewModal, setShowNewModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("approvals");
  const [docTypeTab, setDocTypeTab] = useState("expense");
  const [leaveList, setLeaveList] = useState([]);
  const [leaveStatus, setLeaveStatus] = useState("all");
  const [leaveSearch, setLeaveSearch] = useState("");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [expenseStatus, setExpenseStatus] = useState("Pending");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const latestReqRef = useRef({ expense: 0, leave: 0 });
  const isMountedRef = useRef(true);
  const handleSetDocTypeTab = useCallback(
    (next) => {
      if (next === docTypeTab) return;
      InteractionManager.runAfterInteractions(() => {
        setDocTypeTab(next);
      });
    },
    [docTypeTab],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchClaims = useCallback(
    async (isRefresh = false) => {
      if (docTypeTab !== "expense") return;
      if (!currentEmployeeId) {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
        return;
      }

      const reqId = ++latestReqRef.current.expense;
      if (!isRefresh) setLoading(true);
      setError(null);

      try {
        const filters = [["employee", "=", currentEmployeeId]];
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

        if (!isMountedRef.current || latestReqRef.current.expense !== reqId)
          return;
        setMyClaims(Array.isArray(myData) ? myData : []);

        const approvalFilters = [["expense_approver", "=", currentEmployeeId]];
        if (expenseStatus && expenseStatus !== "All") {
          approvalFilters.push(["approval_status", "=", expenseStatus]);
        }
        if (expenseSearch) {
          approvalFilters.push(["employee_name", "like", `%${expenseSearch}%`]);
        }
        const approvalData = await getResourceList("Expense Claim", {
          filters: JSON.stringify(approvalFilters),
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

        if (!isMountedRef.current || latestReqRef.current.expense !== reqId)
          return;
        setClaimsToApprove(Array.isArray(approvalData) ? approvalData : []);
      } catch (err) {
        setError("Failed to load expense claims.");
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentEmployeeId, statusFilter, expenseStatus, expenseSearch, docTypeTab],
  );

  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (canceled) return;
        if (docTypeTab === "expense") fetchClaims(true);
        if (docTypeTab === "leave") fetchLeaves(true);
      });
      return () => {
        canceled = true;
        task && task.cancel && task.cancel();
      };
    }, [docTypeTab, fetchClaims, fetchLeaves]),
  );

  const fetchLeaves = useCallback(
    async (isRefresh = false) => {
      if (docTypeTab !== "leave") return;
      if (!currentUserEmail) {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
        return;
      }
      const reqId = ++latestReqRef.current.leave;
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const filters = [["leave_approver", "=", currentUserEmail]];
        if (leaveStatus === "Approved")
          filters.push(["status", "=", "Approved"]);
        if (leaveStatus === "Rejected")
          filters.push(["status", "=", "Rejected"]);
        if (leaveStatus === "Open") filters.push(["docstatus", "=", 0]);
        if (leaveSearch)
          filters.push(["employee_name", "like", `%${leaveSearch}%`]);
        const data = await getResourceList("Leave Application", {
          filters: JSON.stringify(filters),
          fields: JSON.stringify([
            "name",
            "employee_name",
            "from_date",
            "to_date",
            "total_leave_days",
            "leave_type",
            "description",
            "status",
            "docstatus",
            "modified",
          ]),
          order_by: "modified desc",
          limit_page_length: 50,
          as_dict: 1,
        });
        if (!isMountedRef.current || latestReqRef.current.leave !== reqId)
          return;
        setLeaveList(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Failed to load leave applications.");
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentUserEmail, leaveStatus, leaveSearch, docTypeTab],
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

  const renderItem = React.useCallback(
    ({ item }) => {
      const status = item.approval_status || "Draft";
      const statusColor = statusToColorMap[status]?.bg || "#f0f2f5";
      const statusTextColor = statusToColorMap[status]?.text || "#333";

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            if (docTypeTab === "expense" && activeTab === "approvals") {
              setSelectedExpense(item);
              setShowExpenseModal(true);
            } else {
              handleItemPress(item);
            }
          }}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconContainer}>
              <Wallet size={20} color="#555" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.employeeName}>
                {activeTab === "approvals" ? item.employee_name : item.name}
              </Text>
              <Text style={styles.dateText}>
                {formatDate(item.posting_date)}
              </Text>
              <Text style={styles.amountText}>
                ₹ {parseFloat(item.total_claimed_amount || 0).toFixed(2)}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={[styles.statusText, { color: statusTextColor }]}>
                {status}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [activeTab, docTypeTab],
  );

  const handleExpenseStatusChange = async (nextStatus) => {
    if (!selectedExpense) return;
    try {
      setLoading(true);
      const doc = {
        doctype: "Expense Claim",
        name: selectedExpense.name,
        approval_status: nextStatus,
      };
      await saveDoc(doc);
      setShowExpenseModal(false);
      setSelectedExpense(null);
      await fetchClaims();
    } catch (err) {
      Alert.alert(
        "Update Failed",
        "Could not update expense status. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.toolbar}>
        <View style={styles.viewToggles}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              docTypeTab === "expense" && styles.activeTabButton,
            ]}
            onPress={() => handleSetDocTypeTab("expense")}
          >
            <Text
              style={[
                styles.tabButtonText,
                docTypeTab === "expense" && styles.activeTabButtonText,
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              docTypeTab === "leave" && styles.activeTabButton,
            ]}
            onPress={() => handleSetDocTypeTab("leave")}
          >
            <Text
              style={[
                styles.tabButtonText,
                docTypeTab === "leave" && styles.activeTabButtonText,
              ]}
            >
              Leave
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "my_claims" && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter:</Text>
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>{statusFilter}</Text>
          </View>
          <View style={styles.segmentRow}>
            {["All", "Draft", "Submitted"].map((opt) => (
              <TouchableOpacity
                key={`seg-my-${opt}`}
                style={[
                  styles.segmentItem,
                  statusFilter === opt && styles.segmentItemActive,
                ]}
                onPress={() => setStatusFilter(opt)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    statusFilter === opt && styles.segmentTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {docTypeTab === "expense" && activeTab === "approvals" && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter:</Text>
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>{expenseStatus}</Text>
          </View>
          <View style={styles.segmentRow}>
            {["All", "Pending", "Approved", "Rejected"].map((opt) => (
              <TouchableOpacity
                key={`seg-exp-${opt}`}
                style={[
                  styles.segmentItem,
                  expenseStatus === opt && styles.segmentItemActive,
                ]}
                onPress={() => setExpenseStatus(opt)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    expenseStatus === opt && styles.segmentTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {docTypeTab === "leave" && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter:</Text>
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>{leaveStatus}</Text>
          </View>
          <View style={styles.segmentRow}>
            {[
              { label: "All", value: "all" },
              { label: "Pending", value: "Open" },
              { label: "Approved", value: "Approved" },
              { label: "Rejected", value: "Rejected" },
            ].map((opt) => (
              <TouchableOpacity
                key={`seg-leave-${opt.value}`}
                style={[
                  styles.segmentItem,
                  leaveStatus === opt.value && styles.segmentItemActive,
                ]}
                onPress={() => setLeaveStatus(opt.value)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    leaveStatus === opt.value && styles.segmentTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {docTypeTab === "leave" && (
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search Employee..."
            placeholderTextColor="#888"
            value={leaveSearch}
            onChangeText={setLeaveSearch}
            style={styles.searchInput}
          />
        </View>
      )}
      {docTypeTab === "expense" && activeTab === "approvals" && (
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search Employee..."
            placeholderTextColor="#888"
            value={expenseSearch}
            onChangeText={setExpenseSearch}
            style={styles.searchInput}
          />
        </View>
      )}

      <View style={styles.listHeaderBar}>
        <View style={styles.listHeaderLeft}>
          <ListIcon size={18} color="orange" />
          <Text style={styles.listHeaderTitle}>
            {docTypeTab === "leave"
              ? "Leave Approvals"
              : activeTab === "my_claims"
                ? "My Claims List"
                : "Pending Approvals"}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {docTypeTab === "leave"
              ? leaveList.length
              : activeTab === "my_claims"
                ? myClaims.length
                : claimsToApprove.length}
          </Text>
        </View>
      </View>
    </View>
  );

  const activeData =
    docTypeTab === "leave"
      ? leaveList
      : activeTab === "my_claims"
        ? myClaims
        : claimsToApprove;

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
      {docTypeTab === "leave" ? (
        <FlatList
          data={Array.isArray(leaveList) ? leaveList : []}
          keyExtractor={(item, idx) =>
            item && item.name ? String(item.name) : `row-${idx}`
          }
          renderItem={({ item }) => {
            const s =
              item.status === "Open" || item.docstatus === 0
                ? "Pending"
                : item.status || "N/A";
            const statusColor =
              s === "Approved"
                ? "#e8f5e9"
                : s === "Rejected"
                  ? "#ffebee"
                  : s === "Pending"
                    ? "#fff3e0"
                    : "#f0f2f5";
            const statusTextColor =
              s === "Approved"
                ? "#2e7d32"
                : s === "Rejected"
                  ? "#c62828"
                  : s === "Pending"
                    ? "#ef6c00"
                    : "#333";
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  setSelectedLeave(item);
                  setShowLeaveModal(true);
                }}
              >
                <View style={styles.cardRow}>
                  <View style={styles.iconContainer}>
                    <Wallet size={20} color="#555" />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.employeeName}>
                      {item.employee_name}
                    </Text>
                    <Text style={styles.dateText}>
                      {formatDate(item.from_date)} - {formatDate(item.to_date)}
                    </Text>
                    <Text style={styles.amountText}>
                      {String(item.total_leave_days || 0)} days •{" "}
                      {item.leave_type}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColor },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusTextColor }]}
                    >
                      {s}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          extraData={{ leaveStatus }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchLeaves(true);
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No leave applications found.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={
            Array.isArray(
              activeTab === "my_claims" ? myClaims : claimsToApprove,
            )
              ? activeTab === "my_claims"
                ? myClaims
                : claimsToApprove
              : []
          }
          keyExtractor={(item, idx) =>
            item && item.name ? String(item.name) : `row-${idx}`
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          extraData={{ expenseStatus, activeTab }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchClaims(true);
          }}
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
      )}
      <Modal
        visible={showExpenseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExpenseModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Expense Claim</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <Plus size={18} color="#333" />
              </TouchableOpacity>
            </View>
            {selectedExpense ? (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ID</Text>
                  <Text style={styles.detailValue}>{selectedExpense.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Employee</Text>
                  <Text style={styles.detailValue}>
                    {selectedExpense.employee_name}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedExpense.posting_date)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>
                    ₹{" "}
                    {parseFloat(
                      selectedExpense.total_claimed_amount || 0,
                    ).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>
                    {selectedExpense.approval_status || "Pending"}
                  </Text>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleExpenseStatusChange("Approved")}
                  >
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleExpenseStatusChange("Rejected")}
                  >
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <ActivityIndicator size="small" color="#271085" />
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={showLeaveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leave Application</Text>
              <TouchableOpacity onPress={() => setShowLeaveModal(false)}>
                <Plus size={18} color="#333" />
              </TouchableOpacity>
            </View>
            {selectedLeave ? (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ID</Text>
                  <Text style={styles.detailValue}>{selectedLeave.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Employee</Text>
                  <Text style={styles.detailValue}>
                    {selectedLeave.employee_name}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Period</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedLeave.from_date)} -{" "}
                    {formatDate(selectedLeave.to_date)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Days</Text>
                  <Text style={styles.detailValue}>
                    {String(selectedLeave.total_leave_days || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>
                    {selectedLeave.leave_type}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>
                    {selectedLeave.status === "Open" ||
                    selectedLeave.docstatus === 0
                      ? "Pending"
                      : selectedLeave.status}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reason</Text>
                  <Text style={styles.detailValue}>
                    {selectedLeave.description || "N/A"}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <ActivityIndicator size="small" color="#271085" />
              </View>
            )}
          </View>
        </View>
      </Modal>
      <DoctypeExpenseModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        doctype="Expense Claim"
        title="Expense Claim"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
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
  segmentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  segmentItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9d9d9",
    backgroundColor: "#fff",
  },
  segmentItemActive: {
    backgroundColor: "#271085",
    borderColor: "#271085",
  },
  segmentText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#fff",
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  modalBody: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  searchRow: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  searchInput: { flex: 1, color: "#333", fontSize: 14 },
});

export default ApprovalScreen;
