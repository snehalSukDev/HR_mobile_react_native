import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl, // Added for pull-to-refresh
  Alert, // For showing more user-friendly error messages
} from "react-native";
import { getResource, getResourceList } from "../utils/frappeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";

// --- Constants and Utility Functions (Keep as is, they are good!) ---
const STATUS_COLORS = {
  Present: { bg: "#d4edda", text: "#155724" },
  Absent: { bg: "#f8d7da", text: "#721c24" },
  Leave: { bg: "#cce5ff", text: "#004085" },
  Holiday: { bg: "#fff3cd", text: "#856404" },
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
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 400;

  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh
  const [error, setError] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const fetchLeaveData = useCallback(
    async (isRefresh = false) => {
      if (!currentEmployeeId) {
        setError(
          "Employee ID not available. Please ensure your profile is complete."
        );
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
        return;
      }

      if (!isRefresh) setLoading(true);
      setError(null); // Clear previous errors

      try {
        // Fetch employee to get assigned holiday list
        const employeeDoc = await getResource("Employee", currentEmployeeId);
        const holidayListName = employeeDoc?.holiday_list;

        let holidaysList = [];
        if (holidayListName) {
          const holidayListDoc = await getResource(
            "Holiday List",
            holidayListName
          );
          if (Array.isArray(holidayListDoc?.holidays)) {
            holidaysList = holidayListDoc.holidays.map((h) => ({
              date: h.holiday_date || h.date,
              description: h.description || "",
            }));
          } else {
            console.warn(
              "Holiday List 'holidays' is not an array or is empty:",
              holidayListDoc?.holidays
            );
          }
        }
        setHolidays(holidaysList);

        // Fetch Leave Ledger
        const ledgerEntries = await getResourceList("Leave Ledger Entry", {
          filters: JSON.stringify([
            ["employee", "=", currentEmployeeId],
            ["docstatus", "=", 1],
          ]),
          fields: JSON.stringify(["leave_type", "leaves", "transaction_type"]),
          limit_page_length: 100,
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
        setLeaveBalances(balances);

        // Leave Applications
        const leaveApps = await getResourceList("Leave Application", {
          filters: JSON.stringify([["employee", "=", currentEmployeeId]]),
          fields: JSON.stringify(["from_date", "to_date", "leave_type"]),
          order_by: "from_date desc",
          limit_page_length: 20,
        });
        setLeaveApplications(leaveApps);

        // Attendance (optional)
        const attendance = await getResourceList("Attendance", {
          filters: JSON.stringify([["employee", "=", currentEmployeeId]]),
          fields: JSON.stringify(["attendance_date", "status"]),
          limit_page_length: 100,
        });
        setAttendanceRecords(attendance);
      } catch (err) {
        console.error("🔥 Error fetching leave data:", err);
        // More user-friendly error display
        Alert.alert(
          "Error",
          "Failed to load leave data. Please check your internet connection or try again later."
        );
        setError("Failed to fetch leave data.");
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [currentEmployeeId]
  );

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

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
        marks[key] = {
          customStyles: {
            container: {
              backgroundColor: STATUS_COLORS.Leave.bg,
              borderWidth: 1,
              borderColor: STATUS_COLORS.Leave.text + "33",
            },
            text: { color: STATUS_COLORS.Leave.text, fontWeight: "bold" },
          },
        };
      }
    });

    if (Array.isArray(holidays)) {
      holidays.forEach((holiday) => {
        const key = holiday.date;
        // Apply holiday style, but allow leave to override if it's both
        if (
          !marks[key] ||
          marks[key].customStyles.container.backgroundColor !==
            STATUS_COLORS.Leave.bg
        ) {
          marks[key] = {
            customStyles: {
              container: {
                backgroundColor: STATUS_COLORS.Holiday.bg,
                borderWidth: 1,
                borderColor: STATUS_COLORS.Holiday.text + "33",
              },
              text: { color: STATUS_COLORS.Holiday.text, fontWeight: "bold" },
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
        marks[key] = {
          customStyles: {
            container: {
              backgroundColor: STATUS_COLORS[status]?.bg || "#f0f2f5",
              borderWidth: 1,
              borderColor: (STATUS_COLORS[status]?.text || "#aaa") + "33",
            },
            text: { color: STATUS_COLORS[status]?.text || "#333" },
          },
        };
      }
    });

    return marks;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>
          Loading your leave and attendance data...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={50} color="#dc3545" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchLeaveData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#007bff"
        />
      }
    >
      {/* Header with Title and Toggle Button */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Leave Overview</Text>
        <TouchableOpacity
          onPress={() => setShowCalendar(!showCalendar)}
          style={styles.switchButton}
        >
          <MaterialIcons
            name={showCalendar ? "grid-on" : "calendar-today"}
            size={18}
            color="#fff"
            style={styles.switchButtonIcon}
          />
          <Text style={styles.switchButtonText}>
            {showCalendar ? "Card" : "Calendar"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conditional Rendering based on showCalendar state */}
      {showCalendar ? (
        <>
          <Calendar
            markingType="custom"
            markedDates={getMarkedDates()}
            style={styles.calendarStyle}
            theme={{
              todayTextColor: "#007bff", // Highlight today
              arrowColor: "#007bff", // Navigation arrows
              selectedDayBackgroundColor: "#007bff", // Selected day (if you add selection)
              dotColor: "#007bff",
            }}
          />
          {/* Calendar Legend */}
          <View style={styles.legendContainer}>
            {Object.keys(STATUS_COLORS).map((key) => (
              <View key={key} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColorBox,
                    { backgroundColor: STATUS_COLORS[key].bg },
                  ]}
                />
                <Text style={styles.legendText}>{key}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
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
                key={index}
                style={[
                  styles.leaveCard,
                  (index + 1) % 2 === 0 && { marginRight: 0 },
                ]}
              >
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: item.color + "22" },
                  ]}
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
      )}

      {/* Recently Applied Leaves Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recently Applied Leaves</Text>
      </View>
      {leaveApplications.length === 0 ? (
        <View style={styles.noDataContainer}>
          <MaterialIcons name="event-note" size={40} color="#666" />
          <Text style={styles.noDataText}>No recent leave applications.</Text>
          <Text style={styles.noDataSubText}>
            You haven't applied for any leaves recently.
          </Text>
        </View>
      ) : (
        <View style={styles.leaveApplicationsList}>
          {leaveApplications.map((app, index) => (
            <View key={index} style={styles.applicationItem}>
              <MaterialIcons
                name="event"
                size={24}
                color="#6c757d"
                style={styles.applicationIcon}
              />
              <View style={styles.applicationDetails}>
                <Text style={styles.applicationType}>{app.leave_type}</Text>
                <Text style={styles.applicationDates}>
                  {new Date(app.from_date).toLocaleDateString()} -{" "}
                  {new Date(app.to_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Button to Apply for Leave */}
      <TouchableOpacity style={styles.applyLeaveButton}>
        <MaterialIcons name="add" size={24} color="#fff" />
        <Text style={styles.applyLeaveButtonText}>Apply for Leave</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa", // Lighter background
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40, // More bottom padding for apply button
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
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
});

export default LeavesScreen;
