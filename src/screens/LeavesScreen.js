import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl,
  FlatList,
} from "react-native";
import { getResource, getResourceList } from "../utils/frappeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import DoctypeFormModal from "../Components/DoctypeFormModal";
import { useFocusEffect } from "@react-navigation/native";
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  CalendarCheck,
} from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import CustomLoader from "../Components/CustomLoader";
import Toast from "react-native-toast-message";

// --- Constants and Utility Functions (Keep as is, they are good!) ---

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString();
};

const getLeaveIcon = (type) => {
  if (type.toLowerCase().includes("casual")) return "beach-access";
  if (type.toLowerCase().includes("earned")) return "work";
  if (type.toLowerCase().includes("sick")) return "local-hospital";
  return "event-available";
};

const getLeaveColor = (type) => {
  if (type.toLowerCase().includes("casual")) return "#2196F3";
  if (type.toLowerCase().includes("earned")) return "#4CAF50";
  if (type.toLowerCase().includes("sick")) return "#9C27B0";
  return "#FF9800";
};
// --- End Constants and Utility Functions ---

const LeavesScreen = ({ currentUserEmail, currentEmployeeId, onLogout }) => {
  const { colors, theme } = useTheme();

  const getStatusColors = (status) => {
    const isDark = theme === "dark";
    const map = {
      Present: {
        bg: isDark ? "#1b5e20" : "#d4edda", // Darker green for dark mode
        text: isDark ? "#a5d6a7" : "#155724",
      },
      Absent: {
        bg: isDark ? "#7f0000" : "#f8d7da", // Darker red for dark mode
        text: isDark ? "#ef9a9a" : "#721c24",
      },
      Leave: {
        bg: isDark ? "#0d47a1" : "#cce5ff", // Darker blue for dark mode
        text: isDark ? "#90caf9" : "#004085",
      },
      Holiday: {
        bg: isDark ? "#f57f17" : "#fff3cd", // Darker yellow/orange for dark mode
        text: isDark ? "#fff59d" : "#856404",
      },
    };
    return map[status] || { bg: colors.card, text: colors.text };
  };

  const doctype = "Leave Application";
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 400;

  const isMountedRef = useRef(true);

  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh
  const [error, setError] = useState(null);
  const [viewType, setViewType] = useState("list");
  const [showApplyModal, setShowApplyModal] = useState(false);

  const dynamicStyles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      centered: { backgroundColor: colors.background },
      text: { color: colors.text },
      textSecondary: { color: colors.textSecondary },
      card: { backgroundColor: colors.card, borderColor: colors.border },
      leaveCard: { backgroundColor: colors.card, borderColor: colors.border },
      cardTitle: { color: colors.text },
      statLabel: { color: colors.textSecondary },
      statValue: { color: colors.text },
      statItem: { borderBottomColor: colors.border },
      viewToggles: { backgroundColor: colors.card, borderColor: colors.border },
      listHeaderBar: { backgroundColor: theme === "dark" ? "#333" : "#e9ecef" },
      listHeaderTitle: { color: colors.text },
      noDataContainer: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      noDataText: { color: colors.textSecondary },
      legendText: { color: colors.textSecondary },
      calendarStyle: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      loadingText: { color: colors.textSecondary },
      calendarTheme: {
        backgroundColor: colors.card,
        calendarBackground: colors.card,
        textSectionTitleColor: colors.textSecondary,
        dayTextColor: colors.text,
        todayTextColor: colors.primary,
        monthTextColor: colors.text,
        arrowColor: colors.primary,
        textDisabledColor: colors.border,
        selectedDayBackgroundColor: colors.primary,
        dotColor: colors.primary,
      },
    }),
    [colors, theme],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchLeaveData = useCallback(
    async (isRefresh = false) => {
      if (!currentEmployeeId) {
        if (isMountedRef.current) {
          setError(
            "Employee ID not available. Please ensure your profile is complete.",
          );
          if (isRefresh) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
        }
        return;
      }

      if (!isMountedRef.current) return;

      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      try {
        // Fetch employee to get assigned holiday list
        const employeeDoc = await getResource("Employee", currentEmployeeId);
        const holidayListName = employeeDoc?.holiday_list;

        let holidaysList = [];
        if (holidayListName) {
          const holidayListDoc = await getResource(
            "Holiday List",
            holidayListName,
          );
          if (Array.isArray(holidayListDoc?.holidays)) {
            holidaysList = holidayListDoc.holidays.map((h) => ({
              date: h.holiday_date || h.date,
              description: h.description || "",
            }));
          } else {
            console.warn(
              "Holiday List 'holidays' is not an array or is empty:",
              holidayListDoc?.holidays,
            );
          }
        }
        if (isMountedRef.current) {
          setHolidays(holidaysList);
        }

        // Fetch Leave Ledger
        const ledgerEntries = await getResourceList("Leave Ledger Entry", {
          filters: JSON.stringify([
            ["employee", "=", currentEmployeeId],
            ["docstatus", "=", 1],
          ]),
          fields: JSON.stringify(["leave_type", "leaves", "transaction_type"]),
          limit_page_length: 100,
          cache: true,
          forceRefresh: isRefresh,
        });

        const leaveMap = {};
        ledgerEntries.forEach((entry) => {
          const type = entry.leave_type;
          if (!leaveMap[type]) leaveMap[type] = { allocated: 0, taken: 0 };

          if (entry.transaction_type === "Leave Allocation") {
            leaveMap[type].allocated += entry.leaves;
          } else if (entry.transaction_type === "Leave Application") {
            leaveMap[type].taken += entry.leaves; // usually negative
          }
        });

        const balances = Object.keys(leaveMap).map((type) => {
          const { allocated, taken } = leaveMap[type];
          return {
            type,
            allocated,
            taken: Math.abs(taken),
            remaining: allocated - Math.abs(taken),
            icon: getLeaveIcon(type),
            color: getLeaveColor(type),
          };
        });
        if (isMountedRef.current) {
          setLeaveBalances(balances);
        }

        // Leave Applications
        const leaveApps = await getResourceList("Leave Application", {
          filters: JSON.stringify([["employee", "=", currentEmployeeId]]),
          fields: JSON.stringify([
            "name",
            "from_date",
            "to_date",
            "leave_type",
            "status",
          ]),
          order_by: "from_date desc",
          limit_page_length: 20,
          cache: true,
          forceRefresh: isRefresh,
        });
        if (isMountedRef.current) {
          setLeaveApplications(leaveApps || []);
        }

        // Attendance (optional)
        const attendance = await getResourceList("Attendance", {
          filters: JSON.stringify([["employee", "=", currentEmployeeId]]),
          fields: JSON.stringify(["attendance_date", "status"]),
          limit_page_length: 100,
          cache: true,
          forceRefresh: isRefresh,
        });
        if (isMountedRef.current) {
          setAttendanceRecords(attendance || []);
        }
      } catch (err) {
        console.error("🔥 Error fetching leave data:", err);
        if (isMountedRef.current) {
          Toast.show({
            type: "error",
            text1: "Error",
            text2:
              "Failed to load leave data. Please check your internet connection.",
          });
          setError("Failed to fetch leave data.");
        }
      } finally {
        if (isMountedRef.current) {
          if (isRefresh) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [currentEmployeeId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchLeaveData();
    }, [fetchLeaveData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaveData(true);
  }, [fetchLeaveData]);

  const getMarkedDates = () => {
    const marks = {};

    leaveApplications.forEach((app) => {
      const start = new Date(app.from_date);
      const end = new Date(app.to_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        const { bg, text } = getStatusColors("Leave");
        marks[key] = {
          customStyles: {
            container: {
              backgroundColor: bg,
              borderWidth: 1,
              borderColor: text + "33",
            },
            text: { color: text, fontWeight: "bold" },
          },
        };
      }
    });

    if (Array.isArray(holidays)) {
      holidays.forEach((holiday) => {
        const key = holiday.date;
        const leaveColors = getStatusColors("Leave");
        // Apply holiday style, but allow leave to override if it's both
        if (
          !marks[key] ||
          marks[key].customStyles.container.backgroundColor !== leaveColors.bg
        ) {
          const { bg, text } = getStatusColors("Holiday");
          marks[key] = {
            customStyles: {
              container: {
                backgroundColor: bg,
                borderWidth: 1,
                borderColor: text + "33",
              },
              text: { color: text, fontWeight: "bold" },
            },
          };
        }
      });
    }

    attendanceRecords.forEach((entry) => {
      const key = new Date(entry.attendance_date).toISOString().split("T")[0];
      // Apply attendance style, but allow leave/holiday to override
      if (!marks[key]) {
        const status = entry.status;
        const { bg, text } = getStatusColors(status);
        marks[key] = {
          customStyles: {
            container: {
              backgroundColor: bg || "#f0f2f5",
              borderWidth: 1,
              borderColor: (text || "#aaa") + "33",
            },
            text: { color: text || "#333" },
          },
        };
      }
    });

    return marks;
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.toolbar}>
        <View style={[styles.viewToggles, dynamicStyles.viewToggles]}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              viewType === "list" && styles.activeIconButton,
            ]}
            onPress={() => setViewType("list")}
          >
            <ListIcon
              size={20}
              color={viewType === "list" ? "#fff" : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              viewType === "calendar" && styles.activeIconButton,
            ]}
            onPress={() => setViewType("calendar")}
          >
            <CalendarIcon
              size={20}
              color={viewType === "calendar" ? "#fff" : colors.text}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowApplyModal(true)}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>Apply Leave</Text>
        </TouchableOpacity>
      </View>

      {viewType === "list" && (
        <View style={[styles.listHeaderBar, dynamicStyles.listHeaderBar]}>
          <View style={styles.listHeaderLeft}>
            <ListIcon size={18} color="orange" />
            <Text
              style={[styles.listHeaderTitle, dynamicStyles.listHeaderTitle]}
            >
              Leave Applications
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{leaveApplications.length}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderLeaveItem = ({ item }) => {
    const badgeColor = item.leave_type
      ? getLeaveColor(item.leave_type)
      : "#6c757d";
    return (
      <TouchableOpacity
        style={[styles.card, dynamicStyles.card]}
        activeOpacity={0.85}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <CalendarCheck size={20} color="#555" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.employeeName, dynamicStyles.text]}>
              {item.leave_type || "Leave"}
            </Text>
            <Text style={[styles.dateText, dynamicStyles.textSecondary]}>
              {formatDate(item.from_date)} - {formatDate(item.to_date)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${badgeColor}22`,
                borderColor: `${badgeColor}55`,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: badgeColor }]}>
              {item.status || "Applied"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLeaveBalancesHeader = () => (
    <View style={styles.leaveCardsGrid}>
      {leaveBalances.length === 0 ? (
        <View style={styles.noDataContainer}>
          <MaterialIcons name="info-outline" size={40} color="#666" />
          <Text style={styles.noDataText}>No leave balances found.</Text>
          <Text style={styles.noDataSubText}>
            Looks like there's no leave allocated to you yet. Pull down to
            refresh or contact HR for more information.
          </Text>
        </View>
      ) : (
        leaveBalances.map((item, index) => (
          <View
            key={`${item.type}-${index}`}
            style={[
              styles.leaveCard,
              dynamicStyles.leaveCard,
              (index + 1) % 2 === 0 && { marginRight: 0 },
            ]}
          >
            <View
              style={[styles.cardIcon, { backgroundColor: item.color + "22" }]}
            >
              <MaterialIcons name={item.icon} size={28} color={item.color} />
            </View>
            <Text style={styles.cardTitle}>{item.type}</Text>
            <View style={styles.cardStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Allocated</Text>
                <Text style={styles.statValue}>{item.allocated}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Taken</Text>
                <Text style={styles.statValue}>{item.taken}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Remaining</Text>
                <Text
                  style={[
                    styles.statValueHighlight,
                    { color: item.remaining < 0 ? "#dc3545" : "#28a745" },
                  ]}
                >
                  {item.remaining}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <CustomLoader visible={loading && !refreshing} />
      {renderHeader()}

      {error ? (
        <View style={[styles.centered, dynamicStyles.centered]}>
          <MaterialIcons name="error-outline" size={50} color="#dc3545" />
          <Text style={[styles.errorText, dynamicStyles.text]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLeaveData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : viewType === "calendar" ? (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007bff"
            />
          }
        >
          <Calendar
            key={theme}
            markingType="custom"
            markedDates={getMarkedDates()}
            style={[styles.calendarStyle, dynamicStyles.calendarStyle]}
            theme={dynamicStyles.calendarTheme}
          />
          <View style={styles.legendContainer}>
            {["Present", "Absent", "Leave", "Holiday"].map((key) => (
              <View key={key} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColorBox,
                    { backgroundColor: getStatusColors(key).bg },
                  ]}
                />
                <Text style={[styles.legendText, dynamicStyles.legendText]}>
                  {key}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={leaveApplications}
          keyExtractor={(item, index) =>
            item.name || `${item.from_date}-${index}`
          }
          renderItem={renderLeaveItem}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={renderLeaveBalancesHeader}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View
              style={[styles.noDataContainer, dynamicStyles.noDataContainer]}
            >
              <MaterialIcons
                name="event-note"
                size={40}
                color={colors.textSecondary}
              />
              <Text style={[styles.noDataText, dynamicStyles.noDataText]}>
                No leave applications found.
              </Text>
              <Text style={[styles.noDataSubText, dynamicStyles.textSecondary]}>
                Tap Apply Leave to create a new request.
              </Text>
            </View>
          }
        />
      )}

      <DoctypeFormModal
        visible={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={() => {
          fetchLeaveData(true);
        }}
        doctype={doctype}
        title="Leave Application"
        hiddenFields={["leave_balance", "salary_slip", "letter_head"]}
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
  contentContainer: {
    paddingBottom: 20,
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
    color: "#555",
  },
  errorText: {
    color: "#dc3545",
    marginBottom: 15,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerContainer: {
    marginBottom: 16,
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
  },
  iconButton: {
    padding: 8,
    borderRadius: 6,
  },
  activeIconButton: {
    backgroundColor: "#271085",
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
  leaveCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  leaveCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    marginBottom: 15,
    width: "48%",
    marginRight: "4%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e9ecef",
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#343a40",
    marginBottom: 10,
    textAlign: "center",
  },
  cardStats: {
    width: "100%",
    paddingHorizontal: 5,
  },
  statItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#dee2e6",
  },
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
    flex: 1,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
  },
  statValueHighlight: {
    fontSize: 12,
    fontWeight: "700",
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700", // Bolder title
    color: "#343a40", // Darker text for titles
  },
  switchButton: {
    backgroundColor: "#6c757d", // Grey button for toggle
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25, // More rounded for a modern pill look
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000", // Subtle shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  switchButtonIcon: {
    marginRight: 6,
  },
  switchButtonText: {
    color: "#fff",
    fontWeight: "600", // Slightly bolder
    fontSize: 13,
  },
  // Leave Cards Grid
  leaveCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  leaveCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    marginBottom: 15,
    width: "48%",
    marginRight: "4%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e9ecef",
  },

  cardIcon: {
    width: 40, // Larger icon area
    height: 40,
    borderRadius: 30, // Perfect circle
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#343a40",
    marginBottom: 10,
    textAlign: "center",
  },
  cardStats: {
    width: "100%",
    paddingHorizontal: 5,
  },
  statItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth, // Separator for stats
    borderBottomColor: "#dee2e6",
  },
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
    flex: 1, // Allow label to take space
  },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
  },
  statValueHighlight: {
    fontSize: 12,
    fontWeight: "700",
    // Color dynamically set in component
  },
  // Calendar styles
  calendarStyle: {
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e9ecef",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginBottom: 8,
  },
  legendColorBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
  },
  legendText: {
    fontSize: 13,
    color: "#555",
  },
  // Recently Applied Leaves
  leaveApplicationsList: {
    backgroundColor: "#fff",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 20,
    overflow: "hidden", // Ensures inner items respect border radius
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e9ecef",
  },
  applicationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9ecef",
  },
  applicationIcon: {
    marginRight: 15,
  },
  applicationDetails: {
    flex: 1,
  },
  applicationType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#343a40",
    marginBottom: 2,
  },
  applicationDates: {
    fontSize: 13,
    color: "#6c757d",
  },
  // No data styles
  noDataContainer: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    minHeight: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e9ecef",
  },
  noDataText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginTop: 10,
    textAlign: "center",
  },
  noDataSubText: {
    fontSize: 13,
    color: "#777",
    marginTop: 5,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  // Apply Leave Button
  applyLeaveButton: {
    backgroundColor: "#007bff", // Primary action color
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 15, // Match card radius
    shadowColor: "#007bff", // Primary color shadow
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    marginTop: 20,
  },
  applyLeaveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#343a40",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  formField: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 6,
  },
  inputField: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#343a40",
    backgroundColor: "#fff",
  },
  selectField: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  optionPill: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionPillActive: {
    borderColor: "#007bff",
    backgroundColor: "#e7f1ff",
  },
  optionText: {
    fontSize: 13,
    color: "#343a40",
  },
  optionTextActive: {
    color: "#007bff",
    fontWeight: "600",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: "#fff",
    maxHeight: 180,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9ecef",
  },
  dropdownItemActive: {
    backgroundColor: "#e7f1ff",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#343a40",
  },
  checkField: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkLabel: {
    marginLeft: 8,
    color: "#343a40",
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e9ecef",
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  footerButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default LeavesScreen;
