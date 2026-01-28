import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import CustomLoader from "../Components/CustomLoader";
import { getResourceList, getResource } from "../utils/frappeApi";
import { useTheme } from "../context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
// Helper function to format dates
// const formatDate = (dateString, format = "long") => {
//   if (!dateString) return "N/A";
//   // Using 'en-IN' for India locale dates as per current location (Pune)
//   const options = {
//     weekday: format === "short" ? "short" : "long",
//     year: "numeric",
//     month: "short",
//     day: "numeric",
//   };
//   return new Date(dateString).toLocaleDateString("en-IN", options);
// };

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return format(parseISO(dateString), "dd MMM yy");
};

// Helper function to format times
const formatTime = (timeString) => {
  if (!timeString) return "N/A";
  const [hours, minutes] = timeString.split(":");
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const ShiftDetailsScreen = ({
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) => {
  const { colors, theme } = useTheme();
  const isMountedRef = useRef(true);

  const dynamicStyles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      centered: { backgroundColor: colors.background },
      loadingText: { color: colors.textSecondary },
      errorText: { color: colors.error || "#dc3545" },
      title: { color: colors.text },
      navButton: { backgroundColor: theme === "dark" ? "#333" : "#e9ecef" },
      tableContainer: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      headerRow: { backgroundColor: theme === "dark" ? "#333" : "#f0f0f0" },
      cellHeader: { color: colors.text },
      cell: { color: colors.text },
      weekendRow: { backgroundColor: theme === "dark" ? "#442222" : "#fdecea" },
      emptyContainer: { backgroundColor: colors.card },
      emptyText: { color: colors.textSecondary },
    }),
    [colors, theme],
  );

  const [shiftData, setShiftData] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const monthDisplay = useMemo(() => {
    return currentMonth.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  const fetchShiftData = useCallback(
    async (isRefresh = false) => {
      if (!currentUserEmail) {
        if (isMountedRef.current) {
          setError(
            "User email not provided. Please ensure your profile is complete.",
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
        const empRes = await getResourceList("Employee", {
          filters: JSON.stringify([["user_id", "=", currentUserEmail]]),
          fields: JSON.stringify(["name"]),
          cache: true,
          forceRefresh: isRefresh,
        });

        if (!empRes || empRes.length === 0) {
          if (isMountedRef.current) {
            setError("Employee not found. Please contact your administrator.");
            if (isRefresh) {
              setRefreshing(false);
            } else {
              setLoading(false);
            }
          }
          return;
        }

        const empId = empRes?.[0]?.name;
        if (!empId) {
          if (isMountedRef.current) {
            setError(
              "Employee ID not found. Please contact your administrator.",
            );
            if (isRefresh) {
              setRefreshing(false);
            } else {
              setLoading(false);
            }
          }
          return;
        }

        const startDate = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          1,
        )
          .toISOString()
          .split("T")[0];
        const endDate = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0,
        )
          .toISOString()
          .split("T")[0];

        const assignments = await getResourceList("Shift Assignment", {
          filters: JSON.stringify([
            ["employee", "=", empId],
            ["start_date", "<=", endDate],
            ["end_date", ">=", startDate],
            ["docstatus", "=", 1],
          ]),
          fields: JSON.stringify([
            "name",
            "start_date",
            "end_date",
            "shift_type",
          ]),
          cache: true,
          forceRefresh: isRefresh,
        });

        const shiftTypes = [...new Set(assignments.map((a) => a.shift_type))];
        const shiftTypeMap = {};
        for (const type of shiftTypes) {
          const details = await getResource("Shift Type", type, {
            cache: true,
            cacheTTL: 24 * 60 * 60 * 1000,
            forceRefresh: isRefresh,
          });
          if (shiftTypeMap) {
            shiftTypeMap[type] = details;
          }
        }

        let dailyRoster = [];
        for (const assign of assignments) {
          const from = new Date(assign.start_date);
          const to = assign.end_date ? new Date(assign.end_date) : from;
          const loopStart = new Date(
            Math.max(from.getTime(), new Date(startDate).getTime()),
          );
          const loopEnd = new Date(
            Math.min(to.getTime(), new Date(endDate).getTime()),
          );

          for (
            let d = new Date(loopStart);
            d <= loopEnd;
            d.setDate(d.getDate() + 1)
          ) {
            const shiftTypeDetails = shiftTypeMap?.[assign.shift_type];
            dailyRoster.push({
              id: `${assign.name}-${d.toISOString().split("T")[0]}`,
              shift_date: d.toISOString().split("T")[0],
              shift_type: assign.shift_type,
              start_time: shiftTypeDetails?.start_time,
              end_time: shiftTypeDetails?.end_time,
            });
          }
        }

        dailyRoster.sort(
          (a, b) => new Date(a.shift_date) - new Date(b.shift_date),
        );
        if (isMountedRef.current) {
          setShiftData(dailyRoster);
        }
      } catch (err) {
        console.error("Shift fetch error:", err);
        if (isMountedRef.current) {
          Toast.show({
            type: "error",
            text1: "Error",
            text2:
              "Failed to load shift data. Please check your internet connection.",
          });
          setError("Failed to fetch shift data.");
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
    [currentUserEmail, currentMonth],
  );

  useFocusEffect(
    useCallback(() => {
      fetchShiftData();
    }, [fetchShiftData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShiftData(true);
  }, [fetchShiftData]);

  const handleMonthChange = (offset) => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1),
    );
  };

  const renderHeader = () => (
    <View
      style={[
        styles.row,
        styles.headerRow,
        dynamicStyles.headerRow,
        styles.roundedTop,
      ]}
    >
      <Text style={[styles.cellHeader, dynamicStyles.cellHeader, { flex: 2 }]}>
        Date
      </Text>
      <Text style={[styles.cellHeader, dynamicStyles.cellHeader, { flex: 1 }]}>
        Day
      </Text>
      <Text style={[styles.cellHeader, dynamicStyles.cellHeader, { flex: 2 }]}>
        Shift
      </Text>
      <Text
        style={[
          styles.cellHeader,
          dynamicStyles.cellHeader,
          { flex: 2, textAlign: "center" },
        ]}
      >
        Start
      </Text>
      <Text
        style={[
          styles.cellHeader,
          dynamicStyles.cellHeader,
          { flex: 2, textAlign: "center" },
        ]}
      >
        End
      </Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const date = new Date(item.shift_date);
    const isWeekend = [0, 6].includes(date.getDay());

    return (
      <View
        style={[
          styles.row,
          isWeekend && styles.weekendRow,
          isWeekend && dynamicStyles.weekendRow,
          { borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.cell, dynamicStyles.cell, { flex: 2 }]}>
          {formatDate(item.shift_date, "short")}
        </Text>
        <Text style={[styles.cell, dynamicStyles.cell, { flex: 1 }]}>
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </Text>
        <Text style={[styles.cell, dynamicStyles.cell, { flex: 2 }]}>
          {item.shift_type || "N/A"}
        </Text>
        <Text
          style={[
            styles.cell,
            dynamicStyles.cell,
            { flex: 2, textAlign: "center" },
          ]}
        >
          {formatTime(item.start_time)}
        </Text>
        <Text
          style={[
            styles.cell,
            dynamicStyles.cell,
            { flex: 2, textAlign: "center" },
          ]}
        >
          {formatTime(item.end_time)}
        </Text>
      </View>
    );
  };

  if (error) {
    return (
      <View style={[styles.centered, dynamicStyles.centered]}>
        <MaterialIcons
          name="error-outline"
          size={50}
          color={colors.error || "#dc3545"}
        />
        <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchShiftData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={styles.header}>
        <Text style={[styles.title, dynamicStyles.title]}>
          Shift Roster ({monthDisplay})
        </Text>
        <View style={styles.nav}>
          <TouchableOpacity
            onPress={() => handleMonthChange(-1)}
            style={[styles.navButton, dynamicStyles.navButton]}
          >
            <MaterialIcons
              name="chevron-left"
              size={28}
              color={theme === "dark" ? "#fff" : "#007bff"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleMonthChange(1)}
            style={[styles.navButton, dynamicStyles.navButton]}
          >
            <MaterialIcons
              name="chevron-right"
              size={28}
              color={theme === "dark" ? "#fff" : "#007bff"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.tableContainer, dynamicStyles.tableContainer]}>
        <CustomLoader visible={loading && !refreshing} />
        {!loading && (
          <FlatList
            data={shiftData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={renderHeader}
            stickyHeaderIndices={[0]}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme === "dark" ? "#fff" : "#007bff"}
              />
            }
            ListEmptyComponent={() => (
              <View
                style={[styles.emptyContainer, dynamicStyles.emptyContainer]}
              >
                <MaterialIcons
                  name="calendar-today"
                  size={50}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
                  No shifts assigned for this month.
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 15,
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#343a40",
  },
  nav: {
    flexDirection: "row",
  },
  navButton: {
    backgroundColor: "#e9ecef",
    borderRadius: 8,
    padding: 8,
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e9ecef",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#dee2e6",
    alignItems: "center",
  },
  headerRow: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 15,
  },
  weekendRow: {
    backgroundColor: "#fdecea",
  },
  cell: {
    fontSize: 15,
    color: "#495057",
  },
  cellHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#343a40",
  },
  roundedTop: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    minHeight: 150,
  },
  emptyText: {
    fontSize: 16,
    color: "#777",
    marginTop: 10,
    textAlign: "center",
  },
});

export default ShiftDetailsScreen;
