import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Button,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InteractionManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getResourceList, saveDoc } from "../utils/frappeApi";
import { Wallet, Plus, List as ListIcon } from "lucide-react-native";
import { format, parseISO } from "date-fns";
import DoctypeExpenseModal from "../Components/DoctypeExpenseModal";
import { useTheme } from "../context/ThemeContext";
import Toast from "react-native-toast-message";
import CustomLoader from "../Components/CustomLoader";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "dd MMM yy");
  } catch (e) {
    return dateString;
  }
};

const ApprovalScreen = ({ currentEmployeeId, currentUserEmail }) => {
  const { colors, theme } = useTheme();

  const getStatusColors = (status) => {
    const isDark = theme === "dark";
    const map = {
      Draft: {
        bg: isDark ? "#1a3d3d" : "#e0f2f1",
        text: isDark ? "#80cbc4" : "#00695c",
      },
      Submitted: {
        bg: isDark ? "#3d291a" : "#fff3e0",
        text: isDark ? "#ffcc80" : "#ef6c00",
      },
      Cancelled: {
        bg: isDark ? "#3d1a1a" : "#ffebee",
        text: isDark ? "#ef9a9a" : "#c62828",
      },
      Paid: {
        bg: isDark ? "#1b3d1b" : "#e8f5e9",
        text: isDark ? "#a5d6a7" : "#2e7d32",
      },
      Approved: {
        bg: isDark ? "#1b3d1b" : "#e8f5e9",
        text: isDark ? "#a5d6a7" : "#2e7d32",
      },
      Rejected: {
        bg: isDark ? "#3d1a1a" : "#ffebee",
        text: isDark ? "#ef9a9a" : "#c62828",
      },
      Unpaid: {
        bg: isDark ? "#3d1a1a" : "#ffebee",
        text: isDark ? "#ef9a9a" : "#c62828",
      },
      Pending: {
        bg: isDark ? "#3d291a" : "#fff3e0",
        text: isDark ? "#ffcc80" : "#ef6c00",
      },
      Open: {
        bg: isDark ? "#3d291a" : "#fff3e0",
        text: isDark ? "#ffcc80" : "#ef6c00",
      },
    };
    return map[status] || { bg: colors.card, text: colors.text };
  };

  const dynamicStyles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      centered: { backgroundColor: colors.background },
      text: { color: colors.text },
      textSecondary: { color: colors.textSecondary },
      card: { backgroundColor: colors.card, borderColor: colors.border },
      headerContainer: { backgroundColor: colors.background },
      tabButtonText: { color: colors.textSecondary },
      filterContainer: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      filterLabel: { color: colors.textSecondary },
      selectedBadge: { backgroundColor: theme === "dark" ? "#333" : "#e9ecef" },
      selectedBadgeText: { color: colors.text },
      segmentItem: { backgroundColor: theme === "dark" ? "#333" : "#f0f0f0" },
      segmentText: { color: colors.textSecondary },
      searchInput: {
        backgroundColor: colors.card,
        borderColor: colors.border,
        color: colors.text,
      },
      listHeaderBar: { backgroundColor: theme === "dark" ? "#333" : "#e9ecef" },
      listHeaderTitle: { color: colors.text },
      loadingText: { color: colors.textSecondary },
      emptyText: { color: colors.textSecondary },
      modalBackdrop: { backgroundColor: "rgba(0,0,0,0.5)" },
      modalCard: { backgroundColor: colors.card },
      modalHeader: { borderBottomColor: colors.border },
      modalTitle: { color: colors.text },
      modalBody: { backgroundColor: colors.card },
      modalFooter: { borderTopColor: colors.border },
      infoRow: { borderBottomColor: colors.border },
      label: { color: colors.textSecondary },
      value: { color: colors.text },
      viewToggles: { backgroundColor: colors.card, borderColor: colors.border },
      searchRow: { backgroundColor: colors.card, borderColor: colors.border },
      iconContainer: {
        backgroundColor: theme === "dark" ? "#333" : "#f0f0f0",
        borderColor: colors.border,
      },
    }),
    [colors, theme],
  );

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
          cache: true,
          forceRefresh: isRefresh,
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
          cache: true,
          forceRefresh: isRefresh,
        });

        if (!isMountedRef.current || latestReqRef.current.expense !== reqId)
          return;
        setClaimsToApprove(Array.isArray(approvalData) ? approvalData : []);
      } catch (err) {
        setError("Failed to load expense claims.");
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load expense claims.",
        });
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
        if (docTypeTab === "expense") fetchClaims(false);
        if (docTypeTab === "leave") fetchLeaves(false);
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
            "leave_type",
            "status",
            "total_leave_days",
            "from_date",
            "to_date",
            "description",
            "posting_date",
            "docstatus",
          ]),
          order_by: "modified desc",
          limit_page_length: 50,
          as_dict: 1,
          cache: true,
          forceRefresh: isRefresh,
        });
        if (!isMountedRef.current || latestReqRef.current.leave !== reqId)
          return;
        setLeaveList(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Failed to load leave applications.");
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load leave applications.",
        });
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
    if (docTypeTab === "expense") {
      fetchClaims(true);
    } else if (docTypeTab === "leave") {
      fetchLeaves(true);
    } else {
      setRefreshing(false);
    }
  };

  const handleItemPress = (item) => {
    Toast.show({
      type: "info",
      text1: "Claim Details",
      text2: `ID: ${item.name}\nAmount: ₹ ${item.total_claimed_amount}\nStatus: ${item.approval_status}`,
      visibilityTime: 4000,
    });
  };

  const renderItem = React.useCallback(
    ({ item }) => {
      const status = item.approval_status || item.status || "Draft";
      const { bg: statusColor, text: statusTextColor } =
        getStatusColors(status);

      return (
        <TouchableOpacity
          style={[styles.card, dynamicStyles.card]}
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
              <Text style={[styles.employeeName, dynamicStyles.text]}>
                {activeTab === "approvals" ? item.employee_name : item.name}
              </Text>
              <Text style={[styles.dateText, dynamicStyles.textSecondary]}>
                {formatDate(item.posting_date)}
              </Text>
              <Text style={[styles.amountText, dynamicStyles.text]}>
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
    [activeTab, docTypeTab, dynamicStyles],
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
      await fetchClaims(true);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `Expense ${nextStatus}`,
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not update expense status.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveStatusChange = async (nextStatus) => {
    if (!selectedLeave) return;
    try {
      setLoading(true);
      const doc = {
        doctype: "Leave Application",
        name: selectedLeave.name,
        status: nextStatus,
      };
      await saveDoc(doc);
      setShowLeaveModal(false);
      setSelectedLeave(null);
      await fetchLeaves(true);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `Leave ${nextStatus}`,
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not update leave status.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={[styles.headerContainer, dynamicStyles.headerContainer]}>
      <View style={styles.toolbar}>
        <View style={[styles.viewToggles, dynamicStyles.viewToggles]}>
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
                dynamicStyles.tabButtonText,
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
                dynamicStyles.tabButtonText,
                docTypeTab === "leave" && styles.activeTabButtonText,
              ]}
            >
              Leave
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "my_claims" && (
        <View style={[styles.filterContainer, dynamicStyles.filterContainer]}>
          <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>
            Filter:
          </Text>
          <View style={[styles.selectedBadge, dynamicStyles.selectedBadge]}>
            <Text
              style={[
                styles.selectedBadgeText,
                dynamicStyles.selectedBadgeText,
              ]}
            >
              {statusFilter}
            </Text>
          </View>
          <View style={styles.segmentRow}>
            {["All", "Draft", "Submitted"].map((opt) => (
              <TouchableOpacity
                key={`seg-my-${opt}`}
                style={[
                  styles.segmentItem,
                  dynamicStyles.segmentItem,
                  statusFilter === opt && styles.segmentItemActive,
                ]}
                onPress={() => setStatusFilter(opt)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    dynamicStyles.segmentText,
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
        <View style={[styles.filterContainer, dynamicStyles.filterContainer]}>
          <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>
            Filter:
          </Text>
          <View style={[styles.selectedBadge, dynamicStyles.selectedBadge]}>
            <Text
              style={[
                styles.selectedBadgeText,
                dynamicStyles.selectedBadgeText,
              ]}
            >
              {expenseStatus}
            </Text>
          </View>
          <View style={styles.segmentRow}>
            {["All", "Pending", "Approved", "Rejected"].map((opt) => (
              <TouchableOpacity
                key={`seg-exp-${opt}`}
                style={[
                  styles.segmentItem,
                  dynamicStyles.segmentItem,
                  expenseStatus === opt && styles.segmentItemActive,
                ]}
                onPress={() => setExpenseStatus(opt)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    dynamicStyles.segmentText,
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
        <View style={[styles.filterContainer, dynamicStyles.filterContainer]}>
          <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>
            Filter:
          </Text>
          <View style={[styles.selectedBadge, dynamicStyles.selectedBadge]}>
            <Text
              style={[
                styles.selectedBadgeText,
                dynamicStyles.selectedBadgeText,
              ]}
            >
              {leaveStatus}
            </Text>
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
                  dynamicStyles.segmentItem,
                  leaveStatus === opt.value && styles.segmentItemActive,
                ]}
                onPress={() => setLeaveStatus(opt.value)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    dynamicStyles.segmentText,
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
        <View style={[styles.searchRow, dynamicStyles.searchRow]}>
          <TextInput
            placeholder="Search Employee..."
            placeholderTextColor={colors.textSecondary}
            value={leaveSearch}
            onChangeText={setLeaveSearch}
            style={[styles.searchInput, dynamicStyles.searchInput]}
          />
        </View>
      )}
      {docTypeTab === "expense" && activeTab === "approvals" && (
        <View style={[styles.searchRow, dynamicStyles.searchRow]}>
          <TextInput
            placeholder="Search Employee..."
            placeholderTextColor={colors.textSecondary}
            value={expenseSearch}
            onChangeText={setExpenseSearch}
            style={[styles.searchInput, dynamicStyles.searchInput]}
          />
        </View>
      )}

      <View style={[styles.listHeaderBar, dynamicStyles.listHeaderBar]}>
        <View style={styles.listHeaderLeft}>
          <ListIcon size={18} color={colors.primary || "orange"} />
          <Text style={[styles.listHeaderTitle, dynamicStyles.listHeaderTitle]}>
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
    return <CustomLoader visible={loading && !refreshing} />;
  }

  if (error) {
    return (
      <View style={[styles.centered, dynamicStyles.centered]}>
        <Text style={[styles.errorText, dynamicStyles.text]}>{error}</Text>
        <Button
          title="Retry"
          onPress={() => fetchClaims()}
          color={colors.primary || "#007bff"}
        />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={["left", "right"]}
    >
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
            const { bg: statusColor, text: statusTextColor } =
              getStatusColors(s);
            return (
              <TouchableOpacity
                style={[styles.card, dynamicStyles.card]}
                onPress={() => {
                  setSelectedLeave(item);
                  setShowLeaveModal(true);
                }}
              >
                <View style={styles.cardRow}>
                  <View
                    style={[styles.iconContainer, dynamicStyles.iconContainer]}
                  >
                    <Wallet size={20} color={colors.textSecondary || "#555"} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.employeeName, dynamicStyles.text]}>
                      {item.employee_name}
                    </Text>
                    <Text
                      style={[styles.dateText, dynamicStyles.textSecondary]}
                    >
                      {formatDate(item.from_date)} - {formatDate(item.to_date)}
                    </Text>
                    <Text style={[styles.amountText, dynamicStyles.text]}>
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
            <View style={[styles.emptyContainer, dynamicStyles.emptyContainer]}>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
                No leave applications found.
              </Text>
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
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
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
        <View style={[styles.modalBackdrop, dynamicStyles.modalBackdrop]}>
          <View style={[styles.modalCard, dynamicStyles.modalCard]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                Expense Details
              </Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <Plus
                  size={24}
                  color={colors.text}
                  style={{ transform: [{ rotate: "45deg" }] }}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalBody, dynamicStyles.modalBody]}>
              {selectedExpense && (
                <>
                  <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                    <Text style={[styles.label, dynamicStyles.label]}>
                      Employee:
                    </Text>
                    <Text style={[styles.value, dynamicStyles.value]}>
                      {selectedExpense.employee_name}
                    </Text>
                  </View>
                  <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                    <Text style={[styles.label, dynamicStyles.label]}>
                      Amount:
                    </Text>
                    <Text style={[styles.value, dynamicStyles.value]}>
                      ₹ {selectedExpense.total_claimed_amount}
                    </Text>
                  </View>
                  <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                    <Text style={[styles.label, dynamicStyles.label]}>
                      Date:
                    </Text>
                    <Text style={[styles.value, dynamicStyles.value]}>
                      {formatDate(selectedExpense.posting_date)}
                    </Text>
                  </View>
                  <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                    <Text style={[styles.label, dynamicStyles.label]}>
                      Current Status:
                    </Text>
                    <Text style={[styles.value, dynamicStyles.value]}>
                      {selectedExpense.approval_status}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={[styles.modalFooter, dynamicStyles.modalFooter]}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleExpenseStatusChange("Rejected")}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleExpenseStatusChange("Approved")}
              >
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showLeaveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={[styles.modalBackdrop, dynamicStyles.modalBackdrop]}>
          <View style={[styles.modalCard, dynamicStyles.modalCard]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                Leave Application
              </Text>
              <TouchableOpacity onPress={() => setShowLeaveModal(false)}>
                <Plus
                  size={24}
                  color={colors.text}
                  style={{ transform: [{ rotate: "45deg" }] }}
                />
              </TouchableOpacity>
            </View>
            {selectedLeave ? (
              <View style={[styles.modalBody, dynamicStyles.modalBody]}>
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Text style={[styles.label, dynamicStyles.label]}>ID</Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {selectedLeave.name}
                  </Text>
                </View>
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Text style={[styles.label, dynamicStyles.label]}>
                    Employee
                  </Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {selectedLeave.employee_name}
                  </Text>
                </View>
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Text style={[styles.label, dynamicStyles.label]}>
                    Period
                  </Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {formatDate(selectedLeave.from_date)} -{" "}
                    {formatDate(selectedLeave.to_date)}
                  </Text>
                </View>
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Text style={[styles.label, dynamicStyles.label]}>Days</Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {String(selectedLeave.total_leave_days || 0)}
                  </Text>
                </View>
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Text style={[styles.label, dynamicStyles.label]}>Type</Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {selectedLeave.leave_type}
                  </Text>
                </View>
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Text style={[styles.label, dynamicStyles.label]}>
                    Status
                  </Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {selectedLeave.status === "Open" ||
                    selectedLeave.docstatus === 0
                      ? "Pending"
                      : selectedLeave.status}
                  </Text>
                </View>
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Text style={[styles.label, dynamicStyles.label]}>
                    Reason
                  </Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {selectedLeave.description || "N/A"}
                  </Text>
                </View>
                <View style={[styles.modalFooter, dynamicStyles.modalFooter]}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleLeaveStatusChange("Approved")}
                  >
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleLeaveStatusChange("Rejected")}
                  >
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.centered, dynamicStyles.centered]}>
                <CustomLoader visible={true} />
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
    </SafeAreaView>
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
